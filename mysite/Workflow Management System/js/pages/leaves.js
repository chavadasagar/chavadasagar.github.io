/**
 * ==================================================
 * LEAVES PAGE (PHASE 12)
 * Employee Leave Applications & Pipeline Status
 * Route: #/leaves
 * ==================================================
 */

(function () {
  'use strict';

  class LeavesPage {
    constructor() {
      this.container = null;
    }

    render(container) {
      this.container = container;

      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;
      if (!currentUser) return;

      const leaveService = window.HRM ? window.HRM.LeaveService : null;
      const myLeaves = leaveService ? leaveService.getByEmployee(currentUser.id) : [];

      const pendingCount = myLeaves.filter(l => l.status === 'Pending').length;
      const approvedCount = myLeaves.filter(l => l.status === 'Approved').length;
      const rejectedCount = myLeaves.filter(l => l.status === 'Rejected').length;

      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const canApply = authz ? authz.can('leave.create') : true;

      container.innerHTML = `
        <div class="leaves-page">
          <!-- Page Header -->
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700;">My Leave Applications</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Submit time-off requests, track multi-level approval pipeline, and view past history
              </p>
            </div>
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="badge badge-warning badge-pill">${pendingCount} Pending</span>
              <span class="badge badge-success badge-pill">${approvedCount} Approved</span>
              <span class="badge badge-danger badge-pill">${rejectedCount} Rejected</span>
              ${canApply ? `
                <button type="button" class="btn btn-primary" id="btn-apply-leave-modal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Apply for Leave</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Leaves Table Card -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Leave History</h3>
                <div class="card-subtitle">Showing ${myLeaves.length} leave application(s) for ${this._escapeHtml(currentUser.name)}</div>
              </div>
              <span class="badge badge-info">Automated Routing</span>
            </div>

            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Approval Stage</th>
                    <th>Status</th>
                    <th style="text-align: right; min-width: 140px;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${myLeaves.length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align: center; padding: var(--space-8);">
                        <div class="empty-state" style="border: none; padding: var(--space-4);">
                          <div class="empty-state-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                          </div>
                          <h4 class="empty-state-title" style="font-size: var(--text-base);">No Leave Applications</h4>
                          <p class="empty-state-desc" style="font-size: var(--text-xs);">
                            You have not submitted any leave requests yet. Click "Apply for Leave" above.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ` : myLeaves.map(l => {
                    let statusBadge = 'badge-warning';
                    if (l.status === 'Approved') statusBadge = 'badge-success';
                    else if (l.status === 'Rejected') statusBadge = 'badge-danger';
                    else if (l.status === 'Cancelled') statusBadge = 'badge-muted';

                    return `
                      <tr>
                        <td>
                          <span class="font-semibold text-sm" style="color: var(--text);">${this._escapeHtml(l.leaveType)}</span>
                        </td>
                        <td>
                          <div class="text-xs">
                            <strong>${l.startDate}</strong> to <strong>${l.endDate}</strong>
                          </div>
                        </td>
                        <td>
                          <span class="badge badge-primary badge-pill" style="font-size: 11px;">
                            ${l.totalDays} day${l.totalDays === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td>
                          <p class="text-xs text-secondary" style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0;">
                            ${this._escapeHtml(l.reason)}
                          </p>
                        </td>
                        <td>
                          <span class="badge ${l.status === 'Pending' ? 'badge-info' : 'badge-surface'} badge-pill" style="font-size: 11px;">
                            ${this._escapeHtml(l.currentStepName)}
                          </span>
                        </td>
                        <td>
                          <span class="badge ${statusBadge} badge-pill">
                            ${l.status}
                          </span>
                        </td>
                        <td style="text-align: right;">
                          <button 
                            type="button" 
                            class="btn btn-outline btn-sm btn-view-pipeline" 
                            data-id="${l.id}" 
                            title="View Approval Stage Details"
                            style="font-size: 11px; padding: 0.3rem 0.6rem;"
                          >
                            Pipeline Details
                          </button>
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
      // Apply for Leave Modal
      const applyBtn = this.container.querySelector('#btn-apply-leave-modal');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => this.openApplyModal());
      }

      // View Pipeline
      this.container.querySelectorAll('.btn-view-pipeline').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openPipelineModal(id);
        });
      });
    }

    /**
     * Open Apply for Leave Modal with auto-calculation
     */
    openApplyModal() {
      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;
      if (!currentUser) return;

      const leaveService = window.HRM.LeaveService;
      const leaveTypes = leaveService ? leaveService.getLeaveTypes() : [];

      const today = new Date().toISOString().split('T')[0];

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <form id="apply-leave-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="leave-type">Leave Type</label>
            <select id="leave-type" class="select" required>
              ${leaveTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
            <div class="form-group">
              <label class="form-label required" for="leave-start-date">Start Date</label>
              <input type="date" id="leave-start-date" class="input" value="${today}" required>
            </div>
            <div class="form-group">
              <label class="form-label required" for="leave-end-date">End Date</label>
              <input type="date" id="leave-end-date" class="input" value="${today}" required>
            </div>
          </div>

          <!-- Total Days preview badge -->
          <div style="margin-bottom: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
            <span class="text-xs text-secondary">Total Working Days:</span>
            <strong id="leave-days-badge" class="badge badge-primary badge-pill">1 Day</strong>
          </div>

          <div class="form-group">
            <label class="form-label required" for="leave-reason">Reason</label>
            <textarea id="leave-reason" class="textarea" placeholder="Please describe the reason for your time-off request..." required></textarea>
          </div>

          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3);">
            <span class="text-xs font-semibold text-main">Approval Gate Routing:</span>
            <p class="text-xs text-secondary" style="margin-top: 2px;">
              Your application will automatically route sequentially through: <strong>Reporting Manager</strong> ➔ <strong>Department Head</strong> ➔ <strong>HR Admin</strong>.
            </p>
          </div>
        </form>
      `;

      // Live Days Calculator
      const startInput = modalBody.querySelector('#leave-start-date');
      const endInput = modalBody.querySelector('#leave-end-date');
      const badge = modalBody.querySelector('#leave-days-badge');

      const updateDays = () => {
        const d = leaveService.calculateDays(startInput.value, endInput.value);
        if (d <= 0) {
          badge.textContent = 'Invalid Dates';
          badge.className = 'badge badge-danger badge-pill';
        } else {
          badge.textContent = `${d} Day${d === 1 ? '' : 's'}`;
          badge.className = 'badge badge-primary badge-pill';
        }
      };

      startInput.addEventListener('change', updateDays);
      endInput.addEventListener('change', updateDays);

      window.HRM.Modal.open({
        title: 'Apply for Time-Off / Leave',
        content: modalBody,
        confirmText: 'Submit Leave Request',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const leaveType = modalBody.querySelector('#leave-type').value;
          const startDate = startInput.value;
          const endDate = endInput.value;
          const reason = modalBody.querySelector('#leave-reason').value.trim();

          const res = window.HRM.LeaveService.createLeave({
            employeeId: currentUser.id,
            leaveType,
            startDate,
            endDate,
            reason
          });

          if (!res.success) {
            alert(res.error || 'Failed to submit leave request.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(
              `Leave request submitted for ${res.leave.totalDays} day(s). Routed to your manager.`,
              'Leave Application Created'
            );
          }

          this.render(this.container);
        }
      });
    }

    /**
     * View full approval pipeline history modal
     */
    openPipelineModal(leaveId) {
      const leave = window.HRM.LeaveService.getById(leaveId);
      if (!leave) return;

      const history = leave.history;
      const steps = history ? history.steps : [];
      const actions = history ? history.actions : [];

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: var(--space-4);">
          <!-- Top summary strip -->
          <div class="flex items-center justify-between" style="padding-bottom: var(--space-3); border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: var(--space-2);">
            <div>
              <h4 style="margin: 0; font-size: var(--text-base);">${this._escapeHtml(leave.leaveType)} (${leave.totalDays} Day${leave.totalDays === 1 ? '' : 's'})</h4>
              <p class="text-xs text-muted" style="margin-top: 2px;">
                ${leave.startDate} to ${leave.endDate} • Status: <strong>${leave.status}</strong>
              </p>
            </div>
            <span class="badge ${leave.status === 'Approved' ? 'badge-success' : (leave.status === 'Rejected' ? 'badge-danger' : 'badge-warning')} badge-pill">
              ${leave.status}
            </span>
          </div>

          <!-- Reason block -->
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); font-size: var(--text-xs);">
            <strong class="text-main">Reason:</strong>
            <p style="margin: 4px 0 0 0; color: var(--text-secondary);">${this._escapeHtml(leave.reason)}</p>
          </div>

          <!-- Sequential Approval Pipeline Steps -->
          <h5 style="margin: 0; font-size: var(--text-xs); text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Approval Routing Pipeline:</h5>
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${steps.map(s => {
              let sBadge = 'badge-muted';
              if (s.status === 'Approved') sBadge = 'badge-success';
              else if (s.status === 'Pending') sBadge = 'badge-warning';
              else if (s.status === 'Rejected') sBadge = 'badge-danger';
              else if (s.status === 'Skipped') sBadge = 'badge-muted';

              return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface);">
                  <div>
                    <strong style="font-size: var(--text-xs); color: var(--text);">Step ${s.stepOrder}: ${this._escapeHtml(s.stepName)}</strong>
                    <div class="text-muted" style="font-size: 11px;">
                      Approver: <strong>${(s.approverNames && s.approverNames.length > 0) ? s.approverNames.join(', ') : s.approverType}</strong>
                    </div>
                  </div>
                  <span class="badge ${sBadge} badge-pill" style="font-size: 10px;">
                    ${s.status}
                  </span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Action Logs -->
          ${actions.length > 0 ? `
            <h5 style="margin: var(--space-2) 0 0 0; font-size: var(--text-xs); text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Audit & Decision Trail:</h5>
            <div style="display: flex; flex-direction: column; gap: var(--space-2); max-height: 25vh; overflow-y: auto;">
              ${actions.map(act => `
                <div style="font-size: 11px; padding: var(--space-2); border-left: 3px solid ${act.action === 'Approve' ? 'var(--success)' : (act.action === 'Reject' ? 'var(--danger)' : 'var(--primary)')}; background: var(--surface-elevated); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
                  <div class="flex items-center justify-between">
                    <strong>${act.action.toUpperCase()}</strong>
                    <span class="text-muted">${new Date(act.actionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div class="text-secondary" style="margin-top: 2px;">
                    By: <strong>${this._escapeHtml(act.approverName)}</strong>
                    ${act.comments ? ` — <em>"${this._escapeHtml(act.comments)}"</em>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

      window.HRM.Modal.open({
        title: `Approval Pipeline — Leave #${leave.id.slice(-6)}`,
        content: modalBody,
        confirmText: 'Close',
        cancelText: null
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
  window.HRM.LeavesPage = new LeavesPage();
  window.LeavesPage = window.HRM.LeavesPage;
})();
