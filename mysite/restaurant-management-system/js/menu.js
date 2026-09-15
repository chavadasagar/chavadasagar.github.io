/**
 * menu.js - Menu Items & Categories Management (Multi-branch & Permissions updated)
 */

const MenuModule = {
  init() {
    window.addEventListener("render-section:menu", () => this.renderMenuTable());
    
    // Bind search and action buttons
    document.getElementById("menu-management-search").addEventListener("input", (e) => {
      this.renderMenuTable(e.target.value);
    });

    document.getElementById("btn-add-menu-item-modal").addEventListener("click", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to add menu items.", "warning");
        return;
      }
      this.showMenuItemModal();
    });

    document.getElementById("btn-manage-categories-modal").addEventListener("click", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to manage categories.", "warning");
        return;
      }
      this.showCategoriesModal();
    });
  },

  // Renders the main listing table
  renderMenuTable(searchQuery = "") {
    // Check permission level
    app.enforcePermission("menu");

    const tableBody = document.querySelector("#menu-items-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const items = db.get("menu").filter(i => currentBranch === "all" || i.branchId === currentBranch);
    const categories = db.get("categories").filter(c => currentBranch === "all" || c.branchId === currentBranch);
    const branches = db.get("branches");
    
    const query = searchQuery.toLowerCase().trim();
    const filteredItems = items.filter(item => {
      const category = categories.find(c => c.id === item.categoryId);
      const categoryName = category ? category.name : "";
      return item.name.toLowerCase().includes(query) || 
             categoryName.toLowerCase().includes(query);
    });

    if (filteredItems.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--text-muted); padding: 2rem;">No items found matching filter.</td></tr>`;
      return;
    }

    const hasFullAccess = app.checkPermission("menu", "full");

    filteredItems.forEach(item => {
      const category = categories.find(c => c.id === item.categoryId);
      const catName = category ? category.name : "Uncategorized";
      
      // If "All Branches" view, add branch name label
      const branch = branches.find(b => b.id === item.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 600;">
          <span style="font-size: 1.2rem; margin-right: 0.5rem;">${item.image || '🍽️'}</span>
          ${item.name}
          ${branchBadge}
        </td>
        <td>${catName}</td>
        <td>
          <span class="badge badge-${item.isVeg ? 'success' : 'danger'}">
            ${item.isVeg ? 'Veg' : 'Non-Veg'}
          </span>
        </td>
        <td style="font-weight: 700;">${app.formatCurrency(item.basePrice)}</td>
        <td>
          ${item.variants && item.variants.length > 0 
            ? item.variants.map(v => `<span style="font-size: 0.8rem; display:block;">${v.name}: ${app.formatCurrency(v.price)}</span>`).join('')
            : '<span style="color: var(--text-muted); font-size: 0.85rem;">None</span>'}
        </td>
        <td>
          ${item.addons && item.addons.length > 0 
            ? item.addons.map(a => `<span style="font-size: 0.8rem; display:block;">+ ${a.name}: ${app.formatCurrency(a.price)}</span>`).join('')
            : '<span style="color: var(--text-muted); font-size: 0.85rem;">None</span>'}
        </td>
        <td>
          <label class="form-check" style="justify-content: center;">
            <input type="checkbox" class="toggle-availability" data-id="${item.id}" ${item.isAvailable ? 'checked' : ''} ${!hasFullAccess ? 'disabled' : ''}>
          </label>
        </td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm btn-edit" ${!hasFullAccess ? 'disabled' : ''}>Edit</button>
            <button class="btn btn-danger btn-sm btn-delete" ${!hasFullAccess ? 'disabled' : ''}>Delete</button>
          </div>
        </td>
      `;

      // Bind direct toggles
      if (hasFullAccess) {
        tr.querySelector(".toggle-availability").addEventListener("change", (e) => {
          const isChecked = e.target.checked;
          db.update("menu", item.id, { isAvailable: isChecked });
          app.showToast(`Updated availability for ${item.name}`, "info");
        });

        // Bind edit and delete clicks
        tr.querySelector(".btn-edit").addEventListener("click", () => this.showMenuItemModal(item.id));
        tr.querySelector(".btn-delete").addEventListener("click", () => this.deleteMenuItem(item.id));
      }

      tableBody.appendChild(tr);
    });
  },

  // Triggers confirmation popup and removes record
  deleteMenuItem(id) {
    const item = db.get("menu").find(i => i.id === id);
    if (!item) return;

    if (confirm(`Are you sure you want to permanently delete "${item.name}" from the menu?`)) {
      db.delete("menu", id);
      // Clean recipe records referencing this menu item
      const recipes = db.get("recipes").filter(r => r.menuItemId !== id);
      db.set("recipes", recipes);

      app.showToast(`Deleted ${item.name} from menu catalog.`, "danger");
      this.renderMenuTable();
    }
  },

  // Opens MenuItem modal interface (Add/Edit mode)
  showMenuItemModal(itemId = null) {
    const currentBranch = db.getCurrentBranch();
    const items = db.get("menu");
    const categories = db.get("categories").filter(c => c.branchId === currentBranch);
    
    if (categories.length === 0) {
      app.showToast("Please create at least one category before adding menu items.", "warning");
      return;
    }

    const editItem = itemId ? items.find(i => i.id === itemId) : null;
    const isEdit = !!editItem;

    const modalHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="menu-item-form">
          <input type="hidden" id="menu-item-id" value="${isEdit ? editItem.id : ''}">
          
          <div class="form-group">
            <label class="form-label">Item Name</label>
            <input type="text" id="menu-item-name" class="form-control" required value="${isEdit ? editItem.name : ''}">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="menu-item-category" class="form-control" required>
                ${categories.map(c => `<option value="${c.id}" ${isEdit && editItem.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Base Price</label>
              <input type="number" id="menu-item-price" class="form-control" required min="0" value="${isEdit ? editItem.basePrice : '0'}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Emoji / Symbol Icon</label>
              <input type="text" id="menu-item-image" class="form-control" placeholder="e.g. 🍕, 🍔, 🥤" value="${isEdit ? editItem.image : '🍽️'}">
            </div>
            <div class="form-group" style="display:flex; align-items:flex-end; padding-bottom: 0.5rem; gap: 1rem;">
              <label class="form-check">
                <input type="checkbox" id="menu-item-veg" ${isEdit ? (editItem.isVeg ? 'checked' : '') : 'checked'}> Veg Item
              </label>
              <label class="form-check">
                <input type="checkbox" id="menu-item-avail" ${isEdit ? (editItem.isAvailable ? 'checked' : '') : 'checked'}> In Stock
              </label>
            </div>
          </div>

          <!-- Variants Management -->
          <div class="card" style="margin-top: 1rem;">
            <div class="card-header" style="padding: 0.5rem 1rem;">
              <span class="font-bold" style="font-size: 0.9rem;">Pricing Variants (e.g. Half/Full, Small/Large)</span>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-variant-row">+ Add Variant</button>
            </div>
            <div class="card-body" id="variants-list-wrapper" style="padding: 0.75rem;">
              <!-- Dynamic variant fields -->
            </div>
          </div>

          <!-- Addons Management -->
          <div class="card" style="margin-top: 1rem; margin-bottom: 0;">
            <div class="card-header" style="padding: 0.5rem 1rem;">
              <span class="font-bold" style="font-size: 0.9rem;">Add-ons / Modifiers</span>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-addon-row">+ Add Addon</button>
            </div>
            <div class="card-body" id="addons-list-wrapper" style="padding: 0.75rem;">
              <!-- Dynamic addon fields -->
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-save-menu-item">Save Menu Item</button>
      </div>
    `;

    app.showModal(modalHTML);

    const variantWrapper = document.getElementById("variants-list-wrapper");
    const addonWrapper = document.getElementById("addons-list-wrapper");

    const addVariantRow = (name = "", price = "") => {
      const row = document.createElement("div");
      row.className = "d-flex gap-2 mb-2 variant-row align-items-center";
      row.innerHTML = `
        <input type="text" placeholder="Size/Variant Name" class="form-control var-name" style="flex:2;" required value="${name}">
        <input type="number" placeholder="Price" class="form-control var-price" style="flex:1;" required min="0" value="${price}">
        <button type="button" class="btn btn-danger btn-sm btn-icon-only remove-row-btn">&times;</button>
      `;
      row.querySelector(".remove-row-btn").addEventListener("click", () => row.remove());
      variantWrapper.appendChild(row);
    };

    const addAddonRow = (name = "", price = "") => {
      const row = document.createElement("div");
      row.className = "d-flex gap-2 mb-2 addon-row align-items-center";
      row.innerHTML = `
        <input type="text" placeholder="Add-on Name" class="form-control addon-name" style="flex:2;" required value="${name}">
        <input type="number" placeholder="Price" class="form-control addon-price" style="flex:1;" required min="0" value="${price}">
        <button type="button" class="btn btn-danger btn-sm btn-icon-only remove-row-btn">&times;</button>
      `;
      row.querySelector(".remove-row-btn").addEventListener("click", () => row.remove());
      addonWrapper.appendChild(row);
    };

    if (isEdit) {
      if (editItem.variants) editItem.variants.forEach(v => addVariantRow(v.name, v.price));
      if (editItem.addons) editItem.addons.forEach(a => addAddonRow(a.name, a.price));
    }

    document.getElementById("btn-add-variant-row").addEventListener("click", () => addVariantRow());
    document.getElementById("btn-add-addon-row").addEventListener("click", () => addAddonRow());

    document.getElementById("btn-save-menu-item").addEventListener("click", () => {
      const name = document.getElementById("menu-item-name").value.trim();
      const categoryId = document.getElementById("menu-item-category").value;
      const basePrice = parseFloat(document.getElementById("menu-item-price").value) || 0;
      const image = document.getElementById("menu-item-image").value.trim() || '🍽️';
      const isVeg = document.getElementById("menu-item-veg").checked;
      const isAvailable = document.getElementById("menu-item-avail").checked;

      if (!name) {
        app.showToast("Please enter an item name.", "warning");
        return;
      }

      const variants = [];
      const varRows = variantWrapper.querySelectorAll(".variant-row");
      for (let r of varRows) {
        const vName = r.querySelector(".var-name").value.trim();
        const vPrice = parseFloat(r.querySelector(".var-price").value);
        if (!vName || isNaN(vPrice)) {
          app.showToast("Variant details must be fully filled.", "warning");
          return;
        }
        variants.push({ name: vName, price: vPrice });
      }

      const addons = [];
      const addRows = addonWrapper.querySelectorAll(".addon-row");
      for (let r of addRows) {
        const aName = r.querySelector(".addon-name").value.trim();
        const aPrice = parseFloat(r.querySelector(".addon-price").value);
        if (!aName || isNaN(aPrice)) {
          app.showToast("Addon details must be fully filled.", "warning");
          return;
        }
        addons.push({ name: aName, price: aPrice });
      }

      const itemPayload = { 
        categoryId, 
        name, 
        basePrice, 
        isVeg, 
        isAvailable, 
        image, 
        variants, 
        addons,
        branchId: isEdit ? editItem.branchId : currentBranch // save to active branch
      };

      if (isEdit) {
        db.update("menu", editItem.id, itemPayload);
        app.showToast(`Updated menu item "${name}"!`, "success");
      } else {
        db.insert("menu", itemPayload);
        app.showToast(`Added "${name}" to menu database!`, "success");
      }

      app.closeModal();
      this.renderMenuTable();
    });
  },

  showCategoriesModal() {
    const currentBranch = db.getCurrentBranch();

    const renderCatsList = () => {
      const listEl = document.getElementById("modal-cats-list");
      listEl.innerHTML = "";
      const cats = db.get("categories").filter(c => c.branchId === currentBranch);
      
      cats.forEach(c => {
        const li = document.createElement("div");
        li.className = "d-flex justify-content-between align-items-center mb-2";
        li.style.padding = "0.5rem";
        li.style.borderBottom = "1px solid var(--border-light)";
        li.innerHTML = `
          <div>
            <strong style="color:var(--text-primary);">${c.name}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">${c.description || ''}</div>
          </div>
          <button class="btn btn-danger btn-sm btn-icon-only remove-cat" data-id="${c.id}">&times;</button>
        `;
        li.querySelector(".remove-cat").addEventListener("click", () => {
          const menuUsing = db.get("menu").filter(m => m.categoryId === c.id);
          if (menuUsing.length > 0) {
            app.showToast(`Cannot delete! ${menuUsing.length} menu items are currently using this category.`, "warning");
            return;
          }
          if (confirm(`Delete category "${c.name}"?`)) {
            db.delete("categories", c.id);
            app.showToast("Category deleted.", "success");
            renderCatsList();
            this.renderMenuTable();
          }
        });
        listEl.appendChild(li);
      });
    };

    const modalHTML = `
      <div class="modal-header">
        <h3>Manage Menu Categories</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div style="max-height: 220px; overflow-y: auto; margin-bottom: 1.5rem;" id="modal-cats-list">
        </div>

        <form id="new-cat-inline-form" style="border-top:1px dashed var(--border-light); padding-top:1rem;">
          <h4 style="margin-bottom:0.75rem; font-size:1rem;">Add New Category</h4>
          <div class="form-group">
            <label class="form-label">Category Name</label>
            <input type="text" id="new-cat-name" class="form-control" required placeholder="e.g. Chinese, Mocktails">
          </div>
          <div class="form-group">
            <label class="form-label">Description (Optional)</label>
            <input type="text" id="new-cat-desc" class="form-control" placeholder="Short tagline...">
          </div>
          <button type="button" class="btn btn-primary w-100" id="btn-save-inline-cat">Save Category</button>
        </form>
      </div>
    `;

    app.showModal(modalHTML);
    renderCatsList();

    document.getElementById("btn-save-inline-cat").addEventListener("click", () => {
      const name = document.getElementById("new-cat-name").value.trim();
      const description = document.getElementById("new-cat-desc").value.trim();

      if (!name) {
        app.showToast("Category name is required.", "warning");
        return;
      }

      db.insert("categories", { name, description, branchId: currentBranch });
      app.showToast(`Created category "${name}"`, "success");
      
      document.getElementById("new-cat-name").value = "";
      document.getElementById("new-cat-desc").value = "";
      renderCatsList();
      this.renderMenuTable();
    });
  }
};

MenuModule.init();
