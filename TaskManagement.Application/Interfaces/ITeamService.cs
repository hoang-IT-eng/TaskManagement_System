using TaskManagement.Application.DTOs.Team;
using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface ITeamService
{
    Task<Result<List<TeamDto>>> GetAllTeamsAsync();
    Task<Result<List<TeamDto>>> GetMyTeamsAsync(int userId);
    Task<Result<TeamDto>> GetTeamByIdAsync(int teamId);
    Task<Result<TeamDto>> CreateTeamAsync(int userId, CreateTeamRequest request);
    Task<Result<TeamDto>> UpdateTeamAsync(int teamId, UpdateTeamRequest request);
    Task<Result<bool>> DeleteTeamAsync(int teamId);
    Task<Result<bool>> AddProjectToTeamAsync(int teamId, int projectId);
    Task<Result<bool>> RemoveProjectFromTeamAsync(int teamId, int projectId);
}

