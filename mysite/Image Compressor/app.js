/**
 * OptiPic Studio - High Performance Client-Side Image Compressor & Resizer
 * 100% Client-Side Canvas Processing | Zero Server Uploads
 */

(function () {
  'use strict';

  // ==========================================
  // Application State
  // ==========================================
  const state = {
    theme: localStorage.getItem('optipic_theme') || 'dark',
    filesQueue: [],           // Array of image objects in batch/single
    activeSingleIndex: 0,     // Index of active item in single view
    viewMode: 'single',       // 'single' | 'batch'
    comparisonMode: 'slider', // 'slider' | 'side-by-side'
    sliderPos: 50,            // Percentage (0-100)
    isDraggingSlider: false,
    zoomLevel: 1,             // 1 = 100%
    aspectRatioLocked: true,
    resizeMode: 'px',         // 'px' | 'percent'
    isProcessingBatch: false,
    history: []
  };

  // LocalStorage Key
  const HISTORY_STORAGE_KEY = 'optipic_compression_history_v1';

  // ==========================================
  // DOM Elements
  // ==========================================
  const dom = {
    // Header & Actions
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    historyBtn: document.getElementById('historyBtn'),
    historyCountBadge: document.getElementById('historyCountBadge'),
    
    // Upload & Inputs
    uploadSection: document.getElementById('uploadSection'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    cameraInput: document.getElementById('cameraInput'),
    browseBtn: document.getElementById('browseBtn'),
    cameraBtn: document.getElementById('cameraBtn'),
    sampleBtn: document.getElementById('sampleBtn'),

    // Workspace & Tabs
    workspaceSection: document.getElementById('workspaceSection'),
    tabSingle: document.getElementById('tabSingle'),
    tabBatch: document.getElementById('tabBatch'),
    singleViewPanel: document.getElementById('singleViewPanel'),
    batchViewPanel: document.getElementById('batchViewPanel'),
    batchCountNum: document.getElementById('batchCountNum'),
    addMoreFilesBtn: document.getElementById('addMoreFilesBtn'),
    resetWorkspaceBtn: document.getElementById('resetWorkspaceBtn'),

    // Progress Bar
    globalProgressContainer: document.getElementById('globalProgressContainer'),
    progressStatusText: document.getElementById('progressStatusText'),
    progressPercentageText: document.getElementById('progressPercentageText'),
    progressBarFill: document.getElementById('progressBarFill'),

    // Preview
    btnSliderMode: document.getElementById('btnSliderMode'),
    btnSideBySideMode: document.getElementById('btnSideBySideMode'),
    sliderViewport: document.getElementById('sliderViewport'),
    sliderCanvasWrapper: document.getElementById('sliderCanvasWrapper'),
    sideBySideViewport: document.getElementById('sideBySideViewport'),
    previewBeforeImg: document.getElementById('previewBeforeImg'),
    previewAfterImg: document.getElementById('previewAfterImg'),
    beforeClipLayer: document.getElementById('beforeClipLayer'),
    sliderHandle: document.getElementById('sliderHandle'),
    sbsBeforeImg: document.getElementById('sbsBeforeImg'),
    sbsAfterImg: document.getElementById('sbsAfterImg'),
    sbsOriginalSizeTag: document.getElementById('sbsOriginalSizeTag'),
    sbsCompressedSizeTag: document.getElementById('sbsCompressedSizeTag'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomLevelText: document.getElementById('zoomLevelText'),

    // Metrics Banner
    metricOriginalSize: document.getElementById('metricOriginalSize'),
    metricOriginalDim: document.getElementById('metricOriginalDim'),
    metricCompressedSize: document.getElementById('metricCompressedSize'),
    metricCompressedDim: document.getElementById('metricCompressedDim'),
    metricSavingsBadge: document.getElementById('metricSavingsBadge'),
    metricSavingsBytes: document.getElementById('metricSavingsBytes'),

    // Navigation
    singleBatchNavigator: document.getElementById('singleBatchNavigator'),
    prevImageBtn: document.getElementById('prevImageBtn'),
    nextImageBtn: document.getElementById('nextImageBtn'),
    currentImageIndexText: document.getElementById('currentImageIndexText'),

    // Single Controls
    formatSelect: document.getElementById('formatSelect'),
    formatHint: document.getElementById('formatHint'),
    bgFillGroup: document.getElementById('bgFillGroup'),
    bgColorPicker: document.getElementById('bgColorPicker'),
    bgColorHex: document.getElementById('bgColorHex'),
    qualityControlGroup: document.getElementById('qualityControlGroup'),
    qualitySlider: document.getElementById('qualitySlider'),
    qualityNumInput: document.getElementById('qualityNumInput'),
    targetSizeToggle: document.getElementById('targetSizeToggle'),
    targetSizeInputRow: document.getElementById('targetSizeInputRow'),
    targetSizeValue: document.getElementById('targetSizeValue'),
    targetSizeUnit: document.getElementById('targetSizeUnit'),
    applyTargetSizeBtn: document.getElementById('applyTargetSizeBtn'),

    // Resize Controls
    resizeModePx: document.getElementById('resizeModePx'),
    resizeModePercent: document.getElementById('resizeModePercent'),
    resizePxContainer: document.getElementById('resizePxContainer'),
    resizePercentContainer: document.getElementById('resizePercentContainer'),
    resizeWidth: document.getElementById('resizeWidth'),
    resizeHeight: document.getElementById('resizeHeight'),
    aspectRatioLockBtn: document.getElementById('aspectRatioLockBtn'),
    scaleSlider: document.getElementById('scaleSlider'),
    scaleNumInput: document.getElementById('scaleNumInput'),
    dontEnlargeCheck: document.getElementById('dontEnlargeCheck'),

    // Single Actions
    downloadSingleBtn: document.getElementById('downloadSingleBtn'),
    downloadBtnSubtext: document.getElementById('downloadBtnSubtext'),
    copyClipboardBtn: document.getElementById('copyClipboardBtn'),
    revertImageBtn: document.getElementById('revertImageBtn'),

    // Batch Elements
    batchGlobalFormat: document.getElementById('batchGlobalFormat'),
    batchGlobalQuality: document.getElementById('batchGlobalQuality'),
    batchQualityValueText: document.getElementById('batchQualityValueText'),
    batchGlobalResize: document.getElementById('batchGlobalResize'),
    applyGlobalToAllBtn: document.getElementById('applyGlobalToAllBtn'),
    processAllBatchBtn: document.getElementById('processAllBatchBtn'),
    downloadAllZipBtn: document.getElementById('downloadAllZipBtn'),
    batchItemsContainer: document.getElementById('batchItemsContainer'),
    batchTotalCount: document.getElementById('batchTotalCount'),
    batchTotalOriginalSize: document.getElementById('batchTotalOriginalSize'),
    batchTotalCompressedSize: document.getElementById('batchTotalCompressedSize'),
    batchTotalSavedPercent: document.getElementById('batchTotalSavedPercent'),
    batchTotalSavedBytes: document.getElementById('batchTotalSavedBytes'),

    // History Drawer
    historyDrawer: document.getElementById('historyDrawer'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    historyListContainer: document.getElementById('historyListContainer'),
    historyEmptyState: document.getElementById('historyEmptyState'),
    histTotalFiles: document.getElementById('histTotalFiles'),
    histTotalSaved: document.getElementById('histTotalSaved'),
    historySearchInput: document.getElementById('historySearchInput'),
    exportHistoryCsvBtn: document.getElementById('exportHistoryCsvBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    footerHistoryLink: document.getElementById('footerHistoryLink'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer'),
    processingCanvas: document.getElementById('processingCanvas')
  };

  // ==========================================
  // Utilities
  // ==========================================
  function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function getFileExtension(mimeType, fallbackName = '') {
    switch (mimeType) {
      case 'image/jpeg': return 'jpg';
      case 'image/png': return 'png';
      case 'image/webp': return 'webp';
      case 'image/gif': return 'gif';
      case 'image/avif': return 'avif';
      default:
        const match = fallbackName.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
        return match ? match[1].toLowerCase() : 'jpg';
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================
  // Theme Management
  // ==========================================
  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    dom.themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('optipic_theme', state.theme);
      showToast(`Switched to ${state.theme} mode`, 'info');
    });
  }

  // ==========================================
  // History Management (localStorage metadata only)
  // ==========================================
  function loadHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      state.history = stored ? JSON.parse(stored) : [];
    } catch (e) {
      state.history = [];
    }
    updateHistoryBadge();
  }

  function saveToHistory(record) {
    // Add unique ID and timestamp
    const item = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      name: record.name,
      originalSize: record.originalSize,
      compressedSize: record.compressedSize,
      savedBytes: Math.max(0, record.originalSize - record.compressedSize),
      savedPercent: record.savedPercent,
      format: record.format,
      dimensions: record.dimensions
    };

    state.history.unshift(item);
    if (state.history.length > 50) {
      state.history = state.history.slice(0, 50);
    }

    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history));
    } catch (e) {
      console.warn('LocalStorage limit reached for history metadata', e);
    }

    updateHistoryBadge();
  }

  function updateHistoryBadge() {
    const count = state.history.length;
    if (count > 0) {
      dom.historyCountBadge.textContent = count;
      dom.historyCountBadge.classList.remove('hidden');
    } else {
      dom.historyCountBadge.classList.add('hidden');
    }
  }

  function renderHistoryDrawer(filterText = '') {
    dom.historyListContainer.innerHTML = '';
    const filtered = state.history.filter(item => 
      !filterText || item.name.toLowerCase().includes(filterText.toLowerCase())
    );

    // Calculate total stats
    const totalFiles = state.history.length;
    const totalSaved = state.history.reduce((acc, curr) => acc + (curr.savedBytes || 0), 0);

    dom.histTotalFiles.textContent = totalFiles;
    dom.histTotalSaved.textContent = formatBytes(totalSaved);

    if (filtered.length === 0) {
      dom.historyEmptyState.classList.remove('hidden');
      return;
    }

    dom.historyEmptyState.classList.add('hidden');

    filtered.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item-row';
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      row.innerHTML = `
        <div class="history-item-top">
          <span class="history-item-title" title="${item.name}">${item.name}</span>
          <span class="history-item-date">${dateStr}</span>
        </div>
        <div class="history-item-details">
          <span>${formatBytes(item.originalSize)} → <strong style="color:var(--accent-cyan);">${formatBytes(item.compressedSize)}</strong> (${item.format})</span>
          <span class="batch-savings-tag">-${item.savedPercent}%</span>
        </div>
      `;
      dom.historyListContainer.appendChild(row);
    });
  }

  function openHistoryDrawer() {
    dom.historyDrawer.classList.remove('hidden');
    renderHistoryDrawer();
  }

  function closeHistoryDrawer() {
    dom.historyDrawer.classList.add('hidden');
  }

  function exportHistoryAsCsv() {
    if (state.history.length === 0) {
      showToast('No history records to export', 'info');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Timestamp,File Name,Original Size (Bytes),Compressed Size (Bytes),Saved Bytes,Savings %,Format,Dimensions\n';

    state.history.forEach(row => {
      const line = [
        `"${row.timestamp}"`,
        `"${row.name.replace(/"/g, '""')}"`,
        row.originalSize,
        row.compressedSize,
        row.savedBytes,
        `"${row.savedPercent}%"`,
        `"${row.format}"`,
        `"${row.dimensions || ''}"`
      ].join(',');
      csvContent += line + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `optipic_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('History exported as CSV', 'success');
  }

  function clearHistory() {
    if (confirm('Are you sure you want to clear all compression history?')) {
      state.history = [];
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      updateHistoryBadge();
      renderHistoryDrawer();
      showToast('History cleared', 'info');
    }
  }

  // ==========================================
  // Image Ingestion & Loading
  // ==========================================
  function handleFiles(files) {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      showToast('Please select valid image files (JPG, PNG, WebP, etc.)', 'error');
      return;
    }

    showProgressBar(true, 'Loading images...', 10);

    let loadedCount = 0;
    const newItems = [];

    validFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const item = {
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            file: file,
            originalName: file.name,
            originalSize: file.size,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            originalImg: img,
            originalUrl: e.target.result,
            
            // Output settings
            format: 'image/webp',
            quality: 80,
            width: img.naturalWidth,
            height: img.naturalHeight,
            scale: 100,
            bgColor: '#ffffff',
            aspectRatio: img.naturalWidth / img.naturalHeight,
            
            // Compressed result
            compressedBlob: null,
            compressedUrl: null,
            compressedSize: 0,
            compressedWidth: 0,
            compressedHeight: 0,
            savedPercent: 0,
            savedBytes: 0,
            status: 'pending' // 'pending' | 'processing' | 'done' | 'error'
          };

          newItems.push(item);
          loadedCount++;
          const percent = Math.round((loadedCount / validFiles.length) * 50);
          updateProgressBar(percent, `Loaded ${loadedCount} of ${validFiles.length} images...`);

          if (loadedCount === validFiles.length) {
            onAllFilesLoaded(newItems);
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === validFiles.length) onAllFilesLoaded(newItems);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function onAllFilesLoaded(newItems) {
    if (newItems.length === 0) {
      showProgressBar(false);
      showToast('Failed to load selected images', 'error');
      return;
    }

    state.filesQueue = state.filesQueue.concat(newItems);
    
    // Switch to Workspace view
    dom.workspaceSection.classList.remove('hidden');
    dom.batchCountNum.textContent = state.filesQueue.length;

    // If multiple images loaded, decide view
    if (state.filesQueue.length > 1 && newItems.length > 1) {
      switchViewMode('batch');
      processAllBatchItems();
    } else {
      state.activeSingleIndex = state.filesQueue.length - 1;
      switchViewMode('single');
      syncSingleControlsWithActiveItem();
      processSingleItem(state.activeSingleIndex);
    }

    showToast(`Added ${newItems.length} image(s)`, 'success');
  }

  // Sample Image Generator (Creative high-res sample without external asset fetch)
  function loadSampleImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Create vibrant gradient wallpaper landscape
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 1080);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.4, '#312e81');
    skyGrad.addColorStop(0.7, '#ec4899');
    skyGrad.addColorStop(1, '#f97316');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Draw glowing sun
    const sunGrad = ctx.createRadialGradient(960, 500, 20, 960, 500, 300);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.3, '#fef08a');
    sunGrad.addColorStop(0.8, 'rgba(249, 115, 22, 0.4)');
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(960, 500, 300, 0, Math.PI * 2);
    ctx.fill();

    // Mountains silhouettes
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(0, 1080);
    ctx.lineTo(0, 650);
    ctx.lineTo(400, 480);
    ctx.lineTo(850, 720);
    ctx.lineTo(1300, 420);
    ctx.lineTo(1700, 680);
    ctx.lineTo(1920, 550);
    ctx.lineTo(1920, 1080);
    ctx.closePath();
    ctx.fill();

    // Foreground Mountains
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, 1080);
    ctx.lineTo(0, 780);
    ctx.lineTo(600, 620);
    ctx.lineTo(1100, 800);
    ctx.lineTo(1600, 600);
    ctx.lineTo(1920, 750);
    ctx.lineTo(1920, 1080);
    ctx.closePath();
    ctx.fill();

    // Typography Overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 56px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OptiPic Studio 4K Sample Test Image', 960, 320);

    ctx.font = '30px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Ultra Crisp 1920 × 1080 HD Gradient & Vector Art', 960, 380);

    canvas.toBlob((blob) => {
      const file = new File([blob], 'optipic-sample-mountain-sunset.jpg', { type: 'image/jpeg' });
      handleFiles([file]);
    }, 'image/jpeg', 0.98);
  }

  // ==========================================
  // Compression Engine (HTML5 Canvas)
  // ==========================================
  function compressImage(item) {
    return new Promise((resolve, reject) => {
      const canvas = dom.processingCanvas;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Determine Target Dimensions
      let targetW = parseInt(item.width, 10);
      let targetH = parseInt(item.height, 10);

      if (isNaN(targetW) || targetW <= 0) targetW = item.originalWidth;
      if (isNaN(targetH) || targetH <= 0) targetH = item.originalHeight;

      // Prevent enlarging if checked
      if (dom.dontEnlargeCheck.checked) {
        targetW = Math.min(targetW, item.originalWidth);
        targetH = Math.min(targetH, item.originalHeight);
      }

      canvas.width = targetW;
      canvas.height = targetH;

      // Set high quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clear canvas
      ctx.clearRect(0, 0, targetW, targetH);

      // Handle background fill if converting transparent image to JPEG
      const outputMime = item.format === 'auto' ? item.file.type : item.format;
      if (outputMime === 'image/jpeg') {
        ctx.fillStyle = item.bgColor || '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
      }

      // Draw original image resized
      ctx.drawImage(item.originalImg, 0, 0, targetW, targetH);

      // Determine Quality
      const qualityFraction = Math.max(0.01, Math.min(1.0, (item.quality || 80) / 100));

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob conversion failed'));
          return;
        }

        // Revoke old URL to avoid memory leak
        if (item.compressedUrl) {
          URL.revokeObjectURL(item.compressedUrl);
        }

        item.compressedBlob = blob;
        item.compressedUrl = URL.createObjectURL(blob);
        item.compressedSize = blob.size;
        item.compressedWidth = targetW;
        item.compressedHeight = targetH;
        item.savedBytes = Math.max(0, item.originalSize - blob.size);
        item.savedPercent = item.originalSize > 0 
          ? Math.max(0, Math.round(((item.originalSize - blob.size) / item.originalSize) * 100))
          : 0;
        item.status = 'done';

        resolve(item);
      }, outputMime, qualityFraction);
    });
  }

  // ==========================================
  // Single Image Controller
  // ==========================================
  async function processSingleItem(index) {
    if (index < 0 || index >= state.filesQueue.length) return;
    const item = state.filesQueue[index];

    try {
      showProgressBar(true, 'Compressing single image...', 40);
      await compressImage(item);
      updateSinglePreview(item);
      showProgressBar(false);
      
      // Save record to history
      saveToHistory({
        name: item.originalName,
        originalSize: item.originalSize,
        compressedSize: item.compressedSize,
        savedPercent: item.savedPercent,
        format: getFileExtension(item.format === 'auto' ? item.file.type : item.format, item.originalName).toUpperCase(),
        dimensions: `${item.compressedWidth}×${item.compressedHeight}`
      });
    } catch (err) {
      console.error('Error processing single image:', err);
      showProgressBar(false);
      showToast('Error during compression: ' + err.message, 'error');
    }
  }

  function updateSinglePreview(item) {
    // Images
    dom.previewBeforeImg.src = item.originalUrl;
    dom.previewAfterImg.src = item.compressedUrl;
    dom.sbsBeforeImg.src = item.originalUrl;
    dom.sbsAfterImg.src = item.compressedUrl;

    // Metrics
    dom.metricOriginalSize.textContent = formatBytes(item.originalSize);
    dom.metricOriginalDim.textContent = `${item.originalWidth} × ${item.originalHeight} px`;
    dom.metricCompressedSize.textContent = formatBytes(item.compressedSize);
    dom.metricCompressedDim.textContent = `${item.compressedWidth} × ${item.compressedHeight} px`;

    dom.sbsOriginalSizeTag.textContent = formatBytes(item.originalSize);
    dom.sbsCompressedSizeTag.textContent = `${formatBytes(item.compressedSize)} (-${item.savedPercent}%)`;

    // Savings Badge
    dom.metricSavingsBadge.textContent = `-${item.savedPercent}%`;
    dom.metricSavingsBytes.textContent = `${formatBytes(item.savedBytes)} saved`;

    if (item.savedPercent > 0) {
      dom.metricSavingsBadge.style.color = 'var(--accent-emerald)';
    } else {
      dom.metricSavingsBadge.textContent = `+0%`;
      dom.metricSavingsBadge.style.color = 'var(--accent-amber)';
    }

    // Download button subtext
    const ext = getFileExtension(item.format === 'auto' ? item.file.type : item.format, item.originalName).toUpperCase();
    dom.downloadBtnSubtext.textContent = `Ready • ${ext} • ${formatBytes(item.compressedSize)}`;

    // Batch Navigator
    if (state.filesQueue.length > 1) {
      dom.singleBatchNavigator.classList.remove('hidden');
      dom.currentImageIndexText.textContent = `Image ${state.activeSingleIndex + 1} of ${state.filesQueue.length}`;
      dom.prevImageBtn.disabled = state.activeSingleIndex === 0;
      dom.nextImageBtn.disabled = state.activeSingleIndex === state.filesQueue.length - 1;
    } else {
      dom.singleBatchNavigator.classList.add('hidden');
    }

    // Update Split Slider UI
    updateSliderPosition(state.sliderPos);
  }

  function syncSingleControlsWithActiveItem() {
    const item = state.filesQueue[state.activeSingleIndex];
    if (!item) return;

    dom.formatSelect.value = item.format;
    dom.qualitySlider.value = item.quality;
    dom.qualityNumInput.value = item.quality;
    dom.resizeWidth.value = item.width;
    dom.resizeHeight.value = item.height;
    dom.scaleSlider.value = item.scale;
    dom.scaleNumInput.value = item.scale;

    // Quality controls hidden for PNG
    if (item.format === 'image/png') {
      dom.qualityControlGroup.classList.add('hidden');
    } else {
      dom.qualityControlGroup.classList.remove('hidden');
    }

    // Background color visibility for JPEG
    if (item.format === 'image/jpeg') {
      dom.bgFillGroup.classList.remove('hidden');
    } else {
      dom.bgFillGroup.classList.add('hidden');
    }
  }

  // Trigger throttled re-compression on slider/input change
  const debouncedSingleProcess = debounce(() => {
    processSingleItem(state.activeSingleIndex);
  }, 200);

  // ==========================================
  // Split Comparison Slider Interactivity
  // ==========================================
  function updateSliderPosition(percent) {
    state.sliderPos = Math.max(0, Math.min(100, percent));
    dom.sliderViewport.style.setProperty('--slider-pos', `${state.sliderPos}%`);
  }

  function handleSliderMove(e) {
    if (!state.isDraggingSlider) return;
    const rect = dom.sliderViewport.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const offsetX = clientX - rect.left;
    const percent = (offsetX / rect.width) * 100;
    updateSliderPosition(percent);
  }

  function initSliderEvents() {
    const startDrag = (e) => {
      state.isDraggingSlider = true;
      handleSliderMove(e);
    };

    const stopDrag = () => {
      state.isDraggingSlider = false;
    };

    // Mouse events
    dom.sliderViewport.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', handleSliderMove);
    window.addEventListener('mouseup', stopDrag);

    // Touch events for Mobile
    dom.sliderViewport.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', handleSliderMove, { passive: true });
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('touchcancel', stopDrag);

    // View mode switchers (Slider vs Side-by-Side)
    dom.btnSliderMode.addEventListener('click', () => {
      state.comparisonMode = 'slider';
      dom.btnSliderMode.classList.add('active');
      dom.btnSideBySideMode.classList.remove('active');
      dom.sliderViewport.classList.remove('hidden');
      dom.sideBySideViewport.classList.add('hidden');
    });

    dom.btnSideBySideMode.addEventListener('click', () => {
      state.comparisonMode = 'side-by-side';
      dom.btnSideBySideMode.classList.add('active');
      dom.btnSliderMode.classList.remove('active');
      dom.sliderViewport.classList.add('hidden');
      dom.sideBySideViewport.classList.remove('hidden');
    });

    // Zoom Controls
    dom.zoomInBtn.addEventListener('click', () => {
      state.zoomLevel = Math.min(3, state.zoomLevel + 0.25);
      applyZoom();
    });
    dom.zoomOutBtn.addEventListener('click', () => {
      state.zoomLevel = Math.max(0.5, state.zoomLevel - 0.25);
      applyZoom();
    });
    dom.zoomResetBtn.addEventListener('click', () => {
      state.zoomLevel = 1;
      applyZoom();
    });
  }

  function applyZoom() {
    dom.previewBeforeImg.style.transform = `scale(${state.zoomLevel})`;
    dom.previewAfterImg.style.transform = `scale(${state.zoomLevel})`;
    dom.zoomLevelText.textContent = `${Math.round(state.zoomLevel * 100)}%`;
  }

  // ==========================================
  // Batch Queue Engine & ZIP Export
  // ==========================================
  async function processAllBatchItems() {
    if (state.filesQueue.length === 0 || state.isProcessingBatch) return;
    state.isProcessingBatch = true;
    showProgressBar(true, 'Batch processing images...', 0);

    let completed = 0;
    const total = state.filesQueue.length;

    for (let i = 0; i < total; i++) {
      const item = state.filesQueue[i];
      try {
        await compressImage(item);
      } catch (e) {
        console.error('Batch item error:', e);
        item.status = 'error';
      }
      completed++;
      const progress = Math.round((completed / total) * 100);
      updateProgressBar(progress, `Processed ${completed} of ${total} images (${progress}%)...`);
    }

    state.isProcessingBatch = false;
    showProgressBar(false);
    renderBatchItems();
    updateBatchSummaryStats();
    showToast(`Batch processing complete for ${total} images!`, 'success');
  }

  function renderBatchItems() {
    dom.batchItemsContainer.innerHTML = '';

    state.filesQueue.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'batch-item-card';

      const ext = getFileExtension(item.format === 'auto' ? item.file.type : item.format, item.originalName).toUpperCase();

      card.innerHTML = `
        <div class="batch-item-top">
          <div class="batch-thumbnail-wrapper">
            <img src="${item.compressedUrl || item.originalUrl}" alt="${item.originalName}" class="batch-thumbnail-img">
          </div>
          <div class="batch-item-meta">
            <span class="batch-item-name" title="${item.originalName}">${item.originalName}</span>
            <span class="batch-item-dims">${item.compressedWidth || item.originalWidth} × ${item.compressedHeight || item.originalHeight} px • ${ext}</span>
            <div class="batch-item-sizes">
              <span>${formatBytes(item.originalSize)}</span>
              <span>→</span>
              <strong style="color:var(--accent-cyan);">${formatBytes(item.compressedSize)}</strong>
              <span class="batch-savings-tag">-${item.savedPercent}%</span>
            </div>
          </div>
        </div>
        <div class="batch-item-actions">
          <button type="button" class="btn btn-ghost btn-sm inspect-batch-item-btn" data-index="${index}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>Inspect</span>
          </button>
          <div style="display:flex;gap:0.35rem;">
            <button type="button" class="btn btn-primary btn-sm download-batch-item-btn" data-index="${index}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Download</span>
            </button>
            <button type="button" class="icon-btn-sm delete-batch-item-btn text-danger" data-index="${index}" title="Remove image">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      `;

      // Event listeners for card buttons
      card.querySelector('.inspect-batch-item-btn').addEventListener('click', () => {
        state.activeSingleIndex = index;
        switchViewMode('single');
        syncSingleControlsWithActiveItem();
        updateSinglePreview(item);
      });

      card.querySelector('.download-batch-item-btn').addEventListener('click', () => {
        downloadSingleImage(index);
      });

      card.querySelector('.delete-batch-item-btn').addEventListener('click', () => {
        removeBatchItem(index);
      });

      dom.batchItemsContainer.appendChild(card);
    });
  }

  function updateBatchSummaryStats() {
    const count = state.filesQueue.length;
    dom.batchTotalCount.textContent = count;

    const totalOriginal = state.filesQueue.reduce((acc, curr) => acc + curr.originalSize, 0);
    const totalCompressed = state.filesQueue.reduce((acc, curr) => acc + (curr.compressedSize || curr.originalSize), 0);
    const totalSaved = Math.max(0, totalOriginal - totalCompressed);
    const savedPercent = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

    dom.batchTotalOriginalSize.textContent = formatBytes(totalOriginal);
    dom.batchTotalCompressedSize.textContent = formatBytes(totalCompressed);
    dom.batchTotalSavedPercent.textContent = `-${savedPercent}%`;
    dom.batchTotalSavedBytes.textContent = formatBytes(totalSaved);
  }

  function removeBatchItem(index) {
    if (index < 0 || index >= state.filesQueue.length) return;
    const removed = state.filesQueue.splice(index, 1)[0];
    if (removed && removed.compressedUrl) {
      URL.revokeObjectURL(removed.compressedUrl);
    }

    if (state.filesQueue.length === 0) {
      resetAllWorkspace();
      return;
    }

    if (state.activeSingleIndex >= state.filesQueue.length) {
      state.activeSingleIndex = state.filesQueue.length - 1;
    }

    dom.batchCountNum.textContent = state.filesQueue.length;
    renderBatchItems();
    updateBatchSummaryStats();
    showToast('Image removed from batch', 'info');
  }

  function applyGlobalSettingsToAll() {
    const format = dom.batchGlobalFormat.value;
    const quality = parseInt(dom.batchGlobalQuality.value, 10);
    const resizeVal = dom.batchGlobalResize.value;

    state.filesQueue.forEach(item => {
      item.format = format;
      item.quality = quality;

      if (resizeVal.startsWith('max-')) {
        const maxDim = parseInt(resizeVal.split('-')[1], 10);
        if (item.originalWidth > maxDim || item.originalHeight > maxDim) {
          if (item.originalWidth >= item.originalHeight) {
            item.width = maxDim;
            item.height = Math.round(maxDim / item.aspectRatio);
          } else {
            item.height = maxDim;
            item.width = Math.round(maxDim * item.aspectRatio);
          }
        } else {
          item.width = item.originalWidth;
          item.height = item.originalHeight;
        }
      } else {
        const scaleFactor = parseInt(resizeVal, 10) / 100;
        item.scale = parseInt(resizeVal, 10);
        item.width = Math.round(item.originalWidth * scaleFactor);
        item.height = Math.round(item.originalHeight * scaleFactor);
      }
    });

    showToast('Global settings applied. Re-compressing batch...', 'info');
    processAllBatchItems();
  }

  // ZIP Download Handler
  async function downloadAllBatchAsZip() {
    if (state.filesQueue.length === 0) {
      showToast('No images available to download', 'error');
      return;
    }

    if (typeof JSZip === 'undefined') {
      showToast('ZIP library is loading, downloading individually instead...', 'info');
      state.filesQueue.forEach((_, idx) => downloadSingleImage(idx));
      return;
    }

    showProgressBar(true, 'Bundling ZIP archive...', 20);

    const zip = new JSZip();
    const folder = zip.folder('optipic-compressed-images');

    for (let i = 0; i < state.filesQueue.length; i++) {
      const item = state.filesQueue[i];
      if (!item.compressedBlob) {
        await compressImage(item);
      }

      const rawName = item.originalName.replace(/\.[^/.]+$/, '');
      const ext = getFileExtension(item.format === 'auto' ? item.file.type : item.format, item.originalName);
      const filename = `${rawName}-optipic.${ext}`;

      folder.file(filename, item.compressedBlob);
    }

    updateProgressBar(75, 'Generating ZIP file...');

    zip.generateAsync({ type: 'blob' }, (metadata) => {
      updateProgressBar(Math.round(metadata.percent), `Packing ZIP: ${Math.round(metadata.percent)}%`);
    }).then((content) => {
      showProgressBar(false);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `optipic_batch_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('ZIP archive downloaded successfully!', 'success');
    }).catch(err => {
      showProgressBar(false);
      showToast('Error generating ZIP: ' + err.message, 'error');
    });
  }

  // ==========================================
  // Download & Copy Handlers
  // ==========================================
  function downloadSingleImage(index = state.activeSingleIndex) {
    const item = state.filesQueue[index];
    if (!item || !item.compressedBlob) {
      showToast('Image is not ready yet', 'error');
      return;
    }

    const rawName = item.originalName.replace(/\.[^/.]+$/, '');
    const ext = getFileExtension(item.format === 'auto' ? item.file.type : item.format, item.originalName);
    const filename = `${rawName}-compressed.${ext}`;

    const link = document.createElement('a');
    link.href = item.compressedUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Downloaded ${filename}`, 'success');
  }

  async function copyCurrentImageToClipboard() {
    const item = state.filesQueue[state.activeSingleIndex];
    if (!item || !item.compressedBlob) {
      showToast('Image is not ready to copy', 'error');
      return;
    }

    try {
      // ClipboardItem requires image/png in many browsers
      if (item.compressedBlob.type === 'image/png') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': item.compressedBlob })
        ]);
        showToast('PNG image copied to clipboard!', 'success');
      } else {
        // Convert to PNG blob for clipboard
        const canvas = dom.processingCanvas;
        canvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob })
            ]);
            showToast('Image copied to clipboard as PNG!', 'success');
          }
        }, 'image/png');
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
      showToast('Direct image copy not supported by browser. Please use Download.', 'error');
    }
  }

  // ==========================================
  // View Switcher & Progress Bar
  // ==========================================
  function switchViewMode(mode) {
    state.viewMode = mode;
    if (mode === 'single') {
      dom.tabSingle.classList.add('active');
      dom.tabSingle.setAttribute('aria-selected', 'true');
      dom.tabBatch.classList.remove('active');
      dom.tabBatch.setAttribute('aria-selected', 'false');
      dom.singleViewPanel.classList.remove('hidden');
      dom.batchViewPanel.classList.add('hidden');
      if (state.filesQueue.length > 0) {
        updateSinglePreview(state.filesQueue[state.activeSingleIndex]);
      }
    } else {
      dom.tabBatch.classList.add('active');
      dom.tabBatch.setAttribute('aria-selected', 'true');
      dom.tabSingle.classList.remove('active');
      dom.tabSingle.setAttribute('aria-selected', 'false');
      dom.batchViewPanel.classList.remove('hidden');
      dom.singleViewPanel.classList.add('hidden');
      renderBatchItems();
      updateBatchSummaryStats();
    }
  }

  function showProgressBar(show, text = 'Processing...', percent = 0) {
    if (show) {
      dom.globalProgressContainer.classList.remove('hidden');
      updateProgressBar(percent, text);
    } else {
      dom.globalProgressContainer.classList.add('hidden');
    }
  }

  function updateProgressBar(percent, text) {
    dom.progressBarFill.style.width = `${percent}%`;
    dom.progressPercentageText.textContent = `${percent}%`;
    if (text) dom.progressStatusText.textContent = text;
  }

  function resetAllWorkspace() {
    state.filesQueue.forEach(item => {
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    });
    state.filesQueue = [];
    state.activeSingleIndex = 0;
    dom.workspaceSection.classList.add('hidden');
    dom.fileInput.value = '';
    dom.cameraInput.value = '';
    showToast('Workspace cleared', 'info');
  }

  // ==========================================
  // Event Listeners Initialization
  // ==========================================
  function initEventListeners() {
    // Browse & Camera
    dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
    dom.cameraBtn.addEventListener('click', () => dom.cameraInput.click());
    dom.sampleBtn.addEventListener('click', loadSampleImage);
    dom.addMoreFilesBtn.addEventListener('click', () => dom.fileInput.click());
    dom.resetWorkspaceBtn.addEventListener('click', resetAllWorkspace);

    dom.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    dom.cameraInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Drag & Drop
    const dropArea = dom.dropZone;
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('dragover');
      });
    });

    dropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleFiles(dt.files);
      }
    });

    // Global Paste (Ctrl+V / Cmd+V)
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) imageFiles.push(blob);
        }
      }
      if (imageFiles.length > 0) {
        handleFiles(imageFiles);
        showToast('Pasted image from clipboard!', 'success');
      }
    });

    // Tab view switching
    dom.tabSingle.addEventListener('click', () => switchViewMode('single'));
    dom.tabBatch.addEventListener('click', () => switchViewMode('batch'));

    // Single Batch Navigator
    dom.prevImageBtn.addEventListener('click', () => {
      if (state.activeSingleIndex > 0) {
        state.activeSingleIndex--;
        syncSingleControlsWithActiveItem();
        processSingleItem(state.activeSingleIndex);
      }
    });

    dom.nextImageBtn.addEventListener('click', () => {
      if (state.activeSingleIndex < state.filesQueue.length - 1) {
        state.activeSingleIndex++;
        syncSingleControlsWithActiveItem();
        processSingleItem(state.activeSingleIndex);
      }
    });

    // Format selector
    dom.formatSelect.addEventListener('change', (e) => {
      const item = state.filesQueue[state.activeSingleIndex];
      if (!item) return;
      item.format = e.target.value;

      if (item.format === 'image/png') {
        dom.qualityControlGroup.classList.add('hidden');
        dom.formatHint.textContent = 'PNG is lossless and retains crisp lines and full transparency.';
      } else if (item.format === 'image/webp') {
        dom.qualityControlGroup.classList.remove('hidden');
        dom.formatHint.textContent = 'WebP delivers ~30-50% smaller sizes than JPEG with identical visual quality.';
      } else {
        dom.qualityControlGroup.classList.remove('hidden');
        dom.formatHint.textContent = 'JPEG is universally compatible across all devices and software.';
      }

      if (item.format === 'image/jpeg') {
        dom.bgFillGroup.classList.remove('hidden');
      } else {
        dom.bgFillGroup.classList.add('hidden');
      }

      debouncedSingleProcess();
    });

    // Background color picker
    dom.bgColorPicker.addEventListener('input', (e) => {
      const item = state.filesQueue[state.activeSingleIndex];
      if (!item) return;
      item.bgColor = e.target.value;
      dom.bgColorHex.textContent = e.target.value.toUpperCase();
      debouncedSingleProcess();
    });

    document.querySelectorAll('.color-swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        dom.bgColorPicker.value = color;
        dom.bgColorHex.textContent = color.toUpperCase();
        const item = state.filesQueue[state.activeSingleIndex];
        if (item) {
          item.bgColor = color;
          debouncedSingleProcess();
        }
      });
    });

    // Quality slider and numeric sync
    dom.qualitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      dom.qualityNumInput.value = val;
      const item = state.filesQueue[state.activeSingleIndex];
      if (item) {
        item.quality = val;
        debouncedSingleProcess();
      }
    });

    dom.qualityNumInput.addEventListener('input', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = 80;
      val = Math.max(1, Math.min(100, val));
      dom.qualitySlider.value = val;
      const item = state.filesQueue[state.activeSingleIndex];
      if (item) {
        item.quality = val;
        debouncedSingleProcess();
      }
    });

    // Target size matcher
    dom.targetSizeToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        dom.targetSizeInputRow.classList.remove('hidden');
      } else {
        dom.targetSizeInputRow.classList.add('hidden');
      }
    });

    dom.applyTargetSizeBtn.addEventListener('click', async () => {
      const item = state.filesQueue[state.activeSingleIndex];
      if (!item) return;

      const targetVal = parseFloat(dom.targetSizeValue.value);
      const unit = dom.targetSizeUnit.value;
      const targetBytes = unit === 'MB' ? targetVal * 1024 * 1024 : targetVal * 1024;

      showProgressBar(true, `Matching target size ~${targetVal} ${unit}...`, 30);

      // Binary search quality between 5% and 95%
      let low = 5;
      let high = 98;
      let bestQ = 80;

      for (let step = 0; step < 6; step++) {
        const mid = Math.round((low + high) / 2);
        item.quality = mid;
        await compressImage(item);
        if (item.compressedSize > targetBytes) {
          high = mid - 1;
        } else {
          bestQ = mid;
          low = mid + 1;
        }
      }

      item.quality = bestQ;
      dom.qualitySlider.value = bestQ;
      dom.qualityNumInput.value = bestQ;
      await compressImage(item);
      updateSinglePreview(item);
      showProgressBar(false);
      showToast(`Target matched at quality ${bestQ}% (${formatBytes(item.compressedSize)})`, 'success');
    });

    // Resize Mode Switcher
    dom.resizeModePx.addEventListener('click', () => {
      state.resizeMode = 'px';
      dom.resizeModePx.classList.add('active');
      dom.resizeModePercent.classList.remove('active');
      dom.resizePxContainer.classList.remove('hidden');
      dom.resizePercentContainer.classList.add('hidden');
    });

    dom.resizeModePercent.addEventListener('click', () => {
      state.resizeMode = 'percent';
      dom.resizeModePercent.classList.add('active');
      dom.resizeModePx.classList.remove('active');
      dom.resizePercentContainer.classList.remove('hidden');
      dom.resizePxContainer.classList.add('hidden');
    });

    // Aspect Ratio Lock Button
    dom.aspectRatioLockBtn.addEventListener('click', () => {
      state.aspectRatioLocked = !state.aspectRatioLocked;
      if (state.aspectRatioLocked) {
        dom.aspectRatioLockBtn.classList.add('active');
        dom.aspectRatioLockBtn.querySelector('.lock-icon').classList.remove('hidden');
        dom.aspectRatioLockBtn.querySelector('.unlock-icon').classList.add('hidden');
        dom.aspectRatioLockBtn.title = 'Aspect Ratio Locked (Click to unlock)';
      } else {
        dom.aspectRatioLockBtn.classList.remove('active');
        dom.aspectRatioLockBtn.querySelector('.lock-icon').classList.add('hidden');
        dom.aspectRatioLockBtn.querySelector('.unlock-icon').classList.remove('hidden');
        dom.aspectRatioLockBtn.title = 'Aspect Ratio Unlocked (Click to lock)';
      }
    });

    // Width & Height inputs
    dom.resizeWidth.addEventListener('input', (e) => {
      const item = state.filesQueue[state.activeSingleIndex];
      if (!item) return;
      const w = parseInt(e.target.value, 10);
      if (isNaN(w) || w <= 0) return;
      item.width = w;

      if (state.aspectRatioLocked && item.aspectRatio) {
        item.height = Math.round(w / item.aspectRatio);
        dom.resizeHeight.value = item.height;
      }
      debouncedSingleProcess();
    });

    dom.resizeHeight.addEventListener('input', (e) => {
      const item = state.filesQueue[state.activeSingleIndex];
      if (!item) return;
      const h = parseInt(e.target.value, 10);
      if (isNaN(h) || h <= 0) return;
      item.height = h;

      if (state.aspectRatioLocked && item.aspectRatio) {
        item.width = Math.round(h * item.aspectRatio);
        dom.resizeWidth.value = item.width;
      }
      debouncedSingleProcess();
    });

    // Dimension Preset Chips
    document.querySelectorAll('.dim-preset-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.filesQueue[state.activeSingleIndex];
        if (!item) return;

        const w = btn.dataset.w;
        const h = btn.dataset.h;

        if (w === 'original') {
          item.width = item.originalWidth;
          item.height = item.originalHeight;
        } else {
          item.width = parseInt(w, 10);
          item.height = parseInt(h, 10);
        }

        dom.resizeWidth.value = item.width;
        dom.resizeHeight.value = item.height;
        debouncedSingleProcess();
      });
    });

    // Scale Factor Slider (Percentage Mode)
    dom.scaleSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      dom.scaleNumInput.value = val;
      const item = state.filesQueue[state.activeSingleIndex];
      if (item) {
        item.scale = val;
        item.width = Math.round(item.originalWidth * (val / 100));
        item.height = Math.round(item.originalHeight * (val / 100));
        dom.resizeWidth.value = item.width;
        dom.resizeHeight.value = item.height;
        debouncedSingleProcess();
      }
    });

    dom.scaleNumInput.addEventListener('input', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = 100;
      val = Math.max(10, Math.min(200, val));
      dom.scaleSlider.value = val;
      const item = state.filesQueue[state.activeSingleIndex];
      if (item) {
        item.scale = val;
        item.width = Math.round(item.originalWidth * (val / 100));
        item.height = Math.round(item.originalHeight * (val / 100));
        dom.resizeWidth.value = item.width;
        dom.resizeHeight.value = item.height;
        debouncedSingleProcess();
      }
    });

    // Quick Presets
    document.querySelectorAll('.chip-btn[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.filesQueue[state.activeSingleIndex];
        if (!item) return;

        const preset = btn.dataset.preset;
        if (preset === 'web-optimized') {
          item.format = 'image/webp';
          item.quality = 80;
          item.width = Math.min(item.originalWidth, 1920);
          item.height = Math.round(item.width / item.aspectRatio);
        } else if (preset === 'social-insta') {
          item.format = 'image/jpeg';
          item.quality = 85;
          item.width = 1080;
          item.height = 1080;
        } else if (preset === 'email') {
          item.format = 'image/jpeg';
          item.quality = 70;
          item.width = Math.min(item.originalWidth, 800);
          item.height = Math.round(item.width / item.aspectRatio);
        } else if (preset === 'max-shrink') {
          item.format = 'image/webp';
          item.quality = 50;
          item.width = Math.round(item.originalWidth * 0.75);
          item.height = Math.round(item.originalHeight * 0.75);
        } else if (preset === 'hd-screen') {
          item.format = 'image/webp';
          item.quality = 88;
          item.width = 1920;
          item.height = 1080;
        }

        syncSingleControlsWithActiveItem();
        debouncedSingleProcess();
        showToast(`Applied preset: ${btn.textContent}`, 'info');
      });
    });

    // Action Buttons
    dom.downloadSingleBtn.addEventListener('click', () => downloadSingleImage());
    dom.copyClipboardBtn.addEventListener('click', copyCurrentImageToClipboard);
    dom.revertImageBtn.addEventListener('click', () => {
      const item = state.filesQueue[state.activeSingleIndex];
      if (!item) return;
      item.format = 'image/webp';
      item.quality = 80;
      item.scale = 100;
      item.width = item.originalWidth;
      item.height = item.originalHeight;
      syncSingleControlsWithActiveItem();
      debouncedSingleProcess();
      showToast('Settings reset to defaults', 'info');
    });

    // Batch Global Controls
    dom.batchGlobalQuality.addEventListener('input', (e) => {
      dom.batchQualityValueText.textContent = `${e.target.value}%`;
    });

    dom.applyGlobalToAllBtn.addEventListener('click', applyGlobalSettingsToAll);
    dom.processAllBatchBtn.addEventListener('click', processAllBatchItems);
    dom.downloadAllZipBtn.addEventListener('click', downloadAllBatchAsZip);

    // History Modal / Drawer
    dom.historyBtn.addEventListener('click', openHistoryDrawer);
    dom.footerHistoryLink.addEventListener('click', openHistoryDrawer);
    dom.closeHistoryBtn.addEventListener('click', closeHistoryDrawer);
    dom.clearHistoryBtn.addEventListener('click', clearHistory);
    dom.exportHistoryCsvBtn.addEventListener('click', exportHistoryAsCsv);
    dom.historySearchInput.addEventListener('input', (e) => renderHistoryDrawer(e.target.value));

    // Close drawer on background overlay click
    dom.historyDrawer.addEventListener('click', (e) => {
      if (e.target === dom.historyDrawer) closeHistoryDrawer();
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeHistoryDrawer();
      }
    });
  }

  // ==========================================
  // Initialization
  // ==========================================
  function init() {
    initTheme();
    loadHistory();
    initSliderEvents();
    initEventListeners();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
