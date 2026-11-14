using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.Common;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Rules;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Core;

/// <summary>
/// Resolves the caller's role in a project and enforces <see cref="ProjectPermissions"/>.
/// Non-members get 404 (not 403) so project ids cannot be probed.
/// </summary>
public sealed class ProjectAccess(ApplicationDbContext db)
{
    public async Task<ProjectRole> RequireAsync(int projectId, int userId, ProjectAction action, CancellationToken ct = default)
    {
        var row = await db.Projects.AsNoTracking()
            .Where(p => p.ProjectId == projectId && p.IsActive)
            .Select(p => new
            {
                p.OwnerId,
                Role = p.Members.Where(m => m.UserId == userId && m.IsActive).Select(m => (ProjectRole?)m.Role).FirstOrDefault(),
            })
            .FirstOrDefaultAsync(ct);

        var role = row is null ? null : row.OwnerId == userId ? ProjectRole.Owner : row.Role;
        if (role is null)
            throw new NotFoundException("project.not_found", "Project not found.");

        if (!ProjectPermissions.Can(role.Value, action))
            throw new ForbiddenException("project.forbidden",
                $"Your role in this project ({role}) does not allow this action. Ask a project admin.");

        return role.Value;
    }
}
