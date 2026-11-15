using System.Diagnostics;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TaskManagement.Application.Common;

namespace TaskManagement.API.Http;

/// <summary>
/// One error contract for the whole API (RFC 7807 problem+json):
/// { type, title, status, detail, code, traceId, errors?, current? }.
/// <c>code</c> is stable and machine-readable; <c>detail</c> is written for people.
/// </summary>
public sealed class AppExceptionHandler(IProblemDetailsService problems, ILogger<AppExceptionHandler> log, IHostEnvironment env) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem;
        switch (exception)
        {
            case ValidationFailedException v:
                problem = new ValidationProblemDetails(v.Errors) { Status = 400, Title = "Validation failed", Detail = v.Message };
                problem.Extensions["code"] = v.Code;
                break;
            case AppException app:
                problem = new ProblemDetails { Status = app.StatusCode, Title = TitleFor(app.StatusCode), Detail = app.Message };
                problem.Extensions["code"] = app.Code;
                if (app is ConflictException { Current: not null } conflict)
                    problem.Extensions["current"] = conflict.Current;
                if (app.StatusCode >= 500) log.LogError(exception, "Unhandled application error");
                break;
            case BadHttpRequestException bad:
                problem = new ProblemDetails { Status = 400, Title = "Bad request", Detail = bad.Message };
                problem.Extensions["code"] = "bad_request";
                break;
            case OperationCanceledException when http.RequestAborted.IsCancellationRequested:
                return true; // client went away; nothing to write
            default:
                log.LogError(exception, "Unhandled exception for {Method} {Path}", http.Request.Method, http.Request.Path);
                problem = new ProblemDetails
                {
                    Status = 500,
                    Title = "Server error",
                    Detail = env.IsDevelopment() ? exception.Message : "Something went wrong on our side. Try again; if it keeps failing, contact support with the trace id.",
                };
                problem.Extensions["code"] = "server_error";
                break;
        }

        http.Response.StatusCode = problem.Status ?? 500;
        return await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = http, ProblemDetails = problem, Exception = exception });
    }

    internal static string TitleFor(int status) => status switch
    {
        400 => "Validation failed",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not found",
        409 => "Conflict",
        429 => "Too many requests",
        _ => "Error",
    };
}

/// <summary>Runs the FluentValidation validator for every action argument that has one.</summary>
public sealed class ValidationFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var arg in context.ActionArguments.Values)
        {
            if (arg is null) continue;
            var validatorType = typeof(IValidator<>).MakeGenericType(arg.GetType());
            if (services.GetService(validatorType) is not IValidator validator) continue;
            var result = await validator.ValidateAsync(new ValidationContext<object>(arg), context.HttpContext.RequestAborted);
            if (!result.IsValid)
            {
                var errors = result.Errors
                    .GroupBy(e => ToCamel(e.PropertyName))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray());
                throw new ValidationFailedException(errors);
            }
        }
        await next();
    }

    private static string ToCamel(string name) => string.IsNullOrEmpty(name) ? name : char.ToLowerInvariant(name[0]) + name[1..];
}

public static class ProblemSetup
{
    public static IServiceCollection AddProblemContract(this IServiceCollection services)
    {
        services.AddProblemDetails(o => o.CustomizeProblemDetails = c =>
        {
            c.ProblemDetails.Extensions["traceId"] = Activity.Current?.TraceId.ToString() ?? c.HttpContext.TraceIdentifier;
            c.ProblemDetails.Type ??= $"https://httpstatuses.io/{c.ProblemDetails.Status}";
            c.ProblemDetails.Instance ??= c.HttpContext.Request.Path;
            if (!c.ProblemDetails.Extensions.ContainsKey("code"))
                c.ProblemDetails.Extensions["code"] = c.ProblemDetails.Status switch
                {
                    401 => "auth.required",
                    403 => "forbidden",
                    404 => "not_found",
                    405 => "method_not_allowed",
                    415 => "unsupported_media_type",
                    429 => "rate_limited",
                    _ => "error",
                };
        });
        services.AddExceptionHandler<AppExceptionHandler>();
        services.PostConfigure<ApiBehaviorOptions>(o =>
        {
            // Malformed JSON / wrong types (model binding) use the same contract as validation errors.
            o.InvalidModelStateResponseFactory = ctx =>
            {
                var problem = new ValidationProblemDetails(ctx.ModelState) { Status = 400, Title = "Validation failed", Detail = "The request body or parameters could not be read." };
                problem.Extensions["code"] = "validation_failed";
                problem.Extensions["traceId"] = Activity.Current?.TraceId.ToString() ?? ctx.HttpContext.TraceIdentifier;
                return new BadRequestObjectResult(problem) { ContentTypes = { "application/problem+json" } };
            };
        });
        return services;
    }
}
