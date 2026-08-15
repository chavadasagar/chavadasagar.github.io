/**
 * staff.js - HR and Staff directory management (Employees, Departments, Shift rosters)
 */

const staffController = {
  selectedDeptId: 'All',

  render(container) {
    const user = window.auth.getCurrentUser();
    const canWrite = user.role === 'Admin' || user.role === 'Manager';

    container.innerHTML = `
      <div class="staff-header animate-fade-in">
        <h2>Hotel Staff Directory</h2>
        ${canWrite ? `<button class="btn btn-primary" id="btn-add-employee"><span class="icon">➕</span> Add Employee</button>` : ''}
      </div>

      <!-- Actions/Filters -->
      <div class="list-actions card animate-fade-in">
        <div class="search-box-wrapper">
          <input type="text" id="filter-staff-search" placeholder="Search staff name or role...">
        </div>
        <div class="filter-group">
          <label>Department:</label>
          <select id="filter-staff-dept">
            <option value="All">All Departments</option>
          </select>
        </div>
      </div>

      <div class="table-responsive card animate-fade-in">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Role</th>
              <th>Shift</th>
              <th>Contact Info</th>
              <th>Status</th>
              ${canWrite ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody id="staff-tbody"></tbody>
        </table>
      </div>

      <!-- Employee Create/Edit Modal -->
      <div id="employee-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="employee-modal-title">Add Employee</h3>
            <button class="modal-close-btn" id="btn-close-emp-modal">&times;</button>
          </div>
          <form id="employee-form">
            <input type="hidden" id="emp-id-field">
            <div class="modal-body">
              <div class="form-group">
                <label for="emp-name-field">Full Name*</label>
                <input type="text" id="emp-name-field" required placeholder="Employee name">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="emp-dept-field">Department*</label>
                  <select id="emp-dept-field" required></select>
                </div>
                <div class="form-group">
                  <label for="emp-role-field">Role Title*</label>
                  <input type="text" id="emp-role-field" required placeholder="e.g. receptionist">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="emp-shift-field">Work Shift*</label>
                  <select id="emp-shift-field" required>
                    <option value="Morning">Morning (07:00 AM - 03:00 PM)</option>
                    <option value="Evening">Evening (03:00 PM - 11:00 PM)</option>
                    <option value="Night">Night (11:00 PM - 07:00 AM)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="emp-status-field">Status*</label>
                  <select id="emp-status-field" required>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="emp-phone-field">Phone Number</label>
                  <input type="text" id="emp-phone-field" placeholder="Contact number">
                </div>
                <div class="form-group">
                  <label for="emp-email-field">Email ID</label>
                  <input type="email" id="emp-email-field" placeholder="Email address">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-emp-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Employee</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Populate Department dropdowns
    const depts = window.db.getAll('departments');
    const filterDept = document.getElementById('filter-staff-dept');
    const formDept = document.getElementById('emp-dept-field');

    filterDept.innerHTML = '<option value="All">All Departments</option>' + 
      depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    
    formDept.innerHTML = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    // Bind triggers
    if (canWrite) {
      document.getElementById('btn-add-employee').addEventListener('click', () => this.openEmployeeModal());
    }
    document.getElementById('btn-close-emp-modal').addEventListener('click', () => this.closeEmployeeModal());
    document.getElementById('btn-cancel-emp-modal').addEventListener('click', () => this.closeEmployeeModal());
    document.getElementById('employee-form').addEventListener('submit', (e) => this.handleSaveEmployee(e));

    const tbody = document.getElementById('staff-tbody');
    const searchInput = document.getElementById('filter-staff-search');
    const deptSelect = document.getElementById('filter-staff-dept');

    const updateDisplay = () => {
      const employees = window.db.getAll('employees');
      const query = searchInput.value.toLowerCase().trim();
      const selectedDept = deptSelect.value;

      const filtered = employees.filter(emp => {
        const matchSearch = emp.name.toLowerCase().includes(query) || 
                            emp.role.toLowerCase().includes(query);
        const matchDept = selectedDept === 'All' || emp.departmentId === selectedDept;
        return matchSearch && matchDept;
      });

      tbody.innerHTML = filtered.map(emp => {
        const deptObj = depts.find(d => d.id === emp.departmentId) || { name: 'Unassigned' };
        
        return `
          <tr>
            <td><strong>${emp.name}</strong></td>
            <td>${deptObj.name}</td>
            <td>${emp.role}</td>
            <td>${emp.shift}</td>
            <td>
              <span>📞 ${emp.phone || '-'}</span><br>
              <span style="font-size:11px; color:var(--text-muted);">📧 ${emp.email || '-'}</span>
            </td>
            <td><span class="badge ${emp.status === 'Active' ? 'badge-success' : 'badge-danger'}">${emp.status}</span></td>
            ${canWrite ? `
              <td>
                <button class="btn btn-xs btn-outline btn-edit-emp" data-id="${emp.id}">Edit</button>
                <button class="btn btn-xs btn-danger btn-delete-emp" data-id="${emp.id}">Delete</button>
              </td>
            ` : ''}
          </tr>
        `;
      }).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${canWrite ? 7 : 6}" class="text-center text-muted">No employees found.</td></tr>`;
      }

      if (canWrite) {
        tbody.querySelectorAll('.btn-edit-emp').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.openEmployeeModal(e.currentTarget.getAttribute('data-id'));
          });
        });

        tbody.querySelectorAll('.btn-delete-emp').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.handleDeleteEmployee(e.currentTarget.getAttribute('data-id'));
          });
        });
      }
    };

    searchInput.addEventListener('input', updateDisplay);
    deptSelect.addEventListener('change', updateDisplay);

    updateDisplay();
  },

  openEmployeeModal(empId = null) {
    const form = document.getElementById('employee-form');
    form.reset();

    if (empId) {
      const emp = window.db.getById('employees', empId);
      if (!emp) return;

      document.getElementById('employee-modal-title').innerText = "Edit Employee Details";
      document.getElementById('emp-id-field').value = emp.id;
      document.getElementById('emp-name-field').value = emp.name;
      document.getElementById('emp-dept-field').value = emp.departmentId;
      document.getElementById('emp-role-field').value = emp.role;
      document.getElementById('emp-shift-field').value = emp.shift;
      document.getElementById('emp-status-field').value = emp.status;
      document.getElementById('emp-phone-field').value = emp.phone || '';
      document.getElementById('emp-email-field').value = emp.email || '';
    } else {
      document.getElementById('employee-modal-title').innerText = "Add New Employee";
      document.getElementById('emp-id-field').value = '';
    }

    document.getElementById('employee-modal').style.display = 'flex';
  },

  closeEmployeeModal() {
    document.getElementById('employee-modal').style.display = 'none';
  },

  handleSaveEmployee(e) {
    e.preventDefault();

    const id = document.getElementById('emp-id-field').value;
    const name = document.getElementById('emp-name-field').value.trim();
    const departmentId = document.getElementById('emp-dept-field').value;
    const role = document.getElementById('emp-role-field').value.trim();
    const shift = document.getElementById('emp-shift-field').value;
    const status = document.getElementById('emp-status-field').value;
    const phone = document.getElementById('emp-phone-field').value.trim();
    const email = document.getElementById('emp-email-field').value.trim();

    if (!name || !role) {
      window.utils.showToast("Please enter employee name and role.", "error");
      return;
    }

    const payload = { name, departmentId, role, shift, status, phone, email };

    if (id) {
      window.db.update('employees', id, payload);
      window.utils.showToast("Employee details updated successfully.");
    } else {
      window.db.create('employees', payload);
      window.utils.showToast("Employee added successfully.");
    }

    this.closeEmployeeModal();
    this.render(document.getElementById('app-content'));
  },

  handleDeleteEmployee(empId) {
    const emp = window.db.getById('employees', empId);
    if (!emp) return;

    window.utils.confirm(
      "Remove Employee",
      `Are you sure you want to delete the record for ${emp.name}? This will remove them from the staff roster.`,
      () => {
        window.db.delete('employees', empId);
        window.utils.showToast("Employee record deleted.");
        this.render(document.getElementById('app-content'));
      }
    );
  }
};

window.staffController = staffController;
