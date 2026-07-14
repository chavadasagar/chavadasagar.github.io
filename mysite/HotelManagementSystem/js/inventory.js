/**
 * inventory.js - Inventory items CRUD, Stock adjustments log, Low stock notifications
 */

const inventoryController = {
  activeTab: 'stock', // 'stock', 'transactions'

  render(container) {
    container.innerHTML = `
      <div class="inventory-header animate-fade-in">
        <h2>Property Inventory Control</h2>
        <div class="view-toggles">
          <button class="btn ${this.activeTab === 'stock' ? 'btn-primary' : 'btn-outline'}" id="toggle-inv-stock">Item Stock Ledger</button>
          <button class="btn ${this.activeTab === 'transactions' ? 'btn-primary' : 'btn-outline'}" id="toggle-inv-txns">Transaction Log</button>
        </div>
      </div>

      <div id="inventory-content" class="animate-fade-in"></div>

      <!-- Add Item Modal -->
      <div id="inv-item-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="inv-modal-title">Add Inventory Item</h3>
            <button class="modal-close-btn" id="btn-close-inv-modal">&times;</button>
          </div>
          <form id="inv-item-form">
            <input type="hidden" id="inv-id-field">
            <div class="modal-body">
              <div class="form-group">
                <label for="inv-name-field">Item Name*</label>
                <input type="text" id="inv-name-field" required placeholder="e.g. White Pillow Case">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="inv-cat-field">Category*</label>
                  <select id="inv-cat-field" required>
                    <option value="Linen">Linen & Guest Bedding</option>
                    <option value="Toiletries">Bathroom Toiletries</option>
                    <option value="Minibar">Minibar Snacks & Drinks</option>
                    <option value="Cleaning supplies">Cleaning Supplies</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="inv-unit-field">Unit of Measure*</label>
                  <input type="text" id="inv-unit-field" required placeholder="e.g. Pcs, Liters, Boxes">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="inv-stock-field">Initial Stock*</label>
                  <input type="number" id="inv-stock-field" min="0" required>
                </div>
                <div class="form-group">
                  <label for="inv-reorder-field">Reorder Safety Level*</label>
                  <input type="number" id="inv-reorder-field" min="0" required placeholder="Alert threshold">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-inv-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Item</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Log Transaction Modal -->
      <div id="inv-txn-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Record Stock Transaction</h3>
            <button class="modal-close-btn" id="btn-close-txn-modal">&times;</button>
          </div>
          <form id="inv-txn-form">
            <input type="hidden" id="txn-item-id">
            <div class="modal-body">
              <div class="form-group">
                <label>Item:</label>
                <input type="text" id="txn-item-name" readonly class="form-control-plaintext" style="font-weight:bold;">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="txn-type-field">Transaction Type*</label>
                  <select id="txn-type-field" required>
                    <option value="StockIn">Stock In (Restock / Purchase)</option>
                    <option value="StockOut">Stock Out (Deployed / Consumed)</option>
                    <option value="Damaged">Damaged / Discarded</option>
                    <option value="Adjustment">Audit Adjustment</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="txn-qty-field">Quantity*</label>
                  <input type="number" id="txn-qty-field" min="1" required>
                </div>
              </div>
              <div class="form-group">
                <label for="txn-notes-field">Notes / Details</label>
                <input type="text" id="txn-notes-field" placeholder="Reason for adjustment">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-txn-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit Ledger Entry</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('toggle-inv-stock').addEventListener('click', () => {
      this.activeTab = 'stock';
      this.render(container);
    });

    document.getElementById('toggle-inv-txns').addEventListener('click', () => {
      this.activeTab = 'transactions';
      this.render(container);
    });

    if (this.activeTab === 'stock') {
      this.renderStock();
    } else {
      this.renderTransactions();
    }
  },

  renderStock() {
    const subContainer = document.getElementById('inventory-content');
    const items = window.db.getAll('inventoryItems');
    const user = window.auth.getCurrentUser();
    const canWrite = user.role === 'Admin' || user.role === 'Manager';

    subContainer.innerHTML = `
      <div class="list-actions card">
        <div class="search-box-wrapper">
          <input type="text" id="filter-inv-search" placeholder="Search inventory items...">
        </div>
        ${canWrite ? `<button class="btn btn-primary" id="btn-add-inv">+ Add Item</button>` : ''}
      </div>

      <div class="table-responsive card">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Current Stock</th>
              <th>Safety Level</th>
              <th>Alert Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="inventory-tbody"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('inventory-tbody');
    const searchInput = document.getElementById('filter-inv-search');

    const updateDisplay = () => {
      const query = searchInput.value.toLowerCase().trim();
      const filtered = items.filter(i => i.name.toLowerCase().includes(query) || i.category.toLowerCase().includes(query));

      tbody.innerHTML = filtered.map(i => {
        const isLow = i.currentStock <= i.reorderLevel;
        const statusBadge = isLow ? 
          '<span class="badge badge-danger">⚠️ RESTOCK REQUIRED</span>' : 
          '<span class="badge badge-success">✓ Stock Safe</span>';

        return `
          <tr class="${isLow ? 'row-warning' : ''}">
            <td><strong>${i.name}</strong></td>
            <td>${i.category}</td>
            <td>${i.unit}</td>
            <td style="font-weight:bold; font-size:14px;" class="${isLow ? 'text-danger' : 'text-success'}">${i.currentStock}</td>
            <td>${i.reorderLevel}</td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn btn-xs btn-primary btn-adjust-stock" data-id="${i.id}">Adjust Stock</button>
              ${canWrite ? `
                <button class="btn btn-xs btn-outline btn-edit-inv" data-id="${i.id}">Edit</button>
                <button class="btn btn-xs btn-danger btn-delete-inv" data-id="${i.id}">Delete</button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No inventory items found.</td></tr>';
      }

      // Bind actions
      tbody.querySelectorAll('.btn-adjust-stock').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.openTxnModal(e.currentTarget.getAttribute('data-id'));
        });
      });

      if (canWrite) {
        tbody.querySelectorAll('.btn-edit-inv').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.openItemModal(e.currentTarget.getAttribute('data-id'));
          });
        });

        tbody.querySelectorAll('.btn-delete-inv').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.handleDeleteItem(e.currentTarget.getAttribute('data-id'));
          });
        });
      }
    };

    searchInput.addEventListener('input', updateDisplay);
    updateDisplay();

    if (canWrite) {
      document.getElementById('btn-add-inv').addEventListener('click', () => this.openItemModal());
      document.getElementById('btn-close-inv-modal').addEventListener('click', () => this.closeItemModal());
      document.getElementById('btn-cancel-inv-modal').addEventListener('click', () => this.closeItemModal());
      document.getElementById('inv-item-form').addEventListener('submit', (e) => this.handleSaveItem(e));
    }
  },

  renderTransactions() {
    const subContainer = document.getElementById('inventory-content');
    const txns = window.db.getAll('stockTransactions');
    const items = window.db.getAll('inventoryItems');

    // Sort transactions by date descending
    const sortedTxns = [...txns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    subContainer.innerHTML = `
      <div class="table-responsive card">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item Name</th>
              <th>Action Type</th>
              <th>Quantity</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${sortedTxns.map(t => {
              const item = items.find(i => i.id === t.itemId) || { name: 'Deleted Item', unit: '' };
              
              let typeClass = 'badge-secondary';
              let prefix = '';
              if (t.transactionType === 'StockIn') { typeClass = 'badge-success'; prefix = '+'; }
              else if (t.transactionType === 'StockOut') { typeClass = 'badge-danger'; prefix = '-'; }
              else if (t.transactionType === 'Damaged') { typeClass = 'badge-warning'; prefix = '-'; }

              return `
                <tr>
                  <td>${window.utils.formatDate(t.createdAt, true)}</td>
                  <td><strong>${item.name}</strong></td>
                  <td><span class="badge ${typeClass}">${t.transactionType}</span></td>
                  <td><strong>${prefix}${t.quantity} ${item.unit}</strong></td>
                  <td>${t.note || '-'}</td>
                </tr>
              `;
            }).join('')}
            ${sortedTxns.length === 0 ? '<tr><td colspan="5" class="text-center text-muted">No stock movements recorded yet.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
  },

  openItemModal(itemId = null) {
    const form = document.getElementById('inv-item-form');
    form.reset();

    if (itemId) {
      const i = window.db.getById('inventoryItems', itemId);
      if (!i) return;

      document.getElementById('inv-modal-title').innerText = "Edit Inventory Item";
      document.getElementById('inv-id-field').value = i.id;
      document.getElementById('inv-name-field').value = i.name;
      document.getElementById('inv-cat-field').value = i.category;
      document.getElementById('inv-unit-field').value = i.unit;
      
      const stockField = document.getElementById('inv-stock-field');
      stockField.value = i.currentStock;
      stockField.disabled = true; // stock adjustments done via logs modal
      
      document.getElementById('inv-reorder-field').value = i.reorderLevel;
    } else {
      document.getElementById('inv-modal-title').innerText = "Add Inventory Item";
      document.getElementById('inv-id-field').value = '';
      
      const stockField = document.getElementById('inv-stock-field');
      stockField.disabled = false;
      stockField.value = 0;
      
      document.getElementById('inv-reorder-field').value = 10;
    }

    document.getElementById('inv-item-modal').style.display = 'flex';
  },

  closeItemModal() {
    document.getElementById('inv-item-modal').style.display = 'none';
  },

  handleSaveItem(e) {
    e.preventDefault();

    const id = document.getElementById('inv-id-field').value;
    const name = document.getElementById('inv-name-field').value.trim();
    const category = document.getElementById('inv-cat-field').value;
    const unit = document.getElementById('inv-unit-field').value.trim();
    const currentStock = parseInt(document.getElementById('inv-stock-field').value) || 0;
    const reorderLevel = parseInt(document.getElementById('inv-reorder-field').value) || 0;

    if (!name || !unit) {
      window.utils.showToast("Invalid item name or unit.", "error");
      return;
    }

    const payload = { name, category, unit, reorderLevel };

    if (id) {
      window.db.update('inventoryItems', id, payload);
      window.utils.showToast("Inventory item settings saved.");
    } else {
      payload.currentStock = currentStock;
      window.db.create('inventoryItems', payload);
      window.utils.showToast("New inventory item created.");
    }

    // Trigger Notification badge check
    if (window.mainApp && typeof window.mainApp.checkNotifications === 'function') {
      window.mainApp.checkNotifications();
    }

    this.closeItemModal();
    this.renderStock();
  },

  handleDeleteItem(itemId) {
    const item = window.db.getById('inventoryItems', itemId);
    if (!item) return;

    window.utils.confirm(
      "Confirm Item Deletion",
      `Are you sure you want to remove the inventory ledger for "${item.name}"?`,
      () => {
        window.db.delete('inventoryItems', itemId);
        
        // Clean up transactions
        const txns = window.db.query('stockTransactions', t => t.itemId === itemId);
        txns.forEach(t => window.db.delete('stockTransactions', t.id));

        window.utils.showToast("Item deleted from database.");
        this.renderStock();
      }
    );
  },

  openTxnModal(itemId) {
    const i = window.db.getById('inventoryItems', itemId);
    if (!i) return;

    document.getElementById('txn-item-id').value = i.id;
    document.getElementById('txn-item-name').value = `${i.name} (In stock: ${i.currentStock} ${i.unit})`;
    document.getElementById('txn-qty-field').value = '';
    document.getElementById('txn-notes-field').value = '';

    // Bind triggers
    const form = document.getElementById('inv-txn-form');
    form.replaceWith(form.cloneNode(true)); // reset listeners
    
    const newForm = document.getElementById('inv-txn-form');
    newForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const qty = parseInt(document.getElementById('txn-qty-field').value) || 0;
      const type = document.getElementById('txn-type-field').value;
      const notes = document.getElementById('txn-notes-field').value.trim();

      if (qty <= 0) {
        window.utils.showToast("Quantity must be greater than zero.", "error");
        return;
      }

      // Calculate new stock
      let diff = qty;
      if (type === 'StockOut' || type === 'Damaged') {
        diff = -qty;
      } else if (type === 'Adjustment') {
        window.utils.confirm(
          "Audit Adjustment",
          "For direct audit corrections, enter a positive value for Stock In addition or choose audit reason.",
          () => {}
        );
      }

      const user = window.auth.getCurrentUser() || { name: 'Guest' };
      const newStock = Math.max(0, i.currentStock + diff);

      // Log transaction
      window.db.create('stockTransactions', {
        itemId: i.id,
        transactionType: type,
        quantity: qty,
        note: notes,
        employeeId: user.id || 'usr_system'
      });

      // Update inventory stock
      window.db.update('inventoryItems', i.id, { currentStock: newStock });
      window.utils.showToast("Stock transaction logged successfully.");

      // Check notification badge
      if (window.mainApp && typeof window.mainApp.checkNotifications === 'function') {
        window.mainApp.checkNotifications();
      }

      document.getElementById('inv-txn-modal').style.display = 'none';
      this.renderStock();
    });

    document.getElementById('inv-txn-modal').style.display = 'flex';

    const cleanUp = () => {
      document.getElementById('inv-txn-modal').style.display = 'none';
    };
    document.getElementById('btn-close-txn-modal').addEventListener('click', cleanUp);
    document.getElementById('btn-cancel-txn-modal').addEventListener('click', cleanUp);
  }
};

window.inventoryController = inventoryController;
