/**
 * doctors.js - Doctor & Staff Management Module (Admin only)
 */

window.HMS_DOCTORS = {
  currentTab: 'doctors-pane',

  render: function(container, params) {
    if (params && params.id) {
      this.renderDoctorProfile(container, params.id);
    } else {
      this.renderAdminConsole(container);
    }
  },

  renderAdminConsole: function(container) {
    container.innerHTML = `
      <div class="card tabs-container">
        <div class="tabs-header">
          <button class="tab-btn active" id="tab-btn-docs" onclick="window.HMS_DOCTORS.switchConsoleTab(event, 'doctors-pane')">Doctors Registry</button>
          <button class="tab-btn" id="tab-btn-depts" onclick="window.HMS_DOCTORS.switchConsoleTab(event, 'departments-pane')">Departments</button>
          <button class="tab-btn" id="tab-btn-staff" onclick="window.HMS_DOCTORS.switchConsoleTab(event, 'staff-pane')">Staff Registry</button>
        </div>

        <!-- DOCTORS REGISTRY PANEL -->
        <div id="doctors-pane" class="tab-pane active">
          <div class="card-header-row" style="margin-bottom: 16px;">
            <h3 class="card-title">Manage Doctors</h3>
            <button class="btn btn-primary" onclick="window.HMS_DOCTORS.openDoctorModal()">
              <i class="fa-solid fa-user-md"></i> Add Doctor
            </button>
          </div>

          <div class="table-controls">
            <div class="search-filter-box">
              <select id="doctor-dept-filter" class="select-filter" onchange="window.HMS_DOCTORS.loadDoctorsList()">
                <option value="">All Departments</option>
                <!-- Dynamically loaded -->
              </select>
            </div>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Department</th>
                  <th>Specialization</th>
                  <th>Qualification</th>
                  <th>Fee</th>
                  <th>Schedule</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="doctors-table-body">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- DEPARTMENTS PANEL -->
        <div id="departments-pane" class="tab-pane">
          <div class="card-header-row" style="margin-bottom: 16px;">
            <h3 class="card-title">Departments</h3>
            <button class="btn btn-primary" onclick="window.HMS_DOCTORS.openDeptModal()">
              <i class="fa-solid fa-plus-circle"></i> Add Department
            </button>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="departments-table-body">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- STAFF REGISTRY PANEL -->
        <div id="staff-pane" class="tab-pane">
          <div class="card-header-row" style="margin-bottom: 16px;">
            <h3 class="card-title">Support Staff Management</h3>
            <button class="btn btn-primary" onclick="window.HMS_DOCTORS.openStaffModal()">
              <i class="fa-solid fa-user-plus"></i> Add Staff Member
            </button>
          </div>

          <div class="table-controls">
            <div class="search-filter-box">
              <select id="staff-role-filter" class="select-filter" onchange="window.HMS_DOCTORS.loadStaffList()">
                <option value="">All Staff Roles</option>
                <option value="Nurse">Nurse</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Pharmacist">Pharmacist</option>
                <option value="Lab Technician">Lab Technician</option>
              </select>
            </div>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="staff-table-body">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Populate Filters and Table items
    this.populateDeptFilter();
    this.loadDoctorsList();
    this.loadDepartmentsList();
    this.loadStaffList();
  },

  switchConsoleTab: function(e, paneId) {
    const container = e.target.closest('.tabs-container');
    container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    e.target.classList.add('active');
    document.getElementById(paneId).classList.add('active');
    this.currentTab = paneId;
  },

  populateDeptFilter: function() {
    const filter = document.getElementById('doctor-dept-filter');
    const depts = window.HMS_DB.getAll(window.HMS_DB.KEYS.DEPARTMENTS);
    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.innerText = d.name;
      filter.appendChild(opt);
    });
  },

  // ==========================================
  // DOCTORS SUB-TAB REGISTRY
  // ==========================================
  loadDoctorsList: function() {
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const depts = window.HMS_DB.getAll(window.HMS_DB.KEYS.DEPARTMENTS);
    const filterDept = document.getElementById('doctor-dept-filter').value;
    const tbody = document.getElementById('doctors-table-body');

    let filtered = doctors;
    if (filterDept) {
      filtered = doctors.filter(d => d.department_id === filterDept);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No doctors registered in this department.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(d => {
      const dept = depts.find(deptObj => deptObj.id === d.department_id);
      return `
        <tr>
          <td>
            <strong><a href="#/doctors?id=${d.id}">${d.name}</a></strong>
            <div class="doctor-rating"><i class="fa-solid fa-star"></i> ${d.rating.toFixed(1)}</div>
          </td>
          <td>${dept ? dept.name : 'Unknown Department'}</td>
          <td>${d.specialization}</td>
          <td>${d.qualification}</td>
          <td><strong>$${d.consultation_fee.toFixed(2)}</strong></td>
          <td><span class="current-time-display">${d.available_days.join(', ')}</span></td>
          <td>
            <div class="demo-login-tags" style="gap: 4px;">
              <a href="#/doctors?id=${d.id}" class="btn btn-secondary btn-sm" title="Profile"><i class="fa-solid fa-eye"></i></a>
              <button class="btn btn-outline btn-sm" onclick="window.HMS_DOCTORS.openDoctorModal('${d.id}')" title="Edit"><i class="fa-solid fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="window.HMS_DOCTORS.deleteDoctorPrompt('${d.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openDoctorModal: function(doctorId = null) {
    const doctor = doctorId ? window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, doctorId) : null;
    const depts = window.HMS_DB.getAll(window.HMS_DB.KEYS.DEPARTMENTS);
    
    let modalOverlay = document.getElementById('doctor-editor-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'doctor-editor-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    modalOverlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>${doctor ? 'Edit Doctor Details' : 'Add New Doctor Profile'}</h3>
          <button class="modal-close" onclick="document.getElementById('doctor-editor-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="doc-form" novalidate>
            <input type="hidden" id="edit-doc-id" value="${doctor ? doctor.id : ''}">
            
            <div class="form-grid">
              <div class="form-group">
                <label for="edit-doc-name">Doctor Full Name</label>
                <input type="text" id="edit-doc-name" value="${doctor ? doctor.name : ''}" required>
                <div class="error-msg" id="edit-doc-name-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-doc-dept">Department</label>
                <select id="edit-doc-dept" required>
                  <option value="">Select Department</option>
                  ${depts.map(dp => `<option value="${dp.id}" ${doctor && doctor.department_id === dp.id ? 'selected' : ''}>${dp.name}</option>`).join('')}
                </select>
                <div class="error-msg" id="edit-doc-dept-err"></div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="edit-doc-spec">Specialization Field</label>
                <input type="text" id="edit-doc-spec" placeholder="Cardiologist, Neurosurgeon..." value="${doctor ? doctor.specialization : ''}" required>
                <div class="error-msg" id="edit-doc-spec-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-doc-qual">Qualifications</label>
                <input type="text" id="edit-doc-qual" placeholder="MD, DM (Cardiology)" value="${doctor ? doctor.qualification : ''}" required>
                <div class="error-msg" id="edit-doc-qual-err"></div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="edit-doc-exp">Years of Experience</label>
                <input type="number" id="edit-doc-exp" min="0" value="${doctor ? doctor.experience : ''}" required>
                <div class="error-msg" id="edit-doc-exp-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-doc-fee">Consultation Fee ($)</label>
                <input type="number" id="edit-doc-fee" min="0" value="${doctor ? doctor.consultation_fee : ''}" required>
                <div class="error-msg" id="edit-doc-fee-err"></div>
              </div>
            </div>

            <div class="form-group">
              <label>Availability Schedule Days</label>
              <div class="demo-login-tags" style="gap: 8px; margin-top: 8px;">
                ${weekdays.map(day => {
                  const isChecked = doctor && doctor.available_days.includes(day);
                  return `
                    <label class="demo-tag" style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" name="available_days" value="${day}" ${isChecked ? 'checked' : ''}>
                      <span>${day}</span>
                    </label>
                  `;
                }).join('')}
              </div>
              <div class="error-msg" id="edit-doc-days-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('doctor-editor-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_DOCTORS.saveDoctorForm()">Save Doctor Profile</button>
        </div>
      </div>
    `;
  },

  saveDoctorForm: function() {
    const fields = ['edit-doc-name', 'edit-doc-dept', 'edit-doc-spec', 'edit-doc-qual', 'edit-doc-exp', 'edit-doc-fee'];
    let hasError = false;

    fields.forEach(f => {
      document.getElementById(`${f}-err`).innerText = '';
      document.getElementById(f).classList.remove('error');
    });
    document.getElementById('edit-doc-days-err').innerText = '';

    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      const val = el.value.trim();
      if (!val) {
        document.getElementById(`${f}-err`).innerText = `${el.previousElementSibling.innerText} is required`;
        el.classList.add('error');
        hasError = true;
      } else {
        data[f.replace('edit-doc-', '')] = val;
      }
    });

    // Checkbox validation
    const checkedDays = Array.from(document.querySelectorAll('input[name="available_days"]:checked')).map(cb => cb.value);
    if (checkedDays.length === 0) {
      document.getElementById('edit-doc-days-err').innerText = 'Please select at least one availability day';
      hasError = true;
    } else {
      data.available_days = checkedDays;
    }

    if (hasError) return;

    const id = document.getElementById('edit-doc-id').value;

    if (id) {
      // Update
      window.HMS_DB.update(window.HMS_DB.KEYS.DOCTORS, id, {
        name: data.name,
        department_id: data.dept,
        specialization: data.spec,
        qualification: data.qual,
        experience: parseInt(data.exp),
        consultation_fee: parseFloat(data.fee),
        available_days: data.available_days
      });
      window.HMS_APP.toast('Doctor Updated', `Profile of ${data.name} saved.`, 'success');
    } else {
      // Create new
      const inserted = window.HMS_DB.insert(window.HMS_DB.KEYS.DOCTORS, {
        name: data.name,
        department_id: data.dept,
        specialization: data.spec,
        qualification: data.qual,
        experience: parseInt(data.exp),
        consultation_fee: parseFloat(data.fee),
        available_days: data.available_days,
        status: 'Active',
        rating: 5.0
      });

      // Create linked user login account
      const username = data.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      window.HMS_DB.insert(window.HMS_DB.KEYS.USERS, {
        username: username,
        password: 'password',
        role: 'Doctor',
        name: data.name,
        entityId: inserted.id
      });
      
      window.HMS_APP.toast('Doctor Registered', `${data.name} has been added. Username: ${username}`, 'success');
    }

    document.getElementById('doctor-editor-modal').remove();
    this.loadDoctorsList();
  },

  deleteDoctorPrompt: function(id) {
    const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, id);
    if (!doc) return;

    if (window.HMS_DB.isReferenced(window.HMS_DB.KEYS.DOCTORS, id)) {
      window.HMS_APP.toast('Cannot Delete Doctor', 'This doctor has active upcoming appointments or scheduled surgeries.', 'danger');
      return;
    }

    window.HMS_APP.confirm(
      'Remove Doctor Profile',
      `Are you sure you want to permanently delete the profile of ${doc.name}?`,
      (confirmed) => {
        if (confirmed) {
          window.HMS_DB.delete(window.HMS_DB.KEYS.DOCTORS, id);
          
          // Delete from users if linked
          const users = window.HMS_DB.getAll(window.HMS_DB.KEYS.USERS);
          const u = users.find(usr => usr.entityId === id);
          if (u) {
            window.HMS_DB.delete(window.HMS_DB.KEYS.USERS, u.id);
          }

          window.HMS_APP.toast('Doctor Removed', 'Profile successfully deleted.', 'success');
          this.loadDoctorsList();
        }
      }
    );
  },

  // ==========================================
  // DEPARTMENTS SUB-TAB
  // ==========================================
  loadDepartmentsList: function() {
    const depts = window.HMS_DB.getAll(window.HMS_DB.KEYS.DEPARTMENTS);
    const tbody = document.getElementById('departments-table-body');

    if (depts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No departments configured.</td></tr>`;
      return;
    }

    tbody.innerHTML = depts.map((d, index) => `
      <tr>
        <td><strong>#${index + 1}</strong></td>
        <td><strong>${d.name}</strong></td>
        <td>${d.description}</td>
        <td>
          <div class="demo-login-tags" style="gap:4px;">
            <button class="btn btn-outline btn-sm" onclick="window.HMS_DOCTORS.openDeptModal('${d.id}')" title="Edit"><i class="fa-solid fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="window.HMS_DOCTORS.deleteDeptPrompt('${d.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openDeptModal: function(deptId = null) {
    const dept = deptId ? window.HMS_DB.getById(window.HMS_DB.KEYS.DEPARTMENTS, deptId) : null;

    let modalOverlay = document.getElementById('dept-editor-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'dept-editor-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${dept ? 'Edit Department' : 'Create Department'}</h3>
          <button class="modal-close" onclick="document.getElementById('dept-editor-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="dept-form" novalidate>
            <input type="hidden" id="edit-dept-id" value="${dept ? dept.id : ''}">
            <div class="form-group">
              <label for="edit-dept-name">Department Title</label>
              <input type="text" id="edit-dept-name" value="${dept ? dept.name : ''}" required>
              <div class="error-msg" id="edit-dept-name-err"></div>
            </div>
            <div class="form-group">
              <label for="edit-dept-desc">Description</label>
              <textarea id="edit-dept-desc" rows="3" required>${dept ? dept.description : ''}</textarea>
              <div class="error-msg" id="edit-dept-desc-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('dept-editor-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_DOCTORS.saveDeptForm()">Save Department</button>
        </div>
      </div>
    `;
  },

  saveDeptForm: function() {
    const nameEl = document.getElementById('edit-dept-name');
    const descEl = document.getElementById('edit-dept-desc');
    const name = nameEl.value.trim();
    const desc = descEl.value.trim();

    let hasError = false;
    document.getElementById('edit-dept-name-err').innerText = '';
    document.getElementById('edit-dept-desc-err').innerText = '';
    nameEl.classList.remove('error');
    descEl.classList.remove('error');

    if (!name) {
      document.getElementById('edit-dept-name-err').innerText = 'Department Name is required';
      nameEl.classList.add('error');
      hasError = true;
    }
    if (!desc) {
      document.getElementById('edit-dept-desc-err').innerText = 'Description is required';
      descEl.classList.add('error');
      hasError = true;
    }

    if (hasError) return;

    const id = document.getElementById('edit-dept-id').value;

    if (id) {
      window.HMS_DB.update(window.HMS_DB.KEYS.DEPARTMENTS, id, { name, description: desc });
      window.HMS_APP.toast('Department Updated', 'Saved successfully.', 'success');
    } else {
      window.HMS_DB.insert(window.HMS_DB.KEYS.DEPARTMENTS, { name, description: desc });
      window.HMS_APP.toast('Department Created', 'Created successfully.', 'success');
    }

    document.getElementById('dept-editor-modal').remove();
    this.renderAdminConsole(document.getElementById('view-outlet'));
    // Restore active tab
    document.getElementById('tab-btn-depts').click();
  },

  deleteDeptPrompt: function(id) {
    const dept = window.HMS_DB.getById(window.HMS_DB.KEYS.DEPARTMENTS, id);
    if (!dept) return;

    // Check if any doctors belong to this department
    if (window.HMS_DB.isReferenced(window.HMS_DB.KEYS.DEPARTMENTS, id)) {
      window.HMS_APP.toast('Cannot Delete Department', 'There are doctors assigned to this department. Reassign them first.', 'danger');
      return;
    }

    window.HMS_APP.confirm(
      'Remove Department',
      `Are you sure you want to delete the department "${dept.name}"?`,
      (confirmed) => {
        if (confirmed) {
          window.HMS_DB.delete(window.HMS_DB.KEYS.DEPARTMENTS, id);
          window.HMS_APP.toast('Department Deleted', 'Successfully removed.', 'success');
          
          this.renderAdminConsole(document.getElementById('view-outlet'));
          document.getElementById('tab-btn-depts').click();
        }
      }
    );
  },

  // ==========================================
  // STAFF SUB-TAB
  // ==========================================
  loadStaffList: function() {
    const staff = window.HMS_DB.getAll(window.HMS_DB.KEYS.STAFF);
    const filterRole = document.getElementById('staff-role-filter').value;
    const tbody = document.getElementById('staff-table-body');

    let filtered = staff;
    if (filterRole) {
      filtered = staff.filter(s => s.role === filterRole);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No support staff found matching selection.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td><strong>${s.id.toUpperCase()}</strong></td>
        <td><strong>${s.name}</strong></td>
        <td><span class="badge badge-info">${s.role}</span></td>
        <td>${s.phone} | ${s.email}</td>
        <td><span class="badge badge-success">${s.status}</span></td>
        <td>
          <div class="demo-login-tags" style="gap:4px;">
            <button class="btn btn-outline btn-sm" onclick="window.HMS_DOCTORS.openStaffModal('${s.id}')" title="Edit"><i class="fa-solid fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="window.HMS_DOCTORS.deleteStaffPrompt('${s.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openStaffModal: function(staffId = null) {
    const s = staffId ? window.HMS_DB.getById(window.HMS_DB.KEYS.STAFF, staffId) : null;

    let modalOverlay = document.getElementById('staff-editor-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'staff-editor-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${s ? 'Edit Staff Profile' : 'Add Staff Member'}</h3>
          <button class="modal-close" onclick="document.getElementById('staff-editor-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="staff-form" novalidate>
            <input type="hidden" id="edit-staff-id" value="${s ? s.id : ''}">
            <div class="form-group">
              <label for="edit-staff-name">Staff Name</label>
              <input type="text" id="edit-staff-name" value="${s ? s.name : ''}" required>
              <div class="error-msg" id="edit-staff-name-err"></div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="edit-staff-role">Role</label>
                <select id="edit-staff-role" required>
                  <option value="">Select Role</option>
                  <option value="Nurse" ${s && s.role === 'Nurse' ? 'selected' : ''}>Nurse</option>
                  <option value="Receptionist" ${s && s.role === 'Receptionist' ? 'selected' : ''}>Receptionist</option>
                  <option value="Pharmacist" ${s && s.role === 'Pharmacist' ? 'selected' : ''}>Pharmacist</option>
                  <option value="Lab Technician" ${s && s.role === 'Lab Technician' ? 'selected' : ''}>Lab Technician</option>
                </select>
                <div class="error-msg" id="edit-staff-role-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-staff-phone">Phone</label>
                <input type="tel" id="edit-staff-phone" value="${s ? s.phone : ''}" required>
                <div class="error-msg" id="edit-staff-phone-err"></div>
              </div>
            </div>
            <div class="form-group">
              <label for="edit-staff-email">Email</label>
              <input type="email" id="edit-staff-email" value="${s ? s.email : ''}" required>
              <div class="error-msg" id="edit-staff-email-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('staff-editor-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_DOCTORS.saveStaffForm()">Save Staff</button>
        </div>
      </div>
    `;
  },

  saveStaffForm: function() {
    const fields = ['edit-staff-name', 'edit-staff-role', 'edit-staff-phone', 'edit-staff-email'];
    let hasError = false;

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
        data[f.replace('edit-staff-', '')] = val;
      }
    });

    // Validations
    if (!hasError) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(data.phone)) {
        document.getElementById('edit-staff-phone-err').innerText = 'Phone must be exactly 10 digits';
        document.getElementById('edit-staff-phone').classList.add('error');
        hasError = true;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        document.getElementById('edit-staff-email-err').innerText = 'Enter a valid email';
        document.getElementById('edit-staff-email').classList.add('error');
        hasError = true;
      }
    }

    if (hasError) return;

    const id = document.getElementById('edit-staff-id').value;

    if (id) {
      // Update
      window.HMS_DB.update(window.HMS_DB.KEYS.STAFF, id, {
        name: data.name,
        role: data.role,
        phone: data.phone,
        email: data.email
      });
      window.HMS_APP.toast('Staff Details Saved', `${data.name} saved.`, 'success');
    } else {
      // Insert
      const inserted = window.HMS_DB.insert(window.HMS_DB.KEYS.STAFF, {
        name: data.name,
        role: data.role,
        phone: data.phone,
        email: data.email,
        status: 'Active'
      });

      // Create user login credential
      const username = data.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      window.HMS_DB.insert(window.HMS_DB.KEYS.USERS, {
        username: username,
        password: 'password',
        role: data.role,
        name: data.name,
        entityId: inserted.id
      });
      
      window.HMS_APP.toast('Staff Created', `Username created: ${username}`, 'success');
    }

    document.getElementById('staff-editor-modal').remove();
    this.renderAdminConsole(document.getElementById('view-outlet'));
    document.getElementById('tab-btn-staff').click();
  },

  deleteStaffPrompt: function(id) {
    const s = window.HMS_DB.getById(window.HMS_DB.KEYS.STAFF, id);
    if (!s) return;

    window.HMS_APP.confirm(
      'Remove Staff Record',
      `Are you sure you want to delete staff member ${s.name}?`,
      (confirmed) => {
        if (confirmed) {
          window.HMS_DB.delete(window.HMS_DB.KEYS.STAFF, id);
          
          // Delete from users if linked
          const users = window.HMS_DB.getAll(window.HMS_DB.KEYS.USERS);
          const u = users.find(usr => usr.entityId === id);
          if (u) {
            window.HMS_DB.delete(window.HMS_DB.KEYS.USERS, u.id);
          }

          window.HMS_APP.toast('Staff Removed', 'Successfully deleted.', 'success');
          this.renderAdminConsole(document.getElementById('view-outlet'));
          document.getElementById('tab-btn-staff').click();
        }
      }
    );
  },

  // ==========================================
  // DOCTOR PROFILE DISPLAY
  // ==========================================
  renderDoctorProfile: function(container, id) {
    const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, id);
    const depts = window.HMS_DB.getAll(window.HMS_DB.KEYS.DEPARTMENTS);
    const appointments = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);

    if (!doc) {
      container.innerHTML = `<h2>Doctor Profile Not Found</h2>`;
      return;
    }

    const dept = depts.find(dp => dp.id === doc.department_id);

    // Calc treated patients count (Unique patients in Completed appointments)
    const docAppts = appointments.filter(a => a.doctor_id === id);
    const completedAppts = docAppts.filter(a => a.status === 'Completed');
    const uniquePatientIds = new Set(completedAppts.map(a => a.patient_id));

    container.innerHTML = `
      <div class="profile-banner">
        <div class="profile-large-avatar" style="background-color: var(--secondary-light); color: var(--secondary);">${doc.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
        <div class="profile-header-details">
          <h2>${doc.name}</h2>
          <p class="text-muted">${doc.qualification} | ${doc.specialization} (${doc.experience} years experience)</p>
          <div class="profile-header-meta">
            <span class="profile-meta-tag"><i class="fa-solid fa-clinic-medical"></i> Department: ${dept ? dept.name : 'Unknown'}</span>
            <span class="profile-meta-tag"><i class="fa-solid fa-wallet"></i> Consultation Fee: $${doc.consultation_fee.toFixed(2)}</span>
            <span class="profile-meta-tag"><i class="fa-solid fa-star"></i> Rating: ${doc.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div class="dashboard-split-grid">
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;">Statistics Overview</h3>
          <div class="stats-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="stat-card">
              <div class="stat-icon success"><i class="fa-solid fa-user-check"></i></div>
              <div class="stat-info">
                <span class="stat-label">Patients Treated</span>
                <span class="stat-value">${uniquePatientIds.size}</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon primary"><i class="fa-solid fa-calendar-check"></i></div>
              <div class="stat-info">
                <span class="stat-label">Total Appointments</span>
                <span class="stat-value">${docAppts.length}</span>
              </div>
            </div>
          </div>

          <h3 class="card-title" style="margin-top: 24px; margin-bottom: 12px;">Weekly Schedule</h3>
          <p class="text-muted">Available for consultations on:</p>
          <div class="demo-login-tags" style="gap: 8px; margin-top: 8px;">
            ${doc.available_days.map(d => `<span class="current-time-display"><strong>${d}</strong></span>`).join('')}
          </div>
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;">Recent Appointments Queue</h3>
          ${docAppts.length === 0 ? `
            <p class="text-muted">No appointments booked for this doctor.</p>
          ` : `
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date / Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${docAppts.slice(-6).map(a => {
                    const pat = patients.find(p => p.id === a.patient_id);
                    let badge = 'badge-info';
                    if (a.status === 'Confirmed') badge = 'badge-success';
                    else if (a.status === 'Completed') badge = 'badge-gray';
                    else if (a.status === 'Cancelled') badge = 'badge-danger';
                    else if (a.status === 'No-Show') badge = 'badge-warning';

                    return `
                      <tr>
                        <td><strong>${pat ? pat.name : 'Unknown'}</strong></td>
                        <td>${a.date} | ${a.time_slot}</td>
                        <td><span class="badge ${badge}">${a.status}</span></td>
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
  }
};
