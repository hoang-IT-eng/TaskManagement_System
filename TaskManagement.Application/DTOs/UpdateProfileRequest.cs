namespace TaskManagement.Application.DTOs;

public class UpdateProfileRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Timezone { get; set; }
}