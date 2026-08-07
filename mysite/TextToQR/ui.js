/**
 * ==========================================================================
 * UI Controller & Event Handlers
 * Integrates Custom QR Encoder, Decoder, and Image Compressor Modules
 * Features: Dark/Light Mode, Toasts, Tab Routing, Live Encoding, Camera Scanner
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. THEME MANAGER
  // ==========================================================================
  const themeToggleBtn = document.getElementById('theme-toggle');
  
  const savedTheme = localStorage.getItem('qr_studio_theme') || 
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('qr_studio_theme', theme);
  }

  setTheme(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    showToast(`Switched to ${newTheme} theme`, 'info');
  });

  // ==========================================================================
  // 2. TOAST NOTIFICATION SYSTEM
  // ==========================================================================
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'info', duration = 3200) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D2B8" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-msg">${escapeHtml(message)}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-leaving');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, match => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return map[match];
    });
  }

  function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function playScanBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }


  // ==========================================================================
  // 3. NAVIGATION TAB SYSTEM
  // ==========================================================================
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanels = document.querySelectorAll('.tab-panel');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTabId = tab.getAttribute('data-tab');

      navTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`${targetTabId}-content`).classList.add('active');

      if (targetTabId !== 'tab-scan' && isCameraActive) {
        stopCameraScanner();
      }
    });
  });


  // ==========================================================================
  // 4. TAB 1: TEXT TO QR (CUSTOM ENCODER ENGINE)
  // ==========================================================================
  const textInput = document.getElementById('text-input');
  const charCounter = document.getElementById('char-counter');
  const detectedModeBadge = document.getElementById('detected-mode-badge');
  const clearTextBtn = document.getElementById('clear-text-btn');
  const qrSizeSelect = document.getElementById('qr-size-select');
  const qrEclSelect = document.getElementById('qr-ecl-select');
  const qrFgColorInput = document.getElementById('qr-fg-color');
  const qrFgTextInput = document.getElementById('qr-fg-text');
  const qrBgColorInput = document.getElementById('qr-bg-color');
  const qrBgTextInput = document.getElementById('qr-bg-text');
  const btnGenerateTextQr = document.getElementById('btn-generate-text-qr');
  const textQrCanvas = document.getElementById('text-qr-canvas');
  const textPlaceholder = document.getElementById('text-placeholder');
  const downloadTextQrBtn = document.getElementById('download-text-qr-btn');
  const copyTextQrBtn = document.getElementById('copy-text-qr-btn');
  const fgSwatches = document.getElementById('fg-swatches');
  const bgSwatches = document.getElementById('bg-swatches');
  
  const encoderStatsPanel = document.getElementById('encoder-stats-panel');
  const statVersion = document.getElementById('stat-version');
  const statMask = document.getElementById('stat-mask');
  const statEc = document.getElementById('stat-ec');

  let lastEncodedQRResult = null;

  function syncColorInputs(colorEl, textEl) {
    colorEl.addEventListener('input', () => { textEl.value = colorEl.value.toUpperCase(); generateTextQR(); });
    textEl.addEventListener('input', () => {
      if (/^#[0-9A-F]{6}$/i.test(textEl.value)) {
        colorEl.value = textEl.value;
        generateTextQR();
      }
    });
  }
  syncColorInputs(qrFgColorInput, qrFgTextInput);
  syncColorInputs(qrBgColorInput, qrBgTextInput);

  fgSwatches.addEventListener('click', e => {
    if (e.target.classList.contains('swatch')) {
      const color = e.target.getAttribute('data-color');
      qrFgColorInput.value = color;
      qrFgTextInput.value = color.toUpperCase();
      generateTextQR();
    }
  });

  bgSwatches.addEventListener('click', e => {
    if (e.target.classList.contains('swatch')) {
      const color = e.target.getAttribute('data-color');
      qrBgColorInput.value = color;
      qrBgTextInput.value = color.toUpperCase();
      generateTextQR();
    }
  });

  textInput.addEventListener('input', () => {
    updateTextMeta();
    debouncedGenerateTextQR();
  });

  clearTextBtn.addEventListener('click', () => {
    textInput.value = '';
    updateTextMeta();
    generateTextQR();
  });

  qrSizeSelect.addEventListener('change', generateTextQR);
  qrEclSelect.addEventListener('change', generateTextQR);
  btnGenerateTextQr.addEventListener('click', generateTextQR);

  function updateTextMeta() {
    const str = textInput.value;
    const charCount = str.length;
    const byteCount = new TextEncoder().encode(str).length;
    const mode = str ? QREncoder.detectMode(str) : 'Auto';
    charCounter.textContent = `${charCount} chars | ${byteCount} bytes`;
    detectedModeBadge.textContent = `Mode: ${mode}`;
  }

  const debouncedGenerateTextQR = debounce(() => {
    generateTextQR();
  }, 200);

  function generateTextQR() {
    const text = textInput.value.trim();

    if (!text) {
      textQrCanvas.style.display = 'none';
      textPlaceholder.style.display = 'flex';
      encoderStatsPanel.classList.add('hidden');
      downloadTextQrBtn.disabled = true;
      copyTextQrBtn.disabled = true;
      return;
    }

    try {
      const ecl = qrEclSelect.value || 'M';
      const targetSize = parseInt(qrSizeSelect.value, 10) || 400;
      const fgColor = qrFgColorInput.value || '#0F172A';
      const bgColor = qrBgColorInput.value || '#FFFFFF';

      // Call Custom QR Encoder Module
      const qrResult = QREncoder.encode(text, { ecl });
      lastEncodedQRResult = qrResult;

      // Render onto canvas
      QREncoder.renderToCanvas(textQrCanvas, qrResult, {
        size: targetSize,
        fgColor,
        bgColor
      });

      // Update metadata stats panel
      statVersion.textContent = `V${qrResult.version} (${qrResult.size}x${qrResult.size})`;
      statMask.textContent = `Pattern ${qrResult.maskId}`;
      statEc.textContent = `${qrResult.ecBytes} bytes/blk`;
      encoderStatsPanel.classList.remove('hidden');

      textPlaceholder.style.display = 'none';
      textQrCanvas.style.display = 'block';
      downloadTextQrBtn.disabled = false;
      copyTextQrBtn.disabled = false;

    } catch (err) {
      showToast(err.message || 'Content is too long for selected Error Correction level', 'error');
    }
  }

  downloadTextQrBtn.addEventListener('click', () => {
    if (!textQrCanvas) return;
    const link = document.createElement('a');
    link.download = `qr-code-custom-${Date.now()}.png`;
    link.href = textQrCanvas.toDataURL('image/png');
    link.click();
    showToast('QR Code downloaded as PNG!', 'success');
  });

  copyTextQrBtn.addEventListener('click', async () => {
    try {
      textQrCanvas.toBlob(async blob => {
        if (!blob) throw new Error('Blob creation failed');
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('QR Code copied to clipboard!', 'success');
      });
    } catch (err) {
      showToast('Clipboard access denied or unsupported', 'error');
    }
  });


  // ==========================================================================
  // 5. TAB 2: IMAGE TO QR (PROGRESSIVE COMPRESSOR + CUSTOM ENCODER)
  // ==========================================================================
  const imageDropzone = document.getElementById('image-dropzone');
  const imageFileInput = document.getElementById('image-file-input');
  const imgEclSelect = document.getElementById('img-ecl-select');
  const imgQrColorInput = document.getElementById('img-qr-color');
  const imgQrColorTextInput = document.getElementById('img-qr-color-text');

  const compressionStatusCard = document.getElementById('compression-status-card');
  const compressionStatusText = document.getElementById('compression-status-text');
  const compressionProgressBar = document.getElementById('compression-progress-bar');

  const imageResultsContainer = document.getElementById('image-results-container');
  const origImgPreview = document.getElementById('orig-img-preview');
  const origStatSize = document.getElementById('orig-stat-size');
  const origStatDims = document.getElementById('orig-stat-dims');

  const compImgPreview = document.getElementById('comp-img-preview');
  const compStatSize = document.getElementById('comp-stat-size');
  const compStatDims = document.getElementById('comp-stat-dims');
  const compStatSavings = document.getElementById('comp-stat-savings');

  const imageQrCanvas = document.getElementById('image-qr-canvas');
  const downloadImgQrBtn = document.getElementById('download-img-qr-btn');
  const imageErrorCard = document.getElementById('image-error-card');
  const imageErrorMessage = document.getElementById('image-error-message');

  syncColorInputs(imgQrColorInput, imgQrColorTextInput);

  ['dragenter', 'dragover'].forEach(name => {
    imageDropzone.addEventListener(name, (e) => { e.preventDefault(); imageDropzone.classList.add('dragover'); });
  });

  ['dragleave', 'drop'].forEach(name => {
    imageDropzone.addEventListener(name, (e) => { e.preventDefault(); imageDropzone.classList.remove('dragover'); });
  });

  imageDropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFileUpload(e.dataTransfer.files[0]);
    }
  });

  imageFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFileUpload(e.target.files[0]);
    }
  });

  function handleImageFileUpload(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showToast('Image file is too large (max 12MB allowed)', 'error');
      return;
    }
    processImageToQR(file);
  }

  async function processImageToQR(file) {
    imageResultsContainer.classList.add('hidden');
    imageErrorCard.classList.add('hidden');
    compressionStatusCard.classList.remove('hidden');
    compressionProgressBar.style.width = '5%';
    compressionStatusText.textContent = 'Initializing image compression loop...';

    const ecl = imgEclSelect.value || 'L';
    const fgColor = imgQrColorInput.value || '#0F172A';

    try {
      const result = await ImageCompressor.compressImageForQR(file, ecl, (statusMsg, percent) => {
        compressionStatusText.textContent = statusMsg;
        compressionProgressBar.style.width = `${percent}%`;
      });

      compressionStatusCard.classList.add('hidden');

      // Update comparison UI
      origImgPreview.src = URL.createObjectURL(file);
      origStatSize.textContent = (result.origSizeBytes / 1024).toFixed(1) + ' KB';
      origStatDims.textContent = `${result.origWidth} x ${result.origHeight} px`;

      compImgPreview.src = result.candidateDataUrl;
      compStatSize.textContent = `${result.compressedSizeBytes} bytes`;
      compStatDims.textContent = `${result.width} x ${result.height} px`;

      const savings = (100 - (result.compressedSizeBytes / result.origSizeBytes) * 100).toFixed(1);
      compStatSavings.textContent = `${savings}% smaller`;

      // Render custom Image QR Code
      QREncoder.renderToCanvas(imageQrCanvas, result.qrResult, {
        size: 450,
        fgColor,
        bgColor: '#FFFFFF'
      });

      imageResultsContainer.classList.remove('hidden');
      showToast('Image compressed & custom QR code generated!', 'success');

    } catch (err) {
      compressionStatusCard.classList.add('hidden');
      imageErrorCard.classList.remove('hidden');
      imageErrorMessage.textContent = err.message || 'Image contains too much detail to fit in QR Code storage limits.';
      showToast('Image compression failed', 'error');
    }
  }

  const copyImgQrBtn = document.getElementById('copy-img-qr-btn');

  downloadImgQrBtn.addEventListener('click', () => {
    if (!imageQrCanvas) return;
    const link = document.createElement('a');
    link.download = `qr-code-custom-image-${Date.now()}.png`;
    link.href = imageQrCanvas.toDataURL('image/png');
    link.click();
    showToast('Image QR Code downloaded!', 'success');
  });

  if (copyImgQrBtn) {
    copyImgQrBtn.addEventListener('click', async () => {
      if (!imageQrCanvas) return;
      try {
        imageQrCanvas.toBlob(async blob => {
          if (!blob) throw new Error('Blob creation failed');
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('Image QR Code copied to clipboard!', 'success');
        });
      } catch (err) {
        showToast('Clipboard copy unsupported or permission denied', 'error');
      }
    });
  }


  // ==========================================================================
  // 6. TAB 3: SCAN & DECODE QR (CUSTOM DECODER ENGINE)
  // ==========================================================================
  const modeFileBtn = document.getElementById('mode-file-btn');
  const modeCameraBtn = document.getElementById('mode-camera-btn');
  const scanFileView = document.getElementById('scan-file-view');
  const scanCameraView = document.getElementById('scan-camera-view');

  const scanDropzone = document.getElementById('scan-dropzone');
  const scanFileInput = document.getElementById('scan-file-input');
  const btnPasteScan = document.getElementById('btn-paste-scan');

  if (btnPasteScan) {
    btnPasteScan.addEventListener('click', async () => {
      try {
        const clipboardItems = await navigator.clipboard.read();
        let imageFound = false;
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              imageFound = true;
              decodeQRFromFile(blob);
              return;
            }
          }
        }
        if (!imageFound) {
          showToast('No QR code image found in clipboard', 'error');
        }
      } catch (err) {
        showToast('Clipboard access denied. Press Ctrl+V to paste', 'error');
      }
    });
  }

  const btnPasteEncodeImg = document.getElementById('btn-paste-encode-img');

  if (btnPasteEncodeImg) {
    btnPasteEncodeImg.addEventListener('click', async () => {
      try {
        const clipboardItems = await navigator.clipboard.read();
        let imageFound = false;
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              imageFound = true;
              handleImageFileUpload(blob);
              showToast('Pasted image for QR encoding!', 'success');
              return;
            }
          }
        }
        if (!imageFound) {
          showToast('No image found in clipboard to encode', 'error');
        }
      } catch (err) {
        showToast('Clipboard access denied. Press Ctrl+V to paste', 'error');
      }
    });
  }

  // Global Ctrl+V Paste Listener (Smart Active Tab Context)
  document.addEventListener('paste', e => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();

        // Check active tab
        const activeTab = document.querySelector('.nav-tab.active');
        const activeTabId = activeTab ? activeTab.getAttribute('data-tab') : 'tab-scan';

        if (activeTabId === 'tab-image') {
          handleImageFileUpload(file);
          showToast('Pasted image for custom QR encoding!', 'info');
        } else {
          const scanTab = document.querySelector('[data-tab="tab-scan"]');
          if (scanTab) scanTab.click();
          decodeQRFromFile(file);
          showToast('Pasted QR image from clipboard for scanning!', 'info');
        }
      }
    }
  });

  const scannerVideo = document.getElementById('scanner-video');
  const scannerCanvas = document.getElementById('scanner-canvas');
  const cameraLoading = document.getElementById('camera-loading');
  const cameraError = document.getElementById('camera-error');
  const cameraErrorMsg = document.getElementById('camera-error-msg');
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const btnStopCamera = document.getElementById('btn-stop-camera');
  const btnRetryCamera = document.getElementById('btn-retry-camera');

  const decodeEmptyState = document.getElementById('decode-empty-state');
  const decodeResultView = document.getElementById('decode-result-view');
  const decodeTypeBadge = document.getElementById('decode-type-badge');
  const decodeTextContainer = document.getElementById('decode-text-container');
  const decodedTextarea = document.getElementById('decoded-textarea');
  const btnCopyDecoded = document.getElementById('btn-copy-decoded');
  const btnOpenUrl = document.getElementById('btn-open-url');

  const decodeImageContainer = document.getElementById('decode-image-container');
  const decodedImgElement = document.getElementById('decoded-img-element');
  const decodedImgDims = document.getElementById('decoded-img-dims');
  const decodedImgSize = document.getElementById('decoded-img-size');
  const btnDownloadDecodedImg = document.getElementById('btn-download-decoded-img');

  let videoStream = null;
  let isCameraActive = false;
  let activeFacingMode = 'environment';
  let animFrameId = null;

  modeFileBtn.addEventListener('click', () => {
    modeFileBtn.classList.add('active');
    modeCameraBtn.classList.remove('active');
    scanFileView.classList.remove('hidden');
    scanCameraView.classList.add('hidden');
    stopCameraScanner();
  });

  modeCameraBtn.addEventListener('click', () => {
    modeCameraBtn.classList.add('active');
    modeFileBtn.classList.remove('active');
    scanCameraView.classList.remove('hidden');
    scanFileView.classList.add('hidden');
    startCameraScanner();
  });

  ['dragenter', 'dragover'].forEach(name => {
    scanDropzone.addEventListener(name, (e) => { e.preventDefault(); scanDropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(name => {
    scanDropzone.addEventListener(name, (e) => { e.preventDefault(); scanDropzone.classList.remove('dragover'); });
  });

  scanDropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      decodeQRFromFile(e.dataTransfer.files[0]);
    }
  });

  scanFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      decodeQRFromFile(e.target.files[0]);
    }
  });

  function decodeQRFromFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file containing a QR code', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        // Fill solid white background first (prevents transparent PNG black binarization)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          // Call Custom QR Decoder Module
          const decodeResult = QRDecoder.decodeImageData(imageData);
          playScanBeep();
          handleDecodedPayload(decodeResult.text);
          showToast(`QR Code decoded successfully! (V${decodeResult.version}, Mask ${decodeResult.maskId})`, 'success');
        } catch (err) {
          showToast(err.message || 'No readable QR code found in this image', 'error');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function startCameraScanner() {
    stopCameraScanner();
    cameraLoading.classList.remove('hidden');
    cameraError.classList.add('hidden');

    try {
      const constraints = {
        video: {
          facingMode: activeFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      scannerVideo.srcObject = videoStream;
      scannerVideo.setAttribute('playsinline', true);
      await scannerVideo.play();

      cameraLoading.classList.add('hidden');
      isCameraActive = true;
      scanCameraFrame();

    } catch (err) {
      cameraLoading.classList.add('hidden');
      cameraError.classList.remove('hidden');
      cameraErrorMsg.textContent = err.name === 'NotAllowedError' ? 
        'Camera permission was denied. Please allow camera access in browser settings.' : 
        'Unable to access camera device or video stream.';
      showToast('Camera access failed', 'error');
    }
  }

  function scanCameraFrame() {
    if (!isCameraActive || !scannerVideo || scannerVideo.readyState !== scannerVideo.HAVE_ENOUGH_DATA) {
      animFrameId = requestAnimationFrame(scanCameraFrame);
      return;
    }

    const ctx = scannerCanvas.getContext('2d');
    scannerCanvas.width = scannerVideo.videoWidth;
    scannerCanvas.height = scannerVideo.videoHeight;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, scannerCanvas.width, scannerCanvas.height);
    ctx.drawImage(scannerVideo, 0, 0, scannerCanvas.width, scannerCanvas.height);

    const imageData = ctx.getImageData(0, 0, scannerCanvas.width, scannerCanvas.height);

    try {
      // Call Custom Decoder on current video frame
      const decodeResult = QRDecoder.decodeImageData(imageData);
      playScanBeep();
      stopCameraScanner();
      handleDecodedPayload(decodeResult.text);
      showToast('QR Code Scanned with Custom Engine!', 'success');
      return;
    } catch (e) {
      // Continue scanning frames
    }

    animFrameId = requestAnimationFrame(scanCameraFrame);
  }

  function stopCameraScanner() {
    isCameraActive = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    if (scannerVideo) {
      scannerVideo.srcObject = null;
    }
  }

  btnToggleCamera.addEventListener('click', () => {
    activeFacingMode = activeFacingMode === 'environment' ? 'user' : 'environment';
    startCameraScanner();
  });

  btnStopCamera.addEventListener('click', () => {
    stopCameraScanner();
    cameraLoading.classList.remove('hidden');
    cameraLoading.querySelector('p').textContent = 'Camera Paused. Click below to restart.';
  });

  btnRetryCamera.addEventListener('click', startCameraScanner);


  // Payload Classifier
  function handleDecodedPayload(payload) {
    decodeEmptyState.classList.add('hidden');
    decodeResultView.classList.remove('hidden');

    // Hide both containers initially
    decodeTextContainer.classList.add('hidden');
    decodeImageContainer.classList.add('hidden');

    const trimmed = (payload || '').trim();

    // 1. Check for Image Data URI substring anywhere in payload or long base64 string
    let dataUri = null;

    // Clean up raw payload (remove invalid control chars or spaces)
    let cleanPayload = trimmed.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    if (cleanPayload.includes('data:image/')) {
      const startIdx = cleanPayload.indexOf('data:image/');
      dataUri = cleanPayload.substring(startIdx);
      const endMatch = dataUri.match(/data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+/i);
      if (endMatch) {
        dataUri = endMatch[0].replace(/\s+/g, '');
      }
    } else if (cleanPayload.includes('base64,')) {
      const startIdx = cleanPayload.indexOf('base64,');
      dataUri = 'data:image/jpeg;' + cleanPayload.substring(startIdx);
    } else if (/^(\/9j\/|iVBORw0KGgo|R0lGOD|UklGR)/.test(cleanPayload)) {
      const mime = /^iVBOR/.test(cleanPayload) ? 'png' : /^R0lGOD/.test(cleanPayload) ? 'gif' : /^UklGR/.test(cleanPayload) ? 'webp' : 'jpeg';
      dataUri = `data:image/${mime};base64,` + cleanPayload.replace(/[^A-Za-z0-9+/=]/g, '');
    } else if (cleanPayload.length > 80 && /^[A-Za-z0-9+/=\s%_-]+$/.test(cleanPayload)) {
      // Raw Base64 string payload
      const sanitized = cleanPayload.replace(/[^A-Za-z0-9+/=]/g, '');
      dataUri = 'data:image/jpeg;base64,' + sanitized;
    }

    if (dataUri) {
      // RENDER IN <img> TAG (Image Container), FORCE HIDE TEXT AREA
      decodeTypeBadge.textContent = 'Image Payload';
      decodeTypeBadge.className = 'badge badge-info';

      decodeTextContainer.classList.add('hidden');
      decodeImageContainer.classList.remove('hidden');
      decodedImgElement.src = dataUri;

      decodedImgElement.onload = () => {
        decodedImgDims.textContent = `${decodedImgElement.naturalWidth} x ${decodedImgElement.naturalHeight} px`;
        const approxBytes = Math.round((dataUri.length * 3) / 4);
        decodedImgSize.textContent = (approxBytes / 1024).toFixed(1) + ' KB';
      };

      decodedImgElement.onerror = () => {
        // Fallback to text if image fails to load
        decodeImageContainer.classList.add('hidden');
        decodeTextContainer.classList.remove('hidden');
        decodedTextarea.value = trimmed;
      };

      btnDownloadDecodedImg.onclick = () => {
        const a = document.createElement('a');
        a.download = `decoded-image-${Date.now()}.jpg`;
        a.href = dataUri;
        a.click();
        showToast('Decoded image downloaded!', 'success');
      };

      return;
    }

    // 2. URL Link
    if (/^(http|https):\/\/[^ "]+$/i.test(trimmed) || /^(www\.)[^ "]+$/i.test(trimmed)) {
      decodeTypeBadge.textContent = 'URL Link';
      decodeTypeBadge.className = 'badge badge-success';

      let fullUrl = trimmed;
      if (!/^https?:\/\//i.test(fullUrl)) {
        fullUrl = 'https://' + fullUrl;
      }

      decodeImageContainer.classList.add('hidden');
      decodeTextContainer.classList.remove('hidden');
      decodedTextarea.value = trimmed;
      btnOpenUrl.href = fullUrl;
      btnOpenUrl.classList.remove('hidden');
      return;
    }

    // 3. Plain Text
    decodeTypeBadge.textContent = 'Plain Text';
    decodeTypeBadge.className = 'badge badge-neutral';

    decodeImageContainer.classList.add('hidden');
    decodeTextContainer.classList.remove('hidden');
    decodedTextarea.value = trimmed;
    btnOpenUrl.classList.add('hidden');
  }

  btnCopyDecoded.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(decodedTextarea.value);
      showToast('Decoded text copied to clipboard!', 'success');
    } catch (e) {
      showToast('Failed to copy text', 'error');
    }
  });

  // Initial trigger
  updateTextMeta();

});
