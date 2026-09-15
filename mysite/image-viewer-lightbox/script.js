/**
 * ViewImage PRO - Advanced Image Viewer & Studio
 * End-to-End Rewritten Logic
 */

class ViewImagePro {
  constructor() {
    this.images = []; // Array of image objects { id, name, size, type, dataUrl, width, height }
    this.currentIndex = -1;

    // Viewport transform state
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.rotation = 0;
    this.flipH = 1;
    this.flipV = 1;

    // Drag state
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // Tool state
    this.eyedropperActive = false;

    // Filters state
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hue: 0,
      blur: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
    };

    this.initDOMReferences();
    this.bindEvents();
  }

  initDOMReferences() {
    // Buttons & Inputs
    this.fileInput = document.getElementById('fileInput');
    this.btnOpen = document.getElementById('btnOpen');
    this.btnExport = document.getElementById('btnExport');
    this.btnClearAll = document.getElementById('btnClearAll');
    this.btnDropzoneBrowse = document.getElementById('btnDropzoneBrowse');
    this.btnSample1 = document.getElementById('btnSample1');

    // Layout Containers
    this.galleryList = document.getElementById('galleryList');
    this.imgCount = document.getElementById('imgCount');
    this.viewport = document.getElementById('viewport');
    this.dropzone = document.getElementById('dropzone');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.activeImage = document.getElementById('activeImage');
    this.floatingToolbar = document.getElementById('floatingToolbar');

    // Toolbar controls
    this.btnZoomIn = document.getElementById('btnZoomIn');
    this.btnZoomOut = document.getElementById('btnZoomOut');
    this.btnFit = document.getElementById('btnFit');
    this.btnActual = document.getElementById('btnActual');
    this.zoomVal = document.getElementById('zoomVal');
    this.btnRotateLeft = document.getElementById('btnRotateLeft');
    this.btnRotateRight = document.getElementById('btnRotateRight');
    this.btnFlipH = document.getElementById('btnFlipH');
    this.btnFlipV = document.getElementById('btnFlipV');
    this.btnEyedropper = document.getElementById('btnEyedropper');
    this.btnToggleGrid = document.getElementById('btnToggleGrid');

    // Eyedropper Magnifier Canvas
    this.loupeCanvas = document.getElementById('loupeCanvas');
    this.loupeCtx = this.loupeCanvas.getContext('2d');

    // Filter Sliders & Values
    this.sliderBrightness = document.getElementById('sliderBrightness');
    this.sliderContrast = document.getElementById('sliderContrast');
    this.sliderSaturate = document.getElementById('sliderSaturate');
    this.sliderHue = document.getElementById('sliderHue');
    this.sliderBlur = document.getElementById('sliderBlur');
    this.sliderGrayscale = document.getElementById('sliderGrayscale');
    this.sliderSepia = document.getElementById('sliderSepia');
    this.sliderInvert = document.getElementById('sliderInvert');
    this.btnResetFilters = document.getElementById('btnResetFilters');

    // Preset Buttons
    this.presetCards = document.querySelectorAll('.preset-card');

    // Color Swatch & Copy
    this.colorSwatch = document.getElementById('colorSwatch');
    this.colorHex = document.getElementById('colorHex');
    this.colorRgb = document.getElementById('colorRgb');
    this.colorHexText = document.getElementById('colorHexText');
    this.btnCopyColor = document.getElementById('btnCopyColor');

    // Info Metadata
    this.infoFileName = document.getElementById('infoFileName');
    this.infoDimensions = document.getElementById('infoDimensions');
    this.infoFileSize = document.getElementById('infoFileSize');
    this.infoFileType = document.getElementById('infoFileType');
    this.infoAspectRatio = document.getElementById('infoAspectRatio');

    // Tabs
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Export Modal
    this.exportModal = document.getElementById('exportModal');
    this.btnCloseModal = document.getElementById('btnCloseModal');
    this.btnCancelExport = document.getElementById('btnCancelExport');
    this.btnConfirmExport = document.getElementById('btnConfirmExport');
    this.exportFileName = document.getElementById('exportFileName');
    this.exportFormat = document.getElementById('exportFormat');

    // Toast
    this.toast = document.getElementById('toast');
    this.toastMsg = document.getElementById('toastMsg');
  }

  bindEvents() {
    // Open Files
    this.btnOpen.addEventListener('click', () => this.fileInput.click());
    this.btnDropzoneBrowse.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

    // Clear Workspace
    this.btnClearAll.addEventListener('click', () => this.clearWorkspace());

    // Sample Image
    if (this.btnSample1) {
      this.btnSample1.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadSampleImage();
      });
    }

    // Drag and Drop Zone
    this.viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('dragover');
    });
    this.viewport.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('dragover');
    });
    this.viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.handleFiles(e.dataTransfer.files);
      }
    });

    // Panning & Dragging
    this.viewport.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    // Zooming via Wheel
    this.viewport.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Toolbar Controls
    this.btnZoomIn.addEventListener('click', () => this.zoom(1.25));
    this.btnZoomOut.addEventListener('click', () => this.zoom(0.8));
    this.btnFit.addEventListener('click', () => this.fitToScreen());
    this.btnActual.addEventListener('click', () => this.setZoom(1));
    this.btnRotateLeft.addEventListener('click', () => this.rotate(-90));
    this.btnRotateRight.addEventListener('click', () => this.rotate(90));
    this.btnFlipH.addEventListener('click', () => {
      this.flipH *= -1;
      this.updateTransform();
    });
    this.btnFlipV.addEventListener('click', () => {
      this.flipV *= -1;
      this.updateTransform();
    });
    this.btnToggleGrid.addEventListener('click', () => {
      this.viewport.classList.toggle('transparent-grid');
    });
    this.btnEyedropper.addEventListener('click', () => this.toggleEyedropper());

    // Tabs Switch
    this.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tabBtns.forEach((b) => b.classList.remove('active'));
        this.tabContents.forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    // Filter Sliders
    this.sliderBrightness.addEventListener('input', (e) => this.onFilterChange('brightness', e.target.value, '%'));
    this.sliderContrast.addEventListener('input', (e) => this.onFilterChange('contrast', e.target.value, '%'));
    this.sliderSaturate.addEventListener('input', (e) => this.onFilterChange('saturate', e.target.value, '%'));
    this.sliderHue.addEventListener('input', (e) => this.onFilterChange('hue', e.target.value, '°'));
    this.sliderBlur.addEventListener('input', (e) => this.onFilterChange('blur', e.target.value, 'px'));
    this.sliderGrayscale.addEventListener('input', (e) => this.onFilterChange('grayscale', e.target.value, '%'));
    this.sliderSepia.addEventListener('input', (e) => this.onFilterChange('sepia', e.target.value, '%'));
    this.sliderInvert.addEventListener('input', (e) => this.onFilterChange('invert', e.target.value, '%'));

    this.btnResetFilters.addEventListener('click', () => this.resetFilters());

    // Presets
    this.presetCards.forEach((card) => {
      card.addEventListener('click', () => this.applyPreset(card.dataset.preset, card));
    });

    // Copy Color
    this.btnCopyColor.addEventListener('click', () => {
      navigator.clipboard.writeText(this.colorHex.textContent);
      this.showToast('Color hex copied to clipboard!');
    });

    // Export Modal Events
    this.btnExport.addEventListener('click', () => this.openExportModal());
    this.btnCloseModal.addEventListener('click', () => this.closeExportModal());
    this.btnCancelExport.addEventListener('click', () => this.closeExportModal());
    this.btnConfirmExport.addEventListener('click', () => this.exportImage());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  handleFiles(files) {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const item = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: this.formatBytes(file.size),
            type: file.type || 'image/jpeg',
            dataUrl: e.target.result,
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
          this.images.push(item);
          this.renderGallery();
          this.setActiveImage(this.images.length - 1);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  loadSampleImage() {
    // Generate a sleek SVG dynamic sample image
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 1200;
    sampleCanvas.height = 800;
    const ctx = sampleCanvas.getContext('2d');

    // Create vibrant gradient background
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#311042');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Glowing circles
    const drawGlowCircle = (x, y, r, color) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 50;
      ctx.fill();
      ctx.restore();
    };

    drawGlowCircle(300, 400, 180, '#6366f1');
    drawGlowCircle(900, 300, 220, '#06b6d4');
    drawGlowCircle(600, 600, 140, '#ec4899');

    // Text overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ViewImage PRO Studio', 600, 390);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px JetBrains Mono, monospace';
    ctx.fillText('Pan • Zoom • Filter • Inspect', 600, 450);

    const sampleUrl = sampleCanvas.toDataURL('image/png');
    const item = {
      id: Date.now(),
      name: 'sample-artwork.png',
      size: '1.2 MB',
      type: 'image/png',
      dataUrl: sampleUrl,
      width: 1200,
      height: 800,
    };
    this.images.push(item);
    this.renderGallery();
    this.setActiveImage(this.images.length - 1);
    this.showToast('Sample image loaded!');
  }

  clearWorkspace() {
    this.images = [];
    this.currentIndex = -1;
    this.renderGallery();
    this.canvasWrapper.style.display = 'none';
    this.floatingToolbar.style.display = 'none';
    this.dropzone.style.display = 'flex';
    this.btnExport.disabled = true;
    this.clearInfo();
  }

  renderGallery() {
    this.galleryList.innerHTML = '';
    this.imgCount.textContent = this.images.length;

    this.images.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = `gallery-item ${idx === this.currentIndex ? 'active' : ''}`;
      item.innerHTML = `
        <img src="${img.dataUrl}" alt="${img.name}" />
        <div class="item-name">${img.name}</div>
        <button class="item-remove" title="Remove"><i class="fa-solid fa-xmark"></i></button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.item-remove')) {
          e.stopPropagation();
          this.removeImage(idx);
        } else {
          this.setActiveImage(idx);
        }
      });

      this.galleryList.appendChild(item);
    });
  }

  removeImage(index) {
    this.images.splice(index, 1);
    if (this.images.length === 0) {
      this.clearWorkspace();
    } else {
      const nextIdx = Math.min(index, this.images.length - 1);
      this.renderGallery();
      this.setActiveImage(nextIdx);
    }
  }

  setActiveImage(index) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    const imgData = this.images[index];

    this.activeImage.src = imgData.dataUrl;
    this.dropzone.style.display = 'none';
    this.canvasWrapper.style.display = 'flex';
    this.floatingToolbar.style.display = 'flex';
    this.btnExport.disabled = false;

    this.exportFileName.value = imgData.name.replace(/\.[^/.]+$/, "") + "-edited";

    // Update metadata info
    this.infoFileName.textContent = imgData.name;
    this.infoDimensions.textContent = `${imgData.width} × ${imgData.height} px`;
    this.infoFileSize.textContent = imgData.size;
    this.infoFileType.textContent = imgData.type;
    this.infoAspectRatio.textContent = this.calculateAspectRatio(imgData.width, imgData.height);

    this.renderGallery();
    
    // Reset view transform on load
    this.fitToScreen();
  }

  clearInfo() {
    this.infoFileName.textContent = '-';
    this.infoDimensions.textContent = '-';
    this.infoFileSize.textContent = '-';
    this.infoFileType.textContent = '-';
    this.infoAspectRatio.textContent = '-';
  }

  /* Viewport Panning & Scaling */
  updateTransform() {
    this.canvasWrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale}) rotate(${this.rotation}deg) scaleX(${this.flipH}) scaleY(${this.flipV})`;
    this.zoomVal.textContent = `${Math.round(this.scale * 100)}%`;
  }

  fitToScreen() {
    if (this.currentIndex === -1) return;
    const current = this.images[this.currentIndex];
    const vWidth = this.viewport.clientWidth - 80;
    const vHeight = this.viewport.clientHeight - 80;

    const scaleX = vWidth / current.width;
    const scaleY = vHeight / current.height;
    
    this.scale = Math.min(scaleX, scaleY, 1);
    this.panX = 0;
    this.panY = 0;
    this.rotation = 0;
    this.flipH = 1;
    this.flipV = 1;
    this.updateTransform();
  }

  setZoom(val) {
    this.scale = Math.max(0.05, Math.min(val, 20));
    this.updateTransform();
  }

  zoom(factor) {
    this.setZoom(this.scale * factor);
  }

  rotate(deg) {
    this.rotation = (this.rotation + deg) % 360;
    this.updateTransform();
  }

  onMouseDown(e) {
    if (this.currentIndex === -1 || e.target.closest('.floating-toolbar')) return;

    if (this.eyedropperActive) {
      this.pickColorAtMouse(e);
      return;
    }

    this.isDragging = true;
    this.startX = e.clientX - this.panX;
    this.startY = e.clientY - this.panY;
    this.canvasWrapper.classList.add('grabbing');
  }

  onMouseMove(e) {
    if (this.eyedropperActive && this.currentIndex !== -1) {
      this.updateLoupe(e);
    }

    if (!this.isDragging) return;
    this.panX = e.clientX - this.startX;
    this.panY = e.clientY - this.startY;
    this.updateTransform();
  }

  onMouseUp() {
    this.isDragging = false;
    this.canvasWrapper.classList.remove('grabbing');
  }

  onWheel(e) {
    if (this.currentIndex === -1) return;
    e.preventDefault();

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoom(zoomFactor);
  }

  /* Filters */
  onFilterChange(filterKey, val, unit) {
    this.filters[filterKey] = val;
    document.getElementById(`val${filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}`).textContent = `${val}${unit}`;
    this.applyCSSFilters();

    // Deselect preset cards
    this.presetCards.forEach((c) => c.classList.remove('active'));
  }

  applyCSSFilters() {
    const f = this.filters;
    const filterString = `
      brightness(${f.brightness}%) 
      contrast(${f.contrast}%) 
      saturate(${f.saturate}%) 
      hue-rotate(${f.hue}deg) 
      blur(${f.blur}px) 
      grayscale(${f.grayscale}%) 
      sepia(${f.sepia}%) 
      invert(${f.invert}%)
    `;
    this.activeImage.style.filter = filterString;
  }

  resetFilters() {
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hue: 0,
      blur: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
    };

    this.sliderBrightness.value = 100;
    this.sliderContrast.value = 100;
    this.sliderSaturate.value = 100;
    this.sliderHue.value = 0;
    this.sliderBlur.value = 0;
    this.sliderGrayscale.value = 0;
    this.sliderSepia.value = 0;
    this.sliderInvert.value = 0;

    document.getElementById('valBrightness').textContent = '100%';
    document.getElementById('valContrast').textContent = '100%';
    document.getElementById('valSaturate').textContent = '100%';
    document.getElementById('valHue').textContent = '0°';
    document.getElementById('valBlur').textContent = '0px';
    document.getElementById('valGrayscale').textContent = '0%';
    document.getElementById('valSepia').textContent = '0%';
    document.getElementById('valInvert').textContent = '0%';

    this.applyCSSFilters();
    this.presetCards.forEach((c) => c.classList.remove('active'));
    this.presetCards[0].classList.add('active'); // Set 'Normal'
  }

  applyPreset(name, cardEl) {
    this.presetCards.forEach((c) => c.classList.remove('active'));
    if (cardEl) cardEl.classList.add('active');

    this.resetFilters();

    switch (name) {
      case 'cyberpunk':
        this.filters.hue = 280;
        this.filters.saturate = 180;
        this.filters.contrast = 130;
        break;
      case 'vintage':
        this.filters.sepia = 60;
        this.filters.contrast = 90;
        this.filters.brightness = 105;
        break;
      case 'monochrome':
        this.filters.grayscale = 100;
        this.filters.contrast = 120;
        break;
      case 'dramatic':
        this.filters.contrast = 160;
        this.filters.saturate = 120;
        this.filters.brightness = 90;
        break;
      case 'warm':
        this.filters.sepia = 30;
        this.filters.saturate = 130;
        this.filters.hue = 15;
        break;
      case 'cool':
        this.filters.hue = 190;
        this.filters.saturate = 120;
        break;
      case 'invert':
        this.filters.invert = 100;
        break;
      case 'highcontrast':
        this.filters.contrast = 180;
        this.filters.saturate = 150;
        break;
      case 'normal':
      default:
        break;
    }

    this.sliderBrightness.value = this.filters.brightness;
    this.sliderContrast.value = this.filters.contrast;
    this.sliderSaturate.value = this.filters.saturate;
    this.sliderHue.value = this.filters.hue;
    this.sliderBlur.value = this.filters.blur;
    this.sliderGrayscale.value = this.filters.grayscale;
    this.sliderSepia.value = this.filters.sepia;
    this.sliderInvert.value = this.filters.invert;

    document.getElementById('valBrightness').textContent = `${this.filters.brightness}%`;
    document.getElementById('valContrast').textContent = `${this.filters.contrast}%`;
    document.getElementById('valSaturate').textContent = `${this.filters.saturate}%`;
    document.getElementById('valHue').textContent = `${this.filters.hue}°`;
    document.getElementById('valBlur').textContent = `${this.filters.blur}px`;
    document.getElementById('valGrayscale').textContent = `${this.filters.grayscale}%`;
    document.getElementById('valSepia').textContent = `${this.filters.sepia}%`;
    document.getElementById('valInvert').textContent = `${this.filters.invert}%`;

    this.applyCSSFilters();
  }

  /* Eyedropper Tool & Magnifier Loupe */
  toggleEyedropper() {
    this.eyedropperActive = !this.eyedropperActive;
    this.btnEyedropper.classList.toggle('active', this.eyedropperActive);

    if (this.eyedropperActive) {
      this.viewport.style.cursor = 'crosshair';
      this.loupeCanvas.style.display = 'block';
      this.showToast('Click anywhere on the image to inspect color');
    } else {
      this.viewport.style.cursor = 'default';
      this.loupeCanvas.style.display = 'none';
    }
  }

  updateLoupe(e) {
    const rect = this.viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.loupeCanvas.style.left = `${e.clientX - 60}px`;
    this.loupeCanvas.style.top = `${e.clientY - 60}px`;

    // Draw magnifier snapshot on canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw active image transformed
    const img = this.activeImage;
    const imgRect = img.getBoundingClientRect();
    
    // Quick render of active element
    try {
      tempCtx.filter = img.style.filter;
      tempCtx.drawImage(img, imgRect.left - rect.left, imgRect.top - rect.top, imgRect.width, imgRect.height);
      
      this.loupeCtx.clearRect(0, 0, 120, 120);
      this.loupeCtx.save();
      this.loupeCtx.beginPath();
      this.loupeCtx.arc(60, 60, 58, 0, Math.PI * 2);
      this.loupeCtx.clip();

      // Zoom factor 2x
      this.loupeCtx.drawImage(tempCanvas, x - 30, y - 30, 60, 60, 0, 0, 120, 120);

      // Center crosshair
      this.loupeCtx.strokeStyle = 'rgba(255,255,255,0.8)';
      this.loupeCtx.lineWidth = 1.5;
      this.loupeCtx.strokeRect(55, 55, 10, 10);
      this.loupeCtx.restore();
    } catch(err) {
      // Security fallback if cross-origin image
    }
  }

  pickColorAtMouse(e) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = this.activeImage;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.filter = img.style.filter;
    ctx.drawImage(img, 0, 0);

    const rect = img.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(clientX / rect.width, 1));
    const normY = Math.max(0, Math.min(clientY / rect.height, 1));

    const pixelX = Math.floor(normX * img.naturalWidth);
    const pixelY = Math.floor(normY * img.naturalHeight);

    try {
      const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];

      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
      
      this.colorSwatch.style.backgroundColor = hex;
      this.colorHex.textContent = hex;
      this.colorHexText.textContent = hex;
      this.colorRgb.textContent = `rgb(${r}, ${g}, ${b})`;

      this.toggleEyedropper();
      this.showToast(`Color picked: ${hex}`);
    } catch (err) {
      this.showToast('Could not sample pixel color');
    }
  }

  /* Export & Render */
  openExportModal() {
    this.exportModal.classList.add('active');
  }

  closeExportModal() {
    this.exportModal.classList.remove('active');
  }

  exportImage() {
    if (this.currentIndex === -1) return;

    const current = this.images[this.currentIndex];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const img = this.activeImage;
    canvas.width = current.width;
    canvas.height = current.height;

    // Apply rotation & flip context transformations if applicable
    ctx.save();
    ctx.filter = img.style.filter;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const format = this.exportFormat.value;
    const ext = format.split('/')[1];
    const fileName = `${this.exportFileName.value || 'exported-image'}.${ext}`;

    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL(format, 0.92);
    link.click();

    this.closeExportModal();
    this.showToast(`Exported successfully as ${fileName}`);
  }

  /* Keyboard Shortcuts */
  handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowRight') {
      if (this.currentIndex < this.images.length - 1) this.setActiveImage(this.currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      if (this.currentIndex > 0) this.setActiveImage(this.currentIndex - 1);
    } else if (e.key === '+' || (e.ctrlKey && e.key === '=')) {
      e.preventDefault();
      this.zoom(1.25);
    } else if (e.key === '-' || (e.ctrlKey && e.key === '-')) {
      e.preventDefault();
      this.zoom(0.8);
    } else if (e.key === '0') {
      this.fitToScreen();
    } else if (e.key === 'r' || e.key === 'R') {
      this.rotate(90);
    } else if (e.key === 'i' || e.key === 'I') {
      this.toggleEyedropper();
    }
  }

  /* Helpers */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  calculateAspectRatio(w, h) {
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(w, h);
    return `${w / divisor}:${h / divisor}`;
  }

  showToast(msg) {
    this.toastMsg.textContent = msg;
    this.toast.classList.add('show');
    setTimeout(() => {
      this.toast.classList.remove('show');
    }, 3000);
  }
}

// Instantiate App when DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ViewImagePro();
});