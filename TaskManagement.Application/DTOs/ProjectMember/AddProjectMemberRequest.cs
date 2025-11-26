namespace TaskManagement.Application.DTOs.ProjectMember;

public class AddProjectMemberRequest
{
    public int UserId { get; set; }
    public string Role { get; set; } = "Member"; // Owner, Admin, Member, Viewer
}

