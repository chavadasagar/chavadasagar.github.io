/**
 * UTILS.JS
 * Shared helper functions for validation, modal control, custom toasts,
 * custom confirmation dialogs, and date manipulations.
 */

// Toast Controller
class ToastController {
    constructor() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';

        toast.innerHTML = `
            <span class="toast-icon"><i class="fas fa-${icon}"></i></span>
            <div class="toast-message">${message}</div>
            <span class="toast-close"><i class="fas fa-times"></i></span>
        `;

        this.container.appendChild(toast);

        // Slide in
        setTimeout(() => toast.classList.add('show'), 50);

        // Setup close click
        toast.querySelector('.toast-close').addEventListener('click', () => this.close(toast));

        // Auto destroy
        const timeoutId = setTimeout(() => this.close(toast), duration);
        toast.dataset.timeoutId = timeoutId;
    }

    close(toast) {
        if (toast.dataset.timeoutId) {
            clearTimeout(Number(toast.dataset.timeoutId));
        }
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }
}

const toast = new ToastController();

// Custom Interactive Dialogs (Alert & Confirm overlays)
class DialogController {
    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'dialog-overlay';
        document.body.appendChild(this.overlay);
    }

    alert(title, message, callback = null) {
        this.overlay.innerHTML = `
            <div class="dialog-container">
                <div class="dialog-icon"><i class="fas fa-exclamation-circle" style="color: var(--primary)"></i></div>
                <div class="dialog-title">${title}</div>
                <div class="dialog-message">${message}</div>
                <div class="dialog-buttons">
                    <button class="btn btn-primary" id="dialog-ok-btn">OK</button>
                </div>
            </div>
        `;
        
        this.overlay.classList.add('active');
        
        const okBtn = this.overlay.querySelector('#dialog-ok-btn');
        okBtn.focus();
        
        const cleanup = () => {
            this.overlay.classList.remove('active');
            if (callback) callback();
        };

        okBtn.addEventListener('click', cleanup);
    }

    confirm(title, message, onConfirm, onCancel = null) {
        this.overlay.innerHTML = `
            <div class="dialog-container">
                <div class="dialog-icon"><i class="fas fa-question-circle"></i></div>
                <div class="dialog-title">${title}</div>
                <div class="dialog-message">${message}</div>
                <div class="dialog-buttons">
                    <button class="btn btn-secondary" id="dialog-cancel-btn">Cancel</button>
                    <button class="btn btn-danger" id="dialog-confirm-btn">Confirm</button>
                </div>
            </div>
        `;
        
        this.overlay.classList.add('active');
        
        const confirmBtn = this.overlay.querySelector('#dialog-confirm-btn');
        const cancelBtn = this.overlay.querySelector('#dialog-cancel-btn');
        cancelBtn.focus();

        const close = () => this.overlay.classList.remove('active');

        confirmBtn.addEventListener('click', () => {
            close();
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            close();
            if (onCancel) onCancel();
        });
    }
}

const dialog = new DialogController();

// Modal Controller Utility
const modal = {
    open(modalId) {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            modalEl.classList.add('active');
            document.body.style.overflow = 'hidden'; // prevent background scrolling
        }
    },
    close(modalId) {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            modalEl.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    setupCloseHandlers() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            // Click outside content to close
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close(overlay.id);
                }
            });
            // Close buttons
            overlay.querySelectorAll('.modal-close, [data-dismiss="modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.close(overlay.id);
                });
            });
        });
    }
};

// Form Validators
const validate = {
    email(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    },
    phone(val) {
        return /^\+?[1-9]\d{1,14}$|^[0-9]{10,12}$/.test(val.replace(/[\s-()]/g, ''));
    },
    isbn(val) {
        // ISBN-10 or ISBN-13
        const clean = val.replace(/[\s-]/g, '');
        return clean.length === 10 || clean.length === 13;
    },
    required(val) {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string') return val.trim().length > 0;
        return true;
    },
    showErrors(formEl, errorsObj) {
        // Clear previous errors
        formEl.querySelectorAll('.form-group').forEach(group => group.classList.remove('has-error'));
        
        let hasErrors = false;
        for (const [fieldName, errorMsg] of Object.entries(errorsObj)) {
            const input = formEl.querySelector(`[name="${fieldName}"]`);
            if (input) {
                const group = input.closest('.form-group');
                if (group) {
                    group.classList.add('has-error');
                    const errorSpan = group.querySelector('.form-error-msg');
                    if (errorSpan) {
                        errorSpan.textContent = errorMsg;
                    }
                    hasErrors = true;
                }
            }
        }
        return hasErrors;
    },
    clearErrors(formEl) {
        formEl.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('has-error');
        });
    }
};

// Date Calculation Helpers
const datetime = {
    today() {
        return new Date().toISOString().split('T')[0];
    },
    format(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },
    addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    },
    diffDays(dateStr1, dateStr2) {
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        // Reset time parts to measure full days
        d1.setHours(0,0,0,0);
        d2.setHours(0,0,0,0);
        const diffTime = d2.getTime() - d1.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
};

// Loading Spinner controls
const loader = {
    show() {
        let overlay = document.getElementById('global-loader');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-loader';
            overlay.className = 'loader-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        }
        overlay.classList.add('active');
    },
    hide() {
        const overlay = document.getElementById('global-loader');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
};


// Expose to window for global access
window.toast = toast;
window.dialog = dialog;
window.modal = modal;
window.validate = validate;
window.datetime = datetime;
window.loader = loader;


// Expose to window for global access
window.toast = toast;
window.dialog = dialog;
window.modal = modal;
window.validate = validate;
window.datetime = datetime;
window.loader = loader;
