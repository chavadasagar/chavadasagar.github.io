// Storage Keys
const STORAGE_KEYS = {
  SETTINGS: 'skj_settings_db',
  ITEMS: 'skj_items_db',
  BILLS: 'skj_bills_db'
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
  nextBillNo: 1001
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

// DOM Elements
const elements = {
  // Nav
  navButtons: document.querySelectorAll('.nav-btn'),
  tabs: document.querySelectorAll('.tab-content'),
  headerShopName: document.getElementById('header-shop-name'),
  
  // Create Bill
  custDate: document.getElementById('cust-date'),
  custName: document.getElementById('cust-name'),
  custPhone: document.getElementById('cust-phone'),
  custAddress: document.getElementById('cust-address'),
  custVillage: document.getElementById('cust-village'),
  custGstin: document.getElementById('cust-gstin'),
  custState: document.getElementById('cust-state'),
  currentBillNo: document.getElementById('current-bill-no'),
  itemsTbody: document.getElementById('items-tbody'),
  addRowBtn: document.getElementById('add-row-btn'),
  itemsDatalist: document.getElementById('items-datalist'),
  
  // Math Displays
  totalGrossWt: document.getElementById('total-gross-wt'),
  totalNetWt: document.getElementById('total-net-wt'),
  itemsSubtotal: document.getElementById('items-subtotal'),
  summaryCgstPct: document.getElementById('summary-cgst-pct'),
  summarySgstPct: document.getElementById('summary-sgst-pct'),
  itemsCgst: document.getElementById('items-cgst'),
  itemsSgst: document.getElementById('items-sgst'),
  itemsGrandTotal: document.getElementById('items-grand-total'),
  savePrintBtn: document.getElementById('save-print-btn'),
  resetBillBtn: document.getElementById('reset-bill-btn'),
  
  // History
  historyTbody: document.getElementById('history-tbody'),
  searchQuery: document.getElementById('search-query'),
  filterDateStart: document.getElementById('filter-date-start'),
  filterDateEnd: document.getElementById('filter-date-end'),
  clearFiltersBtn: document.getElementById('clear-filters-btn'),
  
  // Item Master
  itemMasterForm: document.getElementById('item-master-form'),
  itemName: document.getElementById('item-name'),
  itemHsn: document.getElementById('item-hsn'),
  itemDefaultRate: document.getElementById('item-default-rate'),
  itemDefaultMaking: document.getElementById('item-default-making'),
  saveItemBtn: document.getElementById('save-item-btn'),
  cancelItemEditBtn: document.getElementById('cancel-item-edit-btn'),
  editItemIndex: document.getElementById('edit-item-index'),
  itemListContainer: document.getElementById('item-list-container'),
  
  // Settings Form
  settingsForm: document.getElementById('settings-form'),
  shopName: document.getElementById('shop-name'),
  shopGstin: document.getElementById('shop-gstin'),
  shopState: document.getElementById('shop-state'),
  shopAddress: document.getElementById('shop-address'),
  shopBank: document.getElementById('shop-bank'),
  shopIfsc: document.getElementById('shop-ifsc'),
  shopAccNo: document.getElementById('shop-acc-no'),
  shopCgstPct: document.getElementById('shop-cgst-pct'),
  shopSgstPct: document.getElementById('shop-sgst-pct'),
  shopNextBill: document.getElementById('shop-next-bill'),
  footerNotesContainer: document.getElementById('footer-notes-container'),
  addNoteBtn: document.getElementById('add-note-btn'),
  resetSystemBtn: document.getElementById('reset-system-btn'),
  
  // Printable Invoice Components
  printShopName: document.getElementById('print-shop-name'),
  printShopAddress: document.getElementById('print-shop-address'),
  printShopGstin: document.getElementById('print-shop-gstin'),
  printShopState: document.getElementById('print-shop-state'),
  printCustName: document.getElementById('print-cust-name'),
  printCustAddress: document.getElementById('print-cust-address'),
  printCustVillage: document.getElementById('print-cust-village'),
  printCustPhone: document.getElementById('print-cust-phone'),
  printCustGstin: document.getElementById('print-cust-gstin'),
  printCustState: document.getElementById('print-cust-state'),
  printInvoiceNo: document.getElementById('print-invoice-no'),
  printInvoiceDate: document.getElementById('print-invoice-date'),
  printItemsTbody: document.getElementById('print-items-tbody'),
  printBankDetails: document.getElementById('print-bank-details'),
  printFooterNotes: document.getElementById('print-footer-notes'),
  printTotalItems: document.getElementById('print-total-items'),
  printTotalGross: document.getElementById('print-total-gross'),
  printTotalNet: document.getElementById('print-total-net'),
  printSubtotal: document.getElementById('print-subtotal'),
  printCgstPct: document.getElementById('print-cgst-pct'),
  printCgstAmt: document.getElementById('print-cgst-amt'),
  printSgstPct: document.getElementById('print-sgst-pct'),
  printSgstAmt: document.getElementById('print-sgst-amt'),
  printGrandTotal: document.getElementById('print-grand-total'),
  printFooterShopName: document.getElementById('print-footer-shop-name')
};

// SPA Navigation
elements.navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    elements.navButtons.forEach(b => b.classList.remove('active'));
    elements.tabs.forEach(t => t.classList.remove('active'));
    
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
    
    // Refresh sub-views
    if (tabId === 'bill-history') {
      renderBillsList();
    } else if (tabId === 'item-master') {
      renderItemsList();
    } else if (tabId === 'settings') {
      loadSettingsForm();
    }
  });
});

// Initial Setup
function initApp() {
  initDatabase();
  
  // Set UI Header Shop Name
  elements.headerShopName.textContent = settings.shopName;
  elements.printFooterShopName.textContent = `For, ${settings.shopName}`;
  
  // Load initial settings/views
  updateDatalist();
  resetBillForm();
  
  // Set date field to today
  elements.custDate.value = new Date().toISOString().split('T')[0];
}

// Reset bill creator form
function resetBillForm() {
  elements.custName.value = '';
  elements.custPhone.value = '';
  elements.custAddress.value = '';
  elements.custVillage.value = '';
  elements.custGstin.value = '';
  elements.custState.value = 'Gujarat';
  elements.custDate.value = new Date().toISOString().split('T')[0];
  
  elements.currentBillNo.textContent = settings.nextBillNo;
  
  // Set tax rates from settings
  elements.summaryCgstPct.textContent = settings.cgstPct;
  elements.summarySgstPct.textContent = settings.sgstPct;
  
  // Clear items and put one blank row
  elements.itemsTbody.innerHTML = '';
  addBillItemRow();
  calculateTotals();
}

// Add Item autocomplete datalist
function updateDatalist() {
  elements.itemsDatalist.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name;
    elements.itemsDatalist.appendChild(opt);
  });
}

// Add new row to Create Bill table
function addBillItemRow() {
  const rowCount = elements.itemsTbody.rows.length;
  const newRow = document.createElement('tr');
  
  newRow.innerHTML = `
    <td class="col-sr text-center">${rowCount + 1}</td>
    <td class="col-desc">
      <input type="text" class="item-desc" placeholder="Select or type jewellery..." list="items-datalist" required autocomplete="off">
    </td>
    <td class="col-hsn">
      <input type="text" class="item-hsn" placeholder="7113">
    </td>
    <td class="col-wt">
      <input type="number" class="item-gross" step="0.001" placeholder="0.000" min="0" required>
    </td>
    <td class="col-wt">
      <input type="number" class="item-net" step="0.001" placeholder="0.000" min="0" required>
    </td>
    <td class="col-rate">
      <input type="number" class="item-rate" step="0.01" placeholder="0.00" min="0" required>
    </td>
    <td class="col-making">
      <input type="number" class="item-making" step="0.01" placeholder="0.00" min="0" required>
    </td>
    <td class="col-amount">
      <input type="number" class="item-amount" readonly placeholder="0.00">
    </td>
    <td class="col-action text-center">
      <button type="button" class="btn btn-danger btn-delete-row" style="padding: 0.4rem 0.6rem; margin: 0;">🗑️</button>
    </td>
  `;
  
  elements.itemsTbody.appendChild(newRow);
  
  // Attach Event Listeners to inputs in the row
  const descInput = newRow.querySelector('.item-desc');
  const hsnInput = newRow.querySelector('.item-hsn');
  const grossInput = newRow.querySelector('.item-gross');
  const netInput = newRow.querySelector('.item-net');
  const rateInput = newRow.querySelector('.item-rate');
  const makingInput = newRow.querySelector('.item-making');
  const delBtn = newRow.querySelector('.btn-delete-row');
  
  // Autocomplete matching
  descInput.addEventListener('input', (e) => {
    const val = e.target.value;
    const match = items.find(item => item.name.toLowerCase() === val.toLowerCase());
    if (match) {
      hsnInput.value = match.hsn || '7113';
      if (match.defaultRate) rateInput.value = match.defaultRate;
      if (match.defaultMaking !== undefined) makingInput.value = match.defaultMaking;
      calculateTotals();
    }
  });

  // Calculate row total on input change
  const calcFields = [grossInput, netInput, rateInput, makingInput];
  calcFields.forEach(field => {
    field.addEventListener('input', calculateTotals);
  });
  
  // Synchronize Gross & Net weight if user only types Gross weight initially
  grossInput.addEventListener('blur', () => {
    if (grossInput.value && !netInput.value) {
      netInput.value = grossInput.value;
      calculateTotals();
    }
  });

  // Delete row action
  delBtn.addEventListener('click', () => {
    newRow.remove();
    reindexRows();
    calculateTotals();
  });
}

// Re-index row serial numbers
function reindexRows() {
  const rows = elements.itemsTbody.querySelectorAll('tr');
  rows.forEach((row, idx) => {
    row.querySelector('.col-sr').textContent = idx + 1;
  });
}

// Main calculations engine
function calculateTotals() {
  const rows = elements.itemsTbody.querySelectorAll('tr');
  let totalGross = 0;
  let totalNet = 0;
  let subtotal = 0;
  
  rows.forEach(row => {
    const grossVal = parseFloat(row.querySelector('.item-gross').value) || 0;
    const netVal = parseFloat(row.querySelector('.item-net').value) || 0;
    const rateVal = parseFloat(row.querySelector('.item-rate').value) || 0;
    const makingVal = parseFloat(row.querySelector('.item-making').value) || 0;
    
    // Amount = (Net Weight * Rate) + Making Charge
    const lineAmt = (netVal * rateVal) + makingVal;
    
    row.querySelector('.item-amount').value = lineAmt.toFixed(2);
    
    totalGross += grossVal;
    totalNet += netVal;
    subtotal += lineAmt;
  });
  
  // Calculate Taxes
  const cgstPct = parseFloat(settings.cgstPct) || 0;
  const sgstPct = parseFloat(settings.sgstPct) || 0;
  
  const cgstAmt = subtotal * (cgstPct / 100);
  const sgstAmt = subtotal * (sgstPct / 100);
  const grandTotal = subtotal + cgstAmt + sgstAmt;
  
  // Update UI Displays
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

elements.addRowBtn.addEventListener('click', addBillItemRow);
elements.resetBillBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to clear this invoice form?")) {
    resetBillForm();
  }
});

// Save & Print Invoice Execution
elements.savePrintBtn.addEventListener('click', () => {
  const customerName = elements.custName.value.trim();
  if (!customerName) {
    alert("Please enter Customer Name.");
    elements.custName.focus();
    return;
  }
  
  const billDate = elements.custDate.value;
  if (!billDate) {
    alert("Please select invoice date.");
    elements.custDate.focus();
    return;
  }
  
  const rows = elements.itemsTbody.querySelectorAll('tr');
  if (rows.length === 0) {
    alert("Please add at least one jewellery item.");
    return;
  }
  
  // Validate items inside rows
  let isValid = true;
  rows.forEach(row => {
    const desc = row.querySelector('.item-desc').value.trim();
    const net = parseFloat(row.querySelector('.item-net').value) || 0;
    const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
    if (!desc || net <= 0 || rate <= 0) {
      isValid = false;
    }
  });
  
  if (!isValid) {
    alert("Please ensure all item rows have a description, valid weights, and rates.");
    return;
  }
  
  // Proceed to calculate final amounts
  const calcs = calculateTotals();
  
  // Get items list details
  const billItemsList = [];
  rows.forEach((row, index) => {
    billItemsList.push({
      srNo: index + 1,
      description: row.querySelector('.item-desc').value.trim(),
      hsn: row.querySelector('.item-hsn').value.trim() || '7113',
      grossWeight: parseFloat(row.querySelector('.item-gross').value) || 0,
      netWeight: parseFloat(row.querySelector('.item-net').value) || 0,
      rate: parseFloat(row.querySelector('.item-rate').value) || 0,
      makingCharge: parseFloat(row.querySelector('.item-making').value) || 0,
      amount: parseFloat(row.querySelector('.item-amount').value) || 0
    });
  });
  
  // Build Bill Object
  const currentBill = {
    billNo: settings.nextBillNo,
    date: billDate,
    customer: {
      name: customerName,
      phone: elements.custPhone.value.trim(),
      address: elements.custAddress.value.trim(),
      village: elements.custVillage.value.trim(),
      gstin: elements.custGstin.value.trim().toUpperCase(),
      state: elements.custState.value.trim()
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
  
  // Add to History
  bills.push(currentBill);
  saveBills();
  
  // Trigger Print View
  printBill(currentBill);
  
  // Increment invoice number seed
  settings.nextBillNo = parseInt(settings.nextBillNo) + 1;
  saveSettings();
  
  // Reset form
  resetBillForm();
});

// Render the invoice to printable container & trigger browser print
function printBill(bill) {
  const shop = bill.shopSnapshot || settings;
  
  // Set Shop Details in Print layout
  elements.printShopName.textContent = shop.shopName;
  elements.printShopAddress.textContent = shop.address;
  elements.printShopGstin.textContent = shop.gstin;
  elements.printShopState.textContent = shop.state;
  elements.printFooterShopName.textContent = `For, ${shop.shopName}`;
  
  // Set Customer Details
  elements.printCustName.textContent = bill.customer.name;
  elements.printCustAddress.textContent = bill.customer.address || '-';
  elements.printCustVillage.textContent = bill.customer.village || '-';
  elements.printCustPhone.textContent = bill.customer.phone || '-';
  elements.printCustGstin.textContent = bill.customer.gstin || 'N/A';
  elements.printCustState.textContent = bill.customer.state || 'Gujarat';
  
  // Invoice Meta
  elements.printInvoiceNo.textContent = bill.billNo;
  elements.printInvoiceDate.textContent = formatDate(bill.date);
  
  // Bank Details
  elements.printBankDetails.innerHTML = `
    Bank: <strong>${shop.bankDetails.bankName}</strong><br>
    Account No: <strong>${shop.bankDetails.accountNo}</strong><br>
    IFSC: <strong>${shop.bankDetails.ifsc}</strong>
  `;
  
  // Footer Notes
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
  
  // Items table
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
  
  // Summary calculations
  elements.printTotalItems.textContent = bill.items.length;
  elements.printTotalGross.textContent = bill.totalGrossWeight.toFixed(3);
  elements.printTotalNet.textContent = bill.totalNetWeight.toFixed(3);
  elements.printSubtotal.textContent = bill.subtotal.toFixed(2);
  elements.printCgstPct.textContent = bill.cgstPct;
  elements.printCgstAmt.textContent = bill.cgstAmount.toFixed(2);
  elements.printSgstPct.textContent = bill.sgstPct;
  elements.printSgstAmt.textContent = bill.sgstAmount.toFixed(2);
  elements.printGrandTotal.textContent = bill.grandTotal.toFixed(2);
  
  // Fire browser print dialog
  window.print();
}

// Format date helper
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* ==========================================================================
   BILL HISTORY VIEW LOGIC
   ========================================================================== */
function renderBillsList() {
  elements.historyTbody.innerHTML = '';
  
  const query = elements.searchQuery.value.toLowerCase().trim();
  const startDate = elements.filterDateStart.value;
  const endDate = elements.filterDateEnd.value;
  
  // Filter invoices
  const filteredBills = bills.filter(bill => {
    const nameMatch = bill.customer.name.toLowerCase().includes(query);
    const billMatch = bill.billNo.toString().includes(query);
    const phoneMatch = bill.customer.phone && bill.customer.phone.includes(query);
    const villageMatch = bill.customer.village && bill.customer.village.toLowerCase().includes(query);
    
    // Date filter logic
    let dateMatch = true;
    if (startDate) {
      dateMatch = dateMatch && (bill.date >= startDate);
    }
    if (endDate) {
      dateMatch = dateMatch && (bill.date <= endDate);
    }
    
    return (nameMatch || billMatch || phoneMatch || villageMatch) && dateMatch;
  });
  
  // Sort reverse chronological
  filteredBills.sort((a, b) => b.billNo - a.billNo);
  
  if (filteredBills.length === 0) {
    elements.historyTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          No matching invoices found in history database.
        </td>
      </tr>
    `;
    return;
  }
  
  filteredBills.forEach(bill => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--gold-primary);">#${bill.billNo}</td>
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
      if (confirm(`Are you sure you want to permanently delete Bill #${bill.billNo}?`)) {
        bills = bills.filter(b => b.billNo !== bill.billNo);
        saveBills();
        renderBillsList();
      }
    });
    
    elements.historyTbody.appendChild(tr);
  });
}

// Hook filters
elements.searchQuery.addEventListener('input', renderBillsList);
elements.filterDateStart.addEventListener('change', renderBillsList);
elements.filterDateEnd.addEventListener('change', renderBillsList);
elements.clearFiltersBtn.addEventListener('click', () => {
  elements.searchQuery.value = '';
  elements.filterDateStart.value = '';
  elements.filterDateEnd.value = '';
  renderBillsList();
});

/* ==========================================================================
   JEWELLERY ITEMS MASTER LOGIC
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
    // Update existing
    items[parseInt(editIndex)] = newItem;
  } else {
    // Add new
    // Check if name already exists
    const duplicate = items.some(it => it.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      alert("A jewellery item template with this name already exists.");
      return;
    }
    items.push(newItem);
  }
  
  saveItems();
  resetItemForm();
  renderItemsList();
});

/* ==========================================================================
   SETTINGS PANEL LOGIC
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
  
  // Render notes
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

elements.addNoteBtn.addEventListener('click', () => {
  addFooterNoteInput('');
});

elements.settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Gather notes
  const notesInputs = elements.footerNotesContainer.querySelectorAll('.footer-note-input');
  const gatheredNotes = [];
  notesInputs.forEach(input => {
    if (input.value.trim()) {
      gatheredNotes.push(input.value.trim());
    }
  });
  
  // Save settings object
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
  
  // Update UI headers
  elements.headerShopName.textContent = settings.shopName;
  elements.printFooterShopName.textContent = `For, ${settings.shopName}`;
  elements.currentBillNo.textContent = settings.nextBillNo;
  elements.summaryCgstPct.textContent = settings.cgstPct;
  elements.summarySgstPct.textContent = settings.sgstPct;
  
  calculateTotals();
  alert("Shop settings saved successfully!");
});

elements.resetSystemBtn.addEventListener('click', () => {
  if (confirm("WARNING: This will completely reset all configurations, items, and delete all saved invoices. Do you want to proceed?")) {
    initDatabase(true);
    initApp();
    alert("Database has been reset to defaults!");
  }
});

// Run app init
window.addEventListener('DOMContentLoaded', initApp);
