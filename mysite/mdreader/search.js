/**
 * Search Module
 * Implements highly performant, DOM-friendly searching (Ctrl+F) that highlights
 * query matches inside text nodes without breaking existing element event listeners.
 * Attached to window.SearchManager class.
 */

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

window.SearchManager = class SearchManager {
    constructor(container) {
        this.container = container;
        this.matches = [];
        this.currentIndex = -1;
        this.currentQuery = '';
    }

    search(query) {
        this.clear();
        if (!query || query.trim() === '') {
            return { count: 0, index: -1 };
        }

        this.currentQuery = query;
        const escapedQuery = escapeRegExp(query);
        const regex = new RegExp(escapedQuery, 'gi');
        const textNodes = [];

        const walk = document.createTreeWalker(
            this.container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const parent = node.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    
                    const tagName = parent.tagName;
                    if (tagName === 'SCRIPT' || 
                        tagName === 'STYLE' || 
                        tagName === 'TEXTAREA' || 
                        parent.closest('.search-exclude') ||
                        parent.closest('.mermaid') ||
                        parent.closest('pre code')
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        let node;
        while (node = walk.nextNode()) {
            if (node.nodeValue.trim().length > 0) {
                textNodes.push(node);
            }
        }

        const matchesList = [];

        for (let i = textNodes.length - 1; i >= 0; i--) {
            const textNode = textNodes[i];
            const val = textNode.nodeValue;
            let match;
            const nodeMatches = [];

            while ((match = regex.exec(val)) !== null) {
                nodeMatches.push({
                    index: match.index,
                    text: match[0]
                });
                if (regex.lastIndex === match.index) {
                    regex.lastIndex++;
                }
            }

            if (nodeMatches.length > 0) {
                for (let j = nodeMatches.length - 1; j >= 0; j--) {
                    const { index, text } = nodeMatches[j];
                    const mark = document.createElement('mark');
                    mark.className = 'search-match';
                    mark.textContent = text;

                    const after = textNode.splitText(index);
                    after.nodeValue = after.nodeValue.substring(text.length);
                    textNode.parentNode.insertBefore(mark, after);
                    matchesList.unshift(mark);
                }
            }
        }

        this.matches = matchesList;
        this.currentIndex = matchesList.length > 0 ? 0 : -1;
        
        if (this.currentIndex !== -1) {
            this.highlightActiveMatch();
        }

        return {
            count: this.matches.length,
            index: this.currentIndex
        };
    }

    clear() {
        const marks = this.container.querySelectorAll('mark.search-match');
        marks.forEach(mark => {
            const textNode = document.createTextNode(mark.textContent);
            mark.replaceWith(textNode);
        });
        this.container.normalize();
        this.matches = [];
        this.currentIndex = -1;
        this.currentQuery = '';
    }

    highlightActiveMatch() {
        this.container.querySelectorAll('mark.search-match-active').forEach(m => {
            m.classList.remove('search-match-active');
        });

        if (this.currentIndex >= 0 && this.currentIndex < this.matches.length) {
            const activeMatch = this.matches[this.currentIndex];
            activeMatch.classList.add('search-match-active');
            
            activeMatch.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    next() {
        if (this.matches.length === 0) return { count: 0, index: -1 };
        
        this.currentIndex = (this.currentIndex + 1) % this.matches.length;
        this.highlightActiveMatch();
        
        return {
            count: this.matches.length,
            index: this.currentIndex
        };
    }

    prev() {
        if (this.matches.length === 0) return { count: 0, index: -1 };
        
        this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
        this.highlightActiveMatch();

        return {
            count: this.matches.length,
            index: this.currentIndex
        };
    }
}
