# Hướng dẫn Restart Ứng dụng và Kiểm tra Database

## 🔄 CÁCH RESTART ỨNG DỤNG

### Cách 1: Dừng và chạy lại thủ công

1. **Dừng ứng dụng đang chạy:**
   ```powershell
   # Tìm process ID
   Get-Process | Where-Object {$_.ProcessName -eq "TaskManagement.API"}
   
   # Dừng process (thay 20344 bằng PID thực tế)
   Stop-Process -Id 20344 -Force
   ```

2. **Hoặc nhấn Ctrl+C** trong terminal/console đang chạy ứng dụng

3. **Chạy lại ứng dụng:**
   ```powershell
   cd TaskManagement.API
   dotnet run
   ```

### Cách 2: Sử dụng script tự động

```powershell
.\restart_app.ps1
```

### Cách 3: Sử dụng Visual Studio / Rider

- **Visual Studio**: Nhấn `Shift + F5` để stop, sau đó `F5` để chạy lại
- **Rider**: Nhấn `Shift + F10` để stop, sau đó `Shift + F9` để chạy lại

---

## 🔍 KIỂM TRA QUYỀN TRUY CẬP DATABASE

### 1. Kiểm tra kết nối database

```powershell
sqlcmd -S localhost -E -Q "SELECT @@SERVERNAME AS ServerName, DB_NAME() AS CurrentDatabase"
```

### 2. Kiểm tra quyền hiện tại

```powershell
sqlcmd -S localhost -E -d TaskManagementDB -Q "SELECT 
    SYSTEM_USER AS CurrentUser,
    USER_NAME() AS DatabaseUser,
    IS_SRVROLEMEMBER('sysadmin') AS IsSysAdmin,
    HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'SELECT') AS CanSelect,
    HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT') AS CanInsert,
    HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE') AS CanUpdate,
    HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE') AS CanDelete"
```

### 3. Kiểm tra database có tồn tại không

```powershell
sqlcmd -S localhost -E -Q "SELECT name FROM sys.databases WHERE name = 'TaskManagementDB'"
```

### 4. Kiểm tra bảng Users có tồn tại không

```powershell
sqlcmd -S localhost -E -d TaskManagementDB -Q "SELECT name FROM sys.tables WHERE name = 'Users'"
```

### 5. Kiểm tra connection string

Kiểm tra file `TaskManagement.API/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=TaskManagementDB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

**Giải thích:**
- `Server=localhost` - Kết nối đến SQL Server trên localhost (default instance)
- `Database=TaskManagementDB` - Tên database
- `Trusted_Connection=True` - Sử dụng Windows Authentication
- `TrustServerCertificate=True` - Bỏ qua kiểm tra SSL certificate

---

## ✅ KẾT QUẢ KIỂM TRA HIỆN TẠI

- ✅ **Database**: TaskManagementDB đã được tạo
- ✅ **Bảng Users**: Đã tồn tại với đầy đủ cột và indexes
- ✅ **Quyền truy cập**: 
  - IsSysAdmin: 1 (Có quyền admin)
  - CanSelect: 1 (Có quyền đọc)
  - CanInsert: 1 (Có quyền thêm)
  - CanUpdate: 1 (Có quyền sửa)
  - CanDelete: 1 (Có quyền xóa)

---

## 🛠️ XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: "Cannot open database"

**Nguyên nhân**: Database chưa được tạo hoặc connection string sai

**Giải pháp**:
```powershell
# Tạo database
sqlcmd -S localhost -E -Q "CREATE DATABASE TaskManagementDB"
```

### Lỗi: "Login failed"

**Nguyên nhân**: Không có quyền truy cập

**Giải pháp**: Đảm bảo đang sử dụng Windows Authentication và user có quyền truy cập SQL Server

### Lỗi: "Table already exists"

**Nguyên nhân**: Bảng đã được tạo trước đó

**Giải pháp**: Bỏ qua hoặc xóa bảng cũ:
```powershell
sqlcmd -S localhost -E -d TaskManagementDB -Q "DROP TABLE IF EXISTS Users"
```

---

## 📝 LỆNH NHANH

### Restart ứng dụng
```powershell
Stop-Process -Name "TaskManagement.API" -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; cd TaskManagement.API; dotnet run
```

### Kiểm tra ứng dụng có đang chạy không
```powershell
Get-Process | Where-Object {$_.ProcessName -eq "TaskManagement.API"}
```

### Kiểm tra port có đang được sử dụng không
```powershell
netstat -ano | findstr :5000
```




