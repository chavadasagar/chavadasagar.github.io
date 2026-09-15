/**
 * APPLICATION MODULES - PART 2
 * Contains: Customers, Gold Schemes, Old Gold Exchange, POS Invoicing & Returns, Custom Orders & Approvals, Repairs, Reports, Settings
 */

// 1. CUSTOMER MODULE
const CustomerModule = {
  render(container, subModule, params) {
    // Check if showing Customer Profile page
    if (params && params.id) {
      this.renderProfilePage(container, Number(params.id));
      return;
    }

    container.innerHTML = `
      <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
        <div class="filter-bar">
          <div class="filter-controls">
            <input type="text" id="cust-search" class="form-control" placeholder="Search by Name or Phone..." style="width:280px;" />
          </div>
          <button class="btn btn-accent btn-sm" id="btn-add-customer"><i class="fa fa-plus"></i> Add Customer</button>
        </div>
        <div id="customers-table-container"></div>
      </div>
    `;

    const list = DB.get('jw_customers');
    const drawTable = () => {
      const q = document.getElementById('cust-search').value.toLowerCase();
      UI.renderTable({
        containerId: 'customers-table-container',
        columns: [
          { label: 'Name', render: (row) => `<a href="#customers?id=${row.id}" style="color:var(--accent); font-weight:600;">${row.name}</a>` },
          { label: 'Phone', key: 'phone' },
          { label: 'City', key: 'city' },
          { label: 'Customer Type', render: (row) => `<span class="badge ${row.type === 'VIP' ? 'badge-gold' : (row.type === 'Wholesale' ? 'badge-info' : 'badge-secondary')}">${row.type}</span>` },
          { label: 'Loyalty Points', key: 'loyaltyPoints' }
        ],
        data: list,
        filterFn: (item) => item.name.toLowerCase().includes(q) || item.phone.includes(q),
        actions: (row) => `
          <button class="btn btn-secondary btn-sm btn-icon" onclick="CustomerModule.editCustomer(${row.id})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="CustomerModule.deleteCustomer(${row.id})"><i class="fa fa-trash"></i></button>
        `
      });
    };

    document.getElementById('cust-search').oninput = drawTable;
    document.getElementById('btn-add-customer').onclick = () => this.showCustomerModal();
    
    drawTable();

    // Check parameters if opening Add Form directly
    if (params && params.addNew) {
      this.showCustomerModal();
    }
  },

  showCustomerModal(id = null) {
    const isEdit = id !== null;
    const item = isEdit ? DB.getById('jw_customers', id) : null;

    const html = `
      <form id="customer-form">
        <div class="form-group">
          <label class="form-label">Full Name <span class="required">*</span></label>
          <input type="text" id="cust-name" class="form-control" required value="${isEdit ? item.name : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number (10 Digits) <span class="required">*</span></label>
          <input type="text" id="cust-phone" class="form-control" required maxlength="10" placeholder="e.g. 9876543210" value="${isEdit ? item.phone : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" id="cust-email" class="form-control" value="${isEdit && item.email ? item.email : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">PAN Number (Format: ABCDE1234F)</label>
          <input type="text" id="cust-pan" class="form-control" style="text-transform:uppercase;" placeholder="e.g. ABCDE1234F" value="${isEdit && item.pan ? item.pan : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Aadhaar Number (12 Digits)</label>
          <input type="text" id="cust-aadhaar" class="form-control" maxlength="12" value="${isEdit && item.aadhaar ? item.aadhaar : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input type="date" id="cust-dob" class="form-control" value="${isEdit && item.dob ? item.dob : ''}" />
          <div id="cust-age-display" style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Anniversary Date</label>
          <input type="date" id="cust-anniversary" class="form-control" value="${isEdit && item.anniversaryDate ? item.anniversaryDate : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">City</label>
          <input type="text" id="cust-city" class="form-control" value="${isEdit && item.city ? item.city : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <input type="text" id="cust-address" class="form-control" value="${isEdit && item.address ? item.address : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Customer Type</label>
          <select id="cust-type" class="form-control">
            <option value="Retail" ${isEdit && item.type === 'Retail' ? 'selected' : ''}>Retail</option>
            <option value="VIP" ${isEdit && item.type === 'VIP' ? 'selected' : ''}>VIP</option>
            <option value="Wholesale" ${isEdit && item.type === 'Wholesale' ? 'selected' : ''}>Wholesale</option>
          </select>
        </div>
      </form>
    `;

    UI.modal(isEdit ? "Edit Customer Details" : "Add New Customer", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save Profile", className: "btn btn-accent", action: () => {
        const name = document.getElementById('cust-name').value.trim();
        const phone = document.getElementById('cust-phone').value.trim();
        const email = document.getElementById('cust-email').value.trim();
        const pan = document.getElementById('cust-pan').value.trim().toUpperCase();
        const aadhaar = document.getElementById('cust-aadhaar').value.trim();
        const dob = document.getElementById('cust-dob').value;
        const anniversaryDate = document.getElementById('cust-anniversary').value;
        const city = document.getElementById('cust-city').value.trim();
        const address = document.getElementById('cust-address').value.trim();
        const type = document.getElementById('cust-type').value;

        if (!name || !phone) {
          UI.toast("Name and phone are required fields", "warning");
          return;
        }

        // Phone Format Validation (10 digits starting 6-9)
        if (!/^[6-9]\d{9}$/.test(phone)) {
          UI.toast("Please enter a valid 10-digit Indian phone number.", "warning");
          return;
        }

        // Check unique phone number
        const customers = DB.get('jw_customers');
        const phoneDup = customers.some(c => c.phone === phone && (!isEdit || c.id !== id));
        if (phoneDup) {
          UI.toast("A customer with this phone number already exists", "warning");
          return;
        }

        // PAN Format Validation
        if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
          UI.toast("Invalid PAN Number format (e.g. ABCDE1234F)", "warning");
          return;
        }

        // Aadhaar Format Validation
        if (aadhaar && !/^\d{12}$/.test(aadhaar)) {
          UI.toast("Aadhaar Number must be exactly 12 digits.", "warning");
          return;
        }

        const payload = { name, phone, email, pan, aadhaar, dob, anniversaryDate, city, address, type, loyaltyPoints: isEdit ? item.loyaltyPoints : 0 };
        
        let savedCustomer;
        if (isEdit) {
          savedCustomer = DB.update('jw_customers', id, payload);
          UI.toast("Customer details updated");
        } else {
          savedCustomer = DB.insert('jw_customers', payload);
          UI.toast("Customer registered successfully");
        }
        UI.closeModal();
        
        // Redirect or refresh
        if (isEdit) {
          Router.handleRouting();
        } else {
          Router.navigate('customers', null, {id: savedCustomer.id});
        }
      }}
    ]);

    // Live age calculation
    const dobInput = document.getElementById('cust-dob');
    dobInput.onchange = () => {
      const birth = new Date(dobInput.value);
      if (!isNaN(birth.getTime())) {
        const diff = Date.now() - birth.getTime();
        const ageDate = new Date(diff);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        document.getElementById('cust-age-display').textContent = `Calculated Age: ${age} Years`;
      } else {
        document.getElementById('cust-age-display').textContent = '';
      }
    };
    if (isEdit && item.dob) dobInput.onchange();
  },

  editCustomer(id) { this.showCustomerModal(id); },

  deleteCustomer(id) {
    const invoices = DB.get('jw_invoices');
    if (invoices.some(inv => inv.customerId === id)) {
      UI.toast("Cannot delete customer. Active invoices are registered under their name.", "error");
      return;
    }
    UI.confirm("Are you sure you want to delete this customer profile?", () => {
      DB.delete('jw_customers', id);
      UI.toast("Customer deleted");
      Router.navigate('customers');
    });
  },

  renderProfilePage(container, id) {
    const customer = DB.getById('jw_customers', id);
    if (!customer) {
      container.innerHTML = `<h3>Customer ID ${id} not found</h3>`;
      return;
    }

    // Calculations
    const invoices = DB.get('jw_invoices').filter(i => i.customerId === id);
    const oldGolds = DB.get('jw_old_gold').filter(og => og.customerId === id);
    const enrollments = DB.get('jw_enrollments').filter(e => e.customerId === id);

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <h2 style="font-weight:600; font-size:1.4rem; color:var(--primary);">${customer.name}</h2>
          <span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa fa-phone"></i> ${customer.phone} | City: ${customer.city || '-'} | Loyalty Points: <strong style="color:var(--accent)">${customer.loyaltyPoints}</strong></span>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-accent btn-sm" onclick="CustomerModule.editCustomer(${customer.id})"><i class="fa fa-pencil"></i> Edit Profile</button>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('customers')"><i class="fa fa-arrow-left"></i> Back to Directory</button>
        </div>
      </div>

      <!-- Profile Tabs -->
      <div class="tabs-container">
        <ul class="tabs-list">
          <li class="tab-item active" data-tab="cust-profile-tab">Profile Info</li>
          <li class="tab-item" data-tab="cust-purchases-tab">Purchases History (${invoices.length})</li>
          <li class="tab-item" data-tab="cust-schemes-tab">Active Savings Schemes (${enrollments.length})</li>
          <li class="tab-item" data-tab="cust-oldgold-tab">Old Gold Exchanges (${oldGolds.length})</li>
        </ul>

        <!-- Tab 1: Profile Info -->
        <div class="tab-content active" id="cust-profile-tab">
          <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:24px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
              <div style="margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><strong>Email:</strong> ${customer.email || '-'}</div>
              <div style="margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><strong>PAN Number:</strong> ${customer.pan || '-'}</div>
              <div style="margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><strong>Aadhaar Number:</strong> ${customer.aadhaar || '-'}</div>
              <div style="margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><strong>Full Address:</strong> ${customer.address || '-'}</div>
            </div>
            <div>
              <div style="margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><strong>Date of Birth:</strong> ${customer.dob ? new Date(customer.dob).toLocaleDateString('en-IN') : '-'}</div>
              <div style="margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><strong>Anniversary Date:</strong> ${customer.anniversaryDate ? new Date(customer.anniversaryDate).toLocaleDateString('en-IN') : '-'}</div>
              <div style="margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><strong>Customer Type Category:</strong> ${customer.type}</div>
              <div style="margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;"><strong>Created Date Timestamp:</strong> ${new Date(customer.createdAt).toLocaleDateString('en-IN')}</div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Purchases History -->
        <div class="tab-content" id="cust-purchases-tab">
          <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;" id="profile-invoices-container"></div>
        </div>

        <!-- Tab 3: Savings Schemes -->
        <div class="tab-content" id="cust-schemes-tab">
          <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;" id="profile-schemes-container"></div>
        </div>

        <!-- Tab 4: Old Gold Exchange -->
        <div class="tab-content" id="cust-oldgold-tab">
          <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;" id="profile-oldgolds-container"></div>
        </div>
      </div>
    `;

    // Hook tab switches
    document.querySelectorAll('.tab-item').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
      };
    });

    // Render Purchases
    UI.renderTable({
      containerId: 'profile-invoices-container',
      columns: [
        { label: 'Invoice No', render: (row) => `<a href="#sales/invoice-list?view=${row.id}" style="color:var(--accent); font-weight:600;">${row.invoiceNo}</a>` },
        { label: 'Date', key: 'invoiceDate' },
        { label: 'Net Amount', render: (row) => `₹${row.netAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}` },
        { label: 'Payment Status', render: (row) => `<span class="badge badge-success">${row.paymentStatus || 'Paid'}</span>` }
      ],
      data: invoices
    });

    // Render Schemes
    const schemesList = DB.get('jw_schemes');
    const installments = DB.get('jw_installments');
    
    UI.renderTable({
      containerId: 'profile-schemes-container',
      columns: [
        { label: 'Scheme Name', render: (row) => schemesList.find(s => s.id === row.schemeId)?.name || 'Scheme' },
        { label: 'Monthly Amount', render: (row) => `₹${row.monthlyAmount.toLocaleString('en-IN')}` },
        { label: 'Progress Indicator', render: (row) => {
          const sch = schemesList.find(s => s.id === row.schemeId);
          if (!sch) return '-';
          const paid = installments.filter(ins => ins.enrollmentId === row.id).length;
          const pct = Math.min(100, (paid / sch.durationMonths) * 100);
          return `
            <div style="display:flex; align-items:center; gap:10px; width:200px;">
              <div style="flex-grow:1; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                <div style="width:${pct}%; height:100%; background:var(--accent);"></div>
              </div>
              <span style="font-size:0.75rem; font-weight:600;">${paid}/${sch.durationMonths}</span>
            </div>
          `;
        }},
        { label: 'Status', render: (row) => `<span class="badge ${row.status === 'Active' ? 'badge-success' : (row.status === 'Matured' ? 'badge-info' : 'badge-secondary')}">${row.status}</span>` }
      ],
      data: enrollments
    });

    // Render Old Gold Purchase list
    const metals = DB.get('jw_metals');
    UI.renderTable({
      containerId: 'profile-oldgolds-container',
      columns: [
        { label: 'Date purchased', key: 'purchaseDate' },
        { label: 'Metal description', render: (row) => {
          const m = metals.find(me => me.id === row.metalId)?.name || 'Gold';
          return `${m} (${row.purityPercent}%)`;
        }},
        { label: 'Gross / Net Fine Wt', render: (row) => `${row.grossWeight.toFixed(3)}g / ${row.netFineWeight.toFixed(3)}g` },
        { label: 'Total Value (₹)', render: (row) => `₹${row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}` },
        { label: 'Payment Mode', key: 'paymentMode' }
      ],
      data: oldGolds
    });
  }
};

// 2. SAVINGS SCHEMES
const SchemeModule = {
  render(container, subModule, params) {
    if (!subModule) {
      Router.navigate('schemes', 'dashboard');
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="display:flex; gap:16px; align-items:center;">
          <h2 style="font-weight:600; font-size:1.4rem;">Gold Savings Scheme</h2>
          <div style="display:flex; gap:4px; background:#fff; padding:4px; border-radius:var(--radius-sm); border:1px solid var(--border);">
            <a class="btn btn-secondary btn-sm ${subModule === 'dashboard' ? 'btn-accent' : ''}" style="border:none;" href="#schemes/dashboard"><i class="fa fa-piggy-bank"></i> Scheme Dashboard</a>
            <a class="btn btn-secondary btn-sm ${subModule === 'masters' ? 'btn-accent' : ''}" style="border:none;" href="#schemes/masters"><i class="fa fa-list"></i> Scheme Masters</a>
          </div>
        </div>
      </div>
      <div id="schemes-module-content"></div>
    `;

    const content = document.getElementById('schemes-module-content');
    
    if (subModule === 'dashboard') {
      this.renderDashboard(content);
    } else if (subModule === 'masters') {
      this.renderMasters(content);
    }
  },

  renderMasters(container) {
    const list = DB.get('jw_schemes');
    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Left form -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Create New Scheme</h4>
          <form id="scheme-master-form">
            <div class="form-group">
              <label class="form-label">Scheme Name <span class="required">*</span></label>
              <input type="text" id="scheme-name" class="form-control" required placeholder="e.g. Swarna Varsha Scheme" />
            </div>
            <div class="form-group">
              <label class="form-label">Duration (Months) <span class="required">*</span></label>
              <input type="number" min="1" id="scheme-duration" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">Bonus Month Number (Optional)</label>
              <input type="number" min="1" id="scheme-bonus" class="form-control" placeholder="e.g. 12th Month free" />
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Create Scheme Master</button>
          </form>
        </div>

        <!-- Right list -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Scheme Formats List</h4>
          <div id="schemes-master-table-container"></div>
        </div>
      </div>
    `;

    // Form Submit
    document.getElementById('scheme-master-form').onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('scheme-name').value.trim();
      const durationMonths = Number(document.getElementById('scheme-duration').value);
      const bonusMonth = Number(document.getElementById('scheme-bonus').value) || null;

      if (!name || isNaN(durationMonths)) {
        UI.toast("Please fill in scheme configurations", "warning");
        return;
      }

      DB.insert('jw_schemes', { name, durationMonths, bonusMonth, isActive: true });
      UI.toast("Gold Scheme created successfully");
      Router.handleRouting();
    };

    // Render list
    UI.renderTable({
      containerId: 'schemes-master-table-container',
      columns: [
        { label: 'Scheme Format Name', key: 'name' },
        { label: 'Duration (Months)', key: 'durationMonths' },
        { label: 'Bonus Month', render: (row) => row.bonusMonth ? `${row.bonusMonth}th Month` : 'None' },
        { label: 'Status', render: (row) => `<span class="badge ${row.isActive ? 'badge-success' : 'badge-danger'}">${row.isActive ? 'Active' : 'Inactive'}</span>` }
      ],
      data: list,
      actions: (row) => `
        <button class="btn ${row.isActive ? 'btn-danger' : 'btn-primary'} btn-sm btn-icon" onclick="SchemeModule.toggleSchemeStatus(${row.id})">
          <i class="fa ${row.isActive ? 'fa-ban' : 'fa-check'}"></i>
        </button>
      `
    });
  },

  toggleSchemeStatus(id) {
    const item = DB.getById('jw_schemes', id);
    if (!item) return;
    DB.update('jw_schemes', id, { isActive: !item.isActive });
    UI.toast("Scheme status updated");
    Router.handleRouting();
  },

  renderDashboard(container) {
    const enrolls = DB.get('jw_enrollments');
    const customers = DB.get('jw_customers');
    const schemes = DB.get('jw_schemes');
    const installments = DB.get('jw_installments');

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start; margin-bottom:24px;">
        <!-- Left: Enroll Customer -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Enroll Client in Scheme</h4>
          <form id="enroll-scheme-form">
            <div class="form-group">
              <label class="form-label">Search Customer <span class="required">*</span></label>
              <select id="enroll-customer" class="form-control" required style="width:100%;">
                <option value="">Select Customer</option>
                ${customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Select Gold Scheme <span class="required">*</span></label>
              <select id="enroll-scheme" class="form-control" required>
                <option value="">Select Scheme</option>
                ${schemes.filter(s => s.isActive).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Monthly Amount (₹) <span class="required">*</span></label>
              <input type="number" step="100" min="500" id="enroll-amount" class="form-control" required placeholder="Min. ₹500" />
            </div>
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input type="date" id="enroll-date" class="form-control" required value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Enroll Customer</button>
          </form>
        </div>

        <!-- Right: Active Enrollment logs -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
            <span>Active Scheme Accounts</span>
            <button class="btn btn-primary btn-sm" id="btn-collect-inst"><i class="fa-solid fa-credit-card"></i> Collect Installment</button>
          </h4>
          <div id="enrollments-table-container"></div>
        </div>
      </div>
    `;

    // Hook Collect button
    document.getElementById('btn-collect-inst').onclick = () => this.showCollectInstallmentModal();

    // Submit Enroll form
    document.getElementById('enroll-scheme-form').onsubmit = (e) => {
      e.preventDefault();
      const customerId = Number(document.getElementById('enroll-customer').value);
      const schemeId = Number(document.getElementById('enroll-scheme').value);
      const monthlyAmount = parseFloat(document.getElementById('enroll-amount').value);
      const startDate = document.getElementById('enroll-date').value;

      if (!customerId || !schemeId || isNaN(monthlyAmount) || !startDate) {
        UI.toast("Please fill in enrollment details", "warning");
        return;
      }

      DB.insert('jw_enrollments', {
        customerId,
        schemeId,
        monthlyAmount,
        startDate,
        status: 'Active'
      });

      UI.toast("Customer enrolled in gold savings scheme");
      Router.handleRouting();
    };

    // Draw active enrollments list
    const sortedEnrolls = [...enrolls].sort((a,b) => b.id - a.id);
    UI.renderTable({
      containerId: 'enrollments-table-container',
      columns: [
        { label: 'Customer Name', render: (row) => customers.find(c => c.id === row.customerId)?.name || 'Unknown' },
        { label: 'Scheme Type', render: (row) => schemes.find(s => s.id === row.schemeId)?.name || 'Unknown' },
        { label: 'Installments Progress', render: (row) => {
          const sch = schemes.find(s => s.id === row.schemeId);
          if (!sch) return '';
          const paid = installments.filter(ins => ins.enrollmentId === row.id).length;
          const pct = Math.min(100, (paid / sch.durationMonths) * 100);
          return `
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:100px; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                <div style="width:${pct}%; height:100%; background:var(--accent);"></div>
              </div>
              <span style="font-size:0.75rem; font-weight:600;">${paid}/${sch.durationMonths}</span>
            </div>
          `;
        }},
        { label: 'Monthly (₹)', render: (row) => `₹${row.monthlyAmount.toLocaleString('en-IN')}` },
        { label: 'Account Status', render: (row) => {
          const sch = schemes.find(s => s.id === row.schemeId);
          const paid = installments.filter(ins => ins.enrollmentId === row.id).length;
          let badge = `<span class="badge badge-success">Active</span>`;
          if (row.status === 'Redeemed') {
            badge = `<span class="badge badge-secondary">Redeemed</span>`;
          } else if (paid >= sch?.durationMonths) {
            badge = `<span class="badge badge-info">Matured</span>`;
          }
          return badge;
        }}
      ],
      data: sortedEnrolls,
      actions: (row) => {
        const sch = schemes.find(s => s.id === row.schemeId);
        if (!sch) return '-';
        const paid = installments.filter(ins => ins.enrollmentId === row.id).length;
        
        if (row.status === 'Active' && paid >= sch.durationMonths) {
          // Change status to matured dynamically
          DB.update('jw_enrollments', row.id, { status: 'Matured' });
          row.status = 'Matured';
        }

        if (row.status === 'Matured') {
          return `<button class="btn btn-accent btn-xs btn-sm" onclick="SchemeModule.redeemScheme(${row.id})"><i class="fa fa-reply"></i> Redeem</button>`;
        }
        return `-`;
      }
    });
  },

  showCollectInstallmentModal() {
    const enrolls = DB.get('jw_enrollments').filter(e => e.status === 'Active');
    const customers = DB.get('jw_customers');
    const schemes = DB.get('jw_schemes');
    const installments = DB.get('jw_installments');

    if (enrolls.length === 0) {
      UI.toast("No active savings schemes are currently open for payment collection.", "warning");
      return;
    }

    const html = `
      <form id="installment-form">
        <div class="form-group">
          <label class="form-label">Select Active Account <span class="required">*</span></label>
          <select id="inst-enrollment" class="form-control" required style="width:100%;">
            <option value="">Select Account</option>
            ${enrolls.map(e => {
              const custName = customers.find(c => c.id === e.customerId)?.name || 'Client';
              const schName = schemes.find(s => s.id === e.schemeId)?.name || 'Scheme';
              return `<option value="${e.id}">${custName} - ${schName}</option>`;
            }).join('')}
          </select>
        </div>
        <div id="inst-details-panel" style="display:none; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm); background:#fafafa; margin-bottom:16px; font-size:0.8rem;">
          <div><strong>Installment No:</strong> <span id="lbl-inst-no">-</span></div>
          <div><strong>Installment Amount:</strong> <span id="lbl-inst-amt">-</span></div>
          <div id="bonus-badge-panel" style="display:none; color:var(--accent); font-weight:700; margin-top:4px;"><i class="fa-solid fa-gift"></i> GOLD BONUS INSTALLMENT MONTH (₹0.00)!</div>
        </div>
        <div class="form-group">
          <label class="form-label">Payment Mode <span class="required">*</span></label>
          <select id="inst-mode" class="form-control" required>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Debit/Credit Card</option>
            <option value="Bank">Bank Transfer</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Transaction Reference No (Reference)</label>
          <input type="text" id="inst-ref" class="form-control" placeholder="e.g. UPI transaction hash, Txn ID" />
        </div>
      </form>
    `;

    UI.modal("Collect Monthly Installment", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Post Payment", className: "btn btn-accent", action: () => {
        const enrollmentId = Number(document.getElementById('inst-enrollment').value);
        const mode = document.getElementById('inst-mode').value;
        const refNo = document.getElementById('inst-ref').value;

        if (!enrollmentId || !mode) {
          UI.toast("Please select enrollment account", "warning");
          return;
        }

        const e = DB.getById('jw_enrollments', enrollmentId);
        const sch = schemes.find(s => s.id === e.schemeId);
        const paidInstalls = installments.filter(ins => ins.enrollmentId === enrollmentId);
        const instNo = paidInstalls.length + 1;
        
        // Check if bonus month
        const isBonus = sch.bonusMonth === instNo;
        const finalAmt = isBonus ? 0 : e.monthlyAmount;

        // Save installment record
        const newInstall = DB.insert('jw_installments', {
          enrollmentId,
          installmentNo: instNo,
          amount: finalAmt,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMode: mode,
          isBonus
        });

        // Register payment transaction
        DB.insert('jw_payments', {
          invoiceId: newInstall.id,
          entityType: 'Installment',
          mode,
          amount: finalAmt,
          refNo: refNo || `SCH-INST-${newInstall.id}`,
          paymentDate: new Date().toISOString().split('T')[0]
        });

        // Trigger maturation if final month completed
        if (instNo >= sch.durationMonths) {
          DB.update('jw_enrollments', enrollmentId, { status: 'Matured' });
          UI.toast("Payment posted. Account is now MATURED!", "success");
        } else {
          UI.toast("Installment posted successfully");
        }

        UI.closeModal();
        Router.handleRouting();
      }}
    ]);

    // Live update UI values
    const selectAcc = document.getElementById('inst-enrollment');
    const details = document.getElementById('inst-details-panel');
    const lblNo = document.getElementById('lbl-inst-no');
    const lblAmt = document.getElementById('lbl-inst-amt');
    const bonusBadge = document.getElementById('bonus-badge-panel');

    selectAcc.onchange = () => {
      const eId = Number(selectAcc.value);
      if (!eId) {
        details.style.display = 'none';
        return;
      }
      const e = DB.getById('jw_enrollments', eId);
      const sch = schemes.find(s => s.id === e.schemeId);
      
      const count = installments.filter(ins => ins.enrollmentId === eId).length;
      const nextNo = count + 1;
      const isBonus = sch.bonusMonth === nextNo;

      lblNo.textContent = `${nextNo} of ${sch.durationMonths}`;
      lblAmt.textContent = isBonus ? '₹0.00 (Bonus Month)' : `₹${e.monthlyAmount.toLocaleString('en-IN')}`;
      
      bonusBadge.style.display = isBonus ? 'block' : 'none';
      details.style.display = 'block';
    };
  },

  redeemScheme(enrollmentId) {
    const e = DB.getById('jw_enrollments', enrollmentId);
    if (!e) return;
    
    // 1. Calculate sum total paid
    const installs = DB.get('jw_installments').filter(ins => ins.enrollmentId === enrollmentId);
    
    // Since bonus month is marked 0, we add the actual monthly value * duration excluding bonus
    // Let's sum the amount column directly (bonus records store 0)
    const paidSum = installs.reduce((sum, i) => sum + i.amount, 0);
    
    // Let's add the bonus month value to the customer's total payout (the shop gives 1 month value free!)
    const sch = DB.getById('jw_schemes', e.schemeId);
    const totalPayout = paidSum + (sch.bonusMonth ? e.monthlyAmount : 0);

    // 2. Redirect to Sales Billing POS prepopulating Customer and Scheme Payout Value!
    UI.toast(`Redeeming scheme account. Balance of ₹${totalPayout} will be applied at POS checkout.`, "info");
    
    Router.navigate('sales', 'new-invoice', {
      customerId: e.customerId,
      redeemSchemeId: enrollmentId,
      redeemValue: totalPayout
    });
  }
};

// 3. OLD GOLD / EXCHANGE
const OldGoldModule = {
  render(container, subModule, params) {
    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Left: Touch Test purchase form -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Old Gold Purchase Form</h4>
          <form id="old-gold-form">
            <div class="form-group">
              <label class="form-label">Select Customer</label>
              <select id="og-customer" class="form-control" style="width:100%;">
                <option value="">Walk-in Customer</option>
                ${DB.get('jw_customers').map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Item Description <span class="required">*</span></label>
              <input type="text" id="og-desc" class="form-control" required placeholder="e.g. Old broken Gold bangle" />
            </div>
            <div class="form-group">
              <label class="form-label">Metal Group <span class="required">*</span></label>
              <select id="og-metal" class="form-control" required>
                <option value="">Select Metal</option>
                ${DB.get('jw_metals').map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Gross Wt (grams) <span class="required">*</span></label>
                <input type="number" step="0.001" min="0.001" id="og-gross" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label">Deduction (grams)</label>
                <input type="number" step="0.001" min="0" id="og-deduct" class="form-control" value="0.000" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Touch Purity % <span class="required">*</span></label>
              <input type="number" step="0.1" min="0" max="100" id="og-purity" class="form-control" required placeholder="Touch test purity e.g. 85%" />
            </div>
            
            <!-- Live Calculator Screen -->
            <div style="background:#fdfdfd; border:1px dashed var(--accent); border-radius:var(--radius-sm); padding:16px; margin-bottom:16px;">
              <div style="font-size:0.75rem; color:var(--text-muted);">Calculated Net Fine Weight</div>
              <div style="font-size:1.4rem; font-weight:700; color:var(--primary);" id="og-lbl-finewt">0.000 g</div>
              
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">Today's Rate Applied</div>
              <div style="font-size:0.9rem; font-weight:600;" id="og-lbl-rate">₹0.00 / gram</div>

              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">Total Valuation Price</div>
              <div style="font-size:1.6rem; font-weight:800; color:var(--accent);" id="og-lbl-total">₹0.00</div>
            </div>

            <div class="form-group">
              <label class="form-label">Payment Adjustment Mode</label>
              <select id="og-mode" class="form-control">
                <option value="Cash">Cash Payout</option>
                <option value="Adjust Against Invoice">Adjust Against Invoice</option>
                <option value="UPI">UPI Payout</option>
              </select>
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Record Purchase</button>
          </form>
        </div>

        <!-- Right: Log list -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Old Gold Purchases</h4>
          <div id="oldgolds-table-container"></div>
        </div>
      </div>
    `;

    // Live calculators hook
    const inGross = document.getElementById('og-gross');
    const inDeduct = document.getElementById('og-deduct');
    const inPurity = document.getElementById('og-purity');
    const selectMetal = document.getElementById('og-metal');

    const lblFine = document.getElementById('og-lbl-finewt');
    const lblRate = document.getElementById('og-lbl-rate');
    const lblTotal = document.getElementById('og-lbl-total');

    let currentRate = 0;
    let netFineWeight = 0;
    let totalValuation = 0;

    const calcValuation = () => {
      const metalId = Number(selectMetal.value);
      const gross = parseFloat(inGross.value) || 0;
      const deduct = parseFloat(inDeduct.value) || 0;
      const purity = parseFloat(inPurity.value) || 0;

      // 1. Fetch current daily rate (based on selected metal purity, default to 22K (purity 2) if gold)
      const rateMaster = DB.get('jw_rate_master');
      let rateRow = null;
      if (metalId === 1) { // Gold -> use 22K rate
        rateRow = rateMaster.filter(r => r.purityId === 2);
      } else if (metalId === 2) { // Silver -> use Silver 925
        rateRow = rateMaster.filter(r => r.purityId === 4);
      }
      
      currentRate = 0;
      if (rateRow && rateRow.length > 0) {
        rateRow.sort((a,b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
        currentRate = rateRow[0].ratePerGram;
      }
      lblRate.textContent = `₹${currentRate.toFixed(2)} / gram`;

      // 2. Net Fine Wt = (Gross - Deduct) * (Purity / 100)
      netFineWeight = Math.max(0, (gross - deduct) * (purity / 100));
      lblFine.textContent = `${netFineWeight.toFixed(3)} grams`;

      // 3. Total valuation = Fine Weight * Rate
      totalValuation = Math.round(netFineWeight * currentRate);
      lblTotal.textContent = `₹${totalValuation.toLocaleString('en-IN')}`;
    };

    selectMetal.onchange = calcValuation;
    inGross.oninput = calcValuation;
    inDeduct.oninput = calcValuation;
    inPurity.oninput = calcValuation;

    // Form submit
    document.getElementById('old-gold-form').onsubmit = (e) => {
      e.preventDefault();
      const customerId = document.getElementById('og-customer').value ? Number(document.getElementById('og-customer').value) : null;
      const description = document.getElementById('og-desc').value;
      const metalId = Number(selectMetal.value);
      const grossWeight = parseFloat(inGross.value);
      const purityPercent = parseFloat(inPurity.value);
      const deductionWeight = parseFloat(inDeduct.value) || 0;
      const paymentMode = document.getElementById('og-mode').value;

      if (!description || !metalId || isNaN(grossWeight) || isNaN(purityPercent)) {
        UI.toast("Please fill in purchase details", "warning");
        return;
      }

      DB.insert('jw_old_gold', {
        customerId,
        description,
        metalId,
        grossWeight,
        purityPercent,
        deductionWeight,
        netFineWeight,
        rateApplied: currentRate,
        totalAmount: totalValuation,
        paymentMode,
        linkedInvoiceId: null,
        purchaseDate: new Date().toISOString().split('T')[0]
      });

      UI.toast("Old Gold exchange valuation recorded successfully");
      Router.handleRouting();
    };

    // Render list
    const list = DB.get('jw_old_gold');
    const metals = DB.get('jw_metals');
    const customers = DB.get('jw_customers');
    const sorted = [...list].sort((a,b) => b.id - a.id);
    
    UI.renderTable({
      containerId: 'oldgolds-table-container',
      columns: [
        { label: 'Date', key: 'purchaseDate' },
        { label: 'Client Name', render: (row) => row.customerId ? (customers.find(c => c.id === row.customerId)?.name || 'Unknown') : 'Walk-in' },
        { label: 'Gross / Net Wt', render: (row) => `${row.grossWeight.toFixed(3)}g / ${row.netFineWeight.toFixed(3)}g` },
        { label: 'Valuation Total', render: (row) => `₹${row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}` },
        { label: 'Linked POS', render: (row) => row.linkedInvoiceId ? `<span class="badge badge-success">Adjusted</span>` : `<span class="badge badge-info">Payout</span>` }
      ],
      data: sorted,
      actions: (row) => `
        <button class="btn btn-danger btn-sm btn-icon" onclick="OldGoldModule.deleteOg(${row.id})"><i class="fa fa-trash"></i></button>
      `
    });
  },

  deleteOg(id) {
    const og = DB.getById('jw_old_gold', id);
    if (og && og.linkedInvoiceId) {
      UI.toast("Cannot delete old gold record. It is adjusted inside a sales invoice.", "error");
      return;
    }
    UI.confirm("Are you sure you want to delete this old gold transaction entry?", () => {
      DB.delete('jw_old_gold', id);
      UI.toast("Old Gold purchase entry deleted");
      Router.handleRouting();
    });
  }
};

// 4. POS SALES BILLING & RETURNS
const SalesModule = {
  render(container, subModule, params) {
    if (!subModule) {
      Router.navigate('sales', 'invoice-list');
      return;
    }

    // Detail view deep link
    if (subModule === 'invoice-list' && params && params.view) {
      this.renderInvoiceDetail(container, Number(params.view));
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="display:flex; gap:16px; align-items:center;">
          <h2 style="font-weight:600; font-size:1.4rem;">POS Billing</h2>
          <div style="display:flex; gap:4px; background:#fff; padding:4px; border-radius:var(--radius-sm); border:1px solid var(--border);">
            <a class="btn btn-secondary btn-sm ${subModule === 'new-invoice' ? 'btn-accent' : ''}" style="border:none;" href="#sales/new-invoice"><i class="fa fa-plus"></i> New Invoice (POS)</a>
            <a class="btn btn-secondary btn-sm ${subModule === 'invoice-list' ? 'btn-accent' : ''}" style="border:none;" href="#sales/invoice-list"><i class="fa fa-list"></i> Invoice Directory</a>
            <a class="btn btn-secondary btn-sm ${subModule === 'sales-returns' ? 'btn-accent' : ''}" style="border:none;" href="#sales/sales-returns"><i class="fa fa-reply"></i> Sales Returns</a>
          </div>
        </div>
      </div>
      <div id="sales-module-content"></div>
    `;

    const content = document.getElementById('sales-module-content');
    if (subModule === 'new-invoice') {
      this.renderPOSBilling(content, params);
    } else if (subModule === 'invoice-list') {
      this.renderInvoiceList(content);
    } else if (subModule === 'sales-returns') {
      this.renderReturns(content);
    }
  },

  // State cart for the POS billing panel
  posCart: [],
  posPayments: [],
  posCustomer: null,
  schemeRedeemedObj: null,
  oldGoldAppliedObj: null,

  renderPOSBilling(container, params) {
    // Reset state
    this.posCart = [];
    this.posPayments = [];
    this.posCustomer = null;
    this.schemeRedeemedObj = null;
    this.oldGoldAppliedObj = null;

    // Apply deep-linked values (e.g. Scheme Maturity direct triggers)
    if (params && params.customerId) {
      const cust = DB.getById('jw_customers', params.customerId);
      if (cust) this.posCustomer = cust;
    }
    if (params && params.redeemSchemeId) {
      const e = DB.getById('jw_enrollments', params.redeemSchemeId);
      if (e) {
        this.schemeRedeemedObj = {
          id: Number(params.redeemSchemeId),
          value: parseFloat(params.redeemValue) || 0
        };
      }
    }

    container.innerHTML = `
      <div class="pos-container">
        <!-- POS Left panel: Search & Items -->
        <div class="pos-left">
          <div style="position:relative;">
            <label class="form-label" style="font-weight:600;">Scan / Search Product (Code, Category, Design)</label>
            <input type="text" id="pos-prod-search" class="form-control" placeholder="Type category name or scan barcode..." style="padding:12px 16px; border-radius:24px;" autocomplete="off" />
            
            <!-- Live matches search dropdown -->
            <div id="pos-search-dropdown" class="search-results-dropdown"></div>
          </div>

          <!-- Cart Grid Table -->
          <div class="pos-cart-table-wrapper">
            <table class="data-table" style="font-size:0.8rem;">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Weight (g)</th>
                  <th style="width:100px;">Rate (₹/g)</th>
                  <th>Making (₹)</th>
                  <th>Stones (₹)</th>
                  <th>Total Price (₹)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="pos-cart-tbody"></tbody>
            </table>
          </div>
        </div>

        <!-- POS Right panel: Checkout summary -->
        <div class="pos-right">
          <h4 style="font-weight:600; margin-bottom:14px; border-bottom:1px dashed var(--border); padding-bottom:8px;">Customer Checkout</h4>
          
          <div class="form-group" style="position:relative;">
            <label class="form-label">Client Customer <span class="required">*</span></label>
            <div style="display:flex; gap:8px;">
              <select id="pos-customer-select" class="form-control" required style="width:100%;">
                <option value="">Select Customer</option>
                ${DB.get('jw_customers').map(c => `<option value="${c.id}" ${this.posCustomer && this.posCustomer.id === c.id ? 'selected' : ''}>${c.name} (${c.phone})</option>`).join('')}
              </select>
              <button class="btn btn-secondary btn-sm" id="pos-btn-new-cust" type="button"><i class="fa fa-user-plus"></i></button>
            </div>
          </div>

          <!-- Checkout Math Summary -->
          <div style="background:#fafafa; border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px; margin-bottom:16px; font-size:0.8rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Metal Amount</span><span id="pos-lbl-metal">₹0.00</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Making Charges</span><span id="pos-lbl-making">₹0.00</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Stone Charges</span><span id="pos-lbl-stones">₹0.00</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-weight:600;"><span>Sub Total</span><span id="pos-lbl-subtotal">₹0.00</span></div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:var(--accent); font-weight:600;">
              <span>Old Gold Adjusted (-)</span>
              <span id="pos-lbl-oldgold">₹0.00</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:var(--success); font-weight:600;">
              <span>Scheme Redeemed (-)</span>
              <span id="pos-lbl-scheme">₹0.00</span>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-top:1px dashed var(--border); padding-top:6px;">
              <span>Discount (₹)</span>
              <input type="number" id="pos-discount" class="form-control" style="width:100px; padding:4px 8px; font-size:0.8rem;" value="0" />
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-top:1px solid var(--border); padding-top:6px;"><span>Taxable Amount</span><span id="pos-lbl-taxable">₹0.00</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:var(--text-muted);"><span>CGST (1.5%)</span><span id="pos-lbl-cgst">₹0.00</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:var(--text-muted);"><span>SGST (1.5%)</span><span id="pos-lbl-sgst">₹0.00</span></div>
            
            <div style="display:flex; justify-content:space-between; margin-top:10px; border-top:2px solid var(--primary); padding-top:10px; font-size:1.2rem; font-weight:800; color:var(--primary);">
              <span>NET PAYABLE</span>
              <span id="pos-lbl-net">₹0.00</span>
            </div>
          </div>

          <!-- POS Adjustments Bar -->
          <div style="display:flex; gap:10px; margin-bottom:16px;">
            <button class="btn btn-secondary btn-sm" id="pos-btn-adj-gold" style="flex:1;"><i class="fa fa-scale-balanced"></i> Add Old Gold</button>
            <button class="btn btn-secondary btn-sm" id="pos-btn-adj-scheme" style="flex:1;"><i class="fa fa-piggy-bank"></i> Redeem Scheme</button>
          </div>

          <!-- POS Multiple Payment Split -->
          <h5 style="font-weight:600; margin-bottom:8px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
            <span>Payment Modes Split</span>
            <button class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:0.7rem;" id="pos-btn-add-payment"><i class="fa fa-plus"></i> Split Mode</button>
          </h5>
          <div id="pos-payments-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;"></div>
          
          <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.85rem; padding:8px 0; border-top:1px dashed var(--border); margin-bottom:16px;">
            <span>Outstanding Remaining:</span>
            <span id="pos-lbl-remaining" style="color:var(--danger)">₹0.00</span>
          </div>

          <button class="btn btn-accent" style="width:100%; padding:12px;" id="pos-btn-submit"><i class="fa fa-cash-register"></i> Complete POS Invoice & Print</button>
        </div>
      </div>
    `;

    // 1. Search Hook (Live typing)
    const searchInput = document.getElementById('pos-prod-search');
    const dropdown = document.getElementById('pos-search-dropdown');
    
    searchInput.oninput = () => {
      const q = searchInput.value.trim().toLowerCase();
      if (q.length < 1) {
        dropdown.classList.remove('show');
        return;
      }

      // Query products in stock
      const products = DB.get('jw_products').filter(p => 
        p.status === 'InStock' && (p.itemCode.toLowerCase().includes(q) || p.designName.toLowerCase().includes(q))
      );

      if (products.length === 0) {
        dropdown.innerHTML = `<div style="padding:12px; font-size:0.8rem; text-align:center; color:var(--text-muted);">No products found in stock.</div>`;
      } else {
        let rows = '';
        products.forEach(p => {
          rows += `
            <div class="search-result-item" onclick="SalesModule.addToCart(${p.id})">
              <div><strong>${p.itemCode}</strong> - ${p.designName}</div>
              <div style="color:var(--accent)">₹${p.mrp.toLocaleString('en-IN')}</div>
            </div>
          `;
        });
        dropdown.innerHTML = rows;
      }
      dropdown.classList.add('show');
    };

    // Close search dropdown on click away
    document.addEventListener('click', (e) => {
      if (e.target !== searchInput) {
        dropdown.classList.remove('show');
      }
    });

    // 2. Customer Form trigger from POS
    document.getElementById('pos-btn-new-cust').onclick = () => {
      CustomerModule.showCustomerModal();
    };

    // 3. Discount & Customer change hook
    const selectCust = document.getElementById('pos-customer-select');
    selectCust.onchange = () => {
      const id = Number(selectCust.value);
      this.posCustomer = id ? DB.getById('jw_customers', id) : null;
      this.calculatePOSBill();
    };

    document.getElementById('pos-discount').oninput = () => this.calculatePOSBill();

    // 4. Adjustment triggers
    document.getElementById('pos-btn-adj-gold').onclick = () => this.showOldGoldAdjustmentModal();
    document.getElementById('pos-btn-adj-scheme').onclick = () => this.showSchemeAdjustmentModal();

    // 5. Payment rows
    document.getElementById('pos-btn-add-payment').onclick = () => this.addPOSPaymentRow();
    
    // 6. Complete Invoice
    document.getElementById('pos-btn-submit').onclick = () => this.submitPOSInvoice();

    // Set initial values if preset (e.g. maturity redirect)
    if (this.posCustomer) {
      this.calculatePOSBill();
    }
  },

  addToCart(productId) {
    const p = DB.getById('jw_products', productId);
    if (!p || p.status !== 'InStock') return;

    // Check duplicate
    if (this.posCart.some(item => item.id === productId)) {
      UI.toast("Product already added to billing cart.", "warning");
      return;
    }

    // Add to cart state
    this.posCart.push({
      id: p.id,
      itemCode: p.itemCode,
      designName: p.designName,
      grossWeight: p.grossWeight,
      netWeight: p.netWeight,
      metalId: p.metalId,
      purityId: p.purityId,
      originalMRP: p.mrp,
      // Values below are live calculations editable
      rateApplied: this.getTodayRateForPurity(p.purityId),
      makingChargeValue: p.makingChargeValue,
      makingChargeType: p.makingChargeType,
      wastagePercent: p.wastagePercent,
      stoneCharges: DB.get('jw_product_stones').filter(s => s.productId === p.id).reduce((sum, s) => sum + s.amount, 0)
    });

    UI.toast("Item added to billing cart");
    document.getElementById('pos-prod-search').value = '';
    
    this.renderCartTable();
    this.calculatePOSBill();
  },

  getTodayRateForPurity(purityId) {
    const rates = DB.get('jw_rate_master').filter(r => r.purityId === purityId);
    if (rates.length === 0) return 0;
    rates.sort((a,b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
    return rates[0].ratePerGram;
  },

  renderCartTable() {
    const tbody = document.getElementById('pos-cart-tbody');
    tbody.innerHTML = '';

    if (this.posCart.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px;">Billing cart is empty. Scan or search items.</td></tr>`;
      return;
    }

    this.posCart.forEach((item, idx) => {
      // Calculate inline totals
      const metalAmt = item.netWeight * item.rateApplied;
      let makingAmt = 0;
      if (item.makingChargeType === 'PerGram') makingAmt = item.netWeight * item.makingChargeValue;
      else if (item.makingChargeType === 'Percentage') makingAmt = metalAmt * (item.makingChargeValue / 100);
      else makingAmt = item.makingChargeValue;

      const wastageAmt = metalAmt * (item.wastagePercent / 100);
      const lineTotal = Math.round(metalAmt + makingAmt + wastageAmt + item.stoneCharges);

      tbody.innerHTML += `
        <tr data-id="${item.id}">
          <td><strong>${item.itemCode}</strong></td>
          <td>${item.designName}</td>
          <td>${item.grossWeight.toFixed(3)}g</td>
          <td>
            <input type="number" class="form-control pos-cart-rate-input" style="width:100px; padding:2px 6px;" value="${item.rateApplied}" oninput="SalesModule.updateCartItem(${idx}, 'rateApplied', this.value)"/>
          </td>
          <td>
            <div style="font-size:0.75rem;">₹${makingAmt.toFixed(0)}</div>
            <div style="font-size:0.65rem; color:var(--text-muted);">${item.makingChargeValue} (${item.makingChargeType})</div>
          </td>
          <td>₹${item.stoneCharges.toFixed(0)}</td>
          <td><strong style="color:var(--primary);">₹${lineTotal.toLocaleString('en-IN')}</strong></td>
          <td>
            <button class="btn btn-danger btn-xs btn-icon" onclick="SalesModule.removeFromCart(${idx})"><i class="fa fa-times"></i></button>
          </td>
        </tr>
      `;
    });
  },

  updateCartItem(idx, key, val) {
    const parsedVal = parseFloat(val);
    if (!isNaN(parsedVal) && parsedVal >= 0) {
      this.posCart[idx][key] = parsedVal;
      this.calculatePOSBill();
    }
  },

  removeFromCart(idx) {
    this.posCart.splice(idx, 1);
    this.renderCartTable();
    this.calculatePOSBill();
  },

  calculatePOSBill() {
    let metalTotal = 0;
    let makingTotal = 0;
    let stoneTotal = 0;

    this.posCart.forEach(item => {
      const metalAmt = item.netWeight * item.rateApplied;
      let makingAmt = 0;
      if (item.makingChargeType === 'PerGram') makingAmt = item.netWeight * item.makingChargeValue;
      else if (item.makingChargeType === 'Percentage') makingAmt = metalAmt * (item.makingChargeValue / 100);
      else makingAmt = item.makingChargeValue;

      const wastageAmt = metalAmt * (item.wastagePercent / 100);

      metalTotal += (metalAmt + wastageAmt);
      makingTotal += makingAmt;
      stoneTotal += item.stoneCharges;
    });

    const subTotal = metalTotal + makingTotal + stoneTotal;

    // Adjustments
    const goldAdj = this.oldGoldAppliedObj ? this.oldGoldAppliedObj.value : 0;
    const schemeAdj = this.schemeRedeemedObj ? this.schemeRedeemedObj.value : 0;
    const discount = parseFloat(document.getElementById('pos-discount').value) || 0;

    // Net taxable
    const taxable = Math.max(0, subTotal - goldAdj - schemeAdj - discount);

    // GST (CGST 1.5%, SGST 1.5%)
    const cgst = taxable * 0.015;
    const sgst = taxable * 0.015;
    
    // Net Payable (rounded off)
    const netRaw = taxable + cgst + sgst;
    const netPayable = Math.round(netRaw);
    const roundOff = netPayable - netRaw;

    // Update Label UI
    document.getElementById('pos-lbl-metal').textContent = `₹${metalTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('pos-lbl-making').textContent = `₹${makingTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('pos-lbl-stones').textContent = `₹${stoneTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('pos-lbl-subtotal').textContent = `₹${subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('pos-lbl-oldgold').textContent = `₹${goldAdj.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('pos-lbl-scheme').textContent = `₹${schemeAdj.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    document.getElementById('pos-lbl-taxable').textContent = `₹${taxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('pos-lbl-cgst').textContent = `₹${cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('pos-lbl-sgst').textContent = `₹${sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById('pos-lbl-net').textContent = `₹${netPayable.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

    // Adjust Payments split list
    // Pre-populate single row payments if list empty
    if (this.posPayments.length === 0) {
      this.posPayments = [{ mode: 'Cash', amount: netPayable }];
    } else {
      // Re-sum outstanding
      const currentPaid = this.posPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      if (this.posPayments.length === 1) {
        this.posPayments[0].amount = netPayable;
      }
    }
    
    this.renderPaymentsSplit(netPayable);
  },

  renderPaymentsSplit(netPayable) {
    const list = document.getElementById('pos-payments-list');
    list.innerHTML = '';

    let sum = 0;
    this.posPayments.forEach((p, idx) => {
      sum += p.amount || 0;
      list.innerHTML += `
        <div style="display:flex; gap:6px; align-items:center;">
          <select class="form-control pos-payment-mode" style="width:120px;" onchange="SalesModule.updatePaymentRow(${idx}, 'mode', this.value)">
            <option value="Cash" ${p.mode === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="UPI" ${p.mode === 'UPI' ? 'selected' : ''}>UPI</option>
            <option value="Card" ${p.mode === 'Card' ? 'selected' : ''}>Card</option>
            <option value="Bank" ${p.mode === 'Bank' ? 'selected' : ''}>Bank Transfer</option>
            <option value="Credit" ${p.mode === 'Credit' ? 'selected' : ''}>Pending (Credit)</option>
          </select>
          <input type="number" class="form-control pos-payment-amount" style="flex-grow:1;" value="${p.amount}" oninput="SalesModule.updatePaymentRow(${idx}, 'amount', this.value)"/>
          ${this.posPayments.length > 1 ? `<button class="btn btn-danger btn-sm btn-icon" onclick="SalesModule.removePaymentRow(${idx})"><i class="fa fa-times"></i></button>` : ''}
        </div>
      `;
    });

    const remaining = netPayable - sum;
    const remainingLbl = document.getElementById('pos-lbl-remaining');
    remainingLbl.textContent = `₹${remaining.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    if (remaining === 0) {
      remainingLbl.style.color = 'var(--success)';
    } else {
      remainingLbl.style.color = 'var(--danger)';
    }
  },

  updatePaymentRow(idx, key, val) {
    if (key === 'amount') {
      this.posPayments[idx][key] = parseFloat(val) || 0;
    } else {
      this.posPayments[idx][key] = val;
    }
    const net = parseFloat(document.getElementById('pos-lbl-net').textContent.replace(/[₹,]/g, ''));
    this.renderPaymentsSplit(net);
  },

  addPOSPaymentRow() {
    this.posPayments.push({ mode: 'Cash', amount: 0 });
    const net = parseFloat(document.getElementById('pos-lbl-net').textContent.replace(/[₹,]/g, ''));
    this.renderPaymentsSplit(net);
  },

  removePaymentRow(idx) {
    this.posPayments.splice(idx, 1);
    const net = parseFloat(document.getElementById('pos-lbl-net').textContent.replace(/[₹,]/g, ''));
    this.renderPaymentsSplit(net);
  },

  showOldGoldAdjustmentModal() {
    if (!this.posCustomer) {
      UI.toast("Please select customer first", "warning");
      return;
    }

    // Load available old golds for this customer
    const oldGolds = DB.get('jw_old_gold').filter(og => og.customerId === this.posCustomer.id && !og.linkedInvoiceId);
    
    if (oldGolds.length === 0) {
      UI.toast("No pending Old Gold purchases found for this customer. Enter Old Gold under Exchange menu first.", "warning");
      return;
    }

    const html = `
      <div class="form-group">
        <label class="form-label">Select old gold purchase receipt adjust against this bill</label>
        <select id="adj-gold-select" class="form-control">
          <option value="">Select Receipt</option>
          ${oldGolds.map(og => `<option value="${og.id}">${og.description} - Value: ₹${og.totalAmount.toLocaleString('en-IN')}</option>`).join('')}
        </select>
      </div>
    `;

    UI.modal("Adjust Old Gold Exchange", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Adjust Against Bill", className: "btn btn-accent", action: () => {
        const ogId = Number(document.getElementById('adj-gold-select').value);
        if (!ogId) {
          UI.toast("Please select old gold record", "warning");
          return;
        }

        const og = DB.getById('jw_old_gold', ogId);
        this.oldGoldAppliedObj = { id: og.id, value: og.totalAmount };
        
        UI.toast(`Adjusted ₹${og.totalAmount} from invoice`);
        UI.closeModal();
        this.calculatePOSBill();
      }}
    ]);
  },

  showSchemeAdjustmentModal() {
    if (!this.posCustomer) {
      UI.toast("Please select customer first", "warning");
      return;
    }

    const enrolls = DB.get('jw_enrollments').filter(e => e.customerId === this.posCustomer.id && e.status === 'Matured');
    const schemes = DB.get('jw_schemes');
    const installments = DB.get('jw_installments');

    if (enrolls.length === 0) {
      UI.toast("No matured scheme accounts found for this customer.", "warning");
      return;
    }

    const html = `
      <div class="form-group">
        <label class="form-label">Select Matured Scheme to Redeem</label>
        <select id="adj-scheme-select" class="form-control">
          <option value="">Select Account</option>
          ${enrolls.map(e => {
            const sch = schemes.find(s => s.id === e.schemeId);
            const paid = installments.filter(ins => ins.enrollmentId === e.id).reduce((sum, ins) => sum + ins.amount, 0);
            const bonusVal = sch?.bonusMonth ? e.monthlyAmount : 0;
            const total = paid + bonusVal;
            return `<option value="${e.id}" data-total="${total}">${sch?.name} - Value: ₹${total.toLocaleString('en-IN')}</option>`;
          }).join('')}
        </select>
      </div>
    `;

    UI.modal("Redeem Matured Savings Scheme", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Redeem Against Bill", className: "btn btn-accent", action: () => {
        const enrollId = Number(document.getElementById('adj-scheme-select').value);
        if (!enrollId) {
          UI.toast("Please select enrollment account", "warning");
          return;
        }

        const option = document.querySelector(`#adj-scheme-select option[value="${enrollId}"]`);
        const value = parseFloat(option.getAttribute('data-total'));

        this.schemeRedeemedObj = { id: enrollId, value };

        UI.toast(`Redeemed ₹${value} from savings scheme`);
        UI.closeModal();
        this.calculatePOSBill();
      }}
    ]);
  },

  submitPOSInvoice() {
    if (this.posCart.length === 0) {
      UI.toast("Cart is empty", "warning");
      return;
    }
    if (!this.posCustomer) {
      UI.toast("Please select a customer profile", "warning");
      return;
    }

    // Verify payments sum matches net payable
    const netPayable = parseFloat(document.getElementById('pos-lbl-net').textContent.replace(/[₹,]/g, ''));
    const totalPaid = this.posPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = netPayable - totalPaid;

    if (remaining !== 0) {
      UI.toast(`Split payments sum must exactly equal net payable (Variance: ₹${remaining})`, "warning");
      return;
    }

    // 1. Compile summary figures
    let metalAmtSum = 0;
    let makingAmtSum = 0;
    let stoneAmtSum = 0;

    this.posCart.forEach(item => {
      const metalAmt = item.netWeight * item.rateApplied;
      let makingAmt = 0;
      if (item.makingChargeType === 'PerGram') makingAmt = item.netWeight * item.makingChargeValue;
      else if (item.makingChargeType === 'Percentage') makingAmt = metalAmt * (item.makingChargeValue / 100);
      else makingAmt = item.makingChargeValue;

      const wastageAmt = metalAmt * (item.wastagePercent / 100);

      metalAmtSum += (metalAmt + wastageAmt);
      makingAmtSum += makingAmt;
      stoneAmtSum += item.stoneCharges;
    });

    const subTotal = metalAmtSum + makingAmtSum + stoneAmtSum;
    const oldGoldExchangeAmount = this.oldGoldAppliedObj ? this.oldGoldAppliedObj.value : 0;
    const discount = parseFloat(document.getElementById('pos-discount').value) || 0;
    const taxableAmount = Math.max(0, subTotal - oldGoldExchangeAmount - (this.schemeRedeemedObj ? this.schemeRedeemedObj.value : 0) - discount);
    const cgstAmount = taxableAmount * 0.015;
    const sgstAmount = taxableAmount * 0.015;
    const roundOff = netPayable - (taxableAmount + cgstAmount + sgstAmount);

    // Auto Invoice code: JW-YYYY-NNNN
    const invoices = DB.get('jw_invoices');
    const currentYear = new Date().getFullYear();
    const count = invoices.length + 1;
    const invoiceNo = `JW-${currentYear}-${String(count).padStart(4, '0')}`;

    // Determine Payment status
    const creditPayment = this.posPayments.find(p => p.mode === 'Credit');
    const paymentStatus = creditPayment ? (creditPayment.amount === netPayable ? 'Pending' : 'Partial') : 'Paid';

    // 2. Insert Invoice
    const newInvoice = DB.insert('jw_invoices', {
      invoiceNo,
      customerId: this.posCustomer.id,
      invoiceDate: new Date().toISOString().split('T')[0],
      salespersonId: Auth.getCurrentUser().userId,
      metalAmount: metalAmtSum,
      makingCharges: makingAmtSum,
      stoneAmount: stoneAmtSum,
      subTotal,
      oldGoldExchangeAmount,
      discount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      roundOff,
      netAmount: netPayable,
      paymentStatus
    });

    // 3. Insert Invoice Items & Update Product Status to Sold
    this.posCart.forEach(item => {
      // Calculate item total
      const metalAmt = item.netWeight * item.rateApplied;
      let makingAmt = 0;
      if (item.makingChargeType === 'PerGram') makingAmt = item.netWeight * item.makingChargeValue;
      else if (item.makingChargeType === 'Percentage') makingAmt = metalAmt * (item.makingChargeValue / 100);
      else makingAmt = item.makingChargeValue;

      const wastageAmt = metalAmt * (item.wastagePercent / 100);
      const itemTotal = Math.round(metalAmt + makingAmt + wastageAmt + item.stoneCharges);

      DB.insert('jw_invoice_items', {
        invoiceId: newInvoice.id,
        productId: item.id,
        description: item.designName,
        weight: item.grossWeight,
        rate: item.rateApplied,
        metalAmount: metalAmt + wastageAmt,
        makingCharges: makingAmt,
        stoneAmount: item.stoneCharges,
        totalAmount: itemTotal
      });

      // Update Product status to Sold
      DB.update('jw_products', item.id, { status: 'Sold' });
    });

    // 4. Save Payment records
    this.posPayments.forEach(p => {
      if (p.amount > 0) {
        DB.insert('jw_payments', {
          invoiceId: newInvoice.id,
          entityType: 'Invoice',
          mode: p.mode,
          amount: p.amount,
          refNo: `POS-PAY-${newInvoice.id}`,
          paymentDate: new Date().toISOString().split('T')[0]
        });
      }
    });

    // 5. If Old Gold applied, update old gold record to link this invoice
    if (this.oldGoldAppliedObj) {
      DB.update('jw_old_gold', this.oldGoldAppliedObj.id, { linkedInvoiceId: newInvoice.id });
    }

    // 6. If scheme redeemed, update enrollment status to Redeemed
    if (this.schemeRedeemedObj) {
      DB.update('jw_enrollments', this.schemeRedeemedObj.id, { status: 'Redeemed' });
    }

    // 7. Update Customer Loyalty Points (1 point per ₹100 net invoice amount)
    const pointsEarned = Math.floor(netPayable / 100);
    DB.update('jw_customers', this.posCustomer.id, {
      loyaltyPoints: this.posCustomer.loyaltyPoints + pointsEarned
    });

    // Write Ledger Accounts (Customer Account Debit entry)
    DB.insert('jw_ledger', {
      entityType: 'Customer',
      entityId: this.posCustomer.id,
      type: 'Debit',
      amount: netPayable,
      description: `Sales invoice #${invoiceNo}`,
      date: new Date().toISOString().split('T')[0]
    });

    // Post credits inside ledger for payment modes
    this.posPayments.forEach(p => {
      if (p.amount > 0 && p.mode !== 'Credit') {
        DB.insert('jw_ledger', {
          entityType: 'Customer',
          entityId: this.posCustomer.id,
          type: 'Credit',
          amount: p.amount,
          description: `Payment received mode ${p.mode} against invoice #${invoiceNo}`,
          date: new Date().toISOString().split('T')[0]
        });
      }
    });

    UI.toast(`Invoice ${invoiceNo} completed successfully!`, "success");
    
    // Redirect to Invoice detail view to print receipt
    Router.navigate('sales', 'invoice-list', { view: newInvoice.id });
  },

  renderInvoiceList(container) {
    const list = DB.get('jw_invoices');
    const customers = DB.get('jw_customers');

    container.innerHTML = `
      <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
        <div class="filter-bar">
          <div class="filter-controls">
            <input type="text" id="inv-search" class="form-control" placeholder="Invoice No or Customer..." style="width:240px;" />
          </div>
        </div>
        <div id="invoices-table-container"></div>
      </div>
    `;

    const drawTable = () => {
      const q = document.getElementById('inv-search').value.toLowerCase();
      
      const filtered = list.filter(inv => {
        const custName = customers.find(c => c.id === inv.customerId)?.name || 'Walk-in';
        return inv.invoiceNo.toLowerCase().includes(q) || custName.toLowerCase().includes(q);
      });

      // Sort by id desc
      filtered.sort((a,b) => b.id - a.id);

      UI.renderTable({
        containerId: 'invoices-table-container',
        columns: [
          { label: 'Invoice No', key: 'invoiceNo' },
          { label: 'Date', key: 'invoiceDate' },
          { label: 'Customer', render: (row) => customers.find(c => c.id === row.customerId)?.name || 'Walk-in' },
          { label: 'Net Payable', render: (row) => `₹${row.netAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}` },
          { label: 'Payment', render: (row) => `<span class="badge ${row.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${row.paymentStatus || 'Paid'}</span>` }
        ],
        data: filtered,
        actions: (row) => `
          <button class="btn btn-secondary btn-sm btn-icon" onclick="Router.navigate('sales', 'invoice-list', {view: ${row.id}})" title="View Invoice"><i class="fa fa-eye"></i></button>
        `
      });
    };

    document.getElementById('inv-search').oninput = drawTable;
    drawTable();
  },

  renderInvoiceDetail(container, invoiceId) {
    const inv = DB.getById('jw_invoices', invoiceId);
    if (!inv) {
      container.innerHTML = `<h3>Invoice record #${invoiceId} not found</h3>`;
      return;
    }

    const customer = DB.getById('jw_customers', inv.customerId);
    const shop = DB.get('jw_shop_profile') || { name: 'Aura Showroom', address: '101 Mg Road, Mumbai', phone: '9876543200', gstin: '27AADCB1234F1Z0' };
    const items = DB.get('jw_invoice_items').filter(it => it.invoiceId === inv.id);
    const payments = DB.get('jw_payments').filter(p => p.invoiceId === inv.id && p.entityType === 'Invoice');

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="font-weight:600;">Invoice Overview: ${inv.invoiceNo}</h3>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary btn-sm" onclick="window.print()"><i class="fa fa-print"></i> Print Bill</button>
          <button class="btn btn-secondary btn-sm" onclick="Router.navigate('sales', 'invoice-list')"><i class="fa fa-arrow-left"></i> Back to Directory</button>
        </div>
      </div>

      <!-- Detail Card -->
      <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:24px; margin-bottom:24px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:0.85rem; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:16px;">
          <div>
            <div><strong>Shop:</strong> ${shop.name}</div>
            <div><strong>GSTIN:</strong> ${shop.gstin}</div>
            <div><strong>Date:</strong> ${inv.invoiceDate}</div>
          </div>
          <div>
            <div><strong>Bill To Customer:</strong> ${customer ? customer.name : 'Walk-in'}</div>
            <div><strong>Phone:</strong> ${customer ? customer.phone : '-'}</div>
            <div><strong>PAN Card:</strong> ${customer?.pan || '-'}</div>
          </div>
        </div>

        <table class="data-table" style="font-size:0.8rem; margin-bottom:20px;">
          <thead>
            <tr>
              <th>Description</th>
              <th>Weight</th>
              <th>Rate applied</th>
              <th>Metal Amt</th>
              <th>Making Charge</th>
              <th>Stone Amt</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td>${it.description}</td>
                <td>${it.weight.toFixed(3)}g</td>
                <td>₹${it.rate.toFixed(2)}</td>
                <td>₹${it.metalAmount.toFixed(0)}</td>
                <td>₹${it.makingCharges.toFixed(0)}</td>
                <td>₹${it.stoneAmount.toFixed(0)}</td>
                <td><strong>₹${it.totalAmount.toLocaleString('en-IN')}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Breakdowns -->
        <div style="display:flex; justify-content:flex-end; font-size:0.85rem;">
          <div style="width:300px; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between;"><span>Sub Total</span><span>₹${inv.subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
            <div style="display:flex; justify-content:space-between; color:var(--text-muted);"><span>Old Gold Adjusted</span><span>- ₹${inv.oldGoldExchangeAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
            <div style="display:flex; justify-content:space-between; color:var(--text-muted);"><span>Discounts applied</span><span>- ₹${inv.discount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:600;"><span>Taxable Total</span><span>₹${inv.taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
            <div style="display:flex; justify-content:space-between; color:var(--text-muted);"><span>CGST (1.5%)</span><span>₹${inv.cgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
            <div style="display:flex; justify-content:space-between; color:var(--text-muted);"><span>SGST (1.5%)</span><span>₹${inv.sgstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
            <div style="display:flex; justify-content:space-between; color:var(--text-muted);"><span>Round Off</span><span>₹${inv.roundOff.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; border-top:1px solid #000; padding-top:6px; font-weight:800; font-size:1.1rem; color:var(--accent);">
              <span>NET PAYABLE</span>
              <span>₹${inv.netAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoice print wrapper hidden from screen UI, visible on window.print() -->
      <div class="print-area">
        <div style="text-align:center; margin-bottom:20px;">
          <h2>${shop.name.toUpperCase()}</h2>
          <div style="font-size:0.75rem;">${shop.address} | Phone: ${shop.phone}</div>
          <div style="font-size:0.75rem;">GSTIN: ${shop.gstin}</div>
          <div style="margin-top:10px; font-weight:700; border-top:1px solid #000; border-bottom:1px solid #000; padding:4px 0;">TAX INVOICE</div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:14px;">
          <div>
            <div><strong>Invoice No:</strong> ${inv.invoiceNo}</div>
            <div><strong>Date:</strong> ${inv.invoiceDate}</div>
          </div>
          <div style="text-align:right;">
            <div><strong>Bill To:</strong> ${customer ? customer.name : 'Walk-in'}</div>
            <div><strong>Phone:</strong> ${customer ? customer.phone : '-'}</div>
            ${customer?.pan ? `<div><strong>PAN:</strong> ${customer.pan}</div>` : ''}
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:0.75rem; margin-bottom:14px; text-align:left;">
          <thead>
            <tr style="border-top:1px solid #000; border-bottom:1px solid #000;">
              <th style="padding:6px 0;">Item Description</th>
              <th>Weight</th>
              <th>Rate</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td style="padding:6px 0;">${it.description}</td>
                <td>${it.weight.toFixed(3)}g</td>
                <td>₹${it.rate.toFixed(0)}</td>
                <td style="text-align:right;">₹${it.totalAmount.toFixed(0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display:flex; justify-content:flex-end; font-size:0.8rem;">
          <div style="width:240px; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between;"><span>Sub Total</span><span>₹${inv.subTotal.toFixed(0)}</span></div>
            ${inv.oldGoldExchangeAmount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Old Gold Exchange (-)</span><span>₹${inv.oldGoldExchangeAmount.toFixed(0)}</span></div>` : ''}
            ${inv.discount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Discount (-)</span><span>₹${inv.discount.toFixed(0)}</span></div>` : ''}
            <div style="display:flex; justify-content:space-between; font-weight:700;"><span>Taxable Amt</span><span>₹${inv.taxableAmount.toFixed(0)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>CGST 1.5%</span><span>₹${inv.cgstAmount.toFixed(0)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>SGST 1.5%</span><span>₹${inv.sgstAmount.toFixed(0)}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid #000; padding-top:4px; font-size:0.95rem;">
              <span>NET PAYABLE</span>
              <span>₹${inv.netAmount.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div style="margin-top:20px; font-size:0.7rem; border-top:1px dashed #000; padding-top:10px;">
          <div><strong>Payment Details:</strong></div>
          ${payments.map(p => `<div>Mode: ${p.mode} - Paid: ₹${p.amount.toFixed(0)}</div>`).join('')}
          <div style="margin-top:10px; font-style:italic; text-align:center;">Thank you for shopping with us!</div>
        </div>
      </div>
    `;
  },

  renderReturns(container) {
    container.innerHTML = `
      <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px; display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Left form -->
        <div style="background:#fafafa; border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px;">
          <h4 style="font-weight:600; margin-bottom:12px;">File Sales Return</h4>
          <form id="return-form">
            <div class="form-group">
              <label class="form-label">Search Invoice No <span class="required">*</span></label>
              <select id="return-invoice-select" class="form-control" required style="width:100%;">
                <option value="">Select Invoice</option>
                ${DB.get('jw_invoices').map(i => `<option value="${i.id}">${i.invoiceNo}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Select Item to Return <span class="required">*</span></label>
              <select id="return-item-select" class="form-control" required disabled>
                <option value="">Select Item</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Reason for Return</label>
              <input type="text" id="return-reason" class="form-control" placeholder="e.g. Size misfit" />
            </div>
            <div class="form-group">
              <label class="form-label">Refund Mode</label>
              <select id="return-mode" class="form-control">
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Store Credit">Store Credit Note</option>
              </select>
            </div>
            <button type="submit" class="btn btn-danger btn-sm" style="width:100%;">Process Return Refund</button>
          </form>
        </div>

        <!-- Right history -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:16px;">
          <h4 style="font-weight:600; margin-bottom:12px;">Past Return Logs</h4>
          <div id="returns-table-container"></div>
        </div>
      </div>
    `;

    const selectInv = document.getElementById('return-invoice-select');
    const selectItem = document.getElementById('return-item-select');

    selectInv.onchange = () => {
      const invId = Number(selectInv.value);
      if (!invId) {
        selectItem.disabled = true;
        selectItem.innerHTML = `<option value="">Select Item</option>`;
        return;
      }

      const items = DB.get('jw_invoice_items').filter(it => it.invoiceId === invId);
      selectItem.innerHTML = `<option value="">Select Item</option>` + items.map(it => `<option value="${it.productId}">${it.description} (Value: ₹${it.totalAmount.toLocaleString('en-IN')})</option>`).join('');
      selectItem.disabled = false;
    };

    // Form Submit
    document.getElementById('return-form').onsubmit = (e) => {
      e.preventDefault();
      const invoiceId = Number(selectInv.value);
      const productId = Number(selectItem.value);
      const reason = document.getElementById('return-reason').value;
      const refundMode = document.getElementById('return-mode').value;

      if (!invoiceId || !productId) {
        UI.toast("Please select invoice and item", "warning");
        return;
      }

      // 1. Get amount paid
      const items = DB.get('jw_invoice_items').filter(it => it.invoiceId === invoiceId);
      const matched = items.find(it => it.productId === productId);
      const refundAmount = matched ? matched.totalAmount : 0;

      // 2. Mark product status back to InStock
      DB.update('jw_products', productId, { status: 'InStock' });

      // 3. Save Sales Return record
      DB.insert('jw_returns', {
        invoiceId,
        productId,
        reason,
        refundAmount,
        refundMode,
        returnDate: new Date().toISOString().split('T')[0]
      });

      // Write Ledger Accounts (Customer Account Credit entry)
      const inv = DB.getById('jw_invoices', invoiceId);
      DB.insert('jw_ledger', {
        entityType: 'Customer',
        entityId: inv.customerId,
        type: 'Credit',
        amount: refundAmount,
        description: `Sales Return on Invoice #${inv.invoiceNo} - Product: ${matched?.description}`,
        date: new Date().toISOString().split('T')[0]
      });

      UI.toast("Sales return processed. Product added back to In-Stock.", "success");
      Router.handleRouting();
    };

    // Draw returns log
    const returnsList = DB.get('jw_returns');
    const products = DB.get('jw_products');
    const invoices = DB.get('jw_invoices');
    const sorted = [...returnsList].sort((a,b) => b.id - a.id);

    UI.renderTable({
      containerId: 'returns-table-container',
      columns: [
        { label: 'Date', key: 'returnDate' },
        { label: 'Invoice No', render: (row) => invoices.find(i => i.id === row.invoiceId)?.invoiceNo || 'Unknown' },
        { label: 'Product Name', render: (row) => products.find(p => p.id === row.productId)?.designName || 'Unknown' },
        { label: 'Refund (₹)', render: (row) => `₹${row.refundAmount.toLocaleString('en-IN')}` },
        { label: 'Reason', key: 'reason' }
      ],
      data: sorted
    });
  }
};

// 5. APPROVALS & CUSTOM ORDERS
const OrdersModule = {
  render(container, subModule, params) {
    if (!subModule) {
      Router.navigate('orders', 'approvals');
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="display:flex; gap:16px; align-items:center;">
          <h2 style="font-weight:600; font-size:1.4rem;">Special Orders</h2>
          <div style="display:flex; gap:4px; background:#fff; padding:4px; border-radius:var(--radius-sm); border:1px solid var(--border);">
            <a class="btn btn-secondary btn-sm ${subModule === 'approvals' ? 'btn-accent' : ''}" style="border:none;" href="#orders/approvals"><i class="fa fa-scale-unbalanced"></i> Trial Approvals</a>
            <a class="btn btn-secondary btn-sm ${subModule === 'custom' ? 'btn-accent' : ''}" style="border:none;" href="#orders/custom"><i class="fa-solid fa-gem"></i> Custom Orders</a>
          </div>
        </div>
      </div>
      <div id="orders-module-content"></div>
    `;

    const content = document.getElementById('orders-module-content');
    if (subModule === 'approvals') {
      this.renderApprovals(content);
    } else if (subModule === 'custom') {
      this.renderCustomOrders(content);
    }
  },

  renderApprovals(container) {
    const list = DB.get('jw_approvals');
    const customers = DB.get('jw_customers');
    const products = DB.get('jw_products');
    const productsInStock = products.filter(p => p.status === 'InStock');

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Form -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Issue Trial Approval</h4>
          <form id="approval-form">
            <div class="form-group">
              <label class="form-label">Select Customer <span class="required">*</span></label>
              <select id="app-customer" class="form-control" required style="width:100%;">
                <option value="">Select Customer</option>
                ${customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Select Item Code (InStock) <span class="required">*</span></label>
              <select id="app-product" class="form-control" required style="width:100%;">
                <option value="">Select Product</option>
                ${productsInStock.map(p => `<option value="${p.id}">${p.itemCode} - ${p.designName}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Expected Return Date</label>
              <input type="date" id="app-exp-date" class="form-control" required value="${new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]}" />
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Issue Approval Note</button>
          </form>
        </div>

        <!-- Log List -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Active trial records</h4>
          <div id="approvals-table-container"></div>
        </div>
      </div>
    `;

    // Form Submit
    document.getElementById('approval-form').onsubmit = (e) => {
      e.preventDefault();
      const customerId = Number(document.getElementById('app-customer').value);
      const productId = Number(document.getElementById('app-product').value);
      const expectedReturnDate = document.getElementById('app-exp-date').value;

      if (!customerId || !productId) {
        UI.toast("Please fill in required fields", "warning");
        return;
      }

      // Mark product status as OnApproval
      DB.update('jw_products', productId, { status: 'OnApproval' });

      DB.insert('jw_approvals', {
        customerId,
        productId,
        issueDate: new Date().toISOString().split('T')[0],
        expectedReturnDate,
        status: 'Pending'
      });

      UI.toast("Approval note saved successfully");
      Router.handleRouting();
    };

    // Draw active trial approvals
    const sorted = [...list].sort((a,b) => b.id - a.id);
    UI.renderTable({
      containerId: 'approvals-table-container',
      columns: [
        { label: 'Customer', render: (row) => customers.find(c => c.id === row.customerId)?.name || 'Unknown' },
        { label: 'Item Code', render: (row) => products.find(p => p.id === row.productId)?.itemCode || 'Unknown' },
        { label: 'Expected Return', key: 'expectedReturnDate' },
        { label: 'Status', render: (row) => `<span class="badge ${row.status === 'Returned' ? 'badge-secondary' : (row.status === 'Purchased' ? 'badge-success' : 'badge-warning')}">${row.status}</span>` }
      ],
      data: sorted,
      actions: (row) => {
        if (row.status === 'Pending') {
          return `
            <button class="btn btn-accent btn-xs btn-sm" onclick="OrdersModule.buyApproval(${row.id})"><i class="fa fa-shopping-cart"></i> Buy</button>
            <button class="btn btn-danger btn-xs btn-sm" onclick="OrdersModule.returnApproval(${row.id})"><i class="fa fa-rotate-left"></i> Return</button>
          `;
        }
        return `-`;
      }
    });
  },

  buyApproval(approvalId) {
    const app = DB.getById('jw_approvals', approvalId);
    if (!app) return;

    // 1. Mark approval log as Purchased
    DB.update('jw_approvals', approvalId, { status: 'Purchased' });

    // 2. Revert status back to InStock temporarily to allow POS search to load it!
    DB.update('jw_products', app.productId, { status: 'InStock' });

    // 3. Open sale POS
    UI.toast("Redirecting to Checkout", "info");
    Router.navigate('sales', 'new-invoice', { customerId: app.customerId });
    setTimeout(() => {
      SalesModule.addToCart(app.productId);
    }, 200);
  },

  returnApproval(approvalId) {
    const app = DB.getById('jw_approvals', approvalId);
    if (!app) return;

    // 1. Mark approval log as Returned
    DB.update('jw_approvals', approvalId, { status: 'Returned' });

    // 2. Return product back to InStock
    DB.update('jw_products', app.productId, { status: 'InStock' });

    UI.toast("Item returned back to inventory stock");
    Router.handleRouting();
  },

  renderCustomOrders(container) {
    const list = DB.get('jw_custom_orders');
    const customers = DB.get('jw_customers');
    const metals = DB.get('jw_metals');
    const purities = DB.get('jw_purities');
    const suppliers = DB.get('jw_suppliers').filter(s => s.type === 'Karigar');

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Left form -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">New Custom Design Order</h4>
          <form id="custom-order-form">
            <div class="form-group">
              <label class="form-label">Select Customer <span class="required">*</span></label>
              <select id="cust-ord-customer" class="form-control" required style="width:100%;">
                <option value="">Select Customer</option>
                ${customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Design Specifications Description <span class="required">*</span></label>
              <input type="text" id="cust-ord-desc" class="form-control" placeholder="e.g. Bridal Choker custom layout" required />
            </div>
            <div class="form-group">
              <label class="form-label">Metal Group <span class="required">*</span></label>
              <select id="cust-ord-metal" class="form-control" required>
                <option value="">Select Metal</option>
                ${metals.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Purity <span class="required">*</span></label>
              <select id="cust-ord-purity" class="form-control" required disabled>
                <option value="">Select Purity</option>
              </select>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Est. Weight (grams) <span class="required">*</span></label>
                <input type="number" step="0.001" min="0" id="cust-ord-weight" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label">Advance Deposit Paid (₹) <span class="required">*</span></label>
                <input type="number" id="cust-ord-advance" class="form-control" required value="0" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Assign Karigar Maker <span class="required">*</span></label>
              <select id="cust-ord-karigar" class="form-control" required>
                <option value="">Select Karigar</option>
                ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Expected Delivery Date</label>
              <input type="date" id="cust-ord-delivery" class="form-control" required value="${new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]}" />
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Create Custom Order</button>
          </form>
        </div>

        <!-- Right list -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <h4 style="font-weight:600; margin-bottom:16px;">Design orders tracker</h4>
          <div id="custom-orders-table-container"></div>
        </div>
      </div>
    `;

    // Filter purity
    const metalSelect = document.getElementById('cust-ord-metal');
    const puritySelect = document.getElementById('cust-ord-purity');
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

    // Form Submit
    document.getElementById('custom-order-form').onsubmit = (e) => {
      e.preventDefault();
      const customerId = Number(document.getElementById('cust-ord-customer').value);
      const description = document.getElementById('cust-ord-desc').value;
      const metalId = Number(metalSelect.value);
      const purityId = Number(puritySelect.value);
      const estimatedWeight = parseFloat(document.getElementById('cust-ord-weight').value);
      const advanceAmount = parseFloat(document.getElementById('cust-ord-advance').value) || 0;
      const karigarId = Number(document.getElementById('cust-ord-karigar').value);
      const expectedDeliveryDate = document.getElementById('cust-ord-delivery').value;

      if (!customerId || !metalId || !purityId || isNaN(estimatedWeight) || !karigarId) {
        UI.toast("Please fill in required fields", "warning");
        return;
      }

      DB.insert('jw_custom_orders', {
        customerId,
        description,
        metalId,
        purityId,
        estimatedWeight,
        advanceAmount,
        karigarId,
        expectedDeliveryDate,
        orderDate: new Date().toISOString().split('T')[0],
        status: 'InProgress'
      });

      // Post advance payment to payments as ledger entry? Or handle at POS checkout.
      UI.toast("Custom Design order created and Karigar assigned!");
      Router.handleRouting();
    };

    // Render list
    const sorted = [...list].sort((a,b) => b.id - a.id);
    UI.renderTable({
      containerId: 'custom-orders-table-container',
      columns: [
        { label: 'Customer', render: (row) => customers.find(c => c.id === row.customerId)?.name || 'Unknown' },
        { label: 'Description', key: 'description' },
        { label: 'Est Weight', render: (row) => `${row.estimatedWeight.toFixed(3)}g` },
        { label: 'Advance (₹)', render: (row) => `₹${row.advanceAmount.toLocaleString('en-IN')}` },
        { label: 'Karigar Maker', render: (row) => suppliers.find(s => s.id === row.karigarId)?.name || 'Unknown' },
        { label: 'Status', render: (row) => `<span class="badge ${row.status === 'Delivered' ? 'badge-success' : (row.status === 'Ready' ? 'badge-info' : 'badge-warning')}">${row.status}</span>` }
      ],
      data: sorted,
      actions: (row) => {
        if (row.status === 'InProgress') {
          return `<button class="btn btn-accent btn-xs btn-sm" onclick="OrdersModule.markCustomReady(${row.id})"><i class="fa fa-check"></i> Ready</button>`;
        } else if (row.status === 'Ready') {
          return `<button class="btn btn-success btn-xs btn-sm" onclick="OrdersModule.deliverCustomOrder(${row.id})"><i class="fa fa-truck"></i> Deliver</button>`;
        }
        return `-`;
      }
    });
  },

  markCustomReady(id) {
    DB.update('jw_custom_orders', id, { status: 'Ready' });
    UI.toast("Order marked as ready. Notify customer.");
    Router.handleRouting();
  },

  deliverCustomOrder(orderId) {
    const ord = DB.getById('jw_custom_orders', orderId);
    if (!ord) return;

    // 1. Mark custom order as Delivered
    DB.update('jw_custom_orders', orderId, { status: 'Delivered' });

    // 2. Pre-create temporary item to let POS scan/add it!
    const catId = 1; // Default Necklace Category
    const itemCode = `CST-${orderId}-${Date.now().toString().slice(-4)}`;
    
    // Add temporary item to stock
    const tempProduct = DB.insert('jw_products', {
      itemCode,
      categoryId: catId,
      designName: ord.description,
      metalId: ord.metalId,
      purityId: ord.purityId,
      supplierId: ord.karigarId,
      size: '',
      huidCode: '',
      grossWeight: ord.estimatedWeight,
      stoneWeight: 0,
      netWeight: ord.estimatedWeight,
      makingChargeType: 'Fixed',
      makingChargeValue: 0,
      wastagePercent: 0,
      mrp: 100, // POS will override it
      purchaseRate: 0,
      branchId: 1,
      status: 'InStock'
    });

    UI.toast("Opening invoice cart pre-filled with custom product", "info");
    Router.navigate('sales', 'new-invoice', { customerId: ord.customerId });
    setTimeout(() => {
      SalesModule.addToCart(tempProduct.id);
    }, 200);
  }
};

// 6. REPAIRS & SERVICE
const RepairModule = {
  render(container, subModule, params) {
    container.innerHTML = `
      <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px; display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:flex-start;">
        <!-- Left: Raise Repair -->
        <div style="background:#fafafa; border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px;">
          <h4 style="font-weight:600; margin-bottom:12px;">Register Repair Item</h4>
          <form id="repair-form">
            <div class="form-group">
              <label class="form-label">Customer Client <span class="required">*</span></label>
              <select id="rep-customer" class="form-control" required style="width:100%;">
                <option value="">Select Customer</option>
                ${DB.get('jw_customers').map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Item Brought Description <span class="required">*</span></label>
              <input type="text" id="rep-desc" class="form-control" required placeholder="e.g. Broken Gold Chain link repair" />
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Weight Brought (grams) <span class="required">*</span></label>
                <input type="number" step="0.001" min="0" id="rep-weight" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label">Estimated Service (₹)</label>
                <input type="number" min="0" id="rep-charge" class="form-control" value="0" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Repair Type Category <span class="required">*</span></label>
              <select id="rep-type" class="form-control" required>
                <option value="Polish">Polish/Cleaning</option>
                <option value="Resize">Resize Bangle/Ring</option>
                <option value="Stone-setting">Stone-setting</option>
                <option value="Clasp Fix">Clasp Fix</option>
                <option value="Other">Other repair work</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Assign Karigar Workman <span class="required">*</span></label>
              <select id="rep-karigar" class="form-control" required>
                <option value="">Select Karigar</option>
                ${DB.get('jw_suppliers').filter(s => s.type === 'Karigar').map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Expected Return Date</label>
              <input type="date" id="rep-exp-date" class="form-control" required value="${new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]}" />
            </div>
            <button type="submit" class="btn btn-accent btn-sm" style="width:100%;">Create Repair Receipt</button>
          </form>
        </div>

        <!-- Right: Tracker -->
        <div style="background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:16px;">
          <h4 style="font-weight:600; margin-bottom:12px;">Repairs Tracking Log</h4>
          <div id="repairs-table-container"></div>
        </div>
      </div>
    `;

    // Form submit
    document.getElementById('repair-form').onsubmit = (e) => {
      e.preventDefault();
      const customerId = Number(document.getElementById('rep-customer').value);
      const description = document.getElementById('rep-desc').value;
      const receivedWeight = parseFloat(document.getElementById('rep-weight').value);
      const estimatedCharge = parseFloat(document.getElementById('rep-charge').value) || 0;
      const type = document.getElementById('rep-type').value;
      const karigarId = Number(document.getElementById('rep-karigar').value);
      const expectedDeliveryDate = document.getElementById('rep-exp-date').value;

      if (!customerId || !description || isNaN(receivedWeight) || !karigarId) {
        UI.toast("Please fill in repair specifications", "warning");
        return;
      }

      // Format Repair No: RP-YYYY-NNNN
      const repairsList = DB.get('jw_repairs');
      const count = repairsList.length + 1;
      const repairNo = `RP-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

      DB.insert('jw_repairs', {
        repairNo,
        customerId,
        description,
        receivedWeight,
        type,
        estimatedCharge,
        karigarId,
        expectedDeliveryDate,
        receivedDate: new Date().toISOString().split('T')[0],
        status: 'Pending'
      });

      UI.toast("Repair job ticket registered successfully");
      Router.handleRouting();
    };

    // Draw tracker list
    const list = DB.get('jw_repairs');
    const customers = DB.get('jw_customers');
    const suppliers = DB.get('jw_suppliers');
    const sorted = [...list].sort((a,b) => b.id - a.id);

    UI.renderTable({
      containerId: 'repairs-table-container',
      columns: [
        { label: 'Job No', key: 'repairNo' },
        { label: 'Client Customer', render: (row) => customers.find(c => c.id === row.customerId)?.name || 'Unknown' },
        { label: 'Item Description', key: 'description' },
        { label: 'Est Cost', render: (row) => `₹${row.estimatedCharge}` },
        { label: 'Karigar assigned', render: (row) => suppliers.find(s => s.id === row.karigarId)?.name || 'Unknown' },
        { label: 'Status', render: (row) => {
          const badgeClass = row.status === 'Delivered' ? 'badge-success' : (row.status === 'Ready' ? 'badge-info' : (row.status === 'InProgress' ? 'badge-warning' : 'badge-danger'));
          return `<span class="badge ${badgeClass}">${row.status}</span>`;
        }}
      ],
      data: sorted,
      actions: (row) => {
        if (row.status === 'Pending') {
          return `<button class="btn btn-warning btn-xs btn-sm" onclick="RepairModule.updateRepairStatus(${row.id}, 'InProgress')">Start Job</button>`;
        } else if (row.status === 'InProgress') {
          return `<button class="btn btn-info btn-xs btn-sm" onclick="RepairModule.updateRepairStatus(${row.id}, 'Ready')">Mark Ready</button>`;
        } else if (row.status === 'Ready') {
          return `<button class="btn btn-success btn-xs btn-sm" onclick="RepairModule.deliverRepair(${row.id})"><i class="fa fa-truck"></i> Deliver</button>`;
        }
        return `-`;
      }
    });
  },

  updateRepairStatus(id, status) {
    DB.update('jw_repairs', id, { status });
    UI.toast(`Repair status changed to ${status}`);
    Router.handleRouting();
  },

  deliverRepair(repairId) {
    const rep = DB.getById('jw_repairs', repairId);
    if (!rep) return;

    // Prompt payment modal to collect service charge
    const html = `
      <div style="background:#fafafa; border:1px solid var(--border); padding:10px; border-radius:var(--radius-sm); font-size:0.8rem; margin-bottom:14px;">
        <div><strong>Repair Job Ref:</strong> ${rep.repairNo} (${rep.description})</div>
        <div><strong>Service Charge Outstanding:</strong> <strong style="color:var(--accent); font-size:1.1rem;">₹${rep.estimatedCharge}</strong></div>
      </div>
      <form id="rep-deliver-form">
        <div class="form-group">
          <label class="form-label">Payment Mode <span class="required">*</span></label>
          <select id="rep-del-mode" class="form-control" required>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Debit/Credit Card</option>
          </select>
        </div>
      </form>
    `;

    UI.modal("Deliver Repair & Collect Bill", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Collect & Deliver Item", className: "btn btn-success", action: () => {
        const mode = document.getElementById('rep-del-mode').value;
        
        // 1. Update repair status
        DB.update('jw_repairs', repairId, { status: 'Delivered' });

        // 2. Save payment record
        DB.insert('jw_payments', {
          invoiceId: Number(repairId),
          entityType: 'Repair',
          mode,
          amount: rep.estimatedCharge,
          refNo: `REP-PAY-${rep.id}`,
          paymentDate: new Date().toISOString().split('T')[0]
        });

        // Write Ledger Accounts (Customer Account Debit entry for repair bill)
        DB.insert('jw_ledger', {
          entityType: 'Customer',
          entityId: rep.customerId,
          type: 'Debit',
          amount: rep.estimatedCharge,
          description: `Repair service bill #${rep.repairNo}`,
          date: new Date().toISOString().split('T')[0]
        });

        // Write credit for paid repair
        DB.insert('jw_ledger', {
          entityType: 'Customer',
          entityId: rep.customerId,
          type: 'Credit',
          amount: rep.estimatedCharge,
          description: `Service Payment received against repair #${rep.repairNo}`,
          date: new Date().toISOString().split('T')[0]
        });

        UI.toast("Repair job closed and service payment logged");
        UI.closeModal();
        Router.handleRouting();
      }}
    ]);
  }
};

// 7. REPORTS ENGINE
const ReportModule = {
  currentReport: 'sales',

  render(container, subModule, params) {
    container.innerHTML = `
      <div style="display:flex; gap:20px; align-items:flex-start;">
        <!-- Left selectors -->
        <div style="width:200px; flex-shrink:0; background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:10px; display:flex; flex-direction:column; gap:4px;">
          <h5 style="font-weight:600; font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); padding:6px 10px;">Select Report</h5>
          <button class="btn btn-secondary btn-sm" id="btn-rep-sales" style="justify-content:flex-start;" onclick="ReportModule.switchReport('sales')"><i class="fa fa-chart-line"></i> Sales Report</button>
          <button class="btn btn-secondary btn-sm" id="btn-rep-stock" style="justify-content:flex-start;" onclick="ReportModule.switchReport('stock')"><i class="fa fa-warehouse"></i> Stock Report</button>
          <button class="btn btn-secondary btn-sm" id="btn-rep-gst" style="justify-content:flex-start;" onclick="ReportModule.switchReport('gst')"><i class="fa-solid fa-receipt"></i> GST Tax Report</button>
          <button class="btn btn-secondary btn-sm" id="btn-rep-oldgold" style="justify-content:flex-start;" onclick="ReportModule.switchReport('oldgold')"><i class="fa fa-rotate"></i> Old Gold purchases</button>
          <button class="btn btn-secondary btn-sm" id="btn-rep-scheme" style="justify-content:flex-start;" onclick="ReportModule.switchReport('scheme')"><i class="fa fa-piggy-bank"></i> Schemes Report</button>
          <button class="btn btn-secondary btn-sm" id="btn-rep-cust" style="justify-content:flex-start;" onclick="ReportModule.switchReport('cust')"><i class="fa fa-user"></i> Customer Ledger</button>
          <button class="btn btn-secondary btn-sm" id="btn-rep-profit" style="justify-content:flex-start;" onclick="ReportModule.switchReport('profit')"><i class="fa-solid fa-calculator"></i> Profit Estimator</button>
        </div>

        <!-- Right Content report -->
        <div style="flex-grow:1; background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;">
          <!-- Filter Area -->
          <div class="filter-bar" style="border-bottom:1px solid var(--border); padding-bottom:14px; margin-bottom:16px;">
            <div class="filter-controls">
              <label class="form-label" style="margin:0;">Start Date: <input type="date" id="rep-start-date" class="form-control" style="width:140px; display:inline-block; margin-left:6px;"/></label>
              <label class="form-label" style="margin:0; margin-left:10px;">End Date: <input type="date" id="rep-end-date" class="form-control" style="width:140px; display:inline-block; margin-left:6px;"/></label>
              
              <!-- Customer selector for Customer Ledger -->
              <select id="rep-customer-select" class="form-control" style="width:180px; display:none;">
                <option value="">Select Customer</option>
                ${DB.get('jw_customers').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            
            <div style="display:flex; gap:10px;">
              <button class="btn btn-secondary btn-sm" onclick="ReportModule.exportCSV()"><i class="fa fa-file-csv"></i> Export CSV</button>
              <button class="btn btn-primary btn-sm" onclick="window.print()"><i class="fa fa-print"></i> Print Report</button>
            </div>
          </div>
          
          <!-- Content Area -->
          <div id="report-view-content"></div>
        </div>
      </div>
    `;

    // Set default dates (Start of month to today)
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('rep-start-date').value = start.toISOString().split('T')[0];
    document.getElementById('rep-end-date').value = today.toISOString().split('T')[0];

    // Hooks
    document.getElementById('rep-start-date').onchange = () => this.drawActiveReport();
    document.getElementById('rep-end-date').onchange = () => this.drawActiveReport();
    document.getElementById('rep-customer-select').onchange = () => this.drawActiveReport();

    this.switchReport('sales');
  },

  switchReport(reportType) {
    this.currentReport = reportType;
    
    // Toggle active button background
    document.querySelectorAll('[id^="btn-rep-"]').forEach(btn => btn.classList.remove('btn-accent'));
    document.getElementById(`btn-rep-${reportType}`).classList.add('btn-accent');

    // Show customer select only if Customer Ledger
    const selectCust = document.getElementById('rep-customer-select');
    selectCust.style.display = reportType === 'cust' ? 'inline-block' : 'none';

    this.drawActiveReport();
  },

  drawActiveReport() {
    const start = document.getElementById('rep-start-date').value;
    const end = document.getElementById('rep-end-date').value;
    const view = document.getElementById('report-view-content');

    if (this.currentReport === 'sales') {
      const list = DB.get('jw_invoices').filter(i => i.invoiceDate >= start && i.invoiceDate <= end);
      const customers = DB.get('jw_customers');
      
      const totalAmt = list.reduce((sum, i) => sum + i.netAmount, 0);

      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:12px;">Sales Summary (${start} to ${end})</h4>
        <div style="font-size:1.1rem; margin-bottom:16px;">Total Gross Sales: <strong style="color:var(--accent)">₹${totalAmt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong> (${list.length} invoices)</div>
        <div id="report-table-div"></div>
      `;

      UI.renderTable({
        containerId: 'report-table-div',
        columns: [
          { label: 'Invoice No', key: 'invoiceNo' },
          { label: 'Date', key: 'invoiceDate' },
          { label: 'Customer', render: (row) => customers.find(c => c.id === row.customerId)?.name || 'Walk-in' },
          { label: 'Sub Total (₹)', render: (row) => `₹${row.subTotal.toFixed(0)}` },
          { label: 'GST Tax (₹)', render: (row) => `₹${(row.cgstAmount + row.sgstAmount).toFixed(0)}` },
          { label: 'Net Payable (₹)', render: (row) => `₹${row.netAmount.toLocaleString('en-IN')}` }
        ],
        data: list
      });
    } 
    else if (this.currentReport === 'stock') {
      const list = DB.get('jw_products');
      const categories = DB.get('jw_categories');
      const metals = DB.get('jw_metals');

      // Tally categories count
      const counts = {};
      list.forEach(p => { if (p.status === 'InStock') counts[p.categoryId] = (counts[p.categoryId] || 0) + 1; });

      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:12px;">Stock Valuation Report</h4>
        <div style="display:flex; gap:20px; font-size:0.85rem; margin-bottom:16px;">
          <div>In Stock Total Items: <strong>${list.filter(p => p.status === 'InStock').length}</strong></div>
          <div>Sold Items: <strong>${list.filter(p => p.status === 'Sold').length}</strong></div>
        </div>
        <div id="report-table-div"></div>
      `;

      UI.renderTable({
        containerId: 'report-table-div',
        columns: [
          { label: 'Item Code', key: 'itemCode' },
          { label: 'Design Description', key: 'designName' },
          { label: 'Category', render: (row) => categories.find(c => c.id === row.categoryId)?.name || 'Unknown' },
          { label: 'Metal Group', render: (row) => metals.find(m => m.id === row.metalId)?.name || 'Unknown' },
          { label: 'Gross / Net Wt', render: (row) => `${row.grossWeight.toFixed(3)}g / ${row.netWeight.toFixed(3)}g` },
          { label: 'Sale Price (MRP)', render: (row) => `₹${row.mrp.toLocaleString('en-IN')}` },
          { label: 'Status', key: 'status' }
        ],
        data: list
      });
    } 
    else if (this.currentReport === 'gst') {
      const list = DB.get('jw_invoices').filter(i => i.invoiceDate >= start && i.invoiceDate <= end);
      const totalCGST = list.reduce((sum, i) => sum + i.cgstAmount, 0);
      const totalSGST = list.reduce((sum, i) => sum + i.sgstAmount, 0);

      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:12px;">GST Tax Invoices Register</h4>
        <div style="display:flex; gap:30px; font-size:1rem; margin-bottom:16px;">
          <div>Total CGST Collected: <strong>₹${totalCGST.toLocaleString('en-IN', {minimumFractionDigits:2})}</strong></div>
          <div>Total SGST Collected: <strong>₹${totalSGST.toLocaleString('en-IN', {minimumFractionDigits:2})}</strong></div>
          <div>Total Tax Payout: <strong style="color:var(--accent)">₹${(totalCGST + totalSGST).toLocaleString('en-IN', {minimumFractionDigits:2})}</strong></div>
        </div>
        <div id="report-table-div"></div>
      `;

      UI.renderTable({
        containerId: 'report-table-div',
        columns: [
          { label: 'Invoice No', key: 'invoiceNo' },
          { label: 'Date', key: 'invoiceDate' },
          { label: 'Taxable Amount', render: (row) => `₹${row.taxableAmount.toLocaleString('en-IN')}` },
          { label: 'CGST 1.5% (₹)', render: (row) => `₹${row.cgstAmount.toFixed(2)}` },
          { label: 'SGST 1.5% (₹)', render: (row) => `₹${row.sgstAmount.toFixed(2)}` },
          { label: 'Total Tax (₹)', render: (row) => `₹${(row.cgstAmount + row.sgstAmount).toFixed(2)}` }
        ],
        data: list
      });
    }
    else if (this.currentReport === 'oldgold') {
      const list = DB.get('jw_old_gold').filter(og => og.purchaseDate >= start && og.purchaseDate <= end);
      const customers = DB.get('jw_customers');
      const totalAmt = list.reduce((sum, og) => sum + og.totalAmount, 0);
      const totalWt = list.reduce((sum, og) => sum + og.netFineWeight, 0);

      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:12px;">Old Gold Purchases Summary</h4>
        <div style="display:flex; gap:30px; font-size:1rem; margin-bottom:16px;">
          <div>Total Net Fine Weight: <strong>${totalWt.toFixed(3)}g</strong></div>
          <div>Total Valued Payout: <strong style="color:var(--accent)">₹${totalAmt.toLocaleString('en-IN')}</strong></div>
        </div>
        <div id="report-table-div"></div>
      `;

      UI.renderTable({
        containerId: 'report-table-div',
        columns: [
          { label: 'Date', key: 'purchaseDate' },
          { label: 'Client Customer', render: (row) => row.customerId ? (customers.find(c => c.id === row.customerId)?.name || 'Unknown') : 'Walk-in' },
          { label: 'Gross / Net Fine Weight', render: (row) => `${row.grossWeight.toFixed(3)}g / ${row.netFineWeight.toFixed(3)}g` },
          { label: 'Rate Applied', render: (row) => `₹${row.rateApplied}` },
          { label: 'Valuation Total (₹)', render: (row) => `₹${row.totalAmount.toLocaleString('en-IN')}` }
        ],
        data: list
      });
    }
    else if (this.currentReport === 'scheme') {
      const list = DB.get('jw_enrollments');
      const customers = DB.get('jw_customers');
      const schemes = DB.get('jw_schemes');
      const installments = DB.get('jw_installments').filter(ins => ins.paymentDate >= start && ins.paymentDate <= end);
      const totalColl = installments.reduce((sum, ins) => sum + ins.amount, 0);

      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:12px;">Savings Scheme Monthly Collection</h4>
        <div style="font-size:1.1rem; margin-bottom:16px;">Total Collection Sum: <strong style="color:var(--accent)">₹${totalColl.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></div>
        <div id="report-table-div"></div>
      `;

      UI.renderTable({
        containerId: 'report-table-div',
        columns: [
          { label: 'Customer', render: (row) => customers.find(c => c.id === row.customerId)?.name || 'Unknown' },
          { label: 'Scheme Type Name', render: (row) => schemes.find(s => s.id === row.schemeId)?.name || 'Unknown' },
          { label: 'Monthly Instalment', render: (row) => `₹${row.monthlyAmount.toLocaleString('en-IN')}` },
          { label: 'Account Status', key: 'status' }
        ],
        data: list
      });
    }
    else if (this.currentReport === 'cust') {
      const custId = Number(document.getElementById('rep-customer-select').value);
      if (!custId) {
        view.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Please select a customer from dropdown to pull ledger entries.</div>`;
        return;
      }

      const ledger = DB.get('jw_ledger').filter(le => le.entityType === 'Customer' && le.entityId === custId && le.date >= start && le.date <= end);
      
      let runningBalance = 0;
      const dataWithBal = ledger.map(le => {
        if (le.type === 'Debit') runningBalance += le.amount;
        else runningBalance -= le.amount;
        return { ...le, runningBalance };
      });

      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:12px;">Customer Ledger Statement</h4>
        <div style="font-size:1rem; margin-bottom:16px;">Net Outstanding Balance: <strong style="${runningBalance > 0 ? 'color:var(--danger)' : 'color:var(--success)'}">₹${runningBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></div>
        <div id="report-table-div"></div>
      `;

      UI.renderTable({
        containerId: 'report-table-div',
        columns: [
          { label: 'Date', key: 'date' },
          { label: 'Transaction Description', key: 'description' },
          { label: 'Debit (Dr) (₹)', render: (row) => row.type === 'Debit' ? `₹${row.amount.toLocaleString('en-IN')}` : '-' },
          { label: 'Credit (Cr) (₹)', render: (row) => row.type === 'Credit' ? `₹${row.amount.toLocaleString('en-IN')}` : '-' },
          { label: 'Balance Outstanding', render: (row) => `₹${row.runningBalance.toLocaleString('en-IN')}` }
        ],
        data: dataWithBal
      });
    }
    else if (this.currentReport === 'profit') {
      const invoices = DB.get('jw_invoices').filter(i => i.invoiceDate >= start && i.invoiceDate <= end);
      const invoiceItems = DB.get('jw_invoice_items');
      const products = DB.get('jw_products');
      
      // Calculate estimated cost and profit margin
      let totalSales = 0;
      let totalCostVal = 0;

      invoices.forEach(inv => {
        totalSales += inv.netAmount;
        
        // Find invoice items and calculate raw cost
        const items = invoiceItems.filter(it => it.invoiceId === inv.id);
        items.forEach(it => {
          const p = products.find(prod => prod.id === it.productId);
          if (p) {
            // Cost = Net Weight * PurchaseRate
            const cost = p.netWeight * p.purchaseRate;
            totalCostVal += cost;
          }
        });
      });

      const estGrossProfit = totalSales - totalCostVal;

      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:12px;">Estimated Margin & Profitability Report</h4>
        <div style="background:#f9f9f9; border:1px solid var(--border); border-radius:var(--radius-sm); padding:20px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; text-align:center;">
          <div>
            <div style="font-size:0.8rem; color:var(--text-muted)">Total Sales Invoiced</div>
            <div style="font-size:1.4rem; font-weight:800; color:var(--primary)">₹${totalSales.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
          </div>
          <div>
            <div style="font-size:0.8rem; color:var(--text-muted)">Raw Cost Valuation</div>
            <div style="font-size:1.4rem; font-weight:800; color:var(--text-muted)">₹${totalCostVal.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
          </div>
          <div>
            <div style="font-size:0.8rem; color:var(--text-muted)">Estimated Gross Profit Margin</div>
            <div style="font-size:1.4rem; font-weight:800; color:var(--success)">₹${estGrossProfit.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
          </div>
        </div>
        
        <h5 style="font-weight:600; margin-bottom:10px;">Invoices details</h5>
        <div id="report-table-div"></div>
      `;

      UI.renderTable({
        containerId: 'report-table-div',
        columns: [
          { label: 'Invoice No', key: 'invoiceNo' },
          { label: 'Date', key: 'invoiceDate' },
          { label: 'Net Sales Amount', render: (row) => `₹${row.netAmount.toLocaleString('en-IN')}` },
          { label: 'Estimated Gross Profit', render: (row) => {
            const items = invoiceItems.filter(it => it.invoiceId === row.id);
            let costVal = 0;
            items.forEach(it => {
              const p = products.find(prod => prod.id === it.productId);
              if (p) costVal += (p.netWeight * p.purchaseRate);
            });
            const profit = row.netAmount - costVal;
            return `<strong style="color:var(--success)">₹${profit.toLocaleString('en-IN', {maximumFractionDigits:0})}</strong>`;
          }}
        ],
        data: invoices
      });
    }
  },

  exportCSV() {
    const start = document.getElementById('rep-start-date').value;
    const end = document.getElementById('rep-end-date').value;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `report_${this.currentReport}_${start}_to_${end}.csv`;

    if (this.currentReport === 'sales') {
      csvContent += "Invoice No,Date,Customer,Sub Total,CGST,SGST,Net Amount\n";
      const invoices = DB.get('jw_invoices').filter(i => i.invoiceDate >= start && i.invoiceDate <= end);
      invoices.forEach(inv => {
        const custName = DB.getById('jw_customers', inv.customerId)?.name || 'Walk-in';
        csvContent += `${inv.invoiceNo},${inv.invoiceDate},"${custName}",${inv.subTotal},${inv.cgstAmount},${inv.sgstAmount},${inv.netAmount}\n`;
      });
    }
    else if (this.currentReport === 'stock') {
      csvContent += "Item Code,Design,Gross Wt,Net Wt,MRP,Status\n";
      const list = DB.get('jw_products');
      list.forEach(p => {
        csvContent += `${p.itemCode},"${p.designName}",${p.grossWeight},${p.netWeight},${p.mrp},${p.status}\n`;
      });
    }
    else if (this.currentReport === 'gst') {
      csvContent += "Invoice No,Date,Taxable Amt,CGST,SGST,Total Tax\n";
      const list = DB.get('jw_invoices').filter(i => i.invoiceDate >= start && i.invoiceDate <= end);
      list.forEach(i => {
        csvContent += `${i.invoiceNo},${i.invoiceDate},${i.taxableAmount},${i.cgstAmount},${i.sgstAmount},${i.cgstAmount+i.sgstAmount}\n`;
      });
    }
    else if (this.currentReport === 'oldgold') {
      csvContent += "Date,Gross Wt,Net Fine Wt,Valuation,Mode\n";
      const list = DB.get('jw_old_gold').filter(og => og.purchaseDate >= start && og.purchaseDate <= end);
      list.forEach(og => {
        csvContent += `${og.purchaseDate},${og.grossWeight},${og.netFineWeight},${og.totalAmount},${og.paymentMode}\n`;
      });
    }
    else {
      // General backup csv for simple logs
      csvContent += "Report,Start,End\n";
      csvContent += `${this.currentReport},${start},${end}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    UI.toast("CSV file downloaded successfully");
  }
};

// 8. SETTINGS MODULE
const SettingsModule = {
  render(container, subModule, params) {
    container.innerHTML = `
      <div style="display:flex; gap:20px; align-items:flex-start;">
        <!-- Left Sub-menu -->
        <div style="width:200px; flex-shrink:0; background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:10px; display:flex; flex-direction:column; gap:4px;">
          <button class="btn btn-secondary btn-sm" id="btn-set-shop" style="justify-content:flex-start;" onclick="SettingsModule.switchPanel('shop')"><i class="fa-solid fa-shop"></i> Shop Profile</button>
          <button class="btn btn-secondary btn-sm" id="btn-set-users" style="justify-content:flex-start;" onclick="SettingsModule.switchPanel('users')"><i class="fa-solid fa-users-gear"></i> User accounts</button>
          <button class="btn btn-secondary btn-sm" id="btn-set-data" style="justify-content:flex-start;" onclick="SettingsModule.switchPanel('data')"><i class="fa-solid fa-database"></i> Data Mgmt</button>
          <button class="btn btn-secondary btn-sm" id="btn-set-audit" style="justify-content:flex-start;" onclick="SettingsModule.switchPanel('audit')"><i class="fa-solid fa-clock-rotate-left"></i> System Audit Log</button>
        </div>

        <!-- Right View -->
        <div style="flex-grow:1; background:#fff; border-radius:var(--radius); border:1px solid var(--border); padding:20px;" id="settings-view-content"></div>
      </div>
    `;

    this.switchPanel('shop');
  },

  switchPanel(panelName) {
    document.querySelectorAll('[id^="btn-set-"]').forEach(btn => btn.classList.remove('btn-accent'));
    document.getElementById(`btn-set-${panelName}`).classList.add('btn-accent');

    const view = document.getElementById('settings-view-content');
    
    if (panelName === 'shop') {
      const shop = DB.get('jw_shop_profile') || { name: 'Aura Showroom', address: '101 MG Road, Mumbai', phone: '9876543200', email: 'sales@aura.com', gstin: '27AADCB1234F1Z0', logo: '' };
      
      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:16px;">Shop Profile Settings</h4>
        <form id="shop-profile-form">
          <div class="form-group">
            <label class="form-label">Showroom Business Name <span class="required">*</span></label>
            <input type="text" id="shop-name" class="form-control" required value="${shop.name}" />
          </div>
          <div class="form-group">
            <label class="form-label">Full Address <span class="required">*</span></label>
            <input type="text" id="shop-address" class="form-control" required value="${shop.address}" />
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Phone Number <span class="required">*</span></label>
              <input type="text" id="shop-phone" class="form-control" required value="${shop.phone}" />
            </div>
            <div class="form-group">
              <label class="form-label">Business Email</label>
              <input type="email" id="shop-email" class="form-control" value="${shop.email}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">GSTIN ID Code <span class="required">*</span></label>
            <input type="text" id="shop-gstin" class="form-control" required value="${shop.gstin}" />
          </div>
          <div class="form-group">
            <label class="form-label">Showroom Logo (Upload image)</label>
            <input type="file" id="shop-logo-file" class="form-control" accept="image/*" />
            <div id="shop-logo-preview" style="margin-top:10px;">
              ${shop.logo ? `<img src="${shop.logo}" style="max-height:80px; border-radius:4px;" />` : ''}
            </div>
          </div>
          <button type="submit" class="btn btn-accent" style="margin-top:10px;">Save Profile Configurations</button>
        </form>
      `;

      let logoBase64 = shop.logo || '';
      document.getElementById('shop-logo-file').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            logoBase64 = reader.result;
            document.getElementById('shop-logo-preview').innerHTML = `<img src="${logoBase64}" style="max-height:80px; border-radius:4px;" />`;
          };
          reader.readAsDataURL(file);
        }
      };

      document.getElementById('shop-profile-form').onsubmit = (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('shop-name').value,
          address: document.getElementById('shop-address').value,
          phone: document.getElementById('shop-phone').value,
          email: document.getElementById('shop-email').value,
          gstin: document.getElementById('shop-gstin').value,
          logo: logoBase64
        };
        DB.set('jw_shop_profile', payload);
        UI.toast("Shop Profile updated successfully");
      };
    } 
    else if (panelName === 'users') {
      const list = DB.get('jw_users');
      view.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h4 style="font-weight:600;">System User Accounts</h4>
          <button class="btn btn-accent btn-sm" id="btn-add-user"><i class="fa fa-plus"></i> Add Account</button>
        </div>
        <div id="users-table-container"></div>
      `;

      UI.renderTable({
        containerId: 'users-table-container',
        columns: [
          { label: 'Employee Name', key: 'employeeName' },
          { label: 'Username', key: 'username' },
          { label: 'Role Authority', render: (row) => `<span class="badge ${row.role === 'Admin' ? 'badge-danger' : 'badge-info'}">${row.role}</span>` }
        ],
        data: list,
        actions: (row) => `
          <button class="btn btn-secondary btn-sm btn-icon" onclick="SettingsModule.editUser(${row.id})"><i class="fa fa-pencil"></i></button>
          ${row.id !== 1 ? `<button class="btn btn-danger btn-sm btn-icon" onclick="SettingsModule.deleteUser(${row.id})"><i class="fa fa-trash"></i></button>` : ''}
        `
      });

      document.getElementById('btn-add-user').onclick = () => this.showUserModal();
    }
    else if (panelName === 'data') {
      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:16px;">Data Backup & Recovery</h4>
        
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div style="padding:16px; border:1px solid var(--border); border-radius:var(--radius-sm); background:#fafafa;">
            <h5 style="font-weight:600; margin-bottom:6px;">Export DB Backup</h5>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">Save a copy of entire local store as a JSON backup file to local disk.</p>
            <button class="btn btn-accent btn-sm" onclick="SettingsModule.exportJSON()"><i class="fa fa-download"></i> Backup data</button>
          </div>

          <div style="padding:16px; border:1px solid var(--border); border-radius:var(--radius-sm); background:#fafafa;">
            <h5 style="font-weight:600; margin-bottom:6px;">Restore DB Backup</h5>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">Restore database tables using a previously downloaded JSON file.</p>
            <input type="file" id="db-restore-file" accept=".json" class="form-control" style="width:280px; margin-bottom:10px;" />
            <button class="btn btn-primary btn-sm" onclick="SettingsModule.importJSON()"><i class="fa fa-upload"></i> Restore database</button>
          </div>

          <div style="padding:16px; border:1px solid var(--danger); border-radius:var(--radius-sm); background:rgba(239, 68, 68, 0.02);">
            <h5 style="font-weight:600; color:var(--danger); margin-bottom:6px;">Factory Reset Database</h5>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">Warning: This clears out all data records (re-seeds default users accounts admin/sales).</p>
            <button class="btn btn-danger btn-sm" onclick="SettingsModule.clearAllDatabase()"><i class="fa fa-trash-arrow-up"></i> Clear Database</button>
          </div>
        </div>
      `;
    }
    else if (panelName === 'audit') {
      const logs = DB.get('jw_audit_logs');
      // Sort desc
      logs.sort((a,b) => b.id - a.id);
      
      view.innerHTML = `
        <h4 style="font-weight:600; margin-bottom:16px;">System Operations Audit Trail</h4>
        <div id="audit-table-container"></div>
      `;

      UI.renderTable({
        containerId: 'audit-table-container',
        columns: [
          { label: 'Time', render: (row) => new Date(row.timestamp).toLocaleString('en-IN') },
          { label: 'Username', key: 'username' },
          { label: 'Action', render: (row) => `<span class="badge ${row.action === 'CREATE' ? 'badge-success' : (row.action === 'UPDATE' ? 'badge-warning' : 'badge-danger')}">${row.action}</span>` },
          { label: 'Table Key', key: 'tableName' },
          { label: 'Record Target', key: 'recordId' }
        ],
        data: logs
      });
    }
  },

  showUserModal(id = null) {
    const isEdit = id !== null;
    const item = isEdit ? DB.getById('jw_users', id) : null;

    const html = `
      <form id="user-form">
        <div class="form-group">
          <label class="form-label">Employee Name <span class="required">*</span></label>
          <input type="text" id="user-emp" class="form-control" required value="${isEdit ? item.employeeName : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Username (Unique) <span class="required">*</span></label>
          <input type="text" id="user-username" class="form-control" required value="${isEdit ? item.username : ''}" ${isEdit ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label class="form-label">Password <span class="required">*</span></label>
          <input type="password" id="user-pass" class="form-control" required value="${isEdit ? item.password : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">System Role <span class="required">*</span></label>
          <select id="user-role" class="form-control" required>
            <option value="Admin" ${isEdit && item.role === 'Admin' ? 'selected' : ''}>Admin</option>
            <option value="Manager" ${isEdit && item.role === 'Manager' ? 'selected' : ''}>Manager</option>
            <option value="Sales" ${isEdit && item.role === 'Sales' ? 'selected' : ''}>Sales</option>
            <option value="Cashier" ${isEdit && item.role === 'Cashier' ? 'selected' : ''}>Cashier</option>
          </select>
        </div>
      </form>
    `;

    UI.modal(isEdit ? "Edit User Authority" : "Add User Account", html, [
      { label: "Cancel", className: "btn btn-secondary", action: () => UI.closeModal() },
      { label: "Save", className: "btn btn-accent", action: () => {
        const employeeName = document.getElementById('user-emp').value.trim();
        const username = document.getElementById('user-username').value.trim().toLowerCase();
        const password = document.getElementById('user-pass').value.trim();
        const role = document.getElementById('user-role').value;

        if (!employeeName || !username || !password || !role) {
          UI.toast("Please fill in required fields", "warning");
          return;
        }

        const users = DB.get('jw_users');
        const userDup = users.some(u => u.username === username && (!isEdit || u.id !== id));
        if (userDup) {
          UI.toast("Username already exists", "warning");
          return;
        }

        const payload = { employeeName, username, password, role };
        if (isEdit) {
          DB.update('jw_users', id, payload);
          UI.toast("User account updated");
        } else {
          DB.insert('jw_users', payload);
          UI.toast("User account created successfully");
        }
        UI.closeModal();
        this.switchPanel('users');
      }}
    ]);
  },

  editUser(id) { this.showUserModal(id); },

  deleteUser(id) {
    UI.confirm("Are you sure you want to delete this user account?", () => {
      DB.delete('jw_users', id);
      UI.toast("User account deleted");
      this.switchPanel('users');
    });
  },

  exportJSON() {
    const backup = {};
    const keys = [
      'jw_metals', 'jw_purities', 'jw_categories', 'jw_designs', 'jw_stone_types',
      'jw_rate_master', 'jw_hallmarks', 'jw_suppliers', 'jw_karigar_orders',
      'jw_karigar_receipts', 'jw_products', 'jw_product_stones', 'jw_branches',
      'jw_stock_transfers', 'jw_stock_audits', 'jw_customers', 'jw_schemes',
      'jw_enrollments', 'jw_installments', 'jw_old_gold', 'jw_invoices',
      'jw_invoice_items', 'jw_payments', 'jw_returns', 'jw_approvals',
      'jw_custom_orders', 'jw_repairs', 'jw_employees', 'jw_users',
      'jw_gst_rates', 'jw_ledger', 'jw_shop_profile'
    ];

    keys.forEach(k => {
      backup[k] = DB.get(k);
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `aura_db_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    UI.toast("Database backup JSON downloaded successfully");
  },

  importJSON() {
    const input = document.getElementById('db-restore-file');
    const file = input.files[0];
    if (!file) {
      UI.toast("Please select a JSON file to restore.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.keys(data).forEach(key => {
          if (key.startsWith('jw_')) {
            DB.set(key, data[key]);
          }
        });
        UI.toast("Database restored from backup successfully. Refreshing...", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        UI.toast("Failed to parse JSON file.", "error");
      }
    };
    reader.readAsText(file);
  },

  clearAllDatabase() {
    UI.confirm("FACTORY RESET WARNING: This action clears all operational data. Do you wish to proceed?", () => {
      const keys = [
        'jw_metals', 'jw_purities', 'jw_categories', 'jw_designs', 'jw_stone_types',
        'jw_rate_master', 'jw_hallmarks', 'jw_suppliers', 'jw_karigar_orders',
        'jw_karigar_receipts', 'jw_products', 'jw_product_stones', 'jw_branches',
        'jw_stock_transfers', 'jw_stock_audits', 'jw_customers', 'jw_schemes',
        'jw_enrollments', 'jw_installments', 'jw_old_gold', 'jw_invoices',
        'jw_invoice_items', 'jw_payments', 'jw_returns', 'jw_approvals',
        'jw_custom_orders', 'jw_repairs', 'jw_employees', 'jw_users',
        'jw_gst_rates', 'jw_ledger', 'jw_audit_logs', 'jw_current_user'
      ];
      keys.forEach(k => localStorage.removeItem(k));
      UI.toast("Database cleared successfully. Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    });
  }
};
