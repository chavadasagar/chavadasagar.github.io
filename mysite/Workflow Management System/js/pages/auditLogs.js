/**
 * ==================================================
 * AUDIT LOGS PAGE (PHASE 14)
 * Client-Side Activity Audit Trail & Compliance Viewer
 * Route: #/audit-logs
 * Protected by Permission: audit.view
 * ==================================================
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  }

  function getActionBadge(action) {
    let colorClass = 'badge-primary';
    const a = (action || '').toLowerCase();

    if (a.includes('approved') || a.includes('published') || a === 'login') {
      colorClass = 'badge-success';
    } else if (a.includes('rejected') || a === 'logout') {
      colorClass = 'badge-danger';
    } else if (a.includes('delegated') || a.includes('required')) {
      colorClass = 'badge-warning';
    } else if (a.includes('created') || a.includes('submitted')) {
      colorClass = 'badge-primary';
    } else {
      colorClass = 'badge-neutral';
    }

    return `<span class="badge ${colorClass}" style="font-size: 11px; font-weight: 600;">${escapeHtml(action)}</span>`;
  }

  class AuditLogsPage {
    constructor() {
      this.container = null;
      this.filters = {
        userId: 'all',
        action: 'all',
        entityType: 'all',
        date: '',
        search: ''
      };
      this.currentPage = 1;
      this.pageSize = 20;
    }

    render(container) {
      this.container = container;

      const auditService = window.HRM ? window.HRM.AuditService : null;
      if (!auditService) {
        container.innerHTML = '<div class="card p-6">AuditService unavailable.</div>';
        return;
      }

      const db = window.HRM.DatabaseService ? window.HRM.DatabaseService.getDatabase() : { users: [] };
      const users = db.users || [];
      const actions = auditService.getActions();
      const entityTypes = auditService.getEntityTypes();

      // Retrieve filtered logs
      const allLogs = auditService.getAll(this.filters);
      const totalCount = allLogs.length;

      // Pagination slice
      const totalPages = Math.max(1, Math.ceil(totalCount / this.pageSize));
      if (this.currentPage > totalPages) this.currentPage = totalPages;
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const pagedLogs = allLogs.slice(startIndex, startIndex + this.pageSize);

      const html = `
        <div class="page-header" style="margin-bottom: 24px;">
          <div class="flex flex-col gap-1">
            <h1 class="page-title" style="font-size: var(--text-2xl); font-weight: 700; color: var(--text);">Audit Logs</h1>
            <p class="text-muted" style="font-size: var(--text-sm); margin: 0;">
              Immutable enterprise activity trail tracking security, user administration, and workflow state transitions.
            </p>
          </div>
          <div class="page-actions flex items-center gap-2" style="flex-wrap: wrap;">
            <button type="button" class="btn btn-outline btn-sm" id="btn-export-csv" title="Export current audit logs to CSV">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Export CSV</span>
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-refresh-logs" title="Refresh logs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <!-- Metric Overview Strip -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div class="card p-4" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-lg);">
            <span class="text-muted" style="font-size: var(--text-xs); font-weight: 500;">Total Events</span>
            <div style="font-size: var(--text-2xl); font-weight: 700; color: var(--text); margin-top: 4px;">${totalCount}</div>
          </div>
          <div class="card p-4" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-lg);">
            <span class="text-muted" style="font-size: var(--text-xs); font-weight: 500;">Unique Actions</span>
            <div style="font-size: var(--text-2xl); font-weight: 700; color: var(--primary); margin-top: 4px;">${actions.length}</div>
          </div>
          <div class="card p-4" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-lg);">
            <span class="text-muted" style="font-size: var(--text-xs); font-weight: 500;">Tracked Entities</span>
            <div style="font-size: var(--text-2xl); font-weight: 700; color: var(--secondary, #38bdf8); margin-top: 4px;">${entityTypes.length}</div>
          </div>
          <div class="card p-4" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-lg);">
            <span class="text-muted" style="font-size: var(--text-xs); font-weight: 500;">Latest Event</span>
            <div style="font-size: var(--text-xs); font-weight: 600; color: var(--text); margin-top: 8px; word-break: break-all;">
              ${allLogs.length > 0 ? formatDate(allLogs[0].createdAt) : 'No events logged'}
            </div>
          </div>
        </div>

        <!-- Filter Controls Toolbar -->
        <div class="card p-4 mb-6" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-lg); margin-bottom: 24px;">
          <div class="grid gap-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: end;">
            <!-- Free Text Search -->
            <div>
              <label class="form-label" style="font-size: 11px; margin-bottom: 4px; display: block; font-weight: 600; color: var(--text-muted);">Search</label>
              <input type="text" id="filter-search" class="form-input form-input-sm" placeholder="Search description, ID..." value="${escapeHtml(this.filters.search)}" style="width: 100%;">
            </div>

            <!-- User Filter -->
            <div>
              <label class="form-label" style="font-size: 11px; margin-bottom: 4px; display: block; font-weight: 600; color: var(--text-muted);">User</label>
              <select id="filter-user" class="form-select form-select-sm" style="width: 100%;">
                <option value="all">All Users</option>
                <option value="usr_system" ${this.filters.userId === 'usr_system' ? 'selected' : ''}>System</option>
                ${users.map(u => `
                  <option value="${u.id}" ${this.filters.userId === u.id ? 'selected' : ''}>${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>
                `).join('')}
              </select>
            </div>

            <!-- Action Filter -->
            <div>
              <label class="form-label" style="font-size: 11px; margin-bottom: 4px; display: block; font-weight: 600; color: var(--text-muted);">Action</label>
              <select id="filter-action" class="form-select form-select-sm" style="width: 100%;">
                <option value="all">All Actions</option>
                ${actions.map(act => `
                  <option value="${escapeHtml(act)}" ${this.filters.action.toLowerCase() === act.toLowerCase() ? 'selected' : ''}>${escapeHtml(act)}</option>
                `).join('')}
              </select>
            </div>

            <!-- Entity Filter -->
            <div>
              <label class="form-label" style="font-size: 11px; margin-bottom: 4px; display: block; font-weight: 600; color: var(--text-muted);">Entity</label>
              <select id="filter-entity" class="form-select form-select-sm" style="width: 100%;">
                <option value="all">All Entities</option>
                ${entityTypes.map(ent => `
                  <option value="${escapeHtml(ent)}" ${this.filters.entityType.toLowerCase() === ent.toLowerCase() ? 'selected' : ''}>${escapeHtml(ent)}</option>
                `).join('')}
              </select>
            </div>

            <!-- Date Filter -->
            <div>
              <label class="form-label" style="font-size: 11px; margin-bottom: 4px; display: block; font-weight: 600; color: var(--text-muted);">Date</label>
              <input type="date" id="filter-date" class="form-input form-input-sm" value="${this.filters.date}" style="width: 100%;">
            </div>

            <!-- Reset Button -->
            <div>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-reset-filters" style="width: 100%; border: 1px solid var(--border);">
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Audit Table View -->
        <div class="card" style="background: var(--surface-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden;">
          <div class="table-responsive" style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); background: rgba(255, 255, 255, 0.02);">
                  <th style="padding: 12px 16px; font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); width: 170px;">Date & Time</th>
                  <th style="padding: 12px 16px; font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); width: 180px;">User</th>
                  <th style="padding: 12px 16px; font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); width: 160px;">Action</th>
                  <th style="padding: 12px 16px; font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); width: 160px;">Entity</th>
                  <th style="padding: 12px 16px; font-size: var(--text-xs); font-weight: 600; color: var(--text-muted);">Description</th>
                </tr>
              </thead>
              <tbody>
                ${pagedLogs.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 12px; opacity: 0.5;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <p style="font-weight: 600; font-size: var(--text-sm); margin: 0;">No audit records match your filters.</p>
                      <p style="font-size: var(--text-xs); margin: 4px 0 0; opacity: 0.7;">Try clearing filters or changing search keywords.</p>
                    </td>
                  </tr>
                ` : pagedLogs.map(log => {
                  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                  return `
                    <tr style="border-bottom: 1px solid var(--border); font-size: var(--text-xs); transition: background 0.15s ease;">
                      <td style="padding: 12px 16px; white-space: nowrap; color: var(--text-muted);">
                        ${formatDate(log.createdAt)}
                      </td>
                      <td style="padding: 12px 16px;">
                        <div class="flex flex-col">
                          <span style="font-weight: 600; color: var(--text);">${escapeHtml(log.userName || 'System')}</span>
                          ${log.userEmail ? `<span style="color: var(--text-muted); font-size: 11px;">${escapeHtml(log.userEmail)}</span>` : ''}
                        </div>
                      </td>
                      <td style="padding: 12px 16px;">
                        ${getActionBadge(log.action)}
                      </td>
                      <td style="padding: 12px 16px; white-space: nowrap;">
                        <div class="flex items-center gap-1">
                          <span class="badge badge-neutral" style="font-size: 10px;">${escapeHtml(log.entityType)}</span>
                          <span style="font-family: var(--font-mono, monospace); font-size: 11px; color: var(--text-muted);">${escapeHtml(log.entityId)}</span>
                        </div>
                      </td>
                      <td style="padding: 12px 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                          <span style="color: var(--text); word-break: break-word;">${escapeHtml(log.description)}</span>
                          ${hasMetadata ? `
                            <button type="button" class="btn btn-ghost btn-xs btn-inspect-meta" data-log-id="${log.id}" title="Inspect metadata" style="font-size: 10px; color: var(--primary); padding: 2px 6px; white-space: nowrap; border: 1px solid var(--border);">
                              Payload
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

          <!-- Pagination Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); background: rgba(255, 255, 255, 0.01); font-size: var(--text-xs);">
            <div style="color: var(--text-muted);">
              Showing ${totalCount === 0 ? 0 : startIndex + 1} to ${Math.min(startIndex + this.pageSize, totalCount)} of ${totalCount} records
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-outline btn-xs" id="btn-prev-page" ${this.currentPage <= 1 ? 'disabled' : ''}>
                &larr; Previous
              </button>
              <span style="font-weight: 600; color: var(--text); padding: 0 4px;">Page ${this.currentPage} of ${totalPages}</span>
              <button type="button" class="btn btn-outline btn-xs" id="btn-next-page" ${this.currentPage >= totalPages ? 'disabled' : ''}>
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;
      this.bindEvents(allLogs);
    }

    bindEvents(allLogs) {
      // Search Input with Debounce
      const searchInput = document.getElementById('filter-search');
      if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this.filters.search = e.target.value;
            this.currentPage = 1;
            this.render(this.container);
          }, 300);
        });
      }

      // User Filter
      const userSelect = document.getElementById('filter-user');
      if (userSelect) {
        userSelect.addEventListener('change', (e) => {
          this.filters.userId = e.target.value;
          this.currentPage = 1;
          this.render(this.container);
        });
      }

      // Action Filter
      const actionSelect = document.getElementById('filter-action');
      if (actionSelect) {
        actionSelect.addEventListener('change', (e) => {
          this.filters.action = e.target.value;
          this.currentPage = 1;
          this.render(this.container);
        });
      }

      // Entity Filter
      const entitySelect = document.getElementById('filter-entity');
      if (entitySelect) {
        entitySelect.addEventListener('change', (e) => {
          this.filters.entityType = e.target.value;
          this.currentPage = 1;
          this.render(this.container);
        });
      }

      // Date Filter
      const dateInput = document.getElementById('filter-date');
      if (dateInput) {
        dateInput.addEventListener('change', (e) => {
          this.filters.date = e.target.value;
          this.currentPage = 1;
          this.render(this.container);
        });
      }

      // Reset Filters
      const resetBtn = document.getElementById('btn-reset-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.filters = { userId: 'all', action: 'all', entityType: 'all', date: '', search: '' };
          this.currentPage = 1;
          this.render(this.container);
        });
      }

      // Refresh Button
      const refreshBtn = document.getElementById('btn-refresh-logs');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.render(this.container);
          if (window.HRM && window.HRM.Toast) {
            window.HRM.Toast.info('Audit log list refreshed.');
          }
        });
      }

      // Export CSV
      const exportBtn = document.getElementById('btn-export-csv');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          this.exportToCsv(allLogs);
        });
      }

      // Pagination
      const prevBtn = document.getElementById('btn-prev-page');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (this.currentPage > 1) {
            this.currentPage--;
            this.render(this.container);
          }
        });
      }

      const nextBtn = document.getElementById('btn-next-page');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this.currentPage++;
          this.render(this.container);
        });
      }

      // Inspect metadata buttons
      this.container.querySelectorAll('.btn-inspect-meta').forEach(btn => {
        btn.addEventListener('click', () => {
          const logId = btn.getAttribute('data-log-id');
          const log = allLogs.find(l => l.id === logId);
          if (!log) return;

          const jsonStr = JSON.stringify(log.metadata || {}, null, 2);
          if (window.HRM && window.HRM.Modal) {
            window.HRM.Modal.open({
              title: `Audit Metadata — ${log.action}`,
              content: `
                <div style="font-size: var(--text-xs); line-height: 1.5;">
                  <div style="margin-bottom: 8px;"><strong>Record ID:</strong> <code>${escapeHtml(log.id)}</code></div>
                  <div style="margin-bottom: 8px;"><strong>Timestamp:</strong> ${formatDate(log.createdAt)}</div>
                  <div style="margin-bottom: 8px;"><strong>Description:</strong> ${escapeHtml(log.description)}</div>
                  <pre style="background: var(--surface-header, #0f172a); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; font-size: 11px; overflow-x: auto; color: #38bdf8;">${escapeHtml(jsonStr)}</pre>
                </div>
              `,
              cancelText: 'Close',
              confirmText: 'Done'
            });
          }
        });
      });
    }

    exportToCsv(logs) {
      if (!logs || logs.length === 0) {
        if (window.HRM && window.HRM.Toast) {
          window.HRM.Toast.warning('No records available to export.');
        }
        return;
      }

      const headers = ['ID', 'Date', 'User Name', 'User Email', 'Action', 'Entity Type', 'Entity ID', 'Description', 'Metadata'];
      const rows = logs.map(l => {
        return [
          l.id,
          l.createdAt,
          l.userName || '',
          l.userEmail || '',
          l.action,
          l.entityType,
          l.entityId,
          `"${(l.description || '').replace(/"/g, '""')}"`,
          `"${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (window.HRM && window.HRM.Toast) {
        window.HRM.Toast.success(`Exported ${logs.length} audit records.`);
      }
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.AuditLogsPage = new AuditLogsPage();
  window.AuditLogsPage = window.HRM.AuditLogsPage;
})();
