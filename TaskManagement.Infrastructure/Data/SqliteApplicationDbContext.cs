using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TaskManagement.Infrastructure.Data;

/// <summary>
/// SQLite flavour of the context. It exists only so SQLite gets its own migration history
/// (Migrations/Sqlite) next to the SQL Server one (Migrations/). Runtime code always talks to
/// <see cref="ApplicationDbContext"/>.
/// </summary>
public sealed class SqliteApplicationDbContext : ApplicationDbContext
{
    public SqliteApplicationDbContext(DbContextOptions<SqliteApplicationDbContext> options) : base(options) { }
}

/// <summary>Design-time factories used by `dotnet ef migrations add`.</summary>
public sealed class SqlServerDesignTimeFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer("Server=localhost;Database=TaskManagementDB;Trusted_Connection=True;TrustServerCertificate=True;")
            .Options);
}

public sealed class SqliteDesignTimeFactory : IDesignTimeDbContextFactory<SqliteApplicationDbContext>
{
    public SqliteApplicationDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<SqliteApplicationDbContext>()
            .UseSqlite("Data Source=design.db")
            .Options);
}
