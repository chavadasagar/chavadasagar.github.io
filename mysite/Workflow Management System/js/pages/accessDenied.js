/**
 * ==================================================
 * ACCESS DENIED (403) PAGE
 * Displays Access Denied when user lacks required permission
 * ==================================================
 */

(function () {
  'use strict';

  class AccessDeniedPage {
    render(container, hash = window.location.hash, requiredPermission = '') {
      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;
      const roles = currentUser ? (currentUser.roles || []) : [];
      const roleNames = roles.map(r => r.name).join(', ') || 'None';

      container.innerHTML = `
        <div class="access-denied-page" style="margin-top: var(--space-8); max-width: 600px; margin-left: auto; margin-right: auto;">
          <div class="empty-state" style="padding: var(--space-8); border: 1px solid var(--danger-border); background: var(--surface);">
            <div class="empty-state-icon" style="background: var(--danger-bg); color: var(--danger); border-color: var(--danger-border);">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <span class="badge badge-danger badge-pill" style="margin-bottom: var(--space-2); font-size: 11px;">403 FORBIDDEN</span>
            <h2 class="empty-state-title" style="font-size: var(--text-2xl); margin-bottom: var(--space-2);">Access Denied</h2>
            
            <p class="empty-state-desc" style="font-size: var(--text-sm); line-height: 1.6; margin-bottom: var(--space-4);">
              You do not have the required permission 
              ${requiredPermission ? `<code style="font-family: var(--font-mono); color: var(--danger); background: var(--danger-bg); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--danger-border);">${this._escapeHtml(requiredPermission)}</code>` : ''} 
              to access the requested route <strong>${this._escapeHtml(hash)}</strong>.
            </p>

            <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); width: 100%; text-align: left; margin-bottom: var(--space-6); font-size: var(--text-xs);">
              <div class="flex items-center justify-between" style="margin-bottom: 4px;">
                <span class="text-muted">Signed In As:</span>
                <span class="font-semibold text-main">${this._escapeHtml(currentUser ? currentUser.name : 'Unknown')}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted">Assigned Roles:</span>
                <span class="badge badge-primary badge-pill" style="font-size: 10px;">${this._escapeHtml(roleNames)}</span>
              </div>
            </div>

            <div class="empty-state-actions flex items-center gap-3">
              <a href="#/dashboard" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      `;
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
  window.HRM.AccessDeniedPage = new AccessDeniedPage();
  window.AccessDeniedPage = window.HRM.AccessDeniedPage;
})();
