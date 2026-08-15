/**
 * utils.js - General utility functions (toasts, confirmation modal, date calculations, validation, formatting)
 */

const utils = {
  // Generate random safe ID
  generateId(prefix = 'id') {
    return prefix + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  },

  // Format date to readable string (e.g. 14 Jul 2026)
  formatDate(dateStr, includeTime = false) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return date.toLocaleDateString('en-US', options);
  },

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  },

  // Date difference in nights
  calculateNights(checkInDate, checkOutDate) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Toast Notifications
  showToast(message, type = 'success') {
    // Check if container exists, else create
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close-btn">&times;</button>
    `;
    
    // Add toast to container
    container.appendChild(toast);

    // Click to close
    toast.querySelector('.toast-close-btn').addEventListener('click', () => {
      toast.remove();
    });

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  },

  // Custom Modal Confirmation Dialog
  confirm(title, message, callback) {
    const modalId = 'global-confirm-modal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-content modal-confirm">
          <div class="modal-header">
            <h3 id="confirm-title">Confirm Action</h3>
            <button class="modal-close-btn" id="confirm-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirm-message">Are you sure you want to proceed?</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
            <button class="btn btn-danger" id="confirm-ok-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    modal.style.display = 'flex';

    const cleanUp = () => {
      modal.style.display = 'none';
      // Remove event listeners
      document.getElementById('confirm-ok-btn').replaceWith(document.getElementById('confirm-ok-btn').cloneNode(true));
      document.getElementById('confirm-cancel-btn').replaceWith(document.getElementById('confirm-cancel-btn').cloneNode(true));
      document.getElementById('confirm-close-btn').replaceWith(document.getElementById('confirm-close-btn').cloneNode(true));
    };

    document.getElementById('confirm-close-btn').addEventListener('click', cleanUp);
    document.getElementById('confirm-cancel-btn').addEventListener('click', cleanUp);
    
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
      callback();
      cleanUp();
    });
  },

  // Simple Email Validation
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },

  // Simple Phone Validation
  validatePhone(phone) {
    const re = /^\+?[0-9\s\-()]{7,15}$/;
    return re.test(String(phone));
  }
};

window.utils = utils;
