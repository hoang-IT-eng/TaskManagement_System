using TaskManagement.Domain.Enums;

namespace TaskManagement.Application.Contracts;

public record ProjectQuery(string? Search = null, int Page = 1, int PageSize = 20);

public record CreateProjectRequest(string Name, string? Key, string? Description, string? Color);
public record UpdateProjectRequest(string? Name, string? Description, string? Status, string? Color);

public record StatusCounts(int Todo, int InProgress, int InReview, int Done, int Cancelled)
{
    public int Open => Todo + InProgress + InReview;
    public int Total => Todo + InProgress + InReview + Done;
}

public record ProjectDto(
    int Id,
    string Name,
    string Key,
    string? Description,
    string Status,
    string Color,
    ProjectRole MyRole,
    int MemberCount,
    StatusCounts Tasks,
    int OverdueCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int Version);

public record MemberDto(int UserId, string FullName, string Email, string? AvatarUrl, string Initials, ProjectRole Role, DateTime JoinedAt);
public record AddMemberRequest(string Email, ProjectRole Role = ProjectRole.Member);
public record UpdateMemberRequest(ProjectRole Role);

public record LabelDto(int Id, string Name, string Color);
public record CreateLabelRequest(string Name, string Color);
public record UpdateLabelRequest(string? Name, string? Color);
