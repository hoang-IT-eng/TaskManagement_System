namespace TaskManagement.Domain.Entities;

public class Notification
{
    public int NotificationId { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int? ActorId { get; set; }
    public User? Actor { get; set; }

    /// <summary>task.assigned | task.commented | project.member_added | task.status_changed</summary>
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
