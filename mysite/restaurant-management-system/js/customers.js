/**
 * customers.js - Customer CRM database & orders logs
 */

const CustomersModule = {
  init() {
    window.addEventListener("render-section:customers", () => this.renderCustomersList());
    
    // Bind search and create buttons
    document.getElementById("customer-crm-search").addEventListener("input", (e) => {
      this.renderCustomersList(e.target.value);
    });

    document.getElementById("btn-add-customer-modal").addEventListener("click", () => {
      this.showCustomerModal();
    });
  },

  // Renders the CRM list
  renderCustomersList(searchQuery = "") {
    const tableBody = document.querySelector("#customers-crm-table tbody");
    tableBody.innerHTML = "";

    const customers = db.get("customers");
    const orders = db.get("orders");

    const query = searchQuery.toLowerCase().trim();
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.includes(query)
    );

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--text-muted); padding: 2rem;">No customer records match query.</td></tr>`;
      return;
    }

    filtered.forEach(cust => {
      // Find matches in orders
      const custOrders = orders.filter(o => o.customerPhone === cust.phone);
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600;">${cust.name}</td>
        <td>${cust.phone}</td>
        <td>${custOrders.length} orders</td>
        <td style="font-weight:700; color:var(--color-primary);">${cust.loyaltyPoints} pts</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm btn-view-history">Order History</button>
            <button class="btn btn-secondary btn-sm btn-edit">Edit</button>
            <button class="btn btn-danger btn-sm btn-delete">Remove</button>
          </div>
        </td>
      `;

      // Bind actions
      tr.querySelector(".btn-view-history").addEventListener("click", () => this.showCustomerHistoryModal(cust));
      tr.querySelector(".btn-edit").addEventListener("click", () => this.showCustomerModal(cust.id));
      tr.querySelector(".btn-delete").addEventListener("click", () => this.deleteCustomer(cust.id));

      tableBody.appendChild(tr);
    });
  },

  // Removes customer profile
  deleteCustomer(id) {
    const cust = db.get("customers").find(c => c.id === id);
    if (!cust) return;

    if (confirm(`Are you sure you want to delete profile for "${cust.name}"?`)) {
      db.delete("customers", id);
      app.showToast(`Removed CRM profile: ${cust.name}`, "danger");
      this.renderCustomersList();
    }
  },

  // Modal dialog to add/edit guest profiles
  showCustomerModal(custId = null) {
    const isEdit = !!custId;
    const cust = isEdit ? db.get("customers").find(c => c.id === custId) : null;

    const modalHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Customer Profile' : 'Add New Customer'}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="customer-form">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="cust-form-name" class="form-control" required placeholder="e.g. John Doe" value="${isEdit ? cust.name : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number (10 digits)</label>
            <input type="text" id="cust-form-phone" class="form-control" required placeholder="9876543210" value="${isEdit ? cust.phone : ''}">
          </div>
          ${isEdit ? `
          <div class="form-group">
            <label class="form-label">Loyalty Points Balance</label>
            <input type="number" id="cust-form-points" class="form-control" required value="${cust.loyaltyPoints}" min="0">
          </div>` : ''}
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-save-customer">Save Profile</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-save-customer").addEventListener("click", () => {
      const name = document.getElementById("cust-form-name").value.trim();
      const phone = document.getElementById("cust-form-phone").value.trim();
      
      if (!name || phone.length < 10) {
        app.showToast("Please enter name and a valid 10 digit phone number.", "warning");
        return;
      }

      const payload = { name, phone };
      if (isEdit) {
        payload.loyaltyPoints = parseInt(document.getElementById("cust-form-points").value) || 0;
        db.update("customers", cust.id, payload);
        app.showToast(`Updated profile for ${name}`, "success");
      } else {
        // Prevent duplicate phones
        const exists = db.get("customers").find(c => c.phone === phone);
        if (exists) {
          app.showToast(`A profile with phone "${phone}" already exists.`, "warning");
          return;
        }
        db.insert("customers", { ...payload, loyaltyPoints: 0 });
        app.showToast(`Created profile for ${name}!`, "success");
      }

      app.closeModal();
      this.renderCustomersList();
    });
  },

  // Modal displaying lifetime metrics and orders summary
  showCustomerHistoryModal(cust) {
    const orders = db.get("orders").filter(o => o.customerPhone === cust.phone);
    
    // Calculate spend metrics
    const completedOrders = orders.filter(o => o.status === "completed");
    const lifetimeSpend = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const avgSpend = completedOrders.length > 0 ? lifetimeSpend / completedOrders.length : 0;

    const listHTML = orders.length > 0 
      ? orders.map(o => `
        <div style="padding:0.75rem; border:1px solid var(--border-light); border-radius:8px; margin-bottom:0.5rem; font-size:0.85rem;">
          <div class="d-flex justify-content-between mb-1">
            <strong>${o.orderNo}</strong>
            <span class="badge badge-${o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'neutral' : 'warning'}">${o.status}</span>
          </div>
          <div class="d-flex justify-content-between text-muted" style="font-size:0.75rem;">
            <span>Date: ${new Date(o.createdAt).toLocaleDateString()}</span>
            <span>Total: <strong>${app.formatCurrency(o.total)}</strong></span>
          </div>
        </div>
      `).join('')
      : '<div style="text-align:center; color:var(--text-muted); font-size:0.9rem; padding:2rem;">No orders registered in system for this phone.</div>';

    const modalHTML = `
      <div class="modal-header">
        <h3>Customer Profile & History: ${cust.name}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <!-- Dashboard metrics -->
        <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr); gap:1rem; margin-bottom:1.5rem;">
          <div class="stat-card" style="padding:0.75rem 1rem;">
            <div class="stat-details">
              <h3 style="font-size:0.7rem;">Visits</h3>
              <div class="value" style="font-size:1.25rem;">${orders.length}</div>
            </div>
          </div>
          <div class="stat-card" style="padding:0.75rem 1rem;">
            <div class="stat-details">
              <h3 style="font-size:0.7rem;">Total Spend</h3>
              <div class="value" style="font-size:1.25rem; color:var(--color-success);">${app.formatCurrency(lifetimeSpend)}</div>
            </div>
          </div>
          <div class="stat-card" style="padding:0.75rem 1rem;">
            <div class="stat-details">
              <h3 style="font-size:0.7rem;">Avg Bill</h3>
              <div class="value" style="font-size:1.25rem; color:var(--color-primary);">${app.formatCurrency(avgSpend)}</div>
            </div>
          </div>
        </div>

        <h4 style="margin-bottom:0.75rem; font-size:0.95rem; text-transform:uppercase;">Historical Orders Feed</h4>
        <div style="max-height:300px; overflow-y:auto; padding-right:0.25rem;">
          ${listHTML}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Close Diary</button>
      </div>
    `;

    app.showModal(modalHTML);
  }
};

CustomersModule.init();
