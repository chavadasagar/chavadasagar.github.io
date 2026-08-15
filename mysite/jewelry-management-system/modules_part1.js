/**
 * APPLICATION MODULES - PART 1
 * Contains: Login, Dashboard, Masters, Suppliers & Karigars, Inventory/Products
 */

// 1. LOGIN MODULE
const LoginModule = {
  render() {
    const layout = document.getElementById('login-layout');
    layout.innerHTML = `
      <div class="login-card">
        <div class="login-logo">
          <i class="fa-solid fa-gem"></i>
          <span>AURA JEWELLERS</span>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" id="login-username" class="form-control" required placeholder="Enter username" autocomplete="username"/>
          </div>
          <div class="form-group" style="position:relative;">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-control" required placeholder="Enter password" autocomplete="current-password"/>
            <i class="fa fa-eye" id="toggle-pwd-eye" style="position:absolute; right:12px; top:36px; cursor:pointer; color:var(--text-muted);"></i>
          </div>
          <button type="submit" class="btn btn-accent" style="width:100%; margin-top:10px; padding:12px;">Login</button>
        </form>
      </div>
    `;

    // Eye toggle password visibility
    const eye = document.getElementById('toggle-pwd-eye');
    const pwd = document.getElementById('login-password');
    eye.onclick = () => {
      if (pwd.type === 'password') {
        pwd.type = 'text';
        eye.className = 'fa fa-eye-slash';
      } else {
        pwd.type = 'password';
        eye.className = 'fa fa-eye';
      }
    };

    // Form submit
    document.getElementById('login-form').onsubmit = (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;
      
      const res = Auth.login(u, p);
      if (res.success) {
        UI.toast("Login successful!", "success");
        Router.navigate('dashboard');
      } else {
        UI.toast(res.message, "error");
      }
    };
  }
};

// 2. DASHBOARD MODULE
const DashboardModule = {
  render(container) {
    const products = DB.get('jw_products');
    const invoices = DB.get('jw_invoices');
    const customers = DB.get('jw_customers');
    const repairs = DB.get('jw_repairs');
    const enrollments = DB.get('jw_enrollments');

    // 1. Calculate dashboard metrics
    const instockCount = products.filter(p => p.status === 'InStock').length;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = invoices
      .filter(inv => inv.invoiceDate === todayStr)
      .reduce((sum, inv) => sum + (inv.netAmount || 0), 0);
      
    const customersCount = customers.length;
    const pendingRepairs = repairs.filter(rep => rep.status !== 'Delivered').length;
    
    // Low stock count (items in stock < 5 per category)
    const categories = DB.get('jw_categories');
    let lowStockCount = 0;
    categories.forEach(cat => {
      const catCount = products.filter(p => p.categoryId === cat.id && p.status === 'InStock').length;
      if (catCount < 5) lowStockCount++;
    });

    const activeSchemes = enrollments.filter(e => e.status === 'Active').length;

    // 2. Draw layout
    container.innerHTML = `
      <!-- Breadcrumb row -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-weight:600; font-size:1.4rem;">Dashboard Overview</h2>
        <div class="quick-actions-bar">
          <button class="btn btn-accent btn-sm" onclick="Router.navigate('sales', 'new-invoice')"><i class="fa fa-plus"></i> New Sale</button>
          <button class="btn btn-primary btn-sm" onclick="Router.navigate('inventory', 'products', {addNew: true})"><i class="fa fa-plus"></i> Add Product</button>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('customers', null, {addNew: true})"><i class="fa fa-plus"></i> New Customer</button>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('repairs', null, {addNew: true})"><i class="fa fa-wrench"></i> New Repair</button>
        </div>
      </div>

      <!-- Cards Grid -->
      <div class="dashboard-grid">
        <div class="summary-card">
          <div class="summary-card-info">
            <span class="summary-card-value">${instockCount}</span>
            <span class="summary-card-label">Total Products</span>
          </div>
          <div class="summary-card-icon" style="background:#e0f2fe; color:#0284c7;"><i class="fa-solid fa-ring"></i></div>
        </div>
        <div class="summary-card">
          <div class="summary-card-info">
            <span class="summary-card-value">₹${todaySales.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
            <span class="summary-card-label">Today's Sales</span>
          </div>
          <div class="summary-card-icon" style="background:#dcfce7; color:#15803d;"><i class="fa-solid fa-indian-rupee-sign"></i></div>
        </div>
        <div class="summary-card">
          <div class="summary-card-info">
            <span class="summary-card-value">${customersCount}</span>
            <span class="summary-card-label">Total Customers</span>
          </div>
          <div class="summary-card-icon" style="background:#fef3c7; color:#b45309;"><i class="fa-solid fa-users"></i></div>
        </div>
        <div class="summary-card">
          <div class="summary-card-info">
            <span class="summary-card-value">${pendingRepairs}</span>
            <span class="summary-card-label">Pending Repairs</span>
          </div>
          <div class="summary-card-icon" style="background:#f3e8ff; color:#7e22ce;"><i class="fa-solid fa-screwdriver-wrench"></i></div>
        </div>
        <div class="summary-card">
          <div class="summary-card-info">
            <span class="summary-card-value">${lowStockCount}</span>
            <span class="summary-card-label">Low Stock Categories</span>
          </div>
          <div class="summary-card-icon" style="background:#fee2e2; color:#b91c1c;"><i class="fa-solid fa-triangle-exclamation"></i></div>
        </div>
        <div class="summary-card">
          <div class="summary-card-info">
            <span class="summary-card-value">${activeSchemes}</span>
            <span class="summary-card-label">Active Savings Schemes</span>
          </div>
          <div class="summary-card-icon" style="background:#ccfbf1; color:#0f766e;"><i class="fa-solid fa-piggy-bank"></i></div>
        </div>
      </div>

      <!-- Charts & Widgets -->
      <div class="dashboard-bottom-grid">
        <div>
          <!-- Sales chart -->
          <div class="widget-card">
            <div class="widget-title">Sales Trend (Last 7 Days)</div>
            <div id="dashboard-sales-chart"></div>
          </div>
          
          <!-- Recent Transactions -->
          <div class="widget-card">
            <div class="widget-title">Recent Invoices (Last 5)</div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Net Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="recent-invoices-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <!-- Today's rates widget -->
          <div class="widget-card">
            <div class="widget-title">Today's Metal Rates</div>
            <div id="today-rates-widget-list" style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;"></div>
            <button class="btn btn-secondary btn-sm" style="width:100%;" onclick="Router.navigate('masters', 'rates')"><i class="fa fa-chart-line"></i> View Rates History</button>
          </div>

          <!-- Top category stock -->
          <div class="widget-card">
            <div class="widget-title">Category Stock Shares</div>
            <div id="dashboard-category-chart"></div>
          </div>
        </div>
      </div>
    `;

    // 3. Render recent transactions table
    const recentInvoices = [...invoices].sort((a,b) => b.id - a.id).slice(0, 5);
    const tbody = document.getElementById('recent-invoices-tbody');
    if (recentInvoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No sales completed yet.</td></tr>`;
    } else {
      recentInvoices.forEach(inv => {
        const custName = DB.getById('jw_customers', inv.customerId)?.name || 'Walk-in';
        tbody.innerHTML += `
          <tr>
            <td><a href="#sales/invoice-list?view=${inv.id}" style="color:var(--accent); font-weight:600;">${inv.invoiceNo}</a></td>
            <td>${custName}</td>
            <td>${inv.invoiceDate}</td>
            <td>₹${inv.netAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td><span class="badge badge-success">${inv.paymentStatus || 'Paid'}</span></td>
          </tr>
        `;
      });
    }

    // 4. Render today's rates widget list
    const widgetRates = document.getElementById('today-rates-widget-list');
    const metalsList = DB.get('jw_metals');
    const puritiesList = DB.get('jw_purities');
    const rateMaster = DB.get('jw_rate_master');
    
    // Filter out purities and get latest rate
    let ratesHtml = '';
    puritiesList.forEach(pur => {
      const metal = metalsList.find(m => m.id === pur.metalId);
      if (!metal) return;

      // Find latest rate for this purity
      const purityRates = rateMaster.filter(r => r.purityId === pur.id);
      let latestRate = null;
      if (purityRates.length > 0) {
        purityRates.sort((a,b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
        latestRate = purityRates[0];
      }

      ratesHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:#fafafa;">
          <div>
            <span style="font-weight:600; font-size:0.85rem;">${metal.name} ${pur.name}</span>
          </div>
          <div style="text-align:right;">
            <strong style="color:var(--accent); font-size:0.95rem;">₹${latestRate ? latestRate.ratePerGram.toFixed(2) : '0.00'}</strong>
            <div style="font-size:0.65rem; color:var(--text-muted);">${latestRate ? latestRate.effectiveDate : 'No rate set'}</div>
          </div>
        </div>
      `;
    });
    widgetRates.innerHTML = ratesHtml;

    // 5. Draw Charts
    UI.renderSalesChart('dashboard-sales-chart', invoices);
    UI.renderCategoryChart('dashboard-category-chart', products);
  }
};

// 3. MASTERS MODULE
const MastersModule = {
  render(container, subModule, params) {
    // Sidebar active sub-menu check
    if (!subModule) {
      Router.navigate('masters', 'metals');
      return;
    }

    container.innerHTML = `
      <div style="display:flex; gap:20px; align-items:flex-start;">
        <!-- Masters navigation menu inside page -->
        <div style="width:200px; flex-shrink:0; background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:10px; display:flex; flex-direction:column; gap:4px;">
          <a class="btn btn-secondary btn-sm ${subModule === 'metals' ? 'btn-accent' : ''}" style="justify-content:flex-start;" href="#masters/metals"><i class="fa fa-gem"></i> Metal Master</a>
          <a class="btn btn-secondary btn-sm ${subModule === 'purities' ? 'btn-accent' : ''}" style="justify-content:flex-start;" href="#masters/purities"><i class="fa fa-certificate"></i> Purity Master</a>
          <a class="btn btn-secondary btn-sm ${subModule === 'categories' ? 'btn-accent' : ''}" style="justify-content:flex-start;" href="#masters/categories"><i class="fa fa-folder"></i> Category Master</a>
          <a class="btn btn-secondary btn-sm ${subModule === 'stone-types' ? 'btn-accent' : ''}" style="justify-content:flex-start;" href="#masters/stone-types"><i class="fa-solid fa-gem"></i> Stone Type Master</a>
          <a class="btn btn-secondary btn-sm ${subModule === 'rates' ? 'btn-accent' : ''}" style="justify-content:flex-start;" href="#masters/rates"><i class="fa fa-line-chart"></i> Rate Master</a>
          <a class="btn btn-secondary btn-sm ${subModule === 'huid' ? 'btn-accent' : ''}" style="justify-content:flex-start;" href="#masters/huid"><i class="fa fa-barcode"></i> HUID Master</a>
          <a class="btn btn-secondary btn-sm ${subModule === 'gst' ? 'btn-accent' : ''}" style="justify-content:flex-start;" href="#masters/gst"><i class="fa-solid fa-receipt"></i> GST Rates</a>
          <a class="btn btn-secondary btn-sm ${subModule === 'branches' ? 'btn-accent' : ''}" style="justify-content:flex-start;" href="#masters/branches"><i class="fa fa-shop"></i> Branch Master</a>
        </div>
        
        <!-- Masters dynamic panel -->
        <div style="flex-grow:1; background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <div id="masters-panel-content"></div>
        </div>
      </div>
    `;

    const panel = document.getElementById('masters-panel-content');
    
    switch (subModule) {
      case 'metals': this.renderMetals(panel); break;
      case 'purities': this.renderPurities(panel); break;
      case 'categories': this.renderCategories(panel); break;
      case 'stone-types': this.renderStones(panel); break;
      case 'rates': this.renderRates(panel); break;
      case 'huid': this.renderHUID(panel); break;
      case 'gst': this.renderGST(panel); break;
      case 'branches': this.renderBranches(panel); break;
    }
  },

  renderMetals(panel) {
    const list = DB.get('jw_metals');
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h4 style="font-weight:600;">Metals</h4>
        <button class="btn btn-accent btn-sm" id="btn-add-metal"><i class="fa fa-plus"></i> Add Metal</button>
      </div>
      <div id="metals-table-container"></div>
    `;

    UI.renderTable({
      containerId: 'metals-table-container',
      columns: [
        { label: 'ID', key: 'id' },
        { label: 'Metal Name', key: 'name' },
        { label: 'HSN Code', key: 'hsnCode' }
      ],
      data: list,
      actions: (row) => `
        <button class="btn btn-secondary btn-sm btn-icon" onclick="MastersModule.editMetal(${row.id})"><i class="fa fa-pencil"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="MastersModule.deleteMetal(${row.id})"><i class="fa fa-trash"></i></button>
      `
    });

    document.getElementById('btn-add-metal').onclick = () => this.showMetalModal();
  },

  showMetalModal(id = null) {
    const isEdit = id !== null;
    const item = isEdit ? DB.getById('jw_metals', id) : null;
    
    const html = `
      <form id="metal-form">
        <div class="form-group">
          <label class="form-label">Metal Name <span class="required">*</span></label>
          <input type="text" id="metal-name" class="form-control" required value="${isEdit ? item.name : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">HSN Code <span class="required">*</span></label>
          <input type="text" id="metal-hsn" class="form-control" required value="${isEdit ? item.hsnCode : ''}" />
        </div>
      </form>
    `;

    UI.modal(isEdit ? "Edit Metal" : "Add Metal", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save", className: "btn btn-accent", action: () => {
        const name = document.getElementById('metal-name').value;
        const hsn = document.getElementById('metal-hsn').value;
        
        if (!name || !hsn) {
          UI.toast("Please fill in all fields", "warning");
          return;
        }

        if (isEdit) {
          DB.update('jw_metals', id, { name, hsnCode: hsn });
          UI.toast("Metal updated successfully");
        } else {
          DB.insert('jw_metals', { name, hsnCode: hsn });
          UI.toast("Metal created successfully");
        }
        
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  },

  editMetal(id) { this.showMetalModal(id); },
  
  deleteMetal(id) {
    // Delete check
    const products = DB.get('jw_products');
    if (products.some(p => p.metalId === id)) {
      UI.toast("Cannot delete metal. Products are mapped to it.", "error");
      return;
    }

    UI.confirm("Are you sure you want to delete this metal?", () => {
      DB.delete('jw_metals', id);
      UI.toast("Metal deleted");
      Router.handleRouting();
    });
  },

  renderPurities(panel) {
    const list = DB.get('jw_purities');
    const metals = DB.get('jw_metals');

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h4 style="font-weight:600;">Purities</h4>
        <button class="btn btn-accent btn-sm" id="btn-add-purity"><i class="fa fa-plus"></i> Add Purity</button>
      </div>
      <div id="purities-table-container"></div>
    `;

    UI.renderTable({
      containerId: 'purities-table-container',
      columns: [
        { label: 'Metal', render: (row) => metals.find(m => m.id === row.metalId)?.name || 'Unknown' },
        { label: 'Purity Name', key: 'name' },
        { label: 'Percentage (%)', render: (row) => `${row.percent.toFixed(1)}%` },
        { label: 'Status', render: (row) => `<span class="badge ${row.isActive ? 'badge-success' : 'badge-danger'}">${row.isActive ? 'Active' : 'Inactive'}</span>` }
      ],
      data: list,
      actions: (row) => `
        <button class="btn btn-secondary btn-sm btn-icon" onclick="MastersModule.editPurity(${row.id})"><i class="fa fa-pencil"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="MastersModule.deletePurity(${row.id})"><i class="fa fa-trash"></i></button>
      `
    });

    document.getElementById('btn-add-purity').onclick = () => this.showPurityModal();
  },

  showPurityModal(id = null) {
    const isEdit = id !== null;
    const item = isEdit ? DB.getById('jw_purities', id) : null;
    const metals = DB.get('jw_metals');

    const html = `
      <form id="purity-form">
        <div class="form-group">
          <label class="form-label">Metal <span class="required">*</span></label>
          <select id="purity-metal" class="form-control" required>
            <option value="">Select Metal</option>
            ${metals.map(m => `<option value="${m.id}" ${isEdit && item.metalId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Purity Name <span class="required">*</span></label>
          <input type="text" id="purity-name" class="form-control" placeholder="e.g. 22K (91.6%)" required value="${isEdit ? item.name : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Percentage (%) <span class="required">*</span></label>
          <input type="number" step="0.01" max="100" min="0" id="purity-percent" class="form-control" required value="${isEdit ? item.percent : ''}" />
        </div>
        <div class="form-group">
          <label class="toggle-switch">
            <input type="checkbox" id="purity-status" class="toggle-input" ${!isEdit || item.isActive ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span>Is Active</span>
          </label>
        </div>
      </form>
    `;

    UI.modal(isEdit ? "Edit Purity" : "Add Purity", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save", className: "btn btn-accent", action: () => {
        const metalId = Number(document.getElementById('purity-metal').value);
        const name = document.getElementById('purity-name').value;
        const percent = parseFloat(document.getElementById('purity-percent').value);
        const isActive = document.getElementById('purity-status').checked;

        if (!metalId || !name || isNaN(percent)) {
          UI.toast("Please fill in required fields", "warning");
          return;
        }

        const payload = { metalId, name, percent, isActive };
        if (isEdit) {
          DB.update('jw_purities', id, payload);
          UI.toast("Purity updated");
        } else {
          DB.insert('jw_purities', payload);
          UI.toast("Purity created");
        }
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  },

  editPurity(id) { this.showPurityModal(id); },
  
  deletePurity(id) {
    const products = DB.get('jw_products');
    if (products.some(p => p.purityId === id)) {
      UI.toast("Cannot delete purity. Products are mapped to it.", "error");
      return;
    }
    UI.confirm("Are you sure you want to delete this purity?", () => {
      DB.delete('jw_purities', id);
      UI.toast("Purity deleted");
      Router.handleRouting();
    });
  },

  renderCategories(panel) {
    const list = DB.get('jw_categories');
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h4 style="font-weight:600;">Categories</h4>
        <button class="btn btn-accent btn-sm" id="btn-add-category"><i class="fa fa-plus"></i> Add Category</button>
      </div>
      <div id="categories-table-container"></div>
    `;

    UI.renderTable({
      containerId: 'categories-table-container',
      columns: [
        { label: 'Category Name', key: 'name' },
        { label: 'Parent Category', render: (row) => list.find(c => c.id === row.parentId)?.name || '-' }
      ],
      data: list,
      actions: (row) => `
        <button class="btn btn-secondary btn-sm btn-icon" onclick="MastersModule.editCategory(${row.id})"><i class="fa fa-pencil"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="MastersModule.deleteCategory(${row.id})"><i class="fa fa-trash"></i></button>
      `
    });

    document.getElementById('btn-add-category').onclick = () => this.showCategoryModal();
  },

  showCategoryModal(id = null) {
    const isEdit = id !== null;
    const item = isEdit ? DB.getById('jw_categories', id) : null;
    const categories = DB.get('jw_categories').filter(c => !isEdit || c.id !== id); // Exclude self if edit

    const html = `
      <form id="category-form">
        <div class="form-group">
          <label class="form-label">Category Name <span class="required">*</span></label>
          <input type="text" id="category-name" class="form-control" required value="${isEdit ? item.name : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Parent Category (Optional)</label>
          <select id="category-parent" class="form-control">
            <option value="">None</option>
            ${categories.map(c => `<option value="${c.id}" ${isEdit && item.parentId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </form>
    `;

    UI.modal(isEdit ? "Edit Category" : "Add Category", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save", className: "btn btn-accent", action: () => {
        const name = document.getElementById('category-name').value;
        const parentVal = document.getElementById('category-parent').value;
        const parentId = parentVal ? Number(parentVal) : null;

        if (!name) {
          UI.toast("Please fill in Category Name", "warning");
          return;
        }

        const payload = { name, parentId };
        if (isEdit) {
          DB.update('jw_categories', id, payload);
          UI.toast("Category updated");
        } else {
          DB.insert('jw_categories', payload);
          UI.toast("Category created");
        }
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  },

  editCategory(id) { this.showCategoryModal(id); },
  
  deleteCategory(id) {
    const products = DB.get('jw_products');
    if (products.some(p => p.categoryId === id)) {
      UI.toast("Cannot delete category. Products are mapped to it.", "error");
      return;
    }
    UI.confirm("Are you sure you want to delete this category?", () => {
      DB.delete('jw_categories', id);
      UI.toast("Category deleted");
      Router.handleRouting();
    });
  },

  renderStones(panel) {
    const list = DB.get('jw_stone_types');
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h4 style="font-weight:600;">Stone Types</h4>
        <button class="btn btn-accent btn-sm" id="btn-add-stone"><i class="fa fa-plus"></i> Add Stone Type</button>
      </div>
      <div id="stones-table-container"></div>
    `;

    UI.renderTable({
      containerId: 'stones-table-container',
      columns: [
        { label: 'ID', key: 'id' },
        { label: 'Stone Name', key: 'name' },
        { label: 'Unit Of Measure', key: 'uom' }
      ],
      data: list,
      actions: (row) => `
        <button class="btn btn-secondary btn-sm btn-icon" onclick="MastersModule.editStone(${row.id})"><i class="fa fa-pencil"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="MastersModule.deleteStone(${row.id})"><i class="fa fa-trash"></i></button>
      `
    });

    document.getElementById('btn-add-stone').onclick = () => this.showStoneModal();
  },

  showStoneModal(id = null) {
    const isEdit = id !== null;
    const item = isEdit ? DB.getById('jw_stone_types', id) : null;

    const html = `
      <form id="stone-form">
        <div class="form-group">
          <label class="form-label">Stone Name <span class="required">*</span></label>
          <input type="text" id="stone-name" class="form-control" required value="${isEdit ? item.name : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Unit of Measure (UOM) <span class="required">*</span></label>
          <select id="stone-uom" class="form-control" required>
            <option value="Carat" ${isEdit && item.uom === 'Carat' ? 'selected' : ''}>Carat</option>
            <option value="Piece" ${isEdit && item.uom === 'Piece' ? 'selected' : ''}>Piece</option>
          </select>
        </div>
      </form>
    `;

    UI.modal(isEdit ? "Edit Stone Type" : "Add Stone Type", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save", className: "btn btn-accent", action: () => {
        const name = document.getElementById('stone-name').value;
        const uom = document.getElementById('stone-uom').value;

        if (!name || !uom) {
          UI.toast("Please fill in all fields", "warning");
          return;
        }

        const payload = { name, uom };
        if (isEdit) {
          DB.update('jw_stone_types', id, payload);
          UI.toast("Stone Type updated");
        } else {
          DB.insert('jw_stone_types', payload);
          UI.toast("Stone Type created");
        }
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  },

  editStone(id) { this.showStoneModal(id); },
  
  deleteStone(id) {
    const stonesMapped = DB.get('jw_product_stones');
    if (stonesMapped.some(s => s.stoneTypeId === id)) {
      UI.toast("Cannot delete. Products are mapped with this stone.", "error");
      return;
    }
    UI.confirm("Are you sure you want to delete this stone type?", () => {
      DB.delete('jw_stone_types', id);
      UI.toast("Stone type deleted");
      Router.handleRouting();
    });
  },

  renderRates(panel) {
    const rateMaster = DB.get('jw_rate_master');
    const metals = DB.get('jw_metals');
    const purities = DB.get('jw_purities');

    panel.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:flex-start; margin-bottom:24px;">
        <!-- Left: Form to Add rate -->
        <div style="background:#fbfbfb; border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px;">
          <h5 style="font-weight:600; margin-bottom:12px;">Add Daily Rate</h5>
          <form id="rate-form">
            <div class="form-group">
              <label class="form-label">Metal <span class="required">*</span></label>
              <select id="rate-metal" class="form-control" required>
                <option value="">Select Metal</option>
                ${metals.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Purity <span class="required">*</span></label>
              <select id="rate-purity" class="form-control" required disabled>
                <option value="">Select Purity</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Rate Per Gram (₹) <span class="required">*</span></label>
              <input type="number" step="0.01" min="0" id="rate-value" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Effective Date <span class="required">*</span></label>
              <input type="date" id="rate-date" class="form-control" required value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Save Daily Rate</button>
          </form>
        </div>

        <!-- Right: Trend Mini Chart for Gold 22K (Purity 2) -->
        <div style="background:#fdfdfd; border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px;">
          <h5 style="font-weight:600; margin-bottom:12px;">Gold 22K - 7 Day Trend</h5>
          <div id="gold22k-trend-chart" style="height:120px;"></div>
        </div>
      </div>

      <!-- History Table -->
      <h5 style="font-weight:600; margin-bottom:12px;">Rate Log History</h5>
      <div id="rates-history-table-container"></div>
    `;

    // Filter purity based on metal selection
    const metalSelect = document.getElementById('rate-metal');
    const puritySelect = document.getElementById('rate-purity');
    metalSelect.onchange = () => {
      const metalId = Number(metalSelect.value);
      if (!metalId) {
        puritySelect.disabled = true;
        puritySelect.innerHTML = `<option value="">Select Purity</option>`;
        return;
      }
      const filtered = purities.filter(p => p.metalId === metalId && p.isActive);
      puritySelect.innerHTML = `<option value="">Select Purity</option>` + filtered.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      puritySelect.disabled = false;
    };

    // Submit form
    document.getElementById('rate-form').onsubmit = (e) => {
      e.preventDefault();
      const metalId = Number(metalSelect.value);
      const purityId = Number(puritySelect.value);
      const ratePerGram = parseFloat(document.getElementById('rate-value').value);
      const effectiveDate = document.getElementById('rate-date').value;

      if (!metalId || !purityId || isNaN(ratePerGram) || !effectiveDate) {
        UI.toast("Please fill in all inputs", "warning");
        return;
      }

      // Check if duplicate date + purity exists
      const existing = rateMaster.find(r => r.purityId === purityId && r.effectiveDate === effectiveDate);
      if (existing) {
        UI.toast("Rate already registered for this date & purity. Use settings to override.", "warning");
        return;
      }

      DB.insert('jw_rate_master', { metalId, purityId, ratePerGram, effectiveDate });
      UI.toast("Rate set successfully");
      Router.handleRouting();
    };

    // Render Rate Trend Mini chart
    // Get rates for Gold 22K (Purity ID 2) sorted by date ascending
    const trendRates = rateMaster
      .filter(r => r.purityId === 2)
      .sort((a,b) => new Date(a.effectiveDate) - new Date(b.effectiveDate))
      .slice(-7);
    UI.renderRateChart('gold22k-trend-chart', trendRates);

    // Draw rate history list (sorted by date desc)
    const sortedHistory = [...rateMaster].sort((a,b) => new Date(b.effectiveDate) - new Date(a.effectiveDate) || b.id - a.id);
    UI.renderTable({
      containerId: 'rates-history-table-container',
      columns: [
        { label: 'Date', key: 'effectiveDate' },
        { label: 'Metal', render: (row) => metals.find(m => m.id === row.metalId)?.name || 'Unknown' },
        { label: 'Purity', render: (row) => purities.find(p => p.id === row.purityId)?.name || 'Unknown' },
        { label: 'Rate (₹ / gram)', render: (row) => `₹${row.ratePerGram.toFixed(2)}` }
      ],
      data: sortedHistory
    });
  },

  renderHUID(panel) {
    const list = DB.get('jw_hallmarks');
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h4 style="font-weight:600;">HUID / Hallmark Master</h4>
        <button class="btn btn-accent btn-sm" id="btn-add-huid"><i class="fa fa-plus"></i> Add Hallmark Cert</button>
      </div>
      <div id="huid-table-container"></div>
    `;

    UI.renderTable({
      containerId: 'huid-table-container',
      columns: [
        { label: 'HUID Code', render: (row) => `
          <div style="display:flex; flex-direction:column; align-items:flex-start;">
            <span style="font-weight:700; color:var(--primary); font-family:monospace; letter-spacing:1px;">${row.huidCode}</span>
            <div style="background:repeating-linear-gradient(90deg, #000, #000 1px, #fff 1px, #fff 3px); width:60px; height:12px; margin-top:2px;"></div>
          </div>
        `},
        { label: 'Hallmark Center', key: 'hallmarkCenter' },
        { label: 'Date Cert', key: 'hallmarkDate' },
        { label: 'Cert Certificate No', key: 'certificateNo' }
      ],
      data: list,
      actions: (row) => `
        <button class="btn btn-danger btn-sm btn-icon" onclick="MastersModule.deleteHuid(${row.id})"><i class="fa fa-trash"></i></button>
      `
    });

    document.getElementById('btn-add-huid').onclick = () => this.showHUIDModal();
  },

  showHUIDModal() {
    const html = `
      <form id="huid-form">
        <div class="form-group">
          <label class="form-label">HUID Code (6 Alphanumeric characters) <span class="required">*</span></label>
          <input type="text" id="huid-code" class="form-control" maxlength="6" style="text-transform:uppercase;" placeholder="e.g. ABC123" required />
        </div>
        <div class="form-group">
          <label class="form-label">Hallmark Center <span class="required">*</span></label>
          <input type="text" id="huid-center" class="form-control" required />
        </div>
        <div class="form-group">
          <label class="form-label">Hallmark Date <span class="required">*</span></label>
          <input type="date" id="huid-date" class="form-control" required value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label class="form-label">Certificate No <span class="required">*</span></label>
          <input type="text" id="huid-cert" class="form-control" required />
        </div>
      </form>
    `;

    UI.modal("Add Hallmark HUID Certificate", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save Cert", className: "btn btn-accent", action: () => {
        const code = document.getElementById('huid-code').value.trim().toUpperCase();
        const center = document.getElementById('huid-center').value.trim();
        const date = document.getElementById('huid-date').value;
        const cert = document.getElementById('huid-cert').value.trim();

        // 6 char HUID validation regex
        if (!/^[A-Z0-9]{6}$/.test(code)) {
          UI.toast("HUID Code must be exactly 6 alphanumeric characters.", "warning");
          return;
        }

        if (!center || !cert || !date) {
          UI.toast("Please fill in all fields", "warning");
          return;
        }

        // Duplicate HUID code check
        const hallmarks = DB.get('jw_hallmarks');
        if (hallmarks.some(h => h.huidCode === code)) {
          UI.toast("HUID Code already exists in database.", "warning");
          return;
        }

        DB.insert('jw_hallmarks', { huidCode: code, hallmarkCenter: center, hallmarkDate: date, certificateNo: cert });
        UI.toast("Hallmark certificate saved");
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  },

  deleteHuid(id) {
    const item = DB.getById('jw_hallmarks', id);
    const products = DB.get('jw_products');
    if (item && products.some(p => p.huidCode === item.huidCode)) {
      UI.toast("HUID is active on product inventory.", "error");
      return;
    }
    UI.confirm("Delete this hallmark certificate?", () => {
      DB.delete('jw_hallmarks', id);
      UI.toast("Hallmark certificate deleted");
      Router.handleRouting();
    });
  },

  renderGST(panel) {
    const list = DB.get('jw_gst_rates');
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h4 style="font-weight:600;">GST Rates Master</h4>
        <button class="btn btn-accent btn-sm" id="btn-add-gst"><i class="fa fa-plus"></i> Add GST Rate</button>
      </div>
      <div id="gst-table-container"></div>
    `;

    UI.renderTable({
      containerId: 'gst-table-container',
      columns: [
        { label: 'HSN Code', key: 'hsnCode' },
        { label: 'CGST (%)', render: (row) => `${row.cgstPercent}%` },
        { label: 'SGST (%)', render: (row) => `${row.sgstPercent}%` },
        { label: 'IGST (%)', render: (row) => `${row.igstPercent}%` },
        { label: 'Effective Date', key: 'effectiveDate' }
      ],
      data: list,
      actions: (row) => `
        <button class="btn btn-danger btn-sm btn-icon" onclick="MastersModule.deleteGst(${row.id})"><i class="fa fa-trash"></i></button>
      `
    });

    document.getElementById('btn-add-gst').onclick = () => this.showGSTModal();
  },

  showGSTModal() {
    const html = `
      <form id="gst-form">
        <div class="form-group">
          <label class="form-label">HSN Code <span class="required">*</span></label>
          <input type="text" id="gst-hsn" class="form-control" placeholder="e.g. 7113" required />
        </div>
        <div class="form-group">
          <label class="form-label">CGST (%) <span class="required">*</span></label>
          <input type="number" step="0.01" min="0" max="100" id="gst-cgst" class="form-control" required />
        </div>
        <div class="form-group">
          <label class="form-label">SGST (%) <span class="required">*</span></label>
          <input type="number" step="0.01" min="0" max="100" id="gst-sgst" class="form-control" required />
        </div>
        <div class="form-group">
          <label class="form-label">IGST (%) <span class="required">*</span></label>
          <input type="number" step="0.01" min="0" max="100" id="gst-igst" class="form-control" required />
        </div>
        <div class="form-group">
          <label class="form-label">Effective Date <span class="required">*</span></label>
          <input type="date" id="gst-date" class="form-control" required value="${new Date().toISOString().split('T')[0]}" />
        </div>
      </form>
    `;

    UI.modal("Add GST Rates", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save Rates", className: "btn btn-accent", action: () => {
        const hsnCode = document.getElementById('gst-hsn').value;
        const cgstPercent = parseFloat(document.getElementById('gst-cgst').value);
        const sgstPercent = parseFloat(document.getElementById('gst-sgst').value);
        const igstPercent = parseFloat(document.getElementById('gst-igst').value);
        const effectiveDate = document.getElementById('gst-date').value;

        if (!hsnCode || isNaN(cgstPercent) || isNaN(sgstPercent) || isNaN(igstPercent) || !effectiveDate) {
          UI.toast("Please fill in all inputs", "warning");
          return;
        }

        DB.insert('jw_gst_rates', { hsnCode, cgstPercent, sgstPercent, igstPercent, effectiveDate });
        UI.toast("GST configuration created");
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  },

  deleteGst(id) {
    UI.confirm("Are you sure you want to delete this GST rate configuration?", () => {
      DB.delete('jw_gst_rates', id);
      UI.toast("GST configuration deleted");
      Router.handleRouting();
    });
  },

  renderBranches(panel) {
    const list = DB.get('jw_branches');
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h4 style="font-weight:600;">Branch Master</h4>
        <button class="btn btn-accent btn-sm" id="btn-add-branch"><i class="fa fa-plus"></i> Add Branch</button>
      </div>
      <div id="branches-table-container"></div>
    `;

    UI.renderTable({
      containerId: 'branches-table-container',
      columns: [
        { label: 'Branch Name', key: 'name' },
        { label: 'Address', key: 'address' },
        { label: 'GSTIN', key: 'gstin' },
        { label: 'Phone', key: 'phone' },
        { label: 'Default', render: (row) => row.isDefault ? `<span class="badge badge-success">Default</span>` : `-` }
      ],
      data: list,
      actions: (row) => `
        <button class="btn btn-secondary btn-sm btn-icon" onclick="MastersModule.editBranch(${row.id})"><i class="fa fa-pencil"></i></button>
        ${!row.isDefault ? `<button class="btn btn-danger btn-sm btn-icon" onclick="MastersModule.deleteBranch(${row.id})"><i class="fa fa-trash"></i></button>` : ''}
      `
    });

    document.getElementById('btn-add-branch').onclick = () => this.showBranchModal();
  },

  showBranchModal(id = null) {
    const isEdit = id !== null;
    const item = isEdit ? DB.getById('jw_branches', id) : null;

    const html = `
      <form id="branch-form">
        <div class="form-group">
          <label class="form-label">Branch Name <span class="required">*</span></label>
          <input type="text" id="branch-name" class="form-control" required value="${isEdit ? item.name : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Address <span class="required">*</span></label>
          <input type="text" id="branch-address" class="form-control" required value="${isEdit ? item.address : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">GSTIN <span class="required">*</span></label>
          <input type="text" id="branch-gstin" class="form-control" required value="${isEdit ? item.gstin : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Phone <span class="required">*</span></label>
          <input type="text" id="branch-phone" class="form-control" required value="${isEdit ? item.phone : ''}" />
        </div>
        <div class="form-group">
          <label class="toggle-switch">
            <input type="checkbox" id="branch-default" class="toggle-input" ${isEdit && item.isDefault ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span>Mark as default branch</span>
          </label>
        </div>
      </form>
    `;

    UI.modal(isEdit ? "Edit Branch" : "Add Branch", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save", className: "btn btn-accent", action: () => {
        const name = document.getElementById('branch-name').value;
        const address = document.getElementById('branch-address').value;
        const gstin = document.getElementById('branch-gstin').value;
        const phone = document.getElementById('branch-phone').value;
        const isDefault = document.getElementById('branch-default').checked;

        if (!name || !address || !gstin || !phone) {
          UI.toast("Please fill in all inputs", "warning");
          return;
        }

        const payload = { name, address, gstin, phone, isDefault };
        
        // If default checked, unset default on other branches
        if (isDefault) {
          const list = DB.get('jw_branches');
          list.forEach(b => { b.isDefault = false; DB.update('jw_branches', b.id, b); });
        }

        if (isEdit) {
          DB.update('jw_branches', id, payload);
          UI.toast("Branch details updated");
        } else {
          DB.insert('jw_branches', payload);
          UI.toast("Branch created");
        }
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  },

  editBranch(id) { this.showBranchModal(id); },
  
  deleteBranch(id) {
    const products = DB.get('jw_products');
    if (products.some(p => p.branchId === id)) {
      UI.toast("Cannot delete branch. Stock items mapped to it.", "error");
      return;
    }
    UI.confirm("Are you sure you want to delete this branch?", () => {
      DB.delete('jw_branches', id);
      UI.toast("Branch deleted");
      Router.handleRouting();
    });
  }
};

// 4. SUPPLIER & KARIGAR MODULE
const SuppliersModule = {
  render(container, subModule, params) {
    if (!subModule) {
      Router.navigate('suppliers', 'list');
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="display:flex; gap:16px; align-items:center;">
          <h2 style="font-weight:600; font-size:1.4rem;">Suppliers & Karigars</h2>
          <div style="display:flex; gap:4px; background:#fff; padding:4px; border-radius:var(--radius-sm); border:1px solid var(--border);">
            <a class="btn btn-secondary btn-sm ${subModule === 'list' ? 'btn-accent' : ''}" style="border:none;" href="#suppliers/list"><i class="fa fa-list"></i> Supplier Directory</a>
            <a class="btn btn-secondary btn-sm ${subModule === 'job-orders' ? 'btn-accent' : ''}" style="border:none;" href="#suppliers/job-orders"><i class="fa fa-hammer"></i> Karigar Job Orders</a>
          </div>
        </div>
      </div>
      <div id="suppliers-module-content"></div>
    `;

    const content = document.getElementById('suppliers-module-content');
    if (subModule === 'list') {
      this.renderList(content);
    } else if (subModule === 'job-orders') {
      this.renderJobOrders(content);
    }
  },

  renderList(container) {
    const list = DB.get('jw_suppliers');
    container.innerHTML = `
      <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
        <div class="filter-bar">
          <div class="filter-controls">
            <input type="text" id="supp-search" class="form-control" placeholder="Search suppliers..." style="width:240px;" />
            <select id="supp-filter-type" class="form-control" style="width:180px;">
              <option value="">All Types</option>
              <option value="Wholesaler">Wholesaler</option>
              <option value="Karigar">Karigar</option>
              <option value="Diamond Vendor">Diamond Vendor</option>
            </select>
          </div>
          <button class="btn btn-accent btn-sm" id="btn-add-supplier"><i class="fa fa-plus"></i> Add Supplier</button>
        </div>
        <div id="suppliers-table-container"></div>
      </div>
    `;

    const drawTable = () => {
      const q = document.getElementById('supp-search').value.toLowerCase();
      const type = document.getElementById('supp-filter-type').value;

      UI.renderTable({
        containerId: 'suppliers-table-container',
        columns: [
          { label: 'Name', key: 'name' },
          { label: 'Type', render: (row) => `<span class="badge ${row.type === 'Karigar' ? 'badge-info' : (row.type === 'Wholesaler' ? 'badge-gold' : 'badge-success')}">${row.type}</span>` },
          { label: 'GSTIN', key: 'gstin' },
          { label: 'Phone', key: 'phone' },
          { label: 'Balance Outstanding', render: (row) => `₹${row.openingBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}` }
        ],
        data: list,
        filterFn: (item) => {
          const matchQ = item.name.toLowerCase().includes(q) || item.phone.includes(q);
          const matchType = !type || item.type === type;
          return matchQ && matchType;
        },
        actions: (row) => `
          <button class="btn btn-secondary btn-sm btn-icon" onclick="SuppliersModule.editSupplier(${row.id})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="SuppliersModule.deleteSupplier(${row.id})"><i class="fa fa-trash"></i></button>
        `
      });
    };

    document.getElementById('supp-search').oninput = drawTable;
    document.getElementById('supp-filter-type').onchange = drawTable;
    document.getElementById('btn-add-supplier').onclick = () => this.showSupplierModal();
    
    drawTable();
  },

  showSupplierModal(id = null) {
    const isEdit = id !== null;
    const item = isEdit ? DB.getById('jw_suppliers', id) : null;

    const html = `
      <form id="supplier-form">
        <div class="form-group">
          <label class="form-label">Full Name <span class="required">*</span></label>
          <input type="text" id="supp-name" class="form-control" required value="${isEdit ? item.name : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Supplier Type <span class="required">*</span></label>
          <select id="supp-type" class="form-control" required>
            <option value="Wholesaler" ${isEdit && item.type === 'Wholesaler' ? 'selected' : ''}>Wholesaler</option>
            <option value="Karigar" ${isEdit && item.type === 'Karigar' ? 'selected' : ''}>Karigar</option>
            <option value="Diamond Vendor" ${isEdit && item.type === 'Diamond Vendor' ? 'selected' : ''}>Diamond Vendor</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">GSTIN</label>
          <input type="text" id="supp-gstin" class="form-control" value="${isEdit && item.gstin ? item.gstin : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Phone <span class="required">*</span></label>
          <input type="text" id="supp-phone" class="form-control" required value="${isEdit ? item.phone : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="supp-email" class="form-control" value="${isEdit && item.email ? item.email : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <input type="text" id="supp-address" class="form-control" value="${isEdit && item.address ? item.address : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Opening Balance Outstanding (₹)</label>
          <input type="number" id="supp-balance" class="form-control" value="${isEdit ? item.openingBalance : 0}" ${isEdit ? 'disabled' : ''} />
        </div>
      </form>
    `;

    UI.modal(isEdit ? "Edit Supplier" : "Add Supplier / Karigar", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save Details", className: "btn btn-accent", action: () => {
        const name = document.getElementById('supp-name').value;
        const type = document.getElementById('supp-type').value;
        const gstin = document.getElementById('supp-gstin').value;
        const phone = document.getElementById('supp-phone').value;
        const email = document.getElementById('supp-email').value;
        const address = document.getElementById('supp-address').value;
        const openingBalance = parseFloat(document.getElementById('supp-balance').value) || 0;

        if (!name || !type || !phone) {
          UI.toast("Please fill in required inputs", "warning");
          return;
        }

        const payload = { name, type, gstin, phone, email, address, openingBalance };
        if (isEdit) {
          DB.update('jw_suppliers', id, payload);
          UI.toast("Supplier updated");
        } else {
          DB.insert('jw_suppliers', payload);
          UI.toast("Supplier created");
        }
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  },

  editSupplier(id) { this.showSupplierModal(id); },

  deleteSupplier(id) {
    const products = DB.get('jw_products');
    if (products.some(p => p.supplierId === id)) {
      UI.toast("Cannot delete supplier. Products are mapped with this supplier.", "error");
      return;
    }
    UI.confirm("Are you sure you want to delete this supplier?", () => {
      DB.delete('jw_suppliers', id);
      UI.toast("Supplier deleted");
      Router.handleRouting();
    });
  },

  renderJobOrders(container) {
    const orders = DB.get('jw_karigar_orders');
    const suppliers = DB.get('jw_suppliers');
    const metals = DB.get('jw_metals');
    const purities = DB.get('jw_purities');

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Left: Raise New Order -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">New Job Order</h4>
          <form id="job-order-form">
            <div class="form-group">
              <label class="form-label">Select Karigar <span class="required">*</span></label>
              <select id="job-karigar" class="form-control" required>
                <option value="">Select Karigar</option>
                ${suppliers.filter(s => s.type === 'Karigar').map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Metal <span class="required">*</span></label>
              <select id="job-metal" class="form-control" required>
                <option value="">Select Metal</option>
                ${metals.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Purity <span class="required">*</span></label>
              <select id="job-purity" class="form-control" required disabled>
                <option value="">Select Purity</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Given Metal Weight (grams) <span class="required">*</span></label>
              <input type="number" step="0.001" min="0.001" id="job-weight" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Allowed Wastage %</label>
              <input type="number" step="0.1" min="0" id="job-wastage" class="form-control" value="1.0" />
            </div>
            <div class="form-group">
              <label class="form-label">Labour Rate per gram (₹) <span class="required">*</span></label>
              <input type="number" min="0" id="job-labour" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Expected Return Date</label>
              <input type="date" id="job-exp-date" class="form-control" required value="${new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}" />
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Create Job Order</button>
          </form>
        </div>

        <!-- Right: Orders list -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Active & Past Orders</h4>
          <div id="job-orders-table-container"></div>
        </div>
      </div>
    `;

    // Filter purity dropdown based on metal selected
    const metalSelect = document.getElementById('job-metal');
    const puritySelect = document.getElementById('job-purity');
    metalSelect.onchange = () => {
      const metalId = Number(metalSelect.value);
      if (!metalId) {
        puritySelect.disabled = true;
        puritySelect.innerHTML = `<option value="">Select Purity</option>`;
        return;
      }
      const filtered = purities.filter(p => p.metalId === metalId && p.isActive);
      puritySelect.innerHTML = `<option value="">Select Purity</option>` + filtered.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      puritySelect.disabled = false;
    };

    // Form submit
    document.getElementById('job-order-form').onsubmit = (e) => {
      e.preventDefault();
      const karigarId = Number(document.getElementById('job-karigar').value);
      const metalId = Number(metalSelect.value);
      const purityId = Number(puritySelect.value);
      const givenWeight = parseFloat(document.getElementById('job-weight').value);
      const wastageAllowedPercent = parseFloat(document.getElementById('job-wastage').value) || 0;
      const labourRate = parseFloat(document.getElementById('job-labour').value);
      const expectedReturnDate = document.getElementById('job-exp-date').value;

      if (!karigarId || !metalId || !purityId || isNaN(givenWeight) || isNaN(labourRate) || !expectedReturnDate) {
        UI.toast("Please fill in required fields", "warning");
        return;
      }

      const orderPayload = {
        karigarId,
        metalId,
        purityId,
        givenWeight,
        wastageAllowedPercent,
        labourRate,
        orderDate: new Date().toISOString().split('T')[0],
        expectedReturnDate,
        status: 'Pending'
      };

      DB.insert('jw_karigar_orders', orderPayload);
      UI.toast("Karigar Job Order raised successfully");
      Router.handleRouting();
    };

    // Draw active & past orders table
    const sortedOrders = [...orders].sort((a,b) => b.id - a.id);
    UI.renderTable({
      containerId: 'job-orders-table-container',
      columns: [
        { label: 'Job#', key: 'id' },
        { label: 'Karigar', render: (row) => suppliers.find(s => s.id === row.karigarId)?.name || 'Unknown' },
        { label: 'Metal Details', render: (row) => {
          const m = metals.find(me => me.id === row.metalId)?.name || '';
          const p = purities.find(pu => pu.id === row.purityId)?.name || '';
          return `${m} (${p})`;
        }},
        { label: 'Weight Given', render: (row) => `${row.givenWeight.toFixed(3)}g` },
        { label: 'Delivery Exp', key: 'expectedReturnDate' },
        { label: 'Status', render: (row) => `<span class="badge ${row.status === 'Completed' ? 'badge-success' : (row.status === 'PartialReceived' ? 'badge-warning' : 'badge-danger')}">${row.status}</span>` }
      ],
      data: sortedOrders,
      actions: (row) => {
        if (row.status !== 'Completed') {
          return `<button class="btn btn-accent btn-sm btn-icon" title="Receive Goods" onclick="SuppliersModule.showReceiveGoodsModal(${row.id})"><i class="fa fa-reply"></i> Receive</button>`;
        }
        return `-`;
      }
    });
  },

  showReceiveGoodsModal(orderId) {
    const order = DB.getById('jw_karigar_orders', orderId);
    if (!order) return;

    const karigarName = DB.getById('jw_suppliers', order.karigarId)?.name || 'Karigar';
    const metalName = DB.getById('jw_metals', order.metalId)?.name || 'Metal';
    const purityName = DB.getById('jw_purities', order.purityId)?.name || 'Purity';

    const html = `
      <div style="background:#fafafa; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:16px; font-size:0.8rem;">
        <div><strong>Karigar:</strong> ${karigarName}</div>
        <div><strong>Order details:</strong> ${metalName} ${purityName}</div>
        <div><strong>Metal Weight Given:</strong> ${order.givenWeight.toFixed(3)}g</div>
        <div><strong>Allowed Wastage Limit:</strong> ${order.wastageAllowedPercent.toFixed(1)}%</div>
      </div>
      <form id="receive-goods-form">
        <div class="form-group">
          <label class="form-label">Received Finished Weight (grams) <span class="required">*</span></label>
          <input type="number" step="0.001" min="0.001" max="${order.givenWeight}" id="rec-weight" class="form-control" required />
        </div>
        <div class="form-group">
          <label class="form-label">Actual Wastage (Weight Loss) <span class="required">*</span></label>
          <input type="number" step="0.001" min="0" id="rec-wastage-weight" class="form-control" required placeholder="Auto updates" />
        </div>
        <div class="form-group">
          <label class="form-label">Calculated Labour Amount (₹) <span class="required">*</span></label>
          <input type="number" id="rec-labour" class="form-control" required placeholder="Auto updates" />
        </div>
        <div id="wastage-warning" style="display:none; padding:10px; background:rgba(239, 68, 68, 0.1); color:var(--danger); border-radius:var(--radius-sm); font-size:0.75rem; margin-top:8px;">
          <i class="fa fa-triangle-exclamation"></i> Warning: Actual wastage weight exceeds allowed limit (${order.wastageAllowedPercent.toFixed(1)}%)!
        </div>
      </form>
    `;

    UI.modal(`Receive Finished Goods (Job Order #${order.id})`, html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Receive Goods", className: "btn btn-success", action: () => {
        const receivedWeight = parseFloat(document.getElementById('rec-weight').value);
        const wastageWeight = parseFloat(document.getElementById('rec-wastage-weight').value);
        const labourAmount = parseFloat(document.getElementById('rec-labour').value);

        if (isNaN(receivedWeight) || isNaN(wastageWeight) || isNaN(labourAmount)) {
          UI.toast("Please fill in received details", "warning");
          return;
        }

        // 1. Insert receipt row
        DB.insert('jw_karigar_receipts', {
          orderId: Number(orderId),
          receivedWeight,
          wastageWeight,
          labourAmount,
          receiptDate: new Date().toISOString().split('T')[0]
        });

        // 2. Update order status to Completed
        DB.update('jw_karigar_orders', orderId, { status: 'Completed' });

        // 3. Post to Karigar ledger as credit
        const ledgerEntries = DB.get('jw_ledger') || [];
        DB.insert('jw_ledger', {
          entityType: 'Supplier',
          entityId: order.karigarId,
          type: 'Credit',
          amount: labourAmount,
          description: `Finished goods labor bill for Job Order #${order.id}`,
          date: new Date().toISOString().split('T')[0]
        });

        // 4. Update Supplier Balance
        const karigar = DB.getById('jw_suppliers', order.karigarId);
        if (karigar) {
          DB.update('jw_suppliers', karigar.id, {
            openingBalance: karigar.openingBalance + labourAmount
          });
        }

        UI.toast("Finished goods received and posted successfully");
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);

    // Live Math Calculators
    const inputWeight = document.getElementById('rec-weight');
    const inputWastage = document.getElementById('rec-wastage-weight');
    const inputLabour = document.getElementById('rec-labour');
    const warning = document.getElementById('wastage-warning');

    inputWeight.oninput = () => {
      const rec = parseFloat(inputWeight.value) || 0;
      if (rec > 0) {
        // Wastage Weight = Given - Received
        const loss = Math.max(0, order.givenWeight - rec);
        inputWastage.value = loss.toFixed(3);

        // Labour = Received * Rate
        const lab = rec * order.labourRate;
        inputLabour.value = Math.round(lab);

        // Wastage Alert
        const wastagePercent = (loss / order.givenWeight) * 100;
        if (wastagePercent > order.wastageAllowedPercent) {
          warning.style.display = 'block';
        } else {
          warning.style.display = 'none';
        }
      } else {
        inputWastage.value = '';
        inputLabour.value = '';
        warning.style.display = 'none';
      }
    };
  }
};

// 5. INVENTORY / PRODUCT MODULE
const InventoryModule = {
  render(container, subModule, params) {
    if (!subModule) {
      Router.navigate('inventory', 'products');
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="display:flex; gap:16px; align-items:center;">
          <h2 style="font-weight:600; font-size:1.4rem;">Inventory Control</h2>
          <div style="display:flex; gap:4px; background:#fff; padding:4px; border-radius:var(--radius-sm); border:1px solid var(--border);">
            <a class="btn btn-secondary btn-sm ${subModule === 'products' ? 'btn-accent' : ''}" style="border:none;" href="#inventory/products"><i class="fa fa-gem"></i> Products List</a>
            <a class="btn btn-secondary btn-sm ${subModule === 'stock-transfer' ? 'btn-accent' : ''}" style="border:none;" href="#inventory/stock-transfer"><i class="fa fa-arrows-left-right"></i> Stock Transfer</a>
            <a class="btn btn-secondary btn-sm ${subModule === 'stock-audit' ? 'btn-accent' : ''}" style="border:none;" href="#inventory/stock-audit"><i class="fa fa-clipboard-check"></i> Stock Audit</a>
          </div>
        </div>
      </div>
      <div id="inventory-module-content"></div>
    `;

    const content = document.getElementById('inventory-module-content');
    
    if (subModule === 'products') {
      if (params && params.addNew) {
        this.renderAddProductForm(content);
      } else {
        this.renderProductsList(content, params);
      }
    } else if (subModule === 'stock-transfer') {
      this.renderStockTransfer(content);
    } else if (subModule === 'stock-audit') {
      this.renderStockAudit(content);
    }
  },

  renderProductsList(container, params) {
    const list = DB.get('jw_products');
    const categories = DB.get('jw_categories');
    const metals = DB.get('jw_metals');
    const purities = DB.get('jw_purities');
    const branches = DB.get('jw_branches');

    // Layout
    container.innerHTML = `
      <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px; margin-bottom:20px;">
        <div class="filter-bar">
          <div class="filter-controls">
            <input type="text" id="prod-search" class="form-control" placeholder="Search by Code/Design..." style="width:200px;" />
            <select id="prod-filter-cat" class="form-control" style="width:140px;">
              <option value="">All Categories</option>
              ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
            <select id="prod-filter-metal" class="form-control" style="width:120px;">
              <option value="">All Metals</option>
              ${metals.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            </select>
            <select id="prod-filter-status" class="form-control" style="width:120px;">
              <option value="">All Status</option>
              <option value="InStock">InStock</option>
              <option value="Sold">Sold</option>
              <option value="OnApproval">OnApproval</option>
              <option value="Repair">Repair</option>
            </select>
            <select id="prod-filter-branch" class="form-control" style="width:130px;">
              <option value="">All Branches</option>
              ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
          </div>
          
          <div style="display:flex; gap:10px; align-items:center;">
            <div style="display:flex; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden;">
              <button class="btn btn-secondary btn-sm" id="view-mode-grid" style="border:none; padding:8px 12px;"><i class="fa fa-th-large"></i></button>
              <button class="btn btn-secondary btn-sm" id="view-mode-list" style="border:none; padding:8px 12px; background:#f1f5f9;"><i class="fa fa-list"></i></button>
            </div>
            ${['Admin', 'Manager'].includes(Auth.getCurrentUser().role) ? `<button class="btn btn-accent btn-sm" onclick="Router.navigate('inventory', 'products', {addNew: true})"><i class="fa fa-plus"></i> Add Product</button>` : ''}
          </div>
        </div>
      </div>
      
      <!-- List Area Container -->
      <div id="products-view-area"></div>
    `;

    let viewMode = 'grid'; // grid or list

    const drawProducts = () => {
      const q = document.getElementById('prod-search').value.toLowerCase();
      const catId = document.getElementById('prod-filter-cat').value;
      const metalId = document.getElementById('prod-filter-metal').value;
      const status = document.getElementById('prod-filter-status').value;
      const branchId = document.getElementById('prod-filter-branch').value;

      // Filter list
      const filtered = list.filter(p => {
        const matchQ = p.itemCode.toLowerCase().includes(q) || p.designName.toLowerCase().includes(q);
        const matchCat = !catId || p.categoryId === Number(catId);
        const matchMetal = !metalId || p.metalId === Number(metalId);
        const matchStatus = !status || p.status === status;
        const matchBranch = !branchId || p.branchId === Number(branchId);
        return matchQ && matchCat && matchMetal && matchStatus && matchBranch;
      });

      const area = document.getElementById('products-view-area');
      area.innerHTML = '';

      if (viewMode === 'grid') {
        if (filtered.length === 0) {
          area.innerHTML = `<div class="empty-state" style="background:#fff; border-radius:var(--radius); border:1px solid var(--border);"><div class="empty-state-emoji">💍</div><div class="empty-state-title">No products match your search</div></div>`;
          return;
        }

        let gridHtml = `<div class="inventory-grid">`;
        filtered.forEach(p => {
          const cat = categories.find(c => c.id === p.categoryId)?.name || 'Jewellery';
          const badgeClass = p.status === 'InStock' ? 'badge-success' : (p.status === 'Sold' ? 'badge-danger' : (p.status === 'OnApproval' ? 'badge-warning' : 'badge-info'));
          gridHtml += `
            <div class="product-card" onclick="InventoryModule.showProductDetailModal(${p.id})">
              <div class="product-card-img">💎</div>
              <div class="product-card-body">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="product-code">${p.itemCode}</span>
                    <span class="badge ${badgeClass}" style="font-size:0.6rem; padding:1px 6px;">${p.status}</span>
                  </div>
                  <h4 class="product-name">${p.designName}</h4>
                  <div class="product-weight">${cat} | Gross: ${p.grossWeight.toFixed(3)}g</div>
                </div>
                <div class="product-mrp">₹${p.mrp.toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
              </div>
            </div>
          `;
        });
        gridHtml += `</div>`;
        area.innerHTML = gridHtml;
      } else {
        // Table view
        area.innerHTML = `
          <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;" id="prod-list-table-container"></div>
        `;
        UI.renderTable({
          containerId: 'prod-list-table-container',
          columns: [
            { label: 'Item Code', key: 'itemCode' },
            { label: 'Design Name', key: 'designName' },
            { label: 'Category', render: (row) => categories.find(c => c.id === row.categoryId)?.name || 'Unknown' },
            { label: 'Metal Details', render: (row) => {
              const m = metals.find(me => me.id === row.metalId)?.name || '';
              const pur = purities.find(pu => pu.id === row.purityId)?.name || '';
              return `${m} (${pur})`;
            }},
            { label: 'Gross / Net Wt', render: (row) => `${row.grossWeight.toFixed(3)}g / ${row.netWeight.toFixed(3)}g` },
            { label: 'MRP (₹)', render: (row) => `₹${row.mrp.toLocaleString('en-IN', {minimumFractionDigits: 2})}` },
            { label: 'Branch', render: (row) => branches.find(b => b.id === row.branchId)?.name || 'Main' },
            { label: 'Status', render: (row) => `<span class="badge ${row.status === 'InStock' ? 'badge-success' : (row.status === 'Sold' ? 'badge-danger' : (row.status === 'OnApproval' ? 'badge-warning' : 'badge-info'))}">${row.status}</span>` }
          ],
          data: filtered,
          actions: (row) => `
            <button class="btn btn-secondary btn-sm btn-icon" onclick="event.stopPropagation(); InventoryModule.showProductDetailModal(${row.id})"><i class="fa fa-eye"></i></button>
          `
        });
      }
    };

    // Toggle view modes
    const btnGrid = document.getElementById('view-mode-grid');
    const btnList = document.getElementById('view-mode-list');

    btnGrid.onclick = () => {
      viewMode = 'grid';
      btnGrid.style.background = '#f1f5f9';
      btnList.style.background = '#fff';
      drawProducts();
    };

    btnList.onclick = () => {
      viewMode = 'list';
      btnList.style.background = '#f1f5f9';
      btnGrid.style.background = '#fff';
      drawProducts();
    };

    // Filter bindings
    document.getElementById('prod-search').oninput = drawProducts;
    document.getElementById('prod-filter-cat').onchange = drawProducts;
    document.getElementById('prod-filter-metal').onchange = drawProducts;
    document.getElementById('prod-filter-status').onchange = drawProducts;
    document.getElementById('prod-filter-branch').onchange = drawProducts;

    drawProducts();

    // Deep link product view via params
    if (params && params.viewProduct) {
      this.showProductDetailModal(Number(params.viewProduct));
    }
  },

  showProductDetailModal(id) {
    const p = DB.getById('jw_products', id);
    if (!p) return;

    const cat = DB.getById('jw_categories', p.categoryId)?.name || 'Category';
    const metal = DB.getById('jw_metals', p.metalId)?.name || 'Metal';
    const purity = DB.getById('jw_purities', p.purityId)?.name || 'Purity';
    const supplier = DB.getById('jw_suppliers', p.supplierId)?.name || 'Supplier';
    const branch = DB.getById('jw_branches', p.branchId)?.name || 'Main Showroom';
    
    // Stone details
    const stones = DB.get('jw_product_stones').filter(st => st.productId === p.id);
    const stoneTypes = DB.get('jw_stone_types');

    let stonesHtml = '';
    if (stones.length > 0) {
      stonesHtml = `
        <h5 style="font-weight:600; margin-top:16px; margin-bottom:8px; font-size:0.85rem;">Stones Configured</h5>
        <table class="data-table" style="font-size:0.8rem;">
          <thead><tr><th>Stone Type</th><th>Weight/Qty</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead>
          <tbody>
            ${stones.map(s => {
              const name = stoneTypes.find(st => st.id === s.stoneTypeId)?.name || 'Stone';
              const uom = stoneTypes.find(st => st.id === s.stoneTypeId)?.uom || '';
              return `<tr><td>${name}</td><td>${s.weight} ${uom}</td><td>₹${s.rate.toFixed(2)}</td><td>₹${s.amount.toFixed(2)}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    const isEditRestricted = p.status !== 'InStock'; // Block modifications if sold, etc.

    const html = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:0.85rem;">
        <div>
          <div style="margin-bottom:8px;"><strong>Item Code:</strong> ${p.itemCode}</div>
          <div style="margin-bottom:8px;"><strong>Design Description:</strong> ${p.designName}</div>
          <div style="margin-bottom:8px;"><strong>Category:</strong> ${cat}</div>
          <div style="margin-bottom:8px;"><strong>Metal:</strong> ${metal} (${purity})</div>
          <div style="margin-bottom:8px;"><strong>Supplier:</strong> ${supplier}</div>
          <div style="margin-bottom:8px;"><strong>Size:</strong> ${p.size || '-'}</div>
          <div style="margin-bottom:8px;"><strong>HUID hallmark:</strong> ${p.huidCode || 'None'}</div>
        </div>
        <div>
          <div style="margin-bottom:8px;"><strong>Gross Weight:</strong> ${p.grossWeight.toFixed(3)}g</div>
          <div style="margin-bottom:8px;"><strong>Stone Weight:</strong> ${p.stoneWeight.toFixed(3)}g</div>
          <div style="margin-bottom:8px;"><strong>Net Weight:</strong> ${p.netWeight.toFixed(3)}g</div>
          <div style="margin-bottom:8px;"><strong>Making Charge:</strong> ${p.makingChargeValue} (${p.makingChargeType})</div>
          <div style="margin-bottom:8px;"><strong>Wastage:</strong> ${p.wastagePercent}%</div>
          <div style="margin-bottom:8px;"><strong>MRP Price:</strong> <strong style="color:var(--accent); font-size:1.1rem;">₹${p.mrp.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></div>
          <div style="margin-bottom:8px;"><strong>Status Location:</strong> <span class="badge badge-success">${p.status}</span> at <strong>${branch}</strong></div>
        </div>
      </div>
      ${stonesHtml}
      
      <!-- Edit form in modal (only shown when editing details toggled) -->
      <div id="prod-edit-container" style="display:none; border-top:1px solid var(--border); margin-top:20px; padding-top:20px;">
        <h5 style="font-weight:600; margin-bottom:12px;">Edit Fields</h5>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">MRP (₹)</label>
            <input type="number" id="edit-prod-mrp" class="form-control" value="${p.mrp}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Size</label>
            <input type="text" id="edit-prod-size" class="form-control" value="${p.size || ''}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Branch location</label>
            <select id="edit-prod-branch" class="form-control">
              ${DB.get('jw_branches').map(b => `<option value="${b.id}" ${p.branchId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Product Status</label>
            <select id="edit-prod-status" class="form-control" ${isEditRestricted ? 'disabled' : ''}>
              <option value="InStock" ${p.status === 'InStock' ? 'selected' : ''}>InStock</option>
              <option value="Sold" ${p.status === 'Sold' ? 'selected' : ''}>Sold</option>
              <option value="OnApproval" ${p.status === 'OnApproval' ? 'selected' : ''}>OnApproval</option>
              <option value="Repair" ${p.status === 'Repair' ? 'selected' : ''}>Repair</option>
            </select>
          </div>
        </div>
      </div>
    `;

    const footer = [
      { label: "Close", className: "btn btn-secondary", action: () => UI.closeModal() }
    ];

    // Access control for editing
    const userRole = Auth.getCurrentUser().role;
    if (['Admin', 'Manager'].includes(userRole)) {
      footer.unshift({
        label: "Edit Details",
        className: "btn btn-accent",
        action: (modalOverlay) => {
          const editForm = document.getElementById('prod-edit-container');
          const saveBtn = modalOverlay.querySelector('.modal-footer .btn-accent');
          
          if (editForm.style.display === 'none') {
            editForm.style.display = 'block';
            saveBtn.innerHTML = "Save Changes";
          } else {
            // Save updates
            const mrp = parseFloat(document.getElementById('edit-prod-mrp').value);
            const size = document.getElementById('edit-prod-size').value;
            const branchId = Number(document.getElementById('edit-prod-branch').value);
            const status = document.getElementById('edit-prod-status').value;
            
            if (isNaN(mrp)) {
              UI.toast("Invalid MRP input", "warning");
              return;
            }

            DB.update('jw_products', p.id, { mrp, size, branchId, status });
            UI.toast("Product details updated");
            UI.closeModal();
            Router.handleRouting();
          }
        }
      });
      
      // Delete button (Only allow if product was never sold)
      if (p.status !== 'Sold') {
        footer.unshift({
          label: "Delete Product",
          className: "btn btn-danger",
          action: () => {
            UI.confirm("Are you sure you want to delete this product catalog entry?", () => {
              // Delete stone mapping first
              stones.forEach(s => DB.delete('jw_product_stones', s.id));
              
              DB.delete('jw_products', p.id);
              UI.toast("Product deleted successfully");
              UI.closeModal();
              Router.handleRouting();
            });
          }
        });
      }
    }

    UI.modal(`Product Detail: ${p.itemCode}`, html, footer);
  },

  renderAddProductForm(container) {
    const categories = DB.get('jw_categories');
    const metals = DB.get('jw_metals');
    const purities = DB.get('jw_purities');
    const suppliers = DB.get('jw_suppliers');
    const hallmarks = DB.get('jw_hallmarks');
    const branches = DB.get('jw_branches');
    const stones = DB.get('jw_stone_types');

    container.innerHTML = `
      <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px; display:grid; grid-template-columns:3fr 2fr; gap:24px;">
        <!-- Left Pane: Wizard Form steps -->
        <div>
          <!-- Wizard Steps Headers -->
          <div class="wizard-steps">
            <div class="wizard-step active" id="step-header-1">1</div>
            <div class="wizard-step" id="step-header-2">2</div>
            <div class="wizard-step" id="step-header-3">3</div>
          </div>
          
          <form id="wizard-product-form">
            <!-- Step 1: Basic Info -->
            <div class="wizard-panel active" id="wizard-panel-1">
              <h4 style="font-weight:600; margin-bottom:16px;">Step 1: Product Specifications</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Item Code (Editable Auto-generated)</label>
                  <input type="text" id="prod-itemcode" class="form-control" required placeholder="Select Category first" />
                </div>
                <div class="form-group">
                  <label class="form-label">Category <span class="required">*</span></label>
                  <select id="prod-cat" class="form-control" required>
                    <option value="">Select Category</option>
                    ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Design Description <span class="required">*</span></label>
                  <input type="text" id="prod-design" class="form-control" placeholder="e.g. Classic Bridal Band" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Metal <span class="required">*</span></label>
                  <select id="prod-metal" class="form-control" required>
                    <option value="">Select Metal</option>
                    ${metals.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Purity <span class="required">*</span></label>
                  <select id="prod-purity" class="form-control" required disabled>
                    <option value="">Select Purity</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Supplier / Karigar <span class="required">*</span></label>
                  <select id="prod-supplier" class="form-control" required>
                    <option value="">Select Supplier</option>
                    ${suppliers.map(s => `<option value="${s.id}">${s.name} (${s.type})</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Size / Dimension</label>
                  <input type="text" id="prod-size" class="form-control" placeholder="e.g. 14 / 2.6 / 16 inch" />
                </div>
                <div class="form-group">
                  <label class="form-label">HUID Hallmark Code (Optional)</label>
                  <select id="prod-huid" class="form-control">
                    <option value="">Select HUID Cert</option>
                    ${hallmarks.map(h => `<option value="${h.huidCode}">${h.huidCode} (${h.hallmarkCenter})</option>`).join('')}
                  </select>
                </div>
              </div>
              <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                <button type="button" class="btn btn-primary" id="btn-wizard-next-1">Next Step <i class="fa fa-arrow-right"></i></button>
              </div>
            </div>

            <!-- Step 2: Weight & Calculations -->
            <div class="wizard-panel" id="wizard-panel-2">
              <h4 style="font-weight:600; margin-bottom:16px;">Step 2: Weights & Making Charges</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Gross Weight (grams) <span class="required">*</span></label>
                  <input type="number" step="0.001" min="0.001" id="prod-gross" class="form-control" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Stone Weight (grams)</label>
                  <input type="number" step="0.001" min="0" id="prod-stone-wt" class="form-control" value="0.000" />
                </div>
                <div class="form-group">
                  <label class="form-label">Net Metal Weight (grams)</label>
                  <input type="number" step="0.001" id="prod-net" class="form-control" readonly value="0.000" />
                </div>
                <div class="form-group">
                  <label class="form-label">Making Charge Type <span class="required">*</span></label>
                  <div style="display:flex; gap:12px; margin-top:8px;">
                    <label style="font-size:0.8rem; display:flex; gap:4px; align-items:center;"><input type="radio" name="making-type" value="PerGram" checked> Per Gram</label>
                    <label style="font-size:0.8rem; display:flex; gap:4px; align-items:center;"><input type="radio" name="making-type" value="Percentage"> Percentage %</label>
                    <label style="font-size:0.8rem; display:flex; gap:4px; align-items:center;"><input type="radio" name="making-type" value="Fixed"> Fixed Amount</label>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Making Charge Value <span class="required">*</span></label>
                  <input type="number" step="0.01" min="0" id="prod-making-val" class="form-control" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Wastage %</label>
                  <input type="number" step="0.1" min="0" id="prod-wastage-pct" class="form-control" value="0.0" />
                </div>
                <div class="form-group">
                  <label class="form-label">Metal Purchase Rate (₹ per gram) <span class="required">*</span></label>
                  <input type="number" min="0" id="prod-purchase" class="form-control" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Branch Store Location <span class="required">*</span></label>
                  <select id="prod-branch" class="form-control" required>
                    ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <button type="button" class="btn btn-secondary" id="btn-wizard-prev-2"><i class="fa fa-arrow-left"></i> Previous</button>
                <button type="button" class="btn btn-primary" id="btn-wizard-next-2">Next Step <i class="fa fa-arrow-right"></i></button>
              </div>
            </div>

            <!-- Step 3: Stones Config -->
            <div class="wizard-panel" id="wizard-panel-3">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h4 style="font-weight:600;">Step 3: Add Stone Details</h4>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-add-stone-row"><i class="fa fa-plus"></i> Add Row</button>
              </div>
              <table class="data-table" style="font-size:0.8rem; margin-bottom:16px;" id="prod-stones-table">
                <thead><tr><th>Stone Type</th><th>Qty/Weight</th><th>Rate (₹)</th><th>Total (₹)</th><th>Action</th></tr></thead>
                <tbody id="stone-rows-tbody"></tbody>
              </table>
              <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <button type="button" class="btn btn-secondary" id="btn-wizard-prev-3"><i class="fa fa-arrow-left"></i> Previous</button>
                <button type="submit" class="btn btn-accent">Save Product Catalog</button>
              </div>
            </div>
          </form>
        </div>

        <!-- Right Pane: Real-time Price calculations & layout preview -->
        <div>
          <div style="position:sticky; top:20px; background:#fafafa; border:1px solid var(--border); border-radius:var(--radius); padding:20px;">
            <h4 style="font-weight:600; margin-bottom:14px; color:var(--primary); font-size:0.95rem;">Live MRP Estimator</h4>
            
            <!-- Dummy Card Preview -->
            <div style="background:#fff; border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px; margin-bottom:16px; box-shadow:var(--shadow);">
              <div style="text-align:center; font-size:2.5rem; margin-bottom:10px; color:var(--text-muted);">💍</div>
              <div style="text-align:center; font-weight:700; font-size:0.9rem;" id="prev-design">Item Name Preview</div>
              <div style="text-align:center; font-size:0.75rem; color:var(--text-muted); margin-bottom:10px;" id="prev-code">Item Code</div>
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-top:1px solid #f1f5f9; padding-top:10px;">
                <span>Gross Weight</span>
                <span id="prev-gross-wt">0.000g</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                <span>Net Metal</span>
                <span id="prev-net-wt">0.000g</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; color:var(--accent); margin-top:10px; border-top:1px dashed var(--border); padding-top:10px;">
                <span>MRP Price</span>
                <span id="prev-mrp">₹0.00</span>
              </div>
            </div>

            <!-- Mathematical breakdowns -->
            <div style="font-size:0.8rem; display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between;"><span>Today's Rate</span><span id="calc-today-rate">₹0.00</span></div>
              <div style="display:flex; justify-content:space-between;"><span>Metal Amount</span><span id="calc-metal-amt">₹0.00</span></div>
              <div style="display:flex; justify-content:space-between;"><span>Making Charges</span><span id="calc-making-amt">₹0.00</span></div>
              <div style="display:flex; justify-content:space-between;"><span>Wastage Amount</span><span id="calc-wastage-amt">₹0.00</span></div>
              <div style="display:flex; justify-content:space-between;"><span>Stones Total</span><span id="calc-stones-amt">₹0.00</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 1. Dynamic item code generator based on category + date
    const inputItemCode = document.getElementById('prod-itemcode');
    const selectCat = document.getElementById('prod-cat');
    
    selectCat.onchange = () => {
      const catId = selectCat.value;
      if (!catId) {
        inputItemCode.value = '';
        return;
      }
      const cat = categories.find(c => c.id === Number(catId));
      if (!cat) return;
      
      const prefix = cat.name.substring(0, 3).toUpperCase();
      const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      // Compute sequence count
      const list = DB.get('jw_products');
      const count = list.filter(p => p.categoryId === Number(catId)).length + 1;
      const seq = String(count).padStart(2, '0');
      
      inputItemCode.value = `${prefix}-${datePart}-${seq}`;
      
      // Update preview card
      document.getElementById('prev-code').textContent = inputItemCode.value;
      doCalculations();
    };

    // 2. Metal/Purity selection listener
    const selectMetal = document.getElementById('prod-metal');
    const selectPurity = document.getElementById('prod-purity');
    
    selectMetal.onchange = () => {
      const metalId = Number(selectMetal.value);
      if (!metalId) {
        selectPurity.disabled = true;
        selectPurity.innerHTML = `<option value="">Select Purity</option>`;
        return;
      }
      const filtered = purities.filter(p => p.metalId === metalId && p.isActive);
      selectPurity.innerHTML = `<option value="">Select Purity</option>` + filtered.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      selectPurity.disabled = false;
      doCalculations();
    };
    selectPurity.onchange = doCalculations;

    // 3. Wizard Step switcher
    const next1 = document.getElementById('btn-wizard-next-1');
    const next2 = document.getElementById('btn-wizard-next-2');
    const prev2 = document.getElementById('btn-wizard-prev-2');
    const prev3 = document.getElementById('btn-wizard-prev-3');

    next1.onclick = () => {
      if (!inputItemCode.value || !selectCat.value || !selectMetal.value || !selectPurity.value || !document.getElementById('prod-design').value) {
        UI.toast("Please fill in all step 1 inputs", "warning");
        return;
      }
      document.getElementById('wizard-panel-1').classList.remove('active');
      document.getElementById('wizard-panel-2').classList.add('active');
      document.getElementById('step-header-1').classList.add('completed');
      document.getElementById('step-header-2').classList.add('active');
    };

    next2.onclick = () => {
      const gross = parseFloat(document.getElementById('prod-gross').value);
      const makVal = parseFloat(document.getElementById('prod-making-val').value);
      const purchase = parseFloat(document.getElementById('prod-purchase').value);
      
      if (isNaN(gross) || gross <= 0 || isNaN(makVal) || isNaN(purchase)) {
        UI.toast("Please enter valid weights and pricing details", "warning");
        return;
      }

      document.getElementById('wizard-panel-2').classList.remove('active');
      document.getElementById('wizard-panel-3').classList.add('active');
      document.getElementById('step-header-2').classList.add('completed');
      document.getElementById('step-header-3').classList.add('active');
    };

    prev2.onclick = () => {
      document.getElementById('wizard-panel-2').classList.remove('active');
      document.getElementById('wizard-panel-1').classList.add('active');
      document.getElementById('step-header-2').classList.remove('active');
      document.getElementById('step-header-1').classList.remove('completed');
    };

    prev3.onclick = () => {
      document.getElementById('wizard-panel-3').classList.remove('active');
      document.getElementById('wizard-panel-2').classList.add('active');
      document.getElementById('step-header-3').classList.remove('active');
      document.getElementById('step-header-2').classList.remove('completed');
    };

    // 4. Live calculators hook
    const inputGross = document.getElementById('prod-gross');
    const inputStoneWt = document.getElementById('prod-stone-wt');
    const inputNet = document.getElementById('prod-net');
    
    const updateNetWeight = () => {
      const gross = parseFloat(inputGross.value) || 0;
      const stone = parseFloat(inputStoneWt.value) || 0;
      const net = Math.max(0, gross - stone);
      inputNet.value = net.toFixed(3);
      
      // Update preview card
      document.getElementById('prev-gross-wt').textContent = gross.toFixed(3) + 'g';
      document.getElementById('prev-net-wt').textContent = net.toFixed(3) + 'g';
      
      doCalculations();
    };

    inputGross.oninput = updateNetWeight;
    inputStoneWt.oninput = updateNetWeight;
    
    document.getElementById('prod-design').oninput = (e) => {
      document.getElementById('prev-design').textContent = e.target.value || 'Item Name Preview';
    };

    document.getElementById('prod-making-val').oninput = doCalculations;
    document.getElementById('prod-wastage-pct').oninput = doCalculations;
    document.getElementsByName('making-type').forEach(r => r.onchange = doCalculations);

    // 5. Dynamic Stone rows management
    const btnAddStone = document.getElementById('btn-add-stone-row');
    const stoneTbody = document.getElementById('stone-rows-tbody');
    
    btnAddStone.onclick = () => {
      const rowId = Date.now();
      const tr = document.createElement('tr');
      tr.id = `stone-row-${rowId}`;
      tr.innerHTML = `
        <td>
          <select class="form-control stone-row-type" style="width:100%;" required>
            <option value="">Select Stone</option>
            ${stones.map(s => `<option value="${s.id}">${s.name} (${s.uom})</option>`).join('')}
          </select>
        </td>
        <td><input type="number" step="0.001" min="0.001" class="form-control stone-row-weight" required style="width:90px;" /></td>
        <td><input type="number" class="form-control stone-row-rate" required style="width:90px;" /></td>
        <td><input type="number" class="form-control stone-row-amount" readonly style="width:90px;" value="0"/></td>
        <td><button type="button" class="btn btn-danger btn-sm btn-icon" onclick="document.getElementById('stone-row-${rowId}').remove(); doCalculations();"><i class="fa fa-trash"></i></button></td>
      `;
      stoneTbody.appendChild(tr);
      
      // Hook inputs for automatic sum
      const weight = tr.querySelector('.stone-row-weight');
      const rate = tr.querySelector('.stone-row-rate');
      const amount = tr.querySelector('.stone-row-amount');
      
      const calcRowAmount = () => {
        const wt = parseFloat(weight.value) || 0;
        const rt = parseFloat(rate.value) || 0;
        amount.value = Math.round(wt * rt);
        doCalculations();
      };
      
      weight.oninput = calcRowAmount;
      rate.oninput = calcRowAmount;
    };

    // Calculations function
    let calculatedMRP = 0;
    function doCalculations() {
      const purityId = Number(selectPurity.value);
      const netWeight = parseFloat(inputNet.value) || 0;
      const makingVal = parseFloat(document.getElementById('prod-making-val').value) || 0;
      const wastagePct = parseFloat(document.getElementById('prod-wastage-pct').value) || 0;

      // 1. Fetch Today's Rate
      const rates = DB.get('jw_rate_master').filter(r => r.purityId === purityId);
      let metalRate = 0;
      if (rates.length > 0) {
        rates.sort((a,b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
        metalRate = rates[0].ratePerGram;
      }
      document.getElementById('calc-today-rate').textContent = `₹${metalRate.toFixed(2)}`;

      // 2. Metal Amount = Net Weight * TodayRate
      const metalAmount = netWeight * metalRate;
      document.getElementById('calc-metal-amt').textContent = `₹${metalAmount.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

      // 3. Making charges
      const activeRadio = document.querySelector('input[name="making-type"]:checked')?.value;
      let makingAmount = 0;
      if (activeRadio === 'PerGram') {
        makingAmount = netWeight * makingVal;
      } else if (activeRadio === 'Percentage') {
        makingAmount = metalAmount * (makingVal / 100);
      } else if (activeRadio === 'Fixed') {
        makingAmount = makingVal;
      }
      document.getElementById('calc-making-amt').textContent = `₹${makingAmount.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

      // 4. Wastage Amount
      const wastageAmount = metalAmount * (wastagePct / 100);
      document.getElementById('calc-wastage-amt').textContent = `₹${wastageAmount.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

      // 5. Stone Amount Sum
      let stoneSum = 0;
      document.querySelectorAll('.stone-row-amount').forEach(inAmt => {
        stoneSum += parseFloat(inAmt.value) || 0;
      });
      document.getElementById('calc-stones-amt').textContent = `₹${stoneSum.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

      // 6. Net MRP
      calculatedMRP = Math.round(metalAmount + makingAmount + wastageAmount + stoneSum);
      document.getElementById('prev-mrp').textContent = `₹${calculatedMRP.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
    }

    // 6. Save Form Submit
    document.getElementById('wizard-product-form').onsubmit = (e) => {
      e.preventDefault();
      
      const itemCode = inputItemCode.value;
      const categoryId = Number(selectCat.value);
      const designName = document.getElementById('prod-design').value;
      const metalId = Number(selectMetal.value);
      const purityId = Number(selectPurity.value);
      const supplierId = Number(document.getElementById('prod-supplier').value);
      const size = document.getElementById('prod-size').value;
      const huidCode = document.getElementById('prod-huid').value;
      const grossWeight = parseFloat(inputGross.value);
      const stoneWeight = parseFloat(inputStoneWt.value);
      const netWeight = parseFloat(inputNet.value);
      const makingChargeType = document.querySelector('input[name="making-type"]:checked').value;
      const makingChargeValue = parseFloat(document.getElementById('prod-making-val').value);
      const wastagePercent = parseFloat(document.getElementById('prod-wastage-pct').value) || 0;
      const purchaseRate = parseFloat(document.getElementById('prod-purchase').value);
      const branchId = Number(document.getElementById('prod-branch').value);

      // Confirm MRP override dialog
      const html = `
        <div class="form-group">
          <label class="form-label">Calculated MRP is <strong>₹${calculatedMRP}</strong>. Enter manual override or save as is:</label>
          <input type="number" id="mrp-save-val" class="form-control" value="${calculatedMRP}" required />
        </div>
      `;

      UI.modal("Confirm Catalog Sale Price", html, [
        { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
        { label: "Save Product Catalog", className: "btn btn-success", action: () => {
          const finalMRP = parseFloat(document.getElementById('mrp-save-val').value) || calculatedMRP;
          
          // Insert Product
          const newProduct = DB.insert('jw_products', {
            itemCode, categoryId, designName, metalId, purityId, supplierId, size,
            huidCode, grossWeight, stoneWeight, netWeight, makingChargeType,
            makingChargeValue, wastagePercent, mrp: finalMRP, purchaseRate,
            branchId, status: 'InStock'
          });

          // Insert Stones
          document.querySelectorAll('#stone-rows-tbody tr').forEach(tr => {
            const stoneTypeId = Number(tr.querySelector('.stone-row-type').value);
            const weight = parseFloat(tr.querySelector('.stone-row-weight').value);
            const rate = parseFloat(tr.querySelector('.stone-row-rate').value);
            const amount = parseFloat(tr.querySelector('.stone-row-amount').value);

            if (stoneTypeId && weight && rate) {
              DB.insert('jw_product_stones', {
                productId: newProduct.id,
                stoneTypeId, weight, rate, amount
              });
            }
          });

          UI.toast("Product catalog record created successfully");
          UI.closeModal();
          Router.navigate('inventory', 'products');
        }}
      ]);
    };
  },

  renderStockTransfer(container) {
    const list = DB.get('jw_stock_transfers');
    const products = DB.get('jw_products').filter(p => p.status === 'InStock');
    const branches = DB.get('jw_branches');

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Left panel form -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Initiate Stock Transfer</h4>
          <form id="transfer-form">
            <div class="form-group">
              <label class="form-label">Select Product (In Stock) <span class="required">*</span></label>
              <select id="transfer-prod" class="form-control" required style="width:100%;">
                <option value="">Select Item</option>
                ${products.map(p => `<option value="${p.id}">${p.itemCode} - ${p.designName} at ${branches.find(b => b.id === p.branchId)?.name || 'Main'}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">To Branch Destination <span class="required">*</span></label>
              <select id="transfer-to-branch" class="form-control" required>
                <option value="">Select Destination</option>
                ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Initiate Dispatch</button>
          </form>
        </div>

        <!-- Right panel log -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Transfer History Log</h4>
          <div id="transfer-table-container"></div>
        </div>
      </div>
    `;

    // Submit
    document.getElementById('transfer-form').onsubmit = (e) => {
      e.preventDefault();
      const productId = Number(document.getElementById('transfer-prod').value);
      const toBranchId = Number(document.getElementById('transfer-to-branch').value);

      if (!productId || !toBranchId) {
        UI.toast("Please select item and destination", "warning");
        return;
      }

      const p = DB.getById('jw_products', productId);
      if (p.branchId === toBranchId) {
        UI.toast("Destination is same as current item location", "warning");
        return;
      }

      DB.insert('jw_stock_transfers', {
        productId,
        fromBranchId: p.branchId,
        toBranchId,
        transferDate: new Date().toISOString().split('T')[0],
        status: 'Sent'
      });

      // Update product status to OnApproval or block from active lists? No, keep InStock but log Sent
      UI.toast("Stock transfer dispatched successfully");
      Router.handleRouting();
    };

    // Draw log
    const sorted = [...list].sort((a,b) => b.id - a.id);
    UI.renderTable({
      containerId: 'transfer-table-container',
      columns: [
        { label: 'Transfer ID', key: 'id' },
        { label: 'Item Code', render: (row) => DB.getById('jw_products', row.productId)?.itemCode || 'Unknown' },
        { label: 'From Branch', render: (row) => branches.find(b => b.id === row.fromBranchId)?.name || 'Unknown' },
        { label: 'To Branch', render: (row) => branches.find(b => b.id === row.toBranchId)?.name || 'Unknown' },
        { label: 'Date', key: 'transferDate' },
        { label: 'Status', render: (row) => `<span class="badge ${row.status === 'Received' ? 'badge-success' : 'badge-warning'}">${row.status}</span>` }
      ],
      data: sorted,
      actions: (row) => {
        if (row.status === 'Sent') {
          return `<button class="btn btn-success btn-xs btn-sm" onclick="InventoryModule.receiveTransfer(${row.id})"><i class="fa fa-circle-check"></i> Receive</button>`;
        }
        return `-`;
      }
    });
  },

  receiveTransfer(transferId) {
    const tr = DB.getById('jw_stock_transfers', transferId);
    if (!tr) return;

    // 1. Update transfer status
    DB.update('jw_stock_transfers', transferId, { status: 'Received' });

    // 2. Update product branch
    DB.update('jw_products', tr.productId, { branchId: tr.toBranchId });

    UI.toast("Stock item received and branch location updated");
    Router.handleRouting();
  },

  renderStockAudit(container) {
    const list = DB.get('jw_stock_audits');
    const products = DB.get('jw_products').filter(p => p.status === 'InStock');

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Left: Form -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">New Weight Audit Audit</h4>
          <form id="audit-form">
            <div class="form-group">
              <label class="form-label">Select Item Code <span class="required">*</span></label>
              <select id="audit-prod" class="form-control" required style="width:100%;">
                <option value="">Select Product</option>
                ${products.map(p => `<option value="${p.id}">${p.itemCode} - ${p.designName}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">System Registered Weight (grams)</label>
              <input type="number" step="0.001" id="audit-system-wt" class="form-control" readonly value="0.000" />
            </div>
            <div class="form-group">
              <label class="form-label">Actual Measured Weight (grams) <span class="required">*</span></label>
              <input type="number" step="0.001" min="0.001" id="audit-actual-wt" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Remarks / Discrepancies</label>
              <input type="text" id="audit-remarks" class="form-control" placeholder="e.g. Tag loss, dust, etc." />
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Log Audit</button>
          </form>
        </div>

        <!-- Right: Log -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Audit Log History</h4>
          <div id="audit-table-container"></div>
        </div>
      </div>
    `;

    const selectProd = document.getElementById('audit-prod');
    const systemWt = document.getElementById('audit-system-wt');

    selectProd.onchange = () => {
      const p = DB.getById('jw_products', selectProd.value);
      systemWt.value = p ? p.grossWeight.toFixed(3) : '0.000';
    };

    document.getElementById('audit-form').onsubmit = (e) => {
      e.preventDefault();
      const productId = Number(selectProd.value);
      const actualWeight = parseFloat(document.getElementById('audit-actual-wt').value);
      const remarks = document.getElementById('audit-remarks').value;

      if (!productId || isNaN(actualWeight)) {
        UI.toast("Please fill in required inputs", "warning");
        return;
      }

      const sysWt = parseFloat(systemWt.value);
      DB.insert('jw_stock_audits', {
        productId,
        auditDate: new Date().toISOString().split('T')[0],
        systemWeight: sysWt,
        actualWeight,
        remarks
      });

      UI.toast("Audit log recorded successfully");
      Router.handleRouting();
    };

    // History Table
    const sorted = [...list].sort((a,b) => b.id - a.id);
    UI.renderTable({
      containerId: 'audit-table-container',
      columns: [
        { label: 'Date', key: 'auditDate' },
        { label: 'Item Code', render: (row) => DB.getById('jw_products', row.productId)?.itemCode || 'Unknown' },
        { label: 'System Wt', render: (row) => `${row.systemWeight.toFixed(3)}g` },
        { label: 'Actual Wt', render: (row) => `${row.actualWeight.toFixed(3)}g` },
        { label: 'Variance', render: (row) => {
          const varW = row.actualWeight - row.systemWeight;
          if (varW === 0) return `<span class="badge badge-success">Match</span>`;
          return `<span style="color:var(--danger); font-weight:700;">${varW > 0 ? '+' : ''}${varW.toFixed(3)}g</span>`;
        }},
        { label: 'Remarks', key: 'remarks' }
      ],
      data: sorted
    });
  }
};
