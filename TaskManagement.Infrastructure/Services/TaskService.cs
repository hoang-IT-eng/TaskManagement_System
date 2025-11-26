using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.DTOs.Task;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Services;

public class TaskService : ITaskService
{
    private readonly ApplicationDbContext _context;
    private readonly IActivityLogService _activityLogService;

    public TaskService(ApplicationDbContext context, IActivityLogService activityLogService)
    {
        _context = context;
        _activityLogService = activityLogService;
    }

    public async Task<Result<TaskDto>> CreateTaskAsync(int projectId, int userId, CreateTaskRequest request)
    {
        // Kiểm tra project có tồn tại và user có quyền truy cập không
        var hasAccess = await HasProjectAccessAsync(projectId, userId);
        if (!hasAccess)
        {
            return Result<TaskDto>.Failure("You don't have permission to access this project");
        }

        // Kiểm tra assignee (nếu có) có tồn tại và là member của project không
        if (request.AssigneeId.HasValue)
        {
            var assigneeHasAccess = await HasProjectAccessAsync(projectId, request.AssigneeId.Value);
            if (!assigneeHasAccess)
            {
                return Result<TaskDto>.Failure("Assignee must be a member of the project");
            }
        }

        // Kiểm tra và xử lý AssignedTeamId
        if (request.AssignedTeamId.HasValue)
        {
            var teamValidationResult = await ValidateAndLinkTeamToProjectAsync(request.AssignedTeamId.Value, projectId);
            if (!teamValidationResult.IsSuccess)
            {
                return Result<TaskDto>.Failure(teamValidationResult.Message ?? "Invalid team assignment");
            }
        }

        var task = new ProjectTask
        {
            Title = request.Title,
            Description = request.Description,
            ProjectId = projectId,
            Status = Enum.Parse<ProjectTaskStatus>(request.Status),
            Priority = Enum.Parse<ProjectTaskPriority>(request.Priority),
            AssigneeId = request.AssigneeId,
            AssignedTeamId = request.AssignedTeamId,
            CreatedById = userId,
            DueDate = request.DueDate,
            EstimatedHours = request.EstimatedHours,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ProjectTasks.Add(task);
        await _context.SaveChangesAsync();

        // Load relationships
        await _context.Entry(task).Reference(t => t.Assignee).LoadAsync();
        await _context.Entry(task).Reference(t => t.AssignedTeam).LoadAsync();
        await _context.Entry(task).Reference(t => t.CreatedBy).LoadAsync();

        // Log activity
        var newValueJson = System.Text.Json.JsonSerializer.Serialize(new
        {
            Title = task.Title,
            Status = task.Status.ToString(),
            Priority = task.Priority.ToString(),
            AssigneeId = task.AssigneeId,
            AssignedTeamId = task.AssignedTeamId
        });
        
        var description = $"Created task '{task.Title}' with status {task.Status}";
        await _activityLogService.LogActivityAsync(
            userId,
            "Created",
            "Task",
            task.TaskId,
            null,
            newValueJson,
            description
        );

        var taskDto = MapToDto(task);
        return Result<TaskDto>.Success(taskDto, "Task created successfully");
    }

    public async Task<Result<TaskDto>> GetTaskByIdAsync(int projectId, int taskId, int userId)
    {
        var hasAccess = await HasProjectAccessAsync(projectId, userId);
        if (!hasAccess)
        {
            return Result<TaskDto>.Failure("You don't have permission to access this project");
        }

        var task = await _context.ProjectTasks
            .Include(t => t.Assignee)
            .Include(t => t.CreatedBy)
            .FirstOrDefaultAsync(t => t.TaskId == taskId && t.ProjectId == projectId && t.IsActive);

        if (task == null)
        {
            return Result<TaskDto>.Failure("Task not found");
        }

        var taskDto = MapToDto(task);
        return Result<TaskDto>.Success(taskDto);
    }

    public async Task<Result<List<TaskDto>>> GetProjectTasksAsync(int projectId, int userId)
    {
        var hasAccess = await HasProjectAccessAsync(projectId, userId);
        if (!hasAccess)
        {
            return Result<List<TaskDto>>.Failure("You don't have permission to access this project");
        }

        var tasks = await _context.ProjectTasks
            .Include(t => t.Assignee)
            .Include(t => t.AssignedTeam)
            .Include(t => t.CreatedBy)
            .Where(t => t.ProjectId == projectId && t.IsActive)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var taskDtos = tasks.Select(MapToDto).ToList();
        return Result<List<TaskDto>>.Success(taskDtos);
    }

    public async Task<Result<List<TaskDto>>> SearchAndFilterTasksAsync(int projectId, int userId, TaskFilterRequest filter)
    {
        var hasAccess = await HasProjectAccessAsync(projectId, userId);
        if (!hasAccess)
        {
            return Result<List<TaskDto>>.Failure("You don't have permission to access this project");
        }

        var query = _context.ProjectTasks
            .Include(t => t.Assignee)
            .Include(t => t.AssignedTeam)
            .Include(t => t.CreatedBy)
            .Where(t => t.ProjectId == projectId && t.IsActive);

        // Filter by status
        if (!string.IsNullOrEmpty(filter.Status))
        {
            if (Enum.TryParse<ProjectTaskStatus>(filter.Status, out var status))
            {
                query = query.Where(t => t.Status == status);
            }
        }

        // Filter by priority
        if (!string.IsNullOrEmpty(filter.Priority))
        {
            if (Enum.TryParse<ProjectTaskPriority>(filter.Priority, out var priority))
            {
                query = query.Where(t => t.Priority == priority);
            }
        }

        // Filter by assignee
        if (filter.AssigneeId.HasValue)
        {
            query = query.Where(t => t.AssigneeId == filter.AssigneeId.Value);
        }

        // Search by title or description
        if (!string.IsNullOrEmpty(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.ToLower();
            query = query.Where(t =>
                t.Title.ToLower().Contains(searchTerm) ||
                (t.Description != null && t.Description.ToLower().Contains(searchTerm)));
        }

        // Filter by due date range
        if (filter.DueDateFrom.HasValue)
        {
            query = query.Where(t => t.DueDate >= filter.DueDateFrom.Value);
        }

        if (filter.DueDateTo.HasValue)
        {
            query = query.Where(t => t.DueDate <= filter.DueDateTo.Value);
        }

        var tasks = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var taskDtos = tasks.Select(MapToDto).ToList();
        return Result<List<TaskDto>>.Success(taskDtos);
    }

    public async Task<Result<List<TaskGroupByStatusDto>>> GetTasksGroupedByStatusAsync(int projectId, int userId)
    {
        var hasAccess = await HasProjectAccessAsync(projectId, userId);
        if (!hasAccess)
        {
            return Result<List<TaskGroupByStatusDto>>.Failure("You don't have permission to access this project");
        }

        var tasks = await _context.ProjectTasks
            .Include(t => t.Assignee)
            .Include(t => t.AssignedTeam)
            .Include(t => t.CreatedBy)
            .Where(t => t.ProjectId == projectId && t.IsActive)
            .ToListAsync();

        var groupedTasks = tasks
            .GroupBy(t => t.Status)
            .Select(g => new TaskGroupByStatusDto
            {
                Status = g.Key.ToString(),
                Count = g.Count(),
                Tasks = g.Select(MapToDto).OrderBy(t => t.CreatedAt).ToList()
            })
            .OrderBy(g => g.Status)
            .ToList();

        return Result<List<TaskGroupByStatusDto>>.Success(groupedTasks);
    }

    public async Task<Result<TaskDto>> UpdateTaskAsync(int projectId, int taskId, int userId, UpdateTaskRequest request)
    {
        var hasAccess = await HasProjectAccessAsync(projectId, userId);
        if (!hasAccess)
        {
            return Result<TaskDto>.Failure("You don't have permission to access this project");
        }

        var task = await _context.ProjectTasks
            .Include(t => t.Assignee)
            .Include(t => t.CreatedBy)
            .FirstOrDefaultAsync(t => t.TaskId == taskId && t.ProjectId == projectId && t.IsActive);

        if (task == null)
        {
            return Result<TaskDto>.Failure("Task not found");
        }

        // Store old values for activity log
        var oldStatus = task.Status;
        var oldPriority = task.Priority;
        var oldAssigneeId = task.AssigneeId;
        var oldAssignedTeamId = task.AssignedTeamId;
        var oldTitle = task.Title;

        // Kiểm tra assignee mới (nếu có)
        if (request.AssigneeId.HasValue && request.AssigneeId != task.AssigneeId)
        {
            var assigneeHasAccess = await HasProjectAccessAsync(projectId, request.AssigneeId.Value);
            if (!assigneeHasAccess)
            {
                return Result<TaskDto>.Failure("Assignee must be a member of the project");
            }
        }

        // Kiểm tra và xử lý AssignedTeamId
        if (request.AssignedTeamId.HasValue && request.AssignedTeamId != task.AssignedTeamId)
        {
            var teamValidationResult = await ValidateAndLinkTeamToProjectAsync(request.AssignedTeamId.Value, projectId);
            if (!teamValidationResult.IsSuccess)
            {
                return Result<TaskDto>.Failure(teamValidationResult.Message ?? "Invalid team assignment");
            }
        }

        // Update fields
        task.Title = request.Title;
        task.Description = request.Description;
        
        var newStatus = Enum.Parse<ProjectTaskStatus>(request.Status);
        if (newStatus == ProjectTaskStatus.Done && task.Status != ProjectTaskStatus.Done)
        {
            task.CompletedAt = DateTime.UtcNow;
        }
        else if (newStatus != ProjectTaskStatus.Done && task.Status == ProjectTaskStatus.Done)
        {
            task.CompletedAt = null;
        }
        
        task.Status = newStatus;
        task.Priority = Enum.Parse<ProjectTaskPriority>(request.Priority);
        task.AssigneeId = request.AssigneeId;
        task.AssignedTeamId = request.AssignedTeamId;
        task.DueDate = request.DueDate;
        task.EstimatedHours = request.EstimatedHours;
        task.ActualHours = request.ActualHours;
        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Log activity - only log if there are actual changes
        var changes = new List<string>();
        var oldValueDict = new Dictionary<string, object?>();
        var newValueDict = new Dictionary<string, object?>();

        if (oldTitle != request.Title)
        {
            changes.Add($"title from '{oldTitle}' to '{request.Title}'");
            oldValueDict["Title"] = oldTitle;
            newValueDict["Title"] = request.Title;
        }

        if (oldStatus != newStatus)
        {
            changes.Add($"status from {oldStatus} to {newStatus}");
            oldValueDict["Status"] = oldStatus.ToString();
            newValueDict["Status"] = newStatus.ToString();
        }

        if (oldPriority != task.Priority)
        {
            changes.Add($"priority from {oldPriority} to {task.Priority}");
            oldValueDict["Priority"] = oldPriority.ToString();
            newValueDict["Priority"] = task.Priority.ToString();
        }

        if (oldAssigneeId != request.AssigneeId)
        {
            changes.Add("assignee");
            oldValueDict["AssigneeId"] = oldAssigneeId;
            newValueDict["AssigneeId"] = request.AssigneeId;
        }

        if (oldAssignedTeamId != request.AssignedTeamId)
        {
            changes.Add("assigned team");
            oldValueDict["AssignedTeamId"] = oldAssignedTeamId;
            newValueDict["AssignedTeamId"] = request.AssignedTeamId;
        }

        if (changes.Any())
        {
            var oldValueJson = oldValueDict.Any() ? System.Text.Json.JsonSerializer.Serialize(oldValueDict) : null;
            var newValueJson = newValueDict.Any() ? System.Text.Json.JsonSerializer.Serialize(newValueDict) : null;
            var description = $"Updated {string.Join(", ", changes)}";
            
            await _activityLogService.LogActivityAsync(
                userId,
                "Updated",
                "Task",
                task.TaskId,
                oldValueJson,
                newValueJson,
                description
            );
        }

        // Reload relationships
        await _context.Entry(task).Reference(t => t.Assignee).LoadAsync();
        await _context.Entry(task).Reference(t => t.AssignedTeam).LoadAsync();

        var taskDto = MapToDto(task);
        return Result<TaskDto>.Success(taskDto, "Task updated successfully");
    }

    public async Task<Result<bool>> DeleteTaskAsync(int projectId, int taskId, int userId)
    {
        var hasAccess = await HasProjectAccessAsync(projectId, userId);
        if (!hasAccess)
        {
            return Result<bool>.Failure("You don't have permission to access this project");
        }

        var task = await _context.ProjectTasks
            .FirstOrDefaultAsync(t => t.TaskId == taskId && t.ProjectId == projectId && t.IsActive);

        if (task == null)
        {
            return Result<bool>.Failure("Task not found");
        }

        // Soft delete
        task.IsActive = false;
        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Log activity
        var oldValueJson = System.Text.Json.JsonSerializer.Serialize(new
        {
            Title = task.Title,
            Status = task.Status.ToString(),
            Priority = task.Priority.ToString()
        });
        
        await _activityLogService.LogActivityAsync(
            userId,
            "Deleted",
            "Task",
            task.TaskId,
            oldValueJson,
            null,
            $"Deleted task '{task.Title}'"
        );

        return Result<bool>.Success(true, "Task deleted successfully");
    }

    // Helper methods
    private async Task<bool> HasProjectAccessAsync(int projectId, int userId)
    {
        var project = await _context.Projects.FindAsync(projectId);
        if (project?.OwnerId == userId && project.IsActive)
        {
            return true;
        }

        var isMember = await _context.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.IsActive);

        return isMember;
    }

    /// <summary>
    /// Validate team exists and is linked to project. If not linked, automatically link it.
    /// </summary>
    private async Task<Result<bool>> ValidateAndLinkTeamToProjectAsync(int teamId, int projectId)
    {
        // Kiểm tra team có tồn tại và active không
        var team = await _context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return Result<bool>.Failure("Team not found or is inactive");
        }

        // Kiểm tra project có tồn tại và active không
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<bool>.Failure("Project not found or is inactive");
        }

        // Kiểm tra team đã được liên kết với project chưa
        var existingLink = await _context.ProjectTeams
            .FirstOrDefaultAsync(pt => pt.TeamId == teamId && pt.ProjectId == projectId);

        if (existingLink == null)
        {
            // Tự động liên kết team với project
            var projectTeam = new ProjectTeam
            {
                TeamId = teamId,
                ProjectId = projectId,
                AssignedAt = DateTime.UtcNow
            };

            _context.ProjectTeams.Add(projectTeam);
            await _context.SaveChangesAsync();
        }

        return Result<bool>.Success(true);
    }

    private static TaskDto MapToDto(ProjectTask task)
    {
        return new TaskDto
        {
            TaskId = task.TaskId,
            Title = task.Title,
            Description = task.Description,
            ProjectId = task.ProjectId,
            Status = task.Status.ToString(),
            Priority = task.Priority.ToString(),
            AssigneeId = task.AssigneeId,
            Assignee = task.Assignee == null ? null : new UserDto
            {
                UserId = task.Assignee.UserId,
                Email = task.Assignee.Email,
                FullName = task.Assignee.FullName,
                AvatarUrl = task.Assignee.AvatarUrl,
                Bio = task.Assignee.Bio,
                PhoneNumber = task.Assignee.PhoneNumber,
                Role = task.Assignee.Role,
                CreatedAt = task.Assignee.CreatedAt
            },
            AssignedTeamId = task.AssignedTeamId,
            AssignedTeamName = task.AssignedTeam?.Name,
            CreatedById = task.CreatedById,
            CreatedBy = task.CreatedBy == null ? null : new UserDto
            {
                UserId = task.CreatedBy.UserId,
                Email = task.CreatedBy.Email,
                FullName = task.CreatedBy.FullName,
                AvatarUrl = task.CreatedBy.AvatarUrl,
                Bio = task.CreatedBy.Bio,
                PhoneNumber = task.CreatedBy.PhoneNumber,
                Role = task.CreatedBy.Role,
                CreatedAt = task.CreatedBy.CreatedAt
            },
            DueDate = task.DueDate,
            CompletedAt = task.CompletedAt,
            EstimatedHours = task.EstimatedHours,
            ActualHours = task.ActualHours,
            IsActive = task.IsActive,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt
        };
    }
}

