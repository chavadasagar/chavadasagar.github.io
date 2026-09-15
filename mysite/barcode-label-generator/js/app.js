/**
 * Main Application Controller for Barcode & Label Generator
 */

(function () {
  'use strict';

  // State
  let currentPreset = LabelPresets[0];
  let currentZoom = 1.4; // Zoom multiplier for viewport
  let batchItems = [];
  let currentTemplateId = 'standard-retail';

  // DOM Elements
  const els = {
    // Theme
    btnToggleTheme: document.getElementById('btn-toggle-theme'),
    themeIconSun: document.getElementById('theme-icon-sun'),
    themeIconMoon: document.getElementById('theme-icon-moon'),

    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabSingle: document.getElementById('tab-content-single'),
    tabBatch: document.getElementById('tab-content-batch'),
    tabTemplates: document.getElementById('tab-content-templates'),
    tabHistory: document.getElementById('tab-content-history'),

    // Form inputs
    presetSelect: document.getElementById('preset-select'),
    customSizeRow: document.getElementById('custom-size-row'),
    customWidth: document.getElementById('custom-width'),
    customHeight: document.getElementById('custom-height'),
    productName: document.getElementById('product-name'),
    barcodeFormat: document.getElementById('barcode-format'),
    barcodeValue: document.getElementById('barcode-value'),
    btnRandomSku: document.getElementById('btn-random-sku'),
    currencySymbol: document.getElementById('currency-symbol'),
    productPrice: document.getElementById('product-price'),
    productMrp: document.getElementById('product-mrp'),
    storeName: document.getElementById('store-name'),
    extraText: document.getElementById('extra-text'),
    printQuantity: document.getElementById('print-quantity'),

    // Advanced toggles
    toggleShowStore: document.getElementById('toggle-show-store'),
    toggleShowTitle: document.getElementById('toggle-show-title'),
    toggleShowPrice: document.getElementById('toggle-show-price'),
    toggleShowBarcodeText: document.getElementById('toggle-show-barcode-text'),
    toggleShowExtra: document.getElementById('toggle-show-extra'),
    borderStyleSelect: document.getElementById('border-style-select'),
    barcodeHeightRange: document.getElementById('barcode-height-range'),

    // Accordion
    advAccordion: document.getElementById('adv-accordion'),
    advAccordionToggle: document.getElementById('adv-accordion-toggle'),

    // Preview
    liveLabelCard: document.getElementById('live-label-card'),
    labelViewportWrapper: document.getElementById('label-viewport-wrapper'),
    previewDimensionBadge: document.getElementById('preview-dimension-badge'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),
    zoomLevelText: document.getElementById('zoom-level-text'),
    btnDownloadSvg: document.getElementById('btn-download-svg'),
    btnDownloadPng: document.getElementById('btn-download-png'),

    // Single Print
    btnSinglePrint: document.getElementById('btn-single-print'),

    // Batch Tab
    batchRawText: document.getElementById('batch-raw-text'),
    btnProcessBatchText: document.getElementById('btn-process-batch-text'),
    batchCsvFile: document.getElementById('batch-csv-file'),
    btnClearBatchTable: document.getElementById('btn-clear-batch-table'),
    btnLoadSampleBatch: document.getElementById('btn-load-sample-batch'),
    btnOpenSequenceModal: document.getElementById('btn-open-sequence-modal'),
    batchStatSkus: document.getElementById('batch-stat-skus'),
    batchStatTotalLabels: document.getElementById('batch-stat-total-labels'),
    batchStatPreset: document.getElementById('batch-stat-preset'),
    batchItemsTbody: document.getElementById('batch-items-tbody'),
    batchPreviewGrid: document.getElementById('batch-preview-grid'),
    btnBatchPrint: document.getElementById('btn-batch-print'),

    // Templates Tab
    builtinTemplatesGrid: document.getElementById('builtin-templates-grid'),
    customTemplatesGrid: document.getElementById('custom-templates-grid'),
    btnSaveAsTemplate: document.getElementById('btn-save-as-template'),
    btnSaveCurrentAsCustom: document.getElementById('btn-save-current-as-custom'),

    // History Tab
    recentBatchesList: document.getElementById('recent-batches-list'),
    btnExportBackup: document.getElementById('btn-export-backup'),
    btnImportBackupFile: document.getElementById('btn-import-backup-file'),

    // Mobile Bottom Bar
    mobileSummaryText: document.getElementById('mobile-summary-text'),
    btnMobilePreviewToggle: document.getElementById('btn-mobile-preview-toggle'),
    btnMobilePrintAction: document.getElementById('btn-mobile-print-action'),

    // Modals
    modalSequence: document.getElementById('modal-sequence'),
    btnSubmitSequence: document.getElementById('btn-submit-sequence'),
    modalSaveTemplate: document.getElementById('modal-save-template'),
    customTemplateName: document.getElementById('custom-template-name'),
    customTemplateDesc: document.getElementById('custom-template-desc'),
    btnConfirmSaveTemplate: document.getElementById('btn-confirm-save-template'),
    modalPrintGuide: document.getElementById('modal-print-guide'),
    btnPrintGuide: document.getElementById('btn-print-guide'),

    // Print Container & Styles
    printStage: document.getElementById('print-stage'),
    dynamicPagePrintStyle: document.getElementById('dynamic-page-print-style'),
    toastContainer: document.getElementById('toast-container')
  };

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    initTheme();
    populatePresetsDropdown();
    renderTemplatesList();
    renderRecentBatches();
    bindEvents();
    loadPersistedFormState();
    updateLivePreview();
    updateBatchStats();
  }

  // =========================================================================
  // THEME MANAGEMENT
  // =========================================================================
  function initTheme() {
    const settings = StorageManager.getSettings();
    const currentTheme = settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcons(currentTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    updateThemeIcons(next);
    const settings = StorageManager.getSettings();
    settings.theme = next;
    StorageManager.saveSettings(settings);
    showToast(`Switched to ${next} theme`);
  }

  function updateThemeIcons(theme) {
    if (theme === 'light') {
      els.themeIconSun.classList.add('hidden');
      els.themeIconMoon.classList.remove('hidden');
    } else {
      els.themeIconSun.classList.remove('hidden');
      els.themeIconMoon.classList.add('hidden');
    }
  }

  // =========================================================================
  // PRESET & TEMPLATE INITIALIZATION
  // =========================================================================
  function populatePresetsDropdown() {
    els.presetSelect.innerHTML = '';
    LabelPresets.forEach(preset => {
      const opt = document.createElement('option');
      opt.value = preset.id;
      opt.textContent = `${preset.name} - ${preset.category}`;
      els.presetSelect.appendChild(opt);
    });
    els.presetSelect.value = currentPreset.id;
  }

  function renderTemplatesList() {
    // Builtin
    els.builtinTemplatesGrid.innerHTML = '';
    BuiltinTemplates.forEach(t => {
      const card = createTemplateCard(t, false);
      els.builtinTemplatesGrid.appendChild(card);
    });

    // Custom
    const custom = StorageManager.getCustomTemplates();
    els.customTemplatesGrid.innerHTML = '';
    if (custom.length === 0) {
      els.customTemplatesGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">No custom templates saved yet. Click "Save Preset" to create your own!</div>`;
    } else {
      custom.forEach(t => {
        const card = createTemplateCard(t, true);
        els.customTemplatesGrid.appendChild(card);
      });
    }
  }

  function createTemplateCard(t, isCustom) {
    const div = document.createElement('div');
    div.className = `template-card ${currentTemplateId === t.id ? 'active' : ''}`;
    div.innerHTML = `
      <div>
        <span class="template-badge">${escapeHtml(t.presetId || '50x25')}</span>
        <div class="template-name">${escapeHtml(t.name)}</div>
        <div class="template-desc">${escapeHtml(t.description || 'Format: ' + (t.format || 'CODE128'))}</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
        <button class="btn btn-primary btn-sm btn-apply-template" style="padding: 3px 10px; font-size: 0.75rem;">Apply</button>
        ${isCustom ? `<button class="btn btn-danger btn-sm btn-del-template" style="padding: 3px 8px; font-size: 0.75rem;" title="Delete">&times;</button>` : ''}
      </div>
    `;

    div.querySelector('.btn-apply-template').addEventListener('click', (e) => {
      e.stopPropagation();
      applyTemplate(t);
    });

    if (isCustom) {
      div.querySelector('.btn-del-template').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete template "${t.name}"?`)) {
          StorageManager.deleteCustomTemplate(t.id);
          renderTemplatesList();
          showToast('Template deleted');
        }
      });
    }

    div.addEventListener('click', () => applyTemplate(t));
    return div;
  }

  function applyTemplate(t) {
    currentTemplateId = t.id;
    if (t.presetId) {
      els.presetSelect.value = t.presetId;
      handlePresetChange();
    }
    if (t.format) els.barcodeFormat.value = t.format;
    if (t.storeName !== undefined) els.storeName.value = t.storeName;
    if (t.currencySymbol !== undefined) els.currencySymbol.value = t.currencySymbol;
    if (t.showStoreName !== undefined) els.toggleShowStore.checked = t.showStoreName;
    if (t.showTitle !== undefined) els.toggleShowTitle.checked = t.showTitle;
    if (t.showPrice !== undefined) els.toggleShowPrice.checked = t.showPrice;
    if (t.showSku !== undefined) els.toggleShowBarcodeText.checked = t.showSku;
    if (t.showExtraInfo !== undefined) els.toggleShowExtra.checked = t.showExtraInfo;
    if (t.borderStyle !== undefined) els.borderStyleSelect.value = t.borderStyle;
    if (t.barcodeHeight !== undefined) els.barcodeHeightRange.value = t.barcodeHeight;

    // Switch to single tab to view
    switchTab('single');
    updateLivePreview();
    renderTemplatesList();
    showToast(`Applied template: ${t.name}`);
  }

  // =========================================================================
  // LIVE PREVIEW RENDERING ENGINE
  // =========================================================================
  function getActiveConfig() {
    const presetId = els.presetSelect.value;
    let widthMm = currentPreset.width;
    let heightMm = currentPreset.height;

    if (presetId === 'custom') {
      widthMm = Math.max(15, parseFloat(els.customWidth.value) || 50);
      heightMm = Math.max(10, parseFloat(els.customHeight.value) || 25);
    }

    return {
      presetId,
      widthMm,
      heightMm,
      productName: els.productName.value || '',
      barcodeFormat: els.barcodeFormat.value || 'CODE128',
      barcodeValue: els.barcodeValue.value || '12345678',
      currencySymbol: els.currencySymbol.value,
      price: els.productPrice.value || '',
      mrp: els.productMrp.value || '',
      storeName: els.storeName.value || '',
      extraText: els.extraText.value || '',
      copies: parseInt(els.printQuantity.value, 10) || 1,
      showStore: els.toggleShowStore.checked,
      showTitle: els.toggleShowTitle.checked,
      showPrice: els.toggleShowPrice.checked,
      showBarcodeText: els.toggleShowBarcodeText.checked,
      showExtra: els.toggleShowExtra.checked,
      borderStyle: els.borderStyleSelect.value,
      barcodeHeight: parseInt(els.barcodeHeightRange.value, 10) || 38
    };
  }

  function updateLivePreview() {
    const config = getActiveConfig();

    // Sizing in pixels based on standard screen 96 DPI (1mm ≈ 3.78px) scaled by currentZoom
    const mmToPx = 3.78;
    const baseWidthPx = config.widthMm * mmToPx;
    const baseHeightPx = config.heightMm * mmToPx;

    const scaledWidthPx = baseWidthPx * currentZoom;
    const scaledHeightPx = baseHeightPx * currentZoom;

    els.liveLabelCard.style.width = `${scaledWidthPx}px`;
    els.liveLabelCard.style.height = `${scaledHeightPx}px`;

    // Dynamic padding & font scaling proportional to label size
    const scaleFactor = Math.min(config.widthMm / 50, config.heightMm / 25);
    const fontRatio = currentZoom * Math.max(0.75, scaleFactor);

    els.liveLabelCard.style.padding = `${Math.max(4, 6 * scaleFactor)}px`;
    els.liveLabelCard.style.border = config.borderStyle === 'dashed'
      ? '1px dashed #9CA3AF'
      : config.borderStyle === 'solid'
        ? '1px solid #111827'
        : '1px solid #E5E7EB';

    // Generate inner SVG barcode
    const barcodeSvg = BarcodeEngine.renderSVG({
      value: config.barcodeValue || '123456',
      format: config.barcodeFormat,
      height: Math.max(16, config.barcodeHeight * (scaleFactor * 0.85)),
      moduleWidth: 2,
      includeText: config.showBarcodeText,
      fontSize: Math.max(8, Math.round(10 * scaleFactor)),
      quietZone: 4
    });

    // Build inner HTML for Label Card
    let innerHtml = ``;

    // Header Store Name
    if (config.showStore && config.storeName) {
      innerHtml += `<div class="label-header-store" style="font-size:${Math.max(7, Math.round(9 * fontRatio))}px; color:#111827;">${escapeHtml(config.storeName)}</div>`;
    }

    // Product Title
    if (config.showTitle && config.productName) {
      innerHtml += `<div class="label-product-title" style="font-size:${Math.max(8, Math.round(11 * fontRatio))}px; color:#000000; margin: 1px 0;">${escapeHtml(config.productName)}</div>`;
    }

    // Barcode Container
    innerHtml += `<div class="label-barcode-container" style="flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden;">${barcodeSvg}</div>`;

    // Footer Row (Price + SKU/Attributes)
    const hasPrice = config.showPrice && config.price;
    const hasExtra = config.showExtra && config.extraText;

    if (hasPrice || hasExtra) {
      innerHtml += `<div class="label-footer-row" style="display:flex; justify-content:space-between; align-items:baseline; width:100%;">`;

      // Left footer
      innerHtml += `<div>`;
      if (hasExtra) {
        innerHtml += `<span class="label-extra-badge" style="font-size:${Math.max(6, Math.round(8 * fontRatio))}px; color:#4B5563; font-weight:700;">${escapeHtml(config.extraText)}</span>`;
      }
      innerHtml += `</div>`;

      // Right footer (Price)
      innerHtml += `<div style="text-align:right;">`;
      if (config.mrp && config.showPrice) {
        innerHtml += `<span class="label-mrp-crossed" style="font-size:${Math.max(7, Math.round(9 * fontRatio))}px; color:#6B7280;">${escapeHtml(config.currencySymbol)}${escapeHtml(config.mrp)}</span>`;
      }
      if (hasPrice) {
        innerHtml += `<span class="label-price-badge" style="font-size:${Math.max(9, Math.round(13 * fontRatio))}px; color:#000000;">${escapeHtml(config.currencySymbol)}${escapeHtml(config.price)}</span>`;
      }
      innerHtml += `</div>`;

      innerHtml += `</div>`;
    }

    els.liveLabelCard.innerHTML = innerHtml;

    // Update badges
    els.previewDimensionBadge.textContent = `${config.widthMm} × ${config.heightMm} mm`;
    els.zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
    els.mobileSummaryText.textContent = `${config.copies} Label (${config.widthMm}×${config.heightMm}mm)`;

    // Persist active state
    StorageManager.saveFormState(config);
  }

  // =========================================================================
  // PRINT ENGINE & DYNAMIC @PAGE SIZING
  // =========================================================================
  function printSingleLabel() {
    const config = getActiveConfig();
    const items = [{
      sku: config.barcodeValue,
      name: config.productName,
      price: config.price,
      mrp: config.mrp,
      extra: config.extraText,
      quantity: config.copies
    }];

    executePrintJob(items, config);
  }

  function printBatchLabels() {
    if (batchItems.length === 0) {
      showToast('Batch list is empty! Please add SKUs first.', 'error');
      return;
    }
    const config = getActiveConfig();
    executePrintJob(batchItems, config);
  }

  /**
   * Builds printable labels into #print-stage and triggers window.print()
   */
  function executePrintJob(items, config) {
    const flattened = BatchManager.flattenForPrint(items);
    if (flattened.length === 0) {
      showToast('No printable labels to output.', 'error');
      return;
    }

    // 1. Inject dynamic @page rule to guarantee zero margin & matching label dimensions
    const widthMm = config.widthMm;
    const heightMm = config.heightMm;

    els.dynamicPagePrintStyle.innerHTML = `
      @media print {
        @page {
          size: ${widthMm}mm ${heightMm}mm !important;
          margin: 0 !important;
        }
      }
    `;

    // 2. Generate HTML elements inside #print-stage
    els.printStage.innerHTML = '';

    flattened.forEach(item => {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'printable-label';
      labelDiv.style.width = `${widthMm}mm`;
      labelDiv.style.height = `${heightMm}mm`;
      labelDiv.style.padding = `${Math.max(1.5, heightMm * 0.08)}mm`;

      if (config.borderStyle === 'dashed') {
        labelDiv.style.border = '0.2mm dashed #888888';
      } else if (config.borderStyle === 'solid') {
        labelDiv.style.border = '0.2mm solid #000000';
      }

      // Barcode SVG for high-resolution print
      const barcodeSvg = BarcodeEngine.renderSVG({
        value: item.sku || '123456',
        format: config.barcodeFormat,
        height: Math.max(20, config.barcodeHeight * 0.8),
        moduleWidth: 2,
        includeText: config.showBarcodeText,
        fontSize: 9,
        quietZone: 3
      });

      let inner = '';
      if (config.showStore && config.storeName) {
        inner += `<div class="label-header-store" style="font-size: 8pt;">${escapeHtml(config.storeName)}</div>`;
      }
      if (config.showTitle && (item.name || config.productName)) {
        inner += `<div class="label-product-title" style="font-size: 9pt;">${escapeHtml(item.name || config.productName)}</div>`;
      }

      inner += `<div class="label-barcode-container">${barcodeSvg}</div>`;

      const hasPrice = config.showPrice && (item.price || config.price);
      const hasExtra = config.showExtra && (item.extra || config.extraText);

      if (hasPrice || hasExtra) {
        inner += `<div class="label-footer-row">`;
        inner += `<div>`;
        if (hasExtra) {
          inner += `<span class="label-extra-badge">${escapeHtml(item.extra || config.extraText)}</span>`;
        }
        inner += `</div>`;
        inner += `<div style="text-align:right;">`;
        if (item.mrp || config.mrp) {
          inner += `<span class="label-mrp-crossed" style="font-size: 7pt;">${escapeHtml(config.currencySymbol)}${escapeHtml(item.mrp || config.mrp)}</span>`;
        }
        if (hasPrice) {
          inner += `<span class="label-price-badge" style="font-size: 11pt;">${escapeHtml(config.currencySymbol)}${escapeHtml(item.price || config.price)}</span>`;
        }
        inner += `</div>`;
        inner += `</div>`;
      }

      labelDiv.innerHTML = inner;
      els.printStage.appendChild(labelDiv);
    });

    // 3. Save to history
    StorageManager.saveRecentBatch(
      `Print Job (${flattened.length} labels - ${widthMm}x${heightMm}mm)`,
      items,
      config
    );
    renderRecentBatches();

    // 4. Trigger print
    setTimeout(() => {
      window.print();
    }, 120);
  }

  // =========================================================================
  // BATCH MANAGEMENT & CSV PROCESSING
  // =========================================================================
  function processBatchInput() {
    const rawText = els.batchRawText.value.trim();
    if (!rawText) {
      showToast('Please enter or paste SKUs first.', 'error');
      return;
    }

    const config = getActiveConfig();
    const parsed = BatchManager.parseBatchInput(rawText, {
      sku: 'SKU-001',
      name: config.productName || 'Batch Product',
      price: config.price || '0.00',
      quantity: 1,
      extra: config.extraText || '',
      mrp: config.mrp || ''
    });

    if (parsed.length === 0) {
      showToast('Could not parse any valid lines.', 'error');
      return;
    }

    batchItems = [...batchItems, ...parsed];
    renderBatchTable();
    renderBatchGridPreview();
    updateBatchStats();
    showToast(`Added ${parsed.length} items to batch!`);
  }

  function loadSampleBatchData() {
    const sampleText = `SKU-8901, Organic Cotton Tee (L), 24.99, 3, Navy Blue\nSKU-8902, Denim Jacket Slim, 69.50, 2, Vintage Wash\nSKU-8903, Canvas Sneaker (42), 45.00, 1, Off-White\nSKU-8904, Leather Wallet Bifold, 34.00, 4, Brown Tan\nSKU-8905, Stainless Steel Thermos, 18.99, 2, Matte Black`;
    els.batchRawText.value = sampleText;
    processBatchInput();
  }

  function handleCsvFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      els.batchRawText.value = event.target.result;
      processBatchInput();
      els.batchCsvFile.value = ''; // Reset input
    };
    reader.readAsText(file);
  }

  function renderBatchTable() {
    els.batchItemsTbody.innerHTML = '';
    if (batchItems.length === 0) {
      els.batchItemsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No items in batch. Paste SKUs above or click "Load Sample Data".</td></tr>`;
      return;
    }

    batchItems.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 0.75rem;">${index + 1}</td>
        <td style="font-family: var(--font-mono); font-weight: 700;">${escapeHtml(item.sku)}</td>
        <td>${escapeHtml(item.name || '-')}</td>
        <td style="font-weight: 700; color: var(--accent-cyan);">${escapeHtml(els.currencySymbol.value)}${escapeHtml(item.price || '0.00')}</td>
        <td>
          <div class="qty-counter">
            <button class="qty-btn btn-qty-dec" data-index="${index}">-</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn btn-qty-inc" data-index="${index}">+</button>
          </div>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-danger btn-sm btn-item-del" data-index="${index}" style="padding: 2px 6px; font-size: 0.75rem;">&times;</button>
        </td>
      `;

      tr.querySelector('.btn-qty-dec').addEventListener('click', () => {
        if (item.quantity > 1) {
          item.quantity--;
          renderBatchTable();
          renderBatchGridPreview();
          updateBatchStats();
        }
      });

      tr.querySelector('.btn-qty-inc').addEventListener('click', () => {
        item.quantity++;
        renderBatchTable();
        renderBatchGridPreview();
        updateBatchStats();
      });

      tr.querySelector('.btn-item-del').addEventListener('click', () => {
        batchItems.splice(index, 1);
        renderBatchTable();
        renderBatchGridPreview();
        updateBatchStats();
      });

      els.batchItemsTbody.appendChild(tr);
    });
  }

  function renderBatchGridPreview() {
    els.batchPreviewGrid.innerHTML = '';
    const config = getActiveConfig();

    if (batchItems.length === 0) {
      els.batchPreviewGrid.innerHTML = `<div style="width: 100%; text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1.5rem;">Batch preview grid will appear here once items are added.</div>`;
      return;
    }

    // Render first 20 items preview mini cards
    const displayItems = batchItems.slice(0, 24);
    displayItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #FFFFFF;
        color: #000000;
        border-radius: 4px;
        padding: 6px;
        width: 160px;
        height: 85px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        position: relative;
      `;

      const svg = BarcodeEngine.renderSVG({
        value: item.sku,
        format: config.barcodeFormat,
        height: 24,
        moduleWidth: 1.5,
        includeText: true,
        fontSize: 7,
        quietZone: 2
      });

      card.innerHTML = `
        <div style="font-weight: 700; font-size: 7.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.name || item.sku)}</div>
        <div style="margin: 2px 0;">${svg}</div>
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 6.5px; color: #666;">Qty: ${item.quantity}</span>
          <span style="font-weight: 800; font-size: 8.5px;">${escapeHtml(config.currencySymbol)}${escapeHtml(item.price || '0.00')}</span>
        </div>
      `;
      els.batchPreviewGrid.appendChild(card);
    });

    if (batchItems.length > 24) {
      const moreDiv = document.createElement('div');
      moreDiv.style.cssText = `display: flex; align-items: center; justify-content: center; padding: 1rem; color: var(--text-muted); font-size: 0.8rem;`;
      moreDiv.textContent = `+ ${batchItems.length - 24} more labels in queue`;
      els.batchPreviewGrid.appendChild(moreDiv);
    }
  }

  function updateBatchStats() {
    const config = getActiveConfig();
    const uniqueSkus = batchItems.length;
    const totalCopies = batchItems.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 1), 0);

    els.batchStatSkus.textContent = uniqueSkus;
    els.batchStatTotalLabels.textContent = totalCopies;
    els.batchStatPreset.textContent = `${config.widthMm}×${config.heightMm}mm`;

    // Update mobile summary if in batch tab
    if (els.tabBatch.classList.contains('active')) {
      els.mobileSummaryText.textContent = `${totalCopies} Labels (${uniqueSkus} SKUs)`;
    }
  }

  // =========================================================================
  // EXPORT & DOWNLOAD (SVG / PNG / JSON)
  // =========================================================================
  function downloadSvg() {
    const config = getActiveConfig();
    const svgString = BarcodeEngine.renderSVG({
      value: config.barcodeValue,
      format: config.barcodeFormat,
      height: config.barcodeHeight,
      includeText: config.showBarcodeText
    });

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label_${config.barcodeValue || 'barcode'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SVG Downloaded!');
  }

  function downloadPng() {
    const config = getActiveConfig();
    const canvas = document.createElement('canvas');
    const scale = 3; // High DPI for crisp print quality
    const widthPx = config.widthMm * 3.78 * scale;
    const heightPx = config.heightMm * 3.78 * scale;

    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');

    // Fill white thermal background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Draw card border if needed
    if (config.borderStyle === 'solid') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(4 * scale, 4 * scale, widthPx - (8 * scale), heightPx - (8 * scale));
    }

    // Text details
    ctx.fillStyle = '#000000';
    let currentY = 16 * scale;

    if (config.showStore && config.storeName) {
      ctx.font = `bold ${10 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(config.storeName.toUpperCase(), widthPx / 2, currentY);
      currentY += 12 * scale;
    }

    if (config.showTitle && config.productName) {
      ctx.font = `bold ${11 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(config.productName, widthPx / 2, currentY);
    }

    // Draw Barcode on temporary canvas then draw onto main canvas
    const bCanvas = document.createElement('canvas');
    BarcodeEngine.renderCanvas(bCanvas, {
      value: config.barcodeValue,
      format: config.barcodeFormat,
      height: config.barcodeHeight,
      includeText: config.showBarcodeText,
      scale: scale
    });

    const bX = (widthPx - bCanvas.width) / 2;
    const bY = (heightPx - bCanvas.height) / 2 + (config.showStore || config.showTitle ? 6 * scale : 0);
    ctx.drawImage(bCanvas, bX, bY);

    // Price & Extra at footer
    if (config.showPrice && config.price) {
      ctx.font = `bold ${14 * scale}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`${config.currencySymbol}${config.price}`, widthPx - (12 * scale), heightPx - (10 * scale));
    }

    if (config.showExtra && config.extraText) {
      ctx.font = `bold ${9 * scale}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4B5563';
      ctx.fillText(config.extraText, 12 * scale, heightPx - (10 * scale));
    }

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${config.barcodeValue || 'barcode'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('High-Res PNG Downloaded!');
    });
  }

  // =========================================================================
  // RECENT BATCHES & BACKUP
  // =========================================================================
  function renderRecentBatches() {
    const batches = StorageManager.getRecentBatches();
    els.recentBatchesList.innerHTML = '';

    if (batches.length === 0) {
      els.recentBatchesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 2rem; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">No print history recorded yet. Your printed batches will appear here automatically.</div>`;
      return;
    }

    batches.forEach(batch => {
      const div = document.createElement('div');
      div.className = 'glass-panel';
      div.style.padding = '0.85rem 1.15rem';
      div.style.marginBottom = '0.5rem';

      const dateStr = new Date(batch.timestamp).toLocaleString();
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${escapeHtml(batch.name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${dateStr} • ${batch.itemCount} items • ${escapeHtml(batch.templateConfig?.presetId || '50x25')}</div>
          </div>
          <div class="flex-center gap-2">
            <button class="btn btn-secondary btn-sm btn-reload-batch">Reload to Batch Tab</button>
            <button class="btn btn-danger btn-sm btn-del-batch">&times;</button>
          </div>
        </div>
      `;

      div.querySelector('.btn-reload-batch').addEventListener('click', () => {
        batchItems = [...batch.items];
        if (batch.templateConfig) {
          applyTemplate(batch.templateConfig);
        }
        renderBatchTable();
        renderBatchGridPreview();
        updateBatchStats();
        switchTab('batch');
        showToast('Batch restored into editor!');
      });

      div.querySelector('.btn-del-batch').addEventListener('click', () => {
        StorageManager.deleteRecentBatch(batch.id);
        renderRecentBatches();
        showToast('Batch record removed');
      });

      els.recentBatchesList.appendChild(div);
    });
  }

  // =========================================================================
  // EVENT BINDINGS & HANDLERS
  // =========================================================================
  function bindEvents() {
    // Theme toggle
    els.btnToggleTheme.addEventListener('click', toggleTheme);

    // Tab navigation
    els.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // Preset dropdown
    els.presetSelect.addEventListener('change', handlePresetChange);
    els.customWidth.addEventListener('input', updateLivePreview);
    els.customHeight.addEventListener('input', updateLivePreview);

    // Reactive input listeners for live preview
    const reactiveInputs = [
      els.productName,
      els.barcodeFormat,
      els.barcodeValue,
      els.currencySymbol,
      els.productPrice,
      els.productMrp,
      els.storeName,
      els.extraText,
      els.printQuantity,
      els.toggleShowStore,
      els.toggleShowTitle,
      els.toggleShowPrice,
      els.toggleShowBarcodeText,
      els.toggleShowExtra,
      els.borderStyleSelect,
      els.barcodeHeightRange
    ];

    reactiveInputs.forEach(input => {
      if (!input) return;
      input.addEventListener('input', updateLivePreview);
      input.addEventListener('change', updateLivePreview);
    });

    // Random SKU Generator button
    els.btnRandomSku.addEventListener('click', () => {
      const format = els.barcodeFormat.value;
      if (format === 'EAN13') {
        // Generate random 12 digits
        let random12 = '890' + Math.floor(100000000 + Math.random() * 900000000);
        let check = BarcodeEngine.calculateEAN13Checksum(random12);
        els.barcodeValue.value = random12 + check;
      } else {
        els.barcodeValue.value = 'SKU-' + Math.floor(10000 + Math.random() * 90000);
      }
      updateLivePreview();
      showToast('Generated new code!');
    });

    // Accordion toggle
    els.advAccordionToggle.addEventListener('click', () => {
      els.advAccordion.classList.toggle('open');
    });

    // Zoom buttons
    els.btnZoomIn.addEventListener('click', () => {
      currentZoom = Math.min(3.0, currentZoom + 0.25);
      updateLivePreview();
    });
    els.btnZoomOut.addEventListener('click', () => {
      currentZoom = Math.max(0.6, currentZoom - 0.25);
      updateLivePreview();
    });
    els.btnZoomReset.addEventListener('click', () => {
      currentZoom = 1.4;
      updateLivePreview();
    });

    // Downloads
    els.btnDownloadSvg.addEventListener('click', downloadSvg);
    els.btnDownloadPng.addEventListener('click', downloadPng);

    // Prints
    els.btnSinglePrint.addEventListener('click', printSingleLabel);
    els.btnBatchPrint.addEventListener('click', printBatchLabels);
    els.btnMobilePrintAction.addEventListener('click', () => {
      if (els.tabBatch.classList.contains('active')) {
        printBatchLabels();
      } else {
        printSingleLabel();
      }
    });

    // Mobile Preview scroll-into-view
    els.btnMobilePreviewToggle.addEventListener('click', () => {
      const previewEl = document.getElementById('preview-container-box');
      if (previewEl) {
        previewEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Batch Tab
    els.btnProcessBatchText.addEventListener('click', processBatchInput);
    els.btnLoadSampleBatch.addEventListener('click', loadSampleBatchData);
    els.batchCsvFile.addEventListener('change', handleCsvFileUpload);
    els.btnClearBatchTable.addEventListener('click', () => {
      if (confirm('Clear all items from batch table?')) {
        batchItems = [];
        renderBatchTable();
        renderBatchGridPreview();
        updateBatchStats();
        showToast('Batch list cleared');
      }
    });

    // Modals
    els.btnPrintGuide.addEventListener('click', () => openModal(els.modalPrintGuide));
    els.btnOpenSequenceModal.addEventListener('click', () => openModal(els.modalSequence));

    document.querySelectorAll('.btn-modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        const targetModal = document.getElementById(modalId);
        if (targetModal) closeModal(targetModal);
      });
    });

    // Sequence Generator Submit
    els.btnSubmitSequence.addEventListener('click', () => {
      const prefix = document.getElementById('seq-prefix').value;
      const start = document.getElementById('seq-start').value;
      const count = document.getElementById('seq-count').value;
      const pad = document.getElementById('seq-pad').value;
      const name = document.getElementById('seq-name').value;
      const price = document.getElementById('seq-price').value;

      const generated = BatchManager.generateSequence({
        prefix,
        start,
        count,
        padDigits: parseInt(pad, 10),
        name,
        price,
        quantity: 1
      });

      batchItems = [...batchItems, ...generated];
      closeModal(els.modalSequence);
      switchTab('batch');
      renderBatchTable();
      renderBatchGridPreview();
      updateBatchStats();
      showToast(`Generated ${generated.length} sequential barcodes!`);
    });

    // Custom Template Save modal
    els.btnSaveAsTemplate.addEventListener('click', () => openModal(els.modalSaveTemplate));
    els.btnSaveCurrentAsCustom.addEventListener('click', () => openModal(els.modalSaveTemplate));

    els.btnConfirmSaveTemplate.addEventListener('click', () => {
      const name = els.customTemplateName.value.trim();
      const desc = els.customTemplateDesc.value.trim();
      if (!name) {
        showToast('Please provide a template name.', 'error');
        return;
      }

      const config = getActiveConfig();
      const newTemplate = {
        ...config,
        id: 'cust_' + Date.now(),
        name: name,
        description: desc || `${config.widthMm}x${config.heightMm}mm Custom Layout`,
        isBuiltin: false
      };

      StorageManager.saveCustomTemplate(newTemplate);
      closeModal(els.modalSaveTemplate);
      els.customTemplateName.value = '';
      els.customTemplateDesc.value = '';
      renderTemplatesList();
      showToast('Custom template saved!');
    });

    // Backup Export / Import
    els.btnExportBackup.addEventListener('click', () => {
      const json = StorageManager.exportAllDataJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labelcraft_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup JSON exported');
    });

    els.btnImportBackupFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const res = StorageManager.importDataJSON(evt.target.result);
        if (res.success) {
          renderTemplatesList();
          renderRecentBatches();
          showToast('Data imported successfully!');
        } else {
          showToast('Failed to import JSON: ' + res.error, 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  function handlePresetChange() {
    const selectedId = els.presetSelect.value;
    const found = LabelPresets.find(p => p.id === selectedId);
    if (found) {
      currentPreset = found;
      if (selectedId === 'custom') {
        els.customSizeRow.classList.remove('hidden');
      } else {
        els.customSizeRow.classList.add('hidden');
        els.customWidth.value = found.width;
        els.customHeight.value = found.height;
        if (found.barcodeHeight) els.barcodeHeightRange.value = found.barcodeHeight;
      }
    }
    updateLivePreview();
    updateBatchStats();
  }

  function switchTab(tabId) {
    els.tabButtons.forEach(b => {
      if (b.dataset.tab === tabId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    [els.tabSingle, els.tabBatch, els.tabTemplates, els.tabHistory].forEach(tab => {
      tab.classList.add('hidden');
      tab.classList.remove('active');
    });

    if (tabId === 'single') {
      els.tabSingle.classList.remove('hidden');
      els.tabSingle.classList.add('active');
      updateLivePreview();
    } else if (tabId === 'batch') {
      els.tabBatch.classList.remove('hidden');
      els.tabBatch.classList.add('active');
      renderBatchTable();
      renderBatchGridPreview();
      updateBatchStats();
    } else if (tabId === 'templates') {
      els.tabTemplates.classList.remove('hidden');
      els.tabTemplates.classList.add('active');
      renderTemplatesList();
    } else if (tabId === 'history') {
      els.tabHistory.classList.remove('hidden');
      els.tabHistory.classList.add('active');
      renderRecentBatches();
    }
  }

  function loadPersistedFormState() {
    const state = StorageManager.loadFormState();
    if (!state) return;

    if (state.presetId && LabelPresets.some(p => p.id === state.presetId)) {
      els.presetSelect.value = state.presetId;
      handlePresetChange();
    }
    if (state.productName !== undefined) els.productName.value = state.productName;
    if (state.barcodeFormat !== undefined) els.barcodeFormat.value = state.barcodeFormat;
    if (state.barcodeValue !== undefined) els.barcodeValue.value = state.barcodeValue;
    if (state.currencySymbol !== undefined) els.currencySymbol.value = state.currencySymbol;
    if (state.price !== undefined) els.productPrice.value = state.price;
    if (state.mrp !== undefined) els.productMrp.value = state.mrp;
    if (state.storeName !== undefined) els.storeName.value = state.storeName;
    if (state.extraText !== undefined) els.extraText.value = state.extraText;
    if (state.copies !== undefined) els.printQuantity.value = state.copies;

    if (state.showStore !== undefined) els.toggleShowStore.checked = state.showStore;
    if (state.showTitle !== undefined) els.toggleShowTitle.checked = state.showTitle;
    if (state.showPrice !== undefined) els.toggleShowPrice.checked = state.showPrice;
    if (state.showBarcodeText !== undefined) els.toggleShowBarcodeText.checked = state.showBarcodeText;
    if (state.showExtra !== undefined) els.toggleShowExtra.checked = state.showExtra;
    if (state.borderStyle !== undefined) els.borderStyleSelect.value = state.borderStyle;
    if (state.barcodeHeight !== undefined) els.barcodeHeightRange.value = state.barcodeHeight;
  }

  // =========================================================================
  // UTILITIES & MODAL CONTROLLERS
  // =========================================================================
  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '⚠'}</span>
      <span>${escapeHtml(message)}</span>
    `;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  function escapeHtml(text) {
    if (!text && text !== 0) return '';
    return String(text).replace(/[&<>"']/g, function (m) {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#039;';
      }
      return m;
    });
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
