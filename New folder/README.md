# 🚀 Task Management API - User Management System

ASP.NET Core Web API với JWT Authentication cho quản lý người dùng.

## ✨ Tính năng

- ✅ **Đăng ký tài khoản** - Register với email, password, fullname
- ✅ **Đăng nhập** - Login với JWT token (24h expiration)
- ✅ **Lấy thông tin Profile** - Get user profile
- ✅ **Cập nhật Profile** - Update fullname, bio, phone, timezone
- ✅ **Đổi mật khẩu** - Change password với verification
- ✅ **Upload Avatar** - Support JPG, PNG, GIF, WEBP
- ✅ **Forgot/Reset Password** - Reset password flow
- ✅ **JWT Authentication** - Secure với HMAC-SHA256
- ✅ **FluentValidation** - Input validation
- ✅ **Swagger UI** - Interactive API documentation
- ✅ **CORS** - Cross-Origin Resource Sharing

## 🏗️ Architecture

```
TaskManagement/
├── TaskManagement.API/          # Web API Layer (Controllers, Program.cs)
├── TaskManagement.Application/  # Application Layer (DTOs, Interfaces, Validators)
├── TaskManagement.Domain/       # Domain Layer (Entities, Common)
└── TaskManagement.Infrastructure/ # Infrastructure Layer (Services, Data)
```

**Pattern**: Clean Architecture + Repository Pattern

## 🛠️ Tech Stack

- **Framework**: .NET 10.0 (Preview)
- **Database**: SQL Server 2022
- **ORM**: Entity Framework Core 10.0
- **Authentication**: JWT Bearer
- **Validation**: FluentValidation
- **Password Hashing**: BCrypt
- **API Documentation**: Swagger/OpenAPI

## 📋 Requirements

- .NET 10.0 SDK
- SQL Server 2022 (hoặc LocalDB)
- Visual Studio 2022 / Rider / VS Code

## 🚀 Quick Start

### 1. Clone và Setup

```bash
cd TaskManagement
```

### 2. Cấu hình Database

Sửa connection string trong `TaskManagement.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=TaskManagementDB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

### 3. Tạo Database

Database và bảng đã được tạo tự động. Nếu chưa có:

```powershell
# Tạo database
sqlcmd -S localhost -E -Q "CREATE DATABASE TaskManagementDB"

# Chạy migrations (nếu cần)
dotnet ef migrations add InitialCreate --project TaskManagement.Infrastructure --startup-project TaskManagement.API
dotnet ef database update --project TaskManagement.Infrastructure --startup-project TaskManagement.API
```

### 4. Chạy ứng dụng

```bash
cd TaskManagement.API
dotnet run
```

Ứng dụng sẽ chạy tại:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger: `http://localhost:5000` (root)

## 📚 Documentation

- **[API Documentation](API_DOCUMENTATION.md)** - Chi tiết tất cả endpoints
- **[Testing Guide](TESTING_GUIDE.md)** - Hướng dẫn test API
- **[Restart & Troubleshooting](HUONG_DAN_RESTART_VA_KIEM_TRA.md)** - Xử lý lỗi

## 🧪 Testing

### Test bằng Swagger UI (Dễ nhất)

1. Chạy app: `dotnet run`
2. Mở: `http://localhost:5000`
3. Click "Try it out" trên các endpoints
4. Với endpoints cần auth: Click "Authorize", nhập `Bearer {token}`

### Test bằng Postman

1. Import `POSTMAN_COLLECTION.json`
2. Chạy requests theo thứ tự: Register → Login → Get Profile → Update Profile
3. Token tự động lưu vào biến `{{token}}`

### Test bằng PowerShell Script

```powershell
.\test_api.ps1
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE [Users] (
    [UserId] int IDENTITY(1,1) PRIMARY KEY,
    [Email] nvarchar(255) NOT NULL UNIQUE,
    [PasswordHash] nvarchar(max) NOT NULL,
    [FullName] nvarchar(255) NOT NULL,
    [AvatarUrl] nvarchar(500) NULL,
    [Bio] nvarchar(1000) NULL,
    [PhoneNumber] nvarchar(20) NULL,
    [Timezone] nvarchar(50) DEFAULT 'UTC+7',
    [Role] nvarchar(50) DEFAULT 'Member',
    [IsActive] bit NOT NULL,
    [EmailConfirmed] bit NOT NULL,
    [CreatedAt] datetime2 DEFAULT GETDATE(),
    [UpdatedAt] datetime2 DEFAULT GETDATE(),
    [LastLoginAt] datetime2 NULL
);
```

## 🔐 Security

- ✅ Passwords hashed với BCrypt (cost factor 11)
- ✅ JWT với HMAC-SHA256
- ✅ Token expiration: 24 hours
- ✅ HTTPS support
- ✅ Input validation với FluentValidation
- ✅ SQL injection prevention với EF Core

## 📁 Project Structure

```
TaskManagement.API/
├── Controllers/
│   ├── AuthController.cs      # Register, Login, Forgot/Reset Password
│   └── UserController.cs       # Profile, Update, Change Password, Upload Avatar
├── Program.cs                  # Configuration, DI, Middleware
├── appsettings.json           # Configuration
└── Properties/
    └── launchSettings.json    # Launch profiles

TaskManagement.Application/
├── DTOs/                      # Data Transfer Objects
│   ├── Auth/
│   │   ├── RegisterRequest.cs
│   │   ├── LoginRequest.cs
│   │   └── AuthResponse.cs
│   ├── UserDto.cs
│   └── UpdateProfileRequest.cs
├── Interfaces/                # Service interfaces
│   ├── IAuthService.cs
│   ├── IUserService.cs
│   └── IJwtTokenService.cs
└── Validators/                # FluentValidation rules
    ├── RegisterRequestValidator.cs
    ├── LoginRequestValidator.cs
    └── UpdateProfileRequestValidator.cs

TaskManagement.Domain/
├── Entities/
│   └── User.cs               # User entity
└── Common/
    └── Result.cs             # Result pattern for error handling

TaskManagement.Infrastructure/
├── Data/
│   └── ApplicationDbContext.cs  # EF Core DbContext
├── Services/
│   ├── AuthService.cs        # Authentication logic
│   ├── UserService.cs        # User management logic
│   └── JwtTokenService.cs    # JWT generation/validation
└── Migrations/               # EF Core migrations
```

## 🔧 Configuration

### JWT Settings (appsettings.json)
```json
{
  "JwtSettings": {
    "SecretKey": "Your-Super-Secret-Key-32-Characters-Long",
    "Issuer": "TaskManagementAPI",
    "Audience": "TaskManagementClient",
    "ExpirationHours": 24
  }
}
```

### CORS Policy
```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

## 📖 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Đăng ký tài khoản | ❌ |
| POST | `/api/auth/login` | Đăng nhập | ❌ |
| POST | `/api/auth/forgot-password` | Quên mật khẩu | ❌ |
| POST | `/api/auth/reset-password` | Reset mật khẩu | ❌ |
| GET | `/api/user/profile` | Lấy thông tin profile | ✅ |
| PUT | `/api/user/profile` | Cập nhật profile | ✅ |
| POST | `/api/user/change-password` | Đổi mật khẩu | ✅ |
| POST | `/api/user/upload-avatar` | Upload avatar | ✅ |

## 🧪 Example Requests

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "fullName": "Nguyen Van A",
    "phoneNumber": "+84901234567"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get Profile (với token)
```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🐛 Troubleshooting

### Lỗi kết nối database
```bash
# Kiểm tra SQL Server đang chạy
Get-Service -Name "*SQL*"

# Kiểm tra connection string
sqlcmd -S localhost -E -Q "SELECT @@SERVERNAME"
```

### Lỗi port đã được sử dụng
```bash
# Tìm process đang dùng port
netstat -ano | findstr :5000

# Dừng process
Stop-Process -Id <PID> -Force
```

### Lỗi migration
```bash
# Xóa migrations cũ
rm -r TaskManagement.Infrastructure/Migrations

# Tạo lại
dotnet ef migrations add InitialCreate --project TaskManagement.Infrastructure --startup-project TaskManagement.API
```

## 📦 NuGet Packages

### API Project
- Microsoft.AspNetCore.Authentication.JwtBearer (10.0.0)
- Microsoft.AspNetCore.OpenApi (10.0.0-rc.2)
- Microsoft.EntityFrameworkCore.Design (10.0.0)
- Swashbuckle.AspNetCore (10.0.1)

### Application Project
- FluentValidation (12.1.0)
- FluentValidation.AspNetCore (11.3.1)
- AutoMapper (15.1.0)
- MediatR (13.1.0)

### Infrastructure Project
- Microsoft.EntityFrameworkCore.SqlServer (10.0.0)
- BCrypt.Net-Next (4.0.3)
- System.IdentityModel.Tokens.Jwt (8.14.0)
- Microsoft.AspNetCore.Identity.EntityFrameworkCore (10.0.0)

## 🚀 Deployment

### Production Checklist
- [ ] Đổi JWT SecretKey
- [ ] Cấu hình CORS cho specific origins
- [ ] Enable HTTPS only
- [ ] Add rate limiting
- [ ] Setup logging (Serilog/NLog)
- [ ] Configure connection pooling
- [ ] Add health check endpoints
- [ ] Setup CI/CD pipeline
- [ ] Configure backup strategy
- [ ] Add monitoring (Application Insights)

## 📝 License

MIT License

## 👥 Contributors

- Your Name

## 📞 Support

Nếu gặp vấn đề:
1. Xem [API Documentation](API_DOCUMENTATION.md)
2. Xem [Testing Guide](TESTING_GUIDE.md)
3. Xem [Troubleshooting](HUONG_DAN_RESTART_VA_KIEM_TRA.md)

---

**Happy Coding! 🎉**



