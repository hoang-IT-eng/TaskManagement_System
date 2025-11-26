namespace TaskManagement.Application.DTOs.Report;

public class TaskStatisticsDto
{
    public int TotalTasks { get; set; }
    public Dictionary<string, int> TasksByStatus { get; set; } = new();
    public Dictionary<string, int> TasksByPriority { get; set; } = new();
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public double CompletionRate { get; set; }
}

public class UserTaskStatisticsDto
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int AssignedTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int OverdueTasks { get; set; }
    public double CompletionRate { get; set; }
}

public class ProjectStatisticsDto
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public double CompletionRate { get; set; }
    public Dictionary<string, int> TasksByStatus { get; set; } = new();
}

