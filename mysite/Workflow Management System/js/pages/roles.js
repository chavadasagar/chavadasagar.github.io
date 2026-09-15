/**
 * ==================================================
 * ROLES PAGE
 * Enterprise Role Management Module
 * Route: #/roles
 * ==================================================
 */

(function () {
  'use strict';

  class RolesPage {
    constructor() {
      this.container = null;
      this.searchQuery = '';
      this.statusFilter = 'all';
    }

    render(container) {
      this.container = container;
      const roleService = window.HRM ? window.HRM.RoleService : null;
      const allRoles = roleService ? roleService.getAll() : [];

      const activeCount = allRoles.filter(r => (r.status || '').toLowerCase() === 'active').length;
      const inactiveCount = allRoles.length - activeCount;

      // Filter roles
      const filteredRoles = allRoles.filter(r => {
        // Status filter
        if (this.statusFilter === 'active' && (r.status || '').toLowerCase() !== 'active') return false;
        if (this.statusFilter === 'inactive' && (r.status || '').toLowerCase() === 'active') return false;

        // Search query
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          const matchesName = (r.name || '').toLowerCase().includes(q);
          const matchesCode = (r.code || '').toLowerCase().includes(q);
          const matchesDesc = (r.description || '').toLowerCase().includes(q);
          return matchesName || matchesCode || matchesDesc;
        }

        return true;
      });

      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const canCreate = authz ? authz.can('role.create') : true;
      const canEdit = authz ? authz.can('role.edit') : true;
      const canDelete = authz ? authz.can('role.delete') : true;

      container.innerHTML = `
        <div class="roles-page">
          <!-- Page Header -->
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700;">Role Management</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Define organizational roles, authority levels, and RBAC permission matrices
              </p>
            </div>
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="badge badge-success badge-pill">${activeCount} Active</span>
              <span class="badge badge-muted badge-pill">${inactiveCount} Inactive</span>
              ${canCreate ? `
                <button type="button" class="btn btn-primary" id="btn-create-role-modal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Add Role</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Search & Filter Controls -->
          <div class="card" style="margin-bottom: var(--space-6); padding: var(--space-4);">
            <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: var(--space-3);">
              <div class="flex items-center gap-2" style="flex: 1; min-width: 260px;">
                <div style="position: relative; width: 100%;">
                  <input 
                    type="text" 
                    id="roles-search-input" 
                    class="input" 
                    placeholder="Search by role name, code, or description..."
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
                  <label class="form-label text-xs text-muted" for="roles-status-select">Status:</label>
                  <select id="roles-status-select" class="select" style="width: 140px; padding: 0.45rem 2rem 0.45rem 0.75rem; font-size: var(--text-xs);">
                    <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Roles</option>
                    <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active Only</option>
                    <option value="inactive" ${this.statusFilter === 'inactive' ? 'selected' : ''}>Inactive Only</option>
                  </select>
                </div>

                ${(this.searchQuery || this.statusFilter !== 'all') ? `
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-clear-role-filters">
                    Clear Filters
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Roles Table Card -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Configured System Roles</h3>
                <div class="card-subtitle">Showing ${filteredRoles.length} of ${allRoles.length} total roles</div>
              </div>
              <span class="badge badge-primary">RBAC Engine Active</span>
            </div>

            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Role Name</th>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Assigned Users</th>
                    <th>Assigned Permissions</th>
                    <th style="text-align: right; min-width: 220px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRoles.length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align: center; padding: var(--space-8);">
                        <div class="empty-state" style="border: none; padding: var(--space-4);">
                          <div class="empty-state-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                          </div>
                          <h4 class="empty-state-title" style="font-size: var(--text-base);">No Roles Found</h4>
                          <p class="empty-state-desc" style="font-size: var(--text-xs);">
                            ${this.searchQuery ? `No roles match "${this.searchQuery}".` : 'No roles available in the current filter scope.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ` : filteredRoles.map(role => {
                    const isActive = (role.status || '').toLowerCase() === 'active';

                    return `
                      <tr>
                        <td>
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-sm" style="color: var(--text);">${this._escapeHtml(role.name)}</span>
                            ${role.isSystem ? '<span class="badge badge-muted" style="font-size: 10px;">System</span>' : ''}
                          </div>
                        </td>
                        <td>
                          <code style="font-family: var(--font-mono); font-size: 11px; color: var(--primary-text); background: var(--surface-elevated); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">
                            ${this._escapeHtml(role.code)}
                          </code>
                        </td>
                        <td class="text-secondary text-sm" style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this._escapeHtml(role.description || '')}">
                          ${this._escapeHtml(role.description || '—')}
                        </td>
                        <td>
                          <span class="badge ${isActive ? 'badge-success' : 'badge-danger'} badge-pill">
                            ${isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button type="button" class="badge badge-primary badge-pill btn-view-assigned-users" data-id="${role.id}" style="cursor: pointer; border: none;" title="Click to view assigned users">
                            ${role.userCount} User${role.userCount === 1 ? '' : 's'}
                          </button>
                        </td>
                        <td>
                          <button type="button" class="badge badge-info badge-pill btn-view-assigned-perms" data-id="${role.id}" style="cursor: pointer; border: none;" title="Click to view assigned permissions">
                            ${role.permissionCount} Perms
                          </button>
                        </td>
                        <td style="text-align: right;">
                          <div class="flex items-center justify-end gap-1">
                            <!-- View -->
                            <button 
                              type="button" 
                              class="btn btn-ghost btn-sm btn-view-role" 
                              data-id="${role.id}" 
                              title="View Details"
                            >
                              View
                            </button>

                            <!-- Edit -->
                            ${canEdit ? `
                              <button 
                                type="button" 
                                class="btn btn-outline btn-sm btn-edit-role" 
                                data-id="${role.id}" 
                                title="Edit Role"
                              >
                                Edit
                              </button>

                              <!-- Deactivate / Activate -->
                              <button 
                                type="button" 
                                class="btn btn-sm ${isActive ? 'btn-secondary' : 'btn-success'} btn-toggle-status-role" 
                                data-id="${role.id}" 
                                data-status="${isActive ? 'Active' : 'Inactive'}"
                                title="${isActive ? 'Deactivate role' : 'Activate role'}"
                                style="font-size: 11px; padding: 0.3rem 0.6rem;"
                              >
                                ${isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            ` : ''}

                            <!-- Delete -->
                            ${canDelete ? `
                              <button 
                                type="button" 
                                class="btn btn-danger btn-sm btn-delete-role" 
                                data-id="${role.id}" 
                                title="Delete Role"
                                style="font-size: 11px; padding: 0.3rem 0.5rem;"
                              >
                                ✕
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
      // 1. Search input
      const searchInput = this.container.querySelector('#roles-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim();
          this.render(this.container);
        });
      }

      // 2. Status select
      const statusSelect = this.container.querySelector('#roles-status-select');
      if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
          this.statusFilter = e.target.value;
          this.render(this.container);
        });
      }

      // 3. Clear filters
      const clearBtn = this.container.querySelector('#btn-clear-role-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.searchQuery = '';
          this.statusFilter = 'all';
          this.render(this.container);
        });
      }

      // 4. Create Role button
      const createBtn = this.container.querySelector('#btn-create-role-modal');
      if (createBtn) {
        createBtn.addEventListener('click', () => this.openCreateModal());
      }

      // 5. View Role buttons
      this.container.querySelectorAll('.btn-view-role').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openViewModal(id);
        });
      });

      // 6. View Assigned Users pill
      this.container.querySelectorAll('.btn-view-assigned-users').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openViewModal(id);
        });
      });

      // 7. View Assigned Permissions pill
      this.container.querySelectorAll('.btn-view-assigned-perms').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openViewModal(id);
        });
      });

      // 8. Edit Role buttons
      this.container.querySelectorAll('.btn-edit-role').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openEditModal(id);
        });
      });

      // 9. Deactivate / Activate buttons
      this.container.querySelectorAll('.btn-toggle-status-role').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const currentStatus = btn.getAttribute('data-status');
          this.confirmToggleStatus(id, currentStatus);
        });
      });

      // 10. Delete Role buttons
      this.container.querySelectorAll('.btn-delete-role').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.handleDeleteRole(id);
        });
      });
    }

    /**
     * Open View Role Modal
     */
    openViewModal(id) {
      const role = window.HRM.RoleService.getById(id);
      if (!role) return;

      const users = role.assignedUsers || [];
      const perms = role.assignedPermissions || [];
      const isActive = (role.status || '').toLowerCase() === 'active';

      window.HRM.Modal.open({
        title: `Role Details — ${role.name}`,
        content: `
          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="flex items-center justify-between" style="padding-bottom: var(--space-3); border-bottom: 1px solid var(--border);">
              <div>
                <h4 style="margin: 0; font-size: var(--text-base);">${this._escapeHtml(role.name)}</h4>
                <code style="font-family: var(--font-mono); font-size: 11px; color: var(--primary);">${this._escapeHtml(role.code)}</code>
              </div>
              <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${isActive ? 'Active' : 'Inactive'}</span>
            </div>

            <div>
              <span class="text-xs text-muted">DESCRIPTION</span>
              <p class="text-sm text-secondary" style="margin-top: 2px;">${this._escapeHtml(role.description || 'No description provided.')}</p>
            </div>

            <!-- Assigned Users -->
            <div>
              <div class="flex items-center justify-between" style="margin-bottom: 6px;">
                <span class="text-xs text-muted font-semibold">ASSIGNED EMPLOYEES (${users.length})</span>
                <span class="text-xs text-secondary">via userRoles</span>
              </div>
              ${users.length === 0 ? '<p class="text-xs text-muted">No users currently assigned this role.</p>' : `
                <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                  ${users.map(u => `
                    <span class="badge badge-primary badge-pill" style="font-size: 11px;">
                      ${this._escapeHtml(u.name)} (${this._escapeHtml(u.employeeCode)})
                    </span>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- Assigned Permissions -->
            <div>
              <div class="flex items-center justify-between" style="margin-bottom: 6px;">
                <span class="text-xs text-muted font-semibold">ASSIGNED PERMISSIONS (${perms.length})</span>
                <span class="text-xs text-secondary">via rolePermissions</span>
              </div>
              ${perms.length === 0 ? '<p class="text-xs text-muted">No permissions allocated to this role.</p>' : `
                <div class="flex items-center gap-1" style="flex-wrap: wrap; max-height: 180px; overflow-y: auto; padding: 4px;">
                  ${perms.map(p => `
                    <span class="badge badge-muted" style="font-size: 10px; font-family: var(--font-mono);">
                      ${this._escapeHtml(p.code)}
                    </span>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
        `,
        confirmText: 'Close',
        cancelText: null
      });
    }

    /**
     * Open Create Role Modal
     */
    openCreateModal() {
      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <form id="create-role-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="new-role-name">Role Name</label>
            <input type="text" id="new-role-name" class="input" placeholder="e.g. Sales Director" required>
          </div>

          <div class="form-group">
            <label class="form-label required" for="new-role-code">Role Code</label>
            <input type="text" id="new-role-code" class="input" placeholder="e.g. SALES_DIRECTOR" required style="text-transform: uppercase;">
            <div class="form-help">Unique uppercase identifier (alphanumeric and underscores).</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="new-role-desc">Description</label>
            <textarea id="new-role-desc" class="textarea" placeholder="Briefly summarize this role's purpose and authority"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="new-role-status">Status</label>
            <select id="new-role-status" class="select">
              <option value="Active" selected>Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </form>
      `;

      // Auto-populate uppercase code when typing name
      const nameInput = modalBody.querySelector('#new-role-name');
      const codeInput = modalBody.querySelector('#new-role-code');
      nameInput.addEventListener('input', () => {
        if (!codeInput.dataset.touched) {
          codeInput.value = nameInput.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        }
      });
      codeInput.addEventListener('input', () => {
        codeInput.dataset.touched = 'true';
      });

      window.HRM.Modal.open({
        title: 'Create New System Role',
        content: modalBody,
        confirmText: 'Create Role',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const name = nameInput.value.trim();
          const code = codeInput.value.trim();
          const description = modalBody.querySelector('#new-role-desc').value.trim();
          const status = modalBody.querySelector('#new-role-status').value;

          const result = window.HRM.RoleService.create({ name, code, description, status });

          if (!result.success) {
            alert(result.error || 'Failed to create role.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(`Role "${result.role.name}" created successfully.`, 'Role Created');
          }
          this.render(this.container);
        }
      });
    }

    /**
     * Open Edit Role Modal
     */
    openEditModal(id) {
      const role = window.HRM.RoleService.getById(id);
      if (!role) return;

      // Fetch permissions grouped by module (Phase 8 Requirement 1)
      const permService = window.HRM ? window.HRM.PermissionService : null;
      const groupedPerms = permService ? permService.getGroupedByModule() : {};

      // Fetch assigned permissions for this role via RolePermissionService
      const rolePermService = window.HRM ? window.HRM.RolePermissionService : null;
      const assignedPerms = rolePermService 
        ? rolePermService.getPermissionsForRole(id) 
        : (role.assignedPermissions || []);
      const assignedPermIds = new Set(assignedPerms.map(p => p.id));

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <form id="edit-role-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="edit-role-name">Role Name</label>
            <input type="text" id="edit-role-name" class="input" value="${this._escapeHtml(role.name)}" required>
          </div>

          <div class="form-group">
            <label class="form-label required" for="edit-role-code">Role Code</label>
            <input type="text" id="edit-role-code" class="input" value="${this._escapeHtml(role.code)}" ${role.isSystem ? 'readonly disabled' : ''} style="text-transform: uppercase;">
            <div class="form-help">${role.isSystem ? 'System role codes cannot be modified.' : 'Must remain unique across all roles.'}</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="edit-role-desc">Description</label>
            <textarea id="edit-role-desc" class="textarea">${this._escapeHtml(role.description || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="edit-role-status">Status</label>
            <select id="edit-role-status" class="select">
              <option value="Active" ${role.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${role.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>

          <!-- Permissions Grouped by Module (Requirement 1) -->
          <div class="form-group" style="margin-top: var(--space-4);">
            <div class="flex items-center justify-between" style="margin-bottom: var(--space-2);">
              <label class="form-label font-semibold" style="margin: 0;">Permissions</label>
              <span class="text-xs text-muted">Grouped by module</span>
            </div>
            <div class="form-help" style="margin-bottom: var(--space-3);">Toggle permissions granted to users holding this role.</div>

            <div style="max-height: 280px; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); background: var(--surface);">
              ${Object.entries(groupedPerms).map(([moduleName, perms]) => `
                <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-3);">
                  <div class="flex items-center justify-between" style="margin-bottom: var(--space-2); padding-bottom: 4px; border-bottom: 1px solid var(--border);">
                    <span class="font-semibold text-xs text-main" style="text-transform: uppercase; letter-spacing: 0.5px;">${this._escapeHtml(moduleName)}</span>
                    <span class="badge badge-muted" style="font-size: 10px;">${perms.length} perms</span>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-2);">
                    ${perms.map(p => `
                      <label class="checkbox-label" style="font-size: var(--text-xs); align-items: flex-start;">
                        <input 
                          type="checkbox" 
                          class="checkbox-input edit-role-perm-checkbox" 
                          value="${p.id}" 
                          ${assignedPermIds.has(p.id) ? 'checked' : ''}
                        >
                        <div>
                          <span style="font-weight: 500;">${this._escapeHtml(p.name)}</span>
                          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">${this._escapeHtml(p.code)}</div>
                        </div>
                      </label>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </form>
      `;

      window.HRM.Modal.open({
        title: `Edit Role — ${role.name}`,
        content: modalBody,
        confirmText: 'Save Changes',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const name = modalBody.querySelector('#edit-role-name').value.trim();
          const code = modalBody.querySelector('#edit-role-code').value.trim();
          const description = modalBody.querySelector('#edit-role-desc').value.trim();
          const status = modalBody.querySelector('#edit-role-status').value;
          const selectedPermIds = Array.from(modalBody.querySelectorAll('.edit-role-perm-checkbox:checked')).map(cb => cb.value);

          const result = window.HRM.RoleService.update(id, { name, code, description, status });

          if (!result.success) {
            alert(result.error || 'Failed to update role.');
            return;
          }

          // Synchronize role permissions via RolePermissionService
          if (window.HRM && window.HRM.RolePermissionService) {
            window.HRM.RolePermissionService.setPermissions(id, selectedPermIds);
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(`Role "${name}" updated with ${selectedPermIds.length} permission(s).`, 'Changes Saved');
          }
          this.render(this.container);
        }
      });
    }

    /**
     * Soft Deactivate / Activate Role
     */
    confirmToggleStatus(id, currentStatus) {
      const role = window.HRM.RoleService.getById(id);
      if (!role) return;

      const isDeactivating = currentStatus === 'Active';

      window.HRM.Modal.open({
        title: isDeactivating ? 'Deactivate Role?' : 'Activate Role?',
        content: `
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <p>
              ${isDeactivating
                ? `Are you sure you want to deactivate role <strong>${this._escapeHtml(role.name)}</strong>?`
                : `Are you sure you want to reactivate role <strong>${this._escapeHtml(role.name)}</strong>?`}
            </p>
            <p class="text-xs text-muted">
              ${isDeactivating
                ? `This role is currently assigned to ${role.userCount} user(s). Deactivation will disable privileges without breaking existing user mapping records.`
                : 'Reactivating this role will restore its active status across the organization.'}
            </p>
          </div>
        `,
        confirmText: isDeactivating ? 'Yes, Deactivate' : 'Yes, Activate',
        confirmClass: isDeactivating ? 'btn-danger' : 'btn-success',
        cancelText: 'Cancel',
        onConfirm: () => {
          const result = isDeactivating
            ? window.HRM.RoleService.deactivate(id)
            : window.HRM.RoleService.activate(id);

          if (result && result.success) {
            if (window.HRM.Toast) {
              window.HRM.Toast.success(
                `Role "${role.name}" has been ${isDeactivating ? 'deactivated' : 'activated'}.`,
                isDeactivating ? 'Role Deactivated' : 'Role Activated'
              );
            }
            this.render(this.container);
          } else {
            alert((result && result.error) || 'Failed to update role status.');
          }
        }
      });
    }

    /**
     * Handle Role Deletion with Referential Protection (Requirement 5)
     */
    handleDeleteRole(id) {
      const role = window.HRM.RoleService.getById(id);
      if (!role) return;

      const refCheck = window.HRM.RoleService.isReferenced(id);

      // Block hard-deletion if referenced
      if (refCheck.referenced) {
        window.HRM.Modal.open({
          title: 'Cannot Delete Referenced Role',
          content: `
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
              <div style="background: var(--warning-bg); border: 1px solid var(--warning-border); padding: var(--space-3); border-radius: var(--radius-md); color: var(--warning-text); font-size: var(--text-xs);">
                <strong>Referential Integrity Protection:</strong> This role cannot be hard-deleted because it is actively referenced in the database.
              </div>
              <p class="text-sm text-secondary">
                Role <strong>${this._escapeHtml(role.name)}</strong> is associated with:
              </p>
              <ul style="padding-left: 20px; font-size: var(--text-xs); line-height: 1.6; color: var(--text);">
                <li><strong>${refCheck.userCount}</strong> assigned user(s) in <code>userRoles</code></li>
                <li><strong>${refCheck.permissionCount}</strong> assigned permission(s) in <code>rolePermissions</code></li>
              </ul>
              <p class="text-xs text-muted">
                To retire this role safely without breaking employee assignments or audit trails, please <strong>Deactivate</strong> it instead.
              </p>
            </div>
          `,
          confirmText: 'Deactivate Instead',
          confirmClass: 'btn-warning',
          cancelText: 'Cancel',
          onConfirm: () => {
            window.HRM.RoleService.deactivate(id);
            if (window.HRM.Toast) {
              window.HRM.Toast.warning(`Role "${role.name}" was deactivated instead of deleted.`, 'Role Deactivated');
            }
            this.render(this.container);
          }
        });
        return;
      }

      // Safe to hard-delete unreferenced role
      window.HRM.Modal.open({
        title: `Delete Role — ${role.name}?`,
        content: `
          <p>
            Are you sure you want to permanently delete unreferenced role <strong>${this._escapeHtml(role.name)}</strong> (<code>${this._escapeHtml(role.code)}</code>)?
          </p>
          <p class="text-xs text-danger" style="margin-top: 8px;">
            This action cannot be undone.
          </p>
        `,
        confirmText: 'Yes, Permanently Delete',
        confirmClass: 'btn-danger',
        cancelText: 'Cancel',
        onConfirm: () => {
          const result = window.HRM.RoleService.delete(id);
          if (result && result.success) {
            if (window.HRM.Toast) {
              window.HRM.Toast.success(`Role "${role.name}" deleted.`, 'Role Removed');
            }
            this.render(this.container);
          } else {
            alert((result && result.error) || 'Failed to delete role.');
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
  window.HRM.RolesPage = new RolesPage();
  window.RolesPage = window.HRM.RolesPage;
})();
