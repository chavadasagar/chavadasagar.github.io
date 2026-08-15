/**
 * records.js - Medical Records, Diagnosis forms, and Prescription Builders
 */

window.HMS_RECORDS = {
  activeRxRows: 0,

  render: function(container, params) {
    const session = window.HMS_DB.getCurrentSession();
    if (!session) return;

    let html = `
      <div class="card">
        <h3 class="card-title" style="margin-bottom: 20px;">Medical Records Repository</h3>
        <div class="table-controls">
          <div class="search-filter-box">
            <div class="search-control">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="record-search" placeholder="Search by patient name..." onkeyup="window.HMS_RECORDS.filterRecords()">
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Diagnosis</th>
                <th>Symptoms</th>
                <th>Notes</th>
                <th>Attending Doctor</th>
              </tr>
            </thead>
            <tbody id="records-table-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.loadRecordsTable();
  },

  loadRecordsTable: function() {
    const records = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICAL_RECORDS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const tbody = document.getElementById('records-table-tbody');
    const session = window.HMS_DB.getCurrentSession();

    let filtered = records;
    if (session.role === 'Patient') {
      filtered = records.filter(r => r.patient_id === session.entityId);
    } else if (session.role === 'Doctor') {
      filtered = records.filter(r => r.doctor_id === session.entityId);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No medical records registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const pat = patients.find(p => p.id === r.patient_id);
      const doc = doctors.find(d => d.id === r.doctor_id);
      return `
        <tr class="record-row-item" data-patient="${pat ? pat.name.toLowerCase() : ''}">
          <td><strong>${new Date(r.created_at).toLocaleDateString()}</strong></td>
          <td><a href="#/patients?id=${r.patient_id}"><strong>${pat ? pat.name : 'Unknown'}</strong></a></td>
          <td><span class="badge badge-danger">${r.diagnosis}</span></td>
          <td>${r.symptoms}</td>
          <td>${r.notes}</td>
          <td><strong>${doc ? doc.name : 'Doctor'}</strong></td>
        </tr>
      `;
    }).join('');
  },

  filterRecords: function() {
    const query = document.getElementById('record-search').value.trim().toLowerCase();
    document.querySelectorAll('.record-row-item').forEach(row => {
      const name = row.dataset.patient;
      if (name.includes(query)) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  },

  // ==========================================
  // DOCTOR CONSULTATION DIAGNOSIS MODAL
  // ==========================================
  openDiagnosisModal: function(apptId) {
    const appt = window.HMS_DB.getById(window.HMS_DB.KEYS.APPOINTMENTS, apptId);
    if (!appt) return;

    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, appt.patient_id);

    let modalOverlay = document.getElementById('diagnosis-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'diagnosis-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Consultation Case sheet: ${pat ? pat.name : ''}</h3>
          <button class="modal-close" onclick="document.getElementById('diagnosis-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="diagnosis-form" novalidate>
            <div class="form-group">
              <label for="diag-symptoms">Symptoms / Chief Complaints</label>
              <input type="text" id="diag-symptoms" placeholder="e.g. Cough, high fever, sore throat" required>
              <div class="error-msg" id="diag-symptoms-err"></div>
            </div>

            <div class="form-group">
              <label for="diag-name">Final Diagnosis</label>
              <input type="text" id="diag-name" placeholder="e.g. Acute Pharyngitis" required>
              <div class="error-msg" id="diag-name-err"></div>
            </div>

            <div class="form-group">
              <label for="diag-notes">Clinical Notes / Treatment Plan</label>
              <textarea id="diag-notes" rows="4" placeholder="Advice bed rest for 3 days, drink fluids..." required></textarea>
              <div class="error-msg" id="diag-notes-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('diagnosis-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_RECORDS.saveDiagnosis('${apptId}')">Save & Write Rx</button>
        </div>
      </div>
    `;
  },

  saveDiagnosis: function(apptId) {
    const symptomsEl = document.getElementById('diag-symptoms');
    const nameEl = document.getElementById('diag-name');
    const notesEl = document.getElementById('diag-notes');

    const symptoms = symptomsEl.value.trim();
    const diagnosis = nameEl.value.trim();
    const notes = notesEl.value.trim();

    let hasError = false;
    document.getElementById('diag-symptoms-err').innerText = '';
    document.getElementById('diag-name-err').innerText = '';
    document.getElementById('diag-notes-err').innerText = '';
    symptomsEl.classList.remove('error');
    nameEl.classList.remove('error');
    notesEl.classList.remove('error');

    if (!symptoms) {
      document.getElementById('diag-symptoms-err').innerText = 'Symptoms are required';
      symptomsEl.classList.add('error');
      hasError = true;
    }
    if (!diagnosis) {
      document.getElementById('diag-name-err').innerText = 'Diagnosis is required';
      nameEl.classList.add('error');
      hasError = true;
    }
    if (!notes) {
      document.getElementById('diag-notes-err').innerText = 'Clinical notes are required';
      notesEl.classList.add('error');
      hasError = true;
    }

    if (hasError) return;

    const appt = window.HMS_DB.getById(window.HMS_DB.KEYS.APPOINTMENTS, apptId);
    if (!appt) return;

    // 1. Create Medical Record
    window.HMS_DB.insert(window.HMS_DB.KEYS.MEDICAL_RECORDS, {
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      appointment_id: appt.id,
      diagnosis: diagnosis,
      symptoms: symptoms,
      notes: notes
    });

    // 2. Complete appointment
    if (window.HMS_APPOINTMENTS) {
      window.HMS_APPOINTMENTS.updateStatus(apptId, 'Completed');
    }

    // Remove diagnosis modal
    document.getElementById('diagnosis-modal').remove();

    // 3. Open Prescription builder modal automatically
    this.openPrescriptionModal(apptId);
  },

  // ==========================================
  // PRESCRIPTION BUILDER WIZARD
  // ==========================================
  openPrescriptionModal: function(apptId) {
    const appt = window.HMS_DB.getById(window.HMS_DB.KEYS.APPOINTMENTS, apptId);
    if (!appt) return;

    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, appt.patient_id);
    const medicines = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);

    let modalOverlay = document.getElementById('prescription-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'prescription-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>Write Prescription: ${pat ? pat.name : ''}</h3>
          <button class="modal-close" onclick="document.getElementById('prescription-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p class="text-muted" style="margin-bottom:16px;">Add medications, dosages, and dispensation guidelines.</p>
          
          <table style="width:100%;">
            <thead>
              <tr>
                <th style="width:35%;">Medicine</th>
                <th style="width:15%;">Dosage</th>
                <th style="width:15%;">Frequency</th>
                <th style="width:12%;">Duration (Days)</th>
                <th style="width:23%;">Instructions</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="prescription-items-tbody">
              <!-- Dynamic Rows injected here -->
            </tbody>
          </table>

          <button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="window.HMS_RECORDS.addRxRow()">
            <i class="fa-solid fa-plus"></i> Add Medicine Row
          </button>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('prescription-modal').remove()">Skip / Save without Rx</button>
          <button class="btn btn-primary" onclick="window.HMS_RECORDS.savePrescription('${apptId}')">Issue Prescription</button>
        </div>
      </div>
    `;

    this.activeRxRows = 0;
    // Add first row by default
    this.addRxRow();
  },

  addRxRow: function() {
    const tbody = document.getElementById('prescription-items-tbody');
    const medicines = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);
    this.activeRxRows++;
    const rowId = `rx-row-${this.activeRxRows}`;

    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.innerHTML = `
      <td>
        <select class="rx-med-select select-filter" style="width:100%;">
          <option value="">-- Choose Med --</option>
          ${medicines.map(m => `<option value="${m.id}">${m.name} (${m.stock_quantity} left)</option>`).join('')}
        </select>
      </td>
      <td><input type="text" class="rx-dosage-input" placeholder="e.g. 500mg" style="width:100%; padding:6px;"></td>
      <td><input type="text" class="rx-freq-input" placeholder="e.g. 1-0-1" style="width:100%; padding:6px;"></td>
      <td><input type="number" class="rx-dur-input" placeholder="e.g. 5" style="width:100%; padding:6px;" min="1"></td>
      <td><input type="text" class="rx-inst-input" placeholder="e.g. Take after meals" style="width:100%; padding:6px;"></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="document.getElementById('${rowId}').remove()">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
  },

  savePrescription: function(apptId) {
    const appt = window.HMS_DB.getById(window.HMS_DB.KEYS.APPOINTMENTS, apptId);
    if (!appt) return;

    const rows = document.querySelectorAll('#prescription-items-tbody tr');
    const items = [];
    let hasError = false;

    rows.forEach(row => {
      const medSelect = row.querySelector('.rx-med-select');
      const dosageInput = row.querySelector('.rx-dosage-input');
      const freqInput = row.querySelector('.rx-freq-input');
      const durInput = row.querySelector('.rx-dur-input');
      const instInput = row.querySelector('.rx-inst-input');

      const medicine_id = medSelect.value;
      const dosage = dosageInput.value.trim();
      const frequency = freqInput.value.trim();
      const duration = durInput.value.trim();
      const instructions = instInput.value.trim();

      if (!medicine_id || !dosage || !frequency || !duration) {
        hasError = true;
        medSelect.style.borderColor = 'var(--danger)';
      } else {
        medSelect.style.borderColor = '';
        items.push({
          medicine_id,
          dosage,
          frequency,
          duration: parseInt(duration),
          instructions: instructions || 'Take with water'
        });
      }
    });

    if (hasError) {
      window.HMS_APP.toast('Validation Error', 'Please complete all fields for the added medications.', 'danger');
      return;
    }

    if (items.length === 0) {
      window.HMS_APP.toast('No Medications', 'Please add at least one medicine row to issue.', 'warning');
      return;
    }

    // 1. Create Prescription header
    const prescr = window.HMS_DB.insert(window.HMS_DB.KEYS.PRESCRIPTIONS, {
      patient_id: appt.patient_id,
      doctor_id: appt.doctor_id,
      appointment_id: appt.id,
      status: 'Pending'
    });

    // 2. Create Prescription items
    items.forEach(it => {
      it.prescription_id = prescr.id;
      window.HMS_DB.insert(window.HMS_DB.KEYS.PRESCRIPTION_ITEMS, it);
    });

    window.HMS_APP.toast('Prescription Issued', 'Medications saved successfully. Pending pharmacy dispensation.', 'success');
    document.getElementById('prescription-modal').remove();

    // 3. Open Printable layout
    this.printPrescription(prescr.id);
  },

  // ==========================================
  // PRINT LAYOUT GENERATION
  // ==========================================
  printPrescription: function(presId) {
    const rx = window.HMS_DB.getById(window.HMS_DB.KEYS.PRESCRIPTIONS, presId);
    if (!rx) return;

    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, rx.patient_id);
    const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, rx.doctor_id);
    const rxItems = window.HMS_DB.getAll(window.HMS_DB.KEYS.PRESCRIPTION_ITEMS).filter(item => item.prescription_id === presId);
    const medicines = window.HMS_DB.getAll(window.HMS_DB.KEYS.MEDICINES);

    // Create a temporary print frame overlay or inject print markup
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
        <div class="hospital-subtitle">123 Health Ave, Springfield | Tel: +1 (555) 0199 | www.aegishealth.com</div>
      </div>

      <div style="border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="text-align: center; margin-bottom: 16px;">PRESCRIPTION SHEET</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p><strong>Patient Name:</strong> ${pat ? pat.name : ''}</p>
            <p><strong>Age / Gender:</strong> ${new Date().getFullYear() - new Date(pat.dob).getFullYear()} yrs / ${pat ? pat.gender : ''}</p>
            <p><strong>Blood Group:</strong> ${pat ? pat.blood_group : ''}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Date:</strong> ${new Date(rx.created_at).toLocaleDateString()}</p>
            <p><strong>Prescription ID:</strong> ${rx.id.toUpperCase()}</p>
            <p><strong>Doctor:</strong> ${doc ? doc.name : ''} (${doc ? doc.specialization : ''})</p>
          </div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-top:20px;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align:left; padding:8px;">#</th>
            <th style="text-align:left; padding:8px;">Medicine Name</th>
            <th style="text-align:left; padding:8px;">Dosage</th>
            <th style="text-align:left; padding:8px;">Frequency</th>
            <th style="text-align:left; padding:8px;">Duration</th>
            <th style="text-align:left; padding:8px;">Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${rxItems.map((item, idx) => {
            const med = medicines.find(m => m.id === item.medicine_id);
            return `
              <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding:8px;">${idx + 1}</td>
                <td style="padding:8px;"><strong>${med ? med.name : 'Med'}</strong></td>
                <td style="padding:8px;">${item.dosage}</td>
                <td style="padding:8px;">${item.frequency}</td>
                <td style="padding:8px;">${item.duration} day(s)</td>
                <td style="padding:8px;">${item.instructions}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div style="margin-top: 80px; display:flex; justify-content:space-between;">
        <div>
          <p style="font-size:10px; color:#555;">Issued by electronic signature system.</p>
        </div>
        <div style="text-align:center; border-top:1px solid #000; width:200px; padding-top:6px;">
          <strong>${doc ? doc.name : ''}</strong>
          <p style="font-size:11px; color:#666;">Attending Consultant</p>
        </div>
      </div>

      <div class="print-only-footer">
        Aegis Health System. Please verify medication label with the pharmacist prior to administration.
      </div>
    `;

    // Trigger Print
    window.print();
  }
};
