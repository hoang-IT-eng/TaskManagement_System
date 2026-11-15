namespace TaskManagement.Domain.Rules;

/// <summary>
/// Fractional ranking for kanban ordering. Moving a card only rewrites that card's rank (midpoint of its
/// neighbours); when two neighbours get too close the column is renumbered with <see cref="Spacing"/> gaps.
/// </summary>
public static class Ranking
{
    public const double Spacing = 1024d;
    public const double MinGap = 1e-6;

    /// <summary>Rank for a card placed between <paramref name="before"/> (above) and <paramref name="after"/> (below).</summary>
    public static double Between(double? before, double? after) => (before, after) switch
    {
        (null, null) => Spacing,
        (null, double a) => a - Spacing,
        (double b, null) => b + Spacing,
        (double b, double a) => b + (a - b) / 2d,
    };

    /// <summary>True when the gap between neighbours is too small to bisect safely.</summary>
    public static bool NeedsRebalance(double? before, double? after) =>
        before is double b && after is double a && Math.Abs(a - b) < MinGap * 2;

    /// <summary>Evenly spaced ranks for a column of <paramref name="count"/> cards.</summary>
    public static IEnumerable<double> Sequence(int count) =>
        Enumerable.Range(1, count).Select(i => i * Spacing);
}
