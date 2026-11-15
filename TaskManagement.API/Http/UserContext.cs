using System.Security.Claims;
using TaskManagement.Application.Common;

namespace TaskManagement.API.Http;

public static class UserContext
{
    public static int UserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : throw new UnauthorizedException("auth.required", "Sign in to continue.");
}
