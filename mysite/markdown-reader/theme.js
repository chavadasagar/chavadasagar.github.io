/**
 * Theme Module
 * Manages dark, light, and system themes and handles CSS variable toggling
 * and external styling dependencies (like Mermaid and Highlight.js).
 * Attached to window.ThemeManager.
 */

let currentTheme = 'dark';
const listeners = [];

window.ThemeManager = {
    initTheme() {
        const prefs = window.StorageManager.getPreferences();
        this.applyTheme(prefs.theme);

        const systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        systemMediaQuery.addEventListener('change', () => {
            if (currentTheme === 'system') {
                this.applyTheme('system', false);
            }
        });
    },

    setTheme(themeName) {
        this.applyTheme(themeName);
        window.StorageManager.savePreferences({ theme: themeName });
    },

    getTheme() {
        return currentTheme;
    },

    isDark() {
        if (currentTheme === 'dark') return true;
        if (currentTheme === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    },

    addThemeChangeListener(callback) {
        if (typeof callback === 'function') {
            listeners.push(callback);
        }
    },

    applyTheme(themeName, notify = true) {
        currentTheme = themeName;
        const isDarkTheme = this.isDark();

        const root = document.documentElement;
        if (isDarkTheme) {
            root.classList.add('dark-mode');
            root.classList.remove('light-mode');
            root.setAttribute('data-theme', 'dark');
        } else {
            root.classList.add('light-mode');
            root.classList.remove('dark-mode');
            root.setAttribute('data-theme', 'light');
        }

        this.updateHighlightTheme(isDarkTheme);

        if (notify) {
            listeners.forEach(cb => {
                try {
                    cb(isDarkTheme, themeName);
                } catch (err) {
                    console.error('Error in theme change listener: ', err);
                }
            });
        }
    },

    updateHighlightTheme(isDarkTheme) {
        let link = document.getElementById('hljs-theme-link');
        const darkUrl = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css';
        const lightUrl = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css';
        const targetUrl = isDarkTheme ? darkUrl : lightUrl;

        if (!link) {
            link = document.createElement('link');
            link.id = 'hljs-theme-link';
            link.rel = 'stylesheet';
            link.href = targetUrl;
            document.head.appendChild(link);
        } else if (link.getAttribute('href') !== targetUrl) {
            link.setAttribute('href', targetUrl);
        }
    }
};
