namespace TaskManagement.Application.DTOs.ProjectMember;

public class UpdateProjectMemberRoleRequest
{
    public string Role { get; set; } = "Member"; // Owner, Admin, Member, Viewer
}

