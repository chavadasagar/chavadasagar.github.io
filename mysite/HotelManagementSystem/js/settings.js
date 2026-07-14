/**
 * settings.js - Hotel configs, Promo Code rules CRUD, Database resets
 */

const settingsController = {
  activeTab: 'profile', // 'profile', 'promos'

  render(container) {
    container.innerHTML = `
      <div class="settings-header animate-fade-in">
        <h2>System Settings & Configurations</h2>
        <div class="view-toggles">
          <button class="btn ${this.activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}" id="toggle-set-profile">Hotel Profile</button>
          <button class="btn ${this.activeTab === 'promos' ? 'btn-primary' : 'btn-outline'}" id="toggle-set-promos">Promo Codes</button>
        </div>
      </div>

      <div id="settings-content" class="animate-fade-in"></div>

      <!-- Add/Edit Promo Modal -->
      <div id="promo-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="promo-modal-title">Create Promo Code</h3>
            <button class="modal-close-btn" id="btn-close-promo-modal">&times;</button>
          </div>
          <form id="promo-form">
            <input type="hidden" id="promo-id-field">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label for="p-code-field">Promo Code*</label>
                  <input type="text" id="p-code-field" required placeholder="e.g. STAYCOOL15">
                </div>
                <div class="form-group">
                  <label for="p-type-field">Discount Type*</label>
                  <select id="p-type-field" required>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat">Flat Discount (INR)</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="p-val-field">Discount Value*</label>
                  <input type="number" id="p-val-field" min="1" required>
                </div>
                <div class="form-group">
                  <label for="p-min-field">Minimum Billing Amount</label>
                  <input type="number" id="p-min-field" value="0" min="0">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="p-start-field">Start Date*</label>
                  <input type="date" id="p-start-field" required>
                </div>
                <div class="form-group">
                  <label for="p-end-field">Expiry Date*</label>
                  <input type="date" id="p-end-field" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="p-limit-field">Max Usage Limit*</label>
                  <input type="number" id="p-limit-field" value="100" min="1" required>
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" id="p-active-field" checked> Active Promo
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label for="p-desc-field">Promo Description*</label>
                <input type="text" id="p-desc-field" required placeholder="Description displayed to users">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-promo-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Code</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('toggle-set-profile').addEventListener('click', () => {
      this.activeTab = 'profile';
      this.render(container);
    });

    document.getElementById('toggle-set-promos').addEventListener('click', () => {
      this.activeTab = 'promos';
      this.render(container);
    });

    if (this.activeTab === 'profile') {
      this.renderProfile();
    } else {
      this.renderPromos();
    }
  },

  renderProfile() {
    const subContainer = document.getElementById('settings-content');
    const hotel = window.db.getAll('hotels')[0] || { name: 'StayEase', address: '', phone: '', email: '', taxRate: 12 };

    subContainer.innerHTML = `
      <div class="settings-profile-container card">
        <form id="hotel-profile-form">
          <h3>Hotel Profile Settings</h3>
          <div class="form-group">
            <label>Property Name*</label>
            <input type="text" id="h-name" value="${hotel.name}" required>
          </div>
          <div class="form-group">
            <label>Address*</label>
            <input type="text" id="h-address" value="${hotel.address}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Phone Number*</label>
              <input type="text" id="h-phone" value="${hotel.phone}" required>
            </div>
            <div class="form-group">
              <label>Contact Email*</label>
              <input type="email" id="h-email" value="${hotel.email}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Default GST Tax Rate (%)*</label>
              <input type="number" id="h-tax" value="${hotel.taxRate}" required min="0" max="30">
            </div>
            <div class="form-group" style="display:flex; align-items:center; margin-top:20px;">
              <label>
                <input type="checkbox" id="h-multi" disabled> Enable Multi-Property Mode
              </label>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:10px;">Save Profile Changes</button>
        </form>

        <hr style="margin: 30px 0;">

        <div class="danger-zone-section" style="border: 1px solid var(--danger-color); padding: 20px; border-radius: 6px;">
          <h3 class="text-danger">Danger Zone</h3>
          <p style="font-size:12px; margin-bottom:15px; color:var(--text-muted);">Resetting the database will purge all custom bookings, guests, invoices, inventory transactions, and re-seed the system with original dummy data.</p>
          <button class="btn btn-danger" id="btn-reset-db">🚨 Clear All Data & Reseed Database</button>
        </div>
      </div>
    `;

    // Bind form save
    document.getElementById('hotel-profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('h-name').value.trim();
      const address = document.getElementById('h-address').value.trim();
      const phone = document.getElementById('h-phone').value.trim();
      const email = document.getElementById('h-email').value.trim();
      const taxRate = parseFloat(document.getElementById('h-tax').value) || 12;

      window.db.update('hotels', hotel.id, { name, address, phone, email, taxRate });
      window.utils.showToast("Hotel profile details updated successfully! ✅");
      
      // Update name on top toolbar if possible
      const logoSpan = document.getElementById('hotel-brand-name');
      if (logoSpan) logoSpan.innerText = name;
    });

    // Reset database handler
    document.getElementById('btn-reset-db').addEventListener('click', () => {
      window.utils.confirm(
        "Destructive Database Reset",
        "Are you absolutely sure you want to re-seed the database? All active check-ins, custom guests, and transactions will be lost.",
        () => {
          window.db.resetAndSeed();
          window.utils.showToast("Database seeded successfully! Reloading...");
          setTimeout(() => window.location.reload(), 1500);
        }
      );
    });
  },

  renderPromos() {
    const subContainer = document.getElementById('settings-content');
    const promos = window.db.getAll('promoCodes');
    const user = window.auth.getCurrentUser();
    const canWrite = user.role === 'Admin' || user.role === 'Manager';

    subContainer.innerHTML = `
      <div class="list-actions card">
        <div class="search-box-wrapper">
          <input type="text" id="filter-promo-search" placeholder="Search codes...">
        </div>
        ${canWrite ? `<button class="btn btn-primary" id="btn-add-promo">+ Add Promo Code</button>` : ''}
      </div>

      <div class="table-responsive card">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Discount</th>
              <th>Min Billing</th>
              <th>Validity Dates</th>
              <th>Usage (Limit)</th>
              <th>Status</th>
              ${canWrite ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody id="promos-tbody"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('promos-tbody');
    const searchInput = document.getElementById('filter-promo-search');

    const updateDisplay = () => {
      const query = searchInput.value.toUpperCase().trim();
      const filtered = promos.filter(p => p.code.includes(query) || p.description.toLowerCase().includes(query.toLowerCase()));

      tbody.innerHTML = filtered.map(p => {
        const discountVal = p.type === 'Percentage' ? `${p.value}%` : window.utils.formatCurrency(p.value);
        const datesLabel = `${window.utils.formatDate(p.startDate)} to ${window.utils.formatDate(p.endDate)}`;
        
        return `
          <tr>
            <td><strong><code>${p.code}</code></strong></td>
            <td>${p.description}</td>
            <td style="font-weight:bold; color:var(--success-color);">${discountVal}</td>
            <td>${p.minAmount > 0 ? window.utils.formatCurrency(p.minAmount) : 'None'}</td>
            <td style="font-size:11px;">${datesLabel}</td>
            <td>${p.usageCount} / ${p.usageLimit}</td>
            <td><span class="badge ${p.active ? 'badge-success' : 'badge-danger'}">${p.active ? 'Active' : 'Expired'}</span></td>
            ${canWrite ? `
              <td>
                <button class="btn btn-xs btn-outline btn-edit-promo" data-id="${p.id}">Edit</button>
                <button class="btn btn-xs btn-danger btn-delete-promo" data-id="${p.id}">Delete</button>
              </td>
            ` : ''}
          </tr>
        `;
      }).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No promo rules found.</td></tr>';
      }

      if (canWrite) {
        tbody.querySelectorAll('.btn-edit-promo').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.openPromoModal(e.currentTarget.getAttribute('data-id'));
          });
        });

        tbody.querySelectorAll('.btn-delete-promo').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.handleDeletePromo(e.currentTarget.getAttribute('data-id'));
          });
        });
      }
    };

    searchInput.addEventListener('input', updateDisplay);
    updateDisplay();

    if (canWrite) {
      document.getElementById('btn-add-promo').addEventListener('click', () => this.openPromoModal());
      document.getElementById('btn-close-promo-modal').addEventListener('click', () => this.closePromoModal());
      document.getElementById('btn-cancel-promo-modal').addEventListener('click', () => this.closePromoModal());
      document.getElementById('promo-form').addEventListener('submit', (e) => this.handleSavePromo(e));
    }
  },

  openPromoModal(promoId = null) {
    const form = document.getElementById('promo-form');
    form.reset();

    if (promoId) {
      const p = window.db.getById('promoCodes', promoId);
      if (!p) return;
      document.getElementById('promo-modal-title').innerText = "Edit Promo Code Rule";
      document.getElementById('promo-id-field').value = p.id;
      document.getElementById('p-code-field').value = p.code;
      document.getElementById('p-type-field').value = p.type;
      document.getElementById('p-val-field').value = p.value;
      document.getElementById('p-min-field').value = p.minAmount;
      document.getElementById('p-start-field').value = p.startDate;
      document.getElementById('p-end-field').value = p.endDate;
      document.getElementById('p-limit-field').value = p.usageLimit;
      document.getElementById('p-active-field').checked = p.active;
      document.getElementById('p-desc-field').value = p.description;
    } else {
      document.getElementById('promo-modal-title').innerText = "Create Promo Code";
      document.getElementById('promo-id-field').value = '';
      document.getElementById('p-start-field').value = new Date().toISOString().split('T')[0];
      document.getElementById('p-end-field').value = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]; // +30 days
      document.getElementById('p-active-field').checked = true;
    }

    document.getElementById('promo-modal').style.display = 'flex';
  },

  closePromoModal() {
    document.getElementById('promo-modal').style.display = 'none';
  },

  handleSavePromo(e) {
    e.preventDefault();

    const id = document.getElementById('promo-id-field').value;
    const code = document.getElementById('p-code-field').value.toUpperCase().trim();
    const type = document.getElementById('p-type-field').value;
    const value = parseFloat(document.getElementById('p-val-field').value);
    const minAmount = parseFloat(document.getElementById('p-min-field').value) || 0;
    const startDate = document.getElementById('p-start-field').value;
    const endDate = document.getElementById('p-end-field').value;
    const usageLimit = parseInt(document.getElementById('p-limit-field').value) || 100;
    const active = document.getElementById('p-active-field').checked;
    const description = document.getElementById('p-desc-field').value.trim();

    if (!code || isNaN(value) || !startDate || !endDate) {
      window.utils.showToast("Invalid promo settings.", "error");
      return;
    }

    const payload = { code, type, value, minAmount, startDate, endDate, usageLimit, active, description };

    if (id) {
      window.db.update('promoCodes', id, payload);
      window.utils.showToast("Promo rules updated.");
    } else {
      payload.usageCount = 0;
      window.db.create('promoCodes', payload);
      window.utils.showToast("Promo code created successfully.");
    }

    this.closePromoModal();
    this.renderPromos();
  },

  handleDeletePromo(promoId) {
    window.utils.confirm(
      "Remove Promo Rule",
      "Are you sure you want to delete this discount promo code rule from the database?",
      () => {
        window.db.delete('promoCodes', promoId);
        window.utils.showToast("Promo code removed.");
        this.renderPromos();
      }
    );
  }
};

window.settingsController = settingsController;
