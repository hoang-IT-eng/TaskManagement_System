using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Rules;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Core;

public sealed class CommentService(ApplicationDbContext db, ProjectAccess access, Journal journal, IClock clock) : ICommentService
{
    public async Task<IReadOnlyList<CommentDto>> ListAsync(int userId, int projectId, int taskId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        await EnsureTaskAsync(projectId, taskId, ct);
        var rows = await db.TaskComments.AsNoTracking().Include(c => c.User)
            .Where(c => c.TaskId == taskId && c.IsActive).OrderBy(c => c.CreatedAt).ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<CommentDto> AddAsync(int userId, int projectId, int taskId, CreateCommentRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.Comment, ct);
        var task = await EnsureTaskAsync(projectId, taskId, ct);
        var now = clock.UtcNow;
        var comment = new TaskComment { TaskId = taskId, UserId = userId, Content = request.Content.Trim(), CreatedAt = now, UpdatedAt = now };
        db.TaskComments.Add(comment);

        var key = Mapping.TaskKey(task.Project.Key, task.Number);
        var excerpt = comment.Content.Length > 80 ? comment.Content[..80] + "…" : comment.Content;
        journal.Activity(userId, "Commented", "Task", taskId, projectId, taskId, $"commented on {key}: {excerpt}");
        foreach (var recipient in new[] { task.AssigneeId, task.CreatedById }.OfType<int>().Distinct())
            journal.Notify(recipient, userId, "task.commented", $"New comment on {key} {task.Title}: {excerpt}", projectId, taskId);

        await db.SaveChangesAsync(ct); // comment + activity + notifications commit together
        comment.User = await db.Users.FirstAsync(u => u.UserId == userId, ct);
        return ToDto(comment);
    }

    public async Task<CommentDto> UpdateAsync(int userId, int projectId, int taskId, int commentId, UpdateCommentRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.Comment, ct);
        var comment = await FindAsync(taskId, commentId, ct);
        if (comment.UserId != userId)
            throw new ForbiddenException("comment.not_author", "You can only edit your own comments.");
        comment.Content = request.Content.Trim();
        comment.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToDto(comment);
    }

    public async Task DeleteAsync(int userId, int projectId, int taskId, int commentId, CancellationToken ct = default)
    {
        var role = await access.RequireAsync(projectId, userId, ProjectAction.Comment, ct);
        var comment = await FindAsync(taskId, commentId, ct);
        if (comment.UserId != userId && !ProjectPermissions.Can(role, ProjectAction.DeleteAnyTask))
            throw new ForbiddenException("comment.delete_forbidden", "Only the author or a project admin can delete this comment.");
        comment.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    private async Task<ProjectTask> EnsureTaskAsync(int projectId, int taskId, CancellationToken ct) =>
        await db.ProjectTasks.AsNoTracking().Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.TaskId == taskId && t.ProjectId == projectId && t.IsActive, ct)
        ?? throw new NotFoundException("task.not_found", "Task not found.");

    private async Task<TaskComment> FindAsync(int taskId, int commentId, CancellationToken ct) =>
        await db.TaskComments.Include(c => c.User).FirstOrDefaultAsync(c => c.CommentId == commentId && c.TaskId == taskId && c.IsActive, ct)
        ?? throw new NotFoundException("comment.not_found", "Comment not found.");

    private static CommentDto ToDto(TaskComment c) =>
        new(c.CommentId, c.TaskId, c.Content, Mapping.Summary(c.User), c.CreatedAt, c.UpdatedAt, c.UpdatedAt > c.CreatedAt.AddSeconds(1));
}

public sealed class ActivityService(ApplicationDbContext db, ProjectAccess access) : IActivityService
{
    public async Task<PagedResult<ActivityDto>> ProjectFeedAsync(int userId, int projectId, PageQuery page, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        var q = db.ActivityLogs.AsNoTracking().Where(a => a.ProjectId == projectId);
        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.ActivityLogId)
            .Skip(page.Skip).Take(page.SafePageSize).Include(a => a.User).ToListAsync(ct);
        return new PagedResult<ActivityDto>(rows.Select(ToDto).ToList(), page.SafePage, page.SafePageSize, total);
    }

    public async Task<IReadOnlyList<ActivityDto>> TaskHistoryAsync(int userId, int projectId, int taskId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        var rows = await db.ActivityLogs.AsNoTracking().Include(a => a.User)
            .Where(a => a.ProjectId == projectId && a.TaskId == taskId)
            .OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.ActivityLogId).Take(100).ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    internal static ActivityDto ToDto(ActivityLog a) =>
        new(a.ActivityLogId, a.Action, a.EntityType, a.EntityId, a.TaskId, a.Description, Mapping.Summary(a.User), a.CreatedAt);
}

public sealed class NotificationService(ApplicationDbContext db) : INotificationService
{
    public async Task<PagedResult<NotificationDto>> ListAsync(int userId, bool unreadOnly, PageQuery page, CancellationToken ct = default)
    {
        var q = db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly) q = q.Where(n => !n.IsRead);
        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.NotificationId)
            .Skip(page.Skip).Take(page.SafePageSize).Include(n => n.Actor).ToListAsync(ct);
        var items = rows.Select(n => new NotificationDto(n.NotificationId, n.Type, n.Message, n.ProjectId, n.TaskId,
            n.Actor is null ? null : Mapping.Summary(n.Actor), n.IsRead, n.CreatedAt)).ToList();
        return new PagedResult<NotificationDto>(items, page.SafePage, page.SafePageSize, total);
    }

    public Task<int> UnreadCountAsync(int userId, CancellationToken ct = default) =>
        db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

    public async Task MarkReadAsync(int userId, int notificationId, CancellationToken ct = default)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.NotificationId == notificationId && x.UserId == userId, ct)
                ?? throw new NotFoundException("notification.not_found", "Notification not found.");
        if (n.IsRead) return;
        n.IsRead = true;
        await db.SaveChangesAsync(ct);
    }

    public Task<int> MarkAllReadAsync(int userId, CancellationToken ct = default) =>
        db.Notifications.Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
}

public sealed class DashboardService(ApplicationDbContext db, IClock clock) : IDashboardService
{
    public async Task<DashboardDto> GetAsync(int userId, CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var today = now.Date;
        var weekEnd = now.AddDays(7);
        var since = today.AddDays(-13);

        var projectIds = await db.Projects.AsNoTracking()
            .Where(p => p.IsActive && (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId && m.IsActive)))
            .Select(p => p.ProjectId).ToListAsync(ct);

        var mine = db.ProjectTasks.AsNoTracking()
            .Where(t => t.IsActive && t.AssigneeId == userId && projectIds.Contains(t.ProjectId));

        var statusRows = await mine.GroupBy(t => t.Status).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        int C(ProjectTaskStatus s) => statusRows.FirstOrDefault(r => r.Key == s)?.Count ?? 0;
        var myStatus = new StatusCounts(C(ProjectTaskStatus.Todo), C(ProjectTaskStatus.InProgress), C(ProjectTaskStatus.InReview), C(ProjectTaskStatus.Done), C(ProjectTaskStatus.Cancelled));

        var openMine = mine.Where(t => t.Status == ProjectTaskStatus.Todo || t.Status == ProjectTaskStatus.InProgress || t.Status == ProjectTaskStatus.InReview);
        var overdue = await openMine.CountAsync(t => t.DueDate < now, ct);
        var dueWeek = await openMine.CountAsync(t => t.DueDate >= now && t.DueDate < weekEnd, ct);
        var weekAgo = now.AddDays(-7);
        var completed7 = await mine.CountAsync(t => t.Status == ProjectTaskStatus.Done && t.CompletedAt >= weekAgo, ct);

        var upNext = await openMine
            .OrderBy(t => t.DueDate == null).ThenBy(t => t.DueDate).ThenByDescending(t => t.Priority)
            .Take(6).SelectDto().ToListAsync(ct);

        var projects = await db.Projects.AsNoTracking()
            .Where(p => projectIds.Contains(p.ProjectId))
            .OrderByDescending(p => p.UpdatedAt).Take(6)
            .Select(p => new ProjectProgressDto(
                p.ProjectId, p.Name, p.Key, p.Color,
                p.Tasks.Count(t => t.IsActive && t.Status == ProjectTaskStatus.Done),
                p.Tasks.Count(t => t.IsActive && t.Status != ProjectTaskStatus.Cancelled),
                p.Tasks.Count(t => t.IsActive && t.DueDate < now && t.Status != ProjectTaskStatus.Done && t.Status != ProjectTaskStatus.Cancelled)))
            .ToListAsync(ct);

        var activity = await db.ActivityLogs.AsNoTracking().Include(a => a.User)
            .Where(a => a.ProjectId != null && projectIds.Contains(a.ProjectId.Value))
            .OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.ActivityLogId).Take(8).ToListAsync(ct);

        var completedDates = await db.ProjectTasks.AsNoTracking()
            .Where(t => t.IsActive && projectIds.Contains(t.ProjectId) && t.Status == ProjectTaskStatus.Done && t.CompletedAt >= since)
            .Select(t => t.CompletedAt!.Value).ToListAsync(ct);
        var perDay = Enumerable.Range(0, 14)
            .Select(i => DateOnly.FromDateTime(since.AddDays(i)))
            .Select(d => new DailyCount(d, completedDates.Count(c => DateOnly.FromDateTime(c) == d)))
            .ToList();

        return new DashboardDto(myStatus.Open, overdue, dueWeek, completed7, myStatus, upNext, projects,
            activity.Select(ActivityService.ToDto).ToList(), perDay);
    }
}
