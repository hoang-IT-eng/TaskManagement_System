using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using TaskManagement.Application.Abstractions;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Infrastructure.Core;
using TaskManagement.Infrastructure.Data;
using TaskManagement.Infrastructure.Security;

namespace TaskManagement.Tests.Services;

public sealed class FakeClock : IClock
{
    public DateTime UtcNow { get; set; } = new(2026, 11, 14, 9, 0, 0, DateTimeKind.Utc);
}

/// <summary>
/// A real SQLite database (in-memory, shared connection) with the production SQLite migrations applied.
/// Each test gets its own database; <see cref="NewContext"/> opens extra contexts on the same database to
/// simulate a second concurrent user.
/// </summary>
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _connection;

    public TestDb()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        using var ctx = NewContext();
        ctx.Database.Migrate();
    }

    public FakeClock Clock { get; } = new();

    public ApplicationDbContext NewContext() =>
        new SqliteApplicationDbContext(new DbContextOptionsBuilder<SqliteApplicationDbContext>().UseSqlite(_connection).Options);

    public static IOptions<JwtOptions> Jwt { get; } = Options.Create(new JwtOptions { SigningKey = new string('k', 48), AccessTokenMinutes = 15, RefreshTokenDays = 14 });

    public Services For(ApplicationDbContext db) => new(db, Clock);

    public async Task<User> UserAsync(string name, string? email = null)
    {
        await using var db = NewContext();
        var user = new User
        {
            FullName = name,
            Email = email ?? $"{name.Replace(' ', '.').ToLowerInvariant()}@test.dev",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd", 4),
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<int> ProjectAsync(User owner, params (User User, ProjectRole Role)[] members)
    {
        await using var db = NewContext();
        var svc = For(db);
        var project = await svc.Projects.CreateAsync(owner.UserId, new("Test project", "TST", null, null));
        foreach (var (user, role) in members)
            db.ProjectMembers.Add(new ProjectMember { ProjectId = project.Id, UserId = user.UserId, Role = role });
        await db.SaveChangesAsync();
        return project.Id;
    }

    public void Dispose() => _connection.Dispose();
}

public sealed class Services
{
    public Services(ApplicationDbContext db, IClock clock)
    {
        Access = new ProjectAccess(db);
        Journal = new Journal(db);
        Tokens = new TokenService(TestDb.Jwt);
        Auth = new AuthService(db, Tokens, TestDb.Jwt, clock, NullLogger<AuthService>.Instance);
        Projects = new ProjectService(db, Access, Journal, clock);
        Members = new MemberService(db, Access, Journal, clock);
        Labels = new LabelService(db, Access);
        Tasks = new TaskService(db, Access, Journal, clock, NullLogger<TaskService>.Instance);
        Comments = new CommentService(db, Access, Journal, clock);
        Activity = new ActivityService(db, Access);
        Notifications = new NotificationService(db);
        Dashboard = new DashboardService(db, clock);
        Users = new UserDirectory(db);
    }

    public ProjectAccess Access { get; }
    public Journal Journal { get; }
    public TokenService Tokens { get; }
    public AuthService Auth { get; }
    public ProjectService Projects { get; }
    public MemberService Members { get; }
    public LabelService Labels { get; }
    public TaskService Tasks { get; }
    public CommentService Comments { get; }
    public ActivityService Activity { get; }
    public NotificationService Notifications { get; }
    public DashboardService Dashboard { get; }
    public UserDirectory Users { get; }
}
