namespace TaskManagement.Application.DTOs.Task;

public class CreateTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "Todo";
    public string Priority { get; set; } = "Medium";
    public int? AssigneeId { get; set; }
    public int? AssignedTeamId { get; set; }
    public DateTime? DueDate { get; set; }
    public int? EstimatedHours { get; set; }
}

