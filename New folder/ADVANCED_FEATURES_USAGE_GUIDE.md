# 📘 Advanced Features - Usage Guide

## Hướng dẫn sử dụng các tính năng nâng cao

---

## 1. 📎 Upload File Đính Kèm Task

### Upload File

**Endpoint:** `POST /api/project/{projectId}/tasks/{taskId}/attachments`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body:** Form-data với key "file"

**Example (PowerShell):**
```powershell
# Chuẩn bị file
$fileContent = [System.IO.File]::ReadAllBytes("document.pdf")
$boundary = [System.Guid]::NewGuid().ToString()

# Upload
Invoke-RestMethod `
  -Uri "http://localhost:5000/api/project/1/tasks/5/attachments" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"} `
  -InFile "document.pdf"
```

**Example (cURL):**
```bash
curl -X POST "http://localhost:5000/api/project/1/tasks/5/attachments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

**Example (C# HttpClient):**
```csharp
using var content = new MultipartFormDataContent();
using var fileStream = File.OpenRead("document.pdf");
using var streamContent = new StreamContent(fileStream);
content.Add(streamContent, "file", "document.pdf");

var response = await httpClient.PostAsync(
    $"api/project/{projectId}/tasks/{taskId}/attachments",
    content
);
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "data": {
    "attachmentId": 1,
    "taskId": 5,
    "fileName": "document.pdf",
    "filePath": "/uploads/tasks/5/abc123.pdf",
    "contentType": "application/pdf",
    "fileSize": 245678,
    "uploadedById": 3,
    "uploadedBy": {
      "userId": 3,
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "uploadedAt": "2025-11-19T15:30:00Z"
  }
}
```

### Lấy Danh Sách Attachments

**Endpoint:** `GET /api/project/{projectId}/tasks/{taskId}/attachments`

**Example:**
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
$attachments = Invoke-RestMethod `
  -Uri "http://localhost:5000/api/project/1/tasks/5/attachments" `
  -Headers $headers
```

**Response:**
```json
{
  "data": [
    {
      "attachmentId": 1,
      "fileName": "document.pdf",
      "fileSize": 245678,
      "uploadedAt": "2025-11-19T15:30:00Z"
    }
  ],
  "count": 1
}
```

### Download File

**Endpoint:** `GET /api/project/{projectId}/tasks/{taskId}/attachments/{attachmentId}/download`

**Example:**
```powershell
Invoke-WebRequest `
  -Uri "http://localhost:5000/api/project/1/tasks/5/attachments/1/download" `
  -Headers @{"Authorization"="Bearer $token"} `
  -OutFile "downloaded_file.pdf"
```

### Xóa Attachment

**Endpoint:** `DELETE /api/project/{projectId}/tasks/{taskId}/attachments/{attachmentId}`

**Example:**
```powershell
Invoke-RestMethod `
  -Uri "http://localhost:5000/api/project/1/tasks/5/attachments/1" `
  -Method DELETE `
  -Headers @{"Authorization"="Bearer $token"}
```

### Giới Hạn và Quy Định

- **Max File Size:** 10MB
- **Allowed Types:** 
  - Documents: PDF, DOC, DOCX, XLS, XLSX, TXT
  - Images: PNG, JPG, JPEG, GIF
  - Archives: ZIP
- **Storage:** Files stored in `/uploads/tasks/{taskId}/` folder
- **Naming:** Files auto-renamed with GUID to prevent conflicts

---

## 2. 📊 API Báo Cáo và Thống Kê

### Thống Kê Theo Project

**Endpoint:** `GET /api/reports/project/{projectId}/statistics`

**Example:**
```powershell
$stats = Invoke-RestMethod `
  -Uri "http://localhost:5000/api/reports/project/1/statistics" `
  -Headers @{"Authorization"="Bearer $token"}

Write-Host "Total Tasks: $($stats.data.totalTasks)"
Write-Host "Completed: $($stats.data.completedTasks)"
Write-Host "Completion Rate: $($stats.data.completionRate)%"
```

**Response:**
```json
{
  "data": {
    "totalTasks": 25,
    "tasksByStatus": {
      "Todo": 8,
      "InProgress": 10,
      "InReview": 2,
      "Done": 5
    },
    "tasksByPriority": {
      "Low": 5,
      "Medium": 12,
      "High": 6,
      "Urgent": 2
    },
    "completedTasks": 5,
    "overdueTasks": 3,
    "completionRate": 20.0
  }
}
```

**Use Cases:**
- Dashboard project overview
- Project health monitoring
- Resource allocation decisions
- Progress tracking

### Thống Kê Theo User

**Endpoint:** `GET /api/reports/user/{userId}/statistics`

**Permissions:** 
- Users can view their own statistics
- Admins can view any user's statistics

**Example:**
```powershell
$userStats = Invoke-RestMethod `
  -Uri "http://localhost:5000/api/reports/user/5/statistics" `
  -Headers @{"Authorization"="Bearer $token"}

Write-Host "$($userStats.data.userName) Statistics:"
Write-Host "Assigned: $($userStats.data.assignedTasks)"
Write-Host "Completed: $($userStats.data.completedTasks)"
Write-Host "Rate: $($userStats.data.completionRate)%"
```

**Response:**
```json
{
  "data": {
    "userId": 5,
    "userName": "John Doe",
    "assignedTasks": 15,
    "completedTasks": 8,
    "inProgressTasks": 5,
    "overdueTasks": 2,
    "completionRate": 53.33
  }
}
```

**Use Cases:**
- Individual performance tracking
- Workload distribution analysis
- Team member productivity review
- Identify overloaded team members

### Tổng Quan Tất Cả Projects

**Endpoint:** `GET /api/reports/my-projects/statistics`

**Description:** Lấy thống kê của tất cả projects mà user tham gia (owner hoặc member)

**Example:**
```powershell
$allProjects = Invoke-RestMethod `
  -Uri "http://localhost:5000/api/reports/my-projects/statistics" `
  -Headers @{"Authorization"="Bearer $token"}

foreach ($project in $allProjects.data) {
    Write-Host "$($project.projectName):"
    Write-Host "  Tasks: $($project.totalTasks)"
    Write-Host "  Completed: $($project.completedTasks)"
    Write-Host "  Rate: $($project.completionRate)%"
}
```

**Response:**
```json
{
  "data": [
    {
      "projectId": 1,
      "projectName": "Website Redesign",
      "totalTasks": 25,
      "completedTasks": 15,
      "completionRate": 60.0,
      "tasksByStatus": {
        "Done": 15,
        "InProgress": 8,
        "Todo": 2
      }
    },
    {
      "projectId": 2,
      "projectName": "Mobile App",
      "totalTasks": 40,
      "completedTasks": 10,
      "completionRate": 25.0,
      "tasksByStatus": {
        "Done": 10,
        "InProgress": 20,
        "Todo": 10
      }
    }
  ],
  "count": 2
}
```

**Use Cases:**
- Multi-project dashboard
- Portfolio overview
- Identify struggling projects
- Resource reallocation decisions

---

## 3. 🔐 API Phân Quyền Nâng Cao

### Roles trong hệ thống

| Role | Level | Permissions |
|------|-------|-------------|
| **Admin** | Highest | Full system access, manage users, view all statistics |
| **ProjectManager** | Medium | Create/manage projects, manage team members |
| **Member** | Basic | Join projects, create/update tasks, view reports |

### Lấy Danh Sách Users (Admin Only)

**Endpoint:** `GET /api/admin/users?page={page}&pageSize={pageSize}`

**Permissions:** Admin only

**Example:**
```powershell
$users = Invoke-RestMethod `
  -Uri "http://localhost:5000/api/admin/users?page=1&pageSize=20" `
  -Headers @{"Authorization"="Bearer $adminToken"}

foreach ($user in $users.data) {
    Write-Host "$($user.fullName) - $($user.role)"
}
```

**Response:**
```json
{
  "data": [
    {
      "userId": 1,
      "email": "admin@example.com",
      "fullName": "Admin User",
      "role": "Admin",
      "isActive": true,
      "emailConfirmed": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "lastLoginAt": "2025-11-19T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

### Cập Nhật Role User (Admin Only)

**Endpoint:** `PUT /api/admin/users/{userId}/role`

**Body:**
```json
{
  "role": "ProjectManager"
}
```

**Example:**
```powershell
$updateRoleBody = @{ role = "ProjectManager" } | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5000/api/admin/users/5/role" `
  -Method PUT `
  -Headers @{
    "Authorization"="Bearer $adminToken"
    "Content-Type"="application/json"
  } `
  -Body $updateRoleBody
```

**Valid Roles:**
- `Admin`
- `ProjectManager`
- `Member`

### Deactivate User (Admin Only)

**Endpoint:** `POST /api/admin/users/{userId}/deactivate`

**Example:**
```powershell
Invoke-RestMethod `
  -Uri "http://localhost:5000/api/admin/users/5/deactivate" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $adminToken"}
```

**Note:** 
- Cannot deactivate Admin users
- Deactivation is soft delete (can be reactivated)

### Thống Kê Hệ Thống (Admin Only)

**Endpoint:** `GET /api/admin/system-statistics`

**Example:**
```powershell
$systemStats = Invoke-RestMethod `
  -Uri "http://localhost:5000/api/admin/system-statistics" `
  -Headers @{"Authorization"="Bearer $adminToken"}

Write-Host "Total Users: $($systemStats.data.totalUsers)"
Write-Host "Total Projects: $($systemStats.data.totalProjects)"
Write-Host "Total Tasks: $($systemStats.data.totalTasks)"
```

**Response:**
```json
{
  "data": {
    "totalUsers": 50,
    "totalProjects": 25,
    "totalTasks": 500,
    "completedTasks": 300,
    "completionRate": 60.0,
    "usersByRole": [
      { "role": "Admin", "count": 2 },
      { "role": "ProjectManager", "count": 8 },
      { "role": "Member", "count": 40 }
    ]
  }
}
```

---

## 4. 🔒 Authorization trong Code

### Protect Controller với Role

```csharp
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    // All methods require Admin role
}
```

### Protect Individual Method

```csharp
[HttpPost]
[Authorize(Roles = "Admin,ProjectManager")]
public async Task<IActionResult> CreateProject()
{
    // Only Admins and ProjectManagers can access
}
```

### Check User Role in Code

```csharp
var role = User.FindFirst(ClaimTypes.Role)?.Value;
if (role == "Admin")
{
    // Admin-specific logic
}
```

---

## 📱 Frontend Integration Examples

### React/TypeScript Upload Component

```typescript
const uploadFile = async (file: File, projectId: number, taskId: number) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_URL}/api/project/${projectId}/tasks/${taskId}/attachments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );

  return await response.json();
};
```

### Vue.js Statistics Dashboard

```vue
<template>
  <div class="statistics">
    <h2>{{ projectName }}</h2>
    <div class="stats-grid">
      <stat-card title="Total Tasks" :value="stats.totalTasks" />
      <stat-card title="Completed" :value="stats.completedTasks" />
      <stat-card title="Completion Rate" :value="`${stats.completionRate}%`" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const stats = ref({});

onMounted(async () => {
  const response = await fetch(
    `${API_URL}/api/reports/project/${projectId}/statistics`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  stats.value = await response.json();
});
</script>
```

---

## 🧪 Testing with Swagger UI

1. **Navigate to:** `http://localhost:5000`
2. **Click "Authorize"** button (top right)
3. **Enter:** `Bearer YOUR_TOKEN`
4. **Test endpoints** with "Try it out" button

### Benefits:
- Interactive API testing
- See request/response examples
- Validate responses
- No coding required

---

## 💡 Best Practices

### File Upload
1. Validate file type on client-side before upload
2. Show upload progress to users
3. Handle large files with chunked upload
4. Implement retry logic for failed uploads
5. Clean up orphaned files periodically

### Statistics & Reports
1. Cache statistics for frequently accessed projects
2. Implement pagination for large datasets
3. Add date range filters for historical data
4. Export reports to PDF/Excel
5. Schedule automated report generation

### Authorization
1. Always validate user permissions on server-side
2. Hide UI elements user cannot access
3. Log admin actions for audit trail
4. Implement rate limiting for admin endpoints
5. Use HTTPS in production

---

## 🚨 Error Handling

### Common Errors

**401 Unauthorized**
```json
{
  "message": "Unauthorized access"
}
```
**Solution:** Check token validity, re-login if needed

**403 Forbidden**
```json
{
  "message": "You don't have permission to perform this action"
}
```
**Solution:** User role insufficient, contact admin

**400 Bad Request - File Too Large**
```json
{
  "message": "File size exceeds maximum allowed size of 10MB"
}
```
**Solution:** Compress file or split into smaller files

**400 Bad Request - Invalid File Type**
```json
{
  "message": "File type not allowed. Allowed types: .pdf, .doc, ..."
}
```
**Solution:** Convert file to allowed format

---

## 📞 Support

- **API Documentation:** http://localhost:5000
- **Summary:** ADVANCED_FEATURES_SUMMARY.md
- **Test Script:** test_advanced_features.ps1

---

**Version:** 1.0  
**Last Updated:** November 19, 2025

