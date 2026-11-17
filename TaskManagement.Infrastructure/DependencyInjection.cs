using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TaskManagement.Application.Abstractions;
using TaskManagement.Application.Interfaces;
using TaskManagement.Infrastructure.Core;
using TaskManagement.Infrastructure.Data;
using TaskManagement.Infrastructure.Security;
using TaskManagement.Infrastructure.Services;

namespace TaskManagement.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Database:Provider = "Sqlite" (default for local dev and tests) or "SqlServer".
    /// ConnectionStrings:Default holds the connection string for the chosen provider.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var provider = config["Database:Provider"] ?? "Sqlite";
        var cs = config.GetConnectionString("Default")
                 ?? config.GetConnectionString("DefaultConnection")
                 ?? "Data Source=layers.db";

        if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            services.AddDbContext<ApplicationDbContext>(o => o.UseSqlServer(cs));
        }
        else
        {
            services.AddDbContext<SqliteApplicationDbContext>(o => o.UseSqlite(cs));
            services.AddScoped<ApplicationDbContext>(sp => sp.GetRequiredService<SqliteApplicationDbContext>());
        }

        services.AddOptions<JwtOptions>().Bind(config.GetSection(JwtOptions.Section))
            .Validate(o => o.SigningKey.Length >= 32, "Jwt:SigningKey must be at least 32 characters.")
            .Validate(o => o.AccessTokenMinutes is > 0 and <= 120, "Jwt:AccessTokenMinutes must be 1–120.")
            .ValidateOnStart();

        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<ITokenService, TokenService>();
        services.AddScoped<ProjectAccess>();
        services.AddScoped<Journal>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserDirectory, UserDirectory>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IMemberService, MemberService>();
        services.AddScoped<ILabelService, LabelService>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<ICommentService, CommentService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddHttpClient();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAiCopilotService, AiCopilotService>();
        services.AddScoped<DemoSeeder>();

        // Legacy services still used by the pre-v1 controllers (teams, profile/avatar, attachments).
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IFileStorageService, FileStorageService>();
        services.AddScoped<ITeamService, TeamService>();
        return services;
    }
}
