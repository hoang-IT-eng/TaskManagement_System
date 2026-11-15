using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs.Team;
using TaskManagement.Application.Interfaces;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.API.Controllers;

[ApiController]
[ApiExplorerSettings(GroupName = "legacy")]
[Route("api/teams")]
[Authorize]
public class TeamController : ControllerBase
{
    private readonly ITeamService _teamService;
    private readonly ApplicationDbContext _context;

    public TeamController(ITeamService teamService, ApplicationDbContext context)
    {
        _teamService = teamService;
        _context = context;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }

    /// <summary>
    /// Lấy danh sách tất cả teams
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllTeams()
    {
        var result = await _teamService.GetAllTeamsAsync();

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data, count = result.Data?.Count ?? 0 });
    }

    /// <summary>
    /// Lấy danh sách teams mà user hiện tại là thành viên (leader hoặc member của project liên kết)
    /// </summary>
    [HttpGet("my-teams")]
    public async Task<IActionResult> GetMyTeams()
    {
        var userId = GetCurrentUserId();
        var result = await _teamService.GetMyTeamsAsync(userId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { data = result.Data, count = result.Data?.Count ?? 0 });
    }

    /// <summary>
    /// Lấy danh sách users để chọn làm team leader
    /// </summary>
    [HttpGet("available-leaders")]
    public async Task<IActionResult> GetAvailableLeaders()
    {
        try
        {
            var users = await _context.Users
                .Where(u => u.IsActive)
                .OrderBy(u => u.FullName)
                .Select(u => new
                {
                    u.UserId,
                    u.Email,
                    u.FullName,
                    u.Role
                })
                .ToListAsync();

            return Ok(new { data = users, count = users.Count });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Error loading users: {ex.Message}" });
        }
    }

    /// <summary>
    /// Tạo team mới
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _teamService.CreateTeamAsync(userId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Lấy thông tin team theo ID (kèm danh sách linked projects)
    /// </summary>
    [HttpGet("{teamId:int}")]
    public async Task<IActionResult> GetTeamById(int teamId)
    {
        var result = await _teamService.GetTeamByIdAsync(teamId);

        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.Message });
        }

        return Ok(new { data = result.Data });
    }

    /// <summary>
    /// Thêm project vào team
    /// </summary>
    [HttpPost("{teamId}/projects")]
    public async Task<IActionResult> AddProjectToTeam(int teamId, [FromBody] AddTeamToProjectRequest request)
    {
        // Validate request
        if (request.TeamId != teamId)
        {
            return BadRequest(new { message = "Team ID in URL must match Team ID in request body" });
        }

        var result = await _teamService.AddProjectToTeamAsync(teamId, request.ProjectId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Xóa project khỏi team
    /// </summary>
    [HttpDelete("{teamId}/projects/{projectId}")]
    public async Task<IActionResult> RemoveProjectFromTeam(int teamId, int projectId)
    {
        var result = await _teamService.RemoveProjectFromTeamAsync(teamId, projectId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Cập nhật team
    /// </summary>
    [HttpPut("{teamId:int}")]
    public async Task<IActionResult> UpdateTeam(int teamId, [FromBody] UpdateTeamRequest request)
    {
        var result = await _teamService.UpdateTeamAsync(teamId, request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Xóa team
    /// </summary>
    [HttpDelete("{teamId:int}")]
    public async Task<IActionResult> DeleteTeam(int teamId)
    {
        var result = await _teamService.DeleteTeamAsync(teamId);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message, data = result.Data });
    }

    /// <summary>
    /// Lấy danh sách members của team (từ project members của linked projects)
    /// </summary>
    [HttpGet("{teamId:int}/members")]
    public async Task<IActionResult> GetTeamMembers(int teamId)
    {
        // Kiểm tra team có tồn tại không
        var team = await _context.Teams
            .Include(t => t.ProjectTeams)
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return NotFound(new { message = "Team not found" });
        }

        // Lấy tất cả project IDs được link với team
        var projectIds = team.ProjectTeams.Select(pt => pt.ProjectId).ToList();

        if (projectIds.Count == 0)
        {
            // Nếu team chưa có linked projects, trả về empty list
            return Ok(new { data = new List<object>(), count = 0 });
        }

        // Lấy tất cả members từ các projects này
        // Group by UserId để lấy unique users, nhưng lấy user với position đầy đủ nhất
        var allMembers = await _context.ProjectMembers
            .Include(pm => pm.User)
                .ThenInclude(u => u.Position)
            .Where(pm => projectIds.Contains(pm.ProjectId) && pm.IsActive)
            .ToListAsync();

        // Group by UserId và lấy user info (ưu tiên user có position)
        var membersDict = new Dictionary<int, object>();
        foreach (var pm in allMembers)
        {
            if (!membersDict.ContainsKey(pm.UserId))
            {
                membersDict[pm.UserId] = new
                {
                    memberId = pm.ProjectMemberId,
                    userId = pm.UserId,
                    user = new
                    {
                        userId = pm.User.UserId,
                        fullName = pm.User.FullName,
                        email = pm.User.Email,
                        avatarUrl = pm.User.AvatarUrl,
                        positionId = pm.User.PositionId,
                        position = pm.User.Position != null ? new
                        {
                            positionId = pm.User.Position.PositionId,
                            name = pm.User.Position.Name,
                            code = pm.User.Position.Code
                        } : null
                    },
                    positionId = pm.User.PositionId
                };
            }
        }

        var members = membersDict.Values.ToList();

        return Ok(new { data = members, count = members.Count });
    }

    /// <summary>
    /// Lấy danh sách users có thể thêm vào team
    /// - Nếu team chưa có linked projects: trả về tất cả users
    /// - Nếu team có linked projects: trả về users chưa là member của TẤT CẢ linked projects
    /// </summary>
    [HttpGet("{teamId:int}/members/available-users")]
    public async Task<IActionResult> GetAvailableUsersForTeam(int teamId)
    {
        // Kiểm tra team có tồn tại không
        var team = await _context.Teams
            .Include(t => t.ProjectTeams)
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return NotFound(new { message = "Team not found" });
        }

        // Lấy tất cả project IDs được link với team
        var projectIds = team.ProjectTeams.Select(pt => pt.ProjectId).ToList();

        List<int> excludedUserIds = new List<int>();

        if (projectIds.Count > 0)
        {
            // Lấy tất cả user IDs đã là member của TẤT CẢ linked projects
            // (nếu user đã là member của tất cả projects, thì không cần thêm nữa)
            var usersInAllProjects = await _context.ProjectMembers
                .Where(pm => projectIds.Contains(pm.ProjectId) && pm.IsActive)
                .GroupBy(pm => pm.UserId)
                .Where(g => g.Select(pm => pm.ProjectId).Distinct().Count() == projectIds.Count)
                .Select(g => g.Key)
                .ToListAsync();

            excludedUserIds = usersInAllProjects;
        }

        // Lấy tất cả users chưa là member của tất cả linked projects
        var availableUsers = await _context.Users
            .Where(u => u.IsActive && !excludedUserIds.Contains(u.UserId))
            .OrderBy(u => u.FullName)
            .Select(u => new
            {
                u.UserId,
                u.Email,
                u.FullName,
                u.Role
            })
            .ToListAsync();

        return Ok(new { data = availableUsers, count = availableUsers.Count });
    }

    /// <summary>
    /// Thêm member vào team (thêm vào tất cả linked projects)
    /// </summary>
    [HttpPost("{teamId:int}/members")]
    public async Task<IActionResult> AddTeamMember(int teamId, [FromBody] AddTeamMemberRequest request)
    {
        // Kiểm tra team có tồn tại không
        var team = await _context.Teams
            .Include(t => t.ProjectTeams)
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return NotFound(new { message = "Team not found" });
        }

        // Kiểm tra user có tồn tại không
        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null || !user.IsActive)
        {
            return BadRequest(new { message = "User not found or is inactive" });
        }

        // Lấy tất cả project IDs được link với team
        var projectIds = team.ProjectTeams.Select(pt => pt.ProjectId).ToList();

        if (projectIds.Count == 0)
        {
            return BadRequest(new { message = "Team has no linked projects. Please link at least one project first." });
        }

        // Thêm user vào tất cả linked projects
        var addedMembers = new List<object>();
        foreach (var projectId in projectIds)
        {
            // Kiểm tra user đã là member chưa
            var existingMember = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == request.UserId);

            if (existingMember == null)
            {
                var newMember = new Domain.Entities.ProjectMember
                {
                    ProjectId = projectId,
                    UserId = request.UserId,
                    Role = Domain.Enums.ProjectRole.Member,
                    IsActive = true,
                    JoinedAt = DateTime.UtcNow
                };

                // Set ProjectRoleCode từ Position nếu có
                if (request.PositionId.HasValue)
                {
                    var position = await _context.Positions.FindAsync(request.PositionId.Value);
                    if (position != null)
                    {
                        newMember.ProjectRoleCode = position.Code;
                    }
                }
                else if (user.PositionId.HasValue)
                {
                    var position = await _context.Positions.FindAsync(user.PositionId.Value);
                    if (position != null)
                    {
                        newMember.ProjectRoleCode = position.Code;
                    }
                }

                _context.ProjectMembers.Add(newMember);
                addedMembers.Add(new { projectId, userId = request.UserId });
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Member added to team successfully", data = addedMembers });
    }

    /// <summary>
    /// Xóa member khỏi team (xóa khỏi tất cả linked projects)
    /// </summary>
    [HttpDelete("{teamId:int}/members/{userId:int}")]
    public async Task<IActionResult> RemoveTeamMember(int teamId, int userId)
    {
        // Kiểm tra team có tồn tại không
        var team = await _context.Teams
            .Include(t => t.ProjectTeams)
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return NotFound(new { message = "Team not found" });
        }

        // Lấy tất cả project IDs được link với team
        var projectIds = team.ProjectTeams.Select(pt => pt.ProjectId).ToList();

        // Xóa user khỏi tất cả linked projects
        var members = await _context.ProjectMembers
            .Where(pm => projectIds.Contains(pm.ProjectId) && pm.UserId == userId && pm.IsActive)
            .ToListAsync();

        foreach (var member in members)
        {
            member.IsActive = false;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Member removed from team successfully" });
    }

    /// <summary>
    /// Cập nhật position của team member (cập nhật ProjectRoleCode trong tất cả linked projects)
    /// </summary>
    [HttpPut("{teamId:int}/members/{userId:int}/position")]
    public async Task<IActionResult> UpdateTeamMemberPosition(int teamId, int userId, [FromBody] UpdateTeamMemberPositionRequest request)
    {
        // Kiểm tra team có tồn tại không
        var team = await _context.Teams
            .Include(t => t.ProjectTeams)
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return NotFound(new { message = "Team not found" });
        }

        // Lấy position code nếu có positionId
        string? projectRoleCode = null;
        if (request.PositionId.HasValue)
        {
            var position = await _context.Positions.FindAsync(request.PositionId.Value);
            if (position != null)
            {
                projectRoleCode = position.Code;
            }
        }

        // Lấy tất cả project IDs được link với team
        var projectIds = team.ProjectTeams.Select(pt => pt.ProjectId).ToList();

        // Cập nhật ProjectRoleCode trong tất cả linked projects
        var members = await _context.ProjectMembers
            .Where(pm => projectIds.Contains(pm.ProjectId) && pm.UserId == userId && pm.IsActive)
            .ToListAsync();

        foreach (var member in members)
        {
            member.ProjectRoleCode = projectRoleCode;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Member position updated successfully" });
    }
}

public class AddTeamMemberRequest
{
    public int UserId { get; set; }
    public int? PositionId { get; set; }
}

public class UpdateTeamMemberPositionRequest
{
    public int? PositionId { get; set; }
}

