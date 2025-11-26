# 👥 Project Member Management API Documentation

## Tổng quan

API quản lý thành viên dự án cho phép thêm, xóa và gán quyền cho các thành viên trong dự án. Tất cả các endpoints đều yêu cầu JWT authentication.

**Base URL:** `http://localhost:5000`

---

## Authentication

Tất cả các ProjectMember endpoints yêu cầu Bearer Token trong header:

```
Authorization: Bearer {your_jwt_token}
```

---

## Project Roles

API hỗ trợ 4 loại quyền:

| Role | Value | Description | Permissions |
|------|-------|-------------|-------------|
| Owner | 1 | Chủ sở hữu dự án | Toàn quyền (thêm/xóa/sửa member, chỉnh sửa project, xóa project) |
| Admin | 2 | Quản trị viên | Thêm/xóa/sửa member, chỉnh sửa project |
| Member | 3 | Thành viên | Xem và tham gia dự án |
| Viewer | 4 | Người xem | Chỉ có quyền xem |

---

## Endpoints

### 1. Thêm Thành Viên Vào Dự Án

**POST** `/api/project/{projectId}/members`

Thêm một user vào dự án với role được chỉ định.

#### Permissions Required
- Owner hoặc Admin của dự án

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| projectId | integer | Project ID |

#### Request Body

```json
{
  "userId": 5,
  "role": "Member"
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | integer | Yes | ID của user cần thêm vào dự án |
| role | string | Yes | Quyền: `Owner`, `Admin`, `Member`, `Viewer` |

#### Validation Rules

- `userId`: Must be > 0
- `role`: Must be one of: Owner, Admin, Member, Viewer
- User phải tồn tại trong hệ thống
- User chưa là thành viên của dự án (hoặc đã bị xóa trước đó)

#### Success Response (200 OK)

```json
{
  "message": "Member added successfully",
  "data": {
    "projectMemberId": 1,
    "projectId": 2,
    "userId": 5,
    "user": {
      "userId": 5,
      "email": "member@example.com",
      "fullName": "Test Member User",
      "avatarUrl": null,
      "bio": null,
      "phoneNumber": "+84901234567",
      "role": "Member",
      "createdAt": "2025-11-19T15:00:00Z"
    },
    "role": "Member",
    "joinedAt": "2025-11-19T15:13:58.060Z",
    "lastAccessedAt": null,
    "isActive": true
  }
}
```

#### Error Responses

**400 Bad Request** - Permission denied, validation error, or user already member
```json
{
  "message": "You don't have permission to add members to this project"
}
```
```json
{
  "message": "User is already a member of this project"
}
```
```json
{
  "message": "User not found"
}
```

**404 Not Found** - Project không tồn tại
```json
{
  "message": "Project not found"
}
```

---

### 2. Lấy Danh Sách Thành Viên

**GET** `/api/project/{projectId}/members`

Lấy danh sách tất cả thành viên của dự án.

#### Permissions Required
- Owner, Admin, Member, hoặc Viewer của dự án

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| projectId | integer | Project ID |

#### Success Response (200 OK)

```json
{
  "data": [
    {
      "projectMemberId": 1,
      "projectId": 2,
      "userId": 5,
      "user": {
        "userId": 5,
        "email": "member@example.com",
        "fullName": "Test Member User",
        "avatarUrl": null,
        "bio": null,
        "phoneNumber": "+84901234567",
        "role": "Member",
        "createdAt": "2025-11-19T15:00:00Z"
      },
      "role": "Admin",
      "joinedAt": "2025-11-19T15:13:58.060Z",
      "lastAccessedAt": null,
      "isActive": true
    }
  ],
  "count": 1
}
```

#### Notes

- Chỉ trả về các thành viên có `isActive = true`
- Danh sách được sắp xếp theo `joinedAt` (tham gia sớm nhất trước)
- Bao gồm thông tin đầy đủ của user

---

### 3. Cập Nhật Quyền Thành Viên

**PUT** `/api/project/{projectId}/members/{memberId}/role`

Thay đổi quyền của một thành viên trong dự án.

#### Permissions Required
- Owner hoặc Admin của dự án

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| projectId | integer | Project ID |
| memberId | integer | ProjectMember ID (không phải User ID) |

#### Request Body

```json
{
  "role": "Admin"
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | string | Yes | Quyền mới: `Owner`, `Admin`, `Member`, `Viewer` |

#### Validation Rules

- `role`: Must be one of: Owner, Admin, Member, Viewer
- Không thể thay đổi role của chính mình
- Chỉ Owner mới có thể thay đổi role của Owner khác

#### Success Response (200 OK)

```json
{
  "message": "Member role updated successfully",
  "data": {
    "projectMemberId": 1,
    "projectId": 2,
    "userId": 5,
    "user": {
      "userId": 5,
      "email": "member@example.com",
      "fullName": "Test Member User",
      "role": "Member"
    },
    "role": "Admin",
    "joinedAt": "2025-11-19T15:13:58.060Z",
    "lastAccessedAt": null,
    "isActive": true
  }
}
```

#### Error Responses

**400 Bad Request** - Permission denied or invalid operation
```json
{
  "message": "You don't have permission to update member roles in this project"
}
```
```json
{
  "message": "You cannot change your own role"
}
```
```json
{
  "message": "Only project owner can change owner's role"
}
```

**404 Not Found** - Member không tồn tại
```json
{
  "message": "Member not found"
}
```

---

### 4. Xóa Thành Viên Khỏi Dự Án

**DELETE** `/api/project/{projectId}/members/{memberId}`

Xóa một thành viên khỏi dự án (soft delete).

#### Permissions Required
- Owner hoặc Admin của dự án

#### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| projectId | integer | Project ID |
| memberId | integer | ProjectMember ID (không phải User ID) |

#### Success Response (200 OK)

```json
{
  "message": "Member removed successfully"
}
```

#### Error Responses

**400 Bad Request** - Permission denied or invalid operation
```json
{
  "message": "You don't have permission to remove members from this project"
}
```
```json
{
  "message": "You cannot remove yourself from the project"
}
```
```json
{
  "message": "Cannot remove project owner"
}
```

**404 Not Found** - Member không tồn tại
```json
{
  "message": "Member not found"
}
```

#### Notes

- Đây là soft delete: `isActive` được set thành `false`
- Member bị xóa sẽ mất quyền truy cập vào dự án
- Không thể xóa Owner của dự án
- Không thể tự xóa chính mình

---

## Permission Matrix

Bảng quyền hạn cho các operations:

| Operation | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| View Project | ✅ | ✅ | ✅ | ✅ |
| Edit Project | ✅ | ✅ | ❌ | ❌ |
| Delete Project | ✅ | ❌ | ❌ | ❌ |
| Add Member | ✅ | ✅ | ❌ | ❌ |
| Remove Member | ✅ | ✅ | ❌ | ❌ |
| Update Member Role | ✅ | ✅* | ❌ | ❌ |
| View Members | ✅ | ✅ | ✅ | ✅ |

*Admin không thể thay đổi role của Owner

---

## Use Cases

### Use Case 1: Thêm member vào dự án mới

```powershell
# 1. Tạo dự án
$projectBody = @{
    name = "New Project"
    description = "Project description"
    status = "Planning"
    priority = "High"
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri "http://localhost:5000/api/project" -Method POST -Headers @{"Authorization"="Bearer $ownerToken";"Content-Type"="application/json"} -Body $projectBody

# 2. Thêm member
$memberBody = @{
    userId = 5
    role = "Member"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/project/$($project.data.projectId)/members" -Method POST -Headers @{"Authorization"="Bearer $ownerToken";"Content-Type"="application/json"} -Body $memberBody
```

### Use Case 2: Nâng cấp member thành Admin

```powershell
# 1. Lấy danh sách members
$members = Invoke-RestMethod -Uri "http://localhost:5000/api/project/2/members" -Headers @{"Authorization"="Bearer $ownerToken"}

# 2. Tìm member cần nâng cấp
$memberToPromote = $members.data | Where-Object { $_.user.email -eq "member@example.com" }

# 3. Update role
$updateBody = @{ role = "Admin" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/project/2/members/$($memberToPromote.projectMemberId)/role" -Method PUT -Headers @{"Authorization"="Bearer $ownerToken";"Content-Type"="application/json"} -Body $updateBody
```

### Use Case 3: Xóa member khỏi dự án

```powershell
# Xóa member
Invoke-RestMethod -Uri "http://localhost:5000/api/project/2/members/1" -Method DELETE -Headers @{"Authorization"="Bearer $ownerToken"}
```

---

## Testing

### Automated Test Script

Sử dụng script `test_project_member_api.ps1` để test tất cả endpoints:

```powershell
.\test_project_member_api.ps1
```

Script sẽ test:
1. ✅ Thêm member vào dự án
2. ✅ Lấy danh sách members
3. ✅ Cập nhật role từ Member → Admin
4. ✅ Member có thể truy cập project
5. ✅ Xóa member khỏi dự án
6. ✅ Member mất quyền truy cập sau khi bị xóa

### Manual Testing với PowerShell

```powershell
# 1. Login và lấy token
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"owner@example.com","password":"password123"}'
$token = $response.data.token

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Thêm member
$body = @{
    userId = 5
    role = "Member"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/project/1/members" -Method POST -Headers $headers -Body $body

# 3. Lấy danh sách members
Invoke-RestMethod -Uri "http://localhost:5000/api/project/1/members" -Method GET -Headers $headers

# 4. Update role
$updateBody = @{ role = "Admin" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/project/1/members/1/role" -Method PUT -Headers $headers -Body $updateBody

# 5. Xóa member
Invoke-RestMethod -Uri "http://localhost:5000/api/project/1/members/1" -Method DELETE -Headers $headers
```

---

## Database Schema

```sql
CREATE TABLE ProjectMembers (
    ProjectMemberId INT PRIMARY KEY IDENTITY,
    ProjectId INT NOT NULL,
    UserId INT NOT NULL,
    Role INT NOT NULL, -- 1=Owner, 2=Admin, 3=Member, 4=Viewer
    JoinedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    LastAccessedAt DATETIME2 NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    
    CONSTRAINT FK_ProjectMembers_Projects FOREIGN KEY (ProjectId) 
        REFERENCES Projects(ProjectId) ON DELETE CASCADE,
    CONSTRAINT FK_ProjectMembers_Users FOREIGN KEY (UserId) 
        REFERENCES Users(UserId) ON DELETE NO ACTION,
    
    CONSTRAINT UQ_ProjectMembers_ProjectId_UserId UNIQUE (ProjectId, UserId)
);

CREATE INDEX IX_ProjectMembers_ProjectId ON ProjectMembers(ProjectId);
CREATE INDEX IX_ProjectMembers_UserId ON ProjectMembers(UserId);
CREATE INDEX IX_ProjectMembers_IsActive ON ProjectMembers(IsActive);
CREATE UNIQUE INDEX IX_ProjectMembers_ProjectId_UserId ON ProjectMembers(ProjectId, UserId);
```

---

## Business Rules

### 1. Adding Members
- ✅ Chỉ Owner và Admin mới có thể thêm members
- ✅ Không thể thêm user đã là member (trừ khi đã bị xóa trước đó)
- ✅ User phải tồn tại trong hệ thống
- ✅ Nếu user đã bị xóa trước đó, sẽ được kích hoạt lại

### 2. Viewing Members
- ✅ Tất cả members (Owner, Admin, Member, Viewer) đều có thể xem danh sách
- ✅ Chỉ hiển thị members còn active

### 3. Updating Roles
- ✅ Chỉ Owner và Admin mới có thể update roles
- ❌ Không thể tự thay đổi role của mình
- ❌ Chỉ Owner mới có thể thay đổi role của Owner khác
- ✅ Admin có thể thay đổi role của Member và Viewer

### 4. Removing Members
- ✅ Chỉ Owner và Admin mới có thể xóa members
- ❌ Không thể xóa Owner
- ❌ Không thể tự xóa chính mình
- ✅ Soft delete: member vẫn tồn tại trong DB nhưng `isActive = false`

### 5. Project Access
- ✅ Owner luôn có quyền truy cập
- ✅ Active members có quyền truy cập theo role
- ❌ Members đã bị xóa mất quyền truy cập
- ✅ Admin và Owner có thể chỉnh sửa project
- ✅ Member và Viewer chỉ có thể xem

---

## Error Codes

| HTTP Code | Description |
|-----------|-------------|
| 200 | Success |
| 400 | Bad Request - Validation error, permission denied, or business rule violation |
| 401 | Unauthorized - Missing or invalid token |
| 404 | Not Found - Project or Member doesn't exist |
| 500 | Internal Server Error |

---

## Security Considerations

1. **Authentication**: Tất cả endpoints yêu cầu valid JWT token
2. **Authorization**: Role-based access control được enforce ở service layer
3. **Data Validation**: FluentValidation cho tất cả inputs
4. **Soft Delete**: Members bị xóa không bị mất khỏi database
5. **Unique Constraint**: Mỗi user chỉ có thể là member một lần trong project
6. **Cascade Delete**: Khi project bị xóa, tất cả members cũng bị xóa

---

## Integration with Project API

Members được tích hợp với Project API:

- **GetProjectById**: Kiểm tra member access
- **GetAllProjects**: Hiển thị cả owned projects và member projects
- **UpdateProject**: Chỉ Owner và Admin members có thể update
- **DeleteProject**: Chỉ Owner có thể delete

---

## Future Enhancements

- [ ] Member invitation system (email invites)
- [ ] Member activity tracking (LastAccessedAt)
- [ ] Member permissions at granular level (tasks, comments, etc.)
- [ ] Transfer project ownership
- [ ] Bulk member operations
- [ ] Member roles history/audit log
- [ ] Custom roles with specific permissions
- [ ] Member notifications on role changes

---

**Version:** 1.0  
**Last Updated:** November 19, 2025

