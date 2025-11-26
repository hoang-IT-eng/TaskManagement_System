# 📜 HƯỚNG DẪN TÍNH NĂNG ACTIVITY LOGS

## 📋 Tổng Quan

Tính năng Activity Logs tự động ghi lại mọi thay đổi trên các Task (tạo, cập nhật, xóa). Mỗi log hiển thị thông tin người thực hiện, hành động, và chi tiết thay đổi.

---

## 🔧 BƯỚC 1: TẠO MIGRATION VÀ CẬP NHẬT DATABASE

### Chạy Migration để tạo bảng ActivityLogs:

```powershell
cd TaskManagement.API
dotnet ef migrations add AddActivityLogs --project ../TaskManagement.Infrastructure --startup-project .
dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .
```

**Kết quả mong đợi:**
- Bảng `ActivityLogs` được tạo trong database
- Các foreign keys được thiết lập đúng

---

## ✅ BƯỚC 2: KIỂM TRA BACKEND

### 1. Khởi động Backend:

```powershell
cd TaskManagement.API
dotnet run
```

### 2. Kiểm tra Swagger:

Mở browser: **http://localhost:5000**

Bạn sẽ thấy endpoint mới trong **ActivityLogController**:
- `GET /api/project/{projectId}/tasks/{taskId}/activities` - Lấy lịch sử hoạt động của task

### 3. Tự động ghi log:

Hệ thống tự động ghi log khi:
- ✅ **Tạo Task mới** (`CreateTaskAsync`)
- ✅ **Cập nhật Task** (`UpdateTaskAsync`) - ghi log các thay đổi:
  - Đổi Status (ví dụ: Todo → Done)
  - Đổi Priority
  - Đổi Title
  - Đổi Assignee
- ✅ **Xóa Task** (`DeleteTaskAsync`)

---

## 🎨 BƯỚC 3: KIỂM TRA FRONTEND

### 1. Khởi động Frontend:

```powershell
cd vanilla-frontend
python -m http.server 8000
```

### 2. Sử dụng tính năng Activity History:

1. **Đăng nhập** vào hệ thống
2. Vào một **Project** bất kỳ
3. Click vào một **Task** để xem chi tiết
4. Click nút **"✏️ Edit"** để mở modal chỉnh sửa task
5. Cuộn xuống phần **"📜 Activity History"** (bên dưới Comments)
6. **Xem lịch sử hoạt động** của task:
   - Ai đã tạo task
   - Ai đã cập nhật task và thay đổi gì
   - Ai đã xóa task (nếu có)

---

## 📝 CÁC TÍNH NĂNG

### ✅ Hiển thị Activity History:
- Danh sách activities được sắp xếp theo thời gian (mới nhất trước)
- Mỗi activity hiển thị:
  - **Avatar** của người thực hiện (hoặc initials)
  - **Tên** người thực hiện
  - **Mô tả** hành động (ví dụ: "đã đổi trạng thái từ Todo sang Done")
  - **Thời gian** thực hiện

### ✅ Tự động ghi log:
- Khi tạo task: Ghi log "Created task"
- Khi cập nhật task: Ghi log chi tiết các thay đổi:
  - "Updated task: changed status from Todo to Done"
  - "Updated task: changed priority from Medium to High"
  - "Updated task: changed title, changed assignee"
- Khi xóa task: Ghi log "Deleted task"

### ✅ Format thân thiện:
- Hiển thị mô tả dễ đọc thay vì JSON raw
- Tự động parse và format các thay đổi từ OldValue/NewValue
- Hỗ trợ đa ngôn ngữ (Tiếng Anh/Tiếng Việt)

---

## 🔐 BẢO MẬT

- ✅ Chỉ người dùng đã đăng nhập mới có thể xem activity logs
- ✅ Activity logs chỉ hiển thị cho các task mà user có quyền truy cập
- ✅ Tự động ghi lại userId của người thực hiện

---

## 🌐 ĐA NGÔN NGỮ

Tính năng Activity Logs hỗ trợ đầy đủ tiếng Anh và tiếng Việt:
- Tất cả labels, messages đều được dịch
- Tự động chuyển đổi theo ngôn ngữ đã chọn

**Ví dụ:**
- EN: "John Doe updated task: changed status from Todo to Done"
- VI: "Nguyễn Văn A đã cập nhật công việc: đã đổi trạng thái từ Todo sang Done"

---

## 🐛 TROUBLESHOOTING

### Lỗi: "ActivityLogs table does not exist"

**Giải pháp:**
```powershell
cd TaskManagement.API
dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .
```

### Lỗi: "ActivityLogService not registered"

**Giải pháp:**
- Kiểm tra `Program.cs` đã có dòng:
  ```csharp
  builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
  ```
- Rebuild project:
  ```powershell
  dotnet build
  dotnet run
  ```

### Lỗi: Activity History không hiển thị

**Giải pháp:**
1. Kiểm tra Console (F12) xem có lỗi JavaScript không
2. Kiểm tra Network tab xem API call có thành công không
3. Đảm bảo `projectId` và `taskId` đúng
4. Kiểm tra xem task đã có activity nào chưa (tạo hoặc cập nhật task để tạo log)

### Lỗi: Không tự động ghi log khi cập nhật task

**Giải pháp:**
- Kiểm tra `TaskService.cs` đã inject `IActivityLogService` chưa
- Kiểm tra xem có lỗi trong quá trình ghi log không (xem console/logs)
- Đảm bảo `ActivityLogService` đã được đăng ký trong `Program.cs`

---

## 📊 DATABASE SCHEMA

### ActivityLogs Table:

```sql
CREATE TABLE [ActivityLogs] (
    [ActivityLogId] int IDENTITY(1,1) PRIMARY KEY,
    [UserId] int NOT NULL,
    [Action] nvarchar(50) NOT NULL, -- Created, Updated, Deleted
    [EntityType] nvarchar(50) NOT NULL, -- Task, Project, etc.
    [EntityId] int NOT NULL,
    [OldValue] nvarchar(max) NULL, -- JSON string
    [NewValue] nvarchar(max) NULL, -- JSON string
    [Description] nvarchar(1000) NULL, -- Human-readable description
    [CreatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
    
    FOREIGN KEY ([UserId]) REFERENCES [Users]([UserId]) ON DELETE RESTRICT
);

CREATE INDEX [IX_ActivityLogs_EntityType] ON [ActivityLogs]([EntityType]);
CREATE INDEX [IX_ActivityLogs_EntityId] ON [ActivityLogs]([EntityId]);
CREATE INDEX [IX_ActivityLogs_UserId] ON [ActivityLogs]([UserId]);
CREATE INDEX [IX_ActivityLogs_CreatedAt] ON [ActivityLogs]([CreatedAt]);
```

---

## 💡 VÍ DỤ SỬ DỤNG

### Tạo Task mới:
1. Tạo task "Implement Login Feature"
2. Hệ thống tự động ghi log:
   - User: "John Doe"
   - Action: "Created"
   - Description: "Created task 'Implement Login Feature' with status Todo"

### Cập nhật Task:
1. Đổi Status từ "Todo" sang "Done"
2. Hệ thống tự động ghi log:
   - User: "John Doe"
   - Action: "Updated"
   - Description: "Updated task: changed status from Todo to Done"
   - OldValue: `{"Status": "Todo"}`
   - NewValue: `{"Status": "Done"}`

### Cập nhật nhiều trường:
1. Đổi Status từ "Todo" sang "In Progress" và Priority từ "Medium" sang "High"
2. Hệ thống tự động ghi log:
   - User: "John Doe"
   - Action: "Updated"
   - Description: "Updated task: changed status from Todo to In Progress, changed priority from Medium to High"

---

## 🔄 TÍCH HỢP VÀO CÁC SERVICE KHÁC

Nếu muốn tích hợp Activity Logs vào các service khác (ví dụ: ProjectService), làm tương tự:

```csharp
public class ProjectService : IProjectService
{
    private readonly ApplicationDbContext _context;
    private readonly IActivityLogService _activityLogService;

    public ProjectService(ApplicationDbContext context, IActivityLogService activityLogService)
    {
        _context = context;
        _activityLogService = activityLogService;
    }

    public async Task<Result<ProjectDto>> UpdateProjectAsync(...)
    {
        // ... update logic ...
        
        // Log activity
        await _activityLogService.LogActivityAsync(
            userId,
            "Updated",
            "Project",
            projectId,
            oldValueJson,
            newValueJson,
            "Updated project details"
        );
    }
}
```

---

**Chúc bạn sử dụng tính năng Activity Logs hiệu quả! 📜**






