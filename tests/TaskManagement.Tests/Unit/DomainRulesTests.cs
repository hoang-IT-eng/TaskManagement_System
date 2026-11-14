using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Rules;

namespace TaskManagement.Tests.Unit;

public class RankingTests
{
    [Fact]
    public void Empty_column_gets_the_base_spacing() => Assert.Equal(Ranking.Spacing, Ranking.Between(null, null));

    [Fact]
    public void Top_of_column_is_one_spacing_above_the_first_card() => Assert.Equal(1000 - Ranking.Spacing, Ranking.Between(null, 1000));

    [Fact]
    public void Bottom_of_column_is_one_spacing_below_the_last_card() => Assert.Equal(3000 + Ranking.Spacing, Ranking.Between(3000, null));

    [Fact]
    public void Between_two_cards_is_the_midpoint() => Assert.Equal(1500, Ranking.Between(1000, 2000));

    [Fact]
    public void Repeated_bisection_eventually_requires_rebalance()
    {
        double lo = 1024, hi = 2048;
        var steps = 0;
        while (!Ranking.NeedsRebalance(lo, hi) && steps < 200)
        {
            hi = Ranking.Between(lo, hi);
            steps++;
        }
        Assert.True(Ranking.NeedsRebalance(lo, hi));
        Assert.InRange(steps, 20, 60);
    }

    [Fact]
    public void Open_ended_neighbours_never_need_rebalance()
    {
        Assert.False(Ranking.NeedsRebalance(null, 5));
        Assert.False(Ranking.NeedsRebalance(5, null));
    }

    [Fact]
    public void Sequence_is_evenly_spaced() => Assert.Equal([1024d, 2048d, 3072d], Ranking.Sequence(3));
}

public class ProjectPermissionsTests
{
    [Theory]
    [InlineData(ProjectRole.Viewer, ProjectAction.View, true)]
    [InlineData(ProjectRole.Viewer, ProjectAction.EditTasks, false)]
    [InlineData(ProjectRole.Viewer, ProjectAction.Comment, false)]
    [InlineData(ProjectRole.Member, ProjectAction.EditTasks, true)]
    [InlineData(ProjectRole.Member, ProjectAction.DeleteAnyTask, false)]
    [InlineData(ProjectRole.Member, ProjectAction.ManageMembers, false)]
    [InlineData(ProjectRole.Admin, ProjectAction.ManageMembers, true)]
    [InlineData(ProjectRole.Admin, ProjectAction.ManageLabels, true)]
    [InlineData(ProjectRole.Admin, ProjectAction.DeleteProject, false)]
    [InlineData(ProjectRole.Owner, ProjectAction.DeleteProject, true)]
    public void Role_matrix(ProjectRole role, ProjectAction action, bool allowed) => Assert.Equal(allowed, ProjectPermissions.Can(role, action));

    [Fact]
    public void Every_action_has_a_minimum_role()
    {
        foreach (var action in Enum.GetValues<ProjectAction>())
            Assert.True(Enum.IsDefined(ProjectPermissions.MinimumRole(action)));
    }
}
