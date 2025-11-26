using TaskManagement.Application.DTOs;

namespace TaskManagement.Application.DTOs.ProjectMember;

public class ProjectMemberDto
{
    public int ProjectMemberId { get; set; }
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    public UserDto User { get; set; } = null!;
    public string Role { get; set; } = string.Empty;
    public string? ProjectRoleCode { get; set; } // Phân quyền trong dự án (mặc định lấy từ Position.Code, có thể sửa)
    public DateTime JoinedAt { get; set; }
    public DateTime? LastAccessedAt { get; set; }
    public bool IsActive { get; set; }
}

