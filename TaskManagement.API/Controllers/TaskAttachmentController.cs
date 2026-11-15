using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.DTOs.Task;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.API.Controllers;

[ApiController]
[ApiExplorerSettings(GroupName = "legacy")]
[Route("api/project/{projectId}/tasks/{taskId}/attachments")]
[Authorize]
public class TaskAttachmentController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IFileStorageService _fileStorage;
    private static readonly string[] AllowedExtensions = { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".gif", ".zip", ".txt" };
    private const long MaxFileSize = 10 * 1024 * 1024; // 10MB

    public TaskAttachmentController(ApplicationDbContext context, IFileStorageService fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    /// <summary>
    /// Upload file đính kèm vào task
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> UploadAttachment(int projectId, int taskId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        // Validate file size
        if (file.Length > MaxFileSize)
        {
            return BadRequest(new { message = $"File size exceeds maximum allowed size of {MaxFileSize / 1024 / 1024}MB" });
        }

        // Validate file extension
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = $"File type not allowed. Allowed types: {string.Join(", ", AllowedExtensions)}" });
        }

        var userId = GetCurrentUserId();

        // Check task exists and user has access
        var task = await _context.ProjectTasks
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.TaskId == taskId && t.ProjectId == projectId && t.IsActive);

        if (task == null)
        {
            return NotFound(new { message = "Task not found" });
        }

        // Save file
        using var stream = file.OpenReadStream();
        var saveResult = await _fileStorage.SaveFileAsync(stream, file.FileName, $"tasks/{taskId}");

        if (!saveResult.IsSuccess)
        {
            return BadRequest(new { message = saveResult.Message });
        }

        // Create attachment record
        var attachment = new TaskAttachment
        {
            TaskId = taskId,
            FileName = file.FileName,
            FilePath = saveResult.Data!,
            ContentType = file.ContentType,
            FileSize = file.Length,
            UploadedById = userId,
            UploadedAt = DateTime.UtcNow
        };

        _context.TaskAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        // Load uploader info
        await _context.Entry(attachment).Reference(a => a.UploadedBy).LoadAsync();

        var attachmentDto = MapToDto(attachment);
        return Ok(new { message = "File uploaded successfully", data = attachmentDto });
    }

    /// <summary>
    /// Lấy danh sách attachments của task
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAttachments(int projectId, int taskId)
    {
        var attachments = await _context.TaskAttachments
            .Include(a => a.UploadedBy)
            .Where(a => a.TaskId == taskId)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync();

        var attachmentDtos = attachments.Select(MapToDto).ToList();
        return Ok(new { data = attachmentDtos, count = attachmentDtos.Count });
    }

    /// <summary>
    /// Download file attachment
    /// </summary>
    [HttpGet("{attachmentId}/download")]
    public async Task<IActionResult> DownloadAttachment(int projectId, int taskId, int attachmentId)
    {
        var attachment = await _context.TaskAttachments
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.TaskId == taskId);

        if (attachment == null)
        {
            return NotFound(new { message = "Attachment not found" });
        }

        var fileResult = await _fileStorage.GetFileAsync(attachment.FilePath);
        if (!fileResult.IsSuccess)
        {
            return NotFound(new { message = fileResult.Message });
        }

        return File(fileResult.Data!, attachment.ContentType, attachment.FileName);
    }

    /// <summary>
    /// Xóa attachment
    /// </summary>
    [HttpDelete("{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(int projectId, int taskId, int attachmentId)
    {
        var attachment = await _context.TaskAttachments
            .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.TaskId == taskId);

        if (attachment == null)
        {
            return NotFound(new { message = "Attachment not found" });
        }

        // Delete file from storage
        await _fileStorage.DeleteFileAsync(attachment.FilePath);

        // Delete record
        _context.TaskAttachments.Remove(attachment);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Attachment deleted successfully" });
    }

    private TaskAttachmentDto MapToDto(TaskAttachment attachment)
    {
        return new TaskAttachmentDto
        {
            AttachmentId = attachment.AttachmentId,
            TaskId = attachment.TaskId,
            FileName = attachment.FileName,
            FilePath = _fileStorage.GetFileUrl(attachment.FilePath),
            ContentType = attachment.ContentType,
            FileSize = attachment.FileSize,
            UploadedById = attachment.UploadedById,
            UploadedBy = attachment.UploadedBy == null ? null : new UserDto
            {
                UserId = attachment.UploadedBy.UserId,
                Email = attachment.UploadedBy.Email,
                FullName = attachment.UploadedBy.FullName,
                AvatarUrl = attachment.UploadedBy.AvatarUrl,
                Role = attachment.UploadedBy.Role,
                CreatedAt = attachment.UploadedBy.CreatedAt
            },
            UploadedAt = attachment.UploadedAt
        };
    }
}

