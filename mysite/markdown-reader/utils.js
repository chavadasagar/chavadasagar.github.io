/**
 * Utilities Module
 * Common utilities for performance optimization, data formatting, and UI helpers.
 * Attached to window.Utils to avoid CORS restrictions on local file schemes.
 */

window.Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    getDocumentStats(text) {
        if (!text) {
            return { words: 0, characters: 0, headings: 0, images: 0, tables: 0, links: 0, readingTime: 0 };
        }
        
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const characters = text.length;
        
        const headings = (text.match(/^#{1,6}\s+/gm) || []).length;
        const images = (text.match(/!\[.*?\]\(.*?\)/g) || []).length;
        const tables = (text.match(/\|[^\n]*\|[\r\n]+\|?\s*(:?-+:?\s*\|)+\s*(:?-+:?\s*)?[\r\n]+/g) || []).length;
        const links = (text.match(/\[.*?\]\([^\)]+?\)/g) || []).length - images;

        const readingTime = Math.max(1, Math.ceil(words / 200));

        return {
            words,
            characters,
            headings,
            images,
            tables,
            links,
            readingTime
        };
    },

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                this.showToast('Copied to clipboard!', 'success');
                return true;
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (success) {
                    this.showToast('Copied to clipboard!', 'success');
                    return true;
                }
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
            this.showToast('Failed to copy to clipboard', 'error');
        }
        return false;
    },

    showToast(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'info';
        if (type === 'success') icon = 'check_circle';
        if (type === 'error') icon = 'error';
        if (type === 'warning') icon = 'warning';

        toast.innerHTML = `
            <span class="material-icons-round toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);
        toast.offsetHeight; // trigger reflow
        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    },

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filename);
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    },

    lazyLoadImages(container) {
        if (!('IntersectionObserver' in window)) {
            const lazyImages = container.querySelectorAll('img[loading="lazy"]');
            lazyImages.forEach(img => {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                }
            });
            return;
        }

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    if (image.dataset.src) {
                        image.src = image.dataset.src;
                        image.removeAttribute('loading');
                    }
                    imageObserver.unobserve(image);
                }
            });
        });

        const lazyImages = container.querySelectorAll('img[loading="lazy"]');
        lazyImages.forEach(image => {
            imageObserver.observe(image);
            image.onerror = function() {
                image.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80" viewBox="0 0 100 80" style="background:%23252526;"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23888" font-family="sans-serif" font-size="10">Image Load Error</text></svg>`;
                image.classList.add('image-broken');
            };
        });
    },

    escapeHtml(string) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return string.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
};
