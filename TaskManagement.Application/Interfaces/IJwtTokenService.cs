using TaskManagement.Domain.Entities;

namespace TaskManagement.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(User user);
    int? ValidateToken(string token);
}