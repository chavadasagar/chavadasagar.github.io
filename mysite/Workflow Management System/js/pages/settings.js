/**
 * ==================================================
 * SETTINGS PAGE
 * Platform Configuration, Diagnostics, and Database Reset
 * ==================================================
 */

(function () {
  'use strict';

  class SettingsPage {
    render(container) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      const db = dbService ? dbService.getDatabase() : {};
      const stats = dbService ? dbService.getStats() : {};

      const users = db.users || [];
      const roles = db.roles || [];
      const permissions = db.permissions || [];
      const userRoles = db.userRoles || [];
      const rolePermissions = db.rolePermissions || [];

      // Calculate multi-role user examples
      const userRoleSummary = users.map(u => {
        const assignedRoles = (dbService && typeof dbService.getUserRoles === 'function')
          ? dbService.getUserRoles(u.id)
          : [];
        return {
          name: u.name,
          email: u.email,
          empCode: u.employeeCode,
          roles: assignedRoles.map(r => r.name)
        };
      });

      container.innerHTML = `
        <div class="settings-page">
          <!-- Page Header -->
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700;">System Settings</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Platform configuration, database management, and LocalStorage diagnostics
              </p>
            </div>
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="badge badge-primary badge-pill">Phase 2 Active</span>
              <button type="button" class="btn btn-outline btn-sm" id="btn-settings-inspect-json">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Inspect Raw JSON
              </button>
            </div>
          </div>

          <!-- Section 1: Database Management & Reset (Requirement 9) -->
          <div class="card" style="margin-bottom: var(--space-6); border-color: rgba(239, 68, 68, 0.3);">
            <div class="card-header" style="background-color: rgba(239, 68, 68, 0.04);">
              <div>
                <h3 class="card-title" style="color: var(--text); display: flex; align-items: center; gap: 8px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--danger);"><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse></svg>
                  Database Management
                </h3>
                <div class="card-subtitle">Manage single root key <code style="font-family: var(--font-mono); color: var(--primary-text); background: var(--primary); padding: 1px 6px; border-radius: 4px; font-size: 11px;">hrm_database</code></div>
              </div>
              <button type="button" class="btn btn-danger" id="btn-reset-demo-database">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path><path d="M21 22v-6h-6"></path><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path></svg>
                Reset Demo Database
              </button>
            </div>
            <div class="card-body">
              <p class="text-sm text-secondary" style="margin-bottom: var(--space-4);">
                Resetting the demo database will clear all current tables and re-populate fresh, realistic HRM seed data (5 demo users, 5 roles, 23 permissions, multi-role user assignments, and role-permission matrices).
              </p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
                <div style="background: var(--surface-elevated); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--border);">
                  <div class="text-xs text-muted font-medium">USERS</div>
                  <div style="font-size: var(--text-xl); font-weight: 700; color: var(--text);">${users.length}</div>
                  <div class="text-xs text-secondary">Demo Employees</div>
                </div>
                <div style="background: var(--surface-elevated); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--border);">
                  <div class="text-xs text-muted font-medium">ROLES</div>
                  <div style="font-size: var(--text-xl); font-weight: 700; color: var(--text);">${roles.length}</div>
                  <div class="text-xs text-secondary">RBAC System Roles</div>
                </div>
                <div style="background: var(--surface-elevated); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--border);">
                  <div class="text-xs text-muted font-medium">PERMISSIONS</div>
                  <div style="font-size: var(--text-xl); font-weight: 700; color: var(--text);">${permissions.length}</div>
                  <div class="text-xs text-secondary">Granular Actions</div>
                </div>
                <div style="background: var(--surface-elevated); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--border);">
                  <div class="text-xs text-muted font-medium">USER ROLES (M:N)</div>
                  <div style="font-size: var(--text-xl); font-weight: 700; color: var(--text);">${userRoles.length}</div>
                  <div class="text-xs text-secondary">Multi-Role Mappings</div>
                </div>
                <div style="background: var(--surface-elevated); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--border);">
                  <div class="text-xs text-muted font-medium">ROLE PERMS (M:N)</div>
                  <div style="font-size: var(--text-xl); font-weight: 700; color: var(--text);">${rolePermissions.length}</div>
                  <div class="text-xs text-secondary">Permission Mappings</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Relational Seed Data Verification -->
          <div class="card" style="margin-bottom: var(--space-6);">
            <div class="card-header">
              <div>
                <h3 class="card-title">User & Role Relational Mapping (userRoles)</h3>
                <div class="card-subtitle">Verification that users support multiple assigned roles via separate junction records</div>
              </div>
              <span class="badge badge-success">Many-to-Many Verified</span>
            </div>
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Assigned Roles (userRoles)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${userRoleSummary.map(u => `
                    <tr>
                      <td><code style="font-family: var(--font-mono); font-size: 12px; color: var(--primary-text); background: var(--surface-elevated); padding: 2px 6px; border-radius: 4px;">${u.empCode}</code></td>
                      <td class="font-semibold">${u.name}</td>
                      <td class="text-secondary">${u.email}</td>
                      <td>
                        <div class="flex items-center gap-1" style="flex-wrap: wrap;">
                          ${u.roles.map(r => `<span class="badge badge-primary badge-pill">${r}</span>`).join('')}
                        </div>
                      </td>
                      <td><span class="badge badge-success">Active</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 3: System Roles & Permissions Breakdown -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Role Capabilities Breakdown (rolePermissions)</h3>
                <div class="card-subtitle">Granular permission count allocated to each system role</div>
              </div>
            </div>
            <div class="card-body">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4);">
                ${roles.map(role => {
                  const perms = (dbService && typeof dbService.getRolePermissions === 'function')
                    ? dbService.getRolePermissions(role.id)
                    : [];
                  return `
                    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4);">
                      <div class="flex items-center justify-between" style="margin-bottom: var(--space-2);">
                        <span class="font-semibold" style="color: var(--text);">${role.name}</span>
                        <span class="badge badge-info">${perms.length} perms</span>
                      </div>
                      <p class="text-xs text-muted" style="margin-bottom: var(--space-3); min-height: 36px;">${role.description}</p>
                      <div class="text-xs text-secondary font-mono" style="font-size: 11px;">
                        Code: <strong>${role.code}</strong>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents(container);
    }

    bindEvents(container) {
      // Reset Demo Database Button with Confirmation Modal (Requirement 9)
      const resetBtn = container.querySelector('#btn-reset-demo-database');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (!window.HRM || !window.HRM.Modal) return;

          window.HRM.Modal.open({
            title: 'Reset Demo Database?',
            content: `
              <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                <p>
                  Are you sure you want to reset the HRM database? This action will overwrite existing state in <code style="font-family: var(--font-mono); color: var(--primary);">hrm_database</code> and restore factory seed data:
                </p>
                <ul style="padding-left: 20px; font-size: var(--text-sm); line-height: 1.6; color: var(--text-secondary);">
                  <li>5 Demo User Profiles (with employee codes EMP-001 through EMP-005)</li>
                  <li>5 System Roles (Super Admin, HR Admin, Manager, Employee, Finance)</li>
                  <li>23 Granular System Permissions</li>
                  <li>Multi-role assignments in <code>userRoles</code></li>
                  <li>Permission matrices in <code>rolePermissions</code></li>
                </ul>
                <p class="text-xs text-muted">
                  Storage location: Client LocalStorage &bull; Zero external servers affected.
                </p>
              </div>
            `,
            confirmText: 'Yes, Reset Database',
            confirmClass: 'btn-danger',
            cancelText: 'Cancel',
            onConfirm: () => {
              if (window.HRM && window.HRM.DatabaseService) {
                window.HRM.DatabaseService.resetDatabase();
                if (window.HRM.Toast) {
                  window.HRM.Toast.success('Database has been reset and freshly seeded with demo records.', 'Database Reset');
                }
                // Re-render settings view to show updated data
                this.render(container);
              }
            }
          });
        });
      }

      // Inspect Raw JSON Modal
      const inspectBtn = container.querySelector('#btn-settings-inspect-json');
      if (inspectBtn) {
        inspectBtn.addEventListener('click', () => {
          if (!window.HRM || !window.HRM.DatabaseService) return;
          const db = window.HRM.DatabaseService.getDatabase();
          window.HRM.Modal.open({
            title: 'Raw LocalStorage Inspector (hrm_database)',
            content: `
              <pre style="background: var(--background); padding: var(--space-4); border-radius: var(--radius-md); max-height: 380px; overflow: auto; font-family: var(--font-mono); font-size: 11px; color: var(--text); border: 1px solid var(--border);">${JSON.stringify(db, null, 2)}</pre>
            `,
            confirmText: 'Close',
            cancelText: null
          });
        });
      }
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.SettingsPage = new SettingsPage();
  window.SettingsPage = window.HRM.SettingsPage;
})();
