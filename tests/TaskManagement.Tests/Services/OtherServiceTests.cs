using Microsoft.EntityFrameworkCore;
using TaskManagement.Application.Common;
using TaskManagement.Application.Contracts;
using TaskManagement.Domain.Enums;

namespace TaskManagement.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly TestDb _db = new();
    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Register_normalises_email_and_rejects_duplicates()
    {
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var session = await s.Auth.RegisterAsync(new RegisterRequest("  New.User@Test.DEV ", "Passw0rd!", "New User"), "127.0.0.1");
        Assert.Equal("new.user@test.dev", session.Auth.User.Email);
        Assert.Equal("NU", session.Auth.User.Initials);
        Assert.True(session.Auth.User.Id > 0);
        var jwt = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().ReadJwtToken(session.Auth.AccessToken);
        Assert.Contains(jwt.Claims, c => c.Value == session.Auth.User.Id.ToString());
        var ex = await Assert.ThrowsAsync<ConflictException>(() => s.Auth.RegisterAsync(new RegisterRequest("new.user@test.dev", "Passw0rd!", "Again"), null));
        Assert.Equal("auth.email_taken", ex.Code);
    }

    [Fact]
    public async Task Login_failure_is_generic()
    {
        var u = await _db.UserAsync("Login User");
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var wrongPw = await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.LoginAsync(new LoginRequest(u.Email, "nope"), null));
        var noUser = await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.LoginAsync(new LoginRequest("ghost@test.dev", "Passw0rd"), null));
        Assert.Equal(wrongPw.Message, noUser.Message);
        Assert.NotNull(await s.Auth.LoginAsync(new LoginRequest(u.Email, "Passw0rd"), null));
    }

    [Fact]
    public async Task Refresh_rotates_and_stores_only_hashes()
    {
        var u = await _db.UserAsync("Rotate User");
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var first = await s.Auth.LoginAsync(new LoginRequest(u.Email, "Passw0rd"), null);
        var second = await s.Auth.RefreshAsync(first.RefreshToken, null);

        Assert.NotEqual(first.RefreshToken, second.RefreshToken);
        Assert.False(await ctx.RefreshTokens.AnyAsync(t => t.TokenHash == first.RefreshToken || t.TokenHash == second.RefreshToken));
        var old = await ctx.RefreshTokens.SingleAsync(t => t.TokenHash == s.Tokens.Hash(first.RefreshToken));
        Assert.NotNull(old.RevokedAt);
        Assert.Equal(s.Tokens.Hash(second.RefreshToken), old.ReplacedByHash);
    }

    [Fact]
    public async Task Reusing_a_rotated_token_revokes_every_session()
    {
        var u = await _db.UserAsync("Victim User");
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var stolen = await s.Auth.LoginAsync(new LoginRequest(u.Email, "Passw0rd"), null);
        var otherDevice = await s.Auth.LoginAsync(new LoginRequest(u.Email, "Passw0rd"), null);
        var rotated = await s.Auth.RefreshAsync(stolen.RefreshToken, null);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.RefreshAsync(stolen.RefreshToken, null));
        Assert.Equal("auth.invalid_refresh_token", ex.Code);
        await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.RefreshAsync(rotated.RefreshToken, null));
        await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.RefreshAsync(otherDevice.RefreshToken, null));
    }

    [Fact]
    public async Task Expired_and_logged_out_tokens_are_rejected()
    {
        var u = await _db.UserAsync("Expiry User");
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var a = await s.Auth.LoginAsync(new LoginRequest(u.Email, "Passw0rd"), null);
        var b = await s.Auth.LoginAsync(new LoginRequest(u.Email, "Passw0rd"), null);

        await s.Auth.LogoutAsync(a.RefreshToken);
        await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.RefreshAsync(a.RefreshToken, null));

        _db.Clock.UtcNow = _db.Clock.UtcNow.AddDays(15);
        await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.RefreshAsync(b.RefreshToken, null));
        await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.RefreshAsync("", null));
        await s.Auth.LogoutAsync(null); // no-op
    }

    [Fact]
    public async Task Me_can_be_read_and_updated()
    {
        var u = await _db.UserAsync("Profile User");
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var me = await s.Auth.UpdateMeAsync(u.UserId, new UpdateMeRequest("Renamed Person", "  hello "));
        Assert.Equal(("Renamed Person", "hello", "RP"), (me.FullName, me.Bio, me.Initials));
        Assert.Equal("Renamed Person", (await s.Auth.GetMeAsync(u.UserId)).FullName);
        await Assert.ThrowsAsync<UnauthorizedException>(() => s.Auth.GetMeAsync(9999));
    }
}

public class ProjectAndMemberServiceTests : IDisposable
{
    private readonly TestDb _db = new();
    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Create_makes_owner_member_with_starter_labels_and_suggests_key()
    {
        var owner = await _db.UserAsync("Owner One");
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var p = await s.Projects.CreateAsync(owner.UserId, new CreateProjectRequest("Mobile Banking App", null, "desc", null));
        Assert.Equal("MBA", p.Key);
        Assert.Equal(ProjectRole.Owner, p.MyRole);
        Assert.Equal(1, p.MemberCount);
        Assert.Equal(4, (await s.Labels.ListAsync(owner.UserId, p.Id)).Count);
        await Assert.ThrowsAsync<ConflictException>(() => s.Projects.CreateAsync(owner.UserId, new CreateProjectRequest("Other", "mba", null, null)));
    }

    [Fact]
    public async Task List_only_shows_my_projects_with_search_and_paging()
    {
        var a = await _db.UserAsync("User A");
        var b = await _db.UserAsync("User B");
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        await s.Projects.CreateAsync(a.UserId, new CreateProjectRequest("Alpha", "ALP", null, null));
        await s.Projects.CreateAsync(a.UserId, new CreateProjectRequest("Beta", "BET", null, null));
        await s.Projects.CreateAsync(b.UserId, new CreateProjectRequest("Gamma", "GAM", null, null));

        Assert.Equal(2, (await s.Projects.ListAsync(a.UserId, new ProjectQuery())).Total);
        Assert.Equal(["Beta"], (await s.Projects.ListAsync(a.UserId, new ProjectQuery("bet"))).Items.Select(p => p.Name));
        var page = await s.Projects.ListAsync(a.UserId, new ProjectQuery(PageSize: 1, Page: 2));
        Assert.Equal((2, 1), (page.Total, page.Items.Count));
    }

    [Fact]
    public async Task Update_requires_admin_and_delete_requires_owner_and_archives_tasks()
    {
        var owner = await _db.UserAsync("Owner One");
        var admin = await _db.UserAsync("Admin Two");
        var member = await _db.UserAsync("Member Three");
        var p = await _db.ProjectAsync(owner, (admin, ProjectRole.Admin), (member, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("t"));

        await Assert.ThrowsAsync<ForbiddenException>(() => s.Projects.UpdateAsync(member.UserId, p, new UpdateProjectRequest("x", null, null, null)));
        var renamed = await s.Projects.UpdateAsync(admin.UserId, p, new UpdateProjectRequest("Renamed", "d", "OnHold", "#112233"));
        Assert.Equal(("Renamed", "OnHold", "#112233"), (renamed.Name, renamed.Status, renamed.Color));

        await Assert.ThrowsAsync<ForbiddenException>(() => s.Projects.DeleteAsync(admin.UserId, p));
        await s.Projects.DeleteAsync(owner.UserId, p);
        await Assert.ThrowsAsync<NotFoundException>(() => s.Projects.GetAsync(owner.UserId, p));
        Assert.False(await ctx.ProjectTasks.AnyAsync(t => t.ProjectId == p && t.IsActive));
    }

    [Fact]
    public async Task Adding_members_validates_and_notifies()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);

        var m = await s.Members.AddAsync(owner.UserId, p, new AddMemberRequest(dev.Email.ToUpperInvariant(), ProjectRole.Member));
        Assert.Equal(dev.UserId, m.UserId);
        Assert.Equal(1, await ctx.Notifications.CountAsync(n => n.UserId == dev.UserId && n.Type == "project.member_added"));
        await Assert.ThrowsAsync<ConflictException>(() => s.Members.AddAsync(owner.UserId, p, new AddMemberRequest(dev.Email)));
        await Assert.ThrowsAsync<NotFoundException>(() => s.Members.AddAsync(owner.UserId, p, new AddMemberRequest("nobody@test.dev")));
        Assert.Equal(2, (await s.Members.ListAsync(dev.UserId, p)).Count);
    }

    [Fact]
    public async Task Role_rules_protect_owner_and_admins()
    {
        var owner = await _db.UserAsync("Owner One");
        var admin = await _db.UserAsync("Admin Two");
        var other = await _db.UserAsync("Other Admin");
        var dev = await _db.UserAsync("Dev Three");
        var p = await _db.ProjectAsync(owner, (admin, ProjectRole.Admin), (other, ProjectRole.Admin), (dev, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);

        await Assert.ThrowsAsync<ForbiddenException>(() => s.Members.UpdateAsync(admin.UserId, p, owner.UserId, new UpdateMemberRequest(ProjectRole.Member)));
        await Assert.ThrowsAsync<ForbiddenException>(() => s.Members.UpdateAsync(admin.UserId, p, dev.UserId, new UpdateMemberRequest(ProjectRole.Admin)));
        await Assert.ThrowsAsync<ForbiddenException>(() => s.Members.RemoveAsync(admin.UserId, p, other.UserId));
        await Assert.ThrowsAsync<ForbiddenException>(() => s.Members.RemoveAsync(owner.UserId, p, owner.UserId));
        Assert.Equal(ProjectRole.Viewer, (await s.Members.UpdateAsync(admin.UserId, p, dev.UserId, new UpdateMemberRequest(ProjectRole.Viewer))).Role);
        Assert.Equal(ProjectRole.Admin, (await s.Members.UpdateAsync(owner.UserId, p, dev.UserId, new UpdateMemberRequest(ProjectRole.Admin))).Role);
    }

    [Fact]
    public async Task Removing_a_member_unassigns_their_tasks_atomically()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var p = await _db.ProjectAsync(owner, (dev, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("for dev", AssigneeId: dev.UserId));

        await s.Members.RemoveAsync(owner.UserId, p, dev.UserId);

        ctx.ChangeTracker.Clear();
        var after = await s.Tasks.GetAsync(owner.UserId, p, t.Id);
        Assert.Null(after.Assignee);
        Assert.Equal(t.Version + 1, after.Version); // bulk unassign also bumps the concurrency token
        await Assert.ThrowsAsync<NotFoundException>(() => s.Tasks.GetBoardAsync(dev.UserId, p, new TaskQuery()));
        Assert.Contains(await ctx.ActivityLogs.Select(a => a.Description).ToListAsync(), d => d!.Contains("1 task(s) unassigned"));
    }

    [Fact]
    public async Task Members_can_leave_and_rejoin()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var p = await _db.ProjectAsync(owner, (dev, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        await s.Members.RemoveAsync(dev.UserId, p, dev.UserId);
        var back = await s.Members.AddAsync(owner.UserId, p, new AddMemberRequest(dev.Email, ProjectRole.Viewer));
        Assert.Equal(ProjectRole.Viewer, back.Role);
    }

    [Fact]
    public async Task Labels_crud_with_unique_names()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var p = await _db.ProjectAsync(owner, (dev, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);

        var l = await s.Labels.CreateAsync(owner.UserId, p, new CreateLabelRequest("Perf", "#123456"));
        Assert.Equal("perf", l.Name);
        await Assert.ThrowsAsync<ConflictException>(() => s.Labels.CreateAsync(owner.UserId, p, new CreateLabelRequest("perf", "#123456")));
        await Assert.ThrowsAsync<ForbiddenException>(() => s.Labels.CreateAsync(dev.UserId, p, new CreateLabelRequest("x", "#123456")));
        await Assert.ThrowsAsync<ConflictException>(() => s.Labels.UpdateAsync(owner.UserId, p, l.Id, new UpdateLabelRequest("bug", null)));
        Assert.Equal("#abcdef", (await s.Labels.UpdateAsync(owner.UserId, p, l.Id, new UpdateLabelRequest(null, "#abcdef"))).Color);

        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("tagged", LabelIds: [l.Id]));
        await s.Labels.DeleteAsync(owner.UserId, p, l.Id);
        Assert.Empty((await s.Tasks.GetAsync(owner.UserId, p, t.Id)).Labels);
        await Assert.ThrowsAsync<NotFoundException>(() => s.Labels.DeleteAsync(owner.UserId, p, l.Id));
    }
}

public class CommentActivityNotificationDashboardTests : IDisposable
{
    private readonly TestDb _db = new();
    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Comments_notify_assignee_and_creator_but_not_the_author()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var qa = await _db.UserAsync("Qa Three");
        var p = await _db.ProjectAsync(owner, (dev, ProjectRole.Member), (qa, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("t", AssigneeId: dev.UserId));

        var c = await s.Comments.AddAsync(qa.UserId, p, t.Id, new CreateCommentRequest("  Found a bug  "));
        Assert.Equal("Found a bug", c.Content);
        Assert.Equal(2, await ctx.Notifications.CountAsync(n => n.Type == "task.commented"));
        Assert.False(await ctx.Notifications.AnyAsync(n => n.UserId == qa.UserId));
        Assert.Equal(1, (await s.Tasks.GetAsync(owner.UserId, p, t.Id)).CommentCount);
    }

    [Fact]
    public async Task Only_author_edits_and_author_or_admin_deletes()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var qa = await _db.UserAsync("Qa Three");
        var p = await _db.ProjectAsync(owner, (dev, ProjectRole.Member), (qa, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("t"));
        var c = await s.Comments.AddAsync(dev.UserId, p, t.Id, new CreateCommentRequest("v1"));

        await Assert.ThrowsAsync<ForbiddenException>(() => s.Comments.UpdateAsync(qa.UserId, p, t.Id, c.Id, new UpdateCommentRequest("hijack")));
        _db.Clock.UtcNow = _db.Clock.UtcNow.AddMinutes(5);
        var edited = await s.Comments.UpdateAsync(dev.UserId, p, t.Id, c.Id, new UpdateCommentRequest("v2"));
        Assert.True(edited.Edited);
        await Assert.ThrowsAsync<ForbiddenException>(() => s.Comments.DeleteAsync(qa.UserId, p, t.Id, c.Id));
        await s.Comments.DeleteAsync(owner.UserId, p, t.Id, c.Id);
        Assert.Empty(await s.Comments.ListAsync(owner.UserId, p, t.Id));
        await Assert.ThrowsAsync<NotFoundException>(() => s.Comments.ListAsync(owner.UserId, p, 999));
    }

    [Fact]
    public async Task Activity_feed_and_task_history_are_newest_first()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var t = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("t"));
        await s.Tasks.UpdateAsync(owner.UserId, p, t.Id, new UpdateTaskRequest(t.Version, Priority: ProjectTaskPriority.High));

        var history = await s.Activity.TaskHistoryAsync(owner.UserId, p, t.Id);
        Assert.Equal(["Updated", "Created"], history.Select(h => h.Action));
        Assert.Contains("priority Medium → High", history[0].Description);
        var feed = await s.Activity.ProjectFeedAsync(owner.UserId, p, new PageQuery(1, 2));
        Assert.Equal(3, feed.Total); // project created + task created + task updated
        Assert.Equal(2, feed.Items.Count);
    }

    [Fact]
    public async Task Notifications_list_count_and_mark_read_are_scoped_to_the_user()
    {
        var owner = await _db.UserAsync("Owner One");
        var dev = await _db.UserAsync("Dev Two");
        var p = await _db.ProjectAsync(owner, (dev, ProjectRole.Member));
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("a", AssigneeId: dev.UserId));
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("b", AssigneeId: dev.UserId));

        Assert.Equal(2, await s.Notifications.UnreadCountAsync(dev.UserId));
        var list = await s.Notifications.ListAsync(dev.UserId, true, new PageQuery());
        Assert.Equal("Owner One", list.Items[0].Actor!.FullName);
        await Assert.ThrowsAsync<NotFoundException>(() => s.Notifications.MarkReadAsync(owner.UserId, list.Items[0].Id));
        await s.Notifications.MarkReadAsync(dev.UserId, list.Items[0].Id);
        await s.Notifications.MarkReadAsync(dev.UserId, list.Items[0].Id); // idempotent
        Assert.Equal(1, await s.Notifications.UnreadCountAsync(dev.UserId));
        Assert.Equal(1, await s.Notifications.MarkAllReadAsync(dev.UserId));
        Assert.Equal(0, await s.Notifications.UnreadCountAsync(dev.UserId));
    }

    [Fact]
    public async Task Dashboard_counts_my_work()
    {
        var owner = await _db.UserAsync("Owner One");
        var p = await _db.ProjectAsync(owner);
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var today = _db.Clock.UtcNow.Date;
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("late", AssigneeId: owner.UserId, DueDate: today.AddDays(-1)));
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("soon", AssigneeId: owner.UserId, DueDate: today.AddDays(2)));
        await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("not mine"));
        var done = await s.Tasks.CreateAsync(owner.UserId, p, new CreateTaskRequest("finished", AssigneeId: owner.UserId));
        await s.Tasks.MoveAsync(owner.UserId, p, done.Id, new MoveTaskRequest(done.Version, ProjectTaskStatus.Done));

        var d = await s.Dashboard.GetAsync(owner.UserId);
        Assert.Equal((2, 1, 1, 1), (d.OpenAssigned, d.Overdue, d.DueThisWeek, d.CompletedLast7Days));
        Assert.Equal("late", d.UpNext[0].Title);
        Assert.Equal((1, 4), (d.Projects[0].Done, d.Projects[0].Total));
        Assert.Equal(14, d.CompletedPerDay.Count);
        Assert.Equal(1, d.CompletedPerDay[^1].Count);
        Assert.NotEmpty(d.RecentActivity);
    }

    [Fact]
    public async Task User_directory_searches_active_users()
    {
        await _db.UserAsync("Alice Nguyen");
        await _db.UserAsync("Bob Tran");
        await using var ctx = _db.NewContext();
        var s = _db.For(ctx);
        var r = await s.Users.SearchAsync("ali", new PageQuery());
        Assert.Equal(["Alice Nguyen"], r.Items.Select(u => u.FullName));
        Assert.Equal(2, (await s.Users.SearchAsync(null, new PageQuery())).Total);
    }
}
