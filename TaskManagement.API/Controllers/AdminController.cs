using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs.Auth;
using TaskManagement.Infrastructure.Data;
using System;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách tất cả users (Admin only)
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var users = await _context.Users
            .Where(u => u.IsActive)
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.UserId,
                u.Email,
                u.FullName,
                u.Role,
                u.IsActive,
                u.EmailConfirmed,
                u.CreatedAt,
                u.LastLoginAt
            })
            .ToListAsync();

        var total = await _context.Users.CountAsync(u => u.IsActive);

        return Ok(new { data = users, total, page, pageSize });
    }

    /// <summary>
    /// Cập nhật role của user (Admin only)
    /// </summary>
    [HttpPut("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(int userId, [FromBody] UpdateUserRoleRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        var validRoles = new[] { "Admin", "ProjectManager", "Member" };
        if (!validRoles.Contains(request.Role))
        {
            return BadRequest(new { message = $"Invalid role. Must be one of: {string.Join(", ", validRoles)}" });
        }

        user.Role = request.Role;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "User role updated successfully", data = new { user.UserId, user.Email, user.FullName, user.Role } });
    }

    /// <summary>
    /// Deactivate user (Admin only)
    /// </summary>
    [HttpPost("users/{userId}/deactivate")]
    public async Task<IActionResult> DeactivateUser(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        if (user.Role == "Admin")
        {
            return BadRequest(new { message = "Cannot deactivate admin users" });
        }

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "User deactivated successfully" });
    }

    /// <summary>
    /// Thống kê hệ thống (Admin only)
    /// </summary>
    [HttpGet("system-statistics")]
    public async Task<IActionResult> GetSystemStatistics()
    {
        var totalUsers = await _context.Users.CountAsync(u => u.IsActive);
        var totalProjects = await _context.Projects.CountAsync(p => p.IsActive);
        var totalTasks = await _context.ProjectTasks.CountAsync(t => t.IsActive);
        var completedTasks = await _context.ProjectTasks.CountAsync(t => t.IsActive && t.Status == Domain.Enums.ProjectTaskStatus.Done);

        var statistics = new
        {
            totalUsers,
            totalProjects,
            totalTasks,
            completedTasks,
            completionRate = totalTasks > 0 ? (double)completedTasks / totalTasks * 100 : 0,
            usersByRole = await _context.Users.Where(u => u.IsActive).GroupBy(u => u.Role).Select(g => new { role = g.Key, count = g.Count() }).ToListAsync()
        };

        return Ok(new { data = statistics });
    }
}

