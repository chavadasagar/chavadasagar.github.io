/**
 * Main Application Orchestrator
 * Connects layout controllers, file readers, tabs manager, scroll spies,
 * zoom managers, settings panels, exporters, keyboard shortcuts, and search.
 * Loaded as a normal script tag (no module type) to support direct local double-clicks.
 */

// Shortcuts to global managers
const Utils = window.Utils;
const Storage = window.StorageManager;
const Theme = window.ThemeManager;

// Application State
const state = {
    tabs: [],
    activeTabId: null,
    preferences: {},
    zoom: 100,
    currentHeadingId: '',
    currentHeadingText: '',
    presentationMode: {
        active: false,
        slides: [],
        currentSlideIdx: 0
    }
};

// Modules
let markdownParser = null;
let searchManager = null;

// DOM Elements
const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarResizeHandle: document.getElementById('sidebar-resize-handle'),
    sidebarCollapseBtn: document.getElementById('btn-collapse-sidebar'),
    sidebarExpandBtn: document.getElementById('btn-expand-sidebar'),
    sidebarPanels: {
        files: document.getElementById('panel-files'),
        outline: document.getElementById('panel-outline'),
        bookmarks: document.getElementById('panel-bookmarks'),
        settings: document.getElementById('panel-settings')
    },
    sidebarTabs: document.querySelectorAll('.sidebar-tab-btn'),
    recentFilesList: document.getElementById('recent-files-list'),
    fileExplorerList: document.getElementById('file-explorer-list'),
    outlineList: document.getElementById('outline-list'),
    bookmarksList: document.getElementById('bookmarks-list'),
    
    tabBar: document.getElementById('tab-bar'),
    
    viewerContainer: document.getElementById('viewer-container'),
    viewerContent: document.getElementById('viewer-content'),
    progressBar: document.getElementById('reading-progress-bar'),
    currentHeadingText: document.getElementById('toolbar-current-heading'),
    
    fileInput: document.getElementById('file-input'),
    btnOpenFile: document.getElementById('btn-open-file'),
    btnReloadFile: document.getElementById('btn-reload-file'),
    btnFocusMode: document.getElementById('btn-focus-mode'),
    btnPresentationMode: document.getElementById('btn-presentation-mode'),
    btnToggleTheme: document.getElementById('btn-theme-toggle'),
    btnBookmarkHeading: document.getElementById('btn-bookmark-heading'),
    btnToolbarSearch: document.getElementById('btn-toolbar-search'),
    
    searchBar: document.getElementById('search-bar'),
    searchInput: document.getElementById('search-input'),
    searchCountLabel: document.getElementById('search-count'),
    searchPrevBtn: document.getElementById('btn-search-prev'),
    searchNextBtn: document.getElementById('btn-search-next'),
    searchCloseBtn: document.getElementById('btn-search-close'),

    settings: {
        fontFamily: document.getElementById('setting-font-family'),
        fontSize: document.getElementById('setting-font-size'),
        lineHeight: document.getElementById('setting-line-height'),
        contentWidth: document.getElementById('setting-content-width'),
        theme: document.getElementById('setting-theme'),
        clearRecents: document.getElementById('btn-clear-recents')
    },

    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),

    exportPdfBtn: document.getElementById('export-pdf'),
    exportHtmlBtn: document.getElementById('export-html'),
    exportTxtBtn: document.getElementById('export-txt'),
    
    status: {
        words: document.getElementById('stat-words'),
        chars: document.getElementById('stat-chars'),
        headings: document.getElementById('stat-headings'),
        images: document.getElementById('stat-images'),
        tables: document.getElementById('stat-tables'),
        links: document.getElementById('stat-links'),
        readingTime: document.getElementById('stat-reading-time'),
        zoom: document.getElementById('stat-zoom-level')
    }
};

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme
    Theme.initTheme();
    
    // 2. Load Preferences
    state.preferences = Storage.getPreferences();
    applyPreferences(state.preferences);
    
    // 3. Initialize Markdown Parser and Search Manager
    markdownParser = new window.MarkdownParser();
    searchManager = new window.SearchManager(elements.viewerContent);

    // 4. Register All Event Listeners
    setupLayoutEvents();
    setupFileEvents();
    setupSettingsEvents();
    setupZoomEvents();
    setupNavigationAndScrollEvents();
    setupSearchEvents();
    setupExportEvents();
    setupKeyboardShortcuts();
    
    // 5. Restore Session (Tabs & Last opened tab)
    restoreSession();

    // 6. Theme Change listener (re-render mermaid layout)
    Theme.addThemeChangeListener((isDarkTheme) => {
        if (window.MermaidHandler) {
            window.MermaidHandler.reinitMermaidTheme(isDarkTheme);
        }
        if (state.activeTabId) {
            renderActiveTabContent();
        }
    });

    setupDragAndDrop();

    renderRecentFilesList();
    renderBookmarksList();
});

/**
 * Layout & Sidebar logic
 */
function setupLayoutEvents() {
    elements.sidebarTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const panelName = btn.getAttribute('data-panel');
            activateSidebarPanel(panelName);
        });
    });

    let isResizing = false;
    elements.sidebarResizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.classList.add('resizing-sidebar');
        
        const doResize = (ev) => {
            if (!isResizing) return;
            const newWidth = Math.max(180, Math.min(500, ev.clientX));
            document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
            state.preferences.sidebarWidth = newWidth;
        };

        const stopResize = () => {
            if (isResizing) {
                isResizing = false;
                document.body.classList.remove('resizing-sidebar');
                Storage.savePreferences({ sidebarWidth: state.preferences.sidebarWidth });
                document.removeEventListener('mousemove', doResize);
                document.removeEventListener('mouseup', stopResize);
            }
        };

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    });

    elements.sidebarCollapseBtn.addEventListener('click', () => toggleSidebar(true));
    elements.sidebarExpandBtn.addEventListener('click', () => toggleSidebar(false));
}

function activateSidebarPanel(panelName) {
    elements.sidebarTabs.forEach(btn => {
        if (btn.getAttribute('data-panel') === panelName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    Object.entries(elements.sidebarPanels).forEach(([name, panel]) => {
        if (name === panelName) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    });

    state.preferences.activeSidebarPanel = panelName;
    Storage.savePreferences({ activeSidebarPanel: panelName });
}

function toggleSidebar(collapsed) {
    if (collapsed) {
        elements.sidebar.classList.add('collapsed');
        elements.sidebarExpandBtn.classList.remove('hidden');
    } else {
        elements.sidebar.classList.remove('collapsed');
        elements.sidebarExpandBtn.classList.add('hidden');
    }
    state.preferences.sidebarCollapsed = collapsed;
    Storage.savePreferences({ sidebarCollapsed: collapsed });
}

/**
 * Drag & Drop
 */
function setupDragAndDrop() {
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    const highlight = () => document.body.classList.add('drag-active');
    const unhighlight = () => document.body.classList.remove('drag-active');

    ['dragenter', 'dragover'].forEach(eventName => {
        document.body.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, unhighlight, false);
    });

    document.body.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleOpenFiles(files);
        }
    });
}

/**
 * File actions
 */
function setupFileEvents() {
    elements.btnOpenFile.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleOpenFiles(e.target.files);
        }
    });

    elements.btnReloadFile.addEventListener('click', () => {
        const activeTab = getActiveTab();
        if (!activeTab) return;
        Utils.showToast('Please re-select or drag file to sync changes.', 'info');
    });

    elements.btnFocusMode.addEventListener('click', toggleFocusMode);
    elements.btnPresentationMode.addEventListener('click', togglePresentationMode);

    elements.btnToggleTheme.addEventListener('click', () => {
        const nextTheme = Theme.isDark() ? 'light' : 'dark';
        Theme.setTheme(nextTheme);
        elements.settings.theme.value = nextTheme;
    });

    elements.btnBookmarkHeading.addEventListener('click', () => {
        const activeTab = getActiveTab();
        if (!activeTab || !state.currentHeadingId) {
            Utils.showToast('No active heading to bookmark.', 'warning');
            return;
        }
        const fileName = activeTab.name;
        if (Storage.isBookmarked(fileName, state.currentHeadingId)) {
            Storage.removeBookmark(fileName, state.currentHeadingId);
            Utils.showToast('Bookmark removed', 'info');
            elements.btnBookmarkHeading.classList.remove('active');
        } else {
            Storage.addBookmark({
                fileName,
                id: state.currentHeadingId,
                title: state.currentHeadingText
            });
            Utils.showToast('Bookmark added!', 'success');
            elements.btnBookmarkHeading.classList.add('active');
        }
        renderBookmarksList();
    });
}

function handleOpenFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt')) {
            Utils.showToast(`Skipped "${file.name}": Only markdown or txt supported.`, 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const tabId = `tab-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            const newTab = {
                id: tabId,
                name: file.name,
                size: file.size,
                lastModified: file.lastModified,
                content: content,
                scrollPosition: 0
            };

            state.tabs.push(newTab);
            Storage.addRecentFile(newTab);
            Storage.saveOpenTabs(state.tabs);
            
            renderTabsUI();
            setActiveTab(tabId);
            renderRecentFilesList();
        };

        reader.onerror = () => {
            Utils.showToast(`Error reading file: ${file.name}`, 'error');
        };

        reader.readAsText(file);
    });
}

/**
 * Tab Management
 */
function renderTabsUI() {
    elements.tabBar.innerHTML = '';
    
    if (state.tabs.length === 0) {
        elements.tabBar.innerHTML = '<div class="no-tabs-msg">No files open</div>';
        elements.viewerContent.innerHTML = `
            <div class="welcome-screen">
                <span class="material-icons-round welcome-icon">menu_book</span>
                <h1>Markdown Reader</h1>
                <p>Drag and drop a Markdown file here, or click Open File to browse.</p>
                <div class="welcome-actions">
                    <button class="primary-btn" onclick="document.getElementById('file-input').click()"><span class="material-icons-round">file_open</span> Open File</button>
                </div>
            </div>
        `;
        elements.outlineList.innerHTML = '<div class="empty-panel-message">No active document</div>';
        elements.progressBar.style.width = '0%';
        elements.currentHeadingText.textContent = '';
        state.activeTabId = null;
        Storage.saveLastActiveTabId(null);
        updateStatusBarStats(null);
        return;
    }

    state.tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab-item ${tab.id === state.activeTabId ? 'active' : ''}`;
        tabEl.setAttribute('data-tab-id', tab.id);
        
        tabEl.innerHTML = `
            <span class="material-icons-round tab-icon">description</span>
            <span class="tab-name" title="${tab.name}">${tab.name}</span>
            <button class="tab-close-btn" title="Close"><span class="material-icons-round">close</span></button>
        `;

        tabEl.addEventListener('click', (e) => {
            if (e.target.closest('.tab-close-btn')) {
                e.stopPropagation();
                closeTab(tab.id);
            } else {
                setActiveTab(tab.id);
            }
        });

        elements.tabBar.appendChild(tabEl);
    });
}

function setActiveTab(tabId) {
    const activeTab = getActiveTab();
    if (activeTab) {
        activeTab.scrollPosition = elements.viewerContainer.scrollTop;
    }

    state.activeTabId = tabId;
    Storage.saveLastActiveTabId(tabId);
    Storage.saveOpenTabs(state.tabs);

    document.querySelectorAll('.tab-item').forEach(el => {
        if (el.getAttribute('data-tab-id') === tabId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    renderActiveTabContent();
}

async function renderActiveTabContent() {
    const tab = getActiveTab();
    if (!tab) return;

    elements.viewerContent.innerHTML = `
        <div class="viewer-loading">
            <span class="material-icons-round spin">sync</span>
            <span>Parsing Markdown...</span>
        </div>
    `;

    try {
        const result = await markdownParser.parse(tab.content);
        elements.viewerContent.innerHTML = result.html;
        
        markdownParser.attachHandlers(elements.viewerContent, (event) => {
            if (event.type === 'task-toggle') {
                handleTaskToggle(event.index, event.checked);
            }
        });

        renderOutline(result.toc);

        setTimeout(() => {
            elements.viewerContainer.scrollTop = tab.scrollPosition || 0;
            updateScrollProgress();
        }, 100);

        updateStatusBarStats(tab.content);

        if (elements.searchBar.classList.contains('visible') && elements.searchInput.value) {
            runSearch(elements.searchInput.value);
        }

    } catch (e) {
        console.error(e);
        elements.viewerContent.innerHTML = `
            <div class="viewer-error">
                <span class="material-icons-round">error</span>
                <h3>Failed to parse Markdown</h3>
                <p>${e.message}</p>
            </div>
        `;
    }
}

function closeTab(tabId) {
    const idx = state.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    state.tabs.splice(idx, 1);
    Storage.saveOpenTabs(state.tabs);

    if (state.activeTabId === tabId) {
        if (state.tabs.length > 0) {
            const nextActiveIdx = Math.max(0, idx - 1);
            state.activeTabId = state.tabs[nextActiveIdx].id;
        } else {
            state.activeTabId = null;
        }
    }

    renderTabsUI();
    if (state.activeTabId) {
        setActiveTab(state.activeTabId);
    }
}

function getActiveTab() {
    return state.tabs.find(t => t.id === state.activeTabId);
}

function handleTaskToggle(index, checked) {
    const tab = getActiveTab();
    if (!tab) return;

    let checkboxCount = 0;
    const regex = /^(\s*[\-\*\+]\s+\[)([ xX])(\]\s+)/gm;
    let newContent = tab.content.replace(regex, (match, prefix, stateChar, suffix) => {
        if (checkboxCount === index) {
            checkboxCount++;
            return prefix + (checked ? 'x' : ' ') + suffix;
        }
        checkboxCount++;
        return match;
    });

    tab.content = newContent;
    Storage.saveOpenTabs(state.tabs);
    updateStatusBarStats(newContent);
    Utils.showToast('Task updated!', 'success');
}

/**
 * Outline / TOC
 */
function renderOutline(toc) {
    elements.outlineList.innerHTML = '';
    
    if (!toc || toc.length === 0) {
        elements.outlineList.innerHTML = '<div class="empty-panel-message">No headers in document</div>';
        return;
    }

    toc.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `outline-item level-${item.level}`;
        itemEl.innerHTML = `
            <span class="material-icons-round outline-bullet">chevron_right</span>
            <span class="outline-text" title="${item.text}">${item.text}</span>
        `;
        
        itemEl.addEventListener('click', () => {
            const targetEl = document.getElementById(item.id);
            if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });

        itemEl.setAttribute('data-target-id', item.id);
        elements.outlineList.appendChild(itemEl);
    });
}

/**
 * Scroll spying
 */
function setupNavigationAndScrollEvents() {
    let scrollTimeout;
    elements.viewerContainer.addEventListener('scroll', () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
            updateScrollProgress();
            spyScrollHeadings();
            scrollTimeout = null;
        }, 100);
    });
}

function updateScrollProgress() {
    const el = elements.viewerContainer;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    
    let progress = 0;
    if (scrollHeight > 0) {
        progress = (scrollTop / scrollHeight) * 100;
    }
    
    elements.progressBar.style.width = `${progress}%`;
}

function spyScrollHeadings() {
    const activeTab = getActiveTab();
    if (!activeTab || markdownParser.toc.length === 0) return;

    const headings = Array.from(elements.viewerContent.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const containerTop = elements.viewerContainer.getBoundingClientRect().top;
    
    let currentHeadingId = '';
    let currentHeadingText = '';

    for (let i = 0; i < headings.length; i++) {
        const rect = headings[i].getBoundingClientRect();
        if (rect.top - containerTop <= 150) {
            currentHeadingId = headings[i].id;
            currentHeadingText = headings[i].querySelector('.heading-text').textContent;
        } else {
            break;
        }
    }

    if (currentHeadingId) {
        elements.currentHeadingText.textContent = currentHeadingText;
        state.currentHeadingId = currentHeadingId;
        state.currentHeadingText = currentHeadingText;
        
        if (Storage.isBookmarked(activeTab.name, currentHeadingId)) {
            elements.btnBookmarkHeading.classList.add('active');
        } else {
            elements.btnBookmarkHeading.classList.remove('active');
        }
        
        document.querySelectorAll('.outline-item').forEach(item => {
            if (item.getAttribute('data-target-id') === currentHeadingId) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('active');
            }
        });
    } else if (headings.length > 0) {
        elements.currentHeadingText.textContent = headings[0].querySelector('.heading-text').textContent;
        state.currentHeadingId = headings[0].id;
        state.currentHeadingText = headings[0].querySelector('.heading-text').textContent;
        
        if (Storage.isBookmarked(activeTab.name, headings[0].id)) {
            elements.btnBookmarkHeading.classList.add('active');
        } else {
            elements.btnBookmarkHeading.classList.remove('active');
        }
    }
}

/**
 * Bookmarks List
 */
function renderBookmarksList() {
    elements.bookmarksList.innerHTML = '';
    const bookmarks = Storage.getBookmarks();
    
    if (bookmarks.length === 0) {
        elements.bookmarksList.innerHTML = '<div class="empty-panel-message">No bookmarks saved</div>';
        return;
    }

    bookmarks.forEach(bm => {
        const itemEl = document.createElement('div');
        itemEl.className = 'bookmark-item';
        itemEl.innerHTML = `
            <div class="bookmark-info">
                <span class="bookmark-file-title" title="${bm.fileName}">${bm.fileName}</span>
                <span class="bookmark-heading-title" title="${bm.title}">${bm.title}</span>
            </div>
            <button class="bookmark-delete-btn" title="Remove Bookmark"><span class="material-icons-round">bookmark_remove</span></button>
        `;

        itemEl.addEventListener('click', (e) => {
            if (e.target.closest('.bookmark-delete-btn')) {
                e.stopPropagation();
                Storage.removeBookmark(bm.fileName, bm.id);
                renderBookmarksList();
                Utils.showToast('Bookmark removed', 'info');
            } else {
                const openedTab = state.tabs.find(t => t.name === bm.fileName);
                if (openedTab) {
                    setActiveTab(openedTab.id);
                    setTimeout(() => {
                        const target = document.getElementById(bm.id);
                        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 250);
                } else {
                    Utils.showToast(`Open file "${bm.fileName}" first to view bookmark.`, 'warning');
                }
            }
        });

        elements.bookmarksList.appendChild(itemEl);
    });
}

/**
 * Settings & Preferences
 */
function setupSettingsEvents() {
    elements.settings.fontFamily.addEventListener('change', (e) => {
        applyPreferenceValue('fontFamily', e.target.value);
    });

    elements.settings.fontSize.addEventListener('input', (e) => {
        applyPreferenceValue('fontSize', Number(e.target.value));
    });

    elements.settings.lineHeight.addEventListener('input', (e) => {
        applyPreferenceValue('lineHeight', Number(e.target.value));
    });

    elements.settings.contentWidth.addEventListener('input', (e) => {
        applyPreferenceValue('contentWidth', Number(e.target.value));
    });

    elements.settings.theme.addEventListener('change', (e) => {
        Theme.setTheme(e.target.value);
    });

    elements.settings.clearRecents.addEventListener('click', () => {
        Storage.clearRecentFiles();
        renderRecentFilesList();
        Utils.showToast('Recent files list cleared.', 'info');
    });
}

function applyPreferences(prefs) {
    document.documentElement.style.setProperty('--sidebar-width', `${prefs.sidebarWidth}px`);
    if (prefs.sidebarCollapsed) {
        toggleSidebar(true);
    } else {
        toggleSidebar(false);
    }
    activateSidebarPanel(prefs.activeSidebarPanel);

    elements.settings.fontFamily.value = prefs.fontFamily;
    elements.settings.fontSize.value = prefs.fontSize;
    elements.settings.lineHeight.value = prefs.lineHeight;
    elements.settings.contentWidth.value = prefs.contentWidth;
    elements.settings.theme.value = prefs.theme;

    const root = document.documentElement;
    root.style.setProperty('--viewer-font-family', getFontFamilyValue(prefs.fontFamily));
    root.style.setProperty('--viewer-font-size', `${prefs.fontSize}px`);
    root.style.setProperty('--viewer-line-height', prefs.lineHeight);
    root.style.setProperty('--viewer-content-width', `${prefs.contentWidth}px`);
}

function applyPreferenceValue(key, val) {
    state.preferences[key] = val;
    Storage.savePreferences({ [key]: val });
    applyPreferences(state.preferences);
}

function getFontFamilyValue(fontKey) {
    switch (fontKey) {
        case 'Inter': return "'Inter', sans-serif";
        case 'Outfit': return "'Outfit', sans-serif";
        case 'Fira Code': return "'Fira Code', monospace";
        case 'Georgia': return "Georgia, serif";
        default: return "system-ui, -apple-system, sans-serif";
    }
}

/**
 * Zoom Management
 */
function setupZoomEvents() {
    elements.btnZoomIn.addEventListener('click', () => adjustZoom(10));
    elements.btnZoomOut.addEventListener('click', () => adjustZoom(-10));
    elements.btnZoomReset.addEventListener('click', () => adjustZoom(0, true));
}

function adjustZoom(delta, reset = false) {
    if (reset) {
        state.zoom = 100;
    } else {
        state.zoom = Math.max(50, Math.min(200, state.zoom + delta));
    }
    
    document.documentElement.style.setProperty('--viewer-zoom', `${state.zoom / 100}`);
    elements.status.zoom.textContent = `${state.zoom}%`;
    Storage.savePreferences({ zoom: state.zoom });
}

/**
 * Keyboard Shortcuts
 */
function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            elements.fileInput.click();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            toggleSearchBar(true);
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            triggerPrint();
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
            e.preventDefault();
            adjustZoom(10);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            adjustZoom(-10);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            adjustZoom(0, true);
        }

        if (e.key === 'Escape') {
            if (elements.searchBar.classList.contains('visible')) {
                toggleSearchBar(false);
            }
            if (document.body.classList.contains('focus-mode')) {
                toggleFocusMode();
            }
            if (state.presentationMode.active) {
                exitPresentationMode();
            }
        }
    });

    elements.viewerContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            adjustZoom(e.deltaY < 0 ? 10 : -10);
        }
    }, { passive: false });
}

function updateStatusBarStats(content) {
    const stats = Utils.getDocumentStats(content);
    
    elements.status.words.textContent = stats.words.toLocaleString();
    elements.status.chars.textContent = stats.characters.toLocaleString();
    elements.status.headings.textContent = stats.headings;
    elements.status.images.textContent = stats.images;
    elements.status.tables.textContent = stats.tables;
    elements.status.links.textContent = stats.links;
    elements.status.readingTime.textContent = `${stats.readingTime} min`;
    elements.status.zoom.textContent = `${state.zoom}%`;
}

/**
 * Search (Ctrl+F)
 */
function setupSearchEvents() {
    elements.searchInput.addEventListener('input', () => {
        runSearch(elements.searchInput.value);
    });

    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                navigateSearch('prev');
            } else {
                navigateSearch('next');
            }
        }
    });

    elements.searchPrevBtn.addEventListener('click', () => navigateSearch('prev'));
    elements.searchNextBtn.addEventListener('click', () => navigateSearch('next'));
    elements.searchCloseBtn.addEventListener('click', () => toggleSearchBar(false));

    if (elements.btnToolbarSearch) {
        elements.btnToolbarSearch.addEventListener('click', () => {
            toggleSearchBar(true);
        });
    }
}

function toggleSearchBar(show) {
    if (show) {
        elements.searchBar.classList.add('visible');
        elements.searchInput.focus();
        elements.searchInput.select();
        runSearch(elements.searchInput.value);
    } else {
        elements.searchBar.classList.remove('visible');
        searchManager.clear();
    }
}

function runSearch(query) {
    if (!searchManager) return;
    const res = searchManager.search(query);
    
    if (query === '') {
        elements.searchCountLabel.textContent = '0 of 0';
        return;
    }

    elements.searchCountLabel.textContent = `${res.count > 0 ? res.index + 1 : 0} of ${res.count}`;
}

function navigateSearch(dir) {
    if (!searchManager) return;
    const res = dir === 'next' ? searchManager.next() : searchManager.prev();
    elements.searchCountLabel.textContent = `${res.count > 0 ? res.index + 1 : 0} of ${res.count}`;
}

/**
 * Export
 */
function setupExportEvents() {
    elements.exportPdfBtn.addEventListener('click', triggerPrint);
    elements.exportHtmlBtn.addEventListener('click', exportAsHtml);
    elements.exportTxtBtn.addEventListener('click', exportAsRawTxt);

    const exportDropdownBtn = document.getElementById('btn-export-dropdown');
    if (exportDropdownBtn) {
        const exportDropdownMenu = exportDropdownBtn.nextElementSibling;
        exportDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportDropdownMenu.classList.toggle('show');
        });
        document.addEventListener('click', () => {
            exportDropdownMenu.classList.remove('show');
        });
    }
}

function triggerPrint() {
    window.print();
}

function exportAsRawTxt() {
    const tab = getActiveTab();
    if (!tab) return;
    Utils.downloadFile(tab.content, tab.name, 'text/plain;charset=utf-8');
    Utils.showToast('Raw markdown file downloaded!', 'success');
}

function exportAsHtml() {
    const tab = getActiveTab();
    if (!tab) return;
    
    const appStyles = Array.from(document.styleSheets)
        .map(sheet => {
            try {
                return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
            } catch (e) {
                return '';
            }
        }).join('\n');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en" class="${Theme.isDark() ? 'dark-mode' : 'light-mode'}" data-theme="${Theme.isDark() ? 'dark' : 'light'}">
<head>
    <meta charset="UTF-8">
    <title>${tab.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            background-color: var(--viewer-bg, #121212);
            color: var(--viewer-fg, #e0e0e0);
        }
        .markdown-body {
            max-width: var(--viewer-content-width, 800px);
            margin: 0 auto;
        }
        ${appStyles}
    </style>
</head>
<body>
    <article class="markdown-body">
        ${elements.viewerContent.innerHTML}
    </article>
</body>
</html>
    `;
    
    const fileName = tab.name.substring(0, tab.name.lastIndexOf('.')) + '.html';
    Utils.downloadFile(htmlContent, fileName, 'text/html;charset=utf-8');
    Utils.showToast('Stand-alone HTML exported successfully!', 'success');
}

/**
 * Focus Mode
 */
function toggleFocusMode() {
    const isFocus = document.body.classList.toggle('focus-mode');
    
    if (isFocus) {
        Utils.showToast('Focus Mode. Press ESC to exit.', 'info');
        elements.sidebar.classList.add('collapsed');
    } else {
        if (!state.preferences.sidebarCollapsed) {
            elements.sidebar.classList.remove('collapsed');
        }
    }
}

/**
 * Presentation Mode
 */
function togglePresentationMode() {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    state.presentationMode.active = true;
    
    // Split raw markdown content by horizontal rules (--- on a line by itself)
    const rawContent = activeTab.content;
    const rawSlides = rawContent.split(/^\s*---\s*$/gm);
    
    state.presentationMode.slides = rawSlides.map(slide => slide.trim()).filter(slide => slide.length > 0);
    if (state.presentationMode.slides.length === 0) {
        state.presentationMode.slides = [activeTab.content];
    }
    
    state.presentationMode.currentSlideIdx = 0;
    
    const presContainer = document.createElement('div');
    presContainer.id = 'presentation-container';
    presContainer.innerHTML = `
        <div class="presentation-header search-exclude">
            <span class="presentation-title">${activeTab.name}</span>
            <div class="presentation-actions">
                <span class="slide-indicator">Slide 1 of ${state.presentationMode.slides.length}</span>
                <button class="pres-btn" id="btn-pres-close" title="Exit Fullscreen"><span class="material-icons-round">close</span></button>
            </div>
        </div>
        <div class="presentation-body">
            <div class="presentation-slide-wrapper">
                <div class="presentation-slide markdown-body"></div>
            </div>
        </div>
        <div class="presentation-footer search-exclude">
            <button class="pres-btn" id="btn-pres-prev" title="Previous Slide"><span class="material-icons-round">chevron_left</span></button>
            <div class="pres-progress-bar"><div class="pres-progress-fill"></div></div>
            <button class="pres-btn" id="btn-pres-next" title="Next Slide"><span class="material-icons-round">chevron_right</span></button>
        </div>
    `;

    document.body.appendChild(presContainer);
    
    if (presContainer.requestFullscreen) {
        presContainer.requestFullscreen().catch(e => console.warn('Could not launch full screen', e));
    }
    
    renderPresentationSlide();

    document.getElementById('btn-pres-close').addEventListener('click', exitPresentationMode);
    document.getElementById('btn-pres-prev').addEventListener('click', prevSlide);
    document.getElementById('btn-pres-next').addEventListener('click', nextSlide);

    const handlePresKeys = (e) => {
        if (!state.presentationMode.active) {
            window.removeEventListener('keydown', handlePresKeys);
            return;
        }
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
            nextSlide();
        }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            prevSlide();
        }
    };
    window.addEventListener('keydown', handlePresKeys);
}

async function renderPresentationSlide() {
    const slideDiv = document.querySelector('.presentation-slide');
    if (!slideDiv) return;
    
    const idx = state.presentationMode.currentSlideIdx;
    const slideMarkdown = state.presentationMode.slides[idx];
    
    // Parse slide markdown dynamically
    const result = await markdownParser.parse(slideMarkdown);
    slideDiv.innerHTML = result.html;
    
    // Attach handlers (table features, code copy, and MERMAID diagrams render!)
    markdownParser.attachHandlers(slideDiv);

    // Apply layout overrides for presentation font sizes
    slideDiv.querySelectorAll('h1').forEach(el => el.style.fontSize = '2.8rem');
    slideDiv.querySelectorAll('h2').forEach(el => el.style.fontSize = '2.3rem');
    slideDiv.querySelectorAll('p, li, blockquote').forEach(el => el.style.fontSize = '1.5rem');
    slideDiv.querySelectorAll('pre, code').forEach(el => el.style.fontSize = '1.1rem');

    document.querySelector('.slide-indicator').textContent = `Slide ${idx + 1} of ${state.presentationMode.slides.length}`;
    
    const progressFill = document.querySelector('.pres-progress-fill');
    if (progressFill) {
        const percent = ((idx + 1) / state.presentationMode.slides.length) * 100;
        progressFill.style.width = `${percent}%`;
    }
}

function nextSlide() {
    if (state.presentationMode.currentSlideIdx < state.presentationMode.slides.length - 1) {
        state.presentationMode.currentSlideIdx++;
        renderPresentationSlide();
    }
}

function prevSlide() {
    if (state.presentationMode.currentSlideIdx > 0) {
        state.presentationMode.currentSlideIdx--;
        renderPresentationSlide();
    }
}

function exitPresentationMode() {
    state.presentationMode.active = false;
    const presContainer = document.getElementById('presentation-container');
    if (presContainer) {
        presContainer.remove();
    }
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.warn(e));
    }
}

/**
 * Sidebar lists loading (Recent & Bookmarks)
 */
function renderRecentFilesList() {
    elements.recentFilesList.innerHTML = '';
    const recents = Storage.getRecentFiles();

    if (recents.length === 0) {
        elements.recentFilesList.innerHTML = '<div class="empty-panel-message">No recent files</div>';
        return;
    }

    recents.forEach(file => {
        const itemEl = document.createElement('div');
        itemEl.className = 'recent-file-item';
        itemEl.innerHTML = `
            <span class="material-icons-round recent-file-icon">history</span>
            <div class="recent-file-info">
                <span class="recent-file-name" title="${file.name}">${file.name}</span>
                <span class="recent-file-meta">${Utils.formatBytes(file.size)}</span>
            </div>
        `;

        itemEl.addEventListener('click', () => {
            const opened = state.tabs.find(t => t.name === file.name && t.size === file.size);
            if (opened) {
                setActiveTab(opened.id);
            } else {
                Utils.showToast(`Drag "${file.name}" or select to re-open.`, 'info');
            }
        });

        elements.recentFilesList.appendChild(itemEl);
    });
}

/**
 * Session restoration
 */
function restoreSession() {
    const savedTabs = Storage.getOpenTabs();
    
    if (savedTabs.length === 0) {
        const welcomeDoc = {
            id: 'tab-welcome',
            name: 'Welcome.md',
            size: 1530,
            lastModified: Date.now(),
            content: `
# Welcome to Markdown Reader 🚀

This is a modern, VS Code/Obsidian-inspired Markdown viewer running entirely inside your web browser. 

## Features

- 📂 **Multi-File Tab Interface**: Drag and drop your files directly here!
- 🌓 **Themes**: Seamless transition between Dark mode, Light mode, and System default.
- ⚡ **Performance**: Loads massive files larger than **50MB** fluidly.
- 📐 **Interactive Math & Diagrams**: 
  - Render high quality LaTeX block and inline math using **KaTeX**:
    $$e^{i\\pi} + 1 = 0$$
  - Render flowchart diagrams on the fly using **Mermaid**:
    \`\`\`mermaid
    graph TD
    A[Open File] --> B[Parse Markdown]
    B --> C[Render Layout]
    C --> D[Enjoy Reading!]
    \`\`\`
- 📊 **Interactive Data Tables**: Sticky headers, column sorting, column filtering, copy, row selection, and Excel/CSV exporting!
- 🔍 **Interactive Search**: Use **Ctrl+F** to highlight and step through matched text.
- 🧠 **Admonitions**:
  > [!NOTE]
  > This is a handy note block detailing additional background.
  
  > [!WARNING]
  > Check your Markdown syntax formatting before loading.
  
- 📝 **Markdown Elements**:
  - Task lists (Checkboxes are interactive!)
  - Footnotes[^1]
  - Copy anchor links on headings!
  - Est. Reading Time, word counts, and scroll positioning memory.

Enjoy your reading experience!

[^1]: This is an example footnote definition.
            `,
            scrollPosition: 0
        };
        state.tabs = [welcomeDoc];
        state.activeTabId = welcomeDoc.id;
    } else {
        state.tabs = savedTabs;
        const lastActive = Storage.getLastActiveTabId();
        if (lastActive && state.tabs.some(t => t.id === lastActive)) {
            state.activeTabId = lastActive;
        } else if (state.tabs.length > 0) {
            state.activeTabId = state.tabs[0].id;
        }
    }

    renderTabsUI();
    if (state.activeTabId) {
        renderActiveTabContent();
    }
}
