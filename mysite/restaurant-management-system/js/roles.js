/**
 * roles.js - Dynamic Role & Permissions Configurations Manager
 */

const RolesModule = {
  // Modules list defining the permission checklist matrix row mappings
  modulesList: [
    { key: "dashboard", label: "Dashboard (Home)" },
    { key: "tables", label: "Tables Management" },
    { key: "orders", label: "Order Management" },
    { key: "kitchen", label: "Kitchen Board (KOT)" },
    { key: "billing", label: "Billing & Payments" },
    { key: "menu", label: "Menu Management" },
    { key: "reservations", label: "Reservations Diary" },
    { key: "customers", label: "Customers CRM" },
    { key: "inventory", label: "Inventory & Recipes" },
    { key: "staff", label: "Staff Management" },
    { key: "coupons", label: "Coupons & Discounts" },
    { key: "delivery", label: "Delivery Tracking" },
    { key: "reviews", label: "Reviews & Ratings" },
    { key: "reports", label: "Reports & Analytics" },
    { key: "settings", label: "Settings" },
    { key: "roles", label: "Roles & Permissions" },
    { key: "branches", label: "Branch Management" }
  ],

  init() {
    window.addEventListener("render-section:roles", () => this.renderRolesList());

    document.getElementById("btn-add-role-modal").addEventListener("click", () => {
      this.showRoleModal();
    });
  },

  // Renders roles listing table
  renderRolesList() {
    const tableBody = document.querySelector("#roles-list-table tbody");
    tableBody.innerHTML = "";

    const roles = db.get("roles");
    const staff = db.get("staff");

    roles.forEach(role => {
      // Create a clean summary string of permissions (e.g. "orders: full, menu: view")
      const summaryKeys = Object.keys(role.permissions)
        .filter(k => role.permissions[k] !== "none")
        .map(k => `${k}(${role.permissions[k]})`);
      
      const summaryStr = summaryKeys.length > 0 
        ? summaryKeys.join(", ") 
        : '<span style="color:var(--text-muted);">No module access configured</span>';

      // Count staff assigned to this role
      const staffCount = staff.filter(s => s.role === role.id).length;

      const isSystemAdmin = role.id === "role_admin";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600;">
          ${role.name}
          <div style="font-size:0.75rem; color:var(--text-muted);">${staffCount} staff profile(s) assigned</div>
        </td>
        <td style="font-size:0.8rem; color:var(--text-secondary); max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${summaryStr}">
          ${summaryStr}
        </td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm btn-edit">Edit Perms</button>
            <button class="btn btn-danger btn-sm btn-delete" ${isSystemAdmin ? 'disabled' : ''}>Delete</button>
          </div>
        </td>
      `;

      tr.querySelector(".btn-edit").addEventListener("click", () => this.showRoleModal(role.id));
      
      const deleteBtn = tr.querySelector(".btn-delete");
      if (deleteBtn && !isSystemAdmin) {
        deleteBtn.addEventListener("click", () => this.deleteRole(role.id, staffCount));
      }

      tableBody.appendChild(tr);
    });
  },

  // Delete checking for lockouts
  deleteRole(id, staffCount) {
    if (staffCount > 0) {
      app.showToast(`Cannot delete! ${staffCount} staff members are currently assigned to this role.`, "warning");
      return;
    }

    const roles = db.get("roles");
    const role = roles.find(r => r.id === id);
    if (!role) return;

    // Safety check: ensure there remains at least one role with full branch/role capabilities
    const admins = roles.filter(r => r.permissions.roles === "full" && r.permissions.settings === "full" && r.id !== id);
    if (admins.length === 0) {
      app.showToast("Cannot delete: This role is the last one with administrative access permissions.", "warning");
      return;
    }

    if (confirm(`Are you sure you want to permanently delete custom role "${role.name}"?`)) {
      db.delete("roles", id);
      app.showToast(`Removed custom role: ${role.name}`, "danger");
      this.renderRolesList();
    }
  },

  // Modal dialog presenting modular permission radio controls
  showRoleModal(roleId = null) {
    const isEdit = !!roleId;
    const roles = db.get("roles");
    const role = isEdit ? roles.find(r => r.id === roleId) : null;
    const isSystemAdmin = isEdit && role.id === "role_admin";

    // Generate checklist layout
    const matrixRows = this.modulesList.map(mod => {
      const activeVal = isEdit ? (role.permissions[mod.key] || "none") : "none";
      
      return `
        <tr class="perm-matrix-row" data-module="${mod.key}">
          <td style="font-weight:600; font-size:0.9rem;">${mod.label}</td>
          <td style="text-align:center;">
            <input type="radio" name="perm-${mod.key}" value="none" ${activeVal === 'none' ? 'checked' : ''} ${isSystemAdmin ? 'disabled' : ''}>
          </td>
          <td style="text-align:center;">
            <input type="radio" name="perm-${mod.key}" value="view" ${activeVal === 'view' ? 'checked' : ''} ${isSystemAdmin ? 'disabled' : ''}>
          </td>
          <td style="text-align:center;">
            <input type="radio" name="perm-${mod.key}" value="full" ${activeVal === 'full' ? 'checked' : ''} ${isSystemAdmin ? 'disabled' : ''}>
          </td>
        </tr>
      `;
    }).join('');

    const modalHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'Configure Role Details' : 'Create Custom Role'}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body modal-lg">
        <form id="role-crud-form">
          <div class="form-group">
            <label class="form-label">Role Title / Designation</label>
            <input type="text" id="role-form-name" class="form-control" required placeholder="e.g. Senior Shift Supervisor, Kitchen Lead" value="${isEdit ? role.name : ''}" ${isSystemAdmin ? 'disabled' : ''}>
          </div>
          
          <h4 style="margin-bottom:0.75rem; font-size:0.95rem; text-transform:uppercase; border-bottom: 1px dashed var(--border-light); padding-bottom: 0.5rem;">Permissions checklist Matrix</h4>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Module Name</th>
                  <th style="text-align:center; width: 20%;">No Access</th>
                  <th style="text-align:center; width: 20%;">View Only</th>
                  <th style="text-align:center; width: 20%;">Full Access</th>
                </tr>
              </thead>
              <tbody>
                ${matrixRows}
              </tbody>
            </table>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-save-role-config" ${isSystemAdmin ? 'disabled' : ''}>Save Config</button>
      </div>
    `;

    app.showModal(modalHTML);

    if (isSystemAdmin) return; // Admins permissions are hard-locked to prevent lockouts

    document.getElementById("btn-save-role-config").addEventListener("click", () => {
      const name = document.getElementById("role-form-name").value.trim();
      if (!name) {
        app.showToast("Please enter a name for this custom role.", "warning");
        return;
      }

      // Check unique name
      const duplicate = roles.find(r => r.id !== roleId && r.name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        app.showToast(`A role named "${name}" already exists.`, "warning");
        return;
      }

      // Collect Matrix selections
      const permissions = {};
      let hasSomeAccess = false;
      const matrixRowsEls = document.querySelectorAll(".perm-matrix-row");
      
      for (let row of matrixRowsEls) {
        const modKey = row.dataset.module;
        const radChoice = row.querySelector(`input[name="perm-${modKey}"]:checked`);
        const value = radChoice ? radChoice.value : "none";
        
        permissions[modKey] = value;
        if (value !== "none") {
          hasSomeAccess = true;
        }
      }

      if (!hasSomeAccess) {
        app.showToast("Role must have access to at least one module (view/full).", "warning");
        return;
      }

      const payload = { name, permissions };

      if (isEdit) {
        db.update("roles", role.id, payload);
        app.showToast(`Updated custom role: ${name}`, "success");
      } else {
        db.insert("roles", payload);
        app.showToast(`Created custom role: ${name}!`, "success");
      }

      app.closeModal();
      this.renderRolesList();
      
      // Auto-refresh sidebar menu lists if current user role was modified
      if (isEdit && app.currentUser && app.currentUser.role === role.id) {
        app.login(app.currentUser);
      }
    });
  }
};

RolesModule.init();
