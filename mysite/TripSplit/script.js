/**
 * TripSplit - Smart Group Expense Splitter & Settlement Manager
 * Production Vanilla JavaScript Application Architecture
 * 
 * Author: Sagar Chavada
 * License: MIT
 */

// Application Namespace & State
const app = {
  // Primary LocalStorage Key
  STORAGE_KEY: 'tripSplitData',
  SETTINGS_KEY: 'tripSplitSettings',

  // Current State
  data: {
    activeGroupId: null,
    groups: []
  },

  settings: {
    theme: 'dark',
    currency: 'INR'
  },

  // Active UI filters & transient states
  currentView: 'dashboard',
  searchQuery: '',
  filterCategory: 'all',
  filterMember: 'all',

  // Active Modal Editing Context
  editingExpenseId: null,
  editingMemberId: null,
  confirmCallback: null,

  // Currency Symbols Map
  CURRENCIES: {
    INR: { symbol: '₹', code: 'INR', locale: 'en-IN' },
    USD: { symbol: '$', code: 'USD', locale: 'en-US' },
    EUR: { symbol: '€', code: 'EUR', locale: 'de-DE' },
    GBP: { symbol: '£', code: 'GBP', locale: 'en-GB' }
  },

  // =========================================================================
  // 1. INITIALIZATION & STORAGE
  // =========================================================================

  init() {
    this.loadSettings();
    this.loadData();
    this.setupEventListeners();

    // Default to demo data if no group exists
    if (!this.data.groups || this.data.groups.length === 0) {
      this.loadDemoData(false);
    }

    this.applyTheme(this.settings.theme);
    this.updateCurrencyUI();
    this.renderActiveGroupDropdowns();
    this.navigateTo(this.currentView);

    // 0-Click Auto-Focus on page load
    setTimeout(() => {
      const smartInp = document.getElementById('smart-expense-input');
      if (smartInp) smartInp.focus();
    }, 100);
  },

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.SETTINGS_KEY);
      if (saved) {
        this.settings = Object.assign(this.settings, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load settings from LocalStorage', e);
    }
  },

  saveSettings() {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },

  loadData() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.groups)) {
          this.data = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load TripSplit data from LocalStorage', e);
      this.showToast('Error loading saved data. Corrupted state reset.', 'error');
    }
  },

  saveData() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save data to LocalStorage', e);
      this.showToast('Storage quota exceeded or error saving data!', 'error');
    }
  },

  getActiveGroup() {
    if (!this.data.groups || this.data.groups.length === 0) return null;
    let group = this.data.groups.find(g => g.id === this.data.activeGroupId);
    if (!group) {
      group = this.data.groups[0];
      this.data.activeGroupId = group.id;
    }
    return group;
  },

  // =========================================================================
  // 2. HELPER UTILITIES
  // =========================================================================

  generateUniqueId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  },

  formatCurrency(amount) {
    const numeric = Number(amount) || 0;
    const curr = this.CURRENCIES[this.settings.currency] || this.CURRENCIES.INR;
    return `${curr.symbol}${numeric.toLocaleString(curr.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  },

  applyTheme(theme) {
    this.settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    const select = document.getElementById('settings-theme-select');
    if (select) select.value = theme;
    this.saveSettings();
  },

  updateCurrencyUI() {
    const symbol = (this.CURRENCIES[this.settings.currency] || this.CURRENCIES.INR).symbol;
    document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = symbol);
    const select = document.getElementById('settings-currency-select');
    if (select) select.value = this.settings.currency;
  },

  navigateTo(viewId) {
    this.currentView = viewId;

    document.querySelectorAll('.sidebar-nav .nav-item, .mobile-nav .mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    const titleMap = {
      dashboard: 'Dashboard',
      members: 'Group Members',
      expenses: 'Expenses',
      balances: 'Detailed Balances',
      settle: 'Settle Up & Payments',
      summary: 'Trip Analytics & Summary',
      settings: 'Settings & Data'
    };
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = titleMap[viewId] || 'TripSplit';

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewId}`);
    });

    this.renderCurrentView();

    // Auto-focus smart input when navigating back to Dashboard
    if (viewId === 'dashboard') {
      setTimeout(() => {
        const inp = document.getElementById('smart-expense-input');
        if (inp) inp.focus();
      }, 50);
    }
  },

  renderCurrentView() {
    const group = this.getActiveGroup();
    this.updateBadges();

    if (this.currentView === 'dashboard') this.renderDashboard(group);
    if (this.currentView === 'members') this.renderMembers(group);
    if (this.currentView === 'expenses') this.renderExpenses(group);
    if (this.currentView === 'balances') this.renderBalances(group);
    if (this.currentView === 'settle') this.renderSettleUp(group);
    if (this.currentView === 'summary') this.renderSummary(group);
    if (this.currentView === 'settings') this.renderSettings();
  },

  updateBadges() {
    const group = this.getActiveGroup();
    const membersCount = group && group.members ? group.members.length : 0;
    const expensesCount = group && group.expenses ? group.expenses.length : 0;
    
    const settleTx = this.generateSettlementTransactions(group);
    const settleCount = settleTx.length;

    const mBadge = document.getElementById('badge-members-count');
    if (mBadge) mBadge.textContent = membersCount;

    const eBadge = document.getElementById('badge-expenses-count');
    if (eBadge) eBadge.textContent = expensesCount;

    const sBadge = document.getElementById('badge-settle-count');
    if (sBadge) {
      sBadge.textContent = settleCount;
      sBadge.style.display = settleCount > 0 ? 'inline-block' : 'none';
    }
  },

  // =========================================================================
  // 3. MATHEMATICAL COMPUTATIONS & BALANCE ENGINE
  // =========================================================================

  calculateMemberBalances(group) {
    if (!group || !group.members) return [];

    const map = {};
    group.members.forEach(m => {
      map[m.id] = {
        member: m,
        paid: 0,
        share: 0,
        expenseBalance: 0,
        paymentsMade: 0,
        paymentsReceived: 0,
        netBalance: 0
      };
    });

    if (group.expenses && Array.isArray(group.expenses)) {
      group.expenses.forEach(exp => {
        const amount = Number(exp.amount) || 0;
        if (map[exp.paidBy]) {
          map[exp.paidBy].paid += amount;
        }

        if (exp.splits) {
          Object.keys(exp.splits).forEach(mId => {
            if (map[mId]) {
              map[mId].share += Number(exp.splits[mId]) || 0;
            }
          });
        }
      });
    }

    if (group.payments && Array.isArray(group.payments)) {
      group.payments.forEach(pay => {
        if (pay.status === 'completed') {
          const amt = Number(pay.amount) || 0;
          if (map[pay.from]) map[pay.from].paymentsMade += amt;
          if (map[pay.to]) map[pay.to].paymentsReceived += amt;
        }
      });
    }

    return Object.values(map).map(item => {
      item.expenseBalance = item.paid - item.share;
      item.netBalance = item.expenseBalance + item.paymentsMade - item.paymentsReceived;
      return item;
    });
  },

  generateSettlementTransactions(group) {
    const balances = this.calculateMemberBalances(group);
    if (balances.length === 0) return [];

    const creditors = [];
    const debtors = [];

    balances.forEach(item => {
      const bal = Math.round(item.netBalance * 100) / 100;
      if (bal > 0.005) {
        creditors.push({ id: item.member.id, name: item.member.name, avatar: item.member.avatar, balance: bal });
      } else if (bal < -0.005) {
        debtors.push({ id: item.member.id, name: item.member.name, avatar: item.member.avatar, balance: Math.abs(bal) });
      }
    });

    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => b.balance - a.balance);

    const transactions = [];
    let i = 0, j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];

      const amountToSettle = Math.min(creditor.balance, debtor.balance);
      const roundedAmount = Math.round(amountToSettle * 100) / 100;

      if (roundedAmount >= 0.01) {
        transactions.push({
          id: `settle-${i}-${j}`,
          fromId: debtor.id,
          fromName: debtor.name,
          fromAvatar: debtor.avatar,
          toId: creditor.id,
          toName: creditor.name,
          toAvatar: creditor.avatar,
          amount: roundedAmount
        });
      }

      creditor.balance -= roundedAmount;
      debtor.balance -= roundedAmount;

      if (creditor.balance < 0.005) i++;
      if (debtor.balance < 0.005) j++;
    }

    return transactions;
  },

  calculateSplitShares(amount, splitType, participants, rawInputs) {
    const totalAmount = Number(amount) || 0;
    const splits = {};

    if (!participants || participants.length === 0 || totalAmount <= 0) {
      return { splits: {}, isValid: false, message: 'Please specify total amount and participants.' };
    }

    const n = participants.length;

    if (splitType === 'equal') {
      const perPerson = Math.floor((totalAmount / n) * 100) / 100;
      let remainder = Math.round((totalAmount - perPerson * n) * 100);

      participants.forEach(pId => {
        let pShare = perPerson;
        if (remainder > 0) {
          pShare = Math.round((pShare + 0.01) * 100) / 100;
          remainder--;
        }
        splits[pId] = pShare;
      });

      return { splits, isValid: true, message: 'Equal split is valid.' };
    }

    if (splitType === 'exact') {
      let sumExact = 0;
      participants.forEach(pId => {
        const val = Number(rawInputs[pId]) || 0;
        splits[pId] = val;
        sumExact += val;
      });

      const diff = Math.abs(sumExact - totalAmount);
      if (diff < 0.01) {
        return { splits, isValid: true, message: 'Exact split sum equals total amount.' };
      } else {
        return { 
          splits, 
          isValid: false, 
          message: `Sum of exact shares (${this.formatCurrency(sumExact)}) must equal total amount (${this.formatCurrency(totalAmount)}).` 
        };
      }
    }

    if (splitType === 'percentage') {
      let sumPct = 0;
      participants.forEach(pId => {
        const pct = Number(rawInputs[pId]) || 0;
        sumPct += pct;
        splits[pId] = Math.round(((pct / 100) * totalAmount) * 100) / 100;
      });

      const diff = Math.abs(sumPct - 100);
      if (diff < 0.01) {
        return { splits, isValid: true, message: 'Total percentage equals 100%.' };
      } else {
        return { splits, isValid: false, message: `Total percentage (${sumPct.toFixed(1)}%) must equal 100%.` };
      }
    }

    if (splitType === 'shares') {
      let totalShares = 0;
      participants.forEach(pId => {
        const sh = Number(rawInputs[pId]) || 0;
        totalShares += sh;
      });

      if (totalShares <= 0) {
        return { splits, isValid: false, message: 'Total custom shares must be greater than zero.' };
      }

      participants.forEach(pId => {
        const sh = Number(rawInputs[pId]) || 0;
        splits[pId] = Math.round(((sh / totalShares) * totalAmount) * 100) / 100;
      });

      return { splits, isValid: true, message: `Shares split is valid (Total Shares: ${totalShares}).` };
    }

    return { splits: {}, isValid: false, message: 'Unknown split type.' };
  },

  // =========================================================================
  // 4. RENDERING VIEWS
  // =========================================================================

  renderActiveGroupDropdowns() {
    const desktopSelect = document.getElementById('group-select');
    const mobileSelect = document.getElementById('mobile-group-select');

    if (!this.data.groups) this.data.groups = [];

    const optionsHTML = this.data.groups.map(g => 
      `<option value="${g.id}" ${g.id === this.data.activeGroupId ? 'selected' : ''}>${g.name}</option>`
    ).join('');

    if (desktopSelect) desktopSelect.innerHTML = optionsHTML;
    if (mobileSelect) mobileSelect.innerHTML = optionsHTML;

    const group = this.getActiveGroup();
    const smartPaidSelect = document.getElementById('smart-expense-paidby');
    if (smartPaidSelect && group && group.members) {
      smartPaidSelect.innerHTML = group.members.map(m => `<option value="${m.id}">Paid by ${m.name}</option>`).join('');
    }
  },

  renderDashboard(group) {
    if (!group) return;

    const totalExpenses = (group.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const membersCount = (group.members || []).length;
    const expensesCount = (group.expenses || []).length;
    const settleTx = this.generateSettlementTransactions(group);

    document.getElementById('dash-total-expenses').textContent = this.formatCurrency(totalExpenses);
    document.getElementById('dash-total-members').textContent = membersCount;
    document.getElementById('dash-expense-count').textContent = expensesCount;
    document.getElementById('dash-pending-settlements').textContent = settleTx.length;

    const balancesGrid = document.getElementById('dash-member-balances-grid');
    const memberBalances = this.calculateMemberBalances(group);

    if (memberBalances.length === 0) {
      balancesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-title">No Members Added</div>
          <div class="empty-desc">Add members below to start tracking trip expenses.</div>
        </div>`;
    } else {
      balancesGrid.innerHTML = memberBalances.map(item => {
        const bal = item.netBalance;
        let statusClass = 'neutral';
        let statusText = 'Settled Up';
        let quickSettleBtn = '';

        if (bal > 0.005) {
          statusClass = 'positive';
          statusText = `Gets back ${this.formatCurrency(bal)}`;
        } else if (bal < -0.005) {
          statusClass = 'negative';
          statusText = `Owes ${this.formatCurrency(Math.abs(bal))}`;
          const tx = settleTx.find(t => t.fromId === item.member.id);
          if (tx) {
            quickSettleBtn = `<button type="button" class="btn-quick-settle" onclick="app.quickCompleteSettlement('${tx.fromId}', '${tx.toId}', ${tx.amount})">⚡ Pay ${this.formatCurrency(tx.amount)} to ${tx.toName}</button>`;
          }
        }

        return `
          <div class="member-balance-card ${statusClass}">
            <div class="member-card-header">
              <div class="member-avatar">${item.member.avatar || '😎'}</div>
              <div>
                <div class="member-name">${item.member.name}</div>
                <div class="member-joined-date">Joined ${this.formatDate(item.member.createdAt)}</div>
              </div>
            </div>
            <div class="member-stats-row">
              <span>Paid: <strong>${this.formatCurrency(item.paid)}</strong></span>
              <span>Share: <strong>${this.formatCurrency(item.share)}</strong></span>
            </div>
            <div class="balance-status-box ${statusClass}">
              <span>${statusText}</span>
            </div>
            ${quickSettleBtn}
          </div>`;
      }).join('');
    }

    const recentEl = document.getElementById('dash-recent-expenses');
    const recentExpenses = (group.expenses || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

    if (recentExpenses.length === 0) {
      recentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💸</div>
          <div class="empty-title">No Expenses Yet</div>
          <div class="empty-desc">Type e.g. "Dinner 1500" above to create your first expense in 1 step!</div>
        </div>`;
    } else {
      recentEl.innerHTML = recentExpenses.map(exp => this.createExpenseCardHTML(exp, group)).join('');
    }
  },

  renderMembers(group) {
    if (!group) return;
    const grid = document.getElementById('members-grid');
    const memberBalances = this.calculateMemberBalances(group);

    if (!group.members || group.members.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🎒</div>
          <div class="empty-title">No Friends Added</div>
          <div class="empty-desc">Use the input bar above to add your trip friends instantly in 1 step!</div>
        </div>`;
      return;
    }

    grid.innerHTML = memberBalances.map(item => `
      <div class="member-full-card">
        <div class="member-full-top">
          <div class="member-full-info">
            <div class="member-avatar">${item.member.avatar || '😎'}</div>
            <div>
              <div class="member-name">${item.member.name}</div>
              <div class="member-joined-date">Member since ${this.formatDate(item.member.createdAt)}</div>
            </div>
          </div>
          <div class="member-actions">
            <button class="btn-icon-sm" onclick="app.openMemberModal('${item.member.id}')" title="Edit Member">✏️</button>
            <button class="btn-icon-sm" onclick="app.confirmDeleteMember('${item.member.id}')" title="Remove Member">🗑️</button>
          </div>
        </div>

        <div class="member-stats-row">
          <span>Total Contributed:</span>
          <strong>${this.formatCurrency(item.paid)}</strong>
        </div>
        <div class="member-stats-row">
          <span>Actual Share:</span>
          <strong>${this.formatCurrency(item.share)}</strong>
        </div>

        <div class="balance-status-box ${item.netBalance > 0.005 ? 'positive' : (item.netBalance < -0.005 ? 'negative' : 'neutral')}">
          <span>${item.netBalance > 0.005 ? 'Gets Back' : (item.netBalance < -0.005 ? 'Owes' : 'Status')}</span>
          <span>${this.formatCurrency(Math.abs(item.netBalance))}</span>
        </div>
      </div>
    `).join('');
  },

  renderExpenses(group) {
    if (!group) return;
    const container = document.getElementById('expenses-list');
    
    const memberSelect = document.getElementById('filter-member');
    if (memberSelect) {
      const currentVal = memberSelect.value;
      memberSelect.innerHTML = `<option value="all">All Members</option>` +
        (group.members || []).map(m => `<option value="${m.id}">${m.name}</option>`).join('');
      memberSelect.value = currentVal;
    }

    let list = (group.expenses || []).slice();

    if (this.filterCategory !== 'all') {
      list = list.filter(e => e.category === this.filterCategory);
    }

    if (this.filterMember !== 'all') {
      list = list.filter(e => e.paidBy === this.filterMember || (e.participants && e.participants.includes(this.filterMember)));
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(e => {
        const payer = (group.members || []).find(m => m.id === e.paidBy);
        const payerName = payer ? payer.name.toLowerCase() : '';
        return (e.title && e.title.toLowerCase().includes(q)) ||
               (e.category && e.category.toLowerCase().includes(q)) ||
               payerName.includes(q);
      });
    }

    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <div class="empty-title">No Expenses Found</div>
          <div class="empty-desc">No expenses match your search query or filters.</div>
          <button class="btn btn-secondary btn-sm" onclick="app.clearFilters()">Clear Filters</button>
        </div>`;
      return;
    }

    container.innerHTML = list.map(exp => this.createExpenseCardHTML(exp, group)).join('');
  },

  createExpenseCardHTML(exp, group) {
    const payer = (group.members || []).find(m => m.id === exp.paidBy);
    const payerName = payer ? payer.name : 'Unknown';
    const participantsCount = exp.participants ? exp.participants.length : 0;

    const catIcons = {
      Food: '🍔', Transport: '🚕', Hotel: '🏨', Party: '🎉',
      Shopping: '🛍️', Tickets: '🎟️', Drinks: '☕', Fuel: '⛽', Other: '📦'
    };
    const icon = catIcons[exp.category] || '📦';

    return `
      <div class="expense-card" onclick="app.openExpenseDetailModal('${exp.id}')">
        <div class="expense-left">
          <div class="category-icon-box">${icon}</div>
          <div>
            <div class="expense-title">${exp.title}</div>
            <div class="expense-meta">
              <span>Paid by <strong>${payerName}</strong></span>
              <span>•</span>
              <span>${participantsCount} members</span>
              <span>•</span>
              <span>${this.formatDate(exp.date)}</span>
            </div>
          </div>
        </div>

        <div class="expense-right">
          <div class="expense-amount">${this.formatCurrency(exp.amount)}</div>
          <div class="expense-card-actions" onclick="event.stopPropagation()">
            <button class="btn-icon-sm" onclick="app.openExpenseModal('${exp.id}')" title="Edit Expense">✏️</button>
            <button class="btn-icon-sm" onclick="app.confirmDeleteExpense('${exp.id}')" title="Delete Expense">🗑️</button>
          </div>
        </div>
      </div>`;
  },

  renderBalances(group) {
    if (!group) return;
    const tbody = document.getElementById('balances-table-body');
    const memberBalances = this.calculateMemberBalances(group);

    if (memberBalances.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4">No members found.</td></tr>`;
      return;
    }

    tbody.innerHTML = memberBalances.map(item => {
      const expBal = item.expenseBalance;
      const netBal = item.netBalance;

      return `
        <tr>
          <td>
            <div class="flex items-center gap-2" style="display:flex; align-items:center; gap:8px;">
              <span>${item.member.avatar || '😎'}</span>
              <strong>${item.member.name}</strong>
            </div>
          </td>
          <td class="text-right">${this.formatCurrency(item.paid)}</td>
          <td class="text-right">${this.formatCurrency(item.share)}</td>
          <td class="text-right ${expBal > 0.005 ? 'text-emerald' : (expBal < -0.005 ? 'text-rose' : '')}">
            ${expBal > 0 ? '+' : ''}${this.formatCurrency(expBal)}
          </td>
          <td class="text-right">${this.formatCurrency(item.paymentsMade)}</td>
          <td class="text-right">${this.formatCurrency(item.paymentsReceived)}</td>
          <td class="text-right font-bold ${netBal > 0.005 ? 'text-emerald' : (netBal < -0.005 ? 'text-rose' : '')}">
            ${netBal > 0 ? '+' : ''}${this.formatCurrency(netBal)}
          </td>
        </tr>`;
    }).join('');
  },

  renderSettleUp(group) {
    if (!group) return;

    const txs = this.generateSettlementTransactions(group);
    const badge = document.getElementById('settlement-count-badge');
    if (badge) badge.textContent = `${txs.length} Transaction${txs.length === 1 ? '' : 's'}`;

    const container = document.getElementById('settlement-transactions-container');

    if (txs.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🎉</div>
          <div class="empty-title">Everyone is settled up!</div>
          <div class="empty-desc">There are zero outstanding balances or debts remaining in this trip group.</div>
        </div>`;
    } else {
      container.innerHTML = txs.map(tx => `
        <div class="settle-card">
          <div class="settle-flow">
            <div class="settle-user">
              <div class="member-avatar">${tx.fromAvatar || '😎'}</div>
              <strong style="font-size:14px;">${tx.fromName}</strong>
            </div>

            <div class="settle-arrow-box">
              <div class="settle-amount">${this.formatCurrency(tx.amount)}</div>
              <div class="settle-arrow">➔ pays ➔</div>
            </div>

            <div class="settle-user">
              <div class="member-avatar">${tx.toAvatar || '😎'}</div>
              <strong style="font-size:14px;">${tx.toName}</strong>
            </div>
          </div>

          <button class="btn btn-primary btn-sm btn-full" onclick="app.quickCompleteSettlement('${tx.fromId}', '${tx.toId}', ${tx.amount})">
            ✓ Mark as Completed
          </button>
        </div>
      `).join('');
    }

    const historyContainer = document.getElementById('payments-history-container');
    const payments = (group.payments || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    if (payments.length === 0) {
      historyContainer.innerHTML = `<p class="text-muted text-center p-3">No settlement payments recorded yet.</p>`;
    } else {
      historyContainer.innerHTML = payments.map(pay => {
        const fromMember = (group.members || []).find(m => m.id === pay.from);
        const toMember = (group.members || []).find(m => m.id === pay.to);
        const fromName = fromMember ? fromMember.name : 'Unknown';
        const toName = toMember ? toMember.name : 'Unknown';

        return `
          <div class="payment-item">
            <div>
              <strong>${fromName}</strong> paid <strong>${toName}</strong>
              <div class="text-muted" style="font-size:12px;">${this.formatDate(pay.date)} • ${pay.note || 'Settlement Payment'}</div>
            </div>
            <div class="flex items-center gap-3" style="display:flex; align-items:center; gap:12px;">
              <span class="font-bold text-emerald" style="font-size:16px;">${this.formatCurrency(pay.amount)}</span>
              <button class="btn-icon-sm" onclick="app.confirmDeletePayment('${pay.id}')" title="Delete Payment">🗑️</button>
            </div>
          </div>`;
      }).join('');
    }
  },

  renderSummary(group) {
    if (!group) return;

    const expenses = group.expenses || [];
    const members = group.members || [];

    const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const avgPerPerson = members.length > 0 ? totalSpent / members.length : 0;

    document.getElementById('summary-total-spent').textContent = this.formatCurrency(totalSpent);
    document.getElementById('summary-avg-per-person').textContent = `Avg ${this.formatCurrency(avgPerPerson)} / member`;

    const contributions = {};
    expenses.forEach(e => {
      contributions[e.paidBy] = (contributions[e.paidBy] || 0) + (Number(e.amount) || 0);
    });

    let topSpenderId = null;
    let topSpenderAmt = 0;
    Object.keys(contributions).forEach(mId => {
      if (contributions[mId] > topSpenderAmt) {
        topSpenderAmt = contributions[mId];
        topSpenderId = mId;
      }
    });

    const topSpenderObj = members.find(m => m.id === topSpenderId);
    document.getElementById('summary-top-spender-name').textContent = topSpenderObj ? topSpenderObj.name : '-';
    document.getElementById('summary-top-spender-amount').textContent = `${this.formatCurrency(topSpenderAmt)} total paid`;

    const categoryTotals = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(e.amount) || 0);
    });

    let topCat = '-';
    let topCatAmt = 0;
    Object.keys(categoryTotals).forEach(cat => {
      if (categoryTotals[cat] > topCatAmt) {
        topCatAmt = categoryTotals[cat];
        topCat = cat;
      }
    });

    document.getElementById('summary-top-cat-name').textContent = topCat;
    document.getElementById('summary-top-cat-amount').textContent = `${this.formatCurrency(topCatAmt)} spent`;

    let highestExp = null;
    let maxAmt = 0;
    expenses.forEach(e => {
      if (Number(e.amount) > maxAmt) {
        maxAmt = Number(e.amount);
        highestExp = e;
      }
    });

    document.getElementById('summary-top-expense-title').textContent = highestExp ? highestExp.title : '-';
    document.getElementById('summary-top-expense-amount').textContent = this.formatCurrency(maxAmt);

    const catProgressContainer = document.getElementById('summary-category-progress');
    const sortedCats = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    if (sortedCats.length === 0) {
      catProgressContainer.innerHTML = `<p class="text-muted text-center p-3">No spending category data available.</p>`;
    } else {
      catProgressContainer.innerHTML = sortedCats.map(cat => {
        const amt = categoryTotals[cat];
        const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;

        return `
          <div class="category-progress-item">
            <div class="cat-progress-header">
              <span>${cat}</span>
              <span>${this.formatCurrency(amt)} (${pct.toFixed(1)}%)</span>
            </div>
            <div class="cat-progress-bar-bg">
              <div class="cat-progress-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>`;
      }).join('');
    }
  },

  renderSettings() {
    const themeSelect = document.getElementById('settings-theme-select');
    if (themeSelect) themeSelect.value = this.settings.theme;

    const currSelect = document.getElementById('settings-currency-select');
    if (currSelect) currSelect.value = this.settings.currency;
  },

  clearFilters() {
    this.searchQuery = '';
    this.filterCategory = 'all';
    this.filterMember = 'all';

    const searchInp = document.getElementById('expense-search-input');
    if (searchInp) searchInp.value = '';

    const catSelect = document.getElementById('filter-category');
    if (catSelect) catSelect.value = 'all';

    const memSelect = document.getElementById('filter-member');
    if (memSelect) memSelect.value = 'all';

    this.renderExpenses(this.getActiveGroup());
  },

  // 🚀 NATURAL LANGUAGE & 0-CLICK WORKFLOW HANDLERS

  /**
   * Parses natural language e.g. "Rahul paid Dinner 1200" or "Pizza 500"
   */
  addSmartExpenseFromInput() {
    const group = this.getActiveGroup();
    if (!group) return;

    if (!group.members) group.members = [];

    const inputEl = document.getElementById('smart-expense-input');
    const paidBySelect = document.getElementById('smart-expense-paidby');
    const rawVal = inputEl.value.trim();

    if (!rawVal) return;

    let detectedPayerName = null;
    let title = rawVal;
    let amount = 0;

    // Pattern 1: "Rahul paid Dinner 1200" or "Rahul Dinner 1200"
    const naturalMatch = rawVal.match(/^(.*?)\s+(?:paid|pays|spent|gives)?\s*(.*?)\s+([0-9]+(?:\.[0-9]{1,2})?)$/i);
    if (naturalMatch) {
      const part1 = naturalMatch[1].trim();
      const part2 = naturalMatch[2].trim();
      const numVal = Number(naturalMatch[3]);

      // Check if part1 is a member name or potential new member
      if (part2 && numVal > 0) {
        detectedPayerName = part1;
        title = part2;
        amount = numVal;
      } else {
        title = `${part1} ${part2}`.trim();
        amount = numVal;
      }
    } else {
      // Fallback: extract amount at end
      const numMatch = rawVal.match(/([0-9]+(?:\.[0-9]{1,2})?)$/);
      if (numMatch) {
        amount = Number(numMatch[1]);
        title = rawVal.replace(numMatch[1], '').trim() || 'Trip Expense';
      }
    }

    if (amount <= 0) {
      this.showToast('Please include an amount e.g. "Dinner 1500"', 'warning');
      return;
    }

    // Resolve Payer ID (auto-create member if specified in text)
    let paidById = paidBySelect.value;

    if (detectedPayerName) {
      let existingMember = group.members.find(m => m.name.toLowerCase() === detectedPayerName.toLowerCase());
      if (!existingMember) {
        // Auto-create new member in 0 steps!
        const emojis = ['😎', '🥳', '🏄‍♂️', '🏖️', '🎒', '🍕', '🚘', '🏕️', '🚀', '👑'];
        existingMember = {
          id: this.generateUniqueId('member'),
          name: detectedPayerName,
          avatar: emojis[Math.floor(Math.random() * emojis.length)],
          createdAt: new Date().toISOString().split('T')[0]
        };
        group.members.push(existingMember);
        this.renderActiveGroupDropdowns();
      }
      paidById = existingMember.id;
    }

    if (!paidById && group.members.length > 0) {
      paidById = group.members[0].id;
    }

    const allMembers = group.members.map(m => m.id);
    const splitCalc = this.calculateSplitShares(amount, 'equal', allMembers, {});

    const newExpense = {
      id: this.generateUniqueId('expense'),
      title: title,
      amount: amount,
      category: 'Food',
      date: new Date().toISOString().split('T')[0],
      paidBy: paidById,
      participants: allMembers,
      splitType: 'equal',
      splits: splitCalc.splits,
      notes: 'Natural Language 0-Click',
      createdAt: Date.now()
    };

    group.expenses.push(newExpense);
    this.saveData();

    inputEl.value = '';
    const payerObj = group.members.find(m => m.id === paidById);
    const payerName = payerObj ? payerObj.name : 'Unknown';

    this.showToast(`⚡ Added "${title}" (${this.formatCurrency(amount)}) paid by ${payerName}!`, 'success');
    this.renderCurrentView();

    // Re-focus input for next entry
    inputEl.focus();
  },

  addPresetExpense(category, defaultTitle, defaultAmount) {
    const group = this.getActiveGroup();
    if (!group || !group.members || group.members.length === 0) {
      this.showToast('Please add members first!', 'warning');
      return;
    }

    const paidBy = group.members[0].id;
    const allMembers = group.members.map(m => m.id);
    const splitCalc = this.calculateSplitShares(defaultAmount, 'equal', allMembers, {});

    const newExpense = {
      id: this.generateUniqueId('expense'),
      title: defaultTitle,
      amount: defaultAmount,
      category: category,
      date: new Date().toISOString().split('T')[0],
      paidBy: paidBy,
      participants: allMembers,
      splitType: 'equal',
      splits: splitCalc.splits,
      notes: '1-Tap Preset',
      createdAt: Date.now()
    };

    group.expenses.push(newExpense);
    this.saveData();

    this.showToast(`⚡ Logged ${defaultTitle} (${this.formatCurrency(defaultAmount)}) in 1 tap!`, 'success');
    this.renderCurrentView();
  },

  saveInlineMember() {
    const group = this.getActiveGroup();
    if (!group) return;

    const inputEl = document.getElementById('inline-member-name');
    const name = inputEl.value.trim();
    if (!name) return;

    const emojis = ['😎', '🥳', '🏄‍♂️', '🏖️', '🎒', '🍕', '🚘', '🏕️', '🚀', '👑'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    const newMember = {
      id: this.generateUniqueId('member'),
      name: name,
      avatar: randomEmoji,
      createdAt: new Date().toISOString().split('T')[0]
    };

    group.members.push(newMember);
    this.saveData();
    this.renderActiveGroupDropdowns();

    inputEl.value = '';
    this.showToast(`✓ Added ${name} to trip group!`, 'success');
    this.renderCurrentView();
  },

  settleAllBalances() {
    const group = this.getActiveGroup();
    if (!group) return;

    const txs = this.generateSettlementTransactions(group);
    if (txs.length === 0) {
      this.showToast('Everyone is already settled up!', 'info');
      return;
    }

    if (!group.payments) group.payments = [];
    const today = new Date().toISOString().split('T')[0];

    txs.forEach(tx => {
      group.payments.push({
        id: this.generateUniqueId('payment'),
        from: tx.fromId,
        to: tx.toId,
        amount: tx.amount,
        date: today,
        note: 'Batch 1-Tap Settle All',
        status: 'completed'
      });
    });

    this.saveData();
    this.showToast(`⚡ Settled all ${txs.length} transactions in 1 tap! 🎉`, 'success');
    this.renderCurrentView();
  },

  addQuickAmount(delta) {
    const amtInput = document.getElementById('expense-form-amount');
    if (amtInput) {
      const current = Number(amtInput.value) || 0;
      amtInput.value = (current + delta).toFixed(2);
      this.updateSplitValidation();
    }
  },

  // =========================================================================
  // 5. MODALS MANAGEMENT & DYNAMIC SPLIT INPUTS
  // =========================================================================

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  openGroupModal(groupId = null) {
    const form = document.getElementById('form-group');
    const titleEl = document.getElementById('modal-group-title');

    if (groupId) {
      const group = this.data.groups.find(g => g.id === groupId);
      if (!group) return;
      titleEl.textContent = 'Edit Group';
      document.getElementById('group-form-id').value = group.id;
      document.getElementById('group-form-name').value = group.name;
      document.getElementById('group-form-desc').value = group.description || '';
    } else {
      titleEl.textContent = 'Create New Group';
      form.reset();
      document.getElementById('group-form-id').value = '';
    }

    this.openModal('modal-group');
  },

  openMemberModal(memberId = null) {
    const group = this.getActiveGroup();
    if (!group) return;

    const form = document.getElementById('form-member');
    const titleEl = document.getElementById('modal-member-title');

    if (memberId) {
      const m = group.members.find(mem => mem.id === memberId);
      if (!m) return;
      titleEl.textContent = 'Edit Member';
      document.getElementById('member-form-id').value = m.id;
      document.getElementById('member-form-name').value = m.name;
      document.getElementById('member-form-avatar').value = m.avatar || '😎';
      this.selectEmoji(m.avatar || '😎');
    } else {
      titleEl.textContent = 'Add New Member';
      form.reset();
      document.getElementById('member-form-id').value = '';
      document.getElementById('member-form-avatar').value = '😎';
      this.selectEmoji('😎');
    }

    this.openModal('modal-member');
  },

  selectEmoji(emoji) {
    document.querySelectorAll('.emoji-option').forEach(el => {
      el.classList.toggle('active', el.dataset.emoji === emoji);
    });
    document.getElementById('member-form-avatar').value = emoji;
  },

  openExpenseModal(expenseId = null) {
    const group = this.getActiveGroup();
    if (!group || !group.members || group.members.length === 0) {
      this.showToast('Please add members to the group before creating expenses!', 'warning');
      this.openMemberModal();
      return;
    }

    const titleEl = document.getElementById('modal-expense-title');
    const paidBySelect = document.getElementById('expense-form-paidby');

    paidBySelect.innerHTML = group.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

    this.editingExpenseId = expenseId;

    if (expenseId) {
      const exp = group.expenses.find(e => e.id === expenseId);
      if (!exp) return;

      titleEl.textContent = 'Edit Expense';
      document.getElementById('expense-form-id').value = exp.id;
      document.getElementById('expense-form-title').value = exp.title;
      document.getElementById('expense-form-amount').value = exp.amount;
      document.getElementById('expense-form-category').value = exp.category;
      document.getElementById('expense-form-date').value = exp.date;
      document.getElementById('expense-form-paidby').value = exp.paidBy;
      document.getElementById('expense-form-splittype').value = exp.splitType || 'equal';
      document.getElementById('expense-form-notes').value = exp.notes || '';

      this.setSplitTypeTab(exp.splitType || 'equal');
      this.renderParticipantInputs(exp.participants || group.members.map(m => m.id), exp.splits || {});
    } else {
      titleEl.textContent = 'Add Expense';
      document.getElementById('expense-form-id').value = '';
      document.getElementById('expense-form-title').value = '';
      document.getElementById('expense-form-amount').value = '';
      document.getElementById('expense-form-category').value = 'Food';
      document.getElementById('expense-form-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('expense-form-notes').value = '';

      this.setSplitTypeTab('equal');
      this.renderParticipantInputs(group.members.map(m => m.id), {});
    }

    this.openModal('modal-expense');
  },

  setSplitTypeTab(splitType) {
    document.getElementById('expense-form-splittype').value = splitType;
    document.querySelectorAll('.split-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.splitType === splitType);
    });
    this.updateSplitValidation();
  },

  renderParticipantInputs(selectedIds = [], existingSplits = {}) {
    const group = this.getActiveGroup();
    if (!group) return;

    const splitType = document.getElementById('expense-form-splittype').value;
    const container = document.getElementById('participants-inputs-list');
    container.innerHTML = '';

    group.members.forEach(m => {
      const isChecked = selectedIds.includes(m.id);
      const row = document.createElement('div');
      row.className = 'participant-input-row';

      let inputField = '';
      if (splitType === 'exact') {
        const val = existingSplits[m.id] !== undefined ? existingSplits[m.id] : '';
        inputField = `<input type="number" class="form-control participant-split-val" data-member-id="${m.id}" placeholder="0.00" step="0.01" value="${val}" ${!isChecked ? 'disabled' : ''}>`;
      } else if (splitType === 'percentage') {
        const val = existingSplits[m.id] !== undefined ? existingSplits[m.id] : '';
        inputField = `<input type="number" class="form-control participant-split-val" data-member-id="${m.id}" placeholder="%" step="0.1" value="${val}" ${!isChecked ? 'disabled' : ''}>`;
      } else if (splitType === 'shares') {
        const val = existingSplits[m.id] !== undefined ? existingSplits[m.id] : 1;
        inputField = `<input type="number" class="form-control participant-split-val" data-member-id="${m.id}" placeholder="Shares" step="1" min="1" value="${val}" ${!isChecked ? 'disabled' : ''}>`;
      }

      row.innerHTML = `
        <label class="participant-check-label">
          <input type="checkbox" class="participant-checkbox" value="${m.id}" ${isChecked ? 'checked' : ''}>
          <span>${m.avatar || '😎'} ${m.name}</span>
        </label>
        ${inputField}
      `;
      container.appendChild(row);
    });

    this.updateSplitValidation();
  },

  updateSplitValidation() {
    const amount = Number(document.getElementById('expense-form-amount').value) || 0;
    const splitType = document.getElementById('expense-form-splittype').value;

    const selectedParticipants = Array.from(document.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
    const rawInputs = {};
    document.querySelectorAll('.participant-split-val').forEach(inp => {
      rawInputs[inp.dataset.memberId] = inp.value;
    });

    const result = this.calculateSplitShares(amount, splitType, selectedParticipants, rawInputs);

    const banner = document.getElementById('split-validation-banner');
    const text = document.getElementById('split-validation-text');

    if (banner && text) {
      banner.className = `split-validation-banner ${result.isValid ? 'valid' : 'invalid'}`;
      text.textContent = result.message;
    }

    return result;
  },

  openExpenseDetailModal(expenseId) {
    const group = this.getActiveGroup();
    if (!group) return;

    const exp = group.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    const payer = group.members.find(m => m.id === exp.paidBy);
    const payerName = payer ? payer.name : 'Unknown';

    const catIcons = {
      Food: '🍔', Transport: '🚕', Hotel: '🏨', Party: '🎉',
      Shopping: '🛍️', Tickets: '🎟️', Drinks: '☕', Fuel: '⛽', Other: '📦'
    };

    document.getElementById('detail-expense-title').textContent = exp.title;
    document.getElementById('detail-category-icon').textContent = catIcons[exp.category] || '📦';
    document.getElementById('detail-expense-amount').textContent = this.formatCurrency(exp.amount);
    document.getElementById('detail-expense-meta').textContent = `Paid by ${payerName} on ${this.formatDate(exp.date)}`;
    document.getElementById('detail-split-type').textContent = `${exp.splitType.toUpperCase()} SPLIT`;
    document.getElementById('detail-notes').textContent = exp.notes || 'None';

    const splitsList = document.getElementById('detail-splits-list');
    splitsList.innerHTML = (exp.participants || []).map(pId => {
      const member = group.members.find(m => m.id === pId);
      const name = member ? member.name : 'Unknown';
      const avatar = member ? member.avatar : '😎';
      const shareAmt = exp.splits ? (exp.splits[pId] || 0) : 0;

      return `
        <div class="participant-input-row mb-1">
          <span>${avatar} ${name}</span>
          <strong>${this.formatCurrency(shareAmt)}</strong>
        </div>`;
    }).join('');

    const editBtn = document.getElementById('btn-edit-expense-from-detail');
    if (editBtn) {
      editBtn.onclick = () => {
        this.closeModal('modal-expense-detail');
        this.openExpenseModal(exp.id);
      };
    }

    this.openModal('modal-expense-detail');
  },

  openRecordPaymentModal() {
    const group = this.getActiveGroup();
    if (!group || !group.members || group.members.length < 2) {
      this.showToast('You need at least 2 members to record settlement payments.', 'warning');
      return;
    }

    const fromSelect = document.getElementById('payment-form-from');
    const toSelect = document.getElementById('payment-form-to');

    const options = group.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;

    if (group.members.length > 1) toSelect.selectedIndex = 1;

    document.getElementById('payment-form-amount').value = '';
    document.getElementById('payment-form-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment-form-note').value = '';

    this.openModal('modal-payment');
  },

  openConfirmModal(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    this.confirmCallback = onConfirm;
    this.openModal('modal-confirm');
  },

  // =========================================================================
  // 6. ACTION HANDLERS (CRUD)
  // =========================================================================

  saveGroupFromForm() {
    const id = document.getElementById('group-form-id').value;
    const name = document.getElementById('group-form-name').value.trim();
    const desc = document.getElementById('group-form-desc').value.trim();

    if (!name) {
      this.showToast('Group name is required!', 'warning');
      return;
    }

    if (id) {
      const group = this.data.groups.find(g => g.id === id);
      if (group) {
        group.name = name;
        group.description = desc;
        this.showToast('Group details updated.', 'success');
      }
    } else {
      const newGroup = {
        id: this.generateUniqueId('group'),
        name: name,
        description: desc,
        createdAt: new Date().toISOString().split('T')[0],
        members: [],
        expenses: [],
        payments: []
      };
      this.data.groups.push(newGroup);
      this.data.activeGroupId = newGroup.id;
      this.showToast('New group created successfully!', 'success');
    }

    this.saveData();
    this.renderActiveGroupDropdowns();
    this.closeModal('modal-group');
    this.renderCurrentView();
  },

  confirmDeleteGroup() {
    const group = this.getActiveGroup();
    if (!group) return;

    this.openConfirmModal(
      'Delete Trip Group',
      `Are you sure you want to permanently delete "${group.name}" and all associated expenses and members?`,
      () => {
        this.data.groups = this.data.groups.filter(g => g.id !== group.id);
        this.data.activeGroupId = this.data.groups.length > 0 ? this.data.groups[0].id : null;
        this.saveData();
        this.renderActiveGroupDropdowns();
        this.showToast('Group deleted.', 'info');
        this.renderCurrentView();
      }
    );
  },

  saveMemberFromForm() {
    const group = this.getActiveGroup();
    if (!group) return;

    const id = document.getElementById('member-form-id').value;
    const name = document.getElementById('member-form-name').value.trim();
    const avatar = document.getElementById('member-form-avatar').value;

    if (!name) {
      this.showToast('Member name is required!', 'warning');
      return;
    }

    const exists = group.members.find(m => m.name.toLowerCase() === name.toLowerCase() && m.id !== id);
    if (exists) {
      this.showToast(`Warning: A member with the name "${name}" already exists.`, 'warning');
    }

    if (id) {
      const member = group.members.find(m => m.id === id);
      if (member) {
        member.name = name;
        member.avatar = avatar;
        this.showToast('Member updated.', 'success');
      }
    } else {
      const newMember = {
        id: this.generateUniqueId('member'),
        name: name,
        avatar: avatar,
        createdAt: new Date().toISOString().split('T')[0]
      };
      group.members.push(newMember);
      this.showToast(`Added ${name} to group.`, 'success');
    }

    this.saveData();
    this.renderActiveGroupDropdowns();
    this.closeModal('modal-member');
    this.renderCurrentView();
  },

  confirmDeleteMember(memberId) {
    const group = this.getActiveGroup();
    if (!group) return;

    const member = group.members.find(m => m.id === memberId);
    if (!member) return;

    const hasExpenses = group.expenses.some(e => e.paidBy === memberId || (e.participants && e.participants.includes(memberId)));

    let msg = `Are you sure you want to remove "${member.name}"?`;
    if (hasExpenses) {
      msg = `⚠️ Warning: "${member.name}" has active expenses associated with them! Deleting them will affect split calculations. Proceed?`;
    }

    this.openConfirmModal('Remove Member', msg, () => {
      group.members = group.members.filter(m => m.id !== memberId);
      this.saveData();
      this.renderActiveGroupDropdowns();
      this.showToast(`Removed ${member.name}.`, 'info');
      this.renderCurrentView();
    });
  },

  saveExpenseFromForm() {
    const group = this.getActiveGroup();
    if (!group) return;

    const id = document.getElementById('expense-form-id').value;
    const title = document.getElementById('expense-form-title').value.trim();
    const amount = Number(document.getElementById('expense-form-amount').value) || 0;
    const category = document.getElementById('expense-form-category').value;
    const date = document.getElementById('expense-form-date').value;
    const paidBy = document.getElementById('expense-form-paidby').value;
    const splitType = document.getElementById('expense-form-splittype').value;
    const notes = document.getElementById('expense-form-notes').value.trim();

    if (!title || amount <= 0 || !paidBy) {
      this.showToast('Please fill all required fields correctly.', 'warning');
      return;
    }

    const selectedParticipants = Array.from(document.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value);
    if (selectedParticipants.length === 0) {
      this.showToast('At least one participant must be selected!', 'warning');
      return;
    }

    const splitValidation = this.updateSplitValidation();
    if (!splitValidation.isValid) {
      this.showToast(splitValidation.message, 'error');
      return;
    }

    if (id) {
      const exp = group.expenses.find(e => e.id === id);
      if (exp) {
        exp.title = title;
        exp.amount = amount;
        exp.category = category;
        exp.date = date;
        exp.paidBy = paidBy;
        exp.participants = selectedParticipants;
        exp.splitType = splitType;
        exp.splits = splitValidation.splits;
        exp.notes = notes;
        this.showToast('Expense updated successfully!', 'success');
      }
    } else {
      const newExpense = {
        id: this.generateUniqueId('expense'),
        title: title,
        amount: amount,
        category: category,
        date: date,
        paidBy: paidBy,
        participants: selectedParticipants,
        splitType: splitType,
        splits: splitValidation.splits,
        notes: notes,
        createdAt: Date.now()
      };
      group.expenses.push(newExpense);
      this.showToast('Expense added successfully!', 'success');
    }

    this.saveData();
    this.closeModal('modal-expense');
    this.renderCurrentView();
  },

  confirmDeleteExpense(expenseId) {
    const group = this.getActiveGroup();
    if (!group) return;

    const exp = group.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    this.openConfirmModal(
      'Delete Expense',
      `Are you sure you want to delete the expense "${exp.title}" (${this.formatCurrency(exp.amount)})?`,
      () => {
        group.expenses = group.expenses.filter(e => e.id !== expenseId);
        this.saveData();
        this.showToast('Expense deleted.', 'info');
        this.renderCurrentView();
      }
    );
  },

  quickCompleteSettlement(fromId, toId, amount) {
    const group = this.getActiveGroup();
    if (!group) return;

    const newPayment = {
      id: this.generateUniqueId('payment'),
      from: fromId,
      to: toId,
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      note: 'Quick Settlement',
      status: 'completed'
    };

    if (!group.payments) group.payments = [];
    group.payments.push(newPayment);
    this.saveData();

    this.showToast('Settlement payment recorded successfully!', 'success');
    this.renderCurrentView();
  },

  savePaymentFromForm() {
    const group = this.getActiveGroup();
    if (!group) return;

    const from = document.getElementById('payment-form-from').value;
    const to = document.getElementById('payment-form-to').value;
    const amount = Number(document.getElementById('payment-form-amount').value) || 0;
    const date = document.getElementById('payment-form-date').value;
    const note = document.getElementById('payment-form-note').value.trim();

    if (from === to) {
      this.showToast('Payer and recipient cannot be the same person!', 'warning');
      return;
    }

    if (amount <= 0) {
      this.showToast('Payment amount must be greater than zero.', 'warning');
      return;
    }

    const payment = {
      id: this.generateUniqueId('payment'),
      from: from,
      to: to,
      amount: amount,
      date: date,
      note: note,
      status: 'completed'
    };

    if (!group.payments) group.payments = [];
    group.payments.push(payment);
    this.saveData();

    this.closeModal('modal-payment');
    this.showToast('Payment recorded successfully!', 'success');
    this.renderCurrentView();
  },

  confirmDeletePayment(paymentId) {
    const group = this.getActiveGroup();
    if (!group) return;

    this.openConfirmModal(
      'Delete Recorded Payment',
      'Are you sure you want to delete this recorded payment? Balances will be recalculated.',
      () => {
        group.payments = group.payments.filter(p => p.id !== paymentId);
        this.saveData();
        this.showToast('Payment record removed.', 'info');
        this.renderCurrentView();
      }
    );
  },

  // =========================================================================
  // 7. IMPORT & EXPORT
  // =========================================================================

  exportGroupAsJSON() {
    const group = this.getActiveGroup();
    if (!group) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(group, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `${group.name.replace(/\s+/g, '_')}_TripSplit.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
    this.showToast('Exported group data as JSON file.', 'success');
  },

  exportExpensesAsCSV() {
    const group = this.getActiveGroup();
    if (!group || !group.expenses) return;

    const headers = ['Date', 'Expense Title', 'Category', 'Amount', 'Paid By', 'Participants Count', 'Split Type', 'Notes'];
    const rows = group.expenses.map(e => {
      const payer = (group.members || []).find(m => m.id === e.paidBy);
      return [
        `"${e.date}"`,
        `"${(e.title || '').replace(/"/g, '""')}"`,
        `"${e.category}"`,
        e.amount,
        `"${payer ? payer.name : 'Unknown'}"`,
        e.participants ? e.participants.length : 0,
        `"${e.splitType}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${group.name.replace(/\s+/g, '_')}_Expenses.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.showToast('Exported expenses report as CSV file.', 'success');
  },

  importGroupDataFromText(jsonText) {
    try {
      const imported = JSON.parse(jsonText);

      if (!imported.name || !Array.isArray(imported.members) || !Array.isArray(imported.expenses)) {
        throw new Error('JSON format is missing required fields (name, members, expenses).');
      }

      if (!imported.id) imported.id = this.generateUniqueId('group');

      const existingIndex = this.data.groups.findIndex(g => g.id === imported.id);
      if (existingIndex >= 0) {
        this.data.groups[existingIndex] = imported;
      } else {
        this.data.groups.push(imported);
      }

      this.data.activeGroupId = imported.id;
      this.saveData();
      this.renderActiveGroupDropdowns();
      this.closeModal('modal-import');
      this.showToast(`Imported trip group "${imported.name}" successfully!`, 'success');
      this.renderCurrentView();

    } catch (e) {
      console.error('Import failed', e);
      this.showToast(`Import error: ${e.message}`, 'error');
    }
  },

  // =========================================================================
  // 8. SAMPLE DEMO DATA
  // =========================================================================

  loadDemoData(showNotification = true) {
    const demoGroup = {
      id: "demo-goa-2026",
      name: "Goa Trip 2026",
      description: "Friends weekend party & beach trip to Goa",
      createdAt: "2026-08-15",
      members: [
        { id: "mem-sagar", name: "Sagar", avatar: "😎", createdAt: "2026-08-15" },
        { id: "mem-rahul", name: "Rahul", avatar: "🥳", createdAt: "2026-08-15" },
        { id: "mem-amit", name: "Amit", avatar: "🏄‍♂️", createdAt: "2026-08-15" },
        { id: "mem-jay", name: "Jay", avatar: "🏖️", createdAt: "2026-08-15" },
        { id: "mem-meet", name: "Meet", avatar: "🎒", createdAt: "2026-08-15" }
      ],
      expenses: [
        {
          id: "exp-001",
          title: "Seafood & Drinks Dinner",
          amount: 2500,
          category: "Food",
          date: "2026-08-15",
          paidBy: "mem-sagar",
          participants: ["mem-sagar", "mem-rahul", "mem-amit", "mem-jay", "mem-meet"],
          splitType: "equal",
          splits: {
            "mem-sagar": 500,
            "mem-rahul": 500,
            "mem-amit": 500,
            "mem-jay": 500,
            "mem-meet": 500
          },
          notes: "Dinner at Baga Beach Restaurant",
          createdAt: 1755250000000
        },
        {
          id: "exp-002",
          title: "Beach Resort Villa",
          amount: 6000,
          category: "Hotel",
          date: "2026-08-16",
          paidBy: "mem-rahul",
          participants: ["mem-sagar", "mem-rahul", "mem-amit", "mem-jay", "mem-meet"],
          splitType: "equal",
          splits: {
            "mem-sagar": 1200,
            "mem-rahul": 1200,
            "mem-amit": 1200,
            "mem-jay": 1200,
            "mem-meet": 1200
          },
          notes: "2 nights booking",
          createdAt: 1755336400000
        },
        {
          id: "exp-003",
          title: "Cab Transport to North Goa",
          amount: 1500,
          category: "Transport",
          date: "2026-08-16",
          paidBy: "mem-amit",
          participants: ["mem-sagar", "mem-rahul", "mem-amit", "mem-jay", "mem-meet"],
          splitType: "equal",
          splits: {
            "mem-sagar": 300,
            "mem-rahul": 300,
            "mem-amit": 300,
            "mem-jay": 300,
            "mem-meet": 300
          },
          notes: "Full day taxi rental",
          createdAt: 1755340000000
        }
      ],
      payments: []
    };

    if (!this.data.groups) this.data.groups = [];
    
    const idx = this.data.groups.findIndex(g => g.id === demoGroup.id);
    if (idx >= 0) {
      this.data.groups[idx] = demoGroup;
    } else {
      this.data.groups.unshift(demoGroup);
    }

    this.data.activeGroupId = demoGroup.id;
    this.saveData();
    this.renderActiveGroupDropdowns();

    if (showNotification) {
      this.showToast('Loaded demo data (Goa Trip 2026)!', 'success');
    }
    this.renderCurrentView();
  },

  resetAllData() {
    this.openConfirmModal(
      'Reset All Application Data',
      '⚠️ Are you sure you want to clear all trip groups and settings from LocalStorage? This action cannot be undone!',
      () => {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.SETTINGS_KEY);
        this.data = { activeGroupId: null, groups: [] };
        this.loadDemoData(false);
        this.showToast('All local storage data cleared.', 'info');
        this.renderCurrentView();
      }
    );
  },

  // =========================================================================
  // 9. EVENT LISTENERS
  // =========================================================================

  setupEventListeners() {
    const smartForm = document.getElementById('form-smart-expense');
    if (smartForm) {
      smartForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addSmartExpenseFromInput();
      });
    }

    const inlineMemForm = document.getElementById('form-inline-member');
    if (inlineMemForm) {
      inlineMemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveInlineMember();
      });
    }

    document.querySelectorAll('.sidebar-nav .nav-item, .mobile-nav .mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        if (view) this.navigateTo(view);
      });
    });

    const mobileFab = document.getElementById('mobile-fab-add-expense');
    if (mobileFab) {
      mobileFab.addEventListener('click', () => this.openExpenseModal());
    }

    ['sidebar-quick-expense', 'header-add-expense', 'btn-add-expense-main'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.openExpenseModal());
    });

    ['group-select', 'mobile-group-select'].forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        select.addEventListener('change', (e) => {
          this.data.activeGroupId = e.target.value;
          this.saveData();
          this.renderActiveGroupDropdowns();
          this.renderCurrentView();
        });
      }
    });

    const btnEditGroup = document.getElementById('btn-edit-group');
    if (btnEditGroup) {
      btnEditGroup.addEventListener('click', () => this.openGroupModal(this.data.activeGroupId));
    }

    const btnNewGroup = document.getElementById('btn-new-group');
    if (btnNewGroup) {
      btnNewGroup.addEventListener('click', () => this.openGroupModal());
    }

    const btnAddMember = document.getElementById('btn-open-add-member');
    if (btnAddMember) {
      btnAddMember.addEventListener('click', () => this.openMemberModal());
    }

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const nextTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(nextTheme);
      });
    }

    const searchInp = document.getElementById('expense-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderExpenses(this.getActiveGroup());
      });
    }

    const catFilter = document.getElementById('filter-category');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        this.filterCategory = e.target.value;
        this.renderExpenses(this.getActiveGroup());
      });
    }

    const memFilter = document.getElementById('filter-member');
    if (memFilter) {
      memFilter.addEventListener('change', (e) => {
        this.filterMember = e.target.value;
        this.renderExpenses(this.getActiveGroup());
      });
    }

    const clearFiltersBtn = document.getElementById('btn-clear-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => this.clearFilters());
    }

    document.querySelectorAll('.emoji-option').forEach(opt => {
      opt.addEventListener('click', () => this.selectEmoji(opt.dataset.emoji));
    });

    document.querySelectorAll('.split-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const splitType = tab.dataset.splitType;
        this.setSplitTypeTab(splitType);
        this.renderParticipantInputs(
          Array.from(document.querySelectorAll('.participant-checkbox:checked')).map(cb => cb.value)
        );
      });
    });

    const selectAllBtn = document.getElementById('btn-select-all-participants');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.participant-checkbox').forEach(cb => cb.checked = true);
        this.updateSplitValidation();
      });
    }

    const expAmountInp = document.getElementById('expense-form-amount');
    if (expAmountInp) {
      expAmountInp.addEventListener('input', () => this.updateSplitValidation());
    }

    document.getElementById('participants-inputs-list').addEventListener('change', (e) => {
      if (e.target.classList.contains('participant-checkbox')) {
        const rowInput = e.target.closest('.participant-input-row').querySelector('.participant-split-val');
        if (rowInput) rowInput.disabled = !e.target.checked;
      }
      this.updateSplitValidation();
    });

    document.getElementById('participants-inputs-list').addEventListener('input', (e) => {
      if (e.target.classList.contains('participant-split-val')) {
        this.updateSplitValidation();
      }
    });

    document.getElementById('form-group').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveGroupFromForm();
    });

    document.getElementById('form-member').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveMemberFromForm();
    });

    document.getElementById('form-expense').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveExpenseFromForm();
    });

    document.getElementById('form-payment').addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePaymentFromForm();
    });

    const btnOpenRecordPayment = document.getElementById('btn-open-record-payment');
    if (btnOpenRecordPayment) {
      btnOpenRecordPayment.addEventListener('click', () => this.openRecordPaymentModal());
    }

    const confirmBtn = document.getElementById('btn-confirm-action');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (typeof this.confirmCallback === 'function') {
          this.confirmCallback();
        }
        this.closeModal('modal-confirm');
      });
    }

    const themeSelect = document.getElementById('settings-theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => this.applyTheme(e.target.value));
    }

    const currSelect = document.getElementById('settings-currency-select');
    if (currSelect) {
      currSelect.addEventListener('change', (e) => {
        this.settings.currency = e.target.value;
        this.saveSettings();
        this.updateCurrencyUI();
        this.renderCurrentView();
      });
    }

    const btnLoadDemo = document.getElementById('btn-load-demo-data');
    if (btnLoadDemo) btnLoadDemo.addEventListener('click', () => this.loadDemoData(true));

    const btnExportJSON = document.getElementById('btn-export-json');
    if (btnExportJSON) btnExportJSON.addEventListener('click', () => this.exportGroupAsJSON());

    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) btnExportCSV.addEventListener('click', () => this.exportExpensesAsCSV());

    const btnOpenImport = document.getElementById('btn-open-import-modal');
    if (btnOpenImport) btnOpenImport.addEventListener('click', () => this.openModal('modal-import'));

    const btnResetAll = document.getElementById('btn-reset-all-data');
    if (btnResetAll) btnResetAll.addEventListener('click', () => this.resetAllData());

    document.getElementById('form-import').addEventListener('submit', (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('import-file-input');
      const textInput = document.getElementById('import-text-input').value.trim();

      if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (evt) => this.importGroupDataFromText(evt.target.result);
        reader.readAsText(fileInput.files[0]);
      } else if (textInput) {
        this.importGroupDataFromText(textInput);
      } else {
        this.showToast('Please select a JSON file or paste JSON content!', 'warning');
      }
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal(btn.dataset.closeModal));
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal(overlay.id);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => this.closeModal(m.id));
      }
    });
  }
};

// Launch Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
