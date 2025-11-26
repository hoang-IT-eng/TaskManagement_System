namespace TaskManagement.Application.DTOs.Team;

public class CreateTeamRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int LeaderId { get; set; }
}



