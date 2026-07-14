/**
 * staff.js - Employee Profiles Manager (Custom roles & branches updated)
 */

const StaffModule = {
  init() {
    window.addEventListener("render-section:staff", () => this.renderStaffTable());

    document.getElementById("btn-add-staff-modal").addEventListener("click", () => {
      this.showStaffModal();
    });
  },

  // Renders the summary listing table
  renderStaffTable() {
    app.enforcePermission("staff");

    const tableBody = document.querySelector("#staff-directory-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const staff = db.get("staff").filter(s => currentBranch === "all" || s.branchId === currentBranch);
    const branches = db.get("branches");
    const roles = db.get("roles");

    if (staff.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-muted); padding:2rem;">No staff profiles defined.</td></tr>`;
      return;
    }

    const hasFullAccess = app.checkPermission("staff", "full");

    staff.forEach(member => {
      const isSelf = app.currentUser && app.currentUser.id === member.id;
      
      // Get role name to display
      const roleData = roles.find(r => r.id === member.role);
      const roleLabel = roleData ? roleData.name : member.role;

      // Get branch name
      const branchData = branches.find(b => b.id === member.branchId);
      const branchBadge = branchData ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branchData.name}]</span>` : '';

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600;">
          ${member.name} ${isSelf ? '<span style="font-size:0.75rem; color:var(--color-primary);">(You)</span>' : ''}
          ${branchBadge}
        </td>
        <td style="text-transform:uppercase; font-size:0.85rem; font-weight:700;">${roleLabel}</td>
        <td>${member.phone}</td>
        <td>${member.email}</td>
        <td>${member.joinDate}</td>
        <td>
          <label class="form-check" style="justify-content:center;">
            <input type="checkbox" class="toggle-staff-active" data-id="${member.id}" ${member.isActive ? 'checked' : ''} ${isSelf || !hasFullAccess ? 'disabled' : ''}>
          </label>
        </td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm btn-edit" ${!hasFullAccess ? 'disabled' : ''}>Edit</button>
            <button class="btn btn-danger btn-sm btn-delete" ${isSelf || !hasFullAccess ? 'disabled' : ''}>Delete</button>
          </div>
        </td>
      `;

      // Active state toggle
      if (hasFullAccess && !isSelf) {
        tr.querySelector(".toggle-staff-active").addEventListener("change", (e) => {
          const isChecked = e.target.checked;
          db.update("staff", member.id, { isActive: isChecked });
          app.showToast(`Updated active status for ${member.name}`, "info");
        });

        tr.querySelector(".btn-edit").addEventListener("click", () => this.showStaffModal(member.id));
        tr.querySelector(".btn-delete").addEventListener("click", () => this.deleteStaffProfile(member.id));
      }

      tableBody.appendChild(tr);
    });
  },

  deleteStaffProfile(id) {
    const member = db.get("staff").find(s => s.id === id);
    if (!member) return;

    if (confirm(`Are you sure you want to permanently delete profile for "${member.name}"?`)) {
      db.delete("staff", id);
      app.showToast(`Deleted staff profile for ${member.name}`, "danger");
      this.renderStaffTable();
    }
  },

  // Modal dialog to add/edit profiles
  showStaffModal(staffId = null) {
    const isEdit = !!staffId;
    const staff = db.get("staff");
    const member = isEdit ? staff.find(s => s.id === staffId) : null;

    const roles = db.get("roles");
    const branches = db.get("branches").filter(b => b.isActive);
    const currentBranch = db.getCurrentBranch();

    const modalHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Employee Profile' : 'Add New Staff Member'}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="staff-form">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="stf-name" class="form-control" required placeholder="e.g. Rahul Sharma" value="${isEdit ? member.name : ''}">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">System Role</label>
              <select id="stf-role" class="form-control" required>
                ${roles.map(r => `<option value="${r.id}" ${isEdit && member.role === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Primary Branch Location</label>
              <select id="stf-branch" class="form-control" required>
                ${branches.map(b => `<option value="${b.id}" ${isEdit && member.branchId === b.id ? 'selected' : (currentBranch === b.id ? 'selected' : '')}>${b.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input type="text" id="stf-phone" class="form-control" required placeholder="9999900001" value="${isEdit ? member.phone : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="stf-email" class="form-control" required placeholder="name@restaurant.com" value="${isEdit ? member.email : ''}">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Joining Date</label>
              <input type="date" id="stf-join" class="form-control" required value="${isEdit ? member.joinDate : new Date().toISOString().slice(0, 10)}">
            </div>
            <div class="form-group" style="display:flex; align-items:flex-end; padding-bottom: 0.5rem;">
              <label class="form-check">
                <input type="checkbox" id="stf-active" ${isEdit ? (member.isActive ? 'checked' : '') : 'checked'}> Active Profile
              </label>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-save-staff">Save Profile</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-save-staff").addEventListener("click", () => {
      const name = document.getElementById("stf-name").value.trim();
      const role = document.getElementById("stf-role").value;
      const branchId = document.getElementById("stf-branch").value;
      const phone = document.getElementById("stf-phone").value.trim();
      const email = document.getElementById("stf-email").value.trim();
      const joinDate = document.getElementById("stf-join").value;
      const isActive = document.getElementById("stf-active").checked;

      if (!name || !phone || !email || !joinDate || !branchId) {
        app.showToast("Please fill all required profile fields.", "warning");
        return;
      }

      const payload = { name, role, branchId, phone, email, joinDate, isActive };

      if (isEdit) {
        db.update("staff", member.id, payload);
        app.showToast(`Updated profile for ${name}`, "success");
      } else {
        db.insert("staff", payload);
        app.showToast(`Added ${name} to staff directory!`, "success");
      }

      app.closeModal();
      this.renderStaffTable();
    });
  }
};

StaffModule.init();
