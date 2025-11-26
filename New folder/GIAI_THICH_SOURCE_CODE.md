# GIẢI THÍCH CHI TIẾT SOURCE CODE - TASK MANAGEMENT SYSTEM

## 📋 MỤC LỤC
1. [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
2. [Backend - ASP.NET Core](#backend---aspnet-core)
3. [Frontend - Vanilla JavaScript](#frontend---vanilla-javascript)
4. [Luồng hoạt động](#luồng-hoạt-động)

---

## 🏗️ TỔNG QUAN KIẾN TRÚC

Dự án sử dụng kiến trúc **Clean Architecture** với 4 lớp chính:
- **Domain**: Entities và Enums (lớp trong cùng)
- **Application**: Business logic, DTOs, Interfaces
- **Infrastructure**: Database, Services implementation
- **API**: Controllers, Middleware (lớp ngoài cùng)

Frontend sử dụng **Vanilla JavaScript** (HTML, CSS, JS thuần) không framework.

---

## 🔧 BACKEND - ASP.NET CORE

### 1. **Program.cs** - Entry Point và Configuration

```csharp
// File: TaskManagement.API/Program.cs
```

**Chức năng chính:**
- **Cấu hình Dependency Injection**: Đăng ký tất cả services vào container
- **Cấu hình Database**: Kết nối SQL Server qua Entity Framework Core
- **Cấu hình JWT Authentication**: Xác thực người dùng bằng JWT tokens
- **Cấu hình CORS**: Cho phép frontend gọi API từ domain khác
- **Cấu hình Swagger**: Tự động tạo API documentation

**Chi tiết:**

1. **FluentValidation** (dòng 18-21):
   - Thư viện validate dữ liệu đầu vào
   - Tự động validate request trước khi vào controller
   - `AddValidatorsFromAssemblyContaining<RegisterRequestValidator>`: Tự động tìm tất cả validators

2. **Database Configuration** (dòng 27-29):
   - Đọc connection string từ `appsettings.json`
   - Sử dụng Entity Framework Core với SQL Server
   - `ApplicationDbContext` là class quản lý database context

3. **JWT Authentication** (dòng 32-53):
   - **SecretKey**: Key để ký và verify token (lưu trong config)
   - **Issuer/Audience**: Xác định ai phát hành và ai sử dụng token
   - **ValidateLifetime**: Kiểm tra token còn hạn không
   - **ClockSkew**: Cho phép sai lệch thời gian (đặt = 0 để chính xác)

4. **Service Registration** (dòng 58-64):
   - `AddScoped`: Tạo mới instance mỗi request (phù hợp cho database context)
   - Đăng ký các services: Auth, User, Project, Task, FileStorage...

5. **CORS Policy** (dòng 67-75):
   - `AllowAll`: Cho phép mọi origin, method, header (chỉ dùng cho development)
   - Production nên giới hạn cụ thể

6. **Middleware Pipeline** (dòng 90-103):
   - `UseHttpsRedirection`: Redirect HTTP → HTTPS
   - `UseCors`: Xử lý CORS
   - `UseStaticFiles`: Phục vụ file tĩnh (uploads)
   - `UseAuthentication` → `UseAuthorization`: Xác thực trước, phân quyền sau
   - `MapControllers`: Map các controller routes

---

### 2. **ApplicationDbContext.cs** - Database Context

```csharp
// File: TaskManagement.Infrastructure/Data/ApplicationDbContext.cs
```

**Chức năng:**
- Định nghĩa các DbSet (bảng trong database)
- Cấu hình Entity Framework (relationships, indexes, constraints)

**Chi tiết:**

1. **DbSets** (dòng 13-17):
   - `Users`: Bảng người dùng
   - `Projects`: Bảng dự án
   - `ProjectMembers`: Bảng thành viên dự án
   - `ProjectTasks`: Bảng công việc
   - `TaskAttachments`: Bảng file đính kèm

2. **OnModelCreating** (dòng 19-248):
   - Cấu hình chi tiết cho từng entity

   **User Entity:**
   - Primary Key: `UserId`
   - Unique Index: `Email` (không trùng email)
   - MaxLength: Giới hạn độ dài string
   - Default Values: `Role = "Member"`, `Timezone = "UTC+7"`

   **Project Entity:**
   - Foreign Key: `OwnerId` → `Users.UserId` (Restrict delete)
   - Navigation: `Members` (1 Project có nhiều Members)
   - Indexes: `OwnerId`, `Status`, `IsActive` (tăng tốc query)

   **ProjectTask Entity:**
   - Foreign Keys:
     - `ProjectId` → `Projects.ProjectId` (Cascade: xóa project → xóa tasks)
     - `AssigneeId` → `Users.UserId` (SetNull: xóa user → assignee = null)
     - `CreatedById` → `Users.UserId` (Restrict: không cho xóa user đã tạo task)
   - Indexes: `ProjectId`, `Status`, `Priority`, `DueDate` (tối ưu filter)

   **ProjectMember Entity:**
   - Composite Unique Index: `(ProjectId, UserId)` (1 user chỉ có 1 role trong 1 project)
   - Foreign Keys: `ProjectId`, `UserId`

---

### 3. **Entities** - Domain Models

#### **User.cs**
```csharp
// File: TaskManagement.Domain/Entities/User.cs
```

**Thuộc tính:**
- `UserId`: Primary key
- `Email`: Email đăng nhập (unique)
- `PasswordHash`: Mật khẩu đã hash (BCrypt)
- `FullName`: Tên đầy đủ
- `Role`: "Admin" hoặc "Member"
- `IsActive`: Tài khoản còn hoạt động không
- `EmailConfirmed`: Email đã xác nhận chưa
- `CreatedAt`, `UpdatedAt`, `LastLoginAt`: Timestamps

#### **Project.cs**
```csharp
// File: TaskManagement.Domain/Entities/Project.cs
```

**Thuộc tính:**
- `ProjectId`: Primary key
- `Name`, `Description`: Tên và mô tả dự án
- `Status`: Planning, InProgress, Completed, OnHold, Cancelled
- `Priority`: Low, Medium, High, Critical
- `StartDate`, `EndDate`: Thời gian bắt đầu/kết thúc
- `Budget`: Ngân sách (decimal)
- `OwnerId`: User tạo dự án
- `Members`: Danh sách thành viên (navigation property)
- `IsActive`: Soft delete flag

#### **ProjectTask.cs**
```csharp
// File: TaskManagement.Domain/Entities/ProjectTask.cs
```

**Thuộc tính:**
- `TaskId`: Primary key
- `Title`, `Description`: Tiêu đề và mô tả task
- `ProjectId`: Thuộc dự án nào
- `Status`: Todo, InProgress, InReview, Done, Cancelled (enum)
- `Priority`: Low, Medium, High, Urgent (enum)
- `AssigneeId`: User được giao task (nullable)
- `CreatedById`: User tạo task
- `DueDate`: Hạn hoàn thành
- `EstimatedHours`, `ActualHours`: Giờ ước tính/thực tế
- `IsActive`: Soft delete

---

### 4. **Controllers** - API Endpoints

#### **AuthController.cs**
```csharp
// File: TaskManagement.API/Controllers/AuthController.cs
```

**Endpoints:**

1. **POST /api/auth/register** (dòng 18-29):
   - Đăng ký tài khoản mới
   - Validate email chưa tồn tại
   - Hash password bằng BCrypt
   - Tạo JWT token và trả về

2. **POST /api/auth/login** (dòng 31-42):
   - Đăng nhập bằng email/password
   - Verify password với BCrypt
   - Kiểm tra `IsActive`
   - Cập nhật `LastLoginAt`
   - Trả về JWT token

3. **POST /api/auth/forgot-password** (dòng 44-50):
   - Yêu cầu reset password
   - Tạo reset token (hiện tại chỉ return token, chưa gửi email)

4. **POST /api/auth/reset-password** (dòng 52-63):
   - Reset password với token
   - Hash password mới và lưu

**Response Format:**
```json
{
  "message": "Success message",
  "data": { ... }  // Hoặc "errors": [ ... ] nếu lỗi
}
```

#### **ProjectController.cs**
```csharp
// File: TaskManagement.API/Controllers/ProjectController.cs
```

**Attributes:**
- `[Authorize]`: Yêu cầu đăng nhập (JWT token)
- `[Route("api/[controller]")]`: Route base = `/api/project`

**Endpoints:**

1. **POST /api/project** (dòng 30-42):
   - Tạo dự án mới
   - `GetCurrentUserId()`: Lấy UserId từ JWT token (ClaimTypes.NameIdentifier)
   - User hiện tại = Owner

2. **GET /api/project** (dòng 47-59):
   - Lấy tất cả dự án của user hiện tại
   - Bao gồm: dự án user là owner + dự án user là member

3. **GET /api/project/{id}** (dòng 64-76):
   - Lấy chi tiết 1 dự án
   - Kiểm tra user có quyền xem không

4. **PUT /api/project/{id}** (dòng 81-93):
   - Cập nhật dự án
   - Chỉ owner mới được update

5. **DELETE /api/project/{id}** (dòng 98-110):
   - Xóa dự án (soft delete: `IsActive = false`)
   - Chỉ owner mới được xóa

#### **TaskController.cs**
```csharp
// File: TaskManagement.API/Controllers/TaskController.cs
```

**Route:** `[Route("api/project/{projectId}/tasks")]`

**Endpoints:**

1. **POST /api/project/{projectId}/tasks** (dòng 30-42):
   - Tạo task mới trong dự án
   - Validate user là member của project

2. **GET /api/project/{projectId}/tasks** (dòng 47-59):
   - Lấy tất cả tasks của project

3. **GET /api/project/{projectId}/tasks/search** (dòng 64-93):
   - Tìm kiếm và lọc tasks
   - Query parameters: `status`, `priority`, `assigneeId`, `searchTerm`, `dueDateFrom`, `dueDateTo`

4. **GET /api/project/{projectId}/tasks/grouped-by-status** (dòng 98-110):
   - Lấy tasks nhóm theo status (cho Kanban board)

5. **GET /api/project/{projectId}/tasks/{taskId}** (dòng 115-127):
   - Lấy chi tiết 1 task

6. **PUT /api/project/{projectId}/tasks/{taskId}** (dòng 132-144):
   - Cập nhật task
   - Validate quyền (member có thể update)

7. **DELETE /api/project/{projectId}/tasks/{taskId}** (dòng 149-161):
   - Xóa task (soft delete)

#### **ProjectMemberController.cs**
```csharp
// File: TaskManagement.API/Controllers/ProjectMemberController.cs
```

**Endpoints:**

1. **POST /api/project/{projectId}/members** (dòng 34-46):
   - Thêm thành viên vào project
   - Chỉ Owner/Manager mới được thêm

2. **GET /api/project/{projectId}/members** (dòng 51-63):
   - Lấy danh sách thành viên

3. **PUT /api/project/{projectId}/members/{memberId}/role** (dòng 68-80):
   - Cập nhật role của member
   - Chỉ Owner mới được đổi role

4. **DELETE /api/project/{projectId}/members/{memberId}** (dòng 85-97):
   - Xóa member khỏi project
   - Không được xóa owner

5. **GET /api/project/{projectId}/members/available-users** (dòng 102-125):
   - Lấy danh sách users chưa là member
   - Dùng để hiển thị dropdown khi thêm member

---

### 5. **Services** - Business Logic

#### **AuthService.cs**
```csharp
// File: TaskManagement.Infrastructure/Services/AuthService.cs
```

**Chức năng:**

1. **RegisterAsync** (dòng 22-58):
   - Kiểm tra email đã tồn tại chưa
   - Hash password: `BCrypt.Net.BCrypt.HashPassword(request.Password)`
   - Tạo User mới với `Role = "Member"`
   - Generate JWT token
   - Trả về `AuthResponse` (token + user info)

2. **LoginAsync** (dòng 60-89):
   - Tìm user theo email
   - Verify password: `BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)`
   - Kiểm tra `IsActive`
   - Cập nhật `LastLoginAt`
   - Generate và trả về token

3. **ForgotPasswordAsync** (dòng 91-106):
   - Tạo reset token (hiện tại chỉ return, chưa gửi email)
   - Security: Không reveal email có tồn tại không

4. **ResetPasswordAsync** (dòng 108-124):
   - Validate token (TODO: implement)
   - Hash password mới và lưu

**Result Pattern:**
- `Result<T>.Success(data, message)`: Thành công
- `Result<T>.Failure(message)`: Thất bại
- Giúp xử lý lỗi nhất quán

---

## 🎨 FRONTEND - VANILLA JAVASCRIPT

### 1. **api.js** - API Service Layer

```javascript
// File: vanilla-frontend/js/api.js
```

**Chức năng:**
- Class `ApiService` quản lý tất cả HTTP requests
- Singleton pattern: `const api = new ApiService()`

**Các phương thức chính:**

1. **getToken()** (dòng 16-18):
   - Lấy JWT token từ `localStorage`

2. **getHeaders()** (dòng 23-34):
   - Tạo headers cho request
   - Tự động thêm `Authorization: Bearer {token}`
   - Hỗ trợ `Content-Type` tùy chỉnh

3. **handleResponse()** (dòng 39-65):
   - Xử lý response từ server
   - **401 Unauthorized**: Xóa token, redirect về login
   - Parse JSON nếu `Content-Type: application/json`
   - Extract `data` từ response: `data.data || data`
   - Throw error nếu `!response.ok`

4. **HTTP Methods:**
   - `get(endpoint, params)`: GET request với query string
   - `post(endpoint, data)`: POST với JSON body
   - `put(endpoint, data)`: PUT với JSON body
   - `delete(endpoint)`: DELETE request
   - `uploadFile(endpoint, formData)`: Upload file (multipart/form-data)

5. **API Methods** (dòng 139-318):
   - **Auth**: `login()`, `register()`, `getProfile()`
   - **Project**: `getProjects()`, `getProject(id)`, `createProject()`, `updateProject()`, `deleteProject()`
   - **Task**: `getProjectTasks()`, `createTask()`, `updateTask()`, `deleteTask()`, `searchTasks()`
   - **Member**: `getProjectMembers()`, `addProjectMember()`, `updateMemberRole()`, `removeMember()`
   - **Report**: `getProjectStatistics()`, `getUserStatistics()`, `getMyProjectsStatistics()`
   - **Admin**: `getAllUsers()`, `updateUserRole()`, `deactivateUser()`
   - **Attachment**: `uploadAttachment()`, `getAttachments()`, `deleteAttachment()`, `downloadAttachment()`

**Ví dụ sử dụng:**
```javascript
// Login
const response = await api.login('user@example.com', 'password');
Auth.setAuth(response.token, response.user);

// Get projects
const projects = await api.getProjects();

// Create task
await api.createTask(projectId, {
  title: 'New Task',
  status: 'Todo',
  priority: 'Medium'
});
```

---

### 2. **auth.js** - Authentication Helper

```javascript
// File: vanilla-frontend/js/auth.js
```

**Object `Auth` chứa các helper functions:**

1. **isAuthenticated()** (dòng 9-11):
   - Kiểm tra có token trong localStorage không

2. **getCurrentUser()** (dòng 16-19):
   - Parse user object từ localStorage
   - Return `null` nếu chưa đăng nhập

3. **setAuth(token, user)** (dòng 24-27):
   - Lưu token và user vào localStorage
   - Gọi sau khi login/register thành công

4. **clearAuth()** (dòng 32-35):
   - Xóa token và user khỏi localStorage
   - Gọi khi logout

5. **logout()** (dòng 40-43):
   - Clear auth + redirect về `index.html`

6. **isAdmin()** (dòng 48-51):
   - Kiểm tra user có role = "Admin" không

7. **requireAuth()** (dòng 56-62):
   - Bảo vệ trang: redirect về login nếu chưa đăng nhập
   - Gọi ở đầu mỗi protected page

8. **requireAdmin()** (dòng 67-77):
   - Bảo vệ trang admin: redirect nếu không phải admin

**Ví dụ sử dụng:**
```javascript
// Check auth
if (!Auth.isAuthenticated()) {
  window.location.href = 'index.html';
}

// Get user info
const user = Auth.getCurrentUser();
console.log(user.fullName);

// Check admin
if (Auth.isAdmin()) {
  // Show admin menu
}
```

---

### 3. **utils.js** - Utility Functions

```javascript
// File: vanilla-frontend/js/utils.js
```

**Object `Utils` chứa các helper functions:**

1. **Loading Overlay:**
   - `showLoading()`: Hiển thị loading spinner
   - `hideLoading()`: Ẩn loading spinner

2. **Alert Messages:**
   - `showAlert(message, type)`: Hiển thị thông báo
   - Types: `'success'`, `'danger'`, `'warning'`, `'info'`
   - Tự động ẩn sau 5 giây

3. **Date Formatting:**
   - `formatDate(dateString)`: Format thành "Jan 15, 2024"
   - `formatDateForInput(dateString)`: Format thành "2024-01-15" (cho input type="date")

4. **Number Formatting:**
   - `formatNumber(number)`: Format với commas (1,000)

5. **User Helpers:**
   - `getUserInitials(fullName)`: Lấy chữ cái đầu (VD: "John Doe" → "JD")

6. **Badge Classes:**
   - `getStatusBadgeClass(status)`: Trả về CSS class cho status badge
   - `getPriorityBadgeClass(priority)`: Trả về CSS class cho priority badge
   - Mapping: `'Completed'` → `'badge-success'`, `'High'` → `'badge-warning'`, etc.

7. **Modal:**
   - `createModal(title, bodyHTML, onSave)`: Tạo modal động
   - Tự động xử lý Cancel/Save buttons
   - Chỉ đóng modal khi `onSave` thành công

8. **Security:**
   - `escapeHtml(text)`: Escape HTML để chống XSS
   - **QUAN TRỌNG**: Luôn dùng khi render user input

9. **URL Helpers:**
   - `getQueryParam(param)`: Lấy query parameter từ URL
   - VD: `?id=123` → `getQueryParam('id')` = `"123"`

10. **Debounce:**
    - `debounce(func, wait)`: Delay function execution
    - Dùng cho search input (tránh gọi API quá nhiều)

**Ví dụ sử dụng:**
```javascript
// Show loading
Utils.showLoading();
try {
  await api.getProjects();
} finally {
  Utils.hideLoading();
}

// Show alert
Utils.showAlert('Success!', 'success');

// Format date
const formatted = Utils.formatDate('2024-01-15T10:00:00Z'); // "Jan 15, 2024"

// Escape HTML (chống XSS)
const safe = Utils.escapeHtml('<script>alert("XSS")</script>');

// Create modal
Utils.createModal('Edit Project', formHTML, async () => {
  await updateProject();
});
```

---

### 4. **HTML Pages**

#### **index.html** - Login/Register Page

```html
// File: vanilla-frontend/index.html
```

**Chức năng:**
- Trang đăng nhập và đăng ký (toggle giữa 2 mode)
- Form validation (HTML5 + JavaScript)
- Redirect nếu đã đăng nhập

**Luồng hoạt động:**

1. **Page Load** (dòng 90-93):
   - Kiểm tra đã đăng nhập → redirect `dashboard.html`

2. **Toggle Mode** (dòng 111-142):
   - Click "Sign Up" → hiện thêm `fullName`, `confirmPassword`
   - Click "Sign In" → ẩn các field đó
   - Thay đổi title, button text

3. **Form Submit** (dòng 145-190):
   - **Login Mode:**
     - Gọi `api.login(email, password)`
     - Lưu token + user: `Auth.setAuth(response.token, response.user)`
     - Redirect `dashboard.html`
   - **Register Mode:**
     - Validate password match
     - Gọi `api.register(email, password, fullName)`
     - Lưu auth + redirect

**Error Handling:**
- Try-catch để bắt lỗi
- Hiển thị alert với `Utils.showAlert()`
- Loading overlay trong lúc xử lý

---

#### **dashboard.html** - Dashboard Page

```html
// File: vanilla-frontend/dashboard.html
```

**Chức năng:**
- Trang tổng quan: thống kê projects và tasks
- Hiển thị recent projects

**Cấu trúc:**

1. **Navbar** (dòng 11-27):
   - Logo, menu items (Dashboard, Projects, Reports, Admin)
   - User avatar + name
   - Logout button
   - Admin menu chỉ hiện nếu `Auth.isAdmin()`

2. **Statistics Cards** (dòng 37-54):
   - Total Projects
   - Completed Projects
   - In Progress Projects
   - Total Tasks

3. **Recent Projects Table** (dòng 57-67):
   - Hiển thị 5 projects gần nhất
   - Link đến `project-detail.html`

4. **Quick Actions** (dòng 70-83):
   - Buttons: Create Project, View Tasks, View Reports

**JavaScript Logic:**

1. **loadDashboard()** (dòng 104-128):
   - Gọi `api.getProjects()` và `api.getMyProjectsStatistics()`
   - Tính toán stats từ data
   - Update DOM với `displayProjects()`

2. **displayProjects()** (dòng 130-171):
   - Render table HTML từ projects array
   - Escape HTML để chống XSS
   - Format dates với `Utils.formatDate()`
   - Badge classes với `Utils.getStatusBadgeClass()`

---

#### **projects.html** - Projects List Page

```html
// File: vanilla-frontend/projects.html
```

**Chức năng:**
- Hiển thị tất cả projects dạng grid
- Create/Edit/Delete projects

**Cấu trúc:**

1. **Page Header** (dòng 30-36):
   - Title + "New Project" button

2. **Projects Grid** (dòng 39-43):
   - Grid 3 cột (responsive)
   - Mỗi card: name, description, status, priority, owner, budget
   - Buttons: Edit, Delete

**JavaScript Logic:**

1. **loadProjects()** (dòng 64-72):
   - Gọi `api.getProjects()`
   - Render với `displayProjects()`

2. **displayProjects()** (dòng 74-129):
   - Grid layout với project cards
   - Click card → navigate `project-detail.html?id={id}`
   - Edit/Delete buttons với `event.stopPropagation()` (tránh trigger card click)

3. **openCreateModal()** (dòng 132-190):
   - Tạo modal với form HTML
   - Fields: name, description, status, priority, dates, budget
   - `Utils.createModal()` với callback `createProject()`

4. **createProject()** (dòng 192-220):
   - Validate form
   - Collect data từ form inputs
   - Gọi `api.createProject(data)`
   - Reload list sau khi thành công

5. **openEditModal()** (dòng 223-290):
   - Load project data với `api.getProject(id)`
   - Pre-fill form với existing data
   - `formatDateForInput()` để set date inputs

6. **updateProject()** (dòng 292-320):
   - Tương tự `createProject()` nhưng gọi `api.updateProject(id, data)`

7. **deleteProject()** (dòng 322-337):
   - Confirm với `Utils.confirm()`
   - Gọi `api.deleteProject(id)`
   - Reload list

---

#### **kanban.html** - Kanban Board Page

```html
// File: vanilla-frontend/kanban.html
```

**Chức năng:**
- Hiển thị tasks dạng Kanban board (columns theo status)
- Drag & drop (chưa implement, chỉ hiển thị)

**Cấu trúc:**

1. **Kanban Columns** (dòng 173-178):
   ```javascript
   const columns = [
     { id: 'Todo', title: '📝 Todo', color: 'secondary' },
     { id: 'InProgress', title: '🔄 In Progress', color: 'primary' },
     { id: 'InReview', title: '👀 In Review', color: 'info' },
     { id: 'Done', title: '✅ Done', color: 'success' }
   ];
   ```

2. **CSS Grid** (dòng 9-14):
   - `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`
   - Responsive: 4 cột → 2 cột → 1 cột

**JavaScript Logic:**

1. **loadProjectData()** (dòng 181-199):
   - Load project, tasks, members cùng lúc với `Promise.all()`
   - Filter cancelled tasks
   - Render header + kanban board

2. **displayKanbanBoard()** (dòng 215-258):
   - Tạo columns từ `columns` array
   - Filter tasks theo status cho mỗi column
   - Render task cards trong mỗi column
   - Task card: title, description (truncate), priority badge, assignee, due date
   - Click card → `viewTask()` → navigate `project-detail.html#task-{id}`

3. **openCreateTaskModal()** (dòng 266-327):
   - Filter members (exclude Viewer role)
   - Form: title, description, status, priority, assignee, due date
   - Dropdown assignee với members list

4. **createTask()** (dòng 329-358):
   - Collect form data
   - Parse `assigneeId` (null nếu unassigned)
   - Gọi `api.createTask(projectId, data)`
   - Reload board

---

## 🔄 LUỒNG HOẠT ĐỘNG

### 1. **Luồng Đăng Nhập**

```
User nhập email/password
    ↓
index.html: loginForm submit
    ↓
api.login(email, password)
    ↓
POST /api/auth/login
    ↓
AuthService.LoginAsync()
    - Tìm user theo email
    - Verify password (BCrypt)
    - Kiểm tra IsActive
    - Generate JWT token
    ↓
Response: { token, user }
    ↓
Auth.setAuth(token, user) → localStorage
    ↓
Redirect → dashboard.html
```

### 2. **Luồng Tạo Project**

```
User click "New Project"
    ↓
projects.html: openCreateModal()
    ↓
User điền form → Submit
    ↓
createProject()
    ↓
api.createProject(data)
    ↓
POST /api/project (với JWT token)
    ↓
ProjectController.CreateProject()
    - GetCurrentUserId() từ JWT
    - Validate request
    ↓
ProjectService.CreateProjectAsync()
    - Tạo Project entity
    - Set OwnerId = currentUserId
    - Save to database
    ↓
Response: { data: project }
    ↓
Reload projects list
```

### 3. **Luồng Xem Tasks (Kanban)**

```
User vào kanban.html?id=123
    ↓
loadProjectData()
    ↓
Promise.all([
  api.getProject(123),
  api.getProjectTasks(123),
  api.getProjectMembers(123)
])
    ↓
GET /api/project/123 (với JWT)
GET /api/project/123/tasks (với JWT)
GET /api/project/123/members (với JWT)
    ↓
Controllers validate JWT + check permissions
    ↓
Services query database
    ↓
Response: project, tasks[], members[]
    ↓
displayKanbanBoard(tasks)
    - Group tasks by status
    - Render columns + cards
```

### 4. **Luồng Xác Thực (JWT)**

```
Mỗi API request:
    ↓
api.js: getHeaders()
    - Lấy token từ localStorage
    - Thêm header: Authorization: Bearer {token}
    ↓
Backend: UseAuthentication middleware
    - Extract token từ header
    - Verify signature với SecretKey
    - Check expiration
    - Parse claims (UserId, Email, Role)
    ↓
Controller: GetCurrentUserId()
    - User.FindFirst(ClaimTypes.NameIdentifier)
    - Return UserId
    ↓
Service: Sử dụng UserId để check permissions
```

### 5. **Luồng Xử Lý Lỗi**

```
API call fails
    ↓
api.js: handleResponse()
    - Check response.status
    - 401 → clearAuth() + redirect login
    - !response.ok → throw Error
    ↓
Try-catch trong page script
    ↓
Utils.showAlert(error.message, 'danger')
    ↓
User thấy thông báo lỗi
```

---

## 🔐 BẢO MẬT

### Backend:
1. **JWT Authentication**: Mọi API (trừ login/register) yêu cầu token
2. **Password Hashing**: BCrypt (salt rounds tự động)
3. **Authorization**: Kiểm tra quyền (Owner, Manager, Member)
4. **Input Validation**: FluentValidation
5. **SQL Injection**: Entity Framework parameterized queries
6. **CORS**: Giới hạn origins (production)

### Frontend:
1. **XSS Prevention**: `Utils.escapeHtml()` khi render user input
2. **Token Storage**: localStorage (có thể dùng httpOnly cookies tốt hơn)
3. **Auth Check**: `Auth.requireAuth()` ở mỗi protected page
4. **HTTPS**: Nên dùng HTTPS trong production

---

## 📝 GHI CHÚ QUAN TRỌNG

1. **Soft Delete**: Không xóa thật, chỉ set `IsActive = false`
2. **Timestamps**: `CreatedAt`, `UpdatedAt` tự động set
3. **Navigation Properties**: Entity Framework lazy loading
4. **Result Pattern**: Services return `Result<T>` để xử lý lỗi nhất quán
5. **Error Messages**: Backend trả về `{ message, errors }`, frontend hiển thị `message`
6. **Loading States**: Luôn show/hide loading overlay khi gọi API
7. **Form Validation**: HTML5 validation + JavaScript check
8. **Responsive Design**: CSS Grid + Media queries

---

## 🚀 CÁCH CHẠY DỰ ÁN

### Backend:
```bash
cd TaskManagement.API
dotnet restore
dotnet ef database update  # Tạo database
dotnet run  # Chạy trên http://localhost:5000
```

### Frontend:
```bash
cd vanilla-frontend
# Mở index.html bằng live server hoặc serve static files
# Hoặc: python -m http.server 8080
```

### Cấu hình:
- `appsettings.json`: Connection string, JWT settings
- `api.js`: `API_BASE_URL = 'http://localhost:5000/api'`

---

**Tài liệu này giải thích chi tiết toàn bộ source code của hệ thống Task Management. Nếu cần làm rõ phần nào, vui lòng hỏi thêm!**



