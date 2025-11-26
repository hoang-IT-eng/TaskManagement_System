namespace TaskManagement.Application.DTOs.Task;

public class TaskFilterRequest
{
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public int? AssigneeId { get; set; }
    public string? SearchTerm { get; set; }
    public DateTime? DueDateFrom { get; set; }
    public DateTime? DueDateTo { get; set; }
}

