using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using TaskManagement.API.Http;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Contracts;

namespace TaskManagement.API.Controllers.V1;

public sealed class AuthCookieOptions
{
    public const string Section = "Auth";
    public string RefreshCookieName { get; set; } = "layers_rt";
    /// <summary>Lax for same-site deployments (SPA served by the API or via a proxy); None when the SPA is on another site.</summary>
    public SameSiteMode RefreshCookieSameSite { get; set; } = SameSiteMode.Lax;
    /// <summary>Force the Secure flag even if the request arrived over HTTP (e.g. behind a TLS-terminating proxy).</summary>
    public bool AlwaysSecure { get; set; }
}

/// <summary>Sign-up, sign-in and session management. Access token in the body, refresh token in an httpOnly cookie.</summary>
[ApiController]
[Route("api/v1/auth")]
[ApiExplorerSettings(GroupName = "v1")]
[Produces("application/json")]
public sealed class AuthController(IAuthService auth, IOptions<AuthCookieOptions> cookie) : ControllerBase
{
    private const string CookiePath = "/api/v1/auth";

    /// <summary>Create an account and start a session.</summary>
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType<AuthResult>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResult>> Register(RegisterRequest request, CancellationToken ct)
    {
        var session = await auth.RegisterAsync(request, Ip, ct);
        SetRefreshCookie(session);
        return StatusCode(StatusCodes.Status201Created, session.Auth);
    }

    /// <summary>Sign in with email and password.</summary>
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType<AuthResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResult>> Login(LoginRequest request, CancellationToken ct)
    {
        var session = await auth.LoginAsync(request, Ip, ct);
        SetRefreshCookie(session);
        return session.Auth;
    }

    /// <summary>Exchange the refresh cookie for a new access token. Rotates the refresh token; reuse of an old one revokes every session.</summary>
    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType<AuthResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResult>> Refresh(CancellationToken ct)
    {
        var token = Request.Cookies[cookie.Value.RefreshCookieName] ?? string.Empty;
        try
        {
            var session = await auth.RefreshAsync(token, Ip, ct);
            SetRefreshCookie(session);
            return session.Auth;
        }
        catch
        {
            ClearRefreshCookie();
            throw;
        }
    }

    /// <summary>End this session (revokes the refresh token and clears the cookie).</summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await auth.LogoutAsync(Request.Cookies[cookie.Value.RefreshCookieName], ct);
        ClearRefreshCookie();
        return NoContent();
    }

    /// <summary>The signed-in user.</summary>
    [Authorize]
    [HttpGet("me")]
    public Task<CurrentUserDto> Me(CancellationToken ct) => auth.GetMeAsync(User.UserId(), ct);

    /// <summary>Update name and bio.</summary>
    [Authorize]
    [HttpPatch("me")]
    public Task<CurrentUserDto> UpdateMe(UpdateMeRequest request, CancellationToken ct) => auth.UpdateMeAsync(User.UserId(), request, ct);

    private string? Ip => HttpContext.Connection.RemoteIpAddress?.ToString();

    private void SetRefreshCookie(AuthSession session) =>
        Response.Cookies.Append(cookie.Value.RefreshCookieName, session.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps || cookie.Value.AlwaysSecure || cookie.Value.RefreshCookieSameSite == SameSiteMode.None,
            SameSite = cookie.Value.RefreshCookieSameSite,
            Path = CookiePath,
            Expires = session.RefreshTokenExpiresAt,
        });

    private void ClearRefreshCookie() =>
        Response.Cookies.Delete(cookie.Value.RefreshCookieName, new CookieOptions { Path = CookiePath });
}
