using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;
using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Services;

public class ActivityLogService : IActivityLogService
{
    private readonly ApplicationDbContext _context;

    public ActivityLogService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ActivityLogDto>> LogActivityAsync(int userId, string action, string entityType, int entityId, string? oldValue = null, string? newValue = null, string? description = null)
    {
        // Validate user exists
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.IsActive)
        {
            return Result<ActivityLogDto>.Failure("User not found or inactive");
        }

        var activityLog = new ActivityLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValue = oldValue,
            NewValue = newValue,
            Description = description,
            CreatedAt = DateTime.UtcNow
        };

        _context.ActivityLogs.Add(activityLog);
        await _context.SaveChangesAsync();

        // Load user data for response
        await _context.Entry(activityLog)
            .Reference(a => a.User)
            .LoadAsync();

        var activityLogDto = MapToActivityLogDto(activityLog);
        return Result<ActivityLogDto>.Success(activityLogDto, "Activity logged successfully");
    }

    public async Task<Result<List<ActivityLogDto>>> GetTaskActivitiesAsync(int taskId)
    {
        // Validate task exists
        var taskExists = await _context.ProjectTasks
            .AnyAsync(t => t.TaskId == taskId && t.IsActive);
        
        if (!taskExists)
        {
            return Result<List<ActivityLogDto>>.Failure("Task not found");
        }

        var activities = await _context.ActivityLogs
            .Where(a => a.EntityType == "Task" && a.EntityId == taskId)
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new ActivityLogDto
            {
                ActivityLogId = a.ActivityLogId,
                UserId = a.UserId,
                UserFullName = a.User.FullName,
                UserAvatarUrl = a.User.AvatarUrl,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                OldValue = a.OldValue,
                NewValue = a.NewValue,
                Description = a.Description,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Result<List<ActivityLogDto>>.Success(activities, "Activities retrieved successfully");
    }

    public async Task<Result<List<ActivityLogDto>>> GetEntityActivitiesAsync(string entityType, int entityId)
    {
        var activities = await _context.ActivityLogs
            .Where(a => a.EntityType == entityType && a.EntityId == entityId)
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new ActivityLogDto
            {
                ActivityLogId = a.ActivityLogId,
                UserId = a.UserId,
                UserFullName = a.User.FullName,
                UserAvatarUrl = a.User.AvatarUrl,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                OldValue = a.OldValue,
                NewValue = a.NewValue,
                Description = a.Description,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Result<List<ActivityLogDto>>.Success(activities, "Activities retrieved successfully");
    }

    private ActivityLogDto MapToActivityLogDto(ActivityLog activityLog)
    {
        return new ActivityLogDto
        {
            ActivityLogId = activityLog.ActivityLogId,
            UserId = activityLog.UserId,
            UserFullName = activityLog.User.FullName,
            UserAvatarUrl = activityLog.User.AvatarUrl,
            Action = activityLog.Action,
            EntityType = activityLog.EntityType,
            EntityId = activityLog.EntityId,
            OldValue = activityLog.OldValue,
            NewValue = activityLog.NewValue,
            Description = activityLog.Description,
            CreatedAt = activityLog.CreatedAt
        };
    }
}






