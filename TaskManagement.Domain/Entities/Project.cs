using TaskManagement.Domain.Common;

namespace TaskManagement.Domain.Entities;

public class Project : IVersioned, IAuditable
{
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>Short uppercase prefix used for task keys (e.g. "ATL").</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Next task number to hand out. Incremented under the project's concurrency token.</summary>
    public int NextTaskNumber { get; set; } = 1;

    public string? Description { get; set; }
    public string Status { get; set; } = "Planning"; // Planning, InProgress, Completed, OnHold, Cancelled
    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Critical
    public string Color { get; set; } = "#3C5A48";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal? Budget { get; set; }
    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    public ICollection<ProjectTeam> ProjectTeams { get; set; } = new List<ProjectTeam>();
    public ICollection<ProjectTask> Tasks { get; set; } = new List<ProjectTask>();
    public ICollection<Label> Labels { get; set; } = new List<Label>();
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int Version { get; set; } = 1;
}
