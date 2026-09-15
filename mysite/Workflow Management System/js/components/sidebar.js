/**
 * ==================================================
 * SIDEBAR COMPONENT
 * Renders and manages navigation sidebar
 * ==================================================
 */

(function () {
  'use strict';

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      hash: '#/dashboard',
      permission: 'dashboard.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
      badge: null
    },
    {
      id: 'users',
      label: 'Users',
      hash: '#/users',
      permission: 'user.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      badge: null
    },
    {
      id: 'roles',
      label: 'Roles',
      hash: '#/roles',
      permission: 'role.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      badge: null
    },
    {
      id: 'permissions',
      label: 'Permissions',
      hash: '#/permissions',
      permission: 'permission.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
      badge: null
    },
    {
      id: 'workflows',
      label: 'Approval Workflows',
      hash: '#/workflows',
      permission: 'workflow.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
      badge: null
    },
    {
      id: 'leaves',
      label: 'My Leaves',
      hash: '#/leaves',
      permission: 'leave.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
      badge: null
    },
    {
      id: 'approvals',
      label: 'Approvals',
      hash: '#/approvals',
      permission: 'approval.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
      badge: null
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      hash: '#/audit-logs',
      permission: 'audit.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      hash: '#/settings',
      permission: 'role.view',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
      badge: null
    }
  ];

  class SidebarComponent {
    constructor() {
      this.element = null;
      this.backdrop = null;
      this.navContainer = null;
      this.isOpen = false;
    }

    init() {
      this.element = document.getElementById('sidebar');
      this.backdrop = document.getElementById('sidebar-backdrop');
      if (!this.element) return;

      this.render();
      this.bindEvents();
    }

    render() {
      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;
      const userName = currentUser ? currentUser.name : 'HR Administrator';
      const userRole = (currentUser && currentUser.roles && currentUser.roles.length > 0)
        ? currentUser.roles[0].name
        : 'System Admin';
      const initials = currentUser
        ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'AD';

      // Filter navigation items by user permission (Phase 8 Requirement 5)
      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const visibleNavItems = NAV_ITEMS.filter(item => {
        if (!item.permission) return true;
        return authz ? authz.can(item.permission) : true;
      });

      this.element.innerHTML = `
        <div class="sidebar-header">
          <a href="#/dashboard" class="brand">
            <div class="brand-icon">H</div>
            <div class="brand-info">
              <span class="brand-title">HRM Core</span>
              <span class="brand-subtitle">Foundation v1.0</span>
            </div>
          </a>
          <button type="button" class="sidebar-close-btn" id="sidebar-close-btn" aria-label="Close navigation">&times;</button>
        </div>

        <nav class="sidebar-nav" id="sidebar-nav">
          <div class="nav-section-title">Navigation</div>
          ${visibleNavItems.map(item => `
            <a href="${item.hash}" class="nav-item" data-hash="${item.hash}" id="nav-item-${item.id}">
              <span class="nav-icon">${item.icon}</span>
              <span class="nav-label">${item.label}</span>
              ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
            </a>
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          <div class="user-avatar-mini">${initials}</div>
          <div class="user-info-mini">
            <span class="user-name-mini" title="${userName}">${userName}</span>
            <span class="user-role-mini">${userRole}</span>
          </div>
        </div>
      `;

      this.navContainer = document.getElementById('sidebar-nav');
    }

    bindEvents() {
      // Close button on mobile
      const closeBtn = document.getElementById('sidebar-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      // Backdrop click closes sidebar
      if (this.backdrop) {
        this.backdrop.addEventListener('click', () => this.close());
      }

      // Clicking a navigation link on mobile auto-closes drawer
      if (this.navContainer) {
        this.navContainer.addEventListener('click', (e) => {
          const item = e.target.closest('.nav-item');
          if (item) {
            this.close();
          }
        });
      }
    }

    open() {
      if (!this.element) return;
      this.element.classList.add('open');
      if (this.backdrop) {
        this.backdrop.classList.add('active');
      }
      this.isOpen = true;
    }

    close() {
      if (!this.element) return;
      this.element.classList.remove('open');
      if (this.backdrop) {
        this.backdrop.classList.remove('active');
      }
      this.isOpen = false;
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    /**
     * Updates the active class on sidebar items matching current route
     * @param {string} currentHash
     */
    setActive(currentHash) {
      if (!this.element) return;
      const items = this.element.querySelectorAll('.nav-item');
      items.forEach(item => {
        const itemHash = item.getAttribute('data-hash');
        if (itemHash === currentHash) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.Sidebar = new SidebarComponent();
  window.Sidebar = window.HRM.Sidebar;
})();
