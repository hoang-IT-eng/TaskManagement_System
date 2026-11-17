using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;
using TaskManagement.Domain.Enums;
using TaskManagement.Domain.Rules;

namespace TaskManagement.Tests.Services;

public class TaskServiceTests : IDisposable
{
    private readonly TestDb _db = new();
    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Task_numbers_are_sequential_per_project_and_keys_use_the_project_key()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);

        var a = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("First"));
        var b = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Second"));

        Assert.Equal((1, "TST-1"), (a.Number, a.Key));
        Assert.Equal((2, "TST-2"), (b.Number, b.Key));
        Assert.True(b.Rank < a.Rank, "new cards land at the top of their column");
    }

    [Fact]
    public async Task Create_writes_activity_and_notifies_assignee_in_the_same_unit_of_work()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var p = await _db.ProjectAsync(owner, (dev, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);

        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Assigned", AssigneeId: dev.UserId));

        Assert.Equal(1, await ctx.ActivityLogs.CountAsync(a => a.TaskId == t.Id && a.Action == "Created"));
        var n = await ctx.Notifications.SingleAsync(x => x.UserId == dev.UserId);
        Assert.Equal("task.assigned", n.Type);
        Assert.Contains("TST-1", n.Message);
    }

    [Fact]
    public async Task Assignee_must_be_an_editing_member()
    {
        var owner = await _db.UserAsync("Owner One");
        var viewer = await _db.UserAsync("View Only");
        var stranger = await _db.UserAsync("Not Member");
        var p = await _db.ProjectAsync(owner, (viewer, ProjectRole.Viewer));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);

        await Assert.ThrowsAsync<ValidationFailedException>(() => s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("x", AssigneeId: stranger.UserId)));
        await Assert.ThrowsAsync<ValidationFailedException>(() => s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("x", AssigneeId: viewer.UserId)));
    }

    [Fact]
    public async Task Labels_from_another_project_are_rejected()
    {
        var owner = await _db.UserAsync("Owner One");
        var p1 = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var p2 = (await s.Projects.CreateAsync(owner.UserId, new("Other", "OTH", null, null))).Id;
        var foreignLabel = (await s.Labels.ListAsync(owner.UserId, p2))[0].Id;

        await Assert.ThrowsAsync<ValidationFailedException>(() =>
            s.Tasks.CreateAsync(owner.UserId, p1, new CreateTaskRequest("x", LabelIds: [foreignLabel])));
    }

    [Fact]
    public async Task Update_with_stale_version_returns_conflict_with_current_state()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Original"));

        var updated = await s.Tasks.UpdateAsync(owner.UserId, p, t.Id, new UpdateTaskRequest(t.Version, Title: "Edited by A"));
        Assert.Equal(t.Version + 1, updated.Version);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            s.Tasks.UpdateAsync(owner.UserId, p, t.Id, new UpdateTaskRequest(t.Version, Title: "Edited by B")));
        Assert.Equal("task.version_conflict", ex.Code);
        Assert.Equal("Edited by A", Assert.IsType<TaskDto>(ex.Current).Title);
    }

    [Fact]
    public async Task Concurrent_write_between_read_and_save_is_caught_by_the_concurrency_token()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        int taskId;
        await using (var setup = _db.NewContext())
            taskId = (await _db.For(setup).Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Shared"))).Id;

        // User A loads the row (version 1) ...
        await using var a = _db.NewContext();
        var rowA = await a.ProjectTasks.FirstAsync(t => t.TaskId == taskId);

        // ... user B saves first through the service (version 1 -> 2) ...
        await using (var b = _db.NewContext())
            await _db.For(b).Tasks.UpdateAsync(owner.UserId, p, taskId, new UpdateTaskRequest(1, Title: "B wins"));

        // ... so A's UPDATE ... WHERE Version = 1 matches no row.
        rowA.Title = "A loses";
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => a.SaveChangesAsync());

        await using var check = _db.NewContext();
        Assert.Equal("B wins", (await check.ProjectTasks.FindAsync(taskId))!.Title);
    }

    [Fact]
    public async Task Project_counter_is_protected_by_its_version_token()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var a = _db.NewContext();
        await using var b = _db.NewContext();
        var pa = await a.Projects.FirstAsync(x => x.ProjectId == p);
        var pb = await b.Projects.FirstAsync(x => x.ProjectId == p);
        pa.NextTaskNumber++;
        pb.NextTaskNumber++;
        await a.SaveChangesAsync();
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => b.SaveChangesAsync());
    }

    [Fact]
    public async Task Status_change_sets_and_clears_completed_at()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("x"));

        var done = await s.Tasks.UpdateAsync(owner.UserId, p, t.Id, new UpdateTaskRequest(t.Version, Status: ProjectTaskStatus.Done));
        Assert.NotNull(done.CompletedAt);
        var reopened = await s.Tasks.UpdateAsync(owner.UserId, p, t.Id, new UpdateTaskRequest(done.Version, Status: ProjectTaskStatus.InProgress));
        Assert.Null(reopened.CompletedAt);
    }

    [Fact]
    public async Task Update_can_clear_assignee_and_due_date_and_replace_labels()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var labels = await s.Labels.ListAsync(owner.UserId, p);
        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("x", AssigneeId: owner.UserId, DueDate: new DateTime(2026, 12, 1), LabelIds: [labels[0].Id, labels[1].Id]));

        var u = await s.Tasks.UpdateAsync(owner.UserId, p, t.Id, new UpdateTaskRequest(t.Version, ClearAssignee: true, ClearDueDate: true, LabelIds: [labels[2].Id]));

        Assert.Null(u.Assignee);
        Assert.Null(u.DueDate);
        Assert.Equal([labels[2].Id], u.Labels.Select(l => l.Id));
    }

    [Fact]
    public async Task No_op_update_does_not_bump_version()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Same"));
        var u = await s.Tasks.UpdateAsync(owner.UserId, p, t.Id, new UpdateTaskRequest(t.Version, Title: "Same"));
        Assert.Equal(t.Version, u.Version);
    }

    [Fact]
    public async Task Move_places_card_between_neighbours_in_target_column()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var d1 = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("done 1", Status: ProjectTaskStatus.Done));
        var d2 = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("done 2", Status: ProjectTaskStatus.Done)); // top
        var card = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("moving"));

        var moved = await s.Tasks.MoveAsync(owner.UserId, p, card.Id, new MoveTaskRequest(card.Version, ProjectTaskStatus.Done, BeforeTaskId: d2.Id, AfterTaskId: d1.Id));

        var board = await s.Tasks.GetBoardAsync(owner.UserId, p, new TaskQuery());
        var done = board.Columns.Single(c => c.Status == ProjectTaskStatus.Done).Tasks.Select(t => t.Id).ToList();
        Assert.Equal([d2.Id, card.Id, d1.Id], done);
        Assert.NotNull(moved.CompletedAt);
    }

    [Fact]
    public async Task Move_rejects_neighbours_from_another_column()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var todo = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("todo"));
        var card = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("moving"));

        var ex = await Assert.ThrowsAsync<ValidationFailedException>(() =>
            s.Tasks.MoveAsync(owner.UserId, p, card.Id, new MoveTaskRequest(card.Version, ProjectTaskStatus.Done, BeforeTaskId: todo.Id)));
        Assert.Contains("beforeTaskId", ex.Errors.Keys);
    }

    [Fact]
    public async Task Crowded_column_is_rebalanced_and_order_is_preserved()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var a = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("a"));
        var b = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("b"));
        // squeeze a and b to adjacent ranks
        await ctx.ProjectTasks.Where(t => t.TaskId == b.Id).ExecuteUpdateAsync(x => x.SetProperty(t => t.Rank, 100.0));
        await ctx.ProjectTasks.Where(t => t.TaskId == a.Id).ExecuteUpdateAsync(x => x.SetProperty(t => t.Rank, 100.0 + 1e-7));
        ctx.ChangeTracker.Clear();
        var c = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("c", Status: ProjectTaskStatus.Done));

        await s.Tasks.MoveAsync(owner.UserId, p, c.Id, new MoveTaskRequest(c.Version, ProjectTaskStatus.Todo, BeforeTaskId: b.Id, AfterTaskId: a.Id));

        var col = (await s.Tasks.GetBoardAsync(owner.UserId, p, new TaskQuery())).Columns[0].Tasks;
        Assert.Equal(["b", "c", "a"], col.Select(t => t.Title));
        Assert.Equal(Ranking.Sequence(3), col.Select(t => t.Rank));
    }

    [Fact]
    public async Task Due_windows_are_instant_based_not_utc_calendar_days()
    {
        // 22:30 UTC is already the next morning in UTC+7. A task due 10:00 UTC the same day has passed
        // for everyone, so it must count as overdue even though its UTC calendar date is "today".
        _db.Clock.UtcNow = new DateTime(2026, 11, 14, 22, 30, 0, DateTimeKind.Utc);
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Passed earlier today", DueDate: new DateTime(2026, 11, 14, 10, 0, 0, DateTimeKind.Utc), AssigneeId: owner.UserId));
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("In 20 hours", DueDate: new DateTime(2026, 11, 15, 18, 30, 0, DateTimeKind.Utc), AssigneeId: owner.UserId));

        Assert.Equal(["Passed earlier today"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Due: "overdue"))).Items.Select(t => t.Title));
        Assert.Equal(["In 20 hours"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Due: "today"))).Items.Select(t => t.Title));
        var d = await s.Dashboard.GetAsync(owner.UserId);
        Assert.Equal((1, 1), (d.Overdue, d.DueThisWeek));
        Assert.Equal(1, (await s.Projects.GetAsync(owner.UserId, p)).OverdueCount);
    }

    [Fact]
    public async Task List_filters_sorts_and_paginates()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var today = _db.Clock.UtcNow.Date;
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Overdue bug", Priority: ProjectTaskPriority.Urgent, DueDate: today.AddDays(-2)));
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("This week", DueDate: today.AddDays(3), AssigneeId: owner.UserId));
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Someday"));
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Done late", Status: ProjectTaskStatus.Done, DueDate: today.AddDays(-5)));

        Assert.Equal(["Overdue bug"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Due: "overdue"))).Items.Select(t => t.Title));
        Assert.Equal(["This week"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Due: "week"))).Items.Select(t => t.Title));
        Assert.Equal(["Someday"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Due: "none"))).Items.Select(t => t.Title));
        Assert.Equal(["This week"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(AssigneeId: owner.UserId))).Items.Select(t => t.Title));
        Assert.Equal(3, (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Unassigned: true))).Total);
        Assert.Equal("Overdue bug", (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Sort: "-priority"))).Items[0].Title);
        Assert.Equal(["Someday"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Search: "some"))).Items.Select(t => t.Title));
        Assert.Equal(["This week"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Search: "TST-2"))).Items.Select(t => t.Title));

        var page = await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Sort: "created", Page: 2, PageSize: 3));
        Assert.Equal((4, 2, 1), (page.Total, page.TotalPages, page.Items.Count));
        Assert.Equal("Done late", page.Items[0].Title);

        await Assert.ThrowsAsync<ValidationFailedException>(() => s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Sort: "bogus")));
        await Assert.ThrowsAsync<ValidationFailedException>(() => s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Due: "yesterday")));
    }

    [Fact]
    public async Task Members_can_delete_own_tasks_but_not_others()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var p = await _db.ProjectAsync(owner, (dev, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var ownersTask = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("owner's"));
        var devTask = await s.Tasks.CreateAsync(dev.UserId, p, new CreateTaskRequest("dev's"));

        await Assert.ThrowsAsync<ForbiddenException>(() => s.Tasks.DeleteAsync(dev.UserId, p, ownersTask.Id));
        await s.Tasks.DeleteAsync(dev.UserId, p, devTask.Id);
        await s.Tasks.DeleteAsync(owner.UserId, p, ownersTask.Id); // admin+ may delete any
        Assert.Equal(0, (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery())).Total);
        await Assert.ThrowsAsync<NotFoundException>(() => s.Tasks.GetAsync(owner.UserId, p, devTask.Id));
    }

    [Fact]
    public async Task Issue_type_defaults_to_task_and_can_be_set_filtered_and_changed()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);

        var plain = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Plain"));
        var bug = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("Crash on save", Type: ProjectTaskType.Bug));
        var story = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("As a user I want export", Type: ProjectTaskType.Story));

        Assert.Equal(ProjectTaskType.Task, plain.Type);
        Assert.Equal(ProjectTaskType.Bug, bug.Type);
        Assert.Equal(ProjectTaskType.Story, story.Type);

        Assert.Equal(["Crash on save"], (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Type: ProjectTaskType.Bug))).Items.Select(t => t.Title));
        var board = await s.Tasks.GetBoardAsync(owner.UserId, p, new TaskQuery(Type: ProjectTaskType.Story));
        Assert.Equal(["As a user I want export"], board.Columns.SelectMany(c => c.Tasks).Select(t => t.Title));

        var changed = await s.Tasks.UpdateAsync(owner.UserId, p, plain.Id, new UpdateTaskRequest(plain.Version, Type: ProjectTaskType.Bug));
        Assert.Equal(ProjectTaskType.Bug, changed.Type);
        Assert.Equal(2, (await s.Tasks.ListAsync(owner.UserId, p, new TaskQuery(Type: ProjectTaskType.Bug))).Total);
    }

    [Fact]
    public async Task Viewers_can_read_but_not_write_and_strangers_get_not_found()
    {
        var owner = await _db.UserAsync("Owner One");
        var viewer = await _db.UserAsync("View Only");
        var stranger = await _db.UserAsync("Not Member");
        var p = await _db.ProjectAsync(owner, (viewer, ProjectRole.Viewer));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);

        Assert.NotNull(await s.Tasks.GetBoardAsync(viewer.UserId, p, new TaskQuery()));
        await Assert.ThrowsAsync<ForbiddenException>(() => s.Tasks.CreateAsync(viewer.UserId, p, new CreateTaskRequest("nope")));
        await Assert.ThrowsAsync<NotFoundException>(() => s.Tasks.GetBoardAsync(stranger.UserId, p, new TaskQuery()));
    }
}
