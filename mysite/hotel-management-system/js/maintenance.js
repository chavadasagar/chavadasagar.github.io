/**
 * maintenance.js - Maintenance logs, priority tickets, and room blocking status overrides
 */

const maintenanceController = {
  render(container) {
    const requests = window.db.getAll('maintenanceRequests');
    const staff = window.db.query('employees', emp => emp.departmentId === 'dept_maint');
    const rooms = window.db.getAll('rooms');
    const user = window.auth.getCurrentUser();
    
    // Check write permissions
    const canWrite = ['Admin', 'Manager', 'Receptionist', 'Housekeeping Staff'].includes(user.role);

    container.innerHTML = `
      <div class="maintenance-header animate-fade-in">
        <h2>Maintenance & Repairs</h2>
        ${canWrite ? `<button class="btn btn-primary" id="btn-add-maint">+ Log Issue / Request</button>` : ''}
      </div>

      <div class="table-responsive card animate-fade-in">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Room</th>
              <th>Issue / Type</th>
              <th>Priority</th>
              <th>Reported By</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="maint-tbody"></tbody>
        </table>
      </div>

      <!-- Log Request Modal -->
      <div id="maint-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Raise Maintenance Ticket</h3>
            <button class="modal-close-btn" id="btn-close-maint-modal">&times;</button>
          </div>
          <form id="maint-form">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label for="maint-room-field">Room Number*</label>
                  <select id="maint-room-field" required></select>
                </div>
                <div class="form-group">
                  <label for="maint-type-field">Issue Category*</label>
                  <select id="maint-type-field" required>
                    <option value="Plumbing">Plumbing / Water leak</option>
                    <option value="Electrical">Electrical / Appliances</option>
                    <option value="HVAC">Air Conditioning (HVAC)</option>
                    <option value="Furniture">Furniture & Woodwork</option>
                    <option value="SmartTV">TV & Internet</option>
                    <option value="Other">Other Repairs</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="maint-priority-field">Priority*</label>
                  <select id="maint-priority-field" required>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High" selected>High</option>
                    <option value="Urgent">Urgent / Block Room</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="maint-assignee-field">Assign Technician</label>
                  <select id="maint-assignee-field">
                    <option value="">Unassigned</option>
                    ${staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="maint-desc-field">Problem Description*</label>
                <textarea id="maint-desc-field" required placeholder="Describe issue detail..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-maint-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">File Request</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const tbody = document.getElementById('maint-tbody');

    const updateDisplay = () => {
      tbody.innerHTML = requests.map(m => {
        const roomObj = rooms.find(r => r.id === m.roomId) || { roomNumber: '?' };
        const tech = staff.find(s => s.id === m.assignedEmployeeId) || { name: 'Unassigned' };
        
        let priorityClass = 'badge-secondary';
        if (m.priority === 'High') priorityClass = 'badge-warning';
        else if (m.priority === 'Urgent') priorityClass = 'badge-danger';

        let statusClass = 'badge-secondary';
        if (m.status === 'InProgress') statusClass = 'badge-warning';
        else if (m.status === 'Resolved') statusClass = 'badge-success';
        else if (m.status === 'Open') statusClass = 'badge-danger';

        let actionBtn = '';
        if (m.status !== 'Resolved') {
          if (m.status === 'Open') {
            actionBtn = `<button class="btn btn-xs btn-primary btn-claim" data-id="${m.id}">Start Repair</button>`;
          } else if (m.status === 'InProgress') {
            actionBtn = `<button class="btn btn-xs btn-success btn-resolve" data-id="${m.id}">Mark Resolved</button>`;
          }
        } else {
          actionBtn = '<span class="text-success" style="font-size:11px;">✓ Completed</span>';
        }

        return `
          <tr>
            <td><strong>Room #${roomObj.roomNumber}</strong></td>
            <td>
              <strong>${m.issueType}</strong><br>
              <span style="font-size:11px; color:var(--text-muted);">${m.description}</span>
            </td>
            <td><span class="badge ${priorityClass}">${m.priority}</span></td>
            <td>${m.reportedBy || 'Staff'}</td>
            <td>${tech.name}</td>
            <td><span class="badge ${statusClass}">${m.status}</span></td>
            <td>${actionBtn}</td>
          </tr>
        `;
      }).join('');

      if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No maintenance requests logged.</td></tr>';
      }

      // Bind buttons
      tbody.querySelectorAll('.btn-claim').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          // If unassigned, claim it first
          const req = window.db.getById('maintenanceRequests', id);
          const update = { status: 'InProgress' };
          
          if (!req.assignedEmployeeId && staff.length > 0) {
            update.assignedEmployeeId = staff[0].id; // Assign first technician by default
          }
          
          window.db.update('maintenanceRequests', id, update);
          window.utils.showToast("Repair ticket status changed to IN PROGRESS.");
          this.render(container);
        });
      });

      tbody.querySelectorAll('.btn-resolve').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          this.executeResolveTicket(id);
          window.utils.showToast("Ticket resolved. Room status restored.");
          this.render(container);
        });
      });
    };

    updateDisplay();

    if (canWrite) {
      document.getElementById('btn-add-maint').addEventListener('click', () => this.openRequestModal());
      document.getElementById('btn-close-maint-modal').addEventListener('click', () => this.closeModal());
      document.getElementById('btn-cancel-maint-modal').addEventListener('click', () => this.closeModal());
      document.getElementById('maint-form').addEventListener('submit', (e) => this.handleSaveRequest(e));
    }
  },

  openRequestModal(preselectedRoomNum = '') {
    const roomSelect = document.getElementById('maint-room-field');
    const rooms = window.db.getAll('rooms');
    
    roomSelect.innerHTML = rooms.map(r => {
      const isSelected = r.roomNumber === preselectedRoomNum ? 'selected' : '';
      return `<option value="${r.id}" ${isSelected}>Room #${r.roomNumber} (${r.status})</option>`;
    }).join('');

    document.getElementById('maint-desc-field').value = '';
    document.getElementById('maint-modal').style.display = 'flex';
  },

  closeModal() {
    document.getElementById('maint-modal').style.display = 'none';
  },

  handleSaveRequest(e) {
    e.preventDefault();

    const roomId = document.getElementById('maint-room-field').value;
    const issueType = document.getElementById('maint-type-field').value;
    const priority = document.getElementById('maint-priority-field').value;
    const assignedEmployeeId = document.getElementById('maint-assignee-field').value;
    const description = document.getElementById('maint-desc-field').value.trim();

    if (!roomId || !description) {
      window.utils.showToast("Room selection and description are required.", "error");
      return;
    }

    const user = window.auth.getCurrentUser() || { name: 'System' };

    const newTicket = window.db.create('maintenanceRequests', {
      roomId,
      issueType,
      priority,
      reportedBy: user.name,
      assignedEmployeeId: assignedEmployeeId || null,
      status: 'Open',
      resolutionNotes: ''
    });

    // Mark room status as Maintenance (which locks bookings)
    window.db.update('rooms', roomId, { status: 'Maintenance' });

    // Check notifications
    if (window.mainApp && typeof window.mainApp.checkNotifications === 'function') {
      window.mainApp.checkNotifications();
    }

    window.utils.showToast("Maintenance ticket raised! Room status set to Maintenance. 🔧");
    this.closeModal();
    this.render(document.getElementById('app-content'));
  },

  executeResolveTicket(ticketId) {
    const ticket = window.db.getById('maintenanceRequests', ticketId);
    if (!ticket) return;

    // Resolve ticket
    window.db.update('maintenanceRequests', ticketId, { status: 'Resolved' });

    // Check if room has active bookings or needs housekeeping
    const room = window.db.getById('rooms', ticket.roomId);
    
    // Default room reset status: Available, Clean
    // However, if it was dirty prior to maintenance, keep it dirty
    let roomStatus = 'Available';
    let hkStatus = 'Clean';

    // Verify if there's currently an checked-in booking in this room
    const currentBookings = window.db.query('bookings', b => b.bookingStatus === 'CheckedIn');
    const isOccupied = window.db.query('bookingRooms', br => br.roomId === ticket.roomId && br.roomStatus === 'CheckedIn').length > 0;
    
    if (isOccupied) {
      roomStatus = 'Occupied';
    }

    window.db.update('rooms', ticket.roomId, { status: roomStatus, housekeepingStatus: hkStatus });

    // Check notifications
    if (window.mainApp && typeof window.mainApp.checkNotifications === 'function') {
      window.mainApp.checkNotifications();
    }
  }
};

window.maintenanceController = maintenanceController;
