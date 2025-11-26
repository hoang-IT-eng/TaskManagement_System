using TaskManagement.Domain.Common;

namespace TaskManagement.Application.Interfaces;

public interface IFileStorageService
{
    Task<Result<string>> SaveFileAsync(Stream fileStream, string fileName, string folder);
    Task<Result<byte[]>> GetFileAsync(string filePath);
    Task<Result<bool>> DeleteFileAsync(string filePath);
    string GetFileUrl(string filePath);
}

