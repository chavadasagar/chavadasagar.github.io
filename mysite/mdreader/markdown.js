/**
 * Markdown Module
 * Configures Marked.js with custom renderers for headings, code blocks,
 * admonition blocks, KaTeX math (block/inline), task lists, and emojis.
 * Also handles HTML sanitization with DOMPurify and Table of Contents generation.
 * Exposes window.MarkdownParser.
 */

const EMOJI_MAP = {
    ':smile:': '😄',
    ':laughing:': '😆',
    ':blush:': '😊',
    ':wink:': '😉',
    ':heart:': '❤️',
    ':thumbsup:': '👍',
    ':thumbsdown:': '👎',
    ':check:': '✅',
    ':x:': '❌',
    ':warning:': '⚠️',
    ':info:': 'ℹ️',
    ':rocket:': '🚀',
    ':bug:': '🐛',
    ':star:': '⭐',
    ':fire:': '🔥',
    ':tada:': '🎉',
    ':eyes:': '👀',
    ':100:': '💯',
    ':note:': '📝',
    ':bulb:': '💡'
};

function replaceEmojis(text) {
    return text.replace(/:[a-z0-9_]+:/g, (match) => {
        return EMOJI_MAP[match] || match;
    });
}

function getAdmonitionIcon(type) {
    switch (type.toUpperCase()) {
        case 'NOTE': return 'info';
        case 'TIP': return 'lightbulb';
        case 'IMPORTANT': return 'priority_high';
        case 'WARNING': return 'warning';
        case 'CAUTION': return 'report';
        default: return 'info';
    }
}

window.MarkdownParser = class MarkdownParser {
    constructor() {
        this.toc = [];
        this.mathBlocks = [];
        this.mathInline = [];
        this.setupMarked();
    }

    setupMarked() {
        if (typeof marked === 'undefined') return;

        const renderer = new marked.Renderer();
        const self = this;

        const slugify = (val) => {
            return val
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        };

        renderer.heading = function(arg1, arg2, arg3) {
            let text, level, raw;
            if (typeof arg1 === 'object' && arg1 !== null) {
                text = arg1.text;
                level = arg1.depth || arg1.level;
                raw = arg1.raw || arg1.text;
            } else {
                text = arg1;
                level = arg2;
                raw = arg3 || text;
            }
            const id = slugify(raw);
            
            self.toc.push({
                id,
                text: raw.replace(/<\/?[^>]+(>|$)/g, ""),
                level
            });

            return `
                <h${level} id="${id}">
                    <span class="heading-text">${text}</span>
                    <button class="heading-anchor-btn search-exclude" data-anchor="${id}" title="Copy Link to Heading">
                        <span class="material-icons-round">link</span>
                    </button>
                </h${level}>
            `;
        };

        renderer.code = function(arg1, arg2, arg3) {
            let code, lang;
            if (typeof arg1 === 'object' && arg1 !== null) {
                code = arg1.text;
                lang = arg1.lang;
            } else {
                code = arg1;
                lang = arg2;
            }
            lang = (lang || '').match(/\S*/)[0];
            
            if (lang === 'mermaid') {
                return `<pre class="mermaid-raw search-exclude">${escapeHtml(code)}</pre>`;
            }

            if (lang === 'katex' || lang === 'math') {
                return `<div class="katex-block-raw search-exclude">${escapeHtml(code)}</div>`;
            }

            let highlighted = code;
            let finalLang = lang || 'plaintext';
            if (typeof hljs !== 'undefined') {
                try {
                    if (lang && hljs.getLanguage(lang)) {
                        highlighted = hljs.highlight(code, { language: lang }).value;
                    } else {
                        const auto = hljs.highlightAuto(code);
                        highlighted = auto.value;
                        finalLang = auto.language || 'plaintext';
                    }
                } catch (e) {
                    console.error('HighlightJS error:', e);
                }
            }

            const lines = code.split(/\r?\n/);
            const lineNums = lines.map((_, i) => `<span>${i + 1}</span>`).join('');

            return `
                <div class="code-block-wrapper search-exclude" data-language="${finalLang}">
                    <div class="code-block-header">
                        <span class="code-block-lang">${finalLang.toUpperCase()}</span>
                        <div class="code-block-actions">
                            <button class="code-btn btn-wrap" title="Toggle Word Wrap">
                                <span class="material-icons-round">wrap_text</span>
                            </button>
                            <button class="code-btn btn-collapse" title="Collapse Block">
                                <span class="material-icons-round">expand_less</span>
                            </button>
                            <button class="code-btn btn-copy" title="Copy Code">
                                <span class="material-icons-round">content_copy</span>
                            </button>
                        </div>
                    </div>
                    <div class="code-container">
                        <div class="line-numbers">${lineNums}</div>
                        <pre><code class="hljs language-${finalLang}">${highlighted}</code></pre>
                    </div>
                </div>
            `;
        };

        renderer.blockquote = function(arg1) {
            let quote;
            if (typeof arg1 === 'object' && arg1 !== null) {
                quote = arg1.text;
            } else {
                quote = arg1;
            }
            
            const match = quote.match(/^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>)?/i);
            if (match) {
                const type = match[1].toUpperCase();
                const cleanedQuote = quote.replace(/^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>)?/i, '<p>');
                return `
                    <div class="admonition admonition-${type.toLowerCase()}">
                        <div class="admonition-header">
                            <span class="material-icons-round admonition-icon">${getAdmonitionIcon(type)}</span>
                            <span class="admonition-title">${type}</span>
                        </div>
                        <div class="admonition-content">
                            ${cleanedQuote}
                        </div>
                    </div>
                `;
            }
            return `<blockquote>${quote}</blockquote>`;
        };

        renderer.image = function(arg1, arg2, arg3) {
            let href, title, text;
            if (typeof arg1 === 'object' && arg1 !== null) {
                href = arg1.href;
                title = arg1.title;
                text = arg1.text;
            } else {
                href = arg1;
                title = arg2;
                text = arg3;
            }
            return `<img loading="lazy" data-src="${href}" src="" alt="${text}" title="${title || ''}" class="markdown-image">`;
        };

        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
            pedantic: false,
            smartypants: false
        });
    }

    preprocessMath(text) {
        this.mathBlocks = [];
        this.mathInline = [];

        let processed = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, math) => {
            const index = this.mathBlocks.length;
            this.mathBlocks.push(math.trim());
            return `%%MATH_BLOCK_${index}%%`;
        });

        processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
            const index = this.mathInline.length;
            this.mathInline.push(math.trim());
            return `%%MATH_INLINE_${index}%%`;
        });

        return processed;
    }

    postprocessMath(html) {
        if (typeof katex === 'undefined') return html;

        let result = html.replace(/%%MATH_BLOCK_(\d+)%%/g, (match, index) => {
            const math = this.mathBlocks[Number(index)];
            try {
                return `<div class="katex-block-wrapper search-exclude">${katex.renderToString(math, { displayMode: true, throwOnError: false })}</div>`;
            } catch (err) {
                console.error(err);
                return `<div class="katex-error">${escapeHtml(math)}</div>`;
            }
        });

        result = result.replace(/%%MATH_INLINE_(\d+)%%/g, (match, index) => {
            const math = this.mathInline[Number(index)];
            try {
                return katex.renderToString(math, { displayMode: false, throwOnError: false });
            } catch (err) {
                console.error(err);
                return `<span class="katex-error">${escapeHtml(math)}</span>`;
            }
        });

        result = result.replace(/<div class="katex-block-raw search-exclude">([\s\S]*?)<\/div>/g, (match, math) => {
            const decoded = decodeHtml(math);
            try {
                return `<div class="katex-block-wrapper search-exclude">${katex.renderToString(decoded, { displayMode: true, throwOnError: false })}</div>`;
            } catch (err) {
                console.error(err);
                return `<div class="katex-error">${escapeHtml(decoded)}</div>`;
            }
        });

        return result;
    }

    processFootnotes(text) {
        const footnotes = [];
        let footnoteIndex = 1;
        const fnMap = {};

        let cleanedText = text.replace(/^\[\^([^\]]+)\]:\s*(.*)$/gm, (match, label, content) => {
            fnMap[label] = {
                index: footnoteIndex++,
                content: content.trim()
            };
            return '';
        });

        cleanedText = cleanedText.replace(/\[\^([^\]]+)\]/g, (match, label) => {
            const fn = fnMap[label];
            if (fn) {
                return `<sup class="footnote-ref search-exclude"><a href="#fn-${fn.index}" id="fnref-${fn.index}">[${fn.index}]</a></sup>`;
            }
            return match;
        });

        const fnList = Object.values(fnMap).sort((a, b) => a.index - b.index);
        if (fnList.length > 0) {
            const fnHtml = `
                <div class="footnotes search-exclude">
                    <hr class="footnotes-sep">
                    <ol class="footnotes-list">
                        ${fnList.map(fn => `
                            <li id="fn-${fn.index}" class="footnote-item">
                                <span class="footnote-content">${marked.parseInline(fn.content)}</span>
                                <a href="#fnref-${fn.index}" class="footnote-backref" title="Back to reference">↩</a>
                            </li>
                        `).join('')}
                    </ol>
                </div>
            `;
            cleanedText += '\n\n' + fnHtml;
        }

        return cleanedText;
    }

    async parse(text) {
        this.toc = [];

        if (typeof marked === 'undefined') {
            return { html: `<pre>${escapeHtml(text)}</pre>`, toc: [] };
        }

        let processedText = replaceEmojis(text);
        processedText = this.preprocessMath(processedText);
        processedText = this.processFootnotes(processedText);

        let rawHtml = marked.parse(processedText);
        let renderedHtml = this.postprocessMath(rawHtml);

        let cleanHtml = renderedHtml;
        if (typeof DOMPurify !== 'undefined') {
            cleanHtml = DOMPurify.sanitize(renderedHtml, {
                ADD_TAGS: ['use', 'svg', 'foreignObject', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'annotation'],
                ADD_ATTR: ['target', 'class', 'id', 'data-anchor', 'data-language', 'data-src', 'loading', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'transform', 'displayMode']
            });
        }

        return {
            html: cleanHtml,
            toc: this.toc
        };
    }

    attachHandlers(container, onContentChange = null) {
        window.TableHandler.makeTablesInteractive(container);
        window.MermaidHandler.renderMermaidDiagrams(container);
        window.Utils.lazyLoadImages(container);

        container.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
            const code = wrapper.querySelector('pre code');
            const codeText = code.textContent;
            
            const btnCopy = wrapper.querySelector('.btn-copy');
            btnCopy.addEventListener('click', () => {
                navigator.clipboard.writeText(codeText).then(() => {
                    const icon = btnCopy.querySelector('.material-icons-round');
                    icon.textContent = 'done';
                    btnCopy.classList.add('success');
                    setTimeout(() => {
                        icon.textContent = 'content_copy';
                        btnCopy.classList.remove('success');
                    }, 2000);
                });
            });

            const btnWrap = wrapper.querySelector('.btn-wrap');
            btnWrap.addEventListener('click', () => {
                wrapper.classList.toggle('word-wrap');
                btnWrap.classList.toggle('active');
            });

            const btnCollapse = wrapper.querySelector('.btn-collapse');
            btnCollapse.addEventListener('click', () => {
                const isCollapsed = wrapper.classList.toggle('collapsed');
                const icon = btnCollapse.querySelector('.material-icons-round');
                icon.textContent = isCollapsed ? 'expand_more' : 'expand_less';
            });
        });

        container.querySelectorAll('.heading-anchor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const anchorId = btn.getAttribute('data-anchor');
                const url = new URL(window.location.href);
                url.hash = anchorId;
                navigator.clipboard.writeText(url.toString()).then(() => {
                    const icon = btn.querySelector('.material-icons-round');
                    icon.textContent = 'done';
                    setTimeout(() => {
                        icon.textContent = 'link';
                    }, 2000);
                });
            });
        });

        container.querySelectorAll('li input[type="checkbox"]').forEach((checkbox, i) => {
            checkbox.removeAttribute('disabled');
            checkbox.addEventListener('change', () => {
                if (onContentChange) {
                    onContentChange({
                        type: 'task-toggle',
                        index: i,
                        checked: checkbox.checked
                    });
                }
            });
        });
    }
}

function escapeHtml(string) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return string.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}
