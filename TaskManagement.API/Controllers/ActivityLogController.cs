using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManagement.Application.Interfaces;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/project/{projectId}/tasks/{taskId}/activities")]
[Authorize]
public class ActivityLogController : ControllerBase
{
    private readonly IActivityLogService _activityLogService;

    public ActivityLogController(IActivityLogService activityLogService)
    {
        _activityLogService = activityLogService;
    }

    /// <summary>
    /// Lấy lịch sử hoạt động của một task
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetTaskActivities(int projectId, int taskId)
    {
        var result = await _activityLogService.GetTaskActivitiesAsync(taskId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data, count = result.Data?.Count ?? 0 });
    }
}






