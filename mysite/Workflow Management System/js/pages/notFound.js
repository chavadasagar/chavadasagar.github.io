/**
 * ==================================================
 * NOT FOUND (404) PAGE
 * Handles unknown routes gracefully
 * ==================================================
 */

(function () {
  'use strict';

  class NotFoundPage {
    render(container) {
      const currentHash = window.location.hash || '#/';

      container.innerHTML = `
        <div class="empty-state" style="margin-top: var(--space-8);">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 class="empty-state-title">Page Not Found</h2>
          <p class="empty-state-desc">
            The requested route <code style="font-family: var(--font-mono); color: var(--danger-text); background: var(--danger-bg); padding: 2px 6px; border-radius: 4px;">${this._escapeHtml(currentHash)}</code> does not exist in the HRM application.
          </p>
          <div class="empty-state-actions flex items-center gap-3">
            <a href="#/dashboard" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Return to Dashboard
            </a>
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
  window.HRM.NotFoundPage = new NotFoundPage();
  window.NotFoundPage = window.HRM.NotFoundPage;
})();
