# 🧪 Hướng dẫn Test API

## Cách 1: Test bằng Swagger UI (Dễ nhất)

1. **Chạy ứng dụng**:
   ```bash
   cd TaskManagement.API
   dotnet run
   ```

2. **Mở browser** và truy cập: `http://localhost:5000`

3. **Test các endpoint**:
   - Mở rộng endpoint muốn test
   - Click "Try it out"
   - Nhập dữ liệu
   - Click "Execute"

4. **Sử dụng JWT Token**:
   - Sau khi login hoặc register, copy token từ response
   - Click nút "Authorize" ở góc trên
   - Nhập: `Bearer {your_token}` (không có dấu ngoặc)
   - Click "Authorize"
   - Giờ có thể test các endpoint cần authentication

---

## Cách 2: Test bằng Postman

### Bước 1: Import Collection

1. Mở Postman
2. Click "Import"
3. Chọn file `POSTMAN_COLLECTION.json`
4. Collection "Task Management API" sẽ xuất hiện

### Bước 2: Test theo thứ tự

**1. Register (Đăng ký)**
- Endpoint: POST `/api/auth/register`
- Body:
  ```json
  {
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Nguyen Van A",
    "phoneNumber": "+84901234567"
  }
  ```
- Token sẽ tự động lưu vào biến `{{token}}`

**2. Login (Đăng nhập)**
- Endpoint: POST `/api/auth/login`
- Body:
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- Token sẽ tự động lưu vào biến `{{token}}`

**3. Get Profile (Lấy thông tin)**
- Endpoint: GET `/api/user/profile`
- Authorization: Bearer Token (tự động từ `{{token}}`)

**4. Update Profile (Cập nhật)**
- Endpoint: PUT `/api/user/profile`
- Authorization: Bearer Token
- Body:
  ```json
  {
    "fullName": "Nguyen Van A Updated",
    "bio": "Software Developer",
    "phoneNumber": "+84901234567"
  }
  ```

**5. Change Password (Đổi mật khẩu)**
- Endpoint: POST `/api/user/change-password`
- Authorization: Bearer Token
- Body:
  ```json
  {
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }
  ```

---

## Cách 3: Test bằng cURL

### 1. Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\",\"fullName\":\"Test User\",\"phoneNumber\":\"+84901234567\"}"
```

### 2. Login và lưu token
```bash
# Windows PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"password123"}'
$token = $response.data.token
echo $token

# Linux/Mac
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.token')
echo $TOKEN
```

### 3. Get Profile
```bash
# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/user/profile" -Headers @{"Authorization"="Bearer $token"}

# Linux/Mac
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Update Profile
```bash
# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/user/profile" -Method PUT -Headers @{"Authorization"="Bearer $token";"Content-Type"="application/json"} -Body '{"fullName":"Test User Updated","bio":"Developer","phoneNumber":"+84901234567"}'

# Linux/Mac
curl -X PUT http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User Updated","bio":"Developer","phoneNumber":"+84901234567"}'
```

### 5. Change Password
```bash
# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/user/change-password" -Method POST -Headers @{"Authorization"="Bearer $token";"Content-Type"="application/json"} -Body '{"currentPassword":"password123","newPassword":"newpassword456"}'

# Linux/Mac
curl -X POST http://localhost:5000/api/user/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"password123","newPassword":"newpassword456"}'
```

---

## Test Cases

### ✅ Happy Path Test Cases

1. **User Registration**
   - Input: Valid email, password, fullName
   - Expected: 200 OK, user created, token returned

2. **User Login**
   - Input: Registered email and correct password
   - Expected: 200 OK, token returned

3. **Get Profile**
   - Input: Valid JWT token
   - Expected: 200 OK, user profile returned

4. **Update Profile**
   - Input: Valid token, valid profile data
   - Expected: 200 OK, profile updated

5. **Change Password**
   - Input: Valid token, correct current password, new password
   - Expected: 200 OK, password changed

### ❌ Error Test Cases

1. **Register with existing email**
   - Input: Email already in database
   - Expected: 400 Bad Request, "Email already exists"

2. **Login with wrong password**
   - Input: Valid email, wrong password
   - Expected: 400 Bad Request, "Invalid email or password"

3. **Get Profile without token**
   - Input: No Authorization header
   - Expected: 401 Unauthorized

4. **Update Profile with invalid data**
   - Input: FullName empty
   - Expected: 400 Bad Request, validation error

5. **Change Password with wrong current password**
   - Input: Wrong current password
   - Expected: 400 Bad Request, "Current password is incorrect"

6. **Use expired token**
   - Input: Expired JWT token
   - Expected: 401 Unauthorized

---

## Quick Test Script (PowerShell)

```powershell
# Script để test toàn bộ flow
$baseUrl = "http://localhost:5000"

Write-Host "=== Testing API ===" -ForegroundColor Cyan

# 1. Register
Write-Host "`n1. Testing Register..." -ForegroundColor Yellow
$registerBody = @{
    email = "test$(Get-Random)@example.com"
    password = "password123"
    fullName = "Test User"
    phoneNumber = "+84901234567"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
$token = $registerResponse.data.token
Write-Host "✓ Register successful" -ForegroundColor Green

# 2. Login
Write-Host "`n2. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = ($registerBody | ConvertFrom-Json).email
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.token
Write-Host "✓ Login successful" -ForegroundColor Green

# 3. Get Profile
Write-Host "`n3. Testing Get Profile..." -ForegroundColor Yellow
$profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/user/profile" -Headers @{"Authorization"="Bearer $token"}
Write-Host "✓ Get Profile successful" -ForegroundColor Green
Write-Host "   User: $($profileResponse.data.fullName)" -ForegroundColor Gray

# 4. Update Profile
Write-Host "`n4. Testing Update Profile..." -ForegroundColor Yellow
$updateBody = @{
    fullName = "Test User Updated"
    bio = "Software Developer"
    phoneNumber = "+84901234567"
} | ConvertTo-Json

$updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/user/profile" -Method PUT -Headers @{"Authorization"="Bearer $token";"Content-Type"="application/json"} -Body $updateBody
Write-Host "✓ Update Profile successful" -ForegroundColor Green

# 5. Change Password
Write-Host "`n5. Testing Change Password..." -ForegroundColor Yellow
$changePasswordBody = @{
    currentPassword = "password123"
    newPassword = "newpassword456"
} | ConvertTo-Json

$changePasswordResponse = Invoke-RestMethod -Uri "$baseUrl/api/user/change-password" -Method POST -Headers @{"Authorization"="Bearer $token";"Content-Type"="application/json"} -Body $changePasswordBody
Write-Host "✓ Change Password successful" -ForegroundColor Green

Write-Host "`n=== All tests passed! ===" -ForegroundColor Green
```

Lưu script trên vào file `test_api.ps1` và chạy:
```powershell
.\test_api.ps1
```

---

## 🐛 Troubleshooting

### Lỗi: "Connection refused"
- Đảm bảo ứng dụng đang chạy: `dotnet run`
- Kiểm tra port: `netstat -ano | findstr :5000`

### Lỗi: "401 Unauthorized"
- Token có thể đã hết hạn (24h)
- Kiểm tra format: `Bearer {token}` (có dấu cách)
- Login lại để lấy token mới

### Lỗi: "400 Bad Request"
- Kiểm tra format JSON
- Kiểm tra validation rules
- Xem chi tiết error trong response body

### Lỗi: "Database connection"
- Kiểm tra SQL Server đang chạy
- Kiểm tra connection string trong `appsettings.json`
- Kiểm tra database đã được tạo chưa

Happy Testing! 🚀



