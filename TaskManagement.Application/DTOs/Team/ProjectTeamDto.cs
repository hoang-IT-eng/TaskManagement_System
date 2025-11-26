namespace TaskManagement.Application.DTOs.Team;

public class ProjectTeamDto
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ProjectKey { get; set; } = string.Empty; // Generated from ProjectId or Name
    public DateTime AssignedAt { get; set; }
}

