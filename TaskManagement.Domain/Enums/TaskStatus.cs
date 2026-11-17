namespace TaskManagement.Domain.Enums;

public enum ProjectTaskStatus
{
    Todo = 1,           // Cần làm
    InProgress = 2,     // Đang làm
    InReview = 3,       // Đang review
    Done = 4,           // Hoàn thành
    Cancelled = 5,      // Đã hủy
    Backlog = 6         // Product backlog
}

