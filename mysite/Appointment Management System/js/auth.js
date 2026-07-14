/**
 * auth.js - Client-side Auth & Role Guard System
 */

const AUTH_SESSION_KEY = 'clinic_user_session';

const AUTH = {
  login(email, password) {
    // Rely on window.DB which is loaded before this script
    if (!window.DB) {
      console.error("DB script is not loaded yet.");
      return { success: false, error: "Database not loaded." };
    }

    const users = window.DB.get(window.DB_COLLECTIONS.USERS);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (user) {
      // Store session
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        linkedId: user.linkedId
      }));
      return { success: true, user };
    }
    
    return { success: false, error: "Invalid email or password." };
  },

  logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    // Find the relative path to index.html depending on where we are
    const pathDepth = window.location.pathname.split('/').filter(p => p).length;
    // Since index.html is at root and role folders are nested 1 level:
    // /index.html has pathDepth 0 or 1
    // /patient/my-appointments.html has pathDepth 2
    let rootPath = '../';
    const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html') || window.location.pathname.split('/').pop() === '';
    
    if (isRoot) {
      rootPath = './';
    }
    
    window.location.href = rootPath + 'login.html';
  },

  getCurrentUser() {
    const session = localStorage.getItem(AUTH_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  checkRole(allowedRoles) {
    const user = this.getCurrentUser();
    
    // Determine path back to root
    const isSubDir = window.location.pathname.includes('/patient/') || 
                     window.location.pathname.includes('/doctor/') || 
                     window.location.pathname.includes('/receptionist/') || 
                     window.location.pathname.includes('/admin/');
    const redirectPrefix = isSubDir ? '../' : './';

    if (!user) {
      // Unauthenticated, redirect to login
      window.location.href = redirectPrefix + 'login.html?returnUrl=' + encodeURIComponent(window.location.pathname + window.location.search);
      return false;
    }

    if (!allowedRoles.includes(user.role)) {
      // Unauthorized, redirect to home or landing page
      window.location.href = redirectPrefix + 'index.html?error=unauthorized';
      return false;
    }

    return true;
  },

  // Helper to redirect to dashboard depending on role
  redirectToDashboard(role) {
    switch (role) {
      case 'Patient':
        window.location.href = './patient/doctor-search.html';
        break;
      case 'Doctor':
        window.location.href = './doctor/dashboard.html';
        break;
      case 'Receptionist':
        window.location.href = './receptionist/front-desk.html';
        break;
      case 'ClinicAdmin':
        window.location.href = './admin/reports.html';
        break;
      default:
        window.location.href = './index.html';
    }
  }
};

window.AUTH = AUTH;
