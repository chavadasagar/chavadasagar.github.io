// Storage Keys
const STORAGE_KEYS = {
  SETTINGS: 'skj_settings_db',
  ITEMS: 'skj_items_db',
  BILLS: 'skj_bills_db',
  THEME: 'skj_theme'
};

// Default Configurations
const DEFAULT_SETTINGS = {
  shopName: "Shree Khodiyar Jewellers",
  gstin: "24EBQPS9853C1Z2",
  address: "Rupnath Road, Bora Seri, Gadhada",
  state: "Gujarat",
  bankDetails: {
    bankName: "Bank of Baroda",
    ifsc: "BARBOGIRGAD",
    accountNo: "49970200000074"
  },
  footerNotes: [
    "દાનગીના નકદ કરી અપાવવાની રહેશે નહિ.",
    "આ માલ અમારી દુકાન નહિ ગીર ગઢડાથી આપેલ છે.",
    "ન્યાય ક્ષેત્ર ગઢડા રહેશે."
  ],
  cgstPct: 1.5,
  sgstPct: 1.5,
  nextBillNo: 1
};

const DEFAULT_ITEMS = [
  { name: "Gold Ring (સોનાની વીંટી)", hsn: "7113", defaultRate: 7200, defaultMaking: 450 },
  { name: "Gold Chain (સોનાનો ચેન)", hsn: "7113", defaultRate: 7200, defaultMaking: 600 },
  { name: "Gold Bangles (સોનાના પાટલા)", hsn: "7113", defaultRate: 7200, defaultMaking: 550 },
  { name: "Gold Mangalsutra (મંગળસૂત્ર)", hsn: "7113", defaultRate: 7200, defaultMaking: 800 },
  { name: "Silver Payal (ચાંદીની પાયલ)", hsn: "7113", defaultRate: 85, defaultMaking: 60 },
  { name: "Silver Ring (ચાંદીની વીંટી)", hsn: "7113", defaultRate: 90, defaultMaking: 40 }
];

// App State
let settings = {};
let items = [];
let bills = [];
let currentBillItems = [];

// Initialize Database
function initDatabase(forceReset = false) {
  if (forceReset || !localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (forceReset || !localStorage.getItem(STORAGE_KEYS.ITEMS)) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(DEFAULT_ITEMS));
  }
  if (forceReset || !localStorage.getItem(STORAGE_KEYS.BILLS)) {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify([]));
  }

  // Load into memory
  settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS));
  items = JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS));
  bills = JSON.parse(localStorage.getItem(STORAGE_KEYS.BILLS));
}

// Save functions
function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
function saveItems() {
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  updateDatalist();
}
function saveBills() {
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
}

// Premium Toast Notifications System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <span class="toast-close">&times;</span>
  `;
  
  // Close button handler
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); }, 400);
  });
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto dismiss after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.remove('show');
      setTimeout(() => { toast.remove(); }, 400);
    }
  }, 4000);
}

// DOM Elements - Using dynamic getters to prevent premature null bindings
const elements = {
  // Navigation Layout & Sidebar
  get navButtons() { return document.querySelectorAll('.nav-btn'); },
  get tabs() { return document.querySelectorAll('.tab-content'); },
  get btnToggleSidebar() { return document.getElementById('toggle-sidebar-btn'); },
  get sidebar() { return document.getElementById('app-sidebar'); },
  get sidebarBackdrop() { return document.getElementById('sidebar-backdrop'); },
  get globalSearch() { return document.getElementById('global-search'); },
  get navDateDisplay() { return document.getElementById('nav-date-display'); },
  
  // Stepper Header Indicators
  get stepInd1() { return document.getElementById('step-ind-1'); },
  get stepInd2() { return document.getElementById('step-ind-2'); },
  get stepInd3() { return document.getElementById('step-ind-3'); },
  get billStep1() { return document.getElementById('bill-step-1'); },
  get billStep2() { return document.getElementById('bill-step-2'); },
  get billStep3() { return document.getElementById('bill-step-3'); },
  get btnToStep2() { return document.getElementById('btn-to-step-2'); },
  get btnToStep3() { return document.getElementById('btn-to-step-3'); },
  get btnBackToStep1() { return document.getElementById('btn-back-to-step-1'); },
  get btnBackToStep2() { return document.getElementById('btn-back-to-step-2'); },
  get step3CustNameBadge() { return document.getElementById('step3-cust-name-badge'); },
  
  // Create Bill fields
  get custDate() { return document.getElementById('cust-date'); },
  get custName() { return document.getElementById('cust-name'); },
  get custPhone() { return document.getElementById('cust-phone'); },
  get custAddress() { return document.getElementById('cust-address'); },
  get custVillage() { return document.getElementById('cust-village'); },
  get custGstin() { return document.getElementById('cust-gstin'); },
  get custState() { return document.getElementById('cust-state'); },
  get currentBillNo() { return document.getElementById('current-bill-no'); },
  get itemsTbody() { return document.getElementById('items-tbody'); },
  get mobileItemsListContainer() { return document.getElementById('mobile-items-list-container'); },
  get itemsDatalist() { return document.getElementById('items-datalist'); },

  // Item Builder Inputs
  get builderItemDesc() { return document.getElementById('builder-item-desc'); },
  get builderItemHsn() { return document.getElementById('builder-item-hsn'); },
  get builderItemGross() { return document.getElementById('builder-item-gross'); },
  get builderItemNet() { return document.getElementById('builder-item-net'); },
  get builderItemRate() { return document.getElementById('builder-item-rate'); },
  get builderItemMaking() { return document.getElementById('builder-item-making'); },
  get builderPreviewAmount() { return document.getElementById('builder-preview-amount'); },
  get btnBuilderClear() { return document.getElementById('btn-builder-clear'); },
  get btnBuilderAdd() { return document.getElementById('btn-builder-add'); },
  get itemEditIndex() { return document.getElementById('item-edit-index'); },
  
  // Math Summary Displays
  get totalGrossWt() { return document.getElementById('total-gross-wt'); },
  get totalNetWt() { return document.getElementById('total-net-wt'); },
  get itemsSubtotal() { return document.getElementById('items-subtotal'); },
  get summaryCgstPct() { return document.getElementById('summary-cgst-pct'); },
  get summarySgstPct() { return document.getElementById('summary-sgst-pct'); },
  get itemsCgst() { return document.getElementById('items-cgst'); },
  get itemsSgst() { return document.getElementById('items-sgst'); },
  get itemsGrandTotal() { return document.getElementById('items-grand-total'); },
  get savePrintBtn() { return document.getElementById('save-print-btn'); },
  get resetBillBtn() { return document.getElementById('reset-bill-btn'); },
  
  // Invoices History List
  get historyTbody() { return document.getElementById('history-tbody'); },
  get searchQuery() { return document.getElementById('search-query'); },
  get filterDateStart() { return document.getElementById('filter-date-start'); },
  get filterDateEnd() { return document.getElementById('filter-date-end'); },
  get clearFiltersBtn() { return document.getElementById('clear-filters-btn'); },
  
  // Items Master Forms
  get itemMasterForm() { return document.getElementById('item-master-form'); },
  get itemName() { return document.getElementById('item-name'); },
  get itemHsn() { return document.getElementById('item-hsn'); },
  get itemDefaultRate() { return document.getElementById('item-default-rate'); },
  get itemDefaultMaking() { return document.getElementById('item-default-making'); },
  get saveItemBtn() { return document.getElementById('save-item-btn'); },
  get cancelItemEditBtn() { return document.getElementById('cancel-item-edit-btn'); },
  get editItemIndex() { return document.getElementById('edit-item-index'); },
  get itemListContainer() { return document.getElementById('item-list-container'); },
  
  // Settings Forms
  get settingsForm() { return document.getElementById('settings-form'); },
  get shopName() { return document.getElementById('shop-name'); },
  get shopGstin() { return document.getElementById('shop-gstin'); },
  get shopState() { return document.getElementById('shop-state'); },
  get shopAddress() { return document.getElementById('shop-address'); },
  get shopBank() { return document.getElementById('shop-bank'); },
  get shopIfsc() { return document.getElementById('shop-ifsc'); },
  get shopAccNo() { return document.getElementById('shop-acc-no'); },
  get shopCgstPct() { return document.getElementById('shop-cgst-pct'); },
  get shopSgstPct() { return document.getElementById('shop-sgst-pct'); },
  get shopNextBill() { return document.getElementById('shop-next-bill'); },
  get footerNotesContainer() { return document.getElementById('footer-notes-container'); },
  get addNoteBtn() { return document.getElementById('add-note-btn'); },
  get resetSystemBtn() { return document.getElementById('reset-system-btn'); },
  
  // Printable Invoice Components
  get printShopName() { return document.getElementById('print-shop-name'); },
  get printShopAddress() { return document.getElementById('print-shop-address'); },
  get printShopGstin() { return document.getElementById('print-shop-gstin'); },
  get printShopState() { return document.getElementById('print-shop-state'); },
  get printCustName() { return document.getElementById('print-cust-name'); },
  get printCustAddress() { return document.getElementById('print-cust-address'); },
  get printCustVillage() { return document.getElementById('print-cust-village'); },
  get printCustPhone() { return document.getElementById('print-cust-phone'); },
  get printCustGstin() { return document.getElementById('print-cust-gstin'); },
  get printCustState() { return document.getElementById('print-cust-state'); },
  get printInvoiceNo() { return document.getElementById('print-invoice-no'); },
  get printInvoiceDate() { return document.getElementById('print-invoice-date'); },
  get printItemsTbody() { return document.getElementById('print-items-tbody'); },
  get printBankDetails() { return document.getElementById('print-bank-details'); },
  get printFooterNotes() { return document.getElementById('print-footer-notes'); },
  get printTotalItems() { return document.getElementById('print-total-items'); },
  get printTotalGross() { return document.getElementById('print-total-gross'); },
  get printTotalNet() { return document.getElementById('print-total-net'); },
  get printSubtotal() { return document.getElementById('print-subtotal'); },
  get printCgstPct() { return document.getElementById('print-cgst-pct'); },
  get printCgstAmt() { return document.getElementById('print-cgst-amt'); },
  get printSgstPct() { return document.getElementById('print-sgst-pct'); },
  get printSgstAmt() { return document.getElementById('print-sgst-amt'); },
  get printGrandTotal() { return document.getElementById('print-grand-total'); },
  get printFooterShopName() { return document.getElementById('print-footer-shop-name'); },
  get searchResultsPopup() { return document.getElementById('search-results-popup'); },
  get themeToggleBtn() { return document.getElementById('theme-toggle-btn'); },
  get themeIcon() { return document.getElementById('theme-icon'); }
};

// Setup Event Listeners after DOM is guaranteed ready
function setupEventListeners() {
  // Sidebar Toggle Functionality (for Mobile/Tablets)
  elements.btnToggleSidebar.addEventListener('click', () => {
    elements.sidebar.classList.toggle('active');
    elements.sidebarBackdrop.classList.toggle('active');
  });

  elements.sidebarBackdrop.addEventListener('click', () => {
    elements.sidebar.classList.remove('active');
    elements.sidebarBackdrop.classList.remove('active');
  });

  // Nav buttons click
  elements.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // Global Search Keyboard & Synonym-matching Autocomplete Handler
  let currentHighlightIndex = -1;

  function updateSearchHighlight(items) {
    items.forEach((item, idx) => {
      if (idx === currentHighlightIndex) {
        item.classList.add('highlighted');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('highlighted');
      }
    });
  }

  elements.globalSearch.addEventListener('input', (e) => {
    const rawVal = e.target.value;
    const query = rawVal.toLowerCase().trim();
    const popup = elements.searchResultsPopup;
    currentHighlightIndex = -1; // Reset highlight on input change
    
    if (!query) {
      popup.innerHTML = '';
      popup.classList.remove('active');
      if (document.getElementById('bill-history').classList.contains('active')) {
        elements.searchQuery.value = '';
        renderBillsList();
      }
      return;
    }
    
    // 1. Search Sidebar Tabs with synonyms/aliases
    const matchedMenu = [];
    const menuOptions = [
      { names: ['create', 'bill', 'invoice', 'new', 'billing', 'wizard', 'nava', 'print', 'chalan'], label: 'Create Bill', desc: 'Create new customer invoices', tabId: 'create-bill' },
      { names: ['history', 'saved', 'list', 'invoices', 'bills', 'log', 'check', 'report'], label: 'Bill History', desc: 'View, search, print or delete saved bills', tabId: 'bill-history' },
      { names: ['items', 'item', 'jewel', 'jewellery', 'gold', 'silver', 'templates', 'daagina', 'rate'], label: 'Jewellery Items', desc: 'Manage default jewellery items templates', tabId: 'item-master' },
      { names: ['settings', 'setting', 'config', 'setup', 'bank', 'shop', 'details'], label: 'Shop Settings', desc: 'Configure shop metadata, tax rates and terms', tabId: 'settings' }
    ];
    
    // Check if query is a general menu/page request
    const isMenuKeyword = ['menu', 'meju', 'page', 'pages', 'tab', 'tabs', 'nav', 'navigation'].some(kw => query.includes(kw) || kw.includes(query));
    
    menuOptions.forEach(opt => {
      const match = isMenuKeyword || opt.names.some(name => name.includes(query) || query.includes(name));
      if (match) {
        matchedMenu.push(opt);
      }
    });
    
    // 2. Search Bills Database (Customer, Bill No, Village, Phone)
    let matchedBills = bills.filter(bill => {
      const nameMatch = bill.customer.name.toLowerCase().includes(query);
      const billNoMatch = bill.billNo.toString().includes(query) || String(bill.billNo).padStart(4, '0').includes(query);
      const phoneMatch = bill.customer.phone && bill.customer.phone.includes(query);
      const villageMatch = bill.customer.village && bill.customer.village.toLowerCase().includes(query);
      return nameMatch || billNoMatch || phoneMatch || villageMatch;
    });
    
    // Generic fallback: if no specific bills match but query contains bill/customer terms, show 5 most recent
    if (matchedBills.length === 0) {
      const isBillGenericKeyword = ['bill', 'bills', 'invoice', 'invoices', 'history', 'saved', 'customer', 'customers', 'cusomer', 'billno', 'bill no'].some(kw => query === kw || query.includes(kw));
      if (isBillGenericKeyword) {
        matchedBills = [...bills].sort((a, b) => b.billNo - a.billNo).slice(0, 5);
      }
    }
    
    // 3. Render HTML
    if (matchedMenu.length === 0 && matchedBills.length === 0) {
      popup.innerHTML = `<div class="search-popup-empty">No results found for "${rawVal}"</div>`;
      popup.classList.add('active');
      return;
    }
    
    let htmlContent = '';
    
    // Render Navigation Tab matches
    if (matchedMenu.length > 0) {
      htmlContent += `<div class="search-result-group">
        <div class="search-result-group-title">Menu / Pages</div>`;
      matchedMenu.forEach((opt) => {
        htmlContent += `
          <div class="search-result-item menu-result-item" data-tab="${opt.tabId}">
            <div class="item-info-block">
              <span class="item-title">${opt.label}</span>
              <span class="item-subtitle">${opt.desc}</span>
            </div>
            <span style="color: var(--gold-primary); font-size: 0.8rem;">Go to ➔</span>
          </div>`;
      });
      htmlContent += `</div>`;
    }
    
    // Render Invoices matches
    if (matchedBills.length > 0) {
      htmlContent += `<div class="search-result-group">
        <div class="search-result-group-title">Saved Invoices</div>`;
      matchedBills.forEach(bill => {
        const formattedBillNo = String(bill.billNo).padStart(4, '0');
        htmlContent += `
          <div class="search-result-item bill-result-item" data-bill-no="${bill.billNo}">
            <div class="item-info-block">
              <span class="item-title">Bill #${formattedBillNo} - ${bill.customer.name}</span>
              <span class="item-subtitle">${bill.customer.village || '-'} | ₹${bill.grandTotal.toFixed(2)} | ${formatDate(bill.date)}</span>
            </div>
            <button class="action-btn-sm btn-print-bill-pop" data-bill-no="${bill.billNo}" title="Print Directly">
              🖨️ Print
            </button>
          </div>`;
      });
      htmlContent += `</div>`;
    }
    
    popup.innerHTML = htmlContent;
    popup.classList.add('active');
    
    const popupItems = popup.querySelectorAll('.search-result-item');
    
    // 4. Attach click & hover handlers inside the rendered popup
    popupItems.forEach((item, idx) => {
      // Mouseenter hover resets/aligns keyboard highlight
      item.addEventListener('mouseenter', () => {
        currentHighlightIndex = idx;
        updateSearchHighlight(popupItems);
      });
      
      // Handle click events based on type
      if (item.classList.contains('menu-result-item')) {
        item.addEventListener('click', () => {
          const tabId = item.getAttribute('data-tab');
          switchTab(tabId);
          elements.globalSearch.value = '';
          popup.classList.remove('active');
        });
      } else if (item.classList.contains('bill-result-item')) {
        item.addEventListener('click', (event) => {
          if (event.target.classList.contains('btn-print-bill-pop')) return;
          const billNo = item.getAttribute('data-bill-no');
          switchTab('bill-history');
          elements.searchQuery.value = billNo;
          elements.globalSearch.value = '';
          popup.classList.remove('active');
          renderBillsList();
        });
      }
    });
    
    // Direct Print button inside autocomplete click handler
    popup.querySelectorAll('.btn-print-bill-pop').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation(); // Stop parent bill item click
        const billNo = parseInt(btn.getAttribute('data-bill-no'));
        const matchedBill = bills.find(b => b.billNo === billNo);
        if (matchedBill) {
          printBill(matchedBill);
          popup.classList.remove('active');
          elements.globalSearch.value = '';
        }
      });
    });
  });

  // Handle keyboard navigation on globalSearch input
  elements.globalSearch.addEventListener('keydown', (e) => {
    const popup = elements.searchResultsPopup;
    if (!popup || !popup.classList.contains('active')) return;
    
    const popupItems = popup.querySelectorAll('.search-result-item');
    if (popupItems.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentHighlightIndex++;
      if (currentHighlightIndex >= popupItems.length) {
        currentHighlightIndex = 0;
      }
      updateSearchHighlight(popupItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentHighlightIndex--;
      if (currentHighlightIndex < 0) {
        currentHighlightIndex = popupItems.length - 1;
      }
      updateSearchHighlight(popupItems);
    } else if (e.key === 'Enter') {
      if (currentHighlightIndex >= 0 && currentHighlightIndex < popupItems.length) {
        e.preventDefault();
        popupItems[currentHighlightIndex].click();
      }
    } else if (e.key === 'Escape') {
      popup.classList.remove('active');
    }
  });

  // Close Autocomplete search popup on click-outside
  document.addEventListener('click', (event) => {
    const popup = elements.searchResultsPopup;
    if (popup && !elements.globalSearch.contains(event.target) && !popup.contains(event.target)) {
      popup.classList.remove('active');
    }
  });

  // Wizard Step Navigation & Input Sanitization
  elements.btnToStep2.addEventListener('click', () => {
    const customerName = elements.custName.value.trim();
    const invoiceDate = elements.custDate.value;
    const phoneVal = elements.custPhone.value.trim();
    const addressVal = elements.custAddress.value.trim();
    
    if (!customerName) {
      showToast("Please enter Customer Name.", "warning");
      elements.custName.focus();
      return;
    }
    if (!invoiceDate) {
      showToast("Please select Invoice Date.", "warning");
      elements.custDate.focus();
      return;
    }
    if (!phoneVal) {
      showToast("Please enter Phone Number.", "warning");
      elements.custPhone.focus();
      return;
    }
    if (phoneVal.length !== 10) {
      showToast("Phone number must be exactly 10 digits.", "warning");
      elements.custPhone.focus();
      return;
    }
    if (!addressVal) {
      showToast("Please enter Customer Address.", "warning");
      elements.custAddress.focus();
      return;
    }
    
    switchStep(2);
  });

  elements.btnToStep3.addEventListener('click', () => {
    const villageVal = elements.custVillage.value.trim();
    const gstinVal = elements.custGstin.value.trim();
    const stateVal = elements.custState.value.trim();
    
    if (!villageVal) {
      showToast("Please enter Village / City.", "warning");
      elements.custVillage.focus();
      return;
    }
    if (gstinVal && gstinVal.length !== 15) {
      showToast("Customer GSTIN must be exactly 15 characters.", "warning");
      elements.custGstin.focus();
      return;
    }
    if (!stateVal) {
      showToast("Please enter Customer State.", "warning");
      elements.custState.focus();
      return;
    }
    
    elements.step3CustNameBadge.textContent = elements.custName.value.trim();
    switchStep(3);
  });

  elements.btnBackToStep1.addEventListener('click', () => {
    switchStep(1);
  });

  elements.btnBackToStep2.addEventListener('click', () => {
    switchStep(2);
  });

  // Live input sanitization for Phone (numbers only, max 10)
  elements.custPhone.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
  });

  // Live input sanitization for GSTIN (alphanumeric, uppercase, max 15)
  elements.custGstin.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
  });

  // Reset Bill Wizard
  elements.resetBillBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear this billing wizard? All typed customer and item inputs will be reset.")) {
      resetBillForm();
    }
  });

  // Save & Print Invoice Handler
  elements.savePrintBtn.addEventListener('click', () => {
    const customerName = elements.custName.value.trim();
    const billDate = elements.custDate.value;
    const phoneVal = elements.custPhone.value.trim();
    const addressVal = elements.custAddress.value.trim();
    const villageVal = elements.custVillage.value.trim();
    const gstinVal = elements.custGstin.value.trim();
    const stateVal = elements.custState.value.trim();
    
    // Check Step 1 details
    if (!customerName || !billDate || !phoneVal || !addressVal) {
      showToast("Customer details are incomplete. Returning to Step 1.", "error");
      switchStep(1);
      return;
    }
    if (phoneVal.length !== 10) {
      showToast("Phone number must be exactly 10 digits.", "warning");
      switchStep(1);
      elements.custPhone.focus();
      return;
    }
    
    // Check Step 2 details
    if (!villageVal || !stateVal) {
      showToast("Location details are incomplete. Returning to Step 2.", "error");
      switchStep(2);
      return;
    }
    if (gstinVal && gstinVal.length !== 15) {
      showToast("Customer GSTIN must be exactly 15 characters.", "warning");
      switchStep(2);
      elements.custGstin.focus();
      return;
    }
    
    // Check Step 3 items
    if (currentBillItems.length === 0) {
      showToast("Please add at least one jewellery item to the bill.", "error");
      return;
    }
    
    const calcs = calculateTotals();
    const billItemsList = currentBillItems.map((item, idx) => ({
      srNo: idx + 1,
      description: item.description,
      hsn: item.hsn,
      grossWeight: item.grossWeight,
      netWeight: item.netWeight,
      rate: item.rate,
      makingCharge: item.makingCharge,
      amount: item.amount
    }));
    
    const currentBill = {
      billNo: settings.nextBillNo,
      date: billDate,
      customer: {
        name: customerName,
        phone: phoneVal,
        address: addressVal,
        village: villageVal,
        gstin: gstinVal.toUpperCase(),
        state: stateVal
      },
      items: billItemsList,
      totalGrossWeight: calcs.totalGross,
      totalNetWeight: calcs.totalNet,
      subtotal: calcs.subtotal,
      cgstPct: settings.cgstPct,
      cgstAmount: calcs.cgstAmt,
      sgstPct: settings.sgstPct,
      sgstAmount: calcs.sgstAmt,
      grandTotal: calcs.grandTotal,
      shopSnapshot: {
        shopName: settings.shopName,
        address: settings.address,
        gstin: settings.gstin,
        state: settings.state,
        bankDetails: { ...settings.bankDetails },
        footerNotes: [...settings.footerNotes]
      }
    };
    
    bills.push(currentBill);
    saveBills();
    printBill(currentBill);
    
    settings.nextBillNo = parseInt(settings.nextBillNo) + 1;
    saveSettings();
    resetBillForm();
  });

  // Item Builder Inputs Auto-completion
  elements.builderItemDesc.addEventListener('input', (e) => {
    const val = e.target.value;
    const match = items.find(item => item.name.toLowerCase() === val.toLowerCase());
    if (match) {
      elements.builderItemHsn.value = match.hsn || '7113';
      if (match.defaultRate) elements.builderItemRate.value = match.defaultRate;
      if (match.defaultMaking !== undefined) elements.builderItemMaking.value = match.defaultMaking;
      updateBuilderPreview();
    }
  });

  // Copy Gross Weight to Net Weight on blur if net weight is empty
  elements.builderItemGross.addEventListener('blur', () => {
    if (elements.builderItemGross.value && !elements.builderItemNet.value) {
      elements.builderItemNet.value = elements.builderItemGross.value;
      updateBuilderPreview();
    }
  });

  // Live validation constraints and preview updates for weights, rates and making charges
  [elements.builderItemGross, elements.builderItemNet, elements.builderItemRate, elements.builderItemMaking].forEach(input => {
    input.addEventListener('input', (e) => {
      if (parseFloat(e.target.value) < 0) e.target.value = 0;
      updateBuilderPreview();
    });
  });

  // Confirm & Add/Update Item click handler
  elements.btnBuilderAdd.addEventListener('click', () => {
    const desc = elements.builderItemDesc.value.trim();
    const hsn = elements.builderItemHsn.value.trim() || '7113';
    const gross = parseFloat(elements.builderItemGross.value) || 0;
    const net = parseFloat(elements.builderItemNet.value) || 0;
    const rate = parseFloat(elements.builderItemRate.value) || 0;
    const making = parseFloat(elements.builderItemMaking.value) || 0;
    const editIndexVal = elements.itemEditIndex.value;
    
    if (!desc) {
      showToast("Please enter or select jewellery description.", "warning");
      elements.builderItemDesc.focus();
      return;
    }
    if (net <= 0) {
      showToast("Net weight must be greater than 0.", "warning");
      elements.builderItemNet.focus();
      return;
    }
    if (rate <= 0) {
      showToast("Rate must be greater than 0.", "warning");
      elements.builderItemRate.focus();
      return;
    }
    
    const amount = (net * rate) + making;
    const newItem = {
      description: desc,
      hsn,
      grossWeight: gross,
      netWeight: net,
      rate,
      makingCharge: making,
      amount
    };
    
    if (editIndexVal !== '') {
      const idx = parseInt(editIndexVal);
      currentBillItems[idx] = newItem;
      elements.itemEditIndex.value = '';
      elements.btnBuilderAdd.textContent = "Confirm & Add Item";
      elements.btnBuilderClear.style.display = "none";
      showToast("Jewellery item updated.", "success");
    } else {
      currentBillItems.push(newItem);
      showToast("Jewellery item added.", "success");
    }
    
    // Clear form inputs
    elements.builderItemDesc.value = '';
    elements.builderItemHsn.value = '7113';
    elements.builderItemGross.value = '';
    elements.builderItemNet.value = '';
    elements.builderItemRate.value = '';
    elements.builderItemMaking.value = '';
    elements.builderPreviewAmount.textContent = "₹ 0.00";
    
    renderAddedItems();
    calculateTotals();
  });

  // Cancel edit handler
  elements.btnBuilderClear.addEventListener('click', () => {
    elements.itemEditIndex.value = '';
    elements.builderItemDesc.value = '';
    elements.builderItemHsn.value = '7113';
    elements.builderItemGross.value = '';
    elements.builderItemNet.value = '';
    elements.builderItemRate.value = '';
    elements.builderItemMaking.value = '';
    elements.builderPreviewAmount.textContent = "₹ 0.00";
    elements.btnBuilderAdd.textContent = "Confirm & Add Item";
    elements.btnBuilderClear.style.display = "none";
    showToast("Edit cancelled.", "info");
  });

  // History filtering listeners
  elements.searchQuery.addEventListener('input', renderBillsList);
  elements.filterDateStart.addEventListener('change', renderBillsList);
  elements.filterDateEnd.addEventListener('change', renderBillsList);
  elements.clearFiltersBtn.addEventListener('click', () => {
    elements.searchQuery.value = '';
    elements.filterDateStart.value = '';
    elements.filterDateEnd.value = '';
    if (elements.globalSearch.value) {
      elements.globalSearch.value = '';
    }
    renderBillsList();
  });

  // Items master forms
  elements.cancelItemEditBtn.addEventListener('click', resetItemForm);
  elements.itemMasterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = elements.itemName.value.trim();
    const hsn = elements.itemHsn.value.trim() || '7113';
    const rateVal = parseFloat(elements.itemDefaultRate.value) || '';
    const makingVal = parseFloat(elements.itemDefaultMaking.value) || 0;
    const editIndex = elements.editItemIndex.value;
    
    const newItem = {
      name,
      hsn,
      defaultRate: rateVal,
      defaultMaking: makingVal
    };
    
    if (editIndex !== '') {
      items[parseInt(editIndex)] = newItem;
    } else {
      const duplicate = items.some(it => it.name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        showToast("A jewellery item template with this name already exists.", "warning");
        return;
      }
      items.push(newItem);
    }
    
    saveItems();
    resetItemForm();
    renderItemsList();
  });

  // Settings
  elements.addNoteBtn.addEventListener('click', () => {
    addFooterNoteInput('');
  });

  elements.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const notesInputs = elements.footerNotesContainer.querySelectorAll('.footer-note-input');
    const gatheredNotes = [];
    notesInputs.forEach(input => {
      if (input.value.trim()) {
        gatheredNotes.push(input.value.trim());
      }
    });
    
    settings = {
      shopName: elements.shopName.value.trim(),
      gstin: elements.shopGstin.value.trim().toUpperCase(),
      address: elements.shopAddress.value.trim(),
      state: elements.shopState.value.trim(),
      bankDetails: {
        bankName: elements.shopBank.value.trim(),
        ifsc: elements.shopIfsc.value.trim().toUpperCase(),
        accountNo: elements.shopAccNo.value.trim()
      },
      footerNotes: gatheredNotes,
      cgstPct: parseFloat(elements.shopCgstPct.value) || 0,
      sgstPct: parseFloat(elements.shopSgstPct.value) || 0,
      nextBillNo: parseInt(elements.shopNextBill.value) || 1
    };
    
    saveSettings();
    
    elements.currentBillNo.textContent = String(settings.nextBillNo).padStart(4, '0');
    elements.summaryCgstPct.textContent = settings.cgstPct;
    elements.summarySgstPct.textContent = settings.sgstPct;
    
    calculateTotals();
    showToast("Settings saved successfully!", "success");
  });

  // Live input constraints for Settings and Item Master inputs
  elements.itemHsn.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });
  elements.itemDefaultRate.addEventListener('input', (e) => {
    if (parseFloat(e.target.value) < 0) e.target.value = 0;
  });
  elements.itemDefaultMaking.addEventListener('input', (e) => {
    if (parseFloat(e.target.value) < 0) e.target.value = 0;
  });
  elements.shopCgstPct.addEventListener('input', (e) => {
    if (parseFloat(e.target.value) < 0) e.target.value = 0;
  });
  elements.shopSgstPct.addEventListener('input', (e) => {
    if (parseFloat(e.target.value) < 0) e.target.value = 0;
  });
  elements.shopNextBill.addEventListener('input', (e) => {
    if (parseInt(e.target.value) < 1) e.target.value = 1;
  });

  elements.resetSystemBtn.addEventListener('click', () => {
    if (confirm("WARNING: This will completely reset all configurations, items, and delete all saved invoices. Do you want to proceed?")) {
      initDatabase(true);
      initApp();
      showToast("Database has been reset to defaults!", "success");
    }
  });

  // Theme Toggle Click Handler
  elements.themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem(STORAGE_KEYS.THEME, isLight ? 'light' : 'dark');
    elements.themeIcon.textContent = isLight ? '☀️' : '🌙';
    showToast(`Switched to ${isLight ? 'Light' : 'Dark'} Mode`, 'info');
  });
}

// SPA Tab Switching Controller
function switchTab(tabId) {
  elements.navButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  elements.tabs.forEach(tab => {
    if (tab.id === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  elements.sidebar.classList.remove('active');
  elements.sidebarBackdrop.classList.remove('active');
  
  if (tabId === 'bill-history') {
    renderBillsList();
  } else if (tabId === 'item-master') {
    renderItemsList();
  } else if (tabId === 'settings') {
    loadSettingsForm();
  }
}

// Wizard Step Navigator
function switchStep(stepNum) {
  elements.billStep1.classList.toggle('active', stepNum === 1);
  elements.billStep2.classList.toggle('active', stepNum === 2);
  elements.billStep3.classList.toggle('active', stepNum === 3);
  
  elements.stepInd1.classList.toggle('active', stepNum === 1);
  elements.stepInd1.classList.toggle('completed', stepNum > 1);
  
  elements.stepInd2.classList.toggle('active', stepNum === 2);
  elements.stepInd2.classList.toggle('completed', stepNum > 2);
  
  elements.stepInd3.classList.toggle('active', stepNum === 3);
  elements.stepInd3.classList.toggle('completed', stepNum > 3);
  
  const line1 = document.getElementById('step-line-1');
  const line2 = document.getElementById('step-line-2');
  if (line1) {
    if (stepNum > 1) line1.classList.add('completed');
    else line1.classList.remove('completed');
  }
  if (line2) {
    if (stepNum > 2) line2.classList.add('completed');
    else line2.classList.remove('completed');
  }
}

// Format today's date for display
function updateNavbarDate() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const today = new Date();
  const dayName = days[today.getDay()];
  const dateNum = today.getDate();
  const monthName = months[today.getMonth()];
  const yearNum = today.getFullYear();
  
  elements.navDateDisplay.textContent = `${dayName}, ${monthName} ${dateNum}, ${yearNum}`;
}

// Theme Initialization
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    elements.themeIcon.textContent = '☀️';
  } else {
    document.body.classList.remove('light-mode');
    elements.themeIcon.textContent = '🌙';
  }
}

// App database initialization
function initApp() {
  initDatabase();
  initTheme();
  setupEventListeners();
  updateNavbarDate();
  
  // Pre-load default state data
  updateDatalist();
  resetBillForm();
}

// Clear builder forms
function resetBillForm() {
  elements.custName.value = '';
  elements.custPhone.value = '';
  elements.custAddress.value = '';
  elements.custVillage.value = '';
  elements.custGstin.value = '';
  elements.custState.value = 'Gujarat';
  
  // Set local timezone date YYYY-MM-DD
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  elements.custDate.value = `${yyyy}-${mm}-${dd}`;
  
  elements.currentBillNo.textContent = String(settings.nextBillNo).padStart(4, '0');
  elements.summaryCgstPct.textContent = settings.cgstPct;
  elements.summarySgstPct.textContent = settings.sgstPct;
  
  // Reset builder inputs
  elements.itemEditIndex.value = '';
  elements.builderItemDesc.value = '';
  elements.builderItemHsn.value = '7113';
  elements.builderItemGross.value = '';
  elements.builderItemNet.value = '';
  elements.builderItemRate.value = '';
  elements.builderItemMaking.value = '';
  elements.builderPreviewAmount.textContent = "₹ 0.00";
  elements.btnBuilderAdd.textContent = "Confirm & Add Item";
  elements.btnBuilderClear.style.display = "none";
  
  currentBillItems = [];
  
  switchStep(1);
  renderAddedItems();
  calculateTotals();
}

// Update suggestions datalist
function updateDatalist() {
  elements.itemsDatalist.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name;
    elements.itemsDatalist.appendChild(opt);
  });
}

// Append new row in items list
// Calculate totals dynamically using currentBillItems array
function calculateTotals() {
  let totalGross = 0;
  let totalNet = 0;
  let subtotal = 0;
  
  currentBillItems.forEach(item => {
    totalGross += item.grossWeight;
    totalNet += item.netWeight;
    subtotal += item.amount;
  });
  
  const cgstPct = parseFloat(settings.cgstPct) || 0;
  const sgstPct = parseFloat(settings.sgstPct) || 0;
  
  const cgstAmt = subtotal * (cgstPct / 100);
  const sgstAmt = subtotal * (sgstPct / 100);
  const grandTotal = subtotal + cgstAmt + sgstAmt;
  
  elements.totalGrossWt.textContent = totalGross.toFixed(3);
  elements.totalNetWt.textContent = totalNet.toFixed(3);
  elements.itemsSubtotal.textContent = subtotal.toFixed(2);
  elements.itemsCgst.textContent = cgstAmt.toFixed(2);
  elements.itemsSgst.textContent = sgstAmt.toFixed(2);
  elements.itemsGrandTotal.textContent = grandTotal.toFixed(2);
  
  return {
    totalGross,
    totalNet,
    subtotal,
    cgstAmt,
    sgstAmt,
    grandTotal
  };
}

// Render added items list to both desktop table and mobile cards list
function renderAddedItems() {
  const tbody = elements.itemsTbody;
  const mobileContainer = elements.mobileItemsListContainer;
  
  tbody.innerHTML = '';
  mobileContainer.innerHTML = '';
  
  if (currentBillItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">
          No jewellery items added yet. Use the form above to add items.
        </td>
      </tr>
    `;
    mobileContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 1.5rem; border: 1px dashed var(--border-color); border-radius: var(--border-radius); width: 100%;">
        No jewellery items added yet. Use the form above to add items.
      </div>
    `;
    return;
  }
  
  currentBillItems.forEach((item, index) => {
    // 1. Render Desktop Row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-sr text-center">${index + 1}</td>
      <td class="col-desc">${item.description}</td>
      <td class="col-hsn text-center">${item.hsn}</td>
      <td class="col-wt text-right">${item.grossWeight.toFixed(3)}</td>
      <td class="col-wt text-right">${item.netWeight.toFixed(3)}</td>
      <td class="col-rate text-right">₹${item.rate.toFixed(2)}</td>
      <td class="col-making text-right">₹${item.makingCharge.toFixed(2)}</td>
      <td class="col-amount text-right">₹${item.amount.toFixed(2)}</td>
      <td class="col-action text-center">
        <div class="actions-cell" style="justify-content: center; display: flex; gap: 0.25rem;">
          <button type="button" class="btn btn-secondary btn-edit-builder-item" data-index="${index}" style="padding: 0.3rem 0.5rem; margin: 0; font-size: 0.8rem;" title="Edit Item">✏️</button>
          <button type="button" class="btn btn-danger btn-delete-builder-item" data-index="${index}" style="padding: 0.3rem 0.5rem; margin: 0; font-size: 0.8rem;" title="Delete Item">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
    
    // 2. Render Mobile Card
    const card = document.createElement('div');
    card.className = 'mobile-item-card';
    card.innerHTML = `
      <div class="card-row card-header-row">
        <span class="item-name-label">#${index + 1} - ${item.description}</span>
        <span class="item-amount-label">₹${item.amount.toFixed(2)}</span>
      </div>
      <div class="card-row">
        <span>Gross / Net Wt:</span>
        <span>${item.grossWeight.toFixed(3)}g / <strong>${item.netWeight.toFixed(3)}g</strong></span>
      </div>
      <div class="card-row">
        <span>Rate (₹/g):</span>
        <span>₹${item.rate.toFixed(2)}</span>
      </div>
      <div class="card-row">
        <span>Making Charge:</span>
        <span>₹${item.makingCharge.toFixed(2)}</span>
      </div>
      <div class="card-row">
        <span>HSN Code:</span>
        <span>${item.hsn}</span>
      </div>
      <div class="card-actions">
        <button type="button" class="btn btn-secondary btn-edit-builder-item" data-index="${index}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">✏️ Edit</button>
        <button type="button" class="btn btn-danger btn-delete-builder-item" data-index="${index}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">🗑️ Delete</button>
      </div>
    `;
    mobileContainer.appendChild(card);
  });
  
  // Attach event listeners for edit/delete buttons
  const attachHandlers = (parent) => {
    parent.querySelectorAll('.btn-edit-builder-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        editBuilderItem(idx);
      });
    });
    
    parent.querySelectorAll('.btn-delete-builder-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        deleteBuilderItem(idx);
      });
    });
  };
  
  attachHandlers(tbody);
  attachHandlers(mobileContainer);
}

// Edit builder item details
function editBuilderItem(index) {
  const item = currentBillItems[index];
  
  elements.builderItemDesc.value = item.description;
  elements.builderItemHsn.value = item.hsn;
  elements.builderItemGross.value = item.grossWeight;
  elements.builderItemNet.value = item.netWeight;
  elements.builderItemRate.value = item.rate;
  elements.builderItemMaking.value = item.makingCharge;
  
  elements.itemEditIndex.value = index;
  elements.btnBuilderAdd.textContent = "💾 Update Item";
  elements.btnBuilderClear.style.display = "inline-flex";
  
  updateBuilderPreview();
  
  elements.builderItemDesc.scrollIntoView({ behavior: 'smooth', block: 'center' });
  elements.builderItemDesc.focus();
}

// Delete builder item details
function deleteBuilderItem(index) {
  if (confirm("Remove this jewellery item from the bill?")) {
    currentBillItems.splice(index, 1);
    renderAddedItems();
    calculateTotals();
  }
}

// Update the inline builder preview box
function updateBuilderPreview() {
  const net = parseFloat(elements.builderItemNet.value) || 0;
  const rate = parseFloat(elements.builderItemRate.value) || 0;
  const making = parseFloat(elements.builderItemMaking.value) || 0;
  const amt = (net * rate) + making;
  elements.builderPreviewAmount.textContent = `₹ ${amt.toFixed(2)}`;
}

// Save, and print invoice
function printBill(bill) {
  const shop = bill.shopSnapshot || settings;
  
  elements.printShopName.textContent = shop.shopName;
  elements.printShopAddress.textContent = shop.address;
  elements.printShopGstin.textContent = shop.gstin;
  elements.printShopState.textContent = shop.state;
  elements.printFooterShopName.textContent = `For, ${shop.shopName}`;
  
  elements.printCustName.textContent = bill.customer.name;
  elements.printCustAddress.textContent = bill.customer.address || '-';
  elements.printCustVillage.textContent = bill.customer.village || '-';
  elements.printCustPhone.textContent = bill.customer.phone || '-';
  elements.printCustGstin.textContent = bill.customer.gstin || 'N/A';
  elements.printCustState.textContent = bill.customer.state || 'Gujarat';
  
  elements.printInvoiceNo.textContent = String(bill.billNo).padStart(4, '0');
  elements.printInvoiceDate.textContent = formatDate(bill.date);
  
  elements.printBankDetails.innerHTML = `
    Bank: <strong>${shop.bankDetails.bankName}</strong><br>
    Account No: <strong>${shop.bankDetails.accountNo}</strong><br>
    IFSC: <strong>${shop.bankDetails.ifsc}</strong>
  `;
  
  elements.printFooterNotes.innerHTML = '';
  if (shop.footerNotes && shop.footerNotes.length > 0) {
    shop.footerNotes.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note;
      elements.printFooterNotes.appendChild(li);
    });
  } else {
    elements.printFooterNotes.innerHTML = '<li>Terms as applicable.</li>';
  }
  
  elements.printItemsTbody.innerHTML = '';
  bill.items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${item.srNo}</td>
      <td>${item.description}</td>
      <td class="text-center">${item.hsn}</td>
      <td class="text-right">${item.grossWeight.toFixed(3)}</td>
      <td class="text-right">${item.netWeight.toFixed(3)}</td>
      <td class="text-right">₹${item.rate.toFixed(2)}</td>
      <td class="text-right">₹${item.makingCharge.toFixed(2)}</td>
      <td class="text-right">₹${item.amount.toFixed(2)}</td>
    `;
    elements.printItemsTbody.appendChild(tr);
  });
  
  elements.printTotalItems.textContent = bill.items.length;
  elements.printTotalGross.textContent = bill.totalGrossWeight.toFixed(3);
  elements.printTotalNet.textContent = bill.totalNetWeight.toFixed(3);
  elements.printSubtotal.textContent = bill.subtotal.toFixed(2);
  elements.printCgstPct.textContent = bill.cgstPct;
  elements.printCgstAmt.textContent = bill.cgstAmount.toFixed(2);
  elements.printSgstPct.textContent = bill.sgstPct;
  elements.printSgstAmt.textContent = bill.sgstAmount.toFixed(2);
  elements.printGrandTotal.textContent = bill.grandTotal.toFixed(2);
  
  window.print();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* ==========================================================================
   BILL HISTORY LIST
   ========================================================================== */
function renderBillsList() {
  elements.historyTbody.innerHTML = '';
  
  const query = elements.searchQuery.value.toLowerCase().trim();
  const startDate = elements.filterDateStart.value;
  const endDate = elements.filterDateEnd.value;
  
  const filteredBills = bills.filter(bill => {
    const nameMatch = bill.customer.name.toLowerCase().includes(query);
    const billMatch = String(bill.billNo).padStart(4, '0').includes(query) || bill.billNo.toString().includes(query);
    const phoneMatch = bill.customer.phone && bill.customer.phone.includes(query);
    const villageMatch = bill.customer.village && bill.customer.village.toLowerCase().includes(query);
    
    let dateMatch = true;
    if (startDate) {
      dateMatch = dateMatch && (bill.date >= startDate);
    }
    if (endDate) {
      dateMatch = dateMatch && (bill.date <= endDate);
    }
    
    return (nameMatch || billMatch || phoneMatch || villageMatch) && dateMatch;
  });
  
  filteredBills.sort((a, b) => b.billNo - a.billNo);
  
  if (filteredBills.length === 0) {
    elements.historyTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          No matching invoices found in database.
        </td>
      </tr>
    `;
    return;
  }
  
  filteredBills.forEach(bill => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--gold-primary);">#${String(bill.billNo).padStart(4, '0')}</td>
      <td>${formatDate(bill.date)}</td>
      <td style="font-weight: 600;">${bill.customer.name}</td>
      <td>${bill.customer.village || '-'}</td>
      <td>${bill.totalNetWeight.toFixed(3)} g</td>
      <td style="font-weight: 700; color: var(--gold-primary);">₹${bill.grandTotal.toFixed(2)}</td>
      <td class="actions-cell">
        <button class="btn btn-secondary btn-reprint" style="padding: 0.4rem 0.8rem; margin: 0; font-size: 0.8rem;">Print</button>
        <button class="btn btn-danger btn-delete-bill" style="padding: 0.4rem 0.6rem; margin: 0; font-size: 0.8rem;">🗑️</button>
      </td>
    `;
    
    tr.querySelector('.btn-reprint').addEventListener('click', () => {
      printBill(bill);
    });
    
    tr.querySelector('.btn-delete-bill').addEventListener('click', () => {
      if (confirm(`Are you sure you want to permanently delete Invoice #${String(bill.billNo).padStart(4, '0')}?`)) {
        bills = bills.filter(b => b.billNo !== bill.billNo);
        saveBills();
        renderBillsList();
      }
    });
    
    elements.historyTbody.appendChild(tr);
  });
}

/* ==========================================================================
   JEWELLERY ITEMS MASTER
   ========================================================================== */
function renderItemsList() {
  elements.itemListContainer.innerHTML = '';
  
  if (items.length === 0) {
    elements.itemListContainer.innerHTML = `
      <div style="color: var(--text-secondary); text-align: center; padding: 2rem;">
        No jewellery template items configured. Add one on the left.
      </div>
    `;
    return;
  }
  
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'item-list-row';
    div.innerHTML = `
      <div class="item-info">
        <span class="title">${item.name}</span>
        <span class="subtitle">HSN: ${item.hsn} | Rate: ₹${item.defaultRate || 'Market'} | Making: ₹${item.defaultMaking || '0'}</span>
      </div>
      <div class="actions-cell">
        <button class="btn btn-secondary btn-edit-item" style="padding: 0.3rem 0.6rem; margin: 0; font-size: 0.75rem;">Edit</button>
        <button class="btn btn-danger btn-delete-item" style="padding: 0.3rem 0.5rem; margin: 0; font-size: 0.75rem;">🗑️</button>
      </div>
    `;
    
    div.querySelector('.btn-edit-item').addEventListener('click', () => {
      loadItemToForm(index);
    });
    
    div.querySelector('.btn-delete-item').addEventListener('click', () => {
      if (confirm(`Remove template for "${item.name}"?`)) {
        items.splice(index, 1);
        saveItems();
        renderItemsList();
      }
    });
    
    elements.itemListContainer.appendChild(div);
  });
}

function loadItemToForm(index) {
  const item = items[index];
  elements.itemName.value = item.name;
  elements.itemHsn.value = item.hsn;
  elements.itemDefaultRate.value = item.defaultRate || '';
  elements.itemDefaultMaking.value = item.defaultMaking || '';
  
  elements.editItemIndex.value = index;
  elements.saveItemBtn.textContent = 'Update Item';
  elements.cancelItemEditBtn.style.display = 'inline-flex';
  elements.itemName.focus();
}

function resetItemForm() {
  elements.itemMasterForm.reset();
  elements.editItemIndex.value = '';
  elements.saveItemBtn.textContent = 'Save Item';
  elements.cancelItemEditBtn.style.display = 'none';
}

/* ==========================================================================
   SETTINGS PANEL
   ========================================================================== */
function loadSettingsForm() {
  elements.shopName.value = settings.shopName;
  elements.shopGstin.value = settings.gstin;
  elements.shopState.value = settings.state;
  elements.shopAddress.value = settings.address;
  elements.shopBank.value = settings.bankDetails.bankName;
  elements.shopIfsc.value = settings.bankDetails.ifsc;
  elements.shopAccNo.value = settings.bankDetails.accountNo;
  elements.shopCgstPct.value = settings.cgstPct;
  elements.shopSgstPct.value = settings.sgstPct;
  elements.shopNextBill.value = settings.nextBillNo;
  
  elements.footerNotesContainer.innerHTML = '';
  settings.footerNotes.forEach((note, index) => {
    addFooterNoteInput(note);
  });
}

function addFooterNoteInput(noteText = '') {
  const div = document.createElement('div');
  div.className = 'footer-note-item';
  div.innerHTML = `
    <input type="text" class="footer-note-input" value="${noteText.replace(/"/g, '&quot;')}" placeholder="Enter guidelines or conditions line..." required>
    <button type="button" class="btn btn-danger btn-delete-note" style="padding: 0.5rem; margin: 0;">🗑️</button>
  `;
  
  div.querySelector('.btn-delete-note').addEventListener('click', () => {
    div.remove();
  });
  
  elements.footerNotesContainer.appendChild(div);
}

// Start initialization
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
