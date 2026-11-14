using Microsoft.EntityFrameworkCore;
using TaskManagement.Infrastructure.Data;

namespace TaskManagement.Infrastructure.Core;

internal static class Transactions
{
    /// <summary>
    /// Runs <paramref name="work"/> inside an explicit transaction, wrapped in the provider's execution
    /// strategy so it stays correct if connection-resiliency retries are switched on. Used where a change
    /// spans several statements (bulk ExecuteUpdate + tracked changes) that must commit together.
    /// </summary>
    public static Task<T> InTransactionAsync<T>(this ApplicationDbContext db, Func<CancellationToken, Task<T>> work, CancellationToken ct)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var result = await work(ct);
            await tx.CommitAsync(ct);
            return result;
        });
    }

    public static Task InTransactionAsync(this ApplicationDbContext db, Func<CancellationToken, Task> work, CancellationToken ct) =>
        db.InTransactionAsync(async c => { await work(c); return true; }, ct);
}
