namespace TaskManagement.Domain.Entities;

public class ActivityLog
{
    public int ActivityLogId { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Action { get; set; } = string.Empty; // Created, Updated, Deleted
    public string EntityType { get; set; } = string.Empty; // Task, Project, Comment, etc.
    public int EntityId { get; set; }
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public string? OldValue { get; set; } // JSON string
    public string? NewValue { get; set; } // JSON string
    public string? Description { get; set; } // Human-readable description
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
