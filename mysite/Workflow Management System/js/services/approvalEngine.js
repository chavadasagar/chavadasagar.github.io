/**
 * ==================================================
 * APPROVAL ENGINE (PHASE 11)
 * Generic Multi-Stage Approval Engine
 * Entity-Agnostic: works via entityType, entityId, workflowId, workflowVersionId
 * Backed by DatabaseService (hrm_database: approvalRequests, approvalRequestSteps, approvalActions)
 * ==================================================
 */

(function () {
  'use strict';

  const REQUEST_STATUS = Object.freeze({
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled'
  });

  const STEP_STATUS = Object.freeze({
    WAITING: 'Waiting',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    SKIPPED: 'Skipped'
  });

  const ACTION_TYPE = Object.freeze({
    APPROVE: 'Approve',
    REJECT: 'Reject',
    DELEGATE: 'Delegate',
    SUBMIT: 'Submit',
    CANCEL: 'Cancel'
  });

  class ApprovalEngine {
    constructor() {
      this.REQUEST_STATUS = REQUEST_STATUS;
      this.STEP_STATUS = STEP_STATUS;
      this.ACTION_TYPE = ACTION_TYPE;
    }

    _getGenerateId() {
      if (window.HRM && typeof window.HRM.generateId === 'function') {
        return window.HRM.generateId;
      }
      return (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Resolve actual approvers for a given workflow step based on approverType
     * Supported: Manager, DepartmentHead, HR, SpecificEmployee, Role
     * @param {Object} workflowStep
     * @param {string} requestedByEmployeeId
     * @param {Object} [db]
     * @returns {Array<string>} Array of employee/user IDs
     */
    resolveApprovers(workflowStep, requestedByEmployeeId, db = null) {
      if (!workflowStep) return [];
      if (!db) {
        db = window.HRM ? window.HRM.DatabaseService.getDatabase() : { users: [], roles: [], userRoles: [], departments: [] };
      }

      const users = db.users || [];
      const roles = db.roles || [];
      const userRoles = db.userRoles || [];
      const departments = db.departments || [];

      const activeUsers = users.filter(u => (u.status || '').toLowerCase() === 'active');
      const activeUserIds = new Set(activeUsers.map(u => u.id));

      const requester = users.find(u => u.id === requestedByEmployeeId);
      const approverType = workflowStep.approverType;
      const approverValue = workflowStep.approverValue;

      const resolved = new Set();

      switch (approverType) {
        case 'Manager': {
          // 1. Direct manager from requester record
          if (requester && requester.managerId && activeUserIds.has(requester.managerId)) {
            resolved.add(requester.managerId);
          } else {
            // Fallback: find active users with MANAGER role
            const mgrRole = roles.find(r => (r.code || '').toUpperCase() === 'MANAGER');
            if (mgrRole) {
              userRoles
                .filter(ur => ur.roleId === mgrRole.id && activeUserIds.has(ur.userId))
                .forEach(ur => resolved.add(ur.userId));
            }
          }
          break;
        }

        case 'DepartmentHead': {
          // 1. Department head from requester's department
          let headFound = false;
          if (requester && requester.departmentId) {
            const dept = departments.find(d => d.id === requester.departmentId);
            if (dept && dept.headEmployeeId && activeUserIds.has(dept.headEmployeeId)) {
              resolved.add(dept.headEmployeeId);
              headFound = true;
            }
          }
          if (!headFound) {
            // Fallback: find user with DEPT_HEAD role or MANAGER role
            const deptHeadRole = roles.find(r => ['DEPT_HEAD', 'DEPARTMENT_HEAD'].includes((r.code || '').toUpperCase()));
            if (deptHeadRole) {
              userRoles
                .filter(ur => ur.roleId === deptHeadRole.id && activeUserIds.has(ur.userId))
                .forEach(ur => resolved.add(ur.userId));
            } else {
              const mgrRole = roles.find(r => (r.code || '').toUpperCase() === 'MANAGER');
              if (mgrRole) {
                userRoles
                  .filter(ur => ur.roleId === mgrRole.id && activeUserIds.has(ur.userId))
                  .forEach(ur => resolved.add(ur.userId));
              }
            }
          }
          break;
        }

        case 'HR': {
          // Resolve all active HR employees (role HR_ADMIN or HR)
          const hrRoles = roles.filter(r => ['HR_ADMIN', 'HR'].includes((r.code || '').toUpperCase()));
          const hrRoleIds = new Set(hrRoles.map(r => r.id));
          userRoles
            .filter(ur => hrRoleIds.has(ur.roleId) && activeUserIds.has(ur.userId))
            .forEach(ur => resolved.add(ur.userId));
          break;
        }

        case 'SpecificEmployee': {
          if (approverValue && activeUserIds.has(approverValue)) {
            resolved.add(approverValue);
          }
          break;
        }

        case 'Role': {
          if (approverValue) {
            // Match role by ID or by code
            const targetRole = roles.find(r => r.id === approverValue || (r.code || '').toUpperCase() === approverValue.toUpperCase());
            if (targetRole) {
              userRoles
                .filter(ur => ur.roleId === targetRole.id && activeUserIds.has(ur.userId))
                .forEach(ur => resolved.add(ur.userId));
            }
          }
          break;
        }

        default:
          console.warn(`[ApprovalEngine] Unknown approverType "${approverType}".`);
      }

      return Array.from(resolved);
    }

    /**
     * Submit an Approval Request for an entity
     * SNAPSHOT RULE: Approvers are resolved at submission time and persisted in ApprovalRequestStep.approverEmployeeIds
     * @param {Object} params
     * @param {string} params.entityType - e.g. "TestRequest", "Leave", "Expense"
     * @param {string|number} params.entityId - Primary key of the domain record
     * @param {string} params.requestedBy - ID of the employee making the request
     * @param {string} [params.workflowId] - Optional explicit workflow ID
     * @param {string} [params.workflowVersionId] - Optional explicit workflow version ID
     * @returns {{ success: boolean, request?: Object, steps?: Array<Object>, error?: string }}
     */
    submitRequest(params = {}) {
      const { entityType, entityId, requestedBy, workflowId, workflowVersionId } = params;

      if (!entityType) return { success: false, error: 'Entity Type is required.' };
      if (!entityId) return { success: false, error: 'Entity ID is required.' };
      if (!requestedBy) return { success: false, error: 'Requester ID (requestedBy) is required.' };

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.approvalRequests = db.approvalRequests || [];
      db.approvalRequestSteps = db.approvalRequestSteps || [];
      db.approvalActions = db.approvalActions || [];

      // 1. Resolve Target Workflow
      let targetWf = null;
      if (workflowId) {
        targetWf = (db.workflows || []).find(w => w.id === workflowId);
      } else {
        // Find active workflow matching entityType
        targetWf = (db.workflows || []).find(w => w.entityType === entityType && w.isActive);
      }

      if (!targetWf) {
        return {
          success: false,
          error: `No active Approval Workflow configured for entityType "${entityType}".`
        };
      }

      // 2. Resolve Workflow Version
      let targetVer = null;
      if (workflowVersionId) {
        targetVer = (db.workflowVersions || []).find(v => v.id === workflowVersionId);
      } else {
        // Find currently Published version for this workflow
        targetVer = (db.workflowVersions || []).find(v => v.workflowId === targetWf.id && v.status === 'Published');
      }

      if (!targetVer) {
        return {
          success: false,
          error: `No Published version found for workflow "${targetWf.name}" (${targetWf.code}). A published version with defined steps is required to submit approval requests.`
        };
      }

      // 3. Resolve Steps for Version
      const wfSteps = (db.workflowSteps || [])
        .filter(s => s.workflowVersionId === targetVer.id)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));

      if (wfSteps.length === 0) {
        return {
          success: false,
          error: `Workflow Version ${targetVer.versionNumber} contains zero steps. Cannot submit approval request.`
        };
      }

      const generateId = this._getGenerateId();
      const now = new Date().toISOString();
      const requestId = generateId('apr');

      // 4. Create Approval Request Steps (SNAPSHOT RULE)
      const requestSteps = [];
      wfSteps.forEach((ws, index) => {
        // SNAPSHOT: Resolve actual approvers NOW
        const resolvedApprovers = this.resolveApprovers(ws, requestedBy, db);

        const isFirstStep = index === 0;
        const stepRecord = {
          id: generateId('aprs'),
          approvalRequestId: requestId,
          workflowStepId: ws.id,
          stepOrder: ws.stepOrder || (index + 1),
          approverEmployeeIds: resolvedApprovers, // SNAPSHOT IMMUTABILITY
          status: isFirstStep ? STEP_STATUS.PENDING : STEP_STATUS.WAITING,
          startedAt: isFirstStep ? now : null,
          completedAt: null
        };
        requestSteps.push(stepRecord);
      });

      const firstStep = requestSteps[0];

      // 5. Create Approval Request
      const approvalRequest = {
        id: requestId,
        workflowId: targetWf.id,
        workflowVersionId: targetVer.id,
        entityType,
        entityId: String(entityId),
        requestedBy,
        currentStepId: firstStep.id,
        status: REQUEST_STATUS.PENDING,
        submittedAt: now,
        completedAt: null,
        createdAt: now,
        updatedAt: now
      };

      // 6. Record Initial Submit Action
      const submitAction = {
        id: generateId('act'),
        approvalRequestId: requestId,
        approvalRequestStepId: firstStep.id,
        workflowStepId: firstStep.workflowStepId,
        approverEmployeeId: requestedBy,
        action: ACTION_TYPE.SUBMIT,
        comments: 'Request submitted for approval.',
        actionAt: now
      };

      // Commit to database
      db.approvalRequests.push(approvalRequest);
      db.approvalRequestSteps.push(...requestSteps);
      db.approvalActions.push(submitAction);

      dbService.saveDatabase(db);

      console.info(`[ApprovalEngine] Request ${requestId} submitted for ${entityType} #${entityId} with ${requestSteps.length} step(s).`);

      // 7. Audit Log (Phase 14)
      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          userId: requestedBy,
          action: 'Request submitted',
          entityType: entityType,
          entityId: String(entityId),
          description: `Submitted ${entityType} request #${entityId} for approval.`,
          metadata: { approvalRequestId: requestId, workflowId: targetWf.id }
        });
      }

      // 8. Notifications (Phase 14)
      if (window.HRM && window.HRM.NotificationService) {
        // Notification to requester: Request submitted
        window.HRM.NotificationService.createNotification({
          employeeId: requestedBy,
          title: 'Request submitted',
          message: `Your ${entityType} request #${entityId} has been successfully submitted for approval.`,
          type: 'info',
          referenceType: entityType,
          referenceId: String(entityId)
        });

        // Notifications to initial step approvers: Approval required
        const approverIds = firstStep.approverEmployeeIds || [];
        const users = db.users || [];
        const requesterUser = users.find(u => u.id === requestedBy);
        const requesterName = requesterUser ? requesterUser.name : 'An employee';

        approverIds.forEach(approverId => {
          window.HRM.NotificationService.createNotification({
            employeeId: approverId,
            title: 'Approval required',
            message: `${requesterName} submitted a ${entityType} request requiring your review.`,
            type: 'warning',
            referenceType: 'ApprovalRequest',
            referenceId: requestId
          });
        });
      }

      return {
        success: true,
        request: approvalRequest,
        steps: requestSteps
      };
    }

    /**
     * Approve the current pending step
     * @param {string} approvalRequestId
     * @param {string} approverEmployeeId
     * @param {string} [comments='']
     * @returns {{ success: boolean, request?: Object, step?: Object, action?: Object, error?: string }}
     */
    approve(approvalRequestId, approverEmployeeId, comments = '') {
      if (!approvalRequestId) return { success: false, error: 'Approval Request ID is required.' };
      if (!approverEmployeeId) return { success: false, error: 'Approver Employee ID is required.' };

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const request = (db.approvalRequests || []).find(r => r.id === approvalRequestId);
      if (!request) return { success: false, error: 'Approval request not found.' };

      // State Machine: Request must be Pending
      if (request.status !== REQUEST_STATUS.PENDING) {
        return {
          success: false,
          error: `Cannot approve request: request is already ${request.status}.`
        };
      }

      // Find current step
      const steps = (db.approvalRequestSteps || [])
        .filter(s => s.approvalRequestId === approvalRequestId)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));

      const currentStep = steps.find(s => s.id === request.currentStepId) || steps.find(s => s.status === STEP_STATUS.PENDING);
      if (!currentStep) {
        return { success: false, error: 'No active pending step found for this approval request.' };
      }

      if (currentStep.status !== STEP_STATUS.PENDING) {
        return {
          success: false,
          error: `Cannot approve step: current step status is ${currentStep.status}.`
        };
      }

      // Rule: Requester cannot approve their own request
      if (approverEmployeeId === request.requestedBy) {
        return {
          success: false,
          error: 'Requester cannot approve their own request.'
        };
      }

      // Rule: Current approver check (must be in approverEmployeeIds)
      const allowedApprovers = currentStep.approverEmployeeIds || [];
      if (!allowedApprovers.includes(approverEmployeeId)) {
        return {
          success: false,
          error: 'User is not an authorized approver for this step.'
        };
      }

      const generateId = this._getGenerateId();
      const now = new Date().toISOString();

      // 1. Mark current step as Approved
      currentStep.status = STEP_STATUS.APPROVED;
      currentStep.completedAt = now;

      // 2. Record Approval Action
      const actionRecord = {
        id: generateId('act'),
        approvalRequestId: request.id,
        approvalRequestStepId: currentStep.id,
        workflowStepId: currentStep.workflowStepId,
        approverEmployeeId,
        action: ACTION_TYPE.APPROVE,
        comments: comments || 'Approved',
        actionAt: now
      };
      db.approvalActions = db.approvalActions || [];
      db.approvalActions.push(actionRecord);

      // 3. Check for Next Step
      const nextStep = steps.find(s => s.stepOrder > currentStep.stepOrder && s.status === STEP_STATUS.WAITING);

      if (nextStep) {
        // Activate next step
        nextStep.status = STEP_STATUS.PENDING;
        nextStep.startedAt = now;
        request.currentStepId = nextStep.id;
        request.updatedAt = now;
        console.info(`[ApprovalEngine] Step ${currentStep.stepOrder} Approved. Activated Step ${nextStep.stepOrder} (${nextStep.id}).`);
      } else {
        // All steps completed -> Request is Approved!
        request.status = REQUEST_STATUS.APPROVED;
        request.completedAt = now;
        request.currentStepId = null;
        request.updatedAt = now;
        console.info(`[ApprovalEngine] Final step approved. Request ${request.id} is now APPROVED.`);
      }

      dbService.saveDatabase(db);

      // Audit Log (Phase 14)
      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          userId: approverEmployeeId,
          action: 'Approval approved',
          entityType: request.entityType,
          entityId: request.entityId,
          description: `Approved step ${currentStep.stepOrder} for ${request.entityType} request #${request.entityId}. ${comments ? 'Comments: ' + comments : ''}`.trim(),
          metadata: { approvalRequestId: request.id, stepId: currentStep.id, isFinal: !nextStep }
        });
      }

      // Notifications (Phase 14)
      if (window.HRM && window.HRM.NotificationService) {
        const users = db.users || [];
        const approverUser = users.find(u => u.id === approverEmployeeId);
        const approverName = approverUser ? approverUser.name : 'Approver';
        const requesterUser = users.find(u => u.id === request.requestedBy);
        const requesterName = requesterUser ? requesterUser.name : 'Requester';

        if (nextStep) {
          // Notify requester: Approved step
          window.HRM.NotificationService.createNotification({
            employeeId: request.requestedBy,
            title: 'Approved',
            message: `Step ${currentStep.stepOrder} of your ${request.entityType} request #${request.entityId} was approved by ${approverName}.`,
            type: 'info',
            referenceType: 'ApprovalRequest',
            referenceId: request.id
          });

          // Notify next step approvers: Approval required
          const nextApproverIds = nextStep.approverEmployeeIds || [];
          nextApproverIds.forEach(id => {
            window.HRM.NotificationService.createNotification({
              employeeId: id,
              title: 'Approval required',
              message: `${requesterName}'s ${request.entityType} request #${request.entityId} is awaiting your approval.`,
              type: 'warning',
              referenceType: 'ApprovalRequest',
              referenceId: request.id
            });
          });
        } else {
          // Final approval completed!
          window.HRM.NotificationService.createNotification({
            employeeId: request.requestedBy,
            title: 'Final approval completed',
            message: `Your ${request.entityType} request #${request.entityId} has received final approval and is now Approved!`,
            type: 'success',
            referenceType: 'ApprovalRequest',
            referenceId: request.id
          });
        }
      }

      return {
        success: true,
        request,
        step: currentStep,
        action: actionRecord
      };
    }

    /**
     * Reject the current pending step and the entire request
     * Cascading: all future steps are marked as Skipped
     * @param {string} approvalRequestId
     * @param {string} approverEmployeeId
     * @param {string} [comments='']
     * @returns {{ success: boolean, request?: Object, step?: Object, action?: Object, error?: string }}
     */
    reject(approvalRequestId, approverEmployeeId, comments = '') {
      if (!approvalRequestId) return { success: false, error: 'Approval Request ID is required.' };
      if (!approverEmployeeId) return { success: false, error: 'Approver Employee ID is required.' };

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const request = (db.approvalRequests || []).find(r => r.id === approvalRequestId);
      if (!request) return { success: false, error: 'Approval request not found.' };

      // State Machine: Request must be Pending
      if (request.status !== REQUEST_STATUS.PENDING) {
        return {
          success: false,
          error: `Cannot reject request: request is already ${request.status}.`
        };
      }

      // Find current step
      const steps = (db.approvalRequestSteps || [])
        .filter(s => s.approvalRequestId === approvalRequestId)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));

      const currentStep = steps.find(s => s.id === request.currentStepId) || steps.find(s => s.status === STEP_STATUS.PENDING);
      if (!currentStep) {
        return { success: false, error: 'No active pending step found for this approval request.' };
      }

      if (currentStep.status !== STEP_STATUS.PENDING) {
        return {
          success: false,
          error: `Cannot reject step: current step status is ${currentStep.status}.`
        };
      }

      // Rule: Requester cannot reject as an approver
      if (approverEmployeeId === request.requestedBy) {
        return {
          success: false,
          error: 'Requester cannot reject as an approver.'
        };
      }

      // Rule: Current approver check
      const allowedApprovers = currentStep.approverEmployeeIds || [];
      if (!allowedApprovers.includes(approverEmployeeId)) {
        return {
          success: false,
          error: 'User is not an authorized approver for this step.'
        };
      }

      const generateId = this._getGenerateId();
      const now = new Date().toISOString();

      // 1. Mark current step as Rejected
      currentStep.status = STEP_STATUS.REJECTED;
      currentStep.completedAt = now;

      // 2. Record Rejection Action
      const actionRecord = {
        id: generateId('act'),
        approvalRequestId: request.id,
        approvalRequestStepId: currentStep.id,
        workflowStepId: currentStep.workflowStepId,
        approverEmployeeId,
        action: ACTION_TYPE.REJECT,
        comments: comments || 'Rejected',
        actionAt: now
      };
      db.approvalActions = db.approvalActions || [];
      db.approvalActions.push(actionRecord);

      // 3. Mark all future steps as Skipped
      steps.forEach(s => {
        if (s.stepOrder > currentStep.stepOrder && s.status === STEP_STATUS.WAITING) {
          s.status = STEP_STATUS.SKIPPED;
          s.completedAt = now;
        }
      });

      // 4. Request becomes Rejected
      request.status = REQUEST_STATUS.REJECTED;
      request.completedAt = now;
      request.currentStepId = null;
      request.updatedAt = now;

      dbService.saveDatabase(db);
      console.info(`[ApprovalEngine] Step ${currentStep.stepOrder} Rejected. Request ${request.id} is now REJECTED.`);

      // Audit Log (Phase 14)
      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          userId: approverEmployeeId,
          action: 'Approval rejected',
          entityType: request.entityType,
          entityId: request.entityId,
          description: `Rejected ${request.entityType} request #${request.entityId}. Comments: ${comments || 'None'}`,
          metadata: { approvalRequestId: request.id, stepId: currentStep.id, comments }
        });
      }

      // Notification (Phase 14)
      if (window.HRM && window.HRM.NotificationService) {
        const users = db.users || [];
        const approverUser = users.find(u => u.id === approverEmployeeId);
        const approverName = approverUser ? approverUser.name : 'Approver';

        window.HRM.NotificationService.createNotification({
          employeeId: request.requestedBy,
          title: 'Rejected',
          message: `Your ${request.entityType} request #${request.entityId} was rejected by ${approverName}. Reason: ${comments || 'No comment provided'}.`,
          type: 'danger',
          referenceType: 'ApprovalRequest',
          referenceId: request.id
        });
      }

      return {
        success: true,
        request,
        step: currentStep,
        action: actionRecord
      };
    }

    /**
     * Delegate step authority to another employee
     * @param {string} approvalRequestId
     * @param {string} approverEmployeeId
     * @param {string} targetEmployeeId
     * @param {string} [comments='']
     * @returns {{ success: boolean, request?: Object, step?: Object, action?: Object, error?: string }}
     */
    delegate(approvalRequestId, approverEmployeeId, targetEmployeeId, comments = '') {
      if (!approvalRequestId) return { success: false, error: 'Approval Request ID is required.' };
      if (!approverEmployeeId) return { success: false, error: 'Current approver ID is required.' };
      if (!targetEmployeeId) return { success: false, error: 'Target delegate employee ID is required.' };

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const request = (db.approvalRequests || []).find(r => r.id === approvalRequestId);
      if (!request || request.status !== REQUEST_STATUS.PENDING) {
        return { success: false, error: 'Active pending approval request not found.' };
      }

      const steps = (db.approvalRequestSteps || []).filter(s => s.approvalRequestId === approvalRequestId);
      const currentStep = steps.find(s => s.id === request.currentStepId);
      if (!currentStep || currentStep.status !== STEP_STATUS.PENDING) {
        return { success: false, error: 'Active pending step not found.' };
      }

      // Check current approver authority
      if (!(currentStep.approverEmployeeIds || []).includes(approverEmployeeId)) {
        return { success: false, error: 'User is not an authorized approver for this step.' };
      }

      // Check target employee
      if (targetEmployeeId === request.requestedBy) {
        return { success: false, error: 'Cannot delegate approval authority to the request submitter.' };
      }

      const targetUser = (db.users || []).find(u => u.id === targetEmployeeId);
      if (!targetUser || (targetUser.status || '').toLowerCase() !== 'active') {
        return { success: false, error: 'Target employee is invalid or inactive.' };
      }

      // Add target to step approvers if not already present
      if (!currentStep.approverEmployeeIds.includes(targetEmployeeId)) {
        currentStep.approverEmployeeIds.push(targetEmployeeId);
      }

      const generateId = this._getGenerateId();
      const now = new Date().toISOString();

      const actionRecord = {
        id: generateId('act'),
        approvalRequestId: request.id,
        approvalRequestStepId: currentStep.id,
        workflowStepId: currentStep.workflowStepId,
        approverEmployeeId,
        action: ACTION_TYPE.DELEGATE,
        comments: `Delegated to ${targetUser.name} (${targetUser.employeeCode}). ${comments}`.trim(),
        actionAt: now
      };
      db.approvalActions = db.approvalActions || [];
      db.approvalActions.push(actionRecord);

      request.updatedAt = now;
      dbService.saveDatabase(db);

      console.info(`[ApprovalEngine] Step ${currentStep.stepOrder} delegated by ${approverEmployeeId} to ${targetEmployeeId}.`);

      // Audit Log (Phase 14)
      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          userId: approverEmployeeId,
          action: 'Approval delegated',
          entityType: request.entityType,
          entityId: request.entityId,
          description: `Delegated approval authority for ${request.entityType} request #${request.entityId} to ${targetUser.name}.`,
          metadata: { approvalRequestId: request.id, targetUserId: targetEmployeeId, comments }
        });
      }

      // Notification (Phase 14)
      if (window.HRM && window.HRM.NotificationService) {
        const users = db.users || [];
        const delegatorUser = users.find(u => u.id === approverEmployeeId);
        const delegatorName = delegatorUser ? delegatorUser.name : 'An approver';
        const requesterUser = users.find(u => u.id === request.requestedBy);
        const requesterName = requesterUser ? requesterUser.name : 'Requester';

        window.HRM.NotificationService.createNotification({
          employeeId: targetEmployeeId,
          title: 'Delegated',
          message: `${delegatorName} delegated approval for ${requesterName}'s ${request.entityType} request to you. Reason: ${comments || 'Delegated'}.`,
          type: 'warning',
          referenceType: 'ApprovalRequest',
          referenceId: request.id
        });
      }

      return {
        success: true,
        request,
        step: currentStep,
        action: actionRecord
      };
    }

    /**
     * Get all pending approval requests waiting on a specific employee
     * @param {string} employeeId
     * @returns {Array<Object>} Enriched pending approval requests
     */
    getPendingApprovals(employeeId) {
      if (!employeeId) return [];
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const requests = db.approvalRequests || [];
      const steps = db.approvalRequestSteps || [];
      const users = db.users || [];
      const workflows = db.workflows || [];

      const userMap = new Map(users.map(u => [u.id, u]));
      const wfMap = new Map(workflows.map(w => [w.id, w]));

      const pending = [];

      requests.forEach(req => {
        if (req.status !== REQUEST_STATUS.PENDING) return;

        const currentStep = steps.find(s => s.id === req.currentStepId);
        if (!currentStep || currentStep.status !== STEP_STATUS.PENDING) return;

        if ((currentStep.approverEmployeeIds || []).includes(employeeId)) {
          const requester = userMap.get(req.requestedBy);
          const wf = wfMap.get(req.workflowId);

          pending.push({
            ...req,
            requesterName: requester ? requester.name : 'Unknown',
            requesterCode: requester ? requester.employeeCode : '',
            workflowName: wf ? wf.name : '',
            workflowCode: wf ? wf.code : '',
            currentStepOrder: currentStep.stepOrder
          });
        }
      });

      return pending;
    }

    /**
     * Get full audit and step execution history of an approval request
     * @param {string} approvalRequestId
     * @returns {Object|null}
     */
    getHistory(approvalRequestId) {
      if (!approvalRequestId) return null;
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return null;

      const db = dbService.getDatabase();
      const request = (db.approvalRequests || []).find(r => r.id === approvalRequestId);
      if (!request) return null;

      const steps = (db.approvalRequestSteps || [])
        .filter(s => s.approvalRequestId === approvalRequestId)
        .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));

      const actions = (db.approvalActions || [])
        .filter(a => a.approvalRequestId === approvalRequestId)
        .sort((a, b) => new Date(a.actionAt) - new Date(b.actionAt));

      const users = db.users || [];
      const userMap = new Map(users.map(u => [u.id, u]));
      const wfSteps = db.workflowSteps || [];
      const wfStepMap = new Map(wfSteps.map(ws => [ws.id, ws]));

      const enrichedSteps = steps.map(s => {
        const ws = wfStepMap.get(s.workflowStepId);
        const approvers = (s.approverEmployeeIds || []).map(id => {
          const u = userMap.get(id);
          return u ? `${u.name} (${u.employeeCode})` : id;
        });

        return {
          ...s,
          stepName: ws ? ws.name : `Step ${s.stepOrder}`,
          approverType: ws ? ws.approverType : '',
          approverNames: approvers
        };
      });

      const enrichedActions = actions.map(act => {
        const u = userMap.get(act.approverEmployeeId);
        return {
          ...act,
          approverName: u ? u.name : 'System / Unknown',
          approverCode: u ? u.employeeCode : ''
        };
      });

      const wf = (db.workflows || []).find(w => w.id === request.workflowId);

      return {
        request,
        steps: enrichedSteps,
        actions: enrichedActions,
        workflow: wf || null
      };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.ApprovalEngine = new ApprovalEngine();
  window.ApprovalEngine = window.HRM.ApprovalEngine;
})();
