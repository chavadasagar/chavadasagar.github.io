/**
 * ==================================================
 * AUDIT SERVICE (PHASE 14)
 * Comprehensive Immutable System Activity Audit Trail
 * Backed by DatabaseService (hrm_database: auditLogs)
 * ==================================================
 */

(function () {
  'use strict';

  const AUDIT_ACTIONS = Object.freeze([
    'Login',
    'Logout',
    'User created',
    'User updated',
    'Role created',
    'Role updated',
    'Permission assigned',
    'Workflow created',
    'Workflow published',
    'Request submitted',
    'Approval approved',
    'Approval rejected',
    'Approval delegated'
  ]);

  class AuditService {
    constructor() {
      this.AUDIT_ACTIONS = AUDIT_ACTIONS;
    }

    _getGenerateId() {
      if (window.HRM && typeof window.HRM.generateId === 'function') {
        return window.HRM.generateId;
      }
      return (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    _dispatchChangeEvent() {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('hrm:audit-logged'));
      }
    }

    /**
     * Record a system activity audit log
     * @param {Object} payload
     * @param {string} [payload.userId] - Acting user ID (defaults to current session user)
     * @param {string} payload.action - Activity action name (e.g. 'Login', 'Request submitted')
     * @param {string} payload.entityType - Target entity type (e.g. 'User', 'Role', 'Leave', 'ApprovalRequest')
     * @param {string} payload.entityId - Target entity ID
     * @param {string} payload.description - Human-readable narrative of the action
     * @param {Object} [payload.metadata={}] - Additional contextual metadata
     * @returns {{ success: boolean, log?: Object, error?: string }}
     */
    log(payload = {}) {
      const { action, entityType, entityId, description, metadata = {} } = payload;
      let userId = payload.userId;

      // Auto-resolve current user if omitted
      if (!userId) {
        if (window.HRM && window.HRM.AuthService) {
          const user = window.HRM.AuthService.getCurrentUser();
          userId = user ? user.id : 'usr_system';
        } else {
          userId = 'usr_system';
        }
      }

      if (!action || !action.trim()) {
        return { success: false, error: 'Audit action is required.' };
      }
      if (!entityType || !entityType.trim()) {
        return { success: false, error: 'Entity type is required.' };
      }
      if (entityId === undefined || entityId === null) {
        return { success: false, error: 'Entity ID is required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) {
        return { success: false, error: 'Database service unavailable.' };
      }

      const db = dbService.getDatabase();
      db.auditLogs = db.auditLogs || [];

      const generateId = this._getGenerateId();
      const auditRecord = {
        id: generateId('aud'),
        userId: String(userId),
        action: action.trim(),
        entityType: entityType.trim(),
        entityId: String(entityId),
        description: description ? description.trim() : `${action} performed on ${entityType} #${entityId}`,
        metadata: (typeof metadata === 'object' && metadata !== null) ? metadata : {},
        createdAt: new Date().toISOString()
      };

      db.auditLogs.push(auditRecord);
      dbService.saveDatabase(db);

      this._dispatchChangeEvent();

      return {
        success: true,
        log: auditRecord
      };
    }

    /**
     * Retrieve all audit logs matching given filters, sorted newest first
     * @param {Object} [filters={}]
     * @param {string} [filters.userId] - Filter by user ID
     * @param {string} [filters.action] - Filter by exact action name
     * @param {string} [filters.entityType] - Filter by entity type
     * @param {string} [filters.date] - Filter by date (YYYY-MM-DD)
     * @param {string} [filters.search] - Case-insensitive text search
     * @returns {Array<Object>}
     */
    getAll(filters = {}) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const logs = db.auditLogs || [];
      const users = db.users || [];

      // Map users for fast lookup
      const userMap = new Map();
      users.forEach(u => userMap.set(u.id, u));

      let result = logs.map(log => {
        const u = userMap.get(log.userId);
        return {
          ...log,
          userName: u ? u.name : (log.userId === 'usr_system' ? 'System' : 'Unknown User'),
          userEmail: u ? u.email : '',
          userRole: (u && u.roles && u.roles[0]) ? u.roles[0].name : ''
        };
      });

      // Filter by User
      if (filters.userId && filters.userId !== 'all') {
        result = result.filter(item => item.userId === filters.userId);
      }

      // Filter by Action
      if (filters.action && filters.action !== 'all') {
        result = result.filter(item => item.action.toLowerCase() === filters.action.toLowerCase());
      }

      // Filter by Entity Type
      if (filters.entityType && filters.entityType !== 'all') {
        result = result.filter(item => item.entityType.toLowerCase() === filters.entityType.toLowerCase());
      }

      // Filter by Date (YYYY-MM-DD)
      if (filters.date) {
        result = result.filter(item => (item.createdAt || '').startsWith(filters.date));
      }

      // Filter by Text Search
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        result = result.filter(item => {
          return (
            (item.description && item.description.toLowerCase().includes(q)) ||
            (item.action && item.action.toLowerCase().includes(q)) ||
            (item.entityType && item.entityType.toLowerCase().includes(q)) ||
            (item.entityId && item.entityId.toLowerCase().includes(q)) ||
            (item.userName && item.userName.toLowerCase().includes(q)) ||
            (item.userEmail && item.userEmail.toLowerCase().includes(q))
          );
        });
      }

      // Sort newest first
      return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get unique actions present in the database + predefined
     * @returns {Array<string>}
     */
    getActions() {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      const logs = (dbService && dbService.getDatabase().auditLogs) || [];
      const set = new Set(AUDIT_ACTIONS);
      logs.forEach(l => {
        if (l.action) set.add(l.action);
      });
      return Array.from(set).sort();
    }

    /**
     * Get unique entity types present in the database + standard defaults
     * @returns {Array<string>}
     */
    getEntityTypes() {
      const defaults = ['User', 'Role', 'Permission', 'ApprovalWorkflow', 'ApprovalWorkflowVersion', 'ApprovalWorkflowStep', 'Leave', 'ApprovalRequest'];
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      const logs = (dbService && dbService.getDatabase().auditLogs) || [];
      const set = new Set(defaults);
      logs.forEach(l => {
        if (l.entityType) set.add(l.entityType);
      });
      return Array.from(set).sort();
    }

    /**
     * Clear all audit logs (Administrative maintenance)
     * @returns {{ success: boolean }}
     */
    clearAll() {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false };

      const db = dbService.getDatabase();
      db.auditLogs = [];
      dbService.saveDatabase(db);
      this._dispatchChangeEvent();

      return { success: true };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.AuditService = new AuditService();
  window.AuditService = window.HRM.AuditService;
})();
