/**
 * API Service - Vanilla JavaScript
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get auth token from localStorage
   */
  getToken() {
    return localStorage.getItem('token');
  }

  /**
   * Get default headers with auth token
   */
  getHeaders(contentType = 'application/json') {
    const headers = {
      'Content-Type': contentType,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        // Only redirect on 401 if we're not already on login page
        if (response.status === 401 && !window.location.pathname.includes('index.html')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = 'index.html';
        }
        // Log detailed error for debugging
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          data: data
        });
        throw new Error(data.message || data.error || `API Error: ${response.status} ${response.statusText}`);
      }
      
      return data.data || data;
    }

    if (!response.ok) {
      // Only redirect on 401 if we're not already on login page
      if (response.status === 401 && !window.location.pathname.includes('index.html')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
      }
      // Try to get text response for non-JSON errors
      let errorText = `HTTP Error ${response.status}`;
      try {
        const text = await response.text();
        if (text) errorText = text;
      } catch (e) {
        // Ignore if can't read text
      }
      console.error('HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorText: errorText
      });
      throw new Error(errorText);
    }

    return response;
  }

  /**
   * Make GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseURL}${endpoint}${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  /**
   * Make POST request
   */
  async post(endpoint, data = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  /**
   * Make PUT request
   */
  async put(endpoint, data = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  /**
   * Make DELETE request
   */
  async delete(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  /**
   * Upload file (multipart/form-data)
   */
  async uploadFile(endpoint, formData) {
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    return this.handleResponse(response);
  }

  // ==================== AUTH APIs ====================
  
  async login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  async register(email, password, fullName) {
    return this.post('/auth/register', { email, password, fullName });
  }

  async getProfile() {
    return this.get('/auth/profile');
  }

  // ==================== PROJECT APIs ====================
  
  async getProjects() {
    return this.get('/project');
  }

  async getProject(id) {
    return this.get(`/project/${id}`);
  }

  async createProject(data) {
    return this.post('/project', data);
  }

  async updateProject(id, data) {
    return this.put(`/project/${id}`, data);
  }

  async deleteProject(id) {
    return this.delete(`/project/${id}`);
  }

  // ==================== TASK APIs ====================
  
  async getProjectTasks(projectId) {
    return this.get(`/project/${projectId}/tasks`);
  }

  async getTask(projectId, taskId) {
    return this.get(`/project/${projectId}/tasks/${taskId}`);
  }

  async createTask(projectId, data) {
    return this.post(`/project/${projectId}/tasks`, data);
  }

  async updateTask(projectId, taskId, data) {
    return this.put(`/project/${projectId}/tasks/${taskId}`, data);
  }

  async deleteTask(projectId, taskId) {
    return this.delete(`/project/${projectId}/tasks/${taskId}`);
  }

  async searchTasks(projectId, params) {
    return this.get(`/project/${projectId}/tasks/search`, params);
  }

  // ==================== PROJECT MEMBER APIs ====================
  
  async getProjectMembers(projectId) {
    return this.get(`/project/${projectId}/members`);
  }

  async addProjectMember(projectId, userId, role) {
    return this.post(`/project/${projectId}/members`, { 
      UserId: userId, 
      Role: role 
    });
  }

  async updateMemberRole(projectId, memberId, role) {
    return this.put(`/project/${projectId}/members/${memberId}/role`, { 
      Role: role 
    });
  }

  async removeMember(projectId, memberId) {
    return this.delete(`/project/${projectId}/members/${memberId}`);
  }

  async getAvailableUsers(projectId) {
    return this.get(`/project/${projectId}/members/available-users`);
  }

  // ==================== REPORT APIs ====================
  
  async getProjectStatistics(projectId) {
    return this.get(`/reports/project/${projectId}/statistics`);
  }

  async getUserStatistics(userId) {
    return this.get(`/reports/user/${userId}/statistics`);
  }

  async getMyProjectsStatistics() {
    return this.get('/reports/my-projects/statistics');
  }

  async getOverallStatistics() {
    return this.get('/reports/overall-statistics');
  }

  // ==================== ADMIN APIs ====================
  
  async getAllUsers(page = 1, pageSize = 20) {
    return this.get('/admin/users', { page, pageSize });
  }

  async updateUserRole(userId, role) {
    return this.put(`/admin/users/${userId}/role`, { role });
  }

  async deactivateUser(userId) {
    return this.post(`/admin/users/${userId}/deactivate`);
  }

  async getSystemStatistics() {
    return this.get('/admin/system-statistics');
  }

  // ==================== ATTACHMENT APIs ====================
  
  async uploadAttachment(projectId, taskId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.uploadFile(`/project/${projectId}/tasks/${taskId}/attachments`, formData);
  }

  async getAttachments(projectId, taskId) {
    return this.get(`/project/${projectId}/tasks/${taskId}/attachments`);
  }

  async deleteAttachment(projectId, taskId, attachmentId) {
    return this.delete(`/project/${projectId}/tasks/${taskId}/attachments/${attachmentId}`);
  }

  async downloadAttachment(projectId, taskId, attachmentId) {
    const token = this.getToken();
    const url = `${this.baseURL}/project/${projectId}/tasks/${taskId}/attachments/${attachmentId}/download`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'attachment';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      throw new Error(error.message || 'Failed to download attachment');
    }
  }

  // ==================== COMMENT APIs ====================
  
  /**
   * Get all comments for a task
   */
  async getTaskComments(projectId, taskId) {
    return this.get(`/project/${projectId}/tasks/${taskId}/comments`);
  }

  /**
   * Add a new comment to a task
   */
  async addComment(projectId, taskId, content) {
    return this.post(`/project/${projectId}/tasks/${taskId}/comments`, {
      taskId: taskId,
      content: content
    });
  }

  /**
   * Update a comment
   */
  async updateComment(projectId, taskId, commentId, content) {
    return this.put(`/project/${projectId}/tasks/${taskId}/comments/${commentId}`, {
      content: content
    });
  }

  /**
   * Delete a comment
   */
  async deleteComment(projectId, taskId, commentId) {
    return this.delete(`/project/${projectId}/tasks/${taskId}/comments/${commentId}`);
  }

  // ==================== ACTIVITY LOG APIs ====================
  
  /**
   * Get activity logs for a task
   */
  async getTaskActivities(projectId, taskId) {
    return this.get(`/project/${projectId}/tasks/${taskId}/activities`);
  }

  // ==================== DEPARTMENT APIs ====================
  
  /**
   * Get all departments
   */
  async getDepartments() {
    return this.get('/admin/departments');
  }

  /**
   * Get department by ID
   */
  async getDepartment(departmentId) {
    return this.get(`/admin/departments/${departmentId}`);
  }

  /**
   * Create department
   */
  async createDepartment(data) {
    return this.post('/admin/departments', data);
  }

  /**
   * Update department
   */
  async updateDepartment(departmentId, data) {
    return this.put(`/admin/departments/${departmentId}`, data);
  }

  /**
   * Delete department
   */
  async deleteDepartment(departmentId) {
    return this.delete(`/admin/departments/${departmentId}`);
  }

  // ==================== POSITION APIs ====================
  
  /**
   * Get all positions
   */
  async getPositions() {
    return this.get('/admin/positions');
  }

  /**
   * Get position by ID
   */
  async getPosition(positionId) {
    return this.get(`/admin/positions/${positionId}`);
  }

  /**
   * Create position
   */
  async createPosition(data) {
    return this.post('/admin/positions', data);
  }

  /**
   * Update position
   */
  async updatePosition(positionId, data) {
    return this.put(`/admin/positions/${positionId}`, data);
  }

  /**
   * Delete position
   */
  async deletePosition(positionId) {
    return this.delete(`/admin/positions/${positionId}`);
  }

  // ==================== USER MANAGEMENT APIs ====================
  
  /**
   * Update user department and position
   */
  async updateUserDepartmentAndPosition(userId, departmentId, positionId) {
    return this.put(`/admin/users/${userId}/department-position`, {
      departmentId: departmentId,
      positionId: positionId
    });
  }

  /**
   * Update project member role code
   */
  async updateProjectMemberRoleCode(projectId, memberId, projectRoleCode) {
    return this.put(`/project/${projectId}/members/${memberId}/role-code`, {
      projectRoleCode: projectRoleCode
    });
  }

  // ==================== TEAM APIs ====================
  
  /**
   * Get team by ID (includes linked projects)
   */
  async getTeamById(teamId) {
    return this.get(`/teams/${teamId}`);
  }

  /**
   * Add project to team
   */
  async addProjectToTeam(teamId, projectId) {
    return this.post(`/teams/${teamId}/projects`, {
      teamId: teamId,
      projectId: projectId
    });
  }

  /**
   * Remove project from team
   */
  async removeProjectFromTeam(teamId, projectId) {
    return this.delete(`/teams/${teamId}/projects/${projectId}`);
  }

  /**
   * Get all teams
   */
  async getAllTeams() {
    return this.get('/teams');
  }

  /**
   * Get teams that current user is a member of (leader or member of linked projects)
   */
  async getMyTeams() {
    return this.get('/teams/my-teams');
  }

  /**
   * Create team
   */
  async createTeam(data) {
    return this.post('/teams', data);
  }

  /**
   * Get available leaders for team
   */
  async getAvailableLeaders() {
    return this.get('/teams/available-leaders');
  }

  /**
   * Update team
   */
  async updateTeam(teamId, data) {
    return this.put(`/teams/${teamId}`, data);
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId) {
    return this.delete(`/teams/${teamId}`);
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId) {
    return this.get(`/teams/${teamId}/members`);
  }

  /**
   * Add member to team
   */
  async addTeamMember(teamId, userId, positionId) {
    return this.post(`/teams/${teamId}/members`, {
      userId: userId,
      positionId: positionId || null
    });
  }

  /**
   * Remove member from team
   */
  async removeTeamMember(teamId, userId) {
    return this.delete(`/teams/${teamId}/members/${userId}`);
  }

  /**
   * Update team member position
   */
  async updateTeamMemberPosition(teamId, userId, positionId) {
    return this.put(`/teams/${teamId}/members/${userId}/position`, {
      positionId: positionId || null
    });
  }

  /**
   * Get available users for team (users not yet in team)
   */
  async getAvailableUsersForTeam(teamId) {
    return this.get(`/teams/${teamId}/members/available-users`);
  }
}

// Create singleton instance
const api = new ApiService();

