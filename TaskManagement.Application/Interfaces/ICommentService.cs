using TaskManagement.Application.DTOs.Task;
using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface ICommentService
{
    Task<Result<CommentDto>> AddCommentAsync(int userId, CreateCommentRequest request);
    Task<Result<List<CommentDto>>> GetTaskCommentsAsync(int taskId);
    Task<Result<CommentDto>> UpdateCommentAsync(int commentId, int userId, UpdateCommentRequest request);
    Task<Result<bool>> DeleteCommentAsync(int commentId, int userId);
}






