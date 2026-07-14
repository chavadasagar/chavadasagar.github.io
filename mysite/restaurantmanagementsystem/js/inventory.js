/**
 * inventory.js - Stock Tracking and Recipe Mapping (Multi-branch & Permissions updated)
 */

const InventoryModule = {
  init() {
    window.addEventListener("render-section:inventory", () => {
      this.renderInventoryTable();
      this.renderRecipeMappings();
    });

    // Add buttons bindings
    document.getElementById("btn-add-inventory-item-modal").addEventListener("click", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to add ingredients.", "warning");
        return;
      }
      this.showIngredientModal();
    });

    document.getElementById("btn-add-stock-modal").addEventListener("click", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to record purchases.", "warning");
        return;
      }
      this.showPurchaseModal();
    });

    document.getElementById("btn-recipe-modal").addEventListener("click", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to map recipes.", "warning");
        return;
      }
      this.showRecipeMappingModal();
    });
  },

  // Renders the main ingredients stock levels table
  renderInventoryTable() {
    app.enforcePermission("inventory");

    const tableBody = document.querySelector("#inventory-items-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const inventory = db.get("inventory").filter(i => currentBranch === "all" || i.branchId === currentBranch);
    const branches = db.get("branches");

    if (inventory.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-muted); padding:2rem;">No ingredients registered.</td></tr>`;
      return;
    }

    const hasFullAccess = app.checkPermission("inventory", "full");

    inventory.forEach(item => {
      const isLowStock = item.currentStock <= item.reorderLevel;
      const statusBadge = isLowStock 
        ? `<span class="badge badge-danger">Low Stock</span>` 
        : `<span class="badge badge-success">Good</span>`;

      // If "All Branches" view, add branch name label
      const branch = branches.find(b => b.id === item.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600;">${item.name} ${branchBadge}</td>
        <td>${item.unit}</td>
        <td style="font-weight:700; color:${isLowStock ? 'var(--color-danger)' : 'inherit'};">${item.currentStock.toFixed(2)}</td>
        <td>${item.reorderLevel.toFixed(2)}</td>
        <td>${app.formatCurrency(item.costPerUnit)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm btn-edit" ${!hasFullAccess ? 'disabled' : ''}>Edit</button>
            <button class="btn btn-danger btn-sm btn-delete" ${!hasFullAccess ? 'disabled' : ''}>Delete</button>
          </div>
        </td>
      `;

      if (hasFullAccess) {
        tr.querySelector(".btn-edit").addEventListener("click", () => this.showIngredientModal(item.id));
        tr.querySelector(".btn-delete").addEventListener("click", () => this.deleteIngredient(item.id));
      }

      tableBody.appendChild(tr);
    });

    this.updateDashboardStockAlerts();
  },

  deleteIngredient(id) {
    const item = db.get("inventory").find(i => i.id === id);
    if (!item) return;

    if (confirm(`Are you sure you want to delete "${item.name}"? This removes its recipe mappings.`)) {
      db.delete("inventory", id);
      
      const recipes = db.get("recipes").filter(r => r.ingredientId !== id);
      db.set("recipes", recipes);

      app.showToast(`Deleted ${item.name} from inventory.`, "danger");
      this.renderInventoryTable();
      this.renderRecipeMappings();
    }
  },

  showIngredientModal(itemId = null) {
    const isEdit = !!itemId;
    const item = isEdit ? db.get("inventory").find(i => i.id === itemId) : null;
    const currentBranch = db.getCurrentBranch();

    const modalHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Ingredient' : 'Add New Ingredient'}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="ingredient-form">
          <div class="form-group">
            <label class="form-label">Ingredient Name</label>
            <input type="text" id="ing-name" class="form-control" required placeholder="e.g. Fresh Chicken" value="${isEdit ? item.name : ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Measurement Unit</label>
              <input type="text" id="ing-unit" class="form-control" required value="${isEdit ? item.unit : 'kg'}">
            </div>
            <div class="form-group">
              <label class="form-label">Current Stock Level</label>
              <input type="number" id="ing-stock" class="form-control" required step="0.01" min="0" value="${isEdit ? item.currentStock : '0'}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Reorder Level Warning</label>
              <input type="number" id="ing-reorder" class="form-control" required step="0.01" min="0" value="${isEdit ? item.reorderLevel : '2'}">
            </div>
            <div class="form-group">
              <label class="form-label">Average Unit Cost</label>
              <input type="number" id="ing-cost" class="form-control" required step="0.1" min="0" value="${isEdit ? item.costPerUnit : '0'}">
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-save-ing">Save Ingredient</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-save-ing").addEventListener("click", () => {
      const name = document.getElementById("ing-name").value.trim();
      const unit = document.getElementById("ing-unit").value.trim();
      const currentStock = parseFloat(document.getElementById("ing-stock").value) || 0;
      const reorderLevel = parseFloat(document.getElementById("ing-reorder").value) || 0;
      const costPerUnit = parseFloat(document.getElementById("ing-cost").value) || 0;

      if (!name || !unit) {
        app.showToast("Please enter an ingredient name.", "warning");
        return;
      }

      const payload = { 
        name, 
        unit, 
        currentStock, 
        reorderLevel, 
        costPerUnit,
        branchId: isEdit ? item.branchId : currentBranch 
      };

      if (isEdit) {
        db.update("inventory", item.id, payload);
        app.showToast(`Updated ingredient "${name}".`, "success");
      } else {
        db.insert("inventory", payload);
        app.showToast(`Added ingredient "${name}".`, "success");
      }

      app.closeModal();
      this.renderInventoryTable();
    });
  },

  showPurchaseModal() {
    const currentBranch = db.getCurrentBranch();
    const inventory = db.get("inventory").filter(i => i.branchId === currentBranch);
    
    if (inventory.length === 0) {
      app.showToast("Define ingredients for this branch before logging purchases.", "warning");
      return;
    }

    const modalHTML = `
      <div class="modal-header">
        <h3>Record Purchase (Add Stock)</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="purchase-form">
          <div class="form-group">
            <label class="form-label">Choose Ingredient</label>
            <select id="pur-item-select" class="form-control" required>
              ${inventory.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Added Quantity</label>
              <input type="number" id="pur-qty" class="form-control" required min="0.01" step="0.01" value="5">
            </div>
            <div class="form-group">
              <label class="form-label">Total Invoice Cost</label>
              <input type="number" id="pur-total-cost" class="form-control" required min="0" value="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Supplier Name</label>
              <input type="text" id="pur-supplier" class="form-control" placeholder="e.g. Fresh Foods Ltd.">
            </div>
            <div class="form-group">
              <label class="form-label">Log Date</label>
              <input type="date" id="pur-date" class="form-control" required value="${new Date().toISOString().slice(0, 10)}">
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-purchase">Record Log</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-submit-purchase").addEventListener("click", () => {
      const ingId = document.getElementById("pur-item-select").value;
      const quantity = parseFloat(document.getElementById("pur-qty").value) || 0;
      const totalCost = parseFloat(document.getElementById("pur-total-cost").value) || 0;
      
      if (quantity <= 0) {
        app.showToast("Please enter a valid quantity.", "warning");
        return;
      }

      const matchedIng = inventory.find(i => i.id === ingId);
      if (matchedIng) {
        const nextStock = matchedIng.currentStock + quantity;
        const totalOldCost = matchedIng.currentStock * matchedIng.costPerUnit;
        const totalNewCost = totalOldCost + totalCost;
        const avgCost = nextStock > 0 ? totalNewCost / nextStock : matchedIng.costPerUnit;

        db.update("inventory", matchedIng.id, { 
          currentStock: nextStock,
          costPerUnit: Math.round(avgCost * 100) / 100
        });

        app.showToast(`Logged purchase for "${matchedIng.name}".`, "success");
      }

      app.closeModal();
      this.renderInventoryTable();
    });
  },

  renderRecipeMappings() {
    const list = document.getElementById("recipe-mappings-container");
    list.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const recipes = db.get("recipes").filter(r => currentBranch === "all" || r.branchId === currentBranch);
    const menuItems = db.get("menu");
    const inventory = db.get("inventory");
    const branches = db.get("branches");

    if (recipes.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">No recipes.</div>`;
      return;
    }

    const grouped = {};
    recipes.forEach(r => {
      if (!grouped[r.menuItemId]) grouped[r.menuItemId] = [];
      grouped[r.menuItemId].push(r);
    });

    const hasFullAccess = app.checkPermission("inventory", "full");

    for (let menuItemId in grouped) {
      const item = menuItems.find(m => m.id === menuItemId);
      if (!item) continue;

      const groupCard = document.createElement("div");
      groupCard.className = "card";
      groupCard.style.padding = "0.75rem";
      groupCard.style.marginBottom = "0.75rem";

      const childItemsHTML = grouped[menuItemId].map(r => {
        const ing = inventory.find(i => i.id === r.ingredientId);
        return `
          <div class="inventory-recipe-row">
            <span>${ing ? ing.name : 'Unknown'} (${r.quantityRequired} ${ing ? ing.unit : ''})</span>
            <button class="close-btn remove-recipe-map" data-id="${r.id}" style="color:var(--color-danger); font-size:1.15rem;" ${!hasFullAccess ? 'disabled' : ''}>&times;</button>
          </div>
        `;
      }).join('');

      const branch = branches.find(b => b.id === item.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<span style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);"> [${branch.name}]</span>` 
        : "";

      groupCard.innerHTML = `
        <div style="font-weight:700; font-size:0.95rem; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
          <span>${item.image || '🍽️'} ${item.name}${branchBadge}</span>
        </div>
        <div>
          ${childItemsHTML}
        </div>
      `;

      if (hasFullAccess) {
        groupCard.querySelectorAll(".remove-recipe-map").forEach(btn => {
          btn.addEventListener("click", () => {
            const mapId = btn.dataset.id;
            if (confirm("Remove recipe dependency?")) {
              db.delete("recipes", mapId);
              app.showToast("Recipe dependency removed.", "success");
              this.renderRecipeMappings();
            }
          });
        });
      }

      list.appendChild(groupCard);
    }
  },

  showRecipeMappingModal() {
    const currentBranch = db.getCurrentBranch();
    const menuItems = db.get("menu").filter(m => m.branchId === currentBranch);
    const inventory = db.get("inventory").filter(i => i.branchId === currentBranch);

    if (menuItems.length === 0 || inventory.length === 0) {
      app.showToast("Need menu items and ingredients defined in this branch to configure recipes.", "warning");
      return;
    }

    const modalHTML = `
      <div class="modal-header">
        <h3>Link Ingredient Recipe</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="recipe-map-form">
          <div class="form-group">
            <label class="form-label">Select Menu Item</label>
            <select id="map-menu-select" class="form-control">
              ${menuItems.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Select Ingredient</label>
            <select id="map-ing-select" class="form-control">
              ${inventory.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Quantity required per serving</label>
            <input type="number" id="map-qty" class="form-control" min="0.001" step="0.001" value="0.100" required>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-recipe-map">Map Ingredient</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-submit-recipe-map").addEventListener("click", () => {
      const menuItemId = document.getElementById("map-menu-select").value;
      const ingredientId = document.getElementById("map-ing-select").value;
      const quantityRequired = parseFloat(document.getElementById("map-qty").value) || 0;

      if (quantityRequired <= 0) {
        app.showToast("Please enter a valid quantity.", "warning");
        return;
      }

      const recipes = db.get("recipes");
      const exists = recipes.find(r => r.branchId === currentBranch && r.menuItemId === menuItemId && r.ingredientId === ingredientId);

      if (exists) {
        db.update("recipes", exists.id, { quantityRequired });
        app.showToast("Updated recipe.", "success");
      } else {
        db.insert("recipes", { menuItemId, ingredientId, quantityRequired, branchId: currentBranch });
        app.showToast("Created recipe mapping.", "success");
      }

      app.closeModal();
      this.renderRecipeMappings();
    });
  },

  updateDashboardStockAlerts() {
    const alertsContainer = document.getElementById("dashboard-alerts-container");
    if (!alertsContainer) return;
    alertsContainer.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const inventory = db.get("inventory").filter(i => currentBranch === "all" || i.branchId === currentBranch);
    const lowStock = inventory.filter(i => i.currentStock <= i.reorderLevel);
    
    const reservations = db.get("reservations").filter(r => currentBranch === "all" || r.branchId === currentBranch);
    const pendingReservations = reservations.filter(r => r.status === "confirmed");

    if (lowStock.length === 0 && pendingReservations.length === 0) {
      alertsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.85rem;">No alerts.</div>`;
      return;
    }

    lowStock.forEach(item => {
      const alert = document.createElement("div");
      alert.style.cssText = "background-color: var(--color-danger-light); color: var(--color-danger); font-size:0.8rem; padding: 0.5rem 0.75rem; border-radius:6px; border-left:4px solid var(--color-danger); margin-bottom:0.5rem; font-weight:600;";
      alert.innerHTML = `🚨 Low Stock: "${item.name}" level is ${item.currentStock} ${item.unit}`;
      alertsContainer.appendChild(alert);
    });

    pendingReservations.forEach(res => {
      const bookingTime = new Date(res.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const alert = document.createElement("div");
      alert.style.cssText = "background-color: var(--color-warning-light); color: var(--color-warning); font-size:0.8rem; padding: 0.5rem 0.75rem; border-radius:6px; border-left:4px solid var(--color-warning); margin-bottom:0.5rem; font-weight:600;";
      alert.innerHTML = `📅 Booking: ${res.customerName} at ${bookingTime}`;
      alertsContainer.appendChild(alert);
    });
  }
};

InventoryModule.init();
