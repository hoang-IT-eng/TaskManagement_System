namespace TaskManagement.Domain.Entities;

public class TaskComment
{
    public int CommentId { get; set; }
    public int TaskId { get; set; }
    public ProjectTask Task { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}






