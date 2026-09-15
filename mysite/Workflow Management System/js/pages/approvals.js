/**
 * ==================================================
 * APPROVAL INBOX PAGE (PHASE 13)
 * Pending Approvals, Visual Timeline Details,
 * Mandatory Reject/Delegate Validations & Security Guards
 * Route: #/approvals
 * ==================================================
 */

(function () {
  'use strict';

  class ApprovalsPage {
    constructor() {
      this.container = null;
      this.activeTab = 'pending'; // 'pending' | 'all'
      this.searchQuery = '';
    }

    render(container) {
      this.container = container;

      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;
      if (!currentUser) return;

      const db = window.HRM.DatabaseService ? window.HRM.DatabaseService.getDatabase() : null;
      const allRequests = db ? (db.approvalRequests || []) : [];
      const allSteps = db ? (db.approvalRequestSteps || []) : [];
      const allUsers = db ? (db.users || []) : [];
      const allWfSteps = db ? (db.workflowSteps || []) : [];
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      const wfStepMap = new Map(allWfSteps.map(ws => [ws.id, ws]));

      const engine = window.HRM ? window.HRM.ApprovalEngine : null;
      const leaveService = window.HRM ? window.HRM.LeaveService : null;

      // 1. Get Pending Approvals specifically assigned to currentUser
      const pendingRaw = engine ? engine.getPendingApprovals(currentUser.id) : [];

      // Enrich request items with step info and entity details
      const enrichRequest = (req) => {
        const requester = userMap.get(req.requestedBy);
        const currentStep = allSteps.find(s => s.id === req.currentStepId);
        const wfStep = currentStep ? wfStepMap.get(currentStep.workflowStepId) : null;

        let entityDetails = null;
        if (req.entityType === 'Leave' && leaveService) {
          entityDetails = leaveService.getById(req.entityId);
        }

        const stepApproverIds = currentStep ? (currentStep.approverEmployeeIds || []) : [];
        const isUserApprover = stepApproverIds.includes(currentUser.id) && req.requestedBy !== currentUser.id;

        return {
          ...req,
          requesterName: requester ? requester.name : 'Unknown',
          requesterCode: requester ? requester.employeeCode : '',
          currentStepOrder: currentStep ? currentStep.stepOrder : null,
          currentStepName: wfStep ? wfStep.name : (currentStep ? `Step ${currentStep.stepOrder}` : 'Completed'),
          currentStepApprovers: stepApproverIds,
          isUserApprover,
          entityDetails
        };
      };

      const pendingEnriched = pendingRaw.map(r => enrichRequest(r));

      // 2. All Requests (History view)
      const allEnriched = allRequests
        .map(r => enrichRequest(r))
        .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));

      // Filter by active tab and search query
      let displayedItems = (this.activeTab === 'pending') ? pendingEnriched : allEnriched;

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        displayedItems = displayedItems.filter(item => {
          const matchType = (item.entityType || '').toLowerCase().includes(q);
          const matchReqId = (item.id || '').toLowerCase().includes(q);
          const matchName = (item.requesterName || '').toLowerCase().includes(q);
          const matchCode = (item.requesterCode || '').toLowerCase().includes(q);
          const matchStep = (item.currentStepName || '').toLowerCase().includes(q);
          return matchType || matchReqId || matchName || matchCode || matchStep;
        });
      }

      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const canApprove = authz ? authz.can('approval.approve') : true;
      const canReject = authz ? authz.can('approval.reject') : true;
      const canDelegate = authz ? authz.can('approval.delegate') : true;

      container.innerHTML = `
        <div class="approvals-page">
          <!-- Page Header -->
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700;">Approval Inbox</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Review, sign-off, or return pending workforce requests awaiting your authority
              </p>
            </div>
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="badge ${pendingEnriched.length > 0 ? 'badge-warning' : 'badge-success'} badge-pill">
                ${pendingEnriched.length} Pending Decision
              </span>
              <span class="badge badge-primary badge-pill">
                ${allEnriched.length} Total Requests
              </span>
            </div>
          </div>

          <!-- Controls: Tabs & Search Bar -->
          <div class="card" style="margin-bottom: var(--space-6); padding: var(--space-3) var(--space-4);">
            <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: var(--space-3);">
              <!-- Tabs -->
              <div class="flex items-center gap-2">
                <button 
                  type="button" 
                  class="btn btn-sm ${this.activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'}" 
                  id="tab-pending"
                >
                  Pending My Approval (${pendingEnriched.length})
                </button>
                <button 
                  type="button" 
                  class="btn btn-sm ${this.activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}" 
                  id="tab-all"
                >
                  All Requests History (${allEnriched.length})
                </button>
              </div>

              <!-- Search Bar -->
              <div style="position: relative; min-width: 240px;">
                <input 
                  type="text" 
                  id="inbox-search-input" 
                  class="input" 
                  placeholder="Search by ID, employee, type..."
                  value="${this._escapeHtml(this.searchQuery)}"
                  style="padding-left: 32px; font-size: var(--text-xs); height: 34px;"
                >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>
          </div>

          <!-- Table Card -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">
                  ${this.activeTab === 'pending' ? 'Items Awaiting Your Authority' : 'All Organization Approval Requests'}
                </h3>
                <div class="card-subtitle">Showing ${displayedItems.length} record(s)</div>
              </div>
              <span class="badge ${this.activeTab === 'pending' ? 'badge-warning' : 'badge-surface'}">
                ${this.activeTab === 'pending' ? 'Action Required' : 'Archive / Audit'}
              </span>
            </div>

            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Request Type</th>
                    <th>Request ID</th>
                    <th>Employee</th>
                    <th>Submitted Date</th>
                    <th>Current Step</th>
                    <th>Status</th>
                    <th style="text-align: right; min-width: 200px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${displayedItems.length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align: center; padding: var(--space-8);">
                        <div class="empty-state" style="border: none; padding: var(--space-4);">
                          <div class="empty-state-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                          <h4 class="empty-state-title" style="font-size: var(--text-base);">
                            ${this.activeTab === 'pending' ? 'Inbox All Clear!' : 'No Requests Found'}
                          </h4>
                          <p class="empty-state-desc" style="font-size: var(--text-xs);">
                            ${this.activeTab === 'pending'
                              ? 'You have zero pending requests awaiting your approval.'
                              : (this.searchQuery ? `No records match "${this.searchQuery}".` : 'No approval records found.')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ` : displayedItems.map(item => {
                    const isPending = item.status === 'Pending';
                    const canUserAct = isPending && item.isUserApprover;

                    let statusBadge = 'badge-muted';
                    if (item.status === 'Approved') statusBadge = 'badge-success';
                    else if (item.status === 'Pending') statusBadge = 'badge-warning';
                    else if (item.status === 'Rejected') statusBadge = 'badge-danger';
                    else if (item.status === 'Cancelled') statusBadge = 'badge-muted';

                    const shortId = item.id.replace('apr_', '').toUpperCase();

                    return `
                      <tr>
                        <!-- 1. Request Type -->
                        <td>
                          <span class="badge badge-info badge-pill" style="font-size: 11px;">
                            ${this._escapeHtml(item.entityType)}
                          </span>
                        </td>

                        <!-- 2. Request ID -->
                        <td>
                          <button 
                            type="button" 
                            class="btn-link btn-view-details" 
                            data-id="${item.id}"
                            title="Inspect details and timeline"
                            style="font-family: var(--font-mono); font-size: 11px; font-weight: 600; color: var(--primary);"
                          >
                            #${shortId}
                          </button>
                        </td>

                        <!-- 3. Employee -->
                        <td>
                          <div>
                            <strong class="text-sm" style="color: var(--text);">${this._escapeHtml(item.requesterName)}</strong>
                            <div class="text-xs text-muted">${this._escapeHtml(item.requesterCode)}</div>
                          </div>
                        </td>

                        <!-- 4. Submitted Date -->
                        <td>
                          <span class="text-xs text-muted">
                            ${new Date(item.submittedAt || item.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        <!-- 5. Current Step -->
                        <td>
                          <div>
                            ${item.currentStepOrder ? `
                              <span class="badge badge-primary badge-pill" style="font-size: 10px;">
                                Step ${item.currentStepOrder}
                              </span>
                            ` : ''}
                            <span class="text-xs font-semibold" style="margin-left: 4px; color: var(--text);">
                              ${this._escapeHtml(item.currentStepName)}
                            </span>
                          </div>
                        </td>

                        <!-- 6. Status -->
                        <td>
                          <span class="badge ${statusBadge} badge-pill">
                            ${item.status}
                          </span>
                        </td>

                        <!-- 7. Actions (SECURITY: Only show decision buttons if user IS an authorized approver) -->
                        <td style="text-align: right;">
                          <div class="flex items-center justify-end gap-1">
                            ${canUserAct ? `
                              <!-- Approve Button -->
                              ${canApprove ? `
                                <button 
                                  type="button" 
                                  class="btn btn-success btn-sm btn-action-approve" 
                                  data-id="${item.id}"
                                  style="font-size: 11px; padding: 0.3rem 0.6rem;"
                                >
                                  Approve
                                </button>
                              ` : ''}

                              <!-- Reject Button -->
                              ${canReject ? `
                                <button 
                                  type="button" 
                                  class="btn btn-danger btn-sm btn-action-reject" 
                                  data-id="${item.id}"
                                  style="font-size: 11px; padding: 0.3rem 0.6rem;"
                                >
                                  Reject
                                </button>
                              ` : ''}

                              <!-- Delegate Button -->
                              ${canDelegate ? `
                                <button 
                                  type="button" 
                                  class="btn btn-outline btn-sm btn-action-delegate" 
                                  data-id="${item.id}"
                                  title="Delegate to colleague"
                                  style="font-size: 11px; padding: 0.3rem 0.5rem;"
                                >
                                  Delegate
                                </button>
                              ` : ''}
                            ` : ''}

                            <!-- Details / Info Button (Always visible) -->
                            <button 
                              type="button" 
                              class="btn btn-ghost btn-sm btn-view-details" 
                              data-id="${item.id}"
                              title="View timeline and details"
                              style="font-size: 11px; padding: 0.3rem 0.55rem;"
                            >
                              Details
                            </button>
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

      this.bindEvents(currentUser);
    }

    bindEvents(currentUser) {
      // 1. Tab switches
      const tabPending = this.container.querySelector('#tab-pending');
      const tabAll = this.container.querySelector('#tab-all');
      if (tabPending) {
        tabPending.addEventListener('click', () => {
          this.activeTab = 'pending';
          this.render(this.container);
        });
      }
      if (tabAll) {
        tabAll.addEventListener('click', () => {
          this.activeTab = 'all';
          this.render(this.container);
        });
      }

      // 2. Search input
      const searchInput = this.container.querySelector('#inbox-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim();
          this.render(this.container);
        });
      }

      // 3. Approve action
      this.container.querySelectorAll('.btn-action-approve').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openConfirmModal(id, currentUser.id, 'Approve');
        });
      });

      // 4. Reject action
      this.container.querySelectorAll('.btn-action-reject').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openConfirmModal(id, currentUser.id, 'Reject');
        });
      });

      // 5. Delegate action
      this.container.querySelectorAll('.btn-action-delegate').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openDelegateModal(id, currentUser.id);
        });
      });

      // 6. View Details
      this.container.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openDetailsModal(id, currentUser);
        });
      });
    }

    /**
     * ==================================================
     * DETAILS SCREEN & TIMELINE (PHASE 13 REQUIREMENT 2)
     * ==================================================
     */
    openDetailsModal(requestId, currentUser) {
      const history = window.HRM.ApprovalEngine ? window.HRM.ApprovalEngine.getHistory(requestId) : null;
      if (!history) {
        alert('Could not load request history.');
        return;
      }

      const { request, steps, actions, workflow } = history;
      const leaveService = window.HRM.LeaveService;
      let leave = null;
      if (request.entityType === 'Leave' && leaveService) {
        leave = leaveService.getById(request.entityId);
      }

      // Check if current user is an active approver on the current step
      const currentStep = steps.find(s => s.id === request.currentStepId);
      const isPending = request.status === 'Pending';
      const isApprover = isPending && currentStep && (currentStep.approverEmployeeIds || []).includes(currentUser.id) && request.requestedBy !== currentUser.id;

      const auth = window.HRM ? window.HRM.AuthService : null;
      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const canApprove = authz ? authz.can('approval.approve') : true;
      const canReject = authz ? authz.can('approval.reject') : true;
      const canDelegate = authz ? authz.can('approval.delegate') : true;

      // Map actions by step ID
      const actionMap = new Map();
      actions.forEach(act => {
        if (act.approvalRequestStepId) {
          actionMap.set(act.approvalRequestStepId, act);
        }
      });

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: var(--space-4);">
          <!-- Top summary strip -->
          <div class="flex items-center justify-between" style="padding-bottom: var(--space-3); border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: var(--space-2);">
            <div>
              <div class="flex items-center gap-2">
                <h4 style="margin: 0; font-size: var(--text-base);">${this._escapeHtml(request.entityType)} Request</h4>
                <code style="font-family: var(--font-mono); font-size: 11px; color: var(--primary);">#${request.id.replace('apr_', '').toUpperCase()}</code>
              </div>
              <p class="text-xs text-muted" style="margin-top: 2px;">
                Workflow: <strong>${this._escapeHtml(workflow ? workflow.name : 'Standard')}</strong> • Submitted: ${new Date(request.submittedAt).toLocaleString()}
              </p>
            </div>
            <span class="badge ${request.status === 'Approved' ? 'badge-success' : (request.status === 'Rejected' ? 'badge-danger' : 'badge-warning')} badge-pill">
              ${request.status}
            </span>
          </div>

          <!-- Domain-specific Request Information -->
          ${leave ? `
            <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3);">
              <span class="text-xs font-semibold text-main" style="text-transform: uppercase; letter-spacing: 0.5px;">Leave Application Information</span>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: var(--space-3); margin-top: var(--space-2); font-size: var(--text-xs);">
                <div>
                  <span class="text-muted">Leave Type:</span>
                  <strong class="text-main" style="display: block; margin-top: 2px;">${this._escapeHtml(leave.leaveType)}</strong>
                </div>
                <div>
                  <span class="text-muted">Duration:</span>
                  <strong class="text-main" style="display: block; margin-top: 2px;">${leave.totalDays} Day${leave.totalDays === 1 ? '' : 's'}</strong>
                </div>
                <div>
                  <span class="text-muted">Start Date:</span>
                  <strong class="text-main" style="display: block; margin-top: 2px;">${leave.startDate}</strong>
                </div>
                <div>
                  <span class="text-muted">End Date:</span>
                  <strong class="text-main" style="display: block; margin-top: 2px;">${leave.endDate}</strong>
                </div>
              </div>
              <div style="margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px dashed var(--border); font-size: var(--text-xs);">
                <span class="text-muted">Reason:</span>
                <p style="margin: 2px 0 0 0; color: var(--text-secondary);">${this._escapeHtml(leave.reason)}</p>
              </div>
            </div>
          ` : `
            <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); font-size: var(--text-xs);">
              <span class="text-muted">Entity Target:</span>
              <strong class="text-main" style="margin-left: 4px;">${request.entityType} #${request.entityId}</strong>
            </div>
          `}

          <!-- Visual Approval Timeline (Phase 13 Requirement 2) -->
          <div>
            <span class="text-xs font-semibold text-main" style="text-transform: uppercase; letter-spacing: 0.5px;">
              Approval Timeline
            </span>

            <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-2);">
              ${steps.map(step => {
                const act = actionMap.get(step.id);

                let iconHtml = '○';
                let iconColor = 'var(--text-muted)';
                let borderStyle = 'border: 1px solid var(--border);';
                let badgeClass = 'badge-muted';

                if (step.status === 'Approved') {
                  iconHtml = '✓';
                  iconColor = 'var(--success)';
                  badgeClass = 'badge-success';
                } else if (step.status === 'Pending') {
                  iconHtml = '●';
                  iconColor = 'var(--primary)';
                  badgeClass = 'badge-warning';
                  borderStyle = 'border: 1px solid var(--primary); background: var(--primary-light, rgba(79, 70, 229, 0.04));';
                } else if (step.status === 'Rejected') {
                  iconHtml = '✕';
                  iconColor = 'var(--danger)';
                  badgeClass = 'badge-danger';
                } else if (step.status === 'Skipped') {
                  iconHtml = '—';
                  badgeClass = 'badge-muted';
                }

                const approverText = (step.approverNames && step.approverNames.length > 0)
                  ? step.approverNames.join(', ')
                  : (step.approverType || 'Unassigned');

                const actionDate = act ? new Date(act.actionAt).toLocaleString() : (step.startedAt ? new Date(step.startedAt).toLocaleString() : null);

                return `
                  <div style="padding: var(--space-3); border-radius: var(--radius-md); ${borderStyle} background: var(--surface);">
                    <div class="flex items-center justify-between" style="flex-wrap: wrap; gap: var(--space-2);">
                      <div class="flex items-center gap-2">
                        <div style="width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; color: ${iconColor}; background: var(--surface-elevated); border: 1px solid var(--border);">
                          ${iconHtml}
                        </div>
                        <strong style="font-size: var(--text-xs); color: var(--text);">
                          Step ${step.stepOrder}: ${this._escapeHtml(step.stepName)}
                        </strong>
                      </div>
                      <span class="badge ${badgeClass} badge-pill" style="font-size: 10px;">
                        ${step.status}
                      </span>
                    </div>

                    <div style="font-size: 11px; margin-top: var(--space-2); padding-left: 30px; display: flex; flex-direction: column; gap: 2px;">
                      <div>
                        <span class="text-muted">Approver:</span>
                        <strong class="text-main" style="margin-left: 4px;">${this._escapeHtml(approverText)}</strong>
                      </div>

                      ${actionDate ? `
                        <div>
                          <span class="text-muted">Date:</span>
                          <span class="text-secondary" style="margin-left: 4px;">${actionDate}</span>
                        </div>
                      ` : ''}

                      ${act && act.comments ? `
                        <div style="margin-top: 4px; padding: 4px 8px; background: var(--surface-elevated); border-radius: var(--radius-sm); border-left: 2px solid ${step.status === 'Approved' ? 'var(--success)' : 'var(--danger)'};">
                          <span class="text-muted">Decision Note:</span>
                          <em style="color: var(--text); margin-left: 4px;">"${this._escapeHtml(act.comments)}"</em>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Embedded Decision Action Buttons if Current User is Approver -->
          ${isApprover ? `
            <div style="padding: var(--space-3); background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); margin-top: var(--space-2);">
              <span class="text-xs font-semibold text-main">Your Decision as Active Approver:</span>
              <div class="flex items-center gap-2" style="margin-top: var(--space-2);">
                ${canApprove ? `
                  <button type="button" class="btn btn-success btn-sm" id="btn-modal-inner-approve">
                    Approve Request
                  </button>
                ` : ''}
                ${canReject ? `
                  <button type="button" class="btn btn-danger btn-sm" id="btn-modal-inner-reject">
                    Reject Request
                  </button>
                ` : ''}
                ${canDelegate ? `
                  <button type="button" class="btn btn-outline btn-sm" id="btn-modal-inner-delegate">
                    Delegate...
                  </button>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;

      // Wire inner decision buttons if present
      if (isApprover) {
        const approveBtn = modalBody.querySelector('#btn-modal-inner-approve');
        if (approveBtn) {
          approveBtn.addEventListener('click', () => {
            window.HRM.Modal.close();
            setTimeout(() => this.openConfirmModal(request.id, currentUser.id, 'Approve'), 150);
          });
        }
        const rejectBtn = modalBody.querySelector('#btn-modal-inner-reject');
        if (rejectBtn) {
          rejectBtn.addEventListener('click', () => {
            window.HRM.Modal.close();
            setTimeout(() => this.openConfirmModal(request.id, currentUser.id, 'Reject'), 150);
          });
        }
        const delegateBtn = modalBody.querySelector('#btn-modal-inner-delegate');
        if (delegateBtn) {
          delegateBtn.addEventListener('click', () => {
            window.HRM.Modal.close();
            setTimeout(() => this.openDelegateModal(request.id, currentUser.id), 150);
          });
        }
      }

      window.HRM.Modal.open({
        title: `Approval Details — #${request.id.replace('apr_', '').toUpperCase()}`,
        content: modalBody,
        confirmText: 'Close',
        cancelText: null
      });
    }

    /**
     * ==================================================
     * CONFIRM APPROVE / REJECT (PHASE 13 REQUIREMENT 3)
     * Mandatory validation: Reject REQUIRES comments!
     * ==================================================
     */
    openConfirmModal(requestId, approverId, actionType) {
      const isReject = actionType === 'Reject';

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          <p style="margin: 0; font-size: var(--text-sm);">
            Are you sure you want to <strong>${actionType}</strong> this approval request?
          </p>

          <div class="form-group" style="margin: 0;">
            <label class="form-label ${isReject ? 'required' : ''}" for="decision-comments">
              ${isReject ? 'Reason for Rejection (Mandatory)' : 'Decision Comments (Optional)'}
            </label>
            <textarea 
              id="decision-comments" 
              class="textarea" 
              placeholder="${isReject ? 'Please provide the specific reason for declining this request...' : 'Optional notes regarding your sign-off...'}"
              ${isReject ? 'required' : ''}
            ></textarea>
            ${isReject ? `
              <div class="form-help text-danger" style="color: var(--danger); font-size: 11px;">
                Rejection comments are strictly mandatory for compliance and audit logs.
              </div>
            ` : ''}
          </div>
        </div>
      `;

      window.HRM.Modal.open({
        title: `${actionType} Request`,
        content: modalBody,
        confirmText: `Confirm ${actionType}`,
        confirmClass: actionType === 'Approve' ? 'btn-success' : 'btn-danger',
        cancelText: 'Cancel',
        onConfirm: () => {
          const commentsInput = modalBody.querySelector('#decision-comments');
          const comments = commentsInput.value.trim();

          // STRICT VALIDATION: Reject requires comments! (Phase 13 Requirement 3)
          if (isReject && !comments) {
            alert('Rejection comments are mandatory. Please provide a reason for declining this request.');
            commentsInput.focus();
            return;
          }

          let res;
          if (actionType === 'Approve') {
            res = window.HRM.ApprovalEngine.approve(requestId, approverId, comments);
          } else {
            res = window.HRM.ApprovalEngine.reject(requestId, approverId, comments);
          }

          if (!res.success) {
            alert(res.error || `Failed to ${actionType.toLowerCase()} request.`);
            return;
          }

          // STATUS SYNCHRONIZATION (Phase 12 Requirement 5)
          if (window.HRM.LeaveService) {
            window.HRM.LeaveService.syncFromApprovalRequest(requestId);
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(
              `Request successfully ${actionType.toLowerCase()}d.`,
              'Decision Recorded'
            );
          }

          this.render(this.container);
        }
      });
    }

    /**
     * ==================================================
     * DELEGATE MODAL (PHASE 13 REQUIREMENT 3)
     * Mandatory validation: Requires Employee and Reason!
     * ==================================================
     */
    openDelegateModal(requestId, currentApproverId) {
      const db = window.HRM.DatabaseService ? window.HRM.DatabaseService.getDatabase() : null;
      const users = (db ? db.users : []).filter(u => u.id !== currentApproverId && (u.status || '').toLowerCase() === 'active');

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <form id="delegate-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="delegate-target-employee">Select Delegate Employee</label>
            <select id="delegate-target-employee" class="select" required>
              <option value="" disabled selected>Choose active employee...</option>
              ${users.map(u => `
                <option value="${u.id}">${this._escapeHtml(u.name)} (${this._escapeHtml(u.employeeCode)})</option>
              `).join('')}
            </select>
            <div class="form-help">Designated colleague will be granted sign-off authority for this gate.</div>
          </div>

          <div class="form-group">
            <label class="form-label required" for="delegate-reason">Delegation Reason</label>
            <textarea 
              id="delegate-reason" 
              class="textarea" 
              placeholder="e.g. Out of office on annual leave, delegating authority..." 
              required
            ></textarea>
            <div class="form-help text-danger" style="color: var(--danger); font-size: 11px;">
              A formal reason is strictly mandatory when delegating authority.
            </div>
          </div>
        </form>
      `;

      window.HRM.Modal.open({
        title: 'Delegate Approval Authority',
        content: modalBody,
        confirmText: 'Delegate Authority',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const targetSelect = modalBody.querySelector('#delegate-target-employee');
          const reasonInput = modalBody.querySelector('#delegate-reason');

          const targetId = targetSelect.value;
          const reason = reasonInput.value.trim();

          // STRICT VALIDATIONS (Phase 13 Requirement 3)
          if (!targetId) {
            alert('Please select a colleague to delegate authority to.');
            targetSelect.focus();
            return;
          }

          if (!reason) {
            alert('Delegation reason is mandatory. Please explain why authority is being delegated.');
            reasonInput.focus();
            return;
          }

          const res = window.HRM.ApprovalEngine.delegate(requestId, currentApproverId, targetId, reason);
          if (!res.success) {
            alert(res.error || 'Failed to delegate request.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success('Authority successfully delegated.', 'Delegation Recorded');
          }

          this.render(this.container);
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
  window.HRM.ApprovalsPage = new ApprovalsPage();
  window.ApprovalsPage = window.HRM.ApprovalsPage;
})();
