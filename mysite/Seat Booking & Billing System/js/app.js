/**
 * Library Seat Booking & Billing System - Main App Controller (app.js)
 * Coordinates SPA views, hash routing, modal managers, forms, and background processes.
 */

(function () {
  // Application State
  const App = {
    currentRoute: '',
    autoCheckInterval: null,

    // Initialize application
    init: async function () {
      await DB.init();
      
      // Initial sweeps
      Bookings.runAutoReleaseChecks();
      
      // Auto checkers interval (every 60 seconds)
      this.autoCheckInterval = setInterval(() => {
        Bookings.runAutoReleaseChecks();
        if (this.currentRoute === '#/admin/dashboard' || this.currentRoute === '#/user/dashboard' || this.currentRoute === '#/admin/billing') {
          this.router();
        }
      }, 60000);

      window.addEventListener('hashchange', () => this.router());
      this.router();
      this.registerGlobalEvents();
    },

    /**
     * Client-side Hash Router
     */
    router: function () {
      const hash = window.location.hash || '#/login';
      this.currentRoute = hash;

      // Close mobile drawer on routing
      this.toggleMobileSidebar(false);

      const session = Auth.getCurrentSession();
      if (!session) {
        this.renderLoginView();
        return;
      }

      const isAdminRoute = hash.startsWith('#/admin');
      const isUserRoute = hash.startsWith('#/user');

      if (session.role === 'admin' && isUserRoute) {
        window.location.hash = '#/admin/dashboard';
        return;
      }

      if (session.role === 'user' && isAdminRoute) {
        window.location.hash = '#/user/dashboard';
        return;
      }

      if (hash === '#/login' || hash === '#/') {
        window.location.hash = session.role === 'admin' ? '#/admin/dashboard' : '#/user/dashboard';
        return;
      }

      document.getElementById('login-section').style.display = 'none';
      document.getElementById('app-container').style.display = 'flex';

      this.renderSidebarAndHeader(session);

      const views = document.querySelectorAll('.app-view');
      views.forEach(v => v.classList.remove('active-view'));

      // Route Dispatcher
      switch (hash) {
        // Admin views
        case '#/admin/dashboard':
          this.renderAdminDashboard();
          break;
        case '#/admin/users':
          this.renderAdminUsers();
          break;
        case '#/admin/seats':
          this.renderAdminSeats();
          break;
        case '#/admin/book-behalf':
          this.renderAdminBookBehalf();
          break;
        case '#/admin/verify-payments':
          this.renderAdminVerifyPayments();
          break;
        case '#/admin/billing':
          this.renderAdminBilling();
          break;
        case '#/admin/settings':
          this.renderAdminSettings();
          break;

        // User views
        case '#/user/dashboard':
          this.renderUserDashboard();
          break;
        case '#/user/book-seat':
          this.renderUserBookSeat();
          break;
        case '#/user/bookings':
          this.renderUserBookings();
          break;
        case '#/user/billing':
          this.renderUserBilling();
          break;

        default:
          window.location.hash = session.role === 'admin' ? '#/admin/dashboard' : '#/user/dashboard';
          break;
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }
    },

    /**
     * Mobile drawer toggler
     */
    toggleMobileSidebar: function (open) {
      const sidebar = document.getElementById('sidebar-container');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (sidebar && backdrop) {
        if (open) {
          sidebar.classList.add('mobile-open');
          backdrop.classList.add('visible');
        } else {
          sidebar.classList.remove('mobile-open');
          backdrop.classList.remove('visible');
        }
      }
    },

    /**
     * Render Login View
     */
    renderLoginView: function () {
      document.getElementById('app-container').style.display = 'none';
      const loginSec = document.getElementById('login-section');
      loginSec.style.display = 'flex';

      loginSec.innerHTML = `
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo-circle">
              <i data-lucide="book-open"></i>
            </div>
            <h2>Apex Study Center</h2>
            <p>Seat Booking & Billing System</p>
          </div>
          <form id="login-form">
            <div class="form-group">
              <label for="login-username">Username</label>
              <div class="input-wrapper">
                <i data-lucide="user"></i>
                <input type="text" id="login-username" placeholder="Enter username" required autofocus>
              </div>
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <div class="input-wrapper">
                <i data-lucide="lock"></i>
                <input type="password" id="login-password" placeholder="Enter password" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Log In</button>
          </form>
          <div class="login-footer">
            <p><i data-lucide="shield-check" style="width: 14px; height:14px; display:inline; vertical-align:middle; margin-right:4px;"></i> Secure local access</p>
          </div>
        </div>
      `;

      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userVal = document.getElementById('login-username').value;
        const passVal = document.getElementById('login-password').value;

        const res = await Auth.login(userVal, passVal);
        if (res.success) {
          this.showToast(`Welcome back, ${res.user.name}!`, 'success');
          window.location.hash = res.user.isAdmin ? '#/admin/dashboard' : '#/user/dashboard';
        } else {
          this.showToast(res.message, 'error');
        }
      });

      if (window.lucide) {
        window.lucide.createIcons();
      }
    },

    /**
     * Render Sidebar & Top Header
     */
    renderSidebarAndHeader: function (session) {
      const user = Auth.getCurrentUser() || { name: 'User', username: 'user' };
      const settings = DB.getAll(DB.KEYS.SETTINGS);
      const libraryName = settings.libraryName || 'Apex Study Center';

      const pendingCount = DB.getAll(DB.KEYS.PAYMENTS).filter(p => p.status === 'Pending').length;
      const badgeCount = pendingCount;

      let sidebarNavHtml = '';
      if (session.role === 'admin') {
        sidebarNavHtml = `
          <a href="#/admin/dashboard" class="nav-item ${this.currentRoute === '#/admin/dashboard' ? 'active' : ''}">
            <i data-lucide="layout-dashboard"></i> <span>Dashboard</span>
          </a>
          <a href="#/admin/users" class="nav-item ${this.currentRoute === '#/admin/users' ? 'active' : ''}">
            <i data-lucide="users"></i> <span>User Management</span>
          </a>
          <a href="#/admin/seats" class="nav-item ${this.currentRoute === '#/admin/seats' ? 'active' : ''}">
            <i data-lucide="armchair"></i> <span>Seat Management</span>
          </a>
          <a href="#/admin/book-behalf" class="nav-item ${this.currentRoute === '#/admin/book-behalf' ? 'active' : ''}">
            <i data-lucide="calendar-plus"></i> <span>Book / Subscribe Behalf</span>
          </a>
          <a href="#/admin/verify-payments" class="nav-item ${this.currentRoute === '#/admin/verify-payments' ? 'active' : ''}">
            <i data-lucide="file-check-2"></i> <span>Verify Payments</span>
            ${badgeCount > 0 ? `<span class="nav-badge">${badgeCount}</span>` : ''}
          </a>
          <a href="#/admin/billing" class="nav-item ${this.currentRoute === '#/admin/billing' ? 'active' : ''}">
            <i data-lucide="wallet"></i> <span>Billing Dashboard</span>
          </a>
          <a href="#/admin/settings" class="nav-item ${this.currentRoute === '#/admin/settings' ? 'active' : ''}">
            <i data-lucide="settings"></i> <span>Settings & Plans</span>
          </a>
        `;
      } else {
        sidebarNavHtml = `
          <a href="#/user/dashboard" class="nav-item ${this.currentRoute === '#/user/dashboard' ? 'active' : ''}">
            <i data-lucide="layout-dashboard"></i> <span>My Dashboard</span>
          </a>
          <a href="#/user/book-seat" class="nav-item ${this.currentRoute === '#/user/book-seat' ? 'active' : ''}">
            <i data-lucide="armchair"></i> <span>Book a Seat</span>
          </a>
          <a href="#/user/bookings" class="nav-item ${this.currentRoute === '#/user/bookings' ? 'active' : ''}">
            <i data-lucide="calendar"></i> <span>My Bookings</span>
          </a>
          <a href="#/user/billing" class="nav-item ${this.currentRoute === '#/user/billing' ? 'active' : ''}">
            <i data-lucide="receipt"></i> <span>My Billing</span>
          </a>
        `;
      }

      document.getElementById('sidebar-container').innerHTML = `
        <div class="sidebar-header">
          <div class="logo-box">
            <i data-lucide="book-open"></i>
          </div>
          <div>
            <h1 class="logo-title">${libraryName}</h1>
            <span class="logo-subtitle">Portal</span>
          </div>
        </div>
        <nav class="sidebar-nav">
          ${sidebarNavHtml}
        </nav>
        <div class="sidebar-footer">
          <div class="user-block">
            <div class="avatar-circle">${user.name.charAt(0).toUpperCase()}</div>
            <div class="user-meta-info">
              <p class="user-full-name">${user.name}</p>
              <p class="user-role-label">${session.role === 'admin' ? 'Administrator' : 'Student Member'}</p>
            </div>
          </div>
          <button id="logout-button" class="btn btn-outline btn-block mt-4">
            <i data-lucide="log-out"></i> <span>Log Out</span>
          </button>
        </div>
      `;

      const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      document.getElementById('header-container').innerHTML = `
        <div class="header-left">
          <button id="mobile-drawer-toggle" class="mobile-drawer-toggle-btn">
            <i data-lucide="menu"></i>
          </button>
          <h2>${this.getViewTitle()}</h2>
          <p class="text-muted text-sm date-label-header">${formattedDate}</p>
        </div>
        <div class="header-right">
          <div class="header-status-pill">
            <span class="pulse-indicator"></span>
            <span>Online Mode</span>
          </div>
          ${session.role === 'admin' && user.passwordHash === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' ?
            `<div class="header-alert-pill cursor-pointer" id="pwd-warn-btn">
               <i data-lucide="alert-triangle"></i>
               <span>Default Password! Change Now</span>
             </div>` : ''
          }
        </div>
      `;

      document.getElementById('logout-button').addEventListener('click', () => {
        Auth.logout();
        this.showToast('Logged out successfully.', 'info');
        window.location.hash = '#/login';
      });

      const warnBtn = document.getElementById('pwd-warn-btn');
      if (warnBtn) {
        warnBtn.onclick = () => { window.location.hash = '#/admin/settings'; };
      }

      const drawerBtn = document.getElementById('mobile-drawer-toggle');
      if (drawerBtn) {
        drawerBtn.onclick = () => this.toggleMobileSidebar(true);
      }
    },

    getViewTitle: function () {
      const titles = {
        '#/admin/dashboard': 'Admin Dashboard',
        '#/admin/users': 'User Account Management',
        '#/admin/seats': 'Study Seats Management',
        '#/admin/book-behalf': 'Book Seat / Subscribe Pass',
        '#/admin/verify-payments': 'Verify Payments Queue',
        '#/admin/billing': 'Billing & Revenue Reports',
        '#/admin/settings': 'System Settings & Plans',
        '#/user/dashboard': 'My Dashboard',
        '#/user/book-seat': 'Book Study Seat',
        '#/user/bookings': 'My Seat Bookings',
        '#/user/billing': 'My Invoices & Receipts'
      };
      return titles[this.currentRoute] || 'Library Hub';
    },

    formatCurrency: function (num) {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
    },

    formatDateTime: function (isoString) {
      if (!isoString) return '-';
      return new Date(isoString).toLocaleString('en-IN', { hour12: true });
    },

    getStatusBadge: function (status) {
      let cssClass = 'badge-gray';
      switch (status) {
        case 'Available':
        case 'Paid':
        case 'CheckedIn':
        case 'Confirmed':
        case 'Active':
          cssClass = 'badge-green';
          break;
        case 'Occupied':
        case 'Rejected':
        case 'Cancelled':
        case 'Overdue':
        case 'Expired':
          cssClass = 'badge-red';
          break;
        case 'Blocked':
          cssClass = 'badge-gray';
          break;
        case 'Pending':
        case 'PendingPayment':
        case 'Expiring Soon':
          cssClass = 'badge-yellow';
          break;
        case 'CheckedOut':
          cssClass = 'badge-purple';
          break;
      }
      return `<span class="badge ${cssClass}">${status}</span>`;
    },

    // ==========================================
    // ADMIN SCREEN RENDERS
    // ==========================================

    renderAdminDashboard: function () {
      const view = document.getElementById('admin-dashboard-view');
      view.classList.add('active-view');

      const stats = Admin.getDashboardStats();

      view.innerHTML = `
        <div class="stats-grid">
          <div class="stats-card">
            <div class="stats-icon-circle accent-blue"><i data-lucide="armchair"></i></div>
            <div class="stats-details">
              <p class="stats-label">Total Seats</p>
              <h3>${stats.totalSeats}</h3>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-icon-circle accent-green"><i data-lucide="user-check"></i></div>
            <div class="stats-details">
              <p class="stats-label">Occupied Today</p>
              <h3>${stats.occupiedToday}</h3>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-icon-circle accent-purple"><i data-lucide="award"></i></div>
            <div class="stats-details">
              <p class="stats-label">Active Passes</p>
              <h3>${stats.activeSubscriptions}</h3>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-icon-circle accent-teal"><i data-lucide="indian-rupee"></i></div>
            <div class="stats-details">
              <p class="stats-label">Total Revenue</p>
              <h3>${this.formatCurrency(stats.totalRevenue)}</h3>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-icon-circle accent-yellow"><i data-lucide="alert-circle"></i></div>
            <div class="stats-details">
              <p class="stats-label">Pending Dues</p>
              <h3>${this.formatCurrency(stats.pendingDues)}</h3>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-icon-circle accent-red"><i data-lucide="hourglass"></i></div>
            <div class="stats-details">
              <p class="stats-label">Overdues</p>
              <h3>${stats.overdueCount}</h3>
            </div>
          </div>
        </div>

        <div class="dashboard-split mt-6">
          <div class="card flex-2">
            <div class="card-header"><h3>Quick Actions</h3></div>
            <div class="quick-links-grid">
              <a href="#/admin/book-behalf" class="action-tile">
                <i data-lucide="calendar-plus"></i> <p>Book / Pass Behalf</p>
              </a>
              <a href="#/admin/users" class="action-tile">
                <i data-lucide="user-plus"></i> <p>Add Member</p>
              </a>
              <a href="#/admin/seats" class="action-tile">
                <i data-lucide="plus-circle"></i> <p>Add Seat</p>
              </a>
              <a href="#/admin/verify-payments" class="action-tile">
                <i data-lucide="file-check-2"></i> <p>Verify Payments</p>
              </a>
            </div>
          </div>
          <div class="card flex-1">
            <div class="card-header"><h3>Revenue Breakdown</h3></div>
            <div class="sys-info-body">
              <div class="sys-row">
                <span>Daily Booking Sales</span>
                <span>${this.formatCurrency(stats.dailyRevenue)}</span>
              </div>
              <div class="sys-row">
                <span>Subscription Pass Sales</span>
                <span>${this.formatCurrency(stats.subscriptionRevenue)}</span>
              </div>
              <div class="sys-row" style="border-top: 1px dashed var(--border-color); padding-top: 8px;">
                <span>Total Combined</span>
                <span class="text-primary font-bold">${this.formatCurrency(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    renderAdminUsers: function () {
      const view = document.getElementById('admin-users-view');
      view.classList.add('active-view');

      const users = Admin.getUsers();

      let tableRows = '';
      if (users.length === 0) {
        tableRows = `<tr><td colspan="7" class="text-center py-8">No registered members found.</td></tr>`;
      } else {
        users.forEach((u, i) => {
          tableRows += `
            <tr>
              <td data-label="S.No">${i + 1}</td>
              <td data-label="Full Name"><strong>${u.name}</strong></td>
              <td data-label="Username"><code class="code-badge">${u.username}</code></td>
              <td data-label="Contact">${u.contact}</td>
              <td data-label="Created">${new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
              <td data-label="Status">${u.isActive ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-red">Deactivated</span>'}</td>
              <td data-label="Actions">
                <div class="action-btn-group justify-end">
                  <button class="btn-icon btn-edit-user" data-id="${u.id}"><i data-lucide="edit-3"></i></button>
                  <button class="btn-icon ${u.isActive ? 'btn-red' : 'btn-green'} btn-toggle-user" data-id="${u.id}"><i data-lucide="${u.isActive ? 'user-minus' : 'user-check'}"></i></button>
                </div>
              </td>
            </tr>
          `;
        });
      }

      view.innerHTML = `
        <div class="card">
          <div class="card-header justify-between flex-wrap gap-4">
            <h3>Registered Members</h3>
            <button id="btn-add-user" class="btn btn-primary"><i data-lucide="user-plus"></i> Create User</button>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>S.No</th><th>Full Name</th><th>Username</th><th>Contact</th><th>Created</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
        </div>

        <div id="modal-add-user" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Create User Account</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-add-user" class="modal-body">
              <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="new-user-name" required>
              </div>
              <div class="form-group">
                <label>Username</label>
                <input type="text" id="new-user-username" pattern="^[a-zA-Z0-9]+$" required>
              </div>
              <div class="form-group">
                <label>Initial Password</label>
                <input type="password" id="new-user-password" required>
              </div>
              <div class="form-group">
                <label>Contact Number</label>
                <input type="tel" id="new-user-contact" required>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>

        <div id="modal-creds" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Credentials Generated</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body text-center">
              <div class="success-icon-badge"><i data-lucide="check-circle-2"></i></div>
              <p class="mb-4">Copy account credentials to share:</p>
              <div class="copy-box" id="copy-creds-box">
                <p><strong>Username:</strong> <span id="copy-username"></span></p>
                <p><strong>Password:</strong> <span id="copy-password"></span></p>
              </div>
              <button id="btn-copy-creds" class="btn btn-primary btn-block mt-4"><i data-lucide="copy"></i> Copy</button>
            </div>
          </div>
        </div>

        <div id="modal-edit-user" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Edit Member Details</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-edit-user" class="modal-body">
              <input type="hidden" id="edit-user-id">
              <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="edit-user-name" required>
              </div>
              <div class="form-group">
                <label>Contact Number</label>
                <input type="tel" id="edit-user-contact" required>
              </div>
              <div class="form-group">
                <label>Reset Password (Optional)</label>
                <input type="password" id="edit-user-password">
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const addModal = document.getElementById('modal-add-user');
      const credsModal = document.getElementById('modal-creds');
      const editModal = document.getElementById('modal-edit-user');

      document.getElementById('btn-add-user').onclick = () => {
        document.getElementById('form-add-user').reset();
        addModal.classList.add('open');
      };

      document.getElementById('form-add-user').onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-user-name').value;
        const user = document.getElementById('new-user-username').value;
        const pass = document.getElementById('new-user-password').value;
        const contact = document.getElementById('new-user-contact').value;

        const res = await Auth.createUser(name, user, pass, contact);
        if (res.success) {
          addModal.classList.remove('open');
          this.showToast('Member created!', 'success');
          document.getElementById('copy-username').innerText = res.user.username;
          document.getElementById('copy-password').innerText = pass;
          credsModal.classList.add('open');
          this.renderAdminUsers();
        } else {
          this.showToast(res.message, 'error');
        }
      };

      document.getElementById('btn-copy-creds').onclick = () => {
        const u = document.getElementById('copy-username').innerText;
        const p = document.getElementById('copy-password').innerText;
        navigator.clipboard.writeText(`Username: ${u}\nPassword: ${p}`).then(() => {
          this.showToast('Credentials copied!', 'success');
          credsModal.classList.remove('open');
        });
      };

      view.querySelectorAll('.btn-toggle-user').forEach(btn => {
        btn.onclick = () => {
          const res = Admin.toggleUserStatus(btn.getAttribute('data-id'));
          if (res.success) {
            this.showToast(res.message, 'success');
            this.renderAdminUsers();
          } else {
            this.showToast(res.message, 'error');
          }
        };
      });

      view.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.onclick = () => {
          const userObj = DB.getById(DB.KEYS.USERS, btn.getAttribute('data-id'));
          if (userObj) {
            document.getElementById('edit-user-id').value = userObj.id;
            document.getElementById('edit-user-name').value = userObj.name;
            document.getElementById('edit-user-contact').value = userObj.contact;
            document.getElementById('edit-user-password').value = '';
            editModal.classList.add('open');
          }
        };
      });

      document.getElementById('form-edit-user').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id').value;
        const name = document.getElementById('edit-user-name').value;
        const contact = document.getElementById('edit-user-contact').value;
        const password = document.getElementById('edit-user-password').value;

        const updates = { name: name.trim(), contact: contact.trim() };
        if (password) updates.passwordHash = await DB.hashPassword(password);

        if (DB.update(DB.KEYS.USERS, id, updates)) {
          editModal.classList.remove('open');
          this.showToast('Profile updated.', 'success');
          this.renderAdminUsers();
        } else {
          this.showToast('Failed to update.', 'error');
        }
      };
    },

    renderAdminSeats: function () {
      const view = document.getElementById('admin-seats-view');
      view.classList.add('active-view');

      const seats = Seats.getAll();
      const settings = DB.getAll(DB.KEYS.SETTINGS);

      let tableRows = '';
      if (seats.length === 0) {
        tableRows = `<tr><td colspan="6" class="text-center py-8">No seats in inventory.</td></tr>`;
      } else {
        seats.forEach((seat, idx) => {
          const rate = settings.rates ? (settings.rates[seat.zone] || 0) : 0;
          tableRows += `
            <tr>
              <td data-label="S.No">${idx + 1}</td>
              <td data-label="Seat Number"><strong>${seat.seatNumber}</strong></td>
              <td data-label="Zone Type"><span class="badge badge-purple">${seat.zone}</span></td>
              <td data-label="Rate Per Day">${this.formatCurrency(rate)}</td>
              <td data-label="Status">
                ${this.getStatusBadge(seat.status)}
                ${seat.status === 'Blocked' ? `<p class="text-xs text-muted mt-1 italic">Reason: ${seat.blockedReason}</p>` : ''}
              </td>
              <td data-label="Actions">
                <div class="action-btn-group justify-end">
                  <button class="btn-icon btn-edit-seat" data-id="${seat.id}"><i data-lucide="edit-3"></i></button>
                  ${seat.status === 'Blocked' ? 
                    `<button class="btn-icon btn-green btn-unblock-seat" data-id="${seat.id}"><i data-lucide="unlock"></i></button>` :
                    `<button class="btn-icon btn-orange btn-block-seat-trigger" data-id="${seat.id}"><i data-lucide="lock"></i></button>`
                  }
                  <button class="btn-icon btn-red btn-delete-seat" data-id="${seat.id}"><i data-lucide="trash-2"></i></button>
                </div>
              </td>
            </tr>
          `;
        });
      }

      view.innerHTML = `
        <div class="card">
          <div class="card-header justify-between flex-wrap gap-4">
            <h3>Seats Inventory</h3>
            <button id="btn-add-seat" class="btn btn-primary"><i data-lucide="plus-circle"></i> Add seat</button>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>S.No</th><th>Seat Number</th><th>Zone Type</th><th>Rate Per Day</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
        </div>

        <div id="modal-add-seat" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Add Study Seat</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-add-seat" class="modal-body">
              <div class="form-group">
                <label>Seat Number</label>
                <input type="text" id="new-seat-number" placeholder="e.g. A-5" required>
              </div>
              <div class="form-group">
                <label>Zone / Type</label>
                <select id="new-seat-zone" required>
                  <option value="AC">AC Zone</option>
                  <option value="Non-AC">Non-AC Zone</option>
                  <option value="Cabin">Cabin Zone</option>
                </select>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>

        <div id="modal-edit-seat" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Edit Seat</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-edit-seat" class="modal-body">
              <input type="hidden" id="edit-seat-id">
              <div class="form-group">
                <label>Seat Number</label>
                <input type="text" id="edit-seat-number" required>
              </div>
              <div class="form-group">
                <label>Zone Type</label>
                <select id="edit-seat-zone" required>
                  <option value="AC">AC Zone</option>
                  <option value="Non-AC">Non-AC Zone</option>
                  <option value="Cabin">Cabin Zone</option>
                </select>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>

        <div id="modal-block-seat" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Block Seat</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-block-seat" class="modal-body">
              <input type="hidden" id="block-seat-id">
              <div class="form-group">
                <label>Reason</label>
                <textarea id="block-seat-reason" required></textarea>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Block</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const addModal = document.getElementById('modal-add-seat');
      const editModal = document.getElementById('modal-edit-seat');
      const blockModal = document.getElementById('modal-block-seat');

      document.getElementById('btn-add-seat').onclick = () => {
        document.getElementById('form-add-seat').reset();
        addModal.classList.add('open');
      };

      document.getElementById('form-add-seat').onsubmit = (e) => {
        e.preventDefault();
        const no = document.getElementById('new-seat-number').value;
        const zone = document.getElementById('new-seat-zone').value;
        if (Seats.addSeat(no, zone).success) {
          addModal.classList.remove('open');
          this.showToast('Seat added.', 'success');
          this.renderAdminSeats();
        } else {
          this.showToast('Failed to add seat.', 'error');
        }
      };

      view.querySelectorAll('.btn-block-seat-trigger').forEach(btn => {
        btn.onclick = () => {
          document.getElementById('block-seat-id').value = btn.getAttribute('data-id');
          document.getElementById('block-seat-reason').value = '';
          blockModal.classList.add('open');
        };
      });

      document.getElementById('form-block-seat').onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('block-seat-id').value;
        const reason = document.getElementById('block-seat-reason').value;
        if (Seats.blockSeat(id, reason).success) {
          blockModal.classList.remove('open');
          this.showToast('Seat blocked.', 'info');
          this.renderAdminSeats();
        }
      };

      view.querySelectorAll('.btn-unblock-seat').forEach(btn => {
        btn.onclick = () => {
          if (Seats.unblockSeat(btn.getAttribute('data-id')).success) {
            this.showToast('Seat unblocked.', 'success');
            this.renderAdminSeats();
          }
        };
      });

      view.querySelectorAll('.btn-delete-seat').forEach(btn => {
        btn.onclick = () => {
          if (confirm('Delete this seat?')) {
            const res = Seats.deleteSeat(btn.getAttribute('data-id'));
            if (res.success) {
              this.showToast(res.message, 'success');
              this.renderAdminSeats();
            } else {
              this.showToast(res.message, 'error');
            }
          }
        };
      });

      view.querySelectorAll('.btn-edit-seat').forEach(btn => {
        btn.onclick = () => {
          const seat = DB.getById(DB.KEYS.SEATS, btn.getAttribute('data-id'));
          if (seat) {
            document.getElementById('edit-seat-id').value = seat.id;
            document.getElementById('edit-seat-number').value = seat.seatNumber;
            document.getElementById('edit-seat-zone').value = seat.zone;
            editModal.classList.add('open');
          }
        };
      });

      document.getElementById('form-edit-seat').onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-seat-id').value;
        const no = document.getElementById('edit-seat-number').value;
        const zone = document.getElementById('edit-seat-zone').value;
        if (Seats.editSeat(id, { seatNumber: no, zone }).success) {
          editModal.classList.remove('open');
          this.showToast('Seat updated.', 'success');
          this.renderAdminSeats();
        } else {
          this.showToast('Failed to edit seat.', 'error');
        }
      };
    },

    renderAdminBookBehalf: function () {
      const view = document.getElementById('admin-book-behalf-view');
      view.classList.add('active-view');

      const users = Admin.getUsers().filter(u => u.isActive);
      const activePlans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS).filter(p => p.isActive);
      const todayStr = new Date().toISOString().split('T')[0];

      let userOptions = '<option value="">-- Choose Member --</option>';
      users.forEach(u => {
        userOptions += `<option value="${u.id}">${u.name} (@${u.username})</option>`;
      });

      let planOptions = '<option value="">-- Choose Plan --</option>';
      activePlans.forEach(p => {
        planOptions += `<option value="${p.id}">${p.name} - ${this.formatCurrency(p.price)} (${p.type})</option>`;
      });

      view.innerHTML = `
        <!-- Top Tabs Container -->
        <div class="tabs-navigation mb-4 border-b flex gap-4 pb-2">
          <button id="btn-tab-daily" class="btn btn-xs btn-primary tab-active">Daily Seat Booking</button>
          <button id="btn-tab-sub" class="btn btn-xs btn-outline">Subscription Passes</button>
        </div>

        <!-- Section 1: Daily Seat Booking tab -->
        <div id="behalf-daily-container">
          <div class="card mb-6">
            <div class="card-header"><h3>Select Booking Details</h3></div>
            <div class="card-body form-row-grid">
              <div class="form-group mb-0">
                <label>Select Member</label>
                <select id="behalf-daily-user">${userOptions}</select>
              </div>
              <div class="form-group mb-0">
                <label>Booking Date</label>
                <input type="date" id="behalf-daily-date" value="${todayStr}" min="${todayStr}">
              </div>
            </div>
          </div>
          <div id="behalf-daily-map-card" class="card" style="display: none;">
            <div class="card-header justify-between flex-wrap gap-2">
              <h3>Available Seats Map</h3>
              <div class="map-legend">
                <span class="legend-item"><span class="legend-dot bg-green"></span> Free</span>
                <span class="legend-item"><span class="legend-dot bg-red"></span> Occupied</span>
                <span class="legend-item"><span class="legend-dot bg-gray"></span> Blocked</span>
              </div>
            </div>
            <div class="card-body" id="behalf-daily-seat-grid"></div>
          </div>
        </div>

        <!-- Section 2: Subscription Passes tab -->
        <div id="behalf-sub-container" style="display: none;">
          <div class="card">
            <div class="card-header"><h3>Create Pass Subscription</h3></div>
            <form id="form-behalf-sub" class="card-body">
              <div class="form-row-grid">
                <div class="form-group">
                  <label>Select Member</label>
                  <select id="behalf-sub-user" required>${userOptions}</select>
                </div>
                <div class="form-group">
                  <label>Select Plan</label>
                  <select id="behalf-sub-plan" required>${planOptions}</select>
                </div>
              </div>
              
              <!-- Fixed Seat choice panel (shown dynamically) -->
              <div id="behalf-sub-seat-group" class="form-group" style="display:none;">
                <label>Assign Fixed Seat</label>
                <select id="behalf-sub-seat"></select>
                <span class="text-xs text-muted">Fixed seats are reserved permanently for the duration.</span>
              </div>

              <!-- Payment collection toggle options -->
              <div class="payment-choice-box mt-4 border-t pt-4">
                <label class="font-bold text-sm block mb-2">Payment Options</label>
                <div class="form-row-grid mb-3">
                  <label class="checkbox-label">
                    <input type="radio" name="behalf-sub-payment-type" value="direct" checked>
                    <span>Confirm Payment Now</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="radio" name="behalf-sub-payment-type" value="later">
                    <span>User Will Pay Later</span>
                  </label>
                </div>
                
                <div id="behalf-sub-direct-pay-subform" class="border p-3 rounded" style="background-color: var(--gray-light);">
                  <div class="form-row-grid">
                    <div class="form-group mb-0">
                      <label class="text-xs">Amount Received (INR)</label>
                      <input type="number" id="behalf-sub-pay-amount" min="1">
                    </div>
                    <div class="form-group mb-0">
                      <label class="text-xs">Payment Mode</label>
                      <select id="behalf-sub-pay-mode">
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div class="form-group mb-0">
                      <label class="text-xs">Remarks</label>
                      <input type="text" id="behalf-sub-pay-remarks">
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" class="btn btn-primary mt-6">Confirm Subscription</button>
            </form>
          </div>
        </div>

        <!-- Confirm Daily Booking Modal -->
        <div id="modal-confirm-behalf" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Confirm Daily Booking</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body" id="behalf-confirm-modal-body"></div>
          </div>
        </div>
      `;

      // Tabs Logic
      const btnTabDaily = document.getElementById('btn-tab-daily');
      const btnTabSub = document.getElementById('btn-tab-sub');
      const dailyContainer = document.getElementById('behalf-daily-container');
      const subContainer = document.getElementById('behalf-sub-container');

      btnTabDaily.onclick = () => {
        btnTabDaily.className = 'btn btn-xs btn-primary tab-active';
        btnTabSub.className = 'btn btn-xs btn-outline';
        dailyContainer.style.display = 'block';
        subContainer.style.display = 'none';
      };

      btnTabSub.onclick = () => {
        btnTabSub.className = 'btn btn-xs btn-primary tab-active';
        btnTabDaily.className = 'btn btn-xs btn-outline';
        dailyContainer.style.display = 'none';
        subContainer.style.display = 'block';
      };

      // Daily Booking map load triggers
      const behalfUser = document.getElementById('behalf-daily-user');
      const behalfDate = document.getElementById('behalf-daily-date');
      const behalfMap = document.getElementById('behalf-daily-map-card');

      const refreshDailyGrid = () => {
        const u = behalfUser.value;
        const d = behalfDate.value;
        if (u && d) {
          behalfMap.style.display = 'block';
          this.renderAvailabilityGrid('behalf-daily-seat-grid', d, (seat) => {
            this.promptConfirmBookingBehalf(u, seat, d);
          });
        } else {
          behalfMap.style.display = 'none';
        }
      };

      behalfUser.onchange = refreshDailyGrid;
      behalfDate.onchange = refreshDailyGrid;

      // Subscription Pass layout triggers
      const behalfSubPlan = document.getElementById('behalf-sub-plan');
      const behalfSubSeatGroup = document.getElementById('behalf-sub-seat-group');
      const behalfSubSeatSelect = document.getElementById('behalf-sub-seat');

      behalfSubPlan.onchange = () => {
        const planId = behalfSubPlan.value;
        if (!planId) {
          behalfSubSeatGroup.style.display = 'none';
          return;
        }

        const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, planId);
        document.getElementById('behalf-sub-pay-amount').value = plan.price;

        if (plan.seatAllocationType === 'FixedSeat') {
          behalfSubSeatGroup.style.display = 'block';
          
          // Load unassigned seats for FixedSeat plan of matching type
          const seats = DB.getAll(DB.KEYS.SEATS).filter(s => s.status !== 'Blocked' && (plan.seatType === 'Any' || s.zone === plan.seatType));
          const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS).filter(sub => sub.status === 'Active' && sub.assignedSeatId);
          const assignedSeatIds = subscriptions.map(s => s.assignedSeatId);

          let seatOptions = '';
          seats.forEach(s => {
            if (!assignedSeatIds.includes(s.id)) {
              seatOptions += `<option value="${s.id}">${s.seatNumber} (${s.zone})</option>`;
            }
          });

          if (!seatOptions) {
            behalfSubSeatSelect.innerHTML = '<option value="">-- No seats available of this type --</option>';
          } else {
            behalfSubSeatSelect.innerHTML = seatOptions;
          }
        } else {
          behalfSubSeatGroup.style.display = 'none';
        }
      };

      // Direct pay vs later pass selection
      const subRadioDirect = document.querySelector('input[name="behalf-sub-payment-type"][value="direct"]');
      const subRadioLater = document.querySelector('input[name="behalf-sub-payment-type"][value="later"]');
      const subPayForm = document.getElementById('behalf-sub-direct-pay-subform');

      subRadioDirect.onclick = () => { subPayForm.style.display = 'block'; };
      subRadioLater.onclick = () => { subPayForm.style.display = 'none'; };

      // Submit Behalf Pass Subscription
      document.getElementById('form-behalf-sub').onsubmit = (e) => {
        e.preventDefault();
        const userId = document.getElementById('behalf-sub-user').value;
        const planId = behalfSubPlan.value;
        const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, planId);

        let seatId = null;
        if (plan.seatAllocationType === 'FixedSeat') {
          seatId = behalfSubSeatSelect.value;
          if (!seatId) {
            this.showToast('No seat selected or available for assignment.', 'error');
            return;
          }
        }

        const isDirect = subRadioDirect.checked;
        const adminUser = Auth.getCurrentUser();

        // Create subscription record
        const todayStr = new Date().toISOString().split('T')[0];
        const startObj = new Date(todayStr + 'T00:00:00');
        if (plan.type === 'Monthly') {
          startObj.setMonth(startObj.getMonth() + 1);
        } else {
          startObj.setFullYear(startObj.getFullYear() + 1);
        }
        const endDate = startObj.toISOString().split('T')[0];

        const newSub = {
          id: DB.generateId('sub'),
          userId: userId,
          planId: planId,
          startDate: todayStr,
          endDate: endDate,
          assignedSeatId: seatId,
          status: isDirect ? 'Active' : 'PendingPayment',
          paymentId: null,
          createdBy: 'admin',
          createdAt: new Date().toISOString()
        };

        if (isDirect) {
          const amt = parseFloat(document.getElementById('behalf-sub-pay-amount').value);
          const mode = document.getElementById('behalf-sub-pay-mode').value;
          const remarks = document.getElementById('behalf-sub-pay-remarks').value;

          if (isNaN(amt) || amt <= 0) {
            this.showToast('Enter valid payment amount.', 'error');
            return;
          }

          DB.insert(DB.KEYS.SUBSCRIPTIONS, newSub);
          const payRes = Payments.createDirectSubscriptionPayment(newSub.id, amt, mode, remarks, adminUser.id);
          this.showToast('Pass subscription confirmed & direct payment received.', 'success');

          if (payRes.invoice) {
            this.printInvoice(payRes.invoice.id);
          }
        } else {
          DB.insert(DB.KEYS.SUBSCRIPTIONS, newSub);
          this.showToast('Pass subscription created, awaiting payment upload.', 'info');
        }

        document.getElementById('form-behalf-sub').reset();
        behalfSubSeatGroup.style.display = 'none';
      };
    },

    promptConfirmBookingBehalf: function (userId, seat, dateStr) {
      const user = DB.getById(DB.KEYS.USERS, userId);
      const settings = DB.getAll(DB.KEYS.SETTINGS);
      const rate = settings.rates[seat.zone] || 0;
      const modal = document.getElementById('modal-confirm-behalf');
      const body = document.getElementById('behalf-confirm-modal-body');

      // Check for active pass
      const activeSub = Bookings.getActiveSubscription(userId, dateStr);
      let subNotice = '';
      let isCovered = false;

      if (activeSub && activeSub.plan) {
        const zoneMatch = (activeSub.plan.seatType === 'Any' || activeSub.plan.seatType === seat.zone);
        if (zoneMatch) {
          if (activeSub.plan.seatAllocationType === 'FixedSeat') {
            if (activeSub.assignedSeatId === seat.id) isCovered = true;
          } else {
            isCovered = true;
          }
        }
      }

      if (isCovered) {
        subNotice = `
          <div class="alert alert-info mt-4">
            <i data-lucide="award" class="flex-shrink-0"></i>
            <span>This reservation is <strong>Auto-Covered</strong> under active subscription: "${activeSub.plan.name}". Payment step will be skipped.</span>
          </div>
        `;
      } else {
        subNotice = `
          <div class="payment-choice-box mt-4 border-t pt-4">
            <label class="font-bold text-sm block mb-2">Payment Collection Options</label>
            <div class="form-row-grid mb-3">
              <label class="checkbox-label">
                <input type="radio" name="behalf-payment-type" value="direct" checked>
                <span>Confirm Payment Now</span>
              </label>
              <label class="checkbox-label">
                <input type="radio" name="behalf-payment-type" value="later">
                <span>User Will Pay Later</span>
              </label>
            </div>
            
            <div id="behalf-direct-pay-subform" class="mt-2 border p-3 rounded" style="background-color: var(--gray-light);">
              <div class="form-group mb-2">
                <label class="text-xs font-semibold">Amount Received (INR)</label>
                <input type="number" id="behalf-pay-amount" value="${rate}" min="1" required>
              </div>
              <div class="form-row-grid">
                <div class="form-group mb-0">
                  <label class="text-xs font-semibold">Payment Mode</label>
                  <select id="behalf-pay-mode">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="form-group mb-0">
                  <label class="text-xs font-semibold">Remarks</label>
                  <input type="text" id="behalf-pay-remarks" placeholder="Optional notes" class="text-sm">
                </div>
              </div>
            </div>

            <div id="behalf-pay-later-alert" class="alert alert-info mt-2" style="display: none;">
              <i data-lucide="info" class="flex-shrink-0"></i>
              <span>Booking will start in <strong>PendingPayment</strong> state. User will upload screenshot.</span>
            </div>
          </div>
        `;
      }

      body.innerHTML = `
        <div class="confirm-booking-details">
          <p><strong>Member Name:</strong> ${user.name}</p>
          <p><strong>Username:</strong> <code class="code-badge">${user.username}</code></p>
          <p><strong>Seat Selected:</strong> ${seat.seatNumber} (${seat.zone})</p>
          <p><strong>Booking Date:</strong> ${new Date(dateStr).toLocaleDateString('en-IN')}</p>
          <p><strong>Daily Rate:</strong> ${isCovered ? this.formatCurrency(0) : this.formatCurrency(rate)}</p>
          ${subNotice}
        </div>
        <div class="modal-footer px-0 pb-0 pt-4 mt-4">
          <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-submit-behalf-booking">Confirm Booking</button>
        </div>
      `;

      modal.classList.add('open');

      const radioDirect = body.querySelector('input[value="direct"]');
      const radioLater = body.querySelector('input[value="later"]');
      const subform = body.querySelector('#behalf-direct-pay-subform');
      const alertBox = body.querySelector('#behalf-pay-later-alert');

      if (radioDirect && radioLater) {
        radioDirect.onclick = () => {
          subform.style.display = 'block';
          alertBox.style.display = 'none';
        };
        radioLater.onclick = () => {
          subform.style.display = 'none';
          alertBox.style.display = 'flex';
        };
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }

      document.getElementById('btn-submit-behalf-booking').onclick = () => {
        const admin = Auth.getCurrentUser();

        if (isCovered) {
          const res = Bookings.createBooking(userId, seat.id, dateStr, 0, 'admin');
          if (res.success) {
            modal.classList.remove('open');
            this.showToast('Seat reservation confirmed (covered by active pass).', 'success');
            refreshDailyGrid();
          } else {
            this.showToast(res.message, 'error');
          }
        } else {
          const isDirect = radioDirect.checked;

          if (isDirect) {
            const amtVal = parseFloat(document.getElementById('behalf-pay-amount').value);
            const modeVal = document.getElementById('behalf-pay-mode').value;
            const remarkVal = document.getElementById('behalf-pay-remarks').value;

            if (isNaN(amtVal) || amtVal <= 0) {
              this.showToast('Enter valid amount.', 'error');
              return;
            }

            const res = Bookings.createBooking(userId, seat.id, dateStr, rate, 'admin');
            if (res.success) {
              const payRes = Payments.createDirectPayment(res.booking.id, amtVal, modeVal, remarkVal, admin.id);
              modal.classList.remove('open');
              this.showToast('Booking confirmed & direct payment received.', 'success');
              if (payRes.invoice) {
                this.printInvoice(payRes.invoice.id);
              }
              refreshDailyGrid();
            } else {
              this.showToast(res.message, 'error');
            }
          } else {
            const res = Bookings.createBooking(userId, seat.id, dateStr, rate, 'admin');
            if (res.success) {
              modal.classList.remove('open');
              this.showToast('Booking created, awaiting user payment receipt.', 'info');
              refreshDailyGrid();
            } else {
              this.showToast(res.message, 'error');
            }
          }
        }
      };

      const refreshDailyGrid = () => {
        const userSelect = document.getElementById('behalf-daily-user');
        const dateSelect = document.getElementById('behalf-daily-date');
        this.renderAvailabilityGrid('behalf-daily-seat-grid', dateSelect.value, (s) => {
          this.promptConfirmBookingBehalf(userSelect.value, s, dateSelect.value);
        });
      };
    },

    renderAvailabilityGrid: function (containerId, dateStr, onClickAvailable) {
      const container = document.getElementById(containerId);
      const seatsWithAvailability = Bookings.getSeatAvailability(dateStr);
      const settings = DB.getAll(DB.KEYS.SETTINGS);

      const zones = {
        'AC': seatsWithAvailability.filter(s => s.zone === 'AC'),
        'Non-AC': seatsWithAvailability.filter(s => s.zone === 'Non-AC'),
        'Cabin': seatsWithAvailability.filter(s => s.zone === 'Cabin')
      };

      let zonesHtml = '';
      for (const [zoneName, zoneSeats] of Object.entries(zones)) {
        const rate = settings.rates[zoneName] || 0;
        
        let seatsGridHtml = '';
        if (zoneSeats.length === 0) {
          seatsGridHtml = `<p class="text-muted italic p-4 text-center">No seats added in this zone.</p>`;
        } else {
          seatsGridHtml = `<div class="seat-layout-grid">`;
          zoneSeats.forEach(seat => {
            let stateClass = '';
            let label = seat.statusOnDate;

            if (seat.statusOnDate === 'Available') {
              stateClass = 'seat-available';
            } else if (seat.statusOnDate === 'Occupied') {
              stateClass = 'seat-occupied';
            } else {
              stateClass = 'seat-blocked';
            }

            seatsGridHtml += `
              <div class="seat-tile ${stateClass}" data-id="${seat.id}" title="${seat.seatNumber} (${label})">
                <i data-lucide="armchair"></i>
                <span class="seat-label">${seat.seatNumber}</span>
              </div>
            `;
          });
          seatsGridHtml += `</div>`;
        }

        zonesHtml += `
          <div class="seat-zone-block">
            <div class="zone-header justify-between flex-wrap gap-2">
              <h4>${zoneName} Zone</h4>
              <span class="text-sm text-muted font-medium">Rate: ${this.formatCurrency(rate)}/Day</span>
            </div>
            ${seatsGridHtml}
          </div>
        `;
      }

      container.innerHTML = zonesHtml;

      if (window.lucide) {
        window.lucide.createIcons();
      }

      const seatTiles = container.querySelectorAll('.seat-tile.seat-available');
      seatTiles.forEach(tile => {
        tile.onclick = () => {
          const seat = seatsWithAvailability.find(s => s.id === tile.getAttribute('data-id'));
          if (seat && onClickAvailable) onClickAvailable(seat);
        };
      });
    },

    renderAdminVerifyPayments: function () {
      const view = document.getElementById('admin-verify-payments-view');
      view.classList.add('active-view');

      const pendings = Payments.getPendingPayments();
      const bookings = DB.getAll(DB.KEYS.BOOKINGS);
      const payments = DB.getAll(DB.KEYS.PAYMENTS);
      const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS);
      const plans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS);
      const users = DB.getAll(DB.KEYS.USERS);
      const seats = DB.getAll(DB.KEYS.SEATS);

      // Render Table 1: Screenshot uploads awaiting verification
      let screenshotRows = '';
      if (pendings.length === 0) {
        screenshotRows = `<tr><td colspan="7" class="text-center py-6 text-muted">No screenshot uploads awaiting review.</td></tr>`;
      } else {
        pendings.forEach((p, idx) => {
          let desc = '';
          let bId = p.bookingId;
          let subId = p.subscriptionId;
          
          if (p.paymentFor === 'Subscription') {
            desc = `Pass: ${p.plan.name || 'Plan'} ${p.seat ? '(Seat ' + p.seat.seatNumber + ')' : '(Flexible)'}`;
          } else {
            desc = `Daily Seat ${p.seat.seatNumber || 'N/A'} (${p.seat.zone || ''})`;
          }

          screenshotRows += `
            <tr>
              <td data-label="S.No">${idx + 1}</td>
              <td data-label="Member">
                <strong>${p.user.name || 'Deleted'}</strong>
                <p class="text-xs text-muted">@${p.user.username || ''}</p>
              </td>
              <td data-label="Description">${desc}</td>
              <td data-label="Reserved Date">${p.booking ? new Date(p.booking.bookingDate).toLocaleDateString('en-IN') : new Date(p.subscription.startDate).toLocaleDateString('en-IN')}</td>
              <td data-label="Amount Claimed"><strong>${this.formatCurrency(p.amount)}</strong></td>
              <td data-label="Screenshot">
                <button class="btn btn-outline btn-xs btn-view-receipt" data-base64="${p.screenshotBase64}">
                  <i data-lucide="image" class="w-4 h-4 inline-block mr-1"></i> View Screenshot
                </button>
              </td>
              <td data-label="Verification Action">
                <div class="action-btn-group justify-end flex-wrap gap-2">
                  <button class="btn btn-green btn-xs btn-approve-pay" data-id="${p.id}" title="Approve Upload">
                    <i data-lucide="check" class="w-3.5 h-3.5 inline mr-1"></i> Approve
                  </button>
                  <button class="btn btn-red btn-xs btn-reject-pay" data-id="${p.id}" title="Reject Upload">
                    <i data-lucide="x" class="w-3.5 h-3.5 inline mr-1"></i> Reject
                  </button>
                  <button class="btn btn-outline btn-primary btn-xs btn-direct-pay-trigger" data-type="${p.paymentFor}" data-id="${bId || subId}" data-rate="${p.amount}" title="Mark Paid Directly">
                    <i data-lucide="indian-rupee" class="w-3.5 h-3.5 inline mr-1"></i> Direct Paid
                  </button>
                </div>
              </td>
            </tr>
          `;
        });
      }

      // Render Table 2: Unpaid bookings and subscription passes awaiting screenshot
      const unpaidBookings = bookings.filter(b => {
        if (b.status !== 'PendingPayment') return false;
        const hasPendingProof = payments.some(p => p.bookingId === b.id && p.status === 'Pending');
        return !hasPendingProof;
      }).map(b => {
        const user = users.find(u => u.id === b.userId) || {};
        const seat = seats.find(s => s.id === b.seatId) || {};
        return {
          id: b.id,
          type: 'DailyBooking',
          user,
          desc: `Daily Seat ${seat.seatNumber || 'N/A'}`,
          date: b.bookingDate,
          rate: b.ratePerDay
        };
      });

      const unpaidSubscriptions = subscriptions.filter(s => {
        if (s.status !== 'PendingPayment') return false;
        const hasPendingProof = payments.some(p => p.subscriptionId === s.id && p.status === 'Pending');
        return !hasPendingProof;
      }).map(s => {
        const user = users.find(u => u.id === s.userId) || {};
        const plan = plans.find(p => p.id === s.planId) || {};
        const seat = s.assignedSeatId ? seats.find(se => se.id === s.assignedSeatId) : null;
        return {
          id: s.id,
          type: 'Subscription',
          user,
          desc: `Pass: ${plan.name || ''} ${seat ? '(Seat ' + seat.seatNumber + ')' : '(Flexible)'}`,
          date: `${s.startDate} to ${s.endDate}`,
          rate: plan.price
        };
      });

      const allUnpaids = [...unpaidBookings, ...unpaidSubscriptions];

      let unpaidRows = '';
      if (allUnpaids.length === 0) {
        unpaidRows = `<tr><td colspan="6" class="text-center py-6 text-muted">No unpaid outstanding dues.</td></tr>`;
      } else {
        allUnpaids.forEach((b, idx) => {
          unpaidRows += `
            <tr>
              <td data-label="S.No">${idx + 1}</td>
              <td data-label="Member">
                <strong>${b.user.name || 'Deleted'}</strong>
                <p class="text-xs text-muted">@${b.user.username || ''}</p>
              </td>
              <td data-label="Description">${b.desc}</td>
              <td data-label="Reserved Date / Period">${b.date}</td>
              <td data-label="Base Rate"><strong>${this.formatCurrency(b.rate)}</strong></td>
              <td data-label="Action">
                <button class="btn btn-primary btn-xs btn-direct-pay-trigger" data-type="${b.type}" data-id="${b.id}" data-rate="${b.rate}">
                  <i data-lucide="indian-rupee" class="w-3.5 h-3.5 inline mr-1"></i> Mark Paid Directly
                </button>
              </td>
            </tr>
          `;
        });
      }

      view.innerHTML = `
        <div class="card mb-6">
          <div class="card-header justify-between flex-wrap gap-2">
            <h3>Screenshot Proofs Submitted</h3>
            <span class="badge badge-yellow">${pendings.length} Awaiting Verification</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>S.No</th><th>Member</th><th>Description</th><th>Reserved Date</th><th>Amount Claimed</th><th>Screenshot</th><th>Verification Action</th>
                </tr>
              </thead>
              <tbody>${screenshotRows}</tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header justify-between flex-wrap gap-2">
            <h3>Unpaid Dues (Awaiting Receipt Upload)</h3>
            <span class="badge badge-red">${allUnpaids.length} Outstanding</span>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>S.No</th><th>Member</th><th>Description</th><th>Reserved Date / Period</th><th>Base Rate</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>${unpaidRows}</tbody>
            </table>
          </div>
        </div>

        <!-- Modals -->
        <div id="modal-zoom-image" class="modal">
          <div class="modal-content max-w-md">
            <div class="modal-header">
              <h3>Receipt Image Preview</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body text-center">
              <img id="zoom-img-target" src="" class="payment-zoom-preview">
            </div>
          </div>
        </div>

        <div id="modal-reject-pay" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Reject Receipt</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-reject-pay" class="modal-body">
              <input type="hidden" id="reject-pay-id">
              <div class="form-group">
                <label>Rejection Remarks</label>
                <textarea id="reject-remarks" required></textarea>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-danger">Reject Payment</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Direct Payment Modal -->
        <div id="modal-direct-pay" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Confirm Direct Payment Collection</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-direct-pay" class="modal-body">
              <input type="hidden" id="direct-pay-id">
              <input type="hidden" id="direct-pay-type">
              <input type="hidden" id="direct-pay-expected-rate">
              <div class="form-group">
                <label>Amount Collected (INR)</label>
                <input type="number" id="direct-pay-amount" min="1" required>
              </div>
              <div class="form-group">
                <label>Payment Mode</label>
                <select id="direct-pay-mode" required>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Optional Notes</label>
                <input type="text" id="direct-pay-remarks">
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      `;

      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Zoom Modal trigger
      const zoomModal = document.getElementById('modal-zoom-image');
      const zoomImg = document.getElementById('zoom-img-target');
      
      view.querySelectorAll('.btn-view-receipt').forEach(btn => {
        btn.onclick = () => {
          zoomImg.src = btn.getAttribute('data-base64');
          zoomModal.classList.add('open');
        };
      });

      // Approve Action
      const admin = Auth.getCurrentUser();
      view.querySelectorAll('.btn-approve-pay').forEach(btn => {
        btn.onclick = () => {
          if (confirm('Approve this payment? Invoice will be generated.')) {
            const res = Payments.approvePayment(btn.getAttribute('data-id'), admin.id);
            if (res.success) {
              this.showToast('Payment verified successfully.', 'success');
              this.renderAdminVerifyPayments();
            } else {
              this.showToast(res.message, 'error');
            }
          }
        };
      });

      // Reject Action Modal
      const rejectModal = document.getElementById('modal-reject-pay');
      view.querySelectorAll('.btn-reject-pay').forEach(btn => {
        btn.onclick = () => {
          document.getElementById('reject-pay-id').value = btn.getAttribute('data-id');
          document.getElementById('reject-remarks').value = '';
          rejectModal.classList.add('open');
        };
      });

      // Reject Submit
      document.getElementById('form-reject-pay').onsubmit = (e) => {
        e.preventDefault();
        const payId = document.getElementById('reject-pay-id').value;
        const remarks = document.getElementById('reject-remarks').value;

        if (Payments.rejectPayment(payId, admin.id, remarks).success) {
          rejectModal.classList.remove('open');
          this.showToast('Payment rejected.', 'warning');
          this.renderAdminVerifyPayments();
        } else {
          this.showToast('Failed to reject.', 'error');
        }
      };

      // Direct Payment Confirm Dialog Modal opens
      const directModal = document.getElementById('modal-direct-pay');
      view.querySelectorAll('.btn-direct-pay-trigger').forEach(btn => {
        btn.onclick = () => {
          const type = btn.getAttribute('data-type');
          const targetId = btn.getAttribute('data-id');
          const rate = parseFloat(btn.getAttribute('data-rate'));
          
          document.getElementById('direct-pay-type').value = type;
          document.getElementById('direct-pay-id').value = targetId;
          document.getElementById('direct-pay-expected-rate').value = rate;
          document.getElementById('direct-pay-amount').value = rate;
          document.getElementById('direct-pay-remarks').value = '';
          
          directModal.classList.add('open');
        };
      });

      // Handle Direct Pay Submit Form
      document.getElementById('form-direct-pay').onsubmit = (e) => {
        e.preventDefault();
        const type = document.getElementById('direct-pay-type').value;
        const targetId = document.getElementById('direct-pay-id').value;
        const rate = parseFloat(document.getElementById('direct-pay-expected-rate').value);
        const amount = parseFloat(document.getElementById('direct-pay-amount').value);
        const mode = document.getElementById('direct-pay-mode').value;
        const remarks = document.getElementById('direct-pay-remarks').value;

        if (isNaN(amount) || amount <= 0) {
          this.showToast('Please enter a valid amount.', 'error');
          return;
        }

        let res;
        if (type === 'Subscription') {
          res = Payments.createDirectSubscriptionPayment(targetId, amount, mode, remarks, admin.id);
        } else {
          res = Payments.createDirectPayment(targetId, amount, mode, remarks, admin.id);
        }

        if (res.success) {
          directModal.classList.remove('open');
          this.showToast(res.message, 'success');
          
          if (res.invoice) {
            this.printInvoice(res.invoice.id);
          }
          this.renderAdminVerifyPayments();
        } else {
          this.showToast(res.message, 'error');
        }
      };
    },

    renderAdminBilling: function () {
      const view = document.getElementById('admin-billing-view');
      view.classList.add('active-view');

      const invoices = Invoices.getAll();
      const bookings = DB.getAll(DB.KEYS.BOOKINGS);
      const users = DB.getAll(DB.KEYS.USERS);
      const seats = DB.getAll(DB.KEYS.SEATS);
      const stats = Admin.getDashboardStats();

      // Expiring passes list html
      let expiringRows = '';
      if (stats.expiringSoon.length === 0) {
        expiringRows = `<tr><td colspan="5" class="text-center py-4 text-muted">No subscriptions expiring within 5 days.</td></tr>`;
      } else {
        stats.expiringSoon.forEach((sub, idx) => {
          expiringRows += `
            <tr>
              <td data-label="S.No">${idx + 1}</td>
              <td data-label="Member"><strong>${sub.user.name}</strong> (@${sub.user.username})</td>
              <td data-label="Plan">${sub.plan.name}</td>
              <td data-label="Expiry Date">${sub.endDate} <span class="badge badge-yellow text-xs">${sub.daysRemaining} days left</span></td>
              <td data-label="Action">
                <button class="btn btn-outline btn-xs btn-renew-behalf" data-userId="${sub.userId}" data-planId="${sub.planId}">
                  <i data-lucide="refresh-cw" class="w-3.5 h-3.5 inline mr-1"></i> Renew Pass
                </button>
              </td>
            </tr>
          `;
        });
      }

      // Expired passes list html
      let expiredRows = '';
      if (stats.expiredList.length === 0) {
        expiredRows = `<tr><td colspan="5" class="text-center py-4 text-muted">No expired subscriptions found in archive.</td></tr>`;
      } else {
        stats.expiredList.forEach((sub, idx) => {
          expiredRows += `
            <tr>
              <td data-label="S.No">${idx + 1}</td>
              <td data-label="Member"><strong>${sub.user.name}</strong> (@${sub.user.username})</td>
              <td data-label="Plan">${sub.plan.name}</td>
              <td data-label="Expiry Date">${sub.endDate} <span class="badge badge-red text-xs">Expired</span></td>
              <td data-label="Action">
                <button class="btn btn-outline btn-xs btn-renew-behalf" data-userId="${sub.userId}" data-planId="${sub.planId}">
                  <i data-lucide="refresh-cw" class="w-3.5 h-3.5 inline mr-1"></i> Renew Pass
                </button>
              </td>
            </tr>
          `;
        });
      }

      view.innerHTML = `
        <div class="card mb-6">
          <div class="card-header"><h3>Revenue Ledger Filters</h3></div>
          <div class="card-body">
            <div class="filter-controls-row flex-col sm-row gap-4">
              <div class="form-group mb-0 flex-1">
                <label>From Date</label>
                <input type="date" id="billing-filter-from">
              </div>
              <div class="form-group mb-0 flex-1">
                <label>To Date</label>
                <input type="date" id="billing-filter-to">
              </div>
              <div class="btn-align-end gap-2 flex-wrap">
                <button id="btn-apply-billing-filter" class="btn btn-primary"><i data-lucide="filter"></i> Apply</button>
                <button id="btn-clear-billing-filter" class="btn btn-outline">Clear</button>
                <button id="btn-export-csv" class="btn btn-success"><i data-lucide="download"></i> Export CSV</button>
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-split mb-6">
          <div class="card flex-1">
            <div class="card-header justify-between flex-wrap gap-2">
              <h3>Expiring Soon passes (5 Days)</h3>
              <span class="badge badge-yellow">${stats.expiringSoon.length} member(s)</span>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead><tr><th>S.No</th><th>Member</th><th>Plan</th><th>Expiry Date</th><th>Action</th></tr></thead>
                <tbody>${expiringRows}</tbody>
              </table>
            </div>
          </div>
          <div class="card flex-1">
            <div class="card-header justify-between flex-wrap gap-2">
              <h3>Expired / Unrenewed passes</h3>
              <span class="badge badge-red">${stats.expiredList.length} member(s)</span>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead><tr><th>S.No</th><th>Member</th><th>Plan</th><th>Expiry Date</th><th>Action</th></tr></thead>
                <tbody>${expiredRows}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header justify-between flex-wrap gap-2">
            <h3>Revenue Invoices Ledger</h3>
            <span id="ledger-count-label" class="text-sm font-semibold text-muted"></span>
          </div>
          <div class="table-container">
            <table class="data-table" id="invoices-ledger-table">
              <thead>
                <tr>
                  <th>S.No</th><th>Invoice No</th><th>Date</th><th>Member Name</th><th>Seat / Plan</th><th>Base Amt</th><th>GST Tax</th><th>Total Paid</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="invoices-ledger-body"></tbody>
            </table>
          </div>
        </div>

        <!-- Printable Invoice Container -->
        <div id="print-invoice-area" class="print-only"></div>

        <!-- Subscription Renew modal -->
        <div id="modal-renew-pass" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Renew User Pass</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-renew-pass" class="modal-body">
              <input type="hidden" id="renew-user-id">
              <div class="form-group">
                <label>Select Renewal Plan</label>
                <select id="renew-plan-select" required></select>
              </div>
              <div id="renew-seat-select-group" class="form-group" style="display:none;">
                <label>Assign Seat (Fixed)</label>
                <select id="renew-seat-select"></select>
              </div>
              <div class="payment-choice-box mt-4 border-t pt-4">
                <label class="font-bold text-sm block mb-2">Payment Collection Options</label>
                <div class="form-row-grid mb-3">
                  <label class="checkbox-label">
                    <input type="radio" name="renew-payment-type" value="direct" checked>
                    <span>Confirm Payment Now</span>
                  </label>
                  <label class="checkbox-label">
                    <input type="radio" name="renew-payment-type" value="later">
                    <span>User Will Pay Later</span>
                  </label>
                </div>
                <div id="renew-direct-pay-subform" class="border p-2 rounded" style="background-color: var(--gray-light);">
                  <div class="form-group mb-1">
                    <label class="text-xs">Amount Received</label>
                    <input type="number" id="renew-pay-amount">
                  </div>
                  <div class="form-group mb-0">
                    <label class="text-xs">Payment Mode</label>
                    <select id="renew-pay-mode">
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4 mt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Renew Pass</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const filterFrom = document.getElementById('billing-filter-from');
      const filterTo = document.getElementById('billing-filter-to');
      const applyBtn = document.getElementById('btn-apply-billing-filter');
      const clearBtn = document.getElementById('btn-clear-billing-filter');
      const exportBtn = document.getElementById('btn-export-csv');

      const filterLedger = () => {
        const fromVal = filterFrom.value;
        const toVal = filterTo.value;

        let filtered = invoices;
        if (fromVal) filtered = filtered.filter(inv => inv.invoiceDate >= fromVal);
        if (toVal) filtered = filtered.filter(inv => inv.invoiceDate <= toVal);

        const tbody = document.getElementById('invoices-ledger-body');
        document.getElementById('ledger-count-label').innerText = `${filtered.length} invoice(s) found`;

        let rowsHtml = '';
        if (filtered.length === 0) {
          rowsHtml = `<tr><td colspan="9" class="text-center py-8">No invoice records found in this range.</td></tr>`;
        } else {
          filtered.forEach((inv, idx) => {
            const user = users.find(u => u.id === (inv.invoiceType === 'Subscription' ? 
              (DB.getById(DB.KEYS.SUBSCRIPTIONS, inv.subscriptionId) || {}).userId :
              (bookings.find(b => b.id === inv.bookingId) || {}).userId)) || { name: 'Deleted User' };
            
            let seatDesc = '';
            if (inv.invoiceType === 'Subscription') {
              const sub = DB.getById(DB.KEYS.SUBSCRIPTIONS, inv.subscriptionId) || {};
              const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, sub.planId) || {};
              const seat = sub.assignedSeatId ? seats.find(s => s.id === sub.assignedSeatId) : null;
              seatDesc = `Pass: ${plan.name || 'Plan'} ${seat ? '(Seat ' + seat.seatNumber + ')' : '(Flexible)'}`;
            } else {
              const booking = bookings.find(b => b.id === inv.bookingId) || {};
              const seat = seats.find(s => s.id === booking.seatId) || {};
              seatDesc = `Daily Seat ${seat.seatNumber || 'N/A'}`;
            }

            rowsHtml += `
              <tr>
                <td data-label="S.No">${idx + 1}</td>
                <td data-label="Invoice No"><strong>${inv.invoiceNumber}</strong></td>
                <td data-label="Date">${new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                <td data-label="Member Name">${user.name}</td>
                <td data-label="Seat / Plan">${seatDesc}</td>
                <td data-label="Base Amt">${this.formatCurrency(inv.amount)}</td>
                <td data-label="GST Tax">${inv.gstApplicable ? this.formatCurrency(inv.gstAmount) : 'Exempted'}</td>
                <td data-label="Total Paid"><strong>${this.formatCurrency(inv.totalAmount)}</strong></td>
                <td data-label="Actions">
                  <button class="btn btn-outline btn-xs btn-print-invoice" data-id="${inv.id}">
                    <i data-lucide="printer" class="w-3.5 h-3.5 inline mr-1"></i> Print
                  </button>
                </td>
              </tr>
            `;
          });
        }

        tbody.innerHTML = rowsHtml;
        if (window.lucide) window.lucide.createIcons();

        tbody.querySelectorAll('.btn-print-invoice').forEach(btn => {
          btn.onclick = () => { this.printInvoice(btn.getAttribute('data-id')); };
        });
      };

      applyBtn.onclick = filterLedger;
      clearBtn.onclick = () => {
        filterFrom.value = '';
        filterTo.value = '';
        filterLedger();
      };

      exportBtn.onclick = () => {
        Admin.exportBillingToCSV(filterFrom.value, filterTo.value);
        this.showToast('CSV export downloaded.', 'success');
      };

      // Renewal Triggers
      const renewModal = document.getElementById('modal-renew-pass');
      const renewPlan = document.getElementById('renew-plan-select');
      const renewSeatGroup = document.getElementById('renew-seat-select-group');
      const renewSeat = document.getElementById('renew-seat-select');
      const renewRadioDirect = document.querySelector('input[name="renew-payment-type"][value="direct"]');
      const renewRadioLater = document.querySelector('input[name="renew-payment-type"][value="later"]');
      const renewPayForm = document.getElementById('renew-direct-pay-subform');

      renewRadioDirect.onclick = () => { renewPayForm.style.display = 'block'; };
      renewRadioLater.onclick = () => { renewPayForm.style.display = 'none'; };

      view.querySelectorAll('.btn-renew-behalf').forEach(btn => {
        btn.onclick = () => {
          const userId = btn.getAttribute('data-userId');
          const defaultPlanId = btn.getAttribute('data-planId');
          document.getElementById('renew-user-id').value = userId;

          const plans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS).filter(p => p.isActive);
          let planOptions = '';
          plans.forEach(p => {
            planOptions += `<option value="${p.id}" ${p.id === defaultPlanId ? 'selected' : ''}>${p.name}</option>`;
          });
          renewPlan.innerHTML = planOptions;

          const refreshRenewSeats = () => {
            const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, renewPlan.value);
            document.getElementById('renew-pay-amount').value = plan.price;
            
            if (plan.seatAllocationType === 'FixedSeat') {
              renewSeatGroup.style.display = 'block';
              const seats = DB.getAll(DB.KEYS.SEATS).filter(s => s.status !== 'Blocked' && (plan.seatType === 'Any' || s.zone === plan.seatType));
              const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS).filter(sub => sub.status === 'Active' && sub.assignedSeatId);
              const assignedSeatIds = subscriptions.map(s => s.assignedSeatId);

              let seatOptions = '';
              seats.forEach(s => {
                if (!assignedSeatIds.includes(s.id)) seatOptions += `<option value="${s.id}">${s.seatNumber}</option>`;
              });
              renewSeat.innerHTML = seatOptions || '<option value="">-- No Seat Available --</option>';
            } else {
              renewSeatGroup.style.display = 'none';
            }
          };

          renewPlan.onchange = refreshRenewSeats;
          refreshRenewSeats();
          renewModal.classList.add('open');
        };
      });

      document.getElementById('form-renew-pass').onsubmit = (e) => {
        e.preventDefault();
        const userId = document.getElementById('renew-user-id').value;
        const planId = renewPlan.value;
        const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, planId);

        let seatId = null;
        if (plan.seatAllocationType === 'FixedSeat') {
          seatId = renewSeat.value;
          if (!seatId) {
            this.showToast('No seat available for assignment.', 'error');
            return;
          }
        }

        const isDirect = renewRadioDirect.checked;
        const adminUser = Auth.getCurrentUser();
        const todayStr = new Date().toISOString().split('T')[0];
        
        const startObj = new Date(todayStr + 'T00:00:00');
        if (plan.type === 'Monthly') {
          startObj.setMonth(startObj.getMonth() + 1);
        } else {
          startObj.setFullYear(startObj.getFullYear() + 1);
        }
        const endDate = startObj.toISOString().split('T')[0];

        const newSub = {
          id: DB.generateId('sub'),
          userId: userId,
          planId: planId,
          startDate: todayStr,
          endDate: endDate,
          assignedSeatId: seatId,
          status: isDirect ? 'Active' : 'PendingPayment',
          paymentId: null,
          createdBy: 'admin',
          createdAt: new Date().toISOString()
        };

        if (isDirect) {
          const amt = parseFloat(document.getElementById('renew-pay-amount').value);
          const mode = document.getElementById('renew-pay-mode').value;
          
          DB.insert(DB.KEYS.SUBSCRIPTIONS, newSub);
          const payRes = Payments.createDirectSubscriptionPayment(newSub.id, amt, mode, 'Pass Renewed', adminUser.id);
          this.showToast('Pass renewed successfully.', 'success');
          if (payRes.invoice) this.printInvoice(payRes.invoice.id);
        } else {
          DB.insert(DB.KEYS.SUBSCRIPTIONS, newSub);
          this.showToast('Pass renewal created. Awaiting upload.', 'info');
        }

        renewModal.classList.remove('open');
        this.renderAdminBilling();
      };

      filterLedger();
    },

    printInvoice: function (invoiceId) {
      const data = Invoices.getInvoicePrintData(invoiceId);
      if (!data) {
        this.showToast('Invoice details missing.', 'error');
        return;
      }

      const printArea = document.getElementById('print-invoice-area');
      const { invoice, booking, subscription, plan, user, seat, settings } = data;

      const logo = settings.logoBase64 ? 
        `<img src="${settings.logoBase64}" class="print-invoice-logo">` : 
        `<div class="print-logo-dummy"><i data-lucide="book-open"></i></div>`;

      let itemsHtml = '';
      if (invoice.invoiceType === 'Subscription') {
        itemsHtml = `
          <tr>
            <td>Subscription Pass: ${plan.name} (Allocation: ${plan.seatAllocationType})</td>
            <td class="text-center">${subscription.startDate} to ${subscription.endDate}</td>
            <td class="text-right">${this.formatCurrency(invoice.amount)}</td>
            <td class="text-center">1 Pass</td>
            <td class="text-right">${this.formatCurrency(invoice.amount)}</td>
          </tr>
          ${subscription.assignedSeatId ? `
            <tr>
              <td colspan="5" class="text-sm text-muted italic">Assigned Seat: Seat ${seat.seatNumber} (${seat.zone} zone)</td>
            </tr>
          ` : ''}
        `;
      } else {
        itemsHtml = `
          <tr>
            <td>Study Seat Reservation - Seat ${seat ? seat.seatNumber : 'N/A'} (Zone: ${seat ? seat.zone : 'N/A'})</td>
            <td class="text-center">${booking ? new Date(booking.bookingDate).toLocaleDateString('en-IN') : '-'}</td>
            <td class="text-right">${this.formatCurrency(booking ? booking.ratePerDay : 0)}</td>
            <td class="text-center">1 Day</td>
            <td class="text-right">${this.formatCurrency(booking ? booking.ratePerDay : 0)}</td>
          </tr>
        `;
      }

      printArea.innerHTML = `
        <div class="print-invoice-wrapper">
          <div class="print-invoice-header">
            <div class="pi-header-left">
              ${logo}
              <h2>${settings.libraryName || 'Apex Study Center'}</h2>
              <p>${settings.address || 'Knowledge Hub'}</p>
              ${settings.gstNumber ? `<p><strong>GSTIN:</strong> ${settings.gstNumber}</p>` : ''}
            </div>
            <div class="pi-header-right text-right">
              <h1>TAX INVOICE</h1>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
              <p><strong>Status:</strong> <span class="paid-stamp">PAID</span></p>
            </div>
          </div>

          <div class="print-invoice-bill-to">
            <h4>Billed To:</h4>
            <p><strong>Name:</strong> ${user ? user.name : 'N/A'}</p>
            <p><strong>Username:</strong> @${user ? user.username : 'N/A'}</p>
            <p><strong>Contact:</strong> ${user ? user.contact : 'N/A'}</p>
          </div>

          <table class="print-invoice-items">
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Period / Date</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="print-invoice-summary mt-6">
            <div class="pi-summary-row">
              <span>Subtotal:</span>
              <span>${this.formatCurrency(invoice.amount)}</span>
            </div>
            ${invoice.gstApplicable ? `
              <div class="pi-summary-row">
                <span>GST Tax (${settings.gstPercentage}%):</span>
                <span>${this.formatCurrency(invoice.gstAmount)}</span>
              </div>
            ` : ''}
            <div class="pi-summary-row total-row mt-2 font-bold">
              <span>Grand Total:</span>
              <span>${this.formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>

          <div class="print-invoice-footer mt-8 text-center text-xs text-muted">
            <p>Thank you for choosing ${settings.libraryName || 'Apex Study Center'}!</p>
            <p>This is a computer-generated digital tax invoice and requires no signature.</p>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      window.print();
    },

    renderAdminSettings: function () {
      const view = document.getElementById('admin-settings-view');
      view.classList.add('active-view');

      const settings = DB.getAll(DB.KEYS.SETTINGS);
      const user = Auth.getCurrentUser();
      const plans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS);

      // Plans CRUD render rows
      let planRows = '';
      if (plans.length === 0) {
        planRows = `<tr><td colspan="6" class="text-center py-4 text-muted">No subscription passes found.</td></tr>`;
      } else {
        plans.forEach((p, idx) => {
          planRows += `
            <tr>
              <td data-label="S.No">${idx + 1}</td>
              <td data-label="Plan Name"><strong>${p.name}</strong></td>
              <td data-label="Period">${p.type}</td>
              <td data-label="Price"><strong>${this.formatCurrency(p.price)}</strong></td>
              <td data-label="Scope">Seat: ${p.seatType} (${p.seatAllocationType})</td>
              <td data-label="Status">
                <span class="badge ${p.isActive ? 'badge-green' : 'badge-red'}">${p.isActive ? 'Active' : 'Deactivated'}</span>
              </td>
              <td data-label="Action">
                <button class="btn btn-outline btn-xs btn-toggle-plan" data-id="${p.id}">
                  ${p.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          `;
        });
      }

      view.innerHTML = `
        <div class="dashboard-split mb-6">
          <div class="card flex-2">
            <div class="card-header justify-between flex-wrap gap-2">
              <h3>Pass Subscription Plans</h3>
              <button id="btn-add-plan" class="btn btn-primary btn-xs"><i data-lucide="plus"></i> Add Plan</button>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead><tr><th>S.No</th><th>Plan Name</th><th>Period</th><th>Price</th><th>Scope</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>${planRows}</tbody>
              </table>
            </div>
          </div>

          <div class="card flex-1">
            <div class="card-header"><h3>Security Reset</h3></div>
            <form id="form-admin-password" class="card-body">
              <div class="form-group">
                <label>Current Password</label>
                <input type="password" id="admin-pass-current" required>
              </div>
              <div class="form-group">
                <label>New Password</label>
                <input type="password" id="admin-pass-new" required>
              </div>
              <div class="form-group">
                <label>Confirm Password</label>
                <input type="password" id="admin-pass-confirm" required>
              </div>
              <button type="submit" class="btn btn-primary mt-2"><i data-lucide="shield-alert"></i> Update Password</button>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Library details & Config</h3></div>
          <form id="form-settings" class="card-body">
            <div class="form-group">
              <label>Library Name</label>
              <input type="text" id="settings-lib-name" value="${settings.libraryName || ''}" required>
            </div>
            <div class="form-group">
              <label>Address</label>
              <textarea id="settings-address" required>${settings.address || ''}</textarea>
            </div>
            <div class="form-row-grid">
              <div class="form-group">
                <label>Overdue Threshold (Days)</label>
                <input type="number" id="settings-overdue-days" value="${settings.overdueDays || 2}" min="1" required>
              </div>
              <div class="form-group">
                <label>GST Number (GSTIN)</label>
                <input type="text" id="settings-gst-in" value="${settings.gstNumber || ''}">
              </div>
            </div>
            
            <div class="form-row-grid">
              <div class="form-group flex-1">
                <label>GST Tax rate (%)</label>
                <input type="number" id="settings-gst-pct" value="${settings.gstPercentage || 18}" min="0" max="100" required>
              </div>
              <div class="form-group flex-1 justify-center">
                <label class="checkbox-label mt-4">
                  <input type="checkbox" id="settings-gst-enabled" ${settings.gstEnabled !== false ? 'checked' : ''}>
                  <span>Apply GST on Invoices</span>
                </label>
              </div>
            </div>

            <div class="form-row-grid">
              <div class="form-group">
                <label>AC Daily Rate (INR)</label>
                <input type="number" id="rate-ac" value="${settings.rates.AC || 200}" min="1" required>
              </div>
              <div class="form-group">
                <label>Non-AC Daily Rate (INR)</label>
                <input type="number" id="rate-nonac" value="${settings.rates['Non-AC'] || 120}" min="1" required>
              </div>
              <div class="form-group">
                <label>Cabin Daily Rate (INR)</label>
                <input type="number" id="rate-cabin" value="${settings.rates.Cabin || 350}" min="1" required>
              </div>
            </div>

            <div class="form-group">
              <label>Library Logo Image</label>
              <input type="file" id="settings-logo-file" accept="image/*">
              ${settings.logoBase64 ? 
                `<div class="logo-preview-box mt-2" id="logo-preview-container">
                  <img src="${settings.logoBase64}" class="lib-logo-thumbnail">
                  <button type="button" class="btn btn-red btn-xs" id="btn-remove-logo">Remove Logo</button>
                </div>` : ''
              }
            </div>

            <button type="submit" class="btn btn-primary mt-4"><i data-lucide="save"></i> Save Configurations</button>
          </form>
        </div>

        <!-- Add Plan Modal -->
        <div id="modal-add-plan" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Create Subscription Plan</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-add-plan" class="modal-body">
              <div class="form-group">
                <label>Plan Name</label>
                <input type="text" id="plan-name" placeholder="e.g. Monthly Cabin Pass" required>
              </div>
              <div class="form-row-grid">
                <div class="form-group">
                  <label>Plan Type</label>
                  <select id="plan-type" required>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Flat Price (INR)</label>
                  <input type="number" id="plan-price" min="100" required>
                </div>
              </div>
              <div class="form-row-grid">
                <div class="form-group">
                  <label>Seat Zone Scope</label>
                  <select id="plan-seat-type" required>
                    <option value="AC">AC Zone</option>
                    <option value="Non-AC">Non-AC Zone</option>
                    <option value="Cabin">Cabin Zone</option>
                    <option value="Any">Any Seat</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Allocation Rules</label>
                  <select id="plan-alloc-type" required>
                    <option value="FlexibleDaily">Flexible Daily Booking</option>
                    <option value="FixedSeat">Fixed Seat Assigned</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const addPlanModal = document.getElementById('modal-add-plan');
      document.getElementById('btn-add-plan').onclick = () => {
        document.getElementById('form-add-plan').reset();
        addPlanModal.classList.add('open');
      };

      document.getElementById('form-add-plan').onsubmit = (e) => {
        e.preventDefault();
        const newPlan = {
          id: DB.generateId('subplan'),
          name: document.getElementById('plan-name').value.trim(),
          type: document.getElementById('plan-type').value,
          price: parseFloat(document.getElementById('plan-price').value),
          seatType: document.getElementById('plan-seat-type').value,
          seatAllocationType: document.getElementById('plan-alloc-type').value,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        DB.insert(DB.KEYS.SUBSCRIPTION_PLANS, newPlan);
        addPlanModal.classList.remove('open');
        this.showToast('Subscription plan created.', 'success');
        this.renderAdminSettings();
      };

      view.querySelectorAll('.btn-toggle-plan').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, id);
          if (plan) {
            DB.update(DB.KEYS.SUBSCRIPTION_PLANS, id, { isActive: !plan.isActive });
            this.showToast('Plan status changed.', 'success');
            this.renderAdminSettings();
          }
        };
      });

      document.getElementById('form-settings').onsubmit = async (e) => {
        e.preventDefault();
        const rates = {
          'AC': parseFloat(document.getElementById('rate-ac').value),
          'Non-AC': parseFloat(document.getElementById('rate-nonac').value),
          'Cabin': parseFloat(document.getElementById('rate-cabin').value)
        };

        const updatedSettings = {
          rates: rates,
          overdueDays: parseInt(document.getElementById('settings-overdue-days').value),
          gstPercentage: parseFloat(document.getElementById('settings-gst-pct').value),
          gstEnabled: document.getElementById('settings-gst-enabled').checked,
          libraryName: document.getElementById('settings-lib-name').value.trim(),
          address: document.getElementById('settings-address').value.trim(),
          gstNumber: document.getElementById('settings-gst-in').value.trim(),
          logoBase64: settings.logoBase64 || ''
        };

        const logoFile = document.getElementById('settings-logo-file').files[0];
        if (logoFile) {
          try {
            updatedSettings.logoBase64 = await Payments.fileToBase64(logoFile);
          } catch (err) {
            this.showToast('Failed to convert logo.', 'error');
          }
        }

        DB.saveAll(DB.KEYS.SETTINGS, updatedSettings);
        this.showToast('System configuration saved!', 'success');
        this.router();
      };

      const removeLogoBtn = document.getElementById('btn-remove-logo');
      if (removeLogoBtn) {
        removeLogoBtn.onclick = () => {
          settings.logoBase64 = '';
          DB.saveAll(DB.KEYS.SETTINGS, settings);
          this.showToast('Logo removed.', 'info');
          this.renderAdminSettings();
        };
      }

      document.getElementById('form-admin-password').onsubmit = async (e) => {
        e.preventDefault();
        const currentVal = document.getElementById('admin-pass-current').value;
        const newVal = document.getElementById('admin-pass-new').value;
        const confirmVal = document.getElementById('admin-pass-confirm').value;

        if (newVal !== confirmVal) {
          this.showToast('Passwords do not match.', 'error');
          return;
        }

        const res = await Auth.changePassword(user.id, currentVal, newVal);
        if (res.success) {
          this.showToast(res.message, 'success');
          document.getElementById('form-admin-password').reset();
          this.renderSidebarAndHeader(Auth.getCurrentSession());
        } else {
          this.showToast(res.message, 'error');
        }
      };
    },


    // ==========================================
    // USER SCREEN RENDERS
    // ==========================================

    renderUserDashboard: function () {
      const view = document.getElementById('user-dashboard-view');
      view.classList.add('active-view');

      const user = Auth.getCurrentUser();
      Bookings.ensureFixedSeatBookingForToday(user.id);

      const bookings = Bookings.getByUser(user.id);
      const todayStr = new Date().toISOString().split('T')[0];

      const todayBooking = bookings.find(b => b.bookingDate === todayStr && b.status !== 'Cancelled');
      const activeSub = Bookings.getActiveSubscription(user.id, todayStr);
      const pendingSub = DB.getAll(DB.KEYS.SUBSCRIPTIONS).find(s => s.userId === user.id && s.status === 'PendingPayment');

      let subStatusCard = '';
      if (activeSub && activeSub.plan) {
        const end = new Date(activeSub.endDate + 'T00:00:00');
        const today = new Date(todayStr + 'T00:00:00');
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        const isExpiring = diffDays <= 5;

        subStatusCard = `
          <div class="card mb-6" style="border-left: 4px solid var(--green);">
            <div class="card-header justify-between">
              <h3>Active Pass Pass</h3>
              ${this.getStatusBadge('Active')}
            </div>
            <div class="card-body">
              <p><strong>Plan Name:</strong> ${activeSub.plan.name}</p>
              <p><strong>Validity:</strong> ${activeSub.startDate} to ${activeSub.endDate} 
                ${isExpiring ? `<span class="badge badge-yellow ml-2">Expiring in ${diffDays} day(s)</span>` : ''}
              </p>
              <p><strong>Allocation Rule:</strong> ${activeSub.plan.seatAllocationType}</p>
              ${activeSub.assignedSeatId ? `<p><strong>Assigned Cabinet Seat:</strong> ${DB.getById(DB.KEYS.SEATS, activeSub.assignedSeatId).seatNumber}</p>` : ''}
              ${isExpiring ? `<button class="btn btn-outline btn-xs mt-4 btn-renew-pass" data-planId="${activeSub.planId}">Renew Pass Now</button>` : ''}
            </div>
          </div>
        `;
      } else if (pendingSub) {
        const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, pendingSub.planId);
        const hasPendingProof = DB.getAll(DB.KEYS.PAYMENTS).some(p => p.subscriptionId === pendingSub.id && p.status === 'Pending');

        subStatusCard = `
          <div class="card mb-6" style="border-left: 4px solid var(--yellow);">
            <div class="card-header justify-between">
              <h3>Pending Pass Activation</h3>
              ${this.getStatusBadge('PendingPayment')}
            </div>
            <div class="card-body">
              <p><strong>Plan Name:</strong> ${plan.name}</p>
              <p><strong>Flat Cost:</strong> ${this.formatCurrency(plan.price)}</p>
              ${hasPendingProof ? 
                `<div class="alert alert-info mt-4">Screenshot proof uploaded. Awaiting Admin verification.</div>` : 
                `
                <div class="alert alert-yellow mt-4">Proof upload is pending. Click below to confirm pass.</div>
                <button class="btn btn-primary btn-xs mt-4 btn-upload-sub-proof" data-id="${pendingSub.id}" data-rate="${plan.price}">
                  <i data-lucide="upload-cloud"></i> Upload Receipt
                </button>
                `
              }
            </div>
          </div>
        `;
      }

      let todayBookingCardHtml = '';
      if (todayBooking) {
        const seatObj = DB.getById(DB.KEYS.SEATS, todayBooking.seatId);
        let actionBtn = '';
        if (todayBooking.status === 'Confirmed') {
          actionBtn = `<button class="btn btn-green btn-block mt-4 btn-checkin-action" data-id="${todayBooking.id}"><i data-lucide="check-in"></i> Check-In Now</button>`;
        } else if (todayBooking.status === 'CheckedIn') {
          actionBtn = `<button class="btn btn-red btn-block mt-4 btn-checkout-action" data-id="${todayBooking.id}"><i data-lucide="check-out"></i> Check-Out Now</button>`;
        } else if (todayBooking.status === 'PendingPayment') {
          actionBtn = `
            <div class="alert alert-yellow mt-4">Pending payment confirmation to enable check-in access.</div>
            <a href="#/user/bookings" class="btn btn-primary btn-block mt-2">Upload Booking Proof</a>
          `;
        }

        todayBookingCardHtml = `
          <div class="today-booking-card">
            <div class="tbc-badge-row">
              <span class="text-sm font-semibold">Today's Daily Reservation</span>
              ${this.getStatusBadge(todayBooking.status)}
            </div>
            <div class="tbc-details-grid mt-4">
              <div class="tbc-detail">
                <p class="tbc-label">Seat Number</p>
                <h4>${seatObj ? seatObj.seatNumber : 'Deleted'}</h4>
              </div>
              <div class="tbc-detail">
                <p class="tbc-label">Zone</p>
                <h4>${seatObj ? seatObj.zone : 'N/A'}</h4>
              </div>
              <div class="tbc-detail">
                <p class="tbc-label">Check-In Time</p>
                <h4>${this.formatDateTime(todayBooking.checkInTime)}</h4>
              </div>
              <div class="tbc-detail">
                <p class="tbc-label">Check-Out Time</p>
                <h4>${this.formatDateTime(todayBooking.checkOutTime)}</h4>
              </div>
            </div>
            ${actionBtn}
          </div>
        `;
      } else {
        todayBookingCardHtml = `
          <div class="today-booking-card-empty">
            <div class="tbce-icon"><i data-lucide="calendar"></i></div>
            <p>No study seat reserved for today.</p>
            <a href="#/user/book-seat" class="btn btn-primary mt-4">
              <i data-lucide="plus-circle"></i> Reserve a Seat
            </a>
          </div>
        `;
      }

      let passCatalogHtml = '';
      if (!activeSub && !pendingSub) {
        const plans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS).filter(p => p.isActive);
        let planCards = '';
        plans.forEach(plan => {
          planCards += `
            <div class="upcoming-item flex-col items-start gap-2 border p-4 rounded-lg bg-white mb-2 shadow-sm">
              <div class="flex justify-between w-full">
                <strong>${plan.name}</strong>
                <span class="text-primary font-bold">${this.formatCurrency(plan.price)}</span>
              </div>
              <p class="text-xs text-muted">Scope: ${plan.seatType} Zone (${plan.seatAllocationType})</p>
              <button class="btn btn-outline btn-xs mt-2 btn-subscribe-catalog" data-id="${plan.id}">Subscribe Pass</button>
            </div>
          `;
        });

        if (plans.length > 0) {
          passCatalogHtml = `
            <div class="card mt-6">
              <div class="card-header"><h3>Monthly / Yearly Passes Available</h3></div>
              <div class="card-body">${planCards}</div>
            </div>
          `;
        }
      }

      const upcoming = bookings.filter(b => b.bookingDate > todayStr && ['Confirmed', 'PendingPayment'].includes(b.status));
      let upcomingRowsHtml = '';
      if (upcoming.length === 0) {
        upcomingRowsHtml = `<p class="text-muted text-sm text-center py-4">No upcoming bookings scheduled.</p>`;
      } else {
        upcoming.forEach(b => {
          const seat = DB.getById(DB.KEYS.SEATS, b.seatId) || {};
          upcomingRowsHtml += `
            <div class="upcoming-item">
              <div class="upcoming-item-left">
                <strong>Seat ${seat.seatNumber || 'N/A'}</strong>
                <p class="text-xs text-muted">${new Date(b.bookingDate).toLocaleDateString('en-IN')}</p>
              </div>
              <div class="upcoming-item-right">${this.getStatusBadge(b.status)}</div>
            </div>
          `;
        });
      }

      view.innerHTML = `
        <div class="welcome-banner mb-6">
          <div class="wb-content">
            <h2>Welcome back, ${user.name}!</h2>
            <p>Access seat bookings, check in directly, and manage active subscription passes.</p>
          </div>
          <i data-lucide="graduation-cap" class="welcome-decor-icon text-muted"></i>
        </div>

        ${subStatusCard}

        <div class="dashboard-split">
          <div class="flex-2">${todayBookingCardHtml}</div>
          <div class="card flex-1">
            <div class="card-header"><h3>Upcoming Reservations</h3></div>
            <div class="card-body">${upcomingRowsHtml}</div>
          </div>
        </div>

        ${passCatalogHtml}

        <!-- Upload Sub Proof Modal -->
        <div id="modal-upload-sub-proof" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Upload Pass Payment Proof</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-upload-sub-proof" class="modal-body">
              <input type="hidden" id="upload-sub-id">
              <div class="form-group">
                <label>Amount Due (Pass Price)</label>
                <div class="calculated-due-amount" id="upload-sub-due-label"></div>
              </div>
              <div class="form-group">
                <label>Screenshot / Receipt Image</label>
                <input type="file" id="upload-sub-screenshot" accept="image/*" required>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary" id="btn-submit-sub-upload">Upload Proof</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Fixed Seat Assign Select Modal -->
        <div id="modal-fixed-seat-assign" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Choose Fixed Cabinet Seat</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="fixed-seat-plan-id">
              <div class="form-group">
                <label>Available Seats of Plan Scope</label>
                <select id="fixed-seat-select-target" required></select>
              </div>
              <button class="btn btn-primary btn-block" id="btn-submit-fixed-seat-assign">Proceed to Payment</button>
            </div>
          </div>
        </div>
      `;

      const checkinBtn = view.querySelector('.btn-checkin-action');
      if (checkinBtn) {
        checkinBtn.onclick = () => {
          if (Bookings.checkIn(checkinBtn.getAttribute('data-id')).success) {
            this.showToast('Checked-in successfully!', 'success');
            this.renderUserDashboard();
          }
        };
      }

      const checkoutBtn = view.querySelector('.btn-checkout-action');
      if (checkoutBtn) {
        checkoutBtn.onclick = () => {
          if (Bookings.checkOut(checkoutBtn.getAttribute('data-id')).success) {
            this.showToast('Checked-out successfully!', 'success');
            this.renderUserDashboard();
          }
        };
      }

      const renewBtn = view.querySelector('.btn-renew-pass');
      if (renewBtn) {
        renewBtn.onclick = () => {
          const planId = renewBtn.getAttribute('data-planId');
          this.subscribeUserToPlan(user.id, planId);
        };
      }

      view.querySelectorAll('.btn-subscribe-catalog').forEach(btn => {
        btn.onclick = () => {
          const planId = btn.getAttribute('data-id');
          this.subscribeUserToPlan(user.id, planId);
        };
      });

      const uploadSubModal = document.getElementById('modal-upload-sub-proof');
      const uploadSubBtn = view.querySelector('.btn-upload-sub-proof');
      if (uploadSubBtn) {
        uploadSubBtn.onclick = () => {
          const subId = uploadSubBtn.getAttribute('data-id');
          const price = parseFloat(uploadSubBtn.getAttribute('data-rate'));
          document.getElementById('upload-sub-id').value = subId;
          document.getElementById('upload-sub-due-label').innerText = this.formatCurrency(price);
          document.getElementById('upload-sub-screenshot').value = '';
          uploadSubModal.classList.add('open');
        };
      }

      document.getElementById('form-upload-sub-proof').onsubmit = async (e) => {
        e.preventDefault();
        const subId = document.getElementById('upload-sub-id').value;
        const sub = DB.getById(DB.KEYS.SUBSCRIPTIONS, subId);
        const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, sub.planId);
        const file = document.getElementById('upload-sub-screenshot').files[0];
        
        const submitBtn = document.getElementById('btn-submit-sub-upload');
        submitBtn.disabled = true;

        const res = await Payments.submitSubscriptionPayment(subId, plan.price, file);
        submitBtn.disabled = false;

        if (res.success) {
          uploadSubModal.classList.remove('open');
          this.showToast('Receipt uploaded. Pass will activate on verification.', 'success');
          this.renderUserDashboard();
        } else {
          this.showToast(res.message, 'error');
        }
      };
    },

    subscribeUserToPlan: function (userId, planId) {
      const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, planId);
      const todayStr = new Date().toISOString().split('T')[0];

      const startObj = new Date(todayStr + 'T00:00:00');
      if (plan.type === 'Monthly') {
        startObj.setMonth(startObj.getMonth() + 1);
      } else {
        startObj.setFullYear(startObj.getFullYear() + 1);
      }
      const endDate = startObj.toISOString().split('T')[0];

      const createSubAndPromptUpload = (seatId = null) => {
        const newSub = {
          id: DB.generateId('sub'),
          userId: userId,
          planId: planId,
          startDate: todayStr,
          endDate: endDate,
          assignedSeatId: seatId,
          status: 'PendingPayment',
          paymentId: null,
          createdBy: 'user',
          createdAt: new Date().toISOString()
        };

        DB.insert(DB.KEYS.SUBSCRIPTIONS, newSub);
        this.showToast('Subscription pending verification upload.', 'info');
        this.renderUserDashboard();
      };

      if (plan.seatAllocationType === 'FixedSeat') {
        const assignModal = document.getElementById('modal-fixed-seat-assign');
        const selectTarget = document.getElementById('fixed-seat-select-target');
        
        const seats = DB.getAll(DB.KEYS.SEATS).filter(s => s.status !== 'Blocked' && (plan.seatType === 'Any' || s.zone === plan.seatType));
        const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS).filter(sub => sub.status === 'Active' && sub.assignedSeatId);
        const assignedIds = subscriptions.map(s => s.assignedSeatId);

        let seatOptions = '';
        seats.forEach(s => {
          if (!assignedIds.includes(s.id)) seatOptions += `<option value="${s.id}">${s.seatNumber}</option>`;
        });

        if (!seatOptions) {
          this.showToast('No unassigned seats are available for this fixed seat plan.', 'error');
          return;
        }

        selectTarget.innerHTML = seatOptions;
        assignModal.classList.add('open');

        document.getElementById('btn-submit-fixed-seat-assign').onclick = () => {
          assignModal.classList.remove('open');
          createSubAndPromptUpload(selectTarget.value);
        };
      } else {
        createSubAndPromptUpload(null);
      }
    },

    renderUserBookSeat: function () {
      const view = document.getElementById('user-book-seat-view');
      view.classList.add('active-view');

      const user = Auth.getCurrentUser();
      const todayStr = new Date().toISOString().split('T')[0];

      const activeSub = Bookings.getActiveSubscription(user.id, todayStr);
      let alertContent = '';

      if (activeSub && activeSub.plan) {
        if (activeSub.plan.seatAllocationType === 'FixedSeat') {
          const seatObj = DB.getById(DB.KEYS.SEATS, activeSub.assignedSeatId) || {};
          alertContent = `
            <div class="alert alert-info mb-6">
              <i data-lucide="award"></i>
              <span>You have a **Fixed Seat Pass** reserving **Seat ${seatObj.seatNumber || 'N/A'}**. Today's daily reservation is auto-scheduled. Check in directly from Dashboard.</span>
            </div>
          `;
        }
      }

      view.innerHTML = `
        ${alertContent}
        <div class="card mb-6" id="user-booking-date-card" style="${activeSub && activeSub.plan.seatAllocationType === 'FixedSeat' ? 'display:none;' : ''}">
          <div class="card-header"><h3>Choose Booking Date</h3></div>
          <div class="card-body max-w-sm">
            <div class="form-group mb-0">
              <label>Reservation Date</label>
              <input type="date" id="user-date-select" value="${todayStr}" min="${todayStr}">
            </div>
          </div>
        </div>

        <div class="card" id="user-booking-grid-card" style="${activeSub && activeSub.plan.seatAllocationType === 'FixedSeat' ? 'display:none;' : ''}">
          <div class="card-header justify-between flex-wrap gap-2">
            <h3>Interactive Seats Map</h3>
            <div class="map-legend">
              <span class="legend-item"><span class="legend-dot bg-green"></span> Free</span>
              <span class="legend-item"><span class="legend-dot bg-red"></span> Occupied</span>
              <span class="legend-item"><span class="legend-dot bg-gray"></span> Blocked</span>
            </div>
          </div>
          <div class="card-body">
            <div class="seat-zones-group" id="user-seat-grid"></div>
          </div>
        </div>

        <div id="modal-confirm-user-booking" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Confirm Seat Reservation</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body" id="user-confirm-modal-body"></div>
          </div>
        </div>
      `;

      if (activeSub && activeSub.plan.seatAllocationType === 'FixedSeat') {
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      const dateSelect = document.getElementById('user-date-select');
      const loadGrid = () => {
        this.renderAvailabilityGrid('user-seat-grid', dateSelect.value, (seat) => {
          this.promptConfirmUserBooking(user.id, seat, dateSelect.value);
        });
      };

      dateSelect.onchange = loadGrid;
      loadGrid();
    },

    promptConfirmUserBooking: function (userId, seat, dateStr) {
      const settings = DB.getAll(DB.KEYS.SETTINGS);
      const rate = settings.rates[seat.zone] || 0;
      const modal = document.getElementById('modal-confirm-user-booking');
      const body = document.getElementById('user-confirm-modal-body');

      const activeSub = Bookings.getActiveSubscription(userId, dateStr);
      let isCovered = false;

      if (activeSub && activeSub.plan) {
        const zoneMatch = (activeSub.plan.seatType === 'Any' || activeSub.plan.seatType === seat.zone);
        if (zoneMatch) {
          if (activeSub.plan.seatAllocationType === 'FixedSeat') {
            if (activeSub.assignedSeatId === seat.id) isCovered = true;
          } else {
            isCovered = true;
          }
        }
      }

      body.innerHTML = `
        <div class="confirm-booking-details">
          <p><strong>Seat Selected:</strong> ${seat.seatNumber} (${seat.zone})</p>
          <p><strong>Booking Date:</strong> ${new Date(dateStr).toLocaleDateString('en-IN')}</p>
          <p><strong>Rate Per Day:</strong> ${isCovered ? this.formatCurrency(0) : this.formatCurrency(rate)}</p>
          
          ${isCovered ? 
            `<div class="alert alert-info mt-4">
              <i data-lucide="award"></i>
              <span>Reservation covered under your pass: "${activeSub.plan.name}". Payment is waived.</span>
            </div>` : 
            `<div class="alert alert-info mt-4">
              <i data-lucide="info"></i>
              <span>Payment screenshot upload required to finalize reservation.</span>
            </div>`
          }
        </div>
        <div class="modal-footer px-0 pb-0 pt-4 mt-4">
          <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-submit-user-booking">Book Seat</button>
        </div>
      `;

      modal.classList.add('open');
      if (window.lucide) window.lucide.createIcons();

      document.getElementById('btn-submit-user-booking').onclick = () => {
        const res = Bookings.createBooking(userId, seat.id, dateStr, rate, 'user');
        if (res.success) {
          modal.classList.remove('open');
          this.showToast('Seat reserved successfully!', 'success');
          window.location.hash = '#/user/bookings';
        } else {
          this.showToast(res.message, 'error');
        }
      };
    },

    renderUserBookings: function () {
      const view = document.getElementById('user-bookings-view');
      view.classList.add('active-view');

      const user = Auth.getCurrentUser();
      const bookings = Bookings.getByUser(user.id);
      const todayStr = new Date().toISOString().split('T')[0];

      let tableRows = '';
      if (bookings.length === 0) {
        tableRows = `<tr><td colspan="7" class="text-center py-8">No booking history found.</td></tr>`;
      } else {
        bookings.forEach((b, idx) => {
          const seat = DB.getById(DB.KEYS.SEATS, b.seatId) || {};
          const payment = Payments.getByBooking(b.id);
          
          let actionButton = '';
          if (b.status === 'PendingPayment' || (payment && payment.status === 'Rejected')) {
            const labelText = payment && payment.status === 'Rejected' ? 'Re-Upload Proof' : 'Upload Receipt';
            actionButton = `
              <button class="btn btn-primary btn-xs btn-upload-proof" data-id="${b.id}" data-rate="${b.ratePerDay}">
                <i data-lucide="upload-cloud"></i> ${labelText}
              </button>
            `;
          }

          if (['PendingPayment', 'Confirmed'].includes(b.status)) {
            actionButton += `<button class="btn btn-outline btn-red btn-xs btn-cancel-booking ml-1" data-id="${b.id}">Cancel</button>`;
          }

          if (b.status === 'Confirmed' && b.bookingDate === todayStr) {
            actionButton += `<button class="btn btn-green btn-xs btn-checkin ml-1" data-id="${b.id}">Check-In</button>`;
          }

          if (b.status === 'CheckedIn' && b.bookingDate === todayStr) {
            actionButton += `<button class="btn btn-red btn-xs btn-checkout ml-1" data-id="${b.id}">Check-Out</button>`;
          }

          let rateLabel = this.formatCurrency(b.ratePerDay);
          if (b.coveredBySubscriptionId) {
            rateLabel = '<span class="text-xs text-green font-semibold">Pass Cover</span>';
          }

          tableRows += `
            <tr>
              <td data-label="S.No">${idx + 1}</td>
              <td data-label="Booking Date">${new Date(b.bookingDate).toLocaleDateString('en-IN')}</td>
              <td data-label="Seat Allocated"><strong>Seat ${seat.seatNumber || 'Deleted'}</strong> <span class="badge badge-purple text-xs">${seat.zone || ''}</span></td>
              <td data-label="Rate">${rateLabel}</td>
              <td data-label="Status">
                ${this.getStatusBadge(b.status)}
                ${payment && payment.status === 'Rejected' ? `<p class="text-xs text-red font-medium mt-1">Rejected: ${payment.remarks}</p>` : ''}
              </td>
              <td data-label="Check-In">${b.checkInTime ? this.formatDateTime(b.checkInTime) : '-'}</td>
              <td data-label="Actions">${actionButton || '-'}</td>
            </tr>
          `;
        });
      }

      view.innerHTML = `
        <div class="card">
          <div class="card-header"><h3>My Bookings Register</h3></div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>S.No</th><th>Booking Date</th><th>Seat Allocated</th><th>Rate</th><th>Status</th><th>Check-In</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
        </div>

        <div id="modal-upload-proof" class="modal">
          <div class="modal-content max-w-sm">
            <div class="modal-header">
              <h3>Upload Payment Proof</h3>
              <button class="btn-close-modal"><i data-lucide="x"></i></button>
            </div>
            <form id="form-upload-proof" class="modal-body">
              <input type="hidden" id="upload-booking-id">
              <div class="form-group">
                <label>Amount Due</label>
                <div class="calculated-due-amount" id="upload-due-label"></div>
              </div>
              <div class="form-group">
                <label>Amount Paid (INR)</label>
                <input type="number" id="upload-amount" min="1" required>
              </div>
              <div class="form-group">
                <label>Screenshot / Receipt Image</label>
                <input type="file" id="upload-screenshot" accept="image/*" required>
              </div>
              <div class="modal-footer px-0 pb-0 pt-4">
                <button type="button" class="btn btn-outline btn-close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary" id="btn-submit-upload">Submit Receipt</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const uploadModal = document.getElementById('modal-upload-proof');
      view.querySelectorAll('.btn-upload-proof').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          const rate = parseFloat(btn.getAttribute('data-rate'));
          document.getElementById('upload-booking-id').value = id;
          document.getElementById('upload-amount').value = rate;
          document.getElementById('upload-due-label').innerText = this.formatCurrency(rate);
          document.getElementById('upload-screenshot').value = '';
          uploadModal.classList.add('open');
        };
      });

      document.getElementById('form-upload-proof').onsubmit = async (e) => {
        e.preventDefault();
        const bId = document.getElementById('upload-booking-id').value;
        const amount = document.getElementById('upload-amount').value;
        const file = document.getElementById('upload-screenshot').files[0];
        
        const submitBtn = document.getElementById('btn-submit-upload');
        submitBtn.disabled = true;

        const res = await Payments.submitPayment(bId, amount, file);
        submitBtn.disabled = false;

        if (res.success) {
          uploadModal.classList.remove('open');
          this.showToast(res.message, 'success');
          this.renderUserBookings();
        } else {
          this.showToast(res.message, 'error');
        }
      };

      view.querySelectorAll('.btn-cancel-booking').forEach(btn => {
        btn.onclick = () => {
          if (confirm('Cancel reservation?')) {
            if (Bookings.cancelBooking(btn.getAttribute('data-id')).success) {
              this.showToast('Reservation cancelled.', 'success');
              this.renderUserBookings();
            }
          }
        };
      });

      view.querySelectorAll('.btn-checkin').forEach(btn => {
        btn.onclick = () => {
          if (Bookings.checkIn(btn.getAttribute('data-id')).success) {
            this.showToast('Checked-in.', 'success');
            this.renderUserBookings();
          }
        };
      });

      view.querySelectorAll('.btn-checkout').forEach(btn => {
        btn.onclick = () => {
          if (Bookings.checkOut(btn.getAttribute('data-id')).success) {
            this.showToast('Checked-out.', 'success');
            this.renderUserBookings();
          }
        };
      });
    },

    renderUserBilling: function () {
      const view = document.getElementById('user-billing-view');
      view.classList.add('active-view');

      const user = Auth.getCurrentUser();
      const userInvoices = Invoices.getByUser(user.id);
      const seats = DB.getAll(DB.KEYS.SEATS);

      let tableRows = '';
      if (userInvoices.length === 0) {
        tableRows = `<tr><td colspan="8" class="text-center py-8">No invoice history found.</td></tr>`;
      } else {
        userInvoices.forEach((inv, idx) => {
          let desc = '';
          if (inv.invoiceType === 'Subscription') {
            const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, inv.subscription.planId) || {};
            const seat = inv.subscription.assignedSeatId ? seats.find(s => s.id === inv.subscription.assignedSeatId) : null;
            desc = `Pass: ${plan.name || ''} ${seat ? '(Seat ' + seat.seatNumber + ')' : '(Flexible)'}`;
          } else {
            const seat = seats.find(s => s.id === inv.booking.seatId) || {};
            desc = `Seat ${seat.seatNumber || 'N/A'} (Zone: ${seat.zone || ''})`;
          }
          
          tableRows += `
            <tr>
              <td data-label="S.No">${idx + 1}</td>
              <td data-label="Invoice Number"><strong>${inv.invoiceNumber}</strong></td>
              <td data-label="Invoice Date">${new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
              <td data-label="Seat / Pass Description">${desc}</td>
              <td data-label="Base Amount">${this.formatCurrency(inv.amount)}</td>
              <td data-label="GST Amount">${inv.gstApplicable ? this.formatCurrency(inv.gstAmount) : 'Exempted'}</td>
              <td data-label="Total Paid"><strong>${this.formatCurrency(inv.totalAmount)}</strong></td>
              <td data-label="Actions">
                <button class="btn btn-outline btn-xs btn-user-print-inv" data-id="${inv.id}">
                  <i data-lucide="printer" class="w-3.5 h-3.5 inline mr-1"></i> Print / PDF
                </button>
              </td>
            </tr>
          `;
        });
      }

      view.innerHTML = `
        <div class="card">
          <div class="card-header"><h3>My Invoices Ledger</h3></div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>S.No</th><th>Invoice Number</th><th>Invoice Date</th><th>Seat / Pass Description</th><th>Base Amount</th><th>GST Amount</th><th>Total Paid</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
        </div>

        <!-- Printable Invoice Container -->
        <div id="print-invoice-area" class="print-only"></div>
      `;

      if (window.lucide) {
        window.lucide.createIcons();
      }

      view.querySelectorAll('.btn-user-print-inv').forEach(btn => {
        btn.onclick = () => { this.printInvoice(btn.getAttribute('data-id')); };
      });
    },

    // ==========================================
    // TOAST NOTIFICATION SYSTEM
    // ==========================================

    showToast: function (message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      let icon = 'info';
      if (type === 'success') icon = 'check-circle-2';
      if (type === 'error') icon = 'alert-octagon';
      if (type === 'warning') icon = 'alert-triangle';

      toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <div class="toast-content"><p>${message}</p></div>
      `;

      container.appendChild(toast);
      
      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => toast.classList.add('visible'), 10);
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    registerGlobalEvents: function () {
      document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-close-modal') || e.target.classList.contains('modal')) {
          const openModal = document.querySelector('.modal.open');
          if (openModal) openModal.classList.remove('open');
        }
        
        // Mobile drawer close on backdrop click
        if (e.target.id === 'sidebar-backdrop') {
          this.toggleMobileSidebar(false);
        }
      });
    }
  };

  window.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})();
