namespace TaskManagement.Domain.Common;

/// <summary>Entities with an integer optimistic-concurrency token bumped on every update.</summary>
public interface IVersioned
{
    int Version { get; set; }
}

/// <summary>Entities whose UpdatedAt is stamped by the persistence layer.</summary>
public interface IAuditable
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}
