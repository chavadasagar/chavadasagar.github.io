/**
 * Application Controller & UI State Manager
 * Zero-Server Client-Side File Converter & Utilities
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- App State ---
  const state = {
    currentMode: 'csv-to-json', // 'csv-to-json' | 'json-to-csv' | 'text-tools'
    theme: localStorage.getItem('fc_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
    outputData: null,
    rawOutputText: '',
    parsedTableData: null,
    currentTablePage: 1,
    tableRowsPerPage: 10,
    tableSearchQuery: '',
    tableSortColumn: null,
    tableSortAsc: true,
    history: JSON.parse(localStorage.getItem('fc_history') || '[]'),
    wrapLines: false,
    autoConvert: false
  };

  // --- DOM Elements ---
  const elements = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    historyDrawerBtn: document.getElementById('historyDrawerBtn'),
    historyDrawer: document.getElementById('historyDrawer'),
    historyCloseBtn: document.getElementById('historyCloseBtn'),
    historyList: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    
    // Mode Switcher Tabs
    toolTabs: document.querySelectorAll('.tool-tab-btn'),
    
    // Panels & Containers
    converterWorkbench: document.getElementById('converterWorkbench'),
    textToolsSection: document.getElementById('textToolsSection'),
    csvOptionsBar: document.getElementById('csvOptionsBar'),
    jsonOptionsBar: document.getElementById('jsonOptionsBar'),
    
    // Input Elements
    inputText: document.getElementById('inputText'),
    inputDropZone: document.getElementById('inputDropZone'),
    fileInput: document.getElementById('fileInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    clearInputBtn: document.getElementById('clearInputBtn'),
    pasteBtn: document.getElementById('pasteBtn'),
    sampleSelect: document.getElementById('sampleSelect'),
    inputStatsBadge: document.getElementById('inputStatsBadge'),
    inputTitle: document.getElementById('inputTitle'),
    
    // Output Elements
    outputTitle: document.getElementById('outputTitle'),
    outputStatsBadge: document.getElementById('outputStatsBadge'),
    outputCodeWrapper: document.getElementById('outputCodeWrapper'),
    codeLineNumbers: document.getElementById('codeLineNumbers'),
    codeContent: document.getElementById('codeContent'),
    emptyOutputState: document.getElementById('emptyOutputState'),
    tableViewWrapper: document.getElementById('tableViewWrapper'),
    tableHead: document.getElementById('tableHead'),
    tableBody: document.getElementById('tableBody'),
    tableSearchInput: document.getElementById('tableSearchInput'),
    tablePageInfo: document.getElementById('tablePageInfo'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    viewCodeTabBtn: document.getElementById('viewCodeTabBtn'),
    viewTableTabBtn: document.getElementById('viewTableTabBtn'),
    
    // Actions
    convertBtn: document.getElementById('convertBtn'),
    swapModeBtn: document.getElementById('swapModeBtn'),
    copyOutputBtn: document.getElementById('copyOutputBtn'),
    downloadOutputBtn: document.getElementById('downloadOutputBtn'),
    wrapLinesBtn: document.getElementById('wrapLinesBtn'),
    
    // Alert Banner
    alertBanner: document.getElementById('alertBanner'),
    alertMessage: document.getElementById('alertMessage'),
    alertCloseBtn: document.getElementById('alertCloseBtn'),
    
    // Options
    csvDelimiterSelect: document.getElementById('csvDelimiterSelect'),
    csvHeaderCheck: document.getElementById('csvHeaderCheck'),
    csvTypesCheck: document.getElementById('csvTypesCheck'),
    csvUnflattenCheck: document.getElementById('csvUnflattenCheck'),
    
    jsonDelimiterSelect: document.getElementById('jsonDelimiterSelect'),
    jsonFlattenCheck: document.getElementById('jsonFlattenCheck'),
    jsonQuoteSelect: document.getElementById('jsonQuoteSelect'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer'),
    
    // Text Utility Stats
    statChars: document.getElementById('statChars'),
    statWords: document.getElementById('statWords'),
    statLines: document.getElementById('statLines'),
    statBytes: document.getElementById('statBytes'),
    statReadingTime: document.getElementById('statReadingTime'),
    
    // Text Tools Buttons
    textUtilityButtons: document.querySelectorAll('[data-text-action]')
  };

  // --- Initialize Theme ---
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fc_theme', theme);
    if (elements.themeToggleBtn) {
      elements.themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      elements.themeToggleBtn.innerHTML = theme === 'dark' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
  }

  applyTheme(state.theme);

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      showToast(`Switched to ${state.theme} mode`, 'info');
    });
  }

  // --- Toast Notification ---
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'info') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // --- Alert Banner ---
  function showAlert(message, type = 'error') {
    elements.alertMessage.textContent = message;
    elements.alertBanner.className = `alert-banner ${type}`;
    elements.alertBanner.style.display = 'flex';
  }

  function hideAlert() {
    elements.alertBanner.style.display = 'none';
  }

  if (elements.alertCloseBtn) {
    elements.alertCloseBtn.addEventListener('click', hideAlert);
  }

  // --- Update Mode UI ---
  function setMode(mode) {
    state.currentMode = mode;
    hideAlert();

    // Update Tab UI
    elements.toolTabs.forEach(tab => {
      const tabMode = tab.getAttribute('data-mode');
      tab.classList.toggle('active', tabMode === mode);
      tab.setAttribute('aria-selected', tabMode === mode);
    });

    // Populate Sample Selector based on mode
    populateSampleOptions(mode);

    if (mode === 'csv-to-json') {
      elements.converterWorkbench.style.display = 'grid';
      elements.textToolsSection.style.display = 'none';
      elements.csvOptionsBar.style.display = 'grid';
      elements.jsonOptionsBar.style.display = 'none';
      elements.inputTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> CSV Source Data`;
      elements.outputTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17l6-6-6-6M12 19h8"></path></svg> Converted JSON`;
      elements.inputText.placeholder = `Paste CSV data here, e.g.:\nid,name,department,salary\n1,Alice,Engineering,95000\n2,Bob,Product,88000`;
      elements.viewTableTabBtn.style.display = 'inline-flex';
    } else if (mode === 'json-to-csv') {
      elements.converterWorkbench.style.display = 'grid';
      elements.textToolsSection.style.display = 'none';
      elements.csvOptionsBar.style.display = 'none';
      elements.jsonOptionsBar.style.display = 'grid';
      elements.inputTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17l6-6-6-6M12 19h8"></path></svg> JSON Source Data`;
      elements.outputTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Converted CSV`;
      elements.inputText.placeholder = `Paste JSON array or object here, e.g.:\n[\n  { "id": 1, "name": "Alice", "role": "Lead" },\n  { "id": 2, "name": "Bob", "role": "Design" }\n]`;
      elements.viewTableTabBtn.style.display = 'inline-flex';
    } else if (mode === 'text-tools') {
      elements.converterWorkbench.style.display = 'grid';
      elements.textToolsSection.style.display = 'flex';
      elements.csvOptionsBar.style.display = 'none';
      elements.jsonOptionsBar.style.display = 'none';
      elements.inputTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Input Text`;
      elements.outputTitle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Processed Text`;
      elements.inputText.placeholder = `Type or paste any text or code here to format, transform case, clean lines, or inspect stats...`;
      elements.viewTableTabBtn.style.display = 'none';
      switchOutputTab('code');
    }

    updateInputStats();
  }

  // --- Sample Selector Population ---
  function populateSampleOptions(mode) {
    elements.sampleSelect.innerHTML = `<option value="">-- Load Sample Data --</option>`;
    if (mode === 'csv-to-json') {
      elements.sampleSelect.innerHTML += `
        <option value="csv_ecommerce">E-Commerce Orders (Nested Dot Notation)</option>
        <option value="csv_employees">Employee Directory (Quotes & Commas)</option>
        <option value="csv_inventory">Semicolon Inventory</option>
      `;
    } else if (mode === 'json-to-csv') {
      elements.sampleSelect.innerHTML += `
        <option value="json_users">User Profiles (Nested Objects & Arrays)</option>
        <option value="json_analytics">Analytics Event Log</option>
      `;
    } else if (mode === 'text-tools') {
      elements.sampleSelect.innerHTML += `
        <option value="text_article">Sample Article</option>
        <option value="text_dirtyList">Dirty List with Whitespace & Duplicates</option>
      `;
    }
  }

  elements.sampleSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;

    if (val === 'csv_ecommerce') elements.inputText.value = SampleDatasets.csv.ecommerce.data;
    else if (val === 'csv_employees') elements.inputText.value = SampleDatasets.csv.employees.data;
    else if (val === 'csv_inventory') elements.inputText.value = SampleDatasets.csv.inventory.data;
    else if (val === 'json_users') elements.inputText.value = SampleDatasets.json.users.data;
    else if (val === 'json_analytics') elements.inputText.value = SampleDatasets.json.analytics.data;
    else if (val === 'text_article') elements.inputText.value = SampleDatasets.text.article.data;
    else if (val === 'text_dirtyList') elements.inputText.value = SampleDatasets.text.dirtyList.data;

    updateInputStats();
    showToast('Sample dataset loaded', 'info');
    convert();
  });

  // --- Tab Click Event ---
  elements.toolTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.getAttribute('data-mode');
      setMode(mode);
    });
  });

  // --- Swap Mode Button ---
  if (elements.swapModeBtn) {
    elements.swapModeBtn.addEventListener('click', () => {
      if (state.currentMode === 'csv-to-json') {
        const currentOutput = state.rawOutputText;
        setMode('json-to-csv');
        if (currentOutput) {
          elements.inputText.value = currentOutput;
        }
      } else if (state.currentMode === 'json-to-csv') {
        const currentOutput = state.rawOutputText;
        setMode('csv-to-json');
        if (currentOutput) {
          elements.inputText.value = currentOutput;
        }
      }
      updateInputStats();
      if (elements.inputText.value.trim()) {
        convert();
      }
    });
  }

  // --- Input Statistics & Line Counter ---
  function updateInputStats() {
    const text = elements.inputText.value;
    const stats = Converter.TextUtils.getStats(text);
    elements.inputStatsBadge.textContent = `${stats.lines} lines • ${(stats.bytes / 1024).toFixed(1)} KB`;

    // Update Text Utility Stats
    if (elements.statChars) elements.statChars.textContent = stats.characters.toLocaleString();
    if (elements.statWords) elements.statWords.textContent = stats.words.toLocaleString();
    if (elements.statLines) elements.statLines.textContent = stats.lines.toLocaleString();
    if (elements.statBytes) elements.statBytes.textContent = `${(stats.bytes / 1024).toFixed(2)} KB`;
    if (elements.statReadingTime) elements.statReadingTime.textContent = stats.readingTime;
  }

  elements.inputText.addEventListener('input', () => {
    updateInputStats();
    if (state.autoConvert) convert();
  });

  // --- Conversion Core Dispatcher ---
  function convert() {
    hideAlert();
    const input = elements.inputText.value;
    if (!input || !input.trim()) {
      renderEmptyOutput();
      return;
    }

    try {
      if (state.currentMode === 'csv-to-json') {
        const options = {
          delimiter: elements.csvDelimiterSelect.value,
          hasHeaders: elements.csvHeaderCheck.checked,
          parseTypes: elements.csvTypesCheck.checked,
          unflattenNested: elements.csvUnflattenCheck.checked
        };
        const result = Converter.csvToJson(input, options);
        
        state.rawOutputText = result.json;
        state.outputData = result.data;
        state.parsedTableData = result.data;

        renderCodeOutput(result.json, 'json');
        renderTableOutput(result.data);
        elements.outputStatsBadge.textContent = `${result.rowCount} records • ${(new TextEncoder().encode(result.json).length / 1024).toFixed(1)} KB`;

        if (result.warnings && result.warnings.length > 0) {
          showAlert(`Warning: ${result.warnings.join(' | ')}`, 'warning');
        }

        saveToHistory('CSV to JSON', `${result.rowCount} records`);
      } else if (state.currentMode === 'json-to-csv') {
        const options = {
          delimiter: elements.jsonDelimiterSelect.value,
          flatten: elements.jsonFlattenCheck.checked,
          quoteRule: elements.jsonQuoteSelect.value,
          includeHeaders: true
        };
        const result = Converter.jsonToCsv(input, options);

        state.rawOutputText = result.csv;
        state.outputData = result.data;
        state.parsedTableData = result.data;

        renderCodeOutput(result.csv, 'csv');
        renderTableOutput(result.data);
        elements.outputStatsBadge.textContent = `${result.rowCount} rows • ${(new TextEncoder().encode(result.csv).length / 1024).toFixed(1)} KB`;

        saveToHistory('JSON to CSV', `${result.rowCount} rows`);
      }
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'Conversion error occurred. Please check input syntax.', 'error');
    }
  }

  // --- Output Rendering (Code Block with Line Numbers & Highlighting) ---
  function renderCodeOutput(text, format = 'text') {
    elements.emptyOutputState.style.display = 'none';
    elements.outputCodeWrapper.style.display = 'flex';

    const lines = text.split('\n');
    const lineCount = lines.length;

    // Generate line numbers
    let lineNumbersHtml = '';
    for (let i = 1; i <= lineCount; i++) {
      lineNumbersHtml += `<div>${i}</div>`;
    }
    elements.codeLineNumbers.innerHTML = lineNumbersHtml;

    if (format === 'json') {
      elements.codeContent.innerHTML = Converter.highlightJson(text);
    } else {
      elements.codeContent.textContent = text;
    }
  }

  function renderEmptyOutput() {
    state.rawOutputText = '';
    state.outputData = null;
    state.parsedTableData = null;
    elements.emptyOutputState.style.display = 'flex';
    elements.outputCodeWrapper.style.display = 'none';
    elements.tableViewWrapper.style.display = 'none';
    elements.outputStatsBadge.textContent = '0 lines';
  }

  // --- Interactive Table Renderer ---
  function renderTableOutput(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return;
    }

    state.currentTablePage = 1;
    updateTableDisplay();
  }

  function updateTableDisplay() {
    if (!state.parsedTableData || state.parsedTableData.length === 0) return;

    let rows = [...state.parsedTableData];

    // Filter by search query
    if (state.tableSearchQuery) {
      const q = state.tableSearchQuery.toLowerCase();
      rows = rows.filter(row => {
        return Object.values(row).some(val => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Sort column
    if (state.tableSortColumn) {
      rows.sort((a, b) => {
        let valA = a[state.tableSortColumn] ?? '';
        let valB = b[state.tableSortColumn] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return state.tableSortAsc ? valA - valB : valB - valA;
        }
        return state.tableSortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    // Collect headers
    const headerSet = new Set();
    rows.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(k => headerSet.add(k));
      }
    });
    const headers = Array.from(headerSet);

    // Build Table Header
    elements.tableHead.innerHTML = `<tr>${headers.map(h => {
      const isSorted = state.tableSortColumn === h;
      const sortIcon = isSorted ? (state.tableSortAsc ? ' ▲' : ' ▼') : '';
      return `<th data-col="${h}">${escapeHtml(h)}${sortIcon}</th>`;
    }).join('')}</tr>`;

    // Pagination slice
    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / state.tableRowsPerPage) || 1;
    if (state.currentTablePage > totalPages) state.currentTablePage = totalPages;

    const startIdx = (state.currentTablePage - 1) * state.tableRowsPerPage;
    const pageRows = rows.slice(startIdx, startIdx + state.tableRowsPerPage);

    // Build Table Body
    if (pageRows.length === 0) {
      elements.tableBody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center; padding: 2rem; color: var(--text-muted);">No matching records found.</td></tr>`;
    } else {
      elements.tableBody.innerHTML = pageRows.map(row => {
        return `<tr>${headers.map(h => {
          let cellVal = row[h];
          if (cellVal === null || cellVal === undefined) cellVal = '';
          else if (typeof cellVal === 'object') cellVal = JSON.stringify(cellVal);
          return `<td title="${escapeHtml(String(cellVal))}">${escapeHtml(String(cellVal))}</td>`;
        }).join('')}</tr>`;
      }).join('');
    }

    // Table Pagination Controls
    elements.tablePageInfo.textContent = `Showing ${startIdx + 1}-${Math.min(startIdx + state.tableRowsPerPage, totalRows)} of ${totalRows} records (Page ${state.currentTablePage} of ${totalPages})`;
    elements.prevPageBtn.disabled = state.currentTablePage <= 1;
    elements.nextPageBtn.disabled = state.currentTablePage >= totalPages;

    // Header Sort Click
    elements.tableHead.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (state.tableSortColumn === col) {
          state.tableSortAsc = !state.tableSortAsc;
        } else {
          state.tableSortColumn = col;
          state.tableSortAsc = true;
        }
        updateTableDisplay();
      });
    });
  }

  // --- Helper: Escape HTML ---
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Output Tab Switching (Code vs Table) ---
  function switchOutputTab(tab) {
    if (tab === 'table') {
      elements.viewTableTabBtn.classList.add('active');
      elements.viewCodeTabBtn.classList.remove('active');
      elements.outputCodeWrapper.style.display = 'none';
      elements.tableViewWrapper.style.display = 'flex';
      updateTableDisplay();
    } else {
      elements.viewCodeTabBtn.classList.add('active');
      elements.viewTableTabBtn.classList.remove('active');
      elements.tableViewWrapper.style.display = 'none';
      if (state.rawOutputText) {
        elements.outputCodeWrapper.style.display = 'flex';
      }
    }
  }

  elements.viewCodeTabBtn.addEventListener('click', () => switchOutputTab('code'));
  elements.viewTableTabBtn.addEventListener('click', () => switchOutputTab('table'));

  // --- Table Search & Pagination Events ---
  elements.tableSearchInput.addEventListener('input', (e) => {
    state.tableSearchQuery = e.target.value.trim();
    state.currentTablePage = 1;
    updateTableDisplay();
  });

  elements.prevPageBtn.addEventListener('click', () => {
    if (state.currentTablePage > 1) {
      state.currentTablePage--;
      updateTableDisplay();
    }
  });

  elements.nextPageBtn.addEventListener('click', () => {
    state.currentTablePage++;
    updateTableDisplay();
  });

  // --- Text Utilities Dispatcher ---
  elements.textUtilityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-text-action');
      const input = elements.inputText.value;
      if (!input && !['sample'].includes(action)) {
        showToast('Please enter or paste some text first', 'info');
        return;
      }

      try {
        let result = '';
        switch (action) {
          case 'uppercase': result = Converter.TextUtils.toUpper(input); break;
          case 'lowercase': result = Converter.TextUtils.toLower(input); break;
          case 'titlecase': result = Converter.TextUtils.toTitleCase(input); break;
          case 'sentencecase': result = Converter.TextUtils.toSentenceCase(input); break;
          case 'camelcase': result = Converter.TextUtils.toCamelCase(input); break;
          case 'pascalcase': result = Converter.TextUtils.toPascalCase(input); break;
          case 'snakecase': result = Converter.TextUtils.toSnakeCase(input); break;
          case 'kebabcase': result = Converter.TextUtils.toKebabCase(input); break;
          case 'constantcase': result = Converter.TextUtils.toConstantCase(input); break;
          
          case 'trim': result = Converter.TextUtils.trimLines(input); break;
          case 'remove-empty': result = Converter.TextUtils.removeEmptyLines(input); break;
          case 'remove-duplicates': result = Converter.TextUtils.removeDuplicateLines(input); break;
          case 'sort-az': result = Converter.TextUtils.sortLinesAZ(input); break;
          case 'sort-za': result = Converter.TextUtils.sortLinesZA(input); break;
          case 'reverse-lines': result = Converter.TextUtils.reverseLines(input); break;
          case 'add-numbers': result = Converter.TextUtils.addLineNumbers(input); break;
          case 'strip-html': result = Converter.TextUtils.stripHtml(input); break;
          
          case 'url-encode': result = Converter.TextUtils.urlEncode(input); break;
          case 'url-decode': result = Converter.TextUtils.urlDecode(input); break;
          case 'base64-encode': result = Converter.TextUtils.base64Encode(input); break;
          case 'base64-decode': result = Converter.TextUtils.base64Decode(input); break;
          
          case 'json-format': result = Converter.TextUtils.formatJson(input, 2); break;
          case 'json-minify': result = Converter.TextUtils.minifyJson(input); break;
          case 'json-sort': result = Converter.TextUtils.sortJsonKeys(input); break;
          
          default: result = input;
        }

        state.rawOutputText = result;
        renderCodeOutput(result, 'text');
        elements.outputStatsBadge.textContent = `${result.split('\n').length} lines`;
        showToast(`Applied ${btn.textContent.trim()}`, 'success');
        saveToHistory(btn.textContent.trim(), `${result.length} characters`);
      } catch (err) {
        showAlert(err.message, 'error');
      }
    });
  });

  // --- Convert Button Click & Keyboard Shortcuts ---
  if (elements.convertBtn) {
    elements.convertBtn.addEventListener('click', convert);
  }

  document.addEventListener('keydown', (e) => {
    // Ctrl+Enter or Cmd+Enter to Convert
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      convert();
      showToast('Converted (Keyboard Shortcut)', 'info');
    }
    // Escape to close drawers/modals
    if (e.key === 'Escape') {
      closeHistoryDrawer();
    }
  });

  // --- Drag & Drop File Handling ---
  const dropZone = elements.inputDropZone;
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-active');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  });

  // --- File Input Upload ---
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  function handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      elements.inputText.value = content;
      updateInputStats();

      // Auto-detect format by extension
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'csv' || ext === 'tsv') {
        setMode('csv-to-json');
      } else if (ext === 'json') {
        setMode('json-to-csv');
      }

      showToast(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'success');
      convert();
    };
    reader.onerror = () => {
      showAlert('Failed to read file. Please try again.', 'error');
    };
    reader.readAsText(file);
  }

  // --- Clipboard Paste & Copy ---
  elements.pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        elements.inputText.value = text;
        updateInputStats();
        showToast('Pasted from clipboard', 'info');
        convert();
      }
    } catch (err) {
      elements.inputText.focus();
      showToast('Clipboard access denied. Please press Ctrl+V to paste.', 'info');
    }
  });

  elements.clearInputBtn.addEventListener('click', () => {
    elements.inputText.value = '';
    renderEmptyOutput();
    updateInputStats();
    hideAlert();
    showToast('Cleared input', 'info');
  });

  elements.copyOutputBtn.addEventListener('click', async () => {
    if (!state.rawOutputText) {
      showToast('No output to copy', 'info');
      return;
    }

    try {
      await navigator.clipboard.writeText(state.rawOutputText);
      showToast('Copied output to clipboard!', 'success');
      elements.copyOutputBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
      setTimeout(() => {
        elements.copyOutputBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
      }, 2000);
    } catch (err) {
      showToast('Failed to copy to clipboard', 'error');
    }
  });

  // --- Download Output ---
  elements.downloadOutputBtn.addEventListener('click', () => {
    if (!state.rawOutputText) {
      showToast('No output to download', 'info');
      return;
    }

    let ext = 'txt';
    let mimeType = 'text/plain';
    if (state.currentMode === 'csv-to-json') {
      ext = 'json';
      mimeType = 'application/json';
    } else if (state.currentMode === 'json-to-csv') {
      ext = 'csv';
      mimeType = 'text/csv';
    }

    const filename = `converted_${Date.now()}.${ext}`;
    const blob = new Blob([state.rawOutputText], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded ${filename}`, 'success');
  });

  // --- Word Wrap Toggle ---
  elements.wrapLinesBtn.addEventListener('click', () => {
    state.wrapLines = !state.wrapLines;
    elements.codeContent.classList.toggle('wrap-lines', state.wrapLines);
    elements.wrapLinesBtn.classList.toggle('active', state.wrapLines);
    showToast(`Word wrap ${state.wrapLines ? 'enabled' : 'disabled'}`, 'info');
  });

  // --- History System ---
  function saveToHistory(actionName, details) {
    const item = {
      id: Date.now(),
      action: actionName,
      details,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      input: elements.inputText.value,
      output: state.rawOutputText,
      mode: state.currentMode
    };

    // Prepend and limit to 15 items
    state.history.unshift(item);
    if (state.history.length > 15) state.history.pop();

    try {
      localStorage.setItem('fc_history', JSON.stringify(state.history));
    } catch (e) {
      console.warn('LocalStorage quota exceeded for history');
    }

    renderHistory();
  }

  function renderHistory() {
    if (!elements.historyList) return;
    if (state.history.length === 0) {
      elements.historyList.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted); font-size: 0.875rem;">No recent conversions recorded yet.</div>`;
      return;
    }

    elements.historyList.innerHTML = state.history.map(item => `
      <div class="history-item">
        <div class="history-meta">
          <span class="history-type-badge">${escapeHtml(item.action)}</span>
          <span>${item.date} ${item.timestamp}</span>
        </div>
        <div style="font-size: 0.8125rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(item.details)}</div>
        <div class="history-actions">
          <button class="btn btn-sm btn-secondary" onclick="window.restoreHistoryItem(${item.id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"></path><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg> Restore
          </button>
          <button class="btn btn-sm btn-secondary" onclick="window.copyHistoryItem(${item.id})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Output
          </button>
        </div>
      </div>
    `).join('');
  }

  window.restoreHistoryItem = (id) => {
    const item = state.history.find(h => h.id === id);
    if (item) {
      setMode(item.mode);
      elements.inputText.value = item.input;
      updateInputStats();
      convert();
      closeHistoryDrawer();
      showToast(`Restored conversion: ${item.action}`, 'success');
    }
  };

  window.copyHistoryItem = async (id) => {
    const item = state.history.find(h => h.id === id);
    if (item && item.output) {
      await navigator.clipboard.writeText(item.output);
      showToast('Copied history output to clipboard!', 'success');
    }
  };

  function openHistoryDrawer() {
    renderHistory();
    elements.historyDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeHistoryDrawer() {
    elements.historyDrawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  elements.historyDrawerBtn.addEventListener('click', openHistoryDrawer);
  elements.historyCloseBtn.addEventListener('click', closeHistoryDrawer);
  elements.historyDrawer.addEventListener('click', (e) => {
    if (e.target === elements.historyDrawer) closeHistoryDrawer();
  });

  elements.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    localStorage.removeItem('fc_history');
    renderHistory();
    showToast('History cleared', 'info');
  });

  // --- Options Change Auto-Convert Listeners ---
  [
    elements.csvDelimiterSelect,
    elements.csvHeaderCheck,
    elements.csvTypesCheck,
    elements.csvUnflattenCheck,
    elements.jsonDelimiterSelect,
    elements.jsonFlattenCheck,
    elements.jsonQuoteSelect
  ].forEach(inputEl => {
    if (inputEl) {
      inputEl.addEventListener('change', () => {
        if (elements.inputText.value.trim()) {
          convert();
        }
      });
    }
  });

  // --- Initial Setup & Load Sample Data on First Run ---
  setMode('csv-to-json');
  elements.inputText.value = SampleDatasets.csv.ecommerce.data;
  updateInputStats();
  convert();
});
