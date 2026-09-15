/**
 * ==================================================
 * PERMISSIONS PAGE
 * Enterprise Permission Management Module
 * Route: #/permissions
 * ==================================================
 */

(function () {
  'use strict';

  // Module Icons mapping
  const MODULE_ICONS = {
    'Dashboard': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    'Users': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>`,
    'Roles': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    'Workflow': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    'Approval': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    'Leave': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    'Expense': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
    'Audit': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
  };

  class PermissionsPage {
    constructor() {
      this.container = null;
      this.searchQuery = '';
      this.activeModuleFilter = 'all';
    }

    render(container) {
      this.container = container;
      const permService = window.HRM ? window.HRM.PermissionService : null;
      const allPermissions = permService ? permService.getAll() : [];
      const grouped = permService ? permService.getGroupedByModule() : {};

      const modules = Object.keys(grouped);

      // Apply search and module filter
      const filteredGrouped = {};
      let totalFilteredCount = 0;

      modules.forEach(mod => {
        if (this.activeModuleFilter !== 'all' && this.activeModuleFilter !== mod) {
          return;
        }

        const items = grouped[mod].filter(p => {
          if (!this.searchQuery) return true;
          const q = this.searchQuery.toLowerCase();
          return (
            (p.name || '').toLowerCase().includes(q) ||
            (p.code || '').toLowerCase().includes(q) ||
            (p.module || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q)
          );
        });

        if (items.length > 0 || !this.searchQuery) {
          filteredGrouped[mod] = items;
          totalFilteredCount += items.length;
        }
      });

      container.innerHTML = `
        <div class="permissions-page">
          <!-- Page Header -->
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700;">System Permissions</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Granular capability matrix grouped by functional module
              </p>
            </div>
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="badge badge-success badge-pill">${allPermissions.length} Total Permissions</span>
              <span class="badge badge-primary badge-pill">${modules.length} Functional Modules</span>
            </div>
          </div>

          <!-- Search & Module Filter Tabs -->
          <div class="card" style="margin-bottom: var(--space-6); padding: var(--space-4);">
            <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-3);">
              <div style="position: relative; flex: 1; min-width: 260px;">
                <input 
                  type="text" 
                  id="perms-search-input" 
                  class="input" 
                  placeholder="Search by permission name, code (e.g. user.view), or description..."
                  value="${this._escapeHtml(this.searchQuery)}"
                  style="padding-left: 36px;"
                >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              ${(this.searchQuery || this.activeModuleFilter !== 'all') ? `
                <button type="button" class="btn btn-ghost btn-sm" id="btn-clear-perm-filters">
                  Reset Filters
                </button>
              ` : ''}
            </div>

            <!-- Module Filter Buttons -->
            <div class="flex items-center gap-2" style="flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: var(--space-3);">
              <span class="text-xs text-muted font-semibold" style="margin-right: 4px;">FILTER MODULE:</span>
              <button 
                type="button" 
                class="btn btn-sm ${this.activeModuleFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-module-filter" 
                data-module="all"
                style="padding: 4px 10px; font-size: 11px;"
              >
                All (${allPermissions.length})
              </button>
              ${modules.map(mod => `
                <button 
                  type="button" 
                  class="btn btn-sm ${this.activeModuleFilter === mod ? 'btn-primary' : 'btn-secondary'} btn-module-filter" 
                  data-module="${mod}"
                  style="padding: 4px 10px; font-size: 11px;"
                >
                  ${mod} (${grouped[mod].length})
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Grouped Permissions Container -->
          <div style="display: flex; flex-direction: column; gap: var(--space-6);">
            ${Object.keys(filteredGrouped).length === 0 || totalFilteredCount === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <h3 class="empty-state-title">No Permissions Found</h3>
                <p class="empty-state-desc">No system permissions match "${this._escapeHtml(this.searchQuery)}".</p>
              </div>
            ` : Object.keys(filteredGrouped).map(mod => {
              const perms = filteredGrouped[mod];
              if (perms.length === 0) return '';
              const iconSvg = MODULE_ICONS[mod] || MODULE_ICONS['Dashboard'];

              return `
                <div class="card" id="module-section-${mod.toLowerCase()}">
                  <div class="card-header" style="background-color: var(--surface);">
                    <div class="flex items-center gap-3">
                      <div style="width: 34px; height: 34px; border-radius: var(--radius-md); background: var(--surface-elevated); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--primary);">
                        ${iconSvg}
                      </div>
                      <div>
                        <h3 class="card-title" style="font-size: var(--text-base);">${mod} Module</h3>
                        <div class="card-subtitle">${perms.length} permission action${perms.length === 1 ? '' : 's'} defined</div>
                      </div>
                    </div>
                    <span class="badge badge-muted badge-pill">${mod} Domain</span>
                  </div>

                  <div class="table-wrapper" style="border: none; border-radius: 0;">
                    <table class="table">
                      <thead>
                        <tr>
                          <th style="width: 25%;">Permission Name</th>
                          <th style="width: 25%;">Permission Code</th>
                          <th style="width: 15%;">Module</th>
                          <th style="width: 25%;">Description</th>
                          <th style="width: 10%; text-align: center;">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${perms.map(p => `
                          <tr>
                            <td class="font-semibold" style="color: var(--text);">
                              ${this._escapeHtml(p.name)}
                            </td>
                            <td>
                              <code style="font-family: var(--font-mono); font-size: 11px; color: var(--primary-text); background: var(--surface-elevated); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">
                                ${this._escapeHtml(p.code)}
                              </code>
                            </td>
                            <td>
                              <span class="badge badge-primary badge-pill" style="font-size: 10px;">
                                ${this._escapeHtml(p.module)}
                              </span>
                            </td>
                            <td class="text-secondary text-sm">
                              ${this._escapeHtml(p.description || '—')}
                            </td>
                            <td style="text-align: center;">
                              <span class="badge badge-success badge-pill" style="font-size: 10px;">
                                ${this._escapeHtml(p.status || 'Active')}
                              </span>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      this.bindEvents();
    }

    bindEvents() {
      // 1. Search input
      const searchInput = this.container.querySelector('#perms-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim();
          this.render(this.container);
        });
      }

      // 2. Module filter buttons
      this.container.querySelectorAll('.btn-module-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          this.activeModuleFilter = btn.getAttribute('data-module');
          this.render(this.container);
        });
      });

      // 3. Clear filters button
      const clearBtn = this.container.querySelector('#btn-clear-perm-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.searchQuery = '';
          this.activeModuleFilter = 'all';
          this.render(this.container);
        });
      }
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
  window.HRM.PermissionsPage = new PermissionsPage();
  window.PermissionsPage = window.HRM.PermissionsPage;
})();
