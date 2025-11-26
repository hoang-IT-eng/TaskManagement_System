using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.DTOs.ProjectMember;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Services;

public class ProjectMemberService : IProjectMemberService
{
    private readonly ApplicationDbContext _context;

    public ProjectMemberService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ProjectMemberDto>> AddMemberAsync(int projectId, int currentUserId, AddProjectMemberRequest request)
    {
        // Kiểm tra project có tồn tại không
        var project = await _context.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<ProjectMemberDto>.Failure("Project not found");
        }

        // Kiểm tra quyền: chỉ Owner và Admin mới có thể thêm thành viên
        if (!await HasPermissionToManageMembersAsync(projectId, currentUserId))
        {
            return Result<ProjectMemberDto>.Failure("You don't have permission to add members to this project");
        }

        // Kiểm tra user được thêm có tồn tại không
        var userToAdd = await _context.Users.FindAsync(request.UserId);
        if (userToAdd == null)
        {
            return Result<ProjectMemberDto>.Failure("User not found");
        }

        // Kiểm tra user đã là thành viên chưa
        var existingMember = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == request.UserId);

        if (existingMember != null)
        {
            if (existingMember.IsActive)
            {
                return Result<ProjectMemberDto>.Failure("User is already a member of this project");
            }
            
            // Nếu đã bị remove, kích hoạt lại
            existingMember.IsActive = true;
            existingMember.Role = Enum.Parse<ProjectRole>(request.Role);
            existingMember.JoinedAt = DateTime.UtcNow;
        }
        else
        {
            // Thêm thành viên mới
            // Lấy Position của user để set ProjectRoleCode mặc định
            var user = await _context.Users
                .Include(u => u.Position)
                .FirstOrDefaultAsync(u => u.UserId == request.UserId);
            
            var defaultProjectRoleCode = user?.Position?.Code; // Mặc định lấy từ Position.Code

            var newMember = new ProjectMember
            {
                ProjectId = projectId,
                UserId = request.UserId,
                Role = Enum.Parse<ProjectRole>(request.Role),
                ProjectRoleCode = defaultProjectRoleCode, // Set mặc định từ Position.Code
                JoinedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.ProjectMembers.Add(newMember);
            existingMember = newMember;
        }

        await _context.SaveChangesAsync();

        // Load user info với Department và Position
        await _context.Entry(existingMember)
            .Reference(m => m.User)
            .LoadAsync();
        
        if (existingMember.User != null)
        {
            await _context.Entry(existingMember.User)
                .Reference(u => u.Department)
                .LoadAsync();
            await _context.Entry(existingMember.User)
                .Reference(u => u.Position)
                .LoadAsync();
        }

        var memberDto = MapToDto(existingMember);
        return Result<ProjectMemberDto>.Success(memberDto, "Member added successfully");
    }

    public async Task<Result<List<ProjectMemberDto>>> GetProjectMembersAsync(int projectId, int currentUserId)
    {
        // Kiểm tra project có tồn tại không
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<List<ProjectMemberDto>>.Failure("Project not found");
        }

        // Kiểm tra quyền truy cập
        if (!await HasAccessToProjectAsync(projectId, currentUserId))
        {
            return Result<List<ProjectMemberDto>>.Failure("You don't have permission to view this project's members");
        }

        var members = await _context.ProjectMembers
            .Include(pm => pm.User)
                .ThenInclude(u => u.Department)
            .Include(pm => pm.User)
                .ThenInclude(u => u.Position)
            .Where(pm => pm.ProjectId == projectId && pm.IsActive)
            .OrderBy(pm => pm.JoinedAt)
            .ToListAsync();

        var memberDtos = members.Select(MapToDto).ToList();
        return Result<List<ProjectMemberDto>>.Success(memberDtos);
    }

    public async Task<Result<ProjectMemberDto>> UpdateMemberRoleAsync(int projectId, int memberId, int currentUserId, UpdateProjectMemberRoleRequest request)
    {
        // Kiểm tra project có tồn tại không
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<ProjectMemberDto>.Failure("Project not found");
        }

        // Kiểm tra quyền: chỉ Owner và Admin mới có thể thay đổi role
        if (!await HasPermissionToManageMembersAsync(projectId, currentUserId))
        {
            return Result<ProjectMemberDto>.Failure("You don't have permission to update member roles in this project");
        }

        // Lấy thành viên cần update
        var member = await _context.ProjectMembers
            .Include(pm => pm.User)
                .ThenInclude(u => u.Department)
            .Include(pm => pm.User)
                .ThenInclude(u => u.Position)
            .FirstOrDefaultAsync(pm => pm.ProjectMemberId == memberId && pm.ProjectId == projectId && pm.IsActive);

        if (member == null)
        {
            return Result<ProjectMemberDto>.Failure("Member not found");
        }

        // Không cho phép thay đổi role của chính mình
        if (member.UserId == currentUserId)
        {
            return Result<ProjectMemberDto>.Failure("You cannot change your own role");
        }

        // Không cho phép thay đổi role của Owner (trừ khi currentUser cũng là Owner)
        if (member.Role == ProjectRole.Owner)
        {
            var currentUserMember = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == currentUserId && pm.IsActive);
            
            if (currentUserMember?.Role != ProjectRole.Owner)
            {
                return Result<ProjectMemberDto>.Failure("Only project owner can change owner's role");
            }
        }

        // Update role
        member.Role = Enum.Parse<ProjectRole>(request.Role);
        await _context.SaveChangesAsync();

        var memberDto = MapToDto(member);
        return Result<ProjectMemberDto>.Success(memberDto, "Member role updated successfully");
    }

    public async Task<Result<bool>> RemoveMemberAsync(int projectId, int memberId, int currentUserId)
    {
        // Kiểm tra project có tồn tại không
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<bool>.Failure("Project not found");
        }

        // Kiểm tra quyền: chỉ Owner và Admin mới có thể xóa thành viên
        if (!await HasPermissionToManageMembersAsync(projectId, currentUserId))
        {
            return Result<bool>.Failure("You don't have permission to remove members from this project");
        }

        // Lấy thành viên cần xóa
        var member = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectMemberId == memberId && pm.ProjectId == projectId && pm.IsActive);

        if (member == null)
        {
            return Result<bool>.Failure("Member not found");
        }

        // Không cho phép xóa chính mình
        if (member.UserId == currentUserId)
        {
            return Result<bool>.Failure("You cannot remove yourself from the project");
        }

        // Không cho phép xóa Owner
        if (member.Role == ProjectRole.Owner)
        {
            return Result<bool>.Failure("Cannot remove project owner");
        }

        // Soft delete
        member.IsActive = false;
        await _context.SaveChangesAsync();

        return Result<bool>.Success(true, "Member removed successfully");
    }

    // Helper methods
    private async Task<bool> HasAccessToProjectAsync(int projectId, int userId)
    {
        var project = await _context.Projects.FindAsync(projectId);
        if (project?.OwnerId == userId)
        {
            return true;
        }

        var member = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.IsActive);

        return member != null;
    }

    private async Task<bool> HasPermissionToManageMembersAsync(int projectId, int userId)
    {
        var project = await _context.Projects.FindAsync(projectId);
        if (project?.OwnerId == userId)
        {
            return true;
        }

        var member = await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.IsActive);

        return member != null && (member.Role == ProjectRole.Owner || member.Role == ProjectRole.Admin);
    }

    private static ProjectMemberDto MapToDto(ProjectMember member)
    {
        return new ProjectMemberDto
        {
            ProjectMemberId = member.ProjectMemberId,
            ProjectId = member.ProjectId,
            UserId = member.UserId,
            User = new UserDto
            {
                UserId = member.User.UserId,
                Email = member.User.Email,
                FullName = member.User.FullName,
                AvatarUrl = member.User.AvatarUrl,
                Bio = member.User.Bio,
                PhoneNumber = member.User.PhoneNumber,
                Role = member.User.Role,
                DepartmentId = member.User.DepartmentId,
                DepartmentName = member.User.Department?.Name,
                PositionId = member.User.PositionId,
                PositionName = member.User.Position?.Name,
                CreatedAt = member.User.CreatedAt
            },
            Role = member.Role.ToString(),
            ProjectRoleCode = member.ProjectRoleCode, // Phân quyền trong dự án
            JoinedAt = member.JoinedAt,
            LastAccessedAt = member.LastAccessedAt,
            IsActive = member.IsActive
        };
    }
}

