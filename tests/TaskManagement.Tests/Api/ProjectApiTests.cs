using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace TaskManagement.Tests.Api;

public class ProjectApiTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    internal static async Task<int> CreateProject(TestUser u, string name = "Atelier", string? key = null)
    {
        var res = await u.Http.PostAsJsonAsync("/api/v1/projects", new { name, key, description = "d" });
        var body = await res.Json(HttpStatusCode.Created);
        Assert.NotNull(res.Headers.Location);
        return body.GetProperty("id").GetInt32();
    }

    internal static async Task AddMember(TestUser owner, int projectId, TestUser who, string role)
    {
        var res = await owner.Http.PostAsJsonAsync($"/api/v1/projects/{projectId}/members", new { email = who.Email, role });
        await res.Json(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Project_crud_happy_path()
    {
        var u = await api.UserAsync();
        var id = await CreateProject(u, "Plates Console", "PLT");

        var list = await (await u.Http.GetAsync("/api/v1/projects?search=plates&page=1&pageSize=5")).Json(HttpStatusCode.OK);
        Assert.Equal(1, list.GetProperty("total").GetInt32());
        Assert.Equal("Owner", list.GetProperty("items")[0].GetProperty("myRole").GetString());

        var one = await (await u.Http.GetAsync($"/api/v1/projects/{id}")).Json(HttpStatusCode.OK);
        Assert.Equal("PLT", one.GetProperty("key").GetString());

        var upd = await (await u.Http.PatchAsJsonAsync($"/api/v1/projects/{id}", new { status = "OnHold", color = "#224466" })).Json(HttpStatusCode.OK);
        Assert.Equal("OnHold", upd.GetProperty("status").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await u.Http.DeleteAsync($"/api/v1/projects/{id}")).StatusCode);
        await (await u.Http.GetAsync($"/api/v1/projects/{id}")).Problem(HttpStatusCode.NotFound, "project.not_found");
    }

    [Fact]
    public async Task Project_errors()
    {
        var u = await api.UserAsync();
        var stranger = await api.UserAsync();
        await (await u.Http.PostAsJsonAsync("/api/v1/projects", new { name = "", key = "1" })).Problem(HttpStatusCode.BadRequest, "validation_failed");
        var id = await CreateProject(u, "Dup", "DUP");
        await (await u.Http.PostAsJsonAsync("/api/v1/projects", new { name = "Again", key = "DUP" })).Problem(HttpStatusCode.Conflict, "project.key_taken");
        await (await u.Http.PatchAsJsonAsync($"/api/v1/projects/{id}", new { status = "Paused" })).Problem(HttpStatusCode.BadRequest);
        await (await stranger.Http.GetAsync($"/api/v1/projects/{id}")).Problem(HttpStatusCode.NotFound);
        await (await stranger.Http.DeleteAsync($"/api/v1/projects/{id}")).Problem(HttpStatusCode.NotFound);
        await (await api.CreateClient().GetAsync("/api/v1/projects")).Problem(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Member_management_and_role_enforcement()
    {
        var owner = await api.UserAsync();
        var admin = await api.UserAsync();
        var dev = await api.UserAsync();
        var id = await CreateProject(owner);
        await AddMember(owner, id, admin, "Admin");
        await AddMember(admin, id, dev, "Member");

        var members = await (await dev.Http.GetAsync($"/api/v1/projects/{id}/members")).Json(HttpStatusCode.OK);
        Assert.Equal(3, members.GetArrayLength());

        await (await dev.Http.PostAsJsonAsync($"/api/v1/projects/{id}/members", new { email = admin.Email, role = "Member" })).Problem(HttpStatusCode.Forbidden, "project.forbidden");
        await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{id}/members", new { email = dev.Email, role = "Member" })).Problem(HttpStatusCode.Conflict, "member.exists");
        await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{id}/members", new { email = "ghost@test.dev", role = "Member" })).Problem(HttpStatusCode.NotFound, "user.not_found");
        await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{id}/members", new { email = dev.Email, role = "Owner" })).Problem(HttpStatusCode.BadRequest);

        var viewer = await (await admin.Http.PatchAsJsonAsync($"/api/v1/projects/{id}/members/{dev.Id}", new { role = "Viewer" })).Json(HttpStatusCode.OK);
        Assert.Equal("Viewer", viewer.GetProperty("role").GetString());
        await (await admin.Http.PatchAsJsonAsync($"/api/v1/projects/{id}/members/{owner.Id}", new { role = "Member" })).Problem(HttpStatusCode.Forbidden, "member.owner_immutable");
        await (await owner.Http.PatchAsJsonAsync($"/api/v1/projects/{id}/members/99999", new { role = "Member" })).Problem(HttpStatusCode.NotFound, "member.not_found");

        Assert.Equal(HttpStatusCode.NoContent, (await owner.Http.DeleteAsync($"/api/v1/projects/{id}/members/{dev.Id}")).StatusCode);
        await (await dev.Http.GetAsync($"/api/v1/projects/{id}")).Problem(HttpStatusCode.NotFound);
        await (await owner.Http.DeleteAsync($"/api/v1/projects/{id}/members/{owner.Id}")).Problem(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Labels_endpoints()
    {
        var owner = await api.UserAsync();
        var dev = await api.UserAsync();
        var id = await CreateProject(owner);
        await AddMember(owner, id, dev, "Member");

        var labels = await (await dev.Http.GetAsync($"/api/v1/projects/{id}/labels")).Json(HttpStatusCode.OK);
        Assert.Equal(4, labels.GetArrayLength());

        var created = await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{id}/labels", new { name = "perf", color = "#123456" })).Json(HttpStatusCode.Created);
        var labelId = created.GetProperty("id").GetInt32();
        await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{id}/labels", new { name = "perf", color = "#123456" })).Problem(HttpStatusCode.Conflict, "label.exists");
        await (await owner.Http.PostAsJsonAsync($"/api/v1/projects/{id}/labels", new { name = "x", color = "blue" })).Problem(HttpStatusCode.BadRequest);
        await (await dev.Http.PostAsJsonAsync($"/api/v1/projects/{id}/labels", new { name = "x", color = "#123456" })).Problem(HttpStatusCode.Forbidden);

        var renamed = await (await owner.Http.PatchAsJsonAsync($"/api/v1/projects/{id}/labels/{labelId}", new { name = "speed" })).Json(HttpStatusCode.OK);
        Assert.Equal("speed", renamed.GetProperty("name").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await owner.Http.DeleteAsync($"/api/v1/projects/{id}/labels/{labelId}")).StatusCode);
        await (await owner.Http.DeleteAsync($"/api/v1/projects/{id}/labels/{labelId}")).Problem(HttpStatusCode.NotFound, "label.not_found");
    }

    [Fact]
    public async Task Activity_feed_and_user_directory()
    {
        var owner = await api.UserAsync("Feed Owner");
        var id = await CreateProject(owner);
        var feed = await (await owner.Http.GetAsync($"/api/v1/projects/{id}/activity?page=1&pageSize=10")).Json(HttpStatusCode.OK);
        Assert.Equal("Created", feed.GetProperty("items")[0].GetProperty("action").GetString());

        var stranger = await api.UserAsync();
        await (await stranger.Http.GetAsync($"/api/v1/projects/{id}/activity")).Problem(HttpStatusCode.NotFound);

        var users = await (await owner.Http.GetAsync("/api/v1/users?search=Feed%20Owner")).Json(HttpStatusCode.OK);
        Assert.Equal(1, users.GetProperty("total").GetInt32());
        Assert.False(users.GetProperty("items")[0].TryGetProperty("passwordHash", out _));
    }

    [Fact]
    public async Task Page_size_is_capped()
    {
        var u = await api.UserAsync();
        var res = await (await u.Http.GetAsync("/api/v1/projects?pageSize=5000")).Json(HttpStatusCode.OK);
        Assert.Equal(100, res.GetProperty("pageSize").GetInt32());
    }
}
