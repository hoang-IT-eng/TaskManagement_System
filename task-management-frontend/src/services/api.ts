import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Project,
  CreateProjectRequest,
  ProjectTask,
  CreateTaskRequest,
  TaskAttachment,
  TaskStatistics,
  UserTaskStatistics,
  ProjectStatistics,
  ProjectMember,
  ApiResponse,
  User
} from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth APIs
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return response.data.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    return response.data.data;
  }

  async getProfile(): Promise<User> {
    const response = await this.api.get<ApiResponse<User>>('/auth/profile');
    return response.data.data;
  }

  // Project APIs
  async getProjects(): Promise<Project[]> {
    const response = await this.api.get<ApiResponse<Project[]>>('/project');
    return response.data.data;
  }

  async getProject(id: number): Promise<Project> {
    const response = await this.api.get<ApiResponse<Project>>(`/project/${id}`);
    return response.data.data;
  }

  async createProject(project: CreateProjectRequest): Promise<Project> {
    const response = await this.api.post<ApiResponse<Project>>('/project', project);
    return response.data.data;
  }

  async updateProject(id: number, project: CreateProjectRequest): Promise<Project> {
    const response = await this.api.put<ApiResponse<Project>>(`/project/${id}`, project);
    return response.data.data;
  }

  async deleteProject(id: number): Promise<void> {
    await this.api.delete(`/project/${id}`);
  }

  // Task APIs
  async getProjectTasks(projectId: number): Promise<ProjectTask[]> {
    const response = await this.api.get<ApiResponse<ProjectTask[]>>(`/project/${projectId}/tasks`);
    return response.data.data;
  }

  async getTask(projectId: number, taskId: number): Promise<ProjectTask> {
    const response = await this.api.get<ApiResponse<ProjectTask>>(`/project/${projectId}/tasks/${taskId}`);
    return response.data.data;
  }

  async createTask(projectId: number, task: CreateTaskRequest): Promise<ProjectTask> {
    const response = await this.api.post<ApiResponse<ProjectTask>>(`/project/${projectId}/tasks`, task);
    return response.data.data;
  }

  async updateTask(projectId: number, taskId: number, task: CreateTaskRequest): Promise<ProjectTask> {
    const response = await this.api.put<ApiResponse<ProjectTask>>(`/project/${projectId}/tasks/${taskId}`, task);
    return response.data.data;
  }

  async deleteTask(projectId: number, taskId: number): Promise<void> {
    await this.api.delete(`/project/${projectId}/tasks/${taskId}`);
  }

  async searchTasks(projectId: number, params: any): Promise<ProjectTask[]> {
    const response = await this.api.get<ApiResponse<ProjectTask[]>>(`/project/${projectId}/tasks/search`, { params });
    return response.data.data;
  }

  // Task Attachment APIs
  async uploadAttachment(projectId: number, taskId: number, file: File): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.post<ApiResponse<TaskAttachment>>(
      `/project/${projectId}/tasks/${taskId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  async getAttachments(projectId: number, taskId: number): Promise<TaskAttachment[]> {
    const response = await this.api.get<ApiResponse<TaskAttachment[]>>(
      `/project/${projectId}/tasks/${taskId}/attachments`
    );
    return response.data.data;
  }

  async downloadAttachment(projectId: number, taskId: number, attachmentId: number): Promise<Blob> {
    const response = await this.api.get(
      `/project/${projectId}/tasks/${taskId}/attachments/${attachmentId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  async deleteAttachment(projectId: number, taskId: number, attachmentId: number): Promise<void> {
    await this.api.delete(`/project/${projectId}/tasks/${taskId}/attachments/${attachmentId}`);
  }

  // Statistics APIs
  async getProjectStatistics(projectId: number): Promise<TaskStatistics> {
    const response = await this.api.get<ApiResponse<TaskStatistics>>(`/reports/project/${projectId}/statistics`);
    return response.data.data;
  }

  async getUserStatistics(userId: number): Promise<UserTaskStatistics> {
    const response = await this.api.get<ApiResponse<UserTaskStatistics>>(`/reports/user/${userId}/statistics`);
    return response.data.data;
  }

  async getMyProjectsStatistics(): Promise<ProjectStatistics[]> {
    const response = await this.api.get<ApiResponse<ProjectStatistics[]>>('/reports/my-projects/statistics');
    return response.data.data;
  }

  // Project Member APIs
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    const response = await this.api.get<ApiResponse<ProjectMember[]>>(`/project/${projectId}/members`);
    return response.data.data;
  }

  async addProjectMember(projectId: number, userId: number, role: number): Promise<ProjectMember> {
    const response = await this.api.post<ApiResponse<ProjectMember>>(`/project/${projectId}/members`, {
      userId,
      role
    });
    return response.data.data;
  }

  async updateMemberRole(projectId: number, memberId: number, newRole: number): Promise<ProjectMember> {
    const response = await this.api.put<ApiResponse<ProjectMember>>(
      `/project/${projectId}/members/${memberId}/role`,
      { newRole }
    );
    return response.data.data;
  }

  async removeMember(projectId: number, memberId: number): Promise<void> {
    await this.api.delete(`/project/${projectId}/members/${memberId}`);
  }

  // Admin APIs
  async getAllUsers(page: number = 1, pageSize: number = 20): Promise<{ data: User[]; total: number }> {
    const response = await this.api.get(`/admin/users`, { params: { page, pageSize } });
    return response.data;
  }

  async updateUserRole(userId: number, role: string): Promise<User> {
    const response = await this.api.put<ApiResponse<User>>(`/admin/users/${userId}/role`, { role });
    return response.data.data;
  }

  async deactivateUser(userId: number): Promise<void> {
    await this.api.post(`/admin/users/${userId}/deactivate`);
  }

  async getSystemStatistics(): Promise<any> {
    const response = await this.api.get('/admin/system-statistics');
    return response.data.data;
  }
}

export const apiService = new ApiService();


