using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManagement.API.Http;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;

namespace TaskManagement.API.Controllers.V1;

[ApiController]
[Authorize]
[ApiExplorerSettings(GroupName = "v1")]
[Produces("application/json")]
[Route("api/v1/projects/{projectId:int}")]
public sealed class TasksController(ITaskService tasks, ICommentService comments, IActivityService activity) : ControllerBase
{
    /// <summary>Kanban board: four columns (Todo, InProgress, InReview, Done) ordered by rank. Accepts the same filters as the list.</summary>
    [HttpGet("board")]
    public Task<BoardDto> Board(int projectId, [FromQuery] TaskQuery query, CancellationToken ct) => tasks.GetBoardAsync(User.UserId(), projectId, query, ct);

    /// <summary>Filtered, sorted, paginated task list.</summary>
    [HttpGet("tasks")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<PagedResult<TaskDto>> List(int projectId, [FromQuery] TaskQuery query, CancellationToken ct) => tasks.ListAsync(User.UserId(), projectId, query, ct);

    [HttpPost("tasks")]
    [ProducesResponseType<TaskDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TaskDto>> Create(int projectId, CreateTaskRequest request, CancellationToken ct)
    {
        var created = await tasks.CreateAsync(User.UserId(), projectId, request, ct);
        return CreatedAtAction(nameof(Get), new { projectId, taskId = created.Id }, created);
    }

    [HttpGet("tasks/{taskId:int}")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public Task<TaskDto> Get(int projectId, int taskId, CancellationToken ct) => tasks.GetAsync(User.UserId(), projectId, taskId, ct);

    /// <summary>Partial update guarded by optimistic locking: send the <c>version</c> you read; a stale version returns 409 with the current task in <c>current</c>.</summary>
    [HttpPatch("tasks/{taskId:int}")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<TaskDto> Update(int projectId, int taskId, UpdateTaskRequest request, CancellationToken ct) => tasks.UpdateAsync(User.UserId(), projectId, taskId, request, ct);

    /// <summary>Drag-and-drop: move to a column and between two neighbours. Same 409 semantics as update.</summary>
    [HttpPost("tasks/{taskId:int}/move")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<TaskDto> Move(int projectId, int taskId, MoveTaskRequest request, CancellationToken ct) => tasks.MoveAsync(User.UserId(), projectId, taskId, request, ct);

    [HttpDelete("tasks/{taskId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int projectId, int taskId, CancellationToken ct)
    {
        await tasks.DeleteAsync(User.UserId(), projectId, taskId, ct);
        return NoContent();
    }

    [HttpGet("tasks/{taskId:int}/activity")]
    public Task<IReadOnlyList<ActivityDto>> History(int projectId, int taskId, CancellationToken ct) => activity.TaskHistoryAsync(User.UserId(), projectId, taskId, ct);

    // ---- comments

    [HttpGet("tasks/{taskId:int}/comments")]
    public Task<IReadOnlyList<CommentDto>> Comments(int projectId, int taskId, CancellationToken ct) => comments.ListAsync(User.UserId(), projectId, taskId, ct);

    [HttpPost("tasks/{taskId:int}/comments")]
    [ProducesResponseType<CommentDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<CommentDto>> AddComment(int projectId, int taskId, CreateCommentRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await comments.AddAsync(User.UserId(), projectId, taskId, request, ct));

    [HttpPatch("tasks/{taskId:int}/comments/{commentId:int}")]
    public Task<CommentDto> UpdateComment(int projectId, int taskId, int commentId, UpdateCommentRequest request, CancellationToken ct) =>
        comments.UpdateAsync(User.UserId(), projectId, taskId, commentId, request, ct);

    [HttpDelete("tasks/{taskId:int}/comments/{commentId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteComment(int projectId, int taskId, int commentId, CancellationToken ct)
    {
        await comments.DeleteAsync(User.UserId(), projectId, taskId, commentId, ct);
        return NoContent();
    }
}

[ApiController]
[Authorize]
[ApiExplorerSettings(GroupName = "v1")]
[Produces("application/json")]
[Route("api/v1")]
public sealed class InboxController(INotificationService notifications, IDashboardService dashboard) : ControllerBase
{
    /// <summary>Your numbers, what is next, project progress and recent activity.</summary>
    [HttpGet("dashboard")]
    public Task<DashboardDto> Dashboard(CancellationToken ct) => dashboard.GetAsync(User.UserId(), ct);

    [HttpGet("notifications")]
    public Task<PagedResult<NotificationDto>> Notifications([FromQuery] bool unreadOnly = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        notifications.ListAsync(User.UserId(), unreadOnly, new PageQuery(page, pageSize), ct);

    [HttpGet("notifications/unread-count")]
    public async Task<object> UnreadCount(CancellationToken ct) => new { count = await notifications.UnreadCountAsync(User.UserId(), ct) };

    [HttpPost("notifications/{notificationId:int}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead(int notificationId, CancellationToken ct)
    {
        await notifications.MarkReadAsync(User.UserId(), notificationId, ct);
        return NoContent();
    }

    [HttpPost("notifications/read-all")]
    public async Task<object> MarkAllRead(CancellationToken ct) => new { updated = await notifications.MarkAllReadAsync(User.UserId(), ct) };
}
