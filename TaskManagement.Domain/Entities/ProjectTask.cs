using TaskManagement.Domain.Common;
using TaskManagement.Domain.Enums;

namespace TaskManagement.Domain.Entities;

public class ProjectTask : IVersioned, IAuditable
{
    public int TaskId { get; set; }

    /// <summary>Per-project sequence number, rendered as "{Project.Key}-{Number}" (e.g. ATL-12).</summary>
    public int Number { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public ProjectTaskStatus Status { get; set; } = ProjectTaskStatus.Todo;
    public ProjectTaskPriority Priority { get; set; } = ProjectTaskPriority.Medium;

    /// <summary>Sparse ordering key inside a status column (fractional ranking, rebalanced when gaps collapse).</summary>
    public double Rank { get; set; }

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

    /// <summary>Optimistic concurrency token. Incremented on every save; clients must echo it back on writes.</summary>
    public int Version { get; set; } = 1;

    public ICollection<TaskLabel> Labels { get; set; } = new List<TaskLabel>();
    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
}
