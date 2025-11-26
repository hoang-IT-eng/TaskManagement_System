using TaskManagement.Application.DTOs;

namespace TaskManagement.Application.DTOs.Team;

public class TeamDto
{
    public int TeamId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int LeaderId { get; set; }
    public UserDto? Leader { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ProjectTeamDto> LinkedProjects { get; set; } = new List<ProjectTeamDto>();
}



