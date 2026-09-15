/**
 * ==========================================================================
 * QR Code Studio v2 - Application Logic & Controllers
 * 100% Vanilla JavaScript - Zero CDN Dependencies
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. STATE & STORAGE MANAGEMENT
  // ==========================================================================
  const STATE = {
    activeTab: 'generate',
    currentType: 'url',
    qrData: null,
    dotStyle: 'square',
    ecc: 'M',
    exportSize: 600,
    fgColor: '#0f172a',
    bgColor: '#ffffff',
    logoImage: null,
    logoPreset: null,
    
    // Scanner State
    mediaStream: null,
    videoTrack: null,
    isScanning: false,
    isCameraPaused: false,
    facingMode: 'environment', // 'environment' (back) or 'user' (front)
    torchOn: false,
    hasTorch: false,
    lastScannedRaw: null,
    scanFrameId: null,
    lastScanTime: 0,
    
    // History State
    history: [],
    historyFilter: 'all'
  };

  const STORAGE_KEYS = {
    THEME: 'qr_studio_theme_v2',
    HISTORY: 'qr_studio_history_v2'
  };

  // Load History from localStorage
  try {
    const rawHist = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (rawHist) {
      STATE.history = JSON.parse(rawHist);
    }
  } catch (e) {
    STATE.history = [];
  }

  // ==========================================================================
  // 2. DOM REFERENCES
  // ==========================================================================
  const DOM = {
    html: document.documentElement,
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    
    // Tabs & Navigation
    desktopNavBtns: document.querySelectorAll('.desktop-nav .nav-tab-btn'),
    mobileNavBtns: document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item'),
    tabViews: document.querySelectorAll('.tab-view'),
    historyBadgeCount: document.getElementById('history-badge-count'),
    
    // Generator Controls
    typePills: document.querySelectorAll('.type-pill'),
    formBlocks: document.querySelectorAll('.form-type-block'),
    btnGenerateMain: document.getElementById('btn-generate-main'),
    previewCanvas: document.getElementById('qr-preview-canvas'),
    payloadPreviewText: document.getElementById('qr-payload-preview-text'),
    btnDownloadPng: document.getElementById('btn-download-png'),
    btnCopyImage: document.getElementById('btn-copy-image'),
    btnShareQr: document.getElementById('btn-share-qr'),
    
    // Form Inputs
    inputUrl: document.getElementById('input-url'),
    inputText: document.getElementById('input-text'),
    wifiSsid: document.getElementById('wifi-ssid'),
    wifiType: document.getElementById('wifi-type'),
    wifiPass: document.getElementById('wifi-password'),
    wifiPassGroup: document.getElementById('wifi-pass-group'),
    wifiHidden: document.getElementById('wifi-hidden'),
    btnToggleWifiPwd: document.getElementById('btn-toggle-wifi-pwd'),
    
    vcardFn: document.getElementById('vcard-fn'),
    vcardLn: document.getElementById('vcard-ln'),
    vcardTel: document.getElementById('vcard-tel'),
    vcardEmail: document.getElementById('vcard-email'),
    vcardOrg: document.getElementById('vcard-org'),
    vcardTitle: document.getElementById('vcard-title'),
    vcardUrl: document.getElementById('vcard-url'),
    
    emailTo: document.getElementById('email-to'),
    emailSubject: document.getElementById('email-subject'),
    emailBody: document.getElementById('email-body'),
    
    phoneMode: document.getElementById('phone-mode'),
    phoneNumber: document.getElementById('phone-number'),
    smsBody: document.getElementById('sms-body'),
    smsMsgGroup: document.getElementById('sms-msg-group'),
    
    upiId: document.getElementById('upi-id'),
    upiName: document.getElementById('upi-name'),
    upiAmount: document.getElementById('upi-amount'),
    upiNote: document.getElementById('upi-note'),
    
    geoLat: document.getElementById('geo-lat'),
    geoLng: document.getElementById('geo-lng'),
    btnUseLocation: document.getElementById('btn-use-current-location'),
    
    // Customization Inputs
    qrFgColor: document.getElementById('qr-fg-color'),
    qrBgColor: document.getElementById('qr-bg-color'),
    qrFgHex: document.getElementById('qr-fg-hex'),
    qrBgHex: document.getElementById('qr-bg-hex'),
    paletteBtns: document.querySelectorAll('.palette-btn'),
    shapeBtns: document.querySelectorAll('.shape-btn'),
    qrEccSelect: document.getElementById('qr-ecc'),
    qrSizeSelect: document.getElementById('qr-size-select'),
    logoFileInput: document.getElementById('logo-file-input'),
    logoUploadText: document.getElementById('logo-upload-text'),
    btnRemoveLogo: document.getElementById('btn-remove-logo'),
    iconPresetBtns: document.querySelectorAll('.icon-preset-btn'),
    
    // Scanner Elements
    scannerVideo: document.getElementById('scanner-video'),
    scannerOverlay: document.getElementById('scanner-overlay'),
    cameraControlsBar: document.getElementById('camera-controls-bar'),
    btnTorchToggle: document.getElementById('btn-torch-toggle'),
    btnCameraFlip: document.getElementById('btn-camera-flip'),
    btnCameraPause: document.getElementById('btn-camera-pause'),
    cameraFallbackScreen: document.getElementById('camera-fallback-screen'),
    fallbackTitle: document.getElementById('fallback-title'),
    fallbackDesc: document.getElementById('fallback-desc'),
    btnRequestCameraPerm: document.getElementById('btn-request-camera-perm'),
    
    // Scanner Upload Dropzone
    scanDropzone: document.getElementById('scan-dropzone'),
    scanFileInput: document.getElementById('scan-file-input'),
    dropzoneTrigger: document.getElementById('dropzone-trigger'),
    
    // Decoded Result Modal
    scanResultModal: document.getElementById('scan-result-modal'),
    modalTypeBadge: document.getElementById('modal-type-badge'),
    modalResultTitle: document.getElementById('modal-result-title'),
    structuredResultCard: document.getElementById('structured-result-card'),
    modalRawText: document.getElementById('modal-raw-text'),
    modalActionsContainer: document.getElementById('modal-actions-container'),
    btnCloseScanModal: document.getElementById('btn-close-scan-modal'),
    btnScanAgain: document.getElementById('btn-scan-again'),
    
    // History Elements
    historyItemsList: document.getElementById('history-items-list'),
    historyEmptyState: document.getElementById('history-empty-state'),
    historyFilterPills: document.querySelectorAll('.filter-pill'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    btnEmptyStartGen: document.getElementById('btn-empty-start-generate'),
    countAll: document.getElementById('count-all'),
    countGen: document.getElementById('count-generated'),
    countScan: document.getElementById('count-scanned'),
    
    // Confirmation Modal
    confirmModal: document.getElementById('confirm-modal'),
    confirmModalTitle: document.getElementById('confirm-modal-title'),
    confirmModalMsg: document.getElementById('confirm-modal-msg'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    btnConfirmOk: document.getElementById('btn-confirm-ok'),
    
    // Toast Notification
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toast-icon'),
    toastMsg: document.getElementById('toast-message')
  };

  let toastTimer = null;
  function showToast(message, icon = '✓') {
    if (toastTimer) clearTimeout(toastTimer);
    DOM.toastIcon.textContent = icon;
    DOM.toastMsg.textContent = message;
    DOM.toast.classList.add('show');
    toastTimer = setTimeout(() => {
      DOM.toast.classList.remove('show');
    }, 2400);
  }

  // ==========================================================================
  // 3. THEME CONTROLLER (Dark / Light)
  // ==========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) {
      DOM.html.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      DOM.html.setAttribute('data-theme', 'light');
    } else {
      DOM.html.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    const current = DOM.html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    DOM.html.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
    showToast(`Switched to ${next} theme`, next === 'dark' ? '🌙' : '☀️');
  }

  DOM.themeToggleBtn.addEventListener('click', toggleTheme);
  initTheme();

  // ==========================================================================
  // 4. TAB NAVIGATION CONTROLLER
  // ==========================================================================
  function switchTab(tabId) {
    STATE.activeTab = tabId;

    // Update Desktop Nav
    DOM.desktopNavBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update Mobile Nav
    DOM.mobileNavBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update Tab Panels
    DOM.tabViews.forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    // Scanner lifecycle
    if (tabId === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }

    // History lifecycle
    if (tabId === 'history') {
      renderHistoryList();
    }
  }

  DOM.desktopNavBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  DOM.mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  if (DOM.btnEmptyStartGen) {
    DOM.btnEmptyStartGen.addEventListener('click', () => switchTab('generate'));
  }

  // ==========================================================================
  // 5. GENERATOR LOGIC & PAYLOAD BUILDER
  // ==========================================================================

  // Switch Content Types
  DOM.typePills.forEach(pill => {
    pill.addEventListener('click', () => {
      DOM.typePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const type = pill.getAttribute('data-type');
      STATE.currentType = type;

      DOM.formBlocks.forEach(block => {
        block.classList.toggle('active', block.id === `form-${type}`);
      });

      triggerLiveGenerate();
    });
  });

  // Quick Chips for URL
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const fillVal = chip.getAttribute('data-fill');
      DOM.inputUrl.value = fillVal;
      DOM.inputUrl.focus();
      triggerLiveGenerate();
    });
  });

  // WiFi Security Toggle
  DOM.wifiType.addEventListener('change', () => {
    if (DOM.wifiType.value === 'nopass') {
      DOM.wifiPassGroup.style.display = 'none';
    } else {
      DOM.wifiPassGroup.style.display = 'block';
    }
    triggerLiveGenerate();
  });

  // WiFi Password Visibility Toggle
  DOM.btnToggleWifiPwd.addEventListener('click', () => {
    const isShowing = DOM.btnToggleWifiPwd.classList.toggle('showing');
    DOM.wifiPass.type = isShowing ? 'text' : 'password';
  });

  // Phone / SMS Mode Toggle
  DOM.phoneMode.addEventListener('change', () => {
    if (DOM.phoneMode.value === 'sms') {
      DOM.smsMsgGroup.style.display = 'block';
    } else {
      DOM.smsMsgGroup.style.display = 'none';
    }
    triggerLiveGenerate();
  });

  // Use GPS Location Button
  DOM.btnUseLocation.addEventListener('click', () => {
    if ('geolocation' in navigator) {
      DOM.btnUseLocation.disabled = true;
      DOM.btnUseLocation.querySelector('span').textContent = 'Acquiring GPS...';
      navigator.geolocation.getCurrentPosition(
        pos => {
          DOM.geoLat.value = pos.coords.latitude.toFixed(6);
          DOM.geoLng.value = pos.coords.longitude.toFixed(6);
          DOM.btnUseLocation.disabled = false;
          DOM.btnUseLocation.querySelector('span').textContent = 'Use My Current GPS Location';
          showToast('GPS coordinates updated!', '📍');
          triggerLiveGenerate();
        },
        err => {
          DOM.btnUseLocation.disabled = false;
          DOM.btnUseLocation.querySelector('span').textContent = 'Use My Current GPS Location';
          showToast('GPS permission denied or unavailable', '⚠️');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      showToast('Geolocation not supported by browser', '⚠️');
    }
  });

  // Color Pickers
  DOM.qrFgColor.addEventListener('input', (e) => {
    STATE.fgColor = e.target.value;
    DOM.qrFgHex.textContent = e.target.value.toUpperCase();
    triggerLiveGenerate();
  });

  DOM.qrBgColor.addEventListener('input', (e) => {
    STATE.bgColor = e.target.value;
    DOM.qrBgHex.textContent = e.target.value.toUpperCase();
    triggerLiveGenerate();
  });

  // Palette Presets
  DOM.paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const fg = btn.getAttribute('data-fg');
      const bg = btn.getAttribute('data-bg');
      STATE.fgColor = fg;
      STATE.bgColor = bg;
      DOM.qrFgColor.value = fg;
      DOM.qrBgColor.value = bg;
      DOM.qrFgHex.textContent = fg.toUpperCase();
      DOM.qrBgHex.textContent = bg.toUpperCase();
      triggerLiveGenerate();
    });
  });

  // Dot Shape Options
  DOM.shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.shapeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.dotStyle = btn.getAttribute('data-style');
      triggerLiveGenerate();
    });
  });

  // ECC & Size Selects
  DOM.qrEccSelect.addEventListener('change', (e) => {
    STATE.ecc = e.target.value;
    triggerLiveGenerate();
  });

  DOM.qrSizeSelect.addEventListener('change', (e) => {
    STATE.exportSize = parseInt(e.target.value, 10);
  });

  // Logo File Upload
  DOM.logoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          STATE.logoImage = img;
          STATE.logoPreset = null;
          DOM.logoUploadText.textContent = file.name.length > 18 ? file.name.slice(0, 15) + '...' : file.name;
          DOM.btnRemoveLogo.style.display = 'inline-block';
          // Boost ECC to H for maximum error resilience
          STATE.ecc = 'H';
          DOM.qrEccSelect.value = 'H';
          triggerLiveGenerate();
          showToast('Custom logo applied (ECC set to H)', '🖼️');
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Preset Emoji / Icon Badges
  DOM.iconPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.iconPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const emoji = btn.textContent.trim();
      STATE.logoPreset = emoji;

      // Render crisp canvas icon image
      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 128;
      iconCanvas.height = 128;
      const ictx = iconCanvas.getContext('2d');
      ictx.font = '72px sans-serif';
      ictx.textAlign = 'center';
      ictx.textBaseline = 'middle';
      ictx.fillText(emoji, 64, 68);

      const iconImg = new Image();
      iconImg.onload = () => {
        STATE.logoImage = iconImg;
        DOM.logoUploadText.textContent = `Icon: ${emoji}`;
        DOM.btnRemoveLogo.style.display = 'inline-block';
        STATE.ecc = 'H';
        DOM.qrEccSelect.value = 'H';
        triggerLiveGenerate();
      };
      iconImg.src = iconCanvas.toDataURL();
    });
  });

  // Remove Logo
  DOM.btnRemoveLogo.addEventListener('click', () => {
    STATE.logoImage = null;
    STATE.logoPreset = null;
    DOM.logoFileInput.value = '';
    DOM.logoUploadText.textContent = 'Upload Custom Logo';
    DOM.btnRemoveLogo.style.display = 'none';
    DOM.iconPresetBtns.forEach(b => b.classList.remove('active'));
    triggerLiveGenerate();
    showToast('Logo overlay removed', '🗑️');
  });

  /**
   * Build QR String from active inputs
   */
  function buildPayloadString() {
    switch (STATE.currentType) {
      case 'url': {
        let url = DOM.inputUrl.value.trim();
        if (url && !/^https?:\/\//i.test(url) && !url.startsWith('/')) {
          url = 'https://' + url;
        }
        return url || 'https://google.com';
      }
      case 'text':
        return DOM.inputText.value.trim() || 'Hello from QR Studio!';
      case 'wifi': {
        const ssid = DOM.wifiSsid.value.trim() || 'MyNetwork';
        const type = DOM.wifiType.value;
        const pass = DOM.wifiPass.value;
        const hidden = DOM.wifiHidden.checked;
        return `WIFI:T:${type};S:${ssid};P:${type === 'nopass' ? '' : pass};H:${hidden};;`;
      }
      case 'vcard': {
        const fn = DOM.vcardFn.value.trim() || 'John';
        const ln = DOM.vcardLn.value.trim() || 'Doe';
        const tel = DOM.vcardTel.value.trim() || '+1000000000';
        const email = DOM.vcardEmail.value.trim();
        const org = DOM.vcardOrg.value.trim();
        const title = DOM.vcardTitle.value.trim();
        const url = DOM.vcardUrl.value.trim();

        let vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${fn};;;\nFN:${fn} ${ln}\nTEL;TYPE=CELL:${tel}`;
        if (email) vcard += `\nEMAIL:${email}`;
        if (org) vcard += `\nORG:${org}`;
        if (title) vcard += `\nTITLE:${title}`;
        if (url) vcard += `\nURL:${url}`;
        vcard += '\nEND:VCARD';
        return vcard;
      }
      case 'email': {
        const to = DOM.emailTo.value.trim() || 'hello@example.com';
        const subj = encodeURIComponent(DOM.emailSubject.value.trim());
        const body = encodeURIComponent(DOM.emailBody.value.trim());
        let str = `mailto:${to}`;
        const params = [];
        if (subj) params.push(`subject=${subj}`);
        if (body) params.push(`body=${body}`);
        if (params.length > 0) str += `?${params.join('&')}`;
        return str;
      }
      case 'phone': {
        const num = DOM.phoneNumber.value.trim() || '+1234567890';
        if (DOM.phoneMode.value === 'sms') {
          const body = DOM.smsBody.value.trim();
          return `smsto:${num}${body ? ':' + body : ''}`;
        }
        return `tel:${num}`;
      }
      case 'upi': {
        const vpa = DOM.upiId.value.trim() || 'merchant@upi';
        const name = encodeURIComponent(DOM.upiName.value.trim() || 'Store');
        const am = DOM.upiAmount.value.trim();
        const note = encodeURIComponent(DOM.upiNote.value.trim());
        let str = `upi://pay?pa=${vpa}&pn=${name}&cu=INR`;
        if (am) str += `&am=${am}`;
        if (note) str += `&tn=${note}`;
        return str;
      }
      case 'geo': {
        const lat = DOM.geoLat.value.trim() || '37.7749';
        const lng = DOM.geoLng.value.trim() || '-122.4194';
        return `geo:${lat},${lng}`;
      }
      default:
        return 'https://google.com';
    }
  }

  // Real-Time Debounce Generation
  let liveGenTimer = null;
  function triggerLiveGenerate() {
    if (liveGenTimer) clearTimeout(liveGenTimer);
    liveGenTimer = setTimeout(renderQRPreview, 60);
  }

  // Attach live input listeners to all form inputs
  const allFormInputs = [
    DOM.inputUrl, DOM.inputText, DOM.wifiSsid, DOM.wifiPass, DOM.wifiHidden,
    DOM.vcardFn, DOM.vcardLn, DOM.vcardTel, DOM.vcardEmail, DOM.vcardOrg, DOM.vcardTitle, DOM.vcardUrl,
    DOM.emailTo, DOM.emailSubject, DOM.emailBody, DOM.phoneNumber, DOM.smsBody,
    DOM.upiId, DOM.upiName, DOM.upiAmount, DOM.upiNote, DOM.geoLat, DOM.geoLng
  ];
  allFormInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', triggerLiveGenerate);
    }
  });

  /**
   * Render QR Code to Live Preview Canvas
   */
  function renderQRPreview() {
    const payload = buildPayloadString();
    DOM.payloadPreviewText.textContent = payload.length > 50 ? payload.slice(0, 48) + '...' : payload;
    DOM.payloadPreviewText.title = payload;

    try {
      const qrMatrix = QREngine.generateMatrix(payload, STATE.ecc);
      STATE.qrData = qrMatrix;

      QREngine.renderToCanvas(qrMatrix, DOM.previewCanvas, {
        size: 360,
        margin: 2,
        dotStyle: STATE.dotStyle,
        fgColor: STATE.fgColor,
        bgColor: STATE.bgColor,
        logoImage: STATE.logoImage,
        logoSize: 0.22,
        logoShape: 'circle',
        logoBgColor: STATE.bgColor === 'transparent' ? '#ffffff' : STATE.bgColor
      });
    } catch (err) {
      console.error('QR Render Error:', err);
    }
  }

  // Large Primary Generate & Refresh Button
  DOM.btnGenerateMain.addEventListener('click', () => {
    renderQRPreview();
    const payload = buildPayloadString();
    addToHistory('generated', STATE.currentType, payload, DOM.previewCanvas);
    showToast('QR Code refreshed & saved to history!', '✨');
  });

  // Download High-Res PNG Action
  DOM.btnDownloadPng.addEventListener('click', () => {
    const payload = buildPayloadString();
    const exportCanvas = document.createElement('canvas');
    const size = STATE.exportSize || 600;

    const qrMatrix = QREngine.generateMatrix(payload, STATE.ecc);
    QREngine.renderToCanvas(qrMatrix, exportCanvas, {
      size: size,
      margin: 3,
      dotStyle: STATE.dotStyle,
      fgColor: STATE.fgColor,
      bgColor: STATE.bgColor,
      logoImage: STATE.logoImage,
      logoSize: 0.22,
      logoShape: 'circle',
      logoBgColor: STATE.bgColor === 'transparent' ? '#ffffff' : STATE.bgColor
    });

    const link = document.createElement('a');
    link.download = `qrcode_${STATE.currentType}_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToHistory('generated', STATE.currentType, payload, exportCanvas);
    showToast(`Downloaded PNG (${size}x${size}px)`, '📥');
  });

  // Copy Image to Clipboard Action
  DOM.btnCopyImage.addEventListener('click', async () => {
    try {
      DOM.previewCanvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('QR Image copied to clipboard!', '📋');
        } else {
          showToast('Clipboard image copy not supported in this browser', '⚠️');
        }
      });
    } catch (e) {
      showToast('Could not copy image to clipboard', '⚠️');
    }
  });

  // Share QR Action
  DOM.btnShareQr.addEventListener('click', async () => {
    const payload = buildPayloadString();
    if (navigator.share) {
      try {
        DOM.previewCanvas.toBlob(async (blob) => {
          const file = new File([blob], 'qrcode.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'QR Code Studio',
              text: payload,
              files: [file]
            });
          } else {
            await navigator.share({
              title: 'QR Code Studio',
              text: payload
            });
          }
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast('Sharing failed or cancelled', '⚠️');
        }
      }
    } else {
      // Fallback copy text
      navigator.clipboard.writeText(payload);
      showToast('Payload copied to clipboard!', '📋');
    }
  });

  // Initialize First QR Render
  renderQRPreview();


  // ==========================================================================
  // 6. LIVE CAMERA SCANNER CONTROLLER
  // ==========================================================================

  async function startCamera() {
    if (STATE.mediaStream) return; // Already active

    DOM.cameraFallbackScreen.style.display = 'none';
    STATE.isCameraPaused = false;
    DOM.btnCameraPause.querySelector('.pause-icon').style.display = 'block';
    DOM.btnCameraPause.querySelector('.play-icon').style.display = 'none';

    try {
      const constraints = {
        video: {
          facingMode: { ideal: STATE.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      STATE.mediaStream = stream;
      DOM.scannerVideo.srcObject = stream;
      await DOM.scannerVideo.play();

      const tracks = stream.getVideoTracks();
      if (tracks.length > 0) {
        STATE.videoTrack = tracks[0];
        // Check torch capabilities
        const caps = STATE.videoTrack.getCapabilities ? STATE.videoTrack.getCapabilities() : {};
        if (caps.torch) {
          STATE.hasTorch = true;
          DOM.btnTorchToggle.style.display = 'flex';
        } else {
          STATE.hasTorch = false;
          DOM.btnTorchToggle.style.display = 'none';
        }
      }

      STATE.isScanning = true;
      requestScanFrame();
    } catch (err) {
      console.warn('Camera Access Error:', err);
      handleCameraFailure(err);
    }
  }

  function stopCamera() {
    STATE.isScanning = false;
    if (STATE.scanFrameId) {
      cancelAnimationFrame(STATE.scanFrameId);
      STATE.scanFrameId = null;
    }
    if (STATE.mediaStream) {
      STATE.mediaStream.getTracks().forEach(track => track.stop());
      STATE.mediaStream = null;
      STATE.videoTrack = null;
    }
    DOM.scannerVideo.srcObject = null;
    STATE.torchOn = false;
    DOM.btnTorchToggle.classList.remove('active');
  }

  function handleCameraFailure(err) {
    DOM.cameraFallbackScreen.style.display = 'flex';
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      DOM.fallbackTitle.textContent = 'Camera Permission Denied';
      DOM.fallbackDesc.textContent = 'Please allow camera access in your browser settings to use the live QR scanner, or upload an image below.';
      DOM.btnRequestCameraPerm.style.display = 'inline-flex';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      DOM.fallbackTitle.textContent = 'No Camera Detected';
      DOM.fallbackDesc.textContent = 'No camera device was found on your system. You can scan QR codes by uploading images or pasting from clipboard.';
      DOM.btnRequestCameraPerm.style.display = 'none';
    } else {
      DOM.fallbackTitle.textContent = 'Camera Unavailable';
      DOM.fallbackDesc.textContent = 'Could not access the camera. You can upload any QR image below to scan it instantly.';
      DOM.btnRequestCameraPerm.style.display = 'inline-flex';
    }
  }

  DOM.btnRequestCameraPerm.addEventListener('click', () => {
    startCamera();
  });

  // Camera Flip / Switch (Back <-> Front)
  DOM.btnCameraFlip.addEventListener('click', async () => {
    STATE.facingMode = (STATE.facingMode === 'environment') ? 'user' : 'environment';
    stopCamera();
    await startCamera();
    showToast(`Switched to ${STATE.facingMode === 'environment' ? 'Rear' : 'Front'} Camera`, '🔄');
  });

  // Torch / Flashlight Toggle
  DOM.btnTorchToggle.addEventListener('click', async () => {
    if (!STATE.videoTrack || !STATE.hasTorch) {
      showToast('Torch not available on this camera', '⚠️');
      return;
    }
    try {
      STATE.torchOn = !STATE.torchOn;
      await STATE.videoTrack.applyConstraints({
        advanced: [{ torch: STATE.torchOn }]
      });
      DOM.btnTorchToggle.classList.toggle('active', STATE.torchOn);
      showToast(STATE.torchOn ? 'Flashlight turned ON' : 'Flashlight turned OFF', '🔦');
    } catch (e) {
      showToast('Could not toggle torch', '⚠️');
    }
  });

  // Camera Pause / Resume Toggle
  DOM.btnCameraPause.addEventListener('click', () => {
    STATE.isCameraPaused = !STATE.isCameraPaused;
    if (STATE.isCameraPaused) {
      DOM.scannerVideo.pause();
      DOM.btnCameraPause.querySelector('.pause-icon').style.display = 'none';
      DOM.btnCameraPause.querySelector('.play-icon').style.display = 'block';
      showToast('Scanner paused', '⏸️');
    } else {
      DOM.scannerVideo.play();
      DOM.btnCameraPause.querySelector('.pause-icon').style.display = 'block';
      DOM.btnCameraPause.querySelector('.play-icon').style.display = 'none';
      requestScanFrame();
      showToast('Scanner resumed', '▶️');
    }
  });

  // Audio Chime Synthesizer (Zero Audio Files Needed)
  function playScanBeep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // A6 chirp

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // Scan Processing Loop with requestAnimationFrame
  async function requestScanFrame() {
    if (!STATE.isScanning || STATE.isCameraPaused) return;

    const now = performance.now();
    // Scan every ~130ms to maintain 60fps UI responsiveness without CPU throttle
    if (now - STATE.lastScanTime > 130 && DOM.scannerVideo.readyState >= 2) {
      STATE.lastScanTime = now;
      try {
        const result = await QREngine.decodeImage(DOM.scannerVideo);
        if (result && result.rawValue && result.rawValue.trim().length > 0) {
          handleScanSuccess(result.rawValue);
          return; // Stop scan loop while result modal is open
        }
      } catch (err) {}
    }

    STATE.scanFrameId = requestAnimationFrame(requestScanFrame);
  }

  function handleScanSuccess(rawDecodedText) {
    playScanBeep();
    if (navigator.vibrate) {
      navigator.vibrate([45, 30, 45]);
    }

    STATE.lastScannedRaw = rawDecodedText;
    const classified = classifyPayload(rawDecodedText);

    // Save to History
    addToHistory('scanned', classified.type, rawDecodedText);

    // Pause Scanner & Present Modal
    DOM.scannerVideo.pause();
    STATE.isCameraPaused = true;
    DOM.btnCameraPause.querySelector('.pause-icon').style.display = 'none';
    DOM.btnCameraPause.querySelector('.play-icon').style.display = 'block';

    openScanResultModal(classified, rawDecodedText);
  }

  // ==========================================================================
  // 7. IMAGE UPLOAD & CLIPBOARD DROP SCANNER
  // ==========================================================================
  
  DOM.dropzoneTrigger.addEventListener('click', () => {
    DOM.scanFileInput.click();
  });

  DOM.scanFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) decodeImageFile(file);
  });

  // Drag & Drop
  DOM.scanDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.scanDropzone.classList.add('drag-over');
  });

  DOM.scanDropzone.addEventListener('dragleave', () => {
    DOM.scanDropzone.classList.remove('drag-over');
  });

  DOM.scanDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.scanDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      decodeImageFile(e.dataTransfer.files[0]);
    }
  });

  // Global Clipboard Paste (Ctrl+V anywhere in app)
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData ? e.clipboardData.items : [];
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          decodeImageFile(blob);
          showToast('Image pasted from clipboard!', '📋');
          break;
        }
      }
    }
  });

  async function decodeImageFile(file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = async () => {
        showToast('Analyzing image...', '🔍');
        const result = await QREngine.decodeImage(img);
        if (result && result.rawValue) {
          handleScanSuccess(result.rawValue);
        } else {
          showToast('No valid QR code found in this image', '❌');
        }
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ==========================================================================
  // 8. DECODED RESULT MODAL & PAYLOAD CLASSIFIER
  // ==========================================================================

  function classifyPayload(raw) {
    const text = raw.trim();

    // 1. Wi-Fi: WIFI:T:WPA;S:MySSID;P:Pass;H:false;;
    if (/^WIFI:/i.test(text)) {
      const ssidMatch = text.match(/S:([^;]+)/i);
      const typeMatch = text.match(/T:([^;]+)/i);
      const passMatch = text.match(/P:([^;]+)/i);
      const hiddenMatch = text.match(/H:([^;]+)/i);
      return {
        type: 'wifi',
        label: 'Wi-Fi Network',
        icon: '📶',
        fields: [
          { name: 'SSID / Network', val: ssidMatch ? ssidMatch[1] : 'Unknown' },
          { name: 'Security', val: typeMatch ? typeMatch[1] : 'WPA' },
          { name: 'Password', val: passMatch ? passMatch[1] : '(None / Open)' },
          { name: 'Hidden SSID', val: hiddenMatch && hiddenMatch[1] === 'true' ? 'Yes' : 'No' }
        ],
        wifiPassword: passMatch ? passMatch[1] : ''
      };
    }

    // 2. vCard Contact: BEGIN:VCARD ... END:VCARD
    if (/BEGIN:VCARD/i.test(text)) {
      const fnMatch = text.match(/FN:([^\r\n]+)/i);
      const telMatch = text.match(/TEL[^:]*:([^\r\n]+)/i);
      const emailMatch = text.match(/EMAIL[^:]*:([^\r\n]+)/i);
      const orgMatch = text.match(/ORG:([^\r\n]+)/i);
      const titleMatch = text.match(/TITLE:([^\r\n]+)/i);
      const urlMatch = text.match(/URL:([^\r\n]+)/i);

      return {
        type: 'vcard',
        label: 'Contact Card (vCard)',
        icon: '👤',
        fields: [
          { name: 'Full Name', val: fnMatch ? fnMatch[1] : 'Contact' },
          { name: 'Phone', val: telMatch ? telMatch[1] : '' },
          { name: 'Email', val: emailMatch ? emailMatch[1] : '' },
          { name: 'Organization', val: orgMatch ? orgMatch[1] : '' },
          { name: 'Job Title', val: titleMatch ? titleMatch[1] : '' },
          { name: 'Website', val: urlMatch ? urlMatch[1] : '' }
        ].filter(f => f.val),
        contactTel: telMatch ? telMatch[1] : '',
        contactName: fnMatch ? fnMatch[1] : 'Contact'
      };
    }

    // 3. URL Link
    if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) {
      const fullUrl = text.startsWith('http') ? text : `https://${text}`;
      let domain = '';
      try {
        domain = new URL(fullUrl).hostname;
      } catch (e) { domain = fullUrl; }

      return {
        type: 'url',
        label: 'Website Link',
        icon: '🌐',
        url: fullUrl,
        fields: [
          { name: 'Target URL', val: fullUrl },
          { name: 'Domain Host', val: domain }
        ]
      };
    }

    // 4. UPI Payment
    if (/^upi:\/\/pay/i.test(text)) {
      const vpaMatch = text.match(/[?&]pa=([^&]+)/i);
      const nameMatch = text.match(/[?&]pn=([^&]+)/i);
      const amMatch = text.match(/[?&]am=([^&]+)/i);
      const noteMatch = text.match(/[?&]tn=([^&]+)/i);

      return {
        type: 'upi',
        label: 'UPI Payment',
        icon: '💳',
        fields: [
          { name: 'UPI ID / VPA', val: vpaMatch ? decodeURIComponent(vpaMatch[1]) : '' },
          { name: 'Payee Name', val: nameMatch ? decodeURIComponent(nameMatch[1]) : '' },
          { name: 'Amount (INR)', val: amMatch ? `₹${decodeURIComponent(amMatch[1])}` : 'Flexible' },
          { name: 'Note', val: noteMatch ? decodeURIComponent(noteMatch[1]) : '' }
        ].filter(f => f.val)
      };
    }

    // 5. Email: mailto:
    if (/^mailto:/i.test(text)) {
      const address = text.replace(/^mailto:/i, '').split('?')[0];
      const subjMatch = text.match(/[?&]subject=([^&]+)/i);
      return {
        type: 'email',
        label: 'Email Action',
        icon: '✉️',
        emailTo: address,
        fields: [
          { name: 'Recipient Email', val: address },
          { name: 'Subject', val: subjMatch ? decodeURIComponent(subjMatch[1]) : '(No subject)' }
        ]
      };
    }

    // 6. Phone: tel: or smsto:
    if (/^tel:/i.test(text) || /^smsto:/i.test(text)) {
      const isSms = /^smsto:/i.test(text);
      const num = text.replace(/^(tel|smsto):/i, '').split(':')[0];
      return {
        type: 'phone',
        label: isSms ? 'SMS Message' : 'Phone Call',
        icon: isSms ? '💬' : '📞',
        phoneNumber: num,
        fields: [
          { name: 'Phone Number', val: num },
          { name: 'Action', val: isSms ? 'Send Text SMS' : 'Direct Dial' }
        ]
      };
    }

    // 7. Geo Location: geo:lat,lng
    if (/^geo:/i.test(text)) {
      const coords = text.replace(/^geo:/i, '').split('?')[0];
      return {
        type: 'geo',
        label: 'GPS Location',
        icon: '📍',
        coords: coords,
        fields: [
          { name: 'Coordinates', val: coords }
        ]
      };
    }

    // 8. Plain Text
    return {
      type: 'text',
      label: 'Plain Text Message',
      icon: '📝',
      fields: [
        { name: 'Character Count', val: `${text.length} chars` }
      ]
    };
  }

  function openScanResultModal(classified, raw) {
    DOM.modalTypeBadge.textContent = `${classified.icon} ${classified.label}`;
    DOM.modalRawText.textContent = raw;

    // Build Structured Fields HTML
    let structHtml = '';
    if (classified.fields && classified.fields.length > 0) {
      classified.fields.forEach(f => {
        structHtml += `
          <div class="result-field-row">
            <span class="field-name">${escapeHtml(f.name)}</span>
            <span class="field-value">${escapeHtml(f.val)}</span>
          </div>
        `;
      });
    }
    DOM.structuredResultCard.innerHTML = structHtml;

    // Build Action Buttons
    let actionsHtml = '';

    if (classified.type === 'url') {
      actionsHtml += `
        <a href="${escapeHtml(classified.url)}" target="_blank" rel="noopener" class="btn-modal-action primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"></path></svg>
          <span>Open Link</span>
        </a>
      `;
    } else if (classified.type === 'wifi' && classified.wifiPassword) {
      actionsHtml += `
        <button type="button" class="btn-modal-action primary" id="btn-copy-wifi-pwd">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy Password</span>
        </button>
      `;
    } else if (classified.type === 'phone' && classified.phoneNumber) {
      actionsHtml += `
        <a href="tel:${escapeHtml(classified.phoneNumber)}" class="btn-modal-action primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          <span>Call Now</span>
        </a>
      `;
    } else if (classified.type === 'email' && classified.emailTo) {
      actionsHtml += `
        <a href="${escapeHtml(raw)}" class="btn-modal-action primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          <span>Send Email</span>
        </a>
      `;
    } else if (classified.type === 'vcard') {
      actionsHtml += `
        <button type="button" class="btn-modal-action primary" id="btn-save-vcf">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
          <span>Download .vcf</span>
        </button>
      `;
    } else if (classified.type === 'geo' && classified.coords) {
      actionsHtml += `
        <a href="https://maps.google.com/?q=${encodeURIComponent(classified.coords)}" target="_blank" rel="noopener" class="btn-modal-action primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <span>Open in Google Maps</span>
        </a>
      `;
    }

    // Universal Copy Raw Text Button
    actionsHtml += `
      <button type="button" class="btn-modal-action" id="btn-copy-modal-raw">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>Copy Payload</span>
      </button>
    `;

    // Universal Share Button
    actionsHtml += `
      <button type="button" class="btn-modal-action" id="btn-share-modal-raw">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
        <span>Share</span>
      </button>
    `;

    DOM.modalActionsContainer.innerHTML = actionsHtml;

    // Attach Action Listeners
    const btnCopyRaw = document.getElementById('btn-copy-modal-raw');
    if (btnCopyRaw) {
      btnCopyRaw.addEventListener('click', () => {
        navigator.clipboard.writeText(raw);
        showToast('Payload copied to clipboard!', '📋');
      });
    }

    const btnShareRaw = document.getElementById('btn-share-modal-raw');
    if (btnShareRaw) {
      btnShareRaw.addEventListener('click', () => {
        if (navigator.share) {
          navigator.share({ title: 'QR Code Result', text: raw }).catch(() => {});
        } else {
          navigator.clipboard.writeText(raw);
          showToast('Copied to clipboard!', '📋');
        }
      });
    }

    const btnCopyWifi = document.getElementById('btn-copy-wifi-pwd');
    if (btnCopyWifi && classified.wifiPassword) {
      btnCopyWifi.addEventListener('click', () => {
        navigator.clipboard.writeText(classified.wifiPassword);
        showToast('WiFi password copied!', '🔑');
      });
    }

    const btnSaveVcf = document.getElementById('btn-save-vcf');
    if (btnSaveVcf) {
      btnSaveVcf.addEventListener('click', () => {
        const blob = new Blob([raw], { type: 'text/vcard;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${(classified.contactName || 'contact').replace(/\s+/g, '_')}.vcf`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Contact .vcf downloaded!', '👤');
      });
    }

    DOM.scanResultModal.style.display = 'flex';
  }

  function closeScanResultModal() {
    DOM.scanResultModal.style.display = 'none';
    if (STATE.activeTab === 'scan') {
      STATE.isCameraPaused = false;
      DOM.scannerVideo.play();
      DOM.btnCameraPause.querySelector('.pause-icon').style.display = 'block';
      DOM.btnCameraPause.querySelector('.play-icon').style.display = 'none';
      requestScanFrame();
    }
  }

  DOM.btnCloseScanModal.addEventListener('click', closeScanResultModal);
  DOM.btnScanAgain.addEventListener('click', closeScanResultModal);


  // ==========================================================================
  // 9. HISTORY MANAGER (Local Storage - Max 20 Items)
  // ==========================================================================

  function addToHistory(kind, contentType, payload, canvasSource = null) {
    if (!payload || !payload.trim()) return;

    // Generate small thumbnail dataUrl if canvas available
    let thumbDataUrl = null;
    if (canvasSource) {
      const thumb = document.createElement('canvas');
      thumb.width = 64;
      thumb.height = 64;
      const tctx = thumb.getContext('2d');
      tctx.drawImage(canvasSource, 0, 0, 64, 64);
      thumbDataUrl = thumb.toDataURL('image/png');
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      kind: kind, // 'generated' or 'scanned'
      contentType: contentType,
      payload: payload,
      timestamp: Date.now(),
      thumb: thumbDataUrl
    };

    // Remove existing identical payload to avoid duplicate spam
    STATE.history = STATE.history.filter(item => item.payload !== payload);

    // Insert at front
    STATE.history.unshift(entry);

    // Keep max 20 items
    if (STATE.history.length > 20) {
      STATE.history = STATE.history.slice(0, 20);
    }

    // Save to LocalStorage
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(STATE.history));
    } catch (e) {}

    updateHistoryBadge();
    if (STATE.activeTab === 'history') {
      renderHistoryList();
    }
  }

  function updateHistoryBadge() {
    const count = STATE.history.length;
    DOM.historyBadgeCount.textContent = count;
    DOM.countAll.textContent = count;
    DOM.countGen.textContent = STATE.history.filter(h => h.kind === 'generated').length;
    DOM.countScan.textContent = STATE.history.filter(h => h.kind === 'scanned').length;
  }

  function renderHistoryList() {
    updateHistoryBadge();

    const filtered = STATE.history.filter(item => {
      if (STATE.historyFilter === 'all') return true;
      return item.kind === STATE.historyFilter;
    });

    if (filtered.length === 0) {
      DOM.historyItemsList.innerHTML = '';
      DOM.historyEmptyState.style.display = 'flex';
      return;
    }

    DOM.historyEmptyState.style.display = 'none';

    let html = '';
    filtered.forEach(item => {
      const dateStr = formatRelativeTime(item.timestamp);
      const isGen = item.kind === 'generated';

      html += `
        <div class="history-item-card" data-id="${item.id}">
          <div class="history-item-left">
            <div class="history-thumb">
              ${item.thumb ? `<img src="${item.thumb}" alt="QR Thumbnail">` : `<span>${isGen ? '✨' : '📷'}</span>`}
            </div>
            <div class="history-meta">
              <div class="history-tags-row">
                <span class="tag-kind ${item.kind}">${item.kind}</span>
                <span class="tag-type">${escapeHtml(item.contentType.toUpperCase())}</span>
                <span class="history-time">&bull; ${dateStr}</span>
              </div>
              <div class="history-text" title="${escapeHtml(item.payload)}">${escapeHtml(item.payload)}</div>
            </div>
          </div>
          <div class="history-actions">
            <button type="button" class="btn-history-action btn-hist-view" data-id="${item.id}" title="View / Open">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button type="button" class="btn-history-action btn-hist-copy" data-id="${item.id}" title="Copy Text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button type="button" class="btn-history-action btn-hist-dl" data-id="${item.id}" title="Download QR PNG">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
            </button>
            <button type="button" class="btn-history-action btn-del btn-hist-del" data-id="${item.id}" title="Delete Item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    });

    DOM.historyItemsList.innerHTML = html;

    // Attach Item Action Listeners
    DOM.historyItemsList.querySelectorAll('.btn-hist-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = STATE.history.find(h => h.id === id);
        if (item) {
          const classified = classifyPayload(item.payload);
          openScanResultModal(classified, item.payload);
        }
      });
    });

    DOM.historyItemsList.querySelectorAll('.btn-hist-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = STATE.history.find(h => h.id === id);
        if (item) {
          navigator.clipboard.writeText(item.payload);
          showToast('Copied to clipboard!', '📋');
        }
      });
    });

    DOM.historyItemsList.querySelectorAll('.btn-hist-dl').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = STATE.history.find(h => h.id === id);
        if (item) {
          const exportCanvas = document.createElement('canvas');
          const qrMatrix = QREngine.generateMatrix(item.payload, 'M');
          QREngine.renderToCanvas(qrMatrix, exportCanvas, { size: 600, margin: 2 });
          const link = document.createElement('a');
          link.download = `qrcode_${item.contentType}_${Date.now()}.png`;
          link.href = exportCanvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast('Downloaded PNG!', '📥');
        }
      });
    });

    DOM.historyItemsList.querySelectorAll('.btn-hist-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteHistoryItem(id);
      });
    });
  }

  function deleteHistoryItem(id) {
    STATE.history = STATE.history.filter(h => h.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(STATE.history));
    } catch (e) {}
    renderHistoryList();
    showToast('Item deleted from history', '🗑️');
  }

  // History Filter Tabs
  DOM.historyFilterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      DOM.historyFilterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      STATE.historyFilter = pill.getAttribute('data-filter');
      renderHistoryList();
    });
  });

  // Clear All History with Confirmation
  DOM.btnClearHistory.addEventListener('click', () => {
    if (STATE.history.length === 0) {
      showToast('History is already empty', 'ℹ️');
      return;
    }
    DOM.confirmModal.style.display = 'flex';
  });

  DOM.btnConfirmCancel.addEventListener('click', () => {
    DOM.confirmModal.style.display = 'none';
  });

  DOM.btnConfirmOk.addEventListener('click', () => {
    STATE.history = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {}
    DOM.confirmModal.style.display = 'none';
    renderHistoryList();
    showToast('All history cleared', '🗑️');
  });

  // ==========================================================================
  // 10. UTILITY FUNCTIONS
  // ==========================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatRelativeTime(timestamp) {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  // Initial update
  updateHistoryBadge();

});
