/**
 * tables.js - Seating & Seating Zones Layout (Multi-branch & Permissions updated)
 */

const TablesModule = {
  init() {
    window.addEventListener("render-section:tables", () => this.renderTablesGrid());
    
    // Bind Add Table button
    document.getElementById("btn-add-table-modal").addEventListener("click", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to add tables.", "warning");
        return;
      }
      this.showAddTableModal();
    });
  },

  // Renders the visual seating layout grid
  renderTablesGrid() {
    app.enforcePermission("tables");

    const gridContainer = document.getElementById("tables-layout-container");
    gridContainer.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const tables = db.get("tables").filter(t => currentBranch === "all" || t.branchId === currentBranch);
    const branches = db.get("branches");

    if (tables.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
          <h3>No tables configured.</h3>
          <p>Click "Add New Table" to define restaurant seating layouts.</p>
        </div>
      `;
      return;
    }

    tables.forEach(tbl => {
      const card = document.createElement("div");
      card.className = `table-card status-${tbl.status}`;
      card.dataset.id = tbl.id;

      // Find active order if occupied
      let orderLabel = "";
      if (tbl.status === "occupied") {
        const orders = db.get("orders");
        const activeOrder = orders.find(o => o.tableId === tbl.id && o.status !== "completed" && o.status !== "cancelled");
        if (activeOrder) {
          orderLabel = `<div style="font-size: 0.75rem; color: var(--color-danger); font-weight: 700; margin-top: 0.2rem;">${activeOrder.orderNo}</div>`;
        }
      }

      // Add branch name label on All Branches view
      const branch = branches.find(b => b.id === tbl.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem;">[${branch.name}]</div>` 
        : "";

      card.innerHTML = `
        <div class="table-icon">
          ${tbl.number.replace(/\D/g, '') || '🍽️'}
        </div>
        <div class="table-number">${tbl.number}</div>
        <div class="table-capacity">Pax: ${tbl.capacity}</div>
        <span class="badge badge-${this.getStatusBadgeType(tbl.status)} table-status-label">${tbl.status}</span>
        ${orderLabel}
        ${branchBadge}
      `;

      card.addEventListener("click", () => this.handleTableClick(tbl));
      gridContainer.appendChild(card);
    });
  },

  getStatusBadgeType(status) {
    switch (status) {
      case "available": return "success";
      case "occupied": return "danger";
      case "reserved": return "warning";
      case "cleaning": return "neutral";
      default: return "neutral";
    }
  },

  // Displays table actions modal menu
  handleTableClick(tbl) {
    const hasFullAccess = app.checkPermission("tables", "full");
    
    let orderBtn = "";
    let cleanBtn = "";
    let cancelReservationBtn = "";

    const orders = db.get("orders");
    const activeOrder = orders.find(o => o.tableId === tbl.id && o.status !== "completed" && o.status !== "cancelled");

    // Add buttons dynamically based on current status
    if (tbl.status === "available") {
      if (hasFullAccess) {
        orderBtn = `<button class="btn btn-primary w-100" id="modal-tbl-start-order">Start New Order</button>`;
        cleanBtn = `
          <button class="btn btn-secondary w-100" id="modal-tbl-mark-reserved">Mark Reserved</button>
          <button class="btn btn-secondary w-100" id="modal-tbl-mark-occupied">Mark Occupied</button>
        `;
      }
    } else if (tbl.status === "occupied") {
      if (activeOrder) {
        // Can view details even if view only
        orderBtn = `<button class="btn btn-primary w-100" id="modal-tbl-view-order">${hasFullAccess ? 'Edit Active Order' : 'View Active Order'} (${activeOrder.orderNo})</button>`;
        
        // Checkout requires billing access
        const hasBillingAccess = app.checkPermission("billing", "view");
        if (hasBillingAccess) {
          cleanBtn = `<button class="btn btn-success w-100" id="modal-tbl-billing">Proceed to Checkout</button>`;
        }
      } else {
        if (hasFullAccess) {
          orderBtn = `<button class="btn btn-primary w-100" id="modal-tbl-start-order">Assign New Order</button>`;
          cleanBtn = `<button class="btn btn-secondary w-100" id="modal-tbl-mark-available">Release to Available</button>`;
        }
      }
    } else if (tbl.status === "cleaning") {
      if (hasFullAccess) {
        orderBtn = `<button class="btn btn-success w-100" id="modal-tbl-mark-available">Finish Cleaning (Ready)</button>`;
      }
    } else if (tbl.status === "reserved") {
      if (hasFullAccess) {
        orderBtn = `<button class="btn btn-primary w-100" id="modal-tbl-start-order">Arrived (Start Order)</button>`;
        cancelReservationBtn = `<button class="btn btn-danger w-100" id="modal-tbl-release-reservation">Cancel Reservation</button>`;
      }
    }

    const modalHTML = `
      <div class="modal-header">
        <h3>Table ${tbl.number} Configuration</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body d-flex flex-column gap-3">
        <div class="text-center">
          <p style="font-size: 0.95rem; color: var(--text-secondary);">
            Seating Capacity: <strong>${tbl.capacity} Pax</strong> | Status: <strong style="text-transform:uppercase;">${tbl.status}</strong>
          </p>
        </div>
        
        <div class="d-flex flex-column gap-2">
          ${orderBtn ? orderBtn : '<p style="text-align:center; font-size:0.85rem; color:var(--text-muted);">No actions available (View-Only Access)</p>'}
          ${cleanBtn}
          ${cancelReservationBtn}
        </div>
        
        ${hasFullAccess ? `
        <div style="border-top: 1px dashed var(--border-light); padding-top: 1rem; margin-top: 0.5rem;" class="d-flex justify-content-between">
          <button class="btn btn-secondary btn-sm" id="modal-tbl-edit">Edit Seating Details</button>
          <button class="btn btn-danger btn-sm" id="modal-tbl-delete">Delete Seating Table</button>
        </div>` : ''}
      </div>
    `;

    app.showModal(modalHTML);

    if (!hasFullAccess && !activeOrder) return;

    // Start/Edit order flow
    const startOrderBtn = document.getElementById("modal-tbl-start-order");
    if (startOrderBtn) {
      startOrderBtn.addEventListener("click", () => {
        app.closeModal();
        // Redirect to order-builder with table preset and branch preset
        localStorage.setItem("selectedBranchId", tbl.branchId);
        window.location.hash = "order-builder";
        setTimeout(() => {
          const typeSelect = document.getElementById("order-type-select");
          if (typeSelect) {
            typeSelect.value = "dine_in";
            typeSelect.dispatchEvent(new Event("change"));
          }
          const tblSelect = document.getElementById("builder-table-select");
          if (tblSelect) {
            tblSelect.value = tbl.id;
          }
        }, 100);
      });
    }

    const viewOrderBtn = document.getElementById("modal-tbl-view-order");
    if (viewOrderBtn) {
      viewOrderBtn.addEventListener("click", () => {
        app.closeModal();
        localStorage.setItem("selectedBranchId", tbl.branchId);
        window.location.hash = "orders";
        setTimeout(() => {
          const viewDetailsBtn = document.querySelector(`#orders-list-table tr[data-order-id="${activeOrder.id}"] .btn-view-details`);
          if (viewDetailsBtn) viewDetailsBtn.click();
        }, 150);
      });
    }

    // Billing checkout
    const billingBtn = document.getElementById("modal-tbl-billing");
    if (billingBtn) {
      billingBtn.addEventListener("click", () => {
        app.closeModal();
        localStorage.setItem("selectedBranchId", tbl.branchId);
        window.location.hash = "billing";
        setTimeout(() => {
          const payOrderBtn = document.querySelector(`#billing-pending-orders-table tr[data-order-id="${activeOrder.id}"] .btn-checkout-pay`);
          if (payOrderBtn) payOrderBtn.click();
        }, 150);
      });
    }

    // Toggle states directly
    const availBtn = document.getElementById("modal-tbl-mark-available");
    if (availBtn) {
      availBtn.addEventListener("click", () => {
        db.update("tables", tbl.id, { status: "available" });
        app.showToast(`Table ${tbl.number} is now Available.`, "success");
        app.closeModal();
        this.renderTablesGrid();
      });
    }

    const resBtn = document.getElementById("modal-tbl-mark-reserved");
    if (resBtn) {
      resBtn.addEventListener("click", () => {
        db.update("tables", tbl.id, { status: "reserved" });
        app.showToast(`Table ${tbl.number} marked as Reserved.`, "warning");
        app.closeModal();
        this.renderTablesGrid();
      });
    }

    const occBtn = document.getElementById("modal-tbl-mark-occupied");
    if (occBtn) {
      occBtn.addEventListener("click", () => {
        db.update("tables", tbl.id, { status: "occupied" });
        app.showToast(`Table ${tbl.number} marked as Occupied.`, "danger");
        app.closeModal();
        this.renderTablesGrid();
      });
    }

    const releaseResBtn = document.getElementById("modal-tbl-release-reservation");
    if (releaseResBtn) {
      releaseResBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to cancel the reservation for this table?")) {
          db.update("tables", tbl.id, { status: "available" });
          
          const reservations = db.get("reservations");
          const activeRes = reservations.find(r => r.tableId === tbl.id && r.status === "confirmed");
          if (activeRes) {
            db.update("reservations", activeRes.id, { status: "cancelled" });
          }

          app.showToast(`Reservation cancelled. Table ${tbl.number} released.`, "success");
          app.closeModal();
          this.renderTablesGrid();
        }
      });
    }

    if (hasFullAccess) {
      // Edit table attributes
      document.getElementById("modal-tbl-edit").addEventListener("click", () => {
        app.closeModal();
        this.showAddTableModal(tbl.id);
      });

      // Delete table record
      document.getElementById("modal-tbl-delete").addEventListener("click", () => {
        if (tbl.status === "occupied") {
          app.showToast("Cannot delete table while occupied!", "warning");
          return;
        }
        if (confirm(`Remove table "${tbl.number}" entirely from the seating map?`)) {
          db.delete("tables", tbl.id);
          app.showToast(`Table ${tbl.number} deleted.`, "danger");
          app.closeModal();
          this.renderTablesGrid();
        }
      });
    }
  },

  // Form to Add/Edit Seating details
  showAddTableModal(tableId = null) {
    const isEdit = !!tableId;
    const tbl = isEdit ? db.get("tables").find(t => t.id === tableId) : null;
    const currentBranch = db.getCurrentBranch();

    const modalHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Table Settings' : 'Create Seating Table'}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="table-crud-form">
          <div class="form-group">
            <label class="form-label">Table Number / Label</label>
            <input type="text" id="form-tbl-num" class="form-control" required placeholder="e.g. T9, VIP-1" value="${isEdit ? tbl.number : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Max Seating Capacity (Pax)</label>
            <input type="number" id="form-tbl-cap" class="form-control" required min="1" max="20" value="${isEdit ? tbl.capacity : '4'}">
          </div>
          <div class="form-group">
            <label class="form-label">Initial Seating Status</label>
            <select id="form-tbl-status" class="form-control">
              <option value="available" ${isEdit && tbl.status === 'available' ? 'selected' : ''}>Available</option>
              <option value="occupied" ${isEdit && tbl.status === 'occupied' ? 'selected' : ''}>Occupied</option>
              <option value="reserved" ${isEdit && tbl.status === 'reserved' ? 'selected' : ''}>Reserved</option>
              <option value="cleaning" ${isEdit && tbl.status === 'cleaning' ? 'selected' : ''}>Cleaning</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-save-table-item">Save Settings</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-save-table-item").addEventListener("click", () => {
      const number = document.getElementById("form-tbl-num").value.trim();
      const capacity = parseInt(document.getElementById("form-tbl-cap").value) || 4;
      const status = document.getElementById("form-tbl-status").value;

      if (!number) {
        app.showToast("Please enter a table label.", "warning");
        return;
      }

      const payload = { 
        number, 
        capacity, 
        status,
        branchId: isEdit ? tbl.branchId : currentBranch 
      };

      if (isEdit) {
        db.update("tables", tbl.id, payload);
        app.showToast(`Updated table ${number} configurations.`, "success");
      } else {
        // Avoid duplicate table numbers per branch
        const exists = db.get("tables").find(t => t.branchId === currentBranch && t.number.toLowerCase() === number.toLowerCase());
        if (exists) {
          app.showToast(`A table labeled "${number}" already exists in this branch.`, "warning");
          return;
        }
        db.insert("tables", payload);
        app.showToast(`Table ${number} added to seating grid.`, "success");
      }

      app.closeModal();
      this.renderTablesGrid();
    });
  }
};

TablesModule.init();
