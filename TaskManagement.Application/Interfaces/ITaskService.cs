using TaskManagement.Application.DTOs.Task;
using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface ITaskService
{
    Task<Result<TaskDto>> CreateTaskAsync(int projectId, int userId, CreateTaskRequest request);
    Task<Result<TaskDto>> GetTaskByIdAsync(int projectId, int taskId, int userId);
    Task<Result<List<TaskDto>>> GetProjectTasksAsync(int projectId, int userId);
    Task<Result<List<TaskDto>>> SearchAndFilterTasksAsync(int projectId, int userId, TaskFilterRequest filter);
    Task<Result<List<TaskGroupByStatusDto>>> GetTasksGroupedByStatusAsync(int projectId, int userId);
    Task<Result<TaskDto>> UpdateTaskAsync(int projectId, int taskId, int userId, UpdateTaskRequest request);
    Task<Result<bool>> DeleteTaskAsync(int projectId, int taskId, int userId);
}

