/**
 * toast.js - Custom Toast Notification Component
 */

const TOAST_STYLES = `
  #toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
    pointer-events: none;
  }
  .toast-item {
    background: #fff;
    color: #0f172a;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 10px;
    border-left: 4px solid #cbd5e1;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  .toast-item.toast-success {
    border-left-color: #22c55e;
  }
  .toast-item.toast-error {
    border-left-color: #ef4444;
  }
  .toast-item.toast-warning {
    border-left-color: #f59e0b;
  }
  .toast-item.toast-info {
    border-left-color: #3b82f6;
  }
  .toast-item.show {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Toast = {
  container: null,

  init() {
    if (this.container) return;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = TOAST_STYLES;
    document.head.appendChild(styleEl);

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, type = 'success', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    // Add simple icon representation
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    this.container.appendChild(toast);

    // Trigger transition
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Remove toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
};

window.Toast = Toast;
