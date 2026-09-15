/**
 * ==================================================
 * LEAVE SERVICE (PHASE 12)
 * Manages Leave Applications, Date Validations, Total Days Calculation,
 * and Generic ApprovalEngine Integration + Status Synchronization
 * ==================================================
 */

(function () {
  'use strict';

  const LEAVE_STATUS = Object.freeze({
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled'
  });

  const LEAVE_TYPES = Object.freeze([
    'Annual Leave',
    'Sick Leave',
    'Casual Leave',
    'Maternity/Paternity Leave',
    'Unpaid Leave'
  ]);

  class LeaveService {
    constructor() {
      this.LEAVE_STATUS = LEAVE_STATUS;
      this.LEAVE_TYPES = LEAVE_TYPES;
    }

    _getGenerateId() {
      if (window.HRM && typeof window.HRM.generateId === 'function') {
        return window.HRM.generateId;
      }
      return (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    getLeaveTypes() {
      return [...LEAVE_TYPES];
    }

    /**
     * Calculate total days between two dates inclusive
     * @param {string} startDateStr - YYYY-MM-DD
     * @param {string} endDateStr - YYYY-MM-DD
     * @returns {number}
     */
    calculateDays(startDateStr, endDateStr) {
      if (!startDateStr || !endDateStr) return 0;
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      if (end < start) return 0;

      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    /**
     * Create a new Leave request and automatically route through generic ApprovalEngine
     * @param {Object} data
     * @param {string} data.employeeId - Submitting employee user ID
     * @param {string} data.leaveType - e.g. "Annual Leave"
     * @param {string} data.startDate - YYYY-MM-DD
     * @param {string} data.endDate - YYYY-MM-DD
     * @param {string} data.reason - Reason description
     * @returns {{ success: boolean, leave?: Object, approvalRequest?: Object, error?: string }}
     */
    createLeave(data = {}) {
      const { employeeId, leaveType, startDate, endDate, reason } = data;

      if (!employeeId) return { success: false, error: 'Employee ID is required.' };
      if (!leaveType || !LEAVE_TYPES.includes(leaveType)) {
        return { success: false, error: `Invalid Leave Type. Must be one of: ${LEAVE_TYPES.join(', ')}.` };
      }
      if (!startDate) return { success: false, error: 'Start Date is required.' };
      if (!endDate) return { success: false, error: 'End Date is required.' };

      const totalDays = this.calculateDays(startDate, endDate);
      if (totalDays <= 0) {
        return { success: false, error: 'End Date must be on or after Start Date.' };
      }

      if (!reason || !reason.trim()) {
        return { success: false, error: 'Reason for leave is required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.leaves = db.leaves || [];

      const employee = (db.users || []).find(u => u.id === employeeId);
      if (!employee) return { success: false, error: 'Employee not found.' };

      const generateId = this._getGenerateId();
      const now = new Date().toISOString();
      const leaveId = generateId('lev');

      // 1. Initialize Leave Record (Pending)
      const leaveRecord = {
        id: leaveId,
        employeeId,
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason: reason.trim(),
        status: LEAVE_STATUS.PENDING,
        approvalRequestId: null,
        createdAt: now
      };

      // 2. Submit to Generic ApprovalEngine (Phase 12 Requirement 3)
      const approvalEngine = window.HRM ? window.HRM.ApprovalEngine : null;
      if (!approvalEngine) {
        return { success: false, error: 'ApprovalEngine service unavailable.' };
      }

      const submitRes = approvalEngine.submitRequest({
        entityType: 'Leave',
        entityId: leaveId,
        requestedBy: employeeId
      });

      if (!submitRes.success) {
        return {
          success: false,
          error: `Approval routing failed: ${submitRes.error || 'Could not find active approval workflow for Leave.'}`
        };
      }

      // 3. Store returned approvalRequestId on the Leave record
      leaveRecord.approvalRequestId = submitRes.request.id;

      // Commit leave record
      db.leaves.push(leaveRecord);
      dbService.saveDatabase(db);

      console.info(`[LeaveService] Created Leave ${leaveId} (${totalDays} days) linked to ApprovalRequest ${submitRes.request.id}.`);

      return {
        success: true,
        leave: leaveRecord,
        approvalRequest: submitRes.request
      };
    }

    /**
     * Synchronize Leave status with an ApprovalRequest's status
     * Outside ApprovalEngine (Phase 12 Requirement 5)
     * @param {string} approvalRequestId
     * @returns {Object|null} Synchronized Leave record
     */
    syncFromApprovalRequest(approvalRequestId) {
      if (!approvalRequestId) return null;
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return null;

      const db = dbService.getDatabase();
      db.leaves = db.leaves || [];
      const requests = db.approvalRequests || [];

      const req = requests.find(r => r.id === approvalRequestId);
      if (!req) return null;

      const leave = db.leaves.find(l => l.approvalRequestId === approvalRequestId || l.id === req.entityId);
      if (!leave) return null;

      let changed = false;
      if (req.status === 'Approved' && leave.status !== LEAVE_STATUS.APPROVED) {
        leave.status = LEAVE_STATUS.APPROVED;
        changed = true;
      } else if (req.status === 'Rejected' && leave.status !== LEAVE_STATUS.REJECTED) {
        leave.status = LEAVE_STATUS.REJECTED;
        changed = true;
      } else if (req.status === 'Cancelled' && leave.status !== LEAVE_STATUS.CANCELLED) {
        leave.status = LEAVE_STATUS.CANCELLED;
        changed = true;
      }

      if (changed) {
        dbService.saveDatabase(db);
        console.info(`[LeaveService] Synchronized Leave ${leave.id} status to "${leave.status}" from ApprovalRequest ${req.id}.`);
      }

      return leave;
    }

    /**
     * Get all leaves enriched with employee details and approval progress
     * @returns {Array<Object>}
     */
    getAll() {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const leaves = db.leaves || [];
      const users = db.users || [];
      const userMap = new Map(users.map(u => [u.id, u]));

      const requests = db.approvalRequests || [];
      const reqMap = new Map(requests.map(r => [r.id, r]));

      const steps = db.approvalRequestSteps || [];

      return leaves.map(l => {
        const emp = userMap.get(l.employeeId);
        const req = reqMap.get(l.approvalRequestId);

        let currentStepName = 'Completed';
        let currentStepOrder = null;
        if (req && req.status === 'Pending') {
          const currentStep = steps.find(s => s.id === req.currentStepId);
          if (currentStep) {
            currentStepOrder = currentStep.stepOrder;
            currentStepName = `Step ${currentStep.stepOrder} (Pending)`;
          }
        }

        return {
          ...l,
          employeeName: emp ? emp.name : 'Unknown',
          employeeCode: emp ? emp.employeeCode : '',
          currentStepName,
          currentStepOrder,
          approvalRequestStatus: req ? req.status : null
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get leaves for a specific employee
     * @param {string} employeeId
     * @returns {Array<Object>}
     */
    getByEmployee(employeeId) {
      return this.getAll().filter(l => l.employeeId === employeeId);
    }

    /**
     * Get single leave by ID with complete approval history
     * @param {string} leaveId
     * @returns {Object|null}
     */
    getById(leaveId) {
      if (!leaveId) return null;
      const all = this.getAll();
      const leave = all.find(l => l.id === leaveId);
      if (!leave) return null;

      let history = null;
      if (leave.approvalRequestId && window.HRM && window.HRM.ApprovalEngine) {
        history = window.HRM.ApprovalEngine.getHistory(leave.approvalRequestId);
      }

      return {
        ...leave,
        history
      };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.LeaveService = new LeaveService();
  window.LeaveService = window.HRM.LeaveService;
})();
