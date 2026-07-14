/**
 * Storage Module
 * Manages local storage persistence for user preferences, recent files list, open tabs, and bookmarks.
 * Attached to window.StorageManager to bypass CORS module restrictions.
 */

const STORAGE_KEYS = {
    PREFERENCES: 'mdreader_preferences',
    RECENT_FILES: 'mdreader_recent_files',
    OPEN_TABS: 'mdreader_open_tabs',
    BOOKMARKS: 'mdreader_bookmarks',
    LAST_ACTIVE_TAB: 'mdreader_last_active_tab'
};

const DEFAULT_PREFERENCES = {
    theme: 'dark', // 'dark', 'light', 'system'
    fontSize: 16, // px
    fontFamily: 'Inter', // 'Inter', 'Outfit', 'Georgia', 'Fira Code'
    lineHeight: 1.6,
    contentWidth: 800, // px
    wordWrap: true,
    zoom: 100, // %
    sidebarWidth: 260, // px
    sidebarCollapsed: false,
    activeSidebarPanel: 'files' // 'files', 'outline', 'bookmarks', 'settings'
};

window.StorageManager = {
    getPreferences() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
            return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
        } catch (e) {
            console.error('Failed to load preferences from storage:', e);
            return DEFAULT_PREFERENCES;
        }
    },

    savePreferences(prefs) {
        try {
            const current = this.getPreferences();
            const updated = { ...current, ...prefs };
            localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
            return true;
        } catch (e) {
            console.error('Failed to save preferences to storage:', e);
            return false;
        }
    },

    getRecentFiles() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.RECENT_FILES);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to load recent files from storage:', e);
            return [];
        }
    },

    addRecentFile(fileMeta) {
        try {
            const recent = this.getRecentFiles();
            const filtered = recent.filter(f => !(f.name === fileMeta.name && f.size === fileMeta.size));
            
            filtered.unshift({
                name: fileMeta.name,
                size: fileMeta.size,
                lastModified: fileMeta.lastModified,
                timestamp: Date.now()
            });

            const limited = filtered.slice(0, 15);
            localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(limited));
            return limited;
        } catch (e) {
            console.error('Failed to add recent file:', e);
            return [];
        }
    },

    clearRecentFiles() {
        try {
            localStorage.removeItem(STORAGE_KEYS.RECENT_FILES);
            return true;
        } catch (e) {
            return false;
        }
    },

    getBookmarks() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to load bookmarks:', e);
            return [];
        }
    },

    addBookmark(bookmark) {
        try {
            const bookmarks = this.getBookmarks();
            const exists = bookmarks.some(b => b.fileName === bookmark.fileName && b.id === bookmark.id);
            if (!exists) {
                bookmarks.push({
                    ...bookmark,
                    timestamp: Date.now()
                });
                localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
            }
            return bookmarks;
        } catch (e) {
            console.error('Failed to add bookmark:', e);
            return [];
        }
    },

    removeBookmark(fileName, id) {
        try {
            const bookmarks = this.getBookmarks();
            const filtered = bookmarks.filter(b => !(b.fileName === fileName && b.id === id));
            localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(filtered));
            return filtered;
        } catch (e) {
            console.error('Failed to remove bookmark:', e);
            return [];
        }
    },

    isBookmarked(fileName, id) {
        const bookmarks = this.getBookmarks();
        return bookmarks.some(b => b.fileName === fileName && b.id === id);
    },

    getOpenTabs() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.OPEN_TABS);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to load open tabs:', e);
            return [];
        }
    },

    saveOpenTabs(tabs) {
        try {
            const tabsToSave = tabs.map(tab => ({
                id: tab.id,
                name: tab.name,
                size: tab.size,
                lastModified: tab.lastModified,
                scrollPosition: tab.scrollPosition || 0,
                content: tab.size < 50000 ? tab.content : ''
            }));
            localStorage.setItem(STORAGE_KEYS.OPEN_TABS, JSON.stringify(tabsToSave));
        } catch (e) {
            console.error('Failed to save open tabs:', e);
        }
    },

    getLastActiveTabId() {
        return localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_TAB) || null;
    },

    saveLastActiveTabId(tabId) {
        if (tabId) {
            localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TAB, tabId);
        } else {
            localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE_TAB);
        }
    }
};
