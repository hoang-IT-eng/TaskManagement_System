using TaskManagement.Application.DTOs.Project;
using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface IProjectService
{
    Task<Result<ProjectDto>> CreateProjectAsync(int userId, CreateProjectRequest request);
    Task<Result<ProjectDto>> GetProjectByIdAsync(int projectId, int userId);
    Task<Result<List<ProjectDto>>> GetAllProjectsAsync(int userId);
    Task<Result<ProjectDto>> UpdateProjectAsync(int projectId, int userId, UpdateProjectRequest request);
    Task<Result<bool>> DeleteProjectAsync(int projectId, int userId);
}

