using Microsoft.EntityFrameworkCore;
using TaskManagement.Domain.Common;
using TaskManagement.Domain.Entities;

namespace TaskManagement.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    /// <summary>Lets provider-specific subclasses (see <see cref="SqliteApplicationDbContext"/>) own their migrations.</summary>
    protected ApplicationDbContext(DbContextOptions options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectMember> ProjectMembers { get; set; }
    public DbSet<ProjectTask> ProjectTasks { get; set; }
    public DbSet<TaskAttachment> TaskAttachments { get; set; }
    public DbSet<TaskComment> TaskComments { get; set; }
    public DbSet<ActivityLog> ActivityLogs { get; set; }
    public DbSet<Department> Departments { get; set; }
    public DbSet<Position> Positions { get; set; }
    public DbSet<Team> Teams { get; set; }
    public DbSet<ProjectTeam> ProjectTeams { get; set; }
    public DbSet<Label> Labels { get; set; }
    public DbSet<TaskLabel> TaskLabels { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampChanges();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        StampChanges();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    /// <summary>
    /// Bumps <see cref="IVersioned.Version"/> on every modified row and stamps UpdatedAt. Because Version is a
    /// concurrency token, EF emits "UPDATE ... WHERE Id = @id AND Version = @originalVersion"; a concurrent
    /// writer that already bumped the row makes that update hit 0 rows and raises DbUpdateConcurrencyException.
    /// </summary>
    private void StampChanges()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Modified)
            {
                if (entry.Entity is IVersioned versioned)
                    versioned.Version = (int)entry.Property(nameof(IVersioned.Version)).OriginalValue! + 1;
                if (entry.Entity is IAuditable auditable)
                    auditable.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Added && entry.Entity is IAuditable added)
            {
                if (added.CreatedAt == default) added.CreatedAt = now;
                added.UpdatedAt = now;
            }
        }
    }

    /// <summary>All timestamps are UTC. SQLite drops DateTimeKind, so tag values as UTC on the way out.</summary>
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<UtcNullableDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId);
            
            entity.HasIndex(e => e.Email)
                .IsUnique()
                .HasDatabaseName("IX_Users_Email");
            
            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_Users_IsActive");

            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.FullName)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.AvatarUrl)
                .HasMaxLength(500);

            entity.Property(e => e.Bio)
                .HasMaxLength(1000);

            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20);

            entity.Property(e => e.Timezone)
                .HasMaxLength(50)
                .HasDefaultValue("UTC+7");

            entity.Property(e => e.Role)
                .HasMaxLength(50)
                .HasDefaultValue("Member");

            // Foreign key relationships
            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Position)
                .WithMany()
                .HasForeignKey(e => e.PositionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.ProjectId);
            
            entity.HasIndex(e => e.OwnerId)
                .HasDatabaseName("IX_Projects_OwnerId");
            
            entity.HasIndex(e => e.Status)
                .HasDatabaseName("IX_Projects_Status");
            
            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_Projects_IsActive");

            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Description)
                .HasMaxLength(2000);

            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Planning");

            entity.Property(e => e.Priority)
                .HasMaxLength(50)
                .HasDefaultValue("Medium");

            entity.Property(e => e.Budget)
                .HasPrecision(18, 2);

            // Foreign key relationship
            entity.HasOne(e => e.Owner)
                .WithMany()
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Navigation properties
            entity.HasMany(e => e.Members)
                .WithOne(m => m.Project)
                .HasForeignKey(m => m.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.ProjectTeams)
                .WithOne(pt => pt.Project)
                .HasForeignKey(pt => pt.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.HasKey(e => e.ProjectMemberId);
            
            entity.HasIndex(e => new { e.ProjectId, e.UserId })
                .IsUnique()
                .HasDatabaseName("IX_ProjectMembers_ProjectId_UserId");
            
            entity.HasIndex(e => e.ProjectId)
                .HasDatabaseName("IX_ProjectMembers_ProjectId");
            
            entity.HasIndex(e => e.UserId)
                .HasDatabaseName("IX_ProjectMembers_UserId");
            
            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_ProjectMembers_IsActive");

            entity.Property(e => e.Role)
                .HasConversion<int>()
                .IsRequired();

            entity.Property(e => e.ProjectRoleCode)
                .HasMaxLength(50);

            // Foreign key relationships
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProjectTask>(entity =>
        {
            entity.HasKey(e => e.TaskId);
            
            entity.HasIndex(e => e.ProjectId)
                .HasDatabaseName("IX_ProjectTasks_ProjectId");
            
            entity.HasIndex(e => e.AssigneeId)
                .HasDatabaseName("IX_ProjectTasks_AssigneeId");
            
            entity.HasIndex(e => e.AssignedTeamId)
                .HasDatabaseName("IX_ProjectTasks_AssignedTeamId");
            
            entity.HasIndex(e => e.Status)
                .HasDatabaseName("IX_ProjectTasks_Status");
            
            entity.HasIndex(e => e.Priority)
                .HasDatabaseName("IX_ProjectTasks_Priority");
            
            entity.HasIndex(e => e.DueDate)
                .HasDatabaseName("IX_ProjectTasks_DueDate");
            
            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_ProjectTasks_IsActive");

            entity.Property(e => e.Title)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(e => e.Description)
                .HasMaxLength(5000);

            entity.Property(e => e.Status)
                .HasConversion<int>()
                .IsRequired();

            entity.Property(e => e.Priority)
                .HasConversion<int>()
                .IsRequired();

            // Foreign key relationships
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Assignee)
                .WithMany()
                .HasForeignKey(e => e.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.AssignedTeam)
                .WithMany()
                .HasForeignKey(e => e.AssignedTeamId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskAttachment>(entity =>
        {
            entity.HasKey(e => e.AttachmentId);
            
            entity.HasIndex(e => e.TaskId)
                .HasDatabaseName("IX_TaskAttachments_TaskId");
            
            entity.HasIndex(e => e.UploadedById)
                .HasDatabaseName("IX_TaskAttachments_UploadedById");

            entity.Property(e => e.FileName)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.FilePath)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(e => e.ContentType)
                .HasMaxLength(100)
                .IsRequired();

            // Foreign key relationships
            entity.HasOne(e => e.Task)
                .WithMany()
                .HasForeignKey(e => e.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.UploadedBy)
                .WithMany()
                .HasForeignKey(e => e.UploadedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskComment>(entity =>
        {
            entity.HasKey(e => e.CommentId);
            
            entity.HasIndex(e => e.TaskId)
                .HasDatabaseName("IX_TaskComments_TaskId");
            
            entity.HasIndex(e => e.UserId)
                .HasDatabaseName("IX_TaskComments_UserId");
            
            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_TaskComments_IsActive");

            entity.Property(e => e.Content)
                .HasMaxLength(5000)
                .IsRequired();

            // Foreign key relationships
            entity.HasOne(e => e.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(e => e.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasKey(e => e.ActivityLogId);
            
            entity.HasIndex(e => e.EntityType)
                .HasDatabaseName("IX_ActivityLogs_EntityType");
            
            entity.HasIndex(e => e.EntityId)
                .HasDatabaseName("IX_ActivityLogs_EntityId");
            
            entity.HasIndex(e => e.UserId)
                .HasDatabaseName("IX_ActivityLogs_UserId");
            
            entity.HasIndex(e => e.CreatedAt)
                .HasDatabaseName("IX_ActivityLogs_CreatedAt");

            entity.Property(e => e.Action)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.EntityType)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.OldValue);

            entity.Property(e => e.NewValue);

            entity.Property(e => e.Description)
                .HasMaxLength(1000);

            // Foreign key relationship
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Department configuration
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(e => e.DepartmentId);
            
            entity.HasIndex(e => e.Code)
                .IsUnique()
                .HasDatabaseName("IX_Departments_Code");
            
            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_Departments_IsActive");

            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsRequired();
        });

        // Position configuration
        modelBuilder.Entity<Position>(entity =>
        {
            entity.HasKey(e => e.PositionId);
            
            entity.HasIndex(e => e.Code)
                .IsUnique()
                .HasDatabaseName("IX_Positions_Code");
            
            entity.HasIndex(e => e.WorkflowGroup)
                .HasDatabaseName("IX_Positions_WorkflowGroup");
            
            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_Positions_IsActive");

            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.WorkflowGroup)
                .HasMaxLength(50)
                .IsRequired();
        });

        // Team configuration
        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasKey(e => e.TeamId);
            
            entity.HasIndex(e => e.LeaderId)
                .HasDatabaseName("IX_Teams_LeaderId");
            
            entity.HasIndex(e => e.IsActive)
                .HasDatabaseName("IX_Teams_IsActive");

            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Description)
                .HasMaxLength(2000);

            // Foreign key relationship
            entity.HasOne(e => e.Leader)
                .WithMany()
                .HasForeignKey(e => e.LeaderId)
                .OnDelete(DeleteBehavior.Restrict);

            // Navigation property
            entity.HasMany(e => e.ProjectTeams)
                .WithOne(pt => pt.Team)
                .HasForeignKey(pt => pt.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ProjectTeam configuration
        modelBuilder.Entity<ProjectTeam>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasIndex(e => new { e.ProjectId, e.TeamId })
                .IsUnique()
                .HasDatabaseName("IX_ProjectTeams_ProjectId_TeamId");
            
            entity.HasIndex(e => e.ProjectId)
                .HasDatabaseName("IX_ProjectTeams_ProjectId");
            
            entity.HasIndex(e => e.TeamId)
                .HasDatabaseName("IX_ProjectTeams_TeamId");

            // Foreign key relationships
            entity.HasOne(e => e.Project)
                .WithMany(p => p.ProjectTeams)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Team)
                .WithMany(t => t.ProjectTeams)
                .HasForeignKey(e => e.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Layers upgrade: ordering, concurrency, labels, notifications, refresh tokens ----
        modelBuilder.Entity<Project>(entity =>
        {
            entity.Property(e => e.Key).HasMaxLength(6).IsRequired();
            entity.Property(e => e.Color).HasMaxLength(7).IsRequired();
            entity.Property(e => e.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<ProjectTask>(entity =>
        {
            entity.Property(e => e.Version).IsConcurrencyToken();
            entity.HasIndex(e => new { e.ProjectId, e.Number }).IsUnique()
                .HasDatabaseName("IX_ProjectTasks_ProjectId_Number");
            // Board query: WHERE ProjectId = @p AND IsActive ORDER BY Status, Rank
            entity.HasIndex(e => new { e.ProjectId, e.IsActive, e.Status, e.Rank })
                .HasDatabaseName("IX_ProjectTasks_Board");
            // "My work" queries on the dashboard
            entity.HasIndex(e => new { e.AssigneeId, e.IsActive, e.Status })
                .HasDatabaseName("IX_ProjectTasks_Assignee_Status");
        });

        modelBuilder.Entity<Label>(entity =>
        {
            entity.HasKey(e => e.LabelId);
            entity.Property(e => e.Name).HasMaxLength(40).IsRequired();
            entity.Property(e => e.Color).HasMaxLength(7).IsRequired();
            entity.HasIndex(e => new { e.ProjectId, e.Name }).IsUnique()
                .HasDatabaseName("IX_Labels_ProjectId_Name");
            entity.HasOne(e => e.Project).WithMany(p => p.Labels)
                .HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TaskLabel>(entity =>
        {
            entity.HasKey(e => new { e.TaskId, e.LabelId });
            entity.HasIndex(e => e.LabelId).HasDatabaseName("IX_TaskLabels_LabelId");
            entity.HasOne(e => e.Task).WithMany(t => t.Labels)
                .HasForeignKey(e => e.TaskId).OnDelete(DeleteBehavior.Cascade);
            // NoAction (not Cascade) so SQL Server does not see two cascade paths from Project.
            entity.HasOne(e => e.Label).WithMany(l => l.Tasks)
                .HasForeignKey(e => e.LabelId).OnDelete(DeleteBehavior.ClientCascade);
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasIndex(e => new { e.ProjectId, e.CreatedAt })
                .HasDatabaseName("IX_ActivityLogs_ProjectId_CreatedAt");
            entity.HasIndex(e => new { e.TaskId, e.CreatedAt })
                .HasDatabaseName("IX_ActivityLogs_TaskId_CreatedAt");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId);
            entity.Property(e => e.Type).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Message).HasMaxLength(500).IsRequired();
            entity.HasIndex(e => new { e.UserId, e.IsRead, e.CreatedAt })
                .HasDatabaseName("IX_Notifications_User_Unread");
            entity.HasOne(e => e.User).WithMany()
                .HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Actor).WithMany()
                .HasForeignKey(e => e.ActorId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.RefreshTokenId);
            entity.Property(e => e.TokenHash).HasMaxLength(64).IsRequired();
            entity.Property(e => e.ReplacedByHash).HasMaxLength(64);
            entity.Property(e => e.CreatedByIp).HasMaxLength(64);
            entity.HasIndex(e => e.TokenHash).IsUnique().HasDatabaseName("IX_RefreshTokens_TokenHash");
            entity.HasIndex(e => e.UserId).HasDatabaseName("IX_RefreshTokens_UserId");
            entity.HasOne(e => e.User).WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Seed Data
        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        // Seed Departments
        var seedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        modelBuilder.Entity<Department>().HasData(
            new Department
            {
                DepartmentId = 1,
                Name = "IT",
                Code = "IT",
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new Department
            {
                DepartmentId = 2,
                Name = "Product",
                Code = "PRODUCT",
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new Department
            {
                DepartmentId = 3,
                Name = "Quality Control",
                Code = "QC",
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            }
        );

        // Seed Positions
        modelBuilder.Entity<Position>().HasData(
            new Position
            {
                PositionId = 1,
                Name = "Developer",
                Code = "DEV",
                WorkflowGroup = "Implementer",
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new Position
            {
                PositionId = 2,
                Name = "QA",
                Code = "QA",
                WorkflowGroup = "Tester",
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new Position
            {
                PositionId = 3,
                Name = "BA",
                Code = "BA",
                WorkflowGroup = "Admin",
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            },
            new Position
            {
                PositionId = 4,
                Name = "Tech Lead",
                Code = "LEAD",
                WorkflowGroup = "Manager",
                IsActive = true,
                CreatedAt = seedDate,
                UpdatedAt = seedDate
            }
        );
    }
}

internal sealed class UtcDateTimeConverter() : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
    v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : DateTime.SpecifyKind(v, DateTimeKind.Utc),
    v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

internal sealed class UtcNullableDateTimeConverter() : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime?, DateTime?>(
    v => v == null ? v : v.Value.Kind == DateTimeKind.Local ? v.Value.ToUniversalTime() : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc),
    v => v == null ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
