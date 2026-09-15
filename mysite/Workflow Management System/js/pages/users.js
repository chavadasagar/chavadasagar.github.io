/**
 * ==================================================
 * USERS PAGE
 * Enterprise User Management Module
 * Route: #/users
 * ==================================================
 */

(function () {
  'use strict';

  class UsersPage {
    constructor() {
      this.container = null;
      this.searchQuery = '';
      this.statusFilter = 'all';
    }

    render(container) {
      this.container = container;
      const userService = window.HRM ? window.HRM.UserService : null;
      const allUsers = userService ? userService.getAll() : [];

      const activeCount = allUsers.filter(u => (u.status || '').toLowerCase() === 'active').length;
      const inactiveCount = allUsers.length - activeCount;

      // Filter users
      const filteredUsers = allUsers.filter(u => {
        // Status filter
        if (this.statusFilter === 'active' && (u.status || '').toLowerCase() !== 'active') return false;
        if (this.statusFilter === 'inactive' && (u.status || '').toLowerCase() === 'active') return false;

        // Search query
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          const matchesName = (u.name || '').toLowerCase().includes(q);
          const matchesEmail = (u.email || '').toLowerCase().includes(q);
          const matchesCode = (u.employeeCode || '').toLowerCase().includes(q);
          return matchesName || matchesEmail || matchesCode;
        }

        return true;
      });

      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const canCreate = authz ? authz.can('user.create') : true;
      const canEdit = authz ? authz.can('user.edit') : true;
      const canDelete = authz ? authz.can('user.delete') : true;

      container.innerHTML = `
        <div class="users-page">
          <!-- Page Header -->
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700;">User Management</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Manage employee profiles, credentials, statuses, and role associations
              </p>
            </div>
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="badge badge-success badge-pill">${activeCount} Active</span>
              <span class="badge badge-muted badge-pill">${inactiveCount} Inactive</span>
              ${canCreate ? `
                <button type="button" class="btn btn-primary" id="btn-create-user-modal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Add User</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Filter & Search Controls Bar -->
          <div class="card" style="margin-bottom: var(--space-6); padding: var(--space-4);">
            <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: var(--space-3);">
              <div class="flex items-center gap-2" style="flex: 1; min-width: 260px;">
                <div style="position: relative; width: 100%;">
                  <input 
                    type="text" 
                    id="users-search-input" 
                    class="input" 
                    placeholder="Search by name, email, or employee code..."
                    value="${this._escapeHtml(this.searchQuery)}"
                    style="padding-left: 36px;"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <label class="form-label text-xs text-muted" for="users-status-select">Status:</label>
                  <select id="users-status-select" class="select" style="width: 140px; padding: 0.45rem 2rem 0.45rem 0.75rem; font-size: var(--text-xs);">
                    <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                    <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active Only</option>
                    <option value="inactive" ${this.statusFilter === 'inactive' ? 'selected' : ''}>Inactive Only</option>
                  </select>
                </div>

                ${(this.searchQuery || this.statusFilter !== 'all') ? `
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-clear-user-filters">
                    Clear Filters
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Users Data Table Card -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Employee Directory</h3>
                <div class="card-subtitle">Showing ${filteredUsers.length} of ${allUsers.length} total user records</div>
              </div>
              <span class="badge badge-primary">Database Sync Active</span>
            </div>
            
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Emp Code</th>
                    <th>Name</th>
                    <th>Email Address</th>
                    <th>Status</th>
                    <th>Assigned Roles</th>
                    <th>Created At</th>
                    <th style="text-align: right; min-width: 220px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredUsers.length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align: center; padding: var(--space-8);">
                        <div class="empty-state" style="border: none; padding: var(--space-4);">
                          <div class="empty-state-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                          </div>
                          <h4 class="empty-state-title" style="font-size: var(--text-base);">No Users Found</h4>
                          <p class="empty-state-desc" style="font-size: var(--text-xs);">
                            ${this.searchQuery ? `No user accounts match "${this.searchQuery}".` : 'No users exist in the current filter scope.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ` : filteredUsers.map(user => {
                    const isActive = (user.status || '').toLowerCase() === 'active';
                    const roles = user.roles || [];
                    const formattedDate = user.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—';

                    return `
                      <tr>
                        <td>
                          <code style="font-family: var(--font-mono); font-size: 11px; color: var(--primary-text); background: var(--surface-elevated); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">
                            ${this._escapeHtml(user.employeeCode || 'N/A')}
                          </code>
                        </td>
                        <td>
                          <div class="flex items-center gap-2">
                            <div style="width: 28px; height: 28px; border-radius: var(--radius-full); background: ${isActive ? 'var(--primary)' : 'var(--muted)'}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #ffffff; flex-shrink: 0;">
                              ${(user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <span class="font-semibold text-sm" style="color: var(--text);">${this._escapeHtml(user.name)}</span>
                          </div>
                        </td>
                        <td class="text-secondary text-sm">${this._escapeHtml(user.email)}</td>
                        <td>
                          <span class="badge ${isActive ? 'badge-success' : 'badge-danger'} badge-pill">
                            ${isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div class="flex items-center gap-1" style="flex-wrap: wrap;">
                            ${roles.length > 0 
                              ? roles.map(r => `<span class="badge badge-primary badge-pill" style="font-size: 10px;">${this._escapeHtml(r.name)}</span>`).join('') 
                              : '<span class="text-xs text-muted">No roles</span>'}
                          </div>
                        </td>
                        <td class="text-muted text-xs">${formattedDate}</td>
                        <td style="text-align: right;">
                          <div class="flex items-center justify-end gap-1">
                            <!-- View Action -->
                            <button 
                              type="button" 
                              class="btn btn-ghost btn-sm btn-view-user" 
                              data-id="${user.id}" 
                              title="View Details"
                            >
                              View
                            </button>

                            <!-- Edit Action -->
                            ${canEdit ? `
                              <button 
                                type="button" 
                                class="btn btn-outline btn-sm btn-edit-user" 
                                data-id="${user.id}" 
                                title="Edit User"
                              >
                                Edit
                              </button>

                              <!-- Change Password Action -->
                              <button 
                                type="button" 
                                class="btn btn-ghost btn-sm btn-pwd-user" 
                                data-id="${user.id}" 
                                title="Change Password"
                              >
                                Password
                              </button>
                            ` : ''}

                            <!-- Deactivate / Activate Action -->
                            ${canDelete ? `
                              <button 
                                type="button" 
                                class="btn btn-sm ${isActive ? 'btn-danger' : 'btn-success'} btn-toggle-status-user" 
                                data-id="${user.id}" 
                                data-status="${isActive ? 'Active' : 'Inactive'}"
                                title="${isActive ? 'Deactivate user' : 'Activate user'}"
                                style="font-size: 11px; padding: 0.3rem 0.6rem;"
                              >
                                ${isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            ` : ''}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      this.bindEvents();
    }

    bindEvents() {
      // 1. Search input handler (live search)
      const searchInput = this.container.querySelector('#users-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim();
          this.render(this.container);
        });
      }

      // 2. Status select filter
      const statusSelect = this.container.querySelector('#users-status-select');
      if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
          this.statusFilter = e.target.value;
          this.render(this.container);
        });
      }

      // 3. Clear filters button
      const clearBtn = this.container.querySelector('#btn-clear-user-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.searchQuery = '';
          this.statusFilter = 'all';
          this.render(this.container);
        });
      }

      // 4. Create User Modal Launcher
      const createBtn = this.container.querySelector('#btn-create-user-modal');
      if (createBtn) {
        createBtn.addEventListener('click', () => this.openCreateModal());
      }

      // 5. View User Buttons
      this.container.querySelectorAll('.btn-view-user').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openViewModal(id);
        });
      });

      // 6. Edit User Buttons
      this.container.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openEditModal(id);
        });
      });

      // 7. Change Password Buttons
      this.container.querySelectorAll('.btn-pwd-user').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openPasswordModal(id);
        });
      });

      // 8. Toggle Status (Deactivate / Activate)
      this.container.querySelectorAll('.btn-toggle-status-user').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const currentStatus = btn.getAttribute('data-status');
          this.confirmToggleStatus(id, currentStatus);
        });
      });
    }

    /**
     * Open View User Modal
     */
    openViewModal(id) {
      const user = window.HRM.UserService.getById(id);
      if (!user) return;

      const roles = user.roles || [];
      const isActive = (user.status || '').toLowerCase() === 'active';

      window.HRM.Modal.open({
        title: `Employee Profile — ${user.name}`,
        content: `
          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="flex items-center gap-3" style="padding-bottom: var(--space-3); border-bottom: 1px solid var(--border);">
              <div style="width: 44px; height: 44px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #ffffff;">
                ${user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 style="margin: 0; font-size: var(--text-base);">${this._escapeHtml(user.name)}</h4>
                <span class="text-xs text-secondary">${this._escapeHtml(user.email)}</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); font-size: var(--text-sm);">
              <div>
                <span class="text-xs text-muted">EMPLOYEE CODE</span>
                <div style="font-family: var(--font-mono); font-weight: 600; color: var(--text);">${this._escapeHtml(user.employeeCode || 'N/A')}</div>
              </div>
              <div>
                <span class="text-xs text-muted">STATUS</span>
                <div>
                  <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div>
                <span class="text-xs text-muted">SYSTEM ID</span>
                <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);">${user.id}</div>
              </div>
              <div>
                <span class="text-xs text-muted">MEMBER SINCE</span>
                <div style="color: var(--text);">${new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div>
              <span class="text-xs text-muted" style="display: block; margin-bottom: 6px;">ASSIGNED ROLES (via userRoles)</span>
              <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                ${roles.length > 0 
                  ? roles.map(r => `<span class="badge badge-primary">${this._escapeHtml(r.name)} (${this._escapeHtml(r.code)})</span>`).join('') 
                  : '<span class="text-xs text-muted">No roles assigned</span>'}
              </div>
            </div>
          </div>
        `,
        confirmText: 'Close',
        cancelText: null
      });
    }

    /**
     * Open Create User Modal
     */
    openCreateModal() {
      const db = (window.HRM && window.HRM.DatabaseService) ? window.HRM.DatabaseService.getDatabase() : {};
      const allRoles = db.roles || [];

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <div id="create-user-error" class="hidden" style="background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger-text); padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); margin-bottom: var(--space-4);"></div>

        <form id="create-user-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="new-user-name">Full Name</label>
            <input type="text" id="new-user-name" class="input" placeholder="e.g. Rachel Green" required>
          </div>

          <div class="form-group">
            <label class="form-label required" for="new-user-email">Email Address</label>
            <input type="email" id="new-user-email" class="input" placeholder="e.g. rachel.green@company.com" required>
            <div class="form-help">Must be unique across the organization.</div>
          </div>

          <div class="form-group">
            <label class="form-label required" for="new-user-code">Employee Code</label>
            <input type="text" id="new-user-code" class="input" placeholder="e.g. EMP-006" required>
          </div>

          <div class="form-group">
            <label class="form-label required" for="new-user-password">Initial Password</label>
            <input type="password" id="new-user-password" class="input" placeholder="Temporary password" required>
            <div class="form-help">User can change their password after creation.</div>
          </div>

          <div class="form-group">
            <label class="form-label font-semibold" style="margin-bottom: var(--space-2);">Assigned Roles</label>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-2); background: var(--surface); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border);">
              ${allRoles.map(r => `
                <label class="checkbox-label" style="font-size: var(--text-xs);">
                  <input type="checkbox" class="checkbox-input create-user-role-checkbox" value="${r.id}" ${r.code === 'EMPLOYEE' ? 'checked' : ''}>
                  <span>${this._escapeHtml(r.name)}</span>
                </label>
              `).join('')}
            </div>
            <div class="form-help">Select one or more roles to assign upon creation.</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="new-user-status">Initial Status</label>
            <select id="new-user-status" class="select">
              <option value="Active" selected>Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </form>
      `;

      window.HRM.Modal.open({
        title: 'Create New User Account',
        content: modalBody,
        confirmText: 'Create User',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const nameInput = modalBody.querySelector('#new-user-name');
          const emailInput = modalBody.querySelector('#new-user-email');
          const codeInput = modalBody.querySelector('#new-user-code');
          const passInput = modalBody.querySelector('#new-user-password');
          const statusSelect = modalBody.querySelector('#new-user-status');
          const selectedRoleIds = Array.from(modalBody.querySelectorAll('.create-user-role-checkbox:checked')).map(cb => cb.value);

          const data = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            employeeCode: codeInput.value.trim(),
            password: passInput.value.trim(),
            status: statusSelect.value,
            roleIds: selectedRoleIds
          };

          const result = window.HRM.UserService.create(data);

          if (!result.success) {
            alert(result.error || 'Failed to create user.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(`User "${result.user.name}" created successfully.`, 'User Provisioned');
          }
          this.render(this.container);
        }
      });
    }

    /**
     * Open Edit User Modal (Does NOT expose password, provides Roles multi-select UI)
     */
    openEditModal(id) {
      const user = window.HRM.UserService.getById(id);
      if (!user) return;

      const db = (window.HRM && window.HRM.DatabaseService) ? window.HRM.DatabaseService.getDatabase() : {};
      const allRoles = db.roles || [];

      // Get assigned roles for user via UserRoleService
      const assignedRoles = (window.HRM && window.HRM.UserRoleService)
        ? window.HRM.UserRoleService.getRolesForUser(id)
        : (user.roles || []);
      const assignedRoleIds = new Set(assignedRoles.map(r => r.id));

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <form id="edit-user-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="edit-user-name">Full Name</label>
            <input type="text" id="edit-user-name" class="input" value="${this._escapeHtml(user.name)}" required>
          </div>

          <div class="form-group">
            <label class="form-label required" for="edit-user-email">Email Address</label>
            <input type="email" id="edit-user-email" class="input" value="${this._escapeHtml(user.email)}" required>
            <div class="form-help">Must remain unique across all user accounts.</div>
          </div>

          <div class="form-group">
            <label class="form-label required" for="edit-user-code">Employee Code</label>
            <input type="text" id="edit-user-code" class="input" value="${this._escapeHtml(user.employeeCode || '')}" required>
          </div>

          <!-- Multi-Role Selection UI (Requirement 1) -->
          <div class="form-group" style="margin-top: var(--space-4);">
            <label class="form-label font-semibold" style="margin-bottom: var(--space-2);">Roles</label>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-2); background: var(--surface); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border);">
              ${allRoles.map(r => `
                <label class="checkbox-label" style="font-size: var(--text-xs);">
                  <input 
                    type="checkbox" 
                    class="checkbox-input edit-user-role-checkbox" 
                    value="${r.id}" 
                    ${assignedRoleIds.has(r.id) ? 'checked' : ''}
                  >
                  <span>${this._escapeHtml(r.name)}</span>
                </label>
              `).join('')}
            </div>
            <div class="form-help">Check all roles that apply. Users support multiple simultaneous roles.</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="edit-user-status">Account Status</label>
            <select id="edit-user-status" class="select">
              <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>

          <div style="background: var(--surface); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border); margin-top: var(--space-4);">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold" style="color: var(--text);">Password Management</span>
                <div class="text-xs text-muted">Password is hidden for security.</div>
              </div>
              <button type="button" class="btn btn-outline btn-sm" id="btn-edit-trigger-pwd">Change Password</button>
            </div>
          </div>
        </form>
      `;

      // Hook change password button from edit modal
      const triggerPwdBtn = modalBody.querySelector('#btn-edit-trigger-pwd');
      if (triggerPwdBtn) {
        triggerPwdBtn.addEventListener('click', () => {
          window.HRM.Modal.close();
          setTimeout(() => this.openPasswordModal(id), 200);
        });
      }

      window.HRM.Modal.open({
        title: `Edit User — ${user.name}`,
        content: modalBody,
        confirmText: 'Save Changes',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const name = modalBody.querySelector('#edit-user-name').value.trim();
          const email = modalBody.querySelector('#edit-user-email').value.trim();
          const employeeCode = modalBody.querySelector('#edit-user-code').value.trim();
          const status = modalBody.querySelector('#edit-user-status').value;
          const selectedRoleIds = Array.from(modalBody.querySelectorAll('.edit-user-role-checkbox:checked')).map(cb => cb.value);

          const result = window.HRM.UserService.update(id, {
            name,
            email,
            employeeCode,
            status,
            roleIds: selectedRoleIds
          });

          if (!result.success) {
            alert(result.error || 'Failed to update user.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(`User "${name}" updated successfully with ${selectedRoleIds.length} role(s).`, 'Changes Saved');
          }
          this.render(this.container);
        }
      });
    }

    /**
     * Open Change Password Modal
     */
    openPasswordModal(id) {
      const user = window.HRM.UserService.getById(id);
      if (!user) return;

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <div style="margin-bottom: var(--space-4);">
          <p class="text-sm text-secondary">
            Updating password for <strong>${this._escapeHtml(user.name)}</strong> (${this._escapeHtml(user.email)}).
          </p>
        </div>

        <form id="change-pwd-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="new-password-input">New Password</label>
            <input type="password" id="new-password-input" class="input" placeholder="Enter new password (min 4 chars)" required>
          </div>

          <div class="form-group">
            <label class="form-label required" for="confirm-password-input">Confirm New Password</label>
            <input type="password" id="confirm-password-input" class="input" placeholder="Re-enter new password" required>
          </div>
        </form>
      `;

      window.HRM.Modal.open({
        title: `Change Password — ${user.name}`,
        content: modalBody,
        confirmText: 'Update Password',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const p1 = modalBody.querySelector('#new-password-input').value;
          const p2 = modalBody.querySelector('#confirm-password-input').value;

          if (p1 !== p2) {
            alert('Passwords do not match. Please verify.');
            return;
          }

          const result = window.HRM.UserService.changePassword(id, p1);

          if (!result.success) {
            alert(result.error || 'Failed to change password.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(`Password updated for "${user.name}".`, 'Password Changed');
          }
        }
      });
    }

    /**
     * Confirm Toggle User Status (Soft Deactivation / Activation)
     */
    confirmToggleStatus(id, currentStatus) {
      const user = window.HRM.UserService.getById(id);
      if (!user) return;

      const isDeactivating = currentStatus === 'Active';

      window.HRM.Modal.open({
        title: isDeactivating ? 'Deactivate User Account?' : 'Activate User Account?',
        content: `
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <p>
              ${isDeactivating 
                ? `Are you sure you want to deactivate <strong>${this._escapeHtml(user.name)}</strong>?`
                : `Are you sure you want to reactivate <strong>${this._escapeHtml(user.name)}</strong>?`}
            </p>
            <p class="text-xs text-muted">
              ${isDeactivating 
                ? 'Soft deactivation: The user record will NOT be deleted, but they will be blocked from logging into the platform.'
                : 'Reactivation: The user will regain immediate access to log into the HRM platform.'}
            </p>
          </div>
        `,
        confirmText: isDeactivating ? 'Yes, Deactivate' : 'Yes, Activate',
        confirmClass: isDeactivating ? 'btn-danger' : 'btn-success',
        cancelText: 'Cancel',
        onConfirm: () => {
          let result;
          if (isDeactivating) {
            result = window.HRM.UserService.deactivate(id);
          } else {
            result = window.HRM.UserService.activate(id);
          }

          if (result && result.success) {
            if (window.HRM.Toast) {
              window.HRM.Toast.success(
                `User "${user.name}" has been ${isDeactivating ? 'deactivated' : 'activated'}.`,
                isDeactivating ? 'Account Deactivated' : 'Account Activated'
              );
            }
            this.render(this.container);
          } else {
            alert((result && result.error) || 'Failed to update user status.');
          }
        }
      });
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
  window.HRM.UsersPage = new UsersPage();
  window.UsersPage = window.HRM.UsersPage;
})();
