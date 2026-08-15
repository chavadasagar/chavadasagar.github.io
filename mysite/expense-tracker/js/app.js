/**
 * SpendFlow - Mobile-Friendly Expense Tracker
 * Vanilla JavaScript (ES6+) Implementation
 * 
 * Features:
 * - LocalStorage CRUD persistence with input validation
 * - Monthly summary cards (Income, Expense, Net Balance, Savings Rate)
 * - Category breakdown interactive Canvas Doughnut/Pie Chart
 * - Date-grouped transaction feed (Newest first)
 * - Mobile Touch Swipe-to-Delete and Swipe-to-Edit with spring physics
 * - Real-time Search, Category Filter, Date Range & Type Filtering
 * - Client-side CSV Export with RFC 4180 escaping
 * - Currency preference selector (₹, $, €, £, ¥, ₩)
 * - Dark / Light theme switcher
 * - Toast notifications with "Undo Delete" capability
 */

(function () {
  'use strict';

  // =========================================================================
  // CONSTANTS & CONFIGURATION
  // =========================================================================
  const STORAGE_KEYS = {
    TRANSACTIONS: 'spendflow_transactions_v1',
    SETTINGS: 'spendflow_settings_v1',
    THEME: 'spendflow_theme_v1'
  };

  const CATEGORY_META = {
    Food: { icon: '🍔', color: '#f97316', label: 'Food & Dining', type: 'expense' },
    Travel: { icon: '✈️', color: '#0ea5e9', label: 'Travel & Transport', type: 'expense' },
    Bills: { icon: '💡', color: '#a855f7', label: 'Bills & Utilities', type: 'expense' },
    Shopping: { icon: '🛍️', color: '#ec4899', label: 'Shopping & Goods', type: 'expense' },
    Other: { icon: '📦', color: '#64748b', label: 'Other Expenses', type: 'expense' },
    Salary: { icon: '💰', color: '#10b981', label: 'Salary & Wages', type: 'income' },
    Freelance: { icon: '💻', color: '#06b6d4', label: 'Freelance & Gigs', type: 'income' },
    Investment: { icon: '📈', color: '#6366f1', label: 'Investment & Dividends', type: 'income' }
  };

  const DEFAULT_SETTINGS = {
    currencySymbol: '₹',
    currencyCode: 'INR'
  };

  // Optional demo generator if user clicks 'Load Demo Data' in Settings
  function generateSampleDemoData() {
    function offsetDate(d) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      return date.toISOString().split('T')[0];
    }
    return [
      { id: 'demo_1', type: 'income', amount: 45000, category: 'Salary', date: offsetDate(0), note: 'Monthly Salary' },
      { id: 'demo_2', type: 'expense', amount: 1200, category: 'Food', date: offsetDate(0), note: 'Groceries & Snacks' },
      { id: 'demo_3', type: 'expense', amount: 800, category: 'Travel', date: offsetDate(-1), note: 'Metro & Cab' },
      { id: 'demo_4', type: 'expense', amount: 2500, category: 'Bills', date: offsetDate(-2), note: 'Electricity & Internet' }
    ];
  }

  // =========================================================================
  // DATA STORE (LocalStorage Manager)
  // =========================================================================
  const Store = {
    getTransactions() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        if (!raw) {
          return [];
        }
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error reading localStorage transactions:', err);
        return [];
      }
    },

    saveTransactions(list) {
      try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
      } catch (err) {
        console.error('Error saving transactions:', err);
      }
    },

    getSettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
      } catch (err) {
        return { ...DEFAULT_SETTINGS };
      }
    },

    saveSettings(settings) {
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      } catch (err) {
        console.error('Error saving settings:', err);
      }
    },

    getTheme() {
      return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    },

    saveTheme(theme) {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    },

    addTransaction(tx) {
      const list = this.getTransactions();
      list.unshift(tx); // prepend
      this.saveTransactions(list);
      return list;
    },

    updateTransaction(updatedTx) {
      let list = this.getTransactions();
      list = list.map(item => (item.id === updatedTx.id ? updatedTx : item));
      this.saveTransactions(list);
      return list;
    },

    deleteTransaction(id) {
      const list = this.getTransactions();
      const itemToDelete = list.find(item => item.id === id);
      const filtered = list.filter(item => item.id !== id);
      this.saveTransactions(filtered);
      return { filtered, deletedItem: itemToDelete };
    },

    restoreTransaction(item) {
      if (!item) return;
      const list = this.getTransactions();
      list.unshift(item);
      this.saveTransactions(list);
    },

    resetAll() {
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    }
  };

  // =========================================================================
  // APPLICATION STATE
  // =========================================================================
  const State = {
    transactions: [],
    settings: DEFAULT_SETTINGS,
    theme: 'light',
    
    // Filters & Navigation
    selectedDate: new Date(), // Current active month view
    searchQuery: '',
    categoryFilter: 'ALL',
    dateRangeFilter: 'THIS_MONTH', // 'THIS_MONTH', 'ALL_TIME', 'LAST_7_DAYS', 'LAST_30_DAYS'
    typeFilter: 'ALL', // 'ALL', 'expense', 'income'

    // Temporary storage for Undo action
    lastDeletedItem: null,
    undoTimeout: null,

    // Modal state
    editingId: null,
    currentFormType: 'expense'
  };

  // =========================================================================
  // DOM ELEMENT REFERENCES
  // =========================================================================
  const DOM = {
    // Top headers & controls
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    desktopAddBtn: document.getElementById('desktopAddBtn'),
    
    // Month navigation
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    monthYearText: document.getElementById('monthYearText'),
    jumpToTodayBtn: document.getElementById('jumpToTodayBtn'),

    // Summary Cards
    totalIncomeAmount: document.getElementById('totalIncomeAmount'),
    incomeEntriesCount: document.getElementById('incomeEntriesCount'),
    totalExpenseAmount: document.getElementById('totalExpenseAmount'),
    expenseEntriesCount: document.getElementById('expenseEntriesCount'),
    netBalanceAmount: document.getElementById('netBalanceAmount'),
    savingsRateBadge: document.getElementById('savingsRateBadge'),

    // Chart & Breakdown
    chartCanvas: document.getElementById('categoryPieChart'),
    chartCenterCount: document.getElementById('chartCenterCount'),
    categoryBreakdownList: document.getElementById('categoryBreakdownList'),
    chartEmptyState: document.getElementById('chartEmptyState'),
    canvasBox: document.getElementById('canvasBox'),

    // Filter controls
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    categoryFilter: document.getElementById('categoryFilter'),
    dateRangeFilter: document.getElementById('dateRangeFilter'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    typeFilterBtns: document.querySelectorAll('.type-tab-btn'),

    // Transaction list container & empty state
    transactionsContainer: document.getElementById('transactionsContainer'),
    emptyStateCard: document.getElementById('emptyStateCard'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),

    // Mobile navigation
    mobileFabAddBtn: document.getElementById('mobileFabAddBtn'),
    mobileHomeNavBtn: document.getElementById('mobileHomeNavBtn'),
    mobileSettingsNavBtn: document.getElementById('mobileSettingsNavBtn'),

    // Entry Modal
    entryModalBackdrop: document.getElementById('entryModalBackdrop'),
    entryModalSheet: document.getElementById('entryModalSheet'),
    modalTitle: document.getElementById('modalTitle'),
    closeEntryModalBtn: document.getElementById('closeEntryModalBtn'),
    cancelEntryBtn: document.getElementById('cancelEntryBtn'),
    entryForm: document.getElementById('entryForm'),
    entryId: document.getElementById('entryId'),
    toggleExpenseBtn: document.getElementById('toggleExpenseBtn'),
    toggleIncomeBtn: document.getElementById('toggleIncomeBtn'),
    inputCurrencyAddon: document.getElementById('inputCurrencyAddon'),
    entryAmount: document.getElementById('entryAmount'),
    entryCategory: document.getElementById('entryCategory'),
    categoryPillsRow: document.getElementById('categoryPillsRow'),
    entryDate: document.getElementById('entryDate'),
    entryNote: document.getElementById('entryNote'),
    saveBtnText: document.getElementById('saveBtnText'),
    amountError: document.getElementById('amountError'),
    categoryError: document.getElementById('categoryError'),
    dateError: document.getElementById('dateError'),

    // Settings Modal
    settingsModalBackdrop: document.getElementById('settingsModalBackdrop'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    currencyGrid: document.getElementById('currencyGrid'),
    settingsExportCsvBtn: document.getElementById('settingsExportCsvBtn'),
    loadDemoDataBtn: document.getElementById('loadDemoDataBtn'),
    resetAllDataBtn: document.getElementById('resetAllDataBtn'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // UTILITY & FORMATTING HELPERS
  // =========================================================================
  function formatMoney(amount) {
    const num = Number(amount) || 0;
    const formatted = Math.abs(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const prefix = num < 0 ? '-' : '';
    return `${prefix}${State.settings.currencySymbol}${formatted}`;
  }

  function getMonthName(date) {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  }

  function formatDateHuman(dateStr) {
    const today = new Date();
    const target = parseLocalDate(dateStr);
    
    // Normalize to midnight for comparison
    const tToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const tTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const diffDays = Math.round((tToday - tTarget) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return target.toLocaleDateString('default', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: target.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }

  function generateUUID() {
    return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  // =========================================================================
  // TOAST NOTIFICATION SYSTEM
  // =========================================================================
  function showToast(message, actionLabel = null, onAction = null) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (actionLabel && onAction) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'toast-undo-btn';
      actionBtn.textContent = actionLabel;
      actionBtn.onclick = () => {
        onAction();
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 250);
      };
      toast.appendChild(actionBtn);
    }

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 250);
      }
    }, 4500);
  }

  // =========================================================================
  // PIE & DOUGHNUT CANVAS CHART RENDERER
  // =========================================================================
  function renderCategoryChart(categoryTotals, totalAmount) {
    const canvas = DOM.chartCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Retina display scaling
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const categories = Object.keys(categoryTotals);
    if (categories.length === 0 || totalAmount <= 0) {
      DOM.chartEmptyState.style.display = 'flex';
      DOM.canvasBox.style.display = 'none';
      DOM.categoryBreakdownList.innerHTML = '';
      return;
    }

    DOM.chartEmptyState.style.display = 'none';
    DOM.canvasBox.style.display = 'block';

    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = 85;
    const innerRadius = 55; // Doughnut hole

    let currentAngle = -0.5 * Math.PI; // Start at 12 o'clock

    categories.forEach(cat => {
      const amount = categoryTotals[cat];
      const sliceAngle = (amount / totalAmount) * (2 * Math.PI);
      const meta = CATEGORY_META[cat] || { color: '#6366f1' };

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();

      ctx.fillStyle = meta.color;
      ctx.fill();

      // Subtle separator line
      ctx.strokeStyle = State.theme === 'dark' ? '#111827' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    // Update center text
    DOM.chartCenterCount.textContent = categories.length;
  }

  function renderCategoryBreakdownList(categoryTotals, totalAmount) {
    const container = DOM.categoryBreakdownList;
    container.innerHTML = '';

    const sortedCats = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    sortedCats.forEach(cat => {
      const amount = categoryTotals[cat];
      const percent = totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;
      const meta = CATEGORY_META[cat] || { icon: '🏷️', color: '#64748b', label: cat };

      const item = document.createElement('div');
      item.className = 'cat-breakdown-item';
      item.innerHTML = `
        <div class="cat-info-left">
          <span class="cat-dot" style="background-color: ${meta.color};"></span>
          <span class="cat-name">${meta.icon} ${cat}</span>
        </div>
        <div class="cat-stats-right">
          <span class="cat-percent">${percent}%</span>
          <span class="cat-amount-val">${formatMoney(amount)}</span>
        </div>
      `;
      container.appendChild(item);
    });
  }

  // =========================================================================
  // CORE FILTERING & DATA PROCESSING
  // =========================================================================
  function getFilteredTransactions() {
    let list = [...State.transactions];

    // 1. Date Range Filtering
    const now = new Date();
    const selYear = State.selectedDate.getFullYear();
    const selMonth = State.selectedDate.getMonth();

    if (State.dateRangeFilter === 'THIS_MONTH') {
      list = list.filter(item => {
        const d = parseLocalDate(item.date);
        return d.getFullYear() === selYear && d.getMonth() === selMonth;
      });
    } else if (State.dateRangeFilter === 'LAST_7_DAYS') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      list = list.filter(item => parseLocalDate(item.date) >= cutoff);
    } else if (State.dateRangeFilter === 'LAST_30_DAYS') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      list = list.filter(item => parseLocalDate(item.date) >= cutoff);
    } // 'ALL_TIME' applies no date restriction

    // 2. Category Filter
    if (State.categoryFilter !== 'ALL') {
      list = list.filter(item => item.category === State.categoryFilter);
    }

    // 3. Type Filter (Expense / Income)
    if (State.typeFilter !== 'ALL') {
      list = list.filter(item => item.type === State.typeFilter);
    }

    // 4. Text Search Query
    if (State.searchQuery.trim()) {
      const query = State.searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const noteMatch = (item.note || '').toLowerCase().includes(query);
        const catMatch = (item.category || '').toLowerCase().includes(query);
        const amtMatch = String(item.amount).includes(query);
        return noteMatch || catMatch || amtMatch;
      });
    }

    // Sort newest first (descending date, then ID timestamp)
    list.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });

    return list;
  }

  // =========================================================================
  // UI RENDERING
  // =========================================================================
  function renderApp() {
    // 1. Update Month Header Display
    DOM.monthYearText.textContent = getMonthName(State.selectedDate);

    // 2. Get filtered transactions for feed
    const filteredList = getFilteredTransactions();

    // 3. Compute Monthly Totals for Summary Cards (Based on selected month view)
    const selYear = State.selectedDate.getFullYear();
    const selMonth = State.selectedDate.getMonth();
    const monthTransactions = State.transactions.filter(item => {
      const d = parseLocalDate(item.date);
      return d.getFullYear() === selYear && d.getMonth() === selMonth;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    const categoryTotals = {};

    monthTransactions.forEach(item => {
      const amt = Number(item.amount) || 0;
      if (item.type === 'income') {
        totalIncome += amt;
        incomeCount++;
      } else {
        totalExpense += amt;
        expenseCount++;
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amt;
      }
    });

    const netBalance = totalIncome - totalExpense;

    // Update Summary Card elements
    DOM.totalIncomeAmount.textContent = formatMoney(totalIncome);
    DOM.incomeEntriesCount.textContent = `${incomeCount} ${incomeCount === 1 ? 'entry' : 'entries'}`;
    
    DOM.totalExpenseAmount.textContent = formatMoney(totalExpense);
    DOM.expenseEntriesCount.textContent = `${expenseCount} ${expenseCount === 1 ? 'entry' : 'entries'}`;

    DOM.netBalanceAmount.textContent = formatMoney(netBalance);
    DOM.netBalanceAmount.style.color = netBalance >= 0 ? 'var(--text-main)' : 'var(--expense)';

    // Compute Savings rate
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
    DOM.savingsRateBadge.textContent = `${savingsRate >= 0 ? '+' : ''}${savingsRate}%`;
    DOM.savingsRateBadge.className = `savings-rate-badge ${savingsRate >= 0 ? 'positive' : 'negative'}`;

    // 4. Render Analytics Chart & Breakdown
    renderCategoryChart(categoryTotals, totalExpense);
    renderCategoryBreakdownList(categoryTotals, totalExpense);

    // 5. Render Transaction Feed grouped by Date
    renderTransactionFeed(filteredList);
  }

  function renderTransactionFeed(items) {
    const container = DOM.transactionsContainer;
    container.innerHTML = '';

    if (items.length === 0) {
      DOM.emptyStateCard.style.display = 'flex';
      return;
    }

    DOM.emptyStateCard.style.display = 'none';

    // Group items by date
    const groups = {};
    items.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });

    // Render grouped date sections
    Object.keys(groups).forEach(dateStr => {
      const groupItems = groups[dateStr];
      const groupEl = document.createElement('div');
      groupEl.className = 'date-group';

      // Group header
      const headerEl = document.createElement('div');
      headerEl.className = 'date-group-header';
      
      let daySum = 0;
      groupItems.forEach(i => {
        daySum += (i.type === 'income' ? 1 : -1) * Number(i.amount);
      });

      headerEl.innerHTML = `
        <span class="date-title">${formatDateHuman(dateStr)}</span>
        <span class="date-group-total">${daySum >= 0 ? '+' : ''}${formatMoney(daySum)}</span>
      `;
      groupEl.appendChild(headerEl);

      // Render transaction items
      groupItems.forEach(tx => {
        const itemWrapper = createSwipeableTxElement(tx);
        groupEl.appendChild(itemWrapper);
      });

      container.appendChild(groupEl);
    });
  }

  // =========================================================================
  // SWIPE-TO-DELETE & SWIPE-TO-EDIT INTERACTION LOGIC
  // =========================================================================
  function createSwipeableTxElement(tx) {
    const meta = CATEGORY_META[tx.category] || { icon: '🏷️', color: '#64748b' };
    const isIncome = tx.type === 'income';

    const wrapper = document.createElement('div');
    wrapper.className = 'tx-swipe-wrapper';
    wrapper.dataset.id = tx.id;

    // Swipe background actions (Delete on left swipe, Edit on right swipe)
    wrapper.innerHTML = `
      <div class="tx-swipe-actions">
        <div class="tx-action-btn edit-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Edit</span>
        </div>
        <div class="tx-action-btn delete-action">
          <span>Delete</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </div>
      </div>
      <div class="tx-card">
        <div class="tx-left">
          <div class="tx-category-icon" style="background-color: ${meta.color}20; color: ${meta.color};">
            ${meta.icon}
          </div>
          <div class="tx-info">
            <div class="tx-note" title="${escapeHtml(tx.note || tx.category)}">${escapeHtml(tx.note || tx.category)}</div>
            <div class="tx-meta">
              <span class="tx-category-badge">${tx.category}</span>
              <span>•</span>
              <span>${tx.date}</span>
            </div>
          </div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${isIncome ? 'income' : 'expense'}">
            ${isIncome ? '+' : '-'}${formatMoney(tx.amount)}
          </div>
          <!-- Desktop Action buttons -->
          <div class="tx-desktop-actions">
            <button class="tx-btn-mini edit" title="Edit entry" aria-label="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="tx-btn-mini delete" title="Delete entry" aria-label="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const card = wrapper.querySelector('.tx-card');
    const editDesktopBtn = wrapper.querySelector('.tx-btn-mini.edit');
    const deleteDesktopBtn = wrapper.querySelector('.tx-btn-mini.delete');

    // Desktop button listeners
    editDesktopBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(tx);
    });

    deleteDesktopBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteTransaction(tx.id);
    });

    // Touch Swipe gesture listeners (Mobile)
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    const SWIPE_THRESHOLD = 90;

    card.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      currentX = startX;
      isSwiping = true;
      card.classList.add('swiping');
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;

      // Restrict max drag distance for rubber-band feel
      const clampedDelta = Math.max(-140, Math.min(140, deltaX));
      card.style.transform = `translateX(${clampedDelta}px)`;
    }, { passive: true });

    card.addEventListener('touchend', () => {
      if (!isSwiping) return;
      isSwiping = false;
      card.classList.remove('swiping');

      const deltaX = currentX - startX;

      if (deltaX < -SWIPE_THRESHOLD) {
        // Swiped Left -> DELETE
        card.style.transform = `translateX(-100%)`;
        setTimeout(() => handleDeleteTransaction(tx.id), 200);
      } else if (deltaX > SWIPE_THRESHOLD) {
        // Swiped Right -> EDIT
        card.style.transform = `translateX(0px)`;
        setTimeout(() => openEditModal(tx), 150);
      } else {
        // Reset back smoothly
        card.style.transform = `translateX(0px)`;
      }
    });

    // Click on card to trigger edit
    card.addEventListener('click', () => {
      openEditModal(tx);
    });

    return wrapper;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // TRANSACTION CRUD OPERATIONS
  // =========================================================================
  function handleDeleteTransaction(id) {
    const { filtered, deletedItem } = Store.deleteTransaction(id);
    State.transactions = filtered;
    State.lastDeletedItem = deletedItem;

    renderApp();

    showToast(
      `Deleted "${deletedItem.note || deletedItem.category}"`,
      'Undo',
      () => {
        Store.restoreTransaction(deletedItem);
        State.transactions = Store.getTransactions();
        renderApp();
        showToast('Transaction restored');
      }
    );
  }

  function openAddModal() {
    State.editingId = null;
    DOM.modalTitle.textContent = 'Add Transaction';
    DOM.saveBtnText.textContent = 'Save Entry';
    DOM.entryId.value = '';
    DOM.entryAmount.value = '';
    DOM.entryNote.value = '';
    DOM.entryDate.value = new Date().toISOString().split('T')[0];

    // Default to expense
    setFormType('expense');
    updateCategoryDropdown('expense');
    selectCategoryPill('Food');

    clearValidationErrors();
    if (DOM.entryModalSheet) DOM.entryModalSheet.scrollTop = 0;
    openModal(DOM.entryModalBackdrop);
    setTimeout(() => {
      if (DOM.entryAmount) DOM.entryAmount.focus({ preventScroll: true });
    }, 150);
  }

  function openEditModal(tx) {
    State.editingId = tx.id;
    DOM.modalTitle.textContent = 'Edit Transaction';
    DOM.saveBtnText.textContent = 'Update Entry';
    DOM.entryId.value = tx.id;
    DOM.entryAmount.value = tx.amount;
    DOM.entryNote.value = tx.note || '';
    DOM.entryDate.value = tx.date;

    setFormType(tx.type);
    updateCategoryDropdown(tx.type);
    selectCategoryPill(tx.category);

    clearValidationErrors();
    if (DOM.entryModalSheet) DOM.entryModalSheet.scrollTop = 0;
    openModal(DOM.entryModalBackdrop);
  }

  function setFormType(type) {
    State.currentFormType = type;
    if (type === 'expense') {
      DOM.toggleExpenseBtn.className = 'toggle-option-btn active expense';
      DOM.toggleIncomeBtn.className = 'toggle-option-btn income';
    } else {
      DOM.toggleExpenseBtn.className = 'toggle-option-btn expense';
      DOM.toggleIncomeBtn.className = 'toggle-option-btn active income';
    }
    updateCategoryDropdown(type);
  }

  function updateCategoryDropdown(type) {
    const pillsRow = DOM.categoryPillsRow;
    const inputEl = DOM.entryCategory;
    pillsRow.innerHTML = '';

    const categories = Object.keys(CATEGORY_META).filter(cat => CATEGORY_META[cat].type === type);

    categories.forEach((cat, idx) => {
      const meta = CATEGORY_META[cat];
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `cat-pill-btn ${idx === 0 ? 'active' : ''}`;
      pill.dataset.category = cat;
      pill.textContent = `${meta.icon} ${cat}`;
      pill.onclick = () => selectCategoryPill(cat);
      pillsRow.appendChild(pill);
    });

    if (categories.length > 0) {
      inputEl.value = categories[0];
    }
  }

  function selectCategoryPill(category) {
    DOM.entryCategory.value = category;
    const pills = DOM.categoryPillsRow.querySelectorAll('.cat-pill-btn');
    pills.forEach(pill => {
      if (pill.dataset.category === category) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    clearValidationErrors();

    const amountVal = parseFloat(DOM.entryAmount.value);
    const categoryVal = DOM.entryCategory.value.trim();
    const dateVal = DOM.entryDate.value;
    const noteVal = DOM.entryNote.value.trim();
    const typeVal = State.currentFormType;

    let hasError = false;

    // Validation: Positive amount
    if (isNaN(amountVal) || amountVal <= 0) {
      DOM.amountError.classList.add('visible');
      hasError = true;
    }

    if (!categoryVal) {
      DOM.categoryError.classList.add('visible');
      hasError = true;
    }

    if (!dateVal) {
      DOM.dateError.classList.add('visible');
      hasError = true;
    }

    if (hasError) return;

    if (State.editingId) {
      // Update existing
      const updatedTx = {
        id: State.editingId,
        type: typeVal,
        amount: amountVal,
        category: categoryVal,
        date: dateVal,
        note: noteVal
      };
      State.transactions = Store.updateTransaction(updatedTx);
      showToast('Transaction updated successfully');
    } else {
      // Create new
      const newTx = {
        id: generateUUID(),
        type: typeVal,
        amount: amountVal,
        category: categoryVal,
        date: dateVal,
        note: noteVal
      };
      State.transactions = Store.addTransaction(newTx);
      showToast('Transaction added successfully');
    }

    closeModal(DOM.entryModalBackdrop);
    renderApp();
  }

  function clearValidationErrors() {
    DOM.amountError.classList.remove('visible');
    DOM.categoryError.classList.remove('visible');
    DOM.dateError.classList.remove('visible');
  }

  // =========================================================================
  // MODAL CONTROLLER & TOUCH DRAG-TO-DISMISS
  // =========================================================================
  function triggerHaptic() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (err) {
        // Ignore if not allowed
      }
    }
  }

  function openModal(backdrop) {
    triggerHaptic();
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  function closeModal(backdrop) {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Mobile Bottom-Sheet Drag-to-Dismiss Handler
  function initSheetDragGestures() {
    const sheets = [DOM.entryModalSheet, DOM.settingsModalSheet];
    sheets.forEach(sheet => {
      if (!sheet) return;
      let startY = 0;
      let currentY = 0;
      let isDragging = false;

      sheet.addEventListener('touchstart', (e) => {
        // Only start drag if near the top of the sheet / drag handle or scroll is at top
        if (sheet.scrollTop === 0) {
          startY = e.touches[0].clientY;
          isDragging = true;
        }
      }, { passive: true });

      sheet.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
          // Dragging downwards
          sheet.style.transform = `translateY(${deltaY}px)`;
        }
      }, { passive: true });

      sheet.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        const deltaY = currentY - startY;
        if (deltaY > 90) {
          // Dismiss sheet
          sheet.style.transform = '';
          const backdrop = sheet.closest('.modal-backdrop');
          if (backdrop) closeModal(backdrop);
        } else {
          sheet.style.transform = '';
        }
      });
    });
  }

  // =========================================================================
  // CSV EXPORT (CLIENT-SIDE RFC 4180 COMPLIANT)
  // =========================================================================
  function exportTransactionsToCSV() {
    const list = getFilteredTransactions();
    if (list.length === 0) {
      showToast('No transactions to export');
      return;
    }

    const headers = ['ID', 'Type', 'Amount', 'Currency', 'Category', 'Date', 'Note'];
    const rows = [headers];

    list.forEach(tx => {
      rows.push([
        tx.id,
        tx.type,
        Number(tx.amount).toFixed(2),
        State.settings.currencyCode,
        tx.category,
        tx.date,
        (tx.note || '').replace(/"/g, '""') // Escape quotes
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(field => `"${field}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `SpendFlow_Transactions_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${list.length} transactions as CSV`);
  }

  // =========================================================================
  // SETTINGS & THEME
  // =========================================================================
  function applyTheme(theme) {
    State.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    Store.saveTheme(theme);
    renderApp(); // Redraw canvas for theme contrast
  }

  function toggleTheme() {
    const nextTheme = State.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  function setCurrency(symbol, code) {
    State.settings.currencySymbol = symbol;
    State.settings.currencyCode = code;
    Store.saveSettings(State.settings);
    DOM.inputCurrencyAddon.textContent = symbol;

    // Update active button state in grid
    const btns = DOM.currencyGrid.querySelectorAll('.currency-option');
    btns.forEach(btn => {
      if (btn.dataset.symbol === symbol) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    renderApp();
    showToast(`Currency changed to ${code} (${symbol})`);
  }

  // =========================================================================
  // EVENT LISTENERS INITIALIZATION
  // =========================================================================
  function initEventListeners() {
    // Theme toggle
    DOM.themeToggleBtn.addEventListener('click', toggleTheme);

    // Month Navigation
    DOM.prevMonthBtn.addEventListener('click', () => {
      State.selectedDate.setMonth(State.selectedDate.getMonth() - 1);
      renderApp();
    });

    DOM.nextMonthBtn.addEventListener('click', () => {
      State.selectedDate.setMonth(State.selectedDate.getMonth() + 1);
      renderApp();
    });

    DOM.jumpToTodayBtn.addEventListener('click', () => {
      State.selectedDate = new Date();
      State.dateRangeFilter = 'THIS_MONTH';
      DOM.dateRangeFilter.value = 'THIS_MONTH';
      renderApp();
    });

    // Add buttons
    DOM.desktopAddBtn.addEventListener('click', openAddModal);
    DOM.mobileFabAddBtn.addEventListener('click', openAddModal);
    DOM.emptyAddBtn.addEventListener('click', openAddModal);

    // Modal Close buttons
    DOM.closeEntryModalBtn.addEventListener('click', () => closeModal(DOM.entryModalBackdrop));
    DOM.cancelEntryBtn.addEventListener('click', () => closeModal(DOM.entryModalBackdrop));
    DOM.entryModalBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.entryModalBackdrop) closeModal(DOM.entryModalBackdrop);
    });

    // Expense / Income Type Toggle in form
    DOM.toggleExpenseBtn.addEventListener('click', () => setFormType('expense'));
    DOM.toggleIncomeBtn.addEventListener('click', () => setFormType('income'));

    // Form submission
    DOM.entryForm.addEventListener('submit', handleFormSubmit);

    // Search bar
    DOM.searchInput.addEventListener('input', (e) => {
      State.searchQuery = e.target.value;
      if (State.searchQuery.trim()) {
        DOM.searchClearBtn.classList.add('active');
      } else {
        DOM.searchClearBtn.classList.remove('active');
      }
      renderApp();
    });

    DOM.searchClearBtn.addEventListener('click', () => {
      DOM.searchInput.value = '';
      State.searchQuery = '';
      DOM.searchClearBtn.classList.remove('active');
      renderApp();
    });

    // Filter controls
    DOM.categoryFilter.addEventListener('change', (e) => {
      State.categoryFilter = e.target.value;
      renderApp();
    });

    DOM.dateRangeFilter.addEventListener('change', (e) => {
      State.dateRangeFilter = e.target.value;
      renderApp();
    });

    DOM.typeFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.typeFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.typeFilter = btn.dataset.type;
        renderApp();
      });
    });

    // CSV Export buttons
    DOM.exportCsvBtn.addEventListener('click', exportTransactionsToCSV);
    DOM.settingsExportCsvBtn.addEventListener('click', exportTransactionsToCSV);

    // Settings Modal
    DOM.openSettingsBtn.addEventListener('click', () => {
      if (DOM.settingsModalSheet) DOM.settingsModalSheet.scrollTop = 0;
      openModal(DOM.settingsModalBackdrop);
    });
    DOM.mobileSettingsNavBtn.addEventListener('click', () => {
      if (DOM.settingsModalSheet) DOM.settingsModalSheet.scrollTop = 0;
      openModal(DOM.settingsModalBackdrop);
    });
    DOM.closeSettingsModalBtn.addEventListener('click', () => closeModal(DOM.settingsModalBackdrop));
    DOM.settingsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.settingsModalBackdrop) closeModal(DOM.settingsModalBackdrop);
    });

    // Currency selector buttons
    DOM.currencyGrid.addEventListener('click', (e) => {
      const optionBtn = e.target.closest('.currency-option');
      if (optionBtn) {
        const symbol = optionBtn.dataset.symbol;
        const code = optionBtn.dataset.code;
        setCurrency(symbol, code);
      }
    });

    // Load Demo Data
    DOM.loadDemoDataBtn.addEventListener('click', () => {
      State.transactions = generateSampleDemoData();
      Store.saveTransactions(State.transactions);
      closeModal(DOM.settingsModalBackdrop);
      renderApp();
      showToast('Loaded sample demo transactions');
    });

    // Reset Data
    DOM.resetAllDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to permanently delete all transactions? This cannot be undone.')) {
        Store.resetAll();
        State.transactions = [];
        closeModal(DOM.settingsModalBackdrop);
        renderApp();
        showToast('All transaction data cleared');
      }
    });

    // Initialize mobile bottom-sheet drag gesture
    initSheetDragGestures();

    // Keyboard shortcuts (Escape closes modals)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(DOM.entryModalBackdrop);
        closeModal(DOM.settingsModalBackdrop);
      }
    });
  }

  // =========================================================================
  // BOOTSTRAP APPLICATION
  // =========================================================================
  function init() {
    // 1. Load persisted data
    State.transactions = Store.getTransactions();
    State.settings = Store.getSettings();
    State.theme = Store.getTheme();

    // 2. Apply theme & currency
    applyTheme(State.theme);
    DOM.inputCurrencyAddon.textContent = State.settings.currencySymbol;

    // Highlight active currency in settings
    const curBtns = DOM.currencyGrid.querySelectorAll('.currency-option');
    curBtns.forEach(btn => {
      if (btn.dataset.symbol === State.settings.currencySymbol) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 3. Register Event Listeners
    initEventListeners();

    // 4. Initial Render
    renderApp();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
