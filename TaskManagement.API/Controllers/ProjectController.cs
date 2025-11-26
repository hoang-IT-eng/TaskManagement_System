using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskManagement.Application.DTOs.Project;
using TaskManagement.Application.Interfaces;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectController : ControllerBase
{
    private readonly IProjectService _projectService;

    public ProjectController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    /// <summary>
    /// Tạo dự án mới
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _projectService.CreateProjectAsync(userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Lấy danh sách tất cả dự án của user hiện tại
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllProjects()
    {
        var userId = GetCurrentUserId();
        var result = await _projectService.GetAllProjectsAsync(userId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data, count = result.Data?.Count ?? 0 });
    }

    /// <summary>
    /// Lấy chi tiết một dự án theo ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetProjectById(int id)
    {
        var userId = GetCurrentUserId();
        var result = await _projectService.GetProjectByIdAsync(id, userId);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Message });
        }

        return Ok(new { data = result.Data });
    }

    /// <summary>
    /// Cập nhật thông tin dự án
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _projectService.UpdateProjectAsync(id, userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Xóa dự án (soft delete)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var userId = GetCurrentUserId();
        var result = await _projectService.DeleteProjectAsync(id, userId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }
}

