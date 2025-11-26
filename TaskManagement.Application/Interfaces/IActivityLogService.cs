using TaskManagement.Application.DTOs;
using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface IActivityLogService
{
    Task<Result<ActivityLogDto>> LogActivityAsync(int userId, string action, string entityType, int entityId, string? oldValue = null, string? newValue = null, string? description = null);
    Task<Result<List<ActivityLogDto>>> GetTaskActivitiesAsync(int taskId);
    Task<Result<List<ActivityLogDto>>> GetEntityActivitiesAsync(string entityType, int entityId);
}






