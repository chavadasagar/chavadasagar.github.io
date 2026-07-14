/**
 * services.js - Amenities Catalog, Services Master, Kanban Board for active service orders
 */

const servicesController = {
  activeTab: 'kanban', // 'kanban', 'catalog', 'amenities'

  render(container) {
    container.innerHTML = `
      <div class="services-header animate-fade-in">
        <h2>Services & Amenities</h2>
        <div class="view-toggles">
          <button class="btn ${this.activeTab === 'kanban' ? 'btn-primary' : 'btn-outline'}" id="toggle-serv-kanban">F&B Room Service Board</button>
          <button class="btn ${this.activeTab === 'catalog' ? 'btn-primary' : 'btn-outline'}" id="toggle-serv-catalog">Service Master List</button>
        </div>
      </div>

      <div id="services-content" class="animate-fade-in"></div>

      <!-- Service Order Modal -->
      <div id="service-order-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Place Service Order</h3>
            <button class="modal-close-btn" id="btn-close-order-modal">&times;</button>
          </div>
          <form id="service-order-form">
            <input type="hidden" id="ord-booking-id">
            <input type="hidden" id="ord-room-id">
            <div class="modal-body">
              <div class="form-group">
                <label>Select Room:</label>
                <input type="text" id="ord-room-label" readonly class="form-control-plaintext" style="font-weight:bold;">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="ord-service-select">Service Item*</label>
                  <select id="ord-service-select" required></select>
                </div>
                <div class="form-group">
                  <label for="ord-qty-select">Quantity*</label>
                  <input type="number" id="ord-qty-select" min="1" max="100" value="1" required>
                </div>
              </div>
              <div class="form-group">
                <label for="ord-notes">Special Instructions</label>
                <textarea id="ord-notes" placeholder="No spicy, extra spoons etc."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-order-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit Order</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('toggle-serv-kanban').addEventListener('click', () => {
      this.activeTab = 'kanban';
      this.render(container);
    });
    
    document.getElementById('toggle-serv-catalog').addEventListener('click', () => {
      this.activeTab = 'catalog';
      this.render(container);
    });

    document.getElementById('btn-close-order-modal').addEventListener('click', () => this.closeOrderModal());
    document.getElementById('btn-cancel-order-modal').addEventListener('click', () => this.closeOrderModal());
    document.getElementById('service-order-form').addEventListener('submit', (e) => this.handleSaveOrder(e));

    if (this.activeTab === 'kanban') {
      this.renderKanban();
    } else {
      this.renderCatalog();
    }
  },

  renderKanban() {
    const subContainer = document.getElementById('services-content');
    const orders = window.db.getAll('serviceOrders');
    const services = window.db.getAll('services');
    const rooms = window.db.getAll('rooms');

    const requested = orders.filter(o => o.status === 'Requested');
    const inProgress = orders.filter(o => o.status === 'InProgress');
    const delivered = orders.filter(o => o.status === 'Delivered');

    subContainer.innerHTML = `
      <div class="kanban-board">
        <!-- Column 1 -->
        <div class="kanban-column card">
          <div class="column-header">
            <h4>Requested (${requested.length})</h4>
          </div>
          <div class="kanban-cards-wrapper" id="col-requested"></div>
        </div>

        <!-- Column 2 -->
        <div class="kanban-column card">
          <div class="column-header">
            <h4>In Progress (${inProgress.length})</h4>
          </div>
          <div class="kanban-cards-wrapper" id="col-inprogress"></div>
        </div>

        <!-- Column 3 -->
        <div class="kanban-column card">
          <div class="column-header">
            <h4>Delivered (${delivered.length})</h4>
          </div>
          <div class="kanban-cards-wrapper" id="col-delivered"></div>
        </div>
      </div>
    `;

    const renderColumnCards = (colId, list) => {
      const wrapper = document.getElementById(colId);
      
      wrapper.innerHTML = list.map(o => {
        const s = services.find(srv => srv.id === o.serviceId) || { name: 'Item', category: 'F&B' };
        const rm = rooms.find(r => r.id === o.roomId) || { roomNumber: '?' };
        
        let statusButton = '';
        if (o.status === 'Requested') {
          statusButton = `<button class="btn btn-xs btn-primary btn-move" data-id="${o.id}" data-to="InProgress">Prepare Order →</button>`;
        } else if (o.status === 'InProgress') {
          statusButton = `<button class="btn btn-xs btn-success btn-move" data-id="${o.id}" data-to="Delivered">Deliver Order ✓</button>`;
        }

        return `
          <div class="kanban-card">
            <div class="kcard-header">
              <span class="room-tag">Room #${rm.roomNumber}</span>
              <span class="category-tag">${s.category}</span>
            </div>
            <div class="kcard-body">
              <strong>${s.name} (x${o.quantity})</strong>
              ${o.notes ? `<p class="kcard-notes">📝 ${o.notes}</p>` : ''}
              <span class="time-stamp">${window.utils.formatDate(o.createdAt, true)}</span>
            </div>
            <div class="kcard-footer">
              ${statusButton}
            </div>
          </div>
        `;
      }).join('');

      if (list.length === 0) {
        wrapper.innerHTML = '<p class="text-center text-muted" style="font-size:12px; margin-top:20px;">No active tickets</p>';
      }
    };

    renderColumnCards('col-requested', requested);
    renderColumnCards('col-inprogress', inProgress);
    renderColumnCards('col-delivered', delivered);

    // Bind move buttons
    subContainer.querySelectorAll('.btn-move').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const nextStatus = e.currentTarget.getAttribute('data-to');
        this.updateOrderStatus(id, nextStatus);
      });
    });
  },

  updateOrderStatus(orderId, nextStatus) {
    window.db.update('serviceOrders', orderId, { status: nextStatus });
    window.utils.showToast(`Order status updated to ${nextStatus}.`);
    this.renderKanban();
  },

  renderCatalog() {
    const subContainer = document.getElementById('services-content');
    const services = window.db.getAll('services');
    const user = window.auth.getCurrentUser();
    const canWrite = user.role === 'Admin' || user.role === 'Manager';

    subContainer.innerHTML = `
      <div class="list-actions card">
        <div class="search-box-wrapper">
          <input type="text" id="filter-service-search" placeholder="Search catalog...">
        </div>
        ${canWrite ? `<button class="btn btn-primary" id="btn-add-service">+ Add Service Item</button>` : ''}
      </div>

      <div class="table-responsive card">
        <table class="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Item Name</th>
              <th>Pricing</th>
              ${canWrite ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody id="services-tbody"></tbody>
        </table>
      </div>

      <!-- Add/Edit Service Modal -->
      <div id="service-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="service-modal-title">Add Service Item</h3>
            <button class="modal-close-btn" id="btn-close-service-modal">&times;</button>
          </div>
          <form id="service-form">
            <input type="hidden" id="service-id-field">
            <div class="modal-body">
              <div class="form-group">
                <label for="srv-cat-field">Category*</label>
                <select id="srv-cat-field" required>
                  <option value="Room Service">Room Service (F&B)</option>
                  <option value="Laundry">Laundry</option>
                  <option value="Spa">Spa & Wellness</option>
                  <option value="Transport">Transport</option>
                  <option value="Facilities">Facilities / Utilities</option>
                </select>
              </div>
              <div class="form-group">
                <label for="srv-name-field">Item Name*</label>
                <input type="text" id="srv-name-field" required placeholder="e.g. Tomato Soup">
              </div>
              <div class="form-group">
                <label for="srv-price-field">Price (INR)*</label>
                <input type="number" id="srv-price-field" min="0" step="1" required placeholder="Price in Rs.">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-service-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Item</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const tbody = document.getElementById('services-tbody');
    const searchInput = document.getElementById('filter-service-search');

    const updateDisplay = () => {
      const query = searchInput.value.toLowerCase().trim();
      const filtered = services.filter(s => s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query));

      tbody.innerHTML = filtered.map(s => `
        <tr>
          <td><span class="badge badge-secondary">${s.category}</span></td>
          <td><strong>${s.name}</strong></td>
          <td>${window.utils.formatCurrency(s.price)}</td>
          ${canWrite ? `
            <td>
              <button class="btn btn-xs btn-outline btn-edit-service" data-id="${s.id}">Edit</button>
              <button class="btn btn-xs btn-danger btn-delete-service" data-id="${s.id}">Delete</button>
            </td>
          ` : ''}
        </tr>
      `).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No items in service catalog.</td></tr>';
      }

      if (canWrite) {
        tbody.querySelectorAll('.btn-edit-service').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.openServiceModal(e.currentTarget.getAttribute('data-id'));
          });
        });

        tbody.querySelectorAll('.btn-delete-service').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.handleDeleteService(e.currentTarget.getAttribute('data-id'));
          });
        });
      }
    };

    searchInput.addEventListener('input', updateDisplay);
    updateDisplay();

    if (canWrite) {
      document.getElementById('btn-add-service').addEventListener('click', () => this.openServiceModal());
      document.getElementById('btn-close-service-modal').addEventListener('click', () => this.closeServiceModal());
      document.getElementById('btn-cancel-service-modal').addEventListener('click', () => this.closeServiceModal());
      document.getElementById('service-form').addEventListener('submit', (e) => this.handleSaveService(e));
    }
  },

  openServiceModal(serviceId = null) {
    const form = document.getElementById('service-form');
    form.reset();

    if (serviceId) {
      const s = window.db.getById('services', serviceId);
      if (!s) return;
      document.getElementById('service-modal-title').innerText = "Edit Service Item";
      document.getElementById('service-id-field').value = s.id;
      document.getElementById('srv-cat-field').value = s.category;
      document.getElementById('srv-name-field').value = s.name;
      document.getElementById('srv-price-field').value = s.price;
    } else {
      document.getElementById('service-modal-title').innerText = "Add Service Item";
      document.getElementById('service-id-field').value = '';
    }

    document.getElementById('service-modal').style.display = 'flex';
  },

  closeServiceModal() {
    document.getElementById('service-modal').style.display = 'none';
  },

  handleSaveService(e) {
    e.preventDefault();

    const id = document.getElementById('service-id-field').value;
    const category = document.getElementById('srv-cat-field').value;
    const name = document.getElementById('srv-name-field').value.trim();
    const price = parseFloat(document.getElementById('srv-price-field').value);

    if (!name || isNaN(price)) {
      window.utils.showToast("Invalid inputs.", "error");
      return;
    }

    const payload = { category, name, price };

    if (id) {
      window.db.update('services', id, payload);
      window.utils.showToast("Service item saved.");
    } else {
      window.db.create('services', payload);
      window.utils.showToast("Service item created.");
    }

    this.closeServiceModal();
    this.renderCatalog();
  },

  handleDeleteService(serviceId) {
    window.utils.confirm(
      "Remove Catalog Item",
      "Are you sure you want to delete this service item from the master list?",
      () => {
        window.db.delete('services', serviceId);
        window.utils.showToast("Service deleted.");
        this.renderCatalog();
      }
    );
  },

  openOrderModal(bookingId, roomId) {
    const room = window.db.getById('rooms', roomId);
    if (!room) return;

    document.getElementById('ord-booking-id').value = bookingId;
    document.getElementById('ord-room-id').value = roomId;
    document.getElementById('ord-room-label').value = `Room #${room.roomNumber}`;

    // Populate service dropdown
    const select = document.getElementById('ord-service-select');
    const services = window.db.getAll('services');

    select.innerHTML = services.map(s => `<option value="${s.id}">${s.category} - ${s.name} (${window.utils.formatCurrency(s.price)})</option>`).join('');

    document.getElementById('service-order-modal').style.display = 'flex';
  },

  closeOrderModal() {
    document.getElementById('service-order-modal').style.display = 'none';
  },

  handleSaveOrder(e) {
    e.preventDefault();

    const bookingId = document.getElementById('ord-booking-id').value;
    const roomId = document.getElementById('ord-room-id').value;
    const serviceId = document.getElementById('ord-service-select').value;
    const quantity = parseInt(document.getElementById('ord-qty-select').value) || 1;
    const notes = document.getElementById('ord-notes').value.trim();

    if (!serviceId) {
      window.utils.showToast("Please choose an item.", "error");
      return;
    }

    const savedOrder = window.db.create('serviceOrders', {
      bookingId,
      roomId,
      serviceId,
      quantity,
      status: 'Requested',
      notes,
      employeeId: null
    });

    // Add service charges directly to the Invoice if it exists
    const invoice = window.db.query('invoices', inv => inv.bookingId === bookingId)[0];
    if (invoice) {
      const s = window.db.getById('services', serviceId);
      const amount = s.price * quantity;

      // Add billing line item
      window.db.create('invoiceItems', {
        invoiceId: invoice.id,
        itemType: 'ServiceCharge',
        description: `Room Service: ${s.name} (x${quantity})`,
        quantity: quantity,
        unitPrice: s.price,
        amount: amount
      });

      // Update invoice subtotal & taxable calculations
      const newSubTotal = invoice.subTotal + amount;
      const taxAmount = parseFloat(((newSubTotal - invoice.discountAmount) * 0.12).toFixed(2));
      const totalAmount = (newSubTotal - invoice.discountAmount) + taxAmount;

      window.db.update('invoices', invoice.id, {
        subTotal: newSubTotal,
        taxAmount,
        totalAmount
      });
    }

    window.utils.showToast("Service order placed successfully! 🛎️");
    this.closeOrderModal();

    // Refresh display
    if (window.bookingsController && window.bookingsController.activeView === 'details') {
      window.bookingsController.viewBookingDetails(bookingId);
    } else {
      this.activeTab = 'kanban';
      this.render(document.getElementById('app-content'));
    }
  }
};

window.servicesController = servicesController;
