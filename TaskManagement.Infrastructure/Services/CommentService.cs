using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs.Task;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;
using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Services;

public class CommentService : ICommentService
{
    private readonly ApplicationDbContext _context;

    public CommentService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CommentDto>> AddCommentAsync(int userId, CreateCommentRequest request)
    {
        // Validate task exists
        var task = await _context.ProjectTasks
            .FirstOrDefaultAsync(t => t.TaskId == request.TaskId && t.IsActive);
        
        if (task == null)
        {
            return Result<CommentDto>.Failure("Task not found");
        }

        // Validate user exists
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.IsActive)
        {
            return Result<CommentDto>.Failure("User not found or inactive");
        }

        var comment = new TaskComment
        {
            TaskId = request.TaskId,
            UserId = userId,
            Content = request.Content.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.TaskComments.Add(comment);
        await _context.SaveChangesAsync();

        // Load user data for response
        await _context.Entry(comment)
            .Reference(c => c.User)
            .LoadAsync();

        var commentDto = MapToCommentDto(comment);
        return Result<CommentDto>.Success(commentDto, "Comment added successfully");
    }

    public async Task<Result<List<CommentDto>>> GetTaskCommentsAsync(int taskId)
    {
        // Validate task exists
        var taskExists = await _context.ProjectTasks
            .AnyAsync(t => t.TaskId == taskId && t.IsActive);
        
        if (!taskExists)
        {
            return Result<List<CommentDto>>.Failure("Task not found");
        }

        var comments = await _context.TaskComments
            .Where(c => c.TaskId == taskId && c.IsActive)
            .Include(c => c.User)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto
            {
                CommentId = c.CommentId,
                TaskId = c.TaskId,
                UserId = c.UserId,
                UserFullName = c.User.FullName,
                UserAvatarUrl = c.User.AvatarUrl,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();

        return Result<List<CommentDto>>.Success(comments, "Comments retrieved successfully");
    }

    public async Task<Result<CommentDto>> UpdateCommentAsync(int commentId, int userId, UpdateCommentRequest request)
    {
        var comment = await _context.TaskComments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CommentId == commentId && c.IsActive);

        if (comment == null)
        {
            return Result<CommentDto>.Failure("Comment not found");
        }

        // Only the comment owner can update
        if (comment.UserId != userId)
        {
            return Result<CommentDto>.Failure("You don't have permission to update this comment");
        }

        comment.Content = request.Content.Trim();
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var commentDto = MapToCommentDto(comment);
        return Result<CommentDto>.Success(commentDto, "Comment updated successfully");
    }

    public async Task<Result<bool>> DeleteCommentAsync(int commentId, int userId)
    {
        var comment = await _context.TaskComments
            .FirstOrDefaultAsync(c => c.CommentId == commentId && c.IsActive);

        if (comment == null)
        {
            return Result<bool>.Failure("Comment not found");
        }

        // Only the comment owner can delete
        if (comment.UserId != userId)
        {
            return Result<bool>.Failure("You don't have permission to delete this comment");
        }

        // Soft delete
        comment.IsActive = false;
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Result<bool>.Success(true, "Comment deleted successfully");
    }

    private CommentDto MapToCommentDto(TaskComment comment)
    {
        return new CommentDto
        {
            CommentId = comment.CommentId,
            TaskId = comment.TaskId,
            UserId = comment.UserId,
            UserFullName = comment.User.FullName,
            UserAvatarUrl = comment.User.AvatarUrl,
            Content = comment.Content,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt
        };
    }
}






