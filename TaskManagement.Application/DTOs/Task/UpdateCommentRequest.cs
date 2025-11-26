using System.ComponentModel.DataAnnotations;

namespace TaskManagement.Application.DTOs.Task;

public class UpdateCommentRequest
{
    [Required(ErrorMessage = "Content is required")]
    [StringLength(5000, ErrorMessage = "Content cannot exceed 5000 characters")]
    public string Content { get; set; } = string.Empty;
}






