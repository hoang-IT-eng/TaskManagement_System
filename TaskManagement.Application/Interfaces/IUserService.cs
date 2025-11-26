using TaskManagement.Application.DTOs;
using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface IUserService
{
    Task<Result<UserDto>> GetProfileAsync(int userId);
    Task<Result<UserDto>> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task<Result<bool>> ChangePasswordAsync(int userId, string currentPassword, string newPassword);
    Task<Result<string>> UploadAvatarAsync(int userId, Stream fileStream, string fileName);
}