using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TaskManagement.Domain.Entities;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Rules;

namespace TaskManagement.Infrastructure.Data;

/// <summary>
/// Idempotent demo data (runs only when the Users table is empty). Dates are relative to "now" so the
/// dashboard always shows something overdue, something due this week, and recent completions.
/// </summary>
public sealed class DemoSeeder(ApplicationDbContext db, ILogger<DemoSeeder> log)
{
    public const string DemoPassword = "Layers2026";

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(ct)) return;

        var now = DateTime.UtcNow;
        var today = now.Date;
        var hash = BCrypt.Net.BCrypt.HashPassword(DemoPassword, workFactor: 10);
        User U(string email, string name, string role = "Member") => new()
        {
            Email = email, FullName = name, PasswordHash = hash, Role = role, CreatedAt = now.AddDays(-40), UpdatedAt = now.AddDays(-40),
        };
        var hoang = U("hoang@layers.dev", "Tran Huy Hoang", "Admin");
        var linh = U("linh@layers.dev", "Nguyen Thu Linh");
        var minh = U("minh@layers.dev", "Le Quang Minh");
        var an = U("an@layers.dev", "Pham Bao An");
        db.Users.AddRange(hoang, linh, minh, an);
        await db.SaveChangesAsync(ct);

        Project P(string name, string key, string color, string desc, int daysAgo) => new()
        {
            Name = name, Key = key, Color = color, Description = desc, Status = "InProgress", OwnerId = hoang.UserId,
            CreatedAt = now.AddDays(-daysAgo), UpdatedAt = now.AddHours(-daysAgo),
        };
        var atelier = P("Atelier storefront", "ATL", "#3C5A48", "Relaunch of the fashion storefront: checkout, catalogue and payments.", 30);
        var plates = P("Plates recognition", "PLT", "#3B6E8F", "License-plate recognition web console for the parking pilot.", 21);
        var mobile = P("IronLog mobile", "IRL", "#8A5A9E", "Workout logging app: offline sync and the coach dashboard.", 12);
        foreach (var p in new[] { atelier, plates, mobile })
        {
            p.Members.Add(new ProjectMember { User = hoang, Role = ProjectRole.Owner, JoinedAt = p.CreatedAt });
            p.Labels.Add(new Label { Name = "bug", Color = "#B5482F" });
            p.Labels.Add(new Label { Name = "feature", Color = "#3B6E8F" });
            p.Labels.Add(new Label { Name = "design", Color = "#8A5A9E" });
            p.Labels.Add(new Label { Name = "backend", Color = "#5B6B3A" });
            p.Labels.Add(new Label { Name = "chore", Color = "#6B7570" });
        }
        atelier.Members.Add(new ProjectMember { User = linh, Role = ProjectRole.Admin, JoinedAt = atelier.CreatedAt });
        atelier.Members.Add(new ProjectMember { User = minh, Role = ProjectRole.Member, JoinedAt = atelier.CreatedAt });
        atelier.Members.Add(new ProjectMember { User = an, Role = ProjectRole.Viewer, JoinedAt = atelier.CreatedAt });
        plates.Members.Add(new ProjectMember { User = minh, Role = ProjectRole.Member, JoinedAt = plates.CreatedAt });
        mobile.Members.Add(new ProjectMember { User = linh, Role = ProjectRole.Member, JoinedAt = mobile.CreatedAt });
        db.Projects.AddRange(atelier, plates, mobile);
        await db.SaveChangesAsync(ct);

        var rankByColumn = new Dictionary<(int, ProjectTaskStatus), int>();
        ProjectTask T(Project p, string title, ProjectTaskStatus s, ProjectTaskPriority pr, User? who, int? dueInDays, string[] labels, string? desc = null, int? doneDaysAgo = null, ProjectTaskType type = ProjectTaskType.Task)
        {
            var idx = rankByColumn.GetValueOrDefault((p.ProjectId, s)) + 1;
            rankByColumn[(p.ProjectId, s)] = idx;
            var created = now.AddDays(-Math.Min(20, 2 + p.NextTaskNumber));
            var t = new ProjectTask
            {
                Project = p, Number = p.NextTaskNumber++, Title = title, Description = desc, Status = s, Priority = pr, Type = type,
                Rank = idx * Ranking.Spacing, Assignee = who, CreatedById = hoang.UserId,
                DueDate = dueInDays is int d ? today.AddDays(d) : null,
                CompletedAt = s == ProjectTaskStatus.Done ? now.AddDays(-(doneDaysAgo ?? 1)).AddHours(-3) : null,
                CreatedAt = created, UpdatedAt = created,
            };
            foreach (var name in labels) t.Labels.Add(new TaskLabel { Label = p.Labels.First(l => l.Name == name) });
            db.ProjectTasks.Add(t);
            return t;
        }

        var a1 = T(atelier, "Checkout: guard stock reservation against double submit", ProjectTaskStatus.InProgress, ProjectTaskPriority.Urgent, hoang, 1, ["backend", "bug"],
            "Two quick taps on Pay create two reservations. Make the reservation idempotent per cart and return the existing one.", type: ProjectTaskType.Bug);
        T(atelier, "Payment webhook: verify signature and dedupe events", ProjectTaskStatus.Todo, ProjectTaskPriority.High, minh, 3, ["backend", "feature"]);
        T(atelier, "Size guide drawer on product page", ProjectTaskStatus.Todo, ProjectTaskPriority.Medium, linh, 6, ["design", "feature"]);
        T(atelier, "Catalogue search returns archived products", ProjectTaskStatus.Todo, ProjectTaskPriority.High, hoang, -2, ["bug"], type: ProjectTaskType.Bug);
        T(atelier, "Migrate product images to CDN", ProjectTaskStatus.Todo, ProjectTaskPriority.Low, null, null, ["chore"]);
        var a6 = T(atelier, "Order history: paginate and index by customer", ProjectTaskStatus.InReview, ProjectTaskPriority.Medium, minh, 2, ["backend"]);
        T(atelier, "Cart badge flickers on route change", ProjectTaskStatus.InProgress, ProjectTaskPriority.Low, linh, 4, ["bug", "design"], type: ProjectTaskType.Bug);
        T(atelier, "Refresh-token rotation for storefront sessions", ProjectTaskStatus.InReview, ProjectTaskPriority.High, hoang, 0, ["backend", "feature"]);
        T(atelier, "Product card redesign", ProjectTaskStatus.Done, ProjectTaskPriority.Medium, linh, null, ["design"], doneDaysAgo: 1);
        T(atelier, "CORS allow-list per environment", ProjectTaskStatus.Done, ProjectTaskPriority.Medium, hoang, null, ["backend", "chore"], doneDaysAgo: 2);
        T(atelier, "Seed script for staging catalogue", ProjectTaskStatus.Done, ProjectTaskPriority.Low, minh, null, ["chore"], doneDaysAgo: 4);
        T(atelier, "Address form validation messages", ProjectTaskStatus.Done, ProjectTaskPriority.Medium, linh, null, ["design"], doneDaysAgo: 6);
        T(atelier, "Discount codes: percentage and fixed amount", ProjectTaskStatus.Todo, ProjectTaskPriority.Medium, null, 10, ["feature"], type: ProjectTaskType.Story);

        T(plates, "Batch upload with per-image status", ProjectTaskStatus.InProgress, ProjectTaskPriority.High, hoang, 2, ["feature"]);
        T(plates, "Low-light plates misread as 8/B", ProjectTaskStatus.Todo, ProjectTaskPriority.Urgent, minh, -1, ["bug", "backend"], type: ProjectTaskType.Bug);
        T(plates, "CSV export of detections", ProjectTaskStatus.Todo, ProjectTaskPriority.Medium, null, 8, ["feature"]);
        T(plates, "Detection history filters", ProjectTaskStatus.Done, ProjectTaskPriority.Medium, hoang, null, ["feature"], doneDaysAgo: 3);
        T(plates, "Bounding-box overlay on results", ProjectTaskStatus.Done, ProjectTaskPriority.High, minh, null, ["design"], doneDaysAgo: 5);

        T(mobile, "Offline queue for set logging", ProjectTaskStatus.InProgress, ProjectTaskPriority.High, linh, 5, ["backend", "feature"]);
        T(mobile, "Coach dashboard: weekly volume chart", ProjectTaskStatus.Todo, ProjectTaskPriority.Medium, hoang, 9, ["feature", "design"], type: ProjectTaskType.Story);
        T(mobile, "Rest timer keeps running after app is killed", ProjectTaskStatus.InReview, ProjectTaskPriority.Medium, linh, 3, ["bug"], type: ProjectTaskType.Bug);
        T(mobile, "Exercise library search", ProjectTaskStatus.Done, ProjectTaskPriority.Low, linh, null, ["feature"], doneDaysAgo: 8);
        await db.SaveChangesAsync(ct);

        db.TaskComments.AddRange(
            new TaskComment { TaskId = a1.TaskId, UserId = minh.UserId, Content = "Reproduced on staging: two reservations 40 ms apart for the same cart.", CreatedAt = now.AddHours(-20), UpdatedAt = now.AddHours(-20) },
            new TaskComment { TaskId = a1.TaskId, UserId = hoang.UserId, Content = "Going with a unique (CartId, Status=Active) index plus returning the existing reservation on conflict.", CreatedAt = now.AddHours(-18), UpdatedAt = now.AddHours(-18) },
            new TaskComment { TaskId = a6.TaskId, UserId = linh.UserId, Content = "Looks good. Can we keep the default page size at 20?", CreatedAt = now.AddHours(-5), UpdatedAt = now.AddHours(-5) });

        var acts = new (User Who, Project P, ProjectTask? T, string Action, string Text, double HoursAgo)[]
        {
            (hoang, atelier, a1, "Moved", "moved ATL-1 from Todo to InProgress", 22),
            (minh, atelier, a1, "Commented", "commented on ATL-1: Reproduced on staging…", 20),
            (minh, atelier, a6, "Moved", "moved ATL-6 from InProgress to InReview", 9),
            (linh, atelier, a6, "Commented", "commented on ATL-6: Looks good. Can we keep the default page size at 20?", 5),
            (linh, atelier, null, "Moved", "moved ATL-9 from InReview to Done", 27),
            (hoang, plates, null, "Created", "created PLT-3 CSV export of detections", 30),
            (linh, mobile, null, "Updated", "updated IRL-1: priority Medium → High", 3),
        };
        foreach (var a in acts)
            db.ActivityLogs.Add(new ActivityLog
            {
                UserId = a.Who.UserId, ProjectId = a.P.ProjectId, TaskId = a.T?.TaskId, EntityType = a.T is null ? "Project" : "Task",
                EntityId = a.T?.TaskId ?? a.P.ProjectId, Action = a.Action, Description = a.Text, CreatedAt = now.AddHours(-a.HoursAgo),
            });

        db.Notifications.AddRange(
            new Notification { UserId = hoang.UserId, ActorId = minh.UserId, Type = "task.commented", Message = "New comment on ATL-1 Checkout: guard stock reservation against double submit", ProjectId = atelier.ProjectId, TaskId = a1.TaskId, CreatedAt = now.AddHours(-20) },
            new Notification { UserId = hoang.UserId, ActorId = minh.UserId, Type = "task.status_changed", Message = "ATL-6 Order history: paginate and index by customer moved to InReview", ProjectId = atelier.ProjectId, TaskId = a6.TaskId, CreatedAt = now.AddHours(-9) },
            new Notification { UserId = hoang.UserId, ActorId = linh.UserId, Type = "task.commented", Message = "New comment on ATL-6: Looks good. Can we keep the default page size at 20?", ProjectId = atelier.ProjectId, TaskId = a6.TaskId, CreatedAt = now.AddHours(-5) });

        await db.SaveChangesAsync(ct);
        log.LogInformation("Seeded demo data: 4 users, 3 projects, {Tasks} tasks", await db.ProjectTasks.CountAsync(ct));
    }
}
