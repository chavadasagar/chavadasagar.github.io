/**
 * ==================================================
 * MODAL COMPONENT
 * Accessible, reusable modal dialog manager
 * ==================================================
 */

(function () {
  'use strict';

  class ModalComponent {
    constructor() {
      this.overlay = null;
      this.container = null;
      this.titleEl = null;
      this.bodyEl = null;
      this.footerEl = null;
      this.closeBtn = null;
      this.isOpen = false;
      this.onConfirmCallback = null;
      this.onCancelCallback = null;

      this._init();
    }

    _init() {
      // Create DOM elements if not already present
      if (document.getElementById('hrm-modal-overlay')) {
        this.overlay = document.getElementById('hrm-modal-overlay');
        this.titleEl = document.getElementById('hrm-modal-title');
        this.bodyEl = document.getElementById('hrm-modal-body');
        this.footerEl = document.getElementById('hrm-modal-footer');
        this.closeBtn = document.getElementById('hrm-modal-close');
        return;
      }

      this.overlay = document.createElement('div');
      this.overlay.id = 'hrm-modal-overlay';
      this.overlay.className = 'modal-overlay';
      this.overlay.setAttribute('role', 'dialog');
      this.overlay.setAttribute('aria-modal', 'true');
      this.overlay.setAttribute('aria-hidden', 'true');

      this.overlay.innerHTML = `
        <div class="modal-container" role="document">
          <div class="modal-header">
            <h3 class="modal-title" id="hrm-modal-title">Dialog</h3>
            <button type="button" class="modal-close-btn" id="hrm-modal-close" aria-label="Close dialog">&times;</button>
          </div>
          <div class="modal-body" id="hrm-modal-body"></div>
          <div class="modal-footer" id="hrm-modal-footer"></div>
        </div>
      `;

      document.body.appendChild(this.overlay);

      this.titleEl = document.getElementById('hrm-modal-title');
      this.bodyEl = document.getElementById('hrm-modal-body');
      this.footerEl = document.getElementById('hrm-modal-footer');
      this.closeBtn = document.getElementById('hrm-modal-close');

      // Bind events
      this.closeBtn.addEventListener('click', () => this.close(false));

      // Click outside to close
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close(false);
        }
      });

      // Escape key to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close(false);
        }
      });
    }

    /**
     * Open the modal with options
     * @param {Object} options
     * @param {string} options.title - Modal title
     * @param {string|HTMLElement} options.content - HTML string or DOM element for body
     * @param {string} [options.confirmText='Confirm'] - Text for confirm button (null to hide)
     * @param {string} [options.confirmClass='btn-primary'] - CSS class for confirm button
     * @param {string} [options.cancelText='Cancel'] - Text for cancel button (null to hide)
     * @param {Function} [options.onConfirm] - Confirm callback
     * @param {Function} [options.onCancel] - Cancel callback
     */
    open(options = {}) {
      const {
        title = 'Confirmation',
        content = '',
        confirmText = 'Confirm',
        confirmClass = 'btn-primary',
        cancelText = 'Cancel',
        onConfirm = null,
        onCancel = null
      } = options;

      this.onConfirmCallback = onConfirm;
      this.onCancelCallback = onCancel;

      this.titleEl.textContent = title;

      // Handle body content
      if (typeof content === 'string') {
        this.bodyEl.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.bodyEl.innerHTML = '';
        this.bodyEl.appendChild(content);
      }

      // Build footer
      this.footerEl.innerHTML = '';

      if (cancelText) {
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.addEventListener('click', () => this.close(false));
        this.footerEl.appendChild(cancelBtn);
      }

      if (confirmText) {
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = `btn ${confirmClass}`;
        confirmBtn.textContent = confirmText;
        confirmBtn.addEventListener('click', () => {
          if (typeof this.onConfirmCallback === 'function') {
            this.onConfirmCallback();
          }
          this.close(true);
        });
        this.footerEl.appendChild(confirmBtn);
      }

      this.overlay.classList.add('active');
      this.overlay.setAttribute('aria-hidden', 'false');
      this.isOpen = true;
      document.body.style.overflow = 'hidden';
    }

    /**
     * Close the modal
     * @param {boolean} confirmed - Whether close was triggered by confirmation
     */
    close(confirmed = false) {
      if (!this.isOpen) return;

      if (!confirmed && typeof this.onCancelCallback === 'function') {
        this.onCancelCallback();
      }

      this.overlay.classList.remove('active');
      this.overlay.setAttribute('aria-hidden', 'true');
      this.isOpen = false;
      document.body.style.overflow = '';
      this.onConfirmCallback = null;
      this.onCancelCallback = null;
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.Modal = new ModalComponent();
  window.Modal = window.HRM.Modal;
})();
