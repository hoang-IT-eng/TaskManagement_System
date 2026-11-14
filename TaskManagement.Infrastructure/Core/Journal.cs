using TaskManagement.Domain.Entities;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Core;

/// <summary>
/// Stages activity-log and notification rows on the current DbContext without saving, so they commit
/// in the same unit of work (and transaction) as the change they describe — never a log row for a
/// change that rolled back, never a change without its log row.
/// </summary>
public sealed class Journal(ApplicationDbContext db)
{
    public void Activity(int actorId, string action, string entityType, int entityId, int? projectId, int? taskId, string description,
        string? oldValue = null, string? newValue = null) =>
        db.ActivityLogs.Add(new ActivityLog
        {
            UserId = actorId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            ProjectId = projectId,
            TaskId = taskId,
            Description = description,
            OldValue = oldValue,
            NewValue = newValue,
            CreatedAt = DateTime.UtcNow,
        });

    public void Notify(int recipientId, int actorId, string type, string message, int? projectId, int? taskId)
    {
        if (recipientId == actorId) return; // never notify people about their own actions
        db.Notifications.Add(new Notification
        {
            UserId = recipientId,
            ActorId = actorId,
            Type = type,
            Message = message.Length > 500 ? message[..500] : message,
            ProjectId = projectId,
            TaskId = taskId,
            CreatedAt = DateTime.UtcNow,
        });
    }
}
