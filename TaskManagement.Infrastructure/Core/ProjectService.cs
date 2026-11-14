using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Rules;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Core;

public sealed partial class ProjectService(ApplicationDbContext db, ProjectAccess access, Journal journal, IClock clock) : IProjectService
{
    private static readonly (string Name, string Color)[] DefaultLabels =
    [
        ("bug", "#B5482F"), ("feature", "#3B6E8F"), ("design", "#8A5A9E"), ("chore", "#6B7570"),
    ];

    public async Task<PagedResult<ProjectDto>> ListAsync(int userId, ProjectQuery query, CancellationToken ct = default)
    {
        var page = new PageQuery(query.Page, query.PageSize);
        var q = Visible(userId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = $"%{query.Search.Trim()}%";
            q = q.Where(p => EF.Functions.Like(p.Name, term) || EF.Functions.Like(p.Key, term));
        }
        var total = await q.CountAsync(ct);
        var items = await Project(q.OrderByDescending(p => p.UpdatedAt).Skip(page.Skip).Take(page.SafePageSize), userId).ToListAsync(ct);
        return new PagedResult<ProjectDto>(items, page.SafePage, page.SafePageSize, total);
    }

    public async Task<ProjectDto> GetAsync(int userId, int projectId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        return await Project(db.Projects.Where(p => p.ProjectId == projectId), userId).FirstAsync(ct);
    }

    public async Task<ProjectDto> CreateAsync(int userId, CreateProjectRequest request, CancellationToken ct = default)
    {
        var key = string.IsNullOrWhiteSpace(request.Key) ? await SuggestKeyAsync(request.Name, ct) : request.Key.Trim().ToUpperInvariant();
        if (await db.Projects.AnyAsync(p => p.Key == key && p.IsActive && p.Members.Any(m => m.UserId == userId), ct))
            throw new ConflictException("project.key_taken", $"You already have a project with key {key}.");

        var now = clock.UtcNow;
        var project = new Project
        {
            Name = request.Name.Trim(),
            Key = key,
            Description = request.Description?.Trim(),
            Color = request.Color ?? "#3C5A48",
            Status = "InProgress",
            OwnerId = userId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        project.Members.Add(new ProjectMember { UserId = userId, Role = ProjectRole.Owner, JoinedAt = now });
        foreach (var (name, color) in DefaultLabels)
            project.Labels.Add(new Label { Name = name, Color = color, CreatedAt = now });

        db.Projects.Add(project);
        await db.SaveChangesAsync(ct); // project, owner membership and default labels in one transaction

        journal.Activity(userId, "Created", "Project", project.ProjectId, project.ProjectId, null, $"created project {project.Name}");
        await db.SaveChangesAsync(ct);
        return await GetAsync(userId, project.ProjectId, ct);
    }

    public async Task<ProjectDto> UpdateAsync(int userId, int projectId, UpdateProjectRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.EditProject, ct);
        var project = await db.Projects.FirstAsync(p => p.ProjectId == projectId, ct);
        var changes = new List<string>();
        if (request.Name is not null && request.Name.Trim() != project.Name) { project.Name = request.Name.Trim(); changes.Add("name"); }
        if (request.Description is not null) { project.Description = request.Description.Trim(); changes.Add("description"); }
        if (request.Status is not null && request.Status != project.Status) { project.Status = request.Status; changes.Add($"status to {request.Status}"); }
        if (request.Color is not null) { project.Color = request.Color; changes.Add("color"); }
        if (changes.Count > 0)
        {
            journal.Activity(userId, "Updated", "Project", projectId, projectId, null, $"updated {string.Join(", ", changes)}");
            await db.SaveChangesAsync(ct);
        }
        return await GetAsync(userId, projectId, ct);
    }

    public async Task DeleteAsync(int userId, int projectId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.DeleteProject, ct);
        await db.InTransactionAsync(async c =>
        {
            // Archive the project and all its tasks together; a half-archived project would leak
            // tasks into dashboards.
            await db.ProjectTasks.Where(t => t.ProjectId == projectId && t.IsActive)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsActive, false), c);
            var project = await db.Projects.FirstAsync(p => p.ProjectId == projectId, c);
            project.IsActive = false;
            journal.Activity(userId, "Deleted", "Project", projectId, projectId, null, $"archived project {project.Name}");
            await db.SaveChangesAsync(c);
        }, ct);
    }

    private IQueryable<Project> Visible(int userId) =>
        db.Projects.AsNoTracking().Where(p => p.IsActive && (p.OwnerId == userId || p.Members.Any(m => m.UserId == userId && m.IsActive)));

    private IQueryable<ProjectDto> Project(IQueryable<Project> q, int userId)
    {
        var today = clock.UtcNow.Date;
        return q.Select(p => new ProjectDto(
            p.ProjectId,
            p.Name,
            p.Key,
            p.Description,
            p.Status,
            p.Color,
            p.OwnerId == userId ? ProjectRole.Owner : p.Members.Where(m => m.UserId == userId && m.IsActive).Select(m => m.Role).FirstOrDefault(),
            p.Members.Count(m => m.IsActive),
            new StatusCounts(
                p.Tasks.Count(t => t.IsActive && t.Status == ProjectTaskStatus.Todo),
                p.Tasks.Count(t => t.IsActive && t.Status == ProjectTaskStatus.InProgress),
                p.Tasks.Count(t => t.IsActive && t.Status == ProjectTaskStatus.InReview),
                p.Tasks.Count(t => t.IsActive && t.Status == ProjectTaskStatus.Done),
                p.Tasks.Count(t => t.IsActive && t.Status == ProjectTaskStatus.Cancelled)),
            p.Tasks.Count(t => t.IsActive && t.DueDate < today && t.Status != ProjectTaskStatus.Done && t.Status != ProjectTaskStatus.Cancelled),
            p.CreatedAt,
            p.UpdatedAt,
            p.Version));
    }

    private async Task<string> SuggestKeyAsync(string name, CancellationToken ct)
    {
        var letters = NonLetters().Replace(name.ToUpperInvariant(), " ").Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var key = letters.Length switch
        {
            0 => "PRJ",
            1 => letters[0][..Math.Min(3, letters[0].Length)],
            _ => string.Concat(letters.Take(3).Select(w => w[0])),
        };
        if (key.Length < 2) key = (key + "XX")[..2];
        return await Task.FromResult(key);
    }

    [GeneratedRegex("[^A-Z0-9]")]
    private static partial Regex NonLetters();
}

public sealed class MemberService(ApplicationDbContext db, ProjectAccess access, Journal journal, IClock clock) : IMemberService
{
    public async Task<IReadOnlyList<MemberDto>> ListAsync(int userId, int projectId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        var rows = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == projectId && m.IsActive)
            .Include(m => m.User)
            .OrderBy(m => m.Role).ThenBy(m => m.User.FullName)
            .ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<MemberDto> AddAsync(int userId, int projectId, AddMemberRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.ManageMembers, ct);
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct)
                   ?? throw new NotFoundException("user.not_found", "No active account uses that email. Ask them to sign up first.");

        var existing = await db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == user.UserId, ct);
        if (existing is { IsActive: true })
            throw new ConflictException("member.exists", $"{user.FullName} is already on this project.");

        if (existing is not null)
        {
            existing.IsActive = true;
            existing.Role = request.Role;
            existing.JoinedAt = clock.UtcNow;
        }
        else
        {
            existing = new ProjectMember { ProjectId = projectId, UserId = user.UserId, Role = request.Role, JoinedAt = clock.UtcNow };
            db.ProjectMembers.Add(existing);
        }

        var projectName = await db.Projects.Where(p => p.ProjectId == projectId).Select(p => p.Name).FirstAsync(ct);
        journal.Activity(userId, "MemberAdded", "Project", projectId, projectId, null, $"added {user.FullName} as {request.Role}");
        journal.Notify(user.UserId, userId, "project.member_added", $"You were added to {projectName} as {request.Role}", projectId, null);
        await db.SaveChangesAsync(ct);
        existing.User = user;
        return ToDto(existing);
    }

    public async Task<MemberDto> UpdateAsync(int userId, int projectId, int memberUserId, UpdateMemberRequest request, CancellationToken ct = default)
    {
        var myRole = await access.RequireAsync(projectId, userId, ProjectAction.ManageMembers, ct);
        var member = await FindAsync(projectId, memberUserId, ct);
        if (member.Role == ProjectRole.Owner)
            throw new ForbiddenException("member.owner_immutable", "The owner's role cannot be changed.");
        if (myRole != ProjectRole.Owner && (member.Role == ProjectRole.Admin || request.Role == ProjectRole.Admin))
            throw new ForbiddenException("member.admin_requires_owner", "Only the owner can grant or revoke Admin.");

        var old = member.Role;
        member.Role = request.Role;
        journal.Activity(userId, "MemberRoleChanged", "Project", projectId, projectId, null, $"changed {member.User.FullName} from {old} to {request.Role}");
        await db.SaveChangesAsync(ct);
        return ToDto(member);
    }

    public async Task RemoveAsync(int userId, int projectId, int memberUserId, CancellationToken ct = default)
    {
        var self = userId == memberUserId;
        var myRole = await access.RequireAsync(projectId, userId, self ? ProjectAction.View : ProjectAction.ManageMembers, ct);
        var member = await FindAsync(projectId, memberUserId, ct);
        if (member.Role == ProjectRole.Owner)
            throw new ForbiddenException("member.owner_immutable", "The owner cannot leave or be removed. Archive the project instead.");
        if (!self && member.Role == ProjectRole.Admin && myRole != ProjectRole.Owner)
            throw new ForbiddenException("member.admin_requires_owner", "Only the owner can remove an admin.");

        await db.InTransactionAsync(async c =>
        {
            // Removing someone must not leave tasks assigned to a person who can no longer see them.
            var unassigned = await db.ProjectTasks
                .Where(t => t.ProjectId == projectId && t.AssigneeId == memberUserId && t.IsActive)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.AssigneeId, (int?)null)
                    .SetProperty(t => t.Version, t => t.Version + 1)
                    .SetProperty(t => t.UpdatedAt, clock.UtcNow), c);
            member.IsActive = false;
            journal.Activity(userId, "MemberRemoved", "Project", projectId, projectId, null,
                self ? $"left the project" : $"removed {member.User.FullName} ({unassigned} task(s) unassigned)");
            await db.SaveChangesAsync(c);
        }, ct);
    }

    private async Task<ProjectMember> FindAsync(int projectId, int memberUserId, CancellationToken ct) =>
        await db.ProjectMembers.Include(m => m.User)
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == memberUserId && m.IsActive, ct)
        ?? throw new NotFoundException("member.not_found", "That person is not a member of this project.");

    private static MemberDto ToDto(ProjectMember m) =>
        new(m.UserId, m.User.FullName, m.User.Email, m.User.AvatarUrl, Mapping.Initials(m.User.FullName), m.Role, m.JoinedAt);
}

public sealed class LabelService(ApplicationDbContext db, ProjectAccess access) : ILabelService
{
    public async Task<IReadOnlyList<LabelDto>> ListAsync(int userId, int projectId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.View, ct);
        return await db.Labels.AsNoTracking().Where(l => l.ProjectId == projectId).OrderBy(l => l.Name)
            .Select(l => new LabelDto(l.LabelId, l.Name, l.Color)).ToListAsync(ct);
    }

    public async Task<LabelDto> CreateAsync(int userId, int projectId, CreateLabelRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.ManageLabels, ct);
        var name = request.Name.Trim().ToLowerInvariant();
        if (await db.Labels.AnyAsync(l => l.ProjectId == projectId && l.Name == name, ct))
            throw new ConflictException("label.exists", $"A label named \"{name}\" already exists.");
        var label = new Label { ProjectId = projectId, Name = name, Color = request.Color };
        db.Labels.Add(label);
        await db.SaveChangesAsync(ct);
        return new LabelDto(label.LabelId, label.Name, label.Color);
    }

    public async Task<LabelDto> UpdateAsync(int userId, int projectId, int labelId, UpdateLabelRequest request, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.ManageLabels, ct);
        var label = await Find(projectId, labelId, ct);
        if (request.Name is not null)
        {
            var name = request.Name.Trim().ToLowerInvariant();
            if (name != label.Name && await db.Labels.AnyAsync(l => l.ProjectId == projectId && l.Name == name, ct))
                throw new ConflictException("label.exists", $"A label named \"{name}\" already exists.");
            label.Name = name;
        }
        if (request.Color is not null) label.Color = request.Color;
        await db.SaveChangesAsync(ct);
        return new LabelDto(label.LabelId, label.Name, label.Color);
    }

    public async Task DeleteAsync(int userId, int projectId, int labelId, CancellationToken ct = default)
    {
        await access.RequireAsync(projectId, userId, ProjectAction.ManageLabels, ct);
        var label = await Find(projectId, labelId, ct);
        await db.InTransactionAsync(async c =>
        {
            await db.TaskLabels.Where(tl => tl.LabelId == labelId).ExecuteDeleteAsync(c);
            db.Labels.Remove(label);
            await db.SaveChangesAsync(c);
        }, ct);
    }

    private async Task<Label> Find(int projectId, int labelId, CancellationToken ct) =>
        await db.Labels.FirstOrDefaultAsync(l => l.ProjectId == projectId && l.LabelId == labelId, ct)
        ?? throw new NotFoundException("label.not_found", "Label not found.");
}
