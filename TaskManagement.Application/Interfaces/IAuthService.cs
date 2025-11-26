using TaskManagement.Application.DTOs.Auth;
using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface IAuthService
{
    Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request);
    Task<Result<AuthResponse>> LoginAsync(LoginRequest request);
    Task<Result<string>> ForgotPasswordAsync(string email);
    Task<Result<bool>> ResetPasswordAsync(string email, string token, string newPassword);
}