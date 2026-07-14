/**
 * coupons.js - Marketing Promo Codes Management (Multi-branch & Permissions updated)
 */

const CouponsModule = {
  init() {
    window.addEventListener("render-section:coupons", () => this.renderCouponsTable());

    document.getElementById("btn-add-coupon-modal").addEventListener("click", () => {
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to create coupons.", "warning");
        return;
      }
      this.showCouponModal();
    });
  },

  // Renders the summary list of promo codes
  renderCouponsTable() {
    app.enforcePermission("coupons");

    const tableBody = document.querySelector("#coupons-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const coupons = db.get("coupons").filter(c => currentBranch === "all" || c.branchId === currentBranch);
    const branches = db.get("branches");

    if (coupons.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-muted); padding:2rem;">No coupons found.</td></tr>`;
      return;
    }

    const hasFullAccess = app.checkPermission("coupons", "full");

    coupons.forEach(cpn => {
      const discountLabel = cpn.type === "flat" 
        ? app.formatCurrency(cpn.value) 
        : `${cpn.value}% Off`;

      const validityStr = `<div style="font-size:0.75rem; color:var(--text-secondary);">From: ${cpn.validFrom}<br>Till: ${cpn.validTill}</div>`;
      
      // If "All Branches" view, add branch name label
      const branch = branches.find(b => b.id === cpn.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:700; color:var(--color-primary);">${cpn.code} ${branchBadge}</td>
        <td style="font-weight:600;">${discountLabel}</td>
        <td>${app.formatCurrency(cpn.minOrderValue)}</td>
        <td>${cpn.usageCount || 0} / ${cpn.usageLimit}</td>
        <td>${validityStr}</td>
        <td>
          <label class="form-check" style="justify-content:center;">
            <input type="checkbox" class="toggle-coupon-active" data-id="${cpn.id}" ${cpn.isActive ? 'checked' : ''} ${!hasFullAccess ? 'disabled' : ''}>
          </label>
        </td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm btn-edit" ${!hasFullAccess ? 'disabled' : ''}>Edit</button>
            <button class="btn btn-danger btn-sm btn-delete" ${!hasFullAccess ? 'disabled' : ''}>Delete</button>
          </div>
        </td>
      `;

      if (hasFullAccess) {
        tr.querySelector(".toggle-coupon-active").addEventListener("change", (e) => {
          const isChecked = e.target.checked;
          db.update("coupons", cpn.id, { isActive: isChecked });
          app.showToast(`Updated coupon ${cpn.code} active status`, "info");
        });

        tr.querySelector(".btn-edit").addEventListener("click", () => this.showCouponModal(cpn.id));
        tr.querySelector(".btn-delete").addEventListener("click", () => this.deleteCoupon(cpn.id));
      }

      tableBody.appendChild(tr);
    });
  },

  deleteCoupon(id) {
    const cpn = db.get("coupons").find(c => c.id === id);
    if (!cpn) return;

    if (confirm(`Are you sure you want to permanently delete coupon "${cpn.code}"?`)) {
      db.delete("coupons", id);
      app.showToast(`Deleted coupon ${cpn.code}`, "danger");
      this.renderCouponsTable();
    }
  },

  // Modal to add/edit coupons records
  showCouponModal(couponId = null) {
    const isEdit = !!couponId;
    const cpn = isEdit ? db.get("coupons").find(c => c.id === couponId) : null;
    const currentBranch = db.getCurrentBranch();

    const modalHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Coupon Settings' : 'Create Promotion Coupon'}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="coupon-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Coupon Code (Uppercase)</label>
              <input type="text" id="cpn-code" class="form-control" required placeholder="e.g. FESTIVE20" value="${isEdit ? cpn.code : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Discount Type</label>
              <select id="cpn-type" class="form-control">
                <option value="flat" ${isEdit && cpn.type === 'flat' ? 'selected' : ''}>Flat Currency Discount</option>
                <option value="percentage" ${isEdit && cpn.type === 'percentage' ? 'selected' : ''}>Percentage Discount (%)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Discount Value</label>
              <input type="number" id="cpn-val" class="form-control" required min="1" value="${isEdit ? cpn.value : '10'}">
            </div>
            <div class="form-group">
              <label class="form-label">Min. Order Value required</label>
              <input type="number" id="cpn-min" class="form-control" required min="0" value="${isEdit ? cpn.minOrderValue : '100'}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Valid From Date</label>
              <input type="date" id="cpn-from" class="form-control" required value="${isEdit ? cpn.validFrom : new Date().toISOString().slice(0, 10)}">
            </div>
            <div class="form-group">
              <label class="form-label">Valid Till Date</label>
              <input type="date" id="cpn-till" class="form-control" required value="${isEdit ? cpn.validTill : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Max. Usage Limit count</label>
              <input type="number" id="cpn-limit" class="form-control" required min="1" value="${isEdit ? cpn.usageLimit : '100'}">
            </div>
            <div class="form-group" style="display:flex; align-items:flex-end; padding-bottom: 0.5rem;">
              <label class="form-check">
                <input type="checkbox" id="cpn-active" ${isEdit ? (cpn.isActive ? 'checked' : '') : 'checked'}> Coupon Enabled
              </label>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-save-coupon">Save Coupon</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-save-coupon").addEventListener("click", () => {
      const code = document.getElementById("cpn-code").value.trim().toUpperCase();
      const type = document.getElementById("cpn-type").value;
      const value = parseFloat(document.getElementById("cpn-val").value) || 0;
      const minOrderValue = parseFloat(document.getElementById("cpn-min").value) || 0;
      const validFrom = document.getElementById("cpn-from").value;
      const validTill = document.getElementById("cpn-till").value;
      const usageLimit = parseInt(document.getElementById("cpn-limit").value) || 100;
      const isActive = document.getElementById("cpn-active").checked;

      if (!code || value <= 0 || !validFrom || !validTill) {
        app.showToast("Please fill all required settings.", "warning");
        return;
      }

      const payload = { 
        code, 
        type, 
        value, 
        minOrderValue, 
        validFrom, 
        validTill, 
        usageLimit, 
        isActive,
        branchId: isEdit ? cpn.branchId : currentBranch 
      };

      if (isEdit) {
        payload.usageCount = cpn.usageCount || 0;
        db.update("coupons", cpn.id, payload);
        app.showToast(`Updated coupon config: ${code}`, "success");
      } else {
        payload.usageCount = 0;
        const exists = db.get("coupons").find(c => c.branchId === currentBranch && c.code === code);
        if (exists) {
          app.showToast(`A coupon with code "${code}" is already defined in this branch.`, "warning");
          return;
        }
        db.insert("coupons", payload);
        app.showToast(`Coupon code ${code} is now live!`, "success");
      }

      app.closeModal();
      this.renderCouponsTable();
    });
  }
};

CouponsModule.init();
