/**
 * Authentication Helper Functions
 */

const Auth = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },

  /**
   * Set authentication data
   */
  setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Clear authentication data
   */
  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Logout user
   */
  logout() {
    this.clearAuth();
    window.location.href = 'index.html';
  },

  /**
   * Check if user has admin role
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'Admin';
  },

  /**
   * Require authentication (redirect to login if not authenticated)
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  /**
   * Require admin role
   */
  requireAdmin() {
    if (!this.requireAuth()) return false;
    
    if (!this.isAdmin()) {
      alert('Access denied. Admin only.');
      window.location.href = 'dashboard.html';
      return false;
    }
    
    return true;
  }
};

