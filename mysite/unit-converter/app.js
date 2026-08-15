/**
 * OmniConvert - Modern Multi-Unit Converter
 * Pure Vanilla JavaScript Implementation
 */

(function () {
  'use strict';

  // --- UNIT DEFINITIONS & CONVERSION REGISTRY ---
  const UNIT_DATABASE = {
    length: {
      name: 'Length',
      icon: '📏',
      base: 'm',
      units: {
        nm: { name: 'Nanometer', symbol: 'nm', toBase: (v) => v * 1e-9, fromBase: (v) => v / 1e-9 },
        um: { name: 'Micrometer', symbol: 'µm', toBase: (v) => v * 1e-6, fromBase: (v) => v / 1e-6 },
        mm: { name: 'Millimeter', symbol: 'mm', toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
        cm: { name: 'Centimeter', symbol: 'cm', toBase: (v) => v * 0.01, fromBase: (v) => v / 0.01 },
        m: { name: 'Meter', symbol: 'm', toBase: (v) => v, fromBase: (v) => v },
        km: { name: 'Kilometer', symbol: 'km', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        in: { name: 'Inch', symbol: 'in', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
        ft: { name: 'Foot', symbol: 'ft', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
        yd: { name: 'Yard', symbol: 'yd', toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
        mi: { name: 'Mile', symbol: 'mi', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
        nmi: { name: 'Nautical Mile', symbol: 'nmi', toBase: (v) => v * 1852, fromBase: (v) => v / 1852 }
      },
      defaults: { from: 'm', to: 'ft' }
    },
    weight: {
      name: 'Weight / Mass',
      icon: '⚖️',
      base: 'kg',
      units: {
        mg: { name: 'Milligram', symbol: 'mg', toBase: (v) => v * 1e-6, fromBase: (v) => v / 1e-6 },
        g: { name: 'Gram', symbol: 'g', toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
        kg: { name: 'Kilogram', symbol: 'kg', toBase: (v) => v, fromBase: (v) => v },
        t: { name: 'Metric Ton', symbol: 't', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        oz: { name: 'Ounce', symbol: 'oz', toBase: (v) => v * 0.028349523125, fromBase: (v) => v / 0.028349523125 },
        lb: { name: 'Pound', symbol: 'lb', toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
        st: { name: 'Stone', symbol: 'st', toBase: (v) => v * 6.35029318, fromBase: (v) => v / 6.35029318 },
        uston: { name: 'Short Ton (US)', symbol: 'US ton', toBase: (v) => v * 907.18474, fromBase: (v) => v / 907.18474 }
      },
      defaults: { from: 'kg', to: 'lb' }
    },
    temperature: {
      name: 'Temperature',
      icon: '🌡️',
      base: 'C',
      units: {
        C: {
          name: 'Celsius',
          symbol: '°C',
          toBase: (v) => v,
          fromBase: (v) => v
        },
        F: {
          name: 'Fahrenheit',
          symbol: '°F',
          toBase: (v) => ((v - 32) * 5) / 9,
          fromBase: (v) => (v * 9) / 5 + 32
        },
        K: {
          name: 'Kelvin',
          symbol: 'K',
          toBase: (v) => v - 273.15,
          fromBase: (v) => v + 273.15
        },
        R: {
          name: 'Rankine',
          symbol: '°R',
          toBase: (v) => ((v - 491.67) * 5) / 9,
          fromBase: (v) => ((v + 273.15) * 9) / 5
        }
      },
      defaults: { from: 'C', to: 'F' }
    },
    currency: {
      name: 'Currency (Static Offline)',
      icon: '💱',
      base: 'USD',
      isOfflineNotice: true,
      units: {
        USD: { name: 'US Dollar', symbol: '$', toBase: (v) => v, fromBase: (v) => v },
        EUR: { name: 'Euro', symbol: '€', toBase: (v) => v / 0.92, fromBase: (v) => v * 0.92 },
        GBP: { name: 'British Pound', symbol: '£', toBase: (v) => v / 0.79, fromBase: (v) => v * 0.79 },
        JPY: { name: 'Japanese Yen', symbol: '¥', toBase: (v) => v / 155.4, fromBase: (v) => v * 155.4 },
        INR: { name: 'Indian Rupee', symbol: '₹', toBase: (v) => v / 83.5, fromBase: (v) => v * 83.5 },
        CAD: { name: 'Canadian Dollar', symbol: 'C$', toBase: (v) => v / 1.37, fromBase: (v) => v * 1.37 },
        AUD: { name: 'Australian Dollar', symbol: 'A$', toBase: (v) => v / 1.51, fromBase: (v) => v * 1.51 },
        CHF: { name: 'Swiss Franc', symbol: 'CHF', toBase: (v) => v / 0.91, fromBase: (v) => v * 0.91 },
        CNY: { name: 'Chinese Yuan', symbol: 'CN¥', toBase: (v) => v / 7.23, fromBase: (v) => v * 7.23 },
        SGD: { name: 'Singapore Dollar', symbol: 'S$', toBase: (v) => v / 1.35, fromBase: (v) => v * 1.35 },
        AED: { name: 'UAE Dirham', symbol: 'AED', toBase: (v) => v / 3.67, fromBase: (v) => v * 3.67 },
        BRL: { name: 'Brazilian Real', symbol: 'R$', toBase: (v) => v / 5.15, fromBase: (v) => v * 5.15 }
      },
      defaults: { from: 'USD', to: 'EUR' }
    },
    speed: {
      name: 'Speed',
      icon: '🚀',
      base: 'mps',
      units: {
        mps: { name: 'Meters per second', symbol: 'm/s', toBase: (v) => v, fromBase: (v) => v },
        kmh: { name: 'Kilometers per hour', symbol: 'km/h', toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
        mph: { name: 'Miles per hour', symbol: 'mph', toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
        knot: { name: 'Knot', symbol: 'kn', toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
        fps: { name: 'Feet per second', symbol: 'ft/s', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 }
      },
      defaults: { from: 'kmh', to: 'mph' }
    },
    volume: {
      name: 'Volume',
      icon: '🧪',
      base: 'l',
      units: {
        ml: { name: 'Milliliter', symbol: 'mL', toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
        l: { name: 'Liter', symbol: 'L', toBase: (v) => v, fromBase: (v) => v },
        m3: { name: 'Cubic Meter', symbol: 'm³', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        gal: { name: 'Gallon (US)', symbol: 'gal', toBase: (v) => v * 3.785411784, fromBase: (v) => v / 3.785411784 },
        floz: { name: 'Fluid Ounce (US)', symbol: 'fl oz', toBase: (v) => v * 0.0295735295625, fromBase: (v) => v / 0.0295735295625 },
        cup: { name: 'Cup (US)', symbol: 'cup', toBase: (v) => v * 0.2365882365, fromBase: (v) => v / 0.2365882365 },
        pt: { name: 'Pint (US)', symbol: 'pt', toBase: (v) => v * 0.473176473, fromBase: (v) => v / 0.473176473 }
      },
      defaults: { from: 'l', to: 'gal' }
    },
    storage: {
      name: 'Digital Storage',
      icon: '💾',
      base: 'b',
      units: {
        b: { name: 'Byte', symbol: 'B', toBase: (v) => v, fromBase: (v) => v },
        kb: { name: 'Kilobyte', symbol: 'KB', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
        mb: { name: 'Megabyte', symbol: 'MB', toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
        gb: { name: 'Gigabyte', symbol: 'GB', toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
        tb: { name: 'Terabyte', symbol: 'TB', toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 },
        pb: { name: 'Petabyte', symbol: 'PB', toBase: (v) => v * 1024 ** 5, fromBase: (v) => v / 1024 ** 5 }
      },
      defaults: { from: 'gb', to: 'mb' }
    },
    area: {
      name: 'Area',
      icon: '📐',
      base: 'sqm',
      units: {
        sqmm: { name: 'Square Millimeter', symbol: 'mm²', toBase: (v) => v * 1e-6, fromBase: (v) => v / 1e-6 },
        sqcm: { name: 'Square Centimeter', symbol: 'cm²', toBase: (v) => v * 1e-4, fromBase: (v) => v / 1e-4 },
        sqm: { name: 'Square Meter', symbol: 'm²', toBase: (v) => v, fromBase: (v) => v },
        ha: { name: 'Hectare', symbol: 'ha', toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
        sqkm: { name: 'Square Kilometer', symbol: 'km²', toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
        sqin: { name: 'Square Inch', symbol: 'sq in', toBase: (v) => v * 0.00064516, fromBase: (v) => v / 0.00064516 },
        sqft: { name: 'Square Foot', symbol: 'sq ft', toBase: (v) => v * 0.09290304, fromBase: (v) => v / 0.09290304 },
        acre: { name: 'Acre', symbol: 'ac', toBase: (v) => v * 4046.8564224, fromBase: (v) => v / 4046.8564224 },
        sqmi: { name: 'Square Mile', symbol: 'sq mi', toBase: (v) => v * 2589988.110336, fromBase: (v) => v / 2589988.110336 }
      },
      defaults: { from: 'sqm', to: 'sqft' }
    },
    time: {
      name: 'Time',
      icon: '⏱️',
      base: 's',
      units: {
        ms: { name: 'Millisecond', symbol: 'ms', toBase: (v) => v * 0.001, fromBase: (v) => v / 0.001 },
        s: { name: 'Second', symbol: 's', toBase: (v) => v, fromBase: (v) => v },
        min: { name: 'Minute', symbol: 'min', toBase: (v) => v * 60, fromBase: (v) => v / 60 },
        h: { name: 'Hour', symbol: 'h', toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
        d: { name: 'Day', symbol: 'd', toBase: (v) => v * 86400, fromBase: (v) => v / 86400 },
        wk: { name: 'Week', symbol: 'wk', toBase: (v) => v * 604800, fromBase: (v) => v / 604800 },
        mo: { name: 'Month (Avg 30.44d)', symbol: 'mo', toBase: (v) => v * 2629800, fromBase: (v) => v / 2629800 },
        yr: { name: 'Year (365.25d)', symbol: 'yr', toBase: (v) => v * 31557600, fromBase: (v) => v / 31557600 }
      },
      defaults: { from: 'h', to: 'min' }
    }
  };

  // --- STATE MANAGEMENT ---
  const STORAGE_KEYS = {
    CATEGORY: 'omniconvert_category',
    UNITS: 'omniconvert_units_map',
    HISTORY: 'omniconvert_history',
    THEME: 'omniconvert_theme',
    KEYPAD: 'omniconvert_keypad_visible'
  };

  let state = {
    category: 'length',
    fromUnit: 'm',
    toUnit: 'ft',
    fromValue: '1',
    toValue: '',
    activeInput: 'from', // 'from' | 'to'
    keypadOpen: true,
    theme: 'dark',
    history: []
  };

  let historySaveTimeout = null;

  // --- DOM ELEMENT CACHE ---
  const DOM = {
    categoryTabs: document.getElementById('category-tabs'),
    tabSlider: document.getElementById('tab-slider'),
    currencyNotice: document.getElementById('currency-notice'),
    fromUnitSelect: document.getElementById('from-unit'),
    toUnitSelect: document.getElementById('to-unit'),
    fromValueInput: document.getElementById('from-value'),
    toValueInput: document.getElementById('to-value'),
    fromClearBtn: document.getElementById('from-clear-btn'),
    toClearBtn: document.getElementById('to-clear-btn'),
    fromCopyBtn: document.getElementById('from-copy-btn'),
    toCopyBtn: document.getElementById('to-copy-btn'),
    fromFullName: document.getElementById('from-unit-fullname'),
    toFullName: document.getElementById('to-unit-fullname'),
    swapBtn: document.getElementById('swap-btn'),
    formulaText: document.getElementById('formula-text'),
    touchKeypadWrapper: document.getElementById('touch-keypad-wrapper'),
    touchKeypad: document.getElementById('touch-keypad'),
    keypadTargetHint: document.getElementById('keypad-target-hint'),
    switchTargetBtn: document.getElementById('switch-target-btn'),
    closeKeypadBtn: document.getElementById('close-keypad-btn'),
    toggleKeypadBtn: document.getElementById('toggle-keypad-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    historyList: document.getElementById('history-list'),
    historyCount: document.getElementById('history-count'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),
    presetChips: document.querySelectorAll('.preset-chip'),
    toastContainer: document.getElementById('toast-container')
  };

  // --- LOCAL STORAGE HELPERS ---
  function loadPersistedState() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        state.theme = savedTheme;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        state.theme = 'light';
      }

      const savedCategory = localStorage.getItem(STORAGE_KEYS.CATEGORY);
      if (savedCategory && UNIT_DATABASE[savedCategory]) {
        state.category = savedCategory;
      }

      const savedUnitsMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.UNITS) || '{}');
      const catConfig = UNIT_DATABASE[state.category];
      if (savedUnitsMap[state.category]) {
        state.fromUnit = savedUnitsMap[state.category].from || catConfig.defaults.from;
        state.toUnit = savedUnitsMap[state.category].to || catConfig.defaults.to;
      } else {
        state.fromUnit = catConfig.defaults.from;
        state.toUnit = catConfig.defaults.to;
      }

      const savedHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
      if (Array.isArray(savedHistory)) {
        state.history = savedHistory.slice(0, 10);
      }

      const savedKeypad = localStorage.getItem(STORAGE_KEYS.KEYPAD);
      if (savedKeypad !== null) {
        state.keypadOpen = savedKeypad === 'true';
      }
    } catch (e) {
      console.warn('LocalStorage error while reading state:', e);
    }
  }

  function saveCategoryAndUnits() {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORY, state.category);
      const unitsMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.UNITS) || '{}');
      unitsMap[state.category] = { from: state.fromUnit, to: state.toUnit };
      localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(unitsMap));
    } catch (e) {
      console.warn('LocalStorage error saving category/units:', e);
    }
  }

  function saveHistoryToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history.slice(0, 10)));
    } catch (e) {
      console.warn('LocalStorage error saving history:', e);
    }
  }

  // --- CORE CONVERSION ENGINE ---
  function convertValue(val, fromKey, toKey, categoryKey) {
    if (val === '' || isNaN(val)) return '';
    const num = parseFloat(val);
    if (!isFinite(num)) return '';

    const cat = UNIT_DATABASE[categoryKey];
    if (!cat || !cat.units[fromKey] || !cat.units[toKey]) return '';

    if (fromKey === toKey) return formatNumber(num);

    const fromDef = cat.units[fromKey];
    const toDef = cat.units[toKey];

    // Convert from -> base -> to
    const inBase = fromDef.toBase(num);
    const converted = toDef.fromBase(inBase);

    return formatNumber(converted);
  }

  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '';
    if (num === 0) return '0';

    const abs = Math.abs(num);

    // Exponential notation for extreme numbers
    if (abs > 0 && (abs < 1e-7 || abs >= 1e12)) {
      return num.toExponential(6).replace(/e\+?/, 'e');
    }

    // High-precision rounding up to 8 decimal places
    let rounded = parseFloat(num.toFixed(8)).toString();

    // Prevent floating point artifacts like 0.30000000000000004
    if (rounded.includes('.')) {
      rounded = rounded.replace(/\.?0+$/, '');
    }

    return rounded;
  }

  // --- BI-DIRECTIONAL REAL-TIME UPDATE ---
  function updateConversions(source) {
    state.activeInput = source;
    const cat = UNIT_DATABASE[state.category];

    if (source === 'from') {
      const rawVal = DOM.fromValueInput.value.trim();
      state.fromValue = rawVal;
      if (rawVal === '' || rawVal === '-' || rawVal === '.') {
        DOM.toValueInput.value = '';
        state.toValue = '';
      } else {
        const result = convertValue(rawVal, state.fromUnit, state.toUnit, state.category);
        DOM.toValueInput.value = result;
        state.toValue = result;
      }
    } else {
      const rawVal = DOM.toValueInput.value.trim();
      state.toValue = rawVal;
      if (rawVal === '' || rawVal === '-' || rawVal === '.') {
        DOM.fromValueInput.value = '';
        state.fromValue = '';
      } else {
        const result = convertValue(rawVal, state.toUnit, state.fromUnit, state.category);
        DOM.fromValueInput.value = result;
        state.fromValue = result;
      }
    }

    updateFormula();
    updateTargetHint();
    scheduleHistorySave();
  }

  function updateFormula() {
    const cat = UNIT_DATABASE[state.category];
    const fromDef = cat.units[state.fromUnit];
    const toDef = cat.units[state.toUnit];

    DOM.fromFullName.textContent = `${fromDef.name} (${fromDef.symbol})`;
    DOM.toFullName.textContent = `${toDef.name} (${toDef.symbol})`;

    if (state.category === 'temperature') {
      if (state.fromUnit === state.toUnit) {
        DOM.formulaText.textContent = `1 ${fromDef.symbol} = 1 ${toDef.symbol}`;
      } else {
        DOM.formulaText.textContent = `Direct °C/°F/K formula conversion`;
      }
    } else {
      const oneConverted = convertValue('1', state.fromUnit, state.toUnit, state.category);
      DOM.formulaText.textContent = `1 ${fromDef.symbol} = ${oneConverted} ${toDef.symbol}`;
    }
  }

  function updateTargetHint() {
    DOM.keypadTargetHint.innerHTML = `Targeting: <strong>${state.activeInput === 'from' ? 'From' : 'To'}</strong>`;
  }

  // --- UI INITIALIZATION & POPULATION ---
  function populateUnitDropdowns() {
    const cat = UNIT_DATABASE[state.category];
    DOM.fromUnitSelect.innerHTML = '';
    DOM.toUnitSelect.innerHTML = '';

    Object.keys(cat.units).forEach((uKey) => {
      const u = cat.units[uKey];
      const optFrom = document.createElement('option');
      optFrom.value = uKey;
      optFrom.textContent = `${u.name} (${u.symbol})`;
      if (uKey === state.fromUnit) optFrom.selected = true;
      DOM.fromUnitSelect.appendChild(optFrom);

      const optTo = document.createElement('option');
      optTo.value = uKey;
      optTo.textContent = `${u.name} (${u.symbol})`;
      if (uKey === state.toUnit) optTo.selected = true;
      DOM.toUnitSelect.appendChild(optTo);
    });

    if (cat.isOfflineNotice) {
      DOM.currencyNotice.classList.remove('hidden');
    } else {
      DOM.currencyNotice.classList.add('hidden');
    }
  }

  function updateTabSlider() {
    const activeTab = document.querySelector(`.category-tab[data-category="${state.category}"]`);
    if (!activeTab || !DOM.tabSlider) return;

    DOM.tabSlider.style.width = `${activeTab.offsetWidth}px`;
    DOM.tabSlider.style.transform = `translateX(${activeTab.offsetLeft}px)`;

    // Scroll active tab into viewport if overflowed on mobile
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function switchCategory(newCategory) {
    if (!UNIT_DATABASE[newCategory]) return;
    state.category = newCategory;

    // Retrieve last used units for category or default
    const savedUnitsMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.UNITS) || '{}');
    const catConfig = UNIT_DATABASE[newCategory];

    if (savedUnitsMap[newCategory]) {
      state.fromUnit = savedUnitsMap[newCategory].from || catConfig.defaults.from;
      state.toUnit = savedUnitsMap[newCategory].to || catConfig.defaults.to;
    } else {
      state.fromUnit = catConfig.defaults.from;
      state.toUnit = catConfig.defaults.to;
    }

    // Update active class on tabs
    document.querySelectorAll('.category-tab').forEach((tab) => {
      const isCurrent = tab.dataset.category === newCategory;
      tab.classList.toggle('active', isCurrent);
      tab.setAttribute('aria-selected', isCurrent);
    });

    populateUnitDropdowns();
    updateTabSlider();
    saveCategoryAndUnits();

    // Default seed value if empty
    if (!state.fromValue || isNaN(state.fromValue)) {
      DOM.fromValueInput.value = '1';
      state.fromValue = '1';
    }
    updateConversions('from');
  }

  // --- UNIT SWAP ACTION ---
  function swapUnits() {
    const tempUnit = state.fromUnit;
    state.fromUnit = state.toUnit;
    state.toUnit = tempUnit;

    // Add spin animation class
    DOM.swapBtn.classList.remove('spinning');
    void DOM.swapBtn.offsetWidth; // Trigger reflow
    DOM.swapBtn.classList.add('spinning');

    DOM.fromUnitSelect.value = state.fromUnit;
    DOM.toUnitSelect.value = state.toUnit;

    saveCategoryAndUnits();
    updateConversions('from');
    showToast('Units swapped!');
  }

  // --- TOUCH KEYPAD LOGIC ---
  function handleKeypadPress(key) {
    const activeTarget = state.activeInput === 'from' ? DOM.fromValueInput : DOM.toValueInput;
    let current = activeTarget.value;

    if (key >= '0' && key <= '9') {
      if (current === '0') {
        current = key;
      } else {
        current += key;
      }
    } else if (key === '00') {
      if (current !== '' && current !== '0') {
        current += '00';
      }
    } else if (key === '.') {
      if (!current.includes('.')) {
        current = current === '' ? '0.' : current + '.';
      }
    } else if (key === 'backspace') {
      current = current.slice(0, -1);
    } else if (key === 'ac') {
      current = '';
    } else if (key === 'sign') {
      if (current.startsWith('-')) {
        current = current.substring(1);
      } else if (current !== '' && current !== '0') {
        current = '-' + current;
      }
    } else if (key === 'swap') {
      swapUnits();
      return;
    }

    activeTarget.value = current;
    updateConversions(state.activeInput);
    activeTarget.focus();
  }

  // --- PRESET QUICK MODIFIERS ---
  function applyPresetModifier(action, valStr) {
    const activeTarget = state.activeInput === 'from' ? DOM.fromValueInput : DOM.toValueInput;
    let num = parseFloat(activeTarget.value) || 0;
    const modifierVal = parseFloat(valStr);

    if (action === 'set') {
      num = modifierVal;
    } else if (action === 'add') {
      num += modifierVal;
    } else if (action === 'multiply') {
      num *= modifierVal;
    } else if (action === 'divide') {
      num /= modifierVal;
    }

    activeTarget.value = formatNumber(num);
    updateConversions(state.activeInput);
    activeTarget.focus();
  }

  // --- HISTORY MANAGEMENT ---
  function scheduleHistorySave() {
    if (historySaveTimeout) clearTimeout(historySaveTimeout);
    historySaveTimeout = setTimeout(recordHistory, 1200);
  }

  function recordHistory() {
    const fromVal = DOM.fromValueInput.value.trim();
    const toVal = DOM.toValueInput.value.trim();

    if (!fromVal || !toVal || isNaN(fromVal) || isNaN(toVal)) return;

    const cat = UNIT_DATABASE[state.category];
    const fromSym = cat.units[state.fromUnit]?.symbol || state.fromUnit;
    const toSym = cat.units[state.toUnit]?.symbol || state.toUnit;

    const newEntry = {
      id: Date.now().toString(),
      category: state.category,
      categoryName: cat.name,
      icon: cat.icon,
      fromVal: fromVal,
      fromUnit: state.fromUnit,
      fromSym: fromSym,
      toVal: toVal,
      toUnit: state.toUnit,
      toSym: toSym,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Prevent duplicate consecutive entries
    if (
      state.history.length > 0 &&
      state.history[0].category === newEntry.category &&
      state.history[0].fromVal === newEntry.fromVal &&
      state.history[0].fromUnit === newEntry.fromUnit &&
      state.history[0].toUnit === newEntry.toUnit
    ) {
      return;
    }

    state.history.unshift(newEntry);
    if (state.history.length > 10) {
      state.history.pop();
    }

    saveHistoryToStorage();
    renderHistory();
  }

  function renderHistory() {
    DOM.historyList.innerHTML = '';
    DOM.historyCount.textContent = state.history.length.toString();

    if (state.history.length === 0) {
      DOM.historyList.innerHTML = `
        <div class="history-empty">
          <span class="empty-icon">📜</span>
          <p>No recent conversions yet. Start typing above!</p>
        </div>
      `;
      return;
    }

    state.history.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'history-item';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Reuse conversion ${item.fromVal} ${item.fromSym} to ${item.toVal} ${item.toSym}`);

      card.innerHTML = `
        <div class="history-item-left">
          <span class="history-cat-tag">${item.icon}</span>
          <div class="history-text">
            <span class="history-conversion">
              <strong>${item.fromVal}</strong> ${item.fromSym}
              <span class="arrow">➔</span>
              <strong>${item.toVal}</strong> ${item.toSym}
            </span>
            <span class="history-time">${item.categoryName} • ${item.time}</span>
          </div>
        </div>
        <button type="button" class="history-item-delete" title="Remove conversion" aria-label="Delete entry">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      // Tap to reuse conversion
      card.addEventListener('click', (e) => {
        if (e.target.closest('.history-item-delete')) {
          e.stopPropagation();
          deleteHistoryItem(item.id);
          return;
        }
        reuseHistoryItem(item);
      });

      // Keyboard enter support
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          reuseHistoryItem(item);
        }
      });

      DOM.historyList.appendChild(card);
    });
  }

  function reuseHistoryItem(item) {
    if (!UNIT_DATABASE[item.category]) return;

    state.category = item.category;
    state.fromUnit = item.fromUnit;
    state.toUnit = item.toUnit;

    document.querySelectorAll('.category-tab').forEach((tab) => {
      const isCurrent = tab.dataset.category === item.category;
      tab.classList.toggle('active', isCurrent);
      tab.setAttribute('aria-selected', isCurrent);
    });

    populateUnitDropdowns();
    updateTabSlider();

    DOM.fromValueInput.value = item.fromVal;
    state.fromValue = item.fromVal;

    updateConversions('from');
    showToast(`Loaded ${item.fromVal} ${item.fromSym} → ${item.toSym}`);

    // Smooth scroll back to input on mobile
    DOM.fromValueInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    DOM.fromValueInput.focus();
  }

  function deleteHistoryItem(id) {
    state.history = state.history.filter((h) => h.id !== id);
    saveHistoryToStorage();
    renderHistory();
    showToast('Entry removed');
  }

  function clearAllHistory() {
    if (state.history.length === 0) return;
    state.history = [];
    saveHistoryToStorage();
    renderHistory();
    showToast('History cleared');
  }

  // --- CLIPBOARD & TOAST ---
  function copyToClipboard(text, label) {
    if (!text || text === '') {
      showToast('Nothing to copy!');
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast(`Copied ${label}: ${text}`);
      })
      .catch(() => {
        // Fallback for older browsers
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast(`Copied ${label}: ${text}`);
      });
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2200);
  }

  // --- THEME & KEYPAD TOGGLES ---
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  function toggleTheme() {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme} mode`);
  }

  function toggleKeypad(forcedState) {
    state.keypadOpen = typeof forcedState === 'boolean' ? forcedState : !state.keypadOpen;
    DOM.touchKeypadWrapper.classList.toggle('collapsed', !state.keypadOpen);
    localStorage.setItem(STORAGE_KEYS.KEYPAD, state.keypadOpen.toString());
  }

  // --- EVENT LISTENERS BINDING ---
  function bindEvents() {
    // 1. Category Switch Tabs
    DOM.categoryTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.category-tab');
      if (!tab) return;
      const cat = tab.dataset.category;
      if (cat && cat !== state.category) {
        switchCategory(cat);
      }
    });

    // 2. Unit Select Change
    DOM.fromUnitSelect.addEventListener('change', (e) => {
      state.fromUnit = e.target.value;
      saveCategoryAndUnits();
      updateConversions('from');
    });

    DOM.toUnitSelect.addEventListener('change', (e) => {
      state.toUnit = e.target.value;
      saveCategoryAndUnits();
      updateConversions('from');
    });

    // 3. Inputs Real-Time Keystroke Handling
    DOM.fromValueInput.addEventListener('input', () => updateConversions('from'));
    DOM.toValueInput.addEventListener('input', () => updateConversions('to'));

    DOM.fromValueInput.addEventListener('focus', () => {
      state.activeInput = 'from';
      updateTargetHint();
    });

    DOM.toValueInput.addEventListener('focus', () => {
      state.activeInput = 'to';
      updateTargetHint();
    });

    // 4. Clear & Copy Buttons
    DOM.fromClearBtn.addEventListener('click', () => {
      DOM.fromValueInput.value = '';
      updateConversions('from');
      DOM.fromValueInput.focus();
    });

    DOM.toClearBtn.addEventListener('click', () => {
      DOM.toValueInput.value = '';
      updateConversions('to');
      DOM.toValueInput.focus();
    });

    DOM.fromCopyBtn.addEventListener('click', () => {
      copyToClipboard(DOM.fromValueInput.value, 'Source value');
    });

    DOM.toCopyBtn.addEventListener('click', () => {
      copyToClipboard(DOM.toValueInput.value, 'Converted value');
    });

    // 5. Unit Swap Button
    DOM.swapBtn.addEventListener('click', swapUnits);

    // 6. Touch Keypad Buttons
    DOM.touchKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.num-btn');
      if (!btn) return;
      const key = btn.dataset.key;
      handleKeypadPress(key);
    });

    DOM.switchTargetBtn.addEventListener('click', () => {
      state.activeInput = state.activeInput === 'from' ? 'to' : 'from';
      updateTargetHint();
      const targetInput = state.activeInput === 'from' ? DOM.fromValueInput : DOM.toValueInput;
      targetInput.focus();
    });

    DOM.closeKeypadBtn.addEventListener('click', () => toggleKeypad(false));
    DOM.toggleKeypadBtn.addEventListener('click', () => toggleKeypad());

    // 7. Preset Modifier Chips
    DOM.presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const action = chip.dataset.action;
        const val = chip.dataset.val;
        applyPresetModifier(action, val);
      });
    });

    // 8. History Actions
    DOM.clearHistoryBtn.addEventListener('click', clearAllHistory);

    // 9. Theme Toggle
    DOM.themeToggleBtn.addEventListener('click', toggleTheme);

    // 10. Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      const isInputFocused =
        document.activeElement === DOM.fromValueInput || document.activeElement === DOM.toValueInput;

      if (e.key === 'Escape') {
        if (state.activeInput === 'from') {
          DOM.fromValueInput.value = '';
          updateConversions('from');
        } else {
          DOM.toValueInput.value = '';
          updateConversions('to');
        }
      } else if (!isInputFocused) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          swapUnits();
        } else if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          toggleTheme();
        }
      }
    });

    // 11. Window Resize (Update Tab Slider Indicator Position)
    window.addEventListener('resize', () => {
      updateTabSlider();
    });
  }

  // --- APP BOOTSTRAP ---
  function init() {
    loadPersistedState();
    applyTheme(state.theme);
    toggleKeypad(state.keypadOpen);

    // Ensure active category tab is highlighted
    document.querySelectorAll('.category-tab').forEach((tab) => {
      const isCurrent = tab.dataset.category === state.category;
      tab.classList.toggle('active', isCurrent);
      tab.setAttribute('aria-selected', isCurrent);
    });

    populateUnitDropdowns();
    renderHistory();
    bindEvents();

    // Trigger initial conversion
    DOM.fromValueInput.value = state.fromValue;
    updateConversions('from');

    // Slight delay to calculate tab slider dimensions accurately
    setTimeout(updateTabSlider, 100);
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
