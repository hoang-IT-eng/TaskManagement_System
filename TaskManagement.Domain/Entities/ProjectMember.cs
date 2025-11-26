using TaskManagement.Domain.Enums;

namespace TaskManagement.Domain.Entities;

public class ProjectMember
{
    public int ProjectMemberId { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public ProjectRole Role { get; set; } = ProjectRole.Member;
    public string? ProjectRoleCode { get; set; } // Phân quyền trong dự án (mặc định lấy từ Position.Code, có thể sửa)
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastAccessedAt { get; set; }
    public bool IsActive { get; set; } = true;
}

