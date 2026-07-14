/**
 * admissions.js - Ward Bed Occupancy Map, IPD Admissions and Discharge modules
 */

window.HMS_ADMISSIONS = {
  selectedWardId: 'w-icu',
  selectedBedIdForAdmit: null,

  render: function(container, params) {
    container.innerHTML = `
      <div class="dashboard-split-grid" style="grid-template-columns: 2fr 1.2fr;">
        <!-- Left Panel: Bed Layout Grid -->
        <div class="card">
          <div class="card-header-row" style="margin-bottom: 16px;">
            <h3 class="card-title">Visual Ward Bed Map</h3>
            <button class="btn btn-primary" onclick="window.HMS_ADMISSIONS.openAdmitModal()">
              <i class="fa-solid fa-bed-pulse"></i> Admit Patient
            </button>
          </div>

          <!-- Ward filters tab header -->
          <div class="ward-filter-row" id="ward-filters-container">
            <!-- Rendered dynamically -->
          </div>

          <!-- Beds layout grid -->
          <div class="beds-grid" id="beds-grid-container" style="margin-top: 24px;">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Right Panel: Admitted Patient List -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 16px;">Currently Admitted Patients</h3>
          <div id="admitted-patients-list-outlet">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </div>
    `;

    this.renderWardTabs();
    this.renderBedsGrid();
    this.renderAdmittedList();
  },

  renderWardTabs: function() {
    const wards = window.HMS_DB.getAll(window.HMS_DB.KEYS.WARDS);
    const container = document.getElementById('ward-filters-container');
    container.innerHTML = wards.map(w => `
      <button class="btn ${this.selectedWardId === w.id ? 'btn-primary' : 'btn-secondary'}" 
              onclick="window.HMS_ADMISSIONS.selectWard('${w.id}')">
        ${w.name} ($${w.bed_rate}/day)
      </button>
    `).join('');
  },

  selectWard: function(wardId) {
    this.selectedWardId = wardId;
    this.renderWardTabs();
    this.renderBedsGrid();
  },

  renderBedsGrid: function() {
    const beds = window.HMS_DB.getAll(window.HMS_DB.KEYS.BEDS).filter(b => b.ward_id === this.selectedWardId);
    const container = document.getElementById('beds-grid-container');
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);

    if (beds.length === 0) {
      container.innerHTML = `<p class="text-muted">No beds configured in this ward.</p>`;
      return;
    }

    container.innerHTML = beds.map(b => {
      let statusClass = 'available';
      let statusLabel = 'Available';
      let occupantName = '';

      if (b.status === 'Occupied') {
        statusClass = 'occupied';
        statusLabel = 'Occupied';
        const pat = patients.find(p => p.id === b.occupant_id);
        occupantName = pat ? pat.name : 'Unknown Patient';
      } else if (b.status === 'Reserved') {
        statusClass = 'reserved';
        statusLabel = 'Cleaning';
      }

      return `
        <div class="bed-card ${statusClass}" onclick="window.HMS_ADMISSIONS.handleBedClick('${b.id}', '${b.status}')">
          <div class="bed-icon"><i class="fa-solid fa-bed"></i></div>
          <span class="bed-number">${b.bed_number}</span>
          <span class="bed-status-lbl">${statusLabel}</span>
          ${occupantName ? `<span style="font-size:10px; font-weight:600; color:var(--text-muted); display:block; max-width:90px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${occupantName}</span>` : ''}
        </div>
      `;
    }).join('');
  },

  handleBedClick: function(bedId, status) {
    if (status === 'Available') {
      this.selectedBedIdForAdmit = bedId;
      this.openAdmitModal(bedId);
    } else if (status === 'Occupied') {
      // Find the admission record
      const admits = window.HMS_DB.getAll(window.HMS_DB.KEYS.ADMISSIONS);
      const activeAdmit = admits.find(a => a.bed_id === bedId && a.status === 'Admitted');
      if (activeAdmit) {
        this.openDischargePreviewModal(activeAdmit.id);
      }
    } else {
      window.HMS_APP.toast('Bed Reserved', 'This bed is currently reserved or undergoing cleaning.', 'info');
    }
  },

  renderAdmittedList: function() {
    const admits = window.HMS_DB.getAll(window.HMS_DB.KEYS.ADMISSIONS).filter(a => a.status === 'Admitted');
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const wards = window.HMS_DB.getAll(window.HMS_DB.KEYS.WARDS);
    const beds = window.HMS_DB.getAll(window.HMS_DB.KEYS.BEDS);
    const container = document.getElementById('admitted-patients-list-outlet');

    if (admits.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <div class="empty-state-icon"><i class="fa-solid fa-procedures"></i></div>
          <div class="empty-state-title">No admitted patients</div>
          <div class="empty-state-text">There are currently no patients staying in IPD wards.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = admits.map(a => {
      const pat = patients.find(p => p.id === a.patient_id);
      const ward = wards.find(w => w.id === a.ward_id);
      const bed = beds.find(b => b.id === a.bed_id);

      return `
        <div class="current-time-display" style="padding: 12px; margin-bottom: 10px; border-radius: 8px; position:relative;">
          <h4 style="font-size:14px; font-weight:600;"><a href="#/patients?id=${a.patient_id}"><strong>${pat ? pat.name : 'Unknown'}</strong></a></h4>
          <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Ward: ${ward ? ward.name : ''} - Bed: ${bed ? bed.bed_number : ''}</p>
          <p style="font-size:11px; color:var(--text-muted);">Admit Date: ${a.admission_date}</p>
          <button class="btn btn-danger btn-sm" style="position:absolute; right:10px; top:50%; transform:translateY(-50%);" 
                  onclick="window.HMS_ADMISSIONS.openDischargePreviewModal('${a.id}')">
            Discharge
          </button>
        </div>
      `;
    }).join('');
  },

  openAdmitModal: function(preSelectedBedId = null) {
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const wards = window.HMS_DB.getAll(window.HMS_DB.KEYS.WARDS);
    const beds = window.HMS_DB.getAll(window.HMS_DB.KEYS.BEDS);

    // Filter out already admitted patients
    const activeAdmissions = window.HMS_DB.getAll(window.HMS_DB.KEYS.ADMISSIONS).filter(a => a.status === 'Admitted');
    const admittedPatientIds = activeAdmissions.map(a => a.patient_id);
    const availablePatients = patients.filter(p => !admittedPatientIds.includes(p.id));

    let modalOverlay = document.getElementById('admit-patient-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'admit-patient-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    const preSelectedBed = preSelectedBedId ? beds.find(b => b.id === preSelectedBedId) : null;
    const preSelectedWardId = preSelectedBed ? preSelectedBed.ward_id : this.selectedWardId;

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Admit Patient (IPD Ward Setup)</h3>
          <button class="modal-close" onclick="document.getElementById('admit-patient-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="admit-form" novalidate>
            <div class="form-group">
              <label for="admit-patient">Select Patient</label>
              <select id="admit-patient" required>
                <option value="">-- Select Patient --</option>
                ${availablePatients.map(p => `<option value="${p.id}">${p.name} (${p.phone})</option>`).join('')}
              </select>
              <div class="error-msg" id="admit-patient-err"></div>
            </div>

            <div class="form-group">
              <label for="admit-doctor">Attending Doctor</label>
              <select id="admit-doctor" required>
                <option value="">-- Select Doctor --</option>
                ${doctors.map(d => `<option value="${d.id}">${d.name} (${d.specialization})</option>`).join('')}
              </select>
              <div class="error-msg" id="admit-doctor-err"></div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="admit-ward">Select Ward</label>
                <select id="admit-ward" onchange="window.HMS_ADMISSIONS.populateBedsDropdown()" required>
                  ${wards.map(w => `<option value="${w.id}" ${preSelectedWardId === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}
                </select>
                <div class="error-msg" id="admit-ward-err"></div>
              </div>
              
              <div class="form-group">
                <label for="admit-bed">Select Bed</label>
                <select id="admit-bed" required>
                  <!-- Dynamically populated -->
                </select>
                <div class="error-msg" id="admit-bed-err"></div>
              </div>
            </div>

            <div class="form-group">
              <label for="admit-reason">Reason for Admission / Diagnosis</label>
              <textarea id="admit-reason" rows="3" required></textarea>
              <div class="error-msg" id="admit-reason-err"></div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('admit-patient-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_ADMISSIONS.saveAdmission()">Admit Patient</button>
        </div>
      </div>
    `;

    this.populateBedsDropdown(preSelectedBedId);
  },

  populateBedsDropdown: function(preSelectedBedId = null) {
    const wardId = document.getElementById('admit-ward').value;
    const beds = window.HMS_DB.getAll(window.HMS_DB.KEYS.BEDS).filter(b => b.ward_id === wardId);
    
    // Only available beds can be selected
    const availBeds = beds.filter(b => b.status === 'Available' || b.id === preSelectedBedId);
    const select = document.getElementById('admit-bed');

    if (availBeds.length === 0) {
      select.innerHTML = '<option value="">No beds available</option>';
      return;
    }

    select.innerHTML = availBeds.map(b => `
      <option value="${b.id}" ${preSelectedBedId === b.id ? 'selected' : ''}>Bed ${b.bed_number}</option>
    `).join('');
  },

  saveAdmission: function() {
    const fields = ['admit-patient', 'admit-doctor', 'admit-ward', 'admit-bed', 'admit-reason'];
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
        data[f.replace('admit-', '')] = val;
      }
    });

    if (hasError) return;

    // Check if the bed was booked in parallel
    const bed = window.HMS_DB.getById(window.HMS_DB.KEYS.BEDS, data.bed);
    if (!bed || bed.status !== 'Available') {
      window.HMS_APP.toast('Bed Occupied', 'The selected bed is no longer available. Select another.', 'danger');
      return;
    }

    // Insert Admission
    window.HMS_DB.insert(window.HMS_DB.KEYS.ADMISSIONS, {
      patient_id: data.patient,
      doctor_id: data.doctor,
      ward_id: data.ward,
      bed_id: data.bed,
      admission_date: '2026-07-14', // System Date
      discharge_date: null,
      reason: data.reason,
      status: 'Admitted',
      bed_charges: 0
    });

    // Update Bed state
    window.HMS_DB.update(window.HMS_DB.KEYS.BEDS, data.bed, {
      status: 'Occupied',
      occupant_id: data.patient
    });

    window.HMS_APP.toast('Patient Admitted', 'Admission successfully recorded. Bed status updated to Occupied.', 'success');
    document.getElementById('admit-patient-modal').remove();

    this.renderBedsGrid();
    this.renderAdmittedList();
  },

  openDischargePreviewModal: function(admissionId) {
    const a = window.HMS_DB.getById(window.HMS_DB.KEYS.ADMISSIONS, admissionId);
    if (!a) return;

    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, a.patient_id);
    const ward = window.HMS_DB.getById(window.HMS_DB.KEYS.WARDS, a.ward_id);

    // Calculate stay days (admission to 2026-07-14)
    const adm = new Date(a.admission_date);
    const dis = new Date('2026-07-14'); // Today's date
    const diffTime = Math.abs(dis - adm);
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) diffDays = 1; // Minimum 1 day charge

    const totalCharges = diffDays * ward.bed_rate;

    let modalOverlay = document.getElementById('discharge-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'discharge-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Discharge Summary & Bed Charges Billing</h3>
          <button class="modal-close" onclick="document.getElementById('discharge-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:8px;"><strong>Patient:</strong> ${pat ? pat.name : 'Unknown'}</p>
          <p style="margin-bottom:8px;"><strong>Admitted Date:</strong> ${a.admission_date}</p>
          <p style="margin-bottom:8px;"><strong>Discharge Date (Today):</strong> 2026-07-14</p>
          <p style="margin-bottom:8px;"><strong>Total Duration:</strong> ${diffDays} day(s)</p>
          <p style="margin-bottom:8px;"><strong>Bed Rate:</strong> $${ward.bed_rate} / day</p>
          
          <div class="current-time-display" style="padding:16px; margin-top:12px; border-radius:8px; text-align:center;">
            <span style="font-size:13px; color:var(--text-muted); display:block;">Total Calculated Bed Charges</span>
            <span style="font-size:24px; font-weight:700; color:var(--danger);">$${totalCharges.toFixed(2)}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('discharge-modal').remove()">Cancel</button>
          <button class="btn btn-danger" onclick="window.HMS_ADMISSIONS.executeDischarge('${a.id}', ${diffDays}, ${totalCharges})">Confirm Discharge</button>
        </div>
      </div>
    `;
  },

  executeDischarge: function(admissionId, days, charges) {
    const a = window.HMS_DB.getById(window.HMS_DB.KEYS.ADMISSIONS, admissionId);
    if (!a) return;

    // 1. Update Admission record
    window.HMS_DB.update(window.HMS_DB.KEYS.ADMISSIONS, admissionId, {
      discharge_date: '2026-07-14',
      status: 'Discharged',
      bed_charges: charges
    });

    // 2. Set Bed status back to reserved/cleaning (will clean before next available)
    window.HMS_DB.update(window.HMS_DB.KEYS.BEDS, a.bed_id, {
      status: 'Reserved', // cleaning state
      occupant_id: null
    });

    // Simulate cleaning transition
    setTimeout(() => {
      window.HMS_DB.update(window.HMS_DB.KEYS.BEDS, a.bed_id, {
        status: 'Available'
      });
      // If we are currently looking at admissions page, update beds map
      const bedsGrid = document.getElementById('beds-grid-container');
      if (bedsGrid) {
        window.HMS_ADMISSIONS.renderBedsGrid();
      }
    }, 15000); // 15 seconds visual cleaning simulation

    // 3. Generate hospital invoice
    if (window.HMS_BILLING) {
      window.HMS_BILLING.createBedInvoice(a.patient_id, a.ward_id, days, charges);
    }

    window.HMS_APP.toast('Patient Discharged', `Stay record finalized. Bed set to Cleaning. Invoice raised for $${charges.toFixed(2)}.`, 'success');
    
    document.getElementById('discharge-modal').remove();

    this.renderBedsGrid();
    this.renderAdmittedList();
  }
};
