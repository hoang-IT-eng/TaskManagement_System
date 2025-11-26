using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.DTOs.Team;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;
using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Services;

public class TeamService : ITeamService
{
    private readonly ApplicationDbContext _context;

    public TeamService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<TeamDto>>> GetAllTeamsAsync()
    {
        var teams = await _context.Teams
            .Include(t => t.Leader)
            .Include(t => t.ProjectTeams)
                .ThenInclude(pt => pt.Project)
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .ToListAsync();

        var teamDtos = teams.Select(MapToDto).ToList();
        return Result<List<TeamDto>>.Success(teamDtos);
    }

    public async Task<Result<List<TeamDto>>> GetMyTeamsAsync(int userId)
    {
        // Get teams where user is the leader
        var leaderTeams = await _context.Teams
            .Include(t => t.Leader)
            .Include(t => t.ProjectTeams)
                .ThenInclude(pt => pt.Project)
            .Where(t => t.IsActive && t.LeaderId == userId)
            .ToListAsync();

        // Get teams where user is a member of linked projects
        var projectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == userId && pm.IsActive)
            .Select(pm => pm.ProjectId)
            .ToListAsync();

        var linkedTeamIds = await _context.ProjectTeams
            .Where(pt => projectIds.Contains(pt.ProjectId))
            .Select(pt => pt.TeamId)
            .Distinct()
            .ToListAsync();

        var memberTeams = await _context.Teams
            .Include(t => t.Leader)
            .Include(t => t.ProjectTeams)
                .ThenInclude(pt => pt.Project)
            .Where(t => t.IsActive && linkedTeamIds.Contains(t.TeamId))
            .ToListAsync();

        // Combine and remove duplicates
        var allTeams = leaderTeams.Union(memberTeams)
            .OrderBy(t => t.Name)
            .ToList();

        var teamDtos = allTeams.Select(MapToDto).ToList();
        return Result<List<TeamDto>>.Success(teamDtos);
    }

    public async Task<Result<TeamDto>> GetTeamByIdAsync(int teamId)
    {
        var team = await _context.Teams
            .Include(t => t.Leader)
            .Include(t => t.ProjectTeams)
                .ThenInclude(pt => pt.Project)
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return Result<TeamDto>.Failure("Team not found");
        }

        var teamDto = MapToDto(team);
        return Result<TeamDto>.Success(teamDto);
    }

    public async Task<Result<TeamDto>> CreateTeamAsync(int userId, CreateTeamRequest request)
    {
        // Kiểm tra leader có tồn tại không
        var leader = await _context.Users.FindAsync(request.LeaderId);
        if (leader == null || !leader.IsActive)
        {
            return Result<TeamDto>.Failure("Leader not found or is inactive");
        }

        // Kiểm tra tên team đã tồn tại chưa
        var existingTeam = await _context.Teams
            .FirstOrDefaultAsync(t => t.Name.ToLower() == request.Name.ToLower() && t.IsActive);

        if (existingTeam != null)
        {
            return Result<TeamDto>.Failure("Team name already exists");
        }

        var team = new Team
        {
            Name = request.Name,
            Description = request.Description,
            LeaderId = request.LeaderId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Teams.Add(team);
        await _context.SaveChangesAsync();

        // Reload with relationships
        await _context.Entry(team).Reference(t => t.Leader).LoadAsync();

        var teamDto = MapToDto(team);
        return Result<TeamDto>.Success(teamDto, "Team created successfully");
    }

    public async Task<Result<bool>> AddProjectToTeamAsync(int teamId, int projectId)
    {
        // Kiểm tra team có tồn tại không
        var team = await _context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return Result<bool>.Failure("Team not found");
        }

        // Kiểm tra project có tồn tại không
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<bool>.Failure("Project not found");
        }

        // Kiểm tra liên kết đã tồn tại chưa
        var existingLink = await _context.ProjectTeams
            .FirstOrDefaultAsync(pt => pt.TeamId == teamId && pt.ProjectId == projectId);

        if (existingLink != null)
        {
            return Result<bool>.Failure("Project is already linked to this team");
        }

        // Tạo liên kết mới
        var projectTeam = new ProjectTeam
        {
            TeamId = teamId,
            ProjectId = projectId,
            AssignedAt = DateTime.UtcNow
        };

        _context.ProjectTeams.Add(projectTeam);
        await _context.SaveChangesAsync();

        return Result<bool>.Success(true, "Project successfully linked to team");
    }

    public async Task<Result<bool>> RemoveProjectFromTeamAsync(int teamId, int projectId)
    {
        // Kiểm tra liên kết có tồn tại không
        var projectTeam = await _context.ProjectTeams
            .FirstOrDefaultAsync(pt => pt.TeamId == teamId && pt.ProjectId == projectId);

        if (projectTeam == null)
        {
            return Result<bool>.Failure("Project is not linked to this team");
        }

        _context.ProjectTeams.Remove(projectTeam);
        await _context.SaveChangesAsync();

        return Result<bool>.Success(true, "Project successfully unlinked from team");
    }

    public async Task<Result<TeamDto>> UpdateTeamAsync(int teamId, UpdateTeamRequest request)
    {
        var team = await _context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return Result<TeamDto>.Failure("Team not found");
        }

        // Kiểm tra leader có tồn tại không
        var leader = await _context.Users.FindAsync(request.LeaderId);
        if (leader == null || !leader.IsActive)
        {
            return Result<TeamDto>.Failure("Leader not found or is inactive");
        }

        // Kiểm tra tên team đã tồn tại chưa (nếu đổi tên)
        if (team.Name.ToLower() != request.Name.ToLower())
        {
            var existingTeam = await _context.Teams
                .FirstOrDefaultAsync(t => t.Name.ToLower() == request.Name.ToLower() && t.TeamId != teamId && t.IsActive);

            if (existingTeam != null)
            {
                return Result<TeamDto>.Failure("Team name already exists");
            }
        }

        team.Name = request.Name;
        team.Description = request.Description;
        team.LeaderId = request.LeaderId;
        team.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Reload with relationships
        await _context.Entry(team).Reference(t => t.Leader).LoadAsync();
        await _context.Entry(team).Collection(t => t.ProjectTeams).LoadAsync();
        foreach (var pt in team.ProjectTeams)
        {
            await _context.Entry(pt).Reference(p => p.Project).LoadAsync();
        }

        var teamDto = MapToDto(team);
        return Result<TeamDto>.Success(teamDto, "Team updated successfully");
    }

    public async Task<Result<bool>> DeleteTeamAsync(int teamId)
    {
        var team = await _context.Teams
            .FirstOrDefaultAsync(t => t.TeamId == teamId && t.IsActive);

        if (team == null)
        {
            return Result<bool>.Failure("Team not found");
        }

        // Soft delete
        team.IsActive = false;
        team.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Result<bool>.Success(true, "Team deleted successfully");
    }

    private TeamDto MapToDto(Team team)
    {
        return new TeamDto
        {
            TeamId = team.TeamId,
            Name = team.Name,
            Description = team.Description,
            LeaderId = team.LeaderId,
            Leader = team.Leader != null ? new UserDto
            {
                UserId = team.Leader.UserId,
                Email = team.Leader.Email,
                FullName = team.Leader.FullName,
                AvatarUrl = team.Leader.AvatarUrl,
                Role = team.Leader.Role
            } : null,
            IsActive = team.IsActive,
            CreatedAt = team.CreatedAt,
            UpdatedAt = team.UpdatedAt,
            LinkedProjects = team.ProjectTeams
                .Select(pt => new ProjectTeamDto
                {
                    ProjectId = pt.Project.ProjectId,
                    ProjectName = pt.Project.Name,
                    ProjectKey = GenerateProjectKey(pt.Project.ProjectId, pt.Project.Name),
                    AssignedAt = pt.AssignedAt
                })
                .ToList()
        };
    }

    private string GenerateProjectKey(int projectId, string projectName)
    {
        // Generate project key from project name (uppercase, remove spaces, take first 3-5 chars)
        // Example: "My Awesome Project" -> "MAP" or "MyProject" -> "MYPR"
        if (string.IsNullOrWhiteSpace(projectName))
        {
            return $"PROJ-{projectId}";
        }

        // Take first letter of each word, uppercase
        var words = projectName.Split(new[] { ' ', '-', '_' }, StringSplitOptions.RemoveEmptyEntries);
        if (words.Length > 0)
        {
            var key = string.Join("", words.Select(w => w.Length > 0 ? w[0].ToString().ToUpper() : ""));
            if (key.Length >= 2)
            {
                return key.Length > 5 ? key.Substring(0, 5) : key;
            }
        }

        // Fallback: use first 3-5 uppercase letters of project name
        var cleanName = projectName.Replace(" ", "").Replace("-", "").Replace("_", "").ToUpper();
        if (cleanName.Length >= 2)
        {
            return cleanName.Length > 5 ? cleanName.Substring(0, 5) : cleanName;
        }

        // Final fallback: use project ID
        return $"PROJ-{projectId}";
    }
}

