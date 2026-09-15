/**
 * ==================================================
 * WORKFLOWS PAGE
 * Approval Workflow Master Directory & Workflow Step Builder
 * Route: #/workflows
 * ==================================================
 */

(function () {
  'use strict';

  class WorkflowsPage {
    constructor() {
      this.container = null;
      this.searchQuery = '';
      this.entityTypeFilter = 'all';
      this.statusFilter = 'all';
    }

    render(container) {
      this.container = container;
      const wfService = window.HRM ? window.HRM.WorkflowService : null;
      const allWorkflows = wfService ? wfService.getAll() : [];

      const totalCount = allWorkflows.length;
      const publishedCount = allWorkflows.filter(w => w.publishedVersion).length;

      // Filter workflows
      const filtered = allWorkflows.filter(w => {
        // Entity type filter
        if (this.entityTypeFilter !== 'all' && w.entityType !== this.entityTypeFilter) {
          return false;
        }

        // Status filter
        if (this.statusFilter === 'active' && !w.isActive) return false;
        if (this.statusFilter === 'inactive' && w.isActive) return false;

        // Search query
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          const matchesName = (w.name || '').toLowerCase().includes(q);
          const matchesCode = (w.code || '').toLowerCase().includes(q);
          const matchesDesc = (w.description || '').toLowerCase().includes(q);
          const matchesEntity = (w.entityType || '').toLowerCase().includes(q);
          return matchesName || matchesCode || matchesDesc || matchesEntity;
        }

        return true;
      });

      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const canCreate = authz ? authz.can('workflow.create') : true;
      const canEdit = authz ? authz.can('workflow.edit') : true;
      const canPublish = authz ? authz.can('workflow.publish') : true;

      container.innerHTML = `
        <div class="workflows-page">
          <!-- Page Header -->
          <div class="flex items-center justify-between" style="margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
            <div>
              <h1 style="font-size: var(--text-2xl); font-weight: 700;">Approval Workflows</h1>
              <p class="text-secondary" style="font-size: var(--text-sm); margin-top: 4px;">
                Define multi-stage approval processes, entity routing rules, step sequences, and version releases
              </p>
            </div>
            <div class="flex items-center gap-2" style="flex-wrap: wrap;">
              <span class="badge badge-primary badge-pill">${totalCount} Total</span>
              <span class="badge badge-success badge-pill">${publishedCount} Published</span>
              ${canCreate ? `
                <button type="button" class="btn btn-primary" id="btn-create-workflow-modal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Create Workflow</span>
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
                    id="workflow-search-input" 
                    class="input" 
                    placeholder="Search by workflow name, code, or description..."
                    value="${this._escapeHtml(this.searchQuery)}"
                    style="padding-left: 36px;"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>

              <div class="flex items-center gap-3" style="flex-wrap: wrap;">
                <div class="flex items-center gap-2">
                  <label class="form-label text-xs text-muted" for="workflow-entity-select">Entity Type:</label>
                  <select id="workflow-entity-select" class="select" style="width: 170px; padding: 0.45rem 2rem 0.45rem 0.75rem; font-size: var(--text-xs);">
                    <option value="all" ${this.entityTypeFilter === 'all' ? 'selected' : ''}>All Entity Types</option>
                    ${(wfService ? wfService.getEntityTypes() : []).map(et => `
                      <option value="${et}" ${this.entityTypeFilter === et ? 'selected' : ''}>${et}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="flex items-center gap-2">
                  <label class="form-label text-xs text-muted" for="workflow-status-select">Status:</label>
                  <select id="workflow-status-select" class="select" style="width: 130px; padding: 0.45rem 2rem 0.45rem 0.75rem; font-size: var(--text-xs);">
                    <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                    <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active Only</option>
                    <option value="inactive" ${this.statusFilter === 'inactive' ? 'selected' : ''}>Inactive Only</option>
                  </select>
                </div>

                ${(this.searchQuery || this.entityTypeFilter !== 'all' || this.statusFilter !== 'all') ? `
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-clear-workflow-filters">
                    Clear Filters
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Workflows Table Card -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Configured Approval Workflows</h3>
                <div class="card-subtitle">Showing ${filtered.length} of ${allWorkflows.length} total workflow definitions</div>
              </div>
              <span class="badge badge-primary">Builder & Versioning Active</span>
            </div>

            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Entity Type</th>
                    <th>Current Version</th>
                    <th>Status</th>
                    <th style="text-align: right; min-width: 270px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.length === 0 ? `
                    <tr>
                      <td colspan="6" style="text-align: center; padding: var(--space-8);">
                        <div class="empty-state" style="border: none; padding: var(--space-4);">
                          <div class="empty-state-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                          </div>
                          <h4 class="empty-state-title" style="font-size: var(--text-base);">No Workflows Found</h4>
                          <p class="empty-state-desc" style="font-size: var(--text-xs);">
                            ${this.searchQuery ? `No workflows match "${this.searchQuery}".` : 'No workflows configured yet. Create one to get started.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ` : filtered.map(wf => {
                    const currentV = wf.currentVersion;
                    const vNum = currentV ? `v${currentV.versionNumber}` : 'v0';
                    const vStatus = currentV ? currentV.status : 'None';
                    const stepCount = currentV ? (currentV.stepCount || 0) : 0;
                    
                    let versionBadgeClass = 'badge-muted';
                    if (vStatus === 'Published') versionBadgeClass = 'badge-success';
                    else if (vStatus === 'Draft') versionBadgeClass = 'badge-warning';
                    else if (vStatus === 'Archived') versionBadgeClass = 'badge-muted';

                    const latestDraft = wf.versions.find(v => v.status === 'Draft');
                    const targetVersionForBuilder = latestDraft || currentV;

                    return `
                      <tr>
                        <td>
                          <div>
                            <span class="font-semibold text-sm" style="color: var(--text);">${this._escapeHtml(wf.name)}</span>
                            ${wf.description ? `<p class="text-xs text-muted" style="margin-top: 2px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this._escapeHtml(wf.description)}</p>` : ''}
                          </div>
                        </td>
                        <td>
                          <code style="font-family: var(--font-mono); font-size: 11px; color: var(--primary-text); background: var(--surface-elevated); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">
                            ${this._escapeHtml(wf.code)}
                          </code>
                        </td>
                        <td>
                          <span class="badge badge-info badge-pill" style="font-size: 11px;">
                            ${this._escapeHtml(wf.entityType)}
                          </span>
                        </td>
                        <td>
                          <button type="button" class="btn-view-history badge ${versionBadgeClass} badge-pill" data-id="${wf.id}" style="cursor: pointer; border: none; font-size: 11px;" title="Click to inspect all ${wf.versionCount} version(s)">
                            ${vNum} · ${vStatus} (${stepCount} step${stepCount === 1 ? '' : 's'})
                          </button>
                        </td>
                        <td>
                          <span class="badge ${wf.isActive ? 'badge-success' : 'badge-danger'} badge-pill">
                            ${wf.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style="text-align: right;">
                          <div class="flex items-center justify-end gap-1">
                            <!-- Builder Action -->
                            ${targetVersionForBuilder ? `
                              <button 
                                type="button" 
                                class="btn btn-primary btn-sm btn-open-builder" 
                                data-vid="${targetVersionForBuilder.id}" 
                                data-wfid="${wf.id}"
                                title="Open Step Builder for Version ${targetVersionForBuilder.versionNumber}"
                                style="font-size: 11px; padding: 0.3rem 0.65rem;"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;">
                                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                  <polyline points="2 17 12 22 22 17"></polyline>
                                  <polyline points="2 12 12 17 22 12"></polyline>
                                </svg>
                                Builder
                              </button>
                            ` : ''}

                            <!-- View / Version History -->
                            <button 
                              type="button" 
                              class="btn btn-ghost btn-sm btn-view-history" 
                              data-id="${wf.id}" 
                              title="Version History & Details"
                            >
                              Versions
                            </button>

                            <!-- Quick Publish (if has Draft and canPublish) -->
                            ${(canPublish && latestDraft) ? `
                              <button 
                                type="button" 
                                class="btn btn-success btn-sm btn-quick-publish" 
                                data-id="${wf.id}" 
                                data-vid="${latestDraft.id}" 
                                data-vnum="${latestDraft.versionNumber}"
                                title="Publish Version ${latestDraft.versionNumber}"
                                style="font-size: 11px; padding: 0.3rem 0.6rem;"
                              >
                                Publish v${latestDraft.versionNumber}
                              </button>
                            ` : ''}

                            <!-- Create New Version (Phase 9 Requirement 5) -->
                            ${canCreate ? `
                              <button 
                                type="button" 
                                class="btn btn-outline btn-sm btn-create-version" 
                                data-id="${wf.id}" 
                                title="Create New Version"
                                style="font-size: 11px; padding: 0.3rem 0.6rem;"
                              >
                                + Version
                              </button>
                            ` : ''}

                            <!-- Edit Metadata -->
                            ${canEdit ? `
                              <button 
                                type="button" 
                                class="btn btn-ghost btn-sm btn-edit-workflow" 
                                data-id="${wf.id}" 
                                title="Edit Metadata"
                              >
                                Edit
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
      const searchInput = this.container.querySelector('#workflow-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.trim();
          this.render(this.container);
        });
      }

      // 2. Entity Type filter
      const entitySelect = this.container.querySelector('#workflow-entity-select');
      if (entitySelect) {
        entitySelect.addEventListener('change', (e) => {
          this.entityTypeFilter = e.target.value;
          this.render(this.container);
        });
      }

      // 3. Status filter
      const statusSelect = this.container.querySelector('#workflow-status-select');
      if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
          this.statusFilter = e.target.value;
          this.render(this.container);
        });
      }

      // 4. Clear filters
      const clearBtn = this.container.querySelector('#btn-clear-workflow-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.searchQuery = '';
          this.entityTypeFilter = 'all';
          this.statusFilter = 'all';
          this.render(this.container);
        });
      }

      // 5. Create Workflow Modal trigger
      const createBtn = this.container.querySelector('#btn-create-workflow-modal');
      if (createBtn) {
        createBtn.addEventListener('click', () => this.openCreateModal());
      }

      // 6. View History buttons
      this.container.querySelectorAll('.btn-view-history').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openHistoryModal(id);
        });
      });

      // 7. Quick Publish buttons
      this.container.querySelectorAll('.btn-quick-publish').forEach(btn => {
        btn.addEventListener('click', () => {
          const wfId = btn.getAttribute('data-id');
          const vid = btn.getAttribute('data-vid');
          const vnum = btn.getAttribute('data-vnum');
          this.confirmPublishVersion(wfId, vid, vnum);
        });
      });

      // 8. Create New Version buttons
      this.container.querySelectorAll('.btn-create-version').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.handleCreateVersion(id);
        });
      });

      // 9. Edit Workflow buttons
      this.container.querySelectorAll('.btn-edit-workflow').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openEditModal(id);
        });
      });

      // 10. Open Builder buttons
      this.container.querySelectorAll('.btn-open-builder').forEach(btn => {
        btn.addEventListener('click', () => {
          const vid = btn.getAttribute('data-vid');
          this.openStepBuilderModal(vid);
        });
      });
    }

    /**
     * ==================================================
     * WORKFLOW STEP BUILDER (PHASE 10)
     * ==================================================
     */
    openStepBuilderModal(versionId) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return;

      const db = dbService.getDatabase();
      const version = (db.workflowVersions || []).find(v => v.id === versionId);
      if (!version) {
        alert('Workflow version not found.');
        return;
      }

      const workflow = (db.workflows || []).find(w => w.id === version.workflowId);
      if (!workflow) {
        alert('Parent workflow not found.');
        return;
      }

      const stepService = window.HRM.WorkflowStepService;
      const steps = stepService ? stepService.getStepsForVersion(versionId) : [];
      const isDraft = version.status === 'Draft';
      const isPublished = version.status === 'Published';
      const isArchived = version.status === 'Archived';

      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const canEdit = authz ? authz.can('workflow.edit') : true;
      const canPublish = authz ? authz.can('workflow.publish') : true;

      const modalBody = document.createElement('div');
      modalBody.className = 'workflow-builder-container';
      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: var(--space-4);">
          <!-- Top summary strip -->
          <div class="flex items-center justify-between" style="padding-bottom: var(--space-3); border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: var(--space-2);">
            <div>
              <div class="flex items-center gap-2">
                <h4 style="margin: 0; font-size: var(--text-base);">${this._escapeHtml(workflow.name)}</h4>
                <span class="badge ${isPublished ? 'badge-success' : (isDraft ? 'badge-warning' : 'badge-muted')} badge-pill">
                  v${version.versionNumber} · ${version.status}
                </span>
              </div>
              <p class="text-xs text-muted" style="margin-top: 2px;">
                Entity: <strong>${this._escapeHtml(workflow.entityType)}</strong> | Code: <code>${this._escapeHtml(workflow.code)}</code>
              </p>
            </div>

            <div class="flex items-center gap-2">
              ${isDraft && canEdit ? `
                <button type="button" class="btn btn-primary btn-sm" id="builder-add-step-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  + Add Step
                </button>
              ` : ''}

              ${!isDraft ? `
                <button type="button" class="btn btn-outline btn-sm" id="builder-branch-version-btn">
                  + Create New Version
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Immutability Alert if Published or Archived (Phase 10 Requirement 5) -->
          ${!isDraft ? `
            <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid var(--danger); border-radius: var(--radius-md); padding: var(--space-3); color: var(--danger-text, #ef4444); font-size: var(--text-xs); display: flex; align-items: flex-start; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <div>
                <strong>Strict Immutability Notice:</strong> This version is <strong>${version.status}</strong> and cannot be modified. Steps are locked. To make adjustments to this workflow, click "+ Create New Version" above to branch an editable Draft.
              </div>
            </div>
          ` : `
            <div style="font-size: var(--text-xs); color: var(--text-secondary);">
              Configure the ordered sequence of approval gates. All steps are evaluated top-to-bottom.
            </div>
          `}

          <!-- Steps List -->
          <div id="builder-steps-list" style="display: flex; flex-direction: column; gap: var(--space-3); max-height: 52vh; overflow-y: auto; padding-right: 4px;">
            ${steps.length === 0 ? `
              <div class="empty-state" style="padding: var(--space-6); background: var(--surface-elevated); border-radius: var(--radius-md);">
                <div class="empty-state-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                </div>
                <h4 class="empty-state-title" style="font-size: var(--text-sm);">No Approval Steps Configured</h4>
                <p class="empty-state-desc" style="font-size: var(--text-xs);">
                  ${isDraft ? 'Click "+ Add Step" to create your first approval gate (e.g. Manager Approval).' : 'This release has no approval steps defined.'}
                </p>
              </div>
            ` : steps.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === steps.length - 1;

              return `
                <div class="step-card" data-step-id="${step.id}" style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); display: flex; align-items: center; justify-between; gap: var(--space-3); box-shadow: var(--shadow-sm); transition: all var(--transition-fast);">
                  <!-- Step Index Badge -->
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 44px; height: 44px; background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); flex-shrink: 0;">
                    <span style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; line-height: 1;">Step</span>
                    <strong style="font-size: 16px; color: var(--primary); font-family: var(--font-mono); line-height: 1.2;">${step.stepOrder}</strong>
                  </div>

                  <!-- Step Details -->
                  <div style="flex: 1; min-width: 0;">
                    <div class="flex items-center gap-2" style="flex-wrap: wrap;">
                      <h5 style="margin: 0; font-size: var(--text-sm); font-weight: 600; color: var(--text);">${this._escapeHtml(step.name)}</h5>
                      <span class="badge badge-primary badge-pill" style="font-size: 10px;">
                        ${this._escapeHtml(step.approverLabel || step.approverType)}
                      </span>
                      ${step.isRequired ? '<span class="badge badge-info badge-pill" style="font-size: 9px;">Required</span>' : '<span class="badge badge-muted badge-pill" style="font-size: 9px;">Optional</span>'}
                    </div>

                    <div class="flex items-center gap-3 text-muted" style="font-size: 11px; margin-top: 4px; flex-wrap: wrap;">
                      <span>Min Approvals: <strong>${step.minApprovals || 1}</strong></span>
                      <span>•</span>
                      <span>Reject: <strong>${step.allowReject ? 'Yes' : 'No'}</strong></span>
                      <span>•</span>
                      <span>Delegate: <strong>${step.allowDelegate ? 'Yes' : 'No'}</strong></span>
                    </div>
                  </div>

                  <!-- Step Action Buttons (Draft only) -->
                  ${isDraft && canEdit ? `
                    <div class="flex items-center gap-1" style="flex-shrink: 0;">
                      <!-- Move Up -->
                      <button 
                        type="button" 
                        class="btn btn-ghost btn-sm btn-move-step-up" 
                        data-step-id="${step.id}" 
                        ${isFirst ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} 
                        title="Move Step Up"
                        style="padding: 4px 6px;"
                      >
                        ▲
                      </button>

                      <!-- Move Down -->
                      <button 
                        type="button" 
                        class="btn btn-ghost btn-sm btn-move-step-down" 
                        data-step-id="${step.id}" 
                        ${isLast ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} 
                        title="Move Step Down"
                        style="padding: 4px 6px;"
                      >
                        ▼
                      </button>

                      <!-- Edit Step -->
                      <button 
                        type="button" 
                        class="btn btn-ghost btn-sm btn-edit-step" 
                        data-step-id="${step.id}" 
                        title="Edit Step"
                        style="font-size: 11px; padding: 4px 8px;"
                      >
                        Edit
                      </button>

                      <!-- Delete Step -->
                      <button 
                        type="button" 
                        class="btn btn-ghost btn-sm btn-delete-step" 
                        data-step-id="${step.id}" 
                        title="Delete Step"
                        style="color: var(--danger); font-size: 11px; padding: 4px 8px;"
                      >
                        Delete
                      </button>
                    </div>
                  ` : `
                    <div style="flex-shrink: 0;">
                      <span class="badge badge-muted" style="font-size: 10px;">Locked</span>
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Wire events in Builder Modal
      if (isDraft && canEdit) {
        // Add Step
        const addBtn = modalBody.querySelector('#builder-add-step-btn');
        if (addBtn) {
          addBtn.addEventListener('click', () => {
            this.openStepFormModal(versionId, null, () => {
              this.openStepBuilderModal(versionId);
            });
          });
        }

        // Edit Step
        modalBody.querySelectorAll('.btn-edit-step').forEach(btn => {
          btn.addEventListener('click', () => {
            const stepId = btn.getAttribute('data-step-id');
            const step = (stepService.getStepsForVersion(versionId) || []).find(s => s.id === stepId);
            if (step) {
              this.openStepFormModal(versionId, step, () => {
                this.openStepBuilderModal(versionId);
              });
            }
          });
        });

        // Delete Step
        modalBody.querySelectorAll('.btn-delete-step').forEach(btn => {
          btn.addEventListener('click', () => {
            const stepId = btn.getAttribute('data-step-id');
            const step = (stepService.getStepsForVersion(versionId) || []).find(s => s.id === stepId);
            if (!step) return;

            if (confirm(`Are you sure you want to delete Step ${step.stepOrder} ("${step.name}")? Remaining steps will be re-sequenced automatically.`)) {
              const res = stepService.deleteStep(stepId);
              if (!res.success) {
                alert(res.error || 'Failed to delete step.');
                return;
              }
              if (window.HRM.Toast) {
                window.HRM.Toast.success(`Step ${step.stepOrder} deleted.`, 'Step Removed');
              }
              this.render(this.container);
              this.openStepBuilderModal(versionId);
            }
          });
        });

        // Move Up
        modalBody.querySelectorAll('.btn-move-step-up').forEach(btn => {
          btn.addEventListener('click', () => {
            const stepId = btn.getAttribute('data-step-id');
            const currentSteps = stepService.getStepsForVersion(versionId);
            const idx = currentSteps.findIndex(s => s.id === stepId);
            if (idx > 0) {
              const newOrder = [...currentSteps.map(s => s.id)];
              const temp = newOrder[idx - 1];
              newOrder[idx - 1] = newOrder[idx];
              newOrder[idx] = temp;
              stepService.reorderSteps(versionId, newOrder);
              this.render(this.container);
              this.openStepBuilderModal(versionId);
            }
          });
        });

        // Move Down
        modalBody.querySelectorAll('.btn-move-step-down').forEach(btn => {
          btn.addEventListener('click', () => {
            const stepId = btn.getAttribute('data-step-id');
            const currentSteps = stepService.getStepsForVersion(versionId);
            const idx = currentSteps.findIndex(s => s.id === stepId);
            if (idx >= 0 && idx < currentSteps.length - 1) {
              const newOrder = [...currentSteps.map(s => s.id)];
              const temp = newOrder[idx + 1];
              newOrder[idx + 1] = newOrder[idx];
              newOrder[idx] = temp;
              stepService.reorderSteps(versionId, newOrder);
              this.render(this.container);
              this.openStepBuilderModal(versionId);
            }
          });
        });
      } else {
        // Branch version button
        const branchBtn = modalBody.querySelector('#builder-branch-version-btn');
        if (branchBtn) {
          branchBtn.addEventListener('click', () => {
            window.HRM.Modal.close();
            this.handleCreateVersion(workflow.id);
          });
        }
      }

      window.HRM.Modal.open({
        title: `Workflow Builder — ${workflow.name} (v${version.versionNumber})`,
        content: modalBody,
        confirmText: (isDraft && canPublish && steps.length > 0) ? `Publish v${version.versionNumber}` : 'Close',
        confirmClass: (isDraft && canPublish && steps.length > 0) ? 'btn-success' : 'btn-ghost',
        cancelText: (isDraft && canPublish && steps.length > 0) ? 'Close' : null,
        onConfirm: () => {
          if (isDraft && canPublish && steps.length > 0) {
            window.HRM.Modal.close();
            setTimeout(() => {
              this.confirmPublishVersion(workflow.id, version.id, version.versionNumber);
            }, 150);
          }
        }
      });
    }

    /**
     * ==================================================
     * ADD / EDIT STEP MODAL (PHASE 10)
     * ==================================================
     */
    openStepFormModal(versionId, stepToEdit = null, onSuccessCallback = null) {
      const stepService = window.HRM.WorkflowStepService;
      const approverTypes = stepService ? stepService.getApproverTypes() : [];
      const isEditing = Boolean(stepToEdit);

      const db = window.HRM.DatabaseService.getDatabase();
      const users = db.users || [];
      const roles = db.roles || [];

      const initialType = stepToEdit ? stepToEdit.approverType : 'Manager';
      const initialValue = stepToEdit ? (stepToEdit.approverValue || '') : '';

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <form id="step-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="step-name">Step Name</label>
            <input 
              type="text" 
              id="step-name" 
              class="input" 
              placeholder="e.g. Manager Approval, HR Verification..." 
              value="${this._escapeHtml(stepToEdit ? stepToEdit.name : '')}" 
              required
            >
          </div>

          <div class="form-group">
            <label class="form-label required" for="step-approver-type">Approver Type</label>
            <select id="step-approver-type" class="select" required>
              ${approverTypes.map(t => `
                <option value="${t}" ${t === initialType ? 'selected' : ''}>${t}</option>
              `).join('')}
            </select>
            <div class="form-help">Type of authority required to grant approval at this gate.</div>
          </div>

          <!-- Specific Employee Selector (dynamic) -->
          <div class="form-group" id="group-specific-employee" style="${initialType === 'SpecificEmployee' ? '' : 'display: none;'}">
            <label class="form-label required" for="step-specific-employee">Select Employee</label>
            <select id="step-specific-employee" class="select">
              <option value="" disabled ${!initialValue ? 'selected' : ''}>Choose an employee...</option>
              ${users.map(u => `
                <option value="${u.id}" ${u.id === initialValue ? 'selected' : ''}>${this._escapeHtml(u.name)} (${this._escapeHtml(u.employeeCode)})</option>
              `).join('')}
            </select>
          </div>

          <!-- Role Selector (dynamic) -->
          <div class="form-group" id="group-role" style="${initialType === 'Role' ? '' : 'display: none;'}">
            <label class="form-label required" for="step-role">Select Role</label>
            <select id="step-role" class="select">
              <option value="" disabled ${!initialValue ? 'selected' : ''}>Choose a role...</option>
              ${roles.map(r => `
                <option value="${r.id}" ${r.id === initialValue ? 'selected' : ''}>${this._escapeHtml(r.name)} (${this._escapeHtml(r.code)})</option>
              `).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-2);">
            <div class="form-group">
              <label class="form-label" for="step-min-approvals">Min Approvals</label>
              <input 
                type="number" 
                id="step-min-approvals" 
                class="input" 
                min="1" 
                max="10" 
                value="${stepToEdit ? (stepToEdit.minApprovals || 1) : 1}" 
                required
              >
              <div class="form-help">Sign-offs required before advancing.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Requirement</label>
              <div style="margin-top: 8px;">
                <label class="flex items-center gap-2" style="font-size: var(--text-xs); cursor: pointer;">
                  <input type="checkbox" id="step-is-required" ${(!stepToEdit || stepToEdit.isRequired) ? 'checked' : ''}>
                  <span>Mandatory Step</span>
                </label>
              </div>
            </div>
          </div>

          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); margin-top: var(--space-2);">
            <span class="text-xs font-semibold text-main">Gate Policies:</span>
            <div class="flex items-center gap-4" style="margin-top: 6px;">
              <label class="flex items-center gap-2" style="font-size: var(--text-xs); cursor: pointer;">
                <input type="checkbox" id="step-allow-reject" ${(!stepToEdit || stepToEdit.allowReject) ? 'checked' : ''}>
                <span>Allow Rejection</span>
              </label>
              <label class="flex items-center gap-2" style="font-size: var(--text-xs); cursor: pointer;">
                <input type="checkbox" id="step-allow-delegate" ${(stepToEdit && stepToEdit.allowDelegate) ? 'checked' : ''}>
                <span>Allow Delegation</span>
              </label>
            </div>
          </div>
        </form>
      `;

      // Dynamic toggle for approver target fields
      const typeSelect = modalBody.querySelector('#step-approver-type');
      const employeeGroup = modalBody.querySelector('#group-specific-employee');
      const roleGroup = modalBody.querySelector('#group-role');

      typeSelect.addEventListener('change', (e) => {
        const selected = e.target.value;
        if (selected === 'SpecificEmployee') {
          employeeGroup.style.display = '';
          roleGroup.style.display = 'none';
        } else if (selected === 'Role') {
          employeeGroup.style.display = 'none';
          roleGroup.style.display = '';
        } else {
          employeeGroup.style.display = 'none';
          roleGroup.style.display = 'none';
        }
      });

      window.HRM.Modal.open({
        title: isEditing ? `Edit Step ${stepToEdit.stepOrder}` : 'Add Approval Step',
        content: modalBody,
        confirmText: isEditing ? 'Save Changes' : 'Add Step',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const nameInput = modalBody.querySelector('#step-name');
          const approverType = typeSelect.value;
          const isRequired = modalBody.querySelector('#step-is-required').checked;
          const minApprovals = parseInt(modalBody.querySelector('#step-min-approvals').value, 10) || 1;
          const allowReject = modalBody.querySelector('#step-allow-reject').checked;
          const allowDelegate = modalBody.querySelector('#step-allow-delegate').checked;

          let approverValue = null;
          if (approverType === 'SpecificEmployee') {
            approverValue = modalBody.querySelector('#step-specific-employee').value;
          } else if (approverType === 'Role') {
            approverValue = modalBody.querySelector('#step-role').value;
          }

          const payload = {
            name: nameInput.value.trim(),
            approverType,
            approverValue,
            isRequired,
            minApprovals,
            allowReject,
            allowDelegate
          };

          let res;
          if (isEditing) {
            res = stepService.updateStep(stepToEdit.id, payload);
          } else {
            res = stepService.createStep(versionId, payload);
          }

          if (!res.success) {
            alert(res.error || 'Failed to save step.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(
              isEditing ? `Step "${payload.name}" updated.` : `Step "${payload.name}" added.`,
              'Workflow Step Saved'
            );
          }

          this.render(this.container);
          if (onSuccessCallback) {
            setTimeout(onSuccessCallback, 50);
          }
        }
      });
    }

    /**
     * Open Create Workflow Modal
     */
    openCreateModal() {
      const wfService = window.HRM.WorkflowService;
      const entityTypes = wfService ? wfService.getEntityTypes() : [];

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <form id="create-workflow-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="new-wf-name">Workflow Name</label>
            <input type="text" id="new-wf-name" class="input" placeholder="e.g. Leave Approval Workflow" required>
          </div>

          <div class="form-group">
            <label class="form-label required" for="new-wf-code">Workflow Code</label>
            <input type="text" id="new-wf-code" class="input" placeholder="e.g. WF_LEAVE" required style="text-transform: uppercase;">
            <div class="form-help">Unique uppercase identifier (alphanumeric and underscores).</div>
          </div>

          <div class="form-group">
            <label class="form-label required" for="new-wf-entity">Entity Type</label>
            <select id="new-wf-entity" class="select" required>
              <option value="" disabled selected>Select an Entity Type...</option>
              ${entityTypes.map(et => `<option value="${et}">${et}</option>`).join('')}
            </select>
            <div class="form-help">Determines which domain records route through this approval pipeline.</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="new-wf-desc">Description</label>
            <textarea id="new-wf-desc" class="textarea" placeholder="Briefly describe this workflow's approval stages and authority matrix"></textarea>
          </div>

          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3);">
            <span class="text-xs font-semibold text-main">Version Release Note:</span>
            <p class="text-xs text-secondary" style="margin-top: 2px;">
              Creating this workflow will automatically initialize <strong>Version 1</strong> in <code>Draft</code> status.
            </p>
          </div>
        </form>
      `;

      window.HRM.Modal.open({
        title: 'Create Approval Workflow',
        content: modalBody,
        confirmText: 'Create Workflow',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const nameInput = modalBody.querySelector('#new-wf-name');
          const codeInput = modalBody.querySelector('#new-wf-code');
          const entitySelect = modalBody.querySelector('#new-wf-entity');
          const descInput = modalBody.querySelector('#new-wf-desc');

          const name = nameInput.value.trim();
          const code = codeInput.value.trim();
          const entityType = entitySelect.value;
          const description = descInput.value.trim();

          const result = window.HRM.WorkflowService.create({
            name,
            code,
            entityType,
            description
          });

          if (!result.success) {
            alert(result.error || 'Failed to create workflow.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(
              `Workflow "${result.workflow.name}" created with Version 1 (Draft).`,
              'Workflow Created'
            );
          }

          this.render(this.container);

          // Prompt user to open builder for Version 1
          if (result.workflow && result.workflow.currentVersion) {
            setTimeout(() => {
              this.openStepBuilderModal(result.workflow.currentVersion.id);
            }, 250);
          }
        }
      });
    }

    /**
     * Open Version History Modal
     */
    openHistoryModal(workflowId) {
      const wf = window.HRM.WorkflowService.getById(workflowId);
      if (!wf) return;

      const versions = wf.versions || [];
      const authz = window.HRM ? window.HRM.AuthorizationService : null;
      const canPublish = authz ? authz.can('workflow.publish') : true;

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: var(--space-4);">
          <div class="flex items-center justify-between" style="padding-bottom: var(--space-3); border-bottom: 1px solid var(--border);">
            <div>
              <h4 style="margin: 0; font-size: var(--text-base);">${this._escapeHtml(wf.name)}</h4>
              <div class="flex items-center gap-2" style="margin-top: 2px;">
                <code style="font-family: var(--font-mono); font-size: 11px; color: var(--primary);">${this._escapeHtml(wf.code)}</code>
                <span class="badge badge-info badge-pill" style="font-size: 10px;">${this._escapeHtml(wf.entityType)}</span>
              </div>
            </div>
            <span class="badge ${wf.isActive ? 'badge-success' : 'badge-danger'}">${wf.isActive ? 'Active' : 'Inactive'}</span>
          </div>

          <div style="font-size: var(--text-xs); color: var(--text-secondary);">
            Published versions are immutable. Publishing a new version automatically archives any previously published release.
          </div>

          <div class="table-wrapper" style="border: 1px solid var(--border); border-radius: var(--radius-md);">
            <table class="table" style="font-size: var(--text-xs); margin: 0;">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Steps</th>
                  <th>Created At</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${versions.map(v => {
                  let statusBadge = 'badge-muted';
                  if (v.status === 'Published') statusBadge = 'badge-success';
                  else if (v.status === 'Draft') statusBadge = 'badge-warning';

                  return `
                    <tr>
                      <td>
                        <strong style="color: var(--text);">v${v.versionNumber}</strong>
                        ${v.status === 'Published' ? '<span class="badge badge-primary" style="font-size: 9px; margin-left: 4px;">CURRENT</span>' : ''}
                      </td>
                      <td>
                        <span class="badge ${statusBadge} badge-pill">${v.status}</span>
                      </td>
                      <td>
                        <span class="badge badge-surface badge-pill" style="font-size: 10px;">
                          ${v.stepCount || 0} step${(v.stepCount || 0) === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td class="text-muted">
                        ${new Date(v.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style="text-align: right;">
                        <div class="flex items-center justify-end gap-1">
                          <!-- Builder inspect -->
                          <button 
                            type="button" 
                            class="btn btn-ghost btn-sm btn-modal-builder" 
                            data-vid="${v.id}"
                            style="font-size: 10px; padding: 2px 8px;"
                          >
                            Builder
                          </button>

                          ${(canPublish && v.status === 'Draft') ? `
                            <button 
                              type="button" 
                              class="btn btn-outline btn-sm btn-modal-publish" 
                              data-wfid="${wf.id}" 
                              data-vid="${v.id}" 
                              data-vnum="${v.versionNumber}"
                              style="font-size: 10px; padding: 2px 8px;"
                            >
                              Publish
                            </button>
                          ` : (v.status === 'Published' ? '<span class="text-xs text-success font-semibold" style="font-size: 11px;">Active</span>' : '')}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Bind Builder buttons in modal
      modalBody.querySelectorAll('.btn-modal-builder').forEach(btn => {
        btn.addEventListener('click', () => {
          const vid = btn.getAttribute('data-vid');
          window.HRM.Modal.close();
          setTimeout(() => this.openStepBuilderModal(vid), 150);
        });
      });

      // Bind publish buttons in modal
      modalBody.querySelectorAll('.btn-modal-publish').forEach(btn => {
        btn.addEventListener('click', () => {
          const wfid = btn.getAttribute('data-wfid');
          const vid = btn.getAttribute('data-vid');
          const vnum = btn.getAttribute('data-vnum');
          window.HRM.Modal.close();
          setTimeout(() => this.confirmPublishVersion(wfid, vid, vnum), 200);
        });
      });

      window.HRM.Modal.open({
        title: `Version History — ${wf.name}`,
        content: modalBody,
        confirmText: 'Close',
        cancelText: null
      });
    }

    /**
     * Confirm and Publish a Version
     */
    confirmPublishVersion(workflowId, versionId, versionNumber) {
      const wf = window.HRM.WorkflowService.getById(workflowId);
      if (!wf) return;

      const prevPub = wf.publishedVersion;

      window.HRM.Modal.open({
        title: `Publish Version ${versionNumber}?`,
        content: `
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <p>
              Are you sure you want to publish <strong>Version ${versionNumber}</strong> of <strong>${this._escapeHtml(wf.name)}</strong>?
            </p>
            ${prevPub ? `
              <div style="background: var(--warning-bg); border: 1px solid var(--warning-border); padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); color: var(--warning-text);">
                <strong>Version Rule:</strong> Version ${prevPub.versionNumber} is currently published and will automatically be set to <code>Archived</code>. Exactly one version can be published at a time.
              </div>
            ` : `
              <div style="background: var(--surface-elevated); border: 1px solid var(--border); padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-xs); color: var(--text-secondary);">
                This will make Version ${versionNumber} the active published release for this workflow. Once published, its steps cannot be modified.
              </div>
            `}
          </div>
        `,
        confirmText: 'Yes, Publish Release',
        confirmClass: 'btn-success',
        cancelText: 'Cancel',
        onConfirm: () => {
          const result = window.HRM.WorkflowService.publishVersion(workflowId, versionId);

          if (!result.success) {
            alert(result.error || 'Failed to publish version.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(
              `Version ${versionNumber} of "${wf.name}" is now Published.`,
              'Workflow Published'
            );
          }

          this.render(this.container);
        }
      });
    }

    /**
     * Create Next Version
     */
    handleCreateVersion(workflowId) {
      const wf = window.HRM.WorkflowService.getById(workflowId);
      if (!wf) return;

      const result = window.HRM.WorkflowService.createVersion(workflowId);

      if (!result.success) {
        alert(result.error || 'Failed to create new version.');
        return;
      }

      if (window.HRM.Toast) {
        window.HRM.Toast.success(
          `Version ${result.version.versionNumber} (Draft) created for "${wf.name}".`,
          'New Draft Version'
        );
      }

      this.render(this.container);

      // Open Builder on newly created version
      if (result.version) {
        setTimeout(() => {
          this.openStepBuilderModal(result.version.id);
        }, 200);
      }
    }

    /**
     * Edit Workflow Metadata Modal
     */
    openEditModal(workflowId) {
      const wf = window.HRM.WorkflowService.getById(workflowId);
      if (!wf) return;

      const modalBody = document.createElement('div');
      modalBody.innerHTML = `
        <form id="edit-workflow-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label required" for="edit-wf-name">Workflow Name</label>
            <input type="text" id="edit-wf-name" class="input" value="${this._escapeHtml(wf.name)}" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="edit-wf-code">Workflow Code</label>
            <input type="text" id="edit-wf-code" class="input" value="${this._escapeHtml(wf.code)}" readonly disabled>
            <div class="form-help">Workflow code cannot be altered once created.</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="edit-wf-entity">Entity Type</label>
            <input type="text" id="edit-wf-entity" class="input" value="${this._escapeHtml(wf.entityType)}" readonly disabled>
          </div>

          <div class="form-group">
            <label class="form-label" for="edit-wf-desc">Description</label>
            <textarea id="edit-wf-desc" class="textarea">${this._escapeHtml(wf.description || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" for="edit-wf-status">Workflow Status</label>
            <select id="edit-wf-status" class="select">
              <option value="true" ${wf.isActive ? 'selected' : ''}>Active</option>
              <option value="false" ${!wf.isActive ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </form>
      `;

      window.HRM.Modal.open({
        title: `Edit Workflow — ${wf.name}`,
        content: modalBody,
        confirmText: 'Save Changes',
        confirmClass: 'btn-primary',
        cancelText: 'Cancel',
        onConfirm: () => {
          const name = modalBody.querySelector('#edit-wf-name').value.trim();
          const description = modalBody.querySelector('#edit-wf-desc').value.trim();
          const isActive = modalBody.querySelector('#edit-wf-status').value === 'true';

          const result = window.HRM.WorkflowService.update(workflowId, {
            name,
            description,
            isActive
          });

          if (!result.success) {
            alert(result.error || 'Failed to update workflow.');
            return;
          }

          if (window.HRM.Toast) {
            window.HRM.Toast.success(`Workflow "${name}" updated.`, 'Changes Saved');
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
  window.HRM.WorkflowsPage = new WorkflowsPage();
  window.WorkflowsPage = window.HRM.WorkflowsPage;
})();
