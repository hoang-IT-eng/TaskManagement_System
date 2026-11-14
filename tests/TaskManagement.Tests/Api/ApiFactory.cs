using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;

namespace TaskManagement.Tests.Api;

/// <summary>Boots the real API (all middleware, auth, validation, migrations) on a throwaway SQLite file.</summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"layers-test-{Guid.NewGuid():N}.db");
    protected virtual int AuthPermitPerMinute => 10_000;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_dbPath}");
        builder.UseSetting("Jwt:SigningKey", new string('t', 48));
        builder.UseSetting("RateLimiting:AuthPermitPerMinute", AuthPermitPerMinute.ToString());
        builder.UseSetting("Seed:Demo", "false");
        builder.UseSetting("Logging:Format", "simple");
        builder.UseSetting("Logging:LogLevel:Default", "Warning");
    }

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private int _seq;

    /// <summary>Registers a fresh user and returns a client that sends their bearer token and keeps their refresh cookie.</summary>
    public async Task<TestUser> UserAsync(string? name = null)
    {
        var n = Interlocked.Increment(ref _seq);
        name ??= $"User {n}";
        var email = $"user{n}.{Guid.NewGuid():N}"[..20] + "@test.dev";
        var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var res = await client.PostAsJsonAsync("/api/v1/auth/register", new { email, password = "Passw0rd!", fullName = name });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(Json);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("accessToken").GetString());
        return new TestUser(client, body.GetProperty("user").GetProperty("id").GetInt32(), email, name);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        SqliteConnection.ClearAllPools();
        foreach (var f in new[] { _dbPath, _dbPath + "-shm", _dbPath + "-wal" })
            try { File.Delete(f); } catch { /* best effort */ }
    }
}

public sealed class StrictRateLimitFactory : ApiFactory
{
    protected override int AuthPermitPerMinute => 3;
}

public sealed record TestUser(HttpClient Http, int Id, string Email, string Name);

public static class HttpAssert
{
    public static async Task<JsonElement> Json(this HttpResponseMessage res, HttpStatusCode expected)
    {
        var text = await res.Content.ReadAsStringAsync();
        Assert.True(res.StatusCode == expected, $"Expected {(int)expected} but got {(int)res.StatusCode}: {text}");
        return text.Length == 0 ? default : JsonDocument.Parse(text).RootElement.Clone();
    }

    /// <summary>Asserts the shared error contract: problem+json with status, title, code and traceId.</summary>
    public static async Task<JsonElement> Problem(this HttpResponseMessage res, HttpStatusCode expected, string? code = null)
    {
        var body = await res.Json(expected);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal((int)expected, body.GetProperty("status").GetInt32());
        Assert.True(body.TryGetProperty("title", out _));
        Assert.True(body.TryGetProperty("traceId", out _), "problem must carry traceId");
        if (code is not null) Assert.Equal(code, body.GetProperty("code").GetString());
        return body;
    }

    public static Task<HttpResponseMessage> PatchAsJsonAsync<T>(this HttpClient c, string url, T body) =>
        c.SendAsync(new HttpRequestMessage(HttpMethod.Patch, url) { Content = JsonContent.Create(body) });
}
