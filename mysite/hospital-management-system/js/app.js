/**
 * app.js - Main Application Controller, Routing, and Global UI Orchestrator
 */

window.HMS_APP = {
  currentView: 'dashboard',
  currentParams: {},

  init: function() {
    // 1. Run Seeder
    if (window.HMS_SEED) {
      window.HMS_SEED.seedAll();
    }

    // 2. Initialize State
    this.initTheme();
    this.updateClock();
    setInterval(() => this.updateClock(), 60000);

    // 3. Setup Global Event Listeners
    this.bindEvents();

    // 4. Check Authentication Session
    this.checkSession();

    // 5. Setup Router
    window.addEventListener('hashchange', () => this.handleRouting());
    // Trigger router for initial page load
    this.handleRouting();
  },

  checkSession: function() {
    const session = window.HMS_DB.getCurrentSession();
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');

    if (!session) {
      authScreen.classList.remove('hidden');
      appContainer.classList.add('hidden');
      if (window.HMS_AUTH) {
        window.HMS_AUTH.init();
      }
    } else {
      authScreen.classList.add('hidden');
      appContainer.classList.remove('hidden');
      
      // Update sidebar profile
      document.getElementById('sidebar-user-name').innerText = session.name;
      document.getElementById('sidebar-user-role').innerText = session.role;
      
      // Generate initials for avatar
      const initials = session.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      document.getElementById('sidebar-user-avatar').innerText = initials;

      // Render role-specific sidebar
      this.renderSidebar(session.role);
    }
  },

  renderSidebar: function(role) {
    const menuList = document.getElementById('sidebar-menu-list');
    menuList.innerHTML = '';

    // Define accessible modules per role
    const modules = [
      { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-line', roles: ['Admin', 'Doctor', 'Receptionist', 'Pharmacist', 'Lab Technician', 'Patient'] },
      { id: 'patients', label: 'Patients', icon: 'fa-solid fa-user-injured', roles: ['Admin', 'Doctor', 'Receptionist', 'Pharmacist', 'Lab Technician'] },
      { id: 'doctors', label: 'Doctors & Staff', icon: 'fa-solid fa-user-md', roles: ['Admin'] },
      { id: 'appointments', label: 'Appointments', icon: 'fa-solid fa-calendar-check', roles: ['Admin', 'Doctor', 'Receptionist', 'Patient'] },
      { id: 'admissions', label: 'Admissions (IPD)', icon: 'fa-solid fa-bed', roles: ['Admin', 'Receptionist', 'Patient'] },
      { id: 'records', label: 'Medical Records', icon: 'fa-solid fa-file-medical', roles: ['Admin', 'Doctor', 'Patient'] },
      { id: 'lab', label: 'Lab Tests', icon: 'fa-solid fa-microscope', roles: ['Admin', 'Doctor', 'Lab Technician', 'Patient'] },
      { id: 'pharmacy', label: 'Pharmacy', icon: 'fa-solid fa-pills', roles: ['Admin', 'Pharmacist', 'Patient'] },
      { id: 'billing', label: 'Billing & Invoices', icon: 'fa-solid fa-file-invoice-dollar', roles: ['Admin', 'Receptionist', 'Patient'] },
      { id: 'surgery', label: 'Surgeries (OT)', icon: 'fa-solid fa-syringe', roles: ['Admin', 'Doctor'] },
      { id: 'ambulance', label: 'Ambulance', icon: 'fa-solid fa-truck-medical', roles: ['Admin', 'Receptionist', 'Patient'] }
    ];

    modules.forEach(m => {
      if (m.roles.includes(role)) {
        const li = document.createElement('li');
        li.className = `sidebar-menu-item ${this.currentView === m.id ? 'active' : ''}`;
        li.id = `menu-item-${m.id}`;
        li.innerHTML = `
          <a href="#/${m.id}">
            <i class="${m.icon}"></i>
            <span>${m.label}</span>
          </a>
        `;
        menuList.appendChild(li);
      }
    });
  },

  handleRouting: function() {
    const session = window.HMS_DB.getCurrentSession();
    if (!session) {
      // Redirect to login if not authenticated
      window.location.hash = '';
      this.checkSession();
      return;
    }

    const hash = window.location.hash || '#/dashboard';
    const parts = hash.split('?');
    const path = parts[0].replace('#/', '');
    
    // Parse query params
    const queryParams = {};
    if (parts[1]) {
      parts[1].split('&').forEach(param => {
        const kv = param.split('=');
        queryParams[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }

    this.currentView = path;
    this.currentParams = queryParams;

    // Highlight active menu item
    document.querySelectorAll('.sidebar-menu-item').forEach(el => el.classList.remove('active'));
    const activeMenuItem = document.getElementById(`menu-item-${path}`);
    if (activeMenuItem) {
      activeMenuItem.classList.add('active');
    }

    // Load view with skeleton delay
    this.showLoader(() => {
      this.renderView(path, queryParams);
    });
  },

  renderView: function(view, params) {
    const outlet = document.getElementById('view-outlet');
    outlet.innerHTML = '';

    // Update Breadcrumbs
    this.updateBreadcrumbs(view, params);

    // Call individual rendering scripts based on route
    switch (view) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'patients':
        if (window.HMS_PATIENTS) {
          window.HMS_PATIENTS.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Patients module loading error.</p>`;
        }
        break;
      case 'doctors':
        if (window.HMS_DOCTORS) {
          window.HMS_DOCTORS.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Doctors module loading error.</p>`;
        }
        break;
      case 'appointments':
        if (window.HMS_APPOINTMENTS) {
          window.HMS_APPOINTMENTS.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Appointments module loading error.</p>`;
        }
        break;
      case 'admissions':
        if (window.HMS_ADMISSIONS) {
          window.HMS_ADMISSIONS.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Admissions module loading error.</p>`;
        }
        break;
      case 'records':
        if (window.HMS_RECORDS) {
          window.HMS_RECORDS.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Records module loading error.</p>`;
        }
        break;
      case 'lab':
        if (window.HMS_LAB) {
          window.HMS_LAB.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Lab module loading error.</p>`;
        }
        break;
      case 'pharmacy':
        if (window.HMS_PHARMACY) {
          window.HMS_PHARMACY.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Pharmacy module loading error.</p>`;
        }
        break;
      case 'billing':
        if (window.HMS_BILLING) {
          window.HMS_BILLING.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Billing module loading error.</p>`;
        }
        break;
      case 'surgery':
        if (window.HMS_SURGERY) {
          window.HMS_SURGERY.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Surgery module loading error.</p>`;
        }
        break;
      case 'ambulance':
        if (window.HMS_AMBULANCE) {
          window.HMS_AMBULANCE.render(outlet, params);
        } else {
          outlet.innerHTML = `<p>Ambulance module loading error.</p>`;
        }
        break;
      default:
        outlet.innerHTML = `<h2>View Not Found</h2><p>The requested module does not exist or you lack permission to view it.</p>`;
    }
  },

  updateBreadcrumbs: function(view, params) {
    const breadcrumbs = document.getElementById('breadcrumbs');
    const formattedView = view.charAt(0).toUpperCase() + view.slice(1);
    
    breadcrumbs.innerHTML = `
      <span class="breadcrumb-item"><a href="#/dashboard">Home</a></span>
    `;

    if (view === 'dashboard') {
      breadcrumbs.innerHTML += `<span class="breadcrumb-item active">Dashboard</span>`;
    } else {
      breadcrumbs.innerHTML += `<span class="breadcrumb-item"><a href="#/${view}">${formattedView}</a></span>`;
      
      // If we are looking at detail subpages e.g. details
      if (params.id) {
        let label = 'Detail';
        if (view === 'patients') {
          const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, params.id);
          if (pat) label = pat.name;
        } else if (view === 'doctors') {
          const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, params.id);
          if (doc) label = doc.name;
        } else if (view === 'billing') {
          label = `Invoice #${params.id.substring(0, 8).toUpperCase()}`;
        }
        breadcrumbs.innerHTML += `<span class="breadcrumb-item active">${label}</span>`;
      }
    }
  },

  showLoader: function(callback) {
    const loader = document.getElementById('skeleton-loader');
    const outlet = document.getElementById('view-outlet');
    
    outlet.classList.add('hidden');
    loader.classList.remove('hidden');

    setTimeout(() => {
      loader.classList.add('hidden');
      outlet.classList.remove('hidden');
      callback();
    }, 400); // 400ms simulated delay for smoother UI transitions
  },

  // ==========================================
  // DASHBOARD RENDERING (Role-specific dashboards)
  // ==========================================
  renderDashboard: function() {
    const session = window.HMS_DB.getCurrentSession();
    const outlet = document.getElementById('view-outlet');
    if (!session) return;

    let html = `
      <div class="dashboard-title-row">
        <div>
          <h2>Welcome Back, ${session.name}</h2>
          <p class="text-muted">HMS Dashboard overview for today.</p>
        </div>
      </div>
    `;

    switch (session.role) {
      case 'Admin':
        html += this.getAdminDashboardHTML();
        break;
      case 'Doctor':
        html += this.getDoctorDashboardHTML(session.entityId);
        break;
      case 'Receptionist':
        html += this.getReceptionistDashboardHTML();
        break;
      case 'Pharmacist':
        html += this.getPharmacistDashboardHTML();
        break;
      case 'Lab Technician':
        html += this.getLabTechnicianDashboardHTML();
        break;
      case 'Patient':
        html += this.getPatientDashboardHTML(session.entityId);
        break;
    }

    outlet.innerHTML = html;

    // Draw charts if Admin role dashboard loaded
    if (session.role === 'Admin') {
      this.initAdminCharts();
    }
  },

  getAdminDashboardHTML: function() {
    // Calculate stats
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const appointments = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const invoices = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVOICES);
    const beds = window.HMS_DB.getAll(window.HMS_DB.KEYS.BEDS);
    const medicines = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);
    const labOrders = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TEST_ORDERS);

    // Today's appointments (2026-07-14)
    const today = '2026-07-14';
    const todayAppts = appointments.filter(a => a.date === today);

    // Today's revenue
    const revenue = invoices
      .filter(i => i.status === 'Paid')
      .reduce((sum, inv) => sum + inv.net_payable, 0);

    // Bed occupancy
    const occupiedBeds = beds.filter(b => b.status === 'Occupied').length;
    const bedOccupancy = beds.length > 0 ? Math.round((occupiedBeds / beds.length) * 100) : 0;

    // Pending lab results
    const pendingLab = labOrders.filter(o => o.status !== 'Completed').length;

    // Low stock medicines
    const lowStock = medicines.filter(m => m.stock_quantity <= m.reorder_level).length;

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon primary"><i class="fa-solid fa-user-injured"></i></div>
          <div class="stat-info">
            <span class="stat-label">Total Patients</span>
            <span class="stat-value">${patients.length}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon info"><i class="fa-solid fa-user-md"></i></div>
          <div class="stat-info">
            <span class="stat-label">Active Doctors</span>
            <span class="stat-value">${doctors.length}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-calendar-check"></i></div>
          <div class="stat-info">
            <span class="stat-label">Today's Appts</span>
            <span class="stat-value">${todayAppts.length}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success"><i class="fa-solid fa-wallet"></i></div>
          <div class="stat-info">
            <span class="stat-label">Total Revenue</span>
            <span class="stat-value">$${revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon danger"><i class="fa-solid fa-bed"></i></div>
          <div class="stat-info">
            <span class="stat-label">Bed Occupancy</span>
            <span class="stat-value">${bedOccupancy}%</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-flask"></i></div>
          <div class="stat-info">
            <span class="stat-label">Pending Lab Tests</span>
            <span class="stat-value">${pendingLab}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon danger"><i class="fa-solid fa-exclamation-triangle"></i></div>
          <div class="stat-info">
            <span class="stat-label">Low-Stock Meds</span>
            <span class="stat-value">${lowStock}</span>
          </div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">Appointments Trends (Last 7 Days)</div>
          <div class="chart-wrapper">
            <canvas id="appointmentsChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">Patients by Department</div>
          <div class="chart-wrapper">
            <canvas id="departmentsChart"></canvas>
          </div>
        </div>
      </div>
    `;
  },

  initAdminCharts: function() {
    const appointmentsCtx = document.getElementById('appointmentsChart').getContext('2d');
    const departmentsCtx = document.getElementById('departmentsChart').getContext('2d');

    // Aggregate appointments per day
    const appts = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const dateCounts = {};
    appts.forEach(a => {
      dateCounts[a.date] = (dateCounts[a.date] || 0) + 1;
    });
    // Sort dates
    const sortedDates = Object.keys(dateCounts).sort().slice(-7);
    const apptValues = sortedDates.map(d => dateCounts[d]);

    new Chart(appointmentsCtx, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
          label: 'Appointments',
          data: apptValues,
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });

    // Department-wise patient distribution
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const depts = window.HMS_DB.getAll(window.HMS_DB.KEYS.DEPARTMENTS);
    const deptDistribution = {};
    depts.forEach(d => { deptDistribution[d.name] = 0; });

    appts.forEach(a => {
      const doc = doctors.find(d => d.id === a.doctor_id);
      if (doc) {
        const dept = depts.find(dp => dp.id === doc.department_id);
        if (dept) {
          deptDistribution[dept.name] = (deptDistribution[dept.name] || 0) + 1;
        }
      }
    });

    new Chart(departmentsCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(deptDistribution),
        datasets: [{
          data: Object.values(deptDistribution),
          backgroundColor: ['#0284c7', '#0f766e', '#f59e0b', '#3b82f6', '#10b981'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
      }
    });
  },

  getDoctorDashboardHTML: function(doctorId) {
    const appointments = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const today = '2026-07-14';

    // Doctor queue for today
    const doctorApptsToday = appointments
      .filter(a => a.doctor_id === doctorId && a.date === today && !['Cancelled', 'No-Show'].includes(a.status))
      .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

    // Upcoming appointments (future dates)
    const upcomingAppts = appointments
      .filter(a => a.doctor_id === doctorId && a.date > today && a.status === 'Scheduled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot))
      .slice(0, 5);

    // Pending prescriptions (Completed appointments without a prescription recorded)
    const records = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICAL_RECORDS);
    const prescriptions = window.HMS_DB.getAll(window.HMS_DB.KEYS.PRESCRIPTIONS);

    const completedAppts = appointments.filter(a => a.doctor_id === doctorId && a.status === 'Completed');
    const pendingPrescrAppts = completedAppts.filter(a => {
      // Completed, has a record, but NO prescription dispensed/pending
      const hasRecord = records.some(r => r.appointment_id === a.id);
      const hasPrescr = prescriptions.some(p => p.appointment_id === a.id);
      return hasRecord && !hasPrescr;
    });

    let queueHTML = '';
    if (doctorApptsToday.length === 0) {
      queueHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-smile-beam"></i></div>
          <div class="empty-state-title">No appointments today</div>
          <div class="empty-state-text">You have a clear schedule for today. Rest up!</div>
        </div>
      `;
    } else {
      queueHTML = `
        <div class="card-header-row">
          <h3 class="card-title">Today's Consultations Queue</h3>
          <button class="btn btn-primary btn-sm" onclick="window.HMS_APPOINTMENTS.callNextPatient('${doctorId}')">
            <i class="fa-solid fa-bullhorn"></i> Call Next Patient
          </button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Time Slot</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${doctorApptsToday.map((a, idx) => {
                const pat = patients.find(p => p.id === a.patient_id);
                let badgeClass = 'badge-info';
                if (a.status === 'Confirmed') badgeClass = 'badge-success';
                else if (a.status === 'Completed') badgeClass = 'badge-gray';

                return `
                  <tr id="appt-row-${a.id}">
                    <td><strong>#${idx + 1}</strong></td>
                    <td><a href="#/patients?id=${a.patient_id}"><strong>${pat ? pat.name : 'Unknown'}</strong></a></td>
                    <td><span class="current-time-display">${a.time_slot}</span></td>
                    <td>${a.reason}</td>
                    <td><span class="badge ${badgeClass}">${a.status}</span></td>
                    <td>
                      ${a.status !== 'Completed' ? `
                        <button class="btn btn-success btn-sm" onclick="window.HMS_RECORDS.openDiagnosisModal('${a.id}')" title="Complete & Write Record">
                          <i class="fa-solid fa-notes-medical"></i> Consult
                        </button>
                      ` : `
                        <span class="text-muted"><i class="fa-solid fa-check-circle"></i> Done</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    return `
      <div class="dashboard-split-grid">
        <div class="card">
          ${queueHTML}
        </div>
        <div class="card">
          <h3 class="card-title" class="mb-4" style="margin-bottom: 16px;">Pending Prescriptions</h3>
          ${pendingPrescrAppts.length === 0 ? `
            <p class="text-muted">No pending prescriptions to write.</p>
          ` : `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Appt Date</th>
                    <th>Diagnosis</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingPrescrAppts.map(a => {
                    const pat = patients.find(p => p.id === a.patient_id);
                    const rec = records.find(r => r.appointment_id === a.id);
                    return `
                      <tr>
                        <td><strong>${pat ? pat.name : 'Unknown'}</strong></td>
                        <td>${a.date}</td>
                        <td>${rec ? rec.diagnosis : 'N/A'}</td>
                        <td>
                          <button class="btn btn-outline btn-sm" onclick="window.HMS_RECORDS.openPrescriptionModal('${a.id}')">
                            <i class="fa-solid fa-prescription"></i> Write Rx
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
          
          <h3 class="card-title" style="margin-top: 24px; margin-bottom: 16px;">Upcoming Bookings</h3>
          ${upcomingAppts.length === 0 ? `
            <p class="text-muted">No future appointments scheduled.</p>
          ` : `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${upcomingAppts.map(a => {
                    const pat = patients.find(p => p.id === a.patient_id);
                    return `
                      <tr>
                        <td><strong>${a.date}</strong></td>
                        <td>${a.time_slot}</td>
                        <td>${pat ? pat.name : 'Unknown'}</td>
                        <td>${a.reason}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  getReceptionistDashboardHTML: function() {
    const appts = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const docs = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const beds = window.HMS_DB.getAll(window.HMS_DB.KEYS.BEDS);
    const today = '2026-07-14';

    // Appointments today to confirm or check
    const todayAppts = appts.filter(a => a.date === today && a.status === 'Scheduled');
    const activeAppts = appts.filter(a => a.date === today && !['Cancelled', 'No-Show'].includes(a.status));

    // Bed availability counts
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.status === 'Occupied').length;
    const availBeds = totalBeds - occupiedBeds;

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon primary"><i class="fa-solid fa-calendar-day"></i></div>
          <div class="stat-info">
            <span class="stat-label">Active Appts Today</span>
            <span class="stat-value">${activeAppts.length}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-clock"></i></div>
          <div class="stat-info">
            <span class="stat-label">Pending Confirmation</span>
            <span class="stat-value">${todayAppts.length}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success"><i class="fa-solid fa-bed"></i></div>
          <div class="stat-info">
            <span class="stat-label">Available Wards Beds</span>
            <span class="stat-value">${availBeds} / ${totalBeds}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-split-grid">
        <div class="card">
          <div class="card-header-row">
            <h3 class="card-title">Appointments Awaiting Confirmation</h3>
            <a href="#/appointments" class="btn btn-outline btn-sm">Manage All</a>
          </div>
          ${todayAppts.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-check-circle"></i></div>
              <div class="empty-state-title">All appointments confirmed!</div>
              <div class="empty-state-text">No pending appointments for today require receptionist actions.</div>
            </div>
          ` : `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${todayAppts.map(a => {
                    const pat = patients.find(p => p.id === a.patient_id);
                    const doc = docs.find(d => d.id === a.doctor_id);
                    return `
                      <tr>
                        <td><strong>${pat ? pat.name : 'Unknown'}</strong></td>
                        <td>${doc ? doc.name : 'Unknown'}</td>
                        <td>${a.time_slot}</td>
                        <td>
                          <button class="btn btn-success btn-sm" onclick="window.HMS_APPOINTMENTS.updateStatus('${a.id}', 'Confirmed')">Confirm</button>
                          <button class="btn btn-danger btn-sm" onclick="window.HMS_APPOINTMENTS.cancelPrompt('${a.id}')">Cancel</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;">Quick Shortcuts</h3>
          <div class="demo-login-tags" style="gap: 12px; margin-bottom: 24px;">
            <a href="#/patients" class="btn btn-primary" style="flex-grow: 1;"><i class="fa-solid fa-user-plus"></i> Register Patient</a>
            <a href="#/appointments?action=book" class="btn btn-secondary" style="flex-grow: 1;"><i class="fa-solid fa-calendar-plus"></i> Book Appointment</a>
          </div>

          <h3 class="card-title" style="margin-bottom: 16px;">IPD Beds Occupancy Snapshot</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ward</th>
                  <th>Occupancy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${['w-icu', 'w-gen', 'w-mat', 'w-pvt'].map(wardId => {
                  const wardBeds = beds.filter(b => b.ward_id === wardId);
                  const occ = wardBeds.filter(b => b.status === 'Occupied').length;
                  const name = wardId === 'w-icu' ? 'ICU' : wardId === 'w-gen' ? 'General' : wardId === 'w-mat' ? 'Maternity' : 'Private';
                  const percent = wardBeds.length > 0 ? Math.round((occ / wardBeds.length) * 100) : 0;
                  return `
                    <tr>
                      <td><strong>${name} Ward</strong></td>
                      <td>${occ} / ${wardBeds.length} Beds occupied</td>
                      <td>
                        <span class="badge ${percent > 80 ? 'badge-danger' : percent > 40 ? 'badge-warning' : 'badge-success'}">${percent}% Full</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  getPharmacistDashboardHTML: function() {
    const meds = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);
    const prescs = window.HMS_DB.getAll(window.HMS_DB.KEYS.PRESCRIPTIONS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);

    // Low stock
    const lowStock = meds.filter(m => m.stock_quantity <= m.reorder_level);
    
    // Expiring (within 30 days of 2026-07-14)
    const todayMs = new Date('2026-07-14').getTime();
    const thirtyDaysMs = todayMs + (30 * 24 * 60 * 60 * 1000);
    const expiringMeds = meds.filter(m => {
      const expMs = new Date(m.expiry_date).getTime();
      return expMs > todayMs && expMs <= thirtyDaysMs;
    });

    // Pending prescriptions
    const pendingPrescs = prescs.filter(p => p.status === 'Pending');

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon danger"><i class="fa-solid fa-hourglass-half"></i></div>
          <div class="stat-info">
            <span class="stat-label">Pending Refills</span>
            <span class="stat-value">${pendingPrescs.length}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-box-open"></i></div>
          <div class="stat-info">
            <span class="stat-label">Low Stock Alerter</span>
            <span class="stat-value">${lowStock.length} Items</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon danger"><i class="fa-solid fa-calendar-times"></i></div>
          <div class="stat-info">
            <span class="stat-label">Expiring Soon (30d)</span>
            <span class="stat-value">${expiringMeds.length} Items</span>
          </div>
        </div>
      </div>

      <div class="dashboard-split-grid">
        <div class="card">
          <div class="card-header-row">
            <h3 class="card-title">Pending Prescription Dispensation</h3>
            <a href="#/pharmacy" class="btn btn-outline btn-sm">Pharmacy Console</a>
          </div>
          ${pendingPrescs.length === 0 ? `
            <p class="text-muted">No prescriptions waiting for dispensing.</p>
          ` : `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Prescribed Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingPrescs.map(p => {
                    const pat = patients.find(patObj => patObj.id === p.patient_id);
                    return `
                      <tr>
                        <td><strong>${pat ? pat.name : 'Unknown'}</strong></td>
                        <td>${new Date(p.created_at).toLocaleDateString()}</td>
                        <td>
                          <button class="btn btn-primary btn-sm" onclick="window.HMS_PHARMACY.openDispenseModal('${p.id}')">
                            <i class="fa-solid fa-truck-ramp-box"></i> Dispense Meds
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;">Low Stock Alerts</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Stock</th>
                  <th>Reorder Lvl</th>
                </tr>
              </thead>
              <tbody>
                ${lowStock.slice(0, 5).map(m => `
                  <tr>
                    <td><strong>${m.name}</strong></td>
                    <td class="text-danger"><strong>${m.stock_quantity}</strong></td>
                    <td>${m.reorder_level}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  getLabTechnicianDashboardHTML: function() {
    const orders = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TEST_ORDERS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const tests = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TESTS);

    const pendingOrders = orders.filter(o => o.status !== 'Completed');
    const activeOrders = orders.filter(o => ['Sample Collected', 'Processing'].includes(o.status));

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon info"><i class="fa-solid fa-vial"></i></div>
          <div class="stat-info">
            <span class="stat-label">Pending Lab Orders</span>
            <span class="stat-value">${pendingOrders.length}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-spinner"></i></div>
          <div class="stat-info">
            <span class="stat-label">In-Process Tests</span>
            <span class="stat-value">${activeOrders.length}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header-row">
          <h3 class="card-title">Diagnostic Orders Queue</h3>
          <a href="#/lab" class="btn btn-outline btn-sm">Full Worklist</a>
        </div>
        ${pendingOrders.length === 0 ? `
          <p class="text-muted">No pending diagnostic tests.</p>
        ` : `
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Test Requested</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${pendingOrders.map(o => {
                  const pat = patients.find(p => p.id === o.patient_id);
                  const test = tests.find(t => t.id === o.test_id);
                  return `
                    <tr>
                      <td><strong>${pat ? pat.name : 'Unknown'}</strong></td>
                      <td>${test ? test.test_name : 'Unknown'}</td>
                      <td><span class="badge ${o.status === 'Ordered' ? 'badge-info' : 'badge-warning'}">${o.status}</span></td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="window.HMS_LAB.openUpdateStatusModal('${o.id}')">
                          Update Status
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  getPatientDashboardHTML: function(patientId) {
    const appointments = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const prescs = window.HMS_DB.getAll(window.HMS_DB.KEYS.PRESCRIPTIONS);
    const invoices = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVOICES);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const today = '2026-07-14';

    // Patient's upcoming appointments
    const myAppts = appointments
      .filter(a => a.patient_id === patientId && a.date >= today && ['Scheduled', 'Confirmed'].includes(a.status))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot));

    // Patient's medical prescriptions
    const myPrescs = prescs.filter(p => p.patient_id === patientId);

    // Patient's invoices
    const myInvoices = invoices.filter(i => i.patient_id === patientId);
    const pendingInvoices = myInvoices.filter(i => i.status !== 'Paid');
    const totalDues = pendingInvoices.reduce((sum, inv) => sum + inv.net_payable, 0);

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon primary"><i class="fa-solid fa-clock"></i></div>
          <div class="stat-info">
            <span class="stat-label">My Upcoming Appts</span>
            <span class="stat-value">${myAppts.length}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success"><i class="fa-solid fa-receipt"></i></div>
          <div class="stat-info">
            <span class="stat-label">Pending Billing Dues</span>
            <span class="stat-value">$${totalDues.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon info"><i class="fa-solid fa-file-prescription"></i></div>
          <div class="stat-info">
            <span class="stat-label">Prescriptions Issued</span>
            <span class="stat-value">${myPrescs.length} Records</span>
          </div>
        </div>
      </div>

      <div class="dashboard-split-grid">
        <div class="card">
          <div class="card-header-row">
            <h3 class="card-title">My Upcoming Appointments</h3>
            <a href="#/appointments?action=book" class="btn btn-primary btn-sm"><i class="fa-solid fa-calendar-plus"></i> Book Appt</a>
          </div>
          ${myAppts.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-calendar-times"></i></div>
              <div class="empty-state-title">No upcoming appointments</div>
              <div class="empty-state-text">You have no doctors consultations lined up. Book one now if you feel unwell.</div>
              <a href="#/appointments?action=book" class="btn btn-primary btn-sm" style="margin-top: 10px;">Book Appointment</a>
            </div>
          ` : `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Doctor</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${myAppts.map(a => {
                    const doc = doctors.find(d => d.id === a.doctor_id);
                    return `
                      <tr>
                        <td><strong>${a.date}</strong></td>
                        <td>${a.time_slot}</td>
                        <td>${doc ? doc.name : 'Unknown Doctor'}</td>
                        <td>${a.reason}</td>
                        <td><span class="badge ${a.status === 'Confirmed' ? 'badge-success' : 'badge-info'}">${a.status}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;">Recent Bills / Dues</h3>
          ${pendingInvoices.length === 0 ? `
            <p class="text-muted">You have no outstanding invoices. All bills are fully paid!</p>
          ` : `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingInvoices.map(i => `
                    <tr>
                      <td>Invoice #${i.id.substring(0, 8).toUpperCase()}</td>
                      <td><strong>$${i.net_payable.toFixed(2)}</strong></td>
                      <td><span class="badge ${i.status === 'Pending' ? 'badge-danger' : 'badge-warning'}">${i.status}</span></td>
                      <td>
                        <a href="#/billing?id=${i.id}" class="btn btn-outline btn-sm">View details</a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  // ==========================================
  // CONFIRMATION MODAL & GLOBAL INTERFACES
  // ==========================================
  confirm: function(title, message, callback, extraHTML = '') {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-modal-title').innerText = title;
    document.getElementById('confirm-modal-message').innerText = message;
    
    const extraContainer = document.getElementById('confirm-modal-extra');
    if (extraHTML) {
      extraContainer.innerHTML = extraHTML;
      extraContainer.classList.remove('hidden');
    } else {
      extraContainer.classList.add('hidden');
      extraContainer.innerHTML = '';
    }

    modal.classList.remove('hidden');

    const submitBtn = document.getElementById('confirm-modal-submit');
    // Replace listener
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

    newSubmitBtn.addEventListener('click', () => {
      let extraData = null;
      // If extra html contains inputs, capture them
      const inputs = extraContainer.querySelectorAll('input, select, textarea');
      if (inputs.length > 0) {
        extraData = {};
        inputs.forEach(input => {
          extraData[input.name || input.id] = input.value;
        });
      }
      modal.classList.add('hidden');
      callback(extraData);
    });
  },

  closeConfirmModal: function() {
    document.getElementById('confirm-modal').classList.add('hidden');
  },

  toast: function(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-solid fa-info-circle';
    if (type === 'success') icon = 'fa-solid fa-circle-check';
    if (type === 'danger') icon = 'fa-solid fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `
      <div class="toast-icon"><i class="${icon}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Auto-remove toast after 4 seconds
    const autoRemove = setTimeout(() => {
      toast.style.animation = 'toastSlideIn 0.3s reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(autoRemove);
      toast.remove();
    });
  },

  initTheme: function() {
    const isDark = localStorage.getItem('hms_theme_dark') === 'true';
    if (isDark) {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      document.getElementById('theme-toggle').innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
      document.getElementById('theme-toggle').innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  },

  toggleTheme: function() {
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      localStorage.setItem('hms_theme_dark', 'false');
      document.getElementById('theme-toggle').innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('hms_theme_dark', 'true');
      document.getElementById('theme-toggle').innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  },

  updateClock: function() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    
    document.getElementById('current-time-display').innerText = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  },

  bindEvents: function() {
    // Theme Toggler
    document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

    // Sidebar Toggler
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('collapsed');
    });

    // Logout Click
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.confirm('Confirm Logout', 'Are you sure you want to end your current session?', (confirmed) => {
        window.HMS_DB.setCurrentSession(null);
        window.location.hash = '';
        this.checkSession();
        this.toast('Session Ended', 'You have logged out successfully.', 'success');
      });
    });

    // Global Search Keyup & Blur
    const searchInput = document.getElementById('global-search');
    const searchDropdown = document.getElementById('global-search-results');

    searchInput.addEventListener('keyup', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        searchDropdown.classList.add('hidden');
        return;
      }
      this.executeGlobalSearch(query, searchDropdown);
    });

    // Close dropdown on clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.add('hidden');
      }
    });
  },

  executeGlobalSearch: function(query, dropdown) {
    dropdown.innerHTML = '';
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const appointments = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const session = window.HMS_DB.getCurrentSession();

    // Filter list
    const matchedPatients = patients.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.phone.includes(query)
    );
    const matchedDoctors = doctors.filter(d => 
      d.name.toLowerCase().includes(query) || 
      d.specialization.toLowerCase().includes(query)
    );

    let hasResults = false;

    // Patients Group (Check if role has access to patients module)
    if (['Admin', 'Doctor', 'Receptionist', 'Pharmacist', 'Lab Technician'].includes(session.role) && matchedPatients.length > 0) {
      hasResults = true;
      const groupTitle = document.createElement('div');
      groupTitle.className = 'search-group-title';
      groupTitle.innerText = 'Patients';
      dropdown.appendChild(groupTitle);

      matchedPatients.slice(0, 3).forEach(p => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <span class="search-result-name">${p.name}</span>
          <span class="search-result-meta">${p.phone}</span>
        `;
        item.addEventListener('click', () => {
          window.location.hash = `#/patients?id=${p.id}`;
          dropdown.classList.add('hidden');
          document.getElementById('global-search').value = '';
        });
        dropdown.appendChild(item);
      });
    }

    // Doctors Group
    if (matchedDoctors.length > 0) {
      hasResults = true;
      const groupTitle = document.createElement('div');
      groupTitle.className = 'search-group-title';
      groupTitle.innerText = 'Doctors';
      dropdown.appendChild(groupTitle);

      matchedDoctors.slice(0, 3).forEach(d => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <span class="search-result-name">${d.name}</span>
          <span class="search-result-meta">${d.specialization}</span>
        `;
        item.addEventListener('click', () => {
          if (session.role === 'Admin') {
            window.location.hash = `#/doctors?id=${d.id}`;
          } else {
            // Take to appointments or profile
            window.location.hash = `#/appointments`;
          }
          dropdown.classList.add('hidden');
          document.getElementById('global-search').value = '';
        });
        dropdown.appendChild(item);
      });
    }

    if (!hasResults) {
      dropdown.innerHTML = `<div class="search-result-empty">No matches found for "${query}"</div>`;
    }

    dropdown.classList.remove('hidden');
  }
};

// Start application when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.HMS_APP.init();
});
