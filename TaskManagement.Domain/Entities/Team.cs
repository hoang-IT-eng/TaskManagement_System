namespace TaskManagement.Domain.Entities;

public class Team
{
    public int TeamId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int LeaderId { get; set; }
    public User Leader { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property for linked projects
    public ICollection<ProjectTeam> ProjectTeams { get; set; } = new List<ProjectTeam>();
}



