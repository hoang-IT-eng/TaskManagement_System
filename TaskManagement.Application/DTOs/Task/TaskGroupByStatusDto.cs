namespace TaskManagement.Application.DTOs.Task;

public class TaskGroupByStatusDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
    public List<TaskDto> Tasks { get; set; } = new List<TaskDto>();
}

