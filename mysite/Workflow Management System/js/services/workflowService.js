/**
 * ==================================================
 * WORKFLOW SERVICE
 * Manages Approval Workflows and Immutable Workflow Versions
 * Backed by DatabaseService (hrm_database.workflows, hrm_database.workflowVersions)
 * ==================================================
 */

(function () {
  'use strict';

  const ALLOWED_ENTITY_TYPES = Object.freeze([
    'Leave',
    'Expense',
    'AttendanceCorrection',
    'EmployeeTransfer',
    'SalaryRevision',
    'PurchaseRequest'
  ]);

  const ALLOWED_STATUSES = Object.freeze(['Draft', 'Published', 'Archived']);

  class WorkflowService {
    /**
     * Get all supported entity types
     * @returns {Array<string>}
     */
    getEntityTypes() {
      return [...ALLOWED_ENTITY_TYPES];
    }

    /**
     * Get all workflows enriched with their version data
     * @returns {Array<Object>}
     */
    getAll() {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const workflows = db.workflows || [];
      const versions = db.workflowVersions || [];
      const steps = db.workflowSteps || [];

      return workflows.map(wf => {
        const wfVersions = versions
          .filter(v => v.workflowId === wf.id)
          .sort((a, b) => b.versionNumber - a.versionNumber)
          .map(v => ({
            ...v,
            stepCount: steps.filter(s => s.workflowVersionId === v.id).length
          }));

        const publishedVersion = wfVersions.find(v => v.status === 'Published');
        const latestVersion = wfVersions[0] || null;
        // Current active version is published if exists, else latest draft
        const currentVersion = publishedVersion || latestVersion;

        return {
          ...wf,
          versions: wfVersions,
          versionCount: wfVersions.length,
          publishedVersion,
          currentVersion
        };
      });
    }

    /**
     * Get workflow by ID enriched with all versions
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
      if (!id) return null;
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return null;

      const db = dbService.getDatabase();
      const workflow = (db.workflows || []).find(w => w.id === id);
      if (!workflow) return null;

      const steps = db.workflowSteps || [];
      const versions = (db.workflowVersions || [])
        .filter(v => v.workflowId === id)
        .sort((a, b) => b.versionNumber - a.versionNumber)
        .map(v => ({
          ...v,
          stepCount: steps.filter(s => s.workflowVersionId === v.id).length
        }));

      const publishedVersion = versions.find(v => v.status === 'Published');
      const latestVersion = versions[0] || null;
      const currentVersion = publishedVersion || latestVersion;

      return {
        ...workflow,
        versions,
        versionCount: versions.length,
        publishedVersion,
        currentVersion
      };
    }

    /**
     * Create a new workflow and auto-provision Version 1 (Draft)
     * @param {Object} data
     * @param {string} data.name
     * @param {string} data.code
     * @param {string} data.entityType
     * @param {string} [data.description]
     * @returns {{ success: boolean, workflow?: Object, error?: string }}
     */
    create(data) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) {
        return { success: false, error: 'Database service unavailable.' };
      }

      const { name, code, entityType, description = '' } = data || {};

      // 1. Validation: Name required
      if (!name || !name.trim()) {
        return { success: false, error: 'Workflow Name is required.' };
      }

      // 2. Validation: Code required
      if (!code || !code.trim()) {
        return { success: false, error: 'Workflow Code is required.' };
      }
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

      // 3. Validation: Entity Type required and valid
      if (!entityType || !ALLOWED_ENTITY_TYPES.includes(entityType)) {
        return {
          success: false,
          error: `Invalid Entity Type. Must be one of: ${ALLOWED_ENTITY_TYPES.join(', ')}.`
        };
      }

      const db = dbService.getDatabase();
      db.workflows = db.workflows || [];
      db.workflowVersions = db.workflowVersions || [];

      // 4. Validation: Code must be unique
      const existing = db.workflows.find(
        w => w.code && w.code.toUpperCase() === cleanCode
      );
      if (existing) {
        return { success: false, error: `Workflow Code "${cleanCode}" is already in use.` };
      }

      const generateId = (window.HRM && window.HRM.generateId)
        ? window.HRM.generateId
        : (prefix => `${prefix}_${Date.now()}`);

      const now = new Date().toISOString();

      // Resolve current user for audit
      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;
      const createdBy = currentUser ? currentUser.id : 'system';

      // 5. Create ApprovalWorkflow entity (Phase 9 Requirement 1)
      const newWorkflow = {
        id: generateId('wf'),
        code: cleanCode,
        name: name.trim(),
        entityType,
        description: description.trim(),
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      // 6. Auto-provision Version 1 (Draft) (Phase 9 Requirement 2)
      const version1 = {
        id: generateId('wfv'),
        workflowId: newWorkflow.id,
        versionNumber: 1,
        status: 'Draft',
        createdAt: now,
        createdBy
      };

      db.workflows.push(newWorkflow);
      db.workflowVersions.push(version1);
      dbService.saveDatabase(db);

      console.info(`[WorkflowService] Created workflow "${newWorkflow.name}" (${newWorkflow.code}) with Version 1 (Draft).`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'Workflow created',
          entityType: 'ApprovalWorkflow',
          entityId: newWorkflow.id,
          description: `Created approval workflow "${newWorkflow.name}" (${newWorkflow.code}) for entity ${newWorkflow.entityType}.`,
          metadata: { entityType: newWorkflow.entityType, code: newWorkflow.code }
        });
      }

      return { success: true, workflow: this.getById(newWorkflow.id) };
    }

    /**
     * Update workflow metadata (name, description, isActive)
     * @param {string} id
     * @param {Object} data
     * @returns {{ success: boolean, workflow?: Object, error?: string }}
     */
    update(id, data) {
      if (!id) return { success: false, error: 'Workflow ID is required.' };
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.workflows = db.workflows || [];

      const index = db.workflows.findIndex(w => w.id === id);
      if (index === -1) return { success: false, error: 'Workflow not found.' };

      const existing = db.workflows[index];
      const { name, description, isActive } = data || {};

      if (name && !name.trim()) {
        return { success: false, error: 'Workflow Name cannot be empty.' };
      }

      db.workflows[index] = {
        ...existing,
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description.trim() : existing.description,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        updatedAt: new Date().toISOString()
      };

      dbService.saveDatabase(db);
      console.info(`[WorkflowService] Updated workflow metadata for ${id}.`);

      return { success: true, workflow: this.getById(id) };
    }

    /**
     * Get all versions for a given workflow
     * @param {string} workflowId
     * @returns {Array<Object>}
     */
    getVersions(workflowId) {
      if (!workflowId) return [];
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      return (db.workflowVersions || [])
        .filter(v => v.workflowId === workflowId)
        .sort((a, b) => b.versionNumber - a.versionNumber);
    }

    /**
     * Create a new version for a workflow (Phase 9 Requirement 5)
     * To modify a published workflow, a new Draft version is created.
     * @param {string} workflowId
     * @returns {{ success: boolean, version?: Object, error?: string }}
     */
    createVersion(workflowId) {
      if (!workflowId) return { success: false, error: 'Workflow ID is required.' };
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.workflows = db.workflows || [];
      db.workflowVersions = db.workflowVersions || [];

      const workflow = db.workflows.find(w => w.id === workflowId);
      if (!workflow) return { success: false, error: 'Workflow not found.' };

      // Find existing versions and compute next versionNumber
      const existingVersions = db.workflowVersions.filter(v => v.workflowId === workflowId);
      const maxVersionNumber = existingVersions.reduce(
        (max, v) => Math.max(max, v.versionNumber || 0),
        0
      );
      const nextVersionNumber = maxVersionNumber + 1;

      const generateId = (window.HRM && window.HRM.generateId)
        ? window.HRM.generateId
        : (prefix => `${prefix}_${Date.now()}`);

      const auth = window.HRM ? window.HRM.AuthService : null;
      const currentUser = auth ? auth.getCurrentUser() : null;
      const createdBy = currentUser ? currentUser.id : 'system';
      const now = new Date().toISOString();

      const newVersion = {
        id: generateId('wfv'),
        workflowId,
        versionNumber: nextVersionNumber,
        status: 'Draft',
        createdAt: now,
        createdBy
      };

      db.workflowVersions.push(newVersion);

      // Update workflow updatedAt
      const wfIndex = db.workflows.findIndex(w => w.id === workflowId);
      if (wfIndex !== -1) {
        db.workflows[wfIndex].updatedAt = now;
      }

      dbService.saveDatabase(db);
      console.info(`[WorkflowService] Created Version ${nextVersionNumber} (Draft) for workflow ${workflowId}.`);

      return { success: true, version: newVersion, workflow: this.getById(workflowId) };
    }

    /**
     * Publish a workflow version (Phase 9 Requirement 5)
     * Rule: Only ONE version can be the current Published version.
     * When this version is published, any previously Published version is automatically Archived.
     * @param {string} workflowId
     * @param {string} versionId
     * @returns {{ success: boolean, version?: Object, error?: string }}
     */
    publishVersion(workflowId, versionId) {
      if (!workflowId || !versionId) {
        return { success: false, error: 'Workflow ID and Version ID are required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.workflows = db.workflows || [];
      db.workflowVersions = db.workflowVersions || [];

      const targetVersionIndex = db.workflowVersions.findIndex(
        v => v.id === versionId && v.workflowId === workflowId
      );

      if (targetVersionIndex === -1) {
        return { success: false, error: 'Version not found for this workflow.' };
      }

      // Phase 10 Requirement 4: Pre-Publish Step Validation
      if (window.HRM && window.HRM.WorkflowStepService) {
        const validation = window.HRM.WorkflowStepService.validateVersionSteps(versionId);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.errors.join(' ')
          };
        }
      }

      const now = new Date().toISOString();

      // Rule: Archive any currently Published versions for this workflow
      db.workflowVersions = db.workflowVersions.map(v => {
        if (v.workflowId === workflowId && v.status === 'Published' && v.id !== versionId) {
          return {
            ...v,
            status: 'Archived',
            archivedAt: now
          };
        }
        return v;
      });

      // Mark target version as Published
      db.workflowVersions[targetVersionIndex] = {
        ...db.workflowVersions[targetVersionIndex],
        status: 'Published',
        publishedAt: now
      };

      // Update parent workflow updatedAt
      const wfIndex = db.workflows.findIndex(w => w.id === workflowId);
      if (wfIndex !== -1) {
        db.workflows[wfIndex].updatedAt = now;
      }

      dbService.saveDatabase(db);
      console.info(`[WorkflowService] Published Version ${db.workflowVersions[targetVersionIndex].versionNumber} for workflow ${workflowId}.`);

      if (window.HRM && window.HRM.AuditService) {
        const publishedVer = db.workflowVersions[targetVersionIndex];
        const wf = db.workflows.find(w => w.id === workflowId);
        window.HRM.AuditService.log({
          action: 'Workflow published',
          entityType: 'ApprovalWorkflow',
          entityId: workflowId,
          description: `Published version v${publishedVer.versionNumber} of workflow "${wf ? wf.name : workflowId}".`,
          metadata: { workflowId, versionId, versionNumber: publishedVer.versionNumber }
        });
      }

      return {
        success: true,
        version: db.workflowVersions[targetVersionIndex],
        workflow: this.getById(workflowId)
      };
    }

    /**
     * Archive a workflow version
     * @param {string} workflowId
     * @param {string} versionId
     * @returns {{ success: boolean, error?: string }}
     */
    archiveVersion(workflowId, versionId) {
      if (!workflowId || !versionId) {
        return { success: false, error: 'Workflow ID and Version ID are required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const index = (db.workflowVersions || []).findIndex(
        v => v.id === versionId && v.workflowId === workflowId
      );

      if (index === -1) return { success: false, error: 'Version not found.' };

      db.workflowVersions[index] = {
        ...db.workflowVersions[index],
        status: 'Archived',
        archivedAt: new Date().toISOString()
      };

      dbService.saveDatabase(db);
      return { success: true };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.WorkflowService = new WorkflowService();
  window.WorkflowService = window.HRM.WorkflowService;
})();
