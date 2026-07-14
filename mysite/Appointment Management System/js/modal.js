/**
 * modal.js - Custom Modal dialog component
 */

const MODAL_STYLES = `
  .custom-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .custom-modal-overlay.show {
    opacity: 1;
  }
  .custom-modal-content {
    background: #fff;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    padding: 24px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    transform: translateY(20px);
    transition: transform 0.25s ease;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .custom-modal-overlay.show .custom-modal-content {
    transform: translateY(0);
  }
  .custom-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
  }
  .custom-modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }
  .custom-modal-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #64748b;
    transition: color 0.2s;
  }
  .custom-modal-close:hover {
    color: #0f172a;
  }
  .custom-modal-body {
    color: #475569;
    font-size: 15px;
    line-height: 1.5;
  }
  .custom-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
  }
  .btn-modal {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-modal-cancel {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #475569;
  }
  .btn-modal-cancel:hover {
    background: #e2e8f0;
  }
  .btn-modal-confirm {
    background: #0f766e;
    border: 1px solid #0f766e;
    color: #fff;
  }
  .btn-modal-confirm:hover {
    background: #0d9488;
  }
`;

const Modal = {
  init() {
    if (document.querySelector('#modal-style')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'modal-style';
    styleEl.textContent = MODAL_STYLES;
    document.head.appendChild(styleEl);
  },

  confirm({ title, body, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) {
    this.init();

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    
    overlay.innerHTML = `
      <div class="custom-modal-content">
        <div class="custom-modal-header">
          <h3 class="custom-modal-title">${title}</h3>
          <button class="custom-modal-close">&times;</button>
        </div>
        <div class="custom-modal-body">${body}</div>
        <div class="custom-modal-footer">
          <button class="btn-modal btn-modal-cancel">${cancelText}</button>
          <button class="btn-modal btn-modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trigger animation
    setTimeout(() => overlay.classList.add('show'), 10);

    const closeBtn = overlay.querySelector('.custom-modal-close');
    const cancelBtn = overlay.querySelector('.btn-modal-cancel');
    const confirmBtn = overlay.querySelector('.btn-modal-confirm');

    const closeModal = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
    };

    closeBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };

    cancelBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };

    confirmBtn.onclick = () => {
      closeModal();
      if (onConfirm) onConfirm();
    };

    // Close on click outside content
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (onCancel) onCancel();
      }
    };
  },

  // Generic popup with custom form / body html
  prompt({ title, bodyHtml, confirmText = 'Submit', cancelText = 'Cancel', onConfirm, onCancel }) {
    this.init();

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    
    overlay.innerHTML = `
      <div class="custom-modal-content">
        <div class="custom-modal-header">
          <h3 class="custom-modal-title">${title}</h3>
          <button class="custom-modal-close">&times;</button>
        </div>
        <div class="custom-modal-body">${bodyHtml}</div>
        <div class="custom-modal-footer">
          <button class="btn-modal btn-modal-cancel">${cancelText}</button>
          <button class="btn-modal btn-modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trigger animation
    setTimeout(() => overlay.classList.add('show'), 10);

    const closeBtn = overlay.querySelector('.custom-modal-close');
    const cancelBtn = overlay.querySelector('.btn-modal-cancel');
    const confirmBtn = overlay.querySelector('.btn-modal-confirm');

    const closeModal = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
    };

    closeBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };

    cancelBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };

    confirmBtn.onclick = () => {
      // Gather inputs
      const inputs = overlay.querySelectorAll('input, select, textarea');
      const formData = {};
      inputs.forEach(input => {
        if (input.name) {
          formData[input.name] = input.value;
        }
      });

      if (onConfirm) {
        const proceed = onConfirm(formData, closeModal);
        // If onConfirm returns false, don't close modal (useful for validation errors)
        if (proceed !== false) {
          closeModal();
        }
      } else {
        closeModal();
      }
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (onCancel) onCancel();
      }
    };
  }
};

window.Modal = Modal;
