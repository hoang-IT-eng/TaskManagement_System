# 🔐 HƯỚNG DẪN TẠO TÀI KHOẢN ADMIN

Có 2 cách để tạo tài khoản admin trong hệ thống SmartWork:

---

## 📋 CÁCH 1: Đăng ký rồi cập nhật role (Đơn giản nhất)

### Bước 1: Đăng ký tài khoản mới

1. Mở trình duyệt và truy cập: **http://localhost:8000**
2. Click nút **"Đăng ký"** hoặc **"Sign Up"**
3. Điền thông tin:
   - **Email**: `admin@smartwork.com`
   - **Password**: `Admin123!`
   - **Full Name**: `Admin User`
4. Click **"Đăng ký"** hoặc **"Sign Up"**

### Bước 2: Cập nhật role thành Admin trong database

1. Mở **SQL Server Management Studio** (SSMS) hoặc công cụ quản lý database
2. Kết nối đến database **TaskManagementDB**
3. Chạy lệnh SQL sau:

```sql
USE TaskManagementDB;
GO

UPDATE Users 
SET Role = 'Admin',
    IsActive = 1,
    EmailConfirmed = 1,
    UpdatedAt = GETDATE()
WHERE Email = 'admin@smartwork.com';
GO
```

### Bước 3: Đăng nhập lại

1. **Logout** khỏi tài khoản hiện tại
2. **Login** lại với:
   - Email: `admin@smartwork.com`
   - Password: `Admin123!`
3. Bạn sẽ thấy menu **"Admin"** xuất hiện trong navbar

---

## 📋 CÁCH 2: Tạo trực tiếp trong database (Nâng cao)

### Bước 1: Tạo BCrypt hash cho password

Bạn cần tạo BCrypt hash cho password `Admin123!` với cost factor 11.

**Cách 1: Sử dụng online tool**
- Truy cập: https://bcrypt-generator.com/
- Nhập password: `Admin123!`
- Rounds: `11`
- Copy hash được tạo

**Cách 2: Sử dụng .NET code**
```csharp
using BCrypt.Net;
string hash = BCrypt.Net.BCrypt.HashPassword("Admin123!", 11);
Console.WriteLine(hash);
```

### Bước 2: Chạy SQL script

1. Mở file `create-admin-user.sql`
2. Thay thế placeholder `@PasswordHash` bằng hash bạn vừa tạo
3. Chạy script trong SQL Server Management Studio

**Hoặc chạy trực tiếp:**

```sql
USE TaskManagementDB;
GO

-- Thay thế 'YOUR_BCRYPT_HASH_HERE' bằng hash thực tế
DECLARE @PasswordHash NVARCHAR(MAX) = 'YOUR_BCRYPT_HASH_HERE';

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@smartwork.com')
BEGIN
    INSERT INTO Users (
        Email,
        PasswordHash,
        FullName,
        Role,
        IsActive,
        EmailConfirmed,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        'admin@smartwork.com',
        @PasswordHash,
        'Admin User',
        'Admin',
        1,
        1,
        GETDATE(),
        GETDATE()
    );
    
    PRINT 'Admin user created successfully!';
END
ELSE
BEGIN
    UPDATE Users 
    SET Role = 'Admin',
        IsActive = 1,
        EmailConfirmed = 1,
        UpdatedAt = GETDATE()
    WHERE Email = 'admin@smartwork.com';
    
    PRINT 'User updated to Admin role!';
END
GO
```

---

## ✅ KIỂM TRA TÀI KHOẢN ADMIN

Sau khi tạo xong, kiểm tra:

1. **Đăng nhập** với:
   - Email: `admin@smartwork.com`
   - Password: `Admin123!`

2. **Kiểm tra menu Admin**:
   - Menu **"Admin"** sẽ xuất hiện trong navbar
   - Click vào để truy cập Admin Panel

3. **Kiểm tra trong database**:
```sql
SELECT UserId, Email, FullName, Role, IsActive 
FROM Users 
WHERE Email = 'admin@smartwork.com';
```

Kết quả mong đợi:
- `Role` = `'Admin'`
- `IsActive` = `1`

---

## 🔧 TROUBLESHOOTING

### Vấn đề: Không thấy menu Admin sau khi đăng nhập

**Giải pháp:**
1. Kiểm tra role trong database:
   ```sql
   SELECT Role FROM Users WHERE Email = 'admin@smartwork.com';
   ```
2. Đảm bảo `Role = 'Admin'` (chính xác, phân biệt hoa thường)
3. **Logout** và **Login lại**
4. Xóa cache trình duyệt (Ctrl+Shift+Delete)

### Vấn đề: Không thể đăng nhập

**Giải pháp:**
1. Kiểm tra password hash trong database
2. Nếu dùng Cách 2, đảm bảo BCrypt hash đúng
3. Thử reset password qua tính năng "Forgot Password"

### Vấn đề: Lỗi khi chạy SQL

**Giải pháp:**
1. Đảm bảo database `TaskManagementDB` đã được tạo
2. Đảm bảo table `Users` đã tồn tại (chạy migrations nếu chưa)
3. Kiểm tra quyền truy cập database

---

## 📝 THÔNG TIN TÀI KHOẢN MẶC ĐỊNH

- **Email**: `admin@smartwork.com`
- **Password**: `Admin123!`
- **Full Name**: `Admin User`
- **Role**: `Admin`

**⚠️ LƯU Ý BẢO MẬT:**
- Đổi password ngay sau lần đăng nhập đầu tiên
- Không chia sẻ thông tin đăng nhập
- Chỉ sử dụng tài khoản admin cho mục đích quản trị

---

**Chúc bạn thành công! 🚀**

