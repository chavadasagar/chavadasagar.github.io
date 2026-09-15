/**
 * pharmacy.js - Pharmacy Inventory CRUD, Dispense checks, Transaction Logging, and Suppliers
 */

window.HMS_PHARMACY = {
  activeTab: 'rx-queue-pane',

  render: function(container, params) {
    const session = window.HMS_DB.getCurrentSession();
    if (!session) return;

    container.innerHTML = `
      <div class="card tabs-container">
        <div class="tabs-header">
          <button class="tab-btn active" id="rx-tab" onclick="window.HMS_PHARMACY.switchTab(event, 'rx-queue-pane')">Prescriptions Queue</button>
          <button class="tab-btn" id="stock-tab" onclick="window.HMS_PHARMACY.switchTab(event, 'inventory-pane')">Stock Master</button>
          <button class="tab-btn" id="tx-tab" onclick="window.HMS_PHARMACY.switchTab(event, 'tx-log-pane')">Inventory Transactions</button>
          <button class="tab-btn" id="sup-tab" onclick="window.HMS_PHARMACY.switchTab(event, 'suppliers-pane')">Suppliers</button>
        </div>

        <!-- PRESCRIPTIONS QUEUE PANEL -->
        <div id="rx-queue-pane" class="tab-pane active">
          <div class="card-header-row">
            <h3 class="card-title">Pending Prescription Dispensation</h3>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Prescribed Date</th>
                  <th>Patient</th>
                  <th>Prescribed By</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="rx-queue-tbody">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- STOCK MASTER PANEL -->
        <div id="inventory-pane" class="tab-pane">
          <div class="card-header-row" style="margin-bottom:16px;">
            <h3 class="card-title">Medicine Stock Catalog</h3>
            <button class="btn btn-primary" onclick="window.HMS_PHARMACY.openMedicineModal()">
              <i class="fa-solid fa-plus"></i> Add New Medicine
            </button>
          </div>

          <div class="table-controls">
            <div class="search-filter-box">
              <div class="search-control">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="med-search" placeholder="Search medicines..." onkeyup="window.HMS_PHARMACY.filterMedicines()">
              </div>
              <select id="med-stock-filter" class="select-filter" onchange="window.HMS_PHARMACY.filterMedicines()">
                <option value="">All Stock Levels</option>
                <option value="low">Low Stock Alerts Only</option>
                <option value="expiring">Expiring Soon (30 Days)</option>
              </select>
            </div>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Manufacturer</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock Quantity</th>
                  <th>Expiry Date</th>
                  <th>Reorder Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="med-stock-tbody">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- TRANSACTIONS LOG PANEL -->
        <div id="tx-log-pane" class="tab-pane">
          <h3 class="card-title" style="margin-bottom:16px;">Inventory Transaction History</h3>
          <div class="table-controls">
            <div class="search-filter-box">
              <select id="tx-type-filter" class="select-filter" onchange="window.HMS_PHARMACY.loadTxLog()">
                <option value="">All Transaction Types</option>
                <option value="Purchase">Purchase (Stock In)</option>
                <option value="Dispense">Dispense (Stock Out)</option>
                <option value="Return">Return</option>
                <option value="Wastage">Wastage / Expired</option>
              </select>
            </div>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Medicine</th>
                  <th>Tx Type</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody id="tx-log-tbody">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- SUPPLIERS PANEL -->
        <div id="suppliers-pane" class="tab-pane">
          <div class="card-header-row" style="margin-bottom:16px;">
            <h3 class="card-title">Manage Suppliers</h3>
            <button class="btn btn-primary" onclick="window.HMS_PHARMACY.openSupplierModal()">
              <i class="fa-solid fa-truck-field"></i> Add Supplier
            </button>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="suppliers-tbody">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.loadRxQueue();
    this.loadStockCatalog();
    this.loadTxLog();
    this.loadSuppliers();
  },

  switchTab: function(e, tabId) {
    const container = e.target.closest('.tabs-container');
    container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    e.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
    this.activeTab = tabId;
  },

  // ==========================================
  // PRESCRIPTION QUEUE
  // ==========================================
  loadRxQueue: function() {
    const prescs = window.HMS_DB.getAll(window.HMS_DB.KEYS.PRESCRIPTIONS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const tbody = document.getElementById('rx-queue-tbody');

    const pending = prescs.filter(p => p.status === 'Pending');

    if (pending.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No pending prescriptions. All fully dispensed!</td></tr>`;
      return;
    }

    tbody.innerHTML = pending.map(p => {
      const pat = patients.find(patObj => patObj.id === p.patient_id);
      const doc = doctors.find(d => d.id === p.doctor_id);
      return `
        <tr>
          <td><strong>${new Date(p.created_at).toLocaleDateString()}</strong></td>
          <td><a href="#/patients?id=${p.patient_id}"><strong>${pat ? pat.name : 'Unknown'}</strong></a></td>
          <td>${doc ? doc.name : 'Doctor'}</td>
          <td><span class="badge badge-warning">${p.status}</span></td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="window.HMS_PHARMACY.openDispenseModal('${p.id}')">
              <i class="fa-solid fa-truck-ramp-box"></i> Dispense Rx
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openDispenseModal: function(presId) {
    const p = window.HMS_DB.getById(window.HMS_DB.KEYS.PRESCRIPTIONS, presId);
    if (!p) return;

    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, p.patient_id);
    const rxItems = window.HMS_DB.getAll(window.HMS_DB.KEYS.PRESCRIPTION_ITEMS).filter(item => item.prescription_id === presId);
    const medicines = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);

    let modalOverlay = document.getElementById('dispense-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'dispense-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    // Check stock for all items
    let hasStockConflict = false;
    const itemStockDetails = rxItems.map(item => {
      const med = medicines.find(m => m.id === item.medicine_id);
      
      // Parse frequency multiplier (e.g. 1-0-1 = 2 per day, or default to 1)
      let dailyQty = 1;
      if (item.frequency.includes('-')) {
        dailyQty = item.frequency.split('-').reduce((sum, val) => sum + (parseInt(val) || 0), 0);
        if (dailyQty === 0) dailyQty = 1;
      }
      
      const reqQty = dailyQty * item.duration;
      const availStock = med ? med.stock_quantity : 0;
      const isInsuff = availStock < reqQty;
      if (isInsuff) hasStockConflict = true;

      return {
        ...item,
        medName: med ? med.name : 'Unknown Medicine',
        reqQty,
        availStock,
        isInsuff,
        unitPrice: med ? med.unit_price : 0
      };
    });

    modalOverlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>Dispense Prescribed Medications: ${pat ? pat.name : ''}</h3>
          <button class="modal-close" onclick="document.getElementById('dispense-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:12px;">Reviewing stock availability for prescription items:</p>
          
          <table style="width:100%;">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Prescribed Dosing</th>
                <th>Duration</th>
                <th>Qty Required</th>
                <th>Qty Available</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              ${itemStockDetails.map(it => `
                <tr style="${it.isInsuff ? 'background-color:rgba(239, 68, 68, 0.05);' : ''}">
                  <td><strong>${it.medName}</strong></td>
                  <td>${it.dosage} (${it.frequency})</td>
                  <td>${it.duration} days</td>
                  <td><strong>${it.reqQty} units</strong></td>
                  <td><strong style="color:${it.isInsuff ? 'var(--danger)' : 'var(--success)'}">${it.availStock} units</strong></td>
                  <td>
                    ${it.isInsuff ? `
                      <span class="badge badge-danger">Insufficient Stock</span>
                    ` : `
                      <span class="badge badge-success">In Stock</span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${hasStockConflict ? `
            <div class="current-time-display" style="border: 1px solid var(--danger); background-color:var(--danger-light); color:var(--danger-text); padding: 12px; margin-top: 16px; border-radius:8px;">
              <i class="fa-solid fa-exclamation-triangle"></i> <strong>Dispensing Blocked:</strong> One or more prescription items are out of stock. Please order stock refill first.
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('dispense-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_PHARMACY.executeDispense('${p.id}')" ${hasStockConflict ? 'disabled' : ''}>
            <i class="fa-solid fa-circle-check"></i> Complete Dispensation
          </button>
        </div>
      </div>
    `;
  },

  executeDispense: function(presId) {
    const p = window.HMS_DB.getById(window.HMS_DB.KEYS.PRESCRIPTIONS, presId);
    if (!p) return;

    const rxItems = window.HMS_DB.getAll(window.HMS_DB.KEYS.PRESCRIPTION_ITEMS).filter(item => item.prescription_id === presId);
    const medicines = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);

    let totalMedCharges = 0;
    const billingItems = [];

    // Deduct stock, log transactions
    rxItems.forEach(item => {
      const med = medicines.find(m => m.id === item.medicine_id);
      if (med) {
        let dailyQty = 1;
        if (item.frequency.includes('-')) {
          dailyQty = item.frequency.split('-').reduce((sum, val) => sum + (parseInt(val) || 0), 0);
          if (dailyQty === 0) dailyQty = 1;
        }
        const reqQty = dailyQty * item.duration;
        const newStock = med.stock_quantity - reqQty;

        // Update medicine stock
        window.HMS_DB.update(window.HMS_DB.KEYS.MEDICINES, med.id, {
          stock_quantity: newStock
        });

        // Log transaction
        window.HMS_DB.insert(window.HMS_DB.KEYS.INVENTORY_TXS, {
          medicine_id: med.id,
          type: 'Dispense',
          quantity: reqQty,
          notes: `Dispensed for prescription #${presId.substring(0,8).toUpperCase()}`
        });

        const cost = med.unit_price * reqQty;
        totalMedCharges += cost;
        billingItems.push(`${med.name} x${reqQty} ($${cost.toFixed(2)})`);
      }
    });

    // Update prescription status
    window.HMS_DB.update(window.HMS_DB.KEYS.PRESCRIPTIONS, presId, {
      status: 'Dispensed'
    });

    // Auto-generate invoice line item
    if (window.HMS_BILLING) {
      window.HMS_BILLING.createPharmacyInvoice(p.patient_id, presId, totalMedCharges, billingItems.join(', '));
    }

    window.HMS_APP.toast('Meds Dispensed', 'Stock deducted. Invoice generated.', 'success');
    document.getElementById('dispense-modal').remove();

    this.loadRxQueue();
    this.loadStockCatalog();
    this.loadTxLog();
  },

  // ==========================================
  // STOCK CATALOG SUB-TAB
  // ==========================================
  loadStockCatalog: function() {
    const meds = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);
    const tbody = document.getElementById('med-stock-tbody');
    
    // Sort alphabetically
    meds.sort((a, b) => a.name.localeCompare(b.name));

    this.renderStockListHTML(meds, tbody);
  },

  renderStockListHTML: function(meds, tbody) {
    const todayMs = new Date('2026-07-14').getTime();
    const thirtyDaysMs = todayMs + (30 * 24 * 60 * 60 * 1000);

    tbody.innerHTML = meds.map(m => {
      const isLow = m.stock_quantity <= m.reorder_level;
      
      const expMs = new Date(m.expiry_date).getTime();
      const isExpiring = expMs > todayMs && expMs <= thirtyDaysMs;
      
      let stockColor = '';
      if (isLow) stockColor = 'color: var(--danger); font-weight:700;';

      let expiryBadge = '';
      if (isExpiring) {
        expiryBadge = '<br><span class="badge badge-warning" style="font-size:9px; margin-top:2px;">Expiring Soon</span>';
      }

      return `
        <tr class="med-row" data-name="${m.name.toLowerCase()}" data-low="${isLow}" data-expiring="${isExpiring}">
          <td>
            <strong>${m.name}</strong>
            ${isLow ? `<br><span class="badge badge-danger" style="font-size:9px; margin-top:2px;">Low Stock Refill</span>` : ''}
          </td>
          <td>${m.manufacturer}</td>
          <td><span class="badge badge-info">${m.category}</span></td>
          <td>$${m.unit_price.toFixed(2)}</td>
          <td><span style="${stockColor}">${m.stock_quantity} units</span></td>
          <td>${m.expiry_date}${expiryBadge}</td>
          <td>${m.reorder_level} units</td>
          <td>
            <div class="demo-login-tags" style="gap:4px;">
              <button class="btn btn-outline btn-sm" onclick="window.HMS_PHARMACY.openMedicineModal('${m.id}')" title="Edit"><i class="fa-solid fa-edit"></i></button>
              <button class="btn btn-secondary btn-sm" onclick="window.HMS_PHARMACY.openRestockModal('${m.id}')" title="Restock"><i class="fa-solid fa-truck-field"></i></button>
              <button class="btn btn-danger btn-sm" onclick="window.HMS_PHARMACY.deleteMedicinePrompt('${m.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  filterMedicines: function() {
    const searchVal = document.getElementById('med-search').value.toLowerCase();
    const filterLevel = document.getElementById('med-stock-filter').value;

    document.querySelectorAll('.med-row').forEach(row => {
      const name = row.dataset.name;
      const isLow = row.dataset.low === 'true';
      const isExp = row.dataset.expiring === 'true';

      const matchSearch = name.includes(searchVal);
      let matchFilter = true;
      if (filterLevel === 'low') matchFilter = isLow;
      if (filterLevel === 'expiring') matchFilter = isExp;

      if (matchSearch && matchFilter) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  },

  openMedicineModal: function(medId = null) {
    const m = medId ? window.HMS_DB.getById(window.HMS_DB.KEYS.MEDICINES, medId) : null;

    let modalOverlay = document.getElementById('medicine-editor-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'medicine-editor-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>${m ? 'Edit Medication Stock Config' : 'Register New Medicine Item'}</h3>
          <button class="modal-close" onclick="document.getElementById('medicine-editor-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="medicine-form" novalidate>
            <input type="hidden" id="edit-med-id" value="${m ? m.id : ''}">
            
            <div class="form-grid">
              <div class="form-group">
                <label for="edit-med-name">Medicine Name</label>
                <input type="text" id="edit-med-name" value="${m ? m.name : ''}" required>
                <div class="error-msg" id="edit-med-name-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-med-manuf">Manufacturer</label>
                <input type="text" id="edit-med-manuf" value="${m ? m.manufacturer : ''}" required>
                <div class="error-msg" id="edit-med-manuf-err"></div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="edit-med-cat">Category</label>
                <select id="edit-med-cat" required>
                  <option value="">-- Choose Category --</option>
                  <option value="Analgesics" ${m && m.category === 'Analgesics' ? 'selected' : ''}>Analgesics</option>
                  <option value="Antibiotics" ${m && m.category === 'Antibiotics' ? 'selected' : ''}>Antibiotics</option>
                  <option value="Cardiovascular" ${m && m.category === 'Cardiovascular' ? 'selected' : ''}>Cardiovascular</option>
                  <option value="Respiratory" ${m && m.category === 'Respiratory' ? 'selected' : ''}>Respiratory</option>
                  <option value="Antidiabetic" ${m && m.category === 'Antidiabetic' ? 'selected' : ''}>Antidiabetic</option>
                  <option value="Gastrointestinal" ${m && m.category === 'Gastrointestinal' ? 'selected' : ''}>Gastrointestinal</option>
                </select>
                <div class="error-msg" id="edit-med-cat-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-med-price">Unit Billing Price ($)</label>
                <input type="number" id="edit-med-price" min="0" step="0.01" value="${m ? m.unit_price : ''}" required>
                <div class="error-msg" id="edit-med-price-err"></div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="edit-med-stock">Initial Stock Quantity</label>
                <input type="number" id="edit-med-stock" min="0" value="${m ? m.stock_quantity : ''}" ${m ? 'disabled' : ''} required>
                <div class="error-msg" id="edit-med-stock-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-med-reorder">Reorder Threshold Level</label>
                <input type="number" id="edit-med-reorder" min="0" value="${m ? m.reorder_level : ''}" required>
                <div class="error-msg" id="edit-med-reorder-err"></div>
              </div>
            </div>

            <div class="form-group">
              <label for="edit-med-expiry">Expiration Date</label>
              <input type="date" id="edit-med-expiry" value="${m ? m.expiry_date : ''}" required>
              <div class="error-msg" id="edit-med-expiry-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('medicine-editor-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_PHARMACY.saveMedicineForm()">Save Medicine</button>
        </div>
      </div>
    `;
  },

  saveMedicineForm: function() {
    const fields = ['edit-med-name', 'edit-med-manuf', 'edit-med-cat', 'edit-med-price', 'edit-med-stock', 'edit-med-reorder', 'edit-med-expiry'];
    let hasError = false;

    fields.forEach(f => {
      document.getElementById(`${f}-err`).innerText = '';
      document.getElementById(f).classList.remove('error');
    });

    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      const val = el.value.trim();
      // Skip stock error check if editing
      const isEditStockField = f === 'edit-med-stock' && el.disabled;
      if (!val && !isEditStockField) {
        document.getElementById(`${f}-err`).innerText = 'This field is required';
        el.classList.add('error');
        hasError = true;
      } else {
        data[f.replace('edit-med-', '')] = val;
      }
    });

    if (hasError) return;

    const id = document.getElementById('edit-med-id').value;

    if (id) {
      window.HMS_DB.update(window.HMS_DB.KEYS.MEDICINES, id, {
        name: data.name,
        manufacturer: data.manuf,
        category: data.cat,
        unit_price: parseFloat(data.price),
        reorder_level: parseInt(data.reorder),
        expiry_date: data.expiry
      });
      window.HMS_APP.toast('Medicine Updated', `${data.name} saved.`, 'success');
    } else {
      const newMed = window.HMS_DB.insert(window.HMS_DB.KEYS.MEDICINES, {
        name: data.name,
        manufacturer: data.manuf,
        category: data.cat,
        unit_price: parseFloat(data.price),
        stock_quantity: parseInt(data.stock),
        reorder_level: parseInt(data.reorder),
        expiry_date: data.expiry
      });
      
      // Log initial purchase transaction
      window.HMS_DB.insert(window.HMS_DB.KEYS.INVENTORY_TXS, {
        medicine_id: newMed.id,
        type: 'Purchase',
        quantity: parseInt(data.stock),
        notes: 'Initial stock import.'
      });

      window.HMS_APP.toast('Medicine Added', 'New stock item created.', 'success');
    }

    document.getElementById('medicine-editor-modal').remove();
    this.loadStockCatalog();
    this.loadTxLog();
  },

  deleteMedicinePrompt: function(id) {
    const m = window.HMS_DB.getById(window.HMS_DB.KEYS.MEDICINES, id);
    if (!m) return;

    if (window.HMS_DB.isReferenced(window.HMS_DB.KEYS.MEDICINES, id)) {
      window.HMS_APP.toast('Cannot Delete', 'This medicine is referenced in historical patient prescriptions.', 'danger');
      return;
    }

    window.HMS_APP.confirm(
      'Remove Medicine Config',
      `Are you sure you want to delete medicine "${m.name}"? This removes all records.`,
      (confirmed) => {
        if (confirmed) {
          window.HMS_DB.delete(window.HMS_DB.KEYS.MEDICINES, id);
          window.HMS_APP.toast('Medication Deleted', 'Deleted successfully.', 'success');
          this.loadStockCatalog();
        }
      }
    );
  },

  // Restock Option
  openRestockModal: function(medId) {
    const med = window.HMS_DB.getById(window.HMS_DB.KEYS.MEDICINES, medId);
    if (!med) return;

    let modalOverlay = document.getElementById('restock-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'restock-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Refill stock: ${med.name}</h3>
          <button class="modal-close" onclick="document.getElementById('restock-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="restock-qty">Restock Quantity (Units)</label>
            <input type="number" id="restock-qty" min="1" value="100" required>
            <div class="error-msg" id="restock-qty-err"></div>
          </div>
          <div class="form-group">
            <label for="restock-notes">Refill details / Supplier Bill Invoice Number</label>
            <input type="text" id="restock-notes" placeholder="e.g. Purchased from Astra Bio-pharma, Bill #909" required>
            <div class="error-msg" id="restock-notes-err"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('restock-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_PHARMACY.executeRestock('${medId}')">Add Stock</button>
        </div>
      </div>
    `;
  },

  executeRestock: function(medId) {
    const qtyEl = document.getElementById('restock-qty');
    const notesEl = document.getElementById('restock-notes');
    const qty = parseInt(qtyEl.value);
    const notes = notesEl.value.trim();

    let hasError = false;
    document.getElementById('restock-qty-err').innerText = '';
    document.getElementById('restock-notes-err').innerText = '';

    if (isNaN(qty) || qty <= 0) {
      document.getElementById('restock-qty-err').innerText = 'Please input a valid quantity';
      hasError = true;
    }
    if (!notes) {
      document.getElementById('restock-notes-err').innerText = 'Refill description is required';
      hasError = true;
    }

    if (hasError) return;

    const med = window.HMS_DB.getById(window.HMS_DB.KEYS.MEDICINES, medId);
    if (!med) return;

    const newStock = med.stock_quantity + qty;
    window.HMS_DB.update(window.HMS_DB.KEYS.MEDICINES, medId, {
      stock_quantity: newStock
    });

    window.HMS_DB.insert(window.HMS_DB.KEYS.INVENTORY_TXS, {
      medicine_id: medId,
      type: 'Purchase',
      quantity: qty,
      notes: notes
    });

    window.HMS_APP.toast('Stock Replenished', `${med.name} inventory increased by ${qty} units.`, 'success');
    document.getElementById('restock-modal').remove();

    this.loadStockCatalog();
    this.loadTxLog();
  },

  // ==========================================
  // TRANSACTION LOG SUB-TAB
  // ==========================================
  loadTxLog: function() {
    const txs = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVENTORY_TXS);
    const medicines = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);
    const filterType = document.getElementById('tx-type-filter').value;
    const tbody = document.getElementById('tx-log-tbody');

    let filtered = txs;
    if (filterType) {
      filtered = txs.filter(t => t.type === filterType);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No inventory transactions logged.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const med = medicines.find(m => m.id === t.medicine_id);
      let badge = 'badge-success';
      if (t.type === 'Dispense') badge = 'badge-danger';
      else if (t.type === 'Wastage') badge = 'badge-warning';

      return `
        <tr>
          <td>${new Date(t.created_at).toLocaleString()}</td>
          <td><strong>${med ? med.name : 'Unknown Medicine'}</strong></td>
          <td><span class="badge ${badge}">${t.type}</span></td>
          <td><strong>${t.quantity} units</strong></td>
          <td>${t.notes}</td>
        </tr>
      `;
    }).join('');
  },

  // ==========================================
  // SUPPLIERS SUB-TAB
  // ==========================================
  loadSuppliers: function() {
    const suppliers = window.HMS_DB.getAll(window.HMS_DB.KEYS.SUPPLIERS);
    const tbody = document.getElementById('suppliers-tbody');

    if (suppliers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No drug suppliers configured.</td></tr>`;
      return;
    }

    tbody.innerHTML = suppliers.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.contact}</td>
        <td>${s.phone}</td>
        <td>${s.address}</td>
        <td>
          <div class="demo-login-tags" style="gap:4px;">
            <button class="btn btn-outline btn-sm" onclick="window.HMS_PHARMACY.openSupplierModal('${s.id}')" title="Edit"><i class="fa-solid fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="window.HMS_PHARMACY.deleteSupplierPrompt('${s.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openSupplierModal: function(supplierId = null) {
    const s = supplierId ? window.HMS_DB.getById(window.HMS_DB.KEYS.SUPPLIERS, supplierId) : null;

    let modalOverlay = document.getElementById('supplier-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'supplier-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${s ? 'Edit Supplier Details' : 'Register New Drug Supplier'}</h3>
          <button class="modal-close" onclick="document.getElementById('supplier-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="supplier-form" novalidate>
            <input type="hidden" id="edit-sup-id" value="${s ? s.id : ''}">
            <div class="form-group">
              <label for="edit-sup-name">Supplier Company Name</label>
              <input type="text" id="edit-sup-name" value="${s ? s.name : ''}" required>
              <div class="error-msg" id="edit-sup-name-err"></div>
            </div>
            
            <div class="form-grid">
              <div class="form-group">
                <label for="edit-sup-contact">Contact Person</label>
                <input type="text" id="edit-sup-contact" value="${s ? s.contact : ''}" required>
                <div class="error-msg" id="edit-sup-contact-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-sup-phone">Phone Number</label>
                <input type="tel" id="edit-sup-phone" value="${s ? s.phone : ''}" required>
                <div class="error-msg" id="edit-sup-phone-err"></div>
              </div>
            </div>

            <div class="form-group">
              <label for="edit-sup-addr">Office Address</label>
              <input type="text" id="edit-sup-addr" value="${s ? s.address : ''}" required>
              <div class="error-msg" id="edit-sup-addr-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('supplier-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_PHARMACY.saveSupplierForm()">Save Supplier</button>
        </div>
      </div>
    `;
  },

  saveSupplierForm: function() {
    const nameEl = document.getElementById('edit-sup-name');
    const contactEl = document.getElementById('edit-sup-contact');
    const phoneEl = document.getElementById('edit-sup-phone');
    const addrEl = document.getElementById('edit-sup-addr');

    const name = nameEl.value.trim();
    const contact = contactEl.value.trim();
    const phone = phoneEl.value.trim();
    const address = addrEl.value.trim();

    let hasError = false;
    document.getElementById('edit-sup-name-err').innerText = '';
    document.getElementById('edit-sup-contact-err').innerText = '';
    document.getElementById('edit-sup-phone-err').innerText = '';
    document.getElementById('edit-sup-addr-err').innerText = '';

    if (!name) { nameEl.classList.add('error'); hasError = true; }
    if (!contact) { contactEl.classList.add('error'); hasError = true; }
    if (!phone) { phoneEl.classList.add('error'); hasError = true; }
    if (!address) { addrEl.classList.add('error'); hasError = true; }

    if (hasError) return;

    const id = document.getElementById('edit-sup-id').value;

    if (id) {
      window.HMS_DB.update(window.HMS_DB.KEYS.SUPPLIERS, id, { name, contact, phone, address });
      window.HMS_APP.toast('Supplier Updated', 'Saved details.', 'success');
    } else {
      window.HMS_DB.insert(window.HMS_DB.KEYS.SUPPLIERS, { name, contact, phone, address });
      window.HMS_APP.toast('Supplier Registered', 'Created.', 'success');
    }

    document.getElementById('supplier-modal').remove();
    this.loadSuppliers();
  },

  deleteSupplierPrompt: function(id) {
    const s = window.HMS_DB.getById(window.HMS_DB.KEYS.SUPPLIERS, id);
    if (!s) return;

    window.HMS_APP.confirm(
      'Remove Supplier',
      `Are you sure you want to delete supplier "${s.name}"?`,
      (confirmed) => {
        if (confirmed) {
          window.HMS_DB.delete(window.HMS_DB.KEYS.SUPPLIERS, id);
          window.HMS_APP.toast('Supplier Removed', 'Deleted.', 'success');
          this.loadSuppliers();
        }
      }
    );
  }
};
