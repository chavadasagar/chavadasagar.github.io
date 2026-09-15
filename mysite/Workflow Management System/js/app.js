/**
 * ==================================================
 * APPLICATION ENTRY POINT
 * Initializes HRM platform and database services
 * ==================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  try {
    // 1. Initialize centralized database & storage service (with seed)
    if (window.HRM && window.HRM.DatabaseService) {
      window.HRM.DatabaseService.initialize();
    } else if (window.HRM && window.HRM.StorageService) {
      window.HRM.StorageService.init();
    }

    // 2. Initialize UI layout components
    if (window.HRM && window.HRM.Sidebar) {
      window.HRM.Sidebar.init();
    }

    if (window.HRM && window.HRM.Header) {
      window.HRM.Header.init();
    }

    // 3. Configure Hash Router
    const router = window.HRM ? window.HRM.Router : null;

    if (router) {
      // Register Login Page (Phase 3 Authentication)
      router.register('#/login', (container) => {
        if (window.HRM && window.HRM.LoginPage) {
          window.HRM.LoginPage.render(container);
        }
      });

      // Register Dashboard
      router.register('#/dashboard', (container) => {
        if (window.HRM && window.HRM.DashboardPage) {
          window.HRM.DashboardPage.render(container);
        }
      });

      // Register Settings Page (Phase 2 Database Management & Reset)
      router.register('#/settings', (container) => {
        if (window.HRM && window.HRM.SettingsPage) {
          window.HRM.SettingsPage.render(container);
        }
      });

      // Register Users Page (Phase 4 User Management)
      router.register('#/users', (container) => {
        if (window.HRM && window.HRM.UsersPage) {
          window.HRM.UsersPage.render(container);
        }
      });

      // Register Roles Page (Phase 5 Role Management)
      router.register('#/roles', (container) => {
        if (window.HRM && window.HRM.RolesPage) {
          window.HRM.RolesPage.render(container);
        }
      });

      // Register Permissions Page (Phase 6 Permission Management)
      router.register('#/permissions', (container) => {
        if (window.HRM && window.HRM.PermissionsPage) {
          window.HRM.PermissionsPage.render(container);
        }
      });

      // Register Workflows Page (Phase 9 Approval Workflow Master)
      router.register('#/workflows', (container) => {
        if (window.HRM && window.HRM.WorkflowsPage) {
          window.HRM.WorkflowsPage.render(container);
        }
      });

      // Register Leaves Page (Phase 12 Leave Integration)
      router.register('#/leaves', (container) => {
        if (window.HRM && window.HRM.LeavesPage) {
          window.HRM.LeavesPage.render(container);
        }
      });

      // Register Approvals Page (Phase 12 Approvals Inbox)
      router.register('#/approvals', (container) => {
        if (window.HRM && window.HRM.ApprovalsPage) {
          window.HRM.ApprovalsPage.render(container);
        }
      });

      // Register Audit Logs Page (Phase 14 Audit Trail)
      router.register('#/audit-logs', (container) => {
        if (window.HRM && window.HRM.AuditLogsPage) {
          window.HRM.AuditLogsPage.render(container);
        }
      });

      // Register 404 Not Found Handler
      router.setNotFound((container) => {
        if (window.HRM && window.HRM.NotFoundPage) {
          window.HRM.NotFoundPage.render(container);
        }
      });

      // Start Router listening
      router.init('#main-content');
    }

    console.info('[HRM Core] Phase 2 Database & Seed Engine successfully initialized.');
  } catch (err) {
    console.error('[HRM Core] Initialization failed:', err);
  }
});
