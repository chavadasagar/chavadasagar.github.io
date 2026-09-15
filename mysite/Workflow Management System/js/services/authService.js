/**
 * ==================================================
 * AUTH SERVICE
 * Manages Authentication and Session Lifecycle
 * Storage Key: current_session
 * ==================================================
 * 
 * ⚠️ SECURITY NOTE & ARCHITECTURAL ISOLATION:
 * This is a client-side frontend demo authentication service.
 * In a production enterprise deployment, authentication must be 
 * delegated to a secure backend identity provider (e.g. ASP.NET Core 
 * Identity, OAuth2/OIDC, JWT Bearer tokens with HttpOnly secure cookies).
 * 
 * This service is deliberately isolated so that replacing it with an 
 * ASP.NET Core API client requires zero changes to the UI layer.
 * ==================================================
 */

(function () {
  'use strict';

  const SESSION_KEY = 'current_session';

  class AuthService {
    constructor() {
      this.currentSession = null;
      this._loadSession();
    }

    /**
     * Internal: Load session from StorageService
     */
    _loadSession() {
      try {
        const storage = (window.HRM && window.HRM.StorageService) ? window.HRM.StorageService : window.StorageService;
        const raw = storage ? storage.getItem(SESSION_KEY) : null;
        if (raw) {
          this.currentSession = JSON.parse(raw);
        } else {
          this.currentSession = null;
        }
      } catch (err) {
        console.warn('[AuthService] Error reading session from storage:', err);
        this.currentSession = null;
      }
    }

    /**
     * Internal: Persist session to StorageService
     * @param {Object|null} session
     */
    _persistSession(session) {
      try {
        const storage = (window.HRM && window.HRM.StorageService) ? window.HRM.StorageService : window.StorageService;
        if (session) {
          if (storage) storage.setItem(SESSION_KEY, JSON.stringify(session));
          this.currentSession = session;
        } else {
          if (storage) storage.removeItem(SESSION_KEY);
          this.currentSession = null;
        }
        return true;
      } catch (err) {
        console.error('[AuthService] Failed to persist session:', err);
        return false;
      }
    }

    /**
     * Authenticate user against database credentials
     * @param {string} email
     * @param {string} password
     * @returns {{ success: boolean, user?: Object, error?: string }}
     */
    login(email, password) {
      if (!email || !password) {
        return { success: false, error: 'Please enter both email and password.' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const dbService = window.HRM ? window.HRM.DatabaseService : null;

      if (!dbService) {
        return { success: false, error: 'Database service is unavailable.' };
      }

      const db = dbService.getDatabase();
      const users = db.users || [];

      // Find user by email (case-insensitive)
      const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

      if (!user) {
        return { success: false, error: 'Invalid email address or user not found.' };
      }

      if (user.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      if (user.status && user.status.toLowerCase() !== 'active') {
        return { success: false, error: 'Your account is inactive. Please contact HR.' };
      }

      // Generate Session object: { id, userId, loginAt }
      const generateId = (window.HRM && window.HRM.generateId) 
        ? window.HRM.generateId 
        : (prefix => `${prefix}_${Date.now()}`);

      const session = {
        id: generateId('sess'),
        userId: user.id,
        loginAt: new Date().toISOString()
      };

      this._persistSession(session);

      if (window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          userId: user.id,
          action: 'Login',
          entityType: 'User',
          entityId: user.id,
          description: `User ${user.name} (${user.email}) logged in successfully.`,
          metadata: { email: user.email }
        });
      }

      console.info(`[AuthService] User ${user.name} (${user.email}) successfully logged in.`);
      return { success: true, user: this.getCurrentUser() };
    }

    /**
     * Terminate active session and clear storage
     */
    logout() {
      const user = this.getCurrentUser();
      if (user && window.HRM && window.HRM.AuditService) {
        window.HRM.AuditService.log({
          userId: user.id,
          action: 'Logout',
          entityType: 'User',
          entityId: user.id,
          description: `User ${user.name} (${user.email}) logged out.`,
          metadata: { email: user.email }
        });
      }

      this._persistSession(null);

      console.info(`[AuthService] User ${user ? user.email : 'Unknown'} logged out.`);

      if (window.HRM && window.HRM.Toast) {
        window.HRM.Toast.info('You have been logged out safely.', 'Session Ended');
      }

      // Redirect to login page
      if (window.HRM && window.HRM.Router) {
        window.HRM.Router.navigate('#/login');
      } else {
        window.location.hash = '#/login';
      }
    }

    /**
     * Retrieves full user profile of the currently logged-in user
     * @returns {Object|null}
     */
    getCurrentUser() {
      this._loadSession();
      if (!this.currentSession || !this.currentSession.userId) {
        return null;
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return null;

      const db = dbService.getDatabase();
      const users = db.users || [];
      const user = users.find(u => u.id === this.currentSession.userId);

      if (!user) {
        // Stale session with deleted user
        this._persistSession(null);
        return null;
      }

      // Attach resolved roles for convenience
      const roles = (typeof dbService.getUserRoles === 'function')
        ? dbService.getUserRoles(user.id)
        : [];

      return {
        ...user,
        roles
      };
    }

    /**
     * Checks whether an active valid session is present
     * @returns {boolean}
     */
    isAuthenticated() {
      return this.getCurrentUser() !== null;
    }

    /**
     * Returns raw session object
     * @returns {Object|null}
     */
    getSession() {
      this._loadSession();
      return this.currentSession;
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.AuthService = new AuthService();
  window.AuthService = window.HRM.AuthService;
})();
