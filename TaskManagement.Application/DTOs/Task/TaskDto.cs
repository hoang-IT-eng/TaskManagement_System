using TaskManagement.Application.DTOs;

namespace TaskManagement.Application.DTOs.Task;

public class TaskDto
{
    public int TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ProjectId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int? AssigneeId { get; set; }
    public UserDto? Assignee { get; set; }
    public int? AssignedTeamId { get; set; }
    public string? AssignedTeamName { get; set; }
    public int CreatedById { get; set; }
    public UserDto? CreatedBy { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? EstimatedHours { get; set; }
    public int? ActualHours { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

