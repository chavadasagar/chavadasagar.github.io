/**
 * lab.js - Lab diagnostics master list, ordering tests, technician dashboards, and report generation
 */

window.HMS_LAB = {
  render: function(container, params) {
    const session = window.HMS_DB.getCurrentSession();
    if (!session) return;

    if (session.role === 'Lab Technician') {
      this.renderTechDashboard(container);
    } else {
      this.renderGeneralLabPanel(container);
    }
  },

  renderTechDashboard: function(container) {
    container.innerHTML = `
      <div class="card">
        <h3 class="card-title" style="margin-bottom: 20px;">Technician Diagnostics Worklist</h3>
        
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order Date</th>
                <th>Patient Name</th>
                <th>Diagnostic Test</th>
                <th>Prescribed By</th>
                <th>Current Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="tech-orders-tbody">
              <!-- Loaded dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.loadTechOrders();
  },

  loadTechOrders: function() {
    const orders = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TEST_ORDERS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const tests = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TESTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const tbody = document.getElementById('tech-orders-tbody');

    const pending = orders.filter(o => o.status !== 'Completed');
    
    if (pending.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending diagnostics tests in the queue.</td></tr>`;
      return;
    }

    tbody.innerHTML = pending.map(o => {
      const pat = patients.find(p => p.id === o.patient_id);
      const test = tests.find(t => t.id === o.test_id);
      const doc = doctors.find(d => d.id === o.doctor_id);

      let badge = 'badge-info';
      if (o.status === 'Sample Collected') badge = 'badge-warning';
      else if (o.status === 'Processing') badge = 'badge-warning';

      return `
        <tr>
          <td><strong>${new Date(o.created_at).toLocaleDateString()}</strong></td>
          <td><strong>${pat ? pat.name : 'Unknown'}</strong></td>
          <td>${test ? test.test_name : 'Lab Test'}</td>
          <td>${doc ? doc.name : 'Doctor'}</td>
          <td><span class="badge ${badge}">${o.status}</span></td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="window.HMS_LAB.openUpdateStatusModal('${o.id}')">
              Update Status
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openUpdateStatusModal: function(orderId) {
    const o = window.HMS_DB.getById(window.HMS_DB.KEYS.LAB_TEST_ORDERS, orderId);
    if (!o) return;

    let modalOverlay = document.getElementById('lab-update-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'lab-update-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    const states = ['Ordered', 'Sample Collected', 'Processing', 'Completed'];
    const currentIdx = states.indexOf(o.status);
    const nextState = currentIdx < states.length - 1 ? states[currentIdx + 1] : null;

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Update Lab Test Order status</h3>
          <button class="modal-close" onclick="document.getElementById('lab-update-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:12px;">Current Order Status: <span class="badge badge-warning">${o.status}</span></p>
          
          ${nextState ? `
            <p style="margin-bottom:16px;">Advance order status to: <strong>${nextState}</strong>?</p>
            
            ${nextState === 'Completed' ? `
              <div class="form-group">
                <label for="lab-result-input">Diagnostic Result Values</label>
                <textarea id="lab-result-input" rows="3" placeholder="e.g. Hemoglobin: 14.5 g/dL, RBC: 4.8 M/uL (Normal)"></textarea>
                <div class="error-msg" id="lab-result-err"></div>
              </div>
              <div class="form-group">
                <label for="lab-file-input">Mock Report File Attachment name</label>
                <input type="text" id="lab-file-input" value="report_${o.id.substring(0,8)}.pdf">
              </div>
            ` : ''}
          ` : `
            <p>This test order is already completed.</p>
          `}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('lab-update-modal').remove()">Cancel</button>
          ${nextState ? `
            <button class="btn btn-primary" onclick="window.HMS_LAB.executeUpdateStatus('${orderId}', '${nextState}')">Confirm Status Update</button>
          ` : ''}
        </div>
      </div>
    `;
  },

  executeUpdateStatus: function(orderId, nextState) {
    const updates = { status: nextState };

    if (nextState === 'Completed') {
      const resVal = document.getElementById('lab-result-input').value.trim();
      const fileVal = document.getElementById('lab-file-input').value.trim();

      if (!resVal) {
        document.getElementById('lab-result-err').innerText = 'Please input the lab result readings';
        document.getElementById('lab-result-input').classList.add('error');
        return;
      }

      updates.result_value = resVal;
      updates.mock_report_file = fileVal || 'report.pdf';
    }

    window.HMS_DB.update(window.HMS_DB.KEYS.LAB_TEST_ORDERS, orderId, updates);
    window.HMS_APP.toast('Status Changed', `Order progressed to ${nextState}.`, 'success');
    document.getElementById('lab-update-modal').remove();
    
    // Refresh Tech or General list depending on view
    const session = window.HMS_DB.getCurrentSession();
    if (session.role === 'Lab Technician') {
      this.loadTechOrders();
    } else {
      this.loadGeneralOrders();
    }
  },

  // ==========================================
  // GENERAL CLINICAL VIEW (Doctors/Admin/Receptionists)
  // ==========================================
  renderGeneralLabPanel: function(container) {
    const session = window.HMS_DB.getCurrentSession();
    container.innerHTML = `
      <div class="card">
        <div class="card-header-row" style="margin-bottom: 20px;">
          <h3 class="card-title">Diagnostics & Lab test orders</h3>
          ${['Admin', 'Doctor'].includes(session.role) ? `
            <button class="btn btn-primary" onclick="window.HMS_LAB.openOrderTestModal()">
              <i class="fa-solid fa-flask"></i> Order Lab Test
            </button>
          ` : ''}
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order Date</th>
                <th>Patient</th>
                <th>Lab Test</th>
                <th>Attending Doctor</th>
                <th>Results</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="general-orders-tbody">
              <!-- Loaded dynamically -->
            </tbody>
          </table>
        </div>
      </div>

      ${session.role === 'Admin' ? `
        <!-- Test Master Config Card -->
        <div class="card">
          <div class="card-header-row" style="margin-bottom:16px;">
            <h3 class="card-title">Laboratory Test Config Master</h3>
            <button class="btn btn-outline" onclick="window.HMS_LAB.openMasterTestModal()">
              <i class="fa-solid fa-plus"></i> Configure New Test
            </button>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Category</th>
                  <th>Standard Reference Normal Range</th>
                  <th>Price ($)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="master-tests-tbody">
                <!-- Loaded dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;

    this.loadGeneralOrders();
    if (session.role === 'Admin') {
      this.loadMasterTests();
    }
  },

  loadGeneralOrders: function() {
    const orders = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TEST_ORDERS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const tests = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TESTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const tbody = document.getElementById('general-orders-tbody');
    const session = window.HMS_DB.getCurrentSession();

    let list = orders;
    if (session.role === 'Patient') {
      list = orders.filter(o => o.patient_id === session.entityId);
    } else if (session.role === 'Doctor') {
      list = orders.filter(o => o.doctor_id === session.entityId);
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No diagnostics orders recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(o => {
      const pat = patients.find(p => p.id === o.patient_id);
      const test = tests.find(t => t.id === o.test_id);
      const doc = doctors.find(d => d.id === o.doctor_id);

      let badge = 'badge-info';
      if (o.status === 'Completed') badge = 'badge-success';
      else if (o.status === 'Sample Collected' || o.status === 'Processing') badge = 'badge-warning';

      return `
        <tr>
          <td><strong>${new Date(o.created_at).toLocaleDateString()}</strong></td>
          <td><a href="#/patients?id=${o.patient_id}"><strong>${pat ? pat.name : 'Unknown'}</strong></a></td>
          <td>${test ? test.test_name : 'Lab Test'}</td>
          <td>${doc ? doc.name : 'Doctor'}</td>
          <td>
            ${o.status === 'Completed' ? `
              <div style="font-size:12px; margin-bottom:4px;"><code>${o.result_value}</code></div>
              <button class="btn btn-secondary btn-sm" onclick="window.HMS_LAB.printReport('${o.id}')">
                <i class="fa-solid fa-print"></i> Report Card
              </button>
            ` : `<span class="text-muted">Awaiting analysis</span>`}
          </td>
          <td><span class="badge ${badge}">${o.status}</span></td>
        </tr>
      `;
    }).join('');
  },

  openOrderTestModal: function(preSelectedPatientId = null) {
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const tests = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TESTS);

    let modalOverlay = document.getElementById('order-test-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'order-test-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Order Diagnostics Test</h3>
          <button class="modal-close" onclick="document.getElementById('order-test-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="order-test-form" novalidate>
            <div class="form-group">
              <label for="order-test-patient">Choose Patient</label>
              <select id="order-test-patient" required>
                <option value="">-- Select Patient --</option>
                ${patients.map(p => `<option value="${p.id}" ${preSelectedPatientId === p.id ? 'selected' : ''}>${p.name} (${p.phone})</option>`).join('')}
              </select>
              <div class="error-msg" id="order-test-patient-err"></div>
            </div>

            <div class="form-group">
              <label for="order-test-doctor">Prescribing Consultant</label>
              <select id="order-test-doctor" required>
                <option value="">-- Select Doctor --</option>
                ${doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
              </select>
              <div class="error-msg" id="order-test-doctor-err"></div>
            </div>

            <div class="form-group">
              <label for="order-test-select">Choose Lab / Radiology Test</label>
              <select id="order-test-select" required>
                <option value="">-- Select Test --</option>
                ${tests.map(t => `<option value="${t.id}">${t.test_name} ($${t.price})</option>`).join('')}
              </select>
              <div class="error-msg" id="order-test-select-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('order-test-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_LAB.saveLabOrder()">Place Order</button>
        </div>
      </div>
    `;
  },

  saveLabOrder: function() {
    const fields = ['order-test-patient', 'order-test-doctor', 'order-test-select'];
    let hasError = false;

    fields.forEach(f => {
      document.getElementById(`${f}-err`).innerText = '';
      document.getElementById(f).classList.remove('error');
    });

    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      const val = el.value.trim();
      if (!val) {
        document.getElementById(`${f}-err`).innerText = 'This field is required';
        el.classList.add('error');
        hasError = true;
      } else {
        data[f.replace('order-test-', '')] = val;
      }
    });

    if (hasError) return;

    // 1. Create order
    const order = window.HMS_DB.insert(window.HMS_DB.KEYS.LAB_TEST_ORDERS, {
      patient_id: data.patient,
      doctor_id: data.doctor,
      test_id: data.select,
      appointment_id: null,
      status: 'Ordered',
      result_value: '',
      mock_report_file: ''
    });

    // 2. Add line item to invoice automatically
    const testMaster = window.HMS_DB.getById(window.HMS_DB.KEYS.LAB_TESTS, data.select);
    if (testMaster && window.HMS_BILLING) {
      window.HMS_BILLING.createLabInvoice(data.patient, testMaster);
    }

    window.HMS_APP.toast('Diagnostics Ordered', 'Lab request registered. Bill generated.', 'success');
    document.getElementById('order-test-modal').remove();
    this.loadGeneralOrders();
  },

  // ==========================================
  // MASTER TEST CONFIG (Admin only)
  // ==========================================
  loadMasterTests: function() {
    const tests = window.HMS_DB.getAll(window.HMS_DB.KEYS.LAB_TESTS);
    const tbody = document.getElementById('master-tests-tbody');
    
    tbody.innerHTML = tests.map(t => `
      <tr>
        <td><strong>${t.test_name}</strong></td>
        <td><span class="badge badge-info">${t.category}</span></td>
        <td><code>${t.normal_range}</code></td>
        <td><strong>$${t.price.toFixed(2)}</strong></td>
        <td>
          <div class="demo-login-tags" style="gap:4px;">
            <button class="btn btn-outline btn-sm" onclick="window.HMS_LAB.openMasterTestModal('${t.id}')" title="Edit"><i class="fa-solid fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="window.HMS_LAB.deleteMasterTestPrompt('${t.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openMasterTestModal: function(testId = null) {
    const t = testId ? window.HMS_DB.getById(window.HMS_DB.KEYS.LAB_TESTS, testId) : null;

    let modalOverlay = document.getElementById('master-test-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'master-test-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${t ? 'Edit Lab Test Config' : 'Configure New Laboratory Test'}</h3>
          <button class="modal-close" onclick="document.getElementById('master-test-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="master-test-form" novalidate>
            <input type="hidden" id="edit-test-id" value="${t ? t.id : ''}">
            <div class="form-group">
              <label for="edit-test-name">Test Name</label>
              <input type="text" id="edit-test-name" value="${t ? t.test_name : ''}" required>
              <div class="error-msg" id="edit-test-name-err"></div>
            </div>
            
            <div class="form-grid">
              <div class="form-group">
                <label for="edit-test-cat">Category</label>
                <select id="edit-test-cat" required>
                  <option value="">-- Choose Category --</option>
                  <option value="Hematology" ${t && t.category === 'Hematology' ? 'selected' : ''}>Hematology</option>
                  <option value="Biochemistry" ${t && t.category === 'Biochemistry' ? 'selected' : ''}>Biochemistry</option>
                  <option value="Endocrinology" ${t && t.category === 'Endocrinology' ? 'selected' : ''}>Endocrinology</option>
                  <option value="Radiology" ${t && t.category === 'Radiology' ? 'selected' : ''}>Radiology</option>
                </select>
                <div class="error-msg" id="edit-test-cat-err"></div>
              </div>
              <div class="form-group">
                <label for="edit-test-price">Billing Price ($)</label>
                <input type="number" id="edit-test-price" min="0" value="${t ? t.price : ''}" required>
                <div class="error-msg" id="edit-test-price-err"></div>
              </div>
            </div>

            <div class="form-group">
              <label for="edit-test-range">Reference Range (Normal Limits)</label>
              <input type="text" id="edit-test-range" placeholder="e.g. Hemoglobin: 13.5-17.5 g/dL" value="${t ? t.normal_range : ''}" required>
              <div class="error-msg" id="edit-test-range-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('master-test-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_LAB.saveMasterTestForm()">Save Test</button>
        </div>
      </div>
    `;
  },

  saveMasterTestForm: function() {
    const fields = ['edit-test-name', 'edit-test-cat', 'edit-test-price', 'edit-test-range'];
    let hasError = false;

    fields.forEach(f => {
      document.getElementById(`${f}-err`).innerText = '';
      document.getElementById(f).classList.remove('error');
    });

    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      const val = el.value.trim();
      if (!val) {
        document.getElementById(`${f}-err`).innerText = 'This field is required';
        el.classList.add('error');
        hasError = true;
      } else {
        data[f.replace('edit-test-', '')] = val;
      }
    });

    if (hasError) return;

    const id = document.getElementById('edit-test-id').value;

    if (id) {
      window.HMS_DB.update(window.HMS_DB.KEYS.LAB_TESTS, id, {
        test_name: data.name,
        category: data.cat,
        price: parseFloat(data.price),
        normal_range: data.range
      });
      window.HMS_APP.toast('Test Config Saved', 'Successfully updated.', 'success');
    } else {
      window.HMS_DB.insert(window.HMS_DB.KEYS.LAB_TESTS, {
        test_name: data.name,
        category: data.cat,
        price: parseFloat(data.price),
        normal_range: data.range
      });
      window.HMS_APP.toast('Test Config Added', 'New test configured.', 'success');
    }

    document.getElementById('master-test-modal').remove();
    this.renderGeneralLabPanel(document.getElementById('view-outlet'));
  },

  deleteMasterTestPrompt: function(id) {
    const t = window.HMS_DB.getById(window.HMS_DB.KEYS.LAB_TESTS, id);
    if (!t) return;

    window.HMS_APP.confirm(
      'Remove Lab Test Configuration',
      `Are you sure you want to delete test type "${t.test_name}"? This removes it from ordering options.`,
      (confirmed) => {
        if (confirmed) {
          window.HMS_DB.delete(window.HMS_DB.KEYS.LAB_TESTS, id);
          window.HMS_APP.toast('Test Removed', 'Master listing deleted.', 'success');
          this.renderGeneralLabPanel(document.getElementById('view-outlet'));
        }
      }
    );
  },

  // ==========================================
  // PRINT LAB REPORT CARD
  // ==========================================
  printReport: function(orderId) {
    const o = window.HMS_DB.getById(window.HMS_DB.KEYS.LAB_TEST_ORDERS, orderId);
    if (!o) return;

    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, o.patient_id);
    const test = window.HMS_DB.getById(window.HMS_DB.KEYS.LAB_TESTS, o.test_id);
    const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, o.doctor_id);

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
        <div class="hospital-subtitle">123 Health Ave, Springfield | Department of Pathology & Radiology</div>
      </div>

      <div style="border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="text-align: center; margin-bottom: 16px;">LABORATORY DIAGNOSTIC REPORT</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p><strong>Patient Name:</strong> ${pat ? pat.name : ''}</p>
            <p><strong>Age / Gender:</strong> ${new Date().getFullYear() - new Date(pat.dob).getFullYear()} yrs / ${pat ? pat.gender : ''}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Report Date:</strong> ${new Date(o.updated_at).toLocaleDateString()}</p>
            <p><strong>Order ID:</strong> ${o.id.toUpperCase()}</p>
            <p><strong>Prescribed By:</strong> ${doc ? doc.name : ''}</p>
          </div>
        </div>
      </div>

      <h3 style="margin-bottom:12px;">Test Conducted: ${test ? test.test_name : ''}</h3>
      
      <table style="width:100%; border-collapse:collapse; margin-top:20px;">
        <thead>
          <tr style="border-bottom: 2px solid #000; background-color:#eee;">
            <th style="text-align:left; padding:10px;">Investigation</th>
            <th style="text-align:left; padding:10px;">Observed Value</th>
            <th style="text-align:left; padding:10px;">Biological Reference Interval</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px; border-bottom:1px solid #ddd;"><strong>${test ? test.test_name : ''}</strong></td>
            <td style="padding:12px; border-bottom:1px solid #ddd; font-family:monospace; font-size:14px; font-weight:700; color:var(--primary);">${o.result_value}</td>
            <td style="padding:12px; border-bottom:1px solid #ddd; font-family:monospace; color:#555;">${test ? test.normal_range : 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 100px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <p style="font-size:10px; color:#555;">Document verification code: ${o.id.substring(0,8).toUpperCase()}</p>
        </div>
        <div style="text-align:center; border-top:1px solid #000; width:220px; padding-top:6px;">
          <strong style="display:block;">Staff Gregory Pratt</strong>
          <span style="font-size:11px; color:#666;">Chief Medical Lab Technician</span>
        </div>
      </div>

      <div class="print-only-footer">
        End of report. Reports are compiled electronically based on sample values. Please consult clinical practitioner for interpretation.
      </div>
    `;

    window.print();
  }
};
