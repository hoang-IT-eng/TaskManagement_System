namespace TaskManagement.Application.DTOs.Team;

public class UpdateTeamRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int LeaderId { get; set; }
}



