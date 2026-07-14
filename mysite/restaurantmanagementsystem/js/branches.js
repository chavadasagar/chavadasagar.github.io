/**
 * branches.js - Multi-branch Operations configurations
 */

const BranchesModule = {
  init() {
    window.addEventListener("render-section:branches", () => this.renderBranchesList());

    document.getElementById("btn-add-branch-modal").addEventListener("click", () => {
      this.showBranchModal();
    });
  },

  // Renders the list
  renderBranchesList() {
    const tableBody = document.getElementById("branches-list-table");
    const tbody = tableBody.querySelector("tbody");
    tbody.innerHTML = "";

    const branches = db.get("branches");
    const staff = db.get("staff");

    branches.forEach(b => {
      // Count staff profiles linked
      const staffCount = staff.filter(s => s.branchId === b.id).length;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600;">
          ${b.name}
          <div style="font-size:0.75rem; color:var(--text-muted);">${staffCount} staff members active here</div>
        </td>
        <td>${b.address}, ${b.city}</td>
        <td>${b.phone}</td>
        <td>${b.openingTime} to ${b.closingTime}</td>
        <td>
          <label class="form-check" style="justify-content:center;">
            <input type="checkbox" class="toggle-branch-active" data-id="${b.id}" ${b.isActive ? 'checked' : ''}>
          </label>
        </td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm btn-edit">Edit Settings</button>
            <button class="btn btn-secondary btn-sm btn-copy-menu" style="background-color: var(--color-primary-light); color: var(--color-primary);">Copy Menu</button>
            <button class="btn btn-danger btn-sm btn-delete">Delete</button>
          </div>
        </td>
      `;

      // Branch Active state inline toggle
      tr.querySelector(".toggle-branch-active").addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        db.update("branches", b.id, { isActive: isChecked });
        app.showToast(`Updated active status for ${b.name}`, "info");
        app.updateBranchSelectorOptions(); // refresh topbar list
      });

      tr.querySelector(".btn-edit").addEventListener("click", () => this.showBranchModal(b.id));
      tr.querySelector(".btn-copy-menu").addEventListener("click", () => this.showCopyMenuModal(b.id));
      tr.querySelector(".btn-delete").addEventListener("click", () => this.deleteBranch(b.id, staffCount));

      tbody.appendChild(tr);
    });
  },

  deleteBranch(id, staffCount) {
    if (staffCount > 0) {
      app.showToast(`Cannot delete branch! ${staffCount} staff members are currently registered to this branch.`, "warning");
      return;
    }

    const branches = db.get("branches");
    if (branches.length <= 1) {
      app.showToast("Cannot delete: System requires at least one configured branch.", "warning");
      return;
    }

    const b = branches.find(item => item.id === id);
    if (!b) return;

    if (confirm(`Are you sure you want to permanently delete branch "${b.name}"? This removes all associated tables and orders data.`)) {
      db.delete("branches", id);
      
      // Clean up linked data types
      const tables = db.get("tables").filter(t => t.branchId !== id);
      db.set("tables", tables);

      const orders = db.get("orders").filter(o => o.branchId !== id);
      db.set("orders", orders);

      const categories = db.get("categories").filter(c => c.branchId !== id);
      db.set("categories", categories);

      const menu = db.get("menu").filter(m => m.branchId !== id);
      db.set("menu", menu);

      const inventory = db.get("inventory").filter(i => i.branchId !== id);
      db.set("inventory", inventory);

      app.showToast(`Deleted branch "${b.name}" and removed all its records.`, "danger");
      app.updateBranchSelectorOptions();
      
      // If we deleted the currently selected branch, reset selectedBranchId
      const currentSelected = localStorage.getItem("selectedBranchId");
      if (currentSelected === id) {
        const remaining = db.get("branches");
        localStorage.setItem("selectedBranchId", remaining[0].id);
      }

      this.renderBranchesList();
    }
  },

  // Modal form to add/edit branches
  showBranchModal(branchId = null) {
    const isEdit = !!branchId;
    const branches = db.get("branches");
    const b = isEdit ? branches.find(item => item.id === branchId) : null;

    const modalHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Branch Configurations' : 'Add New Branch Location'}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="branch-form">
          <div class="form-group">
            <label class="form-label">Branch Name</label>
            <input type="text" id="br-form-name" class="form-control" required placeholder="e.g. Junagadh Main Road" value="${isEdit ? b.name : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input type="text" id="br-form-addr" class="form-control" required placeholder="e.g. 101 Town Hall Chowk" value="${isEdit ? b.address : ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">City</label>
              <input type="text" id="br-form-city" class="form-control" required placeholder="e.g. Junagadh" value="${isEdit ? b.city : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input type="text" id="br-form-phone" class="form-control" required placeholder="9825012345" value="${isEdit ? b.phone : ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Opening Time</label>
              <input type="time" id="br-form-open" class="form-control" required value="${isEdit ? b.openingTime : '10:00'}">
            </div>
            <div class="form-group">
              <label class="form-label">Closing Time</label>
              <input type="time" id="br-form-close" class="form-control" required value="${isEdit ? b.closingTime : '23:00'}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-check">
              <input type="checkbox" id="br-form-active" ${isEdit ? (b.isActive ? 'checked' : '') : 'checked'}> Branch Active
            </label>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-save-branch">Save Configurations</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-save-branch").addEventListener("click", () => {
      const name = document.getElementById("br-form-name").value.trim();
      const address = document.getElementById("br-form-addr").value.trim();
      const city = document.getElementById("br-form-city").value.trim();
      const phone = document.getElementById("br-form-phone").value.trim();
      const openingTime = document.getElementById("br-form-open").value;
      const closingTime = document.getElementById("br-form-close").value;
      const isActive = document.getElementById("br-form-active").checked;

      if (!name || !address || !city || !phone) {
        app.showToast("Please fill all required configurations fields.", "warning");
        return;
      }

      // Check duplicate name
      const duplicate = branches.find(item => item.id !== branchId && item.name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        app.showToast(`A branch named "${name}" already exists.`, "warning");
        return;
      }

      const payload = { name, address, city, phone, openingTime, closingTime, isActive };

      if (isEdit) {
        db.update("branches", b.id, payload);
        app.showToast(`Updated configs for branch "${name}".`, "success");
      } else {
        db.insert("branches", payload);
        app.showToast(`Branch "${name}" added to system directory!`, "success");
      }

      app.closeModal();
      app.updateBranchSelectorOptions();
      this.renderBranchesList();
    });
  },

  // Modal popup to select menu copy source
  showCopyMenuModal(targetBranchId) {
    const branches = db.get("branches").filter(b => b.id !== targetBranchId);
    
    if (branches.length === 0) {
      app.showToast("Need other active branches defined to copy menus from.", "warning");
      return;
    }

    const modalHTML = `
      <div class="modal-header">
        <h3>Copy Menu Catalog</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="copy-menu-form">
          <div class="form-group">
            <label class="form-label">Select Source Branch</label>
            <select id="copy-source-select" class="form-control">
              ${branches.map(b => `<option value="${b.id}">${b.name} (${b.city})</option>`).join('')}
            </select>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted);">
            Note: This duplicates all starters/mains categories and menu items from the chosen source branch to this target branch. It links foreign key items correctly.
          </p>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-copy-menu">Copy Menu Now</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-submit-copy-menu").addEventListener("click", () => {
      const sourceBranchId = document.getElementById("copy-source-select").value;
      
      this.executeMenuCopy(sourceBranchId, targetBranchId);
      app.closeModal();
    });
  },

  // Performs relational duplications
  executeMenuCopy(sourceBranchId, targetBranchId) {
    const allCategories = db.get("categories");
    const allMenuItems = db.get("menu");

    // Filter source items
    const sourceCats = allCategories.filter(c => c.branchId === sourceBranchId);
    const sourceItems = allMenuItems.filter(m => m.branchId === sourceBranchId);

    if (sourceCats.length === 0) {
      app.showToast("Source branch doesn't have any categories or menu items to copy.", "warning");
      return;
    }

    // Mapping old Category ID -> new Category ID
    const catMap = {};

    sourceCats.forEach(cat => {
      const newCat = {
        name: cat.name,
        description: cat.description,
        branchId: targetBranchId
      };
      const insertedCat = db.insert("categories", newCat);
      catMap[cat.id] = insertedCat.id;
    });

    // Copy dishes
    sourceItems.forEach(item => {
      const newItem = {
        categoryId: catMap[item.categoryId] || item.categoryId,
        name: item.name,
        basePrice: item.basePrice,
        isVeg: item.isVeg,
        isAvailable: item.isAvailable,
        image: item.image,
        variants: item.variants ? JSON.parse(JSON.stringify(item.variants)) : [],
        addons: item.addons ? JSON.parse(JSON.stringify(item.addons)) : [],
        branchId: targetBranchId
      };
      db.insert("menu", newItem);
    });

    app.showToast("Menu copied successfully!", "success");
  }
};

BranchesModule.init();
