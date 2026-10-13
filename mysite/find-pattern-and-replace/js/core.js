/* Pattern Finder — core logic.
 * Pattern library, text analysis, pattern builder and the find/replace engine.
 * No DOM access, so this file runs unchanged in the browser (window.FPR) and in Node (require).
 */
(function (root) {
  'use strict';

  const R = String.raw;

  /* ---------- helpers ---------- */

  const escapeRe = (s) => s.replace(/[\\^$.*+?()[\]{}|\/]/g, '\\$&');

  // "jan" -> "[Jj][Aa][Nn]": month names match in any case without forcing the i flag on a whole pattern
  const anyCase = (s) => s.replace(/[a-z]/gi, (c) => '[' + c.toUpperCase() + c.toLowerCase() + ']');

  // \b only understands ASCII letters, so word edges are spelled out with Unicode classes (needs the u flag)
  const WORD_PRE = R`(?<![\p{L}\p{M}\p{N}_])`;
  const WORD_POST = R`(?![\p{L}\p{M}\p{N}_])`;
  const wholeWord = (src) => WORD_PRE + '(?:' + src + ')' + WORD_POST;

  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  function lineStarts(text) {
    const starts = [0];
    for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
    return starts;
  }

  // Index of the line containing `offset` (last line start <= offset)
  function lineIndex(starts, offset) {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /* ---------- reusable pattern sources ----------
     `core` is safe to embed inside a bigger pattern (no capturing groups). `pre` / `post` are
     lookarounds that stop it matching in the middle of a longer token. Everything is valid
     with the u flag. */

  const MONTH = '(?:' + [
    ['sept', ''], ['jan', 'uary'], ['feb', 'ruary'], ['mar', 'ch'], ['apr', 'il'], ['may', ''], ['jun', 'e'],
    ['jul', 'y'], ['aug', 'ust'], ['sep', 'tember'], ['oct', 'ober'], ['nov', 'ember'], ['dec', 'ember'],
  ].map(([a, b]) => anyCase(a) + (b ? '(?:' + anyCase(b) + ')?' : '')).join('|') + ')';

  const DD = R`(?:0?[1-9]|[12]\d|3[01])`;
  const MM = R`(?:0?[1-9]|1[0-2])`;
  const YYYY = R`(?:1[89]|2[01])\d{2}`;
  const YY = '(?:' + YYYY + R`|\d{2})`;
  const ORDINAL = '(?:[Ss][Tt]|[Nn][Dd]|[Rr][Dd]|[Tt][Hh])?';

  // 2024-03-14, 2024/03/14, 2024.03.14
  const DATE_ISO = YYYY + '(?:-' + MM + '-' + DD + R`|\/` + MM + R`\/` + DD + R`|\.` + MM + R`\.` + DD + ')';
  // 14-03-2024, 03/14/24, 14.03.2024 (day-first or month-first)
  const DATE_NUM = '(?:' + [['-', YY], [R`\/`, YY], [R`\.`, YYYY]]
    .map(([sep, year]) => '(?:' + DD + sep + MM + '|' + MM + sep + DD + ')' + sep + year).join('|') + ')';
  // 14 Mar 2024, 14-Mar-24, 14th March, 2024, March 14, 2024
  const DATE_TEXT = '(?:' + DD + ORDINAL + '[ -]' + MONTH + R`\.?,?[ -]` + YY +
    '|' + MONTH + R`\.? ` + DD + ORDINAL + ',? ' + YYYY + ')';

  const CLOCK = R`(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:[.,]\d{1,6})?)?`;
  const NUM_PLAIN = R`\d+(?:\.\d+)?`;
  const NUM_GROUPED = R`\d+(?:,\d{2,3})*(?:\.\d+)?`; // 1,234.50 and 1,00,000
  // a number stands alone: not a piece of a date, time, IP address, phone number or code
  const NUM_PRE = R`(?<![\w.:\/+-])`;
  const NUM_POST = R`(?!\w|[.:\/-]\d)`;

  const SRC = {
    email: {
      pre: R`(?<![A-Za-z0-9._%+-])`,
      core: R`[A-Za-z0-9][A-Za-z0-9._%+-]*@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}`,
    },
    // commas, semicolons and pipes end a URL so it does not swallow the next CSV cell
    url: {
      pre: R`(?<![A-Za-z0-9])`,
      core: '(?:https?:\\/\\/|www\\.)[^\\s<>"\'`,;|]*[^\\s<>"\'`,;|.:!?)\\]}]',
    },
    timestamp: {
      pre: R`(?<!\d)`,
      core: YYYY + '-' + MM + '-' + DD + '[T ]' + CLOCK + R`(?:Z|[+-]\d{2}:?\d{2})?`,
      post: R`(?!\d)`,
    },
    date: { pre: R`(?<![A-Za-z\d])`, core: '(?:' + DATE_ISO + '|' + DATE_TEXT + '|' + DATE_NUM + ')', post: R`(?!\d)` },
    time: { pre: R`(?<![\d:.])`, core: CLOCK + R`(?: ?[AaPp][Mm](?![A-Za-z]))?`, post: R`(?![\d:])` },
    phone: {
      pre: R`(?<![\w+])`,
      core: '(?:' + [
        R`\+\d{1,3}[ -]?(?:\(\d{1,4}\)[ -]?)?\d{2,5}(?:[ -]?\d{2,5}){1,3}`, // +91 98765 43210
        R`\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}`,                                 // (555) 123-4567
        R`(?:\+?91[ -]?|0)?[6-9]\d{4}[ -]?\d{5}`,                           // 9876543210
      ].join('|') + ')',
      post: R`(?!\d)`,
    },
    number: { pre: NUM_PRE, core: '-?' + NUM_PLAIN, post: NUM_POST },
  };

  const full = (p) => (p.pre || '') + p.core + (p.post || '');

  // In comma-separated data a comma is a cell boundary, never a thousands separator
  const numberSource = (ctx) => NUM_PRE + '-?' + (ctx.commaDelim ? NUM_PLAIN : NUM_GROUPED) + NUM_POST;
  const currencySource = (ctx) => {
    const amount = ctx.commaDelim ? NUM_PLAIN : NUM_GROUPED;
    return R`(?:[₹$€£]|(?<![A-Za-z])(?:Rs\.?|INR|USD|EUR|GBP)) ?` + amount + R`(?:\/-)?` +
      R`|(?<![\w.])` + amount + R` ?(?:(?:INR|USD|EUR|GBP|[Rr]upees|[Dd]ollars)(?![A-Za-z])|[₹€])`;
  };

  /* ---------- pattern library ----------
     `known: true` marks formats that shape discovery should not report again.
     `broad: true` marks ones too loose to name what a clicked piece of text is. */

  const LIBRARY = [
    { id: 'email', label: 'Email address', icon: '@', known: true, source: full(SRC.email) },
    { id: 'url', label: 'Web link (URL)', icon: '://', known: true, source: full(SRC.url) },
    { id: 'timestamp', label: 'Date with time', icon: '31', known: true, source: full(SRC.timestamp) },
    { id: 'date', label: 'Date', icon: '31', known: true, source: full(SRC.date) },
    { id: 'time', label: 'Time', icon: '12:', known: true, source: full(SRC.time) },
    { id: 'phone', label: 'Phone number', icon: 'tel', known: true, source: full(SRC.phone) },
    { id: 'currency', label: 'Money amount', icon: '₹$', known: true, source: currencySource },
    { id: 'percent', label: 'Percentage', icon: '%', known: true, source: R`(?<![\w.])\d+(?:\.\d+)? ?%` },
    {
      id: 'ipv4', label: 'IP address', icon: 'IP', known: true,
      source: R`(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?!\d|\.\d)`,
    },
    {
      id: 'uuid', label: 'UUID', icon: 'id', known: true,
      source: R`(?<![0-9A-Fa-f-])[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(?![0-9A-Fa-f-])`,
    },
    {
      id: 'mac', label: 'MAC address', icon: 'mac', known: true,
      source: R`(?<![0-9A-Fa-f:-])(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}(?![0-9A-Fa-f:-])`,
    },
    { id: 'gstin', label: 'GSTIN', icon: 'GST', known: true, source: R`(?<![A-Za-z0-9])\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z](?![A-Za-z0-9])` },
    { id: 'pan', label: 'PAN number', icon: 'PAN', known: true, source: R`(?<![A-Za-z0-9])[A-Z]{5}\d{4}[A-Z](?![A-Za-z0-9])` },
    { id: 'ifsc', label: 'IFSC code', icon: 'IFS', known: true, source: R`(?<![A-Za-z0-9])[A-Z]{4}0[A-Z0-9]{6}(?![A-Za-z0-9])` },
    { id: 'card', label: 'Card-style number (4-4-4-4)', icon: '16d', source: R`(?<![\d-])\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}(?![ -]?\d)` },
    { id: 'aadhaar', label: 'Aadhaar-style number (4-4-4)', icon: '12d', source: R`(?<![\d-])[2-9]\d{3}[ -]\d{4}[ -]\d{4}(?![ -]?\d)` },
    { id: 'pin', label: '6-digit number (PIN code)', icon: '6d', source: NUM_PRE + R`[1-9]\d{5}` + NUM_POST },
    { id: 'hex', label: 'Hex colour', icon: '#f', known: true, source: R`(?<![\w&])#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})(?![0-9A-Za-z])` },
    { id: 'hashtag', label: 'Hashtag', icon: '#', source: R`(?<![\w&#])#[A-Za-z_]\w*` },
    { id: 'mention', label: '@mention', icon: '@', source: R`(?<![\w.@+-])@[A-Za-z_]\w*` },
    {
      id: 'file', label: 'File name', icon: '.ext', known: true, flags: 'giu',
      source: R`(?<![\w.\/\\-])[\w-]+(?:\.[\w-]+)*\.(?:txt|csv|tsv|pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|svg|zip|rar|json|xml|html?|css|js|ts|py|java|sql|log|md|mp[34]|exe)(?!\w)`,
    },
    { id: 'html', broad: true, label: 'HTML / XML tag', icon: '</>', source: R`<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^<>]*)?\/?>` },
    { id: 'loglevel', label: 'Log level', icon: 'log', source: R`(?<![A-Za-z])(?:FATAL|ERROR|WARN(?:ING)?|INFO|DEBUG|TRACE)(?![A-Za-z])` },
    { id: 'quoted', broad: true, label: 'Text in "quotes"', icon: '“”', source: R`"[^"\n]{1,300}"|“[^”\n]{1,300}”` },
    { id: 'parens', broad: true, label: 'Text in (brackets)', icon: '( )', source: R`\([^()\n]{1,300}\)` },
    { id: 'square', broad: true, label: 'Text in [square brackets]', icon: '[ ]', source: R`\[[^\[\]\n]{1,300}\]` },
    { id: 'caps', broad: true, label: 'ALL-CAPS word', icon: 'AA', source: R`(?<![A-Za-z0-9_])[A-Z]{2,}(?![A-Za-z0-9_])` },
    { id: 'number', label: 'Number', icon: '123', known: true, source: numberSource },
  ];

  const CLEANUP = [
    { id: 'trailing', label: 'Spaces at end of line', icon: '␣', flags: 'gmu', source: R`[ \t]+$`, hint: 'Invisible leftovers — Replace all with nothing to remove' },
    { id: 'multispace', label: 'Extra spaces between words', icon: '␣␣', source: R`(?<=\S) {2,}(?=\S)`, hint: 'Replace all with a single space to tidy up' },
    { id: 'blank', label: 'Blank lines', icon: '¶', flags: 'gmu', source: R`^[ \t]*\n`, hint: 'Replace all with nothing to close the gaps' },
    { id: 'tabs', label: 'Tab characters', icon: '⇥', source: R`\t+`, hint: 'Replace with spaces or a comma', skip: (ctx) => ctx.tabDelim },
    { id: 'nonascii', label: 'Special / non-English characters', icon: 'é', source: R`[^\x00-\x7F]+` },
  ];

  const sourceOf = (def, ctx) => (typeof def.source === 'function' ? def.source(ctx) : def.source);

  // Full-token versions of the known formats, used to keep shape discovery from re-reporting them
  const KNOWN_TOKENS = LIBRARY.filter((d) => d.known)
    .map((d) => new RegExp('^(?:' + sourceOf(d, {}) + ')$', (d.flags || 'gu').replace('g', '')));

  /* ---------- tables (CSV / TSV / pipe tables) ---------- */

  const DELIMS = [
    { ch: '\t', name: 'Tab-separated table' },
    { ch: '|', name: 'Pipe table' },
    { ch: ',', name: 'CSV' },
    { ch: ';', name: 'Semicolon-separated table' },
  ];
  const RULE_ROW = /^[\s|+:=-]*$/; // blank lines and borders such as |---|---| or +----+----+

  // Cell ranges (absolute offsets, surrounding spaces trimmed) for one line
  function splitCells(line, base, delim) {
    const cells = [];
    const quoteAware = delim === ',' || delim === ';';
    let cellStart = 0, inQuotes = false;
    for (let i = 0; i <= line.length; i++) {
      const ch = line[i];
      if (quoteAware && ch === '"') { inQuotes = !inQuotes; continue; }
      if (i < line.length && (ch !== delim || inQuotes)) continue;
      let s = cellStart, e = i;
      while (s < e && (line[s] === ' ' || line[s] === '\t')) s++;
      while (e > s && (line[e - 1] === ' ' || line[e - 1] === '\t')) e--;
      cells.push({ start: base + s, end: base + e });
      cellStart = i + 1;
    }
    if (delim === '|') { // "| a | b |" has empty cells outside the outer pipes
      const trimmed = line.trim();
      if (trimmed.startsWith('|')) cells.shift();
      if (trimmed.endsWith('|')) cells.pop();
    }
    return cells;
  }

  function detectTable(text) {
    const sample = [];
    for (let pos = 0; pos < text.length && sample.length < 200;) {
      let end = text.indexOf('\n', pos);
      if (end === -1) end = text.length;
      const line = text.slice(pos, end);
      if (!RULE_ROW.test(line)) sample.push(line);
      pos = end + 1;
    }
    if (sample.length < 2) return null;

    let best = null;
    for (const d of DELIMS) {
      const freq = new Map();
      for (const line of sample) {
        const n = splitCells(line, 0, d.ch).length;
        freq.set(n, (freq.get(n) || 0) + 1);
      }
      let cols = 0, hits = 0;
      for (const [n, f] of freq) if (f > hits || (f === hits && n > cols)) { cols = n; hits = f; }
      const share = hits / sample.length;
      // one comma per line happens in prose, so a two-column CSV needs more evidence than tabs or pipes do
      const weak = cols === 2 && (d.ch === ',' || d.ch === ';');
      if (cols < 2 || share < (weak ? 0.9 : 0.8) || (weak && sample.length < 4)) continue;
      if (!best || share > best.share || (share === best.share && cols > best.cols)) best = { delim: d.ch, name: d.name, cols, share };
    }
    if (!best) return null;

    const first = splitCells(sample[0], 0, best.delim).map((c) => sample[0].slice(c.start, c.end).replace(/^"|"$/g, ''));
    const hasHeader = first.length === best.cols && new Set(first).size === first.length &&
      first.every((h) => h && !/^[-+]?[\d.,]+$/.test(h));
    const headers = Array.from({ length: best.cols }, (_, i) => (hasHeader ? first[i] : 'Column ' + (i + 1)));
    return { delim: best.delim, name: best.name, cols: best.cols, hasHeader, headers };
  }

  // Cell ranges per column (header row excluded), in text order
  function parseTable(text, table) {
    const columns = Array.from({ length: table.cols }, () => []);
    let rows = 0, first = true;
    for (let pos = 0; pos <= text.length;) {
      let end = text.indexOf('\n', pos);
      if (end === -1) end = text.length;
      const line = text.slice(pos, end);
      if (!RULE_ROW.test(line)) {
        if (!(first && table.hasHeader)) {
          rows++;
          splitCells(line, pos, table.delim).forEach((c, i) => {
            if (i < table.cols && c.end > c.start) columns[i].push(c);
          });
        }
        first = false;
      }
      if (end === text.length) break;
      pos = end + 1;
    }
    return { columns, rows };
  }

  /* ---------- pattern builder ---------- */

  let uidSeq = 0;
  const uid = () => 'b' + (++uidSeq);

  const BLOCK_TYPES = {
    digits: { label: 'Digits', group: 'Characters', qty: true },
    letters: { label: 'Letters', group: 'Characters', qty: true, hasCase: true },
    alnum: { label: 'Letters or digits', group: 'Characters', qty: true },
    symbol: { label: 'Symbol', group: 'Characters', qty: true },
    space: { label: 'Space', group: 'Characters', qty: true },
    any: { label: 'Anything', group: 'Characters', qty: true },
    text: { label: 'Exact text', group: 'Fixed', hasValue: true, placeholder: 'e.g. INV-' },
    oneof: { label: 'One of…', group: 'Fixed', hasValue: true, placeholder: 'e.g. Mr, Mrs, Dr' },
    date: { label: 'Date', group: 'Ready-made', preset: SRC.date },
    time: { label: 'Time', group: 'Ready-made', preset: SRC.time },
    email: { label: 'Email', group: 'Ready-made', preset: SRC.email },
    number: { label: 'Number', group: 'Ready-made', preset: SRC.number },
    lineStart: { label: 'Start of line', group: 'Position', anchor: '^' },
    lineEnd: { label: 'End of line', group: 'Position', anchor: '$' },
  };

  const ATOMS = {
    digits: () => R`\d`,
    letters: (b) => (b.case === 'upper' ? R`\p{Lu}` : b.case === 'lower' ? R`\p{Ll}` : R`[\p{L}\p{M}]`),
    alnum: () => R`[\p{L}\p{M}\p{N}]`,
    symbol: () => R`[^\p{L}\p{M}\p{N}\s]`,
    space: () => R`[ \t]`,
    any: () => '.',
  };

  function newBlock(type, props) {
    const t = BLOCK_TYPES[type];
    const b = { id: uid(), type, optional: false };
    if (t.qty) b.q = { mode: type === 'space' || type === 'symbol' ? 'exact' : 'plus', n: 1, min: 1, max: 3 };
    if (t.hasCase) b.case = 'any';
    if (t.hasValue) b.value = '';
    return Object.assign(b, props);
  }

  const int = (v, lo, hi, fallback) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };

  function quantifier(q) {
    if (!q || q.mode === 'plus') return '+';
    if (q.mode === 'range') {
      const lo = int(q.min, 0, 999, 1);
      const hi = Math.max(lo, int(q.max, 1, 999, lo), 1);
      return lo === hi ? (lo === 1 ? '' : '{' + lo + '}') : '{' + lo + ',' + hi + '}';
    }
    const n = int(q.n, 1, 999, 1);
    return n === 1 ? '' : '{' + n + '}';
  }

  const choices = (b) => (b.value || '').split(',').map((s) => s.trim()).filter(Boolean);

  // Regex for one block without its capture group; '' while the block contributes nothing yet
  function blockSource(b, isLast) {
    const t = BLOCK_TYPES[b.type];
    if (t.preset) return '(?:' + t.preset.core + ')';
    if (b.type === 'text') return escapeRe(b.value || '');
    if (b.type === 'oneof') {
      const list = choices(b).sort((x, y) => y.length - x.length).map(escapeRe);
      return list.length ? '(?:' + list.join('|') + ')' : '';
    }
    const quant = quantifier(b.q);
    // "anything" in the middle of a pattern should stop at the next block, not swallow the rest of the line
    const lazy = b.type === 'any' && !isLast && /[+,]/.test(quant) ? '?' : '';
    return ATOMS[b.type](b) + quant + lazy;
  }

  // Every contributing block becomes one capture group, so $1, $2… in a replacement map to blocks.
  // Returns null while there is nothing to search for.
  function toRegex(blocks, opts) {
    opts = opts || {};
    const real = blocks.filter((b) => !BLOCK_TYPES[b.type].anchor);
    const parts = blocks.map((b) => {
      const t = BLOCK_TYPES[b.type];
      return { b, t, inner: t.anchor ? '' : blockSource(b, b === real[real.length - 1]) };
    });
    const eff = parts.filter((p) => p.inner);
    if (!eff.length) return null;

    const groupOf = {};
    let source = '', n = 0;
    for (const p of parts) {
      if (p.t.anchor) { source += p.t.anchor; continue; }
      if (!p.inner) continue;
      groupOf[p.b.id] = ++n;
      // a ready-made block on the edge keeps its own guard, e.g. a date must not start mid-number
      const pre = (p === eff[0] && p.t.preset && p.t.preset.pre) || '';
      const post = (p === eff[eff.length - 1] && p.t.preset && p.t.preset.post) || '';
      source += pre + '(' + p.inner + ')' + (p.b.optional ? '?' : '') + post;
    }
    if (opts.wholeWord) source = wholeWord(source);
    return { source, flags: 'gmu' + (opts.ignoreCase ? 'i' : ''), groupOf };
  }

  function describeBlock(b) {
    const t = BLOCK_TYPES[b.type];
    let s;
    if (t.anchor) return t.label.toLowerCase();
    if (b.type === 'text') s = '“' + (b.value || '') + '”';
    else if (b.type === 'oneof') s = 'one of ' + choices(b).map((c) => '“' + c + '”').join(' / ');
    else if (t.preset) s = (b.type === 'email' ? 'an ' : 'a ') + t.label.toLowerCase();
    else {
      const kind = b.case === 'upper' ? 'UPPERCASE ' : b.case === 'lower' ? 'lowercase ' : '';
      const noun = {
        digits: ['digit', 'digits'], letters: [kind + 'letter', kind + 'letters'], alnum: ['letter or digit', 'letters or digits'],
        symbol: ['symbol', 'symbols'], space: ['space', 'spaces'], any: ['character', 'characters'],
      }[b.type];
      const q = b.q || { mode: 'plus' };
      if (q.mode === 'plus') s = b.type === 'any' ? 'anything' : 'one or more ' + noun[1];
      else if (q.mode === 'range') s = int(q.min, 0, 999, 1) + '–' + Math.max(int(q.min, 0, 999, 1), int(q.max, 1, 999, 1)) + ' ' + noun[1];
      else { const n = int(q.n, 1, 999, 1); s = n + ' ' + noun[n === 1 ? 0 : 1]; }
    }
    return b.optional ? s + ' (optional)' : s;
  }

  const describe = (blocks) => blocks
    .filter((b) => BLOCK_TYPES[b.type].anchor || blockSource(b, false))
    .map(describeBlock).join(', then ');

  const EXAMPLE_PRESETS = new RegExp('(' + full(SRC.email) + ')|(' + full(SRC.date) + ')|(' + full(SRC.time) + ')', 'gu');
  const EXAMPLE_RUNS = /(\d+)|([\p{L}\p{M}]+)|([ \t]+)|([^\d\p{L}\p{M} \t]+)/gu;

  // "INV-2024-0012" -> [3 UPPERCASE letters]["-"][4 digits]["-"][4 digits].
  // Each inferred block remembers its sample so the UI can offer "only this exact text".
  function fromExample(example) {
    const text = String(example).split(/\r?\n/)[0].trim().slice(0, 200);
    const blocks = [];
    const addRuns = (segment) => {
      for (const m of segment.matchAll(EXAMPLE_RUNS)) {
        const s = m[0], len = [...s].length;
        if (m[1]) blocks.push(newBlock('digits', { q: { mode: 'exact', n: len, min: len, max: len }, sample: s }));
        else if (m[2]) {
          const up = s.toUpperCase(), low = s.toLowerCase();
          const kase = up === low ? 'any' : s === up ? 'upper' : s === low ? 'lower' : 'any';
          blocks.push(newBlock('letters', { case: kase, q: { mode: 'exact', n: len, min: len, max: len }, sample: s }));
        } else if (m[3]) blocks.push(newBlock('space', { q: { mode: len === 1 ? 'exact' : 'plus', n: 1, min: 1, max: len } }));
        else blocks.push(newBlock('text', { value: s }));
      }
    };
    let pos = 0;
    for (const m of text.matchAll(EXAMPLE_PRESETS)) {
      addRuns(text.slice(pos, m.index));
      blocks.push(newBlock(m[1] ? 'email' : m[2] ? 'date' : 'time', { sample: m[0] }));
      pos = m.index + m[0].length;
    }
    addRuns(text.slice(pos));
    return blocks;
  }

  // The same pieces with the words kept as they are, so only the numbers may differ:
  // [3 UPPERCASE letters]["-"][4 digits] -> ["INV-"][4 digits]
  function fixLetters(blocks) {
    const out = [];
    for (const b of blocks) {
      const word = b.type === 'letters' && b.sample;
      const oneSpace = b.type === 'space' && b.q.mode === 'exact' && +b.q.n === 1;
      if (word || oneSpace || b.type === 'text') {
        const value = word ? b.sample : oneSpace ? ' ' : b.value;
        const last = out[out.length - 1];
        if (last && last.type === 'text') last.value += value; else out.push(newBlock('text', { value }));
      } else {
        const copy = JSON.parse(JSON.stringify(b));
        delete copy.id; // newBlock hands out a fresh id
        out.push(newBlock(b.type, copy));
      }
    }
    return out;
  }

  /* ---------- "what is this?" for a place in the text (right-click in the editor) ---------- */

  const TOKEN_CHAR = /[^\s,;|"'()\[\]{}<>=]/;

  // The word-like token around `offset` (split the way shape discovery splits), or null on blank space
  function tokenAt(text, offset) {
    let s = offset, e = offset;
    while (s > 0 && TOKEN_CHAR.test(text[s - 1])) s--;
    while (e < text.length && TOKEN_CHAR.test(text[e])) e++;
    while (s < e && /[.:!?*_#-]/.test(text[s])) s++;
    while (e > s && /[.:!?*_-]/.test(text[e - 1])) e--;
    return e > s && offset >= s && offset <= e ? { start: s, end: e } : null;
  }

  // Library formats (email, date, phone…) with a match that covers [start, end], most specific first.
  // Each result carries the covering match's own range, which can be wider than what was asked about.
  function identify(text, start, end, ctx) {
    const lineStart = start > 0 ? text.lastIndexOf('\n', start - 1) + 1 : 0;
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.slice(lineStart, lineEnd);
    const s = start - lineStart, e = end - lineStart;
    const found = [];
    for (const def of LIBRARY) {
      if (def.broad) continue;
      const source = sourceOf(def, ctx || {}), flags = def.flags || 'gu';
      const re = new RegExp(source, flags);
      let m;
      while ((m = re.exec(line))) {
        if (!m[0]) { re.lastIndex++; continue; }
        if (m.index > s) break;
        if (m.index + m[0].length < e) continue;
        found.push({ id: def.id, label: def.label, icon: def.icon, source, flags, start: lineStart + m.index, end: lineStart + m.index + m[0].length });
        break;
      }
    }
    return found;
  }

  /* ---------- analysis: what is in this text? ---------- */

  const COUNT_CAP = 100000;

  function countMatches(text, re) {
    const samples = new Set();
    let count = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      if (!m[0]) { re.lastIndex++; continue; }
      count++;
      if (samples.size < 3) samples.add(clip(m[0], 32));
      if (count >= COUNT_CAP) break;
    }
    return { count, capped: count >= COUNT_CAP, samples: [...samples] };
  }

  // "INV-0012" -> [letters "INV"]["-"][digits "0012"]
  function tokenRuns(tok) {
    const runs = [];
    const re = /(\d+)|([A-Za-z]+)|([^A-Za-z\d]+)/g;
    let m;
    while ((m = re.exec(tok))) {
      if (m[1]) runs.push({ t: 'd', s: m[1] });
      else if (m[2]) runs.push({ t: m[2] === m[2].toUpperCase() ? 'U' : m[2] === m[2].toLowerCase() ? 'l' : 'x', s: m[2] });
      else runs.push({ t: '=', s: m[3] });
    }
    return runs;
  }

  // Finds codes that share a layout (INV-2024-0012, INV-2024-0013 …) without knowing the format up front
  function discoverShapes(text) {
    const groups = new Map();
    const tokenRe = /[^\s,;|"'()\[\]{}<>=]+/g;
    let m, seen = 0;
    while ((m = tokenRe.exec(text)) && seen++ < 300000) {
      const tok = m[0].replace(/^[.:!?*_#-]+|[.:!?*_-]+$/g, '');
      if (tok.length < 3 || tok.length > 40 || !/\d/.test(tok) || /[^\x21-\x7E]/.test(tok)) continue;
      const runs = tokenRuns(tok);
      if (runs.length < 2 || runs.length > 9) continue;
      // digits-only tokens need real structure (12-34-5678), not just "1.5" or "+91"
      if (!/[A-Za-z]/.test(tok) && (tok.length < 5 || runs.filter((r) => r.t === 'd').length < 2)) continue;
      if (KNOWN_TOKENS.some((re) => re.test(tok))) continue;

      const key = runs.map((r) => (r.t === '=' ? '=' + r.s : r.t)).join('|');
      let g = groups.get(key);
      if (!g) {
        g = { key, count: 0, samples: new Set(), runs: runs.map((r) => ({ t: r.t, min: r.s.length, max: r.s.length, first: r.s, constant: true })) };
        groups.set(key, g);
      }
      g.count++;
      if (g.samples.size < 20) g.samples.add(tok);
      runs.forEach((r, i) => {
        const a = g.runs[i];
        a.min = Math.min(a.min, r.s.length);
        a.max = Math.max(a.max, r.s.length);
        if (r.s !== a.first) a.constant = false;
      });
    }

    return [...groups.values()]
      .filter((g) => g.count >= 3 && g.samples.size >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((g) => {
        const blocks = [];
        const pushText = (s) => {
          const last = blocks[blocks.length - 1];
          if (last && last.type === 'text') last.value += s; else blocks.push(newBlock('text', { value: s }));
        };
        for (const r of g.runs) {
          const q = { mode: r.min === r.max ? 'exact' : 'range', n: r.min, min: r.min, max: r.max };
          if (r.t === '=') pushText(r.first);
          else if (r.t === 'd') blocks.push(newBlock('digits', { q }));
          else if (r.constant) pushText(r.first); // same prefix every time, e.g. the "INV" in INV-0012
          else blocks.push(newBlock('letters', { q, case: r.t === 'U' ? 'upper' : r.t === 'l' ? 'lower' : 'any' }));
        }
        const re = toRegex(blocks, { wholeWord: true });
        const samples = [...g.samples].slice(0, 3);
        return {
          id: 'shape:' + g.key, label: 'Like “' + samples[0] + '”', icon: 'A-9', source: re.source, flags: re.flags,
          count: g.count, samples, hint: describe(blocks), blocks, wholeWord: true,
        };
      });
  }

  const STOP_WORDS = new Set(('the and for are but not you all any can had her was one our out day get has him his how its may ' +
    'new now old see two way who did yes this that with have from they will would there their what about which when make ' +
    'like time just know take into year your good some could them than then look only come over think also back after use ' +
    'work first well even want because these give most were been being http https www com').split(' '));

  function repeatedWords(text) {
    const freq = new Map();
    const re = /[\p{L}\p{M}]{3,}/gu;
    let m, seen = 0;
    while ((m = re.exec(text)) && seen++ < 400000) {
      const key = m[0].toLowerCase();
      if (STOP_WORDS.has(key)) continue;
      const f = freq.get(key);
      if (f) f.count++; else freq.set(key, { word: m[0], count: 1 });
    }
    const items = [];
    for (const f of [...freq.values()].filter((x) => x.count >= 3).sort((a, b) => b.count - a.count).slice(0, 12)) {
      const source = wholeWord(escapeRe(f.word));
      // recount with the real pattern: "user" inside "user_1042" is not a whole word
      const r = countMatches(text, new RegExp(source, 'giu'));
      if (r.count >= 3) items.push({ id: 'word:' + f.word.toLowerCase(), label: '“' + f.word + '”', icon: 'ab', source, flags: 'giu', count: r.count, capped: r.capped, samples: [], hint: 'Repeated word' });
      if (items.length === 8) break;
    }
    return items;
  }

  // Second and later copies of a line (compared without surrounding spaces), each with its line break
  function findDuplicateLines(text) {
    const seen = new Set();
    const out = [];
    for (let pos = 0; pos <= text.length;) {
      let end = text.indexOf('\n', pos);
      const last = end === -1;
      if (last) end = text.length;
      const key = text.slice(pos, end).trim();
      if (key) {
        if (seen.has(key)) out.push({ start: pos, end: last ? end : end + 1, groups: null });
        else seen.add(key);
      }
      if (last) break;
      pos = end + 1;
    }
    return out;
  }

  function analyze(text) {
    const table = detectTable(text);
    const ctx = { commaDelim: !!table && table.delim === ',', tabDelim: !!table && table.delim === '\t' };
    const scan = (defs) => {
      const items = [];
      for (const def of defs) {
        if (def.skip && def.skip(ctx)) continue;
        const source = sourceOf(def, ctx), flags = def.flags || 'gu';
        const r = countMatches(text, new RegExp(source, flags));
        if (r.count) items.push({ id: def.id, label: def.label, icon: def.icon, hint: def.hint, source, flags, count: r.count, capped: r.capped, samples: r.samples });
      }
      return items;
    };

    const repeats = repeatedWords(text);
    const dups = findDuplicateLines(text);
    if (dups.length) {
      const samples = [...new Set(dups.slice(0, 50).map((d) => clip(text.slice(d.start, d.end).trim(), 32)))].slice(0, 2);
      repeats.push({ id: 'dup-lines', label: 'Duplicate lines', icon: '≡', find: findDuplicateLines, count: dups.length, samples, hint: 'Extra copies only — Replace all with nothing to keep one of each' });
    }

    return {
      table,
      stats: { chars: text.length, lines: lineStarts(text).length, words: (text.match(/\S+/g) || []).length },
      groups: [
        { id: 'data', title: 'Found in your text', items: scan(LIBRARY) },
        { id: 'shapes', title: 'Repeating formats', items: discoverShapes(text) },
        { id: 'repeats', title: 'Repeated most', items: repeats },
        { id: 'clean', title: 'Clean-up', items: scan(CLEANUP) },
      ],
    };
  }

  /* ---------- find & replace engine ---------- */

  const countGroups = (re) => new RegExp(re.source + '|', re.flags.replace('g', '')).exec('').length - 1;

  // query: {kind:'text'|'regex', text, matchCase, wholeWord} | {kind:'pattern', source, flags} | {kind:'fn', find}
  function compileQuery(q) {
    try {
      if (q.kind === 'fn') return { find: q.find, groupCount: 0 };
      let regex;
      if (q.kind === 'text') {
        const src = escapeRe(q.text);
        regex = new RegExp(q.wholeWord ? wholeWord(src) : src, 'gu' + (q.matchCase ? '' : 'i'));
      } else if (q.kind === 'regex') {
        const flags = 'gm' + (q.matchCase ? '' : 'i');
        // prefer Unicode mode; fall back for hand-written patterns that only parse without it (e.g. \-)
        try { regex = new RegExp(q.wholeWord ? wholeWord(q.text) : q.text, flags + 'u'); }
        catch (e) { regex = new RegExp(q.wholeWord ? R`\b(?:` + q.text + R`)\b` : q.text, flags); }
      } else {
        regex = new RegExp(q.source, q.flags.includes('g') ? q.flags : q.flags + 'g');
      }
      return { regex, groupCount: countGroups(regex) };
    } catch (e) {
      return { error: e.message.replace(/^Invalid regular expression: /, '') };
    }
  }

  // Non-overlapping, non-empty matches in text order
  function findAll(text, compiled, limit) {
    limit = limit || Infinity;
    if (compiled.find) {
      const all = compiled.find(text);
      return { matches: all.length > limit ? all.slice(0, limit) : all, truncated: all.length > limit };
    }
    const re = compiled.regex, matches = [];
    let m, truncated = false;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      if (!m[0]) { re.lastIndex++; continue; }
      if (matches.length >= limit) { truncated = true; break; }
      matches.push({ start: m.index, end: m.index + m[0].length, groups: m.length > 1 ? m.slice(1) : null });
    }
    return { matches, truncated };
  }

  // Keeps the matches that sit entirely inside one of `ranges` (sorted, disjoint — e.g. one CSV column)
  function filterByRanges(matches, ranges) {
    const out = [];
    let j = 0;
    for (const m of matches) {
      while (j < ranges.length && ranges[j].end < m.end) j++;
      if (j < ranges.length && ranges[j].start <= m.start) out.push(m);
    }
    return out;
  }

  // For a replacement that pulls in "another pattern": the match in `list` (sorted) closest to `m`.
  // Looks on m's own line first; with `anywhere`, falls back to the closest one in the whole text.
  function nearestMatch(list, m, text, anywhere) {
    let lo = 0, hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].start < m.start) lo = mid + 1; else hi = mid;
    }
    const lineStart = m.start > 0 ? text.lastIndexOf('\n', m.start - 1) + 1 : 0;
    let lineEnd = text.indexOf('\n', m.start);
    if (lineEnd === -1) lineEnd = text.length;
    // the list has no overlaps, so the closest candidates are the neighbours of m's position in it
    const pick = (sameLine) => {
      let best = null, bestGap = Infinity;
      for (let i = Math.max(0, lo - 1); i < Math.min(list.length, lo + 2); i++) {
        const c = list[i];
        if (c.start === m.start && c.end === m.end) continue; // m itself is not "another" match
        if (sameLine && (c.start < lineStart || c.end > lineEnd)) continue;
        const gap = c.end <= m.start ? m.start - c.end : c.start >= m.end ? c.start - m.end : 0;
        if (gap < bestGap) { best = c; bestGap = gap; }
      }
      return best;
    };
    return pick(true) || (anywhere ? pick(false) : null);
  }

  const TEMPLATE_TOKEN = /\$(\$|&|\d{1,2})|\\([nt\\])|\{([^{}\n]+)\}/g;

  // $& = whole match, $1…$99 = captured parts, $$ = a dollar sign, \n and \t = line break / tab,
  // {Name} = value of a linked pattern near the match. opts.dollars === false keeps $ and \ literal;
  // opts.link(name, m) returns the linked value, or undefined when Name is not a linked pattern.
  function expandTemplate(template, m, matched, opts) {
    const dollars = !opts || opts.dollars !== false;
    const link = opts && opts.link;
    const groups = m.groups || [];
    return template.replace(TEMPLATE_TOKEN, (all, d, escaped, name) => {
      if (name !== undefined) {
        const value = link ? link(name, m) : undefined;
        return value === undefined ? all : value;
      }
      if (!dollars) return all;
      if (escaped) return escaped === 'n' ? '\n' : escaped === 't' ? '\t' : '\\';
      if (d === '$') return '$';
      if (d === '&') return matched;
      if (+d >= 1 && +d <= groups.length) return groups[+d - 1] || '';
      if (d.length === 2 && +d[0] >= 1 && +d[0] <= groups.length) return (groups[+d[0] - 1] || '') + d[1];
      return all;
    });
  }

  const TRANSFORMS = {
    remove: () => '',
    upper: (s) => s.toUpperCase(),
    lower: (s) => s.toLowerCase(),
    title: (s) => s.toLowerCase().replace(/(^|[^\p{L}\p{M}\p{N}'’])(\p{L})/gu, (all, before, ch) => before + ch.toUpperCase()),
    mask: (s) => s.replace(/[\p{L}\p{N}]/gu, '*'),
  };

  /* Replace modes:
       'text'               the template replaces the match
       'after' / 'before'   the match stays; the template is added beside it
       'below' / 'above'    the match stays; the template is added as a new line under / over its line
       one of TRANSFORMS    the match is rewritten, no template */

  // What gets written for one match: (m, matched) -> string.
  // opts.expand turns on $1 / $& in the template. opts.links maps a {Name} used in the template to
  // that pattern's matches in opts.text; opts.anywhere lets a link look beyond the match's own line.
  // Returns null when the template asks for linked values and none exists near this match: such a
  // match is better left alone than given half a replacement.
  function makeFiller(mode, template, opts) {
    opts = opts || {};
    if (TRANSFORMS[mode]) return (m, matched) => TRANSFORMS[mode](matched);
    const links = opts.links || {};
    let asked = 0, got = 0;
    const link = (name, m) => {
      if (!Object.prototype.hasOwnProperty.call(links, name)) return undefined;
      asked++;
      const hit = nearestMatch(links[name], m, opts.text, opts.anywhere);
      if (hit) got++;
      return hit ? opts.text.slice(hit.start, hit.end) : '';
    };
    return (m, matched) => {
      asked = got = 0;
      const out = expandTemplate(template, m, matched, { dollars: !!opts.expand, link });
      return asked && !got ? null : out;
    };
  }

  // The edits that carry out a replacement, in text order: [{ start, end, text, lead, trail }].
  // An edit with start === end is an insertion. `lead` / `trail` count characters of `text` that
  // are only glue (the line break of a new line), not new content. Matches that would not change
  // produce no edit.
  function planEdits(text, matches, mode, fill) {
    const edits = [];
    for (const m of matches) {
      const matched = text.slice(m.start, m.end);
      const out = fill(m, matched);
      if (out === null) continue;
      if (mode === 'after' || mode === 'before') {
        const at = mode === 'after' ? m.end : m.start;
        if (out) edits.push({ start: at, end: at, text: out, lead: 0, trail: 0 });
      } else if (mode === 'below') {
        let at = text.indexOf('\n', m.start);
        if (at === -1) at = text.length;
        if (out) edits.push({ start: at, end: at, text: '\n' + out, lead: 1, trail: 0 });
      } else if (mode === 'above') {
        const at = m.start > 0 ? text.lastIndexOf('\n', m.start - 1) + 1 : 0;
        if (out) edits.push({ start: at, end: at, text: out + '\n', lead: 0, trail: 1 });
      } else if (out !== matched) edits.push({ start: m.start, end: m.end, text: out, lead: 0, trail: 0 });
    }
    return edits;
  }

  // Returns the new text and, for each edit, where its new content sits in it
  function applyEdits(text, edits) {
    const out = [], changes = [];
    let pos = 0, shift = 0;
    for (const e of edits) {
      out.push(text.slice(pos, e.start), e.text);
      const at = e.start + shift;
      changes.push({ start: at + e.lead, end: at + e.text.length - e.trail });
      pos = e.end;
      shift += e.text.length - (e.end - e.start);
    }
    out.push(text.slice(pos));
    return { text: out.join(''), changes };
  }

  // Where untouched ranges (sorted) end up once `edits` have been applied
  function shiftRanges(ranges, edits) {
    const out = [];
    let k = 0, shift = 0;
    for (const r of ranges) {
      for (; k < edits.length && edits[k].end <= r.start; k++) shift += edits[k].text.length - (edits[k].end - edits[k].start);
      out.push({ start: r.start + shift, end: r.end + shift });
    }
    return out;
  }

  const api = {
    escapeRe, wholeWord, clip, lineStarts, lineIndex,
    LIBRARY, CLEANUP, analyze, detectTable, parseTable, findDuplicateLines,
    BLOCK_TYPES, newBlock, toRegex, describe, describeBlock, fromExample, fixLetters, tokenAt, identify,
    compileQuery, findAll, filterByRanges, nearestMatch, expandTemplate, makeFiller, planEdits, applyEdits, shiftRanges,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FPR = api;
})(typeof window !== 'undefined' ? window : globalThis);
