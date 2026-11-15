namespace TaskManagement.Application.Contracts;

public record RegisterRequest(string Email, string Password, string FullName);
public record LoginRequest(string Email, string Password);

public record UserSummary(int Id, string FullName, string Email, string? AvatarUrl, string Initials);
public record CurrentUserDto(int Id, string FullName, string Email, string Role, string? AvatarUrl, string? Bio, string Initials, DateTime CreatedAt);
public record UpdateMeRequest(string FullName, string? Bio);

/// <summary>Access token for the Authorization header; the refresh token travels separately (httpOnly cookie).</summary>
public record AuthResult(string AccessToken, DateTime AccessTokenExpiresAt, CurrentUserDto User);

/// <summary>Internal result carrying the raw refresh token so the API layer can place it in a cookie.</summary>
public record AuthSession(AuthResult Auth, string RefreshToken, DateTime RefreshTokenExpiresAt);
