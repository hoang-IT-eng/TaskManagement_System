namespace TaskManagement.Domain.Entities;

/// <summary>
/// Opaque refresh token. Only a SHA-256 hash is stored. Tokens are single-use: refreshing rotates the
/// token and records the successor. Presenting an already-rotated token revokes every active token of
/// that user (reuse detection).
/// </summary>
public class RefreshToken
{
    public int RefreshTokenId { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByHash { get; set; }
    public string? CreatedByIp { get; set; }

    public bool IsActive(DateTime nowUtc) => RevokedAt is null && ExpiresAt > nowUtc;
}
