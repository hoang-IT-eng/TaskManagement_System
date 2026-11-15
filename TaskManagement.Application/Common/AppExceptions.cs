namespace TaskManagement.Application.Common;

/// <summary>
/// Base type for failures that map to a well-defined HTTP problem response. Services throw these;
/// the API's exception handler turns them into RFC 7807 problem+json with a stable <see cref="Code"/>.
/// </summary>
public abstract class AppException : Exception
{
    protected AppException(string code, string message) : base(message) => Code = code;

    /// <summary>Machine-readable error code, e.g. "task.version_conflict".</summary>
    public string Code { get; }
    public abstract int StatusCode { get; }
}

public sealed class NotFoundException(string code, string message) : AppException(code, message)
{
    public override int StatusCode => 404;
}

public sealed class ForbiddenException(string code, string message) : AppException(code, message)
{
    public override int StatusCode => 403;
}

public sealed class UnauthorizedException(string code, string message) : AppException(code, message)
{
    public override int StatusCode => 401;
}

public sealed class ConflictException(string code, string message, object? current = null) : AppException(code, message)
{
    public override int StatusCode => 409;

    /// <summary>Optional server-side state returned with the problem so clients can reconcile.</summary>
    public object? Current { get; } = current;
}

public sealed class ValidationFailedException : AppException
{
    public ValidationFailedException(IDictionary<string, string[]> errors)
        : base("validation_failed", "One or more fields are invalid.") => Errors = errors;

    public ValidationFailedException(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = [message] }) { }

    public IDictionary<string, string[]> Errors { get; }
    public override int StatusCode => 400;
}
