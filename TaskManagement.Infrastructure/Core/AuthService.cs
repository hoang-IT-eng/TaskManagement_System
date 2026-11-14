using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;
using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Data;
using TaskManagement.Infrastructure.Security;

namespace TaskManagement.Infrastructure.Core;

public sealed class AuthService(
    ApplicationDbContext db,
    ITokenService tokens,
    IOptions<JwtOptions> jwt,
    IClock clock,
    ILogger<AuthService> log) : IAuthService
{
    private static readonly UnauthorizedException InvalidRefresh =
        new("auth.invalid_refresh_token", "Your session has expired. Sign in again.");

    public async Task<AuthSession> RegisterAsync(RegisterRequest request, string? ip, CancellationToken ct = default)
    {
        var email = Normalize(request.Email);
        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw new ConflictException("auth.email_taken", "An account with this email already exists.");

        var user = new User
        {
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 11),
            Role = "Member",
            CreatedAt = clock.UtcNow,
            UpdatedAt = clock.UtcNow,
            LastLoginAt = clock.UtcNow,
        };
        db.Users.Add(user);
        var session = Issue(user, ip);
        await db.SaveChangesAsync(ct);
        log.LogInformation("User {UserId} registered", user.UserId);
        return session;
    }

    public async Task<AuthSession> LoginAsync(LoginRequest request, string? ip, CancellationToken ct = default)
    {
        var email = Normalize(request.Email);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Same message for unknown email, wrong password and disabled account: no account enumeration.
        if (user is null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            log.LogWarning("Failed sign-in for {EmailHash}", tokens.Hash(email)[..12]);
            throw new UnauthorizedException("auth.invalid_credentials", "Email or password is incorrect.");
        }

        user.LastLoginAt = clock.UtcNow;
        var session = Issue(user, ip);
        await db.SaveChangesAsync(ct);
        return session;
    }

    public async Task<AuthSession> RefreshAsync(string refreshToken, string? ip, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) throw InvalidRefresh;

        var hash = tokens.Hash(refreshToken);
        var stored = await db.RefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null) throw InvalidRefresh;

        var now = clock.UtcNow;
        if (stored.RevokedAt is not null)
        {
            if (stored.ReplacedByHash is not null)
            {
                // A rotated token came back: it was stolen or replayed. Kill the whole session family.
                await db.InTransactionAsync(async c =>
                {
                    await db.RefreshTokens
                        .Where(t => t.UserId == stored.UserId && t.RevokedAt == null)
                        .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), c);
                }, ct);
                log.LogWarning("Refresh token reuse detected for user {UserId}; all sessions revoked", stored.UserId);
            }
            throw InvalidRefresh;
        }

        if (stored.ExpiresAt <= now || !stored.User.IsActive) throw InvalidRefresh;

        var session = Issue(stored.User, ip);
        stored.RevokedAt = now;
        stored.ReplacedByHash = tokens.Hash(session.RefreshToken);
        await db.SaveChangesAsync(ct);
        return session;
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return;
        var hash = tokens.Hash(refreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash && t.RevokedAt == null, ct);
        if (stored is null) return;
        stored.RevokedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task<CurrentUserDto> GetMeAsync(int userId, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId && u.IsActive, ct)
                   ?? throw new UnauthorizedException("auth.user_inactive", "This account is no longer active.");
        return Mapping.Me(user);
    }

    public async Task<CurrentUserDto> UpdateMeAsync(int userId, UpdateMeRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == userId && u.IsActive, ct)
                   ?? throw new UnauthorizedException("auth.user_inactive", "This account is no longer active.");
        user.FullName = request.FullName.Trim();
        user.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
        user.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);
        return Mapping.Me(user);
    }

    private AuthSession Issue(User user, string? ip)
    {
        var (access, accessExp) = tokens.CreateAccessToken(user);
        var (refresh, refreshHash) = tokens.CreateRefreshToken();
        var refreshExp = clock.UtcNow.AddDays(jwt.Value.RefreshTokenDays);
        db.RefreshTokens.Add(new RefreshToken
        {
            User = user,
            TokenHash = refreshHash,
            CreatedAt = clock.UtcNow,
            ExpiresAt = refreshExp,
            CreatedByIp = ip,
        });
        return new AuthSession(new AuthResult(access, accessExp, Mapping.Me(user)), refresh, refreshExp);
    }

    private static string Normalize(string email) => email.Trim().ToLowerInvariant();
}

public sealed class UserDirectory(ApplicationDbContext db) : IUserDirectory
{
    public async Task<PagedResult<UserSummary>> SearchAsync(string? search, PageQuery page, CancellationToken ct = default)
    {
        var q = db.Users.AsNoTracking().Where(u => u.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            q = q.Where(u => EF.Functions.Like(u.FullName, term) || EF.Functions.Like(u.Email, term));
        }
        var total = await q.CountAsync(ct);
        var rows = await q.OrderBy(u => u.FullName).Skip(page.Skip).Take(page.SafePageSize).ToListAsync(ct);
        return new PagedResult<UserSummary>(rows.Select(Mapping.Summary).ToList(), page.SafePage, page.SafePageSize, total);
    }
}
