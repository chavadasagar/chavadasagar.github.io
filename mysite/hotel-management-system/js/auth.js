/**
 * auth.js - Login, session handling, and role-based permissions
 */

const auth = {
  // Try login
  login(username, password) {
    const users = window.db.getAll('users');
    const user = users.find(u => u.username === username.trim() && u.password === password);
    
    if (user) {
      // Store in sessionStorage
      sessionStorage.setItem('hms_session', JSON.stringify({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }));
      window.utils.showToast(`Welcome back, ${user.name}! ✅`, 'success');
      return true;
    }
    window.utils.showToast("Invalid username or password ❌", 'error');
    return false;
  },

  // Get active session
  getCurrentUser() {
    const session = sessionStorage.getItem('hms_session');
    return session ? JSON.parse(session) : null;
  },

  // Logout
  logout() {
    sessionStorage.removeItem('hms_session');
    window.utils.showToast("Logged out successfully", 'info');
    // Force view reload
    window.location.reload();
  },

  // Check if current user has permission for a specific module
  hasPermission(moduleName) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const role = user.role;
    if (role === 'Admin') return true; // Admin gets everything
    
    if (role === 'Manager') {
      // Manager gets everything except system settings
      return moduleName !== 'settings';
    }
    
    if (role === 'Receptionist') {
      // Receptionist gets dashboard, bookings, guests, billing, and rooms (read-only)
      return ['dashboard', 'bookings', 'guests', 'billing', 'rooms'].includes(moduleName);
    }
    
    if (role === 'Housekeeping Staff') {
      // Housekeeping gets dashboard, housekeeping, and maintenance
      return ['dashboard', 'housekeeping', 'maintenance'].includes(moduleName);
    }
    
    return false;
  }
};

window.auth = auth;
