using System.Diagnostics;
using System.Security.Claims;

namespace TaskManagement.API.Http;

/// <summary>
/// One structured log line per request (method, path, status, elapsed ms, user id) inside a scope that
/// carries the request id, so every log written while handling the request can be correlated.
/// Echoes X-Request-Id back to the client.
/// </summary>
public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> log)
{
    public async Task InvokeAsync(HttpContext http)
    {
        var requestId = http.Request.Headers["X-Request-Id"].FirstOrDefault() is { Length: > 0 and <= 64 } incoming
            ? incoming
            : Activity.Current?.TraceId.ToString() ?? http.TraceIdentifier;
        http.Response.Headers["X-Request-Id"] = requestId;

        using var scope = log.BeginScope(new Dictionary<string, object> { ["RequestId"] = requestId });
        var sw = Stopwatch.StartNew();
        try
        {
            await next(http);
        }
        finally
        {
            sw.Stop();
            var status = http.Response.StatusCode;
            var level = status >= 500 ? LogLevel.Error : status >= 400 ? LogLevel.Warning : LogLevel.Information;
            if (http.Request.Path.StartsWithSegments("/api") || status >= 400)
                log.Log(level, "HTTP {Method} {Path} -> {StatusCode} in {ElapsedMs} ms (user {UserId})",
                    http.Request.Method, http.Request.Path.Value, status, sw.ElapsedMilliseconds,
                    http.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "-");
        }
    }
}
