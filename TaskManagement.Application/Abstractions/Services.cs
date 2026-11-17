using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;

namespace TaskManagement.Application.Abstractions;

public interface IAuthService
{
    Task<AuthSession> RegisterAsync(RegisterRequest request, string? ip, CancellationToken ct = default);
    Task<AuthSession> LoginAsync(LoginRequest request, string? ip, CancellationToken ct = default);
    Task<AuthSession> RefreshAsync(string refreshToken, string? ip, CancellationToken ct = default);
    Task LogoutAsync(string? refreshToken, CancellationToken ct = default);
    Task<CurrentUserDto> GetMeAsync(int userId, CancellationToken ct = default);
    Task<CurrentUserDto> UpdateMeAsync(int userId, UpdateMeRequest request, CancellationToken ct = default);
}

public interface IUserDirectory
{
    Task<PagedResult<UserSummary>> SearchAsync(string? search, PageQuery page, CancellationToken ct = default);
}

public interface IProjectService
{
    Task<PagedResult<ProjectDto>> ListAsync(int userId, ProjectQuery query, CancellationToken ct = default);
    Task<ProjectDto> GetAsync(int userId, int projectId, CancellationToken ct = default);
    Task<ProjectDto> CreateAsync(int userId, CreateProjectRequest request, CancellationToken ct = default);
    Task<ProjectDto> UpdateAsync(int userId, int projectId, UpdateProjectRequest request, CancellationToken ct = default);
    Task DeleteAsync(int userId, int projectId, CancellationToken ct = default);
}

public interface IMemberService
{
    Task<IReadOnlyList<MemberDto>> ListAsync(int userId, int projectId, CancellationToken ct = default);
    Task<MemberDto> AddAsync(int userId, int projectId, AddMemberRequest request, CancellationToken ct = default);
    Task<MemberDto> UpdateAsync(int userId, int projectId, int memberUserId, UpdateMemberRequest request, CancellationToken ct = default);
    Task RemoveAsync(int userId, int projectId, int memberUserId, CancellationToken ct = default);
}

public interface ILabelService
{
    Task<IReadOnlyList<LabelDto>> ListAsync(int userId, int projectId, CancellationToken ct = default);
    Task<LabelDto> CreateAsync(int userId, int projectId, CreateLabelRequest request, CancellationToken ct = default);
    Task<LabelDto> UpdateAsync(int userId, int projectId, int labelId, UpdateLabelRequest request, CancellationToken ct = default);
    Task DeleteAsync(int userId, int projectId, int labelId, CancellationToken ct = default);
}

public interface ITaskService
{
    Task<PagedResult<TaskDto>> ListAsync(int userId, int projectId, TaskQuery query, CancellationToken ct = default);
    Task<BoardDto> GetBoardAsync(int userId, int projectId, TaskQuery query, CancellationToken ct = default);
    Task<TaskDto> GetAsync(int userId, int projectId, int taskId, CancellationToken ct = default);
    Task<TaskDto> CreateAsync(int userId, int projectId, CreateTaskRequest request, CancellationToken ct = default);
    Task<TaskDto> UpdateAsync(int userId, int projectId, int taskId, UpdateTaskRequest request, CancellationToken ct = default);
    Task<TaskDto> MoveAsync(int userId, int projectId, int taskId, MoveTaskRequest request, CancellationToken ct = default);
    Task DeleteAsync(int userId, int projectId, int taskId, CancellationToken ct = default);
}

public interface ICommentService
{
    Task<IReadOnlyList<CommentDto>> ListAsync(int userId, int projectId, int taskId, CancellationToken ct = default);
    Task<CommentDto> AddAsync(int userId, int projectId, int taskId, CreateCommentRequest request, CancellationToken ct = default);
    Task<CommentDto> UpdateAsync(int userId, int projectId, int taskId, int commentId, UpdateCommentRequest request, CancellationToken ct = default);
    Task DeleteAsync(int userId, int projectId, int taskId, int commentId, CancellationToken ct = default);
}

public interface IActivityService
{
    Task<PagedResult<ActivityDto>> ProjectFeedAsync(int userId, int projectId, PageQuery page, CancellationToken ct = default);
    Task<IReadOnlyList<ActivityDto>> TaskHistoryAsync(int userId, int projectId, int taskId, CancellationToken ct = default);
}

public interface INotificationService
{
    Task<PagedResult<NotificationDto>> ListAsync(int userId, bool unreadOnly, PageQuery page, CancellationToken ct = default);
    Task<int> UnreadCountAsync(int userId, CancellationToken ct = default);
    Task MarkReadAsync(int userId, int notificationId, CancellationToken ct = default);
    Task<int> MarkAllReadAsync(int userId, CancellationToken ct = default);
}

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(int userId, CancellationToken ct = default);
}

public interface IAiCopilotService
{
    Task<AiChatResponse> ChatAsync(int userId, AiChatRequest request, CancellationToken ct = default);
}
