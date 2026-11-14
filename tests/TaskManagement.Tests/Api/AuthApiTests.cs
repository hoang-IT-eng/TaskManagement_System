using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace TaskManagement.Tests.Api;

public class AuthApiTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Register_returns_201_with_access_token_and_sets_httponly_refresh_cookie()
    {
        var client = api.CreateClient();
        var res = await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "cookie@test.dev", password = "Passw0rd!", fullName = "Cookie Person" });
        var body = await res.Json(HttpStatusCode.Created);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
        Assert.False(body.TryGetProperty("refreshToken", out _), "refresh token must not be exposed to JS");
        var cookie = Assert.Single(res.Headers.GetValues("Set-Cookie"));
        Assert.Contains("layers_rt=", cookie);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/v1/auth", cookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_validation_and_duplicate_errors_use_problem_contract()
    {
        var client = api.CreateClient();
        var bad = await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "nope", password = "short", fullName = "" });
        var problem = await bad.Problem(HttpStatusCode.BadRequest, "validation_failed");
        var errors = problem.GetProperty("errors");
        Assert.True(errors.TryGetProperty("email", out _));
        Assert.True(errors.TryGetProperty("password", out _));
        Assert.True(errors.TryGetProperty("fullName", out _));

        await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "dupe@test.dev", password = "Passw0rd!", fullName = "A" });
        var dupe = await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "DUPE@test.dev", password = "Passw0rd!", fullName = "B" });
        await dupe.Problem(HttpStatusCode.Conflict, "auth.email_taken");
    }

    [Fact]
    public async Task Malformed_json_is_a_400_problem()
    {
        var client = api.CreateClient();
        var res = await client.PostAsync("/api/v1/auth/login", new StringContent("{not json", System.Text.Encoding.UTF8, "application/json"));
        await res.Problem(HttpStatusCode.BadRequest, "validation_failed");
    }

    [Fact]
    public async Task Login_success_and_generic_failure()
    {
        var u = await api.UserAsync();
        var client = api.CreateClient();
        (await client.PostAsJsonAsync("/api/v1/auth/login", new { email = u.Email, password = "Passw0rd!" })).EnsureSuccessStatusCode();
        var wrong = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = u.Email, password = "wrong-pass1" });
        var ghost = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = "ghost@test.dev", password = "wrong-pass1" });
        var a = await wrong.Problem(HttpStatusCode.Unauthorized, "auth.invalid_credentials");
        var b = await ghost.Problem(HttpStatusCode.Unauthorized, "auth.invalid_credentials");
        Assert.Equal(a.GetProperty("detail").GetString(), b.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Refresh_rotates_cookie_and_reuse_kills_the_session()
    {
        var client = api.CreateClient(new() { HandleCookies = false });
        var login = await client.PostAsJsonAsync("/api/v1/auth/register", new { email = "rotate@test.dev", password = "Passw0rd!", fullName = "Rotate" });
        var first = Cookie(login);

        var r1 = await Send(client, first);
        await r1.Json(HttpStatusCode.OK);
        var second = Cookie(r1);
        Assert.NotEqual(first, second);

        var replay = await Send(client, first);
        await replay.Problem(HttpStatusCode.Unauthorized, "auth.invalid_refresh_token");
        Assert.Contains(replay.Headers.GetValues("Set-Cookie"), c => c.StartsWith("layers_rt=;"));
        (await Send(client, second)).StatusCode.Equals(HttpStatusCode.Unauthorized);
        await (await Send(client, second)).Problem(HttpStatusCode.Unauthorized);

        static Task<HttpResponseMessage> Send(HttpClient c, string cookie)
        {
            var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
            req.Headers.Add("Cookie", $"layers_rt={cookie}");
            return c.SendAsync(req);
        }
    }

    [Fact]
    public async Task Refresh_without_cookie_is_401()
    {
        var res = await api.CreateClient().PostAsync("/api/v1/auth/refresh", null);
        await res.Problem(HttpStatusCode.Unauthorized, "auth.invalid_refresh_token");
    }

    [Fact]
    public async Task Logout_revokes_refresh_and_is_idempotent()
    {
        var u = await api.UserAsync();
        Assert.Equal(HttpStatusCode.OK, (await u.Http.PostAsync("/api/v1/auth/refresh", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await u.Http.PostAsync("/api/v1/auth/logout", null)).StatusCode);
        await (await u.Http.PostAsync("/api/v1/auth/refresh", null)).Problem(HttpStatusCode.Unauthorized);
        Assert.Equal(HttpStatusCode.NoContent, (await u.Http.PostAsync("/api/v1/auth/logout", null)).StatusCode);
    }

    [Fact]
    public async Task Me_requires_auth_and_can_be_updated()
    {
        await (await api.CreateClient().GetAsync("/api/v1/auth/me")).Problem(HttpStatusCode.Unauthorized, "auth.required");
        var u = await api.UserAsync("Me Person");
        var me = await (await u.Http.GetAsync("/api/v1/auth/me")).Json(HttpStatusCode.OK);
        Assert.Equal("MP", me.GetProperty("initials").GetString());
        var upd = await (await u.Http.PatchAsJsonAsync("/api/v1/auth/me", new { fullName = "New Name", bio = "hi" })).Json(HttpStatusCode.OK);
        Assert.Equal("New Name", upd.GetProperty("fullName").GetString());
        await (await u.Http.PatchAsJsonAsync("/api/v1/auth/me", new { fullName = "" })).Problem(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Garbage_bearer_token_is_401()
    {
        var c = api.CreateClient();
        c.DefaultRequestHeaders.Authorization = new("Bearer", "not.a.jwt");
        await (await c.GetAsync("/api/v1/projects")).Problem(HttpStatusCode.Unauthorized);
    }

    private static string Cookie(HttpResponseMessage res) =>
        res.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("layers_rt=")).Split(';')[0]["layers_rt=".Length..];
}

public class RateLimitApiTests(StrictRateLimitFactory api) : IClassFixture<StrictRateLimitFactory>
{
    [Fact]
    public async Task Auth_endpoints_are_rate_limited_per_client()
    {
        var c = api.CreateClient();
        HttpResponseMessage last = null!;
        for (var i = 0; i < 4; i++)
            last = await c.PostAsJsonAsync("/api/v1/auth/login", new { email = "x@test.dev", password = "whatever1" });
        await last.Problem(HttpStatusCode.TooManyRequests, "rate_limited");
    }
}
