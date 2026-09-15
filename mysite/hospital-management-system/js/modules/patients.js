/**
 * patients.js - Patient Management Module: CRUD, Lists, Pagination, and Profiles
 */

window.HMS_PATIENTS = {
  currentPage: 1,
  pageSize: 10,
  sortBy: 'name',
  sortOrder: 'asc',

  render: function(container, params) {
    if (params && params.id) {
      this.renderProfile(container, params.id);
    } else {
      this.renderList(container);
    }
  },

  renderList: function(container) {
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    
    container.innerHTML = `
      <div class="card">
        <div class="card-header-row">
          <h3 class="card-title">Patient Records</h3>
          <button class="btn btn-primary" onclick="window.HMS_PATIENTS.openRegistrationModal()">
            <i class="fa-solid fa-user-plus"></i> Register Patient
          </button>
        </div>
        
        <div class="table-controls">
          <div class="search-filter-box">
            <div class="search-control">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="patient-search" placeholder="Search by name or phone..." onkeyup="window.HMS_PATIENTS.handleSearch()">
            </div>
            <select id="patient-filter-blood" class="select-filter" onchange="window.HMS_PATIENTS.handleFilter()">
              <option value="">All Blood Groups</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>

        <div class="table-wrapper">
          <table id="patients-table">
            <thead>
              <tr>
                <th class="sortable" onclick="window.HMS_PATIENTS.handleSort('id')">Patient ID <i class="fa-solid fa-sort"></i></th>
                <th class="sortable" onclick="window.HMS_PATIENTS.handleSort('name')">Name <i class="fa-solid fa-sort"></i></th>
                <th>Age / Gender</th>
                <th>Blood Group</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="patients-table-body">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>

        <div class="pagination" id="patients-pagination">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;

    this.currentPage = 1;
    this.updateTable();
  },

  updateTable: function() {
    const rawPatients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const searchVal = document.getElementById('patient-search').value.trim().toLowerCase();
    const bloodVal = document.getElementById('patient-filter-blood').value;

    // Filter
    let filtered = rawPatients.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchVal) || p.phone.includes(searchVal);
      const matchBlood = !bloodVal || p.blood_group === bloodVal;
      return matchSearch && matchBlood;
    });

    // Sort
    filtered.sort((a, b) => {
      let aField = a[this.sortBy].toString().toLowerCase();
      let bField = b[this.sortBy].toString().toLowerCase();
      if (aField < bField) return this.sortOrder === 'asc' ? -1 : 1;
      if (aField > bField) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, totalRecords);
    const paginated = filtered.slice(startIdx, endIdx);

    const tbody = document.getElementById('patients-table-body');
    if (paginated.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 32px 0;">
            <div class="empty-state-icon"><i class="fa-solid fa-users-slash"></i></div>
            <div class="empty-state-title">No patients found</div>
            <div class="empty-state-text">No records matched your filters. Check search keywords or blood filters.</div>
          </td>
        </tr>
      `;
      document.getElementById('patients-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = paginated.map(p => {
      // Calculate age
      const dob = new Date(p.dob);
      const age = new Date().getFullYear() - dob.getFullYear();

      return `
        <tr>
          <td><strong>${p.id.toUpperCase()}</strong></td>
          <td><a href="#/patients?id=${p.id}"><strong>${p.name}</strong></a></td>
          <td>${age} yrs / ${p.gender}</td>
          <td><span class="badge badge-info">${p.blood_group}</span></td>
          <td>${p.phone}</td>
          <td>${p.address}</td>
          <td>
            <div class="demo-login-tags" style="gap: 4px;">
              <a href="#/patients?id=${p.id}" class="btn btn-secondary btn-sm" title="View Profile"><i class="fa-solid fa-eye"></i></a>
              <button class="btn btn-outline btn-sm" onclick="window.HMS_PATIENTS.openEditModal('${p.id}')" title="Edit details"><i class="fa-solid fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="window.HMS_PATIENTS.deletePrompt('${p.id}')" title="Delete record"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Pagination controls
    this.renderPaginationControls(totalPages, startIdx + 1, endIdx, totalRecords);
  },

  renderPaginationControls: function(totalPages, start, end, total) {
    const container = document.getElementById('patients-pagination');
    
    let buttons = `
      <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="window.HMS_PATIENTS.setPage(${this.currentPage - 1})">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      buttons += `
        <button class="pagination-btn ${this.currentPage === i ? 'active' : ''}" onclick="window.HMS_PATIENTS.setPage(${i})">${i}</button>
      `;
    }

    buttons += `
      <button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="window.HMS_PATIENTS.setPage(${this.currentPage + 1})">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    container.innerHTML = `
      <div class="pagination-info">Showing ${start} to ${end} of ${total} patient records</div>
      <div class="pagination-buttons">${buttons}</div>
    `;
  },

  setPage: function(page) {
    this.currentPage = page;
    this.updateTable();
  },

  handleSearch: function() {
    this.currentPage = 1;
    this.updateTable();
  },

  handleFilter: function() {
    this.currentPage = 1;
    this.updateTable();
  },

  handleSort: function(field) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.updateTable();
  },

  openRegistrationModal: function() {
    this.renderFormModal('Register New Patient', null);
  },

  openEditModal: function(id) {
    const patient = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, id);
    if (patient) {
      this.renderFormModal('Edit Patient Details', patient);
    }
  },

  renderFormModal: function(title, patientData) {
    // Check if modal container already exists
    let modalOverlay = document.getElementById('patient-form-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'patient-form-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="document.getElementById('patient-form-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="patient-editor-form" novalidate>
            <input type="hidden" id="edit-pat-id" value="${patientData ? patientData.id : ''}">
            <div class="form-grid">
              <div class="form-group">
                <label for="edit-pat-name">Full Name</label>
                <input type="text" id="edit-pat-name" value="${patientData ? patientData.name : ''}" required>
                <div class="error-msg" id="edit-pat-name-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-pat-dob">Date of Birth</label>
                <input type="date" id="edit-pat-dob" value="${patientData ? patientData.dob : ''}" required>
                <div class="error-msg" id="edit-pat-dob-err"></div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="edit-pat-gender">Gender</label>
                <select id="edit-pat-gender" required>
                  <option value="">Select</option>
                  <option value="Male" ${patientData && patientData.gender === 'Male' ? 'selected' : ''}>Male</option>
                  <option value="Female" ${patientData && patientData.gender === 'Female' ? 'selected' : ''}>Female</option>
                  <option value="Other" ${patientData && patientData.gender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
                <div class="error-msg" id="edit-pat-gender-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-pat-blood">Blood Group</label>
                <select id="edit-pat-blood" required>
                  <option value="">Select</option>
                  <option value="A+" ${patientData && patientData.blood_group === 'A+' ? 'selected' : ''}>A+</option>
                  <option value="A-" ${patientData && patientData.blood_group === 'A-' ? 'selected' : ''}>A-</option>
                  <option value="B+" ${patientData && patientData.blood_group === 'B+' ? 'selected' : ''}>B+</option>
                  <option value="B-" ${patientData && patientData.blood_group === 'B-' ? 'selected' : ''}>B-</option>
                  <option value="AB+" ${patientData && patientData.blood_group === 'AB+' ? 'selected' : ''}>AB+</option>
                  <option value="AB-" ${patientData && patientData.blood_group === 'AB-' ? 'selected' : ''}>AB-</option>
                  <option value="O+" ${patientData && patientData.blood_group === 'O+' ? 'selected' : ''}>O+</option>
                  <option value="O-" ${patientData && patientData.blood_group === 'O-' ? 'selected' : ''}>O-</option>
                </select>
                <div class="error-msg" id="edit-pat-blood-err"></div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="edit-pat-phone">Phone Number</label>
                <input type="tel" id="edit-pat-phone" value="${patientData ? patientData.phone : ''}" required>
                <div class="error-msg" id="edit-pat-phone-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-pat-email">Email Address</label>
                <input type="email" id="edit-pat-email" value="${patientData ? patientData.email : ''}" required>
                <div class="error-msg" id="edit-pat-email-err"></div>
              </div>
            </div>

            <div class="form-group">
              <label for="edit-pat-address">Full Address</label>
              <input type="text" id="edit-pat-address" value="${patientData ? patientData.address : ''}" required>
              <div class="error-msg" id="edit-pat-address-err"></div>
            </div>

            <div class="form-group">
              <label for="edit-pat-emergency">Emergency Contact Details</label>
              <input type="text" id="edit-pat-emergency" placeholder="Name (Relation) - Phone" value="${patientData ? patientData.emergency_contact : ''}" required>
              <div class="error-msg" id="edit-pat-emergency-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('patient-form-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_PATIENTS.savePatientForm()">Save Details</button>
        </div>
      </div>
    `;

    modalOverlay.classList.remove('hidden');
  },

  savePatientForm: function() {
    // Form validation
    const fields = ['edit-pat-name', 'edit-pat-dob', 'edit-pat-gender', 'edit-pat-blood', 'edit-pat-phone', 'edit-pat-email', 'edit-pat-address', 'edit-pat-emergency'];
    let hasError = false;
    
    // Reset errors
    fields.forEach(f => {
      document.getElementById(`${f}-err`).innerText = '';
      document.getElementById(f).classList.remove('error');
    });

    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      const val = el.value.trim();
      if (!val) {
        document.getElementById(`${f}-err`).innerText = `${el.previousElementSibling.innerText} is required`;
        el.classList.add('error');
        hasError = true;
      } else {
        data[f.replace('edit-pat-', '')] = val;
      }
    });

    if (hasError) return;

    // Regex Checks
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(data.phone)) {
      document.getElementById('edit-pat-phone-err').innerText = 'Phone must be exactly 10 numeric digits';
      document.getElementById('edit-pat-phone').classList.add('error');
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      document.getElementById('edit-pat-email-err').innerText = 'Please enter a valid email address';
      document.getElementById('edit-pat-email').classList.add('error');
      hasError = true;
    }

    const dobDate = new Date(data.dob);
    const today = new Date();
    if (dobDate > today) {
      document.getElementById('edit-pat-dob-err').innerText = 'Date of Birth cannot be in the future';
      document.getElementById('edit-pat-dob').classList.add('error');
      hasError = true;
    }

    if (hasError) return;

    const id = document.getElementById('edit-pat-id').value;

    if (id) {
      // Update
      const oldPatient = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, id);
      window.HMS_DB.update(window.HMS_DB.KEYS.PATIENTS, id, {
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        blood_group: data.blood,
        phone: data.phone,
        email: data.email,
        address: data.address,
        emergency_contact: data.emergency
      });
      window.HMS_APP.toast('Patient Details Updated', `${data.name}'s file has been saved.`, 'success');
    } else {
      // Create new
      window.HMS_DB.insert(window.HMS_DB.KEYS.PATIENTS, {
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        blood_group: data.blood,
        phone: data.phone,
        email: data.email,
        address: data.address,
        emergency_contact: data.emergency,
        medical_history: 'None'
      });
      window.HMS_APP.toast('Patient Registered', `${data.name} has been added to the database.`, 'success');
    }

    document.getElementById('patient-form-modal').remove();
    this.updateTable();
  },

  deletePrompt: function(id) {
    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, id);
    if (!pat) return;

    // Referential integrity check
    if (window.HMS_DB.isReferenced(window.HMS_DB.KEYS.PATIENTS, id)) {
      window.HMS_APP.toast('Cannot Delete Patient', 'This patient has active scheduled appointments or is currently admitted.', 'danger');
      return;
    }

    window.HMS_APP.confirm(
      'Delete Patient Record',
      `Are you sure you want to permanently delete the profile of ${pat.name}? This action is irreversible.`,
      (confirmed) => {
        if (confirmed) {
          window.HMS_DB.delete(window.HMS_DB.KEYS.PATIENTS, id);
          // Delete from users if linked
          const users = window.HMS_DB.getAll(window.HMS_DB.KEYS.USERS);
          const u = users.find(usr => usr.entityId === id);
          if (u) {
            window.HMS_DB.delete(window.HMS_DB.KEYS.USERS, u.id);
          }
          window.HMS_APP.toast('Record Deleted', `Patient ${pat.name} deleted successfully.`, 'success');
          this.updateTable();
        }
      }
    );
  },

  // ==========================================
  // PATIENT PROFILE DETAIL SCREEN
  // ==========================================
  renderProfile: function(container, id) {
    const patient = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, id);
    if (!patient) {
      container.innerHTML = `<h2>Profile Not Found</h2><p>No patient matches this registration ID.</p>`;
      return;
    }

    // Calculate age
    const dob = new Date(patient.dob);
    const age = new Date().getFullYear() - dob.getFullYear();

    container.innerHTML = `
      <div class="profile-banner">
        <div class="profile-large-avatar">${patient.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
        <div class="profile-header-details">
          <h2>${patient.name}</h2>
          <p class="text-muted">Patient ID: ${patient.id.toUpperCase()} | DOB: ${patient.dob} (${age} years)</p>
          <div class="profile-header-meta">
            <span class="profile-meta-tag"><i class="fa-solid fa-droplet"></i> Blood Group: ${patient.blood_group}</span>
            <span class="profile-meta-tag"><i class="fa-solid fa-venus-mars"></i> Gender: ${patient.gender}</span>
            <span class="profile-meta-tag"><i class="fa-solid fa-phone"></i> ${patient.phone}</span>
          </div>
        </div>
      </div>

      <div class="card tabs-container">
        <div class="tabs-header">
          <button class="tab-btn active" onclick="window.HMS_PATIENTS.switchTab(event, 'tab-info')">Demographics & History</button>
          <button class="tab-btn" onclick="window.HMS_PATIENTS.switchTab(event, 'tab-appts')">Appointments</button>
          <button class="tab-btn" onclick="window.HMS_PATIENTS.switchTab(event, 'tab-admit')">IPD Admissions</button>
          <button class="tab-btn" onclick="window.HMS_PATIENTS.switchTab(event, 'tab-pres')">Prescriptions</button>
          <button class="tab-btn" onclick="window.HMS_PATIENTS.switchTab(event, 'tab-lab')">Lab Results</button>
          <button class="tab-btn" onclick="window.HMS_PATIENTS.switchTab(event, 'tab-bills')">Invoices</button>
        </div>

        <div id="tab-info" class="tab-pane active">
          <div class="form-grid" style="margin-bottom: 24px;">
            <div>
              <h4 style="margin-bottom: 12px; font-weight:600;"><i class="fa-solid fa-address-card"></i> Contact Information</h4>
              <p style="margin-bottom: 8px;"><strong>Email:</strong> ${patient.email}</p>
              <p style="margin-bottom: 8px;"><strong>Address:</strong> ${patient.address}</p>
              <p style="margin-bottom: 8px;"><strong>Emergency Contact:</strong> ${patient.emergency_contact}</p>
            </div>
            <div>
              <h4 style="margin-bottom: 12px; font-weight:600;"><i class="fa-solid fa-clipboard-list"></i> Medical Background</h4>
              <p style="margin-bottom: 8px;"><strong>Chronic Conditions / Allergies:</strong></p>
              <div class="current-time-display" style="padding: 10px; border-radius: 8px; margin-bottom: 12px;" id="pat-history-text">
                ${patient.medical_history || 'No chronic issues or allergies registered.'}
              </div>
              <button class="btn btn-outline btn-sm" onclick="window.HMS_PATIENTS.openMedicalHistoryModal('${patient.id}')">
                <i class="fa-solid fa-plus-circle"></i> Add Medical History Entry
              </button>
            </div>
          </div>
        </div>

        <div id="tab-appts" class="tab-pane">
          <div id="profile-appts-list">Loading...</div>
        </div>

        <div id="tab-admit" class="tab-pane">
          <div id="profile-admit-list">Loading...</div>
        </div>

        <div id="tab-pres" class="tab-pane">
          <div id="profile-pres-list">Loading...</div>
        </div>

        <div id="tab-lab" class="tab-pane">
          <div id="profile-lab-list">Loading...</div>
        </div>

        <div id="tab-bills" class="tab-pane">
          <div id="profile-bills-list">Loading...</div>
        </div>
      </div>
    `;

    // Load tab contents
    this.loadProfileAppointments(patient.id);
    this.loadProfileAdmissions(patient.id);
    this.loadProfilePrescriptions(patient.id);
    this.loadProfileLabResults(patient.id);
    this.loadProfileInvoices(patient.id);
  },

  switchTab: function(event, tabId) {
    const container = event.target.closest('.tabs-container');
    container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  },

  openMedicalHistoryModal: function(patientId) {
    const patient = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, patientId);
    if (!patient) return;

    let modalOverlay = document.getElementById('history-form-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'history-form-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Add Medical History Entry</h3>
          <button class="modal-close" onclick="document.getElementById('history-form-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="history-entry-input">Enter details (e.g. Allergies, Diabetes, Asthma, Chronic surgeries, etc.)</label>
            <textarea id="history-entry-input" rows="4" placeholder="Type here...">${patient.medical_history || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('history-form-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_PATIENTS.saveMedicalHistory('${patient.id}')">Save History</button>
        </div>
      </div>
    `;
  },

  saveMedicalHistory: function(patientId) {
    const newVal = document.getElementById('history-entry-input').value.trim();
    window.HMS_DB.update(window.HMS_DB.KEYS.PATIENTS, patientId, {
      medical_history: newVal || 'None'
    });
    
    document.getElementById('history-form-modal').remove();
    document.getElementById('pat-history-text').innerText = newVal || 'None';
    window.HMS_APP.toast('Medical History Updated', 'The patient record history has been saved.', 'success');
  },

  loadProfileAppointments: function(patientId) {
    const appts = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS).filter(a => a.patient_id === patientId);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const div = document.getElementById('profile-appts-list');

    if (appts.length === 0) {
      div.innerHTML = `<p class="text-muted">No appointments found for this patient.</p>`;
      return;
    }

    div.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time Slot</th>
              <th>Doctor</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${appts.map(a => {
              const doc = doctors.find(d => d.id === a.doctor_id);
              let badge = 'badge-info';
              if (a.status === 'Confirmed') badge = 'badge-success';
              else if (a.status === 'Completed') badge = 'badge-gray';
              else if (a.status === 'Cancelled') badge = 'badge-danger';
              else if (a.status === 'No-Show') badge = 'badge-warning';

              return `
                <tr>
                  <td><strong>${a.date}</strong></td>
                  <td>${a.time_slot}</td>
                  <td>${doc ? doc.name : 'Unknown Doctor'}</td>
                  <td>${a.reason}</td>
                  <td><span class="badge ${badge}">${a.status}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  loadProfileAdmissions: function(patientId) {
    const admits = window.HMS_DB.getAll(window.HMS_DB.KEYS.ADMISSIONS).filter(a => a.patient_id === patientId);
    const wards = window.HMS_DB.getAll(window.HMS_DB.KEYS.WARDS);
    const beds = window.HMS_DB.getAll(window.HMS_DB.KEYS.BEDS);
    const div = document.getElementById('profile-admit-list');

    if (admits.length === 0) {
      div.innerHTML = `<p class="text-muted">No admission records found for this patient.</p>`;
      return;
    }

    div.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Adm. Date</th>
              <th>Disch. Date</th>
              <th>Ward / Bed</th>
              <th>Diagnosis / Reason</th>
              <th>Charges</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${admits.map(a => {
              const ward = wards.find(w => w.id === a.ward_id);
              const bed = beds.find(b => b.id === a.bed_id);
              return `
                <tr>
                  <td><strong>${a.admission_date}</strong></td>
                  <td>${a.discharge_date || '--'}</td>
                  <td>${ward ? ward.name : 'Ward'} / ${bed ? bed.bed_number : 'Bed'}</td>
                  <td>${a.reason}</td>
                  <td>$${a.bed_charges ? a.bed_charges.toFixed(2) : '0.00'}</td>
                  <td><span class="badge ${a.status === 'Admitted' ? 'badge-danger' : 'badge-success'}">${a.status}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  loadProfilePrescriptions: function(patientId) {
    const prescs = window.HMS_DB.getAll(window.HMS_DB.KEYS.PRESCRIPTIONS).filter(p => p.patient_id === patientId);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const div = document.getElementById('profile-pres-list');

    if (prescs.length === 0) {
      div.innerHTML = `<p class="text-muted">No prescriptions issued for this patient.</p>`;
      return;
    }

    div.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Doctor</th>
              <th>Dispense Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${prescs.map(p => {
              const doc = doctors.find(d => d.id === p.doctor_id);
              return `
                <tr>
                  <td><strong>${new Date(p.created_at).toLocaleDateString()}</strong></td>
                  <td>${doc ? doc.name : 'Unknown Doctor'}</td>
                  <td><span class="badge ${p.status === 'Dispensed' ? 'badge-success' : 'badge-warning'}">${p.status}</span></td>
                  <td>
                    <button class="btn btn-outline btn-sm" onclick="window.HMS_RECORDS.printPrescription('${p.id}')">
                      <i class="fa-solid fa-print"></i> Print Rx
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  loadProfileLabResults: function(patientId) {
    const orders = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TEST_ORDERS).filter(o => o.patient_id === patientId);
    const tests = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TESTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const div = document.getElementById('profile-lab-list');

    if (orders.length === 0) {
      div.innerHTML = `<p class="text-muted">No lab tests ordered for this patient.</p>`;
      return;
    }

    div.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Test Ordered</th>
              <th>Prescribed By</th>
              <th>Results / Report</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => {
              const test = tests.find(t => t.id === o.test_id);
              const doc = doctors.find(d => d.id === o.doctor_id);
              
              let statusBadge = 'badge-info';
              if (o.status === 'Completed') statusBadge = 'badge-success';
              else if (o.status === 'Processing' || o.status === 'Sample Collected') statusBadge = 'badge-warning';

              return `
                <tr>
                  <td><strong>${new Date(o.created_at).toLocaleDateString()}</strong></td>
                  <td>${test ? test.test_name : 'Lab Test'}</td>
                  <td>${doc ? doc.name : 'Unknown Doctor'}</td>
                  <td>
                    ${o.status === 'Completed' ? `
                      <span class="current-time-display" style="display:block; padding:4px 8px; font-size:11px; margin-bottom:4px;">${o.result_value}</span>
                      <a href="#" class="btn btn-secondary btn-sm" onclick="window.HMS_LAB.printReport('${o.id}'); event.preventDefault();">
                        <i class="fa-solid fa-file-pdf"></i> Report Card
                      </a>
                    ` : `
                      <span class="text-muted">Awaiting analysis</span>
                    `}
                  </td>
                  <td><span class="badge ${statusBadge}">${o.status}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  loadProfileInvoices: function(patientId) {
    const invoices = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVOICES).filter(i => i.patient_id === patientId);
    const div = document.getElementById('profile-bills-list');

    if (invoices.length === 0) {
      div.innerHTML = `<p class="text-muted">No billing invoices raised for this patient.</p>`;
      return;
    }

    div.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Raised Date</th>
              <th>Subtotal</th>
              <th>Net Payable</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(i => {
              let statusBadge = 'badge-danger';
              if (i.status === 'Paid') statusBadge = 'badge-success';
              else if (i.status === 'Partially Paid') statusBadge = 'badge-warning';

              return `
                <tr>
                  <td><strong>Invoice #${i.id.substring(0, 8).toUpperCase()}</strong></td>
                  <td>${new Date(i.created_at).toLocaleDateString()}</td>
                  <td>$${i.subtotal.toFixed(2)}</td>
                  <td><strong>$${i.net_payable.toFixed(2)}</strong></td>
                  <td><span class="badge ${statusBadge}">${i.status}</span></td>
                  <td>
                    <a href="#/billing?id=${i.id}" class="btn btn-outline btn-sm">View details</a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
};
