/**
 * ==================================================
 * ROLE PERMISSION SERVICE
 * Manages Many-to-Many Role-Permission Associations (rolePermissions)
 * Backed by DatabaseService (hrm_database.rolePermissions)
 * ==================================================
 */

(function () {
  'use strict';

  class RolePermissionService {
    /**
     * Get all permissions assigned to a specific role
     * @param {string} roleId
     * @returns {Array<Object>} Array of permission objects
     */
    getPermissionsForRole(roleId) {
      if (!roleId) return [];
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const rolePermissions = db.rolePermissions || [];
      const permissions = db.permissions || [];

      const permMap = new Map(permissions.map(p => [p.id, p]));
      return rolePermissions
        .filter(rp => rp.roleId === roleId)
        .map(rp => permMap.get(rp.permissionId))
        .filter(Boolean);
    }

    /**
     * Assign a permission to a role (with Duplicate Protection)
     * A role cannot have the same permission assigned twice.
     * @param {string} roleId
     * @param {string} permissionId
     * @returns {{ success: boolean, mapping?: Object, duplicate?: boolean, error?: string }}
     */
    assignPermission(roleId, permissionId) {
      if (!roleId || !permissionId) {
        return { success: false, error: 'Role ID and Permission ID are required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.rolePermissions = db.rolePermissions || [];

      // Duplicate Protection: check if mapping already exists
      const existing = db.rolePermissions.find(rp => rp.roleId === roleId && rp.permissionId === permissionId);
      if (existing) {
        return { success: true, mapping: existing, duplicate: true };
      }

      const generateId = (window.HRM && window.HRM.generateId)
        ? window.HRM.generateId
        : (prefix => `${prefix}_${Date.now()}`);

      const newMapping = {
        id: generateId('rp'),
        roleId,
        permissionId,
        createdAt: new Date().toISOString()
      };

      db.rolePermissions.push(newMapping);
      dbService.saveDatabase(db);
      console.info(`[RolePermissionService] Assigned permission ${permissionId} to role ${roleId}.`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'Permission assigned',
          entityType: 'Role',
          entityId: roleId,
          description: `Assigned permission ${permissionId} to role ${roleId}.`,
          metadata: { roleId, permissionId }
        });
      }

      return { success: true, mapping: newMapping };
    }

    /**
     * Remove a permission from a role
     * @param {string} roleId
     * @param {string} permissionId
     * @returns {{ success: boolean, error?: string }}
     */
    removePermission(roleId, permissionId) {
      if (!roleId || !permissionId) {
        return { success: false, error: 'Role ID and Permission ID are required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const initialCount = (db.rolePermissions || []).length;

      db.rolePermissions = (db.rolePermissions || []).filter(
        rp => !(rp.roleId === roleId && rp.permissionId === permissionId)
      );

      if (db.rolePermissions.length < initialCount) {
        dbService.saveDatabase(db);
        console.info(`[RolePermissionService] Removed permission ${permissionId} from role ${roleId}.`);
      }

      return { success: true };
    }

    /**
     * Synchronize a role's assigned permissions with a complete array of permission IDs
     * Adds missing permissions, removes unselected permissions, prevents duplicates
     * @param {string} roleId
     * @param {Array<string>} permissionIds
     * @returns {{ success: boolean, permissions: Array<Object>, error?: string }}
     */
    setPermissions(roleId, permissionIds = []) {
      if (!roleId) {
        return { success: false, error: 'Role ID is required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.rolePermissions = db.rolePermissions || [];

      // Clean & deduplicate target permission IDs
      const targetPermIds = new Set((permissionIds || []).filter(Boolean));

      // Remove permissions not in the target set for this role
      db.rolePermissions = db.rolePermissions.filter(rp => {
        if (rp.roleId !== roleId) return true;
        return targetPermIds.has(rp.permissionId);
      });

      // Find which target permissions are already present
      const currentPermIds = new Set(
        db.rolePermissions.filter(rp => rp.roleId === roleId).map(rp => rp.permissionId)
      );

      const generateId = (window.HRM && window.HRM.generateId)
        ? window.HRM.generateId
        : (prefix => `${prefix}_${Date.now()}`);

      const now = new Date().toISOString();

      // Add newly selected permissions
      targetPermIds.forEach(permissionId => {
        if (!currentPermIds.has(permissionId)) {
          db.rolePermissions.push({
            id: generateId('rp'),
            roleId,
            permissionId,
            createdAt: now
          });
        }
      });

      dbService.saveDatabase(db);
      console.info(`[RolePermissionService] Synchronized permissions for role ${roleId} (${targetPermIds.size} permissions).`);

      if (window.HRM && window.HRM.AuditService) {
        const roles = db.roles || [];
        const role = roles.find(r => r.id === roleId);
        const roleName = role ? role.name : roleId;
        window.HRM.AuditService.log({
          action: 'Permission assigned',
          entityType: 'Role',
          entityId: roleId,
          description: `Assigned ${targetPermIds.size} permissions to role "${roleName}".`,
          metadata: { roleId, count: targetPermIds.size }
        });
      }

      return { success: true, permissions: this.getPermissionsForRole(roleId) };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.RolePermissionService = new RolePermissionService();
  window.RolePermissionService = window.HRM.RolePermissionService;
})();
