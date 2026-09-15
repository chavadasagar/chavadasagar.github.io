/**
 * ==================================================
 * HEADER COMPONENT (PHASE 14)
 * Renders and manages the application top header
 * Supports User Profile chip, Logout Action, and
 * Real-Time Notifications Bell & Interactive Dropdown
 * ==================================================
 */

(function () {
  'use strict';

  function formatTimeAgo(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const past = new Date(isoString);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'success':
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--radius-full);background:var(--success-bg);color:var(--success-text);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>`;
      case 'warning':
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--radius-full);background:var(--warning-bg);color:var(--warning-text);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>`;
      case 'danger':
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--radius-full);background:var(--danger-bg);color:var(--danger-text);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`;
      default:
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--radius-full);background:rgba(99, 102, 241, 0.15);color:var(--primary);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`;
    }
  }

  class HeaderComponent {
    constructor() {
      this.element = null;
      this.titleEl = null;
      this.isDropdownOpen = false;
      this._boundDocClickHandler = null;
      this._boundNotifChangeHandler = null;
    }

    init() {
      this.element = document.getElementById('top-header');
      if (!this.element) return;

      this.render();
      this.bindEvents();

      // Listen to notification changes
      if (!this._boundNotifChangeHandler) {
        this._boundNotifChangeHandler = () => this.updateNotificationsUI();
        window.addEventListener('hrm:notifications-changed', this._boundNotifChangeHandler);
      }
    }

    render() {
      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;

      const userName = currentUser ? currentUser.name : 'Guest User';
      const userRole = (currentUser && currentUser.roles && currentUser.roles.length > 0)
        ? currentUser.roles[0].name
        : 'Authenticated';
      const initials = currentUser
        ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'GU';

      const notifService = window.HRM ? window.HRM.NotificationService : null;
      const unreadCount = (notifService && currentUser) ? notifService.getUnreadCount(currentUser.id) : 0;

      this.element.innerHTML = `
        <div class="header-left">
          <button type="button" class="menu-toggle-btn" id="menu-toggle-btn" aria-label="Toggle navigation drawer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div class="header-breadcrumbs">
            <span class="breadcrumb-root">HRM Core</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current" id="header-breadcrumb-title">Dashboard</span>
          </div>
        </div>

        <div class="header-right" style="position: relative;">
          <div class="header-badge" id="storage-status-pill" title="LocalStorage Root: hrm_database">
            <span class="status-indicator"></span>
            <span>Database Online</span>
          </div>

          <!-- Notification Bell Icon (Phase 14) -->
          <div class="notification-container" style="position: relative;">
            <button type="button" class="btn btn-outline btn-sm" id="btn-notification-bell" aria-label="Notifications" title="View Notifications" style="position: relative; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-full);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span id="header-notification-badge" style="${unreadCount > 0 ? 'display: inline-flex;' : 'display: none;'} position: absolute; top: -3px; right: -3px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px; background: var(--danger); color: #ffffff; font-size: 10px; font-weight: 700; align-items: center; justify-content: center; line-height: 1; box-shadow: 0 0 0 2px var(--surface-header, #0f172a);">
                ${unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </button>

            <!-- Notifications Dropdown Menu -->
            <div id="notification-dropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 10px); width: 360px; max-width: calc(100vw - 32px); background: var(--surface-card, #1e293b); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5); z-index: 1050; overflow: hidden;">
              <!-- Dropdown Header -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); background: rgba(255, 255, 255, 0.02);">
                <div class="flex items-center gap-2">
                  <span style="font-weight: 700; font-size: var(--text-sm); color: var(--text);">Notifications</span>
                  <span id="dropdown-unread-pill" class="badge badge-primary" style="font-size: 10px; padding: 1px 6px;">${unreadCount} unread</span>
                </div>
                <button type="button" class="btn btn-ghost btn-xs" id="btn-mark-all-read" style="font-size: 11px; color: var(--primary); padding: 2px 6px;">
                  Mark all read
                </button>
              </div>

              <!-- Notifications List Scrollable Body -->
              <div id="notification-list-body" style="max-height: 380px; overflow-y: auto; padding: 4px 0;">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>

          <!-- Current User Profile Info -->
          <div class="header-user-chip flex items-center gap-2" style="padding: 4px 10px; background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-full);">
            <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #ffffff;">
              ${initials}
            </div>
            <div class="flex flex-col user-chip-text" style="line-height: 1.15;">
              <span style="font-size: var(--text-xs); font-weight: 600; color: var(--text);">${userName}</span>
              <span style="font-size: 10px; color: var(--text-muted);">${userRole}</span>
            </div>
          </div>

          <!-- Logout Button -->
          <button type="button" class="btn btn-outline btn-sm" id="btn-header-logout" title="Sign out of your session" style="color: var(--danger-text); border-color: var(--danger-border); gap: 6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span class="logout-text">Logout</span>
          </button>
        </div>
      `;

      this.titleEl = document.getElementById('header-breadcrumb-title');
      this.updateNotificationsUI();
    }

    bindEvents() {
      const toggleBtn = document.getElementById('menu-toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          if (window.HRM && window.HRM.Sidebar) {
            window.HRM.Sidebar.toggle();
          }
        });
      }

      // Bell icon click -> toggle dropdown
      const bellBtn = document.getElementById('btn-notification-bell');
      const dropdown = document.getElementById('notification-dropdown');
      if (bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleNotificationsDropdown();
        });
      }

      // Mark all read button
      const markAllBtn = document.getElementById('btn-mark-all-read');
      if (markAllBtn) {
        markAllBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const auth = window.HRM ? window.HRM.AuthService : null;
          const user = auth ? auth.getCurrentUser() : null;
          if (user && window.HRM && window.HRM.NotificationService) {
            window.HRM.NotificationService.markAllAsRead(user.id);
            if (window.HRM.Toast) {
              window.HRM.Toast.success('All notifications marked as read.');
            }
          }
        });
      }

      // Close dropdown when clicking outside
      if (this._boundDocClickHandler) {
        document.removeEventListener('click', this._boundDocClickHandler);
      }
      this._boundDocClickHandler = (e) => {
        const notifContainer = document.querySelector('.notification-container');
        if (notifContainer && !notifContainer.contains(e.target) && this.isDropdownOpen) {
          this.closeNotificationsDropdown();
        }
      };
      document.addEventListener('click', this._boundDocClickHandler);

      // Logout handler
      const logoutBtn = document.getElementById('btn-header-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          if (window.HRM && window.HRM.Modal) {
            window.HRM.Modal.open({
              title: 'Confirm Sign Out',
              content: '<p>Are you sure you want to end your current session?</p>',
              confirmText: 'Sign Out',
              confirmClass: 'btn-danger',
              cancelText: 'Cancel',
              onConfirm: () => {
                if (window.HRM && window.HRM.AuthService) {
                  window.HRM.AuthService.logout();
                }
              }
            });
          } else if (window.HRM && window.HRM.AuthService) {
            window.HRM.AuthService.logout();
          }
        });
      }
    }

    toggleNotificationsDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
      const dropdown = document.getElementById('notification-dropdown');
      if (dropdown) {
        dropdown.style.display = this.isDropdownOpen ? 'block' : 'none';
        if (this.isDropdownOpen) {
          this.updateNotificationsUI();
        }
      }
    }

    closeNotificationsDropdown() {
      this.isDropdownOpen = false;
      const dropdown = document.getElementById('notification-dropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
    }

    /**
     * Refresh badge and notification items list
     */
    updateNotificationsUI() {
      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;
      if (!currentUser) return;

      const notifService = window.HRM ? window.HRM.NotificationService : null;
      if (!notifService) return;

      const unreadCount = notifService.getUnreadCount(currentUser.id);
      const notifications = notifService.getForEmployee(currentUser.id);

      // Update badge
      const badge = document.getElementById('header-notification-badge');
      if (badge) {
        if (unreadCount > 0) {
          badge.style.display = 'inline-flex';
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
          badge.style.display = 'none';
        }
      }

      // Update dropdown pill
      const dropdownPill = document.getElementById('dropdown-unread-pill');
      if (dropdownPill) {
        dropdownPill.textContent = `${unreadCount} unread`;
      }

      // Update list body
      const listBody = document.getElementById('notification-list-body');
      if (!listBody) return;

      if (!notifications || notifications.length === 0) {
        listBody.innerHTML = `
          <div style="padding: 32px 16px; text-align: center; color: var(--text-muted);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 8px; opacity: 0.5;">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <p style="font-size: var(--text-sm); margin: 0; font-weight: 500;">No notifications yet</p>
            <p style="font-size: var(--text-xs); margin: 4px 0 0; opacity: 0.7;">Activity alerts and approval updates will appear here.</p>
          </div>
        `;
        return;
      }

      listBody.innerHTML = notifications.map(notif => {
        const timeAgo = formatTimeAgo(notif.createdAt);
        const iconSvg = getNotificationIcon(notif.type);
        const bgStyle = notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)';

        return `
          <div class="notification-item ${notif.isRead ? 'read' : 'unread'}" data-id="${notif.id}" style="display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); background: ${bgStyle}; cursor: pointer; transition: background 0.15s ease;">
            <div style="flex-shrink: 0; margin-top: 2px;">
              ${iconSvg}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                <span style="font-size: var(--text-xs); font-weight: ${notif.isRead ? '600' : '700'}; color: var(--text);">${notif.title}</span>
                <span style="font-size: 10px; color: var(--text-muted); white-space: nowrap;">${timeAgo}</span>
              </div>
              <p style="font-size: 11.5px; color: var(--text-muted); margin: 4px 0 6px; line-height: 1.35; word-break: break-word;">${notif.message}</p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                ${!notif.isRead ? `
                  <button type="button" class="btn-item-mark-read" data-id="${notif.id}" style="background: none; border: none; padding: 0; font-size: 10.5px; color: var(--primary); font-weight: 600; cursor: pointer;">
                    Mark read
                  </button>
                ` : '<span style="font-size: 10px; color: var(--text-muted);">Read</span>'}
                ${notif.referenceType === 'ApprovalRequest' ? `
                  <span style="font-size: 10.5px; color: var(--primary); font-weight: 500;">View Inbox &rarr;</span>
                ` : notif.referenceType === 'Leave' ? `
                  <span style="font-size: 10.5px; color: var(--primary); font-weight: 500;">View Leaves &rarr;</span>
                ` : ''}
              </div>
            </div>
            ${!notif.isRead ? `
              <div style="flex-shrink: 0; width: 6px; height: 6px; border-radius: var(--radius-full); background: var(--primary); margin-top: 6px;"></div>
            ` : ''}
          </div>
        `;
      }).join('');

      // Bind mark-read and click handlers
      listBody.querySelectorAll('.notification-item').forEach(el => {
        el.addEventListener('click', (e) => {
          const id = el.getAttribute('data-id');
          const notif = notifications.find(n => n.id === id);
          if (notif && !notif.isRead) {
            notifService.markAsRead(id);
          }
          if (notif && notif.referenceType === 'ApprovalRequest') {
            this.closeNotificationsDropdown();
            window.location.hash = '#/approvals';
          } else if (notif && notif.referenceType === 'Leave') {
            this.closeNotificationsDropdown();
            window.location.hash = '#/leaves';
          }
        });
      });

      listBody.querySelectorAll('.btn-item-mark-read').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          notifService.markAsRead(id);
        });
      });
    }

    /**
     * Updates the header breadcrumb title
     * @param {string} title
     */
    setTitle(title) {
      if (!this.titleEl) {
        this.titleEl = document.getElementById('header-breadcrumb-title');
      }
      if (this.titleEl) {
        this.titleEl.textContent = title;
      }
      document.title = `${title} | HRM Platform`;
    }

    /**
     * Re-renders header when user auth changes
     */
    updateUserState() {
      this.render();
      this.bindEvents();
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.Header = new HeaderComponent();
  window.Header = window.HRM.Header;
})();
