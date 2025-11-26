using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManagement.Application.DTOs.Task;
using TaskManagement.Application.Interfaces;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/project/{projectId}/tasks")]
[Authorize]
public class TaskController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TaskController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    /// <summary>
    /// Tạo task mới trong dự án
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateTask(int projectId, [FromBody] CreateTaskRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _taskService.CreateTaskAsync(projectId, userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Lấy danh sách tất cả tasks của dự án
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetProjectTasks(int projectId)
    {
        var userId = GetCurrentUserId();
        var result = await _taskService.GetProjectTasksAsync(projectId, userId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data, count = result.Data?.Count ?? 0 });
    }

    /// <summary>
    /// Tìm kiếm và lọc tasks theo nhiều tiêu chí
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> SearchAndFilterTasks(
        int projectId,
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] int? assigneeId,
        [FromQuery] string? searchTerm,
        [FromQuery] DateTime? dueDateFrom,
        [FromQuery] DateTime? dueDateTo)
    {
        var userId = GetCurrentUserId();
        var filter = new TaskFilterRequest
        {
            Status = status,
            Priority = priority,
            AssigneeId = assigneeId,
            SearchTerm = searchTerm,
            DueDateFrom = dueDateFrom,
            DueDateTo = dueDateTo
        };

        var result = await _taskService.SearchAndFilterTasksAsync(projectId, userId, filter);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data, count = result.Data?.Count ?? 0 });
    }

    /// <summary>
    /// Lấy tasks nhóm theo trạng thái
    /// </summary>
    [HttpGet("grouped-by-status")]
    public async Task<IActionResult> GetTasksGroupedByStatus(int projectId)
    {
        var userId = GetCurrentUserId();
        var result = await _taskService.GetTasksGroupedByStatusAsync(projectId, userId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data });
    }

    /// <summary>
    /// Lấy chi tiết một task
    /// </summary>
    [HttpGet("{taskId}")]
    public async Task<IActionResult> GetTaskById(int projectId, int taskId)
    {
        var userId = GetCurrentUserId();
        var result = await _taskService.GetTaskByIdAsync(projectId, taskId, userId);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Message });
        }

        return Ok(new { data = result.Data });
    }

    /// <summary>
    /// Cập nhật task
    /// </summary>
    [HttpPut("{taskId}")]
    public async Task<IActionResult> UpdateTask(int projectId, int taskId, [FromBody] UpdateTaskRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _taskService.UpdateTaskAsync(projectId, taskId, userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Xóa task (soft delete)
    /// </summary>
    [HttpDelete("{taskId}")]
    public async Task<IActionResult> DeleteTask(int projectId, int taskId)
    {
        var userId = GetCurrentUserId();
        var result = await _taskService.DeleteTaskAsync(projectId, taskId, userId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }
}

