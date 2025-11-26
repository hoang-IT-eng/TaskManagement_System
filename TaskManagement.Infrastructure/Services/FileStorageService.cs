using Microsoft.AspNetCore.Hosting;
using TaskManagement.Application.Interfaces;
using TaskManagement.Domain.Common;

namespace TaskManagement.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;
    private readonly string _uploadsFolder;

    public FileStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
        _uploadsFolder = Path.Combine(_environment.ContentRootPath, "uploads");
        
        // Ensure uploads directory exists
        if (!Directory.Exists(_uploadsFolder))
        {
            Directory.CreateDirectory(_uploadsFolder);
        }
    }

    public async Task<Result<string>> SaveFileAsync(Stream fileStream, string fileName, string folder)
    {
        try
        {
            var folderPath = Path.Combine(_uploadsFolder, folder);
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            // Generate unique filename
            var fileExtension = Path.GetExtension(fileName);
            var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(folder, uniqueFileName);
            var fullPath = Path.Combine(_uploadsFolder, filePath);

            using (var fileStreamOutput = new FileStream(fullPath, FileMode.Create))
            {
                await fileStream.CopyToAsync(fileStreamOutput);
            }

            return Result<string>.Success(filePath, "File saved successfully");
        }
        catch (Exception ex)
        {
            return Result<string>.Failure($"Failed to save file: {ex.Message}");
        }
    }

    public async Task<Result<byte[]>> GetFileAsync(string filePath)
    {
        try
        {
            var fullPath = Path.Combine(_uploadsFolder, filePath);
            
            if (!File.Exists(fullPath))
            {
                return Result<byte[]>.Failure("File not found");
            }

            var bytes = await File.ReadAllBytesAsync(fullPath);
            return Result<byte[]>.Success(bytes);
        }
        catch (Exception ex)
        {
            return Result<byte[]>.Failure($"Failed to read file: {ex.Message}");
        }
    }

    public async Task<Result<bool>> DeleteFileAsync(string filePath)
    {
        try
        {
            var fullPath = Path.Combine(_uploadsFolder, filePath);
            
            if (File.Exists(fullPath))
            {
                await System.Threading.Tasks.Task.Run(() => File.Delete(fullPath));
            }

            return Result<bool>.Success(true, "File deleted successfully");
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure($"Failed to delete file: {ex.Message}");
        }
    }

    public string GetFileUrl(string filePath)
    {
        return $"/uploads/{filePath.Replace("\\", "/")}";
    }
}

