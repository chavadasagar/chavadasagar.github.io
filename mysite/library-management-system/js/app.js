/**
 * APP.JS
 * Main application initializer. Handles layout rendering, sidebar active states,
 * mobile nav toggling, theme switching, and global authentication checks.
 */

// Navigation Items Mapping
const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie', path: 'dashboard.html' },
    { id: 'books', label: 'Book Inventory', icon: 'fas fa-book', path: 'pages/books.html' },
    { id: 'copies', label: 'Book Copies', icon: 'fas fa-barcode', path: 'pages/copies.html' },
    { id: 'loans', label: 'Checkouts & Returns', icon: 'fas fa-exchange-alt', path: 'pages/loans.html' },
    { id: 'members', label: 'Members Directory', icon: 'fas fa-users', path: 'pages/members.html' },
    { id: 'reservations', label: 'Holds & Reserves', icon: 'fas fa-bookmark', path: 'pages/reservations.html' },
    { id: 'authors', label: 'Authors', icon: 'fas fa-feather-alt', path: 'pages/authors.html' },
    { id: 'categories', label: 'Categories', icon: 'fas fa-tags', path: 'pages/categories.html' },
    { id: 'publishers', label: 'Publishers', icon: 'fas fa-building', path: 'pages/publishers.html' },
    { id: 'branches', label: 'Branches', icon: 'fas fa-map-marker-alt', path: 'pages/branches.html' },
    { id: 'reviews', label: 'Reviews & Ratings', icon: 'fas fa-star', path: 'pages/reviews.html' },
    { id: 'reports', label: 'Reports & Exports', icon: 'fas fa-file-invoice-dollar', path: 'pages/reports.html' },
    { id: 'staff', label: 'Staff Registry', icon: 'fas fa-user-cog', path: 'pages/staff.html' },
    { id: 'roles', label: 'Role Permissions', icon: 'fas fa-user-shield', path: 'pages/roles.html' },
    { id: 'settings', label: 'System Settings', icon: 'fas fa-cog', path: 'pages/settings.html' }
];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Guard check - redirect if unauthorized
    auth.authGuard();

    // 2. Load storage seeder
    db.seedDatabase();

    // 3. Render common components
    initializeLayout();
});

function initializeLayout() {
    const layout = document.getElementById('app-layout');
    if (!layout) return; // Not an administrative page (e.g. login.html)

    const pathParts = window.location.pathname.split('/');
    const isSubPage = pathParts.includes('pages');
    const baseRel = isSubPage ? '../' : './';
    
    // Determine active menu item
    let activeId = 'dashboard';
    const pageName = pathParts[pathParts.length - 1].replace('.html', '');
    if (pageName && pageName !== 'dashboard') {
        activeId = pageName;
    }

    const currentUser = auth.getCurrentUser() || { name: 'Staff User', role: 'Staff' };

    // Get initials for profile avatar
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    // Build Sidebar HTML
    let sidebarHtml = `
        <div id="sidebar">
            <div class="logo-container">
                <i class="fas fa-book-reader logo-icon"></i>
                <span class="logo-text">AegisLib</span>
            </div>
            <ul class="nav-menu">
    `;

    navItems.forEach(item => {
        // Check permission before rendering sidebar link
        const moduleName = auth.getPageModule(item.id);
        if (moduleName && !auth.hasPermission(moduleName, 'view')) {
            return;
        }

        let link = baseRel + item.path;
        if (isSubPage) {
            if (item.path.startsWith('pages/')) {
                link = './' + item.path.replace('pages/', '');
            } else {
                link = '../' + item.path;
            }
        }
        const isActive = activeId === item.id ? 'active' : '';
        sidebarHtml += `
            <li>
                <a href="${link}" class="nav-item ${isActive}">
                    <i class="${item.icon}"></i>
                    <span>${item.label}</span>
                </a>
            </li>
        `;
    });

    sidebarHtml += `
            </ul>
            <div class="sidebar-footer">
                <div class="user-profile-summary">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <span class="user-name">${currentUser.name}</span>
                        <span class="user-role">${currentUser.role}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="sidebar-overlay" id="mobile-overlay"></div>
    `;

    // Create Main container if not present
    let mainContainer = document.getElementById('main-container');
    const existingContent = mainContainer ? mainContainer.innerHTML : layout.innerHTML;

    // Set navbar page title
    const activeItemObj = navItems.find(i => i.id === activeId);
    const pageTitle = activeItemObj ? activeItemObj.label : 'Library Portal';

    const headerHtml = `
        <header id="top-navbar">
            <div class="nav-left">
                <i class="fas fa-bars mobile-toggle" id="mobile-nav-toggle"></i>
                <h1 class="page-title">${pageTitle}</h1>
            </div>
            <div class="nav-right">
                <button class="theme-toggle-btn" id="theme-toggle" title="Toggle Light/Dark Mode">
                    <i class="fas fa-moon"></i>
                </button>
                <button class="nav-btn" id="logout-btn" title="Log Out">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        </header>
    `;

    // Inject everything into the page
    layout.innerHTML = sidebarHtml + `
        <div id="main-container">
            ${headerHtml}
            ${existingContent}
        </div>
    `;

    // Setup interactive logic for layout
    setupThemeToggle();
    setupLogout();
    setupMobileSidebar();
    modal.setupCloseHandlers();
}

function setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;
    
    const icon = themeBtn.querySelector('i');
    
    // Set initial theme
    const storedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', storedTheme);
    icon.className = storedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout();
        });
    }
}

function setupMobileSidebar() {
    const toggle = document.getElementById('mobile-nav-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (toggle && sidebar && overlay) {
        const show = () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        };
        const hide = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };

        toggle.addEventListener('click', show);
        overlay.addEventListener('click', hide);
    }
}
