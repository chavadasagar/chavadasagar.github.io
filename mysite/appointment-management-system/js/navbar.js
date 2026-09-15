/**
 * navbar.js - Dynamically injects sidebars, headers, reset buttons, and the reminders debug drawer.
 */

document.addEventListener('DOMContentLoaded', () => {
  const isSubDir = window.location.pathname.includes('/patient/') || 
                   window.location.pathname.includes('/doctor/') || 
                   window.location.pathname.includes('/receptionist/') || 
                   window.location.pathname.includes('/admin/');
  
  const rootPrefix = isSubDir ? '../' : './';
  const currentUser = window.AUTH ? window.AUTH.getCurrentUser() : null;

  // 1. INJECT SIDEBAR / NAVIGATION IF IN AN APP CONTAINER
  const container = document.querySelector('.app-container');
  if (container) {
    // Create Mobile Header
    const mobileHeader = document.createElement('div');
    mobileHeader.className = 'mobile-header';
    mobileHeader.innerHTML = `
      <div class="sidebar-brand">
        🩺 <span>Clinic</span>Sys
      </div>
      <button class="mobile-menu-toggle" id="mobile-toggle">☰</button>
    `;
    container.parentNode.insertBefore(mobileHeader, container);

    // Create Sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'app-sidebar';

    // Build sidebar menu based on role
    let menuHtml = '';
    let roleTitle = 'Guest';
    let userNameStr = 'User';

    if (currentUser) {
      roleTitle = currentUser.role;
      userNameStr = currentUser.email.split('@')[0];

      // Fetch full name if available
      if (currentUser.role === 'Patient' && window.DB) {
        const pat = window.DB.getById(window.DB_COLLECTIONS.PATIENTS, currentUser.linkedId);
        if (pat) userNameStr = pat.fullName;
      } else if (currentUser.role === 'Doctor' && window.DB) {
        const doc = window.DB.getById(window.DB_COLLECTIONS.DOCTORS, currentUser.linkedId);
        if (doc) userNameStr = doc.fullName;
      } else if (currentUser.role === 'Receptionist') {
        userNameStr = 'Reception Staff';
      } else if (currentUser.role === 'ClinicAdmin') {
        userNameStr = 'Clinic Administrator';
      }

      if (currentUser.role === 'Patient') {
        menuHtml = `
          <li class="sidebar-menu-item"><a href="${rootPrefix}patient/doctor-search.html">🔍 Search Doctors</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}patient/my-appointments.html">📅 My Appointments</a></li>
        `;
      } else if (currentUser.role === 'Doctor') {
        menuHtml = `
          <li class="sidebar-menu-item"><a href="${rootPrefix}doctor/dashboard.html">🗓️ Today's Queue</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}doctor/availability.html">⚙️ Manage Schedule</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}doctor/earnings.html">💰 Earnings & Reports</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}doctor/reviews.html">⭐ Reviews Received</a></li>
        `;
      } else if (currentUser.role === 'Receptionist') {
        menuHtml = `
          <li class="sidebar-menu-item"><a href="${rootPrefix}receptionist/front-desk.html">🛎️ Front Desk</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}receptionist/manage-appointments.html">📅 Manage Bookings</a></li>
        `;
      } else if (currentUser.role === 'ClinicAdmin') {
        menuHtml = `
          <li class="sidebar-menu-item"><a href="${rootPrefix}admin/reports.html">📊 Reports & Charts</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}admin/doctors.html">👨‍⚕️ Manage Doctors</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}admin/staff.html">👥 Manage Staff</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}admin/specializations.html">🏷️ Specializations</a></li>
          <li class="sidebar-menu-item"><a href="${rootPrefix}admin/settings.html">⚙️ Clinic Settings</a></li>
        `;
      }
    }

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <a href="${rootPrefix}index.html" class="sidebar-brand">
          🩺 <span>Clinic</span>Sys
        </a>
      </div>
      <ul class="sidebar-menu">
        ${menuHtml}
      </ul>
      <div class="sidebar-footer">
        <div class="user-info">
          <span class="user-name">${userNameStr}</span>
          <span class="user-role">${roleTitle}</span>
        </div>
        <button class="btn btn-secondary btn-xs" id="sidebar-logout" style="width: 100%; margin-top: 4px;">Log Out</button>
        <button class="btn btn-danger btn-xs" id="sidebar-reseed" style="width: 100%; margin-top: 4px; background-color: #ef4444; border-color: #ef4444; color: white;">Reset Demo Data</button>
      </div>
    `;

    // Prepend sidebar to container
    container.insertBefore(sidebar, container.firstChild);

    // Wire up sidebar active state by matching pathname
    const currentPath = window.location.pathname;
    const menuItems = sidebar.querySelectorAll('.sidebar-menu-item');
    menuItems.forEach(item => {
      const link = item.querySelector('a');
      if (link) {
        const linkPath = new URL(link.href).pathname;
        if (currentPath.includes(linkPath)) {
          item.classList.add('active');
        }
      }
    });

    // Wire up mobile toggle
    const toggleBtn = document.getElementById('mobile-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
      });
      // Close sidebar when clicking outside
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
    }

    // Wire up log out
    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn && window.AUTH) {
      logoutBtn.addEventListener('click', () => {
        window.AUTH.logout();
      });
    }

    // Wire up reseed
    const reseedBtn = document.getElementById('sidebar-reseed');
    if (reseedBtn && window.DB && window.Toast && window.Modal) {
      reseedBtn.addEventListener('click', () => {
        window.Modal.confirm({
          title: "Reset Demo Data?",
          body: "This will wipe all changes, appointments, schedules, and restore original demo accounts. Do you want to proceed?",
          confirmText: "Yes, Reset",
          onConfirm: () => {
            window.DB.reseed();
            window.Toast.show("Database reset successfully! Reloading...", "success");
            setTimeout(() => {
              window.location.href = rootPrefix + 'login.html';
            }, 1000);
          }
        });
      });
    }
  }

  // 2. INJECT FLOATING REMINDERS DRAWER FOR DEBUGGING
  if (window.DB) {
    const remindersToggle = document.createElement('button');
    remindersToggle.className = 'reminders-drawer-toggle';
    remindersToggle.innerHTML = `🔔 <span>Reminders Panel</span>`;
    document.body.appendChild(remindersToggle);

    const remindersDrawer = document.createElement('div');
    remindersDrawer.className = 'reminders-drawer';
    remindersDrawer.innerHTML = `
      <div class="reminders-drawer-header">
        <h4 style="color: white; margin: 0; font-size: 14px;">🔔 Simulated Notifications Queue</h4>
        <button class="custom-modal-close" id="reminders-drawer-close" style="color: white; background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
      </div>
      <div class="reminders-drawer-body" id="reminders-list">
        <!-- Reminders loaded dynamically -->
      </div>
    `;
    document.body.appendChild(remindersDrawer);

    const listContainer = document.getElementById('reminders-list');
    const updateRemindersList = () => {
      const reminders = window.DB.get('appointmentReminders') || [];
      const appointments = window.DB.get(window.DB_COLLECTIONS.APPOINTMENTS);
      const doctors = window.DB.get(window.DB_COLLECTIONS.DOCTORS);
      const patients = window.DB.get(window.DB_COLLECTIONS.PATIENTS);

      if (reminders.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state" style="padding: 24px 0;">
            <p class="empty-state-desc">No notifications generated yet. Book an appointment to trigger reminders.</p>
          </div>
        `;
        return;
      }

      // Sort by sendTime
      const sorted = [...reminders].sort((a, b) => new Date(a.sendTime) - new Date(b.sendTime));
      
      listContainer.innerHTML = sorted.map(rem => {
        const apt = appointments.find(a => a.id === rem.appointmentId);
        const doc = apt ? doctors.find(d => d.id === apt.doctorId) : null;
        const pat = apt ? patients.find(p => p.id === apt.patientId) : null;
        const timeFormatted = new Date(rem.sendTime).toLocaleString();

        return `
          <div class="reminder-item">
            <strong style="color: var(--primary);">${rem.type} Alert</strong> 
            <span style="color: var(--neutral-400);">(${rem.status})</span>
            <p style="margin-top: 4px; font-weight: 500;">${rem.message}</p>
            <p style="font-size: 10px; color: var(--neutral-400); margin-top: 4px;">For: ${pat ? pat.fullName : 'Guest'} | Dr: ${doc ? doc.fullName : 'N/A'}</p>
            <div class="reminder-time">Scheduled: ${timeFormatted}</div>
          </div>
        `;
      }).join('');
    };

    remindersToggle.addEventListener('click', () => {
      updateRemindersList();
      remindersDrawer.classList.toggle('open');
    });

    document.getElementById('reminders-drawer-close').addEventListener('click', () => {
      remindersDrawer.classList.remove('open');
    });
  }
});
