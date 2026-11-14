using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using TaskManagement.API.Controllers.V1;
using TaskManagement.API.Http;
using TaskManagement.Application.Validators;
using TaskManagement.Infrastructure;
using TaskManagement.Infrastructure.Data;
using TaskManagement.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---- logging: JSON lines in production (one object per event, scopes included), readable text in dev
builder.Logging.ClearProviders();
if (string.Equals(config["Logging:Format"], "json", StringComparison.OrdinalIgnoreCase))
    builder.Logging.AddJsonConsole(o => { o.IncludeScopes = true; o.UseUtcTimestamp = true; o.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ "; });
else
    builder.Logging.AddSimpleConsole(o => { o.SingleLine = true; o.IncludeScopes = true; });

// ---- application services
builder.Services.AddInfrastructure(config);
builder.Services.AddValidatorsFromAssemblyContaining<CreateTaskRequestValidator>();
builder.Services.Configure<AuthCookieOptions>(config.GetSection(AuthCookieOptions.Section));
builder.Services.AddProblemContract();
builder.Services.AddScoped<ValidationFilter>();
builder.Services.AddControllers(o => o.Filters.AddService<ValidationFilter>())
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    });

// ---- auth: short-lived JWT access tokens; refresh handled by AuthController + RefreshTokens table
var jwt = config.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey.PadRight(32))),
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });
builder.Services.AddAuthorization();

// ---- rate limiting on credential endpoints (per client IP)
var authPermits = config.GetValue("RateLimiting:AuthPermitPerMinute", 20);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = authPermits, Window = TimeSpan.FromMinutes(1) }));
    o.OnRejected = async (ctx, ct) =>
    {
        var problems = ctx.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
        await problems.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx.HttpContext,
            ProblemDetails = { Status = 429, Title = "Too many requests", Detail = "Too many attempts. Wait a minute and try again." },
        });
    };
});

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(config.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
    .WithExposedHeaders("X-Request-Id")));

builder.Services.AddHealthChecks().AddDbContextCheck<ApplicationDbContext>("database");

// ---- OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "Layers API", Version = "v1", Description = "Projects, kanban tasks, comments, activity and notifications." });
    o.SwaggerDoc("legacy", new OpenApiInfo { Title = "Layers API (legacy)", Version = "legacy", Description = "Pre-v1 endpoints kept for the old vanilla frontend: teams, positions, admin, profile/avatar, attachments." });
    var xml = Path.Combine(AppContext.BaseDirectory, "TaskManagement.API.xml");
    if (File.Exists(xml)) o.IncludeXmlComments(xml);
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Paste the accessToken from /api/v1/auth/login.",
    });
    o.AddSecurityRequirement(doc => new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("Bearer", doc)] = [] });
});

var app = builder.Build();

// ---- database: apply migrations (provider-specific history) and optional demo seed
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (config.GetValue("Database:MigrateOnStartup", true))
        await db.Database.MigrateAsync();
    if (config.GetValue("Seed:Demo", false))
        await scope.ServiceProvider.GetRequiredService<DemoSeeder>().SeedAsync();
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseMiddleware<RequestLoggingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(o =>
{
    o.SwaggerEndpoint("/swagger/v1/swagger.json", "Layers API v1");
    o.SwaggerEndpoint("/swagger/legacy/swagger.json", "Legacy endpoints");
    o.RoutePrefix = "swagger";
});

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// Serve the built SPA (copied into wwwroot) for client-side routes.
if (File.Exists(Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html")))
    app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
