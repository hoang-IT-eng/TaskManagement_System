using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs.Report;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ReportController(ApplicationDbContext context)
    {
        _context = context;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    /// <summary>
    /// Thống kê tasks theo project
    /// </summary>
    [HttpGet("project/{projectId}/statistics")]
    public async Task<IActionResult> GetProjectStatistics(int projectId)
    {
        var userId = GetCurrentUserId();

        // Check access
        var hasAccess = await _context.Projects.AnyAsync(p => p.ProjectId == projectId && p.OwnerId == userId) ||
                       await _context.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.IsActive);

        if (!hasAccess)
        {
            return Forbid();
        }

        var tasks = await _context.ProjectTasks
            .Where(t => t.ProjectId == projectId && t.IsActive)
            .ToListAsync();

        var totalTasks = tasks.Count;
        var completedTasks = tasks.Count(t => t.Status == Domain.Enums.ProjectTaskStatus.Done);
        var overdueTasks = tasks.Count(t => t.DueDate.HasValue && t.DueDate < DateTime.UtcNow && t.Status != Domain.Enums.ProjectTaskStatus.Done);

        var statistics = new TaskStatisticsDto
        {
            TotalTasks = totalTasks,
            TasksByStatus = tasks.GroupBy(t => t.Status.ToString()).ToDictionary(g => g.Key, g => g.Count()),
            TasksByPriority = tasks.GroupBy(t => t.Priority.ToString()).ToDictionary(g => g.Key, g => g.Count()),
            CompletedTasks = completedTasks,
            OverdueTasks = overdueTasks,
            CompletionRate = totalTasks > 0 ? (double)completedTasks / totalTasks * 100 : 0
        };

        return Ok(new { data = statistics });
    }

    /// <summary>
    /// Thống kê tasks theo user
    /// </summary>
    [HttpGet("user/{userId}/statistics")]
    public async Task<IActionResult> GetUserStatistics(int userId)
    {
        var currentUserId = GetCurrentUserId();

        // Only admins or the user themselves can view statistics
        if (currentUserId != userId)
        {
            var isAdmin = await _context.Users.AnyAsync(u => u.UserId == currentUserId && u.Role == "Admin");
            if (!isAdmin)
            {
                return Forbid();
            }
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        var tasks = await _context.ProjectTasks
            .Where(t => t.AssigneeId == userId && t.IsActive)
            .ToListAsync();

        var assignedTasks = tasks.Count;
        var completedTasks = tasks.Count(t => t.Status == Domain.Enums.ProjectTaskStatus.Done);
        var inProgressTasks = tasks.Count(t => t.Status == Domain.Enums.ProjectTaskStatus.InProgress);
        var overdueTasks = tasks.Count(t => t.DueDate.HasValue && t.DueDate < DateTime.UtcNow && t.Status != Domain.Enums.ProjectTaskStatus.Done);

        var statistics = new UserTaskStatisticsDto
        {
            UserId = userId,
            UserName = user.FullName,
            AssignedTasks = assignedTasks,
            CompletedTasks = completedTasks,
            InProgressTasks = inProgressTasks,
            OverdueTasks = overdueTasks,
            CompletionRate = assignedTasks > 0 ? (double)completedTasks / assignedTasks * 100 : 0
        };

        return Ok(new { data = statistics });
    }

    /// <summary>
    /// Thống kê tổng quan tất cả projects của user
    /// </summary>
    [HttpGet("my-projects/statistics")]
    public async Task<IActionResult> GetMyProjectsStatistics()
    {
        var userId = GetCurrentUserId();

        // Get owned projects
        var ownedProjectIds = await _context.Projects
            .Where(p => p.OwnerId == userId && p.IsActive)
            .Select(p => p.ProjectId)
            .ToListAsync();

        // Get member projects
        var memberProjectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == userId && pm.IsActive)
            .Select(pm => pm.ProjectId)
            .ToListAsync();

        var allProjectIds = ownedProjectIds.Union(memberProjectIds).ToList();

        var projectStats = new List<ProjectStatisticsDto>();

        foreach (var projectId in allProjectIds)
        {
            var project = await _context.Projects.FindAsync(projectId);
            if (project == null) continue;

            var tasks = await _context.ProjectTasks
                .Where(t => t.ProjectId == projectId && t.IsActive)
                .ToListAsync();

            var totalTasks = tasks.Count;
            var completedTasks = tasks.Count(t => t.Status == Domain.Enums.ProjectTaskStatus.Done);

            projectStats.Add(new ProjectStatisticsDto
            {
                ProjectId = projectId,
                ProjectName = project.Name,
                TotalTasks = totalTasks,
                CompletedTasks = completedTasks,
                CompletionRate = totalTasks > 0 ? (double)completedTasks / totalTasks * 100 : 0,
                TasksByStatus = tasks.GroupBy(t => t.Status.ToString()).ToDictionary(g => g.Key, g => g.Count())
            });
        }

        return Ok(new { data = projectStats, count = projectStats.Count });
    }
}

