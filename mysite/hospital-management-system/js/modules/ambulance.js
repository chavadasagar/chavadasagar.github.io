/**
 * ambulance.js - Ambulance Fleet registry, Emergency requests, and animated tracking simulations
 */

window.HMS_AMBULANCE = {
  activeTab: 'dispatch-pane',

  render: function(container, params) {
    const session = window.HMS_DB.getCurrentSession();
    if (!session) return;

    container.innerHTML = `
      <div class="card tabs-container">
        <div class="tabs-header">
          <button class="tab-btn active" onclick="window.HMS_AMBULANCE.switchTab(event, 'dispatch-pane')">Active Dispatches</button>
          <button class="tab-btn" onclick="window.HMS_AMBULANCE.switchTab(event, 'fleet-pane')">Ambulance Fleet</button>
        </div>

        <!-- ACTIVE DISPATCHES PANEL -->
        <div id="dispatch-pane" class="tab-pane active">
          <div class="card-header-row" style="margin-bottom:16px;">
            <h3 class="card-title">Emergency Response Dashboard</h3>
            <button class="btn btn-danger" onclick="window.HMS_AMBULANCE.openRequestModal()">
              <i class="fa-solid fa-truck-light"></i> Dispatch Emergency Ambulance
            </button>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Patient / Caller Name</th>
                  <th>Pickup Location</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Tracking</th>
                </tr>
              </thead>
              <tbody id="dispatches-tbody">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- FLEET REGISTRY PANEL -->
        <div id="fleet-pane" class="tab-pane">
          <h3 class="card-title" style="margin-bottom:16px;">Ambulance Fleet & Drivers Registry</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Vehicle No</th>
                  <th>Driver Name</th>
                  <th>Contact Phone</th>
                  <th>Availability Toggle</th>
                  <th>Status Status</th>
                </tr>
              </thead>
              <tbody id="fleet-tbody">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.loadDispatches();
    this.loadFleet();
  },

  switchTab: function(e, tabId) {
    const container = e.target.closest('.tabs-container');
    container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    e.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  },

  // ==========================================
  // DISPATCH CONTROLS
  // ==========================================
  loadDispatches: function() {
    const requests = window.HMS_DB.getAll(window.HMS_DB.KEYS.AMBULANCE_REQUESTS);
    const fleet = window.HMS_DB.getAll(window.HMS_DB.KEYS.AMBULANCES);
    const tbody = document.getElementById('dispatches-tbody');

    // Sort descending by date
    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No active or historical dispatch dispatches.</td></tr>`;
      return;
    }

    tbody.innerHTML = requests.map(r => {
      const amb = fleet.find(a => a.id === r.ambulance_id);
      
      let badge = 'badge-info';
      if (r.status === 'Completed') badge = 'badge-success';
      else if (r.status === 'Dispatched') badge = 'badge-warning';

      return `
        <tr>
          <td><strong>#${r.id.substring(0, 8).toUpperCase()}</strong></td>
          <td><strong>${r.name || 'Emergency patient'}</strong></td>
          <td>${r.pickup_location}</td>
          <td>${amb ? `${amb.vehicle_number} (${amb.driver_name})` : 'Unassigned'}</td>
          <td><span class="badge ${badge}">${r.status}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.HMS_AMBULANCE.openLiveTrackingModal('${r.id}')">
              <i class="fa-solid fa-map-location-dot"></i> Track Live
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  loadFleet: function() {
    const fleet = window.HMS_DB.getAll(window.HMS_DB.KEYS.AMBULANCES);
    const tbody = document.getElementById('fleet-tbody');

    tbody.innerHTML = fleet.map(a => {
      let statusBadge = 'badge-success';
      if (a.status === 'Busy') statusBadge = 'badge-danger';
      else if (a.status === 'Out of Service') statusBadge = 'badge-gray';

      return `
        <tr>
          <td><strong>${a.vehicle_number}</strong></td>
          <td><strong>${a.driver_name}</strong></td>
          <td>${a.phone}</td>
          <td>
            <label class="demo-tag" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="checkbox" ${a.availability ? 'checked' : ''} onchange="window.HMS_AMBULANCE.toggleAmbulanceAvailability('${a.id}', this.checked)">
              <span>Active</span>
            </label>
          </td>
          <td><span class="badge ${statusBadge}">${a.status}</span></td>
        </tr>
      `;
    }).join('');
  },

  toggleAmbulanceAvailability: function(id, val) {
    const amb = window.HMS_DB.getById(window.HMS_DB.KEYS.AMBULANCES, id);
    if (!amb) return;

    if (amb.status === 'Busy' && !val) {
      window.HMS_APP.toast('Cannot Deactivate', 'Ambulance is currently on an active emergency dispatch.', 'danger');
      this.loadFleet();
      return;
    }

    const updates = {
      availability: val,
      status: val ? 'Available' : 'Out of Service'
    };

    window.HMS_DB.update(window.HMS_DB.KEYS.AMBULANCES, id, updates);
    window.HMS_APP.toast('Fleet Status Updated', `Vehicle ${amb.vehicle_number} availability set to ${val ? 'Online' : 'Offline'}.`, 'success');
    this.loadFleet();
  },

  openRequestModal: function() {
    const patients = window.HMS_DB.getAll(window.HMS_DB.KEYS.PATIENTS);
    const fleet = window.HMS_DB.getAll(window.HMS_DB.KEYS.AMBULANCES);

    const isAvailable = fleet.some(a => a.status === 'Available');

    let modalOverlay = document.getElementById('ambulance-request-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'ambulance-request-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Request Emergency Ambulance Dispatch</h3>
          <button class="modal-close" onclick="document.getElementById('ambulance-request-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          ${!isAvailable ? `
            <div class="current-time-display" style="border: 1px solid var(--danger); background-color:var(--danger-light); color:var(--danger-text); padding: 12px; margin-bottom: 16px; border-radius:8px;">
              <i class="fa-solid fa-warning"></i> <strong>System Alert:</strong> All fleet vehicles are currently busy or offline. Dispatches placed will be queued.
            </div>
          ` : ''}
          
          <form id="amb-req-form" novalidate>
            <div class="form-group">
              <label for="amb-patient">Linked Patient Profile (Optional)</label>
              <select id="amb-patient" onchange="window.HMS_AMBULANCE.autofillPatientDetails()">
                <option value="">-- Walk-in Emergency / Unlisted --</option>
                ${patients.map(p => `<option value="${p.id}">${p.name} (${p.phone})</option>`).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="amb-name">Patient / Caller Name</label>
              <input type="text" id="amb-name" placeholder="John Doe" required>
              <div class="error-msg" id="amb-name-err"></div>
            </div>

            <div class="form-group">
              <label for="amb-pickup">Pickup Location Address</label>
              <input type="text" id="amb-pickup" placeholder="e.g. 45 Pine St, Sector 2" required>
              <div class="error-msg" id="amb-pickup-err"></div>
            </div>

            <div class="form-group">
              <label for="amb-drop">Hospital Destination Ward</label>
              <select id="amb-drop" required>
                <option value="Emergency Trauma Care Block">Emergency Trauma Care Block</option>
                <option value="Triage & Isolation Room">Triage & Isolation Room</option>
                <option value="ICU Block A">ICU Block A</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('ambulance-request-modal').remove()">Cancel</button>
          <button class="btn btn-danger" onclick="window.HMS_AMBULANCE.saveRequest()">Confirm Dispatch</button>
        </div>
      </div>
    `;
  },

  autofillPatientDetails: function() {
    const patId = document.getElementById('amb-patient').value;
    const nameInput = document.getElementById('amb-name');
    const pickupInput = document.getElementById('amb-pickup');

    if (patId) {
      const pat = window.HMS_DB.getById(window.HMS_DB.KEYS.PATIENTS, patId);
      if (pat) {
        nameInput.value = pat.name;
        pickupInput.value = pat.address;
      }
    } else {
      nameInput.value = '';
      pickupInput.value = '';
    }
  },

  saveRequest: function() {
    const nameEl = document.getElementById('amb-name');
    const pickupEl = document.getElementById('amb-pickup');
    const patientId = document.getElementById('amb-patient').value;
    const name = nameEl.value.trim();
    const pickup = pickupEl.value.trim();
    const drop = document.getElementById('amb-drop').value;

    let hasError = false;
    document.getElementById('amb-name-err').innerText = '';
    document.getElementById('amb-pickup-err').innerText = '';
    nameEl.classList.remove('error');
    pickupEl.classList.remove('error');

    if (!name) { nameEl.classList.add('error'); hasError = true; }
    if (!pickup) { pickupEl.classList.add('error'); hasError = true; }

    if (hasError) return;

    // Find available vehicle
    const fleet = window.HMS_DB.getAll(window.HMS_DB.KEYS.AMBULANCES);
    const availableVehicle = fleet.find(a => a.status === 'Available');

    if (!availableVehicle) {
      window.HMS_APP.toast('Dispatch Queued', 'No ambulances available right now. Emergency queue queued.', 'warning');
      document.getElementById('ambulance-request-modal').remove();
      return;
    }

    // 1. Create request
    const req = window.HMS_DB.insert(window.HMS_DB.KEYS.AMBULANCE_REQUESTS, {
      patient_id: patientId || null,
      name: name,
      pickup_location: pickup,
      drop_location: drop,
      ambulance_id: availableVehicle.id,
      status: 'Requested'
    });

    // 2. Mark vehicle Busy
    window.HMS_DB.update(window.HMS_DB.KEYS.AMBULANCES, availableVehicle.id, {
      status: 'Busy',
      availability: false
    });

    document.getElementById('ambulance-request-modal').remove();
    window.HMS_APP.toast('Ambulance Requested', `Vehicle ${availableVehicle.vehicle_number} has been dispatched.`, 'success');
    this.loadDispatches();
    this.loadFleet();

    // 3. Start simulated transit progression
    this.runSimulation(req.id, availableVehicle.id);
  },

  runSimulation: function(reqId, ambId) {
    // Stage 1: Requested -> Dispatched (after 3 seconds)
    setTimeout(() => {
      const r = window.HMS_DB.getById(window.HMS_DB.KEYS.AMBULANCE_REQUESTS, reqId);
      if (r && r.status === 'Requested') {
        window.HMS_DB.update(window.HMS_DB.KEYS.AMBULANCE_REQUESTS, reqId, {
          status: 'Dispatched'
        });
        window.HMS_APP.toast('Ambulance In Route', `Vehicle dispatched and heading to ${r.pickup_location}.`, 'warning');
        
        // Refresh grids if user looking
        if (document.getElementById('dispatches-tbody')) {
          window.HMS_AMBULANCE.loadDispatches();
        }
      }
    }, 4000);

    // Stage 2: Dispatched -> Completed (after 8 seconds)
    setTimeout(() => {
      const r = window.HMS_DB.getById(window.HMS_DB.KEYS.AMBULANCE_REQUESTS, reqId);
      if (r && r.status === 'Dispatched') {
        window.HMS_DB.update(window.HMS_DB.KEYS.AMBULANCE_REQUESTS, reqId, {
          status: 'Completed'
        });
        
        // Free up vehicle
        window.HMS_DB.update(window.HMS_DB.KEYS.AMBULANCES, ambId, {
          status: 'Available',
          availability: true
        });

        window.HMS_APP.toast('Patient Arrived', `Ambulance arrived at ER with patient. Fleet vehicle returned online.`, 'success');
        
        if (document.getElementById('dispatches-tbody')) {
          window.HMS_AMBULANCE.loadDispatches();
          window.HMS_AMBULANCE.loadFleet();
        }
      }
    }, 9000);
  },

  // ==========================================
  // FUN LIVE TRACKING MAP OVERLAY
  // ==========================================
  openLiveTrackingModal: function(reqId) {
    const r = window.HMS_DB.getById(window.HMS_DB.KEYS.AMBULANCE_REQUESTS, reqId);
    if (!r) return;
    const amb = window.HMS_DB.getById(window.HMS_DB.KEYS.AMBULANCES, r.ambulance_id);

    let modalOverlay = document.getElementById('tracking-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'tracking-modal';
      modalOverlay.className = 'modal-backdrop';
      document.body.appendChild(modalOverlay);
    }

    const steps = ['Requested', 'Dispatched', 'Completed'];
    const currentIdx = steps.indexOf(r.status);

    modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Emergency Dispatch Transit tracker</h3>
          <button class="modal-close" onclick="document.getElementById('tracking-modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:8px;"><strong>Caller Name:</strong> ${r.name}</p>
          <p style="margin-bottom:8px;"><strong>Pickup Address:</strong> ${r.pickup_location}</p>
          <p style="margin-bottom:12px;"><strong>Assigned Vehicle:</strong> ${amb ? amb.vehicle_number : ''} (Driver: ${amb ? amb.driver_name : ''})</p>

          <!-- Tracking Stepper -->
          <div class="tracking-stepper" style="margin: 30px 0;">
            <div class="tracking-progress-bar" style="width: ${r.status === 'Completed' ? '100' : r.status === 'Dispatched' ? '50' : '0'}%"></div>
            
            <div class="tracking-step ${currentIdx >= 0 ? 'completed' : ''}">
              <div class="tracking-dot"><i class="fa-solid fa-phone-volume"></i></div>
              <div class="tracking-label">Call Logged</div>
            </div>
            <div class="tracking-step ${currentIdx >= 1 ? 'completed' : ''} ${r.status === 'Dispatched' ? 'active' : ''}">
              <div class="tracking-dot"><i class="fa-solid fa-truck-medical"></i></div>
              <div class="tracking-label">Dispatched</div>
            </div>
            <div class="tracking-step ${currentIdx >= 2 ? 'completed' : ''} ${r.status === 'Completed' ? 'active' : ''}">
              <div class="tracking-dot"><i class="fa-solid fa-hospital-user"></i></div>
              <div class="tracking-label">Arrived ER</div>
            </div>
          </div>

          <!-- Animated mock road pathway -->
          <div class="map-container-mock">
            <div class="ambulance-marker-mock" id="tracking-moving-marker" 
                 style="left: ${r.status === 'Completed' ? '90' : r.status === 'Dispatched' ? '50' : '10'}%; top: 50%;">
              <i class="fa-solid fa-truck-medical"></i>
            </div>
            <div style="position:absolute; left:10px; bottom:10px; font-size:10px; color:#555; font-weight:600;"><i class="fa-solid fa-map-pin"></i> Pickup Point</div>
            <div style="position:absolute; right:10px; bottom:10px; font-size:10px; color:#555; font-weight:600;"><i class="fa-solid fa-hospital"></i> ER Triage</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('tracking-modal').remove()">Close Map</button>
        </div>
      </div>
    `;

    // Dynamic animation adjustment for the mock marker
    setTimeout(() => {
      const marker = document.getElementById('tracking-moving-marker');
      if (marker) {
        if (r.status === 'Requested') {
          marker.style.left = '10%';
        } else if (r.status === 'Dispatched') {
          marker.style.left = '50%';
        } else {
          marker.style.left = '90%';
        }
      }
    }, 100);
  }
};
