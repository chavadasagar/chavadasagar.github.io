/**
 * ==================================================
 * AUTHORIZATION SERVICE
 * Role-Based Access Control (RBAC) Engine
 * Multi-Role Permission Union, Super Admin Bypass & Permission Checks
 * ==================================================
 */

(function () {
  'use strict';

  class AuthorizationService {
    /**
     * Get all active roles assigned to a user
     * @param {string} userId
     * @returns {Array<Object>} Array of role objects
     */
    getUserRoles(userId) {
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
        .filter(r => r && (r.status || 'Active').toLowerCase() === 'active');
    }

    /**
     * Check if a user holds a specific role by code
     * @param {string} userId
     * @param {string} roleCode
     * @returns {boolean}
     */
    hasRole(userId, roleCode) {
      if (!userId || !roleCode) return false;
      const cleanCode = roleCode.trim().toUpperCase();
      const roles = this.getUserRoles(userId);
      return roles.some(r => (r.code || '').toUpperCase() === cleanCode);
    }

    /**
     * Check if a user is a Super Admin
     * @param {string} userId
     * @returns {boolean}
     */
    isSuperAdmin(userId) {
      if (!userId) return false;
      const roles = this.getUserRoles(userId);
      return roles.some(r => {
        const code = (r.code || '').toUpperCase();
        return code === 'SUPER_ADMIN' || code === 'ADMIN' || r.isSystem === true;
      });
    }

    /**
     * Get all effective permissions for a user (Mathematical UNION across all roles)
     * If Super Admin, returns ALL system permissions.
     * @param {string} userId
     * @returns {Array<Object>} Distinct list of permission objects
     */
    getUserPermissions(userId) {
      if (!userId) return [];
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const allPermissions = db.permissions || [];

      // Centralized Super Admin bypass (Requirement 7)
      if (this.isSuperAdmin(userId)) {
        return allPermissions;
      }

      // Resolve roles for user
      const userRoles = this.getUserRoles(userId);
      if (userRoles.length === 0) return [];

      const rolePermissions = db.rolePermissions || [];
      const permMap = new Map(allPermissions.map(p => [p.id, p]));

      // Gather distinct permissions from ALL assigned roles (UNION)
      const userRoleIds = new Set(userRoles.map(r => r.id));
      const grantedPermIds = new Set();
      const distinctPermissions = [];

      rolePermissions.forEach(rp => {
        if (userRoleIds.has(rp.roleId) && !grantedPermIds.has(rp.permissionId)) {
          const perm = permMap.get(rp.permissionId);
          if (perm) {
            grantedPermIds.add(rp.permissionId);
            distinctPermissions.push(perm);
          }
        }
      });

      return distinctPermissions;
    }

    /**
     * Check if a user has a specific permission
     * @param {string} userId
     * @param {string} permissionCode
     * @returns {boolean}
     */
    hasPermission(userId, permissionCode) {
      if (!userId || !permissionCode) return false;

      // Centralized Super Admin bypass (Requirement 7)
      if (this.isSuperAdmin(userId)) {
        return true;
      }

      const cleanCode = permissionCode.trim().toLowerCase();
      const permissions = this.getUserPermissions(userId);
      return permissions.some(p => (p.code || '').toLowerCase() === cleanCode);
    }

    /**
     * Check if currently logged in user has a specific permission
     * Used across UI elements, button guards, and route authorization
     * @param {string} permissionCode
     * @returns {boolean}
     */
    can(permissionCode) {
      if (!permissionCode) return false;
      const auth = window.HRM ? window.HRM.AuthService : null;
      const user = auth ? auth.getCurrentUser() : null;
      if (!user) return false;
      return this.hasPermission(user.id, permissionCode);
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.AuthorizationService = new AuthorizationService();
  window.AuthorizationService = window.HRM.AuthorizationService;
})();
