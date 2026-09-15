/**
 * CORE APPLICATION CONTROLLER & UI SYSTEM
 */

// Global App State
const AppState = {
  currentModule: 'dashboard',
  currentSubModule: null,
  params: null
};

// 1. AUTH & RBAC SYSTEM
const Auth = {
  login(username, password) {
    const users = DB.get('jw_users');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (user) {
      const session = {
        userId: user.id,
        username: user.username,
        role: user.role,
        branchId: 1 // Default branch
      };
      DB.set('jw_current_user', session);
      DB.log('LOGIN', 'jw_users', user.id);
      return { success: true, user: session };
    }
    return { success: false, message: 'Invalid username or password' };
  },

  logout() {
    const currentUser = DB.get('jw_current_user');
    if (currentUser) {
      DB.log('LOGOUT', 'jw_users', currentUser.userId);
    }
    localStorage.removeItem('jw_current_user');
    Router.navigate('login');
  },

  getCurrentUser() {
    return DB.get('jw_current_user');
  },

  hasPermission(moduleName) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const role = user.role; // Admin, Manager, Sales, Cashier
    
    // RBAC Permission Grid
    const rules = {
      'dashboard': ['Admin', 'Manager', 'Sales', 'Cashier'],
      'masters': ['Admin', 'Manager'],
      'inventory': ['Admin', 'Manager', 'Sales', 'Cashier'], // View is general, but edits are checked inside module
      'customers': ['Admin', 'Manager', 'Sales'],
      'suppliers': ['Admin', 'Manager'],
      'schemes': ['Admin', 'Manager', 'Sales'],
      'oldgold': ['Admin', 'Manager', 'Sales'],
      'sales': ['Admin', 'Manager', 'Sales', 'Cashier'],
      'orders': ['Admin', 'Manager', 'Sales', 'Cashier'],
      'repairs': ['Admin', 'Manager', 'Sales'],
      'reports': ['Admin', 'Manager'],
      'settings': ['Admin']
    };
    
    return rules[moduleName] ? rules[moduleName].includes(role) : false;
  }
};

// 2. STATE ROUTER
const Router = {
  currentPage: null,

  init() {
    window.addEventListener('hashchange', () => this.handleRouting());
    this.handleRouting();
  },

  navigate(module, subModule = null, params = null) {
    let hash = `#${module}`;
    if (subModule) hash += `/${subModule}`;
    if (params) {
      const q = new URLSearchParams(params).toString();
      hash += `?${q}`;
    }
    window.location.hash = hash;
  },

  handleRouting() {
    const hash = window.location.hash || '#dashboard';
    
    // Parse Hash
    const parts = hash.substring(1).split('?');
    const pathParts = parts[0].split('/');
    const module = pathParts[0] || 'dashboard';
    const subModule = pathParts[1] || null;
    
    let params = {};
    if (parts[1]) {
      const urlParams = new URLSearchParams(parts[1]);
      for (const [key, value] of urlParams.entries()) {
        params[key] = value;
      }
    }

    AppState.currentModule = module;
    AppState.currentSubModule = subModule;
    AppState.params = params;

    // Check Authentication
    const user = Auth.getCurrentUser();
    if (!user && module !== 'login') {
      window.location.hash = '#login';
      return;
    }

    if (user && module === 'login') {
      window.location.hash = '#dashboard';
      return;
    }

    // Load Header & Layout or Login Shell
    if (module === 'login') {
      document.getElementById('app-layout').style.display = 'none';
      document.getElementById('login-layout').style.display = 'flex';
      LoginModule.render();
    } else {
      document.getElementById('login-layout').style.display = 'none';
      document.getElementById('app-layout').style.display = 'flex';
      
      // Check RBAC Permissions
      if (!Auth.hasPermission(module)) {
        UI.renderAccessDenied();
        return;
      }

      this.updateSidebarActiveState(module, subModule);
      this.updateHeader(user);
      this.updateBreadcrumbs(module, subModule);
      
      // Dispatch Page Rendering
      UI.loading(true);
      setTimeout(() => {
        try {
          this.dispatchRender(module, subModule, params);
        } catch (e) {
          console.error("Render Error:", e);
          UI.toast("Error loading page module", "error");
        }
        UI.loading(false);
      }, 150); // Small delay to simulate async action & trigger spinner
    }
  },

  dispatchRender(module, subModule, params) {
    const contentArea = document.getElementById('main-content');
    contentArea.innerHTML = ''; // Reset main layout
    
    switch (module) {
      case 'dashboard':
        DashboardModule.render(contentArea);
        break;
      case 'masters':
        MastersModule.render(contentArea, subModule, params);
        break;
      case 'suppliers':
        SuppliersModule.render(contentArea, subModule, params);
        break;
      case 'inventory':
        InventoryModule.render(contentArea, subModule, params);
        break;
      case 'customers':
        CustomerModule.render(contentArea, subModule, params);
        break;
      case 'schemes':
        SchemeModule.render(contentArea, subModule, params);
        break;
      case 'oldgold':
        OldGoldModule.render(contentArea, subModule, params);
        break;
      case 'sales':
        SalesModule.render(contentArea, subModule, params);
        break;
      case 'orders':
        OrdersModule.render(contentArea, subModule, params);
        break;
      case 'repairs':
        RepairModule.render(contentArea, subModule, params);
        break;
      case 'reports':
        ReportModule.render(contentArea, subModule, params);
        break;
      case 'settings':
        SettingsModule.render(contentArea, subModule, params);
        break;
      default:
        contentArea.innerHTML = `<h3>Module "${module}" not found</h3>`;
    }
  },

  updateSidebarActiveState(module, subModule) {
    // Hide all submenus first
    document.querySelectorAll('.submenu').forEach(sub => {
      sub.classList.remove('show');
    });

    // Remove active tags
    document.querySelectorAll('.menu-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelectorAll('.submenu-link').forEach(link => {
      link.classList.remove('active');
    });

    // Mark parent link active
    const parentLink = document.querySelector(`.menu-link[data-module="${module}"]`);
    if (parentLink) {
      parentLink.classList.add('active');
      const submenu = parentLink.nextElementSibling;
      if (submenu && submenu.classList.contains('submenu')) {
        submenu.classList.add('show');
      }
    }

    // Mark sublink active
    if (subModule) {
      const subLink = document.querySelector(`.submenu-link[data-submodule="${module}/${subModule}"]`);
      if (subLink) {
        subLink.classList.add('active');
      }
    }
  },

  updateHeader(user) {
    document.getElementById('header-username').textContent = user.username.toUpperCase();
    document.getElementById('header-role').textContent = user.role;
    document.getElementById('header-avatar').textContent = user.username.substring(0, 2).toUpperCase();
    
    // Auto Update Clock
    const clock = document.getElementById('header-clock');
    const updateTime = () => {
      const now = new Date();
      clock.textContent = now.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    };
    updateTime();
    if (window.clockInterval) clearInterval(window.clockInterval);
    window.clockInterval = setInterval(updateTime, 1000);

    // Refresh notifications count
    UI.updateNotificationsBadge();
  },

  updateBreadcrumbs(module, subModule) {
    const breadcrumb = document.getElementById('breadcrumb-list');
    breadcrumb.innerHTML = `
      <a href="#dashboard"><i class="fa fa-home"></i> Home</a>
      <span class="breadcrumb-separator">/</span>
      <span class="capitalize">${module}</span>
    `;
    if (subModule) {
      breadcrumb.innerHTML += `
        <span class="breadcrumb-separator">/</span>
        <span class="capitalize">${subModule.replace('-', ' ')}</span>
      `;
    }
  }
};

// 3. UI GENERATOR & UTILITY HELPER
const UI = {
  // Toast notifications
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation');
    const color = type === 'success' ? 'var(--success)' : (type === 'error' ? 'var(--danger)' : 'var(--warning)');
    
    toast.innerHTML = `
      <i class="fa ${icon}" style="color: ${color}"></i>
      <div>${message}</div>
    `;
    
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  // Modal dialog box
  modal(title, contentHtml, footerActions = null) {
    const overlay = document.getElementById('global-modal');
    overlay.querySelector('.modal-title').textContent = title;
    
    const body = overlay.querySelector('.modal-body');
    body.innerHTML = contentHtml;
    
    const footer = overlay.querySelector('.modal-footer');
    footer.innerHTML = '';
    
    if (footerActions && footerActions.length > 0) {
      footer.style.display = 'flex';
      footerActions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = act.className || 'btn btn-secondary';
        btn.innerHTML = act.label;
        btn.onclick = () => act.action(overlay);
        footer.appendChild(btn);
      });
    } else {
      footer.style.display = 'none';
    }
    
    overlay.classList.add('show');
  },

  closeModal() {
    document.getElementById('global-modal').classList.remove('show');
  },

  confirm(message, onConfirm) {
    this.modal("Confirm Action", `<p>${message}</p>`, [
      { label: "Cancel", className: "btn btn-secondary", action: () => this.closeModal() },
      { label: "Confirm", className: "btn btn-danger", action: () => { onConfirm(); this.closeModal(); } }
    ]);
  },

  // Loader spinner
  loading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (show) {
      spinner.classList.add('show');
    } else {
      spinner.classList.remove('show');
    }
  },

  // Access Denied template
  renderAccessDenied() {
    const contentArea = document.getElementById('main-content');
    contentArea.innerHTML = `
      <div class="empty-state" style="margin-top: 80px">
        <div class="empty-state-emoji">🔒</div>
        <div class="empty-state-title">Access Denied</div>
        <div class="empty-state-desc">Your user role does not have authorization to view this module.</div>
        <button class="btn btn-primary" onclick="Router.navigate('dashboard')" style="margin-top:16px;">
          <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
        </button>
      </div>
    `;
  },

  // Reusable Paginated DataTable
  renderTable({ containerId, columns, data, actions, filterFn, sortKey = 'id', sortAsc = false }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter data
    let filteredData = [...data];
    if (filterFn) {
      filteredData = filteredData.filter(filterFn);
    }

    // Sort data
    filteredData.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    // Pagination setup
    const rowsPerPage = 10;
    let currentPage = 1;
    const totalRows = filteredData.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

    const renderRows = (page) => {
      currentPage = page;
      const start = (page - 1) * rowsPerPage;
      const end = Math.min(start + rowsPerPage, totalRows);
      const pageData = filteredData.slice(start, end);

      let tbodyHtml = '';
      if (pageData.length === 0) {
        tbodyHtml = `
          <tr>
            <td colspan="${columns.length + (actions ? 1 : 0)}" style="text-align: center; padding: 40px 0;">
              <div class="empty-state-emoji">📭</div>
              <div class="empty-state-title">No records found</div>
            </td>
          </tr>
        `;
      } else {
        pageData.forEach((row, idx) => {
          tbodyHtml += `<tr>`;
          columns.forEach(col => {
            let val = '';
            if (col.render) {
              val = col.render(row, start + idx + 1);
            } else {
              val = row[col.key] !== undefined ? row[col.key] : '';
            }
            tbodyHtml += `<td>${val}</td>`;
          });
          
          if (actions) {
            tbodyHtml += `<td><div style="display:flex; gap:6px;">${actions(row)}</div></td>`;
          }
          tbodyHtml += `</tr>`;
        });
      }

      container.querySelector('tbody').innerHTML = tbodyHtml;
      
      // Update pagination controls
      const pag = container.querySelector('.pagination');
      if (pag) {
        pag.innerHTML = `
          <div>Showing ${totalRows === 0 ? 0 : start + 1} to ${end} of ${totalRows} entries</div>
          <div class="pagination-buttons">
            <button class="pagination-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''}><i class="fa fa-chevron-left"></i></button>
            <button class="pagination-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''}><i class="fa fa-chevron-right"></i></button>
          </div>
        `;

        pag.querySelector('.prev-btn').onclick = () => renderRows(currentPage - 1);
        pag.querySelector('.next-btn').onclick = () => renderRows(currentPage + 1);
      }
    };

    // Draw structure
    let headersHtml = '';
    columns.forEach(col => {
      const isSort = col.key ? 'sortable' : '';
      const sortClass = col.key === sortKey ? (sortAsc ? 'sort-asc' : 'sort-desc') : '';
      headersHtml += `<th class="${isSort} ${sortClass}" data-key="${col.key || ''}">${col.label}</th>`;
    });
    if (actions) headersHtml += `<th>Actions</th>`;

    container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr>${headersHtml}</tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="pagination"></div>
    `;

    // Handle sort clicks
    container.querySelectorAll('thead th.sortable').forEach(th => {
      th.onclick = () => {
        const key = th.getAttribute('data-key');
        const isAsc = (sortKey === key) ? !sortAsc : true;
        this.renderTable({ containerId, columns, data, actions, filterFn, sortKey: key, sortAsc: isAsc });
      };
    });

    renderRows(1);
  },

  // Simple SVG Line Chart for Rate Trend
  renderRateChart(containerId, daysRates) {
    const el = document.getElementById(containerId);
    if (!el || daysRates.length < 2) return;

    const width = 300;
    const height = 100;
    const padding = 15;

    const rates = daysRates.map(r => r.ratePerGram);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const rateRange = maxRate - minRate || 10;

    const points = daysRates.map((r, idx) => {
      const x = padding + (idx * (width - padding * 2) / (daysRates.length - 1));
      const y = height - padding - ((r.ratePerGram - minRate) * (height - padding * 2) / rateRange);
      return `${x},${y}`;
    }).join(' ');

    el.innerHTML = `
      <svg width="100%" height="100" viewBox="0 0 300 100" style="background:#fdfaf2; border-radius:8px; border:1px solid #f2e3be;">
        <!-- Grids -->
        <line x1="${padding}" y1="${height/2}" x2="${width - padding}" y2="${height/2}" stroke="#f3e6c9" stroke-dasharray="2" />
        <!-- Trend line -->
        <polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${points}" />
        <!-- Data dots -->
        ${daysRates.map((r, idx) => {
          const pt = points.split(' ')[idx].split(',');
          return `<circle cx="${pt[0]}" cy="${pt[1]}" r="3.5" fill="var(--primary)" stroke="var(--accent)" stroke-width="1.5" title="₹${r.ratePerGram}"/>`;
        }).join('')}
      </svg>
      <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); margin-top:4px;">
        <span>${daysRates[0].effectiveDate}</span>
        <span>${daysRates[daysRates.length - 1].effectiveDate}</span>
      </div>
    `;
  },

  // Dashboard Sales Bar Chart (SVG)
  renderSalesChart(containerId, invoices) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Get last 7 days sales
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    const dailyAmounts = last7Days.map(date => {
      const daySales = invoices.filter(inv => inv.invoiceDate === date);
      const total = daySales.reduce((sum, inv) => sum + (inv.netAmount || 0), 0);
      return { date, total };
    });

    const maxAmt = Math.max(...dailyAmounts.map(d => d.total)) || 10000;
    const width = 500;
    const height = 200;
    const pad = 24;

    let barsHtml = '';
    const barWidth = (width - pad * 2) / 7 - 10;
    
    dailyAmounts.forEach((d, idx) => {
      const x = pad + idx * ((width - pad * 2) / 7) + 5;
      const barHeight = (d.total * (height - pad * 2)) / maxAmt;
      const y = height - pad - barHeight;
      const shortDate = d.date.split('-')[2] + '/' + d.date.split('-')[1];

      barsHtml += `
        <!-- Bar -->
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="var(--primary)" rx="4" />
        <!-- Text label -->
        <text x="${x + barWidth/2}" y="${height - 6}" font-size="9" fill="var(--text-muted)" text-anchor="middle">${shortDate}</text>
        <!-- Hover amount label -->
        <text x="${x + barWidth/2}" y="${y - 6}" font-size="8" font-weight="600" fill="var(--accent)" text-anchor="middle">₹${Math.round(d.total/1000)}k</text>
      `;
    });

    el.innerHTML = `
      <svg width="100%" height="200" viewBox="0 0 500 200">
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="var(--border)" stroke-width="1.5" />
        ${barsHtml}
      </svg>
    `;
  },

  // Category Donut Chart (SVG)
  renderCategoryChart(containerId, products) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Tally by categories
    const categories = DB.get('jw_categories');
    const counts = {};
    
    products.forEach(p => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });

    const data = Object.keys(counts).map(catId => {
      const cat = categories.find(c => c.id == catId);
      return {
        label: cat ? cat.name : 'Unknown',
        count: counts[catId]
      };
    }).sort((a,b) => b.count - a.count).slice(0, 5); // top 5

    const total = data.reduce((sum, item) => sum + item.count, 0) || 1;
    
    // Draw SVG circle slices
    let currentAngle = 0;
    const cx = 80, cy = 80, r = 50;
    let paths = '';
    
    const colors = ['#d4a017', '#1a1a2e', '#10b981', '#3b82f6', '#ef4444'];

    data.forEach((item, idx) => {
      const percent = item.count / total;
      const angle = percent * 360;
      
      // Arc coordinates
      const rad1 = (currentAngle - 90) * Math.PI / 180;
      const rad2 = (currentAngle + angle - 90) * Math.PI / 180;
      
      const x1 = cx + r * Math.cos(rad1);
      const y1 = cy + r * Math.sin(rad1);
      const x2 = cx + r * Math.cos(rad2);
      const y2 = cy + r * Math.sin(rad2);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      paths += `
        <path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${colors[idx % colors.length]}" stroke="#ffffff" stroke-width="1.5" />
      `;
      currentAngle += angle;
    });

    // Donut hole mask
    paths += `<circle cx="${cx}" cy="${cy}" r="28" fill="#ffffff" />`;

    // Render legend
    let legendHtml = '<div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem;">';
    data.forEach((item, idx) => {
      legendHtml += `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:12px; height:12px; border-radius:3px; background:${colors[idx % colors.length]}; display:inline-block"></span>
          <span style="font-weight:500;">${item.label}</span>
          <span style="color:var(--text-muted)">(${Math.round(item.count/total*100)}%)</span>
        </div>
      `;
    });
    legendHtml += '</div>';

    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:30px;">
        <svg width="160" height="160" viewBox="0 0 160 160">
          ${paths}
        </svg>
        ${legendHtml}
      </div>
    `;
  },

  // Notification badge calculations
  updateNotificationsBadge() {
    const list = this.getNotificationItems();
    const badge = document.getElementById('notif-badge');
    const bellBtn = document.getElementById('bell-btn');
    
    if (list.length > 0) {
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }

    // Hook click
    bellBtn.onclick = (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById('notif-dropdown');
      const isShow = dropdown.classList.toggle('show');
      if (isShow) {
        this.renderNotificationsList();
      }
    };
  },

  getNotificationItems() {
    const notifs = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();

    // 1. Schemes maturing this month
    const enrolls = DB.get('jw_enrollments');
    const schemes = DB.get('jw_schemes');
    const customers = DB.get('jw_customers');
    const installs = DB.get('jw_installments');

    enrolls.forEach(e => {
      if (e.status === 'Active') {
        const sch = schemes.find(s => s.id === e.schemeId);
        const cust = customers.find(c => c.id === e.customerId);
        if (sch && cust) {
          // Count paid
          const paidCount = installs.filter(ins => ins.enrollmentId === e.id).length;
          if (paidCount >= sch.durationMonths) {
            notifs.push({
              title: `Scheme Matured`,
              desc: `${cust.name}'s scheme "${sch.name}" is ready for redemption.`,
              link: `#schemes/dashboard`
            });
          }
        }
      }
    });

    // 2. Repairs ready for delivery
    const repairs = DB.get('jw_repairs');
    repairs.forEach(rep => {
      if (rep.status === 'Ready') {
        const cust = customers.find(c => c.id === rep.customerId);
        notifs.push({
          title: `Repair Job Ready`,
          desc: `Job #${rep.id} (${rep.description}) for ${cust ? cust.name : 'Walk-in'} is ready.`,
          link: `#repairs`
        });
      }
    });

    // 3. Approvals overdue
    const approvals = DB.get('jw_approvals');
    approvals.forEach(app => {
      if (app.status === 'Pending' && app.expectedReturnDate < todayStr) {
        const cust = customers.find(c => c.id === app.customerId);
        notifs.push({
          title: `Approval Trial Overdue`,
          desc: `Item trial by ${cust ? cust.name : 'Customer'} exceeded expected return.`,
          link: `#orders/approvals`
        });
      }
    });

    // 4. Audits with weight mismatch
    const audits = DB.get('jw_stock_audits');
    audits.forEach(aud => {
      if (Number(aud.systemWeight) !== Number(aud.actualWeight)) {
        notifs.push({
          title: `Audit Mismatch`,
          desc: `Product ID ${aud.productId} shows weight variance: System ${aud.systemWeight}g vs Actual ${aud.actualWeight}g.`,
          link: `#inventory/stock-audit`
        });
      }
    });

    return notifs;
  },

  renderNotificationsList() {
    const list = this.getNotificationItems();
    const container = document.getElementById('notif-list');
    
    if (list.length === 0) {
      container.innerHTML = `<div class="notif-empty">No new alerts or notifications.</div>`;
    } else {
      let html = '';
      list.forEach(item => {
        html += `
          <div class="notif-item" onclick="window.location.hash='${item.link}'; document.getElementById('notif-dropdown').classList.remove('show');">
            <div class="notif-title"><i class="fa fa-info-circle text-accent"></i> ${item.title}</div>
            <div class="notif-desc">${item.desc}</div>
          </div>
        `;
      });
      container.innerHTML = html;
    }
  }
};

// 4. GLOBAL SEARCH & KEYBOARD SHORTCUTS
const GlobalSearch = {
  init() {
    const input = document.getElementById('global-search-input');
    
    // Ctrl+K capture
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openSearchModal();
      }
      
      // Ctrl+N for POS Sale
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        Router.navigate('sales', 'new-invoice');
      }

      // Escape close modal
      if (e.key === 'Escape') {
        UI.closeModal();
        document.getElementById('notif-dropdown').classList.remove('show');
      }
    });

    // Trigger click on search bar input
    input.onfocus = () => {
      input.blur();
      this.openSearchModal();
    };
  },

  openSearchModal() {
    const html = `
      <div class="form-group">
        <input type="text" id="modal-search-field" class="form-control" placeholder="Search product code, customer name/phone, invoice no..." autofocus style="font-size:1.1rem; padding:12px 16px; border-radius:24px;" autocomplete="off" />
      </div>
      <div id="global-search-results">
        <div style="text-align:center; padding:30px; color:var(--text-muted);">Type at least 2 characters to search...</div>
      </div>
    `;

    UI.modal("Global Search", html, [
      { label: "Close", className: "btn btn-secondary", action: () => UI.closeModal() }
    ]);

    // Focus input inside modal
    setTimeout(() => {
      const field = document.getElementById('modal-search-field');
      if (field) {
        field.focus();
        field.oninput = () => this.executeSearch(field.value);
      }
    }, 100);
  },

  executeSearch(query) {
    const container = document.getElementById('global-search-results');
    if (!query || query.trim().length < 2) {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Type at least 2 characters to search...</div>`;
      return;
    }

    const q = query.trim().toLowerCase();
    
    // Query Customers
    const customers = DB.get('jw_customers').filter(c => 
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );

    // Query Products
    const products = DB.get('jw_products').filter(p => 
      p.itemCode.toLowerCase().includes(q) || p.designName.toLowerCase().includes(q)
    );

    // Query Invoices
    const invoices = DB.get('jw_invoices').filter(i => 
      i.invoiceNo.toLowerCase().includes(q)
    );

    if (customers.length === 0 && products.length === 0 && invoices.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:20px;">
          <div class="empty-state-emoji">🔍</div>
          <div class="empty-state-title">No matching results found</div>
        </div>
      `;
      return;
    }

    let html = '';

    // Render Invoices
    if (invoices.length > 0) {
      html += `<div class="search-section-title">Invoices (${invoices.length})</div>`;
      invoices.forEach(i => {
        const custName = DB.getById('jw_customers', i.customerId)?.name || 'Walk-in';
        html += `
          <div class="global-search-row" onclick="UI.closeModal(); Router.navigate('sales', 'invoice-list', {view: ${i.id}})">
            <i class="fa fa-file-invoice"></i>
            <div>
              <strong style="color:var(--accent)">${i.invoiceNo}</strong> - ${custName}
              <div style="font-size:0.75rem; color:var(--text-muted);">Date: ${i.invoiceDate} | Net Amount: ₹${i.netAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
            </div>
          </div>
        `;
      });
    }

    // Render Products
    if (products.length > 0) {
      html += `<div class="search-section-title">Products (${products.length})</div>`;
      products.forEach(p => {
        html += `
          <div class="global-search-row" onclick="UI.closeModal(); Router.navigate('inventory', 'products', {viewProduct: ${p.id}})">
            <i class="fa-solid fa-gem"></i>
            <div>
              <strong>${p.itemCode}</strong> - ${p.designName}
              <div style="font-size:0.75rem; color:var(--text-muted);">Weight: ${p.grossWeight.toFixed(3)}g | Status: <span class="badge ${p.status === 'InStock' ? 'badge-success' : 'badge-danger'}">${p.status}</span></div>
            </div>
          </div>
        `;
      });
    }

    // Render Customers
    if (customers.length > 0) {
      html += `<div class="search-section-title">Customers (${customers.length})</div>`;
      customers.forEach(c => {
        html += `
          <div class="global-search-row" onclick="UI.closeModal(); Router.navigate('customers', null, {id: ${c.id}})">
            <i class="fa fa-user"></i>
            <div>
              <strong>${c.name}</strong> - ${c.phone}
              <div style="font-size:0.75rem; color:var(--text-muted);">${c.city} | Loyalty Points: ${c.loyaltyPoints}</div>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;
  }
};

// Toggle Sidebar Mobile
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
}

// Window Event Listeners
window.addEventListener('DOMContentLoaded', () => {
  // 1. Seed DB
  DB.seed();
  
  // 2. Initialize Routing
  Router.init();
  
  // 3. Initialize Global Search
  GlobalSearch.init();

  // Close notifications on body click
  document.body.onclick = () => {
    document.getElementById('notif-dropdown').classList.remove('show');
  };
});
