namespace TaskManagement.Application.DTOs.Task;

public class CommentDto
{
    public int CommentId { get; set; }
    public int TaskId { get; set; }
    public int UserId { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public string? UserAvatarUrl { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}






