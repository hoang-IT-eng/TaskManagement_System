# 📋 Project Management API Documentation

## Tổng quan

API quản lý dự án cho phép người dùng tạo, xem, cập nhật và xóa các dự án của họ. Tất cả các endpoints đều yêu cầu JWT authentication.

**Base URL:** `http://localhost:5000`

---

## Authentication

Tất cả các Project endpoints yêu cầu Bearer Token trong header:

```
Authorization: Bearer {your_jwt_token}
```

Để lấy token, sử dụng endpoints `/api/auth/login` hoặc `/api/auth/register`.

---

## Endpoints

### 1. Tạo Dự Án Mới

**POST** `/api/project`

Tạo một dự án mới cho user hiện tại.

#### Request Body

```json
{
  "name": "E-Commerce Platform",
  "description": "Building a modern e-commerce platform with microservices",
  "status": "Planning",
  "priority": "High",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "budget": 50000.00
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tên dự án (max 255 ký tự) |
| description | string | No | Mô tả dự án (max 2000 ký tự) |
| status | string | Yes | Trạng thái: `Planning`, `InProgress`, `Completed`, `OnHold`, `Cancelled` |
| priority | string | Yes | Độ ưu tiên: `Low`, `Medium`, `High`, `Critical` |
| startDate | datetime | No | Ngày bắt đầu dự kiến |
| endDate | datetime | No | Ngày kết thúc dự kiến |
| budget | decimal | No | Ngân sách dự án (>= 0) |

#### Validation Rules

- `name`: Required, max 255 characters
- `description`: Max 2000 characters
- `status`: Must be one of: Planning, InProgress, Completed, OnHold, Cancelled
- `priority`: Must be one of: Low, Medium, High, Critical
- `startDate`: Must be <= endDate (if both provided)
- `budget`: Must be >= 0 (if provided)

#### Success Response (200 OK)

```json
{
  "message": "Project created successfully",
  "data": {
    "projectId": 1,
    "name": "E-Commerce Platform",
    "description": "Building a modern e-commerce platform with microservices",
    "status": "Planning",
    "priority": "High",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "budget": 50000.00,
    "ownerId": 2,
    "owner": {
      "userId": 2,
      "email": "test@example.com",
      "fullName": "Test User",
      "avatarUrl": null,
      "bio": null,
      "phoneNumber": "+84901234567",
      "role": "Member",
      "createdAt": "2025-11-19T14:35:51.596"
    },
    "isActive": true,
    "createdAt": "2025-11-19T15:00:00Z",
    "updatedAt": "2025-11-19T15:00:00Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Validation errors
```json
{
  "message": "Project name is required"
}
```

**401 Unauthorized** - Missing or invalid token
```json
{
  "message": "Unauthorized"
}
```

---

### 2. Lấy Danh Sách Dự Án

**GET** `/api/project`

Lấy danh sách tất cả dự án của user hiện tại.

#### Success Response (200 OK)

```json
{
  "data": [
    {
      "projectId": 1,
      "name": "E-Commerce Platform",
      "description": "Building a modern e-commerce platform",
      "status": "Planning",
      "priority": "High",
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z",
      "budget": 50000.00,
      "ownerId": 2,
      "owner": {
        "userId": 2,
        "email": "test@example.com",
        "fullName": "Test User",
        "role": "Member"
      },
      "isActive": true,
      "createdAt": "2025-11-19T15:00:00Z",
      "updatedAt": "2025-11-19T15:00:00Z"
    }
  ],
  "count": 1
}
```

#### Notes

- Chỉ trả về các dự án có `isActive = true`
- Dự án được sắp xếp theo `createdAt` (mới nhất trước)
- Chỉ hiển thị dự án của user hiện tại (owner)

---

### 3. Lấy Chi Tiết Dự Án

**GET** `/api/project/{id}`

Lấy thông tin chi tiết của một dự án theo ID.

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

#### Success Response (200 OK)

```json
{
  "data": {
    "projectId": 1,
    "name": "E-Commerce Platform",
    "description": "Building a modern e-commerce platform with microservices",
    "status": "Planning",
    "priority": "High",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "budget": 50000.00,
    "ownerId": 2,
    "owner": {
      "userId": 2,
      "email": "test@example.com",
      "fullName": "Test User",
      "avatarUrl": null,
      "bio": null,
      "phoneNumber": "+84901234567",
      "role": "Member",
      "createdAt": "2025-11-19T14:35:51.596"
    },
    "isActive": true,
    "createdAt": "2025-11-19T15:00:00Z",
    "updatedAt": "2025-11-19T15:00:00Z"
  }
}
```

#### Error Responses

**404 Not Found** - Project không tồn tại hoặc không có quyền truy cập
```json
{
  "message": "Project not found"
}
```

```json
{
  "message": "You don't have permission to access this project"
}
```

---

### 4. Cập Nhật Dự Án

**PUT** `/api/project/{id}`

Cập nhật thông tin dự án.

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

#### Request Body

```json
{
  "name": "E-Commerce Platform v2",
  "description": "Updated: Building a modern e-commerce platform with AI features",
  "status": "InProgress",
  "priority": "Critical",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "budget": 75000.00
}
```

#### Request Fields

Tất cả các fields giống như Create Project endpoint.

#### Success Response (200 OK)

```json
{
  "message": "Project updated successfully",
  "data": {
    "projectId": 1,
    "name": "E-Commerce Platform v2",
    "description": "Updated: Building a modern e-commerce platform with AI features",
    "status": "InProgress",
    "priority": "Critical",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "budget": 75000.00,
    "ownerId": 2,
    "owner": {...},
    "isActive": true,
    "createdAt": "2025-11-19T15:00:00Z",
    "updatedAt": "2025-11-19T15:30:00Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Validation errors or permission denied
```json
{
  "message": "You don't have permission to update this project"
}
```

**404 Not Found** - Project không tồn tại
```json
{
  "message": "Project not found"
}
```

---

### 5. Xóa Dự Án

**DELETE** `/api/project/{id}`

Xóa dự án (soft delete - chỉ đánh dấu `isActive = false`).

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Project ID |

#### Success Response (200 OK)

```json
{
  "message": "Project deleted successfully"
}
```

#### Error Responses

**400 Bad Request** - Permission denied
```json
{
  "message": "You don't have permission to delete this project"
}
```

**404 Not Found** - Project không tồn tại
```json
{
  "message": "Project not found"
}
```

#### Notes

- Đây là soft delete, dự án không bị xóa khỏi database
- `isActive` được set thành `false`
- `updatedAt` được cập nhật
- Dự án bị xóa sẽ không hiển thị trong danh sách

---

## Status Values

| Value | Description |
|-------|-------------|
| Planning | Dự án đang trong giai đoạn lên kế hoạch |
| InProgress | Dự án đang được thực hiện |
| Completed | Dự án đã hoàn thành |
| OnHold | Dự án tạm dừng |
| Cancelled | Dự án đã bị hủy |

---

## Priority Values

| Value | Description |
|-------|-------------|
| Low | Độ ưu tiên thấp |
| Medium | Độ ưu tiên trung bình |
| High | Độ ưu tiên cao |
| Critical | Độ ưu tiên cực kỳ cao/khẩn cấp |

---

## Testing với PowerShell

Sử dụng script `test_project_api.ps1` để test tất cả endpoints:

```powershell
.\test_project_api.ps1
```

Script sẽ:
1. Login để lấy token
2. Tạo một dự án mới
3. Lấy chi tiết dự án
4. Lấy danh sách dự án
5. Cập nhật dự án
6. Xóa dự án
7. Verify deletion

---

## Testing với cURL (PowerShell)

### 1. Login để lấy token

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"password123"}'
$token = $response.data.token
```

### 2. Tạo dự án

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    name = "New Project"
    description = "Project description"
    status = "Planning"
    priority = "High"
    budget = 10000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/project" -Method POST -Headers $headers -Body $body
```

### 3. Lấy danh sách dự án

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/project" -Headers @{"Authorization"="Bearer $token"}
```

### 4. Lấy chi tiết dự án

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/project/1" -Headers @{"Authorization"="Bearer $token"}
```

### 5. Cập nhật dự án

```powershell
$updateBody = @{
    name = "Updated Project"
    description = "Updated description"
    status = "InProgress"
    priority = "Critical"
    budget = 15000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/project/1" -Method PUT -Headers $headers -Body $updateBody
```

### 6. Xóa dự án

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/project/1" -Method DELETE -Headers @{"Authorization"="Bearer $token"}
```

---

## Error Codes

| HTTP Code | Description |
|-----------|-------------|
| 200 | Success |
| 400 | Bad Request - Validation error or permission denied |
| 401 | Unauthorized - Missing or invalid token |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Best Practices

1. **Authentication**: Luôn include Bearer token trong header
2. **Validation**: Kiểm tra dữ liệu trước khi gửi request
3. **Error Handling**: Xử lý các error codes phù hợp
4. **Dates**: Sử dụng ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
5. **Budget**: Sử dụng decimal với 2 chữ số thập phân

---

## Database Schema

```sql
CREATE TABLE Projects (
    ProjectId INT PRIMARY KEY IDENTITY,
    Name NVARCHAR(255) NOT NULL,
    Description NVARCHAR(2000) NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Planning',
    Priority NVARCHAR(50) NOT NULL DEFAULT 'Medium',
    StartDate DATETIME2 NULL,
    EndDate DATETIME2 NULL,
    Budget DECIMAL(18,2) NULL,
    OwnerId INT NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Projects_Users FOREIGN KEY (OwnerId) REFERENCES Users(UserId)
);

CREATE INDEX IX_Projects_OwnerId ON Projects(OwnerId);
CREATE INDEX IX_Projects_Status ON Projects(Status);
CREATE INDEX IX_Projects_IsActive ON Projects(IsActive);
```

---

## Future Enhancements

- [ ] Add project members/collaborators
- [ ] Add project tasks/subtasks
- [ ] Add file attachments
- [ ] Add project comments/notes
- [ ] Add project tags/categories
- [ ] Add project timeline/gantt chart
- [ ] Add project notifications
- [ ] Add project reports/analytics
- [ ] Add project templates
- [ ] Add project archiving

---

**Version:** 1.0  
**Last Updated:** November 19, 2025

