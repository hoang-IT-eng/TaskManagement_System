namespace TaskManagement.Domain.Entities;

public class User
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? PhoneNumber { get; set; }
    public string Timezone { get; set; } = "UTC+7";
    public string Role { get; set; } = "Member";
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public int? PositionId { get; set; }
    public Position? Position { get; set; }
    public bool IsActive { get; set; } = true;
    public bool EmailConfirmed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
