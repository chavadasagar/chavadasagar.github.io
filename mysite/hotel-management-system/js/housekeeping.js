/**
 * housekeeping.js - Task list/board, supervisor assignments, simplified housekeeper UI
 */

const housekeepingController = {
  render(container) {
    const user = window.auth.getCurrentUser();
    const isHousekeeper = user.role === 'Housekeeping Staff';

    if (isHousekeeper) {
      this.renderStaffQueue(container, user);
    } else {
      this.renderSupervisorBoard(container);
    }
  },

  // Supervisor Kanban view with assignments
  renderSupervisorBoard(container) {
    const tasks = window.db.getAll('housekeepingTasks');
    const rooms = window.db.getAll('rooms');
    const staff = window.db.query('employees', emp => emp.departmentId === 'dept_hk');

    const pending = tasks.filter(t => t.status === 'Pending');
    const active = tasks.filter(t => t.status === 'InProgress');
    const completed = tasks.filter(t => t.status === 'Completed');

    container.innerHTML = `
      <div class="housekeeping-header animate-fade-in">
        <h2>Housekeeping Dispatch Board</h2>
        <button class="btn btn-primary" id="btn-add-hk-task">+ Assign Custom Task</button>
      </div>

      <div class="kanban-board animate-fade-in">
        <!-- Col 1 -->
        <div class="kanban-column card">
          <div class="column-header">
            <h4>Dirty / Pending (${pending.length})</h4>
          </div>
          <div class="kanban-cards-wrapper" id="hk-col-pending"></div>
        </div>

        <!-- Col 2 -->
        <div class="kanban-column card">
          <div class="column-header">
            <h4>Cleaning In Progress (${active.length})</h4>
          </div>
          <div class="kanban-cards-wrapper" id="hk-col-active"></div>
        </div>

        <!-- Col 3 -->
        <div class="kanban-column card">
          <div class="column-header">
            <h4>Clean / Completed (${completed.length})</h4>
          </div>
          <div class="kanban-cards-wrapper" id="hk-col-completed"></div>
        </div>
      </div>

      <!-- Add Housekeeping Task Modal -->
      <div id="hk-task-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Assign Cleaning Duty</h3>
            <button class="modal-close-btn" id="btn-close-hk-modal">&times;</button>
          </div>
          <form id="hk-task-form">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label for="hk-room-field">Room Number*</label>
                  <select id="hk-room-field" required></select>
                </div>
                <div class="form-group">
                  <label for="hk-type-field">Task Type*</label>
                  <select id="hk-type-field" required>
                    <option value="Cleaning">Standard Cleaning</option>
                    <option value="Deep Cleaning">Deep Cleaning / Linen swap</option>
                    <option value="Inspected">Supervisor Inspection</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="hk-assignee-field">Assign Staff</label>
                <select id="hk-assignee-field">
                  <option value="">Unassigned</option>
                  ${staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="hk-notes-field">Supervisor Instructions</label>
                <textarea id="hk-notes-field" placeholder="Replace mini toiletries, check lightbulbs..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-hk-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Dispatch Task</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const populateCards = (colId, list) => {
      const wrapper = document.getElementById(colId);
      
      wrapper.innerHTML = list.map(t => {
        const rm = rooms.find(r => r.id === t.roomId) || { roomNumber: '?' };
        const emp = staff.find(s => s.id === t.assignedEmployeeId) || { name: 'Unassigned' };
        
        let actionsHtml = '';
        if (t.status === 'Pending') {
          actionsHtml = `
            <div class="form-group" style="margin-top:10px;">
              <select class="form-select select-assign-staff" data-id="${t.id}">
                <option value="">Choose Staff...</option>
                ${staff.map(s => `<option value="${s.id}" ${t.assignedEmployeeId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-xs btn-primary btn-start-task btn-block" style="margin-top:5px;" data-id="${t.id}">Start Cleaning</button>
          `;
        } else if (t.status === 'InProgress') {
          actionsHtml = `
            <p style="font-size:11px; margin: 5px 0;">Assigned: <strong>${emp.name}</strong></p>
            <button class="btn btn-xs btn-success btn-complete-task btn-block" data-id="${t.id}">Mark Inspected & Clean</button>
          `;
        } else {
          actionsHtml = `<p style="font-size:11px; color:var(--success-color); margin-top:5px;">✓ Cleaned by ${emp.name}</p>`;
        }

        return `
          <div class="kanban-card">
            <div class="kcard-header">
              <span class="room-tag">Room #${rm.roomNumber}</span>
              <span class="category-tag">${t.taskType}</span>
            </div>
            <div class="kcard-body">
              ${t.notes ? `<p class="kcard-notes">📋 ${t.notes}</p>` : ''}
              <span class="time-stamp">Created: ${window.utils.formatDate(t.createdAt, true)}</span>
            </div>
            <div class="kcard-footer">
              ${actionsHtml}
            </div>
          </div>
        `;
      }).join('');

      if (list.length === 0) {
        wrapper.innerHTML = '<p class="text-center text-muted" style="font-size:12px; margin-top:20px;">No tasks in this column.</p>';
      }
    };

    populateCards('hk-col-pending', pending);
    populateCards('hk-col-active', active);
    populateCards('hk-col-completed', completed);

    // Bind Assign staff dropdown changes
    container.querySelectorAll('.select-assign-staff').forEach(select => {
      select.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const assignedEmployeeId = e.target.value;
        window.db.update('housekeepingTasks', id, { assignedEmployeeId });
        window.utils.showToast("Staff assigned to cleaning task.");
      });
    });

    // Bind task state actions
    container.querySelectorAll('.btn-start-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const task = window.db.getById('housekeepingTasks', id);
        
        if (!task.assignedEmployeeId) {
          window.utils.showToast("Please select a housekeeper first.", "warning");
          return;
        }

        window.db.update('housekeepingTasks', id, { status: 'InProgress' });
        window.db.update('rooms', task.roomId, { housekeepingStatus: 'Dirty' });
        window.utils.showToast("Cleaning started!");
        this.renderSupervisorBoard(container);
      });
    });

    container.querySelectorAll('.btn-complete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.executeCompleteTask(id);
        this.renderSupervisorBoard(container);
      });
    });

    // Custom Task creation trigger
    document.getElementById('btn-add-hk-task').addEventListener('click', () => {
      const roomSelect = document.getElementById('hk-room-field');
      const allRooms = window.db.getAll('rooms');
      
      roomSelect.innerHTML = allRooms.map(r => `<option value="${r.id}">Room #${r.roomNumber} (${r.housekeepingStatus})</option>`).join('');
      
      document.getElementById('hk-task-modal').style.display = 'flex';
    });

    document.getElementById('btn-close-hk-modal').addEventListener('click', () => this.closeTaskModal());
    document.getElementById('btn-cancel-hk-modal').addEventListener('click', () => this.closeTaskModal());
    
    document.getElementById('hk-task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const roomId = document.getElementById('hk-room-field').value;
      const taskType = document.getElementById('hk-type-field').value;
      const assignedEmployeeId = document.getElementById('hk-assignee-field').value;
      const notes = document.getElementById('hk-notes-field').value.trim();

      const newTask = window.db.create('housekeepingTasks', {
        roomId,
        taskType,
        assignedEmployeeId: assignedEmployeeId || null,
        status: assignedEmployeeId ? 'InProgress' : 'Pending',
        notes
      });

      window.utils.showToast("Cleaning task disspatched! ✅");
      this.closeTaskModal();
      this.renderSupervisorBoard(container);
    });
  },

  closeTaskModal() {
    document.getElementById('hk-task-modal').style.display = 'none';
  },

  // Housekeeper "My Queue" layout (Mobile-friendly simplified list)
  renderStaffQueue(container, user) {
    const tasks = window.db.getAll('housekeepingTasks');
    const rooms = window.db.getAll('rooms');

    // Find if the housekeeper user corresponds to an employee profile
    const empProfile = window.db.getAll('employees').find(e => e.name.toLowerCase() === user.name.toLowerCase()) || { id: null };

    // Staff sees tasks explicitly assigned to them or unassigned housekeeping tasks
    const activeQueue = tasks.filter(t => 
      t.status !== 'Completed' && 
      (t.assignedEmployeeId === empProfile.id || t.assignedEmployeeId === null)
    );

    container.innerHTML = `
      <div class="housekeeping-header animate-fade-in">
        <h2>Housekeeper Panel</h2>
        <span class="user-badge" style="font-size:12px;">Staff ID: ${empProfile.id || 'Guest Profile'}</span>
      </div>

      <div class="my-tasks-container animate-fade-in">
        <h3>My Cleaning Queue</h3>
        <div class="staff-task-cards" style="display:flex; flex-direction:column; gap:15px; margin-top:15px;">
          ${activeQueue.map(t => {
            const rm = rooms.find(r => r.id === t.roomId) || { roomNumber: '?' };
            
            let btnAction = '';
            if (t.status === 'Pending') {
              btnAction = `<button class="btn btn-primary btn-block btn-start-task-staff" data-id="${t.id}">🧹 START CLEANING</button>`;
            } else if (t.status === 'InProgress') {
              btnAction = `<button class="btn btn-success btn-block btn-complete-task-staff" data-id="${t.id}">✓ FINISHED & CLEAN</button>`;
            }

            return `
              <div class="my-task-card card ${t.status.toLowerCase()}">
                <div class="tc-header" style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="room-pill">Room #${rm.roomNumber}</span>
                  <span class="badge ${t.status === 'Pending' ? 'badge-danger' : 'badge-warning'}">${t.status}</span>
                </div>
                <div class="tc-body" style="margin: 10px 0;">
                  <p><strong>Type:</strong> ${t.taskType}</p>
                  ${t.notes ? `<p style="font-size:12px; color:var(--text-muted);"><strong>Instructions:</strong> ${t.notes}</p>` : ''}
                </div>
                <div class="tc-footer">
                  ${btnAction}
                </div>
              </div>
            `;
          }).join('')}
          ${activeQueue.length === 0 ? '<div class="empty-state">No cleaning tasks assigned to you today. Enjoy! 🎉</div>' : ''}
        </div>
      </div>
    `;

    // Staff Action Bindings
    container.querySelectorAll('.btn-start-task-staff').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        window.db.update('housekeepingTasks', id, { 
          status: 'InProgress',
          assignedEmployeeId: empProfile.id // Claim task if unassigned
        });
        window.utils.showToast("Cleaning task started!");
        this.renderStaffQueue(container, user);
      });
    });

    container.querySelectorAll('.btn-complete-task-staff').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.executeCompleteTask(id);
        window.utils.showToast("Task completed! Room updated to CLEAN.");
        this.renderStaffQueue(container, user);
      });
    });
  },

  executeCompleteTask(taskId) {
    const task = window.db.getById('housekeepingTasks', taskId);
    if (!task) return;

    // Complete task
    window.db.update('housekeepingTasks', taskId, { status: 'Completed' });

    // Update Room housekeeping status back to CLEAN
    window.db.update('rooms', task.roomId, { housekeepingStatus: 'Clean' });

    // If room status is not occupied, ensure it goes back to Available
    const room = window.db.getById('rooms', task.roomId);
    if (room && room.status !== 'Occupied' && room.status !== 'Maintenance') {
      window.db.update('rooms', task.roomId, { status: 'Available' });
    }

    // Trigger Notification badge check
    if (window.mainApp && typeof window.mainApp.checkNotifications === 'function') {
      window.mainApp.checkNotifications();
    }
  }
};

window.housekeepingController = housekeepingController;
