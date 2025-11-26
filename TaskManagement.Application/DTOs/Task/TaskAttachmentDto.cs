using TaskManagement.Application.DTOs;

namespace TaskManagement.Application.DTOs.Task;

public class TaskAttachmentDto
{
    public int AttachmentId { get; set; }
    public int TaskId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int UploadedById { get; set; }
    public UserDto? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
}

