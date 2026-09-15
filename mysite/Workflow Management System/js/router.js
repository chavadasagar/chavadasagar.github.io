/**
 * ==================================================
 * ROUTER
 * Pure client-side hash routing system with Route Protection Guards
 * ==================================================
 */

(function () {
  'use strict';

  const ROUTE_TITLES = {
    '#/login': 'Sign In',
    '#/dashboard': 'Dashboard',
    '#/users': 'Users',
    '#/roles': 'Roles',
    '#/permissions': 'Permissions',
    '#/workflows': 'Approval Workflows',
    '#/leaves': 'My Leaves',
    '#/approvals': 'Approvals',
    '#/audit-logs': 'Audit Logs',
    '#/settings': 'Settings'
  };

  const ROUTE_PERMISSIONS = {
    '#/dashboard': 'dashboard.view',
    '#/users': 'user.view',
    '#/roles': 'role.view',
    '#/permissions': 'permission.view',
    '#/workflows': 'workflow.view',
    '#/leaves': 'leave.view',
    '#/approvals': 'approval.view',
    '#/audit-logs': 'audit.view',
    '#/settings': 'role.view'
  };

  class Router {
    constructor() {
      this.routes = {};
      this.currentRoute = null;
      this.contentContainer = null;
      this.notFoundHandler = null;
    }

    /**
     * Register a route handler
     * @param {string} path - e.g. '#/dashboard'
     * @param {Function} handler - callback(container, hash)
     */
    register(path, handler) {
      this.routes[path] = handler;
    }

    /**
     * Register 404 handler
     * @param {Function} handler
     */
    setNotFound(handler) {
      this.notFoundHandler = handler;
    }

    /**
     * Initialize router and bind window events
     * @param {HTMLElement|string} container
     */
    init(container) {
      this.contentContainer = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      // Handle route on hashchange and on initial page load
      window.addEventListener('hashchange', () => this._handleRoute());
      window.addEventListener('load', () => this._handleRoute());

      // Initial trigger in case DOM is already loaded
      this._handleRoute();
    }

    /**
     * Programmatic navigation
     * @param {string} hash
     */
    navigate(hash) {
      window.location.hash = hash;
    }

    /**
     * Resolves the current hash, applies authentication guards, and executes matched handler
     */
    _handleRoute() {
      let hash = window.location.hash;

      const auth = window.HRM ? window.HRM.AuthService : null;
      const isAuthed = auth ? auth.isAuthenticated() : false;

      // Normalize empty hash or '#'
      if (!hash || hash === '#' || hash === '#/') {
        hash = isAuthed ? '#/dashboard' : '#/login';
        window.location.replace(hash);
        return;
      }

      // ==========================================
      // ROUTE PROTECTION GUARDS (Requirement 4)
      // ==========================================
      // 1. If user is NOT authenticated: all protected routes must redirect to #/login
      if (!isAuthed && hash !== '#/login') {
        window.location.replace('#/login');
        return;
      }

      // 2. If user IS authenticated: #/login must redirect to #/dashboard
      if (isAuthed && hash === '#/login') {
        window.location.replace('#/dashboard');
        return;
      }

      this.currentRoute = hash;

      // ==========================================
      // LAYOUT SHELL VISIBILITY
      // ==========================================
      const sidebarEl = document.getElementById('sidebar');
      const headerEl = document.getElementById('top-header');
      const backdropEl = document.getElementById('sidebar-backdrop');
      const appContainer = document.querySelector('.app-container');

      if (hash === '#/login') {
        if (sidebarEl) sidebarEl.style.display = 'none';
        if (headerEl) headerEl.style.display = 'none';
        if (backdropEl) backdropEl.style.display = 'none';
        if (appContainer) appContainer.style.background = 'var(--background)';
      } else {
        if (sidebarEl) sidebarEl.style.display = 'flex';
        if (headerEl) headerEl.style.display = 'flex';
        if (backdropEl) backdropEl.style.display = '';
        
        // Refresh dynamic user state in header & sidebar
        if (window.HRM && window.HRM.Header && typeof window.HRM.Header.updateUserState === 'function') {
          window.HRM.Header.updateUserState();
        }
        if (window.HRM && window.HRM.Sidebar && typeof window.HRM.Sidebar.render === 'function') {
          window.HRM.Sidebar.render();
          window.HRM.Sidebar.bindEvents();
        }
      }

      // Update sidebar active link
      if (window.HRM && window.HRM.Sidebar) {
        window.HRM.Sidebar.setActive(hash);
      }

      // Update header title / breadcrumb
      const pageTitle = ROUTE_TITLES[hash] || 'Page Not Found';
      if (window.HRM && window.HRM.Header) {
        window.HRM.Header.setTitle(pageTitle);
      }
      document.title = `${pageTitle} | HRM Platform`;

      if (!this.contentContainer) {
        this.contentContainer = document.getElementById('main-content');
      }

      // ==========================================
      // ROUTE AUTHORIZATION GUARD (Phase 8 Requirement 6)
      // ==========================================
      const requiredPermission = ROUTE_PERMISSIONS[hash];
      if (requiredPermission && window.HRM && window.HRM.AuthorizationService) {
        const hasAccess = window.HRM.AuthorizationService.can(requiredPermission);
        if (!hasAccess) {
          console.warn(`[Router] Access Denied for route "${hash}". Required permission: "${requiredPermission}".`);

          if (window.HRM && window.HRM.Header) {
            window.HRM.Header.setTitle('Access Denied');
          }
          document.title = `Access Denied | HRM Platform`;

          if (window.HRM && window.HRM.AccessDeniedPage) {
            window.HRM.AccessDeniedPage.render(this.contentContainer, hash, requiredPermission);
          } else {
            this.contentContainer.innerHTML = `
              <div class="empty-state" style="margin-top: var(--space-8);">
                <h2 class="empty-state-title" style="color: var(--danger);">Access Denied</h2>
                <p class="empty-state-desc">You do not have permission (${requiredPermission}) to view this page.</p>
                <a href="#/dashboard" class="btn btn-primary" style="margin-top: var(--space-4);">Return to Dashboard</a>
              </div>
            `;
          }

          window.scrollTo({ top: 0, behavior: 'instant' });
          return;
        }
      }

      // Check registered handler
      const handler = this.routes[hash];

      if (!this.contentContainer) {
        this.contentContainer = document.getElementById('main-content');
      }

      if (handler) {
        handler(this.contentContainer, hash);
      } else if (this.notFoundHandler) {
        this.notFoundHandler(this.contentContainer, hash);
      } else {
        if (this.contentContainer) {
          this.contentContainer.innerHTML = `<h2>404 - Not Found</h2><p>Unknown route: ${hash}</p>`;
        }
      }

      // Scroll smoothly to top on route change
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.Router = new Router();
  window.Router = window.HRM.Router;
})();
