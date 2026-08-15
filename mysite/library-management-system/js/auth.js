/**
 * AUTH.JS
 * Authentication and session persistence manager.
 */
const auth = {
    // Current user key for Storage
    SESSION_KEY: 'lms_current_user',
    REMEMBER_KEY: 'lms_remember_user',

    login(email, password, rememberMe = false) {
        // Initialize DB in case it's not seeded yet
        db.seedDatabase();

        const staffList = db.find('staff');
        const user = staffList.find(s => s.email.toLowerCase() === email.toLowerCase() && s.password === password);

        if (!user) {
            return { success: false, message: 'Invalid email or password' };
        }

        if (user.status !== 'Active') {
            return { success: false, message: 'Your staff account is suspended. Contact admin.' };
        }

        // Exclude password from stored user session details
        const sessionUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            branchId: user.branchId
        };

        const storageType = rememberMe ? localStorage : sessionStorage;
        storageType.setItem(this.SESSION_KEY, JSON.stringify(sessionUser));
        
        if (rememberMe) {
            localStorage.setItem(this.REMEMBER_KEY, 'true');
        } else {
            localStorage.removeItem(this.REMEMBER_KEY);
        }

        return { success: true, user: sessionUser };
    },

    redirect(target) {
        // Meta refresh redirect to bypass unique security origin block on file://
        const meta = document.createElement('meta');
        meta.httpEquiv = "refresh";
        meta.content = `0;url=${target}`;
        document.head.appendChild(meta);
        
        // Fallback for standard servers
        window.location.href = target;
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.REMEMBER_KEY);
        this.redirect('../login.html');
    },

    getCurrentUser() {
        const sessionUser = sessionStorage.getItem(this.SESSION_KEY) || localStorage.getItem(this.SESSION_KEY);
        return sessionUser ? JSON.parse(sessionUser) : null;
    },

    isAuthenticated() {
        return this.getCurrentUser() !== null;
    },

    // Standard redirect router guard
    authGuard() {
        if (!this.isAuthenticated()) {
            const pathParts = window.location.pathname.split('/');
            const isSubPage = pathParts.includes('pages');
            const target = isSubPage ? '../login.html' : 'login.html';
            this.redirect(target);
            return;
        }

        const pathParts = window.location.pathname.split('/');
        let pageName = pathParts[pathParts.length - 1].replace('.html', '').toLowerCase();
        if (!pageName) pageName = 'index';

        const moduleName = this.getPageModule(pageName);
        if (moduleName) {
            if (!this.hasPermission(moduleName, 'view')) {
                const isSubPage = pathParts.includes('pages');
                const target = isSubPage ? '../dashboard.html' : './dashboard.html';
                sessionStorage.setItem('lms_auth_warning', 'Access Denied: You do not have permission to view this page.');
                this.redirect(target);
            }
        }
    },

    getPageModule(pageName) {
        const pageToModule = {
            'index': 'dashboard',
            'dashboard': 'dashboard',
            'books': 'books',
            'copies': 'copies',
            'loans': 'loans',
            'members': 'members',
            'reservations': 'reservations',
            'authors': 'authors',
            'categories': 'categories',
            'publishers': 'publishers',
            'branches': 'branches',
            'reviews': 'reviews',
            'reports': 'reports',
            'settings': 'settings',
            'roles': 'settings',
            'staff': 'settings'
        };
        return pageToModule[pageName] || null;
    },

    // Enforce admin permission for sensitive settings/operations
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'Admin';
    },

    hasPermission(moduleName, action) {
        const user = this.getCurrentUser();
        if (!user) return false;

        // Admin has all permissions
        if (user.role === 'Admin') return true;

        // Find the role definition in the DB
        if (!window.db) return false;
        const roles = window.db.find('roles');
        const userRole = roles.find(r => r.name === user.role);
        if (!userRole || !userRole.permissions) return false;

        const perms = userRole.permissions[moduleName];
        return perms ? perms.includes(action) : false;
    }
};

// Expose to window for global access
window.auth = auth;
