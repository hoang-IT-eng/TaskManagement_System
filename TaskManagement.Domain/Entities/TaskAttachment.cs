namespace TaskManagement.Domain.Entities;

public class TaskAttachment
{
    public int AttachmentId { get; set; }
    public int TaskId { get; set; }
    public ProjectTask Task { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int UploadedById { get; set; }
    public User UploadedBy { get; set; } = null!;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

