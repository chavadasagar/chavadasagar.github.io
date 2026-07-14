/**
 * main.js - SPA Router, Theme controller, Role filtering, Navigation coordinator, Notification badge checks
 */

const mainApp = {
  activeModule: 'dashboard',

  init() {
    // 1. Theme handler
    this.initTheme();

    // 2. Auth checking
    const user = window.auth.getCurrentUser();
    if (!user) {
      this.renderLoginScreen();
      return;
    }

    // 3. Setup Shell Layout
    this.renderAppShell(user);

    // 4. Setup Routing listeners
    window.addEventListener('hashchange', () => this.handleRouting());
    
    // 5. Initial Routing
    this.handleRouting();

    // 6. Setup Notification checking cron
    this.checkNotifications();
    
    // 7. General bindings
    this.bindThemeToggle();
  },

  initTheme() {
    const savedTheme = localStorage.getItem('hms_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  },

  bindThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;
    
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('hms_theme', next);
      
      // Update toggle icon
      toggleBtn.innerHTML = next === 'dark' ? '☀️' : '🌙';
    });
  },

  renderLoginScreen() {
    document.body.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card card animate-fade-in">
          <div class="login-logo">🏨</div>
          <h2>StayEase HMS</h2>
          <p class="text-muted">Enter credentials to access hotel console</p>
          
          <form id="login-form" style="margin-top: 20px;">
            <div class="form-group">
              <label for="login-username">Username</label>
              <input type="text" id="login-username" required placeholder="admin, manager, recep, housekeeper">
            </div>
            
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" required placeholder="Password (e.g. admin123)">
            </div>

            <div class="demo-hints">
              <p><strong>Demo Logins (Password same as user + 123):</strong></p>
              <ul>
                <li>Admin: <code>admin</code> / <code>admin123</code></li>
                <li>Manager: <code>manager</code> / <code>manager123</code></li>
                <li>Receptionist: <code>recep</code> / <code>recep123</code></li>
                <li>Housekeeper: <code>housekeeper</code> / <code>housekeeper123</code></li>
              </ul>
            </div>
            
            <button type="submit" class="btn btn-primary btn-block">Log In to Console</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const userField = document.getElementById('login-username').value;
      const passField = document.getElementById('login-password').value;

      if (window.auth.login(userField, passField)) {
        setTimeout(() => window.location.reload(), 800);
      }
    });
  },

  renderAppShell(user) {
    const hotel = window.db.getAll('hotels')[0] || { name: 'StayEase Royal Plaza' };

    // Filter sidebar list items based on role
    const getNavItem = (hash, label, icon) => {
      const moduleName = hash.replace('#', '');
      if (!window.auth.hasPermission(moduleName)) return '';
      return `
        <li>
          <a href="${hash}" class="sidebar-link" id="nav-${moduleName}">
            <span class="nav-icon">${icon}</span>
            <span class="nav-label">${label}</span>
          </a>
        </li>
      `;
    };

    document.body.innerHTML = `
      <div class="app-layout">
        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="app-sidebar">
          <div class="sidebar-brand">
            <span class="logo">🏨</span>
            <span class="brand-text" id="hotel-brand-name">${hotel.name}</span>
          </div>

          <ul class="sidebar-nav">
            ${getNavItem('#dashboard', 'Dashboard', '📊')}
            ${getNavItem('#rooms', 'Rooms & Floor Grid', '🏢')}
            ${getNavItem('#bookings', 'Reservations', '📅')}
            ${getNavItem('#guests', 'Guest CRM', '👤')}
            ${getNavItem('#billing', 'Billing Invoices', '💰')}
            ${getNavItem('#services', 'Services & F&B', '🛎️')}
            ${getNavItem('#housekeeping', 'Housekeeping Queue', '🧹')}
            ${getNavItem('#inventory', 'Inventory Control', '📦')}
            ${getNavItem('#maintenance', 'Repairs & Facility', '🔧')}
            ${getNavItem('#reviews', 'Guest Reviews', '★')}
            ${getNavItem('#reports', 'Business Reports', '📈')}
            ${getNavItem('#settings', 'System Settings', '⚙️')}
          </ul>

          <div class="sidebar-footer">
            <button class="btn-sidebar-collapse" id="btn-sidebar-toggle">◀</button>
          </div>
        </aside>

        <!-- Right Side Frame -->
        <div class="main-frame">
          <!-- Top navbar -->
          <header class="topbar">
            <div class="topbar-left">
              <button class="hamburger-btn" id="btn-hamburger">☰</button>
              <h3 class="topbar-section-title" id="section-title">Dashboard</h3>
            </div>
            
            <div class="topbar-right">
              <!-- Theme switch -->
              <button class="topbar-action-btn" id="theme-toggle-btn" title="Toggle Theme">
                ${localStorage.getItem('hms_theme') === 'dark' ? '☀️' : '🌙'}
              </button>

              <!-- Notifications Alert Bell -->
              <div class="notification-bell-wrapper" id="bell-wrapper">
                <button class="topbar-action-btn" id="btn-notif-bell" title="Notifications">
                  🔔 <span class="notif-badge" id="notif-badge-count" style="display:none;">0</span>
                </button>
                <div class="notification-dropdown card" id="notif-dropdown" style="display:none;">
                  <h4>System Alerts</h4>
                  <ul class="notif-list" id="notif-list-items">
                    <li class="text-center text-muted" style="padding:15px; font-size:12px;">No active alerts</li>
                  </ul>
                </div>
              </div>

              <!-- User Session profile -->
              <div class="user-profile-badge">
                <div class="avatar">👤</div>
                <div class="user-meta-info">
                  <span class="u-name">${user.name}</span>
                  <span class="u-role">${user.role}</span>
                </div>
              </div>

              <!-- Log out button -->
              <button class="btn btn-sm btn-outline no-print" id="btn-logout">Logout</button>
            </div>
          </header>

          <!-- SPA content canvas -->
          <main class="content-canvas" id="app-content"></main>
        </div>
      </div>
    `;

    // Collapsible Sidebar bind
    const sidebar = document.getElementById('app-sidebar');
    const collapseBtn = document.getElementById('btn-sidebar-toggle');
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      collapseBtn.innerText = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    });

    // Mobile Hamburger
    const hamburger = document.getElementById('btn-hamburger');
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });

    // Logout bind
    document.getElementById('btn-logout').addEventListener('click', () => {
      window.auth.logout();
    });

    // Close notifications panel on outer click
    const bellWrapper = document.getElementById('bell-wrapper');
    const bellBtn = document.getElementById('btn-notif-bell');
    const notifDropdown = document.getElementById('notif-dropdown');

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (notifDropdown.style.display === 'block' && !bellWrapper.contains(e.target)) {
        notifDropdown.style.display = 'none';
      }
    });
  },

  handleRouting() {
    const hash = window.location.hash || '#dashboard';
    const moduleName = hash.replace('#', '');
    const container = document.getElementById('app-content');

    if (!container) return; // not initialized yet

    // Permissions check
    if (!window.auth.hasPermission(moduleName)) {
      window.utils.showToast("Access Denied: Insufficient Role Permissions. ❌", "error");
      window.location.hash = '#dashboard';
      return;
    }

    this.activeModule = moduleName;

    // Highlight active link in sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-${moduleName}`);
    if (activeLink) activeLink.classList.add('active');

    // Close mobile side drawer if open
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Update title tag & toolbar header
    const sectionTitles = {
      dashboard: 'Dashboard Overview',
      rooms: 'Rooms & Floor Layout',
      bookings: 'Reservations Engine',
      guests: 'Guest Relationship CRM',
      billing: 'Billing & Invoice Registers',
      services: 'Room Service & Catalog',
      housekeeping: 'Housekeeping Queue',
      inventory: 'Inventory & Stocks',
      maintenance: 'Maintenance Engineering',
      reviews: 'Customer Reviews Feedback',
      reports: 'Business & Occupancy Reports',
      settings: 'System Configurations'
    };

    const targetTitle = sectionTitles[moduleName] || 'Console';
    document.title = `StayEase HMS — ${targetTitle}`;
    document.getElementById('section-title').innerText = targetTitle;

    // Dispatch render trigger based on modules
    switch (moduleName) {
      case 'dashboard':
        window.dashboardController.render(container);
        break;
      case 'rooms':
        window.roomsController.render(container);
        break;
      case 'bookings':
        window.bookingsController.render(container);
        break;
      case 'guests':
        window.guestsController.render(container);
        break;
      case 'billing':
        window.billingController.render(container);
        break;
      case 'services':
        window.servicesController.render(container);
        break;
      case 'housekeeping':
        window.housekeepingController.render(container);
        break;
      case 'inventory':
        window.inventoryController.render(container);
        break;
      case 'maintenance':
        window.maintenanceController.render(container);
        break;
      case 'reviews':
        window.reviewsController.render(container);
        break;
      case 'reports':
        window.reportsController.render(container);
        break;
      case 'settings':
        window.settingsController.render(container);
        break;
      default:
        container.innerHTML = '<div class="empty-state">Invalid Section Path.</div>';
    }
  },

  checkNotifications() {
    const badge = document.getElementById('notif-badge-count');
    const listHolder = document.getElementById('notif-list-items');
    if (!badge || !listHolder) return;

    const alerts = [];

    // 1. Low stock alerts
    const invItems = window.db.getAll('inventoryItems');
    invItems.forEach(item => {
      if (item.currentStock <= item.reorderLevel) {
        alerts.push({
          type: 'warning',
          text: `Low Stock: ${item.name} (${item.currentStock} remaining)`,
          link: '#inventory'
        });
      }
    });

    // 2. Dirty rooms requiring cleaning
    const rooms = window.db.getAll('rooms');
    const dirtyRooms = rooms.filter(r => r.housekeepingStatus === 'Dirty');
    if (dirtyRooms.length > 0) {
      alerts.push({
        type: 'info',
        text: `${dirtyRooms.length} dirty rooms pending cleaning.`,
        link: '#housekeeping'
      });
    }

    // 3. Open maintenance requests
    const maint = window.db.getAll('maintenanceRequests');
    const openMaint = maint.filter(m => m.status === 'Open' || m.status === 'InProgress');
    if (openMaint.length > 0) {
      alerts.push({
        type: 'danger',
        text: `${openMaint.length} active room maintenance requests.`,
        link: '#maintenance'
      });
    }

    // Render alert nodes
    if (alerts.length > 0) {
      badge.innerText = alerts.length;
      badge.style.display = 'inline-flex';

      listHolder.innerHTML = alerts.map(a => `
        <li class="notif-item notif-${a.type}">
          <a href="${a.link}" onclick="document.getElementById('notif-dropdown').style.display='none';">
            ${a.text}
          </a>
        </li>
      `).join('');
    } else {
      badge.style.display = 'none';
      listHolder.innerHTML = '<li class="text-center text-muted" style="padding:15px; font-size:12px;">No active alerts</li>';
    }
  }
};

window.mainApp = mainApp;

// Fire up everything on load
document.addEventListener('DOMContentLoaded', () => {
  window.mainApp.init();
});
