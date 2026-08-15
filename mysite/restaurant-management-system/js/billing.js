/**
 * billing.js - POS Invoice & Payment Processing (Multi-branch & Permissions updated)
 */

const BillingModule = {
  activeOrder: null,
  appliedCoupon: null,
  redeemedPoints: 0,
  paymentsList: [],
  remainingBalance: 0,

  init() {
    window.addEventListener("render-section:billing", () => this.renderPendingBills());
  },

  // Renders the summary list of orders requiring checkouts
  renderPendingBills() {
    app.enforcePermission("billing");

    const tableBody = document.querySelector("#billing-pending-orders-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => currentBranch === "all" || o.branchId === currentBranch);
    const tables = db.get("tables");
    const branches = db.get("branches");
    
    const pendingOrders = orders.filter(o => o.status !== "completed" && o.status !== "cancelled");

    if (pendingOrders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--text-muted); padding: 2rem;">No active orders pending checkout.</td></tr>`;
      return;
    }

    const hasFullAccess = app.checkPermission("billing", "full");

    pendingOrders.forEach(ord => {
      let sourceLabel = "";
      if (ord.type === "dine_in") {
        const tbl = tables.find(t => t.id === ord.tableId);
        sourceLabel = tbl ? tbl.number : 'Table';
      } else {
        sourceLabel = ord.type === "takeaway" ? 'Takeaway' : 'Delivery';
      }

      // If "All Branches" view, add branch name label
      const branch = branches.find(b => b.id === ord.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      const allPayments = db.get("payments");
      const paidAmt = allPayments
        .filter(p => p.orderId === ord.id)
        .reduce((sum, p) => sum + p.amount, 0);
      const remaining = ord.total - paidAmt;

      const tr = document.createElement("tr");
      tr.dataset.orderId = ord.id;
      tr.innerHTML = `
        <td style="font-weight:700;">${ord.orderNo}</td>
        <td style="text-transform: capitalize;">${ord.type} ${branchBadge}</td>
        <td>${sourceLabel}</td>
        <td style="font-size:0.85rem; color:var(--text-secondary);">${new Date(ord.createdAt).toLocaleTimeString()}</td>
        <td style="font-weight:600;">${app.formatCurrency(ord.total)}</td>
        <td style="font-weight:700; color:var(--color-danger);">${app.formatCurrency(remaining)}</td>
        <td>
          <button class="btn btn-success btn-sm btn-checkout-pay">Checkout / Record Pay</button>
        </td>
      `;

      tr.querySelector(".btn-checkout-pay").addEventListener("click", () => this.openCheckoutModal(ord));
      tableBody.appendChild(tr);
    });
  },

  // Open POS checkout wizard modal
  openCheckoutModal(order) {
    this.activeOrder = order;
    this.appliedCoupon = null;
    this.redeemedPoints = 0;
    
    const allPayments = db.get("payments");
    this.paymentsList = allPayments.filter(p => p.orderId === order.id);
    
    this.calculateCheckoutBreakdown();
  },

  calculateCheckoutBreakdown() {
    const ord = this.activeOrder;
    const subtotal = ord.subtotal;
    const taxValue = ord.tax;
    
    let discount = 0;
    let couponDeduction = 0;
    if (this.appliedCoupon) {
      if (this.appliedCoupon.type === "flat") {
        couponDeduction = this.appliedCoupon.value;
      } else {
        couponDeduction = (subtotal * this.appliedCoupon.value) / 100;
      }
      discount += couponDeduction;
    }

    let pointsDeduction = 0;
    if (this.redeemedPoints > 0) {
      pointsDeduction = this.redeemedPoints;
      discount += pointsDeduction;
    }

    const netTotal = Math.max(0, subtotal + taxValue - discount);
    const totalPaidSoFar = this.paymentsList.reduce((sum, p) => sum + p.amount, 0);
    this.remainingBalance = Math.max(0, netTotal - totalPaidSoFar);

    const customer = ord.customerPhone ? db.get("customers").find(c => c.phone === ord.customerPhone) : null;
    
    const itemsHTML = ord.items.map(item => `
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:0.25rem 0; border-bottom:1px solid var(--color-neutral-light);">
        <span>${item.name} x${item.quantity}</span>
        <span>${app.formatCurrency(item.price * item.quantity)}</span>
      </div>
    `).join('');

    const paymentsHTML = this.paymentsList.length > 0 
      ? this.paymentsList.map(p => `
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:0.2/rem 0; color:var(--color-success);">
          <span>Paid via ${p.method.toUpperCase()}</span>
          <span>${app.formatCurrency(p.amount)}</span>
        </div>
      `).join('')
      : '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center;">No payments recorded.</div>';

    const hasFullAccess = app.checkPermission("billing", "full");

    const modalHTML = `
      <div class="modal-header">
        <h3>POS Billing Checkout: ${ord.orderNo}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body form-row" style="grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start;">
        
        <div>
          <h4 style="margin-bottom:0.75rem; font-size:0.95rem; text-transform:uppercase;">Bill Invoice</h4>
          <div class="card" style="padding:1rem; background-color:#fafafa;">
            <div style="max-height:150px; overflow-y:auto; margin-bottom:0.75rem; border-bottom:1px dashed var(--border-light); padding-bottom:0.5rem;">
              ${itemsHTML}
            </div>
            
            <div style="display:flex; flex-direction:column; gap:0.35rem; font-size:0.85rem;">
              <div class="d-flex justify-content-between">
                <span>Subtotal:</span>
                <span>${app.formatCurrency(subtotal)}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Tax (${ord.taxPercent}%):</span>
                <span>${app.formatCurrency(taxValue)}</span>
              </div>
              ${couponDeduction > 0 ? `
              <div class="d-flex justify-content-between" style="color:var(--color-success); font-weight:600;">
                <span>Coupon (${this.appliedCoupon.code}):</span>
                <span>-${app.formatCurrency(couponDeduction)}</span>
              </div>` : ''}
              ${pointsDeduction > 0 ? `
              <div class="d-flex justify-content-between" style="color:var(--color-success); font-weight:600;">
                <span>Redeemed Loyalty:</span>
                <span>-${app.formatCurrency(pointsDeduction)}</span>
              </div>` : ''}
              
              <div class="d-flex justify-content-between grand-total" style="font-size:1.05rem; font-weight:700; color:var(--color-primary); border-top:1px dashed var(--border-light); padding-top:0.4rem; margin-top:0.25rem;">
                <span>Net Total:</span>
                <span>${app.formatCurrency(netTotal)}</span>
              </div>
            </div>
          </div>

          <h4 style="margin-bottom:0.5rem; font-size:0.95rem; text-transform:uppercase; margin-top:1rem;">Payments History</h4>
          <div class="card" style="padding:0.75rem;">
            ${paymentsHTML}
          </div>
        </div>

        <div>
          <!-- Apply Coupons -->
          <div class="form-group">
            <label class="form-label" style="font-size:0.85rem;">Apply Promotion Coupon</label>
            <div class="d-flex gap-2">
              <input type="text" id="chk-coupon-input" class="form-control" placeholder="WELCOME50" style="padding:0.4rem 0.6rem; font-size:0.9rem;" value="${this.appliedCoupon ? this.appliedCoupon.code : ''}" ${!hasFullAccess ? 'disabled' : ''}>
              <button class="btn btn-secondary btn-sm" id="btn-chk-apply-coupon" ${!hasFullAccess ? 'disabled' : ''}>Apply</button>
            </div>
            <small id="chk-coupon-matched-lbl" style="display:block; font-size:0.75rem; margin-top:0.2rem; font-weight:600;"></small>
          </div>

          <!-- CRM Loyalty Points -->
          ${customer ? `
          <div class="form-group" style="background-color: var(--color-info-light); padding:0.75rem; border-radius:6px; margin-bottom:1.25rem;">
            <label class="form-check" style="font-size:0.85rem; font-weight:600; color:var(--color-info);">
              <input type="checkbox" id="chk-redeem-loyalty" ${this.redeemedPoints > 0 ? 'checked' : ''} ${!hasFullAccess ? 'disabled' : ''}>
              Redeem Loyalty points
            </label>
            <span style="font-size:0.75rem; display:block; color:var(--text-secondary); margin-top:0.2rem;">
              Available Points: <strong>${customer.loyaltyPoints}</strong> (Redeemable for ${app.formatCurrency(customer.loyaltyPoints)})
            </span>
          </div>` : ''}

          <!-- Make a Payment -->
          <div class="card" style="padding:1rem; border-color:var(--color-primary-light);">
            <h4 style="font-size:0.9rem; margin-bottom:0.75rem; color:var(--color-primary);">Record POS Payment</h4>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" style="font-size:0.75rem;">Payment Mode</label>
                <select id="chk-pay-method" class="form-control" style="padding:0.4rem 0.5rem; font-size:0.85rem;" ${!hasFullAccess ? 'disabled' : ''}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI / QR Scan</option>
                  <option value="wallet">Wallet</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:0.75rem;">Amount to Pay</label>
                <input type="number" id="chk-pay-amount" class="form-control" style="padding:0.4rem 0.5rem; font-size:0.85rem;" min="0.01" step="0.01" value="${this.remainingBalance.toFixed(2)}" ${!hasFullAccess ? 'disabled' : ''}>
              </div>
            </div>
            
            <button class="btn btn-primary btn-sm w-100" id="btn-chk-add-payment" ${!hasFullAccess ? 'disabled' : ''}>Record Payment Entry</button>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-3" style="font-size:0.95rem;">
            <span>Remaining Balance:</span>
            <strong style="font-size:1.15rem; color:${this.remainingBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
              ${app.formatCurrency(this.remainingBalance)}
            </strong>
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="btn-chk-print"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print Receipt</button>
        <button class="btn btn-success" id="btn-chk-complete" ${this.remainingBalance > 0 || !hasFullAccess ? 'disabled' : ''}>Complete & Finalize Order</button>
      </div>
    `;

    app.showModal(modalHTML);

    const couponMatLbl = document.getElementById("chk-coupon-matched-lbl");
    if (this.appliedCoupon) {
      couponMatLbl.textContent = `Applied discount of ${this.appliedCoupon.type === "flat" ? app.formatCurrency(this.appliedCoupon.value) : this.appliedCoupon.value + "%"}`;
      couponMatLbl.style.color = "var(--color-success)";
    }

    if (hasFullAccess) {
      document.getElementById("btn-chk-apply-coupon").addEventListener("click", () => {
        const code = document.getElementById("chk-coupon-input").value.toUpperCase().trim();
        if (!code) {
          this.appliedCoupon = null;
          couponMatLbl.textContent = "";
          this.calculateCheckoutBreakdown();
          return;
        }

        const coupons = db.get("coupons").filter(c => c.branchId === order.branchId); // validate branch coupon
        const matched = coupons.find(c => c.code === code && c.isActive);

        if (!matched) {
          couponMatLbl.textContent = "Invalid or inactive coupon for this branch.";
          couponMatLbl.style.color = "var(--color-danger)";
          this.appliedCoupon = null;
        } else {
          const nowStr = new Date().toISOString().slice(0, 10);
          if (nowStr < matched.validFrom || nowStr > matched.validTill) {
            couponMatLbl.textContent = "Coupon code is expired.";
            couponMatLbl.style.color = "var(--color-danger)";
            this.appliedCoupon = null;
          } else if (subtotal < matched.minOrderValue) {
            couponMatLbl.textContent = `Minimum order must be ${app.formatCurrency(matched.minOrderValue)}.`;
            couponMatLbl.style.color = "var(--color-danger)";
            this.appliedCoupon = null;
          } else {
            this.appliedCoupon = matched;
            app.showToast("Promo Coupon applied!", "success");
          }
        }
        this.calculateCheckoutBreakdown();
      });

      const loyaltyCheck = document.getElementById("chk-redeem-loyalty");
      if (loyaltyCheck) {
        loyaltyCheck.addEventListener("change", (e) => {
          if (e.target.checked && customer) {
            this.redeemedPoints = Math.min(customer.loyaltyPoints, subtotal + taxValue - couponDeduction);
            app.showToast(`Redeemed ${this.redeemedPoints} loyalty points.`, "success");
          } else {
            this.redeemedPoints = 0;
          }
          this.calculateCheckoutBreakdown();
        });
      }

      document.getElementById("btn-chk-add-payment").addEventListener("click", () => {
        const amountInput = document.getElementById("chk-pay-amount");
        const amount = parseFloat(amountInput.value);
        const method = document.getElementById("chk-pay-method").value;

        if (isNaN(amount) || amount <= 0) {
          app.showToast("Please input a valid payment amount.", "warning");
          return;
        }

        const payEntry = {
          orderId: ord.id,
          amount: Math.min(amount, this.remainingBalance),
          method,
          timestamp: new Date().toISOString()
        };

        db.insert("payments", payEntry);
        this.paymentsList.push(payEntry);
        app.showToast(`Recorded payment of ${app.formatCurrency(payEntry.amount)}`, "success");
        
        this.calculateCheckoutBreakdown();
      });

      document.getElementById("btn-chk-complete").addEventListener("click", () => {
        this.finalizeOrderCheckout(netTotal, discount);
      });
    }

    document.getElementById("btn-chk-print").addEventListener("click", () => {
      this.printThermalReceipt(netTotal, discount, couponDeduction, pointsDeduction);
    });
  },

  finalizeOrderCheckout(netTotal, totalDiscount) {
    const ord = this.activeOrder;
    
    // Deduct stock matching branchId boundary
    const menuItems = db.get("menu");
    const recipes = db.get("recipes").filter(r => r.branchId === ord.branchId);
    const inventory = db.get("inventory").filter(i => i.branchId === ord.branchId);

    ord.items.forEach(orderItem => {
      const ingredientMappings = recipes.filter(r => r.menuItemId === orderItem.itemId);
      
      ingredientMappings.forEach(recipeMap => {
        const totalQtyDeduct = recipeMap.quantityRequired * orderItem.quantity;
        const stockItem = inventory.find(inv => inv.id === recipeMap.ingredientId);
        
        if (stockItem) {
          const newStock = Math.max(0, stockItem.currentStock - totalQtyDeduct);
          // Update in global storage (requires global inventory lookup to update matching ID)
          db.update("inventory", stockItem.id, { currentStock: newStock });
        }
      });
    });

    // Customer Loyalty (Shared CRM)
    if (ord.customerPhone) {
      const customer = db.get("customers").find(c => c.phone === ord.customerPhone);
      if (customer) {
        const awardRatio = app.settings.pointsPerRupee;
        const awardedPoints = Math.round(netTotal * awardRatio);
        
        let newPoints = customer.loyaltyPoints + awardedPoints;
        if (this.redeemedPoints > 0) {
          newPoints = Math.max(0, newPoints - this.redeemedPoints);
        }

        db.update("customers", customer.id, { loyaltyPoints: newPoints });
        app.showToast(`Customer earned +${awardedPoints} points.`, "info");
      }
    }

    if (this.appliedCoupon) {
      const coupons = db.get("coupons");
      const cpn = coupons.find(c => c.id === this.appliedCoupon.id);
      if (cpn) {
        db.update("coupons", cpn.id, { usageCount: (cpn.usageCount || 0) + 1 });
      }
    }

    if (ord.type === "dine_in" && ord.tableId) {
      db.update("tables", ord.tableId, { status: "cleaning" });
    }

    db.update("orders", ord.id, {
      status: "completed",
      discount: totalDiscount,
      total: netTotal
    });

    app.showToast(`Order ${ord.orderNo} is Completed!`, "success");
    app.closeModal();

    setTimeout(() => {
      if (typeof ReviewsModule !== "undefined" && ReviewsModule.showAddReviewModal) {
        ReviewsModule.showAddReviewModal(ord.id);
      }
    }, 400);

    this.renderPendingBills();
  },

  printThermalReceipt(netTotal, totalDiscount, couponDec = 0, loyaltyDec = 0) {
    const ord = this.activeOrder;
    const settings = app.settings;
    
    const printContainer = document.getElementById("print-bill-template");
    
    const rowsHTML = ord.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td>${app.formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    printContainer.innerHTML = `
      <div class="receipt-box">
        <div class="receipt-header">
          <div class="receipt-logo">${settings.restaurantName}</div>
          <div class="receipt-meta">
            Invoice: ${ord.orderNo}<br>
            Time: ${new Date(ord.createdAt).toLocaleString()}<br>
            Staff: ${app.currentUser.name}
          </div>
        </div>
        
        <table class="receipt-items">
          <thead>
            <tr>
              <th style="text-align:left;">Item</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
        
        <div class="receipt-divider"></div>
        
        <table class="receipt-totals">
          <tr>
            <td>Subtotal:</td>
            <td>${app.formatCurrency(ord.subtotal)}</td>
          </tr>
          <tr>
            <td>Tax (${ord.taxPercent}%):</td>
            <td>${app.formatCurrency(ord.tax)}</td>
          </tr>
          ${totalDiscount > 0 ? `
          <tr style="font-weight:bold;">
            <td>Total Discount:</td>
            <td>-${app.formatCurrency(totalDiscount)}</td>
          </tr>` : ''}
          <tr style="font-size:1.15rem; font-weight:800;">
            <td>Grand Total:</td>
            <td>${app.formatCurrency(netTotal)}</td>
          </tr>
        </table>
      </div>
    `;

    // Delay slightly to let the browser render the innerHTML updates before opening dialog
    setTimeout(() => {
      window.print();
    }, 150);
  }
};

BillingModule.init();
