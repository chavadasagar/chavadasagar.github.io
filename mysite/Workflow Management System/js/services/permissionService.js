/**
 * ==================================================
 * PERMISSION SERVICE
 * Manages System Permissions, Module Groupings, and Code Uniqueness
 * Backed by DatabaseService (hrm_database)
 * ==================================================
 */

(function () {
  'use strict';

  // Standard ordered modules matching prompt specification
  const ORDERED_MODULES = [
    'Dashboard',
    'Users',
    'Roles',
    'Workflow',
    'Approval',
    'Leave',
    'Expense',
    'Audit'
  ];

  class PermissionService {
    /**
     * Get all permissions with normalized structure:
     * { id, name, code, module, description, status, createdAt }
     * @returns {Array<Object>}
     */
    getAll() {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const permissions = db.permissions || [];

      // Normalize fields to ensure required structure
      return permissions.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        module: this._normalizeModuleName(p.module),
        description: p.description || '',
        status: p.status || 'Active',
        createdAt: p.createdAt || new Date().toISOString()
      }));
    }

    /**
     * Get permission by ID
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
      if (!id) return null;
      const all = this.getAll();
      return all.find(p => p.id === id) || null;
    }

    /**
     * Get permission by code (case-insensitive)
     * @param {string} code
     * @returns {Object|null}
     */
    getByCode(code) {
      if (!code) return null;
      const cleanCode = code.trim().toLowerCase();
      const all = this.getAll();
      return all.find(p => p.code && p.code.toLowerCase() === cleanCode) || null;
    }

    /**
     * Group permissions by functional module in standard order
     * @returns {Object<string, Array<Object>>}
     */
    getGroupedByModule() {
      const all = this.getAll();
      const grouped = {};

      // Initialize ordered buckets
      ORDERED_MODULES.forEach(m => {
        grouped[m] = [];
      });

      // Distribute permissions into groups
      all.forEach(p => {
        const mod = this._normalizeModuleName(p.module);
        if (!grouped[mod]) {
          grouped[mod] = [];
        }
        grouped[mod].push(p);
      });

      return grouped;
    }

    /**
     * Helper to normalize module names to standard names
     * @param {string} moduleName
     * @returns {string}
     */
    _normalizeModuleName(moduleName) {
      if (!moduleName) return 'Dashboard';
      const m = moduleName.trim().toLowerCase();

      if (m === 'dashboard') return 'Dashboard';
      if (m === 'users' || m === 'user' || m === 'user management') return 'Users';
      if (m === 'roles' || m === 'role' || m === 'role management' || m === 'permissions' || m === 'permission') return 'Roles';
      if (m === 'workflow' || m === 'workflows') return 'Workflow';
      if (m === 'approval' || m === 'approvals') return 'Approval';
      if (m === 'leave' || m === 'leaves') return 'Leave';
      if (m === 'expense' || m === 'expenses') return 'Expense';
      if (m === 'audit' || m === 'audits' || m === 'audit logs') return 'Audit';

      return moduleName;
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.PermissionService = new PermissionService();
  window.PermissionService = window.HRM.PermissionService;
})();
