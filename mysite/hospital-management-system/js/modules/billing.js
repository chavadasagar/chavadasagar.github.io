/**
 * billing.js - Unified Hospital Invoicing, live Tax/Discount calculators, Payment collection, and Insurance Claim tracking
 */

window.HMS_BILLING = {
  render: function(container, params) {
    if (params && params.id) {
      this.renderInvoiceDetail(container, params.id);
    } else {
      this.renderBillingConsole(container);
    }
  },

  renderBillingConsole: function(container) {
    container.innerHTML = `
      <div class="card tabs-container">
        <div class="tabs-header">
          <button class="tab-btn active" id="inv-tab" onclick="window.HMS_BILLING.switchTab(event, 'invoices-pane')">All Invoices</button>
          <button class="tab-btn" id="claims-tab" onclick="window.HMS_BILLING.switchTab(event, 'insurance-pane')">Insurance Claims Tracker</button>
        </div>

        <!-- INVOICES TAB -->
        <div id="invoices-pane" class="tab-pane active">
          <div class="card-header-row" style="margin-bottom:16px;">
            <h3 class="card-title">Patient Invoices</h3>
          </div>

          <div class="table-controls">
            <div class="search-filter-box">
              <div class="search-control">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="billing-search" placeholder="Search by patient name..." onkeyup="window.HMS_BILLING.filterInvoices()">
              </div>
              <select id="billing-status-filter" class="select-filter" onchange="window.HMS_BILLING.filterInvoices()">
                <option value="">All Payment Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Pending">Pending / Unpaid</option>
              </select>
            </div>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Patient Name</th>
                  <th>Subtotal</th>
                  <th>Discount %</th>
                  <th>Tax %</th>
                  <th>Net Payable</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="invoices-table-tbody">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- INSURANCE TRACKER TAB -->
        <div id="insurance-pane" class="tab-pane">
          <h3 class="card-title" style="margin-bottom:16px;">Insurance Claims Audit</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Patient</th>
                  <th>Insurance Provider</th>
                  <th>Policy Number</th>
                  <th>Claim Amount</th>
                  <th>Settled Amt</th>
                  <th>Workflow Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="claims-table-tbody">
                <!-- Dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.loadInvoicesList();
    this.loadClaimsList();
  },

  switchTab: function(e, tabId) {
    const container = e.target.closest('.tabs-container');
    container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    e.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  },

  loadInvoicesList: function() {
    const invoices = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVOICES);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const tbody = document.getElementById('invoices-table-tbody');
    const session = window.HMS_DB.getCurrentSession();

    let list = invoices;
    if (session.role === 'Patient') {
      list = invoices.filter(i => i.patient_id === session.entityId);
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No invoices found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(i => {
      const pat = patients.find(p => p.id === i.patient_id);
      let statusBadge = 'badge-danger';
      if (i.status === 'Paid') statusBadge = 'badge-success';
      else if (i.status === 'Partially Paid') statusBadge = 'badge-warning';

      return `
        <tr class="invoice-row" data-patient="${pat ? pat.name.toLowerCase() : ''}" data-status="${i.status}">
          <td><strong>#${i.id.substring(0, 8).toUpperCase()}</strong></td>
          <td><a href="#/patients?id=${i.patient_id}"><strong>${pat ? pat.name : 'Unknown'}</strong></a></td>
          <td>$${i.subtotal.toFixed(2)}</td>
          <td>${i.discount_percent}%</td>
          <td>${i.tax_percent}%</td>
          <td><strong>$${i.net_payable.toFixed(2)}</strong></td>
          <td><span class="badge ${statusBadge}">${i.status}</span></td>
          <td>
            <div class="demo-login-tags" style="gap:4px;">
              <a href="#/billing?id=${i.id}" class="btn btn-outline btn-sm" title="View details"><i class="fa-solid fa-eye"></i> Detail</a>
              <button class="btn btn-secondary btn-sm" onclick="window.HMS_BILLING.printInvoice('${i.id}')" title="Print Invoice"><i class="fa-solid fa-print"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  filterInvoices: function() {
    const searchVal = document.getElementById('billing-search').value.toLowerCase();
    const filterStatus = document.getElementById('billing-status-filter').value;

    document.querySelectorAll('.invoice-row').forEach(row => {
      const patient = row.dataset.patient;
      const status = row.dataset.status;

      const matchSearch = patient.includes(searchVal);
      const matchFilter = !filterStatus || status === filterStatus;

      if (matchSearch && matchFilter) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  },

  // ==========================================
  // INVOICE DETAIL & CALCULATOR VIEW
  // ==========================================
  renderInvoiceDetail: function(container, invId) {
    const inv = window.HMS_DB.getById(window.HMS_DB.KEYS.INVOICES, invId);
    if (!inv) {
      container.innerHTML = `<h2>Invoice Not Found</h2>`;
      return;
    }

    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, inv.patient_id);
    const items = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVOICE_ITEMS).filter(item => item.invoice_id === invId);
    const pmts = window.HMS_DB.getAll(window.HMS_DB.KEYS.PAYMENTS).filter(p => p.invoice_id === invId);
    const session = window.HMS_DB.getCurrentSession();

    // Calc remaining balance
    const totalPaid = pmts.reduce((sum, p) => sum + p.amount_paid, 0);
    const balance = Math.max(0, inv.net_payable - totalPaid);

    container.innerHTML = `
      <div class="dashboard-split-grid" style="grid-template-columns: 1.5fr 1fr;">
        <!-- Left Panel: Line Items & Calculation -->
        <div class="card">
          <div class="card-header-row" style="margin-bottom:20px;">
            <h3>Invoice Details</h3>
            <span class="badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Partially Paid' ? 'badge-warning' : 'badge-danger'}">${inv.status}</span>
          </div>

          <div style="margin-bottom:20px; font-size:14px;">
            <p><strong>Invoice Reference:</strong> #${inv.id.toUpperCase()}</p>
            <p><strong>Patient Name:</strong> ${pat ? pat.name : 'Unknown'}</p>
            <p><strong>Issued Date:</strong> ${new Date(inv.created_at).toLocaleDateString()}</p>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Billing Category</th>
                  <th>Description</th>
                  <th style="text-align:right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td><span class="badge badge-info">${item.type}</span></td>
                    <td>${item.description}</td>
                    <td style="text-align:right;"><strong>$${item.amount.toFixed(2)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Edit Calculations Panel (Admin/Receptionist only, only if not fully paid) -->
          <div class="current-time-display" style="padding:16px; margin-top:20px; border-radius:10px;">
            <div class="form-grid" style="margin-bottom:12px;">
              <div class="form-group">
                <label for="inv-discount-input">Discount Percent (%)</label>
                <input type="number" id="inv-discount-input" min="0" max="100" value="${inv.discount_percent}" 
                       oninput="window.HMS_BILLING.recalculateLive('${invId}')"
                       ${['Admin', 'Receptionist'].includes(session.role) && inv.status !== 'Paid' ? '' : 'disabled'}>
              </div>
              <div class="form-group">
                <label for="inv-tax-input">Tax GST Percent (%)</label>
                <input type="number" id="inv-tax-input" min="0" max="25" value="${inv.tax_percent}" 
                       oninput="window.HMS_BILLING.recalculateLive('${invId}')"
                       ${['Admin', 'Receptionist'].includes(session.role) && inv.status !== 'Paid' ? '' : 'disabled'}>
              </div>
            </div>
            
            <div style="border-top:1px dashed var(--border); padding-top:12px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Subtotal:</span>
                <strong id="live-subtotal">$${inv.subtotal.toFixed(2)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Discount Deduction:</span>
                <strong id="live-discount" style="color:var(--success);">- $${(inv.subtotal * inv.discount_percent / 100).toFixed(2)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span>Tax Addition:</span>
                <strong id="live-tax" style="color:var(--danger);">+ $${(inv.subtotal * inv.tax_percent / 100).toFixed(2)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:700; margin-top:8px;">
                <span>Net Payable:</span>
                <span id="live-net" style="color:var(--primary);">$${inv.net_payable.toFixed(2)}</span>
              </div>
            </div>

            ${['Admin', 'Receptionist'].includes(session.role) && inv.status !== 'Paid' ? `
              <button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="window.HMS_BILLING.saveLiveCalculations('${invId}')">
                <i class="fa-solid fa-save"></i> Save Calculations
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Right Panel: Payments log & Claims -->
        <div>
          <!-- Payments Panel -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom:16px;">Payments Collected</h3>
            
            ${pmts.length === 0 ? `
              <p class="text-muted" style="margin-bottom:16px;">No payments recorded against this invoice.</p>
            ` : `
              <div class="table-wrapper" style="margin-bottom:16px;">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th style="text-align:right;">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pmts.map(p => `
                      <tr>
                        <td>${p.transaction_date}</td>
                        <td><span class="badge badge-success">${p.payment_mode}</span></td>
                        <td style="text-align:right;">$${p.amount_paid.toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}

            <div style="display:flex; justify-content:space-between; margin-bottom:16px; font-weight:600;">
              <span>Remaining Balance:</span>
              <span style="color:var(--danger);">$${balance.toFixed(2)}</span>
            </div>

            ${balance > 0 && ['Admin', 'Receptionist', 'Patient'].includes(session.role) ? `
              <button class="btn btn-success btn-block" onclick="window.HMS_BILLING.openPaymentModal('${invId}', ${balance})">
                <i class="fa-solid fa-credit-card"></i> Collect / Pay Dues
              </button>
            ` : ''}
          </div>

          <!-- Insurance claim tracker (if applicable) -->
          <div class="card" id="insurance-tracker-card-outlet">
            <!-- Loaded dynamically based on claims -->
          </div>
        </div>
      </div>
    `;

    this.renderInsuranceStepperCard(invId);
  },

  recalculateLive: function(invId) {
    const inv = window.HMS_DB.getById(window.HMS_DB.KEYS.INVOICES, invId);
    if (!inv) return;

    const discInput = document.getElementById('inv-discount-input');
    const taxInput = document.getElementById('inv-tax-input');

    let disc = parseFloat(discInput.value) || 0;
    let tax = parseFloat(taxInput.value) || 0;

    // Bounds check
    if (disc < 0) disc = 0; if (disc > 100) disc = 100;
    if (tax < 0) tax = 0; if (tax > 25) tax = 25;

    const discountAmt = inv.subtotal * (disc / 100);
    const taxAmt = inv.subtotal * (tax / 100);
    const net = inv.subtotal - discountAmt + taxAmt;

    document.getElementById('live-discount').innerText = `- $${discountAmt.toFixed(2)}`;
    document.getElementById('live-tax').innerText = `+ $${taxAmt.toFixed(2)}`;
    document.getElementById('live-net').innerText = `$${net.toFixed(2)}`;
  },

  saveLiveCalculations: function(invId) {
    const disc = parseFloat(document.getElementById('inv-discount-input').value) || 0;
    const tax = parseFloat(document.getElementById('inv-tax-input').value) || 0;

    const inv = window.HMS_DB.getById(window.HMS_DB.KEYS.INVOICES, invId);
    if (!inv) return;

    const discountAmt = inv.subtotal * (disc / 100);
    const taxAmt = inv.subtotal * (tax / 100);
    const net = inv.subtotal - discountAmt + taxAmt;

    window.HMS_DB.update(window.HMS_DB.KEYS.INVOICES, invId, {
      discount_percent: disc,
      tax_percent: tax,
      net_payable: net
    });

    window.HMS_APP.toast('Calculations Saved', 'Tax and discount factors successfully saved.', 'success');
    this.renderInvoiceDetail(document.getElementById('view-outlet'), invId);
  },

  openPaymentModal: function(invId, balance) {
    let modalOverlay = document.getElementById('payment-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'payment-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Record Inbound Payment</h3>
          <button class="modal-close" onclick="document.getElementById('payment-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="payment-form" novalidate>
            <div class="form-group">
              <label for="payment-amt-input">Amount to Pay ($)</label>
              <input type="number" id="payment-amt-input" min="0.01" max="${balance}" step="0.01" value="${balance.toFixed(2)}" required>
              <div class="error-msg" id="payment-amt-err"></div>
            </div>
            
            <div class="form-group">
              <label for="payment-mode-select">Payment Mode</label>
              <select id="payment-mode-select" onchange="window.HMS_BILLING.toggleInsuranceInputs()" required>
                <option value="Cash">Cash</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="UPI">UPI (GooglePay/ApplePay)</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Insurance">Insurance Provider Claim</option>
              </select>
            </div>

            <!-- Conditional Insurance Fields -->
            <div id="insurance-form-group" class="hidden">
              <div class="form-group">
                <label for="ins-company">Insurance Company Name</label>
                <input type="text" id="ins-company" placeholder="e.g. BlueCross Shield">
              </div>
              <div class="form-group">
                <label for="ins-policy">Policy Number / Pre-auth Code</label>
                <input type="text" id="ins-policy" placeholder="e.g. POL-12345">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('payment-modal').remove()">Cancel</button>
          <button class="btn btn-success" onclick="window.HMS_BILLING.recordPayment('${invId}', ${balance})">Confirm Payment</button>
        </div>
      </div>
    `;
  },

  toggleInsuranceInputs: function() {
    const mode = document.getElementById('payment-mode-select').value;
    const insFields = document.getElementById('insurance-form-group');
    if (mode === 'Insurance') {
      insFields.classList.remove('hidden');
    } else {
      insFields.classList.add('hidden');
    }
  },

  recordPayment: function(invId, balance) {
    const amtEl = document.getElementById('payment-amt-input');
    const mode = document.getElementById('payment-mode-select').value;
    const amt = parseFloat(amtEl.value);

    let hasError = false;
    document.getElementById('payment-amt-err').innerText = '';
    amtEl.classList.remove('error');

    if (isNaN(amt) || amt <= 0 || amt > balance + 0.01) {
      document.getElementById('payment-amt-err').innerText = `Please enter a payment between $0.01 and $${balance.toFixed(2)}`;
      amtEl.classList.add('error');
      hasError = true;
    }

    if (hasError) return;

    // Record Payment log
    window.HMS_DB.insert(window.HMS_DB.KEYS.PAYMENTS, {
      invoice_id: invId,
      amount_paid: amt,
      payment_mode: mode,
      transaction_date: '2026-07-14'
    });

    const inv = window.HMS_DB.getById(window.HMS_DB.KEYS.INVOICES, invId);

    // Calculate new total payments
    const pmts = window.HMS_DB.getAll(window.HMS_DB.KEYS.PAYMENTS).filter(p => p.invoice_id === invId);
    const totalPaid = pmts.reduce((sum, p) => sum + p.amount_paid, 0);

    let newStatus = 'Pending';
    if (totalPaid >= inv.net_payable - 0.01) {
      newStatus = 'Paid';
    } else if (totalPaid > 0) {
      newStatus = 'Partially Paid';
    }

    // Update invoice state
    window.HMS_DB.update(window.HMS_DB.KEYS.INVOICES, invId, {
      status: newStatus
    });

    // If payment mode is Insurance, record an insurance claim
    if (mode === 'Insurance') {
      const company = document.getElementById('ins-company').value.trim() || 'General Insurance';
      const policy = document.getElementById('ins-policy').value.trim() || 'POL-MOCK';

      window.HMS_DB.insert(window.HMS_DB.KEYS.INSURANCE_CLAIMS, {
        invoice_id: invId,
        patient_id: inv.patient_id,
        company_name: company,
        policy_number: policy,
        status: 'Submitted',
        claim_amount: amt,
        approved_amount: 0,
        notes: 'Pre-auth verification pending.'
      });

      window.HMS_APP.toast('Insurance Claim Logged', 'A claim has been registered in the audit queue.', 'info');
    }

    window.HMS_APP.toast('Payment Recorded', `Amount of $${amt.toFixed(2)} credited via ${mode}.`, 'success');
    document.getElementById('payment-modal').remove();

    // Reload view details
    this.renderInvoiceDetail(document.getElementById('view-outlet'), invId);
  },

  // ==========================================
  // INSURANCE STEPPER CARD RENDERING
  // ==========================================
  renderInsuranceStepperCard: function(invId) {
    const claims = window.HMS_DB.getAll(window.HMS_DB.KEYS.INSURANCE_CLAIMS).filter(c => c.invoice_id === invId);
    const outlet = document.getElementById('insurance-tracker-card-outlet');
    if (!outlet) return;

    if (claims.length === 0) {
      outlet.parentNode.removeChild(outlet);
      return;
    }

    const c = claims[0]; // Get primary claim

    const steps = ['Submitted', 'Approved', 'Settled'];
    const currentIdx = steps.indexOf(c.status);

    outlet.innerHTML = `
      <h3 class="card-title" style="margin-bottom:16px;">Insurance Settlement Progress</h3>
      <p style="font-size:13px; margin-bottom:4px;"><strong>Carrier:</strong> ${c.company_name}</p>
      <p style="font-size:13px; margin-bottom:4px;"><strong>Policy No:</strong> ${c.policy_number}</p>
      <p style="font-size:13px; margin-bottom:16px;"><strong>Claim Amount:</strong> $${c.claim_amount.toFixed(2)}</p>
      
      <!-- Horizontal Stepper -->
      <div class="tracking-stepper" style="margin: 20px 0;">
        <div class="tracking-progress-bar" style="width: ${c.status === 'Settled' ? '100' : c.status === 'Approved' ? '50' : '0'}%"></div>
        
        <div class="tracking-step ${currentIdx >= 0 ? 'completed' : ''}">
          <div class="tracking-dot"><i class="fa-solid fa-file-export"></i></div>
          <div class="tracking-label">Filed</div>
        </div>
        <div class="tracking-step ${currentIdx >= 1 ? 'completed' : ''} ${c.status === 'Approved' ? 'active' : ''}">
          <div class="tracking-dot"><i class="fa-solid fa-shield-halved"></i></div>
          <div class="tracking-label">Approved</div>
        </div>
        <div class="tracking-step ${currentIdx >= 2 ? 'completed' : ''} ${c.status === 'Settled' ? 'active' : ''}">
          <div class="tracking-dot"><i class="fa-solid fa-hand-holding-dollar"></i></div>
          <div class="tracking-label">Settled</div>
        </div>
      </div>
      
      ${c.approved_amount > 0 ? `
        <div class="current-time-display" style="font-size:12px; margin-top:12px; border-radius:6px; font-weight:600;">
          Approved Amount: $${c.approved_amount.toFixed(2)}
        </div>
      ` : ''}
    `;
  },

  // ==========================================
  // CLAIMS MANAGEMENT LIST (Admin Console)
  // ==========================================
  loadClaimsList: function() {
    const claims = window.HMS_DB.getAll(window.HMS_DB.KEYS.INSURANCE_CLAIMS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const tbody = document.getElementById('claims-table-tbody');
    const session = window.HMS_DB.getCurrentSession();

    if (claims.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No insurance claims in the tracker catalog.</td></tr>`;
      return;
    }

    tbody.innerHTML = claims.map(c => {
      const pat = patients.find(p => p.id === c.patient_id);
      return `
        <tr>
          <td><strong>#${c.id.substring(0, 8).toUpperCase()}</strong></td>
          <td><strong>${pat ? pat.name : 'Patient'}</strong></td>
          <td>${c.company_name}</td>
          <td><code>${c.policy_number}</code></td>
          <td><strong>$${c.claim_amount.toFixed(2)}</strong></td>
          <td>$${c.approved_amount ? c.approved_amount.toFixed(2) : '0.00'}</td>
          <td><span class="badge badge-info">${c.status}</span></td>
          <td>
            ${c.status !== 'Settled' && ['Admin', 'Receptionist'].includes(session.role) ? `
              <button class="btn btn-primary btn-sm" onclick="window.HMS_BILLING.openUpdateClaimModal('${c.id}')">Update Status</button>
            ` : '<span class="text-muted">No Actions</span>'}
          </td>
        </tr>
      `;
    }).join('');
  },

  openUpdateClaimModal: function(claimId) {
    const c = window.HMS_DB.getById(window.HMS_DB.KEYS.INSURANCE_CLAIMS, claimId);
    if (!c) return;

    let modalOverlay = document.getElementById('claim-update-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'claim-update-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Update Insurance Claim</h3>
          <button class="modal-close" onclick="document.getElementById('claim-update-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="claim-update-form" novalidate>
            <div class="form-group">
              <label for="claim-status-select">Status Action</label>
              <select id="claim-status-select" required>
                <option value="Approved" ${c.status === 'Approved' ? 'selected' : ''}>Approved / Pre-auth verified</option>
                <option value="Settled" ${c.status === 'Settled' ? 'selected' : ''}>Settled (Carrier paid amount)</option>
                <option value="Rejected" ${c.status === 'Rejected' ? 'selected' : ''}>Rejected / Denied claim</option>
              </select>
            </div>
            <div class="form-group">
              <label for="claim-approved-input">Approved Amount ($)</label>
              <input type="number" id="claim-approved-input" min="0" max="${c.claim_amount}" value="${c.approved_amount || c.claim_amount}">
              <div class="error-msg" id="claim-approved-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('claim-update-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_BILLING.executeUpdateClaim('${claimId}')">Update Settlement</button>
        </div>
      </div>
    `;
  },

  executeUpdateClaim: function(claimId) {
    const status = document.getElementById('claim-status-select').value;
    const approvedAmt = parseFloat(document.getElementById('claim-approved-input').value) || 0;

    window.HMS_DB.update(window.HMS_DB.KEYS.INSURANCE_CLAIMS, claimId, {
      status: status,
      approved_amount: approvedAmt
    });

    window.HMS_APP.toast('Claim Settled', `Insurance claim status updated to: ${status}`, 'success');
    document.getElementById('claim-update-modal').remove();
    this.loadClaimsList();
  },

  // ==========================================
  // BILLING DATA INJECTIONS (Other Modules call these)
  // ==========================================
  getOrCreatePendingInvoice: function(patientId) {
    const invoices = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVOICES);
    let inv = invoices.find(i => i.patient_id === patientId && i.status === 'Pending');

    if (!inv) {
      inv = window.HMS_DB.insert(window.HMS_DB.KEYS.INVOICES, {
        patient_id: patientId,
        subtotal: 0,
        discount_percent: 0,
        tax_percent: 5,
        net_payable: 0,
        status: 'Pending'
      });
    }
    return inv.id;
  },

  appendInvoiceItem: function(invoiceId, desc, amt, category) {
    window.HMS_DB.insert(window.HMS_DB.KEYS.INVOICE_ITEMS, {
      invoice_id: invoiceId,
      description: desc,
      amount: amt,
      type: category
    });

    // Recalculate Invoice totals
    const items = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVOICE_ITEMS).filter(it => it.invoice_id === invoiceId);
    const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
    
    const inv = window.HMS_DB.getById(window.HMS_DB.KEYS.INVOICES, invoiceId);
    const disc = inv.discount_percent;
    const tax = inv.tax_percent;

    const discountAmt = subtotal * (disc / 100);
    const taxAmt = subtotal * (tax / 100);
    const net = subtotal - discountAmt + taxAmt;

    window.HMS_DB.update(window.HMS_DB.KEYS.INVOICES, invoiceId, {
      subtotal: subtotal,
      net_payable: net
    });
  },

  createConsultationInvoice: function(patientId, doctor) {
    const invId = this.getOrCreatePendingInvoice(patientId);
    this.appendInvoiceItem(invId, `Clinical Outpatient Consultation (${doctor.name})`, doctor.consultation_fee, 'Consultation');
  },

  createBedInvoice: function(patientId, wardId, days, charges) {
    const invId = this.getOrCreatePendingInvoice(patientId);
    const ward = window.HMS_DB.getById(window.HMS_DB.KEYS.WARDS, wardId);
    this.appendInvoiceItem(invId, `${ward ? ward.name : 'Ward'} Bed Stay Charges (${days} day(s))`, charges, 'Bed');
  },

  createLabInvoice: function(patientId, testMaster) {
    const invId = this.getOrCreatePendingInvoice(patientId);
    this.appendInvoiceItem(invId, `Lab test order: ${testMaster.test_name}`, testMaster.price, 'Lab');
  },

  createPharmacyInvoice: function(patientId, presId, cost, medsSummary) {
    const invId = this.getOrCreatePendingInvoice(patientId);
    this.appendInvoiceItem(invId, `Pharmacy Prescription fill #${presId.substring(0,8).toUpperCase()} (${medsSummary})`, cost, 'Medicine');
  },

  createSurgeryInvoice: function(patientId, surgeryType, cost) {
    const invId = this.getOrCreatePendingInvoice(patientId);
    this.appendInvoiceItem(invId, `Surgery / OT Room Charges: ${surgeryType}`, cost, 'Surgery');
  },

  // ==========================================
  // PRINT LAYOUT GENERATION
  // ==========================================
  printInvoice: function(invId) {
    const inv = window.HMS_DB.getById(window.HMS_DB.KEYS.INVOICES, invId);
    if (!inv) return;

    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, inv.patient_id);
    const items = window.HMS_DB.getAll(window.HMS_DB.KEYS.INVOICE_ITEMS).filter(it => it.invoice_id === invId);

    let printContainer = document.getElementById('hms-print-container');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'hms-print-container';
      printContainer.className = 'print-only-layout';
      document.body.appendChild(printContainer);
    }

    printContainer.innerHTML = `
      <div class="print-only-header">
        <div class="hospital-title">AEGIS CLINICS & HOSPITAL</div>
        <div class="hospital-subtitle">123 Health Ave, Springfield | Billing Department | Tax Invoice</div>
      </div>

      <div style="border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="text-align: center; margin-bottom: 16px;">PATIENT TAX INVOICE</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p><strong>Billed To:</strong> ${pat ? pat.name : ''}</p>
            <p><strong>Contact phone:</strong> ${pat ? pat.phone : ''}</p>
            <p><strong>Address:</strong> ${pat ? pat.address : ''}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Invoice ID:</strong> ${inv.id.toUpperCase()}</p>
            <p><strong>Date of Issue:</strong> ${new Date(inv.created_at).toLocaleDateString()}</p>
            <p><strong>Billing Status:</strong> ${inv.status.toUpperCase()}</p>
          </div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:20px;">
        <thead>
          <tr style="border-bottom: 1px solid #000; background-color:#f0f0f0;">
            <th style="text-align:left; padding:8px;">#</th>
            <th style="text-align:left; padding:8px;">Category</th>
            <th style="text-align:left; padding:8px;">Line Item details</th>
            <th style="text-align:right; padding:8px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => `
            <tr style="border-bottom: 1px dashed #ccc;">
              <td style="padding:8px;">${idx + 1}</td>
              <td style="padding:8px;">${item.type}</td>
              <td style="padding:8px;">${item.description}</td>
              <td style="padding:8px; text-align:right;">$${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; display:flex; justify-content:flex-end;">
        <div style="width: 250px; font-size:13px; line-height:1.6;">
          <div style="display:flex; justify-content:space-between;">
            <span>Subtotal:</span>
            <span>$${inv.subtotal.toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:green;">
            <span>Discount (${inv.discount_percent}%):</span>
            <span>- $${(inv.subtotal * inv.discount_percent / 100).toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Tax GST (${inv.tax_percent}%):</span>
            <span>+ $${(inv.subtotal * inv.tax_percent / 100).toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid #000; padding-top:4px; margin-top:4px; font-size:14px;">
            <span>Total Payable:</span>
            <span>$${inv.net_payable.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 80px; text-align:center;">
        <p style="font-size:11px; color:#666;">Thank you for choosing Aegis Health Systems.</p>
        <p style="font-size:9px; color:#999; margin-top:4px;">This is a computer generated invoice. No physical seal is required.</p>
      </div>

      <div class="print-only-footer">
        Aegis Billing Dept. Springfield. 
      </div>
    `;

    window.print();
  }
};
