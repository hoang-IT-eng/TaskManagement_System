khi nhấn đăng bình luận bị bay về trang index, khi nhấn sửa cũng vậy, nhấn xóa sau khi xác nhận xóa cũng bay về luôn. 
# 💬 HƯỚNG DẪN TÍNH NĂNG BÌNH LUẬN (COMMENTS)

## 📋 Tổng Quan

Tính năng Comments cho phép người dùng bình luận trên các task trong dự án. Mỗi comment hiển thị thông tin người comment (tên, avatar), nội dung và thời gian.

---

## 🔧 BƯỚC 1: TẠO MIGRATION VÀ CẬP NHẬT DATABASE

### Chạy Migration để tạo bảng TaskComments:

```powershell
cd TaskManagement.API
dotnet ef migrations add AddTaskComments --project ../TaskManagement.Infrastructure --startup-project .
dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .
```

**Kết quả mong đợi:**
- Bảng `TaskComments` được tạo trong database
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

Bạn sẽ thấy các endpoints mới trong **CommentController**:
- `POST /api/project/{projectId}/tasks/{taskId}/comments` - Thêm comment
- `GET /api/project/{projectId}/tasks/{taskId}/comments` - Lấy danh sách comments
- `PUT /api/project/{projectId}/tasks/{taskId}/comments/{commentId}` - Cập nhật comment
- `DELETE /api/project/{projectId}/tasks/{taskId}/comments/{commentId}` - Xóa comment

---

## 🎨 BƯỚC 3: KIỂM TRA FRONTEND

### 1. Khởi động Frontend:

```powershell
cd vanilla-frontend
python -m http.server 8000
```

### 2. Sử dụng tính năng Comments:

1. **Đăng nhập** vào hệ thống
2. Vào một **Project** bất kỳ
3. Click vào một **Task** để xem chi tiết
4. Click nút **"✏️ Edit"** để mở modal chỉnh sửa task
5. Cuộn xuống phần **"💬 Comments"**
6. **Xem comments cũ** (nếu có)
7. **Nhập comment mới** vào ô textarea
8. Click **"Post"** hoặc nhấn **Ctrl+Enter** để đăng comment

---

## 📝 CÁC TÍNH NĂNG

### ✅ Hiển thị Comments:
- Danh sách comments được sắp xếp theo thời gian (cũ nhất trước)
- Mỗi comment hiển thị:
  - **Avatar** của người comment (hoặc initials nếu không có avatar)
  - **Tên** người comment
  - **Nội dung** comment
  - **Thời gian** tạo comment

### ✅ Thêm Comment:
- Nhập nội dung vào textarea
- Click "Post" hoặc nhấn **Ctrl+Enter**
- Comment mới sẽ xuất hiện ngay lập tức

### ✅ Chỉnh sửa Comment:
- Chỉ **chủ sở hữu** comment mới thấy nút **✏️ Edit**
- Click để mở modal chỉnh sửa
- Cập nhật nội dung và lưu

### ✅ Xóa Comment:
- Chỉ **chủ sở hữu** comment mới thấy nút **🗑️ Delete**
- Click để xóa (có xác nhận)
- Comment sẽ bị xóa (soft delete)

---

## 🔐 BẢO MẬT

- ✅ Chỉ người dùng đã đăng nhập mới có thể comment
- ✅ Chỉ chủ sở hữu comment mới có thể chỉnh sửa/xóa
- ✅ Validate nội dung comment (không được rỗng, tối đa 5000 ký tự)
- ✅ Validate task tồn tại trước khi thêm comment

---

## 🌐 ĐA NGÔN NGỮ

Tính năng Comments hỗ trợ đầy đủ tiếng Anh và tiếng Việt:
- Tất cả labels, buttons, messages đều được dịch
- Tự động chuyển đổi theo ngôn ngữ đã chọn

---

## 🐛 TROUBLESHOOTING

### Lỗi: "TaskComments table does not exist"

**Giải pháp:**
```powershell
cd TaskManagement.API
dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .
```

### Lỗi: "CommentService not registered"

**Giải pháp:**
- Kiểm tra `Program.cs` đã có dòng:
  ```csharp
  builder.Services.AddScoped<ICommentService, CommentService>();
  ```
- Rebuild project:
  ```powershell
  dotnet build
  dotnet run
  ```

### Lỗi: Comments không hiển thị

**Giải pháp:**
1. Kiểm tra Console (F12) xem có lỗi JavaScript không
2. Kiểm tra Network tab xem API call có thành công không
3. Đảm bảo `projectId` và `taskId` đúng

---

## 📊 DATABASE SCHEMA

### TaskComments Table:

```sql
CREATE TABLE [TaskComments] (
    [CommentId] int IDENTITY(1,1) PRIMARY KEY,
    [TaskId] int NOT NULL,
    [UserId] int NOT NULL,
    [Content] nvarchar(5000) NOT NULL,
    [IsActive] bit NOT NULL DEFAULT 1,
    [CreatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] datetime2 NOT NULL DEFAULT GETDATE(),
    
    FOREIGN KEY ([TaskId]) REFERENCES [ProjectTasks]([TaskId]) ON DELETE CASCADE,
    FOREIGN KEY ([UserId]) REFERENCES [Users]([UserId]) ON DELETE RESTRICT
);
```

---

**Chúc bạn sử dụng tính năng Comments vui vẻ! 💬**






