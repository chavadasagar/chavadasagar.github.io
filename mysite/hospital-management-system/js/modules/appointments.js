/**
 * appointments.js - Multi-step Appointment Booking Wizard, Calendar Views, and Queue Token system
 */

window.HMS_APPOINTMENTS = {
  viewMode: 'list', // 'list' or 'calendar'
  bookingState: {
    step: 1,
    deptId: '',
    doctorId: '',
    date: '',
    timeSlot: '',
    reason: '',
    patientId: '', // For receptionist booking
    rescheduleApptId: null
  },
  
  TIME_SLOTS: [
    '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
    '11:00 - 11:30', '11:30 - 12:00', '14:00 - 14:30', '14:30 - 15:00',
    '15:00 - 15:30', '15:30 - 16:00'
  ],

  render: function(container, params) {
    const session = window.HMS_DB.getCurrentSession();
    if (!session) return;

    if (params && params.action === 'book') {
      this.startBookingWizard(container);
    } else {
      this.renderApptPanel(container);
    }
  },

  renderApptPanel: function(container) {
    const session = window.HMS_DB.getCurrentSession();
    
    container.innerHTML = `
      <div class="card">
        <div class="card-header-row">
          <h3 class="card-title">Appointments Panel</h3>
          <div class="demo-login-tags" style="gap: 8px;">
            <button class="btn btn-outline" id="appt-toggle-view-btn" onclick="window.HMS_APPOINTMENTS.toggleViewMode()">
              <i class="fa-solid fa-calendar"></i> Switch to Calendar
            </button>
            ${['Admin', 'Receptionist', 'Patient'].includes(session.role) ? `
              <button class="btn btn-primary" onclick="window.location.hash = '#/appointments?action=book'">
                <i class="fa-solid fa-calendar-plus"></i> Book Appointment
              </button>
            ` : ''}
          </div>
        </div>

        <div id="appt-content-area">
          <!-- List view or Calendar view injected here -->
        </div>
      </div>

      <!-- Reminders Logs Section (Simulated) -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom: 16px;">Reminder Logs (Simulated SMS/Email Dispatches)</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Type</th>
                <th>Sent At</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="reminder-logs-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.renderApptContent();
    this.loadReminderLogs();
  },

  toggleViewMode: function() {
    this.viewMode = this.viewMode === 'list' ? 'calendar' : 'list';
    const btn = document.getElementById('appt-toggle-view-btn');
    if (this.viewMode === 'list') {
      btn.innerHTML = '<i class="fa-solid fa-calendar"></i> Switch to Calendar';
    } else {
      btn.innerHTML = '<i class="fa-solid fa-list"></i> Switch to List View';
    }
    this.renderApptContent();
  },

  renderApptContent: function() {
    const area = document.getElementById('appt-content-area');
    if (this.viewMode === 'list') {
      this.renderListView(area);
    } else {
      this.renderCalendarView(area);
    }
  },

  renderListView: function(container) {
    const session = window.HMS_DB.getCurrentSession();
    const appts = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);

    // Filter appointments based on role
    let list = appts;
    if (session.role === 'Doctor') {
      list = appts.filter(a => a.doctor_id === session.entityId);
    } else if (session.role === 'Patient') {
      list = appts.filter(a => a.patient_id === session.entityId);
    }

    // Sort by date and slot
    list.sort((a, b) => b.date.localeCompare(a.date) || b.time_slot.localeCompare(a.time_slot));

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-calendar-times"></i></div>
          <div class="empty-state-title">No appointments found</div>
          <div class="empty-state-text">There are no consultations scheduled in the system.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(a => {
              const pat = patients.find(p => p.id === a.patient_id);
              const doc = doctors.find(d => d.id === a.doctor_id);
              
              let badge = 'badge-info';
              if (a.status === 'Confirmed') badge = 'badge-success';
              else if (a.status === 'Completed') badge = 'badge-gray';
              else if (a.status === 'Cancelled') badge = 'badge-danger';
              else if (a.status === 'No-Show') badge = 'badge-warning';

              const isPast = new Date(a.date) < new Date('2026-07-14');
              const canModify = !['Cancelled', 'Completed', 'No-Show'].includes(a.status);

              return `
                <tr>
                  <td><strong>${a.date}</strong><br><span class="current-time-display" style="padding:2px 6px; font-size:11px;">${a.time_slot}</span></td>
                  <td><a href="#/patients?id=${a.patient_id}"><strong>${pat ? pat.name : 'Unknown'}</strong></a></td>
                  <td><strong>${doc ? doc.name : 'Unknown Doctor'}</strong><br><span class="text-muted" style="font-size:12px;">${doc ? doc.specialization : ''}</span></td>
                  <td>${a.reason}</td>
                  <td>
                    <span class="badge ${badge}">${a.status}</span>
                    ${a.cancel_reason ? `<div style="font-size:10px; color:var(--danger-text); margin-top:2px;">Reason: ${a.cancel_reason}</div>` : ''}
                  </td>
                  <td>
                    <div class="demo-login-tags" style="gap: 4px;">
                      ${canModify && ['Admin', 'Receptionist', 'Patient'].includes(session.role) ? `
                        <button class="btn btn-outline btn-sm" onclick="window.HMS_APPOINTMENTS.triggerReschedule('${a.id}')" title="Reschedule"><i class="fa-solid fa-calendar-alt"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="window.HMS_APPOINTMENTS.cancelPrompt('${a.id}')" title="Cancel"><i class="fa-solid fa-ban"></i></button>
                      ` : ''}
                      ${canModify && ['Admin', 'Receptionist', 'Doctor'].includes(session.role) ? `
                        <button class="btn btn-success btn-sm" onclick="window.HMS_APPOINTMENTS.updateStatus('${a.id}', 'Completed')" title="Mark Completed"><i class="fa-solid fa-check"></i></button>
                        <button class="btn btn-warning btn-sm" onclick="window.HMS_APPOINTMENTS.updateStatus('${a.id}', 'No-Show')" title="Mark No-Show"><i class="fa-solid fa-user-slash"></i></button>
                      ` : ''}
                      ${!canModify ? '<span class="text-muted" style="font-size:12px;">No Actions</span>' : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderCalendarView: function(container) {
    // Generate simple Monthly Grid (July 2026)
    // 2026-07-01 falls on a Wednesday.
    // Days in July 2026 = 31.
    const year = 2026;
    const month = 6; // July (0-indexed)
    const monthName = 'July 2026';

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sun, 3 for Wed
    const daysInMonth = 31;

    let cellsHTML = '';

    // Empty cells before Wednesday
    for (let i = 0; i < firstDayIndex; i++) {
      cellsHTML += `<div class="calendar-day-cell other-month"></div>`;
    }

    const appts = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const session = window.HMS_DB.getCurrentSession();
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const doctors = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS);

    // Days grid
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-07-${d.toString().padStart(2, '0')}`;
      const isToday = dateStr === '2026-07-14';

      // Filter day appointments
      let dayAppts = appts.filter(a => a.date === dateStr);
      if (session.role === 'Doctor') {
        dayAppts = dayAppts.filter(a => a.doctor_id === session.entityId);
      } else if (session.role === 'Patient') {
        dayAppts = dayAppts.filter(a => a.patient_id === session.entityId);
      }

      cellsHTML += `
        <div class="calendar-day-cell ${isToday ? 'today' : ''}">
          <span class="calendar-day-number">${d}</span>
          <div class="calendar-event-pills">
            ${dayAppts.map(a => {
              const pat = patients.find(p => p.id === a.patient_id);
              const doc = doctors.find(docObj => docObj.id === a.doctor_id);
              const name = session.role === 'Doctor' ? (pat ? pat.name : 'Pat') : (doc ? doc.name.split(' ')[1] : 'Doc');
              let statusClass = 'scheduled';
              if (a.status === 'Confirmed') statusClass = 'confirmed';
              else if (a.status === 'Completed') statusClass = 'completed';
              else if (a.status === 'Cancelled') statusClass = 'cancelled';
              else if (a.status === 'No-Show') statusClass = 'noshow';

              return `
                <div class="calendar-event-pill ${statusClass}" onclick="window.HMS_APPOINTMENTS.showEventDetailModal('${a.id}')">
                  ${a.time_slot.split(' ')[0]} ${name}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="text-align: center; font-weight:600; font-size:16px; margin-bottom:12px;">${monthName}</div>
      <div class="calendar-grid">
        <div class="calendar-day-header">Sun</div>
        <div class="calendar-day-header">Mon</div>
        <div class="calendar-day-header">Tue</div>
        <div class="calendar-day-header">Wed</div>
        <div class="calendar-day-header">Thu</div>
        <div class="calendar-day-header">Fri</div>
        <div class="calendar-day-header">Sat</div>
        ${cellsHTML}
      </div>
    `;
  },

  showEventDetailModal: function(apptId) {
    const a = window.HMS_DB.getById(window.HMS_DB.KEYS.APPOINTMENTS, apptId);
    if (!a) return;
    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, a.patient_id);
    const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, a.doctor_id);

    let modalOverlay = document.getElementById('appt-detail-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'appt-detail-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Appointment Info Summary</h3>
          <button class="modal-close" onclick="document.getElementById('appt-detail-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:8px;"><strong>Date:</strong> ${a.date}</p>
          <p style="margin-bottom:8px;"><strong>Time Slot:</strong> ${a.time_slot}</p>
          <p style="margin-bottom:8px;"><strong>Patient:</strong> ${pat ? pat.name : 'Unknown'}</p>
          <p style="margin-bottom:8px;"><strong>Doctor:</strong> ${doc ? doc.name : 'Unknown'}</p>
          <p style="margin-bottom:8px;"><strong>Reason for Visit:</strong> ${a.reason}</p>
          <p style="margin-bottom:8px;"><strong>Status Badge:</strong> <span class="badge ${a.status === 'Completed' ? 'badge-gray' : a.status === 'Confirmed' ? 'badge-success' : 'badge-info'}">${a.status}</span></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('appt-detail-modal').remove()">Close</button>
        </div>
      </div>
    `;
  },

  loadReminderLogs: function() {
    const logs = window.HMS_DB.getAll(window.HMS_DB.KEYS.REMINDERS);
    const appts = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const tbody = document.getElementById('reminder-logs-tbody');

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No reminders sent yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const appt = appts.find(a => a.id === l.appointment_id);
      const pat = appt ? patients.find(p => p.id === appt.patient_id) : null;
      return `
        <tr>
          <td><strong>${pat ? pat.name : 'Unknown'}</strong></td>
          <td><span class="badge badge-info">${l.type}</span></td>
          <td>${new Date(l.sent_at).toLocaleString()}</td>
          <td><code style="font-size:12px; display:block; max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.message}</code></td>
          <td><span class="badge badge-success">${l.status}</span></td>
        </tr>
      `;
    }).join('');
  },

  updateStatus: function(id, newStatus) {
    window.HMS_DB.update(window.HMS_DB.KEYS.APPOINTMENTS, id, { status: newStatus });
    
    // Auto-generate invoice line item if appointment marked Completed
    if (newStatus === 'Completed') {
      const appt = window.HMS_DB.getById(window.HMS_DB.KEYS.APPOINTMENTS, id);
      const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, appt.doctor_id);
      
      // Auto-create/append invoice
      if (appt && doc) {
        if (window.HMS_BILLING) {
          window.HMS_BILLING.createConsultationInvoice(appt.patient_id, doc);
        }
      }
      window.HMS_APP.toast('Appointment Completed', 'Consultation marked completed. Invoice raised.', 'success');
    } else {
      window.HMS_APP.toast('Status Updated', `Appointment status changed to ${newStatus}.`, 'success');
    }

    this.renderApptContent();
  },

  cancelPrompt: function(id) {
    const extraHTML = `
      <div class="form-group">
        <label for="cancel-reason-select">Cancellation Reason</label>
        <select id="cancel-reason-select" name="cancel_reason" required>
          <option value="Schedule Conflict">Schedule Conflict</option>
          <option value="Personal Emergency">Personal Emergency</option>
          <option value="Feeling Better">Feeling Better</option>
          <option value="Other">Other</option>
        </select>
      </div>
    `;

    window.HMS_APP.confirm(
      'Cancel Appointment',
      'Are you sure you want to cancel this scheduled slot?',
      (extraData) => {
        const reason = extraData ? extraData.cancel_reason : 'Not specified';
        window.HMS_DB.update(window.HMS_DB.KEYS.APPOINTMENTS, id, {
          status: 'Cancelled',
          cancel_reason: reason
        });
        window.HMS_APP.toast('Appointment Cancelled', 'The slot has been freed.', 'warning');
        this.renderApptContent();
      },
      extraHTML
    );
  },

  // ==========================================
  // BOOK APPOINTMENT WIZARD (Patient/Receptionist)
  // ==========================================
  startBookingWizard: function(container, rescheduleId = null) {
    const session = window.HMS_DB.getCurrentSession();
    
    // Reset booking state
    this.bookingState = {
      step: 1,
      deptId: '',
      doctorId: '',
      date: '',
      timeSlot: '',
      reason: '',
      patientId: session.role === 'Patient' ? session.entityId : '',
      rescheduleApptId: rescheduleId
    };

    if (rescheduleId) {
      const appt = window.HMS_DB.getById(window.HMS_DB.KEYS.APPOINTMENTS, rescheduleId);
      if (appt) {
        const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, appt.doctor_id);
        this.bookingState.deptId = doc ? doc.department_id : '';
        this.bookingState.doctorId = appt.doctor_id;
        this.bookingState.patientId = appt.patient_id;
        this.bookingState.reason = appt.reason;
      }
    }

    this.renderWizardStep(container);
  },

  triggerReschedule: function(apptId) {
    this.startBookingWizard(document.getElementById('view-outlet'), apptId);
  },

  renderWizardStep: function(container) {
    const state = this.bookingState;
    const session = window.HMS_DB.getCurrentSession();
    
    // Base layout
    container.innerHTML = `
      <div class="card" style="max-width:800px; margin: 0 auto;">
        <h3 class="card-title" style="text-align:center; margin-bottom: 24px;">
          ${state.rescheduleApptId ? 'Reschedule Appointment Wizard' : 'Book New Appointment'}
        </h3>
        
        <!-- Steps Timeline Bar -->
        <div class="wizard-steps">
          <div class="wizard-step-line-active" style="width: ${((state.step - 1) / 5) * 100}%"></div>
          <div class="wizard-step ${state.step >= 1 ? 'active' : ''} ${state.step > 1 ? 'completed' : ''}">
            <div class="wizard-step-node">1</div>
            <div class="wizard-step-label">Dept</div>
          </div>
          <div class="wizard-step ${state.step >= 2 ? 'active' : ''} ${state.step > 2 ? 'completed' : ''}">
            <div class="wizard-step-node">2</div>
            <div class="wizard-step-label">Doctor</div>
          </div>
          <div class="wizard-step ${state.step >= 3 ? 'active' : ''} ${state.step > 3 ? 'completed' : ''}">
            <div class="wizard-step-node">3</div>
            <div class="wizard-step-label">Date</div>
          </div>
          <div class="wizard-step ${state.step >= 4 ? 'active' : ''} ${state.step > 4 ? 'completed' : ''}">
            <div class="wizard-step-node">4</div>
            <div class="wizard-step-label">Slot</div>
          </div>
          <div class="wizard-step ${state.step >= 5 ? 'active' : ''} ${state.step > 5 ? 'completed' : ''}">
            <div class="wizard-step-node">5</div>
            <div class="wizard-step-label">Reason</div>
          </div>
          <div class="wizard-step ${state.step >= 6 ? 'active' : ''}">
            <div class="wizard-step-node">6</div>
            <div class="wizard-step-label">Review</div>
          </div>
        </div>

        <div id="wizard-panel-outlet" class="wizard-panel">
          <!-- Step panel contents injected here -->
        </div>

        <div class="wizard-footer">
          <button class="btn btn-secondary" id="wizard-prev-btn" onclick="window.HMS_APPOINTMENTS.wizardPrev()" ${state.step === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i> Back
          </button>
          <button class="btn btn-primary" id="wizard-next-btn" onclick="window.HMS_APPOINTMENTS.wizardNext()">
            Next <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `;

    this.renderWizardPanelContent();
  },

  renderWizardPanelContent: function() {
    const outlet = document.getElementById('wizard-panel-outlet');
    const state = this.bookingState;
    const session = window.HMS_DB.getCurrentSession();

    switch (state.step) {
      case 1:
        const depts = window.HMS_DB.getAll(window.HMS_DB.KEYS.DEPARTMENTS);
        outlet.innerHTML = `
          <h4 style="margin-bottom: 12px;">Step 1: Select Department</h4>
          <div class="form-group">
            <label for="wiz-dept-select">Choose Specialization Department</label>
            <select id="wiz-dept-select" class="form-group" style="padding:12px; margin-top:8px;">
              <option value="">-- Choose Department --</option>
              ${depts.map(d => `<option value="${d.id}" ${state.deptId === d.id ? 'selected' : ''}>${d.name} - ${d.description}</option>`).join('')}
            </select>
          </div>
        `;
        break;
      
      case 2:
        const docs = window.HMS_DB.getAll(window.HMS_DB.KEYS.DOCTORS).filter(d => d.department_id === state.deptId && d.status === 'Active');
        outlet.innerHTML = `
          <h4 style="margin-bottom:12px;">Step 2: Choose Doctor</h4>
          ${docs.length === 0 ? `
            <p class="text-muted">No doctors found in this department. Go back and choose another.</p>
          ` : `
            <div class="doctor-cards-grid">
              ${docs.map(d => {
                const initials = d.name.split(' ').map(n=>n[0]).join('').substring(0,2);
                const isSelected = state.doctorId === d.id;
                return `
                  <div class="doctor-select-card ${isSelected ? 'selected' : ''}" onclick="window.HMS_APPOINTMENTS.selectWizardDoctor('${d.id}')">
                    <div class="doctor-avatar-mock">${initials}</div>
                    <div class="doctor-details-brief">
                      <h4>${d.name}</h4>
                      <p>${d.specialization}</p>
                      <div class="doctor-rating"><i class="fa-solid fa-star"></i> ${d.rating.toFixed(1)}</div>
                      <div class="doctor-fee-tag">Fee: $${d.consultation_fee}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        `;
        break;

      case 3:
        // Set date (calendar datepicker, disable past dates)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];

        const selectedDoc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, state.doctorId);

        outlet.innerHTML = `
          <h4 style="margin-bottom:12px;">Step 3: Select Appointment Date</h4>
          <p class="text-muted" style="margin-bottom: 12px;">Doctor <strong>${selectedDoc ? selectedDoc.name : ''}</strong> is available on: <code>${selectedDoc ? selectedDoc.available_days.join(', ') : ''}</code></p>
          <div class="form-group">
            <label for="wiz-date-select">Appointment Date</label>
            <input type="date" id="wiz-date-select" min="${minDate}" value="${state.date || ''}">
            <div class="error-msg" id="wiz-date-err"></div>
          </div>
        `;
        break;

      case 4:
        // Load time slots, disable already booked slots for doctor on date
        const appointments = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
        const docApptsDate = appointments.filter(a => 
          a.doctor_id === state.doctorId && 
          a.date === state.date && 
          !['Cancelled', 'No-Show'].includes(a.status)
        );

        const bookedSlots = docApptsDate.map(a => a.time_slot);

        outlet.innerHTML = `
          <h4 style="margin-bottom:12px;">Step 4: Select Time Slot</h4>
          <p class="text-muted">Available slots for ${state.date}:</p>
          <div class="time-slots-container">
            ${this.TIME_SLOTS.map(slot => {
              const isBooked = bookedSlots.includes(slot);
              const isSelected = state.timeSlot === slot;
              return `
                <div class="time-slot-pill ${isBooked ? 'disabled' : ''} ${isSelected ? 'selected' : ''}" 
                     onclick="${isBooked ? '' : `window.HMS_APPOINTMENTS.selectWizardSlot('${slot}')`}">
                  ${slot}
                </div>
              `;
            }).join('')}
          </div>
        `;
        break;

      case 5:
        // Reason + Patient Selector if Receptionist
        const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
        outlet.innerHTML = `
          <h4 style="margin-bottom:12px;">Step 5: Reason & Patient Info</h4>
          
          ${session.role !== 'Patient' ? `
            <div class="form-group">
              <label for="wiz-patient-select">Select Registered Patient</label>
              <select id="wiz-patient-select" style="padding:12px;">
                <option value="">-- Choose Patient --</option>
                ${patients.map(p => `<option value="${p.id}" ${state.patientId === p.id ? 'selected' : ''}>${p.name} (${p.phone})</option>`).join('')}
              </select>
              <div class="error-msg" id="wiz-patient-err"></div>
            </div>
          ` : ''}

          <div class="form-group">
            <label for="wiz-reason">Reason for Visit / Chief Complaints</label>
            <textarea id="wiz-reason" rows="3" placeholder="Describe symptoms briefly...">${state.reason || ''}</textarea>
            <div class="error-msg" id="wiz-reason-err"></div>
          </div>
        `;
        break;

      case 6:
        // Review Screen
        const docInfo = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, state.doctorId);
        const patInfo = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, state.patientId);

        outlet.innerHTML = `
          <h4 style="margin-bottom:12px;">Step 6: Review & Confirm</h4>
          <div class="current-time-display" style="padding: 16px; border-radius:10px;">
            <p style="margin-bottom:8px;"><strong>Patient:</strong> ${patInfo ? patInfo.name : 'N/A'}</p>
            <p style="margin-bottom:8px;"><strong>Doctor:</strong> ${docInfo ? docInfo.name : 'N/A'} (${docInfo ? docInfo.specialization : ''})</p>
            <p style="margin-bottom:8px;"><strong>Date:</strong> ${state.date}</p>
            <p style="margin-bottom:8px;"><strong>Time Slot:</strong> ${state.timeSlot}</p>
            <p style="margin-bottom:8px;"><strong>Reason:</strong> ${state.reason}</p>
            <p style="margin-bottom:8px;"><strong>Consultation Fee:</strong> $${docInfo ? docInfo.consultation_fee.toFixed(2) : '0.00'}</p>
          </div>
          <div style="margin-top: 16px; text-align: center;">
            <p class="text-muted"><i class="fa-solid fa-lock"></i> Real-time double-booking checks will execute upon confirmation.</p>
          </div>
        `;

        // Update Next button label to "Confirm Booking"
        document.getElementById('wizard-next-btn').innerHTML = 'Confirm Booking <i class="fa-solid fa-check-circle"></i>';
        break;
    }
  },

  selectWizardDoctor: function(docId) {
    this.bookingState.doctorId = docId;
    this.renderWizardPanelContent();
  },

  selectWizardSlot: function(slot) {
    this.bookingState.timeSlot = slot;
    this.renderWizardPanelContent();
  },

  wizardNext: function() {
    const state = this.bookingState;
    const session = window.HMS_DB.getCurrentSession();

    // Validations before moving to next step
    if (state.step === 1) {
      const deptVal = document.getElementById('wiz-dept-select').value;
      if (!deptVal) {
        window.HMS_APP.toast('Required Selection', 'Please choose a department to continue.', 'warning');
        return;
      }
      state.deptId = deptVal;
      state.step = 2;
    } 
    else if (state.step === 2) {
      if (!state.doctorId) {
        window.HMS_APP.toast('Required Selection', 'Please select a doctor card to continue.', 'warning');
        return;
      }
      state.step = 3;
    } 
    else if (state.step === 3) {
      const dateEl = document.getElementById('wiz-date-select');
      const dateVal = dateEl.value;
      const errEl = document.getElementById('wiz-date-err');
      errEl.innerText = '';

      if (!dateVal) {
        errEl.innerText = 'Appointment date is required';
        return;
      }

      // Check if day is matches doctor availability day name
      const dateObj = new Date(dateVal);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dateObj.getDay()];

      const selectedDoc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, state.doctorId);
      if (selectedDoc && !selectedDoc.available_days.includes(dayName)) {
        errEl.innerText = `Doctor is only available on: ${selectedDoc.available_days.join(', ')}. Selected date falls on a ${dayName}`;
        return;
      }

      state.date = dateVal;
      state.step = 4;
    } 
    else if (state.step === 4) {
      if (!state.timeSlot) {
        window.HMS_APP.toast('Required Selection', 'Please choose an available time slot.', 'warning');
        return;
      }
      state.step = 5;
    } 
    else if (state.step === 5) {
      let patientIdVal = state.patientId;
      
      if (session.role !== 'Patient') {
        const patEl = document.getElementById('wiz-patient-select');
        const patVal = patEl.value;
        const patErr = document.getElementById('wiz-patient-err');
        patErr.innerText = '';
        if (!patVal) {
          patErr.innerText = 'Patient selection is required';
          return;
        }
        patientIdVal = patVal;
      }

      const reasonEl = document.getElementById('wiz-reason');
      const reasonVal = reasonEl.value.trim();
      const reasonErr = document.getElementById('wiz-reason-err');
      reasonErr.innerText = '';

      if (!reasonVal) {
        reasonErr.innerText = 'Reason for visit is required';
        return;
      }

      state.patientId = patientIdVal;
      state.reason = reasonVal;
      state.step = 6;
    } 
    else if (state.step === 6) {
      // Execute final booking
      this.executeBooking();
      return;
    }

    this.renderWizardStep(document.getElementById('view-outlet'));
  },

  wizardPrev: function() {
    if (this.bookingState.step > 1) {
      this.bookingState.step--;
      this.renderWizardStep(document.getElementById('view-outlet'));
    }
  },

  executeBooking: function() {
    const state = this.bookingState;
    
    // Real double booking protection layer check
    const isAvail = window.HMS_DB.isDoctorAvailable(state.doctorId, state.date, state.timeSlot);
    if (!isAvail) {
      window.HMS_APP.toast('Booking Conflict', 'This time slot was just booked by another session. Please select a different slot.', 'danger');
      state.step = 4;
      state.timeSlot = '';
      this.renderWizardStep(document.getElementById('view-outlet'));
      return;
    }

    if (state.rescheduleApptId) {
      // Update existing
      window.HMS_DB.update(window.HMS_DB.KEYS.APPOINTMENTS, state.rescheduleApptId, {
        date: state.date,
        time_slot: state.timeSlot,
        reason: state.reason,
        status: 'Scheduled'
      });
      window.HMS_APP.toast('Appointment Rescheduled', 'The appointment has been successfully updated.', 'success');
    } else {
      // Create new
      const appt = window.HMS_DB.insert(window.HMS_DB.KEYS.APPOINTMENTS, {
        patient_id: state.patientId,
        doctor_id: state.doctorId,
        date: state.date,
        time_slot: state.timeSlot,
        reason: state.reason,
        status: 'Scheduled'
      });

      // Write mock reminder log in database
      const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, state.patientId);
      const doc = window.HMS_DB.getById(window.HMS_DB.KEYS.DOCTORS, state.doctorId);
      
      window.HMS_DB.insert(window.HMS_DB.KEYS.REMINDERS, {
        appointment_id: appt.id,
        type: 'SMS',
        status: 'Sent',
        sent_at: new Date().toISOString(),
        message: `Reminder: Your appointment with ${doc ? doc.name : 'Dr'} is booked on ${state.date} at ${state.timeSlot}.`
      });

      window.HMS_APP.toast('Booking Confirmed', 'Appointment registered successfully.', 'success');
    }

    // Go back to list view
    window.location.hash = '#/appointments';
  },

  // ==========================================
  // CLINICAL DOCTOR CALL QUEUE VIEW
  // ==========================================
  callNextPatient: function(doctorId) {
    const appointments = window.HMS_DB.getAll(window.HMS_DB.KEYS.APPOINTMENTS);
    const today = '2026-07-14';

    // Get today's active pending appointments
    const queue = appointments
      .filter(a => a.doctor_id === doctorId && a.date === today && ['Confirmed', 'Scheduled'].includes(a.status))
      .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

    if (queue.length === 0) {
      window.HMS_APP.toast('Queue Empty', 'All patients for today have been consulted.', 'info');
      return;
    }

    const nextAppt = queue[0];
    const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, nextAppt.patient_id);
    
    // Highlight visual representation row
    const row = document.getElementById(`appt-row-${nextAppt.id}`);
    if (row) {
      row.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
      row.style.border = '2px solid var(--warning)';
      setTimeout(() => {
        row.style.backgroundColor = '';
        row.style.border = '';
      }, 5000);
    }

    // Simulated loudspeaker voice
    window.HMS_APP.toast(
      'Calling Patient', 
      `Calling: ${pat ? pat.name : 'Next Patient'} to Consultation Room.`, 
      'warning'
    );
  }
};
