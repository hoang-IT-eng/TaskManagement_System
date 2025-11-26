/**
 * Utility Functions
 */

const Utils = {
  /**
   * Show loading overlay
   */
  showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = '<div class="loading"></div>';
    document.body.appendChild(overlay);
  },

  /**
   * Hide loading overlay
   */
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.remove();
    }
  },

  /**
   * Show alert message
   */
  showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fade-in`;
    alert.textContent = message;
    alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      alert.remove();
    }, 5000);
  },

  /**
   * Format date to readable string
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Format date for input type="date"
   */
  formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  },

  /**
   * Format number with commas
   */
  formatNumber(number) {
    return number ? number.toLocaleString() : '0';
  },

  /**
   * Get user initials from name
   */
  getUserInitials(fullName) {
    if (!fullName) return '?';
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  },

  /**
   * Get project initials from name
   */
  getProjectInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  },

  /**
   * Get badge color class for status
   */
  getStatusBadgeClass(status) {
    const statusColors = {
      'Completed': 'badge-success',
      'Done': 'badge-success',
      'InProgress': 'badge-primary',
      'InReview': 'badge-info',
      'Planning': 'badge-secondary',
      'OnHold': 'badge-warning',
      'Cancelled': 'badge-danger',
      'Todo': 'badge-secondary'
    };
    return statusColors[status] || 'badge-secondary';
  },

  /**
   * Get badge color class for priority
   */
  getPriorityBadgeClass(priority) {
    const priorityColors = {
      'Critical': 'badge-danger',
      'Urgent': 'badge-danger',
      'High': 'badge-warning',
      'Medium': 'badge-info',
      'Low': 'badge-secondary'
    };
    return priorityColors[priority] || 'badge-secondary';
  },

  /**
   * Confirm action with user
   */
  async confirm(message) {
    return window.confirm(message);
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Create modal
   */
  createModal(title, bodyHTML, onSave) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const cancelText = typeof I18n !== 'undefined' ? I18n.t('common.cancel', 'Cancel') : 'Cancel';
    const saveText = typeof I18n !== 'undefined' ? I18n.t('common.save', 'Save') : 'Save';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">${title}</div>
        <div class="modal-body">${bodyHTML}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modalCancelBtn" data-i18n="common.cancel">${cancelText}</button>
          <button class="btn btn-primary" id="modalSaveBtn" data-i18n="common.save">${saveText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Apply translations if I18n is available
    if (typeof I18n !== 'undefined') {
      I18n.applyTranslations();
    }
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    // Close on cancel
    document.getElementById('modalCancelBtn').addEventListener('click', () => {
      overlay.remove();
    });
    
    // Save button
    document.getElementById('modalSaveBtn').addEventListener('click', async () => {
      if (onSave) {
        try {
          await onSave();
          // Only close modal if onSave succeeds
          overlay.remove();
        } catch (error) {
          // Don't close modal on error - let user see the error message
          console.error('Modal save error:', error);
        }
      } else {
        overlay.remove();
      }
    });
    
    return overlay;
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Get query parameter from URL
   */
  getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
};

