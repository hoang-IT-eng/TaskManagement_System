namespace TaskManagement.Domain.Common;

public class Result<T>
{
    public bool IsSuccess { get; set; }
    public T? Data { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string> Errors { get; set; } = new();

    public static Result<T> Success(T data, string message = "Success")
        => new() { IsSuccess = true, Data = data, Message = message };

    public static Result<T> Failure(string error)
        => new() { IsSuccess = false, Message = error, Errors = new List<string> { error } };

    public static Result<T> Failure(List<string> errors)
        => new() { IsSuccess = false, Errors = errors };
}