/**
 * ==================================================
 * DATABASE & STORAGE SERVICE
 * Centralized LocalStorage Database for HRM Platform
 * Root Key: hrm_database
 * ==================================================
 */

(function () {
  'use strict';

  const ROOT_KEY = 'hrm_database';

  /**
   * Reusable Collision-Resistant ID Generator
   * @param {string} prefix - Entity prefix (e.g. 'usr', 'rol', 'prm')
   * @returns {string} Unique entity identifier
   */
  function generateId(prefix = 'id') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      const clean = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
      return `${prefix}_${clean}`;
    }
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}${random}`;
  }

  /**
   * Initial Empty Database Structure
   */
  const INITIAL_SCHEMA = Object.freeze({
    users: [],
    roles: [],
    permissions: [],
    userRoles: [],
    rolePermissions: [],
    employees: [],
    departments: [],
    workflows: [],
    workflowVersions: [],
    workflowSteps: [],
    workflowApprovers: [],
    approvalRequests: [],
    approvalRequestSteps: [],
    approvalActions: [],
    leaves: [],
    notifications: [],
    auditLogs: [],
    sessions: [],
    settings: {
      appName: 'HRM Core Enterprise',
      version: '2.0.0',
      initializedAt: new Date().toISOString(),
      seedVersion: 2
    }
  });

  /**
   * Database Service Manager
   */
  class DatabaseService {
    constructor() {
      this.generateId = generateId;
    }

    /**
     * Initializes database in LocalStorage and runs seed if empty
     * @returns {Object} Database state
     */
    initialize() {
      try {
        const raw = localStorage.getItem(ROOT_KEY);
        if (!raw) {
          const fresh = this._createEmptySchema();
          this.saveDatabase(fresh);
          console.info('[DatabaseService] Root schema initialized.');
          this.seedDatabase();
          return this.getDatabase();
        }

        const parsed = JSON.parse(raw);
        let mutated = false;
        const schema = this._createEmptySchema();

        // Ensure all schema collections exist
        for (const key of Object.keys(schema)) {
          if (!(key in parsed)) {
            parsed[key] = Array.isArray(schema[key]) ? [] : { ...schema[key] };
            mutated = true;
          }
        }

        if (mutated) {
          this.saveDatabase(parsed);
        }

        // Auto-seed if database is empty (users and roles missing)
        if (!parsed.users || parsed.users.length === 0 || !parsed.roles || parsed.roles.length === 0) {
          console.info('[DatabaseService] Database is empty. Seeding initial demo data...');
          this.seedDatabase();
        }

        return this.getDatabase();
      } catch (err) {
        console.warn('[DatabaseService] Storage error during initialization:', err);
        const fallback = this._createEmptySchema();
        this.saveDatabase(fallback);
        this.seedDatabase();
        return this.getDatabase();
      }
    }

    /**
     * Deep clone of initial empty schema
     */
    _createEmptySchema() {
      return JSON.parse(JSON.stringify(INITIAL_SCHEMA));
    }

    /**
     * Retrieves the entire database object from LocalStorage
     * @returns {Object}
     */
    getDatabase() {
      try {
        const raw = localStorage.getItem(ROOT_KEY);
        if (!raw) {
          const fresh = this._createEmptySchema();
          this.saveDatabase(fresh);
          return fresh;
        }
        return JSON.parse(raw);
      } catch (err) {
        console.error('[DatabaseService] Error reading database:', err);
        return this._createEmptySchema();
      }
    }

    /**
     * Persists the entire database object to LocalStorage
     * @param {Object} db - The database object to store
     * @returns {boolean} Success status
     */
    saveDatabase(db) {
      if (!db || typeof db !== 'object') {
        console.error('[DatabaseService] Invalid database payload provided to saveDatabase.');
        return false;
      }
      try {
        localStorage.setItem(ROOT_KEY, JSON.stringify(db));
        return true;
      } catch (err) {
        console.error('[DatabaseService] LocalStorage quota exceeded or storage blocked:', err);
        return false;
      }
    }

    /**
     * Completely resets and re-seeds the demo database
     * @returns {Object} Freshly seeded database
     */
    resetDatabase() {
      const fresh = this._createEmptySchema();
      this.saveDatabase(fresh);
      this.seedDatabase(true);
      console.info('[DatabaseService] Database successfully reset and re-seeded.');
      return this.getDatabase();
    }

    /**
     * Seeds the demo HRM data:
     * - 5 Users
     * - 5 Roles
     * - 23 Permissions
     * - Multi-role userRoles records
     * - Multi-permission rolePermissions records
     * @param {boolean} [force=false] - Force reseed even if data exists
     * @returns {boolean} Whether seeding took place
     */
    seedDatabase(force = false) {
      const db = this.getDatabase();

      // Only seed when empty unless forced
      if (!force && db.users && db.users.length > 0 && db.roles && db.roles.length > 0) {
        return false;
      }

      const now = new Date().toISOString();

      // ==========================================
      // 1. SEED 5 ROLES
      // ==========================================
      const roles = [
        {
          id: generateId('rol'),
          code: 'SUPER_ADMIN',
          name: 'Super Admin',
          description: 'Full system access with complete administrative privileges.',
          isSystem: true,
          createdAt: now
        },
        {
          id: generateId('rol'),
          code: 'HR_ADMIN',
          name: 'HR Admin',
          description: 'Manages employees, roles, departments, and HR-level approvals.',
          isSystem: true,
          createdAt: now
        },
        {
          id: generateId('rol'),
          code: 'MANAGER',
          name: 'Manager',
          description: 'Manages departmental team members, requests, and workflow approvals.',
          isSystem: true,
          createdAt: now
        },
        {
          id: generateId('rol'),
          code: 'FINANCE',
          name: 'Finance',
          description: 'Reviews and processes expense reimbursements and budget approvals.',
          isSystem: true,
          createdAt: now
        },
        {
          id: generateId('rol'),
          code: 'EMPLOYEE',
          name: 'Employee',
          description: 'Standard employee self-service access for leaves and expenses.',
          isSystem: true,
          createdAt: now
        }
      ];

      // Quick lookup map by code
      const roleMap = {};
      roles.forEach(r => { roleMap[r.code] = r; });

      // ==========================================
      // 2. SEED 23 PERMISSIONS
      // ==========================================
      const permissionsList = [
        // Dashboard
        { code: 'dashboard.view', module: 'Dashboard', name: 'View Dashboard', desc: 'Access executive and personal dashboard metrics' },
        // Users
        { code: 'user.view', module: 'Users', name: 'View Users', desc: 'View user directory and employee profiles' },
        { code: 'user.create', module: 'Users', name: 'Create Users', desc: 'Provision and create new user accounts' },
        { code: 'user.edit', module: 'Users', name: 'Edit Users', desc: 'Modify existing user account details and statuses' },
        { code: 'user.delete', module: 'Users', name: 'Delete Users', desc: 'Archive or terminate user accounts' },
        // Roles
        { code: 'role.view', module: 'Roles', name: 'View Roles', desc: 'View defined organizational roles' },
        { code: 'role.create', module: 'Roles', name: 'Create Roles', desc: 'Create custom organizational roles' },
        { code: 'role.edit', module: 'Roles', name: 'Edit Roles', desc: 'Update role details and assigned capabilities' },
        { code: 'role.delete', module: 'Roles', name: 'Delete Roles', desc: 'Remove custom organizational roles' },
        { code: 'permission.view', module: 'Roles', name: 'View Permissions', desc: 'View system permissions matrix' },
        // Workflow
        { code: 'workflow.view', module: 'Workflow', name: 'View Workflows', desc: 'Inspect workflow configurations and templates' },
        { code: 'workflow.create', module: 'Workflow', name: 'Create Workflows', desc: 'Author multi-stage approval workflow templates' },
        { code: 'workflow.edit', module: 'Workflow', name: 'Edit Workflows', desc: 'Modify approval routing rules and steps' },
        { code: 'workflow.publish', module: 'Workflow', name: 'Publish Workflows', desc: 'Publish active workflow versions into production' },
        // Approval
        { code: 'approval.view', module: 'Approval', name: 'View Approvals', desc: 'View pending and completed approval requests' },
        { code: 'approval.approve', module: 'Approval', name: 'Approve Requests', desc: 'Grant official approval on pending workflow stages' },
        { code: 'approval.reject', module: 'Approval', name: 'Reject Requests', desc: 'Decline and return pending approval requests' },
        { code: 'approval.delegate', module: 'Approval', name: 'Delegate Approvals', desc: 'Reassign pending approval authority to a colleague' },
        // Leave
        { code: 'leave.view', module: 'Leave', name: 'View Leaves', desc: 'Inspect individual or departmental leave balances' },
        { code: 'leave.create', module: 'Leave', name: 'Apply for Leave', desc: 'Submit paid time off and medical leave requests' },
        { code: 'leave.edit', module: 'Leave', name: 'Edit Leave', desc: 'Update unapproved leave requests' },
        { code: 'leave.cancel', module: 'Leave', name: 'Cancel Leave', desc: 'Revoke submitted leave requests' },
        // Expense
        { code: 'expense.view', module: 'Expense', name: 'View Expenses', desc: 'Inspect travel and operational expense claims' },
        { code: 'expense.create', module: 'Expense', name: 'Submit Expense', desc: 'Create and submit expense reimbursement claims' },
        // Audit
        { code: 'audit.view', module: 'Audit', name: 'View Audit Logs', desc: 'Inspect security and workflow compliance audit trails' }
      ];

      const permissions = permissionsList.map(p => ({
        id: generateId('prm'),
        code: p.code,
        name: p.name,
        module: p.module,
        description: p.desc,
        status: 'Active',
        createdAt: now
      }));

      // Quick lookup map by code
      const permMap = {};
      permissions.forEach(p => { permMap[p.code] = p; });

      // ==========================================
      // 3. SEED DEPARTMENTS & 5 USERS
      // ==========================================
      const deptEngId = generateId('dep');
      const deptHrId = generateId('dep');
      const usrSarahId = generateId('usr');
      const usrMichaelId = generateId('usr');
      const usrElenaId = generateId('usr');
      const usrDavidId = generateId('usr');
      const usrAlexId = generateId('usr');

      const departments = [
        {
          id: deptEngId,
          code: 'ENG',
          name: 'Engineering',
          headEmployeeId: usrSarahId,
          createdAt: now
        },
        {
          id: deptHrId,
          code: 'HR',
          name: 'Human Resources',
          headEmployeeId: usrMichaelId,
          createdAt: now
        }
      ];

      const users = [
        {
          id: usrSarahId,
          employeeCode: 'EMP-001',
          name: 'Sarah Jenkins',
          email: 'sarah.jenkins@company.com',
          password: 'Demo@123',
          departmentId: deptEngId,
          managerId: null,
          status: 'active',
          createdAt: now
        },
        {
          id: usrMichaelId,
          employeeCode: 'EMP-002',
          name: 'Michael Chang',
          email: 'michael.chang@company.com',
          password: 'Demo@123',
          departmentId: deptHrId,
          managerId: usrSarahId,
          status: 'active',
          createdAt: now
        },
        {
          id: usrElenaId,
          employeeCode: 'EMP-003',
          name: 'Elena Rostova',
          email: 'elena.rostova@company.com',
          password: 'Demo@123',
          departmentId: deptEngId,
          managerId: usrSarahId,
          status: 'active',
          createdAt: now
        },
        {
          id: usrDavidId,
          employeeCode: 'EMP-004',
          name: 'David Miller',
          email: 'david.miller@company.com',
          password: 'Demo@123',
          departmentId: deptEngId,
          managerId: usrSarahId,
          status: 'active',
          createdAt: now
        },
        {
          id: usrAlexId,
          employeeCode: 'EMP-005',
          name: 'Alex Rivera',
          email: 'alex.rivera@company.com',
          password: 'Demo@123',
          departmentId: deptEngId,
          managerId: usrElenaId,
          status: 'active',
          createdAt: now
        }
      ];

      // ==========================================
      // 4. SEED USER-ROLES (Many-to-Many)
      // Users support MULTIPLE roles
      // ==========================================
      const userRoles = [];

      function assignUserRoles(user, roleCodes) {
        roleCodes.forEach(code => {
          const role = roleMap[code];
          if (role) {
            userRoles.push({
              id: generateId('ur'),
              userId: user.id,
              roleId: role.id,
              createdAt: now
            });
          }
        });
      }

      // Sarah Jenkins: Super Admin + Manager (Multi-role)
      assignUserRoles(users[0], ['SUPER_ADMIN', 'MANAGER']);
      // Michael Chang: HR Admin + Employee (Multi-role)
      assignUserRoles(users[1], ['HR_ADMIN', 'EMPLOYEE']);
      // Elena Rostova: Manager + Employee (Multi-role)
      assignUserRoles(users[2], ['MANAGER', 'EMPLOYEE']);
      // David Miller: Finance + Employee (Multi-role)
      assignUserRoles(users[3], ['FINANCE', 'EMPLOYEE']);
      // Alex Rivera: Employee
      assignUserRoles(users[4], ['EMPLOYEE']);

      // ==========================================
      // 5. SEED ROLE-PERMISSIONS (Many-to-Many)
      // Roles support MULTIPLE permissions
      // ==========================================
      const rolePermissions = [];

      function assignRolePermissions(roleCode, permCodes) {
        const role = roleMap[roleCode];
        if (!role) return;

        permCodes.forEach(code => {
          const perm = permMap[code];
          if (perm) {
            rolePermissions.push({
              id: generateId('rp'),
              roleId: role.id,
              permissionId: perm.id,
              createdAt: now
            });
          }
        });
      }

      // Super Admin: Has ALL 23 permissions
      assignRolePermissions('SUPER_ADMIN', permissionsList.map(p => p.code));

      // HR Admin: User/Role management, leave/approvals, audit
      assignRolePermissions('HR_ADMIN', [
        'dashboard.view',
        'user.view', 'user.create', 'user.edit', 'user.delete',
        'role.view', 'permission.view',
        'workflow.view',
        'approval.view', 'approval.approve', 'approval.reject', 'approval.delegate',
        'leave.view', 'leave.create', 'leave.edit', 'leave.cancel',
        'audit.view'
      ]);

      // Manager: Approvals, leave management, expense submissions, user view
      assignRolePermissions('MANAGER', [
        'dashboard.view',
        'user.view',
        'approval.view', 'approval.approve', 'approval.reject', 'approval.delegate',
        'leave.view', 'leave.create', 'leave.edit', 'leave.cancel',
        'expense.view', 'expense.create'
      ]);

      // Finance: Expenses, approvals, leave view/create
      assignRolePermissions('FINANCE', [
        'dashboard.view',
        'expense.view', 'expense.create',
        'approval.view', 'approval.approve', 'approval.reject',
        'leave.view', 'leave.create'
      ]);

      // Employee: Self-service (leave, expense, directory view, dashboard)
      assignRolePermissions('EMPLOYEE', [
        'dashboard.view',
        'user.view',
        'leave.view', 'leave.create', 'leave.edit', 'leave.cancel',
        'expense.view', 'expense.create'
      ]);

      // ==========================================
      // 6. SEED DEFAULT PUBLISHED LEAVE WORKFLOW
      // ==========================================
      const wfLeaveId = generateId('wf');
      const wfvLeaveId = generateId('wfv');
      const leaveWorkflow = {
        id: wfLeaveId,
        code: 'WF_LEAVE',
        name: 'Leave Approval Workflow',
        entityType: 'Leave',
        description: 'Standard multi-stage employee leave request approval pipeline.',
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      const leaveWorkflowVersion = {
        id: wfvLeaveId,
        workflowId: wfLeaveId,
        versionNumber: 1,
        status: 'Published',
        createdAt: now,
        publishedAt: now,
        createdBy: usrSarahId
      };
      const leaveWorkflowSteps = [
        {
          id: generateId('wfs'),
          workflowVersionId: wfvLeaveId,
          stepOrder: 1,
          name: 'Manager Approval',
          approverType: 'Manager',
          approverValue: null,
          isRequired: true,
          minApprovals: 1,
          allowReject: true,
          allowDelegate: true,
          createdAt: now
        },
        {
          id: generateId('wfs'),
          workflowVersionId: wfvLeaveId,
          stepOrder: 2,
          name: 'Department Head Approval',
          approverType: 'DepartmentHead',
          approverValue: null,
          isRequired: true,
          minApprovals: 1,
          allowReject: true,
          allowDelegate: true,
          createdAt: now
        },
        {
          id: generateId('wfs'),
          workflowVersionId: wfvLeaveId,
          stepOrder: 3,
          name: 'HR Approval',
          approverType: 'HR',
          approverValue: null,
          isRequired: true,
          minApprovals: 1,
          allowReject: true,
          allowDelegate: false,
          createdAt: now
        }
      ];

      // Commit seeded tables to database
      db.roles = roles;
      db.permissions = permissions;
      db.users = users;
      db.userRoles = userRoles;
      db.rolePermissions = rolePermissions;
      db.departments = departments;
      db.workflows = [leaveWorkflow];
      db.workflowVersions = [leaveWorkflowVersion];
      db.workflowSteps = leaveWorkflowSteps;
      db.leaves = db.leaves || [];
      db.approvalRequests = db.approvalRequests || [];
      db.approvalRequestSteps = db.approvalRequestSteps || [];
      db.approvalActions = db.approvalActions || [];

      this.saveDatabase(db);
      console.info(
        `[DatabaseService] Seed complete: ${users.length} users, ${roles.length} roles, ${permissions.length} permissions, ` +
        `${userRoles.length} userRoles, ${rolePermissions.length} rolePermissions.`
      );
      return true;
    }

    /**
     * Get all roles assigned to a user
     * @param {string} userId
     * @returns {Array} Array of role objects
     */
    getUserRoles(userId) {
      const db = this.getDatabase();
      const mappings = (db.userRoles || []).filter(ur => ur.userId === userId);
      const roleMap = new Map((db.roles || []).map(r => [r.id, r]));
      return mappings.map(m => roleMap.get(m.roleId)).filter(Boolean);
    }

    /**
     * Get all permissions assigned to a role
     * @param {string} roleId
     * @returns {Array} Array of permission objects
     */
    getRolePermissions(roleId) {
      const db = this.getDatabase();
      const mappings = (db.rolePermissions || []).filter(rp => rp.roleId === roleId);
      const permMap = new Map((db.permissions || []).map(p => [p.id, p]));
      return mappings.map(m => permMap.get(m.permissionId)).filter(Boolean);
    }

    /**
     * Get all distinct permissions granted to a user across all their roles
     * @param {string} userId
     * @returns {Array} Array of distinct permission objects
     */
    getUserPermissions(userId) {
      const roles = this.getUserRoles(userId);
      const permIds = new Set();
      const result = [];
      roles.forEach(role => {
        const perms = this.getRolePermissions(role.id);
        perms.forEach(p => {
          if (!permIds.has(p.id)) {
            permIds.add(p.id);
            result.push(p);
          }
        });
      });
      return result;
    }

    /**
     * Summary statistics for all collections
     */
    getStats() {
      const db = this.getDatabase();
      const stats = {};
      for (const [k, v] of Object.entries(db)) {
        if (Array.isArray(v)) {
          stats[k] = v.length;
        } else if (typeof v === 'object' && v !== null) {
          stats[k] = Object.keys(v).length;
        } else {
          stats[k] = 1;
        }
      }
      return stats;
    }
  }

  // Instantiate DatabaseService
  const databaseServiceInstance = new DatabaseService();

  /**
   * Backwards-compatible StorageService adapter
   */
  const storageServiceAdapter = {
    init: () => databaseServiceInstance.initialize(),
    get: (key) => {
      const db = databaseServiceInstance.getDatabase();
      if (!key || key === ROOT_KEY) return db;
      return db[key] !== undefined ? db[key] : null;
    },
    set: (key, value) => {
      if (!key) return false;
      const db = databaseServiceInstance.getDatabase();
      db[key] = value;
      return databaseServiceInstance.saveDatabase(db);
    },
    remove: (key) => {
      if (!key) return false;
      const db = databaseServiceInstance.getDatabase();
      if (key in INITIAL_SCHEMA) {
        db[key] = Array.isArray(INITIAL_SCHEMA[key]) ? [] : {};
      } else {
        delete db[key];
      }
      return databaseServiceInstance.saveDatabase(db);
    },
    clear: () => {
      databaseServiceInstance.resetDatabase();
      return true;
    },
    has: (key) => {
      if (!key) return false;
      const db = databaseServiceInstance.getDatabase();
      return key in db && db[key] !== undefined;
    },
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (err) {
        console.warn('[StorageService] Error getting item:', err);
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (err) {
        console.error('[StorageService] Error setting item:', err);
        return false;
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (err) {
        console.error('[StorageService] Error removing item:', err);
        return false;
      }
    },
    getStats: () => databaseServiceInstance.getStats()
  };

  // Expose on window.HRM and global window
  window.HRM = window.HRM || {};
  window.HRM.generateId = generateId;
  window.HRM.DatabaseService = databaseServiceInstance;
  window.HRM.StorageService = storageServiceAdapter;

  window.DatabaseService = databaseServiceInstance;
  window.StorageService = storageServiceAdapter;
  window.generateId = generateId;
})();
