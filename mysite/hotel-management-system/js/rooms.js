/**
 * rooms.js - Room Management, Room Grid & Floor Plan views, Room Drawer
 */

const roomsController = {
  activeTab: 'grid', // 'grid' or 'list'
  selectedRoom: null,

  render(container) {
    container.innerHTML = `
      <div class="rooms-header animate-fade-in">
        <h2>Rooms & Floor Grid</h2>
        <div class="view-toggles">
          <button class="btn ${this.activeTab === 'grid' ? 'btn-primary' : 'btn-outline'}" id="toggle-room-grid">Floor Plan Grid</button>
          <button class="btn ${this.activeTab === 'list' ? 'btn-primary' : 'btn-outline'}" id="toggle-room-list">Room Inventory List</button>
        </div>
      </div>

      <div id="rooms-content" class="animate-fade-in"></div>

      <!-- Detail Drawer -->
      <div id="room-drawer" class="drawer-backdrop" style="display: none;">
        <div class="drawer-content">
          <div class="drawer-header">
            <h3>Room <span id="drawer-room-num"></span> Details</h3>
            <button class="drawer-close-btn" id="btn-close-drawer">&times;</button>
          </div>
          <div class="drawer-body" id="drawer-body-content"></div>
        </div>
      </div>

      <!-- Add/Edit Room Modal -->
      <div id="room-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="room-modal-title">Add New Room</h3>
            <button class="modal-close-btn" id="btn-close-room-modal">&times;</button>
          </div>
          <form id="room-form">
            <input type="hidden" id="room-id-field">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label for="room-num-field">Room Number*</label>
                  <input type="text" id="room-num-field" required placeholder="e.g. 104">
                </div>
                <div class="form-group">
                  <label for="room-floor-field">Floor*</label>
                  <select id="room-floor-field" required></select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="room-type-field">Room Type*</label>
                  <select id="room-type-field" required></select>
                </div>
                <div class="form-group">
                  <label for="room-view-field">View Type</label>
                  <input type="text" id="room-view-field" placeholder="e.g. Sea View, Pool View">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="room-status-field">Status*</label>
                  <select id="room-status-field" required>
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="room-hk-field">Housekeeping*</label>
                  <select id="room-hk-field" required>
                    <option value="Clean">Clean</option>
                    <option value="Dirty">Dirty</option>
                    <option value="Inspected">Inspected</option>
                  </select>
                </div>
              </div>
              <div class="form-group-checkbox">
                <label>
                  <input type="checkbox" id="room-smoking-field">
                  Smoking Allowed
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-room-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Room</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Bind Toggles
    document.getElementById('toggle-room-grid').addEventListener('click', () => {
      this.activeTab = 'grid';
      this.render(container);
    });
    document.getElementById('toggle-room-list').addEventListener('click', () => {
      this.activeTab = 'list';
      this.render(container);
    });

    document.getElementById('btn-close-drawer').addEventListener('click', () => this.closeDrawer());
    document.getElementById('btn-close-room-modal').addEventListener('click', () => this.closeRoomModal());
    document.getElementById('btn-cancel-room-modal').addEventListener('click', () => this.closeRoomModal());
    document.getElementById('room-form').addEventListener('submit', (e) => this.handleSaveRoom(e));

    // Initial Sub-render
    if (this.activeTab === 'grid') {
      this.renderGrid();
    } else {
      this.renderList();
    }
  },

  renderGrid() {
    const subContainer = document.getElementById('rooms-content');
    const floors = window.db.getAll('floors').sort((a, b) => b.number - a.number); // Top floors first
    const rooms = window.db.getAll('rooms');
    const roomTypes = window.db.getAll('roomTypes');

    subContainer.innerHTML = `
      <!-- Filters -->
      <div class="rooms-filters-bar card">
        <div class="filter-group">
          <label>Floor:</label>
          <select id="filter-floor-grid">
            <option value="All">All Floors</option>
            ${floors.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Room Type:</label>
          <select id="filter-type-grid">
            <option value="All">All Types</option>
            ${roomTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Status:</label>
          <select id="filter-status-grid">
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>
      </div>

      <div id="grid-floors-list"></div>
    `;

    // Bind filters
    const filterFloor = document.getElementById('filter-floor-grid');
    const filterType = document.getElementById('filter-type-grid');
    const filterStatus = document.getElementById('filter-status-grid');

    const updateGridDisplay = () => {
      const selectedFloor = filterFloor.value;
      const selectedType = filterType.value;
      const selectedStatus = filterStatus.value;
      
      const filteredFloors = floors.filter(f => selectedFloor === 'All' || f.id === selectedFloor);
      const floorsContainer = document.getElementById('grid-floors-list');

      floorsContainer.innerHTML = filteredFloors.map(f => {
        const floorRooms = rooms.filter(r => {
          const matchFloor = r.floorId === f.id;
          const matchType = selectedType === 'All' || r.roomTypeId === selectedType;
          const matchStatus = selectedStatus === 'All' || r.status === selectedStatus;
          return matchFloor && matchType && matchStatus;
        }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

        if (floorRooms.length === 0) return '';

        return `
          <div class="floor-section">
            <h4 class="floor-title">${f.name} (Floor ${f.number})</h4>
            <div class="room-tiles-grid">
              ${floorRooms.map(r => {
                const rt = roomTypes.find(t => t.id === r.roomTypeId) || { name: 'Unknown', image: '🏨' };
                let statusClass = 'room-tile-available';
                if (r.status === 'Occupied') statusClass = 'room-tile-occupied';
                else if (r.status === 'Maintenance') statusClass = 'room-tile-maintenance';
                else if (r.status === 'Blocked') statusClass = 'room-tile-blocked';

                // Housekeeping badge
                let hkBadge = '';
                if (r.housekeepingStatus === 'Dirty') hkBadge = '<span class="hk-badge dirty">Dirty 🧹</span>';

                return `
                  <div class="room-tile ${statusClass}" data-id="${r.id}">
                    <div class="room-tile-header">
                      <span class="room-number">#${r.roomNumber}</span>
                      ${hkBadge}
                    </div>
                    <div class="room-tile-type">${rt.image} ${rt.name}</div>
                    <div class="room-tile-status">${r.status}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');

      if (floorsContainer.innerHTML.trim() === '') {
        floorsContainer.innerHTML = '<div class="empty-state">No rooms match your filter criteria.</div>';
      }

      // Bind click on tiles
      floorsContainer.querySelectorAll('.room-tile').forEach(tile => {
        tile.addEventListener('click', (e) => {
          const roomId = e.currentTarget.getAttribute('data-id');
          this.openDrawer(roomId);
        });
      });
    };

    filterFloor.addEventListener('change', updateGridDisplay);
    filterType.addEventListener('change', updateGridDisplay);
    filterStatus.addEventListener('change', updateGridDisplay);

    updateGridDisplay();
  },

  renderList() {
    const subContainer = document.getElementById('rooms-content');
    const rooms = window.db.getAll('rooms');
    const roomTypes = window.db.getAll('roomTypes');
    const floors = window.db.getAll('floors');
    const user = window.auth.getCurrentUser();

    // Check write permission
    const canWrite = user.role === 'Admin' || user.role === 'Manager';

    subContainer.innerHTML = `
      <div class="list-actions card">
        <div class="search-box-wrapper">
          <input type="text" id="search-rooms-list" placeholder="Search Room Number...">
        </div>
        ${canWrite ? `<button class="btn btn-primary" id="btn-add-room">+ Add Room</button>` : ''}
      </div>

      <div class="table-responsive card">
        <table class="table">
          <thead>
            <tr>
              <th>Room No</th>
              <th>Floor</th>
              <th>Room Type</th>
              <th>View Type</th>
              <th>Smoking</th>
              <th>Status</th>
              <th>Housekeeping</th>
              ${canWrite ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody id="rooms-list-tbody"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('rooms-list-tbody');
    const searchInput = document.getElementById('search-rooms-list');

    const updateListDisplay = () => {
      const query = searchInput.value.trim().toLowerCase();
      const filteredRooms = rooms.filter(r => r.roomNumber.toLowerCase().includes(query));

      tbody.innerHTML = filteredRooms.map(r => {
        const floorObj = floors.find(f => f.id === r.floorId) || { name: 'Unknown' };
        const typeObj = roomTypes.find(t => t.id === r.roomTypeId) || { name: 'Unknown' };
        
        return `
          <tr>
            <td><strong>#${r.roomNumber}</strong></td>
            <td>${floorObj.name}</td>
            <td>${typeObj.name}</td>
            <td>${r.viewType || '-'}</td>
            <td>${r.smokingAllowed ? '🚬 Yes' : '🚭 No'}</td>
            <td><span class="badge ${r.status === 'Available' ? 'badge-success' : r.status === 'Occupied' ? 'badge-danger' : r.status === 'Maintenance' ? 'badge-warning' : 'badge-secondary'}">${r.status}</span></td>
            <td><span class="badge ${r.housekeepingStatus === 'Clean' ? 'badge-success' : r.housekeepingStatus === 'Dirty' ? 'badge-danger' : 'badge-info'}">${r.housekeepingStatus}</span></td>
            ${canWrite ? `
              <td>
                <button class="btn btn-xs btn-outline btn-edit-room" data-id="${r.id}">Edit</button>
                <button class="btn btn-xs btn-danger btn-delete-room" data-id="${r.id}">Delete</button>
              </td>
            ` : ''}
          </tr>
        `;
      }).join('');

      if (filteredRooms.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${canWrite ? 8 : 7}" class="text-center text-muted">No rooms found.</td></tr>`;
      }

      // Bind Action Buttons
      if (canWrite) {
        tbody.querySelectorAll('.btn-edit-room').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const roomId = e.currentTarget.getAttribute('data-id');
            this.openRoomModal(roomId);
          });
        });

        tbody.querySelectorAll('.btn-delete-room').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const roomId = e.currentTarget.getAttribute('data-id');
            this.handleDeleteRoom(roomId);
          });
        });
      }
    };

    searchInput.addEventListener('input', updateListDisplay);

    if (canWrite) {
      document.getElementById('btn-add-room').addEventListener('click', () => this.openRoomModal());
    }

    updateListDisplay();
  },

  openDrawer(roomId) {
    const room = window.db.getById('rooms', roomId);
    if (!room) return;
    
    this.selectedRoom = room;
    const roomTypes = window.db.getAll('roomTypes');
    const floors = window.db.getAll('floors');
    const rt = roomTypes.find(t => t.id === room.roomTypeId) || { name: 'Unknown', basePrice: 0 };
    const floor = floors.find(f => f.id === room.floorId) || { name: 'Unknown' };

    document.getElementById('drawer-room-num').innerText = room.roomNumber;
    
    const user = window.auth.getCurrentUser();
    // Permissions: Admin/Manager/Receptionist can alter status. Housekeeping only cleaning actions.
    const canChangeStatus = ['Admin', 'Manager', 'Receptionist'].includes(user.role);
    const canMaint = ['Admin', 'Manager', 'Housekeeping Staff', 'Receptionist'].includes(user.role);

    // Look for active booking in this room
    const currentBookings = window.db.query('bookings', b => b.bookingStatus === 'CheckedIn');
    const activeBookingRoom = window.db.query('bookingRooms', br => br.roomId === room.id && br.roomStatus === 'CheckedIn')[0];
    let activeBooking = null;
    let guestName = 'None';
    let bookingLink = '';

    if (activeBookingRoom) {
      activeBooking = currentBookings.find(b => b.id === activeBookingRoom.bookingId);
      if (activeBooking) {
        const guest = window.db.getById('guests', activeBooking.guestId);
        guestName = guest ? guest.name : 'Unknown Guest';
        bookingLink = `<button class="btn btn-outline btn-sm" id="drawer-btn-view-booking" data-id="${activeBooking.id}">View Reservation (${activeBooking.bookingReferenceNo})</button>`;
      }
    }

    let statusOptionsHtml = '';
    if (canChangeStatus) {
      statusOptionsHtml = `
        <div class="drawer-action-section card">
          <h4>Quick Update Status</h4>
          <div class="form-group">
            <label>Change Room Status:</label>
            <select class="form-select" id="drawer-status-select">
              <option value="Available" ${room.status === 'Available' ? 'selected' : ''}>Available</option>
              <option value="Occupied" ${room.status === 'Occupied' ? 'selected' : ''} disabled>Occupied (Managed via Bookings)</option>
              <option value="Maintenance" ${room.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              <option value="Blocked" ${room.status === 'Blocked' ? 'selected' : ''}>Blocked</option>
            </select>
          </div>
          
          <div class="form-group" style="margin-top: 12px;">
            <label>Change Housekeeping Status:</label>
            <select class="form-select" id="drawer-hk-select">
              <option value="Clean" ${room.housekeepingStatus === 'Clean' ? 'selected' : ''}>Clean</option>
              <option value="Dirty" ${room.housekeepingStatus === 'Dirty' ? 'selected' : ''}>Dirty</option>
              <option value="Inspected" ${room.housekeepingStatus === 'Inspected' ? 'selected' : ''}>Inspected</option>
            </select>
          </div>
          
          <button class="btn btn-primary btn-block" style="margin-top:15px;" id="drawer-btn-save-status">Update Statuses</button>
        </div>
      `;
    }

    const drawerBody = document.getElementById('drawer-body-content');
    drawerBody.innerHTML = `
      <div class="room-details-card">
        <div class="detail-row"><span>Type:</span><strong>${rt.name}</strong></div>
        <div class="detail-row"><span>Floor:</span><strong>${floor.name} (Floor ${floor.number})</strong></div>
        <div class="detail-row"><span>Base Price:</span><strong>${window.utils.formatCurrency(rt.basePrice)} / night</strong></div>
        <div class="detail-row"><span>View:</span><strong>${room.viewType || 'No View'}</strong></div>
        <div class="detail-row"><span>Smoking:</span><strong>${room.smokingAllowed ? '🚬 Allowed' : '🚭 No Smoking'}</strong></div>
        <div class="detail-row"><span>Current Occupant:</span><strong>${guestName}</strong></div>
      </div>

      ${bookingLink ? `<div style="margin: 15px 0;">${bookingLink}</div>` : ''}

      ${statusOptionsHtml}

      <div class="drawer-maintenance-section card">
        <h4>Maintenance Actions</h4>
        ${room.status === 'Maintenance' ? 
          `<p class="text-warning">⚠️ Room is currently flagged for maintenance.</p>
           <button class="btn btn-outline btn-block" id="drawer-btn-view-maint">View Service Request</button>` :
          (canMaint ? `<button class="btn btn-warning btn-block" id="drawer-btn-send-maint">🔧 Send to Maintenance</button>` : '')
        }
      </div>
    `;

    // Bind drawer buttons
    document.getElementById('room-drawer').style.display = 'block';

    if (bookingLink) {
      document.getElementById('drawer-btn-view-booking').addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeDrawer();
        window.location.hash = '#bookings';
        setTimeout(() => {
          if (window.bookingsController && typeof window.bookingsController.viewBookingDetails === 'function') {
            window.bookingsController.viewBookingDetails(id);
          }
        }, 100);
      });
    }

    if (canChangeStatus) {
      document.getElementById('drawer-btn-save-status').addEventListener('click', () => {
        const status = document.getElementById('drawer-status-select').value;
        const hk = document.getElementById('drawer-hk-select').value;
        
        // Prevent setting occupied manually if no booking
        if (status === 'Occupied' && !activeBookingRoom) {
          window.utils.showToast("Cannot set room status to Occupied manually. Check in a guest instead.", "warning");
          return;
        }

        window.db.update('rooms', room.id, { status, housekeepingStatus: hk });
        window.utils.showToast(`Room ${room.roomNumber} updated!`, 'success');
        this.closeDrawer();
        this.renderGrid();
      });
    }

    if (room.status === 'Maintenance') {
      document.getElementById('drawer-btn-view-maint').addEventListener('click', () => {
        this.closeDrawer();
        window.location.hash = '#maintenance';
      });
    } else if (canMaint) {
      document.getElementById('drawer-btn-send-maint').addEventListener('click', () => {
        this.closeDrawer();
        window.location.hash = '#maintenance';
        setTimeout(() => {
          if (window.maintenanceController && typeof window.maintenanceController.openRequestModal === 'function') {
            window.maintenanceController.openRequestModal(room.roomNumber);
          }
        }, 100);
      });
    }
  },

  closeDrawer() {
    document.getElementById('room-drawer').style.display = 'none';
    this.selectedRoom = null;
  },

  openRoomModal(roomId = null) {
    const floors = window.db.getAll('floors');
    const roomTypes = window.db.getAll('roomTypes');

    // Populate selects
    const floorSelect = document.getElementById('room-floor-field');
    const typeSelect = document.getElementById('room-type-field');
    
    floorSelect.innerHTML = floors.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    typeSelect.innerHTML = roomTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    const form = document.getElementById('room-form');
    form.reset();

    if (roomId) {
      const room = window.db.getById('rooms', roomId);
      if (!room) return;
      document.getElementById('room-modal-title').innerText = `Edit Room #${room.roomNumber}`;
      document.getElementById('room-id-field').value = room.id;
      document.getElementById('room-num-field').value = room.roomNumber;
      document.getElementById('room-floor-field').value = room.floorId;
      document.getElementById('room-type-field').value = room.roomTypeId;
      document.getElementById('room-view-field').value = room.viewType || '';
      document.getElementById('room-status-field').value = room.status;
      document.getElementById('room-hk-field').value = room.housekeepingStatus;
      document.getElementById('room-smoking-field').checked = room.smokingAllowed;
    } else {
      document.getElementById('room-modal-title').innerText = "Add New Room";
      document.getElementById('room-id-field').value = '';
    }

    document.getElementById('room-modal').style.display = 'flex';
  },

  closeRoomModal() {
    document.getElementById('room-modal').style.display = 'none';
  },

  handleSaveRoom(e) {
    e.preventDefault();

    const id = document.getElementById('room-id-field').value;
    const roomNumber = document.getElementById('room-num-field').value.trim();
    const floorId = document.getElementById('room-floor-field').value;
    const roomTypeId = document.getElementById('room-type-field').value;
    const viewType = document.getElementById('room-view-field').value.trim();
    const status = document.getElementById('room-status-field').value;
    const housekeepingStatus = document.getElementById('room-hk-field').value;
    const smokingAllowed = document.getElementById('room-smoking-field').checked;

    if (!roomNumber) {
      window.utils.showToast("Room number is required", "error");
      return;
    }

    // Check duplicates
    const allRooms = window.db.getAll('rooms');
    const duplicate = allRooms.find(r => r.roomNumber.toLowerCase() === roomNumber.toLowerCase() && r.id !== id);
    if (duplicate) {
      window.utils.showToast(`Room number ${roomNumber} already exists! ❌`, 'error');
      return;
    }

    const payload = { roomNumber, floorId, roomTypeId, viewType, status, housekeepingStatus, smokingAllowed };

    if (id) {
      // Update
      window.db.update('rooms', id, payload);
      window.utils.showToast("Room details updated successfully ✅");
    } else {
      // Create
      window.db.create('rooms', payload);
      window.utils.showToast("New room created successfully ✅");
    }

    this.closeRoomModal();
    this.renderList();
  },

  handleDeleteRoom(roomId) {
    const room = window.db.getById('rooms', roomId);
    if (!room) return;

    // Check if room has active bookings
    const activeRooms = window.db.query('bookingRooms', br => br.roomId === roomId && br.roomStatus !== 'CheckedOut');
    if (activeRooms.length > 0) {
      window.utils.confirm(
        "Cannot Delete Room",
        `Room #${room.roomNumber} has active or future reservations. You cannot delete this room. Change its status to Blocked instead.`,
        () => {}
      );
      return;
    }

    window.utils.confirm(
      "Confirm Room Deletion",
      `Are you sure you want to delete room #${room.roomNumber}? This action is permanent.`,
      () => {
        window.db.delete('rooms', roomId);
        window.utils.showToast(`Room #${room.roomNumber} deleted successfully.`);
        this.renderList();
      }
    );
  }
};

window.roomsController = roomsController;
