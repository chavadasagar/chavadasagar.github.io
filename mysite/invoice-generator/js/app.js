/**
 * Main Application Coordinator & Controller
 * Glues state, storage, calculations, UI renderers, and user events together.
 */

class InvoiceApp {
  constructor() {
    this.currentInvoice = null;
    this.activeTab = 'editor';
    this.debounceTimer = null;
  }

  init() {
    // 1. Initialize Appearance
    const savedTheme = Storage.getTheme();
    UI.setTheme(savedTheme);

    const savedAccent = Storage.getAccent();
    UI.setAccent(savedAccent);

    const savedTemplate = Storage.getTemplate();
    UI.setTemplate(savedTemplate);

    // 2. Initialize State: Check if there's any existing invoice or create demo
    const invoices = Storage.getInvoices();
    if (invoices.length > 0) {
      this.loadInvoice(invoices[0]);
    } else {
      // First time user: Load rich Demo Invoice for instant delight
      const demo = InvoiceModel.getDemoInvoice();
      this.loadInvoice(demo);
    }

    // 3. Populate Settings Tab Inputs
    this.populateSettingsForm();

    // 4. Bind All DOM Event Listeners
    this.bindEvents();

    // 5. Initial Render & Tab Setup
    UI.switchTab(this.activeTab);
    this.render();

    // 6. Handle responsive layout on window resize
    window.addEventListener('resize', () => {
      UI.switchTab(this.activeTab);
    });

    console.log('Invoice Generator App Initialized');
  }

  // --- Load Invoice into Form & State ---
  loadInvoice(invoiceData) {
    this.currentInvoice = JSON.parse(JSON.stringify(invoiceData));
    this.populateFormFromInvoice();
    this.calculateAndUpdatePreview();
  }

  createNewInvoice() {
    const blank = InvoiceModel.getBlankInvoice();
    this.loadInvoice(blank);
    UI.switchTab('editor');
    UI.showToast('Created new blank invoice', 'info');
  }

  loadDemoInvoice() {
    const demo = InvoiceModel.getDemoInvoice();
    this.loadInvoice(demo);
    UI.switchTab('editor');
    UI.showToast('Demo invoice loaded!', 'success');
  }

  // --- Populate Editor Form Fields ---
  populateFormFromInvoice() {
    const inv = this.currentInvoice;
    if (!inv) return;

    // Sender / Business
    const sender = inv.sender || {};
    this.setVal('sender-business-name', sender.businessName);
    this.setVal('sender-email', sender.senderEmail);
    this.setVal('sender-phone', sender.senderPhone);
    this.setVal('sender-address', sender.senderAddress);
    this.setVal('sender-website', sender.senderWebsite);
    this.setVal('sender-tax-id', sender.senderTaxId);
    this.setVal('sender-bank-name', sender.bankName);
    this.setVal('sender-account-num', sender.accountNumber);
    this.setVal('sender-routing-num', sender.routingNumber);
    this.setVal('sender-upi-link', sender.upiOrPaymentLink);

    // Sender Logo preview
    const logoPreviewBox = document.getElementById('logo-preview-box');
    const logoUploadZone = document.getElementById('logo-upload-zone');
    const logoPreviewImg = document.getElementById('logo-preview-img');

    if (sender.logo && logoPreviewBox && logoPreviewImg) {
      logoPreviewImg.src = sender.logo;
      logoPreviewBox.style.display = 'flex';
      if (logoUploadZone) logoUploadZone.style.display = 'none';
    } else {
      if (logoPreviewBox) logoPreviewBox.style.display = 'none';
      if (logoUploadZone) logoUploadZone.style.display = 'block';
    }

    // Client Details
    const client = inv.client || {};
    this.setVal('client-name', client.name);
    this.setVal('client-contact', client.contactPerson);
    this.setVal('client-email', client.email);
    this.setVal('client-phone', client.phone);
    this.setVal('client-address', client.address);
    this.setVal('client-shipping', client.shippingAddress);
    this.setVal('client-tax-id', client.taxId);

    // Invoice Meta
    this.setVal('inv-number', inv.invoiceNumber);
    this.setVal('inv-po-number', inv.poNumber);
    this.setVal('inv-issue-date', inv.issueDate);
    this.setVal('inv-due-date', inv.dueDate);
    this.setVal('inv-status-select', inv.status || 'draft');
    this.setVal('inv-currency-select', inv.currency || 'USD');

    // Totals Controls
    this.setVal('inv-discount-type', inv.discountType || 'percentage');
    this.setVal('inv-discount-val', inv.discountValue || 0);
    this.setVal('inv-tax-label', inv.taxLabel || 'Tax / GST');
    this.setVal('inv-tax-rate', inv.taxRate || 0);
    this.setVal('inv-shipping-fee', inv.shippingFee || 0);
    this.setVal('inv-paid-amount', inv.paidAmount || 0);

    const roundOffCheckbox = document.getElementById('inv-round-off');
    if (roundOffCheckbox) roundOffCheckbox.checked = !!inv.enableRoundOff;

    // Notes & Terms
    this.setVal('inv-notes', inv.notes);
    this.setVal('inv-terms', inv.terms);

    // Render Line Items
    UI.renderLineItems(inv.items, inv.currencySymbol || '$');
  }

  // --- Collect Form Fields into Current State ---
  syncFormToState() {
    if (!this.currentInvoice) return;

    // Currency metadata
    const currencyCode = this.getVal('inv-currency-select') || 'USD';
    const currObj = CURRENCIES[currencyCode] || { symbol: '$', code: currencyCode };

    this.currentInvoice.currency = currencyCode;
    this.currentInvoice.currencySymbol = currObj.symbol;

    // Sender
    this.currentInvoice.sender = {
      ...this.currentInvoice.sender,
      businessName: this.getVal('sender-business-name'),
      senderEmail: this.getVal('sender-email'),
      senderPhone: this.getVal('sender-phone'),
      senderAddress: this.getVal('sender-address'),
      senderWebsite: this.getVal('sender-website'),
      senderTaxId: this.getVal('sender-tax-id'),
      bankName: this.getVal('sender-bank-name'),
      accountNumber: this.getVal('sender-account-num'),
      routingNumber: this.getVal('sender-routing-num'),
      upiOrPaymentLink: this.getVal('sender-upi-link')
    };

    // Client
    this.currentInvoice.client = {
      name: this.getVal('client-name'),
      contactPerson: this.getVal('client-contact'),
      email: this.getVal('client-email'),
      phone: this.getVal('client-phone'),
      address: this.getVal('client-address'),
      shippingAddress: this.getVal('client-shipping'),
      taxId: this.getVal('client-tax-id')
    };

    // Invoice Meta
    this.currentInvoice.invoiceNumber = this.getVal('inv-number');
    this.currentInvoice.poNumber = this.getVal('inv-po-number');
    this.currentInvoice.issueDate = this.getVal('inv-issue-date');
    this.currentInvoice.dueDate = this.getVal('inv-due-date');
    this.currentInvoice.status = this.getVal('inv-status-select');

    // Line items sync from DOM (desktop or mobile container)
    const isDesktop = window.innerWidth >= 1024;
    const container = isDesktop 
      ? document.getElementById('line-items-tbody') 
      : document.getElementById('line-items-cards');

    if (container) {
      const rowsOrCards = container.querySelectorAll('[data-id]');
      const items = [];
      rowsOrCards.forEach(el => {
        const id = el.getAttribute('data-id');
        const desc = el.querySelector('.item-desc') ? el.querySelector('.item-desc').value : '';
        const notes = el.querySelector('.item-notes') ? el.querySelector('.item-notes').value : '';
        const qty = parseFloat(el.querySelector('.item-qty') ? el.querySelector('.item-qty').value : 1) || 0;
        const unit = el.querySelector('.item-unit') ? el.querySelector('.item-unit').value : 'units';
        const rate = parseFloat(el.querySelector('.item-rate') ? el.querySelector('.item-rate').value : 0) || 0;

        items.push({ id, description: desc, notes, quantity: qty, unit, rate });
      });
      this.currentInvoice.items = items;
    }

    // Totals Controls
    this.currentInvoice.discountType = this.getVal('inv-discount-type');
    this.currentInvoice.discountValue = parseFloat(this.getVal('inv-discount-val')) || 0;
    this.currentInvoice.taxLabel = this.getVal('inv-tax-label') || 'Tax / GST';
    this.currentInvoice.taxRate = parseFloat(this.getVal('inv-tax-rate')) || 0;
    this.currentInvoice.shippingFee = parseFloat(this.getVal('inv-shipping-fee')) || 0;
    this.currentInvoice.paidAmount = parseFloat(this.getVal('inv-paid-amount')) || 0;

    const roundOffCheckbox = document.getElementById('inv-round-off');
    this.currentInvoice.enableRoundOff = roundOffCheckbox ? roundOffCheckbox.checked : false;

    // Notes & Terms
    this.currentInvoice.notes = this.getVal('inv-notes');
    this.currentInvoice.terms = this.getVal('inv-terms');
  }

  // --- Calculate Financials & Trigger Live Preview Update ---
  calculateAndUpdatePreview() {
    if (!this.currentInvoice) return;

    const totals = InvoiceModel.calculateTotals(this.currentInvoice);

    // Update Form Subtotal & Totals Displays
    const sym = this.currentInvoice.currencySymbol || '$';
    const curr = this.currentInvoice.currency || 'USD';

    this.setText('summary-subtotal-val', InvoiceModel.formatCurrency(totals.subtotal, curr, sym));
    this.setText('summary-discount-val', `- ${InvoiceModel.formatCurrency(totals.discountAmount, curr, sym)}`);
    this.setText('summary-tax-val', InvoiceModel.formatCurrency(totals.taxAmount, curr, sym));
    this.setText('summary-shipping-val', InvoiceModel.formatCurrency(totals.shippingFee, curr, sym));
    this.setText('summary-grand-total-val', InvoiceModel.formatCurrency(totals.grandTotal, curr, sym));
    this.setText('summary-balance-due-val', InvoiceModel.formatCurrency(totals.balanceDue, curr, sym));
    this.setText('summary-words-val', totals.totalInWords);

    // Update Live Preview Sheet
    UI.renderPreview(this.currentInvoice, totals);
  }

  // Debounced input handler for high-performance live sync
  onFormInput() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncFormToState();
      this.calculateAndUpdatePreview();
    }, 80);
  }

  // --- Save Current Invoice to Storage ---
  saveCurrentInvoice() {
    this.syncFormToState();
    
    if (!this.currentInvoice.invoiceNumber || !this.currentInvoice.invoiceNumber.trim()) {
      UI.showToast('Please specify an invoice number', 'warning');
      return;
    }

    const saved = Storage.saveInvoice(this.currentInvoice);
    if (saved) {
      this.currentInvoice = saved;
      UI.showToast(`Invoice ${saved.invoiceNumber} saved successfully!`, 'success');
      UI.renderHistory();
    } else {
      UI.showToast('Failed to save invoice', 'danger');
    }
  }

  // --- Line Items Operations ---
  addLineItem() {
    if (!this.currentInvoice) return;
    this.syncFormToState();
    
    this.currentInvoice.items.push({
      id: 'item_' + Date.now(),
      description: '',
      notes: '',
      quantity: 1,
      unit: 'units',
      rate: 0
    });

    UI.renderLineItems(this.currentInvoice.items, this.currentInvoice.currencySymbol || '$');
    this.calculateAndUpdatePreview();
    UI.showToast('Added line item', 'info', 1500);
  }

  duplicateLineItem(itemId) {
    if (!this.currentInvoice) return;
    this.syncFormToState();

    const idx = this.currentInvoice.items.findIndex(i => i.id === itemId);
    if (idx >= 0) {
      const clone = {
        ...this.currentInvoice.items[idx],
        id: 'item_' + Date.now()
      };
      this.currentInvoice.items.splice(idx + 1, 0, clone);
      UI.renderLineItems(this.currentInvoice.items, this.currentInvoice.currencySymbol || '$');
      this.calculateAndUpdatePreview();
      UI.showToast('Duplicated line item', 'info', 1500);
    }
  }

  deleteLineItem(itemId) {
    if (!this.currentInvoice) return;
    this.syncFormToState();

    if (this.currentInvoice.items.length <= 1) {
      UI.showToast('Invoice must have at least one line item', 'warning');
      return;
    }

    this.currentInvoice.items = this.currentInvoice.items.filter(i => i.id !== itemId);
    UI.renderLineItems(this.currentInvoice.items, this.currentInvoice.currencySymbol || '$');
    this.calculateAndUpdatePreview();
  }

  // --- Logo Handling (Base64 & Image Optimization) ---
  handleLogoFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      UI.showToast('Please select a valid image file (PNG, JPG, SVG, WebP)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;
      if (!this.currentInvoice.sender) this.currentInvoice.sender = {};
      this.currentInvoice.sender.logo = base64Data;

      // Update Form preview
      const logoPreviewBox = document.getElementById('logo-preview-box');
      const logoUploadZone = document.getElementById('logo-upload-zone');
      const logoPreviewImg = document.getElementById('logo-preview-img');

      if (logoPreviewImg) logoPreviewImg.src = base64Data;
      if (logoPreviewBox) logoPreviewBox.style.display = 'flex';
      if (logoUploadZone) logoUploadZone.style.display = 'none';

      this.calculateAndUpdatePreview();
      UI.showToast('Logo uploaded!', 'success');
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    if (this.currentInvoice.sender) {
      this.currentInvoice.sender.logo = '';
    }
    const logoPreviewBox = document.getElementById('logo-preview-box');
    const logoUploadZone = document.getElementById('logo-upload-zone');
    const logoInput = document.getElementById('sender-logo-input');

    if (logoPreviewBox) logoPreviewBox.style.display = 'none';
    if (logoUploadZone) logoUploadZone.style.display = 'block';
    if (logoInput) logoInput.value = '';

    this.calculateAndUpdatePreview();
    UI.showToast('Logo removed', 'info');
  }

  // --- Save Profile as Default ---
  saveCurrentSenderAsDefault() {
    this.syncFormToState();
    const sender = this.currentInvoice.sender || {};
    const success = Storage.saveProfile(sender);
    if (success) {
      UI.showToast('Sender profile saved as default for new invoices!', 'success');
    }
  }

  // --- Populate Settings Tab ---
  populateSettingsForm() {
    const profile = Storage.getProfile();
    const settings = Storage.getSettings();

    this.setVal('set-profile-name', profile.businessName);
    this.setVal('set-profile-email', profile.senderEmail);
    this.setVal('set-profile-phone', profile.senderPhone);
    this.setVal('set-profile-address', profile.senderAddress);
    this.setVal('set-profile-tax', profile.senderTaxId);
    this.setVal('set-profile-bank', profile.bankName);
    this.setVal('set-profile-acc', profile.accountNumber);
    this.setVal('set-profile-routing', profile.routingNumber);
    this.setVal('set-profile-upi', profile.upiOrPaymentLink);

    this.setVal('set-inv-prefix', settings.invoicePrefix);
    this.setVal('set-default-tax', settings.defaultTaxRate);
    this.setVal('set-default-notes', settings.defaultNotes);
    this.setVal('set-default-terms', settings.defaultTerms);
  }

  saveSettingsTab() {
    const profile = {
      businessName: this.getVal('set-profile-name'),
      senderEmail: this.getVal('set-profile-email'),
      senderPhone: this.getVal('set-profile-phone'),
      senderAddress: this.getVal('set-profile-address'),
      senderTaxId: this.getVal('set-profile-tax'),
      bankName: this.getVal('set-profile-bank'),
      accountNumber: this.getVal('set-profile-acc'),
      routingNumber: this.getVal('set-profile-routing'),
      upiOrPaymentLink: this.getVal('set-profile-upi'),
      logo: (this.currentInvoice && this.currentInvoice.sender && this.currentInvoice.sender.logo) || Storage.getProfile().logo || ''
    };

    const settings = {
      ...Storage.getSettings(),
      invoicePrefix: this.getVal('set-inv-prefix') || 'INV-',
      defaultTaxRate: parseFloat(this.getVal('set-default-tax')) || 0,
      defaultNotes: this.getVal('set-default-notes'),
      defaultTerms: this.getVal('set-default-terms')
    };

    Storage.saveProfile(profile);
    Storage.saveSettings(settings);
    UI.showToast('Settings and business profile updated!', 'success');
  }

  // --- Bind All Events ---
  bindEvents() {
    // 1. Navigation Tabs
    document.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', (e) => {
        const tab = el.getAttribute('data-tab');
        this.activeTab = tab;
        UI.switchTab(tab);
      });
    });

    // 2. Theme Toggle Button
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = Storage.getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        UI.setTheme(next);
        UI.showToast(`Switched to ${next} mode`, 'info', 1500);
      });
    }

    // 3. Accent Color Swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const accent = swatch.getAttribute('data-accent');
        UI.setAccent(accent);
      });
    });

    // 4. Template Selector
    const templateSelect = document.getElementById('setting-template-select');
    if (templateSelect) {
      templateSelect.addEventListener('change', (e) => {
        UI.setTemplate(e.target.value);
      });
    }

    // 5. Form Input Event Delegation (Live Sync)
    const formSection = document.getElementById('invoice-form');
    if (formSection) {
      formSection.addEventListener('input', () => this.onFormInput());
      formSection.addEventListener('change', () => this.onFormInput());
    }

    // 6. Line Item Action Delegation (Add, Duplicate, Remove)
    document.addEventListener('click', (e) => {
      // Add Line Item
      if (e.target.closest('#btn-add-line-item') || e.target.closest('#btn-add-line-item-mobile')) {
        this.addLineItem();
      }

      // Duplicate Line Item
      const dupBtn = e.target.closest('.btn-duplicate-item');
      if (dupBtn) {
        const parent = dupBtn.closest('[data-id]');
        if (parent) this.duplicateLineItem(parent.getAttribute('data-id'));
      }

      // Delete Line Item
      const delBtn = e.target.closest('.btn-delete-item');
      if (delBtn) {
        const parent = delBtn.closest('[data-id]');
        if (parent) this.deleteLineItem(parent.getAttribute('data-id'));
      }

      // Quick Due Date Helpers (Net 7, Net 15, Net 30, Net 60, Receipt)
      const pill = e.target.closest('.helper-pill[data-days]');
      if (pill) {
        const days = parseInt(pill.getAttribute('data-days'), 10);
        const issueDate = this.getVal('inv-issue-date') || InvoiceModel.formatDateToISO();
        const dueDate = InvoiceModel.calculateDueDate(issueDate, days);
        this.setVal('inv-due-date', dueDate);
        this.onFormInput();
        
        // Highlight active pill
        document.querySelectorAll('.helper-pill[data-days]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      }

      // Saved Clients Picker Button
      if (e.target.closest('#btn-pick-client')) {
        UI.openClientPicker((client) => {
          this.setVal('client-name', client.name);
          this.setVal('client-contact', client.contactPerson);
          this.setVal('client-email', client.email);
          this.setVal('client-phone', client.phone);
          this.setVal('client-address', client.address);
          this.setVal('client-shipping', client.shippingAddress);
          this.setVal('client-tax-id', client.taxId);
          this.onFormInput();
        });
      }

      // Save Default Profile Button
      if (e.target.closest('#btn-save-default-profile')) {
        this.saveCurrentSenderAsDefault();
      }

      // Save Invoice Button
      if (e.target.closest('#btn-save-invoice') || e.target.closest('#btn-save-invoice-mobile')) {
        this.saveCurrentInvoice();
      }

      // New Invoice Button
      if (e.target.closest('#btn-new-invoice')) {
        this.createNewInvoice();
      }

      // Demo Invoice Loader
      if (e.target.closest('#btn-load-demo') || e.target.closest('#btn-load-demo-empty')) {
        this.loadDemoInvoice();
      }

      // Export Actions
      if (e.target.closest('.btn-export-pdf')) {
        this.syncFormToState();
        Exporter.downloadPDF(this.currentInvoice.invoiceNumber || 'Invoice');
      }

      if (e.target.closest('.btn-export-png')) {
        this.syncFormToState();
        Exporter.downloadPNG(this.currentInvoice.invoiceNumber || 'Invoice');
      }

      if (e.target.closest('.btn-print-inv')) {
        this.syncFormToState();
        Exporter.printInvoice(this.currentInvoice.invoiceNumber || 'Invoice');
      }

      if (e.target.closest('.btn-share-inv')) {
        this.syncFormToState();
        const totals = InvoiceModel.calculateTotals(this.currentInvoice);
        Exporter.shareInvoice(this.currentInvoice, totals);
      }

      // History Actions
      const historyEditBtn = e.target.closest('.btn-edit-history');
      if (historyEditBtn) {
        const card = historyEditBtn.closest('.history-card');
        if (card) {
          const invId = card.getAttribute('data-id');
          const inv = Storage.getInvoiceById(invId);
          if (inv) {
            this.loadInvoice(inv);
            UI.switchTab('editor');
            UI.showToast(`Loaded invoice ${inv.invoiceNumber}`, 'info');
          }
        }
      }

      const historyDupBtn = e.target.closest('.btn-duplicate-history');
      if (historyDupBtn) {
        const card = historyDupBtn.closest('.history-card');
        if (card) {
          const invId = card.getAttribute('data-id');
          const inv = Storage.getInvoiceById(invId);
          if (inv) {
            const clone = JSON.parse(JSON.stringify(inv));
            clone.id = 'inv_' + Date.now();
            clone.invoiceNumber = Storage.generateNextInvoiceNumber();
            clone.issueDate = InvoiceModel.formatDateToISO();
            clone.dueDate = InvoiceModel.calculateDueDate(clone.issueDate, 15);
            clone.status = 'draft';
            this.loadInvoice(clone);
            this.saveCurrentInvoice();
            UI.switchTab('editor');
            UI.showToast(`Duplicated as new invoice ${clone.invoiceNumber}`, 'success');
          }
        }
      }

      const historyDelBtn = e.target.closest('.btn-delete-history');
      if (historyDelBtn) {
        const card = historyDelBtn.closest('.history-card');
        if (card) {
          const invId = card.getAttribute('data-id');
          if (confirm('Are you sure you want to delete this invoice? This cannot be undone.')) {
            Storage.deleteInvoice(invId);
            UI.renderHistory();
            UI.showToast('Invoice deleted', 'danger');
          }
        }
      }

      // Modal Close Triggers
      if (e.target.closest('.modal-close') || (e.target.classList.contains('modal-overlay'))) {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
      }
    });

    // 7. Logo Upload Zone Events (Click, Drag and Drop)
    const logoZone = document.getElementById('logo-upload-zone');
    const logoInput = document.getElementById('sender-logo-input');
    const logoRemoveBtn = document.getElementById('btn-remove-logo');

    if (logoZone && logoInput) {
      logoZone.addEventListener('click', () => logoInput.click());
      logoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleLogoFile(e.target.files[0]);
        }
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        logoZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          logoZone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        logoZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          logoZone.classList.remove('dragover');
        });
      });

      logoZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleLogoFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (logoRemoveBtn) {
      logoRemoveBtn.addEventListener('click', () => this.removeLogo());
    }

    // 8. History Search and Status Filters
    const historySearch = document.getElementById('history-search-input');
    const historyStatus = document.getElementById('history-status-filter');

    if (historySearch) {
      historySearch.addEventListener('input', () => {
        UI.renderHistory(historyStatus ? historyStatus.value : 'all', historySearch.value);
      });
    }

    if (historyStatus) {
      historyStatus.addEventListener('change', () => {
        UI.renderHistory(historyStatus.value, historySearch ? historySearch.value : '');
      });
    }

    // 9. Settings Tab Save & Backup Actions
    const saveSettingsBtn = document.getElementById('btn-save-settings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => this.saveSettingsTab());
    }

    const exportBackupBtn = document.getElementById('btn-export-backup');
    if (exportBackupBtn) {
      exportBackupBtn.addEventListener('click', () => Exporter.exportBackupFile());
    }

    const importBackupInput = document.getElementById('import-backup-file');
    if (importBackupInput) {
      importBackupInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          Exporter.importBackupFile(e.target.files[0]);
        }
      });
    }

    const clearAllDataBtn = document.getElementById('btn-clear-all-data');
    if (clearAllDataBtn) {
      clearAllDataBtn.addEventListener('click', () => {
        if (confirm('WARNING: This will erase all your saved invoices, client directory, and custom profile from this browser. Are you absolutely sure?')) {
          Storage.clearAllData();
          UI.showToast('All local data cleared. Refreshing...', 'warning');
          setTimeout(() => window.location.reload(), 800);
        }
      });
    }

    // 10. Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+S or Cmd+S -> Save Invoice
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentInvoice();
      }

      // Ctrl+P or Cmd+P -> Print / Export PDF
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        this.syncFormToState();
        Exporter.printInvoice(this.currentInvoice.invoiceNumber || 'Invoice');
      }

      // Ctrl+E or Cmd+E -> Direct PDF Download
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        this.syncFormToState();
        Exporter.downloadPDF(this.currentInvoice.invoiceNumber || 'Invoice');
      }

      // Ctrl+N or Ctrl+Shift+N -> New Invoice
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.createNewInvoice();
      }

      // Esc -> Close any open modal
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
      }

      // ? -> Open Keyboard Shortcuts modal
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        UI.openModal('modal-shortcuts');
      }
    });

    // Shortcuts trigger button
    const shortcutsBtn = document.getElementById('btn-shortcuts-modal');
    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', () => UI.openModal('modal-shortcuts'));
    }
  }

  // --- Helper DOM getters/setters ---
  getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  }

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  render() {
    this.calculateAndUpdatePreview();
    UI.renderHistory();
  }
}

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InvoiceApp();
  window.app.init();
});
