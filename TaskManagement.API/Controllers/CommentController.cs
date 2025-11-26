using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManagement.Application.DTOs.Task;
using TaskManagement.Application.Interfaces;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/project/{projectId}/tasks/{taskId}/comments")]
[Authorize]
public class CommentController : ControllerBase
{
    private readonly ICommentService _commentService;

    public CommentController(ICommentService commentService)
    {
        _commentService = commentService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    /// <summary>
    /// Thêm comment mới vào task
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> AddComment(int projectId, int taskId, [FromBody] CreateCommentRequest request)
    {
        // Ensure taskId in request matches route parameter
        if (request.TaskId != taskId)
        {
            return BadRequest(new { message = "TaskId in request body must match route parameter" });
        }

        var userId = GetCurrentUserId();
        var result = await _commentService.AddCommentAsync(userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Lấy danh sách comments của một task
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetTaskComments(int projectId, int taskId)
    {
        var result = await _commentService.GetTaskCommentsAsync(taskId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data, count = result.Data?.Count ?? 0 });
    }

    /// <summary>
    /// Cập nhật comment (chỉ chủ sở hữu)
    /// </summary>
    [HttpPut("{commentId}")]
    public async Task<IActionResult> UpdateComment(int projectId, int taskId, int commentId, [FromBody] UpdateCommentRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _commentService.UpdateCommentAsync(commentId, userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Xóa comment (chỉ chủ sở hữu)
    /// </summary>
    [HttpDelete("{commentId}")]
    public async Task<IActionResult> DeleteComment(int projectId, int taskId, int commentId)
    {
        var userId = GetCurrentUserId();
        var result = await _commentService.DeleteCommentAsync(commentId, userId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }
}






