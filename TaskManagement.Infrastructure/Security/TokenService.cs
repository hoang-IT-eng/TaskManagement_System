using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TaskManagement.Domain.Entities;

namespace TaskManagement.Infrastructure.Security;

public sealed class JwtOptions
{
    public const string Section = "Jwt";

    /// <summary>HMAC-SHA256 key. Must be at least 32 bytes; supply it via env var Jwt__SigningKey outside development.</summary>
    public string SigningKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = "layers-api";
    public string Audience { get; set; } = "layers-web";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 14;
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(User user);
    (string Token, string Hash) CreateRefreshToken();
    string Hash(string refreshToken);
}

public sealed class TokenService(IOptions<JwtOptions> options) : ITokenService
{
    private readonly JwtOptions _opt = options.Value;

    public (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(_opt.AccessTokenMinutes);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };
        var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.SigningKey)), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(_opt.Issuer, _opt.Audience, claims, notBefore: DateTime.UtcNow, expires: expires, signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }

    public (string Token, string Hash) CreateRefreshToken()
    {
        var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(48));
        return (token, Hash(token));
    }

    public string Hash(string refreshToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
}
