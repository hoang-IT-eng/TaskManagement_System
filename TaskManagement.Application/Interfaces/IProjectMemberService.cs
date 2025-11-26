using TaskManagement.Application.DTOs.ProjectMember;
using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface IProjectMemberService
{
    Task<Result<ProjectMemberDto>> AddMemberAsync(int projectId, int currentUserId, AddProjectMemberRequest request);
    Task<Result<List<ProjectMemberDto>>> GetProjectMembersAsync(int projectId, int currentUserId);
    Task<Result<ProjectMemberDto>> UpdateMemberRoleAsync(int projectId, int memberId, int currentUserId, UpdateProjectMemberRoleRequest request);
    Task<Result<bool>> RemoveMemberAsync(int projectId, int memberId, int currentUserId);
}

