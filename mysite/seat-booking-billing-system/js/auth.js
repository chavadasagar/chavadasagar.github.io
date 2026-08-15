/**
 * Library Seat Booking & Billing System - Authentication Module (auth.js)
 * Manages active user sessions, login processes, password changes, and account setup.
 */

(function () {
  // Global Namespace
  window.Auth = {
    /**
     * Authenticate user credentials.
     * Returns a Promise resolving to { success: boolean, message?: string }
     */
    login: async function (username, password) {
      if (!username || !password) {
        return { success: false, message: 'Please enter both username and password.' };
      }

      // Load users
      const users = DB.getAll(DB.KEYS.USERS);
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!user) {
        return { success: false, message: 'Invalid username or password.' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Your account is deactivated. Contact Administrator.' };
      }

      // Hash input password and compare
      const inputHash = await DB.hashPassword(password);
      if (user.passwordHash !== inputHash) {
        return { success: false, message: 'Invalid username or password.' };
      }

      // Establish session
      const session = {
        role: user.isAdmin ? 'admin' : 'user',
        userId: user.id,
        loggedInAt: new Date().toISOString()
      };
      DB.saveAll(DB.KEYS.SESSION, session);

      return { success: true, user };
    },

    /**
     * Terminate the active session.
     */
    logout: function () {
      localStorage.removeItem(DB.KEYS.SESSION);
    },

    /**
     * Get the active session details.
     */
    getCurrentSession: function () {
      const data = localStorage.getItem(DB.KEYS.SESSION);
      return data ? JSON.parse(data) : null;
    },

    /**
     * Get detailed object of currently logged in user.
     */
    getCurrentUser: function () {
      const session = this.getCurrentSession();
      if (!session) return null;
      return DB.getById(DB.KEYS.USERS, session.userId);
    },

    /**
     * Create a user account (Admin-only action).
     * Returns { success: boolean, message?: string, user?: object }
     */
    createUser: async function (name, username, password, contact) {
      if (!name || !username || !password || !contact) {
        return { success: false, message: 'All fields are required.' };
      }

      const users = DB.getAll(DB.KEYS.USERS);
      const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        return { success: false, message: `Username "${username}" is already taken.` };
      }

      const passwordHash = await DB.hashPassword(password);
      const newUser = {
        id: DB.generateId('usr'),
        name: name.trim(),
        username: username.trim().toLowerCase(),
        passwordHash: passwordHash,
        contact: contact.trim(),
        createdAt: new Date().toISOString(),
        isActive: true,
        isAdmin: false
      };

      DB.insert(DB.KEYS.USERS, newUser);
      return { success: true, user: newUser };
    },

    /**
     * Change password for a specific user.
     */
    changePassword: async function (userId, oldPassword, newPassword) {
      const user = DB.getById(DB.KEYS.USERS, userId);
      if (!user) {
        return { success: false, message: 'User not found.' };
      }

      // If user is Admin and matches default 'admin' / 'admin123', they might skip old password check in some contexts,
      // but let's enforce standard password validation for safety.
      const oldHash = await DB.hashPassword(oldPassword);
      if (user.passwordHash !== oldHash) {
        return { success: false, message: 'Incorrect current password.' };
      }

      const newHash = await DB.hashPassword(newPassword);
      DB.update(DB.KEYS.USERS, userId, { passwordHash: newHash });

      return { success: true, message: 'Password changed successfully.' };
    }
  };
})();
