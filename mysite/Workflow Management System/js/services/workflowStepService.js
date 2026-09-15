/**
 * ==================================================
 * WORKFLOW STEP SERVICE
 * Manages Approval Workflow Steps, Approver Types, Ordering & Immutability
 * Backed by DatabaseService (hrm_database.workflowSteps)
 * ==================================================
 */

(function () {
  'use strict';

  const ALLOWED_APPROVER_TYPES = Object.freeze([
    'Manager',
    'DepartmentHead',
    'HR',
    'SpecificEmployee',
    'Role'
  ]);

  class WorkflowStepService {
    /**
     * Get all supported approver types
     * @returns {Array<string>}
     */
    getApproverTypes() {
      return [...ALLOWED_APPROVER_TYPES];
    }

    /**
     * Get all steps for a specific workflow version, ordered by stepOrder ascending
     * @param {string} workflowVersionId
     * @returns {Array<Object>}
     */
    getStepsForVersion(workflowVersionId) {
      if (!workflowVersionId) return [];
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const steps = (db.workflowSteps || [])
        .filter(s => s.workflowVersionId === workflowVersionId)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));

      // Enrich steps with resolved employee / role names
      const users = db.users || [];
      const roles = db.roles || [];
      const userMap = new Map(users.map(u => [u.id, u]));
      const roleMap = new Map(roles.map(r => [r.id, r]));

      return steps.map(s => {
        let approverLabel = s.approverType;
        if (s.approverType === 'SpecificEmployee' && s.approverValue) {
          const user = userMap.get(s.approverValue);
          approverLabel = user ? `Employee: ${user.name} (${user.employeeCode})` : 'Employee (Unassigned)';
        } else if (s.approverType === 'Role' && s.approverValue) {
          const role = roleMap.get(s.approverValue);
          approverLabel = role ? `Role: ${role.name}` : 'Role (Unassigned)';
        }

        return {
          ...s,
          approverLabel
        };
      });
    }

    /**
     * Get step by ID
     * @param {string} id
     * @returns {Object|null}
     */
    getStepById(id) {
      if (!id) return null;
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return null;

      const db = dbService.getDatabase();
      return (db.workflowSteps || []).find(s => s.id === id) || null;
    }

    /**
     * Check if a workflow version is editable (must be in 'Draft' status)
     * Published and Archived versions are strictly immutable.
     * @param {string} workflowVersionId
     * @returns {{ editable: boolean, version?: Object, error?: string }}
     */
    isVersionEditable(workflowVersionId) {
      if (!workflowVersionId) return { editable: false, error: 'Version ID is required.' };
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { editable: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const version = (db.workflowVersions || []).find(v => v.id === workflowVersionId);
      if (!version) return { editable: false, error: 'Workflow version not found.' };

      if (version.status === 'Published') {
        return {
          editable: false,
          version,
          error: `Version ${version.versionNumber} is Published and cannot be modified. Create a new draft version to alter workflow steps.`
        };
      }

      if (version.status === 'Archived') {
        return {
          editable: false,
          version,
          error: `Version ${version.versionNumber} is Archived and immutable.`
        };
      }

      return { editable: true, version };
    }

    /**
     * Create an approval workflow step
     * @param {string} workflowVersionId
     * @param {Object} data
     * @param {string} data.name
     * @param {string} data.approverType
     * @param {string} [data.approverValue]
     * @param {boolean} [data.isRequired=true]
     * @param {number} [data.minApprovals=1]
     * @param {boolean} [data.allowReject=true]
     * @param {boolean} [data.allowDelegate=false]
     * @returns {{ success: boolean, step?: Object, error?: string }}
     */
    createStep(workflowVersionId, data) {
      // 1. Immutability Check: parent version must be editable (Draft)
      const editCheck = this.isVersionEditable(workflowVersionId);
      if (!editCheck.editable) {
        return { success: false, error: editCheck.error };
      }

      const {
        name,
        approverType,
        approverValue = null,
        isRequired = true,
        minApprovals = 1,
        allowReject = true,
        allowDelegate = false
      } = data || {};

      // 2. Validation: Name required
      if (!name || !name.trim()) {
        return { success: false, error: 'Step Name is required.' };
      }

      // 3. Validation: Approver Type valid
      if (!approverType || !ALLOWED_APPROVER_TYPES.includes(approverType)) {
        return {
          success: false,
          error: `Invalid Approver Type. Must be one of: ${ALLOWED_APPROVER_TYPES.join(', ')}.`
        };
      }

      const dbService = window.HRM.DatabaseService;
      const db = dbService.getDatabase();
      db.workflowSteps = db.workflowSteps || [];

      // 4. Validation: Approver target if SpecificEmployee or Role
      if (approverType === 'SpecificEmployee') {
        if (!approverValue) {
          return { success: false, error: 'Please select a specific employee for this step.' };
        }
        const userExists = (db.users || []).some(u => u.id === approverValue);
        if (!userExists) {
          return { success: false, error: 'The selected employee does not exist.' };
        }
      } else if (approverType === 'Role') {
        if (!approverValue) {
          return { success: false, error: 'Please select a role for this step.' };
        }
        const roleExists = (db.roles || []).some(r => r.id === approverValue);
        if (!roleExists) {
          return { success: false, error: 'The selected role does not exist.' };
        }
      }

      // 5. Determine next stepOrder
      const existingSteps = db.workflowSteps.filter(s => s.workflowVersionId === workflowVersionId);
      const maxOrder = existingSteps.reduce((max, s) => Math.max(max, s.stepOrder || 0), 0);
      const stepOrder = maxOrder + 1;

      const generateId = (window.HRM && window.HRM.generateId)
        ? window.HRM.generateId
        : (prefix => `${prefix}_${Date.now()}`);

      const newStep = {
        id: generateId('wfs'),
        workflowVersionId,
        stepOrder,
        name: name.trim(),
        approverType,
        approverValue: (approverType === 'SpecificEmployee' || approverType === 'Role') ? approverValue : null,
        isRequired: Boolean(isRequired),
        minApprovals: Math.max(1, parseInt(minApprovals, 10) || 1),
        allowReject: allowReject !== undefined ? Boolean(allowReject) : true,
        allowDelegate: allowDelegate !== undefined ? Boolean(allowDelegate) : false,
        createdAt: new Date().toISOString()
      };

      db.workflowSteps.push(newStep);
      dbService.saveDatabase(db);

      console.info(`[WorkflowStepService] Added Step ${stepOrder} "${newStep.name}" to version ${workflowVersionId}.`);

      return { success: true, step: newStep };
    }

    /**
     * Update an existing step
     * @param {string} stepId
     * @param {Object} data
     * @returns {{ success: boolean, step?: Object, error?: string }}
     */
    updateStep(stepId, data) {
      if (!stepId) return { success: false, error: 'Step ID is required.' };
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.workflowSteps = db.workflowSteps || [];

      const stepIndex = db.workflowSteps.findIndex(s => s.id === stepId);
      if (stepIndex === -1) return { success: false, error: 'Step not found.' };

      const existingStep = db.workflowSteps[stepIndex];

      // Immutability Check: parent version must be editable (Draft)
      const editCheck = this.isVersionEditable(existingStep.workflowVersionId);
      if (!editCheck.editable) {
        return { success: false, error: editCheck.error };
      }

      const {
        name,
        approverType,
        approverValue,
        isRequired,
        minApprovals,
        allowReject,
        allowDelegate
      } = data || {};

      if (name !== undefined && !name.trim()) {
        return { success: false, error: 'Step Name cannot be empty.' };
      }

      const cleanApproverType = approverType || existingStep.approverType;
      if (!ALLOWED_APPROVER_TYPES.includes(cleanApproverType)) {
        return { success: false, error: `Invalid Approver Type ${cleanApproverType}.` };
      }

      let cleanApproverValue = approverValue !== undefined ? approverValue : existingStep.approverValue;
      if (cleanApproverType === 'SpecificEmployee') {
        if (!cleanApproverValue) {
          return { success: false, error: 'Please select a specific employee.' };
        }
        const userExists = (db.users || []).some(u => u.id === cleanApproverValue);
        if (!userExists) {
          return { success: false, error: 'The selected employee does not exist.' };
        }
      } else if (cleanApproverType === 'Role') {
        if (!cleanApproverValue) {
          return { success: false, error: 'Please select a role.' };
        }
        const roleExists = (db.roles || []).some(r => r.id === cleanApproverValue);
        if (!roleExists) {
          return { success: false, error: 'The selected role does not exist.' };
        }
      } else {
        cleanApproverValue = null;
      }

      db.workflowSteps[stepIndex] = {
        ...existingStep,
        name: name !== undefined ? name.trim() : existingStep.name,
        approverType: cleanApproverType,
        approverValue: cleanApproverValue,
        isRequired: isRequired !== undefined ? Boolean(isRequired) : existingStep.isRequired,
        minApprovals: minApprovals !== undefined ? Math.max(1, parseInt(minApprovals, 10) || 1) : existingStep.minApprovals,
        allowReject: allowReject !== undefined ? Boolean(allowReject) : existingStep.allowReject,
        allowDelegate: allowDelegate !== undefined ? Boolean(allowDelegate) : existingStep.allowDelegate,
        updatedAt: new Date().toISOString()
      };

      dbService.saveDatabase(db);
      console.info(`[WorkflowStepService] Updated step ${stepId}.`);

      return { success: true, step: db.workflowSteps[stepIndex] };
    }

    /**
     * Delete a step and re-sequence remaining steps
     * @param {string} stepId
     * @returns {{ success: boolean, error?: string }}
     */
    deleteStep(stepId) {
      if (!stepId) return { success: false, error: 'Step ID is required.' };
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.workflowSteps = db.workflowSteps || [];

      const step = db.workflowSteps.find(s => s.id === stepId);
      if (!step) return { success: false, error: 'Step not found.' };

      // Immutability Check: parent version must be editable (Draft)
      const editCheck = this.isVersionEditable(step.workflowVersionId);
      if (!editCheck.editable) {
        return { success: false, error: editCheck.error };
      }

      const versionId = step.workflowVersionId;

      // Remove target step
      db.workflowSteps = db.workflowSteps.filter(s => s.id !== stepId);

      // Re-sequence remaining steps for this version (1..N)
      const remaining = db.workflowSteps
        .filter(s => s.workflowVersionId === versionId)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));

      remaining.forEach((s, idx) => {
        s.stepOrder = idx + 1;
      });

      dbService.saveDatabase(db);
      console.info(`[WorkflowStepService] Deleted step ${stepId} and re-sequenced remaining ${remaining.length} steps.`);

      return { success: true };
    }

    /**
     * Reorder steps for a version by array of step IDs
     * @param {string} workflowVersionId
     * @param {Array<string>} stepIdsInOrder
     * @returns {{ success: boolean, steps?: Array<Object>, error?: string }}
     */
    reorderSteps(workflowVersionId, stepIdsInOrder = []) {
      if (!workflowVersionId) return { success: false, error: 'Version ID is required.' };
      const editCheck = this.isVersionEditable(workflowVersionId);
      if (!editCheck.editable) {
        return { success: false, error: editCheck.error };
      }

      const dbService = window.HRM.DatabaseService;
      const db = dbService.getDatabase();
      db.workflowSteps = db.workflowSteps || [];

      const stepMap = new Map(
        db.workflowSteps.filter(s => s.workflowVersionId === workflowVersionId).map(s => [s.id, s])
      );

      stepIdsInOrder.forEach((id, index) => {
        const step = stepMap.get(id);
        if (step) {
          step.stepOrder = index + 1;
        }
      });

      dbService.saveDatabase(db);
      console.info(`[WorkflowStepService] Reordered ${stepIdsInOrder.length} steps for version ${workflowVersionId}.`);

      return { success: true, steps: this.getStepsForVersion(workflowVersionId) };
    }

    /**
     * Validate all steps of a workflow version prior to publishing (Phase 10 Requirement 4)
     * Rules:
     * - Must have at least 1 step.
     * - Valid approver configuration.
     * - If SpecificEmployee, employee must exist.
     * - If Role, role must exist.
     * - No duplicate or missing step orders.
     * @param {string} workflowVersionId
     * @returns {{ valid: boolean, errors: Array<string> }}
     */
    validateVersionSteps(workflowVersionId) {
      const errors = [];
      if (!workflowVersionId) {
        return { valid: false, errors: ['Workflow version ID is missing.'] };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) {
        return { valid: false, errors: ['Database service unavailable.'] };
      }

      const db = dbService.getDatabase();
      const steps = (db.workflowSteps || [])
        .filter(s => s.workflowVersionId === workflowVersionId)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));

      // Rule 1: Cannot publish if no steps
      if (steps.length === 0) {
        errors.push('Cannot publish workflow version: At least one approval step is required.');
        return { valid: false, errors };
      }

      const seenOrders = new Set();
      const users = db.users || [];
      const roles = db.roles || [];

      steps.forEach((step, idx) => {
        const stepNum = idx + 1;

        // Rule 2: Duplicate step order
        if (seenOrders.has(step.stepOrder)) {
          errors.push(`Step ${stepNum} ("${step.name}") has duplicate order ${step.stepOrder}.`);
        }
        seenOrders.add(step.stepOrder);

        // Rule 3: Valid approver type
        if (!ALLOWED_APPROVER_TYPES.includes(step.approverType)) {
          errors.push(`Step ${stepNum} ("${step.name}") has invalid approver type "${step.approverType}".`);
        }

        // Rule 4: Valid SpecificEmployee
        if (step.approverType === 'SpecificEmployee') {
          if (!step.approverValue) {
            errors.push(`Step ${stepNum} ("${step.name}") requires a designated employee.`);
          } else {
            const userExists = users.some(u => u.id === step.approverValue);
            if (!userExists) {
              errors.push(`Step ${stepNum} designates an employee that does not exist in the user directory.`);
            }
          }
        }

        // Rule 5: Valid Role
        if (step.approverType === 'Role') {
          if (!step.approverValue) {
            errors.push(`Step ${stepNum} ("${step.name}") requires an assigned role.`);
          } else {
            const roleExists = roles.some(r => r.id === step.approverValue);
            if (!roleExists) {
              errors.push(`Step ${stepNum} designates a role that does not exist.`);
            }
          }
        }

        // Rule 6: minApprovals >= 1
        if (!step.minApprovals || step.minApprovals < 1) {
          errors.push(`Step ${stepNum} ("${step.name}") must require at least 1 approval.`);
        }
      });

      return {
        valid: errors.length === 0,
        errors
      };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.WorkflowStepService = new WorkflowStepService();
  window.WorkflowStepService = window.HRM.WorkflowStepService;
})();
