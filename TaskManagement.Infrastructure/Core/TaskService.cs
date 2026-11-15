using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Rules;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Core;

public sealed class TaskService(
    ApplicationDbContext db,
    ProjectAccess access,
    Journal journal,
    IClock clock,
    ILogger<TaskService> log) : ITaskService
{
    private const int MaxNumberAllocationAttempts = 5;

    private static readonly ProjectTaskStatus[] BoardColumns =
        [ProjectTaskStatus.Todo, ProjectTaskStatus.InProgress, ProjectTaskStatus.InReview, ProjectTaskStatus.Done];

    // ---------------------------------------------------------------- reads

    public async Task<PagedResult<TaskDto>> ListAsync(int userId, int projectId, TaskQuery query, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        var page = new PageQuery(query.Page, query.PageSize);
        var q = Filter(db.ProjectTasks.AsNoTracking().Where(t => t.ProjectId == projectId && t.IsActive), query);
        var total = await q.CountAsync(ct);
        var items = await Sort(q, query.Sort).Skip(page.Skip).Take(page.SafePageSize).SelectDto().ToListAsync(ct);
        return new PagedResult<TaskDto>(items, page.SafePage, page.SafePageSize, total);
    }

    public async Task<BoardDto> GetBoardAsync(int userId, int projectId, TaskQuery query, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        var q = Filter(db.ProjectTasks.AsNoTracking().Where(t => t.ProjectId == projectId && t.IsActive), query with { Status = null })
            .Where(t => t.Status != ProjectTaskStatus.Cancelled);
        var tasks = await q.OrderBy(t => t.Rank).SelectDto().ToListAsync(ct);
        var columns = BoardColumns
            .Select(s => new BoardColumn(s, tasks.Where(t => t.Status == s).ToList()))
            .ToList();
        return new BoardDto(projectId, columns);
    }

    public async Task<TaskDto> GetAsync(int userId, int projectId, int taskId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        return await Dto(projectId, taskId, ct);
    }

    // ---------------------------------------------------------------- writes

    public async Task<TaskDto> CreateAsync(int userId, int projectId, CreateTaskRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.EditTasks, ct);
        await EnsureAssignableAsync(projectId, request.AssigneeId, ct);
        var labelIds = await EnsureLabelsAsync(projectId, request.LabelIds, ct);

        // Task numbers (ATL-1, ATL-2, ...) are allocated from Project.NextTaskNumber. Two people creating
        // tasks at the same moment would read the same counter; Project.Version is a concurrency token,
        // so the second SaveChanges fails and we retry with a fresh counter. The unique index on
        // (ProjectId, Number) is the backstop.
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                var taskId = await db.InTransactionAsync(async c =>
                {
                    var project = await db.Projects.FirstAsync(p => p.ProjectId == projectId, c);
                    var topRank = await db.ProjectTasks
                        .Where(t => t.ProjectId == projectId && t.IsActive && t.Status == request.Status)
                        .MinAsync(t => (double?)t.Rank, c);

                    var now = clock.UtcNow;
                    var task = new ProjectTask
                    {
                        ProjectId = projectId,
                        Number = project.NextTaskNumber,
                        Title = request.Title.Trim(),
                        Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                        Status = request.Status,
                        Priority = request.Priority,
                        Rank = Ranking.Between(null, topRank), // new cards land at the top of their column
                        AssigneeId = request.AssigneeId,
                        DueDate = request.DueDate?.Date,
                        EstimatedHours = request.EstimatedHours,
                        CreatedById = userId,
                        CreatedAt = now,
                        UpdatedAt = now,
                        CompletedAt = request.Status == ProjectTaskStatus.Done ? now : null,
                    };
                    foreach (var id in labelIds) task.Labels.Add(new TaskLabel { LabelId = id });
                    project.NextTaskNumber++;
                    project.UpdatedAt = now;
                    db.ProjectTasks.Add(task);
                    await db.SaveChangesAsync(c);

                    var key = Mapping.TaskKey(project.Key, task.Number);
                    journal.Activity(userId, "Created", "Task", task.TaskId, projectId, task.TaskId, $"created {key} {task.Title}");
                    if (task.AssigneeId is int assignee)
                        journal.Notify(assignee, userId, "task.assigned", $"{key} {task.Title} was assigned to you", projectId, task.TaskId);
                    await db.SaveChangesAsync(c);
                    return task.TaskId;
                }, ct);
                return await Dto(projectId, taskId, ct);
            }
            catch (Exception ex) when (IsNumberRace(ex) && attempt < MaxNumberAllocationAttempts)
            {
                log.LogInformation("Task number allocation raced in project {ProjectId}; retry {Attempt}", projectId, attempt);
                db.ChangeTracker.Clear();
            }
        }
    }

    public async Task<TaskDto> UpdateAsync(int userId, int projectId, int taskId, UpdateTaskRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.EditTasks, ct);
        var task = await LoadForWriteAsync(projectId, taskId, request.Version, ct);
        var key = Mapping.TaskKey(task.Project.Key, task.Number);
        var changes = new List<string>();

        if (request.Title is not null && request.Title.Trim() != task.Title)
        {
            task.Title = request.Title.Trim();
            changes.Add("title");
        }
        if (request.Description is not null && request.Description != task.Description)
        {
            task.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            changes.Add("description");
        }
        if (request.Priority is { } priority && priority != task.Priority)
        {
            changes.Add($"priority {task.Priority} → {priority}");
            task.Priority = priority;
        }
        if (request.Status is { } status && status != task.Status)
        {
            changes.Add($"status {task.Status} → {status}");
            await ApplyStatusAsync(task, status, null, ct);
        }
        if (request.ClearAssignee && task.AssigneeId is not null)
        {
            task.AssigneeId = null;
            changes.Add("unassigned");
        }
        else if (request.AssigneeId is int assignee && assignee != task.AssigneeId)
        {
            await EnsureAssignableAsync(projectId, assignee, ct);
            task.AssigneeId = assignee;
            changes.Add("assignee");
            journal.Notify(assignee, userId, "task.assigned", $"{key} {task.Title} was assigned to you", projectId, taskId);
        }
        if (request.ClearDueDate && task.DueDate is not null)
        {
            task.DueDate = null;
            changes.Add("due date cleared");
        }
        else if (request.DueDate is DateTime due && due.Date != task.DueDate)
        {
            task.DueDate = due.Date;
            changes.Add($"due {due:yyyy-MM-dd}");
        }
        if (request.EstimatedHours is int est && est != task.EstimatedHours)
        {
            task.EstimatedHours = est;
            changes.Add("estimate");
        }
        if (request.LabelIds is not null)
        {
            var wanted = await EnsureLabelsAsync(projectId, request.LabelIds, ct);
            var current = task.Labels.Select(l => l.LabelId).ToHashSet();
            if (!current.SetEquals(wanted))
            {
                foreach (var tl in task.Labels.Where(l => !wanted.Contains(l.LabelId)).ToList()) task.Labels.Remove(tl);
                foreach (var id in wanted.Where(id => !current.Contains(id))) task.Labels.Add(new TaskLabel { TaskId = taskId, LabelId = id });
                changes.Add("labels");
            }
        }

        if (changes.Count == 0) return await Dto(projectId, taskId, ct);

        journal.Activity(userId, "Updated", "Task", taskId, projectId, taskId, $"updated {key}: {string.Join(", ", changes)}");
        await SaveOrConflictAsync(projectId, taskId, ct);
        return await Dto(projectId, taskId, ct);
    }

    public async Task<TaskDto> MoveAsync(int userId, int projectId, int taskId, MoveTaskRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.EditTasks, ct);
        var task = await LoadForWriteAsync(projectId, taskId, request.Version, ct);
        var key = Mapping.TaskKey(task.Project.Key, task.Number);
        var from = task.Status;

        await ApplyStatusAsync(task, request.Status, request, ct);

        journal.Activity(userId, "Moved", "Task", taskId, projectId, taskId,
            from == request.Status ? $"reordered {key} in {request.Status}" : $"moved {key} from {from} to {request.Status}");
        if (from != request.Status && task.CreatedById != userId)
            journal.Notify(task.CreatedById, userId, "task.status_changed", $"{key} {task.Title} moved to {request.Status}", projectId, taskId);

        await SaveOrConflictAsync(projectId, taskId, ct);
        return await Dto(projectId, taskId, ct);
    }

    public async Task DeleteAsync(int userId, int projectId, int taskId, CancellationToken ct = default)
    {
        var role = await access.RequireAsync(projectId, userId, ProjectAction.EditTasks, ct);
        var task = await db.ProjectTasks.Include(t => t.Project)
                       .FirstOrDefaultAsync(t => t.TaskId == taskId && t.ProjectId == projectId && t.IsActive, ct)
                   ?? throw TaskNotFound();
        if (task.CreatedById != userId && !ProjectPermissions.Can(role, ProjectAction.DeleteAnyTask))
            throw new ForbiddenException("task.delete_forbidden", "Only the task's creator or a project admin can delete it.");

        task.IsActive = false;
        journal.Activity(userId, "Deleted", "Task", taskId, projectId, taskId, $"deleted {Mapping.TaskKey(task.Project.Key, task.Number)} {task.Title}");
        await SaveOrConflictAsync(projectId, taskId, ct);
    }

    // ---------------------------------------------------------------- helpers

    /// <summary>
    /// Loads the task tracked and pins the version the client last saw as the concurrency token's
    /// original value. Stale version → immediate 409; a write that sneaks in between this read and our
    /// SaveChanges → DbUpdateConcurrencyException → 409 in <see cref="SaveOrConflictAsync"/>.
    /// </summary>
    private async Task<ProjectTask> LoadForWriteAsync(int projectId, int taskId, int clientVersion, CancellationToken ct)
    {
        var task = await db.ProjectTasks.Include(t => t.Labels).Include(t => t.Project)
                       .FirstOrDefaultAsync(t => t.TaskId == taskId && t.ProjectId == projectId && t.IsActive, ct)
                   ?? throw TaskNotFound();

        if (task.Version != clientVersion)
            throw new ConflictException("task.version_conflict",
                "Someone else changed this task since you opened it. Review their changes and try again.",
                await Dto(projectId, taskId, ct));

        db.Entry(task).Property(t => t.Version).OriginalValue = clientVersion;
        return task;
    }

    private async Task SaveOrConflictAsync(int projectId, int taskId, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();
            throw new ConflictException("task.version_conflict",
                "Someone else changed this task while you were editing. Review their changes and try again.",
                await Dto(projectId, taskId, ct));
        }
    }

    /// <summary>Sets status (+CompletedAt) and computes the card's rank in the target column.</summary>
    private async Task ApplyStatusAsync(ProjectTask task, ProjectTaskStatus status, MoveTaskRequest? move, CancellationToken ct)
    {
        if (task.Status != status)
        {
            task.CompletedAt = status == ProjectTaskStatus.Done ? clock.UtcNow : null;
            task.Status = status;
        }

        double? before = null, after = null;
        if (move is not null)
        {
            before = await NeighbourRankAsync(task, move.BeforeTaskId, status, "beforeTaskId", ct);
            after = await NeighbourRankAsync(task, move.AfterTaskId, status, "afterTaskId", ct);
            if (before is not null && after is not null && before >= after)
                throw new ValidationFailedException("beforeTaskId", "The card above must rank before the card below.");
        }
        else
        {
            after = await db.ProjectTasks
                .Where(t => t.ProjectId == task.ProjectId && t.IsActive && t.Status == status && t.TaskId != task.TaskId)
                .MinAsync(t => (double?)t.Rank, ct);
        }

        if (Ranking.NeedsRebalance(before, after))
        {
            await RebalanceColumnAsync(task, status, move!, ct);
            return;
        }
        task.Rank = Ranking.Between(before, after);
    }

    private async Task<double?> NeighbourRankAsync(ProjectTask task, int? neighbourId, ProjectTaskStatus status, string field, CancellationToken ct)
    {
        if (neighbourId is null) return null;
        if (neighbourId == task.TaskId)
            throw new ValidationFailedException(field, "A card cannot be its own neighbour.");
        var rank = await db.ProjectTasks
            .Where(t => t.TaskId == neighbourId && t.ProjectId == task.ProjectId && t.IsActive && t.Status == status)
            .Select(t => (double?)t.Rank).FirstOrDefaultAsync(ct);
        return rank ?? throw new ValidationFailedException(field, "Neighbour card is not in the target column (the board may be stale; refresh).");
    }

    /// <summary>
    /// Fractional ranks eventually run out of precision after many inserts at the same spot. When that
    /// happens, renumber the whole column with even spacing, inserting the moved card where it was
    /// dropped. All rows change in the same SaveChanges (one transaction).
    /// </summary>
    private async Task RebalanceColumnAsync(ProjectTask moved, ProjectTaskStatus status, MoveTaskRequest move, CancellationToken ct)
    {
        var column = await db.ProjectTasks
            .Where(t => t.ProjectId == moved.ProjectId && t.IsActive && t.Status == status && t.TaskId != moved.TaskId)
            .OrderBy(t => t.Rank).ToListAsync(ct);
        var index = move.AfterTaskId is int afterId ? column.FindIndex(t => t.TaskId == afterId) : column.Count;
        column.Insert(index < 0 ? column.Count : index, moved);
        foreach (var (t, rank) in column.Zip(Ranking.Sequence(column.Count)))
            t.Rank = rank;
        log.LogInformation("Rebalanced {Count} ranks in project {ProjectId} column {Status}", column.Count, moved.ProjectId, status);
    }

    private async Task EnsureAssignableAsync(int projectId, int? assigneeId, CancellationToken ct)
    {
        if (assigneeId is null) return;
        var ok = await db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == assigneeId && m.IsActive && m.Role != ProjectRole.Viewer, ct)
                 || await db.Projects.AnyAsync(p => p.ProjectId == projectId && p.OwnerId == assigneeId, ct);
        if (!ok) throw new ValidationFailedException("assigneeId", "Assignee must be a project member who can edit tasks.");
    }

    private async Task<HashSet<int>> EnsureLabelsAsync(int projectId, IReadOnlyList<int>? labelIds, CancellationToken ct)
    {
        if (labelIds is null || labelIds.Count == 0) return [];
        var wanted = labelIds.ToHashSet();
        var found = await db.Labels.Where(l => l.ProjectId == projectId && wanted.Contains(l.LabelId)).Select(l => l.LabelId).ToListAsync(ct);
        if (found.Count != wanted.Count)
            throw new ValidationFailedException("labelIds", "One or more labels do not belong to this project.");
        return wanted;
    }

    private async Task<TaskDto> Dto(int projectId, int taskId, CancellationToken ct) =>
        await db.ProjectTasks.AsNoTracking().Where(t => t.TaskId == taskId && t.ProjectId == projectId && t.IsActive).SelectDto().FirstOrDefaultAsync(ct)
        ?? throw TaskNotFound();

    private static NotFoundException TaskNotFound() => new("task.not_found", "Task not found.");

    private static bool IsNumberRace(Exception ex) =>
        ex is DbUpdateConcurrencyException || (ex is DbUpdateException { InnerException: not null } due &&
            due.InnerException.Message.Contains("IX_ProjectTasks_ProjectId_Number", StringComparison.OrdinalIgnoreCase) ||
            ex is DbUpdateException { InnerException.Message: var m } && m.Contains("UNIQUE constraint failed: ProjectTasks.ProjectId, ProjectTasks.Number"));

    private IQueryable<ProjectTask> Filter(IQueryable<ProjectTask> q, TaskQuery f)
    {
        if (f.Status is { } s) q = q.Where(t => t.Status == s);
        if (f.Priority is { } p) q = q.Where(t => t.Priority == p);
        if (f.Unassigned == true) q = q.Where(t => t.AssigneeId == null);
        else if (f.AssigneeId is { } a) q = q.Where(t => t.AssigneeId == a);
        if (f.LabelId is { } l) q = q.Where(t => t.Labels.Any(x => x.LabelId == l));
        if (!string.IsNullOrWhiteSpace(f.Search))
        {
            var raw = f.Search.Trim();
            var dash = raw.LastIndexOf('-');
            var numberPart = dash >= 0 ? raw[(dash + 1)..] : raw;
            var term = $"%{raw}%";
            if (int.TryParse(numberPart, out var number))
                q = q.Where(t => t.Number == number || EF.Functions.Like(t.Title, term));
            else
                q = q.Where(t => EF.Functions.Like(t.Title, term) || (t.Description != null && EF.Functions.Like(t.Description, term)));
        }

        var now = clock.UtcNow; // instant-based windows: no server-side notion of the caller's day
        q = f.Due?.ToLowerInvariant() switch
        {
            "overdue" => q.Where(t => t.DueDate < now && t.Status != ProjectTaskStatus.Done && t.Status != ProjectTaskStatus.Cancelled),
            "today" => q.Where(t => t.DueDate >= now && t.DueDate < now.AddDays(1)),
            "week" => q.Where(t => t.DueDate >= now && t.DueDate < now.AddDays(7)),
            "none" => q.Where(t => t.DueDate == null),
            null or "" => q,
            var other => throw new ValidationFailedException("due", $"Unknown due filter '{other}'. Use overdue, today, week or none."),
        };
        return q;
    }

    private static IQueryable<ProjectTask> Sort(IQueryable<ProjectTask> q, string? sort) => (sort ?? "rank") switch
    {
        "rank" => q.OrderBy(t => t.Status).ThenBy(t => t.Rank),
        "due" => q.OrderBy(t => t.DueDate == null).ThenBy(t => t.DueDate).ThenByDescending(t => t.Priority),
        "-due" => q.OrderByDescending(t => t.DueDate),
        "priority" => q.OrderBy(t => t.Priority).ThenBy(t => t.Number),
        "-priority" => q.OrderByDescending(t => t.Priority).ThenBy(t => t.DueDate == null).ThenBy(t => t.DueDate),
        "created" => q.OrderBy(t => t.Number),
        "-created" => q.OrderByDescending(t => t.Number),
        "updated" => q.OrderBy(t => t.UpdatedAt),
        "-updated" => q.OrderByDescending(t => t.UpdatedAt),
        var other => throw new ValidationFailedException("sort", $"Unknown sort '{other}'. Use rank, due, priority, created or updated (prefix - for descending)."),
    };
}
