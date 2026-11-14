using TaskManagement.Domain.Enums;

namespace TaskManagement.Application.Contracts;

public record TaskQuery(
    ProjectTaskStatus? Status = null,
    ProjectTaskPriority? Priority = null,
    int? AssigneeId = null,
    bool? Unassigned = null,
    int? LabelId = null,
    string? Search = null,
    string? Due = null,          // overdue | today | week | none
    string? Sort = null,         // rank | due | priority | updated | created (prefix '-' for desc)
    int Page = 1,
    int PageSize = 50);

public record CreateTaskRequest(
    string Title,
    string? Description = null,
    ProjectTaskStatus Status = ProjectTaskStatus.Todo,
    ProjectTaskPriority Priority = ProjectTaskPriority.Medium,
    int? AssigneeId = null,
    DateTime? DueDate = null,
    int? EstimatedHours = null,
    IReadOnlyList<int>? LabelIds = null);

/// <summary>
/// Partial update. <see cref="Version"/> is required: it must equal the version the client last read,
/// otherwise the server answers 409 with the current task so the client can merge.
/// Nullable fields that are omitted stay unchanged; use the Clear* flags to null a value explicitly.
/// </summary>
public record UpdateTaskRequest(
    int Version,
    string? Title = null,
    string? Description = null,
    ProjectTaskPriority? Priority = null,
    ProjectTaskStatus? Status = null,
    int? AssigneeId = null,
    bool ClearAssignee = false,
    DateTime? DueDate = null,
    bool ClearDueDate = false,
    int? EstimatedHours = null,
    IReadOnlyList<int>? LabelIds = null);

/// <summary>Drag-and-drop move: target column plus the neighbours the card was dropped between.</summary>
public record MoveTaskRequest(int Version, ProjectTaskStatus Status, int? BeforeTaskId = null, int? AfterTaskId = null);

public record TaskDto(
    int Id,
    string Key,
    int Number,
    int ProjectId,
    string Title,
    string? Description,
    ProjectTaskStatus Status,
    ProjectTaskPriority Priority,
    double Rank,
    UserSummary? Assignee,
    UserSummary CreatedBy,
    DateTime? DueDate,
    DateTime? CompletedAt,
    int? EstimatedHours,
    IReadOnlyList<LabelDto> Labels,
    int CommentCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int Version);

public record BoardColumn(ProjectTaskStatus Status, IReadOnlyList<TaskDto> Tasks);
public record BoardDto(int ProjectId, IReadOnlyList<BoardColumn> Columns);

public record CommentDto(int Id, int TaskId, string Content, UserSummary Author, DateTime CreatedAt, DateTime UpdatedAt, bool Edited);
public record CreateCommentRequest(string Content);
public record UpdateCommentRequest(string Content);

public record ActivityDto(int Id, string Action, string EntityType, int EntityId, int? TaskId, string? Description, UserSummary Actor, DateTime CreatedAt);

public record NotificationDto(int Id, string Type, string Message, int? ProjectId, int? TaskId, UserSummary? Actor, bool IsRead, DateTime CreatedAt);

public record DashboardDto(
    int OpenAssigned,
    int Overdue,
    int DueThisWeek,
    int CompletedLast7Days,
    StatusCounts MyStatus,
    IReadOnlyList<TaskDto> UpNext,
    IReadOnlyList<ProjectProgressDto> Projects,
    IReadOnlyList<ActivityDto> RecentActivity,
    IReadOnlyList<DailyCount> CompletedPerDay);

public record ProjectProgressDto(int Id, string Name, string Key, string Color, int Done, int Total, int Overdue);
public record DailyCount(DateOnly Day, int Count);
