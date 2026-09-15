/**
 * Custom Vanilla JavaScript Markdown Parser
 * Robust, secure, and zero-dependency markdown engine.
 */
(function (global) {
  'use strict';

  const MarkdownParser = {
    /**
     * Escape special HTML characters to prevent XSS attacks
     */
    escapeHtml: function (text) {
      if (typeof text !== 'string') return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * Sanitize URLs for links and images to prevent javascript: pseudo-protocols
     */
    sanitizeUrl: function (url) {
      if (!url) return '#';
      const clean = url.trim();
      if (/^(javascript|vbscript|data):/i.test(clean)) {
        return '#unsafe-url';
      }
      return clean;
    },

    /**
     * Parse inline markdown tokens
     */
    parseInline: function (text) {
      if (!text) return '';

      // Inline code `code` (protect it from other formatting)
      const codePlaceholders = [];
      text = text.replace(/`([^`]+)`/g, function (_, code) {
        const index = codePlaceholders.length;
        codePlaceholders.push('<code class="inline-code">' + MarkdownParser.escapeHtml(code) + '</code>');
        return `@@CODE_INLINE_${index}@@`;
      });

      // Images ![alt](url "title")
      text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (_, alt, url, title) {
        const safeUrl = MarkdownParser.sanitizeUrl(url);
        const safeAlt = MarkdownParser.escapeHtml(alt);
        const titleAttr = title ? ` title="${MarkdownParser.escapeHtml(title)}"` : '';
        return `<span class="md-image-wrapper"><img src="${safeUrl}" alt="${safeAlt}"${titleAttr} loading="lazy" class="md-image" onerror="this.classList.add('image-broken'); this.alt='⚠️ Image failed to load: ' + this.alt;" /><span class="md-image-caption">${safeAlt}</span></span>`;
      });

      // Links [text](url "title")
      text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (_, label, url, title) {
        const safeUrl = MarkdownParser.sanitizeUrl(url);
        const safeLabel = MarkdownParser.parseInlineFormatting(label);
        const titleAttr = title ? ` title="${MarkdownParser.escapeHtml(title)}"` : '';
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer"${titleAttr} class="md-link">${safeLabel} <span class="external-icon">↗</span></a>`;
      });

      // Standard formatting
      text = MarkdownParser.parseInlineFormatting(text);

      // Restore inline code
      text = text.replace(/@@CODE_INLINE_(\d+)@@/g, function (_, index) {
        return codePlaceholders[parseInt(index, 10)] || '';
      });

      return text;
    },

    /**
     * Helper for inline bold, italic, strikethrough, highlight
     */
    parseInlineFormatting: function (text) {
      // Bold + Italic (***text*** or ___text___)
      text = text.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');

      // Bold (**text** or __text__)
      text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

      // Italic (*text* or _text_)
      text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

      // Strikethrough (~~text~~)
      text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

      // Highlight (==text==)
      text = text.replace(/==(.*?)==/g, '<mark class="md-highlight">$1</mark>');

      // Keyboard badge ([[Ctrl]] or <kbd>Ctrl</kbd>)
      text = text.replace(/\[\[([^\]]+)\]\]/g, '<kbd class="md-kbd">$1</kbd>');

      return text;
    },

    /**
     * Main parse function converting full Markdown text to safe HTML
     */
    parse: function (markdown) {
      if (!markdown || typeof markdown !== 'string') {
        return '<p class="md-empty-preview"><em>Empty note. Start typing your thoughts...</em></p>';
      }

      // Normalize line endings
      const lines = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const htmlOutput = [];

      let inCodeBlock = false;
      let codeBlockLang = '';
      let codeBlockContent = [];

      let inBlockquote = false;
      let blockquoteContent = [];

      let inList = false;
      let listType = null; // 'ul' or 'ol'
      let listItems = [];

      let inTable = false;
      let tableRows = [];
      let tableAlignments = [];

      let taskItemCounter = 0;

      const flushCodeBlock = () => {
        if (inCodeBlock) {
          const rawCode = codeBlockContent.join('\n');
          const escapedCode = MarkdownParser.escapeHtml(rawCode);
          const langDisplay = codeBlockLang ? MarkdownParser.escapeHtml(codeBlockLang) : 'plaintext';
          const codeId = 'code_' + Math.random().toString(36).substr(2, 9);

          htmlOutput.push(`
            <div class="code-block-container" data-lang="${langDisplay}">
              <div class="code-block-header">
                <span class="code-block-lang">${langDisplay}</span>
                <button class="code-copy-btn" type="button" data-target="${codeId}" title="Copy code">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  <span>Copy</span>
                </button>
              </div>
              <pre><code id="${codeId}" class="code-content language-${langDisplay}">${escapedCode}</code></pre>
            </div>
          `);
          inCodeBlock = false;
          codeBlockLang = '';
          codeBlockContent = [];
        }
      };

      const flushBlockquote = () => {
        if (inBlockquote) {
          const rawText = blockquoteContent.join('\n');
          // Check for Alert Callouts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
          const calloutMatch = rawText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*\n)?([\s\S]*)$/i);

          if (calloutMatch) {
            const type = calloutMatch[1].toUpperCase();
            const body = calloutMatch[2];
            const parsedBody = MarkdownParser.parse(body);

            const iconMap = {
              NOTE: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
              TIP: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>',
              IMPORTANT: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
              WARNING: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
              CAUTION: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
            };

            htmlOutput.push(`
              <div class="callout callout-${type.toLowerCase()}">
                <div class="callout-header">
                  <span class="callout-icon">${iconMap[type] || ''}</span>
                  <span class="callout-title">${type}</span>
                </div>
                <div class="callout-content">${parsedBody}</div>
              </div>
            `);
          } else {
            // Standard blockquote with nested content parsed
            const parsedInner = MarkdownParser.parse(rawText);
            htmlOutput.push(`<blockquote class="md-blockquote">${parsedInner}</blockquote>`);
          }
          inBlockquote = false;
          blockquoteContent = [];
        }
      };

      const flushList = () => {
        if (inList) {
          const listHtml = listItems.join('');
          htmlOutput.push(`<${listType} class="md-list md-${listType}">${listHtml}</${listType}>`);
          inList = false;
          listType = null;
          listItems = [];
        }
      };

      const flushTable = () => {
        if (inTable && tableRows.length > 0) {
          let tableHtml = '<div class="table-container"><table class="md-table">';
          // Header row
          const headerCells = tableRows[0];
          tableHtml += '<thead><tr>';
          headerCells.forEach((cell, idx) => {
            const align = tableAlignments[idx] ? ` style="text-align: ${tableAlignments[idx]};"` : '';
            tableHtml += `<th${align}>${MarkdownParser.parseInline(cell)}</th>`;
          });
          tableHtml += '</tr></thead>';

          // Body rows
          if (tableRows.length > 1) {
            tableHtml += '<tbody>';
            for (let r = 1; r < tableRows.length; r++) {
              tableHtml += '<tr>';
              tableRows[r].forEach((cell, idx) => {
                const align = tableAlignments[idx] ? ` style="text-align: ${tableAlignments[idx]};"` : '';
                tableHtml += `<td${align}>${MarkdownParser.parseInline(cell)}</td>`;
              });
              tableHtml += '</tr>';
            }
            tableHtml += '</tbody>';
          }

          tableHtml += '</table></div>';
          htmlOutput.push(tableHtml);

          inTable = false;
          tableRows = [];
          tableAlignments = [];
        }
      };

      const flushAll = () => {
        flushCodeBlock();
        flushBlockquote();
        flushList();
        flushTable();
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 1. Fenced Code Blocks (``` or ~~~)
        const codeFenceMatch = line.match(/^(\`\`\`|\~\~\~)(.*)$/);
        if (codeFenceMatch) {
          if (!inCodeBlock) {
            flushAll();
            inCodeBlock = true;
            codeBlockLang = codeFenceMatch[2].trim();
            codeBlockContent = [];
          } else {
            flushCodeBlock();
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockContent.push(line);
          continue;
        }

        // 2. Blockquotes (> text)
        if (line.match(/^>\s?/)) {
          if (!inBlockquote) {
            flushList();
            flushTable();
            inBlockquote = true;
            blockquoteContent = [];
          }
          blockquoteContent.push(line.replace(/^>\s?/, ''));
          continue;
        } else if (inBlockquote) {
          flushBlockquote();
        }

        // 3. Tables (| cell | cell |)
        if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
          flushList();
          const cells = trimmed
            .slice(1, -1)
            .split('|')
            .map(c => c.trim());

          // Check if this is separator row: |:---|:---:|---:|
          const isSeparator = cells.every(c => /^:?-+:?$/.test(c));
          if (isSeparator) {
            tableAlignments = cells.map(c => {
              const left = c.startsWith(':');
              const right = c.endsWith(':');
              if (left && right) return 'center';
              if (right) return 'right';
              if (left) return 'left';
              return 'left';
            });
            inTable = true;
            continue;
          }

          if (!inTable) {
            inTable = true;
            tableRows = [cells];
          } else {
            tableRows.push(cells);
          }
          continue;
        } else if (inTable) {
          flushTable();
        }

        // 4. Horizontal Rules (---, ***, ___)
        if (/^(?:[-*_]\s*){3,}$/.test(trimmed)) {
          flushAll();
          htmlOutput.push('<hr class="md-hr" />');
          continue;
        }

        // 5. Headings (# Heading)
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          flushAll();
          const level = headingMatch[1].length;
          const text = headingMatch[2].trim();
          const slug = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
          const parsedText = MarkdownParser.parseInline(text);
          htmlOutput.push(`<h${level} id="${slug}" class="md-h${level}"><a href="#${slug}" class="heading-anchor">#</a> ${parsedText}</h${level}>`);
          continue;
        }

        // 6. Task List Items (- [ ] or - [x])
        const taskMatch = line.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          if (!inList || listType !== 'ul') {
            flushAll();
            inList = true;
            listType = 'ul';
            listItems = [];
          }
          const isChecked = taskMatch[3].toLowerCase() === 'x';
          const taskText = MarkdownParser.parseInline(taskMatch[4]);
          const currentTaskId = ++taskItemCounter;
          const checkedAttr = isChecked ? 'checked' : '';
          const completedClass = isChecked ? 'task-completed' : '';

          listItems.push(`
            <li class="task-list-item ${completedClass}" data-line-index="${i}">
              <label class="task-checkbox-label">
                <input type="checkbox" class="task-checkbox" ${checkedAttr} data-line="${i}" />
                <span class="custom-checkbox"></span>
                <span class="task-text">${taskText}</span>
              </label>
            </li>
          `);
          continue;
        }

        // 7. Regular Unordered List (- item, * item, + item)
        const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
        if (ulMatch) {
          if (!inList || listType !== 'ul') {
            flushAll();
            inList = true;
            listType = 'ul';
            listItems = [];
          }
          const itemText = MarkdownParser.parseInline(ulMatch[3]);
          listItems.push(`<li class="md-li">${itemText}</li>`);
          continue;
        }

        // 8. Ordered List (1. item)
        const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (olMatch) {
          if (!inList || listType !== 'ol') {
            flushAll();
            inList = true;
            listType = 'ol';
            listItems = [];
          }
          const itemText = MarkdownParser.parseInline(olMatch[3]);
          listItems.push(`<li class="md-li">${itemText}</li>`);
          continue;
        }

        // 9. Blank Lines
        if (trimmed === '') {
          flushAll();
          continue;
        }

        // 10. Paragraphs / Normal text
        flushAll();
        const paragraphText = MarkdownParser.parseInline(trimmed);
        htmlOutput.push(`<p class="md-p">${paragraphText}</p>`);
      }

      flushAll();

      return htmlOutput.join('\n');
    }
  };

  // Expose parser globally
  global.MarkdownParser = MarkdownParser;
})(typeof window !== 'undefined' ? window : this);
