namespace TaskManagement.Domain.Enums;

public enum ProjectRole
{
    Owner = 1,      // Chủ sở hữu dự án - có toàn quyền
    Admin = 2,      // Quản trị viên - có thể thêm/xóa thành viên, chỉnh sửa dự án
    Member = 3,     // Thành viên - có thể xem và chỉnh sửa nội dung
    Viewer = 4      // Người xem - chỉ có quyền xem
}

