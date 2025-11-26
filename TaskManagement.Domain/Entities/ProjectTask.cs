using TaskManagement.Domain.Enums;

namespace TaskManagement.Domain.Entities;

public class ProjectTask
{
    public int TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public ProjectTaskStatus Status { get; set; } = ProjectTaskStatus.Todo;
    public ProjectTaskPriority Priority { get; set; } = ProjectTaskPriority.Medium;
    public int? AssigneeId { get; set; }
    public User? Assignee { get; set; }
    public int? AssignedTeamId { get; set; }
    public Team? AssignedTeam { get; set; }
    public int CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? EstimatedHours { get; set; }
    public int? ActualHours { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

