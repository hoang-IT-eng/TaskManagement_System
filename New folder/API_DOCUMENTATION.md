# 📚 Task Management API - Documentation

API RESTful cho quản lý người dùng với JWT Authentication

**Base URL**: `http://localhost:5000` hoặc `https://localhost:5001`

**Swagger UI**: `http://localhost:5000` (khi chạy Development mode)

---

## 🔐 Authentication

API sử dụng JWT (JSON Web Token) để xác thực. Token có hiệu lực 24 giờ.

### Cách sử dụng token:

Thêm token vào header của request:
```
Authorization: Bearer {your_token_here}
```

---

## 📋 API Endpoints

### 1. Đăng ký (Register)

**Endpoint**: `POST /api/auth/register`

**Mô tả**: Đăng ký tài khoản người dùng mới

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "phoneNumber": "+84901234567"
}
```

**Response Success (200)**:
```json
{
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiration": "2024-11-20T10:30:00Z",
    "user": {
      "userId": 1,
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A",
      "avatarUrl": null,
      "bio": null,
      "phoneNumber": "+84901234567",
      "role": "Member",
      "createdAt": "2024-11-19T10:30:00Z"
    }
  }
}
```

**Response Error (400)**:
```json
{
  "message": "Email already exists",
  "errors": ["Email already exists"]
}
```

**Validation Rules**:
- Email: Required, valid email format, max 255 characters
- Password: Required, min 6 characters, max 100 characters
- FullName: Required, max 255 characters
- PhoneNumber: Optional, max 20 characters, only numbers and +()-

---

### 2. Đăng nhập (Login)

**Endpoint**: `POST /api/auth/login`

**Mô tả**: Đăng nhập vào hệ thống

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response Success (200)**:
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiration": "2024-11-20T10:30:00Z",
    "user": {
      "userId": 1,
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A",
      "avatarUrl": null,
      "bio": null,
      "phoneNumber": "+84901234567",
      "role": "Member",
      "createdAt": "2024-11-19T10:30:00Z"
    }
  }
}
```

**Response Error (400)**:
```json
{
  "message": "Invalid email or password",
  "errors": ["Invalid email or password"]
}
```

**Response Error - Account Deactivated (400)**:
```json
{
  "message": "Account is deactivated",
  "errors": ["Account is deactivated"]
}
```

---

### 3. Lấy thông tin Profile

**Endpoint**: `GET /api/user/profile`

**Mô tả**: Lấy thông tin profile của người dùng đang đăng nhập

**Headers**:
```
Authorization: Bearer {token}
```

**Response Success (200)**:
```json
{
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "avatarUrl": "/uploads/avatars/1_abc123.jpg",
    "bio": "Software Developer",
    "phoneNumber": "+84901234567",
    "role": "Member",
    "createdAt": "2024-11-19T10:30:00Z"
  }
}
```

**Response Error (404)**:
```json
{
  "message": "User not found"
}
```

**Response Error (401)** - Unauthorized:
```json
{
  "message": "Unauthorized"
}
```

---

### 4. Cập nhật Profile

**Endpoint**: `PUT /api/user/profile`

**Mô tả**: Cập nhật thông tin profile của người dùng

**Headers**:
```
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "fullName": "Nguyễn Văn A Updated",
  "bio": "Senior Software Developer | Full Stack",
  "phoneNumber": "+84901234567",
  "avatarUrl": "/uploads/avatars/1_abc123.jpg",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

**Response Success (200)**:
```json
{
  "message": "Profile updated successfully",
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A Updated",
    "avatarUrl": "/uploads/avatars/1_abc123.jpg",
    "bio": "Senior Software Developer | Full Stack",
    "phoneNumber": "+84901234567",
    "role": "Member",
    "createdAt": "2024-11-19T10:30:00Z"
  }
}
```

**Response Error (400)**:
```json
{
  "message": "Validation error",
  "errors": ["Full name is required"]
}
```

**Validation Rules**:
- FullName: Required, max 255 characters
- Bio: Optional, max 1000 characters
- PhoneNumber: Optional, max 20 characters, only numbers and +()-
- Timezone: Optional, max 50 characters

---

### 5. Đổi mật khẩu

**Endpoint**: `POST /api/user/change-password`

**Mô tả**: Đổi mật khẩu của người dùng

**Headers**:
```
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response Success (200)**:
```json
{
  "message": "Password changed successfully"
}
```

**Response Error (400)**:
```json
{
  "message": "Current password is incorrect"
}
```

---

### 6. Upload Avatar

**Endpoint**: `POST /api/user/upload-avatar`

**Mô tả**: Upload ảnh đại diện

**Headers**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body** (Form Data):
```
file: [image file]
```

**Supported formats**: JPG, JPEG, PNG, GIF, WEBP

**Response Success (200)**:
```json
{
  "message": "Avatar uploaded successfully",
  "avatarUrl": "/uploads/avatars/1_abc123def456.jpg"
}
```

**Response Error (400)**:
```json
{
  "message": "Invalid file type. Allowed types: JPG, JPEG, PNG, GIF, WEBP"
}
```

---

### 7. Quên mật khẩu (Forgot Password)

**Endpoint**: `POST /api/auth/forgot-password`

**Mô tả**: Gửi yêu cầu reset mật khẩu

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response Success (200)**:
```json
{
  "message": "Password reset email sent"
}
```

**Note**: Chức năng này hiện tại chỉ trả về success message. Cần implement email service để gửi link reset password.

---

### 8. Reset mật khẩu (Reset Password)

**Endpoint**: `POST /api/auth/reset-password`

**Mô tả**: Reset mật khẩu với token

**Request Body**:
```json
{
  "email": "user@example.com",
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

**Response Success (200)**:
```json
{
  "message": "Password reset successful"
}
```

**Response Error (400)**:
```json
{
  "message": "Invalid reset request"
}
```

---

## 📊 Data Models

### User Model
```typescript
{
  userId: number;           // ID tự động tăng
  email: string;           // Email (unique)
  fullName: string;        // Họ và tên
  avatarUrl?: string;      // URL avatar
  bio?: string;            // Tiểu sử
  phoneNumber?: string;    // Số điện thoại
  role: string;            // Role (default: "Member")
  createdAt: DateTime;     // Ngày tạo
}
```

### JWT Payload
```typescript
{
  nameid: string;          // User ID
  email: string;           // Email
  name: string;            // Full name
  role: string;            // User role
  exp: number;             // Expiration timestamp
  iss: string;             // Issuer
  aud: string;             // Audience
}
```

---

## 🛡️ Security

### Password Security
- Passwords được hash bằng BCrypt
- Minimum length: 6 characters
- Stored as hash, không lưu plain text

### JWT Configuration
- Algorithm: HMAC-SHA256
- Expiration: 24 hours
- Secret key được lưu trong `appsettings.json`

### CORS
- Hiện tại allow tất cả origins (development only)
- Production nên cấu hình specific origins

---

## 🧪 Testing với cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "phoneNumber": "+84901234567"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Profile
```bash
curl -X PUT http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User Updated",
    "bio": "Software Developer",
    "phoneNumber": "+84901234567"
  }'
```

### Change Password
```bash
curl -X POST http://localhost:5000/api/user/change-password \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpassword",
    "newPassword": "newpassword"
  }'
```

---

## 🧪 Testing với Postman

### 1. Import Collection
1. Tạo new collection: "Task Management API"
2. Set base URL variable: `{{baseUrl}}` = `http://localhost:5000`
3. Set token variable: `{{token}}` để lưu JWT token

### 2. Authorization Setup
- Type: Bearer Token
- Token: `{{token}}`

### 3. Test Sequence
1. Register → Lấy token từ response
2. Login → Lấy token từ response
3. Get Profile → Dùng token từ bước trước
4. Update Profile → Dùng token
5. Change Password → Dùng token

---

## 🚀 Deployment Checklist

- [ ] Đổi JWT Secret Key trong production
- [ ] Cấu hình CORS cho specific origins
- [ ] Enable HTTPS
- [ ] Cấu hình rate limiting
- [ ] Setup logging và monitoring
- [ ] Backup database regularly
- [ ] Implement email service cho forgot password
- [ ] Add refresh token mechanism
- [ ] Implement account verification via email

---

## 📝 Notes

- Tất cả timestamps sử dụng UTC
- Email phải unique trong database
- Role mặc định là "Member"
- Avatar được lưu trong `wwwroot/uploads/avatars/`
- Validation được xử lý bởi FluentValidation
- Error responses tuân theo format nhất quán

---

## 🐛 Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request - Validation error hoặc business logic error |
| 401 | Unauthorized - Token không hợp lệ hoặc thiếu |
| 404 | Not Found - Resource không tồn tại |
| 500 | Internal Server Error - Lỗi server |

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Connection string trong `appsettings.json`
2. Database đã được tạo chưa
3. Token có hết hạn không
4. Request format có đúng không

Happy coding! 🎉



