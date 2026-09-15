/**
 * ==================================================
 * ROLE SERVICE
 * Manages Role CRUD, Code Uniqueness, and Referential Protection
 * Backed by DatabaseService (hrm_database)
 * ==================================================
 */

(function () {
  'use strict';

  class RoleService {
    /**
     * Get all roles enriched with assigned user count and assigned permission count
     * @returns {Array<Object>}
     */
    getAll() {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const roles = db.roles || [];
      const userRoles = db.userRoles || [];
      const rolePermissions = db.rolePermissions || [];

      return roles.map(role => {
        const userCount = userRoles.filter(ur => ur.roleId === role.id).length;
        const permissionCount = rolePermissions.filter(rp => rp.roleId === role.id).length;
        return {
          ...role,
          status: role.status || 'Active', // Default status if not set
          userCount,
          permissionCount
        };
      });
    }

    /**
     * Get role by ID enriched with assigned user objects and permission objects
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
      if (!id) return null;
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return null;

      const db = dbService.getDatabase();
      const role = (db.roles || []).find(r => r.id === id);
      if (!role) return null;

      const userRoles = db.userRoles || [];
      const users = db.users || [];
      const rolePermissions = db.rolePermissions || [];
      const permissions = db.permissions || [];

      // Resolve assigned users
      const assignedUserIds = new Set(userRoles.filter(ur => ur.roleId === role.id).map(ur => ur.userId));
      const assignedUsers = users.filter(u => assignedUserIds.has(u.id));

      // Resolve assigned permissions
      const assignedPermIds = new Set(rolePermissions.filter(rp => rp.roleId === role.id).map(rp => rp.permissionId));
      const assignedPermissions = permissions.filter(p => assignedPermIds.has(p.id));

      return {
        ...role,
        status: role.status || 'Active',
        assignedUsers,
        assignedPermissions,
        userCount: assignedUsers.length,
        permissionCount: assignedPermissions.length
      };
    }

    /**
     * Create a new role with validation
     * @param {Object} data
     * @param {string} data.name
     * @param {string} data.code
     * @param {string} [data.description]
     * @param {string} [data.status='Active']
     * @returns {{ success: boolean, role?: Object, error?: string }}
     */
    create(data) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) {
        return { success: false, error: 'Database service is unavailable.' };
      }

      const { name, code, description = '', status = 'Active' } = data || {};

      // 1. Validation: Name required
      if (!name || !name.trim()) {
        return { success: false, error: 'Role Name is required.' };
      }

      // 2. Validation: Code required
      if (!code || !code.trim()) {
        return { success: false, error: 'Role Code is required.' };
      }

      // Normalize code: uppercase, trim, alphanumeric with underscores
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

      const db = dbService.getDatabase();
      const roles = db.roles || [];

      // 3. Validation: Code unique (case-insensitive)
      const existingCode = roles.find(r => r.code && r.code.toUpperCase() === cleanCode);
      if (existingCode) {
        return { success: false, error: `Role Code "${cleanCode}" already exists. Please choose a unique code.` };
      }

      // Generate entity ID
      const generateId = (window.HRM && window.HRM.generateId) 
        ? window.HRM.generateId 
        : (prefix => `${prefix}_${Date.now()}`);

      const now = new Date().toISOString();
      const normalizedStatus = (status && status.toLowerCase() === 'inactive') ? 'Inactive' : 'Active';

      const newRole = {
        id: generateId('rol'),
        code: cleanCode,
        name: name.trim(),
        description: description.trim(),
        status: normalizedStatus,
        isSystem: false,
        createdAt: now
      };

      roles.push(newRole);
      db.roles = roles;
      dbService.saveDatabase(db);
      console.info(`[RoleService] Created role "${newRole.name}" (${newRole.code}).`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'Role created',
          entityType: 'Role',
          entityId: newRole.id,
          description: `Created role "${newRole.name}" (${newRole.code}).`,
          metadata: { code: newRole.code, status: newRole.status }
        });
      }

      return { success: true, role: this.getById(newRole.id) };
    }

    /**
     * Update an existing role
     * @param {string} id
     * @param {Object} data
     * @param {string} data.name
     * @param {string} [data.code]
     * @param {string} [data.description]
     * @param {string} [data.status]
     * @returns {{ success: boolean, role?: Object, error?: string }}
     */
    update(id, data) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) {
        return { success: false, error: 'Database service is unavailable.' };
      }

      if (!id) {
        return { success: false, error: 'Role ID is required.' };
      }

      const { name, code, description, status } = data || {};

      // 1. Validation: Name required
      if (!name || !name.trim()) {
        return { success: false, error: 'Role Name is required.' };
      }

      const db = dbService.getDatabase();
      const roles = db.roles || [];
      const roleIndex = roles.findIndex(r => r.id === id);

      if (roleIndex === -1) {
        return { success: false, error: 'Role not found.' };
      }

      const existing = roles[roleIndex];

      // 2. Validation: If code is provided, verify uniqueness excluding this role
      let cleanCode = existing.code;
      if (code && code.trim()) {
        const potentialCode = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const duplicate = roles.find(r => r.id !== id && r.code && r.code.toUpperCase() === potentialCode);
        if (duplicate) {
          return { success: false, error: `Role Code "${potentialCode}" already exists. Code must be unique.` };
        }
        cleanCode = potentialCode;
      }

      const normalizedStatus = status 
        ? ((status.toLowerCase() === 'inactive') ? 'Inactive' : 'Active')
        : (existing.status || 'Active');

      roles[roleIndex] = {
        ...existing,
        name: name.trim(),
        code: cleanCode,
        description: description !== undefined ? description.trim() : existing.description,
        status: normalizedStatus,
        updatedAt: new Date().toISOString()
      };

      db.roles = roles;
      dbService.saveDatabase(db);
      console.info(`[RoleService] Updated role ${id} (${cleanCode}).`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'Role updated',
          entityType: 'Role',
          entityId: id,
          description: `Updated role "${name.trim()}" (${cleanCode}).`,
          metadata: { code: cleanCode, status: normalizedStatus }
        });
      }

      return { success: true, role: this.getById(id) };
    }

    /**
     * Activate a role (sets status to 'Active')
     * @param {string} id
     * @returns {{ success: boolean, error?: string }}
     */
    activate(id) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const role = (db.roles || []).find(r => r.id === id);

      if (!role) {
        return { success: false, error: 'Role not found.' };
      }

      role.status = 'Active';
      role.updatedAt = new Date().toISOString();

      dbService.saveDatabase(db);
      console.info(`[RoleService] Activated role ${id}.`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'Role updated',
          entityType: 'Role',
          entityId: id,
          description: `Activated role "${role.name}" (${role.code}).`,
          metadata: { status: 'Active' }
        });
      }

      return { success: true };
    }

    /**
     * Soft-deactivate a role (sets status to 'Inactive')
     * @param {string} id
     * @returns {{ success: boolean, error?: string }}
     */
    deactivate(id) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const role = (db.roles || []).find(r => r.id === id);

      if (!role) {
        return { success: false, error: 'Role not found.' };
      }

      role.status = 'Inactive';
      role.updatedAt = new Date().toISOString();

      dbService.saveDatabase(db);
      console.info(`[RoleService] Deactivated role ${id}.`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'Role updated',
          entityType: 'Role',
          entityId: id,
          description: `Deactivated role "${role.name}" (${role.code}).`,
          metadata: { status: 'Inactive' }
        });
      }

      return { success: true };
    }

    /**
     * Check if a role is referenced by any users or permissions
     * @param {string} id
     * @returns {{ referenced: boolean, userCount: number, permissionCount: number }}
     */
    isReferenced(id) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { referenced: false, userCount: 0, permissionCount: 0 };

      const db = dbService.getDatabase();
      const userRoles = db.userRoles || [];
      const rolePermissions = db.rolePermissions || [];

      const userCount = userRoles.filter(ur => ur.roleId === id).length;
      const permissionCount = rolePermissions.filter(rp => rp.roleId === id).length;

      return {
        referenced: (userCount > 0 || permissionCount > 0),
        userCount,
        permissionCount
      };
    }

    /**
     * Delete role: Enforces referential integrity
     * Blocks hard-deletion if role is referenced by users or permissions.
     * @param {string} id
     * @returns {{ success: boolean, error?: string, mustDeactivate?: boolean }}
     */
    delete(id) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const refCheck = this.isReferenced(id);
      if (refCheck.referenced) {
        return {
          success: false,
          mustDeactivate: true,
          error: `Cannot delete role. It is currently referenced by ${refCheck.userCount} user(s) and ${refCheck.permissionCount} permission mapping(s). Only deactivation is permitted.`
        };
      }

      const db = dbService.getDatabase();
      const roles = db.roles || [];
      const roleIndex = roles.findIndex(r => r.id === id);

      if (roleIndex === -1) {
        return { success: false, error: 'Role not found.' };
      }

      // Safe to hard delete unreferenced role
      const deleted = roles.splice(roleIndex, 1)[0];
      db.roles = roles;
      dbService.saveDatabase(db);
      console.info(`[RoleService] Deleted unreferenced role "${deleted.name}".`);

      return { success: true };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.RoleService = new RoleService();
  window.RoleService = window.HRM.RoleService;
})();
