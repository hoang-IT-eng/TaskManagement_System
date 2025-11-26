using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public UserService(ApplicationDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    public async Task<Result<UserDto>> GetProfileAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.Position)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return Result<UserDto>.Failure("User not found");
        }

        var userDto = new UserDto
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.Name,
            PositionId = user.PositionId,
            PositionName = user.Position?.Name,
            CreatedAt = user.CreatedAt
        };

        return Result<UserDto>.Success(userDto);
    }

    public async Task<Result<UserDto>> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.Position)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return Result<UserDto>.Failure("User not found");
        }

        user.FullName = request.FullName;
        user.Bio = request.Bio;
        user.PhoneNumber = request.PhoneNumber;
        user.AvatarUrl = request.AvatarUrl ?? user.AvatarUrl;
        user.Timezone = request.Timezone ?? user.Timezone;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var userDto = new UserDto
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.Name,
            PositionId = user.PositionId,
            PositionName = user.Position?.Name,
            CreatedAt = user.CreatedAt
        };

        return Result<UserDto>.Success(userDto, "Profile updated successfully");
    }

    public async Task<Result<bool>> ChangePasswordAsync(int userId, string currentPassword, string newPassword)
    {
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            return Result<bool>.Failure("User not found");
        }

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
        {
            return Result<bool>.Failure("Current password is incorrect");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Result<bool>.Success(true, "Password changed successfully");
    }

    public async Task<Result<string>> UploadAvatarAsync(int userId, Stream fileStream, string fileName)
    {
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            return Result<string>.Failure("User not found");
        }

        // TODO: Upload to cloud storage (Azure Blob, AWS S3)
        // For now, save to wwwroot/uploads
        var uploadsFolder = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, "uploads", "avatars");
        Directory.CreateDirectory(uploadsFolder);

        // Validate file extension
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var fileExtension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(fileExtension))
        {
            return Result<string>.Failure("Invalid file type. Allowed types: JPG, JPEG, PNG, GIF, WEBP");
        }

        var uniqueFileName = $"{userId}_{Guid.NewGuid()}{fileExtension}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var fileStreamOutput = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(fileStreamOutput);
        }

        var avatarUrl = $"/uploads/avatars/{uniqueFileName}";
        user.AvatarUrl = avatarUrl;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Result<string>.Success(avatarUrl, "Avatar uploaded successfully");
    }
}