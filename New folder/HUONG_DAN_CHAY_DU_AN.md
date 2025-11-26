# 🚀 HƯỚNG DẪN CHẠY DỰ ÁN TASK MANAGEMENT

## 📋 Tổng Quan

Dự án gồm 2 phần:
1. **Backend**: ASP.NET Core Web API (chạy trên port 5000)
2. **Frontend**: Vanilla HTML/CSS/JavaScript (chạy trên port 8000)

---

## ⚙️ Yêu Cầu Hệ Thống

### Backend:
- ✅ **.NET SDK 10.0** hoặc mới hơn
- ✅ **SQL Server** hoặc **SQL Server LocalDB**
- ✅ **Visual Studio 2022** hoặc **VS Code** (tùy chọn)

### Frontend:
- ✅ **Web Browser** hiện đại (Chrome, Firefox, Edge, Safari)
- ✅ **Python 3** (để chạy HTTP server) hoặc **Live Server** extension

---

## 🔧 BƯỚC 1: CÀI ĐẶT DATABASE

### Kiểm tra SQL Server:

```powershell
# Kiểm tra SQL Server có đang chạy không
Get-Service -Name "MSSQLSERVER" | Select-Object Status, Name
```

### Tạo Database (nếu chưa có):

Database sẽ được tạo tự động khi chạy migrations.

---

## 🎯 BƯỚC 2: CHẠY BACKEND (ASP.NET Core API)

### Cách 1: Sử dụng Terminal/PowerShell

```powershell
# 1. Di chuyển vào thư mục API
cd TaskManagement.API

# 2. Restore packages (nếu cần)
dotnet restore

# 3. Kiểm tra database connection
# Mở file appsettings.json và kiểm tra connection string:
# "Server=localhost;Database=TaskManagementDB;Trusted_Connection=True;TrustServerCertificate=True;"

# 4. Chạy migrations (nếu chưa có database)
dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .

# 5. Chạy ứng dụng
dotnet run
```

**Kết quả mong đợi:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[14]
      Application started. Press Ctrl+C to shut down.
```

### Cách 2: Sử dụng Visual Studio

1. Mở file `TaskManagement.sln` trong Visual Studio
2. Set `TaskManagement.API` làm Startup Project
3. Nhấn **F5** hoặc click **Run**

### Kiểm tra Backend đã chạy:

Mở browser và truy cập:
- **Swagger UI**: http://localhost:5000
- **API Health**: http://localhost:5000/api/auth/test (nếu có)

---

## 🌐 BƯỚC 3: CHẠY FRONTEND (Vanilla JS)

### Cách 1: Sử dụng Python HTTP Server (Khuyên dùng)

```powershell
# 1. Di chuyển vào thư mục frontend
cd vanilla-frontend

# 2. Chạy HTTP server
# Python 3:
python -m http.server 8000

# Hoặc Python 2:
python -m SimpleHTTPServer 8000
```

**Kết quả mong đợi:**
```
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

### Cách 2: Sử dụng Live Server (VS Code)

1. Cài đặt extension **Live Server** trong VS Code
2. Mở file `vanilla-frontend/index.html`
3. Right-click → **Open with Live Server**
4. Browser sẽ tự động mở tại `http://127.0.0.1:5500` (hoặc port khác)

### Cách 3: Sử dụng Node.js http-server

```powershell
# 1. Cài đặt http-server (nếu chưa có)
npm install -g http-server

# 2. Di chuyển vào thư mục frontend
cd vanilla-frontend

# 3. Chạy server
http-server -p 8000
```

### Kiểm tra Frontend đã chạy:

Mở browser và truy cập:
- **Login Page**: http://localhost:8000/index.html
- Hoặc: http://localhost:8000

---

## ✅ BƯỚC 4: KIỂM TRA KẾT NỐI

### 1. Kiểm tra Backend:

```powershell
# Test API endpoint
Invoke-WebRequest -Uri "http://localhost:5000/swagger" -Method GET
```

### 2. Kiểm tra Frontend:

1. Mở browser: http://localhost:8000
2. Mở **Developer Tools** (F12)
3. Vào tab **Console** - không nên có lỗi
4. Vào tab **Network** - kiểm tra requests đến `localhost:5000`

### 3. Test đăng nhập:

1. Nếu chưa có tài khoản, click **Register** để tạo mới
2. Đăng nhập với email và password
3. Nếu thành công, sẽ chuyển đến Dashboard

---

## 🔄 CHẠY CẢ HAI CÙNG LÚC

### Sử dụng 2 Terminal Windows:

**Terminal 1 - Backend:**
```powershell
cd TaskManagement.API
dotnet run
```

**Terminal 2 - Frontend:**
```powershell
cd vanilla-frontend
python -m http.server 8000
```

### Hoặc sử dụng PowerShell Script:

Tạo file `start-all.ps1`:

```powershell
# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd TaskManagement.API; dotnet run"

# Wait 3 seconds
Start-Sleep -Seconds 3

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd vanilla-frontend; python -m http.server 8000"

Write-Host "Backend: http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:8000" -ForegroundColor Green
```

Chạy script:
```powershell
.\start-all.ps1
```

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi 1: Port đã được sử dụng

**Lỗi:**
```
Failed to bind to address http://localhost:5000: address already in use
```

**Giải pháp:**
```powershell
# Tìm process đang dùng port 5000
netstat -ano | findstr :5000

# Kill process (thay PID bằng số thực tế)
taskkill /PID <PID> /F
```

### Lỗi 2: Database connection failed

**Lỗi:**
```
Cannot open database "TaskManagementDB" requested by the login
```

**Giải pháp:**
1. Kiểm tra SQL Server đang chạy:
   ```powershell
   Get-Service -Name "MSSQLSERVER"
   ```

2. Kiểm tra connection string trong `appsettings.json`

3. Tạo database thủ công:
   ```sql
   CREATE DATABASE TaskManagementDB;
   ```

4. Chạy migrations:
   ```powershell
   cd TaskManagement.API
   dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .
   ```

### Lỗi 3: CORS Error

**Lỗi:**
```
Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:8000' has been blocked by CORS policy
```

**Giải pháp:**
- Backend đã được cấu hình CORS trong `Program.cs`
- Đảm bảo backend đang chạy
- Kiểm tra `API_BASE_URL` trong `vanilla-frontend/js/api.js` là `http://localhost:5000/api`

### Lỗi 4: 401 Unauthorized

**Lỗi:**
```
401 Unauthorized
```

**Giải pháp:**
1. Đăng nhập lại
2. Kiểm tra token trong localStorage:
   ```javascript
   // Mở Console (F12) và chạy:
   localStorage.getItem('token')
   ```
3. Nếu token null, đăng nhập lại

### Lỗi 5: Frontend không load được

**Lỗi:**
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

**Giải pháp:**
1. Kiểm tra backend đang chạy: http://localhost:5000/swagger
2. Kiểm tra `API_BASE_URL` trong `vanilla-frontend/js/api.js`
3. Kiểm tra CORS settings trong backend

---

## 📝 QUY TRÌNH PHÁT TRIỂN

### 1. Khởi động dự án mỗi ngày:

```powershell
# Terminal 1: Backend
cd TaskManagement.API
dotnet run

# Terminal 2: Frontend
cd vanilla-frontend
python -m http.server 8000
```

### 2. Sau khi thay đổi code Backend:

```powershell
# Stop backend (Ctrl+C)
# Rebuild và chạy lại
cd TaskManagement.API
dotnet build
dotnet run
```

### 3. Sau khi thay đổi code Frontend:

- **Không cần restart** - chỉ cần refresh browser (F5)
- Nếu có vấn đề, hard refresh: **Ctrl+Shift+R**

### 4. Sau khi thay đổi Database Schema:

```powershell
# Tạo migration mới
cd TaskManagement.API
dotnet ef migrations add <MigrationName> --project ../TaskManagement.Infrastructure --startup-project .

# Apply migration
dotnet ef database update --project ../TaskManagement.Infrastructure --startup-project .

# Restart backend
dotnet run
```

---

## 🎯 TÀI KHOẢN MẶC ĐỊNH

Sau khi chạy migrations, bạn cần tạo tài khoản đầu tiên:

1. Mở frontend: http://localhost:8000
2. Click **Register**
3. Điền thông tin:
   - Email: `admin@example.com`
   - Password: `Admin123!`
   - Full Name: `Admin User`
   - Role: `Admin` (nếu có option)
4. Click **Register**
5. Đăng nhập với tài khoản vừa tạo

---

## 📊 CẤU HÌNH PORTS

| Service | Port | URL |
|---------|------|-----|
| Backend API | 5000 | http://localhost:5000 |
| Frontend | 8000 | http://localhost:8000 |
| Swagger UI | 5000 | http://localhost:5000 |

**Lưu ý:** Nếu muốn đổi port, cần cập nhật:
- Backend: `Properties/launchSettings.json`
- Frontend: `js/api.js` (API_BASE_URL)

---

## 🔍 KIỂM TRA NHANH

### Checklist trước khi bắt đầu:

- [ ] SQL Server đang chạy
- [ ] Database đã được tạo
- [ ] Migrations đã được apply
- [ ] Backend đang chạy trên port 5000
- [ ] Frontend đang chạy trên port 8000
- [ ] Browser console không có lỗi
- [ ] Có thể truy cập Swagger UI

### Test nhanh:

```powershell
# Test Backend
curl http://localhost:5000/swagger

# Test Frontend
curl http://localhost:8000
```

---

## 📚 TÀI LIỆU THAM KHẢO

- **API Documentation**: Xem `API_DOCUMENTATION.md`
- **Frontend Guide**: Xem `vanilla-frontend/README.md`
- **Testing Guide**: Xem `TESTING_GUIDE.md`

---

## 🆘 HỖ TRỢ

Nếu gặp vấn đề:

1. Kiểm tra **Browser Console** (F12)
2. Kiểm tra **Backend Logs** (terminal output)
3. Kiểm tra **Network Tab** (F12 → Network)
4. Xem các file documentation trong project

---

**Chúc bạn code vui vẻ! 🚀**

