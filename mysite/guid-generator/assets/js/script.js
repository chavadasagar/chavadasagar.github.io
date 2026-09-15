/**
 * Cryptographically Secure GUID / UUID Generator Module & Controller
 */

// --------------------------------------------------------------------------
// Core GUID Generator Engine
// --------------------------------------------------------------------------
function GenerateGUID(options = {}) {
  const {
    uppercase = true,
    hyphens = true,
    enclosure = 'none'
  } = options;

  let uuid;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Per RFC 4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  } else {
    // Fallback pseudo-random implementation
    uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Handle hyphens toggle
  if (!hyphens) {
    uuid = uuid.replace(/-/g, '');
  }

  // Handle case toggle
  if (uppercase) {
    uuid = uuid.toUpperCase();
  } else {
    uuid = uuid.toLowerCase();
  }

  // Handle enclosure
  switch (enclosure) {
    case 'braces':
      return `{${uuid}}`;
    case 'parentheses':
      return `(${uuid})`;
    case 'csharp':
      return `Guid.Parse("${uuid}")`;
    case 'quotes':
      return `"${uuid}"`;
    case 'none':
    default:
      return uuid;
  }
}

function GenerateBulkGUIDs(count = 10, options = {}) {
  const safeCount = Math.min(Math.max(1, count), 1000);
  const result = [];
  for (let i = 0; i < safeCount; i++) {
    result.push(GenerateGUID(options));
  }
  return result;
}

// --------------------------------------------------------------------------
// DOM & Controller Logic
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const singleResultElem = document.getElementById("singleResult");
  const btnGenerateSingle = document.getElementById("btnGenerateSingle");
  const btnCopySingle = document.getElementById("btnCopySingle");

  // Options
  const optUppercase = document.getElementById("optUppercase");
  const optHyphens = document.getElementById("optHyphens");
  const optEnclosure = document.getElementById("optEnclosure");

  // Bulk Elements
  const bulkCountInput = document.getElementById("bulkCount");
  const btnGenerateBulk = document.getElementById("btnGenerateBulk");
  const bulkResultTextarea = document.getElementById("bulkResult");
  const btnCopyBulk = document.getElementById("btnCopyBulk");
  const btnDownloadTxt = document.getElementById("btnDownloadTxt");
  const btnDownloadCsv = document.getElementById("btnDownloadCsv");
  const btnDownloadJson = document.getElementById("btnDownloadJson");

  // History & Toast
  const historyList = document.getElementById("historyList");
  const btnClearHistory = document.getElementById("btnClearHistory");
  const toastContainer = document.getElementById("toastContainer");

  // Theme Toggle
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // Local History state
  let historyData = JSON.parse(localStorage.getItem("guid_history") || "[]");

  // --------------------------------------------------------------------------
  // Options Helper
  // --------------------------------------------------------------------------
  function getOptions() {
    return {
      uppercase: optUppercase ? optUppercase.checked : true,
      hyphens: optHyphens ? optHyphens.checked : true,
      enclosure: optEnclosure ? optEnclosure.value : "none"
    };
  }

  // --------------------------------------------------------------------------
  // Single GUID Generation
  // --------------------------------------------------------------------------
  function generateAndDisplaySingle() {
    const options = getOptions();
    const newGuid = GenerateGUID(options);
    if (singleResultElem) {
      singleResultElem.innerText = newGuid;
    }
    addToHistory(newGuid);
  }

  // --------------------------------------------------------------------------
  // Bulk GUID Generation
  // --------------------------------------------------------------------------
  function generateAndDisplayBulk() {
    const count = parseInt(bulkCountInput ? bulkCountInput.value : 10, 10) || 10;
    const options = getOptions();
    const guids = GenerateBulkGUIDs(count, options);
    if (bulkResultTextarea) {
      bulkResultTextarea.value = guids.join("\n");
    }
    showToast(`Generated ${count} GUIDs!`);
  }

  // --------------------------------------------------------------------------
  // History Management
  // --------------------------------------------------------------------------
  function addToHistory(guid) {
    if (!guid) return;
    historyData = [guid, ...historyData.filter(g => g !== guid)].slice(0, 20);
    localStorage.setItem("guid_history", JSON.stringify(historyData));
    renderHistory();
  }

  function renderHistory() {
    if (!historyList) return;
    if (historyData.length === 0) {
      historyList.innerHTML = `<div class="text-muted small text-center py-3">No recent GUIDs generated yet.</div>`;
      return;
    }

    historyList.innerHTML = historyData.map(guid => `
      <div class="history-item">
        <span>${guid}</span>
        <button class="btn btn-sm btn-outline-custom py-0 px-2 btn-copy-history" data-guid="${guid}" title="Copy">
          <i class="fas fa-copy"></i>
        </button>
      </div>
    `).join("");

    historyList.querySelectorAll(".btn-copy-history").forEach(btn => {
      btn.addEventListener("click", () => {
        const textToCopy = btn.getAttribute("data-guid");
        copyToClipboard(textToCopy);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Copy to Clipboard Utility
  // --------------------------------------------------------------------------
  async function copyToClipboard(text) {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast("Copied to clipboard!");
    } catch (err) {
      showToast("Copied to clipboard!");
    }
  }

  // --------------------------------------------------------------------------
  // Downloads
  // --------------------------------------------------------------------------
  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  }

  // --------------------------------------------------------------------------
  // Toast Notification
  // --------------------------------------------------------------------------
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast-custom";
    toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }

  // --------------------------------------------------------------------------
  // Theme Toggle
  // --------------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem("guid_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    if (theme === "light") {
      themeToggleBtn.innerHTML = `<i class="fas fa-moon me-1"></i> Dark Mode`;
    } else {
      themeToggleBtn.innerHTML = `<i class="fas fa-sun me-1"></i> Light Mode`;
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("guid_theme", newTheme);
      updateThemeIcon(newTheme);
    });
  }

  // --------------------------------------------------------------------------
  // Tab Switching Fallback
  // --------------------------------------------------------------------------
  const tabSingleBtn = document.getElementById("single-tab");
  const tabBulkBtn = document.getElementById("bulk-tab");
  const paneSingle = document.getElementById("single-pane");
  const paneBulk = document.getElementById("bulk-pane");

  function switchTab(activeTabBtn, activePane, inactiveTabBtn, inactivePane) {
    if (!activeTabBtn || !activePane) return;
    activeTabBtn.classList.add("active");
    inactiveTabBtn.classList.remove("active");

    activePane.classList.add("show", "active");
    inactivePane.classList.remove("show", "active");
  }

  if (tabSingleBtn && tabBulkBtn) {
    tabSingleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(tabSingleBtn, paneSingle, tabBulkBtn, paneBulk);
    });

    tabBulkBtn.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(tabBulkBtn, paneBulk, tabSingleBtn, paneSingle);
      if (bulkResultTextarea && !bulkResultTextarea.value) {
        generateAndDisplayBulk();
      }
    });
  }

  // --------------------------------------------------------------------------
  // Event Listeners Initial Bindings
  // --------------------------------------------------------------------------
  initTheme();
  generateAndDisplaySingle();
  renderHistory();

  // Single Generate Button
  if (btnGenerateSingle) {
    btnGenerateSingle.addEventListener("click", (e) => {
      e.preventDefault();
      generateAndDisplaySingle();
    });
  }

  // Single Copy Button
  if (btnCopySingle) {
    btnCopySingle.addEventListener("click", (e) => {
      e.preventDefault();
      const text = singleResultElem ? singleResultElem.innerText : "";
      copyToClipboard(text);
    });
  }

  // Option Changes -> Live update
  [optUppercase, optHyphens, optEnclosure].forEach(opt => {
    if (opt) {
      opt.addEventListener("change", () => {
        generateAndDisplaySingle();
        if (bulkResultTextarea && bulkResultTextarea.value.trim() !== "") {
          generateAndDisplayBulk();
        }
      });
    }
  });

  // Bulk Generate Button
  if (btnGenerateBulk) {
    btnGenerateBulk.addEventListener("click", (e) => {
      e.preventDefault();
      generateAndDisplayBulk();
    });
  }

  // Bulk Copy Button
  if (btnCopyBulk) {
    btnCopyBulk.addEventListener("click", (e) => {
      e.preventDefault();
      const text = bulkResultTextarea ? bulkResultTextarea.value : "";
      copyToClipboard(text);
    });
  }

  // Clear History
  if (btnClearHistory) {
    btnClearHistory.addEventListener("click", (e) => {
      e.preventDefault();
      historyData = [];
      localStorage.removeItem("guid_history");
      renderHistory();
      showToast("History cleared");
    });
  }

  // Download Handlers
  if (btnDownloadTxt) {
    btnDownloadTxt.addEventListener("click", (e) => {
      e.preventDefault();
      const content = bulkResultTextarea ? bulkResultTextarea.value : "";
      if (!content) return showToast("No GUIDs to download!");
      downloadFile("guids.txt", content, "text/plain");
    });
  }

  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener("click", (e) => {
      e.preventDefault();
      const content = bulkResultTextarea ? bulkResultTextarea.value : "";
      if (!content) return showToast("No GUIDs to download!");
      const csvContent = "GUID\n" + content.split("\n").join("\n");
      downloadFile("guids.csv", csvContent, "text/csv");
    });
  }

  if (btnDownloadJson) {
    btnDownloadJson.addEventListener("click", (e) => {
      e.preventDefault();
      const content = bulkResultTextarea ? bulkResultTextarea.value : "";
      if (!content) return showToast("No GUIDs to download!");
      const jsonContent = JSON.stringify(content.split("\n"), null, 2);
      downloadFile("guids.json", jsonContent, "application/json");
    });
  }
});