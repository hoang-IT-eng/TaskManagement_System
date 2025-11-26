// User & Auth Types
export interface User {
  userId: number;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Project Types
export interface Project {
  projectId: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  ownerId: number;
  ownerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
}

// Task Types
export type TaskStatus = 'Todo' | 'InProgress' | 'InReview' | 'Done' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ProjectTask {
  taskId: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: number;
  assigneeName?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  dueDate?: string;
  estimatedHours?: number;
}

// Task Attachment Types
export interface TaskAttachment {
  attachmentId: number;
  taskId: number;
  fileName: string;
  filePath: string;
  contentType: string;
  fileSize: number;
  uploadedById: number;
  uploadedBy?: User;
  uploadedAt: string;
}

// Statistics Types
export interface TaskStatistics {
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface UserTaskStatistics {
  userId: number;
  userName: string;
  assignedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface ProjectStatistics {
  projectId: number;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  tasksByStatus: Record<string, number>;
}

// Project Member Types
export enum ProjectRole {
  Owner = 1,
  Admin = 2,
  Member = 3,
  Viewer = 4
}

export interface ProjectMember {
  projectMemberId: number;
  projectId: number;
  userId: number;
  userName: string;
  userEmail: string;
  role: ProjectRole;
  joinedAt: string;
  isActive: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}


