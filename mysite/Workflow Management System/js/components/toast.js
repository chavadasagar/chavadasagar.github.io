/**
 * ==================================================
 * TOAST COMPONENT
 * Toast notifications manager
 * ==================================================
 */

(function () {
  'use strict';

  class ToastComponent {
    constructor() {
      this.container = null;
      this._init();
    }

    _init() {
      if (document.getElementById('hrm-toast-container')) {
        this.container = document.getElementById('hrm-toast-container');
        return;
      }

      this.container = document.createElement('div');
      this.container.id = 'hrm-toast-container';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }

    /**
     * Show a toast message
     * @param {string} message
     * @param {'info'|'success'|'warning'|'danger'} [type='info']
     * @param {number} [duration=3500] - Duration in ms
     * @param {string} [title]
     */
    show(message, type = 'info', duration = 3500, title = '') {
      if (!this.container) this._init();

      const icons = {
        success: '✓',
        warning: '!',
        danger: '✕',
        info: 'ℹ'
      };

      const defaultTitles = {
        success: 'Success',
        warning: 'Warning',
        danger: 'Error',
        info: 'Information'
      };

      const toastTitle = title || defaultTitles[type] || 'Notice';
      const iconChar = icons[type] || 'ℹ';

      const toastEl = document.createElement('div');
      toastEl.className = `toast toast-${type}`;
      toastEl.setAttribute('role', 'alert');

      toastEl.innerHTML = `
        <div class="toast-icon">${iconChar}</div>
        <div class="toast-content">
          <div class="toast-title">${this._escapeHtml(toastTitle)}</div>
          <div class="toast-message">${this._escapeHtml(message)}</div>
        </div>
        <button type="button" class="toast-close" aria-label="Dismiss notification">&times;</button>
      `;

      const closeBtn = toastEl.querySelector('.toast-close');
      let timeoutId = null;

      const removeToast = () => {
        if (timeoutId) clearTimeout(timeoutId);
        toastEl.classList.remove('show');
        toastEl.classList.add('hide');
        setTimeout(() => {
          if (toastEl.parentNode) {
            toastEl.parentNode.removeChild(toastEl);
          }
        }, 300);
      };

      closeBtn.addEventListener('click', removeToast);

      this.container.appendChild(toastEl);

      // Force layout reflow for animation
      void toastEl.offsetWidth;
      toastEl.classList.add('show');

      if (duration > 0) {
        timeoutId = setTimeout(removeToast, duration);
      }

      return toastEl;
    }

    success(message, title) {
      return this.show(message, 'success', 3500, title);
    }

    warning(message, title) {
      return this.show(message, 'warning', 4500, title);
    }

    danger(message, title) {
      return this.show(message, 'danger', 5000, title);
    }

    error(message, title) {
      return this.danger(message, title);
    }

    info(message, title) {
      return this.show(message, 'info', 3500, title);
    }

    _escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.Toast = new ToastComponent();
  window.Toast = window.HRM.Toast;
})();
