# 👥 HƯỚNG DẪN NÂNG CẤP HỆ THỐNG QUẢN LÝ NHÂN SỰ

## 📋 Tổng Quan

Hệ thống đã được nâng cấp để quản lý nhân sự với các tính năng:
- **Department (Phòng ban)**: Quản lý các phòng ban trong công ty
- **Position (Chức vụ)**: Quản lý các chức vụ với WorkflowGroup
- **User**: Liên kết với Department và Position
- **ProjectMember**: Có thêm ProjectRole để phân quyền trong dự án

---

## 🔧 BƯỚC 1: TẠO MIGRATION VÀ CẬP NHẬT DATABASE

### Chạy Migration để tạo các bảng mới và cập nhật schema:

```powershell
cd TaskManagement.API
dotnet ef migrations add AddDepartmentAndPosition --project ../TaskManagement.Infrastructure --startup-project .
dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .
```

**Kết quả mong đợi:**
- Bảng `Departments` được tạo
- Bảng `Positions` được tạo
- Bảng `Users` được cập nhật với `DepartmentId` và `PositionId`
- Bảng `ProjectMembers` được cập nhật với `ProjectRole`
- Seed data được tạo tự động

---

## 📊 CẤU TRÚC DỮ LIỆU

### 1. Department (Phòng ban)

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| DepartmentId | int | ID (Primary Key) |
| Name | string(255) | Tên phòng ban |
| Code | string(50) | Mã phòng ban (Unique) |
| IsActive | bool | Trạng thái hoạt động |
| CreatedAt | DateTime | Ngày tạo |
| UpdatedAt | DateTime | Ngày cập nhật |

**Seed Data:**
- IT (Code: IT)
- Product (Code: PRODUCT)
- Quality Control (Code: QC)

### 2. Position (Chức vụ)

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| PositionId | int | ID (Primary Key) |
| Name | string(255) | Tên chức vụ |
| Code | string(50) | Mã chức vụ (Unique) |
| WorkflowGroup | string(50) | Nhóm workflow (Implementer, Tester, Manager, Admin) |
| IsActive | bool | Trạng thái hoạt động |
| CreatedAt | DateTime | Ngày tạo |
| UpdatedAt | DateTime | Ngày cập nhật |

**Seed Data:**
- Developer (Code: DEV, WorkflowGroup: Implementer)
- QA (Code: QA, WorkflowGroup: Tester)
- BA (Code: BA, WorkflowGroup: Admin)
- Tech Lead (Code: LEAD, WorkflowGroup: Manager)

### 3. User (Cập nhật)

**Các cột mới:**
- `DepartmentId` (int?, nullable) - Foreign Key đến Departments
- `PositionId` (int?, nullable) - Foreign Key đến Positions

**Navigation Properties:**
- `Department` - Thông tin phòng ban
- `Position` - Thông tin chức vụ

### 4. ProjectMember (Cập nhật)

**Cột mới:**
- `ProjectRoleCode` (string(50), nullable) - Phân quyền trong dự án

**Lưu ý:**
- Mặc định `ProjectRoleCode` sẽ được lấy từ `Position.Code` khi thêm member vào project
- Có thể chỉnh sửa `ProjectRoleCode` sau khi thêm member
- `ProjectRoleCode` khác với `Role` (enum ProjectRole) - `Role` là quyền quản lý project, `ProjectRoleCode` là vai trò trong dự án

---

## 🔄 CẬP NHẬT DTOs

### UserDto

**Các trường mới:**
```csharp
public int? DepartmentId { get; set; }
public string? DepartmentName { get; set; }
public int? PositionId { get; set; }
public string? PositionName { get; set; }
```

### ProjectMemberDto

**Trường mới:**
```csharp
public string? ProjectRoleCode { get; set; }
```

---

## 🎯 LOGIC NGHIỆP VỤ

### 1. Thêm Member vào Project

Khi thêm member vào project:
1. Hệ thống tự động lấy `Position.Code` của user
2. Set `ProjectRoleCode` = `Position.Code` (mặc định)
3. Có thể chỉnh sửa `ProjectRoleCode` sau đó

**Ví dụ:**
- User có Position = "Developer" (Code: DEV)
- Khi thêm vào project, `ProjectRoleCode` = "DEV"
- Admin có thể đổi `ProjectRoleCode` thành "LEAD" nếu cần

### 2. Hiển thị thông tin User

Tất cả API trả về UserDto sẽ bao gồm:
- `DepartmentName`: Tên phòng ban
- `PositionName`: Tên chức vụ

---

## ✅ KIỂM TRA

### 1. Kiểm tra Database

```sql
-- Kiểm tra Departments
SELECT * FROM Departments;

-- Kiểm tra Positions
SELECT * FROM Positions;

-- Kiểm tra Users có Department và Position
SELECT 
    u.UserId,
    u.FullName,
    d.Name AS DepartmentName,
    p.Name AS PositionName
FROM Users u
LEFT JOIN Departments d ON u.DepartmentId = d.DepartmentId
LEFT JOIN Positions p ON u.PositionId = p.PositionId;

-- Kiểm tra ProjectMembers có ProjectRoleCode
SELECT 
    pm.ProjectMemberId,
    u.FullName,
    pm.ProjectRoleCode,
    p.Code AS PositionCode
FROM ProjectMembers pm
INNER JOIN Users u ON pm.UserId = u.UserId
LEFT JOIN Positions p ON u.PositionId = p.PositionId;
```

### 2. Kiểm tra API

**Get User Profile:**
```http
GET /api/users/profile
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "departmentId": 1,
    "departmentName": "IT",
    "positionId": 1,
    "positionName": "Developer",
    ...
  }
}
```

**Get Project Members:**
```http
GET /api/project/{projectId}/members
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "projectMemberId": 1,
      "userId": 1,
      "user": {
        "userId": 1,
        "fullName": "John Doe",
        "departmentName": "IT",
        "positionName": "Developer",
        ...
      },
      "role": "Member",
      "projectRoleCode": "DEV",
      ...
    }
  ]
}
```

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Departments table does not exist"

**Giải pháp:**
```powershell
cd TaskManagement.API
dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .
```

### Lỗi: "Foreign key constraint fails"

**Giải pháp:**
- Kiểm tra xem DepartmentId và PositionId có tồn tại trong database không
- Đảm bảo seed data đã được tạo

### Lỗi: ProjectRoleCode không được set tự động

**Giải pháp:**
- Kiểm tra xem User có PositionId không
- Kiểm tra Position có Code không
- Xem log để kiểm tra logic trong `AddMemberAsync`

---

## 📝 VÍ DỤ SỬ DỤNG

### 1. Gán Department và Position cho User

```csharp
// Trong AdminController hoặc UserController
var user = await _context.Users.FindAsync(userId);
user.DepartmentId = 1; // IT
user.PositionId = 1; // Developer
await _context.SaveChangesAsync();
```

### 2. Cập nhật ProjectRoleCode cho Member

```csharp
// Trong ProjectMemberService
var member = await _context.ProjectMembers.FindAsync(memberId);
member.ProjectRoleCode = "LEAD"; // Thay đổi từ DEV sang LEAD
await _context.SaveChangesAsync();
```

---

## 🔐 LƯU Ý

1. **DepartmentId và PositionId là nullable**: User có thể không có phòng ban hoặc chức vụ
2. **ProjectRoleCode có thể khác Position.Code**: Cho phép linh hoạt phân quyền trong từng project
3. **WorkflowGroup**: Dùng để phân loại Position theo nhóm workflow (Implementer, Tester, Manager, Admin)

---

**Chúc bạn sử dụng tính năng quản lý nhân sự hiệu quả! 👥**

