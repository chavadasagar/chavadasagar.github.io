/**
 * billing.js - Invoicing dashboard, partial payments ledger, printable invoice invoice layout
 */

const billingController = {
  activeView: 'list', // 'list', 'invoice'
  selectedInvoiceId: null,

  render(container) {
    if (this.activeView === 'list') {
      this.renderList(container);
    } else if (this.activeView === 'invoice') {
      this.renderInvoice(container);
    }
  },

  renderList(container) {
    container.innerHTML = `
      <div class="billing-header animate-fade-in">
        <h2>Billing & Invoices</h2>
      </div>

      <!-- Filters -->
      <div class="list-filters card animate-fade-in">
        <div class="filter-row">
          <div class="filter-group">
            <label>Search Invoice:</label>
            <input type="text" id="filter-invoice-search" placeholder="Invoice # or guest name...">
          </div>
          <div class="filter-group">
            <label>Payment Status:</label>
            <select id="filter-invoice-status">
              <option value="All">All Invoices</option>
              <option value="Paid">Paid</option>
              <option value="PartiallyPaid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      <div class="table-responsive card animate-fade-in">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Guest Name</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Due Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="invoices-tbody"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('invoices-tbody');
    const searchInput = document.getElementById('filter-invoice-search');
    const statusSelect = document.getElementById('filter-invoice-status');

    const updateDisplay = () => {
      const invoices = window.db.getAll('invoices');
      const bookings = window.db.getAll('bookings');
      const guests = window.db.getAll('guests');
      const payments = window.db.getAll('payments');

      const query = searchInput.value.toLowerCase().trim();
      const status = statusSelect.value;

      const filtered = invoices.filter(inv => {
        const bk = bookings.find(b => b.id === inv.bookingId) || { guestId: '' };
        const guestObj = guests.find(g => g.id === bk.guestId) || { name: '' };
        
        const matchSearch = inv.invoiceNumber.toLowerCase().includes(query) || 
                            guestObj.name.toLowerCase().includes(query);
        const matchStatus = status === 'All' || inv.paymentStatus === status;
        
        return matchSearch && matchStatus;
      });

      // Sort invoices: unpaid first, then newest date
      filtered.sort((a, b) => {
        const priority = { Unpaid: 1, PartiallyPaid: 2, Paid: 3 };
        const scoreA = priority[a.paymentStatus] || 9;
        const scoreB = priority[b.paymentStatus] || 9;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return new Date(b.invoiceDate) - new Date(a.invoiceDate);
      });

      tbody.innerHTML = filtered.map(inv => {
        const bk = bookings.find(b => b.id === inv.bookingId) || { guestId: '' };
        const guestObj = guests.find(g => g.id === bk.guestId) || { name: 'Unknown Guest' };
        
        const invPmts = payments.filter(p => p.invoiceId === inv.id);
        const paidAmount = invPmts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balanceDue = Math.max(0, inv.totalAmount - paidAmount);

        let badgeClass = 'badge-secondary';
        if (inv.paymentStatus === 'Paid') badgeClass = 'badge-success';
        else if (inv.paymentStatus === 'PartiallyPaid') badgeClass = 'badge-warning';
        else if (inv.paymentStatus === 'Unpaid') badgeClass = 'badge-danger';

        return `
          <tr>
            <td><strong>${inv.invoiceNumber}</strong></td>
            <td>${guestObj.name}</td>
            <td>${window.utils.formatDate(inv.invoiceDate)}</td>
            <td>${window.utils.formatCurrency(inv.totalAmount)}</td>
            <td class="text-success">${window.utils.formatCurrency(paidAmount)}</td>
            <td class="text-danger">${window.utils.formatCurrency(balanceDue)}</td>
            <td><span class="badge ${badgeClass}">${inv.paymentStatus}</span></td>
            <td>
              <button class="btn btn-xs btn-outline btn-view-invoice" data-id="${inv.id}">View Ledger</button>
            </td>
          </tr>
        `;
      }).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No invoices found matching criteria.</td></tr>';
      }

      tbody.querySelectorAll('.btn-view-invoice').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.viewInvoiceDetails(e.currentTarget.getAttribute('data-id'));
        });
      });
    };

    searchInput.addEventListener('input', updateDisplay);
    statusSelect.addEventListener('change', updateDisplay);
    updateDisplay();
  },

  viewInvoiceDetails(invoiceId) {
    this.activeView = 'invoice';
    this.selectedInvoiceId = invoiceId;
    this.render(document.getElementById('app-content'));
  },

  renderInvoice(container) {
    const invoice = window.db.getById('invoices', this.selectedInvoiceId);
    if (!invoice) {
      container.innerHTML = '<div class="empty-state">Invoice not found.</div>';
      return;
    }

    const booking = window.db.getById('bookings', invoice.bookingId);
    const guest = booking ? (window.db.getById('guests', booking.guestId) || { name: 'Unknown', phone: '-', email: '-', address: '' }) : { name: 'Unknown', phone: '-', email: '-', address: '' };
    const hotel = window.db.getAll('hotels')[0] || { name: 'StayEase', address: '-', phone: '-', email: '-' };
    const items = window.db.query('invoiceItems', item => item.invoiceId === invoice.id);
    const payments = window.db.query('payments', p => p.invoiceId === invoice.id);
    const paidAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const balanceDue = Math.max(0, invoice.totalAmount - paidAmount);

    container.innerHTML = `
      <div class="billing-header animate-fade-in no-print">
        <h2>Invoice Manager</h2>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-outline btn-sm" id="invoice-btn-back">← Back to List</button>
          <button class="btn btn-primary btn-sm" id="invoice-btn-print">🖨️ Print Invoice</button>
          ${invoice.paymentStatus !== 'Paid' ? `<button class="btn btn-success btn-sm" id="invoice-btn-pay">💰 Add Payment</button>` : ''}
        </div>
      </div>

      <!-- Printable Invoice Sheet Wrap -->
      <div class="invoice-sheet card animate-fade-in" id="invoice-printable-sheet">
        <!-- Header -->
        <div class="invoice-sheet-header">
          <div class="hotel-details">
            <h2>${hotel.name}</h2>
            <p>${hotel.address}</p>
            <p>Phone: ${hotel.phone} | Email: ${hotel.email}</p>
          </div>
          <div class="invoice-meta text-right">
            <h1>INVOICE</h1>
            <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${window.utils.formatDate(invoice.invoiceDate)}</p>
            ${booking ? `<p><strong>Booking Ref:</strong> ${booking.bookingReferenceNo}</p>` : ''}
          </div>
        </div>

        <hr class="invoice-divider">

        <!-- Guest Details -->
        <div class="invoice-sheet-parties">
          <div class="bill-to">
            <h4>BILL TO:</h4>
            <strong>${guest.name}</strong>
            <p>Phone: ${guest.phone}</p>
            <p>Email: ${guest.email || '-'}</p>
            <p>Address: ${guest.address || '-'}</p>
          </div>
          <div class="stay-meta text-right">
            ${booking ? `
              <h4>STAY DETAILS:</h4>
              <p><strong>Check-In:</strong> ${window.utils.formatDate(booking.checkInDate)}</p>
              <p><strong>Check-Out:</strong> ${window.utils.formatDate(booking.checkOutDate)}</p>
              <p><strong>Nights:</strong> ${window.utils.calculateNights(booking.checkInDate, booking.checkOutDate)}</p>
            ` : ''}
          </div>
        </div>

        <!-- Line Items Table -->
        <table class="invoice-items-table" style="margin-top:20px; width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); text-align: left; background: var(--bg-hover);">
              <th style="padding:10px;">Description</th>
              <th style="padding:10px; text-align:center;">Quantity</th>
              <th style="padding:10px; text-align:right;">Unit Price</th>
              <th style="padding:10px; text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding:10px;">${item.description}</td>
                <td style="padding:10px; text-align:center;">${item.quantity}</td>
                <td style="padding:10px; text-align:right;">${window.utils.formatCurrency(item.unitPrice)}</td>
                <td style="padding:10px; text-align:right;">${window.utils.formatCurrency(item.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals Row -->
        <div class="invoice-totals-wrapper" style="display:flex; justify-content:flex-end; margin-top:20px;">
          <div style="width: 300px;">
            <div class="detail-row" style="padding: 5px 0;"><span>Subtotal:</span><strong>${window.utils.formatCurrency(invoice.subTotal)}</strong></div>
            ${invoice.discountAmount > 0 ? `<div class="detail-row text-success" style="padding: 5px 0;"><span>Discount:</span><strong>-${window.utils.formatCurrency(invoice.discountAmount)}</strong></div>` : ''}
            <div class="detail-row" style="padding: 5px 0;"><span>GST (12%):</span><strong>${window.utils.formatCurrency(invoice.taxAmount)}</strong></div>
            <div class="detail-row total-row" style="padding: 8px 0; border-top:2px solid var(--border-color); font-size:16px;"><span>Total:</span><strong>${window.utils.formatCurrency(invoice.totalAmount)}</strong></div>
          </div>
        </div>

        <hr class="invoice-divider" style="margin-top: 30px;">

        <!-- Payment Transactions History -->
        <div class="invoice-transactions-section">
          <h3>Payment History</h3>
          <table class="table table-sm" style="width:100%;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); text-align:left;">
                <th>Date</th>
                <th>Payment Mode</th>
                <th>Reference ID</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>${window.utils.formatDate(p.paymentDate, true)}</td>
                  <td>${p.paymentMode}</td>
                  <td><code>${p.transactionReference}</code></td>
                  <td class="text-right text-success"><strong>${window.utils.formatCurrency(p.amount)}</strong></td>
                </tr>
              `).join('')}
              ${payments.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">No transactions recorded.</td></tr>' : ''}
            </tbody>
          </table>
          
          <div class="payment-summary-summary" style="display: flex; justify-content: space-between; margin-top: 15px; background: var(--bg-hover); padding: 10px; border-radius: 6px;">
            <span>Total Paid: <strong class="text-success">${window.utils.formatCurrency(paidAmount)}</strong></span>
            <span>Due Balance: <strong class="text-danger">${window.utils.formatCurrency(balanceDue)}</strong></span>
            <span>Status: <strong class="${invoice.paymentStatus === 'Paid' ? 'text-success' : 'text-warning'}">${invoice.paymentStatus}</strong></span>
          </div>
        </div>

        <div class="invoice-footer-message text-center" style="margin-top: 40px; font-size: 12px; color: var(--text-muted);">
          <p>Thank you for choosing ${hotel.name}! We look forward to hosting you again soon.</p>
        </div>
      </div>
    `;

    document.getElementById('invoice-btn-back').addEventListener('click', () => {
      this.activeView = 'list';
      this.render(container);
    });

    document.getElementById('invoice-btn-print').addEventListener('click', () => {
      window.print();
    });

    if (invoice.paymentStatus !== 'Paid') {
      document.getElementById('invoice-btn-pay').addEventListener('click', () => {
        if (window.bookingsController && typeof window.bookingsController.openPaymentModal === 'function') {
          window.bookingsController.openPaymentModal(invoice);
        }
      });
    }
  }
};

window.billingController = billingController;
