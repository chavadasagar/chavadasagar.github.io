/**
 * surgery.js - Operation Theatre (OT) scheduling, surgical team allocations, and completion billing
 */

window.HMS_SURGERY = {
  activeTab: 'surgery-list-pane',

  render: function(container, params) {
    const session = window.HMS_DB.getCurrentSession();
    if (!session) return;

    container.innerHTML = `
      <div class="card tabs-container">
        <div class="tabs-header">
          <button class="tab-btn active" onclick="window.HMS_SURGERY.switchTab(event, 'surgery-list-pane')">Surgical Schedule</button>
          <button class="tab-btn" onclick="window.HMS_SURGERY.switchTab(event, 'ot-pane')">OT Rooms Map</button>
        </div>

        <!-- SURGERIES LIST PANEL -->
        <div id="surgery-list-pane" class="tab-pane active">
          <div class="card-header-row" style="margin-bottom:16px;">
            <h3 class="card-title">OT Operations Calendar</h3>
            <button class="btn btn-primary" onclick="window.HMS_SURGERY.openScheduleModal()">
              <i class="fa-solid fa-calendar-plus"></i> Schedule Surgery
            </button>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Scheduled Time</th>
                  <th>Patient Name</th>
                  <th>Surgery Type</th>
                  <th>Lead Surgeon</th>
                  <th>OT Block</th>
                  <th>Team Assigned</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="surgeries-tbody">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- OT ROOMS PANEL -->
        <div id="ot-pane" class="tab-pane">
          <h3 class="card-title" style="margin-bottom:16px;">Operation Theatre Status</h3>
          <div class="beds-grid" id="ot-grid-outlet" style="margin-top:20px;">
            <!-- Injected dynamically -->
          </div>
        </div>
      </div>
    `;

    this.loadSurgeries();
    this.loadOTs();
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
  // SURGERY LIST
  // ==========================================
  loadSurgeries: function() {
    const surgeries = window.HMS_DB.getAll(window.HMS_DB.KEYS.SURGERIES);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const ots = window.HMS_DB.getAll(window.HMS_DB.KEYS.OTS);
    const team = window.HMS_DB.getAll(window.HMS_DB.KEYS.SURGERY_TEAM);
    const staff = window.HMS_DB.getAll(window.HMS_DB.KEYS.STAFF);
    const tbody = document.getElementById('surgeries-tbody');

    // Sort by scheduled date
    surgeries.sort((a, b) => b.date_time.localeCompare(a.date_time));

    if (surgeries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No surgeries scheduled.</td></tr>`;
      return;
    }

    tbody.innerHTML = surgeries.map(s => {
      const pat = patients.find(p => p.id === s.patient_id);
      const surgeon = doctors.find(d => d.id === s.lead_surgeon_id);
      const ot = ots.find(o => o.id === s.ot_id);

      // Get assigned team
      const steam = team.filter(t => t.surgery_id === s.id);
      const teamNames = steam.map(t => {
        // Look up either doctor or staff
        const docObj = doctors.find(d => d.id === t.staff_id);
        const staffObj = staff.find(st => st.id === t.staff_id);
        const name = docObj ? docObj.name.split(' ')[1] : (staffObj ? staffObj.name.split(' ')[1] : 'Staff');
        return `${name} (${t.role})`;
      }).join(', ');

      let badge = 'badge-info';
      if (s.status === 'Completed') badge = 'badge-success';
      else if (s.status === 'Cancelled') badge = 'badge-danger';
      else if (s.status === 'In Progress') badge = 'badge-warning';

      const canComplete = ['Scheduled', 'In Progress'].includes(s.status);

      return `
        <tr>
          <td><strong>${s.date_time.replace('T', ' ')}</strong></td>
          <td><a href="#/patients?id=${s.patient_id}"><strong>${pat ? pat.name : 'Patient'}</strong></a></td>
          <td><strong>${s.surgery_type}</strong></td>
          <td>${surgeon ? surgeon.name : 'Surgeon'}</td>
          <td>${ot ? ot.name : 'OT Room'}</td>
          <td><span style="font-size:12px; color:var(--text-muted);">${teamNames || 'None assigned'}</span></td>
          <td><span class="badge ${badge}">${s.status}</span></td>
          <td>
            <div class="demo-login-tags" style="gap:4px;">
              ${canComplete ? `
                <button class="btn btn-success btn-sm" onclick="window.HMS_SURGERY.completeSurgery('${s.id}')">Complete</button>
                <button class="btn btn-danger btn-sm" onclick="window.HMS_SURGERY.cancelSurgery('${s.id}')">Cancel</button>
              ` : `<span class="text-muted" style="font-size:12px;">Archived</span>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ==========================================
  // OT ROOM VISUAL MAPS
  // ==========================================
  loadOTs: function() {
    const ots = window.HMS_DB.getAll(window.HMS_DB.KEYS.OTS);
    const container = document.getElementById('ot-grid-outlet');

    container.innerHTML = ots.map(o => {
      let border = 'available';
      if (o.status === 'In Use') border = 'occupied';
      else if (o.status === 'Cleaning') border = 'cleaning';

      return `
        <div class="bed-card ${border}" style="min-width:140px; padding:18px 10px;">
          <div class="bed-icon" style="font-size:32px;"><i class="fa-solid fa-person-shelter"></i></div>
          <span class="bed-number">${o.name}</span>
          <span class="bed-status-lbl">${o.status}</span>
        </div>
      `;
    }).join('');
  },

  openScheduleModal: function() {
    // Only Admitted patients can undergo surgery
    const admits = window.HMS_DB.getAll(window.HMS_DB.KEYS.ADMISSIONS).filter(a => a.status === 'Admitted');
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);
    const ots = window.HMS_DB.getAll(window.HMS_DB.KEYS.OTS);
    const staff = window.HMS_DB.getAll(window.HMS_DB.KEYS.STAFF);

    const admittedPatients = admits.map(a => patients.find(p => p.id === a.patient_id)).filter(Boolean);

    if (admittedPatients.length === 0) {
      window.HMS_APP.toast('No Admitted Patients', 'Surgeries can only be scheduled for patients currently admitted (IPD).', 'warning');
      return;
    }

    let modalOverlay = document.getElementById('surgery-schedule-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'surgery-schedule-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>Schedule Operation Theatre (OT) Booking</h3>
          <button class="modal-close" onclick="document.getElementById('surgery-schedule-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="surgery-form" novalidate>
            <div class="form-grid">
              <div class="form-group">
                <label for="surg-patient">Select Admitted Patient</label>
                <select id="surg-patient" required>
                  <option value="">-- Select Patient --</option>
                  ${admittedPatients.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
                <div class="error-msg" id="surg-patient-err"></div>
              </div>
              <div class="form-group">
                <label for="surg-ot">Select OT Room</label>
                <select id="surg-ot" required>
                  <option value="">-- Select OT Room --</option>
                  ${ots.map(o => `<option value="${o.id}">${o.name} (${o.status})</option>`).join('')}
                </select>
                <div class="error-msg" id="surg-ot-err"></div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="surg-type">Operation Type / Surgery Name</label>
                <input type="text" id="surg-type" placeholder="e.g. Bypass Grafting, Hernia repair" required>
                <div class="error-msg" id="surg-type-err"></div>
              </div>
              <div class="form-group">
                <label for="surg-datetime">Date & Time Slot</label>
                <input type="datetime-local" id="surg-datetime" required>
                <div class="error-msg" id="surg-datetime-err"></div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="surg-lead">Lead Surgeon</label>
                <select id="surg-lead" required>
                  <option value="">-- Select Doctor --</option>
                  ${doctors.map(d => `<option value="${d.id}">${d.name} (${d.specialization})</option>`).join('')}
                </select>
                <div class="error-msg" id="surg-lead-err"></div>
              </div>
              <div class="form-group">
                <label for="surg-fee">Estimated Surgery Fee ($)</label>
                <input type="number" id="surg-fee" value="15000" min="0" required>
                <div class="error-msg" id="surg-fee-err"></div>
              </div>
            </div>

            <div class="form-grid" style="border-top:1px dashed var(--border); padding-top:16px; margin-top:12px;">
              <div class="form-group">
                <label for="surg-anesthetist">Anesthetist (Consultant)</label>
                <select id="surg-anesthetist" required>
                  <option value="">-- Select Doctor --</option>
                  ${doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
                <div class="error-msg" id="surg-anes-err"></div>
              </div>
              
              <div class="form-group">
                <label for="surg-nurse">Scrub Nurse (Nurse Staff)</label>
                <select id="surg-nurse" required>
                  <option value="">-- Select Nurse --</option>
                  ${staff.filter(s => s.role === 'Nurse').map(n => `<option value="${n.id}">${n.name}</option>`).join('')}
                </select>
                <div class="error-msg" id="surg-nurse-err"></div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('surgery-schedule-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window.HMS_SURGERY.saveSurgery()">Schedule Surgery</button>
        </div>
      </div>
    `;
  },

  saveSurgery: function() {
    const fields = ['surg-patient', 'surg-ot', 'surg-type', 'surg-datetime', 'surg-lead', 'surg-fee', 'surg-anesthetist', 'surg-nurse'];
    let hasError = false;

    fields.forEach(f => {
      document.getElementById(`${f.replace('surg-anes', 'surg-anes').replace('surg-nurse','surg-nurse')}-err`) 
        ? document.getElementById(`${f.replace('surg-anes', 'surg-anes').replace('surg-nurse','surg-nurse')}-err`).innerText = '' : null;
      document.getElementById(f).classList.remove('error');
    });

    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      const val = el.value.trim();
      if (!val) {
        const errEl = document.getElementById(`${f}-err`) || document.getElementById(`${f.replace('surg-anesthetist','surg-anes')}-err`);
        if (errEl) errEl.innerText = 'This selection is required';
        el.classList.add('error');
        hasError = true;
      } else {
        data[f.replace('surg-', '')] = val;
      }
    });

    if (hasError) return;

    // Check conflict: lead surgeon vs anesthetist
    if (data.lead === data.anesthetist) {
      window.HMS_APP.toast('Doctor Conflict', 'Anesthetist must be a different physician from Lead Surgeon.', 'warning');
      return;
    }

    // Check OT room state
    const ot = window.HMS_DB.getById(window.HMS_DB.KEYS.OTS, data.ot);
    if (!ot || ot.status === 'In Use') {
      window.HMS_APP.toast('OT Room Busy', 'Selected Operation Theatre room is currently in use.', 'danger');
      return;
    }

    // 1. Create Surgery
    const surg = window.HMS_DB.insert(window.HMS_DB.KEYS.SURGERIES, {
      patient_id: data.patient,
      ot_id: data.ot,
      lead_surgeon_id: data.lead,
      surgery_type: data.type,
      date_time: data.datetime,
      fee: parseFloat(data.fee),
      status: 'Scheduled'
    });

    // 2. Assign team members
    window.HMS_DB.insert(window.HMS_DB.KEYS.SURGERY_TEAM, {
      surgery_id: surg.id,
      staff_id: data.anesthetist,
      role: 'Anesthetist'
    });
    window.HMS_DB.insert(window.HMS_DB.KEYS.SURGERY_TEAM, {
      surgery_id: surg.id,
      staff_id: data.nurse,
      role: 'Scrub Nurse'
    });

    // 3. Mark OT room as reserved
    window.HMS_DB.update(window.HMS_DB.KEYS.OTS, data.ot, {
      status: 'In Use'
    });

    window.HMS_APP.toast('Surgery Scheduled', 'OT Block booked, surgery team assigned.', 'success');
    document.getElementById('surgery-schedule-modal').remove();

    this.loadSurgeries();
    this.loadOTs();
  },

  completeSurgery: function(id) {
    const s = window.HMS_DB.getById(window.HMS_DB.KEYS.SURGERIES, id);
    if (!s) return;

    window.HMS_APP.confirm(
      'Mark Surgery Completed',
      'Are you sure the operation was successful? This will release the OT room and append the surgery charges to the patient invoice.',
      (confirmed) => {
        if (confirmed) {
          // Update Surgery status
          window.HMS_DB.update(window.HMS_DB.KEYS.SURGERIES, id, {
            status: 'Completed'
          });

          // Set OT room to cleaning status, then reset to Available
          window.HMS_DB.update(window.HMS_DB.KEYS.OTS, s.ot_id, {
            status: 'Cleaning'
          });

          setTimeout(() => {
            window.HMS_DB.update(window.HMS_DB.KEYS.OTS, s.ot_id, {
              status: 'Available'
            });
            const otOutlet = document.getElementById('ot-grid-outlet');
            if (otOutlet) {
              window.HMS_SURGERY.loadOTs();
            }
          }, 10000); // 10s simulated cleaning

          // Trigger invoicing
          if (window.HMS_BILLING) {
            window.HMS_BILLING.createSurgeryInvoice(s.patient_id, s.surgery_type, s.fee || 15000);
          }

          window.HMS_APP.toast('Surgery Completed', 'Case updated. Surgery billing raised.', 'success');
          this.loadSurgeries();
          this.loadOTs();
        }
      }
    );
  },

  cancelSurgery: function(id) {
    const s = window.HMS_DB.getById(window.HMS_DB.KEYS.SURGERIES, id);
    if (!s) return;

    window.HMS_APP.confirm(
      'Cancel Scheduled Surgery',
      'Are you sure you want to cancel this surgical block? The OT room status will reset.',
      (confirmed) => {
        if (confirmed) {
          window.HMS_DB.update(window.HMS_DB.KEYS.SURGERIES, id, {
            status: 'Cancelled'
          });

          // Reset OT room status
          window.HMS_DB.update(window.HMS_DB.KEYS.OTS, s.ot_id, {
            status: 'Available'
          });

          window.HMS_APP.toast('Surgery Cancelled', 'OT Block freed.', 'warning');
          this.loadSurgeries();
          this.loadOTs();
        }
      }
    );
  }
};
