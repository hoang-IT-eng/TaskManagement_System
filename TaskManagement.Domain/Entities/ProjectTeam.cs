namespace TaskManagement.Domain.Entities;

public class ProjectTeam
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}



