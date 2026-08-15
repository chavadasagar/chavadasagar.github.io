/**
 * orders.js - Order Management and Order Builder Flow (Multi-branch & Permissions updated)
 */

const OrdersModule = {
  // Cart state
  cart: [],
  orderType: 'dine_in',
  tableId: null,
  customerPhone: '',
  editingOrderId: null,

  init() {
    // Router events
    window.addEventListener("render-section:orders", () => this.renderOrdersList());
    window.addEventListener("render-section:order-builder", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to create orders.", "warning");
        app.routeTo("orders");
        return;
      }
      this.initOrderBuilder();
    });

    // Bind orders status filters
    const statusFilters = document.getElementById("order-status-filters");
    statusFilters.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      statusFilters.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      this.renderOrdersList(btn.dataset.status);
    });

    // Start order buttons redirects
    document.getElementById("btn-start-order-flow").addEventListener("click", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to create orders.", "warning");
        return;
      }
      this.editingOrderId = null;
      app.routeTo("order-builder");
    });
  },

  // Renders the summary listing table
  renderOrdersList(filterStatus = "all") {
    app.enforcePermission("orders");

    const tableBody = document.querySelector("#orders-list-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => currentBranch === "all" || o.branchId === currentBranch);
    const tables = db.get("tables");
    const branches = db.get("branches");

    // Sort: pending first, then newest
    const sortedOrders = [...orders].sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const filteredOrders = filterStatus === "all" 
      ? sortedOrders 
      : sortedOrders.filter(o => o.status === filterStatus);

    if (filteredOrders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center" style="color: var(--text-muted); padding: 2rem;">No orders registered.</td></tr>`;
      return;
    }

    const hasFullAccess = app.checkPermission("orders", "full");

    filteredOrders.forEach(ord => {
      // Find source / label
      let sourceLabel = "";
      if (ord.type === "dine_in") {
        const tbl = tables.find(t => t.id === ord.tableId);
        sourceLabel = `Dine-In (${tbl ? tbl.number : 'Unknown Table'})`;
      } else if (ord.type === "takeaway") {
        sourceLabel = "Takeaway";
      } else if (ord.type === "delivery") {
        sourceLabel = "Home Delivery";
      }

      // If "All Branches" view, add branch name label
      const branch = branches.find(b => b.id === ord.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      // Lookup customer details from phone
      let customerName = '<span style="color: var(--text-muted); font-size: 0.85rem;">Walk-in Guest</span>';
      if (ord.customerPhone) {
        const customers = db.get("customers");
        const matched = customers.find(c => c.phone === ord.customerPhone);
        if (matched) {
          customerName = `<strong style="color: var(--text-primary);">${matched.name}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${ord.customerPhone}</span>`;
        } else {
          customerName = `<strong style="color: var(--text-secondary);">Guest Guest</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${ord.customerPhone}</span>`;
        }
      }

      // Count items
      const qtySum = ord.items.reduce((sum, item) => sum + item.quantity, 0);

      // Status Badge config
      let badgeType = "neutral";
      if (ord.status === "pending") badgeType = "danger";
      if (ord.status === "preparing") badgeType = "warning";
      if (ord.status === "ready") badgeType = "info";
      if (ord.status === "served") badgeType = "success";
      if (ord.status === "completed") badgeType = "success";
      if (ord.status === "cancelled") badgeType = "neutral";

      const tr = document.createElement("tr");
      tr.dataset.orderId = ord.id;
      tr.innerHTML = `
        <td style="font-weight: 700;">${ord.orderNo}</td>
        <td style="text-transform: capitalize;">${ord.type.replace('_', ' ')} ${branchBadge}</td>
        <td>${sourceLabel}</td>
        <td>${customerName}</td>
        <td>${qtySum} items</td>
        <td style="font-weight: 700; color: var(--color-primary);">${app.formatCurrency(ord.total)}</td>
        <td><span class="badge badge-${badgeType}">${ord.status}</span></td>
        <td style="font-size:0.8rem; color:var(--text-secondary);">${new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm btn-view-details">Details</button>
            ${ord.status !== "completed" && ord.status !== "cancelled" && hasFullAccess ? `<button class="btn btn-secondary btn-sm btn-edit-order">Edit</button>` : ''}
            ${ord.status !== "completed" && ord.status !== "cancelled" && hasFullAccess ? `<button class="btn btn-danger btn-sm btn-cancel-order">Cancel</button>` : ''}
          </div>
        </td>
      `;

      // Actions bindings
      tr.querySelector(".btn-view-details").addEventListener("click", () => this.showOrderDetailsModal(ord.id));
      
      if (hasFullAccess) {
        const editBtn = tr.querySelector(".btn-edit-order");
        if (editBtn) {
          editBtn.addEventListener("click", () => {
            this.editingOrderId = ord.id;
            app.routeTo("order-builder");
          });
        }

        const cancelBtn = tr.querySelector(".btn-cancel-order");
        if (cancelBtn) {
          cancelBtn.addEventListener("click", () => this.cancelOrderFlow(ord.id));
        }
      }

      tableBody.appendChild(tr);
    });
  },

  // Dialog showing detailed order breakdown
  showOrderDetailsModal(orderId) {
    const orders = db.get("orders");
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const tables = db.get("tables");
    const tbl = tables.find(t => t.id === ord.tableId);
    const sourceLabel = ord.type === "dine_in" 
      ? `Dine-In (${tbl ? tbl.number : 'Unknown'})` 
      : ord.type === "takeaway" ? 'Takeaway' : 'Delivery';

    const itemsHTML = ord.items.map(item => `
      <div style="display:flex; justify-content:space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-light); font-size:0.95rem;">
        <div>
          <strong style="color:var(--text-primary);">${item.name}</strong>
          ${item.addons && item.addons.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-muted);">Addons: ${item.addons.join(', ')}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <span>${item.quantity} x ${app.formatCurrency(item.price)}</span>
          <div style="font-weight:700; color:var(--color-primary);">${app.formatCurrency(item.quantity * item.price)}</div>
        </div>
      </div>
    `).join('');

    // Access checks
    const hasBillingAccess = app.checkPermission("billing", "view");
    const hasFullOrdersAccess = app.checkPermission("orders", "full");

    const modalHTML = `
      <div class="modal-header">
        <h3>Order Details: ${ord.orderNo}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row mb-3" style="font-size: 0.9rem; color:var(--text-secondary);">
          <div>
            <strong>Type:</strong> <span style="text-transform: capitalize;">${ord.type}</span> (${sourceLabel})<br>
            <strong>Status:</strong> <span style="text-transform: uppercase; font-weight:700;">${ord.status}</span>
          </div>
          <div style="text-align: right;">
            <strong>Logged On:</strong> ${new Date(ord.createdAt).toLocaleString()}<br>
            ${ord.customerPhone ? `<strong>Customer CRM:</strong> ${ord.customerPhone}` : ''}
          </div>
        </div>

        <div style="border-top:1px solid var(--border-light); border-bottom:1px solid var(--border-light); padding: 0.5rem 0; max-height:260px; overflow-y:auto;">
          ${itemsHTML}
        </div>

        <!-- Calculations Summary -->
        <div class="mt-3" style="width: 100%; max-width: 280px; margin-left: auto; font-size:0.9rem; display:flex; flex-direction:column; gap:0.4rem;">
          <div class="d-flex justify-content-between">
            <span>Subtotal:</span>
            <span>${app.formatCurrency(ord.subtotal)}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>Tax (${ord.taxPercent}%):</span>
            <span>${app.formatCurrency(ord.tax)}</span>
          </div>
          ${ord.discount > 0 ? `
          <div class="d-flex justify-content-between" style="color:var(--color-success); font-weight:600;">
            <span>Discount Applied:</span>
            <span>-${app.formatCurrency(ord.discount)}</span>
          </div>` : ''}
          <div class="d-flex justify-content-between grand-total" style="font-size:1.1rem; font-weight:700; color:var(--color-primary); border-top:1px solid var(--border-light); padding-top:0.4rem;">
            <span>Grand Total:</span>
            <span>${app.formatCurrency(ord.total)}</span>
          </div>
        </div>

        ${ord.cancelReason ? `
        <div style="background-color: var(--color-danger-light); padding:0.75rem; border-radius:6px; margin-top:1rem; border-left:4px solid var(--color-danger);">
          <strong style="color: var(--color-danger); display:block; font-size:0.85rem;">Cancellation Reason:</strong>
          <span style="font-size:0.9rem;">${ord.cancelReason}</span>
        </div>` : ''}
      </div>
      <div class="modal-footer">
        ${ord.status === "ready" && ord.type === "dine_in" && hasFullOrdersAccess
          ? `<button class="btn btn-success" id="modal-details-serve">Mark Served</button>` 
          : ''}
        ${ord.status !== "completed" && ord.status !== "cancelled" && hasBillingAccess
          ? `<button class="btn btn-primary" id="modal-details-checkout">Go to Billing Checkout</button>` 
          : ''}
        <button class="btn btn-secondary" data-dismiss="modal">Close</button>
      </div>
    `;

    app.showModal(modalHTML);

    // Serve Action
    const serveBtn = document.getElementById("modal-details-serve");
    if (serveBtn) {
      serveBtn.addEventListener("click", () => {
        db.update("orders", ord.id, { status: "served" });
        app.showToast(`Order ${ord.orderNo} served.`, "success");
        app.closeModal();
        this.renderOrdersList();
      });
    }

    // Checkout Action
    const checkoutBtn = document.getElementById("modal-details-checkout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        app.closeModal();
        localStorage.setItem("selectedBranchId", ord.branchId);
        window.location.hash = "billing";
        setTimeout(() => {
          const payOrderBtn = document.querySelector(`#billing-pending-orders-table tr[data-order-id="${ord.id}"] .btn-checkout-pay`);
          if (payOrderBtn) payOrderBtn.click();
        }, 150);
      });
    }
  },

  // Cancel order flow requiring reason
  cancelOrderFlow(orderId) {
    const orders = db.get("orders");
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const reason = prompt(`Reason for cancelling order "${ord.orderNo}":`);
    if (reason === null) return;
    
    const cancelReason = reason.trim() || "No reasons specified.";

    db.update("orders", orderId, { status: "cancelled", cancelReason });
    
    if (ord.type === "dine_in" && ord.tableId) {
      db.update("tables", ord.tableId, { status: "available" });
    }

    app.showToast(`Order ${ord.orderNo} cancelled.`, "danger");
    this.renderOrdersList();
  },

  // ==========================================
  // ============ ORDER BUILDER =============
  // ==========================================
  
  initOrderBuilder() {
    this.cart = [];
    this.orderType = 'dine_in';
    this.tableId = null;
    this.customerPhone = '';
    
    const currentBranch = db.getCurrentBranch();
    const tables = db.get("tables").filter(t => t.branchId === currentBranch);
    const activeOrders = db.get("orders").filter(o => o.branchId === currentBranch && o.status !== "completed" && o.status !== "cancelled");

    // Populate order form selectors
    const typeSelect = document.getElementById("order-type-select");
    const extraForm = document.getElementById("order-type-extra-form");
    const tblFields = document.getElementById("builder-dine-in-fields");
    const tblSelect = document.getElementById("builder-table-select");
    const phoneInput = document.getElementById("builder-customer-phone");
    const crmLbl = document.getElementById("builder-customer-matched-lbl");
    
    phoneInput.value = "";
    crmLbl.textContent = "";

    // Fill table dropdown with Available tables + current table if editing
    const populateTables = () => {
      tblSelect.innerHTML = '<option value="">-- Choose Table --</option>';
      tables.forEach(t => {
        const hasActiveOrder = activeOrders.some(o => o.tableId === t.id && (!this.editingOrderId || o.id !== this.editingOrderId));
        if (t.status === "available" || (t.status === "occupied" && this.editingOrderId && this.tableId === t.id) || !hasActiveOrder) {
          const opt = document.createElement("option");
          opt.value = t.id;
          opt.textContent = `${t.number} (Pax: ${t.capacity})`;
          tblSelect.appendChild(opt);
        }
      });
    };

    if (this.editingOrderId) {
      const editOrder = db.get("orders").find(o => o.id === this.editingOrderId);
      if (editOrder) {
        this.orderType = editOrder.type;
        this.tableId = editOrder.tableId;
        this.customerPhone = editOrder.customerPhone || "";
        
        this.cart = editOrder.items.map(item => ({
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          variant: item.variant,
          addons: item.addons,
          price: item.price
        }));

        typeSelect.value = editOrder.type;
        phoneInput.value = editOrder.customerPhone || "";
        if (editOrder.customerPhone) {
          const cust = db.get("customers").find(c => c.phone === editOrder.customerPhone);
          if (cust) crmLbl.textContent = `Matched Guest: ${cust.name} (${cust.loyaltyPoints} Points)`;
        }
      }
    }

    populateTables();

    const updateTypeUI = () => {
      const type = typeSelect.value;
      this.orderType = type;
      if (type === "dine_in") {
        tblFields.style.display = "block";
      } else {
        tblFields.style.display = "none";
        this.tableId = null;
      }
    };

    typeSelect.addEventListener("change", updateTypeUI);
    updateTypeUI();

    if (this.tableId) {
      tblSelect.value = this.tableId;
    }
    tblSelect.addEventListener("change", (e) => {
      this.tableId = e.target.value;
    });

    // CRM Lookup
    phoneInput.addEventListener("input", (e) => {
      const phone = e.target.value.trim();
      this.customerPhone = phone;
      if (phone.length >= 10) {
        const custs = db.get("customers");
        const found = custs.find(c => c.phone === phone);
        if (found) {
          crmLbl.textContent = `Matched Guest: ${found.name} (${found.loyaltyPoints} Points)`;
        } else {
          crmLbl.textContent = "New customer profile will be created.";
        }
      } else {
        crmLbl.textContent = "";
      }
    });

    this.renderBuilderCategories();
    this.renderBuilderMenuItems();

    document.getElementById("order-menu-search").addEventListener("input", () => this.renderBuilderMenuItems());
    document.getElementById("order-menu-veg-filter").addEventListener("change", () => this.renderBuilderMenuItems());

    document.getElementById("btn-builder-cancel").onclick = () => {
      if (confirm("Discard all changes?")) {
        this.editingOrderId = null;
        app.routeTo("orders");
      }
    };

    document.getElementById("btn-builder-submit").onclick = () => this.submitPlacedOrder();

    this.calculateCartTotals();
  },

  renderBuilderCategories() {
    const tabWrapper = document.getElementById("order-category-tabs");
    tabWrapper.innerHTML = `<div class="category-tab active" data-cat="all">All Items</div>`;
    
    const currentBranch = db.getCurrentBranch();
    const categories = db.get("categories").filter(c => c.branchId === currentBranch);
    
    categories.forEach(cat => {
      const tab = document.createElement("div");
      tab.className = "category-tab";
      tab.dataset.cat = cat.id;
      tab.textContent = cat.name;
      tab.onclick = () => {
        tabWrapper.querySelectorAll(".category-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this.renderBuilderMenuItems();
      };
      tabWrapper.appendChild(tab);
    });
  },

  renderBuilderMenuItems() {
    const grid = document.getElementById("order-menu-items-grid");
    grid.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const items = db.get("menu").filter(i => i.branchId === currentBranch && i.isAvailable);
    const searchVal = document.getElementById("order-menu-search").value.toLowerCase().trim();
    const vegOnly = document.getElementById("order-menu-veg-filter").checked;
    
    const activeTab = document.querySelector("#order-category-tabs .category-tab.active");
    const activeCatId = activeTab ? activeTab.dataset.cat : "all";

    const filtered = items.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchVal);
      const matchVeg = !vegOnly || item.isVeg;
      const matchCat = activeCatId === "all" || item.categoryId === activeCatId;
      return matchSearch && matchVeg && matchCat;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">No items match.</div>`;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "menu-item-card";
      card.innerHTML = `
        <span class="menu-item-tag ${item.isVeg ? 'veg' : 'nonveg'}"></span>
        <div class="menu-item-image">${item.image || '🍽️'}</div>
        <div class="menu-item-name">${item.name}</div>
        <div class="menu-item-price">${app.formatCurrency(item.basePrice)}</div>
      `;

      card.onclick = () => this.addItemToCartFlow(item);
      grid.appendChild(card);
    });
  },

  addItemToCartFlow(item) {
    const hasVariants = item.variants && item.variants.length > 0;
    const hasAddons = item.addons && item.addons.length > 0;

    if (!hasVariants && !hasAddons) {
      this.pushToCart(item.id, item.name, item.basePrice);
      return;
    }

    const modalHTML = `
      <div class="modal-header">
        <h3>Choose Options: ${item.name}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="item-options-form">
          ${hasVariants ? `
          <div class="form-group">
            <label class="form-label">Select Variant/Portion</label>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${item.variants.map((v, i) => `
                <label class="form-check">
                  <input type="radio" name="opt-variant" value="${v.name}" data-price="${v.price}" ${i === 0 ? 'checked' : ''}>
                  ${v.name} (${app.formatCurrency(v.price)})
                </label>
              `).join('')}
            </div>
          </div>` : ''}

          ${hasAddons ? `
          <div class="form-group" style="margin-top:1.25rem;">
            <label class="form-label">Add-ons / Modifiers</label>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${item.addons.map(a => `
                <label class="form-check">
                  <input type="checkbox" name="opt-addon" value="${a.name}" data-price="${a.price}">
                  + ${a.name} (${app.formatCurrency(a.price)})
                </label>
              `).join('')}
            </div>
          </div>` : ''}
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-modal-add-to-cart">Add to Order</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-modal-add-to-cart").addEventListener("click", () => {
      let finalPrice = item.basePrice;
      let finalName = item.name;
      let variantName = null;
      const selectedAddons = [];

      if (hasVariants) {
        const rad = document.querySelector('input[name="opt-variant"]:checked');
        if (rad) {
          variantName = rad.value;
          finalPrice = parseFloat(rad.dataset.price);
          finalName = `${item.name} (${variantName})`;
        }
      }

      if (hasAddons) {
        const checkboxes = document.querySelectorAll('input[name="opt-addon"]:checked');
        checkboxes.forEach(cb => {
          selectedAddons.push(cb.value);
          finalPrice += parseFloat(cb.dataset.price);
        });
      }

      this.pushToCart(item.id, finalName, finalPrice, variantName, selectedAddons);
      app.closeModal();
    });
  },

  pushToCart(itemId, name, price, variant = null, addons = []) {
    const existing = this.cart.find(c => 
      c.itemId === itemId && 
      c.variant === variant && 
      JSON.stringify(c.addons.sort()) === JSON.stringify(addons.sort())
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({ itemId, name, quantity: 1, variant, addons, price });
    }

    app.showToast(`Added ${name} to order.`, "success");
    this.calculateCartTotals();
  },

  calculateCartTotals() {
    const list = document.getElementById("builder-cart-items-list");
    list.innerHTML = "";

    if (this.cart.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.9rem;">Cart is empty.</div>`;
      document.getElementById("builder-subtotal").textContent = "₹0.00";
      document.getElementById("builder-tax").textContent = "₹0.00";
      document.getElementById("builder-grand-total").textContent = "₹0.00";
      return;
    }

    let subtotal = 0;

    this.cart.forEach((item, index) => {
      const itemCost = item.price * item.quantity;
      subtotal += itemCost;

      const row = document.createElement("div");
      row.className = "cart-item-row";
      row.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div style="font-weight:700;">${app.formatCurrency(itemCost)}</div>
        </div>
        ${item.addons && item.addons.length > 0 ? `<div class="cart-item-details-sub">Addons: ${item.addons.join(', ')}</div>` : ''}
        <div class="cart-item-controls">
          <span style="font-size:0.8rem; color:var(--text-secondary);">${app.formatCurrency(item.price)} each</span>
          <div class="qty-control">
            <button class="qty-btn btn-qty-dec">-</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn btn-qty-inc">+</button>
          </div>
        </div>
      `;

      row.querySelector(".btn-qty-dec").addEventListener("click", () => {
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          this.cart.splice(index, 1);
        }
        this.calculateCartTotals();
      });

      row.querySelector(".btn-qty-inc").addEventListener("click", () => {
        item.quantity += 1;
        this.calculateCartTotals();
      });

      list.appendChild(row);
    });

    const taxPercent = app.settings.taxPercent;
    const taxValue = (subtotal * taxPercent) / 100;
    const grandTotal = subtotal + taxValue;

    document.getElementById("builder-subtotal").textContent = app.formatCurrency(subtotal);
    document.getElementById("builder-tax-label").textContent = `Tax (${taxPercent}%)`;
    document.getElementById("builder-tax").textContent = app.formatCurrency(taxValue);
    document.getElementById("builder-grand-total").textContent = app.formatCurrency(grandTotal);
  },

  submitPlacedOrder() {
    if (this.cart.length === 0) {
      app.showToast("Cannot place order. Cart is empty.", "warning");
      return;
    }

    if (this.orderType === "dine_in" && !this.tableId) {
      app.showToast("Please choose a table for Dine-in order.", "warning");
      return;
    }

    const currentBranch = db.getCurrentBranch();

    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxPercent = app.settings.taxPercent;
    const tax = (subtotal * taxPercent) / 100;
    const total = subtotal + tax;

    if (this.customerPhone && this.customerPhone.length >= 10) {
      const customers = db.get("customers");
      const exists = customers.find(c => c.phone === this.customerPhone);
      if (!exists) {
        const defaultName = prompt(`Enter name for new customer phone "${this.customerPhone}":`, "Guest Customer");
        const finalName = defaultName ? defaultName.trim() : "Walk-in Guest";
        db.insert("customers", { name: finalName, phone: this.customerPhone, loyaltyPoints: 0 });
        app.showToast(`Registered new customer profile: ${finalName}!`, "success");
      }
    }

    const payload = {
      type: this.orderType,
      tableId: this.tableId,
      customerPhone: this.customerPhone || null,
      items: this.cart,
      subtotal,
      taxPercent,
      tax,
      discount: 0,
      total,
      deliveryAgentId: null,
      deliveryStatus: null,
      branchId: this.editingOrderId ? db.get("orders").find(o => o.id === this.editingOrderId).branchId : currentBranch
    };

    if (this.editingOrderId) {
      const original = db.get("orders").find(o => o.id === this.editingOrderId);
      payload.orderNo = original.orderNo;
      
      // Reset status to pending if items or quantities changed so KOT updates
      const itemsChanged = JSON.stringify(original.items) !== JSON.stringify(this.cart);
      payload.status = itemsChanged ? "pending" : original.status;
      payload.createdAt = original.createdAt;
      
      if (original.type === "dine_in" && original.tableId !== this.tableId) {
        db.update("tables", original.tableId, { status: "available" });
      }

      db.update("orders", this.editingOrderId, payload);
      app.showToast(`Updated order ${payload.orderNo}.`, "success");
    } else {
      let orderNo = `ORD-${Date.now().toString().slice(-4)}`;
      payload.orderNo = orderNo;
      payload.status = "pending";
      payload.createdAt = new Date().toISOString();
      db.insert("orders", payload);
      app.showToast(`Order ${orderNo} created! sent to kitchen.`, "success");
    }

    if (this.orderType === "dine_in" && this.tableId) {
      db.update("tables", this.tableId, { status: "occupied" });
    }

    this.editingOrderId = null;
    app.routeTo("orders");
  }
};

OrdersModule.init();
