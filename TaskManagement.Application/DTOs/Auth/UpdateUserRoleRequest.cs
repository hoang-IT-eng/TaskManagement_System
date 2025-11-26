namespace TaskManagement.Application.DTOs.Auth;

public class UpdateUserRoleRequest
{
    public string Role { get; set; } = "Member"; // Admin, ProjectManager, Member
}

