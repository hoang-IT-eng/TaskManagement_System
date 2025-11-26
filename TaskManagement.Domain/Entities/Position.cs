namespace TaskManagement.Domain.Entities;

public class Position
{
    public int PositionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string WorkflowGroup { get; set; } = string.Empty; // Implementer, Tester, Manager, Admin
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}




