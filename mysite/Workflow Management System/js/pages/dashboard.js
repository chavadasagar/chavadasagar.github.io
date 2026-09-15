/**
 * ==================================================
 * DASHBOARD PAGE
 * Renders Foundation Dashboard and Component Verification Suite
 * ==================================================
 */

(function () {
  'use strict';

  class DashboardPage {
    render(container) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      const stats = dbService ? dbService.getStats() : {};
      const db = dbService ? dbService.getDatabase() : {};

      const tableCount = Object.keys(stats).length || 18;
      const usersCount = (db.users && db.users.length) || 0;
      const rolesCount = (db.roles && db.roles.length) || 0;
      const permissionsCount = (db.permissions && db.permissions.length) || 0;
      const userRolesCount = (db.userRoles && db.userRoles.length) || 0;
      const rolePermissionsCount = (db.rolePermissions && db.rolePermissions.length) || 0;

      container.innerHTML = `
        <div class="dashboard-page">
          <!-- Page Header -->
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700;">HRM Executive Dashboard</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Phase 2 Database & Seed Data Verification &bull; Relational RBAC Foundation
              </p>
            </div>
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="badge badge-success badge-pill">
                <span class="status-indicator"></span> Phase 2 Complete
              </span>
              <button type="button" class="btn btn-outline btn-sm" id="btn-inspect-db">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Inspect Database
              </button>
            </div>
          </div>

          <!-- KPI Stat Cards -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
            <div class="stat-card">
              <div class="stat-info">
                <span class="stat-label">Active Users</span>
                <span class="stat-value">${usersCount}</span>
                <span class="stat-meta text-muted">${userRolesCount} Role Assignments</span>
              </div>
              <div class="stat-icon-wrapper" style="color: var(--info);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-info">
                <span class="stat-label">System Roles</span>
                <span class="stat-value">${rolesCount}</span>
                <span class="stat-meta text-muted">RBAC Schema Active</span>
              </div>
              <div class="stat-icon-wrapper" style="color: var(--warning);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-info">
                <span class="stat-label">System Permissions</span>
                <span class="stat-value">${permissionsCount}</span>
                <span class="stat-meta text-muted">${rolePermissionsCount} Matrix Mappings</span>
              </div>
              <div class="stat-icon-wrapper" style="color: var(--primary);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-info">
                <span class="stat-label">Database Tables</span>
                <span class="stat-value">${tableCount}</span>
                <span class="stat-meta text-muted">Root: hrm_database</span>
              </div>
              <div class="stat-icon-wrapper" style="color: var(--success);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              </div>
            </div>
          </div>

          <!-- Section: Relational Seed Data Quick Preview -->
          <div class="card" style="margin-bottom: var(--space-6);">
            <div class="card-header">
              <div>
                <h3 class="card-title">Seeded Demo Employees (with Multi-Role Support)</h3>
                <div class="card-subtitle">Users are mapped to roles through the separate <code style="font-family: var(--font-mono); font-size: 11px;">userRoles</code> junction collection</div>
              </div>
              <a href="#/settings" class="btn btn-outline btn-sm">Database Settings & Reset</a>
            </div>
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Emp Code</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Assigned Roles (Multi-Role Support)</th>
                    <th>Password (Demo)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${(db.users || []).map(u => {
                    const assigned = dbService.getUserRoles(u.id);
                    return `
                      <tr>
                        <td><code style="font-family: var(--font-mono); font-size: 12px; color: var(--primary-text); background: var(--surface-elevated); padding: 2px 6px; border-radius: 4px;">${u.employeeCode}</code></td>
                        <td class="font-semibold">${u.name}</td>
                        <td class="text-secondary">${u.email}</td>
                        <td>
                          <div class="flex items-center gap-1" style="flex-wrap: wrap;">
                            ${assigned.map(r => `<span class="badge badge-primary badge-pill">${r.name}</span>`).join('')}
                          </div>
                        </td>
                        <td><code style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${u.password}</code></td>
                        <td><span class="badge badge-success">Active</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Grid Section: Interactive Controls & Database Verification -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-6);">
            <!-- Interactive Modal & Toast Tester -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Interactive UI Verification</h3>
                  <div class="card-subtitle">Test Modals and Toasts without external dependencies</div>
                </div>
              </div>
              <div class="card-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
                <div>
                  <label class="form-label" style="margin-bottom: var(--space-2);">Modal Dialogs</label>
                  <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                    <button type="button" class="btn btn-primary btn-sm" id="btn-demo-modal">
                      Open Action Modal
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-demo-info-modal">
                      System Architecture
                    </button>
                  </div>
                </div>

                <div>
                  <label class="form-label" style="margin-bottom: var(--space-2);">Toast Notifications</label>
                  <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                    <button type="button" class="btn btn-success btn-sm" id="btn-toast-success">Success</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="color: var(--warning-text); border-color: var(--warning-border);" id="btn-toast-warning">Warning</button>
                    <button type="button" class="btn btn-danger btn-sm" id="btn-toast-danger">Error</button>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-toast-info">Info</button>
                  </div>
                </div>

                <div>
                  <label class="form-label" style="margin-bottom: var(--space-2);">Quick Nav Test</label>
                  <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                    <a href="#/settings" class="btn btn-secondary btn-sm">Go to Settings (Reset DB)</a>
                    <a href="#/workflows" class="btn btn-secondary btn-sm">Go to Workflows</a>
                    <a href="#/non-existent-route" class="btn btn-ghost btn-sm">Test 404 Route</a>
                  </div>
                </div>
              </div>
            </div>

            <!-- Database & Storage Status Card -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Database Collections</h3>
                  <div class="card-subtitle">Root key: <code style="font-family: var(--font-mono); color: var(--primary-text); background: var(--primary); padding: 2px 6px; border-radius: 4px; font-size: 11px;">hrm_database</code></div>
                </div>
                <a href="#/settings" class="btn btn-secondary btn-sm">
                  Manage
                </a>
              </div>
              <div class="card-body">
                <p class="text-sm text-secondary" style="margin-bottom: var(--space-3);">
                  Real-time record counts across all schema collections:
                </p>
                <div class="flex items-center gap-2" style="flex-wrap: wrap; margin-bottom: var(--space-4);" id="db-tables-pill-container">
                  ${Object.keys(stats).map(tbl => `
                    <span class="badge badge-muted badge-pill" style="font-family: var(--font-mono); font-size: 11px;">
                      ${tbl} <strong style="color: var(--primary);">${stats[tbl]}</strong>
                    </span>
                  `).join('')}
                </div>
                <div class="card-footer" style="margin: 0 -1.5rem -1.5rem; border-radius: 0 0 var(--radius-lg) var(--radius-lg);">
                  <span class="text-xs text-muted">Pure client-side persistence &bull; Zero backend required</span>
                  <span class="badge badge-success">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents(container);
    }

    bindEvents(container) {
      // Demo Action Modal
      const demoModalBtn = container.querySelector('#btn-demo-modal');
      if (demoModalBtn) {
        demoModalBtn.addEventListener('click', () => {
          if (!window.HRM || !window.HRM.Modal) return;
          window.HRM.Modal.open({
            title: 'Verify HRM Foundation',
            content: `
              <p style="margin-bottom: var(--space-3);">
                Phase 2 seed data and DatabaseService are operational with zero external dependencies.
              </p>
              <div class="form-group">
                <label class="form-label required">Tester Name</label>
                <input type="text" class="input" value="Antigravity Test Agent" id="tester-input-field">
                <div class="form-help">Enter your name to confirm modal input interactions.</div>
              </div>
            `,
            confirmText: 'Confirm & Toast',
            confirmClass: 'btn-primary',
            cancelText: 'Cancel',
            onConfirm: () => {
              const input = document.getElementById('tester-input-field');
              const name = input ? input.value : 'Tester';
              if (window.HRM && window.HRM.Toast) {
                window.HRM.Toast.success(`Database verified by ${name}!`, 'Modal Action');
              }
            }
          });
        });
      }

      // Demo Info Modal
      const infoModalBtn = container.querySelector('#btn-demo-info-modal');
      if (infoModalBtn) {
        infoModalBtn.addEventListener('click', () => {
          if (!window.HRM || !window.HRM.Modal) return;
          window.HRM.Modal.open({
            title: 'System Architecture Overview',
            content: `
              <div style="font-size: var(--text-sm);">
                <p><strong>Database:</strong> Centralized <code>DatabaseService</code> using <code>hrm_database</code>.</p>
                <p><strong>Entities:</strong> 5 Users, 5 Roles, 23 Permissions.</p>
                <p><strong>Junctions:</strong> <code>userRoles</code> and <code>rolePermissions</code> for flexible M:N mappings.</p>
                <p><strong>Routing:</strong> Client-side hash routing with route persistence on refresh.</p>
              </div>
            `,
            confirmText: 'Got It',
            cancelText: null
          });
        });
      }

      // Toasts
      const successBtn = container.querySelector('#btn-toast-success');
      if (successBtn) {
        successBtn.addEventListener('click', () => {
          window.HRM.Toast.success('DatabaseService synchronized successfully.', 'Storage OK');
        });
      }

      const warningBtn = container.querySelector('#btn-toast-warning');
      if (warningBtn) {
        warningBtn.addEventListener('click', () => {
          window.HRM.Toast.warning('Login & Auth are deferred to next phase.', 'Notice');
        });
      }

      const dangerBtn = container.querySelector('#btn-toast-danger');
      if (dangerBtn) {
        dangerBtn.addEventListener('click', () => {
          window.HRM.Toast.danger('Sample danger alert demonstrated for error handling.', 'Error Notice');
        });
      }

      const infoBtn = container.querySelector('#btn-toast-info');
      if (infoBtn) {
        infoBtn.addEventListener('click', () => {
          window.HRM.Toast.info('Current route: ' + window.location.hash, 'Route Information');
        });
      }

      // Inspect DB
      const inspectDbBtn = container.querySelector('#btn-inspect-db');
      if (inspectDbBtn) {
        inspectDbBtn.addEventListener('click', () => {
          const db = window.HRM.DatabaseService.getDatabase();
          window.HRM.Modal.open({
            title: 'Database Inspector (hrm_database)',
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
  window.HRM.DashboardPage = new DashboardPage();
  window.DashboardPage = window.HRM.DashboardPage;
})();
