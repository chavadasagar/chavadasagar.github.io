/**
 * UI Renderer & DOM Controller Module
 * Manages toast notifications, dynamic line items, live preview rendering, history dashboard, modals, and theme switching.
 */

const UI = {
  // --- Toast Notification System ---
  showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
    } else if (type === 'danger') {
      iconSvg = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
    } else {
      iconSvg = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    }

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        ${iconSvg}
        <span>${message}</span>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  // --- Modal Helpers ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // --- Tab Navigation Switcher ---
  switchTab(tabId) {
    // 1. Update Bottom Nav on Mobile
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });

    // 2. Update Desktop Top Tabs
    document.querySelectorAll('.desktop-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // 3. Tab Visibility Management
    const isDesktop = window.innerWidth >= 1024;
    const tabViews = document.querySelectorAll('.tab-view');

    if (isDesktop && (tabId === 'editor' || tabId === 'preview')) {
      // In Desktop Split View, both editor and preview containers are active
      tabViews.forEach(view => {
        if (view.id === 'tab-editor' || view.id === 'tab-preview') {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    } else {
      tabViews.forEach(view => {
        view.classList.toggle('active', view.id === `tab-${tabId}`);
      });
    }

    // Scroll to top when switching tab
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger History render if switched to history
    if (tabId === 'history') {
      this.renderHistory();
    }
  },

  // --- Theme & Appearance Switchers ---
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.saveTheme(theme);
    
    // Update theme toggle icons
    const sunIcon = document.querySelector('.theme-icon-sun');
    const moonIcon = document.querySelector('.theme-icon-moon');
    if (sunIcon && moonIcon) {
      if (theme === 'dark') {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    }
  },

  setAccent(accent) {
    // Remove existing theme classes from body
    document.body.classList.remove('theme-indigo', 'theme-emerald', 'theme-crimson', 'theme-amber', 'theme-violet', 'theme-slate');
    document.body.classList.add(`theme-${accent}`);
    Storage.saveAccent(accent);

    // Update active swatch state
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.classList.toggle('active', swatch.getAttribute('data-accent') === accent);
    });
  },

  setTemplate(template) {
    const previewSheet = document.getElementById('invoice-preview-sheet');
    if (previewSheet) {
      previewSheet.classList.remove('template-modern', 'template-corporate', 'template-creative', 'template-classic');
      previewSheet.classList.add(`template-${template}`);
    }
    Storage.saveTemplate(template);

    // Update select dropdown
    const templateSelect = document.getElementById('setting-template-select');
    if (templateSelect) templateSelect.value = template;
  },

  // --- Dynamic Line Items Rendering ---
  renderLineItems(items, currencySymbol = '$') {
    const desktopTbody = document.getElementById('line-items-tbody');
    const mobileCardsContainer = document.getElementById('line-items-cards');

    if (!desktopTbody || !mobileCardsContainer) return;

    desktopTbody.innerHTML = '';
    mobileCardsContainer.innerHTML = '';

    if (!items || items.length === 0) {
      desktopTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 1.5rem;">No items added yet. Click "+ Add Line Item" below.</td></tr>`;
      mobileCardsContainer.innerHTML = `<div class="text-center text-muted" style="padding: 1rem;">No items added yet. Click "+ Add Line Item" below.</div>`;
      return;
    }

    items.forEach((item, index) => {
      const lineTotal = ((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toFixed(2);
      
      // 1. Desktop Table Row
      const tr = document.createElement('tr');
      tr.setAttribute('data-id', item.id);
      tr.innerHTML = `
        <td style="width: 40px; text-align: center; color: var(--text-muted); font-weight: 600; padding-top: 1rem;">
          ${index + 1}
        </td>
        <td>
          <input type="text" class="form-control item-desc" placeholder="Item description / service name" value="${this.escapeHtml(item.description || '')}">
          <input type="text" class="form-control item-notes" style="margin-top: 4px; font-size: 0.8rem; padding: 0.35rem 0.6rem;" placeholder="Optional notes / details" value="${this.escapeHtml(item.notes || '')}">
        </td>
        <td style="width: 90px;">
          <input type="number" step="any" min="0" class="form-control item-qty" placeholder="1" value="${item.quantity}">
        </td>
        <td style="width: 100px;">
          <input type="text" class="form-control item-unit" placeholder="pcs/hrs" value="${this.escapeHtml(item.unit || 'units')}">
        </td>
        <td style="width: 125px;">
          <input type="number" step="any" min="0" class="form-control item-rate" placeholder="0.00" value="${item.rate}">
        </td>
        <td style="width: 120px; text-align: right; font-weight: 700; font-family: var(--font-mono); padding-top: 1rem;">
          <span class="item-amount">${currencySymbol}${lineTotal}</span>
        </td>
        <td style="width: 70px; text-align: center;">
          <div style="display:flex; align-items:center; gap:2px;">
            <button type="button" class="btn-icon btn-duplicate-item" title="Duplicate Item" style="width:28px; height:28px;">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            </button>
            <button type="button" class="btn-icon btn-delete-item" title="Remove Item" style="width:28px; height:28px; color: var(--danger);">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      `;
      desktopTbody.appendChild(tr);

      // 2. Mobile Responsive Card
      const card = document.createElement('div');
      card.className = 'line-item-card';
      card.setAttribute('data-id', item.id);
      card.innerHTML = `
        <div class="line-item-card-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="line-item-num">${index + 1}</span>
            <span style="font-weight:700; font-size:0.9rem;">Item Details</span>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <button type="button" class="btn-icon btn-duplicate-item" title="Duplicate Item" style="width:32px; height:32px;">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            </button>
            <button type="button" class="btn-icon btn-delete-item" title="Remove Item" style="width:32px; height:32px; color: var(--danger);">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0.6rem;">
          <input type="text" class="form-control item-desc" placeholder="Item description / service name" value="${this.escapeHtml(item.description || '')}">
        </div>

        <div class="form-group" style="margin-bottom: 0.6rem;">
          <input type="text" class="form-control item-notes" style="font-size:0.8rem;" placeholder="Optional notes / sub-details" value="${this.escapeHtml(item.notes || '')}">
        </div>

        <div class="line-item-card-row">
          <div class="form-group">
            <label class="form-label" style="font-size:0.75rem;">Quantity</label>
            <input type="number" step="any" min="0" class="form-control item-qty" placeholder="1" value="${item.quantity}">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:0.75rem;">Unit (e.g. hrs/pcs)</label>
            <input type="text" class="form-control item-unit" placeholder="units" value="${this.escapeHtml(item.unit || 'units')}">
          </div>
        </div>

        <div class="line-item-card-row" style="margin-top: 0.6rem; align-items: end;">
          <div class="form-group">
            <label class="form-label" style="font-size:0.75rem;">Unit Rate / Price</label>
            <input type="number" step="any" min="0" class="form-control item-rate" placeholder="0.00" value="${item.rate}">
          </div>
          <div class="line-item-total-badge">
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">Total:</span>
            <span class="item-amount">${currencySymbol}${lineTotal}</span>
          </div>
        </div>
      `;
      mobileCardsContainer.appendChild(card);
    });
  },

  // --- Live Invoice Preview Sheet Renderer ---
  renderPreview(invoice, totals) {
    const previewSheet = document.getElementById('invoice-preview-sheet');
    if (!previewSheet) return;

    const curr = invoice.currency || 'USD';
    const sym = invoice.currencySymbol || '$';

    // 1. Logo
    const logoContainer = previewSheet.querySelector('.inv-logo-wrap');
    if (logoContainer) {
      if (invoice.sender && invoice.sender.logo) {
        logoContainer.innerHTML = `<img src="${invoice.sender.logo}" class="inv-logo" alt="Business Logo">`;
        logoContainer.style.display = 'block';
      } else {
        logoContainer.innerHTML = '';
        logoContainer.style.display = 'none';
      }
    }

    // 2. Sender / Business Info
    const sender = invoice.sender || {};
    const companyNameEl = previewSheet.querySelector('.inv-company-name');
    const companyDetailsEl = previewSheet.querySelector('.inv-company-details');

    if (companyNameEl) companyNameEl.textContent = sender.businessName || 'Your Business Name';
    
    let senderDetailsStr = [];
    if (sender.senderAddress) senderDetailsStr.push(sender.senderAddress);
    if (sender.senderEmail) senderDetailsStr.push(`Email: ${sender.senderEmail}`);
    if (sender.senderPhone) senderDetailsStr.push(`Phone: ${sender.senderPhone}`);
    if (sender.senderWebsite) senderDetailsStr.push(`Web: ${sender.senderWebsite}`);
    if (sender.senderTaxId) senderDetailsStr.push(`Tax ID: ${sender.senderTaxId}`);
    if (companyDetailsEl) companyDetailsEl.textContent = senderDetailsStr.join('\n');

    // 3. Invoice Meta
    const invNumEl = previewSheet.querySelector('.inv-num-val');
    const invDateEl = previewSheet.querySelector('.inv-date-val');
    const invDueDateEl = previewSheet.querySelector('.inv-due-date-val');
    const invPoEl = previewSheet.querySelector('.inv-po-val');
    const invPoRow = previewSheet.querySelector('.inv-po-row');
    const statusPill = previewSheet.querySelector('.inv-status-pill');

    if (invNumEl) invNumEl.textContent = invoice.invoiceNumber || 'INV-0001';
    if (invDateEl) invDateEl.textContent = invoice.issueDate || '—';
    if (invDueDateEl) invDueDateEl.textContent = invoice.dueDate || '—';
    
    if (invoice.poNumber) {
      if (invPoEl) invPoEl.textContent = invoice.poNumber;
      if (invPoRow) invPoRow.style.display = '';
    } else {
      if (invPoRow) invPoRow.style.display = 'none';
    }

    if (statusPill) {
      const status = invoice.status || 'draft';
      statusPill.className = `status-pill status-${status} inv-status-pill`;
      statusPill.textContent = status;
    }

    // 4. Client / Bill To Info
    const client = invoice.client || {};
    const clientNameEl = previewSheet.querySelector('.inv-client-name');
    const clientDetailsEl = previewSheet.querySelector('.inv-client-details');

    if (clientNameEl) clientNameEl.textContent = client.name || 'Client Name / Company';

    let clientDetailsStr = [];
    if (client.contactPerson) clientDetailsStr.push(`Attn: ${client.contactPerson}`);
    if (client.address) clientDetailsStr.push(client.address);
    if (client.email) clientDetailsStr.push(`Email: ${client.email}`);
    if (client.phone) clientDetailsStr.push(`Phone: ${client.phone}`);
    if (client.taxId) clientDetailsStr.push(`Tax ID: ${client.taxId}`);
    if (clientDetailsEl) clientDetailsEl.textContent = clientDetailsStr.join('\n');

    // Shipping section if present
    const shippingSection = previewSheet.querySelector('.inv-ship-to-section');
    const shipDetailsEl = previewSheet.querySelector('.inv-ship-details');
    if (shippingSection) {
      if (client.shippingAddress && client.shippingAddress.trim()) {
        shippingSection.style.display = 'block';
        if (shipDetailsEl) shipDetailsEl.textContent = client.shippingAddress;
      } else {
        shippingSection.style.display = 'none';
      }
    }

    // 5. Line Items Table Rows in Preview
    const tableBody = previewSheet.querySelector('.inv-preview-table-body');
    if (tableBody) {
      tableBody.innerHTML = '';
      if (!totals.items || totals.items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No items entered.</td></tr>`;
      } else {
        totals.items.forEach((item, idx) => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td style="width: 35px; text-align: center; color: #94a3b8;">${idx + 1}</td>
            <td class="desc-col">
              <div>${this.escapeHtml(item.description || 'Item ' + (idx + 1))}</div>
              ${item.notes ? `<div class="notes-sub">${this.escapeHtml(item.notes)}</div>` : ''}
            </td>
            <td style="text-align: center; width: 80px;">${item.quantity} ${item.unit || ''}</td>
            <td style="text-align: right; width: 100px;">${InvoiceModel.formatCurrency(item.rate, curr, sym)}</td>
            <td style="text-align: right; width: 110px; font-weight: 700;">${InvoiceModel.formatCurrency(item.amount, curr, sym)}</td>
          `;
          tableBody.appendChild(row);
        });
      }
    }

    // 6. Totals Breakdown in Preview
    const subtotalValEl = previewSheet.querySelector('.inv-subtotal-val');
    const discountRow = previewSheet.querySelector('.inv-discount-row');
    const discountValEl = previewSheet.querySelector('.inv-discount-val');
    const taxRow = previewSheet.querySelector('.inv-tax-row');
    const taxLabelEl = previewSheet.querySelector('.inv-tax-label');
    const taxValEl = previewSheet.querySelector('.inv-tax-val');
    const shippingRow = previewSheet.querySelector('.inv-shipping-row');
    const shippingValEl = previewSheet.querySelector('.inv-shipping-val');
    const grandTotalValEl = previewSheet.querySelector('.inv-grand-total-val');
    const wordsEl = previewSheet.querySelector('.inv-amount-words');
    const paidRow = previewSheet.querySelector('.inv-paid-row');
    const paidValEl = previewSheet.querySelector('.inv-paid-val');
    const balanceDueRow = previewSheet.querySelector('.inv-balance-due-row');
    const balanceDueValEl = previewSheet.querySelector('.inv-balance-due-val');

    if (subtotalValEl) subtotalValEl.textContent = InvoiceModel.formatCurrency(totals.subtotal, curr, sym);

    // Discount
    if (totals.discountAmount > 0) {
      if (discountRow) discountRow.style.display = '';
      if (discountValEl) discountValEl.textContent = `- ${InvoiceModel.formatCurrency(totals.discountAmount, curr, sym)}`;
    } else {
      if (discountRow) discountRow.style.display = 'none';
    }

    // Tax
    if (totals.taxAmount > 0) {
      if (taxRow) taxRow.style.display = '';
      if (taxLabelEl) taxLabelEl.textContent = `${invoice.taxLabel || 'Tax'} (${invoice.taxRate || 0}%):`;
      if (taxValEl) taxValEl.textContent = InvoiceModel.formatCurrency(totals.taxAmount, curr, sym);
    } else {
      if (taxRow) taxRow.style.display = 'none';
    }

    // Shipping
    if (totals.shippingFee > 0) {
      if (shippingRow) shippingRow.style.display = '';
      if (shippingValEl) shippingValEl.textContent = InvoiceModel.formatCurrency(totals.shippingFee, curr, sym);
    } else {
      if (shippingRow) shippingRow.style.display = 'none';
    }

    if (grandTotalValEl) grandTotalValEl.textContent = InvoiceModel.formatCurrency(totals.grandTotal, curr, sym);
    if (wordsEl) wordsEl.textContent = totals.totalInWords;

    // Paid & Balance Due
    if (totals.paidAmount > 0) {
      if (paidRow) paidRow.style.display = '';
      if (paidValEl) paidValEl.textContent = InvoiceModel.formatCurrency(totals.paidAmount, curr, sym);
      
      if (balanceDueRow) balanceDueRow.style.display = '';
      if (balanceDueValEl) balanceDueValEl.textContent = InvoiceModel.formatCurrency(totals.balanceDue, curr, sym);
    } else {
      if (paidRow) paidRow.style.display = 'none';
      if (balanceDueRow) balanceDueRow.style.display = 'none';
    }

    // 7. Payment Details & Notes
    const bankDetailsBox = previewSheet.querySelector('.inv-bank-details');
    const notesBox = previewSheet.querySelector('.inv-notes-content');
    const termsBox = previewSheet.querySelector('.inv-terms-content');

    let bankInfo = [];
    if (sender.bankName) bankInfo.push(`<strong>Bank:</strong> ${sender.bankName}`);
    if (sender.accountNumber) bankInfo.push(`<strong>Account #:</strong> ${sender.accountNumber}`);
    if (sender.routingNumber) bankInfo.push(`<strong>IFSC/Routing:</strong> ${sender.routingNumber}`);
    if (sender.upiOrPaymentLink) bankInfo.push(`<strong>UPI/Pay Link:</strong> ${sender.upiOrPaymentLink}`);

    if (bankDetailsBox) {
      if (bankInfo.length > 0) {
        bankDetailsBox.innerHTML = `<div style="font-weight:700; margin-bottom:4px; text-transform:uppercase; font-size:0.75rem; color:var(--primary);">Payment Details:</div>` + bankInfo.join('<br>');
        bankDetailsBox.style.display = 'block';
      } else {
        bankDetailsBox.style.display = 'none';
      }
    }

    if (notesBox) {
      if (invoice.notes) {
        notesBox.textContent = invoice.notes;
        notesBox.parentElement.style.display = 'block';
      } else {
        notesBox.parentElement.style.display = 'none';
      }
    }

    if (termsBox) {
      if (invoice.terms) {
        termsBox.textContent = invoice.terms;
        termsBox.parentElement.style.display = 'block';
      } else {
        termsBox.parentElement.style.display = 'none';
      }
    }
  },

  // --- History Dashboard & Invoices List Renderer ---
  renderHistory(filterStatus = 'all', searchQuery = '') {
    const historyList = document.getElementById('history-invoice-list');
    const emptyState = document.getElementById('history-empty-state');
    if (!historyList) return;

    const invoices = Storage.getInvoices();

    // 1. Calculate and Update Stats Cards
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    invoices.forEach(inv => {
      const totals = InvoiceModel.calculateTotals(inv);
      totalInvoiced += totals.grandTotal;
      totalPaid += totals.paidAmount;
      totalOutstanding += totals.balanceDue;
    });

    const statTotalEl = document.getElementById('stat-total-invoiced');
    const statPaidEl = document.getElementById('stat-total-paid');
    const statOutstandingEl = document.getElementById('stat-total-outstanding');
    const statCountEl = document.getElementById('stat-total-count');

    if (statTotalEl) statTotalEl.textContent = `$${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (statPaidEl) statPaidEl.textContent = `$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (statOutstandingEl) statOutstandingEl.textContent = `$${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (statCountEl) statCountEl.textContent = invoices.length;

    // 2. Filter Invoices
    const query = searchQuery.trim().toLowerCase();
    const filtered = invoices.filter(inv => {
      const matchStatus = filterStatus === 'all' || (inv.status || 'draft') === filterStatus;
      const clientName = (inv.client && inv.client.name) ? inv.client.name.toLowerCase() : '';
      const invNum = (inv.invoiceNumber || '').toLowerCase();
      const matchQuery = !query || clientName.includes(query) || invNum.includes(query);
      return matchStatus && matchQuery;
    });

    // 3. Render List / Cards
    historyList.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      historyList.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    historyList.style.display = 'grid';

    filtered.forEach(inv => {
      const totals = InvoiceModel.calculateTotals(inv);
      const card = document.createElement('div');
      card.className = 'history-card';
      card.setAttribute('data-id', inv.id);

      const status = inv.status || 'draft';
      const formattedTotal = InvoiceModel.formatCurrency(totals.grandTotal, inv.currency, inv.currencySymbol);

      card.innerHTML = `
        <div class="history-card-top">
          <div>
            <div class="history-inv-num">${this.escapeHtml(inv.invoiceNumber)}</div>
            <div class="history-client">${this.escapeHtml((inv.client && inv.client.name) || 'Unnamed Client')}</div>
          </div>
          <span class="status-pill status-${status}">${status}</span>
        </div>

        <div class="history-card-bottom">
          <div>
            <div class="history-amount">${formattedTotal}</div>
            <div class="history-date">Issued: ${inv.issueDate || '—'} | Due: ${inv.dueDate || '—'}</div>
          </div>
          <div class="history-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-edit-history" title="Edit / Open Invoice">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Edit
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-duplicate-history" title="Duplicate Invoice">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            </button>
            <button type="button" class="btn btn-danger-outline btn-sm btn-delete-history" title="Delete Invoice">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      `;

      historyList.appendChild(card);
    });
  },

  // --- Saved Clients Modal / Dropdown ---
  openClientPicker(onSelectCallback) {
    const clients = Storage.getClients();
    const container = document.getElementById('client-picker-list');
    if (!container) return;

    container.innerHTML = '';
    if (clients.length === 0) {
      container.innerHTML = '<div class="text-muted text-center" style="padding: 2rem;">No saved clients yet. Clients are automatically saved when you create invoices.</div>';
    } else {
      clients.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; border-bottom:1px solid var(--border-color); cursor:pointer; border-radius:var(--radius-md); transition:background 0.15s ease;';
        item.onmouseenter = () => item.style.background = 'var(--bg-surface-secondary)';
        item.onmouseleave = () => item.style.background = 'transparent';

        item.innerHTML = `
          <div>
            <div style="font-weight:700; color:var(--text-main);">${this.escapeHtml(c.name)}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${this.escapeHtml(c.email || c.phone || c.address || '')}</div>
          </div>
          <button type="button" class="btn btn-sm btn-primary">Select</button>
        `;

        item.querySelector('button').onclick = () => {
          if (onSelectCallback) onSelectCallback(c);
          UI.closeModal('modal-client-picker');
          UI.showToast(`Autofilled details for ${c.name}`, 'success');
        };

        container.appendChild(item);
      });
    }

    this.openModal('modal-client-picker');
  },

  // --- Share Modal ---
  openShareModal(invoice, totals, shareText) {
    const shareModal = document.getElementById('modal-share');
    if (!shareModal) return;

    const emailLink = document.getElementById('share-email-link');
    const waLink = document.getElementById('share-whatsapp-link');
    const textPreview = document.getElementById('share-text-preview');

    if (textPreview) textPreview.value = shareText;

    const clientEmail = (invoice.client && invoice.client.email) || '';
    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} from ${(invoice.sender && invoice.sender.businessName) || 'Our Business'}`);
    const body = encodeURIComponent(shareText);

    if (emailLink) {
      emailLink.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
    }

    if (waLink) {
      waLink.href = `https://wa.me/?text=${body}`;
    }

    this.openModal('modal-share');
  },

  // Utility to prevent XSS
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.UI = UI;
