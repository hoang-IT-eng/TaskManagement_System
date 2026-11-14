using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace TaskManagement.Tests.Api;

public class TaskApiTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    private static async Task<JsonElement> CreateTask(TestUser u, int projectId, object body)
    {
        var res = await u.Http.PostAsJsonAsync($"/api/v1/projects/{projectId}/tasks", body);
        return await res.Json(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Task_lifecycle_create_get_update_move_delete()
    {
        var owner = await api.UserAsync();
        var pid = await ProjectApiTests.CreateProject(owner, "Lifecycle", "LIF");
        var labels = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/labels")).Json(HttpStatusCode.OK);
        var bug = labels.EnumerateArray().First(l => l.GetProperty("name").GetString() == "bug").GetProperty("id").GetInt32();

        var t = await CreateTask(owner, pid, new { title = "Fix login", priority = "High", assigneeId = owner.Id, dueDate = "2026-12-01", labelIds = new[] { bug } });
        var tid = t.GetProperty("id").GetInt32();
        Assert.Equal("LIF-1", t.GetProperty("key").GetString());
        Assert.Equal("High", t.GetProperty("priority").GetString());
        Assert.Equal("2026-12-01T00:00:00Z", t.GetProperty("dueDate").GetString());
        Assert.Equal("bug", t.GetProperty("labels")[0].GetProperty("name").GetString());

        var got = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks/{tid}")).Json(HttpStatusCode.OK);
        var v = got.GetProperty("version").GetInt32();

        var upd = await (await owner.Http.PatchAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}", new { version = v, title = "Fix login redirect", clearDueDate = true })).Json(HttpStatusCode.OK);
        Assert.Equal(v + 1, upd.GetProperty("version").GetInt32());
        Assert.Equal(JsonValueKind.Null, upd.GetProperty("dueDate").ValueKind);

        var moved = await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}/move", new { version = v + 1, status = "Done" })).Json(HttpStatusCode.OK);
        Assert.Equal("Done", moved.GetProperty("status").GetString());
        Assert.NotEqual(JsonValueKind.Null, moved.GetProperty("completedAt").ValueKind);

        var history = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks/{tid}/activity")).Json(HttpStatusCode.OK);
        Assert.Equal(["Moved", "Updated", "Created"], history.EnumerateArray().Select(h => h.GetProperty("action").GetString()));

        Assert.Equal(HttpStatusCode.NoContent, (await owner.Http.DeleteAsync($"/api/v1/projects/{pid}/tasks/{tid}")).StatusCode);
        await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks/{tid}")).Problem(HttpStatusCode.NotFound, "task.not_found");
    }

    [Fact]
    public async Task Stale_version_returns_409_with_current_task()
    {
        var owner = await api.UserAsync();
        var pid = await ProjectApiTests.CreateProject(owner, "Locking", "LCK");
        var t = await CreateTask(owner, pid, new { title = "Shared card" });
        var tid = t.GetProperty("id").GetInt32();
        var v = t.GetProperty("version").GetInt32();

        (await owner.Http.PatchAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}", new { version = v, title = "Edited in tab A" })).EnsureSuccessStatusCode();

        var conflict = await (await owner.Http.PatchAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}", new { version = v, title = "Edited in tab B" }))
            .Problem(HttpStatusCode.Conflict, "task.version_conflict");
        Assert.Equal("Edited in tab A", conflict.GetProperty("current").GetProperty("title").GetString());
        Assert.Equal(v + 1, conflict.GetProperty("current").GetProperty("version").GetInt32());

        await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}/move", new { version = v, status = "Done" }))
            .Problem(HttpStatusCode.Conflict, "task.version_conflict");
    }

    [Fact]
    public async Task Board_groups_columns_and_drag_drop_reorders()
    {
        var owner = await api.UserAsync();
        var pid = await ProjectApiTests.CreateProject(owner, "Board", "BRD");
        var a = await CreateTask(owner, pid, new { title = "A" });
        var b = await CreateTask(owner, pid, new { title = "B" });
        var c = await CreateTask(owner, pid, new { title = "C" }); // column order: C, B, A

        // drag A between C and B
        var moved = await owner.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks/{a.GetProperty("id")}/move",
            new { version = a.GetProperty("version").GetInt32(), status = "Todo", beforeTaskId = c.GetProperty("id").GetInt32(), afterTaskId = b.GetProperty("id").GetInt32() });
        await moved.Json(HttpStatusCode.OK);

        var board = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/board")).Json(HttpStatusCode.OK);
        var columns = board.GetProperty("columns");
        Assert.Equal(["Todo", "InProgress", "InReview", "Done"], columns.EnumerateArray().Select(col => col.GetProperty("status").GetString()));
        Assert.Equal(["C", "A", "B"], columns[0].GetProperty("tasks").EnumerateArray().Select(t => t.GetProperty("title").GetString()));

        var bad = await owner.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks/{b.GetProperty("id")}/move",
            new { version = b.GetProperty("version").GetInt32(), status = "Done", beforeTaskId = c.GetProperty("id").GetInt32() });
        var problem = await bad.Problem(HttpStatusCode.BadRequest, "validation_failed");
        Assert.True(problem.GetProperty("errors").TryGetProperty("beforeTaskId", out _));
    }

    [Fact]
    public async Task List_supports_filters_sorting_and_pagination()
    {
        var owner = await api.UserAsync();
        var pid = await ProjectApiTests.CreateProject(owner, "Filters", "FLT");
        await CreateTask(owner, pid, new { title = "Urgent thing", priority = "Urgent", assigneeId = owner.Id });
        await CreateTask(owner, pid, new { title = "Low thing", priority = "Low" });
        await CreateTask(owner, pid, new { title = "Review me", status = "InReview" });

        var urgent = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks?priority=Urgent")).Json(HttpStatusCode.OK);
        Assert.Equal(1, urgent.GetProperty("total").GetInt32());
        var mine = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks?assigneeId={owner.Id}")).Json(HttpStatusCode.OK);
        Assert.Equal("Urgent thing", mine.GetProperty("items")[0].GetProperty("title").GetString());
        var review = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks?status=InReview")).Json(HttpStatusCode.OK);
        Assert.Equal(1, review.GetProperty("total").GetInt32());
        var search = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks?search=low")).Json(HttpStatusCode.OK);
        Assert.Equal(1, search.GetProperty("total").GetInt32());
        var paged = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks?sort=-priority&page=1&pageSize=2")).Json(HttpStatusCode.OK);
        Assert.Equal((3, 2, 2), (paged.GetProperty("total").GetInt32(), paged.GetProperty("items").GetArrayLength(), paged.GetProperty("totalPages").GetInt32()));
        Assert.Equal("Urgent thing", paged.GetProperty("items")[0].GetProperty("title").GetString());

        await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks?sort=nope")).Problem(HttpStatusCode.BadRequest);
        await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks?status=Bogus")).Problem(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Task_permissions_and_validation()
    {
        var owner = await api.UserAsync();
        var viewer = await api.UserAsync();
        var stranger = await api.UserAsync();
        var pid = await ProjectApiTests.CreateProject(owner, "Perms", "PRM");
        await ProjectApiTests.AddMember(owner, pid, viewer, "Viewer");
        var t = await CreateTask(owner, pid, new { title = "Owner's" });
        var tid = t.GetProperty("id").GetInt32();

        await (await viewer.Http.GetAsync($"/api/v1/projects/{pid}/board")).Json(HttpStatusCode.OK);
        await (await viewer.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks", new { title = "x" })).Problem(HttpStatusCode.Forbidden, "project.forbidden");
        await (await viewer.Http.PatchAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}", new { version = 1, title = "x" })).Problem(HttpStatusCode.Forbidden);
        await (await viewer.Http.DeleteAsync($"/api/v1/projects/{pid}/tasks/{tid}")).Problem(HttpStatusCode.Forbidden);
        await (await stranger.Http.GetAsync($"/api/v1/projects/{pid}/tasks/{tid}")).Problem(HttpStatusCode.NotFound, "project.not_found");

        await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks", new { title = "" })).Problem(HttpStatusCode.BadRequest, "validation_failed");
        await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks", new { title = "x", assigneeId = stranger.Id })).Problem(HttpStatusCode.BadRequest);
        await (await owner.Http.PatchAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}", new { title = "no version" })).Problem(HttpStatusCode.BadRequest);
        await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks/424242")).Problem(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Comments_endpoints_and_notifications_flow()
    {
        var owner = await api.UserAsync("Comment Owner");
        var dev = await api.UserAsync("Comment Dev");
        var pid = await ProjectApiTests.CreateProject(owner, "Comments", "CMT");
        await ProjectApiTests.AddMember(owner, pid, dev, "Member");
        var t = await CreateTask(owner, pid, new { title = "Discuss", assigneeId = dev.Id });
        var tid = t.GetProperty("id").GetInt32();

        var c = await (await dev.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}/comments", new { content = "On it" })).Json(HttpStatusCode.Created);
        var cid = c.GetProperty("id").GetInt32();
        await (await dev.Http.PostAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}/comments", new { content = "" })).Problem(HttpStatusCode.BadRequest);

        var list = await (await owner.Http.GetAsync($"/api/v1/projects/{pid}/tasks/{tid}/comments")).Json(HttpStatusCode.OK);
        Assert.Equal("On it", list[0].GetProperty("content").GetString());

        await (await owner.Http.PatchAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}/comments/{cid}", new { content = "hijack" })).Problem(HttpStatusCode.Forbidden, "comment.not_author");
        var edited = await (await dev.Http.PatchAsJsonAsync($"/api/v1/projects/{pid}/tasks/{tid}/comments/{cid}", new { content = "On it, PR soon" })).Json(HttpStatusCode.OK);
        Assert.Equal("On it, PR soon", edited.GetProperty("content").GetString());

        // dev was notified when added to the project and when assigned; owner about the comment
        var devCount = await (await dev.Http.GetAsync("/api/v1/notifications/unread-count")).Json(HttpStatusCode.OK);
        Assert.Equal(2, devCount.GetProperty("count").GetInt32());
        var ownerList = await (await owner.Http.GetAsync("/api/v1/notifications?unreadOnly=true")).Json(HttpStatusCode.OK);
        var n = ownerList.GetProperty("items")[0];
        Assert.Equal("task.commented", n.GetProperty("type").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await owner.Http.PostAsync($"/api/v1/notifications/{n.GetProperty("id")}/read", null)).StatusCode);
        await (await dev.Http.PostAsync($"/api/v1/notifications/{n.GetProperty("id")}/read", null)).Problem(HttpStatusCode.NotFound, "notification.not_found");
        var all = await (await dev.Http.PostAsync("/api/v1/notifications/read-all", null)).Json(HttpStatusCode.OK);
        Assert.Equal(2, all.GetProperty("updated").GetInt32());

        Assert.Equal(HttpStatusCode.NoContent, (await owner.Http.DeleteAsync($"/api/v1/projects/{pid}/tasks/{tid}/comments/{cid}")).StatusCode);
        await (await owner.Http.DeleteAsync($"/api/v1/projects/{pid}/tasks/{tid}/comments/{cid}")).Problem(HttpStatusCode.NotFound, "comment.not_found");
    }

    [Fact]
    public async Task Dashboard_reflects_assigned_work()
    {
        var u = await api.UserAsync();
        var pid = await ProjectApiTests.CreateProject(u, "Dash", "DSH");
        await CreateTask(u, pid, new { title = "Late", assigneeId = u.Id, dueDate = DateTime.UtcNow.Date.AddDays(-1) });
        var d = await (await u.Http.GetAsync("/api/v1/dashboard")).Json(HttpStatusCode.OK);
        Assert.Equal(1, d.GetProperty("openAssigned").GetInt32());
        Assert.Equal(1, d.GetProperty("overdue").GetInt32());
        Assert.Equal("Late", d.GetProperty("upNext")[0].GetProperty("title").GetString());
        await (await api.CreateClient().GetAsync("/api/v1/dashboard")).Problem(HttpStatusCode.Unauthorized);
    }
}

public class PlatformApiTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Health_reports_database()
    {
        var res = await api.CreateClient().GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("Healthy", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Responses_carry_request_id_and_echo_incoming_one()
    {
        var c = api.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Get, "/health");
        req.Headers.Add("X-Request-Id", "abc123");
        var res = await c.SendAsync(req);
        Assert.Equal("abc123", res.Headers.GetValues("X-Request-Id").Single());
    }

    [Fact]
    public async Task Unknown_route_is_a_404_problem()
    {
        var u = await api.UserAsync();
        await (await u.Http.GetAsync("/api/v1/nope")).Problem(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Guard rail: the v1 surface documented in OpenAPI must equal this list. Adding an endpoint fails this
    /// test until it is listed here (and, by convention, covered in the API tests above).
    /// </summary>
    [Fact]
    public async Task OpenApi_v1_surface_is_the_documented_one()
    {
        var doc = await (await api.CreateClient().GetAsync("/swagger/v1/swagger.json")).Json(HttpStatusCode.OK);
        var ops = doc.GetProperty("paths").EnumerateObject()
            .SelectMany(p => p.Value.EnumerateObject().Select(m => $"{m.Name.ToUpperInvariant()} {p.Name}"))
            .Order().ToList();
        string[] expected =
        [
            "DELETE /api/v1/projects/{projectId}",
            "DELETE /api/v1/projects/{projectId}/labels/{labelId}",
            "DELETE /api/v1/projects/{projectId}/members/{userId}",
            "DELETE /api/v1/projects/{projectId}/tasks/{taskId}",
            "DELETE /api/v1/projects/{projectId}/tasks/{taskId}/comments/{commentId}",
            "GET /api/v1/auth/me",
            "GET /api/v1/dashboard",
            "GET /api/v1/notifications",
            "GET /api/v1/notifications/unread-count",
            "GET /api/v1/projects",
            "GET /api/v1/projects/{projectId}",
            "GET /api/v1/projects/{projectId}/activity",
            "GET /api/v1/projects/{projectId}/board",
            "GET /api/v1/projects/{projectId}/labels",
            "GET /api/v1/projects/{projectId}/members",
            "GET /api/v1/projects/{projectId}/tasks",
            "GET /api/v1/projects/{projectId}/tasks/{taskId}",
            "GET /api/v1/projects/{projectId}/tasks/{taskId}/activity",
            "GET /api/v1/projects/{projectId}/tasks/{taskId}/comments",
            "GET /api/v1/users",
            "PATCH /api/v1/auth/me",
            "PATCH /api/v1/projects/{projectId}",
            "PATCH /api/v1/projects/{projectId}/labels/{labelId}",
            "PATCH /api/v1/projects/{projectId}/members/{userId}",
            "PATCH /api/v1/projects/{projectId}/tasks/{taskId}",
            "PATCH /api/v1/projects/{projectId}/tasks/{taskId}/comments/{commentId}",
            "POST /api/v1/auth/login",
            "POST /api/v1/auth/logout",
            "POST /api/v1/auth/refresh",
            "POST /api/v1/auth/register",
            "POST /api/v1/notifications/read-all",
            "POST /api/v1/notifications/{notificationId}/read",
            "POST /api/v1/projects",
            "POST /api/v1/projects/{projectId}/labels",
            "POST /api/v1/projects/{projectId}/members",
            "POST /api/v1/projects/{projectId}/tasks",
            "POST /api/v1/projects/{projectId}/tasks/{taskId}/comments",
            "POST /api/v1/projects/{projectId}/tasks/{taskId}/move",
        ];
        Assert.Equal(expected.Order(StringComparer.Ordinal), ops.Order(StringComparer.Ordinal));
    }
}
