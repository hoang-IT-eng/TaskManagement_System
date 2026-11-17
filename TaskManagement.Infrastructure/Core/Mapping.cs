using TaskManagement.Application.Contracts;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;

namespace TaskManagement.Infrastructure.Core;

internal static class Mapping
{
    public static string Initials(string fullName)
    {
        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch
        {
            0 => "?",
            1 => parts[0][..1].ToUpperInvariant(),
            _ => (parts[0][..1] + parts[^1][..1]).ToUpperInvariant(),
        };
    }

    public static UserSummary Summary(User u) => new(u.UserId, u.FullName, u.Email, u.AvatarUrl, Initials(u.FullName));

    public static CurrentUserDto Me(User u) =>
        new(u.UserId, u.FullName, u.Email, u.Role, u.AvatarUrl, u.Bio, Initials(u.FullName), u.CreatedAt);

    public static string TaskKey(string projectKey, int number) => $"{projectKey}-{number}";

    /// <summary>
    /// Projection used by every task read. Translated to a single SQL query (labels and comment count
    /// as correlated subqueries); only Initials/Key formatting run client-side.
    /// </summary>
    public static IQueryable<TaskDto> SelectDto(this IQueryable<ProjectTask> q) => q.Select(t => new TaskDto(
        t.TaskId,
        TaskKey(t.Project.Key, t.Number),
        t.Number,
        t.ProjectId,
        t.Title,
        t.Description,
        t.Status,
        t.Priority,
        t.Type,
        t.Rank,
        t.Assignee == null ? null : new UserSummary(t.Assignee.UserId, t.Assignee.FullName, t.Assignee.Email, t.Assignee.AvatarUrl, Initials(t.Assignee.FullName)),
        new UserSummary(t.CreatedBy.UserId, t.CreatedBy.FullName, t.CreatedBy.Email, t.CreatedBy.AvatarUrl, Initials(t.CreatedBy.FullName)),
        t.DueDate,
        t.CompletedAt,
        t.EstimatedHours,
        t.Labels.OrderBy(l => l.Label.Name).Select(l => new LabelDto(l.Label.LabelId, l.Label.Name, l.Label.Color)).ToList(),
        t.Comments.Count(c => c.IsActive),
        t.CreatedAt,
        t.UpdatedAt,
        t.Version));

    public static bool IsOpen(ProjectTaskStatus s) => s is ProjectTaskStatus.Todo or ProjectTaskStatus.InProgress or ProjectTaskStatus.InReview;
}
