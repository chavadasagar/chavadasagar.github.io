/**
 * DevDocs — Digital Card Catalog for Code Knowledge
 * Vanilla JavaScript Engine
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Application State & Storage
  // ---------------------------------------------------------------------------
  const state = {
    summary: null,
    masterIndex: [],
    categoriesMap: new Map(), // categoryName -> Map(subjectName -> [topics])
    subjectsCache: new Map(), // subjectSlug -> Array<topicData>
    currentRoute: { type: 'home', category: null, subject: null, topicId: null },
    theme: localStorage.getItem('devdocs_theme') || 'light',
    sidebarCollapsed: localStorage.getItem('devdocs_sidebar_collapsed') === 'true',
    lastOpenedTopic: null,
    searchSelectedIndex: -1,
    searchResults: [],
    sidebarFilterQuery: ''
  };

  try {
    const savedLast = localStorage.getItem('devdocs_last_topic');
    if (savedLast) state.lastOpenedTopic = JSON.parse(savedLast);
  } catch (e) {
    console.warn('Failed to parse last topic from localStorage', e);
  }

  // DOM Elements
  const dom = {
    html: document.documentElement,
    app: document.getElementById('app'),
    readingProgress: document.getElementById('readingProgress'),
    sidebar: document.getElementById('appSidebar'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    sidebarCollapseToggle: document.getElementById('sidebarCollapseToggle'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    sidebarNav: document.getElementById('sidebarNav'),
    sidebarFilterInput: document.getElementById('sidebarFilterInput'),
    sidebarFilterClear: document.getElementById('sidebarFilterClear'),
    mainContent: document.getElementById('mainContent'),
    viewContainer: document.getElementById('viewContainer'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    searchInput: document.getElementById('catalogSearchInput'),
    searchDropdown: document.getElementById('searchDropdown'),
    resumeTopicBtn: document.getElementById('resumeTopicBtn'),
    toast: document.getElementById('toastNotification')
  };

  // ---------------------------------------------------------------------------
  // 2. Data Cleaning & Noise Stripping Engine
  // ---------------------------------------------------------------------------
  const BoilerplateCleaner = {
    boilerplateHeadings: /^(w3schools|select another|all our services|track your progress|get certified|become certified|contact sales|remove ads|video:|learning by|create a w3schools account|built for organizations|set up a semester|results you can measure|simple pricing|not sure yet\?|what our customers say|frequently asked questions|ready to train|about us|about w3schools|chatgpt|you can help|add a link to us|time's up!|spaces in your|ready to build|choose your plan|meet kai|practice any language|start with templates|see what's possible|what developers say|you're never alone|css cert|css examples|css references|css sass|css basic|css advanced|css flexbox|css grid|css responsive|react tutorial|react hooks|react cert|built-in compone|react elements|popular libraries|react exercises|html basic|html advanced|html media|html graphics|html examples|html references|html forms|html apis|html cert|js tutorial|js objects|js functions|js classes|js async|js html dom|js browser bom|js web apis|js ajax|js json|js vs jquery|js graphics|js examples|js references|python tutorial|python methods|python classes|python modules|python file handling|python database|python machine learning|python examples|python reference)/i,
    
    certAndQuizWords: /\b(cert|certificate|quiz|exercises|exam|diploma|syllabus|bootcamp|interview prep|challenges|practice problems)\b/i,

    isBoilerplateHeading(heading) {
      if (!heading) return true;
      const h = heading.trim();
      if (this.boilerplateHeadings.test(h)) return true;
      if (this.certAndQuizWords.test(h)) return true;
      return false;
    },

    isBoilerplateContent(content) {
      if (!content) return true;
      const c = content.trim();
      if (c.length === 0) return true;
      if (/sales@w3schools\.com/i.test(c)) return true;
      if (/verify\.w3schools\.com/i.test(c)) return true;
      if (/Stale Refsnes/i.test(c)) return true;
      if (/^ny:-->/i.test(c)) return true;
      return false;
    },

    isNavListContent(content, heading, topicTitle) {
      if (!content) return true;
      const clean = content.replace(/<[^>]+>/g, ' ').trim();
      if (clean.length === 0) return true;

      const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
      
      const codeChallenges = lines.filter(l => l === 'Code Challenge' || l === 'Code Challenges').length;
      if (codeChallenges >= 2) return true;

      const navIndicators = lines.filter(l => /^(Exercises|Code Challenge|Quiz|\? Home|\? Previous|Next \?)$/i.test(l)).length;
      if (lines.length >= 3 && navIndicators >= 1) return true;

      if (lines.length >= 3) {
        const shortLines = lines.filter(l => l.length <= 40).length;
        if (shortLines === lines.length) {
          const navKeywords = lines.filter(l => /(HOME|Intro|Getting Started|Tutorial|Reference|Challenge|Exercises|Syntax|Methods|Properties|Objects|Classes|Functions|Files|Strings|Arrays|Variables|Data Types|Operators|Conditions|Loops|Scope|Structs|Enums|Memory|Errors|Pointers|Date|Math|Regex|JSON|Colors|Backgrounds|Borders|Margins|Padding|Height|Box Model|Outline|Text|Fonts|Icons|Links|Lists|Tables|Display|Position|Overflow|Float|Align|Combinators|Opacity|Navbar|Dropdowns|Gallery|Sprites|Forms|Counters|Units|Flexbox|Grid|Responsive|Components|Hooks|Props|State|Events|Router|Context|Portals|Suspense|Redux|Zustand)/i.test(l)).length;
          if (navKeywords >= 2) {
            return true;
          }
        }
      }

      if (heading && /^(HTML|CSS|JS|JavaScript|Python|SQL|React|C|C\+\+|Java|PHP|Node\.js|Git|MongoDB|MySQL|NumPy|Pandas|XML)\s+(Tutorial|Reference|Overview|Examples|How To|Hooks|Classes|Functions|Files|Structures|Memory|Errors|Projects)$/i.test(heading)) {
        if (!topicTitle.toLowerCase().includes(heading.toLowerCase().replace(/tutorial|reference|overview|examples/i, '').trim())) {
          if (lines.length >= 2 && lines.every(l => l.length < 50)) {
            return true;
          }
        }
      }

      return false;
    },

    cleanText(text) {
      if (!text) return '';
      let res = text;
      res = res.replace(/\? Previous\s*Next \?/gi, '');
      res = res.replace(/\? Home\s*Next \?/gi, '');
      res = res.replace(/ny:-->/gi, '');
      res = res.replace(/<!--|-->/gi, '');
      res = res.replace(/Try it Yourself [^\n]*/gi, '');
      res = res.replace(/Try it Yourself/gi, '');
      res = res.replace(/REMOVE ADS/gi, '');
      res = res.replace(/\+1\s+Sign in to track progress/gi, '');
      res = res.replace(/\uFFFD/g, '');
      return res.trim();
    },

    cleanSections(sections, topicTitle) {
      if (!Array.isArray(sections)) return [];
      const result = [];

      for (const sec of sections) {
        const h = sec.heading ? sec.heading.trim() : '';
        const c = sec.content ? sec.content.trim() : '';

        if (this.isBoilerplateHeading(h)) continue;
        if (this.isBoilerplateContent(c)) continue;
        if (this.isNavListContent(c, h, topicTitle)) continue;

        const cleanedContent = this.cleanText(c);
        if (cleanedContent.length > 0) {
          result.push({
            heading: h || topicTitle,
            content: cleanedContent
          });
        }
      }

      return result;
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Lightweight Syntax Highlighter Engine
  // ---------------------------------------------------------------------------
  const SyntaxHighlighter = {
    escapeHtml(str) {
      return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    highlight(rawCode, language) {
      if (!rawCode) return '';
      const lang = (language || '').toLowerCase().trim();
      const escaped = this.escapeHtml(rawCode);

      if (['html', 'xml', 'svg'].includes(lang)) {
        return this.highlightHtml(escaped);
      } else if (['css', 'scss', 'sass'].includes(lang)) {
        return this.highlightCss(escaped);
      } else if (['javascript', 'js', 'typescript', 'ts', 'json', 'react', 'jsx', 'tsx'].includes(lang)) {
        return this.highlightJs(escaped);
      } else if (['python', 'py', 'numpy', 'pandas', 'scipy', 'matplotlib'].includes(lang)) {
        return this.highlightPython(escaped);
      } else if (['sql', 'mysql', 'postgresql'].includes(lang)) {
        return this.highlightSql(escaped);
      } else if (['c', 'cpp', 'c++', 'c__', 'java', 'cs', 'csharp', 'php', 'rust', 'go', 'kotlin'].includes(lang)) {
        return this.highlightCStyle(escaped);
      }

      return this.highlightGeneric(escaped);
    },

    highlightHtml(code) {
      return code
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>')
        .replace(/(&lt;!DOCTYPE[\s\S]*?&gt;)/gi, '<span class="token-keyword">$1</span>')
        .replace(/(&lt;\/?)([a-zA-Z0-9\-]+)([\s\S]*?)(&gt;)/g, function (_, open, tag, attrs, close) {
          const highlightedAttrs = attrs.replace(/([a-zA-Z\-:@]+)(=)(&quot;.*?&quot;|&#039;.*?&#039;|[^\s&]+)?/g, function (__, name, eq, val) {
            return `<span class="token-attr">${name}</span>${eq}${val ? `<span class="token-string">${val}</span>` : ''}`;
          });
          return `${open}<span class="token-tag">${tag}</span>${highlightedAttrs}${close}`;
        });
    },

    highlightCss(code) {
      return code
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>')
        .replace(/([a-zA-Z\-]+)(\s*:)/g, '<span class="token-attr">$1</span>$2')
        .replace(/(#[a-zA-Z0-9_\-]+|\.[a-zA-Z0-9_\-]+|:[a-zA-Z\-]+)/g, '<span class="token-keyword">$1</span>')
        .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="token-string">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw|s|ms|deg)?\b/g, '<span class="token-number">$1$2</span>');
    },

    highlightJs(code) {
      return code
        .replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, '<span class="token-comment">$1</span>')
        .replace(/(&quot;.*?&quot;|&#039;.*?&#039;|`.*?`)/g, '<span class="token-string">$1</span>')
        .replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|class|extends|new|this|super|import|export|from|as|async|await|try|catch|finally|throw|typeof|instanceof|void|yield|static|get|set|true|false|null|undefined)\b/g, '<span class="token-keyword">$1</span>')
        .replace(/\b(console|document|window|Math|Array|Object|String|Number|Boolean|Date|RegExp|Promise|Map|Set|JSON|fetch)\b/g, '<span class="token-builtin">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>')
        .replace(/([a-zA-Z0-9_$]+)(\s*\()/g, '<span class="token-function">$1</span>$2');
    },

    highlightPython(code) {
      return code
        .replace(/(#[^\n]*)/g, '<span class="token-comment">$1</span>')
        .replace(/(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|&#039;&#039;&#039;[\s\S]*?&#039;&#039;&#039;)/g, '<span class="token-string">$1</span>')
        .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="token-string">$1</span>')
        .replace(/\b(def|class|import|from|return|if|elif|else|for|while|in|not|and|or|is|try|except|finally|raise|with|as|lambda|yield|pass|break|continue|global|nonlocal|assert|del|True|False|None)\b/g, '<span class="token-keyword">$1</span>')
        .replace(/\b(print|len|range|str|int|float|list|dict|set|tuple|type|open|enumerate|zip|map|filter|sum|max|min|abs|round)\b/g, '<span class="token-builtin">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>')
        .replace(/(@[a-zA-Z0-9_.]+)/g, '<span class="token-keyword">$1</span>')
        .replace(/([a-zA-Z0-9_]+)(\s*\()/g, '<span class="token-function">$1</span>$2');
    },

    highlightSql(code) {
      return code
        .replace(/(--[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>')
        .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="token-string">$1</span>')
        .replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|GROUP\s+BY|ORDER\s+BY|HAVING|CREATE|ALTER|DROP|TABLE|DATABASE|INDEX|VIEW|PRIMARY\s+KEY|FOREIGN\s+KEY|VALUES|SET|DISTINCT|AS|AND|OR|NOT|NULL|IS|LIKE|BETWEEN|IN|LIMIT|OFFSET|UNION|ALL|CASE|WHEN|THEN|ELSE|END|EXISTS|COUNT|SUM|AVG|MIN|MAX|VARCHAR|INT|BIGINT|FLOAT|DOUBLE|DECIMAL|DATE|DATETIME|TIMESTAMP|BOOLEAN|TEXT)\b/gi, '<span class="token-keyword">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>');
    },

    highlightCStyle(code) {
      return code
        .replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, '<span class="token-comment">$1</span>')
        .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="token-string">$1</span>')
        .replace(/(#[a-zA-Z_]+)/g, '<span class="token-keyword">$1</span>')
        .replace(/\b(int|float|double|char|void|bool|long|short|unsigned|signed|struct|class|enum|union|typedef|auto|const|static|extern|register|volatile|public|private|protected|virtual|override|template|typename|using|namespace|new|delete|return|if|else|for|while|do|switch|case|break|continue|default|goto|sizeof|nullptr|NULL|try|catch|throw|fn|let|mut|pub|impl|trait|match|go|defer|package|import|func|interface)\b/g, '<span class="token-keyword">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>')
        .replace(/([a-zA-Z0-9_$]+)(\s*\()/g, '<span class="token-function">$1</span>$2');
    },

    highlightGeneric(code) {
      return code
        .replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="token-string">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>');
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Utility Functions
  // ---------------------------------------------------------------------------
  function getSubjectSlug(subjectName) {
    if (!subjectName) return '';
    return subjectName
      .toLowerCase()
      .replace(/\+\+/g, '__')
      .replace(/[\s\.\-]+/g, '_');
  }

  function formatCount(num) {
    if (!num) return '0';
    return Number(num).toLocaleString();
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.remove('hidden');
    clearTimeout(dom.toast._timeout);
    dom.toast._timeout = setTimeout(() => {
      dom.toast.classList.add('hidden');
    }, 2000);
  }

  function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
      if (btnElement) {
        btnElement.classList.add('copied');
        setTimeout(() => {
          btnElement.classList.remove('copied');
        }, 1500);
      }
      showToast('STAMP: COPIED TO CLIPBOARD');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      showToast('PRESS CTRL+C TO COPY');
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Intelligent Content, Code & Key-Value Parsing
  // ---------------------------------------------------------------------------
  function cleanCodeIndentation(codeStr) {
    if (!codeStr) return '';
    const lines = codeStr.split('\n');
    while (lines.length > 0 && !lines[0].trim()) lines.shift();
    while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
    return lines.join('\n');
  }

  function renderCodeCard(rawCode, language, labelPrefix) {
    const lang = language || 'code';
    const highlighted = SyntaxHighlighter.highlight(rawCode, lang);
    const escapedRaw = SyntaxHighlighter.escapeHtml(rawCode);
    const badgeLabel = labelPrefix ? `${lang.toUpperCase()} // ${labelPrefix}` : lang.toUpperCase();

    return `
      <div class="code-card-breakout">
        <div class="code-card-header">
          <span class="code-header-lang">${badgeLabel}</span>
          <button class="code-copy-btn" onclick="window.DevDocs.copyCode(this)" data-code="${escapedRaw}" title="Copy code snippet" aria-label="Copy code">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
        <pre class="code-content-pre"><code>${highlighted}</code></pre>
      </div>
    `;
  }

  function isPotentialKey(str) {
    if (!str) return false;
    const s = str.trim();
    if (s.length > 25) return false;
    if (/^(HUE|SATURATION|LIGHTNESS|ALPHA|RED|GREEN|BLUE|COLOR|OPACITY|RADIUS|WIDTH|HEIGHT|TOP|LEFT|RIGHT|BOTTOM|MARGIN|PADDING|FONT|SIZE|WEIGHT|STYLE|FAMILY|TRANSFORM|TRANSITION|ANIMATION|BACKGROUND|BORDER|DISPLAY|POSITION|FLEX|GRID|ALIGN|JUSTIFY|PARAMETER|ATTRIBUTE|PROPERTY|VALUE|DEFAULT|TYPE|NAME|KEY|STATUS|RESULT|OUTPUT|INPUT|OPTION|ARGUMENT)$/i.test(s)) {
      return true;
    }
    if (s.length <= 16 && /^[A-Z0-9_\-\s]+$/i.test(s) && !/[.,;:!?]$/.test(s) && !s.includes('http')) {
      return true;
    }
    return false;
  }

  function isPotentialValue(str) {
    if (!str) return false;
    const s = str.trim();
    if (s.length > 35) return false;
    if (/^(\d+(\.\d+)?%?|\d+\s*(px|em|rem|deg|vh|vw|s|ms)|#[0-9a-fA-F]{3,8}|rgba?\(.*\)|hsla?\(.*\)|true|false|none|auto|inherit|initial|[a-zA-Z0-9_\-\.\/]+)$/i.test(s)) {
      return true;
    }
    return false;
  }

  function isCodeStartLine(str) {
    if (!str) return false;
    const s = str.trim();
    if (/^<!DOCTYPE/i.test(s)) return true;
    if (/^<(html|head|title|body|div|p|span|script|style|link|meta|table|tr|td|th|ul|ol|li|form|input|button|svg|canvas|section|article|header|footer|nav|aside|main|h[1-6]|pre|code)[\s>]/i.test(s)) return true;
    if (/^[a-zA-Z0-9_\-\.#:,\s]+\s*\{\s*$/.test(s)) return true;
    if (/^(body|html|h[1-6]|p|div|\.[a-zA-Z0-9_\-]+|#[a-zA-Z0-9_\-]+)\s*\{/.test(s)) return true;
    if (/^(const|let|var|function|def|class|import|from|export|#include|package)\s+/i.test(s)) return true;
    if (/^(hsla?|rgba?)\([^\)]+\)/i.test(s)) return true;
    return false;
  }

  function formatInlineProse(text) {
    if (!text) return '';
    let escaped = SyntaxHighlighter.escapeHtml(text);
    
    // Automatically turn inline HTML tags into clean <code> tags
    escaped = escaped.replace(/(&lt;!?[a-zA-Z0-9\-]+(\s+[^&<>]*)?&gt;)/g, '<code class="inline-code">$1</code>');

    return escaped;
  }

  function formatSectionContent(rawContent, subjectSlug) {
    if (!rawContent) return '';

    let text = BoilerplateCleaner.cleanText(rawContent);
    if (!text) return '';

    text = text.replace(/Try it Yourself[^\n]*/gi, '');

    const output = [];
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      if (!line) {
        i++;
        continue;
      }

      // 1. Check for "Example" header
      if (/^Example(\s*[:\-]|\s+Explained)?$/i.test(line)) {
        if (/Explained/i.test(line)) {
          output.push(`<h4 class="section-subheading">Example Explained</h4>`);
          i++;
          continue;
        }

        i++;
        const codeLines = [];
        while (i < lines.length) {
          const cl = lines[i];
          const trimmedCl = cl.trim();

          if (/^Example Explained/i.test(trimmedCl)) break;
          if (/^Try it Yourself/i.test(trimmedCl)) {
            i++;
            continue;
          }
          if (/^(Note|Important|Tip|Warning):/i.test(trimmedCl)) break;

          // End code block if we hit a full English sentence after standard tags
          if (/^The\s+[a-zA-Z<].*\b(defines|is|specifies|contains|tells|describes|represents)\b/i.test(trimmedCl) && codeLines.length >= 3) {
            break;
          }

          codeLines.push(cl);
          i++;
        }

        const cleanCode = cleanCodeIndentation(codeLines.join('\n'));
        if (cleanCode) {
          output.push(renderCodeCard(cleanCode, subjectSlug, 'EXAMPLE'));
        }
        continue;
      }

      // 2. Check for Note / Tip / Warning
      if (/^(Note|Important|Tip|Warning):\s*/i.test(line)) {
        const match = line.match(/^(Note|Important|Tip|Warning)/i);
        const title = match ? match[0] : 'Note';
        let body = line.replace(/^(Note|Important|Tip|Warning):\s*/i, '');
        i++;
        while (i < lines.length && lines[i].trim() && !/^(Note|Important|Tip|Warning|Example):/i.test(lines[i].trim()) && !isCodeStartLine(lines[i].trim())) {
          body += ' ' + lines[i].trim();
          i++;
        }
        output.push(`
          <div class="librarian-note">
            <strong>${SyntaxHighlighter.escapeHtml(title)}</strong>
            <div>${formatInlineProse(body)}</div>
          </div>
        `);
        continue;
      }

      // 3. Standalone Code Block (starts with <!DOCTYPE, <html, body {, function, etc.)
      if (isCodeStartLine(line)) {
        const codeLines = [];
        while (i < lines.length) {
          const cl = lines[i];
          const trimmedCl = cl.trim();
          if (/^(Note|Important|Tip|Warning|Example):/i.test(trimmedCl)) break;
          if (/^The\s+[a-zA-Z<].*\b(defines|is|specifies|contains|tells|describes|represents)\b/i.test(trimmedCl) && codeLines.length >= 3) break;
          
          codeLines.push(cl);
          i++;
          if (/^<\/(html|svg|xml)>$/i.test(trimmedCl) || (trimmedCl === '}' && codeLines.length >= 3)) {
            if (i < lines.length && !isCodeStartLine(lines[i].trim()) && !lines[i].trim().startsWith('<')) {
              break;
            }
          }
        }
        const cleanCode = cleanCodeIndentation(codeLines.join('\n'));
        if (cleanCode) {
          output.push(renderCodeCard(cleanCode, subjectSlug));
        }
        continue;
      }

      // 4. Key-Value sequence (e.g. HSL, RGB slider tags)
      if (isPotentialKey(line) && i + 1 < lines.length && isPotentialValue(lines[i + 1].trim())) {
        const pairs = [];
        while (i < lines.length - 1 && isPotentialKey(lines[i].trim()) && isPotentialValue(lines[i + 1].trim())) {
          pairs.push({ key: lines[i].trim(), val: lines[i + 1].trim() });
          i += 2;
        }
        if (pairs.length > 0) {
          const rowsHtml = pairs.map(p => `
            <div class="kv-row">
              <span class="kv-key">${SyntaxHighlighter.escapeHtml(p.key)}</span>
              <span class="kv-val">${SyntaxHighlighter.escapeHtml(p.val)}</span>
            </div>
          `).join('');
          output.push(`
            <div class="key-value-card">
              ${rowsHtml}
            </div>
          `);
          continue;
        }
      }

      // 5. Normal coherent prose paragraph
      let paraLines = [line];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (!nextLine) {
          i++;
          break;
        }
        if (/^(Note|Important|Tip|Warning|Example):/i.test(nextLine) || isCodeStartLine(nextLine) || isPotentialKey(nextLine)) {
          break;
        }
        paraLines.push(nextLine);
        i++;
      }

      const fullPara = paraLines.join(' ').replace(/\s+/g, ' ').trim();
      if (fullPara) {
        output.push(`<p>${formatInlineProse(fullPara)}</p>`);
      }
    }

    return output.join('');
  }

  // ---------------------------------------------------------------------------
  // 6. Data Initialization & Lazy Loading
  // ---------------------------------------------------------------------------
  async function loadInitialData() {
    try {
      if (window.DEVDOCS_SUMMARY) {
        state.summary = window.DEVDOCS_SUMMARY;
      } else {
        try {
          const summaryRes = await fetch('data/summary_report.json');
          if (summaryRes.ok) state.summary = await summaryRes.json();
        } catch (e) {
          console.warn('Fetch summary fallback failed', e);
        }
      }

      if (window.DEVDOCS_INDEX && Array.isArray(window.DEVDOCS_INDEX)) {
        state.masterIndex = window.DEVDOCS_INDEX;
      } else {
        const indexRes = await fetch('data/w3schools_master_index.json');
        if (!indexRes.ok) throw new Error('Failed to load master index');
        state.masterIndex = await indexRes.json();
      }

      buildCategoriesMap();
      renderSidebarNav();
      updateResumeButton();
      handleHashRoute();

    } catch (err) {
      console.error('Error initializing card catalog:', err);
      dom.viewContainer.innerHTML = `
        <div class="catalog-message-card">
          <span class="catalog-message-stamp">INDEX ERROR</span>
          <h2 class="catalog-message-title">Unable to Read Catalog Index</h2>
          <p class="catalog-message-desc">Could not load the master catalog data. Please check data files.</p>
        </div>
      `;
    }
  }

  function buildCategoriesMap() {
    state.categoriesMap.clear();
    for (const item of state.masterIndex) {
      const cat = item.category || 'General';
      const subj = item.subject || 'Other';

      if (!state.categoriesMap.has(cat)) {
        state.categoriesMap.set(cat, new Map());
      }
      const subjectsMap = state.categoriesMap.get(cat);

      if (!subjectsMap.has(subj)) {
        subjectsMap.set(subj, []);
      }
      subjectsMap.get(subj).push(item);
    }
  }

  async function fetchSubjectTopics(subjectSlug) {
    if (state.subjectsCache.has(subjectSlug)) {
      return state.subjectsCache.get(subjectSlug);
    }

    if (window.DEVDOCS_SUBJECTS && window.DEVDOCS_SUBJECTS[subjectSlug]) {
      state.subjectsCache.set(subjectSlug, window.DEVDOCS_SUBJECTS[subjectSlug]);
      return window.DEVDOCS_SUBJECTS[subjectSlug];
    }

    // Dynamic <script> tag loader (works 100% in file:/// without any web server)
    try {
      const data = await new Promise((resolve, reject) => {
        if (window.DEVDOCS_SUBJECTS && window.DEVDOCS_SUBJECTS[subjectSlug]) {
          return resolve(window.DEVDOCS_SUBJECTS[subjectSlug]);
        }

        const script = document.createElement('script');
        script.src = `data/subjects/${subjectSlug}.js`;
        script.onload = () => {
          if (window.DEVDOCS_SUBJECTS && window.DEVDOCS_SUBJECTS[subjectSlug]) {
            resolve(window.DEVDOCS_SUBJECTS[subjectSlug]);
          } else {
            reject(new Error(`Subject data for "${subjectSlug}" not found in window.`));
          }
        };
        script.onerror = () => reject(new Error(`Failed to load data/subjects/${subjectSlug}.js`));
        document.head.appendChild(script);
      });

      state.subjectsCache.set(subjectSlug, data);
      return data;
    } catch (scriptErr) {
      try {
        const res = await fetch(`data/subjects/${subjectSlug}.json`);
        if (!res.ok) throw new Error(`Subject data for "${subjectSlug}" not found (${res.status})`);
        const data = await res.json();
        state.subjectsCache.set(subjectSlug, data);
        return data;
      } catch (fetchErr) {
        console.error(`Failed to load subject: ${subjectSlug}`, scriptErr, fetchErr);
        throw new Error(`Unable to load topics for ${subjectSlug}.`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Routing & Views
  // ---------------------------------------------------------------------------
  function parseHash() {
    const hash = window.location.hash.slice(1);
    if (!hash || hash === '/' || hash === '') {
      return { type: 'home' };
    }

    const parts = hash.split('/').filter(Boolean);
    if (parts[0] === 'category' && parts[1]) {
      return { type: 'category', category: decodeURIComponent(parts[1]) };
    }
    if (parts[0] === 'subject' && parts[1]) {
      return { type: 'subject', subject: parts[1] };
    }
    if (parts[0] === 'topic' && parts[1] && parts[2]) {
      return { type: 'topic', subject: parts[1], topicId: parts[2] };
    }

    return { type: 'home' };
  }

  async function handleHashRoute() {
    state.currentRoute = parseHash();
    closeMobileSidebar();
    closeSearchDropdown();

    switch (state.currentRoute.type) {
      case 'home':
        renderHomeView();
        break;
      case 'category':
        renderCategoryView(state.currentRoute.category);
        break;
      case 'subject':
        renderSubjectView(state.currentRoute.subject);
        break;
      case 'topic':
        await renderTopicView(state.currentRoute.subject, state.currentRoute.topicId);
        break;
      default:
        renderHomeView();
    }

    updateActiveSidebarLinks();
    updateReadingProgress();
  }

  // ---------------------------------------------------------------------------
  // 8. View Renderers
  // ---------------------------------------------------------------------------

  // VIEW 1: Home Page (6 Drawer Cards + 38 Subject Pills)
  function renderHomeView() {
    document.title = 'DevDocs — Digital Card Catalog for Code Knowledge';

    let drawerCardsHtml = '';
    let drawerIndex = 1;

    state.categoriesMap.forEach((subjectsMap, catName) => {
      let count = 0;
      subjectsMap.forEach(topics => count += topics.length);

      drawerCardsHtml += `
        <div class="drawer-card" onclick="window.location.hash = '#/category/${encodeURIComponent(catName)}'">
          <div class="drawer-card-top">
            <span class="drawer-card-index">DRAWER 0${drawerIndex++}</span>
          </div>
          <h2 class="drawer-card-title">${SyntaxHighlighter.escapeHtml(catName)}</h2>
          <span class="drawer-card-count">${formatCount(count)} TOPICS</span>
        </div>
      `;
    });

    const allSubjects = [];
    state.categoriesMap.forEach((subjectsMap) => {
      subjectsMap.forEach((topics, subjectName) => {
        allSubjects.push({
          name: subjectName,
          slug: getSubjectSlug(subjectName),
          count: topics.length
        });
      });
    });

    allSubjects.sort((a, b) => a.name.localeCompare(b.name));

    const subjectPillsHtml = allSubjects.map(s => `
      <button class="subject-pill-btn" onclick="window.location.hash = '#/subject/${s.slug}'">
        <span>${SyntaxHighlighter.escapeHtml(s.name)}</span>
        <span class="subject-pill-count">${s.count}</span>
      </button>
    `).join('');

    dom.viewContainer.innerHTML = `
      <div class="home-container">
        <div class="home-section-header">
          <h1 class="home-section-title">Knowledge Drawers</h1>
          <span class="home-section-meta">6 DOMAINS / 3,569 TOPICS</span>
        </div>

        <div class="drawers-grid">
          ${drawerCardsHtml}
        </div>

        <div class="home-section-header">
          <h2 class="home-section-title">Browse by Subject</h2>
          <span class="home-section-meta">38 TECH STACKS</span>
        </div>

        <div class="subjects-pill-wrap">
          ${subjectPillsHtml}
        </div>
      </div>
    `;

    dom.mainContent.scrollTop = 0;
  }

  // VIEW 2: Category Listing
  function renderCategoryView(categoryName) {
    const subjectsMap = state.categoriesMap.get(categoryName);
    if (!subjectsMap) {
      renderHomeView();
      return;
    }

    document.title = `${categoryName} — DevDocs`;

    let totalTopics = 0;
    const subjectsList = [];
    subjectsMap.forEach((topics, subjectName) => {
      totalTopics += topics.length;
      subjectsList.push({
        name: subjectName,
        slug: getSubjectSlug(subjectName),
        topics: topics
      });
    });

    const pillsHtml = subjectsList.map(s => `
      <button class="subject-pill-btn" onclick="window.location.hash = '#/subject/${s.slug}'">
        <span>${SyntaxHighlighter.escapeHtml(s.name)}</span>
        <span class="subject-pill-count">${s.topics.length} topics</span>
      </button>
    `).join('');

    dom.viewContainer.innerHTML = `
      <div class="home-container">
        <div class="catalog-breadcrumbs">
          <a href="#/">CATALOG</a>
          <span class="breadcrumb-sep">/</span>
          <span>${SyntaxHighlighter.escapeHtml(categoryName)}</span>
        </div>

        <div class="home-section-header" style="margin-top: 16px;">
          <h1 class="home-section-title">${SyntaxHighlighter.escapeHtml(categoryName)}</h1>
          <span class="home-section-meta">${formatCount(totalTopics)} TOPICS</span>
        </div>

        <p style="font-size: 15px; color: var(--ink-soft); margin-bottom: 24px; max-width: 680px;">
          Consult any subject card below to view its complete topic index.
        </p>

        <div class="subjects-pill-wrap">
          ${pillsHtml}
        </div>
      </div>
    `;

    dom.mainContent.scrollTop = 0;
  }

  // VIEW 3: Subject View
  function renderSubjectView(subjectSlug) {
    const topics = state.masterIndex.filter(t => getSubjectSlug(t.subject) === subjectSlug);
    if (!topics || topics.length === 0) {
      renderHomeView();
      return;
    }

    const subjectName = topics[0].subject;
    const categoryName = topics[0].category;

    document.title = `${subjectName} Index — DevDocs`;

    const topicCardsHtml = topics.map((t, idx) => {
      const displayTitle = t.title || t.topic_id;
      return `
        <div class="drawer-card" style="min-height: auto; padding: 14px 18px;" onclick="window.location.hash = '#/topic/${subjectSlug}/${t.topic_id}'">
          <div class="drawer-card-top">
            <span class="drawer-card-index">#${idx + 1}</span>
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent); font-weight: 600;">${SyntaxHighlighter.escapeHtml(t.topic_id)}</span>
          </div>
          <h3 style="font-family: var(--font-display); font-size: 18px; font-weight: 600; color: var(--ink); margin: 6px 0;">${SyntaxHighlighter.escapeHtml(displayTitle)}</h3>
          <span class="drawer-card-count" style="font-size: 11px;">${t.sections_count} SECTIONS</span>
        </div>
      `;
    }).join('');

    dom.viewContainer.innerHTML = `
      <div class="home-container">
        <div class="catalog-breadcrumbs">
          <a href="#/">CATALOG</a>
          <span class="breadcrumb-sep">/</span>
          <a href="#/category/${encodeURIComponent(categoryName)}">${SyntaxHighlighter.escapeHtml(categoryName)}</a>
          <span class="breadcrumb-sep">/</span>
          <span>${SyntaxHighlighter.escapeHtml(subjectName)}</span>
        </div>

        <div class="home-section-header" style="margin-top: 16px;">
          <h1 class="home-section-title">${SyntaxHighlighter.escapeHtml(subjectName)}</h1>
          <span class="home-section-meta">${formatCount(topics.length)} CARDS</span>
        </div>

        <div class="drawers-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));">
          ${topicCardsHtml}
        </div>
      </div>
    `;

    dom.mainContent.scrollTop = 0;
  }

  // VIEW 4: Topic Content View (The Core Library Card Reader)
  async function renderTopicView(rawSubjectSlug, rawTopicId) {
    const subjectSlug = getSubjectSlug(decodeURIComponent(rawSubjectSlug || ''));
    const topicId = decodeURIComponent(rawTopicId || '');

    dom.viewContainer.innerHTML = `
      <div class="catalog-message-card">
        <span class="catalog-message-stamp">RETRIEVING CARD</span>
        <h2 class="catalog-message-title">Fetching this subject's topics…</h2>
        <p class="catalog-message-desc">Consulting the catalog drawer for ${subjectSlug}...</p>
      </div>
    `;

    try {
      const subjectData = await fetchSubjectTopics(subjectSlug);
      if (!Array.isArray(subjectData) || subjectData.length === 0) {
        throw new Error(`No topic data found for subject "${subjectSlug}".`);
      }

      let topicIndex = subjectData.findIndex(t => t.topic_id === topicId || t.topic_id === rawTopicId);
      let topic = topicIndex !== -1 ? subjectData[topicIndex] : null;

      if (!topic) {
        topic = subjectData.find(t => (t.title && t.title.toLowerCase() === topicId.toLowerCase()) || (t.url && t.url.includes(topicId))) || subjectData[0];
        topicIndex = subjectData.indexOf(topic);
      }

      if (!topic) {
        dom.viewContainer.innerHTML = `
          <div class="catalog-message-card">
            <span class="catalog-message-stamp">CARD NOT FOUND</span>
            <h2 class="catalog-message-title">This card isn't in the catalog.</h2>
            <p class="catalog-message-desc">Try the search above to locate the correct index entry.</p>
          </div>
        `;
        return;
      }

      // Save to localStorage for resume
      state.lastOpenedTopic = {
        subjectSlug,
        topicId: topic.topic_id,
        title: topic.title,
        subject: topic.subject || subjectSlug
      };
      localStorage.setItem('devdocs_last_topic', JSON.stringify(state.lastOpenedTopic));
      updateResumeButton();

      document.title = `${topic.title} — ${topic.subject || subjectSlug} — DevDocs`;

      // Cleaned sections
      const cleanedSections = BoilerplateCleaner.cleanSections(topic.sections, topic.title);

      // Render Vertical Reading Flow
      let sectionsHtml = '';
      if (cleanedSections.length > 0) {
        cleanedSections.forEach(sec => {
          const formattedContent = formatSectionContent(sec.content, subjectSlug);
          sectionsHtml += `
            <div class="topic-section-item">
              <h3 class="section-h3">${SyntaxHighlighter.escapeHtml(sec.heading)}</h3>
              <div class="section-body">
                ${formattedContent}
              </div>
            </div>
          `;
        });
      } else {
        sectionsHtml = `
          <div class="topic-section-item">
            <div class="section-body">
              <p>Welcome to this catalog card for <strong>${SyntaxHighlighter.escapeHtml(topic.title)}</strong>.</p>
            </div>
          </div>
        `;
      }

      // Render Dedicated Code Examples
      let codeExamplesHtml = '';
      if (Array.isArray(topic.code_examples) && topic.code_examples.length > 0) {
        topic.code_examples.forEach((ex, exIdx) => {
          const exLang = ex.language || subjectSlug || 'code';
          const label = ex.heading ? ex.heading : `EXAMPLE 0${exIdx + 1}`;
          codeExamplesHtml += renderCodeCard(ex.code, exLang, label);
        });
      }

      // Notes & Tips Callouts
      let notesHtml = '';
      if (Array.isArray(topic.notes_and_tips) && topic.notes_and_tips.length > 0) {
        topic.notes_and_tips.forEach(note => {
          const cleanNote = BoilerplateCleaner.cleanText(note);
          if (cleanNote && !BoilerplateCleaner.isBoilerplateContent(cleanNote)) {
            notesHtml += `
              <div class="librarian-note">
                <strong>Librarian Note</strong>
                <div>${formatInlineProse(cleanNote)}</div>
              </div>
            `;
          }
        });
      }

      // Neighbor Cards (Prev / Next)
      const prevTopic = topicIndex > 0 ? subjectData[topicIndex - 1] : null;
      const nextTopic = topicIndex < subjectData.length - 1 ? subjectData[topicIndex + 1] : null;

      const neighborNavHtml = `
        <div class="neighbor-nav-grid">
          ${prevTopic ? `
            <div class="neighbor-card prev" onclick="window.location.hash = '#/topic/${subjectSlug}/${prevTopic.topic_id}'">
              <div class="neighbor-header">
                <span class="neighbor-direction-label">
                  <span class="neighbor-arrow">←</span> PREVIOUS CARD
                </span>
                <span style="font-family: var(--font-mono); font-size: 10px; color: var(--accent);">${SyntaxHighlighter.escapeHtml(prevTopic.topic_id)}</span>
              </div>
              <div class="neighbor-topic-title">${SyntaxHighlighter.escapeHtml(prevTopic.title || prevTopic.topic_id)}</div>
            </div>
          ` : '<div></div>'}

          ${nextTopic ? `
            <div class="neighbor-card next" onclick="window.location.hash = '#/topic/${subjectSlug}/${nextTopic.topic_id}'">
              <div class="neighbor-header">
                <span class="neighbor-direction-label">
                  NEXT CARD <span class="neighbor-arrow">→</span>
                </span>
                <span style="font-family: var(--font-mono); font-size: 10px; color: var(--accent);">${SyntaxHighlighter.escapeHtml(nextTopic.topic_id)}</span>
              </div>
              <div class="neighbor-topic-title">${SyntaxHighlighter.escapeHtml(nextTopic.title || nextTopic.topic_id)}</div>
            </div>
          ` : '<div></div>'}
        </div>
      `;

      // Mount into reading container
      dom.viewContainer.innerHTML = `
        <div class="topic-page-container">
          
          <div class="catalog-breadcrumbs">
            <a href="#/">CATALOG</a>
            <span class="breadcrumb-sep">/</span>
            <a href="#/category/${encodeURIComponent(topic.category || 'General')}">${SyntaxHighlighter.escapeHtml(topic.category || 'General')}</a>
            <span class="breadcrumb-sep">/</span>
            <a href="#/subject/${subjectSlug}">${SyntaxHighlighter.escapeHtml(topic.subject || subjectSlug)}</a>
          </div>

          <div class="topic-title-block">
            <h1 class="topic-title-text">${SyntaxHighlighter.escapeHtml(topic.title)}</h1>
            <div class="call-number-stamp" title="Call Number / Topic ID">${SyntaxHighlighter.escapeHtml(topic.topic_id)}</div>
          </div>

          ${topic.summary ? `
            <div class="librarian-note" style="margin-bottom: 32px;">
              <strong>Overview</strong>
              <div>${formatInlineProse(topic.summary)}</div>
            </div>
          ` : ''}

          ${notesHtml}

          <div class="topic-sections-flow">
            ${sectionsHtml}
          </div>

          ${codeExamplesHtml}

          ${neighborNavHtml}

        </div>
      `;

      dom.mainContent.scrollTop = 0;
      updateReadingProgress();

    } catch (err) {
      console.error('Error rendering topic view:', err);
      dom.viewContainer.innerHTML = `
        <div class="catalog-message-card">
          <span class="catalog-message-stamp">CARD NOT FOUND</span>
          <h2 class="catalog-message-title">This card isn't in the catalog. Try the search above.</h2>
          <p class="catalog-message-desc">${SyntaxHighlighter.escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Clean Sidebar Tree Building (Crisp & Legible)
  // ---------------------------------------------------------------------------
  function renderSidebarNav() {
    let treeHtml = '';
    const filterQuery = state.sidebarFilterQuery.toLowerCase().trim();

    state.categoriesMap.forEach((subjectsMap, catName) => {
      let catHasMatches = false;
      let subjectsHtml = '';

      subjectsMap.forEach((topics, subjectName) => {
        const subjectSlug = getSubjectSlug(subjectName);
        const subjId = `subj-${subjectSlug}`;
        
        let filteredTopics = topics;
        if (filterQuery) {
          filteredTopics = topics.filter(t => 
            (t.title && t.title.toLowerCase().includes(filterQuery)) || 
            subjectName.toLowerCase().includes(filterQuery) ||
            (t.topic_id && t.topic_id.toLowerCase().includes(filterQuery))
          );
        }

        if (filteredTopics.length > 0) {
          catHasMatches = true;
          const topicLinksHtml = filteredTopics.map(t => {
            const displayTitle = t.title || t.topic_id;
            return `
              <a href="#/topic/${subjectSlug}/${t.topic_id}" class="catalog-topic-row" data-topic-id="${t.topic_id}" data-subject="${subjectSlug}" title="${SyntaxHighlighter.escapeHtml(displayTitle)} (${SyntaxHighlighter.escapeHtml(t.topic_id)})">
                ${SyntaxHighlighter.escapeHtml(displayTitle)}
              </a>
            `;
          }).join('');

          subjectsHtml += `
            <div class="catalog-nav-subject ${filterQuery ? 'open' : ''}" id="${subjId}">
              <button class="catalog-nav-subject-btn" onclick="window.DevDocs.toggleSubject('${subjId}')">
                <span>${SyntaxHighlighter.escapeHtml(subjectName)}</span>
                <svg class="subject-chevron" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              <div class="catalog-nav-topics">
                ${topicLinksHtml}
              </div>
            </div>
          `;
        }
      });

      if (catHasMatches || !filterQuery) {
        treeHtml += `
          <div class="catalog-nav-category">
            <div class="catalog-nav-cat-label">${SyntaxHighlighter.escapeHtml(catName)}</div>
            ${subjectsHtml}
          </div>
        `;
      }
    });

    dom.sidebarNav.innerHTML = treeHtml || '<div style="padding: 16px; font-size: 13px; color: var(--ink-soft); font-style: italic;">No matching cards found.</div>';
    updateActiveSidebarLinks();
  }

  function updateActiveSidebarLinks() {
    const allLinks = dom.sidebarNav.querySelectorAll('.catalog-topic-row');
    allLinks.forEach(l => l.classList.remove('active'));

    if (state.currentRoute.type === 'topic') {
      const activeLink = dom.sidebarNav.querySelector(`.catalog-topic-row[data-topic-id="${state.currentRoute.topicId}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
        const parentSubject = activeLink.closest('.catalog-nav-subject');
        if (parentSubject) parentSubject.classList.add('open');
        activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else if (state.currentRoute.type === 'subject') {
      const subjEl = document.getElementById(`subj-${state.currentRoute.subject}`);
      if (subjEl) subjEl.classList.add('open');
    }
  }

  // ---------------------------------------------------------------------------
  // 10. Card-Lookup Live Search
  // ---------------------------------------------------------------------------
  function handleSearchInput(e) {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      closeSearchDropdown();
      return;
    }

    const matches = [];
    for (const item of state.masterIndex) {
      const title = (item.title || '').toLowerCase();
      const subject = (item.subject || '').toLowerCase();
      const topicId = (item.topic_id || '').toLowerCase();

      let score = 0;
      if (title === q) score += 100;
      else if (topicId === q) score += 90;
      else if (title.startsWith(q)) score += 50;
      else if (topicId.startsWith(q)) score += 40;
      else if (title.includes(q)) score += 25;
      else if (subject.includes(q)) score += 15;

      if (score > 0) matches.push({ item, score });
      if (matches.length >= 40) break;
    }

    matches.sort((a, b) => b.score - a.score);
    state.searchResults = matches.map(m => m.item);
    state.searchSelectedIndex = state.searchResults.length > 0 ? 0 : -1;

    renderSearchDropdown(q);
  }

  function renderSearchDropdown(query) {
    if (state.searchResults.length === 0) {
      dom.searchDropdown.innerHTML = `<div class="search-empty-msg">No cards found matching "${SyntaxHighlighter.escapeHtml(query)}"</div>`;
      dom.searchDropdown.classList.remove('hidden');
      return;
    }

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

    dom.searchDropdown.innerHTML = state.searchResults.map((item, idx) => {
      const highlighted = SyntaxHighlighter.escapeHtml(item.title).replace(regex, '<mark>$1</mark>');
      const slug = getSubjectSlug(item.subject);
      const isSel = idx === 0 ? 'selected' : '';

      return `
        <div class="search-result-row ${isSel}" data-index="${idx}" onclick="window.DevDocs.selectSearch(${idx})">
          <span class="search-result-title">${highlighted}</span>
          <div class="search-result-meta">
            <span class="search-result-subject">${SyntaxHighlighter.escapeHtml(item.subject)}</span>
            <span class="search-result-chip">${SyntaxHighlighter.escapeHtml(item.topic_id)}</span>
          </div>
        </div>
      `;
    }).join('');

    dom.searchDropdown.classList.remove('hidden');
  }

  function handleSearchKeyNav(e) {
    if (dom.searchDropdown.classList.contains('hidden') || state.searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.searchSelectedIndex = (state.searchSelectedIndex + 1) % state.searchResults.length;
      updateSearchSelectedUI();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.searchSelectedIndex = (state.searchSelectedIndex - 1 + state.searchResults.length) % state.searchResults.length;
      updateSearchSelectedUI();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (state.searchSelectedIndex >= 0) selectSearchResult(state.searchSelectedIndex);
    } else if (e.key === 'Escape') {
      closeSearchDropdown();
    }
  }

  function updateSearchSelectedUI() {
    const rows = dom.searchDropdown.querySelectorAll('.search-result-row');
    rows.forEach((r, idx) => {
      if (idx === state.searchSelectedIndex) {
        r.classList.add('selected');
        r.scrollIntoView({ block: 'nearest' });
      } else {
        r.classList.remove('selected');
      }
    });
  }

  function selectSearchResult(index) {
    const item = state.searchResults[index];
    if (!item) return;

    const slug = getSubjectSlug(item.subject);
    closeSearchDropdown();
    dom.searchInput.value = '';
    window.location.hash = `#/topic/${slug}/${item.topic_id}`;
  }

  function closeSearchDropdown() {
    dom.searchDropdown.classList.add('hidden');
    state.searchSelectedIndex = -1;
  }

  // ---------------------------------------------------------------------------
  // 11. Reading Progress Bar
  // ---------------------------------------------------------------------------
  function updateReadingProgress() {
    if (state.currentRoute.type !== 'topic') {
      dom.readingProgress.style.width = '0%';
      return;
    }

    const scrollTop = dom.mainContent.scrollTop;
    const scrollHeight = dom.mainContent.scrollHeight - dom.mainContent.clientHeight;
    if (scrollHeight > 0) {
      const pct = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
      dom.readingProgress.style.width = `${pct}%`;
    } else {
      dom.readingProgress.style.width = '0%';
    }
  }

  // ---------------------------------------------------------------------------
  // 12. Theme & UI Utilities
  // ---------------------------------------------------------------------------
  function applyTheme(theme) {
    state.theme = theme;
    dom.html.setAttribute('data-theme', theme);
    localStorage.setItem('devdocs_theme', theme);
  }

  function toggleTheme() {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      dom.sidebar.classList.toggle('drawer-open');
      dom.sidebarBackdrop.classList.toggle('active');
    } else {
      dom.sidebar.classList.toggle('collapsed');
      state.sidebarCollapsed = dom.sidebar.classList.contains('collapsed');
      localStorage.setItem('devdocs_sidebar_collapsed', state.sidebarCollapsed);
    }
  }

  function closeMobileSidebar() {
    if (window.innerWidth <= 768) {
      dom.sidebar.classList.remove('drawer-open');
      dom.sidebarBackdrop.classList.remove('active');
    }
  }

  function updateResumeButton() {
    if (state.lastOpenedTopic && state.lastOpenedTopic.topicId) {
      dom.resumeTopicBtn.classList.remove('hidden');
      dom.resumeTopicBtn.querySelector('.resume-label').textContent = state.lastOpenedTopic.topicId;
      dom.resumeTopicBtn.onclick = () => {
        window.location.hash = `#/topic/${state.lastOpenedTopic.subjectSlug}/${state.lastOpenedTopic.topicId}`;
      };
    } else {
      dom.resumeTopicBtn.classList.add('hidden');
    }
  }

  // ---------------------------------------------------------------------------
  // 13. Event Listeners
  // ---------------------------------------------------------------------------
  function attachEventListeners() {
    window.addEventListener('hashchange', handleHashRoute);
    dom.themeToggleBtn.addEventListener('click', toggleTheme);
    dom.sidebarToggleBtn.addEventListener('click', toggleSidebar);
    if (dom.sidebarCollapseToggle) dom.sidebarCollapseToggle.addEventListener('click', toggleSidebar);
    dom.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    dom.searchInput.addEventListener('input', handleSearchInput);
    dom.searchInput.addEventListener('keydown', handleSearchKeyNav);
    document.addEventListener('click', (e) => {
      if (!dom.searchInput.contains(e.target) && !dom.searchDropdown.contains(e.target)) {
        closeSearchDropdown();
      }
    });

    dom.mainContent.addEventListener('scroll', updateReadingProgress, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== dom.searchInput) {
        e.preventDefault();
        dom.searchInput.focus();
        dom.searchInput.select();
      } else if (e.key === 'Escape') {
        closeSearchDropdown();
      }
    });

    dom.sidebarFilterInput.addEventListener('input', (e) => {
      state.sidebarFilterQuery = e.target.value;
      if (state.sidebarFilterQuery) {
        dom.sidebarFilterClear.classList.remove('hidden');
      } else {
        dom.sidebarFilterClear.classList.add('hidden');
      }
      renderSidebarNav();
    });

    dom.sidebarFilterClear.addEventListener('click', () => {
      dom.sidebarFilterInput.value = '';
      state.sidebarFilterQuery = '';
      dom.sidebarFilterClear.classList.add('hidden');
      renderSidebarNav();
      dom.sidebarFilterInput.focus();
    });
  }

  // ---------------------------------------------------------------------------
  // 14. Public API
  // ---------------------------------------------------------------------------
  window.DevDocs = {
    selectSearch: selectSearchResult,
    toggleSubject(subjId) {
      const el = document.getElementById(subjId);
      if (el) el.classList.toggle('open');
    },
    copyCode(btnElement) {
      const code = btnElement.getAttribute('data-code');
      const textarea = document.createElement('textarea');
      textarea.innerHTML = code;
      copyToClipboard(textarea.value, btnElement);
    }
  };

  // Launch
  applyTheme(state.theme);
  if (state.sidebarCollapsed && window.innerWidth > 768) {
    dom.sidebar.classList.add('collapsed');
  }
  attachEventListeners();
  loadInitialData();

})();
