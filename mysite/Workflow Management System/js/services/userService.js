/**
 * ==================================================
 * USER SERVICE
 * Manages user CRUD, soft deactivation, and password updates
 * Backed by DatabaseService (hrm_database)
 * ==================================================
 */

(function () {
  'use strict';

  class UserService {
    /**
     * Get all users enriched with their assigned roles
     * @returns {Array<Object>}
     */
    getAll() {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const users = db.users || [];

      return users.map(user => {
        const roles = (typeof dbService.getUserRoles === 'function')
          ? dbService.getUserRoles(user.id)
          : [];
        return {
          ...user,
          roles
        };
      });
    }

    /**
     * Get user by ID
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
      if (!id) return null;
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return null;

      const db = dbService.getDatabase();
      const user = (db.users || []).find(u => u.id === id);
      if (!user) return null;

      const roles = (typeof dbService.getUserRoles === 'function')
        ? dbService.getUserRoles(user.id)
        : [];

      return {
        ...user,
        roles
      };
    }

    /**
     * Create a new user with validation
     * @param {Object} data
     * @param {string} data.name
     * @param {string} data.email
     * @param {string} data.employeeCode
     * @param {string} data.password
     * @param {string} [data.status='Active']
     * @returns {{ success: boolean, user?: Object, error?: string }}
     */
    create(data) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) {
        return { success: false, error: 'Database service is unavailable.' };
      }

      const { name, email, employeeCode, password, status = 'Active' } = data || {};

      // 1. Validation: Name required
      if (!name || !name.trim()) {
        return { success: false, error: 'Name is required.' };
      }

      // 2. Validation: Email required and valid format
      if (!email || !email.trim()) {
        return { success: false, error: 'Email is required.' };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = email.trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      // 3. Validation: Employee Code required
      if (!employeeCode || !employeeCode.trim()) {
        return { success: false, error: 'Employee Code is required.' };
      }
      const cleanCode = employeeCode.trim().toUpperCase();

      // 4. Validation: Password required for new user
      if (!password || !password.trim()) {
        return { success: false, error: 'Password is required for new users.' };
      }

      const db = dbService.getDatabase();
      const users = db.users || [];

      // 5. Validation: Email must be unique (case-insensitive)
      const existingEmail = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
      if (existingEmail) {
        return { success: false, error: `Email "${cleanEmail}" is already registered.` };
      }

      // Generate entity IDs
      const generateId = (window.HRM && window.HRM.generateId) 
        ? window.HRM.generateId 
        : (prefix => `${prefix}_${Date.now()}`);

      const now = new Date().toISOString();
      const normalizedStatus = (status && status.toLowerCase() === 'inactive') ? 'Inactive' : 'Active';

      const newUser = {
        id: generateId('usr'),
        employeeCode: cleanCode,
        name: name.trim(),
        email: cleanEmail,
        password: password.trim(),
        status: normalizedStatus,
        createdAt: now
      };

      // Add to users
      users.push(newUser);
      db.users = users;
      dbService.saveDatabase(db);

      // Assign roles: if roleIds is provided, assign via UserRoleService; else default to EMPLOYEE
      if (Array.isArray(data.roleIds) && data.roleIds.length > 0) {
        if (window.HRM && window.HRM.UserRoleService) {
          window.HRM.UserRoleService.setRoles(newUser.id, data.roleIds);
        }
      } else {
        const roles = db.roles || [];
        const defaultRole = roles.find(r => r.code === 'EMPLOYEE') || roles[0];
        if (defaultRole) {
          if (window.HRM && window.HRM.UserRoleService) {
            window.HRM.UserRoleService.assignRole(newUser.id, defaultRole.id);
          } else {
            db.userRoles = db.userRoles || [];
            db.userRoles.push({
              id: generateId('ur'),
              userId: newUser.id,
              roleId: defaultRole.id,
              createdAt: now
            });
            dbService.saveDatabase(db);
          }
        }
      }

      console.info(`[UserService] Created user ${newUser.name} (${newUser.id}).`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'User created',
          entityType: 'User',
          entityId: newUser.id,
          description: `Created user ${newUser.name} (${newUser.email}, ${newUser.employeeCode}).`,
          metadata: { email: newUser.email, employeeCode: newUser.employeeCode }
        });
      }

      return { success: true, user: this.getById(newUser.id) };
    }

    /**
     * Update existing user (does not touch password)
     * @param {string} id
     * @param {Object} data
     * @param {string} data.name
     * @param {string} data.email
     * @param {string} data.employeeCode
     * @param {string} [data.status]
     * @returns {{ success: boolean, user?: Object, error?: string }}
     */
    update(id, data) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) {
        return { success: false, error: 'Database service is unavailable.' };
      }

      if (!id) {
        return { success: false, error: 'User ID is required.' };
      }

      const { name, email, employeeCode, status } = data || {};

      // 1. Validation: Name required
      if (!name || !name.trim()) {
        return { success: false, error: 'Name is required.' };
      }

      // 2. Validation: Email required and valid
      if (!email || !email.trim()) {
        return { success: false, error: 'Email is required.' };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = email.trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      // 3. Validation: Employee code required
      if (!employeeCode || !employeeCode.trim()) {
        return { success: false, error: 'Employee Code is required.' };
      }
      const cleanCode = employeeCode.trim().toUpperCase();

      const db = dbService.getDatabase();
      const users = db.users || [];
      const userIndex = users.findIndex(u => u.id === id);

      if (userIndex === -1) {
        return { success: false, error: 'User not found.' };
      }

      // 4. Validation: Email must be unique excluding this user
      const duplicateEmail = users.find(u => u.id !== id && u.email && u.email.toLowerCase() === cleanEmail);
      if (duplicateEmail) {
        return { success: false, error: `Email "${cleanEmail}" is already in use by another user.` };
      }

      const existing = users[userIndex];
      const normalizedStatus = status 
        ? ((status.toLowerCase() === 'inactive') ? 'Inactive' : 'Active')
        : existing.status;

      // Update fields while preserving existing password and createdAt
      users[userIndex] = {
        ...existing,
        name: name.trim(),
        email: cleanEmail,
        employeeCode: cleanCode,
        status: normalizedStatus,
        updatedAt: new Date().toISOString()
      };

      db.users = users;
      dbService.saveDatabase(db);

      // Synchronize roles if roleIds array is provided
      if (Array.isArray(data.roleIds)) {
        if (window.HRM && window.HRM.UserRoleService) {
          window.HRM.UserRoleService.setRoles(id, data.roleIds);
        }
      }

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'User updated',
          entityType: 'User',
          entityId: id,
          description: `Updated user profile for ${name.trim()} (${cleanEmail}).`,
          metadata: { email: cleanEmail, status: normalizedStatus }
        });
      }

      console.info(`[UserService] Updated user ${id} (${cleanEmail}).`);

      return { success: true, user: this.getById(id) };
    }

    /**
     * Soft-deactivate a user (sets status to 'Inactive')
     * @param {string} id
     * @returns {{ success: boolean, error?: string }}
     */
    deactivate(id) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const user = (db.users || []).find(u => u.id === id);

      if (!user) {
        return { success: false, error: 'User not found.' };
      }

      user.status = 'Inactive';
      user.updatedAt = new Date().toISOString();

      dbService.saveDatabase(db);
      console.info(`[UserService] Deactivated user ${id}.`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'User updated',
          entityType: 'User',
          entityId: id,
          description: `Deactivated user ${user.name} (${user.email}).`,
          metadata: { status: 'Inactive' }
        });
      }

      return { success: true };
    }

    /**
     * Activate a user (sets status to 'Active')
     * @param {string} id
     * @returns {{ success: boolean, error?: string }}
     */
    activate(id) {
      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const user = (db.users || []).find(u => u.id === id);

      if (!user) {
        return { success: false, error: 'User not found.' };
      }

      user.status = 'Active';
      user.updatedAt = new Date().toISOString();

      dbService.saveDatabase(db);
      console.info(`[UserService] Activated user ${id}.`);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          action: 'User updated',
          entityType: 'User',
          entityId: id,
          description: `Activated user ${user.name} (${user.email}).`,
          metadata: { status: 'Active' }
        });
      }

      return { success: true };
    }

    /**
     * Update user password separately from edit form
     * @param {string} id
     * @param {string} password
     * @returns {{ success: boolean, error?: string }}
     */
    changePassword(id, password) {
      if (!id) return { success: false, error: 'User ID is required.' };
      if (!password || !password.trim()) {
        return { success: false, error: 'New password cannot be empty.' };
      }
      if (password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters long.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      const user = (db.users || []).find(u => u.id === id);

      if (!user) {
        return { success: false, error: 'User not found.' };
      }

      user.password = password.trim();
      user.updatedAt = new Date().toISOString();

      dbService.saveDatabase(db);
      console.info(`[UserService] Password changed for user ${id}.`);
      return { success: true };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.UserService = new UserService();
  window.UserService = window.HRM.UserService;
})();
