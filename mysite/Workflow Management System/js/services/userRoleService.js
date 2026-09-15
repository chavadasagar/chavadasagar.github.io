/**
 * ==================================================
 * USER ROLE SERVICE
 * Manages Many-to-Many User-Role Associations (userRoles)
 * Backed by DatabaseService (hrm_database.userRoles)
 * ==================================================
 */

(function () {
  'use strict';

  class UserRoleService {
    /**
     * Get all roles assigned to a specific user
     * @param {string} userId
     * @returns {Array<Object>} Array of role objects
     */
    getRolesForUser(userId) {
      if (!userId) return [];
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const userRoles = db.userRoles || [];
      const roles = db.roles || [];

      const roleMap = new Map(roles.map(r => [r.id, r]));
      return userRoles
        .filter(ur => ur.userId === userId)
        .map(ur => roleMap.get(ur.roleId))
        .filter(Boolean);
    }

    /**
     * Get all users assigned a specific role
     * @param {string} roleId
     * @returns {Array<Object>} Array of user objects
     */
    getUsersForRole(roleId) {
      if (!roleId) return [];
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const userRoles = db.userRoles || [];
      const users = db.users || [];

      const userMap = new Map(users.map(u => [u.id, u]));
      return userRoles
        .filter(ur => ur.roleId === roleId)
        .map(ur => userMap.get(ur.userId))
        .filter(Boolean);
    }

    /**
     * Check if a user currently has a specific role
     * @param {string} userId
     * @param {string} roleId
     * @returns {boolean}
     */
    hasRole(userId, roleId) {
      if (!userId || !roleId) return false;
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return false;

      const db = dbService.getDatabase();
      const userRoles = db.userRoles || [];
      return userRoles.some(ur => ur.userId === userId && ur.roleId === roleId);
    }

    /**
     * Assign a role to a user (with Duplicate Protection)
     * A user cannot have the same role twice.
     * @param {string} userId
     * @param {string} roleId
     * @returns {{ success: boolean, mapping?: Object, duplicate?: boolean, error?: string }}
     */
    assignRole(userId, roleId) {
      if (!userId || !roleId) {
        return { success: false, error: 'User ID and Role ID are required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.userRoles = db.userRoles || [];

      // Duplicate Protection: check if mapping already exists
      const existing = db.userRoles.find(ur => ur.userId === userId && ur.roleId === roleId);
      if (existing) {
        return { success: true, mapping: existing, duplicate: true };
      }

      const generateId = (window.HRM && window.HRM.generateId)
        ? window.HRM.generateId
        : (prefix => `${prefix}_${Date.now()}`);

      const newMapping = {
        id: generateId('ur'),
        userId,
        roleId,
        createdAt: new Date().toISOString()
      };

      db.userRoles.push(newMapping);
      dbService.saveDatabase(db);
      console.info(`[UserRoleService] Assigned role ${roleId} to user ${userId}.`);

      return { success: true, mapping: newMapping };
    }

    /**
     * Remove a role from a user
     * @param {string} userId
     * @param {string} roleId
     * @returns {{ success: boolean, error?: string }}
     */
    removeRole(userId, roleId) {
      if (!userId || !roleId) {
        return { success: false, error: 'User ID and Role ID are required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const initialCount = (db.userRoles || []).length;

      db.userRoles = (db.userRoles || []).filter(ur => !(ur.userId === userId && ur.roleId === roleId));

      if (db.userRoles.length < initialCount) {
        dbService.saveDatabase(db);
        console.info(`[UserRoleService] Removed role ${roleId} from user ${userId}.`);
      }

      return { success: true };
    }

    /**
     * Synchronize a user's assigned roles with a complete array of role IDs
     * Adds missing roles, removes unselected roles, prevents duplicates
     * @param {string} userId
     * @param {Array<string>} roleIds
     * @returns {{ success: boolean, roles: Array<Object>, error?: string }}
     */
    setRoles(userId, roleIds = []) {
      if (!userId) {
        return { success: false, error: 'User ID is required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.userRoles = db.userRoles || [];

      // Clean & deduplicate target role IDs
      const targetRoleIds = new Set((roleIds || []).filter(Boolean));

      // Remove roles not in the target set for this user
      db.userRoles = db.userRoles.filter(ur => {
        if (ur.userId !== userId) return true;
        return targetRoleIds.has(ur.roleId);
      });

      // Find which target roles are already present
      const currentRoleIds = new Set(
        db.userRoles.filter(ur => ur.userId === userId).map(ur => ur.roleId)
      );

      const generateId = (window.HRM && window.HRM.generateId)
        ? window.HRM.generateId
        : (prefix => `${prefix}_${Date.now()}`);

      const now = new Date().toISOString();

      // Add newly selected roles
      targetRoleIds.forEach(roleId => {
        if (!currentRoleIds.has(roleId)) {
          db.userRoles.push({
            id: generateId('ur'),
            userId,
            roleId,
            createdAt: now
          });
        }
      });

      dbService.saveDatabase(db);
      console.info(`[UserRoleService] Synchronized roles for user ${userId} (${targetRoleIds.size} roles).`);

      return { success: true, roles: this.getRolesForUser(userId) };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.UserRoleService = new UserRoleService();
  window.UserRoleService = window.HRM.UserRoleService;
})();
