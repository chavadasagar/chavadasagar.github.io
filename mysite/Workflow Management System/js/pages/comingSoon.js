/**
 * ==================================================
 * COMING SOON PAGE
 * Standard placeholder for modules scheduled in upcoming phases
 * ==================================================
 */

(function () {
  'use strict';

  const MODULE_METADATA = {
    '#/users': {
      title: 'User Management',
      phase: 'Phase 2',
      description: 'Employee profiles, account provisioning, department assignment, and authentication will be introduced here.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
    },
    '#/roles': {
      title: 'Role Management',
      phase: 'Phase 2',
      description: 'Define custom organizational roles, hierarchical authority, and assign roles to users.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
    },
    '#/permissions': {
      title: 'Permissions Matrix',
      phase: 'Phase 2',
      description: 'Granular CRUD permission matrix mapping system privileges to roles and users.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
    },
    '#/workflows': {
      title: 'Approval Workflows',
      phase: 'Phase 3',
      description: 'Visual workflow designer for leave requests, expense approvals, onboarding, and multi-tier escalation.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`
    },
    '#/approvals': {
      title: 'Approvals Inbox',
      phase: 'Phase 3',
      description: 'Manager approval queue with instant review, approve/reject actions, and audit trails.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    },
    '#/settings': {
      title: 'Application Settings',
      phase: 'Phase 4',
      description: 'Global HRM system configurations, company branding, notifications settings, and database backups.',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
    }
  };

  class ComingSoonPage {
    render(container, routeHash) {
      const meta = MODULE_METADATA[routeHash] || {
        title: 'Module In Development',
        phase: 'Upcoming Phase',
        description: 'This feature is currently scheduled for upcoming implementation phases.',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
      };

      container.innerHTML = `
        <div class="empty-state" style="margin-top: var(--space-6);">
          <div class="empty-state-icon" style="color: var(--primary);">
            ${meta.icon}
          </div>
          <div style="margin-bottom: var(--space-2);">
            <span class="badge badge-warning badge-pill">${meta.phase}</span>
          </div>
          <h2 class="empty-state-title">${meta.title}</h2>
          <p class="empty-state-desc">
            ${meta.description}
          </p>
          <div class="empty-state-actions flex items-center gap-3">
            <a href="#/dashboard" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Back to Dashboard
            </a>
            <button type="button" class="btn btn-secondary" onclick="window.Toast.info('This module will be activated in ${meta.phase}.', '${meta.title}')">
              Notify When Ready
            </button>
          </div>
        </div>
      `;
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.ComingSoonPage = new ComingSoonPage();
  window.ComingSoonPage = window.HRM.ComingSoonPage;
})();
