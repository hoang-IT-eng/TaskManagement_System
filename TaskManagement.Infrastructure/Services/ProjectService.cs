using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.DTOs.Project;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;
using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Services;

public class ProjectService : IProjectService
{
    private readonly ApplicationDbContext _context;

    public ProjectService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ProjectDto>> CreateProjectAsync(int userId, CreateProjectRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return Result<ProjectDto>.Failure("User not found");
        }

        var project = new Project
        {
            Name = request.Name,
            Description = request.Description,
            Status = request.Status,
            Priority = request.Priority,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Budget = request.Budget,
            OwnerId = userId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        // Reload with owner info
        await _context.Entry(project).Reference(p => p.Owner).LoadAsync();

        var projectDto = MapToDto(project);
        return Result<ProjectDto>.Success(projectDto, "Project created successfully");
    }

    public async Task<Result<ProjectDto>> GetProjectByIdAsync(int projectId, int userId)
    {
        var project = await _context.Projects
            .Include(p => p.Owner)
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<ProjectDto>.Failure("Project not found");
        }

        // Check if user has access to this project (owner or member)
        if (project.OwnerId != userId)
        {
            var isMember = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.IsActive);
            
            if (!isMember)
            {
                return Result<ProjectDto>.Failure("You don't have permission to access this project");
            }
        }

        var projectDto = MapToDto(project);
        return Result<ProjectDto>.Success(projectDto);
    }

    public async Task<Result<List<ProjectDto>>> GetAllProjectsAsync(int userId)
    {
        // Get projects owned by user
        var ownedProjects = await _context.Projects
            .Include(p => p.Owner)
            .Where(p => p.OwnerId == userId && p.IsActive)
            .ToListAsync();

        // Get projects where user is a member
        var memberProjectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == userId && pm.IsActive)
            .Select(pm => pm.ProjectId)
            .ToListAsync();

        var memberProjects = await _context.Projects
            .Include(p => p.Owner)
            .Where(p => memberProjectIds.Contains(p.ProjectId) && p.IsActive)
            .ToListAsync();

        // Combine and remove duplicates
        var allProjects = ownedProjects.Union(memberProjects)
            .OrderByDescending(p => p.CreatedAt)
            .ToList();

        var projectDtos = allProjects.Select(MapToDto).ToList();
        return Result<List<ProjectDto>>.Success(projectDtos);
    }

    public async Task<Result<ProjectDto>> UpdateProjectAsync(int projectId, int userId, UpdateProjectRequest request)
    {
        var project = await _context.Projects
            .Include(p => p.Owner)
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<ProjectDto>.Failure("Project not found");
        }

        // Check if user is the owner or has Admin/Owner role
        if (project.OwnerId != userId)
        {
            var member = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.IsActive);
            
            if (member == null || (member.Role != Domain.Enums.ProjectRole.Owner && member.Role != Domain.Enums.ProjectRole.Admin))
            {
                return Result<ProjectDto>.Failure("You don't have permission to update this project");
            }
        }

        // Update project fields
        project.Name = request.Name;
        project.Description = request.Description;
        project.Status = request.Status;
        project.Priority = request.Priority;
        project.StartDate = request.StartDate;
        project.EndDate = request.EndDate;
        project.Budget = request.Budget;
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var projectDto = MapToDto(project);
        return Result<ProjectDto>.Success(projectDto, "Project updated successfully");
    }

    public async Task<Result<bool>> DeleteProjectAsync(int projectId, int userId)
    {
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.IsActive);

        if (project == null)
        {
            return Result<bool>.Failure("Project not found");
        }

        // Check if user is the owner
        if (project.OwnerId != userId)
        {
            return Result<bool>.Failure("You don't have permission to delete this project");
        }

        // Soft delete
        project.IsActive = false;
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Result<bool>.Success(true, "Project deleted successfully");
    }

    private static ProjectDto MapToDto(Project project)
    {
        return new ProjectDto
        {
            ProjectId = project.ProjectId,
            Name = project.Name,
            Description = project.Description,
            Status = project.Status,
            Priority = project.Priority,
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            Budget = project.Budget,
            OwnerId = project.OwnerId,
            Owner = project.Owner == null ? null : new UserDto
            {
                UserId = project.Owner.UserId,
                Email = project.Owner.Email,
                FullName = project.Owner.FullName,
                AvatarUrl = project.Owner.AvatarUrl,
                Bio = project.Owner.Bio,
                PhoneNumber = project.Owner.PhoneNumber,
                Role = project.Owner.Role,
                CreatedAt = project.Owner.CreatedAt
            },
            IsActive = project.IsActive,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt
        };
    }
}

