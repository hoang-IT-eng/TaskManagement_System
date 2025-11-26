using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.DTOs;
using TaskManagement.Application.DTOs.Auth;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;
using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(ApplicationDbContext context, IJwtTokenService jwtTokenService)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request)
    {
        // Check if email exists
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return Result<AuthResponse>.Failure("Email already exists");
        }

        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHash,
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            Role = "Member",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Load Department and Position for response
        await _context.Entry(user)
            .Reference(u => u.Department)
            .LoadAsync();
        await _context.Entry(user)
            .Reference(u => u.Position)
            .LoadAsync();

        var token = _jwtTokenService.GenerateToken(user);

        var response = new AuthResponse
        {
            Token = token,
            Expiration = DateTime.UtcNow.AddHours(24),
            User = MapToUserDto(user)
        };

        return Result<AuthResponse>.Success(response, "Registration successful");
    }

    public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Department)
            .Include(u => u.Position)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Result<AuthResponse>.Failure("Invalid email or password");
        }

        if (!user.IsActive)
        {
            return Result<AuthResponse>.Failure("Account is deactivated");
        }

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = _jwtTokenService.GenerateToken(user);

        var response = new AuthResponse
        {
            Token = token,
            Expiration = DateTime.UtcNow.AddHours(24),
            User = MapToUserDto(user)
        };

        return Result<AuthResponse>.Success(response, "Login successful");
    }

    public async Task<Result<string>> ForgotPasswordAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        
        if (user == null)
        {
            // Don't reveal if email exists (security best practice)
            return Result<string>.Success("If email exists, reset link has been sent");
        }

        // TODO: Generate reset token and send email
        // For now, just return success
        var resetToken = Guid.NewGuid().ToString();
        
        return Result<string>.Success(resetToken, "Password reset email sent");
    }

    public async Task<Result<bool>> ResetPasswordAsync(string email, string token, string newPassword)
    {
        // TODO: Validate reset token
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        
        if (user == null)
        {
            return Result<bool>.Failure("Invalid reset request");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();

        return Result<bool>.Success(true, "Password reset successful");
    }

    private static UserDto MapToUserDto(User user)
    {
        return new UserDto
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
    }
}