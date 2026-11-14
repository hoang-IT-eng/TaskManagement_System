namespace TaskManagement.Domain.Entities;

public class Label
{
    public int LabelId { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6B7570";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<TaskLabel> Tasks { get; set; } = new List<TaskLabel>();
}

public class TaskLabel
{
    public int TaskId { get; set; }
    public ProjectTask Task { get; set; } = null!;
    public int LabelId { get; set; }
    public Label Label { get; set; } = null!;
}
