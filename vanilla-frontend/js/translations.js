/**
 * Translation Dictionary
 * Contains all translatable strings for English and Vietnamese
 */

const Translations = {
  en: {
    // Common
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      close: 'Close',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      search: 'Search',
      filter: 'Filter',
      actions: 'Actions',
      profile: 'Profile',
      logout: 'Logout',
      language: 'Language',
      english: 'English',
      vietnamese: 'Vietnamese'
    },

    // Auth
    auth: {
      welcomeBack: 'Welcome Back',
      signInToManage: 'Sign in to manage your projects',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      createAccount: 'Create Account',
      signUpToGetStarted: 'Sign up to get started',
      emailAddress: 'Email Address',
      enterEmail: 'Enter your email',
      password: 'Password',
      enterPassword: 'Enter your password',
      fullName: 'Full Name',
      enterFullName: 'Enter your full name',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Confirm your password',
      forgotPassword: 'Forgot password?',
      dontHaveAccount: "Don't have an account?",
      alreadyHaveAccount: 'Already have an account?',
      loginSuccessful: 'Login successful!',
      loginFailed: 'Login failed. Please try again.',
      registrationSuccessful: 'Account created successfully!',
      registrationFailed: 'Registration failed. Please try again.',
      passwordsNotMatch: 'Passwords do not match!'
    },

    // Navigation
    nav: {
      dashboard: 'Dashboard',
      projects: 'Projects',
      teams: 'Teams',
      reports: 'Reports',
      admin: 'Admin',
      taskManage: 'SmartWork'
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of your projects and tasks',
      totalProjects: 'Total Projects',
      completed: 'Completed',
      inProgress: 'In Progress',
      totalTasks: 'Total Tasks',
      recentProjects: 'Recent Projects',
      viewAll: 'View All',
      quickActions: 'Quick Actions',
      createNewProject: 'Create New Project',
      viewAllTasks: 'View All Tasks',
      viewReports: 'View Reports',
      noProjectsYet: 'No projects yet',
      createFirstProject: 'Create your first project to get started',
      createProject: 'Create Project',
      projectName: 'Project Name',
      status: 'Status',
      priority: 'Priority',
      owner: 'Owner',
      created: 'Created',
      action: 'Action',
      failedToLoad: 'Failed to load dashboard data'
    },

    // Projects
    projects: {
      title: 'All Projects',
      subtitle: 'Manage your projects',
      newProject: 'New Project',
      noProjectsYet: 'No projects yet',
      createFirstProject: 'Create your first project to get started',
      createProject: 'Create Project',
      projectName: 'Project Name',
      description: 'Description',
      status: 'Status',
      priority: 'Priority',
      startDate: 'Start Date',
      endDate: 'End Date',
      budget: 'Budget',
      createNewProject: 'Create New Project',
      editProject: 'Edit Project',
      projectCreated: 'Project created successfully!',
      projectUpdated: 'Project updated successfully!',
      projectDeleted: 'Project deleted successfully!',
      deleteProjectConfirm: 'Are you sure you want to delete this project? This action cannot be undone.',
      failedToLoad: 'Failed to load projects',
      failedToCreate: 'Failed to create project',
      failedToUpdate: 'Failed to update project',
      failedToDelete: 'Failed to delete project',
      noDescription: 'No description',
      planning: 'Planning',
      inProgress: 'In Progress',
      completed: 'Completed',
      onHold: 'On Hold',
      cancelled: 'Cancelled',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical'
    },

    // Tasks
    tasks: {
      title: 'Tasks',
      newTask: 'New Task',
      createNewTask: 'Create New Task',
      editTask: 'Edit Task',
      taskTitle: 'Task Title',
      taskName: 'Task Name',
      description: 'Description',
      status: 'Status',
      priority: 'Priority',
      assignee: 'Assignee',
      assignTo: 'Assign To',
      unassigned: '-- Unassigned --',
      selectMember: 'Select a project member to assign this task',
      dueDate: 'Due Date',
      todo: 'Todo',
      inProgress: 'In Progress',
      inReview: 'In Review',
      done: 'Done',
      cancelled: 'Cancelled',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
      critical: 'Critical',
      noTasks: 'No tasks yet. Create your first task!',
      noTasksMatch: 'No tasks match your filters.',
      taskCreated: 'Task created successfully!',
      taskUpdated: 'Task updated successfully!',
      taskDeleted: 'Task deleted successfully!',
      deleteTaskConfirm: 'Are you sure you want to delete this task?',
      assign: 'Assign',
      assignTeam: 'Assign Team',
      selectTeam: 'Select a team to assign this task',
      allStatus: 'All Status',
      allPriority: 'All Priority',
      clearFilters: 'Clear Filters'
    },

    // Comments
    comments: {
      title: 'Comments',
      noComments: 'No comments yet. Be the first to comment!',
      writeComment: 'Write a comment...',
      post: 'Post',
      editComment: 'Edit Comment',
      deleteComment: 'Delete Comment',
      deleteConfirm: 'Are you sure you want to delete this comment?',
      commentAdded: 'Comment added successfully!',
      commentUpdated: 'Comment updated successfully!',
      commentDeleted: 'Comment deleted successfully!',
      failedToLoad: 'Failed to load comments',
      failedToAdd: 'Failed to add comment',
      failedToUpdate: 'Failed to update comment',
      failedToDelete: 'Failed to delete comment',
      enterComment: 'Please enter a comment',
      commentEmpty: 'Comment cannot be empty'
    },

    // Activity Logs
    activity: {
      history: 'Activity History',
      noActivities: 'No activity history yet.',
      failedToLoad: 'Failed to load activity history',
      createdTask: 'created task',
      updatedTask: 'updated task',
      deletedTask: 'deleted task',
      changedStatus: 'changed status from {old} to {new}',
      changedPriority: 'changed priority from {old} to {new}',
      changedTitle: 'changed title',
      changedAssignee: 'changed assignee'
    },

    // Teams
    teams: {
      title: 'Teams',
      subtitle: 'Manage your teams',
      createTeam: '+ Create Team',
      teamName: 'Team Name',
      description: 'Description',
      leader: 'Team Leader',
      selectLeader: '-- Select a leader --',
      selectLeaderHelp: 'Select a user to be the team leader',
      teamDetails: 'Team Details',
      linkedProjects: 'Linked Projects',
      addProject: '+ Add Project',
      selectProject: 'Select Project',
      chooseProject: '-- Choose a project --',
      noLinkedProjects: 'No linked projects yet',
      noTeamsYet: 'No teams yet',
      createFirstTeam: 'Create your first team to get started'
    },

    // Admin
    admin: {
      tabUsers: '👥 User Management',
      tabDepartments: '🏢 Quản lý Phòng ban',
      tabPositions: '💼 Quản lý Chức vụ',
      departments: 'Departments',
      positions: 'Positions',
      addDepartment: 'Add Department',
      addPosition: 'Add Position',
      departmentName: 'Department Name',
      departmentCode: 'Department Code',
      positionName: 'Position Name',
      positionCode: 'Position Code',
      workflowGroup: 'Workflow Group',
      assignDepartmentPosition: 'Assign Department & Position',
      projectRole: 'Project Role',
      editProjectRole: 'Edit Project Role',
      projectRoleCode: 'Project Role Code'
    },

    // Status & Priority
    status: {
      planning: 'Planning',
      inProgress: 'In Progress',
      completed: 'Completed',
      onHold: 'On Hold',
      cancelled: 'Cancelled',
      todo: 'Todo',
      inReview: 'In Review',
      done: 'Done'
    },

    priority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
      urgent: 'Urgent'
    },

    // Reports
    reports: {
      title: 'Reports & Analytics',
      subtitle: 'View statistics and insights',
      overallStatistics: 'Overall Statistics',
      totalProjects: 'Total Projects',
      totalTasks: 'Total Tasks',
      completedTasks: 'Completed Tasks',
      activeUsers: 'Active Users',
      projectStatistics: 'Project Statistics',
      taskStatistics: 'Task Statistics',
      statusDistribution: 'Status Distribution',
      priorityDistribution: 'Priority Distribution',
      byStatus: 'Tasks by Status',
      byPriority: 'Tasks by Priority'
    },

    // Messages
    messages: {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      confirmAction: 'Are you sure?',
      actionCannotUndone: 'This action cannot be undone.'
    }
  },

  vi: {
    // Common
    common: {
      loading: 'Đang tải...',
      save: 'Lưu',
      cancel: 'Hủy',
      delete: 'Xóa',
      edit: 'Sửa',
      view: 'Xem',
      close: 'Đóng',
      confirm: 'Xác nhận',
      yes: 'Có',
      no: 'Không',
      search: 'Tìm kiếm',
      filter: 'Lọc',
      actions: 'Thao tác',
      profile: 'Hồ sơ',
      logout: 'Đăng xuất',
      language: 'Ngôn ngữ',
      english: 'Tiếng Anh',
      vietnamese: 'Tiếng Việt'
    },

    // Auth
    auth: {
      welcomeBack: 'Chào mừng trở lại',
      signInToManage: 'Đăng nhập để quản lý dự án của bạn',
      signIn: 'Đăng nhập',
      signUp: 'Đăng ký',
      createAccount: 'Tạo tài khoản',
      signUpToGetStarted: 'Đăng ký để bắt đầu',
      emailAddress: 'Địa chỉ Email',
      enterEmail: 'Nhập email của bạn',
      password: 'Mật khẩu',
      enterPassword: 'Nhập mật khẩu của bạn',
      fullName: 'Họ và tên',
      enterFullName: 'Nhập họ và tên của bạn',
      confirmPassword: 'Xác nhận mật khẩu',
      confirmPasswordPlaceholder: 'Xác nhận mật khẩu của bạn',
      forgotPassword: 'Quên mật khẩu?',
      dontHaveAccount: 'Chưa có tài khoản?',
      alreadyHaveAccount: 'Đã có tài khoản?',
      loginSuccessful: 'Đăng nhập thành công!',
      loginFailed: 'Đăng nhập thất bại. Vui lòng thử lại.',
      registrationSuccessful: 'Tạo tài khoản thành công!',
      registrationFailed: 'Đăng ký thất bại. Vui lòng thử lại.',
      passwordsNotMatch: 'Mật khẩu không khớp!'
    },

    // Navigation
    nav: {
      dashboard: 'Bảng điều khiển',
      projects: 'Dự án',
      teams: 'Teams',
      reports: 'Báo cáo',
      admin: 'Quản trị',
      taskManage: 'SmartWork'
    },

    // Dashboard
    dashboard: {
      title: 'Bảng điều khiển',
      subtitle: 'Tổng quan về dự án và công việc của bạn',
      totalProjects: 'Tổng dự án',
      completed: 'Hoàn thành',
      inProgress: 'Đang thực hiện',
      totalTasks: 'Tổng công việc',
      recentProjects: 'Dự án gần đây',
      viewAll: 'Xem tất cả',
      quickActions: 'Thao tác nhanh',
      createNewProject: 'Tạo dự án mới',
      viewAllTasks: 'Xem tất cả công việc',
      viewReports: 'Xem báo cáo',
      noProjectsYet: 'Chưa có dự án nào',
      createFirstProject: 'Tạo dự án đầu tiên của bạn để bắt đầu',
      createProject: 'Tạo dự án',
      projectName: 'Tên dự án',
      status: 'Trạng thái',
      priority: 'Độ ưu tiên',
      owner: 'Chủ sở hữu',
      created: 'Ngày tạo',
      action: 'Thao tác'
    },

    // Projects
    projects: {
      title: 'Tất cả dự án',
      subtitle: 'Quản lý dự án của bạn',
      newProject: 'Dự án mới',
      noProjectsYet: 'Chưa có dự án nào',
      createFirstProject: 'Tạo dự án đầu tiên của bạn để bắt đầu',
      createProject: 'Tạo dự án',
      projectName: 'Tên dự án',
      description: 'Mô tả',
      status: 'Trạng thái',
      priority: 'Độ ưu tiên',
      startDate: 'Ngày bắt đầu',
      endDate: 'Ngày kết thúc',
      budget: 'Ngân sách',
      createNewProject: 'Tạo dự án mới',
      editProject: 'Chỉnh sửa dự án',
      projectCreated: 'Tạo dự án thành công!',
      projectUpdated: 'Cập nhật dự án thành công!',
      projectDeleted: 'Xóa dự án thành công!',
      deleteProjectConfirm: 'Bạn có chắc chắn muốn xóa dự án này? Hành động này không thể hoàn tác.',
      failedToLoad: 'Không thể tải danh sách dự án',
      failedToCreate: 'Không thể tạo dự án',
      failedToUpdate: 'Không thể cập nhật dự án',
      failedToDelete: 'Không thể xóa dự án',
      noDescription: 'Không có mô tả',
      planning: 'Lập kế hoạch',
      inProgress: 'Đang thực hiện',
      completed: 'Hoàn thành',
      onHold: 'Tạm dừng',
      cancelled: 'Đã hủy',
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
      critical: 'Rất cao'
    },

    // Tasks
    tasks: {
      title: 'Công việc',
      newTask: 'Công việc mới',
      createNewTask: 'Tạo công việc mới',
      editTask: 'Chỉnh sửa công việc',
      taskTitle: 'Tiêu đề công việc',
      taskName: 'Tên công việc',
      description: 'Mô tả',
      status: 'Trạng thái',
      priority: 'Độ ưu tiên',
      assignee: 'Người được giao',
      assignTo: 'Giao cho',
      unassigned: '-- Chưa giao --',
      selectMember: 'Chọn thành viên dự án để giao công việc này',
      dueDate: 'Hạn chót',
      todo: 'Cần làm',
      inProgress: 'Đang thực hiện',
      inReview: 'Đang xem xét',
      done: 'Hoàn thành',
      cancelled: 'Đã hủy',
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
      urgent: 'Khẩn cấp',
      critical: 'Rất cao',
      noTasks: 'Chưa có công việc nào. Tạo công việc đầu tiên của bạn!',
      noTasksMatch: 'Không có công việc nào khớp với bộ lọc của bạn.',
      taskCreated: 'Tạo công việc thành công!',
      taskUpdated: 'Cập nhật công việc thành công!',
      taskDeleted: 'Xóa công việc thành công!',
      deleteTaskConfirm: 'Bạn có chắc chắn muốn xóa công việc này?',
      assign: 'Giao việc',
      assignTeam: 'Gán Team',
      selectTeam: 'Chọn team để gán công việc này',
      allStatus: 'Tất cả trạng thái',
      allPriority: 'Tất cả độ ưu tiên',
      clearFilters: 'Xóa bộ lọc'
    },

    // Comments
    comments: {
      title: 'Bình luận',
      noComments: 'Chưa có bình luận nào. Hãy là người đầu tiên bình luận!',
      writeComment: 'Viết bình luận...',
      post: 'Đăng',
      editComment: 'Chỉnh sửa bình luận',
      deleteComment: 'Xóa bình luận',
      deleteConfirm: 'Bạn có chắc chắn muốn xóa bình luận này?',
      commentAdded: 'Thêm bình luận thành công!',
      commentUpdated: 'Cập nhật bình luận thành công!',
      commentDeleted: 'Xóa bình luận thành công!',
      failedToLoad: 'Không thể tải bình luận',
      failedToAdd: 'Không thể thêm bình luận',
      failedToUpdate: 'Không thể cập nhật bình luận',
      failedToDelete: 'Không thể xóa bình luận',
      enterComment: 'Vui lòng nhập bình luận',
      commentEmpty: 'Bình luận không được để trống'
    },

    // Activity Logs
    activity: {
      history: 'Lịch sử hoạt động',
      noActivities: 'Chưa có lịch sử hoạt động.',
      failedToLoad: 'Không thể tải lịch sử hoạt động',
      createdTask: 'đã tạo công việc',
      updatedTask: 'đã cập nhật công việc',
      deletedTask: 'đã xóa công việc',
      changedStatus: 'đã đổi trạng thái từ {old} sang {new}',
      changedPriority: 'đã đổi độ ưu tiên từ {old} sang {new}',
      changedTitle: 'đã đổi tiêu đề',
      changedAssignee: 'đã đổi người được giao'
    },

    // Teams
    teams: {
      title: 'Teams',
      subtitle: 'Quản lý teams của bạn',
      createTeam: '+ Tạo Team',
      teamName: 'Tên Team',
      description: 'Mô tả',
      leader: 'Team Leader',
      selectLeader: '-- Chọn leader --',
      selectLeaderHelp: 'Chọn một user làm team leader',
      teamDetails: 'Chi tiết Team',
      linkedProjects: 'Dự án đã liên kết',
      addProject: '+ Thêm Dự án',
      selectProject: 'Chọn Dự án',
      chooseProject: '-- Chọn một dự án --',
      noLinkedProjects: 'Chưa có dự án nào được liên kết',
      noTeamsYet: 'Chưa có team nào',
      createFirstTeam: 'Tạo team đầu tiên của bạn để bắt đầu'
    },

    // Admin
    admin: {
      tabUsers: '👥 Quản lý Người dùng',
      tabDepartments: '🏢 Quản lý Phòng ban',
      tabPositions: '💼 Quản lý Chức vụ',
      departments: 'Phòng ban',
      positions: 'Chức vụ',
      addDepartment: 'Thêm Phòng ban',
      addPosition: 'Thêm Chức vụ',
      departmentName: 'Tên Phòng ban',
      departmentCode: 'Mã Phòng ban',
      positionName: 'Tên Chức vụ',
      positionCode: 'Mã Chức vụ',
      workflowGroup: 'Nhóm Workflow',
      assignDepartmentPosition: 'Gán Phòng ban & Chức vụ',
      projectRole: 'Vai trò trong Dự án',
      editProjectRole: 'Chỉnh sửa Vai trò Dự án',
      projectRoleCode: 'Mã Vai trò Dự án'
    },

    // Status & Priority
    status: {
      planning: 'Lập kế hoạch',
      inProgress: 'Đang thực hiện',
      completed: 'Hoàn thành',
      onHold: 'Tạm dừng',
      cancelled: 'Đã hủy',
      todo: 'Cần làm',
      inReview: 'Đang xem xét',
      done: 'Hoàn thành'
    },

    priority: {
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
      critical: 'Rất cao',
      urgent: 'Khẩn cấp'
    },

    // Reports
    reports: {
      title: 'Báo cáo & Phân tích',
      subtitle: 'Xem thống kê và thông tin chi tiết',
      overallStatistics: 'Thống kê tổng quan',
      totalProjects: 'Tổng dự án',
      totalTasks: 'Tổng công việc',
      completedTasks: 'Công việc đã hoàn thành',
      activeUsers: 'Người dùng hoạt động',
      projectStatistics: 'Thống kê dự án',
      taskStatistics: 'Thống kê công việc',
      statusDistribution: 'Phân bổ trạng thái',
      priorityDistribution: 'Phân bổ độ ưu tiên',
      byStatus: 'Công việc theo trạng thái',
      byPriority: 'Công việc theo độ ưu tiên'
    },

    // Messages
    messages: {
      success: 'Thành công',
      error: 'Lỗi',
      warning: 'Cảnh báo',
      info: 'Thông tin',
      confirmAction: 'Bạn có chắc chắn?',
      actionCannotUndone: 'Hành động này không thể hoàn tác.'
    }
  }
};

