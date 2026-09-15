/**
 * Modern LocalStorage Image Manager Engine
 * Features: Base64 conversion, LocalStorage persistence, filtering, search, modal preview, & storage usage monitoring.
 */

// Storage Limits (~5MB is standard browser limit for LocalStorage)
const MAX_STORAGE_BYTES = 5 * 1024 * 1024;
let pendingQueue = []; // array of { tempId, info, data }

// Initialize app on DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  updateStorageUsage();
  renderGallery();
  setupDragAndDrop();
  setupClipboardPaste();
  setupKeyboardShortcuts();
  setupSearchAndFilter();
  initTheme();
}

/* Theme Toggle Support */
function initTheme() {
  const savedTheme = localStorage.getItem("app_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const themeIcon = document.getElementById("themeIcon");
  if (themeIcon) {
    themeIcon.className = savedTheme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("app_theme", newTheme);
  
  const themeIcon = document.getElementById("themeIcon");
  if (themeIcon) {
    themeIcon.className = newTheme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
  }
}

/* Drag & Drop Handling */
function setupDragAndDrop() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");

  if (!dropzone || !fileInput) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  });
}

/* Clipboard Paste Support (Ctrl+V) */
function setupClipboardPaste() {
  document.addEventListener("paste", (e) => {
    const items = e.clipboardData ? e.clipboardData.items : [];
    const pastedFiles = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          const renamedFile = new File([file], file.name === "image.png" ? `Pasted_Image_${Date.now()}.png` : file.name, { type: file.type });
          pastedFiles.push(renamedFile);
        }
      }
    }

    if (pastedFiles.length > 0) {
      // Switch to upload tab if not active
      const uploadTab = document.getElementById("upload-tab");
      if (uploadTab) {
        const bsTab = new bootstrap.Tab(uploadTab);
        bsTab.show();
      }

      handleFileSelect(pastedFiles);
      showToast(`Pasted ${pastedFiles.length} image(s) from clipboard!`, "success");
    }
  });
}

/* Keyboard Shortcuts Engine (Ctrl+A for Select All) */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Detect Ctrl+A or Cmd+A (Mac)
    if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      const isEditable = document.activeElement ? document.activeElement.isContentEditable : false;

      // Do not hijack Ctrl+A if user is typing inside an input box or text area
      if (activeTag === "input" || activeTag === "textarea" || isEditable) {
        return;
      }

      const files = GetAllFiles();
      if (files.length > 0) {
        e.preventDefault(); // Stop default browser text selection
        
        // Auto-switch to Gallery tab if not active
        const galleryTab = document.getElementById("allfiles-tab");
        if (galleryTab) {
          const bsTab = new bootstrap.Tab(galleryTab);
          bsTab.show();
        }

        toggleSelectAll(true);
        showToast(`Selected all ${files.length} image(s) (Ctrl+A)`, "info");
      }
    }
  });
}

function handleFileSelect(filesInput) {
  const files = Array.from(filesInput);
  const validFiles = files.filter(f => f.type.match('image.*'));

  if (validFiles.length === 0) {
    showToast("Please select valid image file(s) (PNG, JPG, WEBP, GIF)", "danger");
    return;
  }

  let loadedCount = 0;
  validFiles.forEach(file => {
    if (file.size > 3 * 1024 * 1024) {
      showToast(`Warning: "${file.name}" is over 3MB. LocalStorage space is limited.`, "warning");
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      pendingQueue.push({
        tempId: 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        info: {
          name: file.name || `Image_${Date.now()}.png`,
          size: file.size,
          type: file.type || 'image/png',
          lastModified: file.lastModified || Date.now()
        },
        data: e.target.result
      });

      loadedCount++;
      if (loadedCount === validFiles.length) {
        renderQueue();
      }
    };
    reader.readAsDataURL(file);
  });
}

function removeFromQueue(tempId) {
  pendingQueue = pendingQueue.filter(item => item.tempId !== tempId);
  renderQueue();
}

function renderQueue() {
  const previewCard = document.getElementById("uploadPreviewCard");
  const grid = document.getElementById("queueThumbnailsGrid");
  const countElem = document.getElementById("queueCount");
  const sizeElem = document.getElementById("queueTotalSize");

  if (!previewCard || !grid) return;

  if (pendingQueue.length === 0) {
    previewCard.classList.add("d-none");
    grid.innerHTML = "";
    document.getElementById("fileInput").value = "";
    return;
  }

  previewCard.classList.remove("d-none");
  countElem.textContent = pendingQueue.length;

  const totalBytes = pendingQueue.reduce((acc, curr) => acc + curr.info.size, 0);
  sizeElem.textContent = formatBytes(totalBytes);

  let html = "";
  pendingQueue.forEach(item => {
    html += `
      <div class="col-12 col-sm-6">
        <div class="queue-item-card">
          <img src="${item.data}" alt="${escapeHtml(item.info.name)}" class="queue-item-thumb">
          <div class="queue-item-info">
            <h6 class="queue-item-name" title="${escapeHtml(item.info.name)}">${escapeHtml(item.info.name)}</h6>
            <span class="queue-item-size">${formatBytes(item.info.size)} • ${item.info.type.split('/')[1]?.toUpperCase() || 'IMG'}</span>
          </div>
          <button class="queue-item-remove" onclick="removeFromQueue('${item.tempId}')" title="Remove from queue">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

function cancelUpload() {
  pendingQueue = [];
  document.getElementById("fileInput").value = "";
  renderQueue();
}

/* Save Queue Images into LocalStorage */
function confirmUpload() {
  if (pendingQueue.length === 0) {
    showToast("No images in queue to upload!", "warning");
    return;
  }

  const allFiles = GetAllFiles();
  let successCount = 0;

  for (let i = 0; i < pendingQueue.length; i++) {
    const item = pendingQueue[i];
    const newRecord = {
      id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) + '_' + i,
      info: item.info,
      data: item.data,
      createdAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(newRecord);
    const estimatedBytes = new Blob([jsonString]).size;
    const currentUsed = getStorageUsedBytes();

    if (currentUsed + estimatedBytes > MAX_STORAGE_BYTES) {
      showToast(`LocalStorage capacity reached! Saved ${successCount} out of ${pendingQueue.length} images.`, "danger");
      break;
    }

    allFiles.unshift(newRecord);
    successCount++;
  }

  if (successCount > 0) {
    try {
      localStorage.setItem("allfiles", JSON.stringify(allFiles));
      showToast(`Successfully saved ${successCount} image(s) to LocalStorage!`, "success");
      cancelUpload();
      updateStorageUsage();
      renderGallery();

      // Switch to All Files gallery tab
      const allFilesTab = document.getElementById("allfiles-tab");
      if (allFilesTab) {
        new bootstrap.Tab(allFilesTab).show();
      }
    } catch (err) {
      console.error("LocalStorage save error:", err);
      showToast("Storage quota error saving images!", "danger");
    }
  }
}

/* Data Access Helpers */
function GetAllFiles() {
  try {
    const data = localStorage.getItem("allfiles");
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading LocalStorage", e);
    return [];
  }
}

let selectedImageIds = new Set();

function toggleSelectImage(id) {
  if (selectedImageIds.has(id)) {
    selectedImageIds.delete(id);
  } else {
    selectedImageIds.add(id);
  }
  updateSelectionUI();
}

function toggleSelectAll(isChecked) {
  const files = GetAllFiles();
  if (isChecked) {
    files.forEach(f => selectedImageIds.add(f.id));
  } else {
    selectedImageIds.clear();
  }
  renderGallery();
}

function updateSelectionUI() {
  const deleteBtn = document.getElementById("deleteSelectedBtn");
  const countElem = document.getElementById("selectedCount");
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  const files = GetAllFiles();

  const count = selectedImageIds.size;
  if (countElem) countElem.textContent = count;

  if (deleteBtn) {
    if (count > 0) {
      deleteBtn.classList.remove("d-none");
    } else {
      deleteBtn.classList.add("d-none");
    }
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = files.length > 0 && count === files.length;
    selectAllCheckbox.indeterminate = count > 0 && count < files.length;
  }

  files.forEach(f => {
    const card = document.getElementById(`card_${f.id}`);
    const checkbox = document.getElementById(`chk_${f.id}`);
    if (card) {
      if (selectedImageIds.has(f.id)) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    }
    if (checkbox) {
      checkbox.checked = selectedImageIds.has(f.id);
    }
  });
}

async function deleteSelectedFiles() {
  const count = selectedImageIds.size;
  if (count === 0) return;

  const confirmed = await showCustomConfirm({
    title: `Delete ${count} Selected Image${count > 1 ? 's' : ''}?`,
    text: `Are you sure you want to delete ${count} selected image(s) from your local vault?`,
    icon: "danger",
    confirmText: `Yes, Delete (${count})`,
    cancelText: "Cancel",
    isDanger: true
  });

  if (!confirmed) return;

  let files = GetAllFiles();
  files = files.filter(f => !selectedImageIds.has(f.id));
  localStorage.setItem("allfiles", JSON.stringify(files));

  selectedImageIds.clear();
  showToast(`Successfully deleted ${count} image(s)`, "info");
  updateStorageUsage();
  renderGallery();
}

/* Render Gallery with Search & Sort */
function renderGallery() {
  const container = document.getElementById("galleryContainer");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  if (!container) return;

  let files = GetAllFiles();
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const sortBy = sortSelect ? sortSelect.value : "newest";

  // Filter by search query
  if (query) {
    files = files.filter(f => f.info.name.toLowerCase().includes(query));
  }

  // Sort files
  files.sort((a, b) => {
    if (sortBy === "newest") return new Date(b.createdAt || b.info.lastModified) - new Date(a.createdAt || a.info.lastModified);
    if (sortBy === "oldest") return new Date(a.createdAt || a.info.lastModified) - new Date(b.createdAt || b.info.lastModified);
    if (sortBy === "size-desc") return b.info.size - a.info.size;
    if (sortBy === "size-asc") return a.info.size - b.info.size;
    if (sortBy === "name") return a.info.name.localeCompare(b.info.name);
    return 0;
  });

  // Render empty state if no files
  if (files.length === 0) {
    container.innerHTML = "";
    emptyState.classList.remove("d-none");
    document.getElementById("imageCountBadge").textContent = `0 Images`;
    selectedImageIds.clear();
    updateSelectionUI();
    return;
  }

  emptyState.classList.add("d-none");
  document.getElementById("imageCountBadge").textContent = `${files.length} Image${files.length > 1 ? 's' : ''}`;

  let html = "";
  files.forEach(file => {
    const ext = file.info.type ? file.info.type.split('/')[1]?.toUpperCase() : 'IMG';
    const formattedDate = new Date(file.createdAt || file.info.lastModified).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const isSelected = selectedImageIds.has(file.id);

    html += `
      <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
        <div class="image-card ${isSelected ? 'selected' : ''}" id="card_${file.id}">
          <div class="card-select-checkbox-wrapper">
            <input type="checkbox" class="form-check-input card-select-checkbox" id="chk_${file.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectImage('${file.id}')" onclick="event.stopPropagation()">
          </div>
          <div class="image-thumb-wrapper" onclick="openLightbox('${file.id}')" style="cursor: pointer;">
            <img src="${file.data}" alt="${escapeHtml(file.info.name)}" class="image-thumb" loading="lazy">
            <span class="image-badge">${ext}</span>
          </div>
          <div class="card-content">
            <h6 class="file-title" title="${escapeHtml(file.info.name)}">${escapeHtml(file.info.name)}</h6>
            <div class="file-meta">
              <span><i class="bi bi-hdd me-1"></i>${formatBytes(file.info.size)}</span>
              <span><i class="bi bi-calendar3 me-1"></i>${formattedDate}</span>
            </div>
            <div class="card-actions">
              <button class="btn btn-outline-primary btn-icon" onclick="openLightbox('${file.id}')" title="View Preview">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-outline-warning btn-icon" onclick="renameFile('${file.id}')" title="Rename Image">
                <i class="bi bi-pencil"></i>
              </button>
              <a href="${file.data}" download="${escapeHtml(file.info.name)}" class="btn btn-outline-secondary btn-icon" title="Download">
                <i class="bi bi-download"></i>
              </a>
              <button class="btn btn-outline-danger btn-icon" onclick="deleteFile('${file.id}')" title="Delete Image">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  updateSelectionUI();
}

/* Modal Preview Lightbox */
function openLightbox(id) {
  const files = GetAllFiles();
  const file = files.find(f => f.id === id);
  if (!file) return;

  document.getElementById("lightboxTitle").textContent = file.info.name;
  document.getElementById("lightboxImg").src = file.data;
  document.getElementById("lightboxSize").textContent = formatBytes(file.info.size);
  document.getElementById("lightboxDate").textContent = new Date(file.createdAt || file.info.lastModified).toLocaleString();
  document.getElementById("lightboxType").textContent = file.info.type;
  
  const downloadBtn = document.getElementById("lightboxDownload");
  downloadBtn.href = file.data;
  downloadBtn.download = file.info.name;

  const modal = new bootstrap.Modal(document.getElementById("lightboxModal"));
  modal.show();
}

/* Rename Image */
async function renameFile(id) {
  const files = GetAllFiles();
  const file = files.find(f => f.id === id);
  if (!file) return;

  const newName = await showCustomPrompt({
    title: "Rename Image",
    text: "Enter a new name for this image:",
    defaultValue: file.info.name,
    confirmText: "Save Name",
    cancelText: "Cancel"
  });

  if (!newName || newName === file.info.name || newName.trim() === "") return;

  file.info.name = newName.trim();
  localStorage.setItem("allfiles", JSON.stringify(files));

  showToast(`Renamed image to "${file.info.name}"`, "success");
  renderGallery();
}

/* Delete single file */
async function deleteFile(id) {
  const confirmed = await showCustomConfirm({
    title: "Delete Image?",
    text: "Are you sure you want to delete this image from your local vault?",
    icon: "danger",
    confirmText: "Yes, Delete",
    cancelText: "Cancel",
    isDanger: true
  });

  if (!confirmed) return;

  let files = GetAllFiles();
  files = files.filter(f => f.id !== id);
  localStorage.setItem("allfiles", JSON.stringify(files));

  showToast("Image deleted successfully", "info");
  updateStorageUsage();
  renderGallery();
}

/* Clear all images */
async function clearAllFiles() {
  const files = GetAllFiles();
  if (files.length === 0) {
    showToast("No images to clear", "warning");
    return;
  }

  const confirmed = await showCustomConfirm({
    title: "Clear Entire Gallery?",
    text: "Are you sure you want to delete ALL stored images? This action cannot be undone.",
    icon: "danger",
    confirmText: "Yes, Delete All",
    cancelText: "Cancel",
    isDanger: true
  });

  if (!confirmed) return;

  localStorage.removeItem("allfiles");
  showToast("All stored images have been removed.", "info");
  updateStorageUsage();
  renderGallery();
}

/* Search & Filter listeners */
function setupSearchAndFilter() {
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  if (searchInput) {
    searchInput.addEventListener("input", renderGallery);
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", renderGallery);
  }
}

/* Helper Utilities */
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getStorageUsedBytes() {
  let total = 0;
  for (let x in localStorage) {
    if (localStorage.hasOwnProperty(x)) {
      total += ((localStorage[x].length + x.length) * 2);
    }
  }
  return total;
}

function updateStorageUsage() {
  const usedBytes = getStorageUsedBytes();
  const percentage = Math.min(100, Math.round((usedBytes / MAX_STORAGE_BYTES) * 100));
  
  const progressBar = document.getElementById("storageProgressBar");
  const textElem = document.getElementById("storageUsageText");

  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
    if (percentage > 85) {
      progressBar.style.background = "var(--danger)";
    } else if (percentage > 60) {
      progressBar.style.background = "var(--warning)";
    } else {
      progressBar.style.background = "linear-gradient(90deg, var(--primary), var(--secondary))";
    }
  }

  if (textElem) {
    textElem.textContent = `${formatBytes(usedBytes)} / ~5MB (${percentage}%)`;
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* Custom SweetAlert-Style Dialog Modal Engine */
function showCustomConfirm({
  title = "Are you sure?",
  text = "Do you really want to proceed?",
  icon = "warning",
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  isDanger = true
}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("customSwalOverlay");
    const iconCircle = document.getElementById("swalIconCircle");
    const iconElem = document.getElementById("swalIcon");
    const titleElem = document.getElementById("swalTitle");
    const textElem = document.getElementById("swalText");
    const cancelBtn = document.getElementById("swalCancelBtn");
    const confirmBtn = document.getElementById("swalConfirmBtn");

    if (!overlay) {
      resolve(false);
      return;
    }

    const iconClassMap = {
      warning: "bi-exclamation-triangle-fill",
      danger: "bi-trash3-fill",
      success: "bi-check-circle-fill",
      info: "bi-info-circle-fill"
    };

    titleElem.textContent = title;
    textElem.textContent = text;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;

    iconCircle.className = `swal-icon-circle ${icon}`;
    iconElem.className = `bi ${iconClassMap[icon] || iconClassMap.warning}`;
    confirmBtn.className = isDanger ? "swal-btn swal-btn-confirm-danger" : "swal-btn swal-btn-confirm-primary";

    overlay.classList.add("active");

    const cleanup = () => {
      overlay.classList.remove("active");
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
  });
}

function showCustomPrompt({
  title = "Rename Image",
  text = "Enter a new name for this file:",
  defaultValue = "",
  confirmText = "Save Name",
  cancelText = "Cancel"
}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("customSwalOverlay");
    const iconCircle = document.getElementById("swalIconCircle");
    const iconElem = document.getElementById("swalIcon");
    const titleElem = document.getElementById("swalTitle");
    const textElem = document.getElementById("swalText");
    const inputContainer = document.getElementById("swalInputContainer");
    const inputElem = document.getElementById("swalInput");
    const cancelBtn = document.getElementById("swalCancelBtn");
    const confirmBtn = document.getElementById("swalConfirmBtn");

    if (!overlay) {
      resolve(null);
      return;
    }

    titleElem.textContent = title;
    textElem.textContent = text;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;

    iconCircle.className = "swal-icon-circle info";
    iconElem.className = "bi bi-pencil-square";
    confirmBtn.className = "swal-btn swal-btn-confirm-primary";

    if (inputContainer && inputElem) {
      inputContainer.classList.remove("d-none");
      inputElem.value = defaultValue;
    }

    overlay.classList.add("active");
    if (inputElem) {
      setTimeout(() => {
        inputElem.focus();
        inputElem.select();
      }, 100);
    }

    const cleanup = () => {
      overlay.classList.remove("active");
      if (inputContainer) inputContainer.classList.add("d-none");
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      if (inputElem) inputElem.removeEventListener("keydown", onKeyDown);
    };

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onConfirm = () => {
      const val = inputElem ? inputElem.value.trim() : "";
      cleanup();
      resolve(val);
    };

    const onKeyDown = (e) => {
      if (e.key === "Enter") onConfirm();
      if (e.key === "Escape") onCancel();
    };

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    if (inputElem) inputElem.addEventListener("keydown", onKeyDown);
  });
}

/* Toast Notifications */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const iconMap = {
    success: 'bi-check-circle-fill text-success',
    danger: 'bi-exclamation-triangle-fill text-danger',
    warning: 'bi-exclamation-circle-fill text-warning',
    info: 'bi-info-circle-fill text-info'
  };

  const toast = document.createElement("div");
  toast.className = "custom-toast";
  toast.innerHTML = `
    <i class="bi ${iconMap[type] || iconMap.info} fs-5"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
