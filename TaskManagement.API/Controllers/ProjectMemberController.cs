using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs.ProjectMember;
using TaskManagement.Application.Interfaces;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/project/{projectId}/members")]
[Authorize]
public class ProjectMemberController : ControllerBase
{
    private readonly IProjectMemberService _projectMemberService;
    private readonly ApplicationDbContext _context;

    public ProjectMemberController(IProjectMemberService projectMemberService, ApplicationDbContext context)
    {
        _projectMemberService = projectMemberService;
        _context = context;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    /// <summary>
    /// Thêm thành viên vào dự án
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> AddMember(int projectId, [FromBody] AddProjectMemberRequest request)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _projectMemberService.AddMemberAsync(projectId, currentUserId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Lấy danh sách thành viên của dự án
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetProjectMembers(int projectId)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _projectMemberService.GetProjectMembersAsync(projectId, currentUserId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data, count = result.Data?.Count ?? 0 });
    }

    /// <summary>
    /// Cập nhật quyền của thành viên
    /// </summary>
    [HttpPut("{memberId}/role")]
    public async Task<IActionResult> UpdateMemberRole(int projectId, int memberId, [FromBody] UpdateProjectMemberRoleRequest request)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _projectMemberService.UpdateMemberRoleAsync(projectId, memberId, currentUserId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Xóa thành viên khỏi dự án
    /// </summary>
    [HttpDelete("{memberId}")]
    public async Task<IActionResult> RemoveMember(int projectId, int memberId)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _projectMemberService.RemoveMemberAsync(projectId, memberId, currentUserId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }

    /// <summary>
    /// Lấy danh sách users có thể thêm vào project (chưa là member)
    /// </summary>
    [HttpGet("available-users")]
    public async Task<IActionResult> GetAvailableUsers(int projectId)
    {
        // Get current project members
        var memberUserIds = await _context.ProjectMembers
            .Where(pm => pm.ProjectId == projectId && pm.IsActive)
            .Select(pm => pm.UserId)
            .ToListAsync();

        // Get all active users except current members
        var availableUsers = await _context.Users
            .Where(u => u.IsActive && !memberUserIds.Contains(u.UserId))
            .OrderBy(u => u.FullName)
            .Select(u => new
            {
                u.UserId,
                u.Email,
                u.FullName,
                u.Role
            })
            .ToListAsync();

        return Ok(new { data = availableUsers, count = availableUsers.Count });
    }
}

