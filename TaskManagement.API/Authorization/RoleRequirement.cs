using Microsoft.AspNetCore.Authorization;

namespace TaskManagement.API.Authorization;

public class RoleRequirement : IAuthorizationRequirement
{
    public string[] AllowedRoles { get; }

    public RoleRequirement(params string[] allowedRoles)
    {
        AllowedRoles = allowedRoles;
    }
}

public class RoleRequirementHandler : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, RoleRequirement requirement)
    {
        var roleClaim = context.User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role");
        
        if (roleClaim != null && requirement.AllowedRoles.Contains(roleClaim.Value))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

