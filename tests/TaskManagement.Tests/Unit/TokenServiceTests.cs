using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Security;
using TaskManagement.Tests.Services;

namespace TaskManagement.Tests.Unit;

public class TokenServiceTests
{
    private readonly TokenService _svc = new(TestDb.Jwt);

    [Fact]
    public void Access_token_carries_identity_and_short_expiry()
    {
        var (token, expires) = _svc.CreateAccessToken(new User { UserId = 7, Email = "a@b.dev", FullName = "A B", Role = "Member" });
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("layers-api", jwt.Issuer);
        Assert.Contains(jwt.Claims, c => c.Value == "7");
        Assert.InRange(expires, DateTime.UtcNow.AddMinutes(14), DateTime.UtcNow.AddMinutes(16));
    }

    [Fact]
    public void Refresh_tokens_are_random_and_only_the_hash_is_derived()
    {
        var (a, hashA) = _svc.CreateRefreshToken();
        var (b, _) = _svc.CreateRefreshToken();
        Assert.NotEqual(a, b);
        Assert.Equal(hashA, _svc.Hash(a));
        Assert.Equal(64, hashA.Length);
        Assert.DoesNotContain(a, hashA);
    }
}
