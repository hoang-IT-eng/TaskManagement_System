# 📋 Danh Sách Chức Năng Còn Thiếu - Vanilla JS Frontend

## ✅ Đã Có (Backend + Frontend)
- ✅ Authentication (Login, Register)
- ✅ Forgot Password (gửi email reset link)
- ✅ Profile Management (xem, cập nhật thông tin)
- ✅ Change Password
- ✅ Project CRUD (tạo, xem, sửa, xóa dự án)
- ✅ Task CRUD (tạo, xem, sửa, xóa task)
- ✅ Task Search & Filter (tìm kiếm, lọc theo status, priority)
- ✅ Project Members (thêm, xóa, cập nhật role)
- ✅ Kanban Board (xem task theo status)
- ✅ Reports & Statistics (thống kê dự án, task)
- ✅ Admin Panel (quản lý users, system stats)

---

## ❌ Còn Thiếu (Backend có, Frontend chưa có)

### 1. 📎 Task Attachments (File đính kèm Task)
**Mức độ:** ⭐⭐⭐ **QUAN TRỌNG**

**Backend API đã có:**
- `POST /api/project/{projectId}/tasks/{taskId}/attachments` - Upload file
- `GET /api/project/{projectId}/tasks/{taskId}/attachments` - Lấy danh sách attachments
- `DELETE /api/project/{projectId}/tasks/{taskId}/attachments/{attachmentId}` - Xóa attachment
- `GET /api/project/{projectId}/tasks/{taskId}/attachments/{attachmentId}/download` - Download file

**Frontend cần implement:**
- [ ] Thêm section "Attachments" trong task detail modal
- [ ] Upload file button với preview
- [ ] Hiển thị danh sách attachments (tên file, kích thước, ngày upload)
- [ ] Download attachment button
- [ ] Delete attachment button (với confirm)
- [ ] File type validation (chỉ cho phép: pdf, doc, docx, xls, xlsx, png, jpg, jpeg, gif, zip, txt)
- [ ] File size validation (max 10MB)

**File cần sửa:**
- `vanilla-frontend/project-detail.html` - Thêm attachment section vào task modal
- `vanilla-frontend/js/api.js` - Đã có methods, chỉ cần sử dụng

---

### 2. 🔐 Reset Password Page (Đặt lại mật khẩu)
**Mức độ:** ⭐⭐ **QUAN TRỌNG**

**Backend API đã có:**
- `POST /api/auth/reset-password` - Reset password với token

**Frontend cần implement:**
- [ ] Tạo file `vanilla-frontend/reset-password.html`
- [ ] Form nhập: Email, Token (từ email), New Password, Confirm Password
- [ ] Validate token và password
- [ ] Gọi API reset-password
- [ ] Redirect về login sau khi thành công
- [ ] Link từ forgot-password.html đến reset-password.html?token=xxx

**File cần tạo:**
- `vanilla-frontend/reset-password.html` - Trang reset password mới

**File cần sửa:**
- `vanilla-frontend/forgot-password.html` - Thêm link đến reset-password (nếu có token trong URL)

---

### 3. 🖼️ Avatar Upload (Upload ảnh đại diện)
**Mức độ:** ⭐⭐ **QUAN TRỌNG**

**Backend API đã có:**
- `POST /api/user/upload-avatar` - Upload avatar (multipart/form-data)

**Frontend cần implement:**
- [ ] Thêm avatar upload section trong `profile.html`
- [ ] Preview avatar trước khi upload
- [ ] File input với accept="image/*"
- [ ] Crop/resize image (optional, có thể bỏ qua)
- [ ] Hiển thị avatar hiện tại
- [ ] Upload button với progress indicator
- [ ] Cập nhật avatar trong navbar sau khi upload thành công

**File cần sửa:**
- `vanilla-frontend/profile.html` - Thêm avatar upload section
- `vanilla-frontend/js/api.js` - Thêm method `uploadAvatar(file)`

---

### 4. 🔍 Advanced Task Search (Tìm kiếm nâng cao)
**Mức độ:** ⭐ **TÙY CHỌN**

**Backend API đã có:**
- `GET /api/project/{projectId}/tasks/search` - Search với nhiều filters

**Frontend hiện tại:**
- ✅ Có basic search (client-side filter)
- ❌ Chưa có advanced search (server-side với assignee, date range, etc.)

**Frontend cần implement (optional):**
- [ ] Advanced search modal với nhiều filters:
  - Search by assignee
  - Date range (created date, due date)
  - Estimated hours range
  - Multiple status/priority selection
- [ ] Server-side search thay vì client-side filter

**File cần sửa:**
- `vanilla-frontend/project-detail.html` - Thêm advanced search modal

---

### 5. 📊 Export Reports (Xuất báo cáo)
**Mức độ:** ⭐ **TÙY CHỌN**

**Backend API:**
- ❌ Chưa có endpoint export (CSV, PDF, Excel)

**Frontend cần implement (nếu backend thêm API):**
- [ ] Export button trong reports page
- [ ] Chọn format: CSV, PDF, Excel
- [ ] Export project statistics
- [ ] Export task list

**File cần sửa:**
- `vanilla-frontend/reports.html` - Thêm export buttons

---

### 6. 🔔 Real-time Notifications (Thông báo real-time)
**Mức độ:** ⭐⭐ **QUAN TRỌNG (nếu cần)**

**Backend:**
- ✅ Có SignalR hub (theo documentation)
- ❌ Chưa có frontend integration

**Frontend cần implement:**
- [ ] Kết nối SignalR hub
- [ ] Hiển thị notification badge
- [ ] Notification dropdown/modal
- [ ] Real-time updates khi:
  - Task được tạo/cập nhật
  - Member được thêm vào project
  - Task status thay đổi
- [ ] Mark as read functionality

**File cần tạo:**
- `vanilla-frontend/js/signalr.js` - SignalR client connection

**File cần sửa:**
- Tất cả các page - Thêm notification UI

---

### 7. 📱 Responsive Design Improvements
**Mức độ:** ⭐ **TÙY CHỌN**

**Frontend cần cải thiện:**
- [ ] Mobile menu (hamburger menu)
- [ ] Responsive tables (scrollable hoặc card view trên mobile)
- [ ] Touch-friendly buttons và inputs
- [ ] Mobile-optimized modals

**File cần sửa:**
- `vanilla-frontend/css/style.css` - Thêm media queries
- Tất cả HTML files - Cải thiện responsive layout

---

### 8. 🎨 UI/UX Enhancements
**Mức độ:** ⭐ **TÙY CHỌN**

**Frontend cần cải thiện:**
- [ ] Loading skeletons (thay vì spinner)
- [ ] Empty states với illustrations
- [ ] Toast notifications (thay vì alert)
- [ ] Confirmation dialogs (thay vì confirm())
- [ ] Drag & drop cho Kanban board
- [ ] Keyboard shortcuts
- [ ] Dark mode toggle

---

## 📊 Tổng Kết

### Ưu tiên cao (Nên implement):
1. ✅ **Task Attachments** - Tính năng quan trọng cho quản lý task
2. ✅ **Reset Password Page** - Hoàn thiện flow quên mật khẩu
3. ✅ **Avatar Upload** - Cải thiện trải nghiệm người dùng

### Ưu tiên trung bình:
4. ✅ **Real-time Notifications** - Nếu cần tính năng real-time
5. ✅ **Advanced Task Search** - Nếu cần tìm kiếm phức tạp hơn

### Ưu tiên thấp (Nice to have):
6. ✅ **Export Reports** - Nếu cần xuất dữ liệu
7. ✅ **Responsive Design** - Cải thiện mobile experience
8. ✅ **UI/UX Enhancements** - Polish giao diện

---

## 🚀 Hướng Dẫn Implement

### Bước 1: Task Attachments
1. Mở `project-detail.html`
2. Tìm task detail modal
3. Thêm section "Attachments" sau task description
4. Implement upload, list, download, delete functions

### Bước 2: Reset Password
1. Tạo `reset-password.html` (copy từ `forgot-password.html`)
2. Thêm form với token, new password fields
3. Implement API call
4. Update link trong email template (nếu có)

### Bước 3: Avatar Upload
1. Mở `profile.html`
2. Thêm avatar preview và upload button
3. Implement upload function với preview
4. Update navbar avatar sau khi upload

---

**Ghi chú:** Tất cả backend APIs đã sẵn sàng, chỉ cần implement frontend UI và logic.








