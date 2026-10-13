/* Pattern Finder — UI. All text logic lives in core.js (window.FPR). */
(function () {
  'use strict';

  const C = window.FPR;
  const $ = (id) => document.getElementById(id);
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
  const num = (n) => n.toLocaleString('en');
  const plural = (n, one, many) => num(n) + ' ' + (n === 1 ? one : many);

  const MATCH_LIMIT = 200000; // matches kept for navigation; Replace all still covers every match
  const MARK_WINDOW = 3000;   // highlights drawn on each side of the current match
  const RESULT_ROWS = 300;
  const BIG_TEXT = 300000;    // above this many characters, per-keystroke updates are debounced
  const HISTORY_MAX = 60;

  const ta = $('ta'), backdrop = $('backdrop'), scroller = $('scroller'), inner = $('inner'), editor = $('editor');
  const findInput = $('find'), replaceInput = $('replace'), replaceMode = $('replaceMode'), scopeSelect = $('scope');

  const state = {
    ver: 0,               // bumped on every text change; caches key off it
    pattern: null,        // active pattern from the sidebar or builder; null means "use the Find box"
    opts: { matchCase: false, wholeWord: false, regex: false },
    compiled: null,
    error: '',
    matches: [],
    truncated: false,
    current: -1,
    win: { lo: 0, hi: 0, cLo: 0, cHi: 0 }, // match / change indexes currently drawn as highlights
    fromCaret: false,      // the caret was moved by hand, so Next/Prev continue from it
    excluded: [],          // ranges of matches the user left out of Replace (sorted; mirrored as match.skip)
    changes: [],           // after a replace: where the new text sits, so it can be shown and stepped through
    changeAt: -1,          // the change being looked at, or -1
    lastText: '',          // the text these ranges were measured in
    op: null,              // open "combine with another pattern" panel: { id, action, other, scope }
    analysis: null,
    table: null,
    tableSig: '',
    scope: 'all',
    builder: { blocks: [], ignoreCase: false, wholeWord: false },
    saved: [],
    links: {},             // patterns inserted into the replacement as {Name}: name -> { source, flags }
    linkList: [],          // what the "+ another pattern" picker currently offers
    linkScope: '',         // 'line' | 'near'; empty = pick a default that suits the text
    tab: 'patterns',
    fileName: '',
  };

  /* ---------- small utilities ---------- */

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode: just don't persist */ }
  }

  let toastTimer = 0;
  function toast(message, action) {
    const el = $('toast');
    el.innerHTML = '<span>' + esc(message) + '</span>' + (action ? '<button class="toast-btn">' + esc(action.label) + '</button>' : '');
    if (action) el.querySelector('button').onclick = () => { el.classList.remove('show'); action.run(); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), action ? 7000 : 3200);
  }

  function copyText(text, message) {
    const done = () => toast(message);
    const fallback = () => {
      const tmp = document.createElement('textarea');
      tmp.value = text;
      tmp.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(tmp);
      tmp.select();
      const ok = document.execCommand('copy');
      tmp.remove();
      if (ok) done(); else toast('Could not copy — select the text and press Ctrl+C');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  let lineCache = { ver: -1, starts: [0] };
  function lines() {
    if (lineCache.ver !== state.ver) lineCache = { ver: state.ver, starts: C.lineStarts(ta.value) };
    return lineCache.starts;
  }

  /* ---------- undo / redo ----------
     Setting textarea.value wipes the browser's own undo stack, so we keep snapshots ourselves. */

  const history = { undo: [], redo: [], typing: false, timer: 0 };
  const snapshot = () => ({ text: ta.value, start: ta.selectionStart, end: ta.selectionEnd, excluded: state.excluded, changes: state.changes });

  function updateHistoryButtons() {
    $('btnUndo').disabled = !history.undo.length;
    $('btnRedo').disabled = !history.redo.length;
  }

  // Call before changing the text
  function checkpoint() {
    const top = history.undo[history.undo.length - 1];
    if (!top || top.text !== ta.value) history.undo.push(snapshot()); // a change may be announced twice
    const max = ta.value.length > 2000000 ? 8 : HISTORY_MAX;
    while (history.undo.length > max) history.undo.shift();
    history.redo.length = 0;
    history.typing = false;
    updateHistoryButtons();
  }

  function restore(from, to) {
    if (!from.length) return;
    to.push(snapshot());
    const snap = from.pop();
    ta.value = snap.text;
    ta.setSelectionRange(snap.start, snap.end);
    state.excluded = snap.excluded; // exclusions and change marks come back exactly as they were in that text
    state.changes = snap.changes;
    state.changeAt = -1;
    state.lastText = snap.text;
    history.typing = false;
    updateHistoryButtons();
    afterTextChange(true, true);
    revealCaret();
  }
  const undo = () => restore(history.undo, history.redo);
  const redo = () => restore(history.redo, history.undo);

  /* ---------- searching ---------- */

  function currentQuery() {
    const p = state.pattern;
    if (p) return p.find ? { kind: 'fn', find: p.find } : { kind: 'pattern', source: p.source, flags: p.flags };
    const text = findInput.value;
    if (!text) return null;
    return { kind: state.opts.regex ? 'regex' : 'text', text, matchCase: state.opts.matchCase, wholeWord: state.opts.wholeWord };
  }

  let cellCache = { ver: -1, sig: '', columns: [] };
  // Cell ranges of the column chosen in "Search in", or null for the whole text
  function scopeCells() {
    if (state.scope === 'all' || !state.table) return null;
    if (cellCache.ver !== state.ver || cellCache.sig !== state.tableSig) {
      cellCache = { ver: state.ver, sig: state.tableSig, columns: C.parseTable(ta.value, state.table).columns };
    }
    return cellCache.columns[+state.scope] || [];
  }

  // First match starting at or after `offset`, wrapping round to the first match
  function indexAtOrAfter(offset) {
    const ms = state.matches;
    let lo = 0, hi = ms.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ms[mid].start < offset) lo = mid + 1; else hi = mid;
    }
    return lo < ms.length ? lo : 0;
  }

  // Index of the match containing `offset`, or -1
  function matchAt(offset) {
    const ms = state.matches;
    let lo = 0, hi = ms.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (ms[mid].end < offset) lo = mid + 1;
      else if (ms[mid].start > offset) hi = mid - 1;
      else return mid;
    }
    return -1;
  }

  /* Matches left out of Replace, and the pieces a replace changed, are remembered as text ranges.
     That lets them survive the list of matches being rebuilt after every edit. */

  // Move the remembered ranges along with an edit: the part of the text that changed lies between
  // the longest common start and end of the old and new text. Ranges inside that part are dropped.
  function followEdit() {
    const old = state.lastText, text = ta.value;
    state.lastText = text;
    if ((!state.excluded.length && !state.changes.length) || old === text) return;
    const limit = Math.min(old.length, text.length);
    let head = 0;
    while (head < limit && old.charCodeAt(head) === text.charCodeAt(head)) head++;
    let tail = 0;
    while (tail < limit - head && old.charCodeAt(old.length - 1 - tail) === text.charCodeAt(text.length - 1 - tail)) tail++;
    const changedEnd = old.length - tail, shift = text.length - old.length;
    const follow = (ranges) => {
      const moved = [];
      for (const r of ranges) {
        if (r.end <= head) moved.push(r);
        else if (r.start >= changedEnd) moved.push({ start: r.start + shift, end: r.end + shift });
      }
      return moved;
    };
    state.excluded = follow(state.excluded);
    state.changes = follow(state.changes);
    if (state.changeAt >= state.changes.length) state.changeAt = -1;
  }

  // Flag the matches that are excluded, and drop exclusions that no longer line up with a match
  function markExcluded(matches) {
    const ranges = state.excluded, kept = [];
    let j = 0;
    for (const m of matches) {
      while (j < ranges.length && ranges[j].start < m.start) j++;
      if (j < ranges.length && ranges[j].start === m.start && ranges[j].end === m.end) { m.skip = true; kept.push(ranges[j]); }
    }
    return kept;
  }

  const rememberExcluded = () => { state.excluded = state.matches.filter((m) => m.skip).map((m) => ({ start: m.start, end: m.end })); };

  // Index of the first match from `i` onwards (wrapping) that Replace may touch, or -1
  function nextIncluded(i) {
    const ms = state.matches;
    for (let k = 0; k < ms.length; k++) {
      const j = (i + k) % ms.length;
      if (!ms[j].skip) return j;
    }
    return -1;
  }

  function setSkipped(i, skip) {
    const m = state.matches[i];
    if (!m || !!m.skip === skip) return;
    m.skip = skip;
    rememberExcluded();
    backdrop.querySelectorAll('mark[data-i="' + i + '"]').forEach((el) => el.classList.toggle('skip', skip));
    updateCounter();
    renderResults();
  }

  function setAllSkipped(skip) {
    for (const m of state.matches) m.skip = skip;
    rememberExcluded();
    render();
    updateCounter();
    renderResults();
  }

  // Recompute state.matches. With `keep`, stay near the match that was current (used while typing).
  function runFind(keep) {
    const text = ta.value;
    const previous = keep ? state.matches[state.current] : null;
    followEdit();
    const query = currentQuery();
    state.matches = [];
    state.truncated = false;
    state.error = '';
    state.compiled = null;
    if (query) {
      const compiled = C.compileQuery(query);
      if (compiled.error) state.error = compiled.error;
      else {
        state.compiled = compiled;
        if (text) {
          const found = C.findAll(text, compiled, MATCH_LIMIT);
          const cells = scopeCells();
          state.matches = cells ? C.filterByRanges(found.matches, cells) : found.matches;
          state.truncated = found.truncated;
        }
      }
    }
    state.excluded = markExcluded(state.matches);
    state.current = state.matches.length ? (previous ? indexAtOrAfter(previous.start) : 0) : -1;
    updateFindUi();
  }

  // Search from scratch and land on the first match — or, given `anchor`, on the match at that
  // offset without scrolling (the user is already looking at it).
  function search(anchor) {
    state.excluded = []; // a new search is a new list: nothing is left out yet,
    state.changes = [];  // and the marks of the last replace have done their job
    state.changeAt = -1;
    runFind(false);
    const here = anchor == null ? -1 : matchAt(anchor);
    if (here !== -1) state.current = here;
    render();
    if (state.current >= 0) gotoMatch(state.current, here === -1);
  }

  let searchTimer = 0;
  function searchSoon() {
    clearTimeout(searchTimer);
    if (ta.value.length > BIG_TEXT) searchTimer = setTimeout(() => search(), 160); else search();
  }

  function updateCounter() {
    const n = state.matches.length, query = currentQuery();
    const total = num(n) + (state.truncated ? '+' : '');
    const counter = $('counter');
    const out = state.excluded.length;
    counter.textContent = !query ? '' : state.error ? 'Check pattern' : !n ? 'No results' : num(state.current + 1) + ' of ' + total + (out ? ' · ' + num(out) + ' excluded' : '');
    counter.classList.toggle('none', !!query && !n);
    $('tabCount').textContent = n ? total : '';
  }

  function updateFindUi() {
    const none = !state.matches.length;
    updateCounter();
    updateChangesBar();
    $('btnPrev').disabled = $('btnNext').disabled = $('btnReplace').disabled = $('btnReplaceAll').disabled = none;
    renderExtras();
    renderResults();
    updateBuilderCount();
  }

  // Third row of the find bar: column scope, things to insert into the replacement, pattern errors
  function renderExtras() {
    const c = state.compiled;
    const chips = $('chips'), error = $('findError'), scopeWrap = $('scopeWrap'), linkWrap = $('linkScopeWrap');
    // $& and $1 only mean something for patterns; in plain-text mode the replacement is literal
    const parts = !!c && templateMode() && (!!state.pattern || state.opts.regex);
    const list = templateMode() && ta.value && currentQuery() ? linkables() : [];
    state.linkList = list;
    chips.hidden = !parts && !list.length;
    if (!chips.hidden) {
      const labels = (state.pattern && state.pattern.groupLabels) || [];
      let html = '<span>Insert:</span>';
      if (parts) {
        if (replaceMode.value === 'text') html += '<button class="chip" data-ins="$&amp;" title="The matched text itself — keep it and put new text around it">the match</button>';
        for (let i = 1; i <= Math.min(c.groupCount, 12); i++) {
          html += '<button class="chip" data-ins="$' + i + '" title="Inserts $' + i + '"><b>' + i + '</b>' + (labels[i - 1] ? esc(C.clip(labels[i - 1], 24)) : 'part ' + i) + '</button>';
        }
      }
      if (list.length) {
        html += '<select class="chip-select" id="linkPick" aria-label="Insert the value of another pattern" title="Bring in the value of another pattern found near each match">' +
          '<option value="">+ another pattern…</option>';
        let group = '';
        list.forEach((l, i) => {
          if (l.group !== group) { html += (group ? '</optgroup>' : '') + '<optgroup label="' + esc(l.group) + '">'; group = l.group; }
          html += '<option value="' + i + '">' + esc(l.name) + '</option>';
        });
        html += '</optgroup></select>';
      }
      if (chips.dataset.html !== html) { chips.innerHTML = html; chips.dataset.html = html; }
    }
    linkWrap.hidden = !templateMode() || !resolveLinks(replaceInput.value).size;
    if (!linkWrap.hidden) $('linkScope').value = linkScope();
    error.hidden = !state.error;
    error.textContent = state.error ? 'This pattern is not valid yet: ' + state.error : '';
    scopeWrap.hidden = !state.table;
    $('extras').hidden = chips.hidden && error.hidden && scopeWrap.hidden && linkWrap.hidden;
  }

  function renderScope() {
    const t = state.table;
    let html = '<option value="all">the whole text</option>';
    if (t) html += t.headers.map((h, i) => '<option value="' + i + '">column ' + (i + 1) + (t.hasHeader ? ': ' + esc(C.clip(h, 26)) : '') + '</option>').join('');
    // analysis re-runs while typing; only touch the dropdown when its options really changed
    if (scopeSelect.dataset.html !== html) { scopeSelect.innerHTML = html; scopeSelect.dataset.html = html; }
    scopeSelect.value = state.scope;
  }

  /* ---------- editor rendering ---------- */

  // What to highlight, in text order and never overlapping: the matches ({ m: index }) and, after
  // a replace, the pieces that changed ({ c: index }). Where the two meet, the change is shown.
  function paintItems() {
    const ms = state.matches, cs = state.changes;
    const windowOf = (count, centre) => {
      if (count <= MARK_WINDOW * 2) return [0, count];
      const lo = Math.max(0, Math.min(centre - MARK_WINDOW, count - MARK_WINDOW * 2));
      return [lo, lo + MARK_WINDOW * 2];
    };
    const [lo, hi] = windowOf(ms.length, state.current);
    const [cLo, cHi] = windowOf(cs.length, state.changeAt);
    state.win = { lo, hi, cLo, cHi };

    const items = [];
    let j = cLo, floor = 0; // floor: end of the last change, which a later match must not paint over
    for (let i = lo; i < hi; i++) {
      const m = ms[i];
      let s = Math.max(m.start, floor);
      for (; j < cHi && cs[j].start < m.end; j++) {
        const c = cs[j];
        if (c.start > s) items.push({ start: s, end: c.start, m: i });
        items.push({ start: c.start, end: c.end, c: j });
        floor = c.end;
        s = Math.max(s, c.end);
      }
      if (s < m.end) items.push({ start: s, end: m.end, m: i });
    }
    for (; j < cHi; j++) items.push({ start: cs[j].start, end: cs[j].end, c: j });
    return items;
  }

  // Rebuild the backdrop: one <div> per line with <mark>s for the matches and changes
  function render() {
    const text = ta.value, ms = state.matches, cur = state.current, n = text.length;
    const items = paintItems();

    const out = [];
    let k = 0, pos = 0;
    for (;;) {
      let end = text.indexOf('\n', pos);
      if (end === -1) end = n;
      let html = '', cursor = pos;
      while (k < items.length && items[k].start <= end) {
        const it = items[k];
        const s = Math.max(it.start, cursor), e = Math.min(it.end, end);
        if (s > cursor) html += esc(text.slice(cursor, s));
        const takesBreak = it.end > end && end < n;
        const gone = it.end === it.start; // a change that only removed text: nothing to cover, so it gets a marker
        const attrs = it.c === undefined
          ? 'data-i="' + it.m + '" class="' + (it.m === cur ? 'cur' : '') + (ms[it.m].skip ? ' skip' : '')
          : 'data-c="' + it.c + '" class="chg' + (it.c === state.changeAt ? ' on' : '') + (gone ? ' gone' : '');
        // an empty piece (the match is only this line's break) still needs a box to hang the ↵ marker on
        html += '<mark ' + attrs + (takesBreak ? ' nl' : '') + '">' + (e > s ? esc(text.slice(s, e)) : gone ? '' : '\u200b') + '</mark>';
        cursor = Math.max(cursor, e);
        if (it.end > end + 1) break; // it carries on into the next line
        k++;
      }
      if (cursor < end) html += esc(text.slice(cursor, end));
      out.push('<div class="line">' + html + '</div>');
      if (end === n) break;
      pos = end + 1;
    }
    backdrop.innerHTML = out.join('');
    inner.style.setProperty('--gutter', Math.max(2, String(out.length).length) * 8 + 30 + 'px');
    ta.scrollTop = ta.scrollLeft = 0; // the textarea is sized to its content; only .scroller scrolls
  }

  // Scroll .scroller so a screen rectangle is comfortably visible
  function reveal(rect, center) {
    const box = scroller.getBoundingClientRect();
    const top = box.top + 28, bottom = box.top + scroller.clientHeight - 28;
    const left = box.left + 16, right = box.left + scroller.clientWidth - 32;
    if (rect.top < top || rect.bottom > bottom) {
      scroller.scrollTop += center ? (rect.top + rect.bottom) / 2 - (top + bottom) / 2 : rect.top < top ? rect.top - top : rect.bottom - bottom;
    }
    if (rect.left < left || rect.right > right) {
      scroller.scrollLeft += center ? rect.left - left - 120 : rect.left < left ? rect.left - left : rect.right - right;
    }
  }

  // Screen position of a text offset, measured on the backdrop (it mirrors the textarea's layout)
  function offsetRect(offset) {
    const starts = lines();
    const li = C.lineIndex(starts, offset);
    const lineEl = backdrop.children[li];
    if (!lineEl) return null;
    let col = offset - starts[li];
    const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (col > node.length) { col -= node.length; continue; }
      const after = col === node.length; // measure the character before the caret when there is none after it
      range.setStart(node, after ? col - 1 : col);
      range.setEnd(node, after ? col : col + 1);
      const rects = range.getClientRects();
      const r = rects[after ? rects.length - 1 : 0];
      if (r) { const x = after ? r.right : r.left; return { top: r.top, bottom: r.bottom, left: x, right: x }; }
      break;
    }
    const r = lineEl.getBoundingClientRect(); // empty line
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.left };
  }

  const caretOffset = () => (ta.selectionDirection === 'backward' ? ta.selectionStart : ta.selectionEnd);

  function revealCaret() {
    const rect = offsetRect(caretOffset());
    if (rect) reveal(rect, false);
  }

  function showPosition(offset, selected) {
    const starts = lines();
    const li = C.lineIndex(starts, offset);
    $('statPos').textContent = 'Ln ' + num(li + 1) + ', Col ' + num(offset - starts[li] + 1) + (selected ? ' (' + num(selected) + ' selected)' : '');
  }

  // PageUp/PageDown would jump a whole "textarea height" (= the entire text), so page by the visible area
  function pageMove(dir, extend) {
    const starts = lines(), rows = backdrop.children;
    const from = caretOffset();
    const li = C.lineIndex(starts, from);
    if (!rows[li]) return;
    const distance = Math.max(22, scroller.clientHeight - 44);
    const targetY = rows[li].offsetTop + dir * distance;
    let lo = 0, hi = rows.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (rows[mid].offsetTop <= targetY) lo = mid; else hi = mid - 1;
    }
    const lineEnd = lo + 1 < starts.length ? starts[lo + 1] - 1 : ta.value.length;
    const to = Math.min(starts[lo] + (from - starts[li]), lineEnd);
    if (extend) {
      const anchor = ta.selectionDirection === 'backward' ? ta.selectionEnd : ta.selectionStart;
      ta.setSelectionRange(Math.min(anchor, to), Math.max(anchor, to), to < anchor ? 'backward' : 'forward');
    } else ta.setSelectionRange(to, to);
    scroller.scrollTop += dir * distance;
    revealCaret();
    caretMoved();
  }

  /* ---------- navigating matches ---------- */

  function gotoMatch(i, scroll) {
    const m = state.matches[i];
    if (!m) return;
    state.current = i;
    state.fromCaret = false;
    if (i < state.win.lo || i >= state.win.hi) render();
    else {
      backdrop.querySelectorAll('mark.cur').forEach((el) => el.classList.remove('cur'));
      backdrop.querySelectorAll('mark[data-i="' + i + '"]').forEach((el) => el.classList.add('cur'));
    }
    updateCounter();
    showPosition(m.start);
    // put the editor's selection on the match too, unless the user is busy typing in the editor
    if (document.activeElement !== ta) ta.setSelectionRange(m.start, m.end);
    if (scroll !== false) {
      const el = backdrop.querySelector('mark.cur');
      if (el) reveal(el.getBoundingClientRect(), true);
    }
    const rows = $('results');
    const old = rows.querySelector('.res.cur');
    if (old) old.classList.remove('cur');
    const row = rows.querySelector('.res[data-i="' + i + '"]');
    if (row) { row.classList.add('cur'); if (state.tab === 'results') row.scrollIntoView({ block: 'nearest' }); }
  }

  function step(dir) {
    const n = state.matches.length;
    if (!n) return;
    let i = (state.current + dir + n) % n;
    if (state.fromCaret) { // continue from where the caret was placed, like Find Next in any editor
      const pos = ta.selectionStart;
      const at = indexAtOrAfter(pos);
      const wrapped = state.matches[at].start < pos;
      i = dir > 0 ? at : wrapped ? n - 1 : (at - 1 + n) % n;
    }
    gotoMatch(i);
  }

  // The user moved the caret (click or arrow keys)
  function caretMoved() {
    history.typing = false; // typing somewhere else is a separate undo step
    showPosition(caretOffset(), ta.selectionEnd - ta.selectionStart);
    if (!state.matches.length) return;
    const i = matchAt(ta.selectionStart);
    if (i === -1) state.fromCaret = true;
    else if (i !== state.current) gotoMatch(i, false);
    else state.fromCaret = false;
  }

  /* ---------- looking at what a replace changed ---------- */

  function updateChangesBar() {
    const n = state.changes.length;
    $('changesBar').hidden = !n;
    if (n) $('changesText').textContent = (state.changeAt >= 0 ? 'Change ' + num(state.changeAt + 1) + ' of ' + num(n) : plural(n, 'change', 'changes') + ' made') + ' — shown in green';
  }

  function gotoChange(j) {
    const c = state.changes[j];
    if (!c) return;
    state.changeAt = j;
    if (j < state.win.cLo || j >= state.win.cHi) render();
    else {
      backdrop.querySelectorAll('mark.on').forEach((el) => el.classList.remove('on'));
      backdrop.querySelectorAll('mark[data-c="' + j + '"]').forEach((el) => el.classList.add('on'));
    }
    updateChangesBar();
    showPosition(c.start);
    const el = backdrop.querySelector('mark.on');
    if (el) reveal(el.getBoundingClientRect(), true);
    const rows = $('results');
    const old = rows.querySelector('.res.on');
    if (old) old.classList.remove('on');
    const row = rows.querySelector('.res[data-c="' + j + '"]');
    if (row) { row.classList.add('on'); if (state.tab === 'results') row.scrollIntoView({ block: 'nearest' }); }
  }

  function stepChange(dir) {
    const n = state.changes.length;
    if (n) gotoChange(state.changeAt === -1 ? (dir > 0 ? 0 : n - 1) : (state.changeAt + dir + n) % n);
  }

  // Bring the first change into view without stepping onto it
  function showFirstChange() {
    const el = backdrop.querySelector('mark.chg');
    if (el) reveal(el.getBoundingClientRect(), true);
  }

  function clearChanges() {
    state.changes = [];
    state.changeAt = -1;
    render();
    updateChangesBar();
    renderResults();
  }

  /* ---------- replacing ---------- */

  // Modes that keep the match and add the template: beside it, or as a new line under / over its line
  const ADD_MODES = new Set(['after', 'before', 'below', 'above']);
  const addMode = () => ADD_MODES.has(replaceMode.value);
  // Modes where the Replace box holds a template at all (the others rewrite the match by a rule)
  function templateMode() {
    return replaceMode.value === 'text' || addMode();
  }

  // Patterns whose value can be pulled into a replacement as {Name}: the user's own, then detected ones
  function linkables() {
    const list = [];
    const add = (group, name, re) => {
      const clean = name.replace(/[{}\n]/g, '').trim();
      if (re && clean && !list.some((l) => l.name === clean)) list.push({ group, name: clean, source: re.source, flags: re.flags });
    };
    for (const s of state.saved) add('My saved patterns', s.label, C.toRegex(s.blocks, s));
    add('My saved patterns', 'Builder pattern', C.toRegex(state.builder.blocks, state.builder));
    if (state.analysis) {
      for (const g of state.analysis.groups) {
        if (g.id !== 'data' && g.id !== 'shapes') continue;
        for (const it of g.items) add(g.title, g.id === 'shapes' ? it.samples[0] + ' style' : it.label, it);
      }
    }
    return list;
  }

  // {Name} tokens in a template that refer to a known pattern: name -> { source, flags }.
  // A name inserted earlier keeps working even if the text changed and it is no longer listed.
  function resolveLinks(template) {
    const found = new Map();
    if (!template.includes('{')) return found;
    const live = linkables();
    for (const m of template.matchAll(/\{([^{}\n]+)\}/g)) {
      const def = live.find((l) => l.name === m[1]) || state.links[m[1]];
      if (def) found.set(m[1], def);
    }
    return found;
  }

  // Where a linked value may come from. Rows of a table must not borrow from each other by default.
  const linkScope = () => state.linkScope || (state.table ? 'line' : 'near');

  // What Replace writes for a match under the current settings: (m, matched) -> text, or null to
  // leave that match alone. $1 / $& only mean something for patterns; in plain-text mode the
  // replacement is taken literally.
  function filler() {
    const text = ta.value, template = replaceInput.value;
    const links = {};
    if (templateMode()) {
      for (const [name, def] of resolveLinks(template)) {
        const compiled = C.compileQuery({ kind: 'pattern', source: def.source, flags: def.flags });
        if (!compiled.error) links[name] = C.findAll(text, compiled).matches;
      }
    }
    return C.makeFiller(replaceMode.value, template, { expand: !!state.pattern || state.opts.regex, links, text, anywhere: linkScope() === 'near' });
  }

  // "Keep it, add…" with nothing to add would change nothing
  function nothingToAdd() {
    if (!addMode() || replaceInput.value) return false;
    toast('Type what to add first — the match itself stays as it is.');
    replaceInput.focus();
    return true;
  }

  function replaceOne() {
    const m = state.matches[state.current];
    if (!m || nothingToAdd()) return;
    if (m.skip) { // left out on purpose: step over it instead of changing it
      const next = nextIncluded(state.current + 1);
      if (next === -1) toast('Every match is excluded — tick the ones to replace in Results.');
      else { gotoMatch(next); toast('Skipped an excluded match'); }
      return;
    }
    const text = ta.value, mode = replaceMode.value;
    const edits = C.planEdits(text, [m], mode, filler());
    if (!edits.length) { // no linked value near this one, or it already reads that way
      const next = nextIncluded(state.current + 1);
      if (next !== -1 && next !== state.current) gotoMatch(next);
      toast('Nothing to change at that match — moved on');
      return;
    }
    const done = C.applyEdits(text, edits), edit = edits[0];
    // carry on after both the match and what was written (a new line below sits after the rest of the line)
    const resume = mode === 'below' ? m.end : Math.max(m.end, edit.end) + edit.text.length - (edit.end - edit.start);
    checkpoint();
    ta.value = done.text;
    ta.setSelectionRange(resume, resume);
    followEdit(); // earlier change marks move first, then this one joins them in text order
    const change = done.changes[0];
    // a new array: the undo snapshot taken above still points at the old one
    state.changes = state.changes.filter((c) => c.start <= change.start).concat(change, state.changes.filter((c) => c.start > change.start));
    afterTextChange(false, false);
    if (!state.matches.length) { toast('Replaced — no more matches'); return; }
    const from = indexAtOrAfter(resume), next = nextIncluded(from);
    gotoMatch(next === -1 ? from : next);
    if (next === -1) toast('Replaced — only excluded matches are left');
  }

  function replaceAll() {
    if (!state.matches.length || nothingToAdd()) return;
    const text = ta.value;
    let all = state.matches;
    if (state.truncated) { // navigation keeps a capped list; replacing must cover everything
      all = C.findAll(text, state.compiled).matches;
      const cells = scopeCells();
      if (cells) all = C.filterByRanges(all, cells);
      markExcluded(all);
    }
    const ms = all.filter((m) => !m.skip);
    const left = all.length - ms.length;
    if (!ms.length) { toast('Every match is excluded — tick the ones to replace in Results.'); return; }
    const mode = replaceMode.value;
    const verb = addMode() ? 'Added to ' : mode === 'remove' || (mode === 'text' && !replaceInput.value) ? 'Removed ' : 'Replaced ';
    const edits = C.planEdits(text, ms, mode, filler());
    if (!edits.length) {
      toast(resolveLinks(replaceInput.value).size && templateMode() ? 'Nothing changed — no match has that other pattern nearby.' : 'Nothing changed — the matches already read that way.');
      return;
    }
    const done = C.applyEdits(text, edits);
    const same = ms.length - edits.length;
    checkpoint();
    ta.value = done.text;
    ta.setSelectionRange(0, 0);
    state.excluded = C.shiftRanges(all.filter((m) => m.skip), edits); // excluded matches stay excluded where they end up
    state.changes = done.changes;
    state.changeAt = -1;
    state.lastText = done.text;
    afterTextChange(false, true);
    showFirstChange();
    toast(verb + plural(edits.length, 'match', 'matches') +
      (same ? ' · ' + num(same) + ' had nothing to change' : '') +
      (left ? ' · ' + num(left) + ' excluded left as ' + (left === 1 ? 'it was' : 'they were') : ''), { label: 'Undo', run: undo });
  }

  /* ---------- text changes ---------- */

  let analysisTimer = 0;
  function scheduleAnalysis(delay) {
    clearTimeout(analysisTimer);
    analysisTimer = setTimeout(runAnalysis, delay);
  }

  function runAnalysis() {
    const text = ta.value;
    state.analysis = text ? C.analyze(text) : null;
    const table = state.analysis ? state.analysis.table : null;
    const sig = table ? table.delim + ':' + table.cols : '';
    const scopeLost = sig !== state.tableSig && state.scope !== 'all';
    state.table = table;
    if (sig !== state.tableSig) { state.tableSig = sig; state.scope = 'all'; }
    renderScope();
    if (scopeLost) { runFind(true); render(); } else renderExtras();
    renderPatterns();
    renderStatus();
  }

  // The text was replaced by the app (not typed): refresh everything that depends on it
  function afterTextChange(keepPosition, analyzeNow) {
    state.ver++;
    $('empty').hidden = ta.value !== '';
    runFind(keepPosition);
    render();
    scheduleAnalysis(analyzeNow ? 0 : 450);
  }

  function setText(text, fileName) {
    checkpoint();
    ta.value = text;
    ta.setSelectionRange(0, 0);
    state.fileName = fileName || '';
    state.fromCaret = false;
    state.excluded = [];
    scroller.scrollTop = scroller.scrollLeft = 0;
    afterTextChange(false, true);
    showPosition(0);
  }

  function renderStatus() {
    const a = state.analysis;
    $('statText').textContent = a ? plural(a.stats.lines, 'line', 'lines') + ' · ' + plural(a.stats.words, 'word', 'words') + ' · ' + plural(a.stats.chars, 'character', 'characters') : '';
    $('statTable').textContent = state.table ? state.table.name + ' · ' + state.table.cols + ' columns' : '';
  }

  /* ---------- the Find field: text box or pattern pill ---------- */

  function syncFindField() {
    const p = state.pattern;
    $('pill').hidden = !p;
    findInput.hidden = !!p;
    $('toggles').hidden = !!p;
    if (p) {
      $('pillIco').textContent = p.icon || '✎';
      $('pillLabel').textContent = p.label;
      $('pillLabel').title = p.source ? 'Regex: ' + p.source : '';
      $('pillRegex').hidden = !p.source;
    }
    $('optCase').setAttribute('aria-pressed', state.opts.matchCase);
    $('optWord').setAttribute('aria-pressed', state.opts.wholeWord);
    $('optRegex').setAttribute('aria-pressed', state.opts.regex);
    findInput.placeholder = state.opts.regex ? 'Regular expression, e.g. \\d{4}-\\d{2}' : 'Type text to find — or pick a pattern on the right';
  }

  function markActivePattern() {
    const id = state.pattern ? state.pattern.id : null;
    $('panel-patterns').querySelectorAll('.pat-row').forEach((row) => row.classList.toggle('active', row.dataset.id === id));
  }

  function setPattern(p, anchor) {
    state.pattern = p;
    syncFindField();
    markActivePattern();
    search(anchor);
  }

  function clearPattern(focus) {
    state.pattern = null;
    syncFindField();
    markActivePattern();
    search();
    if (focus) findInput.focus();
  }

  /* ---------- sidebar: detected patterns ---------- */

  const registry = new Map(); // id -> item currently listed in the Patterns tab

  // Turns a list of builder blocks into an activatable pattern (null while the blocks are empty)
  function blocksPattern(blocks, opts, base) {
    const re = C.toRegex(blocks, opts);
    if (!re) return null;
    const groupLabels = [];
    for (const b of blocks) if (re.groupOf[b.id]) groupLabels[re.groupOf[b.id] - 1] = C.describeBlock(b);
    return Object.assign({ source: re.source, flags: re.flags, groupLabels }, base);
  }

  function patternFromItem(it) {
    const base = { id: it.id, label: it.label, icon: it.icon };
    if (it.blocks) return blocksPattern(it.blocks, it, base);
    return Object.assign(base, { source: it.source, flags: it.flags, find: it.find });
  }

  function savedItems() {
    const text = ta.value;
    const items = [];
    for (const s of state.saved) {
      const re = C.toRegex(s.blocks, s);
      if (!re) continue;
      const count = text ? C.findAll(text, C.compileQuery({ kind: 'pattern', source: re.source, flags: re.flags }), 100000).matches.length : 0;
      items.push({ id: 'saved:' + s.id, label: s.label, icon: '★', count, samples: [], hint: C.describe(s.blocks), blocks: s.blocks, ignoreCase: s.ignoreCase, wholeWord: s.wholeWord, saved: true });
    }
    return items;
  }

  function itemHtml(it) {
    registry.set(it.id, it);
    const id = esc(it.id);
    // a hint says more than raw samples (which are invisible for things like trailing spaces)
    const sub = it.hint
      ? '<span class="pat-sub">' + esc(it.hint) + '</span>'
      : '<span class="pat-sub mono">' + esc((it.samples || []).join('  ·  ')) + '</span>';
    return '<div class="pat-row' + (state.pattern && state.pattern.id === it.id ? ' active' : '') + '" data-id="' + id + '">' +
      '<button class="pat" data-id="' + id + '" title="' + esc(it.hint || (it.samples || []).join(', ')) + '">' +
      '<span class="ico">' + esc(it.icon) + '</span>' +
      '<span class="pat-main"><span class="pat-name">' + esc(it.label) + '</span>' + sub + '</span>' +
      '<span class="badge">' + num(it.count) + (it.capped ? '+' : '') + '</span></button>' +
      '<button class="mini" data-op="' + id + '" title="At each of these, add another pattern beside it — or swap it in" aria-label="Combine with another pattern">⇄</button>' +
      (it.blocks ? '<button class="mini" data-edit="' + id + '" title="Open in the builder to adjust">✎</button>' : '') +
      (it.saved ? '<button class="mini" data-del="' + id + '" title="Delete this saved pattern">✕</button>' : '') +
      '</div>' + (state.op && state.op.id === it.id ? opPanelHtml(it) : '');
  }

  /* "Combine with another pattern": at every match of one pattern, add the value of another pattern
     found near it — beside it or on a new line — or put that value in its place. The panel only
     sets up Find and Replace, so preview, exclusions, change marks and undo work as for any replace. */

  const OP_ACTIONS = [
    ['after', 'add beside it — after'],
    ['before', 'add beside it — before'],
    ['below', 'add on a new line below'],
    ['above', 'add on a new line above'],
    ['text', 'replace it with'],
  ];

  // What goes in the Replace box to carry out an action with the other pattern's value
  const opTemplate = (action, name) => (action === 'after' ? ' {' + name + '}' : action === 'before' ? '{' + name + '} ' : '{' + name + '}');

  // The patterns that can be brought in at `it`: the saved and detected ones, except itself
  function opOthers(it) {
    const self = patternFromItem(it);
    return linkables().filter((l) => !(self && l.source === self.source && l.flags === self.flags));
  }

  // How the chosen action would work out on the current text: { total, have, example }
  function opOutcome(it, other) {
    const op = state.op, text = ta.value, self = patternFromItem(it);
    const mine = self && C.compileQuery(self.find ? { kind: 'fn', find: self.find } : { kind: 'pattern', source: self.source, flags: self.flags });
    const theirs = C.compileQuery({ kind: 'pattern', source: other.source, flags: other.flags });
    if (!mine || mine.error || theirs.error) return { total: 0, have: 0, example: '' };
    const ms = C.findAll(text, mine, 5000).matches;
    const fill = C.makeFiller(op.action, '{x}', { links: { x: C.findAll(text, theirs).matches }, text, anywhere: op.scope === 'near' });
    let have = 0, example = '';
    for (const m of ms) {
      const value = fill(m, '');
      if (value === null) continue;
      if (have++) continue;
      const a = C.clip(text.slice(m.start, m.end).trim(), 26), b = C.clip(value, 26);
      example = { after: a + ' ' + b, before: b + ' ' + a, below: a + ' ↵ ' + b, above: b + ' ↵ ' + a, text: a + ' → ' + b }[op.action];
    }
    return { total: ms.length, have, example };
  }

  function opPanelHtml(it) {
    const op = state.op, others = opOthers(it);
    if (!others.length) {
      return '<div class="pat-op"><p class="pat-op-note">There is no other pattern to bring in yet. Save one in the Builder tab, or use text that holds more than one kind of thing.</p></div>';
    }
    let other = others.find((l) => l.name === op.other);
    if (!other) { other = others[0]; op.other = other.name; }
    let options = '', group = '';
    others.forEach((l, i) => {
      if (l.group !== group) { options += (group ? '</optgroup>' : '') + '<optgroup label="' + esc(l.group) + '">'; group = l.group; }
      options += option(i, l.name, l === other);
    });
    const r = opOutcome(it, other);
    const where = op.scope === 'line' ? 'on its line' : 'anywhere near';
    const note = !r.have
      ? 'None of the ' + num(r.total) + ' has a “' + esc(other.name) + '” ' + where + (op.scope === 'line' ? ' — try “else the nearest”.' : '.')
      : 'For example: <code>' + esc(r.example) + '</code><br>' +
        (r.have === r.total ? 'All ' + num(r.total) + ' have one.' : num(r.have) + ' of ' + num(r.total) + ' have one ' + where + '; the others stay as they are.');
    return '<div class="pat-op">' +
      '<div class="pat-op-line">Wherever <b>' + esc(it.label) + '</b> appears:</div>' +
      '<select class="select" data-opf="action" aria-label="What to do there">' + OP_ACTIONS.map(([value, label]) => option(value, label, value === op.action)).join('') + '</select>' +
      '<div class="pat-op-line"><span>the</span><select class="select" data-opf="other" aria-label="The other pattern">' + options + '</optgroup></select></div>' +
      '<div class="pat-op-line"><span>found</span><select class="select" data-opf="scope" aria-label="Where to look for it">' +
      option('line', 'on the same line', op.scope === 'line') + option('near', 'on the same line, else the nearest', op.scope === 'near') + '</select></div>' +
      '<p class="pat-op-note">' + note + '</p>' +
      '<div class="pat-op-btns"><button class="btn" data-opdo="preview"' + (r.have ? '' : ' disabled') + '>Preview</button>' +
      '<button class="btn primary" data-opdo="apply"' + (r.have ? '' : ' disabled') + '>Apply to ' + num(r.have) + '</button>' +
      '<button class="link" data-opdo="close">Close</button></div></div>';
  }

  // Carry the panel's choice into Find and Replace; with `apply`, replace straight away
  function runOp(apply) {
    const op = state.op, it = op && registry.get(op.id);
    const other = it && opOthers(it).find((l) => l.name === op.other);
    const pattern = other && patternFromItem(it);
    if (!pattern) return;
    state.links[other.name] = { source: other.source, flags: other.flags };
    state.linkScope = op.scope;
    replaceMode.value = op.action;
    replaceInput.value = opTemplate(op.action, other.name);
    replaceModeChanged();
    state.op = null;
    setPattern(pattern);
    renderPatterns();
    if (apply) replaceAll();
    switchTab('results'); // the preview, or the list of what just changed
  }

  function renderPatterns() {
    registry.clear();
    const a = state.analysis;
    const groups = [{ title: 'My saved patterns', items: savedItems() }].concat(a ? a.groups : []);
    let html = '';
    if (!ta.value) {
      html += '<div class="info"><b>How it works</b><ol class="steps">' +
        '<li><b>Paste your text</b> in the editor — notes, logs, CSV, any table.</li>' +
        '<li><b>Pick a pattern</b> that shows up here (emails, dates, IDs, repeats…), make your own in <b>Builder</b>, or <b>right-click</b> any text to create one from it.</li>' +
        '<li><b>Jump</b> with Next / Prev, then <b>Replace</b> one or all — like Notepad, but for patterns.</li>' +
        '</ol></div>';
    } else {
      if (state.table) {
        html += '<div class="info"><b>' + esc(state.table.name) + '</b> detected — ' + state.table.cols + ' columns. ' +
          'Use <b>Search in</b> under the Replace box to find and replace inside one column only.</div>';
      }
      html += '<p class="hint">Click a pattern to find it. <b>⇄</b> adds another pattern beside each match (or on a new line), or swaps it in.</p>';
    }
    for (const g of groups) {
      if (!g.items.length) continue;
      html += '<section class="group"><h3>' + esc(g.title) + '</h3>' + g.items.map(itemHtml).join('') + '</section>';
    }
    if (a && !a.groups.some((g) => g.items.length)) {
      html += '<p class="hint">Nothing common stood out in this text. Type in the Find box, or describe what you are looking for in the <b>Builder</b> tab.</p>';
    }
    $('panel-patterns').innerHTML = html;
  }

  /* ---------- sidebar: pattern builder ---------- */

  const TYPE_GROUPS = {};
  for (const [key, t] of Object.entries(C.BLOCK_TYPES)) (TYPE_GROUPS[t.group] = TYPE_GROUPS[t.group] || []).push([key, t.label]);

  const option = (value, label, selected) => '<option value="' + value + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>';

  // A <select> sized to its current choice, so a block's controls fit on one row
  function fittedSelect(field, aria, choices, current) {
    const label = (choices.find(([value]) => value === current) || ['', ''])[1];
    return '<select data-f="' + field + '" aria-label="' + aria + '" style="width:' + Math.round(label.length * 7.4 + 36) + 'px">' +
      choices.map(([value, text]) => option(value, text, value === current)).join('') + '</select>';
  }
  const CASE_CHOICES = [['any', 'any case'], ['upper', 'UPPERCASE'], ['lower', 'lowercase']];
  const QTY_CHOICES = [['plus', '1 or more'], ['exact', 'exactly'], ['range', 'between']];

  const cloneBlocks = (blocks) => blocks.map((b) => {
    const copy = JSON.parse(JSON.stringify(b));
    delete copy.id; // newBlock hands out a fresh id
    return C.newBlock(copy.type, copy);
  });

  function blockHtml(b, i, count) {
    const t = C.BLOCK_TYPES[b.type];
    let ctl = '<select data-f="type" aria-label="Kind of piece" style="width:' + Math.round(t.label.length * 7.4 + 36) + 'px">' +
      Object.entries(TYPE_GROUPS).map(([group, list]) => '<optgroup label="' + group + '">' + list.map(([k, label]) => option(k, label, k === b.type)).join('') + '</optgroup>').join('') +
      '</select>';
    if (t.hasValue) ctl += '<input type="text" data-f="value" value="' + esc(b.value || '') + '" placeholder="' + esc(t.placeholder) + '" spellcheck="false" aria-label="Text">';
    if (t.hasCase) ctl += fittedSelect('case', 'Letter case', CASE_CHOICES, b.case);
    if (t.qty) {
      ctl += fittedSelect('qmode', 'How many', QTY_CHOICES, b.q.mode);
      if (b.q.mode === 'exact') ctl += '<input type="number" data-f="n" min="1" max="999" value="' + esc(b.q.n) + '" aria-label="Count">';
      if (b.q.mode === 'range') ctl += '<input type="number" data-f="min" min="0" max="999" value="' + esc(b.q.min) + '" aria-label="At least"><span>to</span><input type="number" data-f="max" min="1" max="999" value="' + esc(b.q.max) + '" aria-label="At most">';
    }
    let sub = '';
    if (!t.anchor) sub += '<label class="check"><input type="checkbox" data-f="optional"' + (b.optional ? ' checked' : '') + '> optional</label>';
    if (b.sample && b.type !== 'text') sub += '<button class="link" data-act="exact" title="Match this exact text instead of any ' + esc(t.label.toLowerCase()) + '">only “' + esc(C.clip(b.sample, 18)) + '”</button>';
    return '<li class="blk" data-id="' + b.id + '"><span class="blk-n" title="Use $n in the replacement to reuse this piece"></span>' +
      '<div class="blk-body"><div class="blk-ctl">' + ctl + '</div><div class="blk-sub">' + sub +
      '<span class="blk-tools">' +
      '<button data-act="up" title="Move up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button data-act="down" title="Move down" aria-label="Move down"' + (i === count - 1 ? ' disabled' : '') + '>↓</button>' +
      '<button data-act="del" title="Remove" aria-label="Remove">✕</button></span></div></div></li>';
  }

  function renderBuilder() {
    const blocks = state.builder.blocks;
    $('blocks').innerHTML = blocks.length
      ? blocks.map((b, i) => blockHtml(b, i, blocks.length)).join('')
      : '<li class="blk-empty">No pieces yet. Type an example above, or add pieces below in the order they appear.</li>';
    $('bIgnoreCase').checked = state.builder.ignoreCase;
    $('bWholeWord').checked = state.builder.wholeWord;
    renderBuilderPreview();
  }

  // The parts that change without rebuilding the block list (so inputs keep focus while typing)
  function renderBuilderPreview() {
    const b = state.builder;
    const re = C.toRegex(b.blocks, b);
    $('blocks').querySelectorAll('.blk').forEach((li) => {
      li.querySelector('.blk-n').textContent = (re && re.groupOf[li.dataset.id]) || '–';
    });
    $('bPreview').hidden = !re;
    if (!re) return;
    $('bReads').textContent = C.describe(b.blocks);
    $('bRegex').textContent = re.source;
    updateBuilderCount();
  }

  function updateBuilderCount() {
    const el = $('bCount');
    const active = !!state.pattern && state.pattern.origin === 'builder';
    const n = state.matches.length;
    el.classList.toggle('none', active && !!ta.value && !n);
    if (!active) el.innerHTML = '<button class="link" id="bApply">Find this pattern in the text</button>';
    else el.textContent = !ta.value ? 'Paste some text to try it on.' : n ? plural(n, 'match', 'matches') + (state.truncated ? '+' : '') + ' in your text' : 'No matches in your text yet';
  }

  // Make the builder's pattern the active search
  function applyBuilder(anchor) {
    const b = state.builder;
    const p = blocksPattern(b.blocks, b, { id: 'builder', origin: 'builder', icon: '✎', label: 'Custom: ' + C.describe(b.blocks) });
    if (p) setPattern(p, anchor);
    else if (state.pattern && state.pattern.origin === 'builder') clearPattern(false);
    renderBuilderPreview();
  }

  function loadBuilder(blocks, opts) {
    state.builder = { blocks: cloneBlocks(blocks), ignoreCase: !!(opts && opts.ignoreCase), wholeWord: !!(opts && opts.wholeWord) };
    switchTab('builder');
    renderBuilder();
    applyBuilder();
  }

  function buildFromExample(example) {
    const blocks = C.fromExample(example);
    if (!blocks.length) return toast('Type an example first, e.g. INV-2024-0012');
    state.builder.blocks = blocks;
    renderBuilder();
    applyBuilder();
  }

  // A control inside a block changed. `structural` means the row's layout depends on the new value.
  function onBlockField(el, structural) {
    const li = el.closest('.blk');
    const blocks = state.builder.blocks;
    const i = li ? blocks.findIndex((b) => b.id === li.dataset.id) : -1;
    if (i === -1) return;
    const b = blocks[i], field = el.dataset.f;
    if (field === 'type') {
      const t = C.BLOCK_TYPES[el.value];
      const carry = { id: b.id };
      if (t.hasValue) carry.value = b.value || b.sample || '';
      if (!t.anchor) carry.optional = b.optional;
      blocks[i] = C.newBlock(el.value, carry);
    } else if (field === 'qmode') b.q.mode = el.value;
    else if (field === 'n' || field === 'min' || field === 'max') b.q[field] = el.value;
    else if (field === 'optional') b.optional = el.checked;
    else b[field] = el.value;
    if (structural) {
      renderBuilder();
      const again = $('blocks').querySelector('[data-id="' + b.id + '"] [data-f="' + field + '"]');
      if (again) again.focus();
    }
    applyBuilder();
  }

  function onBlockAction(btn) {
    const li = btn.closest('.blk');
    const blocks = state.builder.blocks;
    const i = li ? blocks.findIndex((b) => b.id === li.dataset.id) : -1;
    if (i === -1) return;
    const act = btn.dataset.act, b = blocks[i];
    if (act === 'del') blocks.splice(i, 1);
    else if (act === 'up' && i > 0) blocks.splice(i - 1, 2, b, blocks[i - 1]);
    else if (act === 'down' && i < blocks.length - 1) blocks.splice(i, 2, blocks[i + 1], b);
    else if (act === 'exact') blocks[i] = C.newBlock('text', { id: b.id, value: b.sample, optional: b.optional });
    renderBuilder();
    applyBuilder();
  }

  function saveBuilderPattern() {
    const b = state.builder;
    if (!C.toRegex(b.blocks, b)) return;
    const label = $('bName').value.trim() || C.clip(C.describe(b.blocks), 40);
    state.saved.push({ id: Date.now().toString(36), label, blocks: JSON.parse(JSON.stringify(b.blocks)), ignoreCase: b.ignoreCase, wholeWord: b.wholeWord });
    store('fpr.saved', JSON.stringify(state.saved));
    $('bName').value = '';
    renderPatterns();
    renderExtras();
    toast('Saved “' + label + '” — find it at the top of the Patterns tab');
  }

  /* ---------- sidebar: results list ---------- */

  const previewing = () => !templateMode() || replaceInput.value !== '';
  const visible = (s) => s.replace(/\n/g, '↵').replace(/\t/g, '→');
  const shown = (s) => esc(visible(C.clip(s, 80)));

  // One match as it will look after replacing: <del>what goes</del> <ins>what comes</ins>.
  // `out` is what the filler writes; null or an unchanged match shows as it is.
  // Returns [before the line, in place of the match, after the line]: a new line shows where it will go.
  function previewParts(mode, matched, out) {
    const keep = '<mark>' + shown(matched) + '</mark>';
    if (out === null || (addMode() ? out === '' : out === matched)) return ['', keep + '<span class="res-note">stays as it is</span>', ''];
    if (mode === 'after') return ['', keep + '<ins>' + shown(out) + '</ins>', ''];
    if (mode === 'before') return ['', '<ins>' + shown(out) + '</ins>' + keep, ''];
    if (mode === 'below') return ['', keep, '<ins>' + shown('\n' + out) + '</ins>'];
    if (mode === 'above') return ['<ins>' + shown(out + '\n') + '</ins>', keep, ''];
    return ['', '<del>' + shown(matched) + '</del><ins>' + shown(out) + '</ins>', ''];
  }

  // The start of a results row: line number, then `first`, then the text leading up to `offset` on its line
  function rowLead(text, starts, offset, first) {
    const li = C.lineIndex(starts, offset);
    const from = Math.max(starts[li], offset - 28);
    return '<span class="res-ln">' + (li + 1) + '</span><span class="res-txt">' + (first || '') + (from > starts[li] ? '…' : '') + esc(text.slice(from, offset));
  }

  // The rest of the line after `offset`, cut short (nothing when the piece took the line break with it), then `last`
  function rowTail(text, offset, last) {
    if (offset > 0 && text[offset - 1] === '\n') return (last || '') + '</span>';
    let lineEnd = text.indexOf('\n', offset);
    if (lineEnd === -1) lineEnd = text.length;
    return esc(text.slice(offset, Math.min(lineEnd, offset + 36))) + (offset + 36 < lineEnd ? '…' : '') + (last || '') + '</span>';
  }

  function renderResults() {
    if (state.tab !== 'results') return;
    const ms = state.matches, cs = state.changes, box = $('results');
    $('resTools').hidden = !ms.length;
    if (!ms.length && !cs.length) {
      box.innerHTML = '<p class="hint">' + (currentQuery() ? 'No matches to list.' : 'Search for something, or pick a pattern, and every match is listed here with its line number. Click one to jump to it.') + '</p>';
      return;
    }
    const text = ta.value, starts = lines();
    let html = '';

    // after a replace: what it changed, newest state of the text
    if (cs.length) {
      const shownChanges = Math.min(cs.length, RESULT_ROWS);
      html += '<h3 class="res-h">What changed · ' + num(cs.length) + '</h3>';
      for (let j = 0; j < shownChanges; j++) {
        const c = cs[j];
        html += '<div class="res' + (j === state.changeAt ? ' on' : '') + '" data-c="' + j + '"><span class="res-check"></span><button class="res-go">' +
          rowLead(text, starts, c.start) + (c.end > c.start ? '<ins>' + shown(text.slice(c.start, c.end)) + '</ins>' : '<del>removed here</del>') +
          rowTail(text, c.end) + '</button></div>';
      }
      if (cs.length > shownChanges) html += '<p class="hint">Showing the first ' + num(shownChanges) + ' of ' + num(cs.length) + ' changes. The ↑ ↓ buttons above the text step through all of them.</p>';
      if (ms.length) html += '<h3 class="res-h">Matches now · ' + num(ms.length) + (state.truncated ? '+' : '') + '</h3>';
    }

    if (ms.length) {
      const fill = previewing() ? filler() : null;
      const mode = replaceMode.value;
      const rows = Math.min(ms.length, RESULT_ROWS);
      if (fill) html += '<p class="hint res-legend">Preview: ' + (addMode() ? '' : '<del>old</del> ') + '<ins>' + (addMode() ? 'added' : 'new') + '</ins> — nothing changes until you press Replace.</p>';
      for (let i = 0; i < rows; i++) {
        const m = ms[i];
        const li = C.lineIndex(starts, m.start);
        const matched = text.slice(m.start, m.end);
        // the tick decides whether Replace touches this match; an unticked one shows no preview
        const [first, middle, last] = fill && !m.skip ? previewParts(mode, matched, fill(m, matched)) : ['', '<mark>' + shown(matched) + '</mark>', ''];
        html += '<div class="res' + (i === state.current ? ' cur' : '') + (m.skip ? ' skip' : '') + '" data-i="' + i + '">' +
          '<label class="res-check" title="Untick to leave this match out of Replace"><input type="checkbox" data-pick' + (m.skip ? '' : ' checked') + ' aria-label="Replace the match on line ' + (li + 1) + '"></label>' +
          '<button class="res-go">' + rowLead(text, starts, m.start, first) + middle + rowTail(text, m.end, last) + '</button></div>';
      }
      if (ms.length > rows) html += '<p class="hint">Showing the first ' + num(rows) + ' of ' + num(ms.length) + (state.truncated ? '+' : '') + '. Next / Prev still walks through all of them — right-click a match in the editor to exclude one that is not listed.</p>';
    }
    box.innerHTML = html;

    const out = state.excluded.length;
    $('resPickText').textContent = out
      ? num(out) + ' excluded · Replace all will change the other ' + num(ms.length - out) + (state.truncated ? '+' : '')
      : 'Untick a match to leave it out of Replace.';
    $('btnPickAll').disabled = !out;
    $('btnPickNone').disabled = out === ms.length;
  }

  function copyMatches(unique) {
    const text = ta.value;
    let list = state.matches.map((m) => text.slice(m.start, m.end).replace(/\n$/, ''));
    if (unique) list = [...new Set(list)];
    copyText(list.join('\n'), 'Copied ' + plural(list.length, 'match', 'matches') + ', one per line');
  }

  function switchTab(name) {
    state.tab = name;
    document.querySelectorAll('.tab').forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', on);
    });
    for (const id of ['patterns', 'builder', 'results']) $('panel-' + id).hidden = id !== name;
    if (name === 'results') renderResults();
  }

  /* ---------- right-click menu on the editor ----------
     Right-click a word, a code or a selection to search for it or to turn it into a pattern.
     Blank space and Shift + right-click keep the browser's own menu, so Paste is always reachable. */

  const menu = $('ctx');
  let menuItems = [];   // actions of the open menu, indexed by data-run
  let menuTarget = null; // { range, target, caret, picked } the open menu is about

  // Text offset under a screen point, or -1. A textarea cannot be hit-tested per character, so for
  // a moment its mirror takes the pointer events and answers instead.
  function offsetFromPoint(x, y) {
    ta.style.pointerEvents = 'none';
    backdrop.style.pointerEvents = 'auto';
    backdrop.style.userSelect = 'text';
    let node = null, offset = 0;
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p) { node = p.offsetNode; offset = p.offset; }
    } else if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      if (r) { node = r.startContainer; offset = r.startOffset; }
    }
    ta.style.pointerEvents = backdrop.style.pointerEvents = backdrop.style.userSelect = '';
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    const lineEl = el && el.closest('.line');
    if (!lineEl || lineEl.parentNode !== backdrop) return -1;
    const before = document.createRange(); // everything on this line up to the hit point
    before.setStart(lineEl, 0);
    before.setEnd(node, offset);
    const starts = lines();
    const li = Array.prototype.indexOf.call(backdrop.children, lineEl);
    const lineLength = (li + 1 < starts.length ? starts[li + 1] - 1 : ta.value.length) - starts[li];
    return starts[li] + Math.min(before.toString().length, lineLength); // the mirror may end in a zero-width marker
  }

  // How many matches a query has right now, as text for a badge (respects "Search in")
  function countFor(query) {
    const compiled = C.compileQuery(query);
    if (compiled.error) return null;
    const found = C.findAll(ta.value, compiled, 100000);
    const cells = scopeCells();
    return num((cells ? C.filterByRanges(found.matches, cells) : found.matches).length) + (found.truncated ? '+' : '');
  }

  function buildMenuItems(info, types) {
    const items = [];
    const anchor = info.range.start;
    const hit = matchAt(info.caret); // right-clicked on a highlighted match: offer to leave it out of Replace
    if (hit !== -1) {
      const skipped = !!state.matches[hit].skip;
      items.push({
        icon: skipped ? '✓' : '⊘',
        title: skipped ? 'Include this match in Replace again' : 'Exclude this match from Replace',
        sub: skipped ? 'Replace will change it like the others' : 'Replace and Replace all will leave it as it is',
        run: () => setSkipped(hit, !skipped),
      });
    }
    for (const t of types) {
      items.push({
        icon: t.icon, title: 'Find all: ' + t.label, count: countFor({ kind: 'pattern', source: t.source, flags: t.flags }),
        run: () => setPattern({ id: t.id, label: t.label, icon: t.icon, source: t.source, flags: t.flags }, anchor),
      });
    }
    items.push({
      icon: 'ab', title: 'Find this exact text', count: countFor({ kind: 'text', text: info.target, matchCase: state.opts.matchCase, wholeWord: false }),
      run: () => {
        state.pattern = null;
        state.opts.regex = state.opts.wholeWord = false;
        findInput.value = info.target;
        syncFindField();
        markActivePattern();
        search(anchor);
      },
    });
    // two readings of the same example: any text of this shape, or these words with other numbers
    const shape = C.fromExample(info.target);
    const variants = [{ title: 'Create pattern: same shape', blocks: shape }];
    if (shape.some((b) => b.type === 'letters' && b.sample)) variants.push({ title: 'Create pattern: same words, any numbers', blocks: C.fixLetters(shape) });
    for (const v of variants) {
      const re = v.blocks.some((b) => b.type !== 'text') && C.toRegex(v.blocks, {});
      if (!re) continue; // nothing in it can vary: that is just "this exact text"
      items.push({
        icon: '✎', title: v.title, sub: C.describe(v.blocks), count: countFor({ kind: 'pattern', source: re.source, flags: re.flags }),
        run: () => {
          state.builder = { blocks: v.blocks, ignoreCase: false, wholeWord: false };
          $('bExample').value = info.target;
          switchTab('builder');
          renderBuilder();
          applyBuilder(anchor);
        },
      });
    }
    return items;
  }

  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    menuItems = [];
    menuTarget = null;
  }

  function openMenu(e) {
    closeMenu();
    if (e.shiftKey) return;
    const text = ta.value;
    if (!text) return;
    const byMouse = e.button === 2;
    const start = ta.selectionStart, end = ta.selectionEnd;
    let at = byMouse ? offsetFromPoint(e.clientX, e.clientY) : start;
    if (at === -1) at = start; // no hit-test available: trust where the browser put the caret
    const tableCtx = { commaDelim: !!state.table && state.table.delim === ',' };
    let range, types, picked = false;
    if (end > start && at >= start && at <= end) {
      const raw = text.slice(start, end), body = raw.trim();
      const lead = raw.length - raw.trimStart().length;
      range = { start: start + lead, end: start + lead + body.length };
      if (!body || body.includes('\n')) return;
      types = C.identify(text, range.start, range.end, tableCtx);
    } else {
      if (byMouse) { // a click in the empty space beside or below the text is not "on" the nearest word
        const r = offsetRect(at);
        if (!r || Math.abs(e.clientX - r.left) > 12 || e.clientY < r.top - 3 || e.clientY > r.bottom + 3) return;
      }
      types = C.identify(text, at, at, tableCtx);
      range = types.length ? { start: types[0].start, end: types[0].end } : C.tokenAt(text, at);
      if (!range) return;
      picked = true;
    }
    if (range.end - range.start > 200) return;
    e.preventDefault();

    const target = text.slice(range.start, range.end);
    if (picked) ta.setSelectionRange(range.start, range.end); // show what the menu is about
    menuTarget = { range, target, caret: at, picked };
    menuItems = buildMenuItems(menuTarget, types.slice(0, 2));

    let html = '<div class="ctx-head">“' + esc(C.clip(target, 48)) + '”</div>';
    menuItems.forEach((it, i) => {
      html += '<button class="ctx-item" role="menuitem" data-run="' + i + '"><span class="ico">' + esc(it.icon) + '</span>' +
        '<span class="ctx-main"><span class="ctx-title">' + esc(it.title) + '</span>' + (it.sub ? '<span class="ctx-sub">' + esc(it.sub) + '</span>' : '') + '</span>' +
        (it.count == null ? '' : '<span class="badge">' + it.count + '</span>') + '</button>';
    });
    html += '<div class="ctx-sep"></div><div class="ctx-row">' +
      [['cut', 'Cut'], ['copy', 'Copy'], ['paste', 'Paste'], ['all', 'Select all']].map(([cmd, label]) => '<button class="ctx-item" role="menuitem" data-cmd="' + cmd + '">' + label + '</button>').join('') +
      '</div><div class="ctx-foot">Shift + right-click opens the browser’s own menu</div>';
    menu.innerHTML = html;
    menu.hidden = false;

    // open at the pointer (or under the caret for the keyboard), flipped to stay on screen
    let x = e.clientX, y = e.clientY;
    if (!byMouse) {
      const r = offsetRect(caretOffset());
      if (r) { x = r.left; y = r.bottom; }
    }
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - w - 8)) + 'px';
    menu.style.top = Math.max(8, y + h + 8 > window.innerHeight ? y - h : y) + 'px';
    if (!byMouse) menu.querySelector('button').focus();
  }

  function editCommand(cmd, info) {
    ta.focus({ preventScroll: true });
    if (cmd === 'all') { ta.select(); return; }
    if (cmd === 'copy' || cmd === 'cut') {
      // a cut made through execCommand changes the text without a beforeinput event, so save the undo step here
      const depth = history.undo.length;
      if (cmd === 'cut') checkpoint();
      if (document.execCommand(cmd)) return;
      if (history.undo.length > depth) { history.undo.pop(); updateHistoryButtons(); }
      toast('Press Ctrl+' + (cmd === 'copy' ? 'C' : 'X') + ' instead — the browser did not allow it from this menu.');
      return;
    }
    const useKeys = () => toast('Press Ctrl+V to paste — the browser did not allow it from this menu.');
    if (!navigator.clipboard || !navigator.clipboard.readText) { useKeys(); return; }
    // a word we selected ourselves on right-click must not be overwritten: paste at the click point
    const from = info.picked ? info.caret : ta.selectionStart, to = info.picked ? info.caret : ta.selectionEnd;
    navigator.clipboard.readText().then((clip) => {
      if (!clip) { toast('There is no text on the clipboard.'); return; }
      checkpoint();
      ta.setRangeText(clip.replace(/\r\n?/g, '\n'), from, to, 'end');
      afterTextChange(true, true);
      revealCaret();
    }, useKeys);
  }

  ta.addEventListener('contextmenu', openMenu);
  menu.addEventListener('contextmenu', (e) => e.preventDefault());
  menu.addEventListener('mousedown', (e) => e.preventDefault()); // keep the editor focused, selection visible
  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const item = menuItems[+btn.dataset.run], info = menuTarget;
    closeMenu();
    if (btn.dataset.cmd) editCommand(btn.dataset.cmd, info);
    else if (item) { item.run(); ta.focus({ preventScroll: true }); }
  });
  document.addEventListener('mousedown', (e) => { if (!menu.contains(e.target)) closeMenu(); }, true);
  document.addEventListener('wheel', closeMenu, { passive: true });
  window.addEventListener('blur', closeMenu);
  window.addEventListener('resize', closeMenu);
  // capture phase, so the keys steer the menu before the editor or the page shortcuts see them
  document.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    const buttons = [...menu.querySelectorAll('button')];
    const i = buttons.indexOf(document.activeElement);
    if (e.key === 'Escape') { closeMenu(); ta.focus({ preventScroll: true }); }
    else if (e.key === 'ArrowDown') buttons[(i + 1) % buttons.length].focus();
    else if (e.key === 'ArrowUp') buttons[(Math.max(i, 0) - 1 + buttons.length) % buttons.length].focus();
    else { if (i === -1) closeMenu(); return; } // typing elsewhere dismisses it; Enter / Tab inside work as usual
    e.preventDefault();
    e.stopPropagation();
  }, true);

  /* ---------- files ---------- */

  function openFile(file) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast('That file is over 20 MB — too big to edit in a browser tab.');
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result).replace(/\r\n?/g, '\n'), file.name);
      toast('Opened ' + file.name);
    };
    reader.onerror = () => toast('Could not read that file.');
    reader.readAsText(file);
  }

  function download() {
    if (!ta.value) return toast('Nothing to download yet.');
    const fallback = state.table ? (state.table.delim === ',' ? 'data.csv' : state.table.delim === '\t' ? 'data.tsv' : 'table.txt') : 'text.txt';
    const name = state.fileName ? state.fileName.replace(/(\.[^.]*)?$/, (ext) => '-edited' + (ext || '.txt')) : fallback;
    const url = URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Saved as ' + name);
  }

  /* ---------- events: editor ---------- */

  let editTimer = 0;
  ta.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); return; }
    if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); return; }
    // a burst of typing is one undo step; paste, cut and drop always start a new one
    if (!history.typing || /^(insertFrom|deleteBy)/.test(e.inputType)) checkpoint();
    history.typing = true;
    clearTimeout(history.timer);
    history.timer = setTimeout(() => { history.typing = false; }, 1000);
  });

  ta.addEventListener('input', (e) => {
    state.ver++;
    $('empty').hidden = ta.value !== '';
    const pasted = /^insertFrom/.test(e.inputType || '');
    const update = () => {
      runFind(true);
      render();
      if (document.activeElement === ta) revealCaret();
      showPosition(caretOffset());
    };
    clearTimeout(editTimer);
    if (ta.value.length > BIG_TEXT && !pasted) editTimer = setTimeout(update, 160); else update();
    scheduleAnalysis(pasted ? 0 : 450);
  });

  const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);
  ta.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
    if (mod && !e.altKey && key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && !e.altKey && key === 'y') { e.preventDefault(); redo(); }
    else if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); pageMove(e.key === 'PageDown' ? 1 : -1, e.shiftKey); }
    else if (NAV_KEYS.has(e.key)) requestAnimationFrame(() => { revealCaret(); caretMoved(); });
  });
  ta.addEventListener('mouseup', () => requestAnimationFrame(caretMoved));
  ta.addEventListener('scroll', () => { ta.scrollTop = ta.scrollLeft = 0; });

  editor.addEventListener('dragover', (e) => {
    if (![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    editor.classList.add('drag');
  });
  editor.addEventListener('dragleave', (e) => { if (!editor.contains(e.relatedTarget)) editor.classList.remove('drag'); });
  editor.addEventListener('drop', (e) => {
    editor.classList.remove('drag');
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    openFile(e.dataTransfer.files[0]);
  });

  /* ---------- events: find & replace bar ---------- */

  findInput.addEventListener('input', searchSoon);
  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
  });
  // The replacement changed: refresh what depends on it (linked-pattern options, the preview)
  function replacementChanged() {
    renderExtras();
    renderResults();
  }
  replaceInput.addEventListener('input', replacementChanged);
  replaceInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) replaceAll(); else replaceOne();
  });
  const REPLACE_HINTS = {
    text: 'New text (leave empty to delete matches)',
    after: 'Text to add after each match — the match stays',
    before: 'Text to add before each match — the match stays',
    below: 'Text for a new line under each match’s line',
    above: 'Text for a new line over each match’s line',
  };
  function replaceModeChanged() {
    replaceInput.disabled = !templateMode();
    replaceInput.placeholder = REPLACE_HINTS[replaceMode.value] || 'Nothing to type for this option';
    $('replaceField').classList.toggle('off', !templateMode());
    replacementChanged();
  }
  replaceMode.addEventListener('change', replaceModeChanged);

  for (const [id, key] of [['optCase', 'matchCase'], ['optWord', 'wholeWord'], ['optRegex', 'regex']]) {
    $(id).addEventListener('click', () => {
      state.opts[key] = !state.opts[key];
      syncFindField();
      search();
      findInput.focus(); // so Enter keeps stepping through matches
    });
  }

  $('btnNext').addEventListener('click', () => step(1));
  $('btnPrev').addEventListener('click', () => step(-1));
  $('btnReplace').addEventListener('click', replaceOne);
  $('btnReplaceAll').addEventListener('click', replaceAll);
  $('pillClear').addEventListener('click', () => clearPattern(true));
  $('pillRegex').addEventListener('click', () => {
    const p = state.pattern;
    state.opts = { regex: true, matchCase: !p.flags.includes('i'), wholeWord: false };
    findInput.value = p.source;
    clearPattern(true);
  });
  scopeSelect.addEventListener('change', () => { state.scope = scopeSelect.value; search(); });

  // Put a token into the Replace box where its caret is
  function insertIntoReplace(token) {
    const from = replaceInput.selectionStart == null ? replaceInput.value.length : replaceInput.selectionStart;
    const to = replaceInput.selectionEnd == null ? from : replaceInput.selectionEnd;
    replaceInput.setRangeText(token, from, to, 'end');
    replaceInput.focus();
    replacementChanged();
  }
  $('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-ins]');
    if (chip) insertIntoReplace(chip.dataset.ins);
  });
  $('chips').addEventListener('change', (e) => {
    if (e.target.id !== 'linkPick') return;
    const link = state.linkList[+e.target.value];
    e.target.value = ''; // back to "+ another pattern…" so it can be used again
    if (!link) return;
    state.links[link.name] = { source: link.source, flags: link.flags };
    insertIntoReplace('{' + link.name + '}');
  });
  $('linkScope').addEventListener('change', (e) => { state.linkScope = e.target.value; renderResults(); });

  /* ---------- events: top bar ---------- */

  $('btnOpen').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', (e) => { openFile(e.target.files[0]); e.target.value = ''; });
  $('btnCopy').addEventListener('click', () => (ta.value ? copyText(ta.value, 'Text copied') : toast('Nothing to copy yet.')));
  $('btnDownload').addEventListener('click', download);
  $('btnUndo').addEventListener('click', undo);
  $('btnRedo').addEventListener('click', redo);
  $('btnWrap').addEventListener('click', () => {
    const wrap = editor.classList.toggle('nowrap') === false;
    $('btnWrap').setAttribute('aria-pressed', wrap);
    store('fpr.wrap', wrap ? '1' : '0');
    if (state.current >= 0) gotoMatch(state.current);
  });
  $('btnClear').addEventListener('click', () => {
    if (!ta.value) return;
    setText('');
    toast('Text cleared', { label: 'Undo', run: undo });
  });
  $('btnTheme').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store('fpr.theme', root.dataset.theme);
  });

  /* ---------- events: sidebar ---------- */

  document.querySelector('.tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) switchTab(tab.dataset.tab);
  });

  $('panel-patterns').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]'), pat = e.target.closest('.pat');
    const opToggle = e.target.closest('[data-op]'), opDo = e.target.closest('[data-opdo]');
    if (opDo) {
      if (opDo.dataset.opdo === 'close') { state.op = null; renderPatterns(); } else runOp(opDo.dataset.opdo === 'apply');
    } else if (opToggle) {
      const id = opToggle.dataset.op;
      state.op = state.op && state.op.id === id ? null : { id, action: 'after', other: '', scope: linkScope() };
      renderPatterns();
      const panel = $('panel-patterns').querySelector('.pat-op');
      if (panel) panel.scrollIntoView({ block: 'nearest' });
    } else if (edit) {
      const it = registry.get(edit.dataset.edit);
      if (it) loadBuilder(it.blocks, it);
    } else if (del) {
      const id = del.dataset.del.replace(/^saved:/, '');
      state.saved = state.saved.filter((s) => s.id !== id);
      store('fpr.saved', JSON.stringify(state.saved));
      if (state.pattern && state.pattern.id === del.dataset.del) clearPattern(false);
      renderPatterns();
      renderExtras();
    } else if (pat) {
      const it = registry.get(pat.dataset.id);
      if (!it) return;
      if (state.pattern && state.pattern.id === it.id) clearPattern(false); // click again to switch it off
      else setPattern(patternFromItem(it));
    }
  });

  $('panel-patterns').addEventListener('change', (e) => {
    const field = e.target.dataset.opf, op = state.op, it = op && registry.get(op.id);
    if (!field || !it) return;
    if (field === 'other') op.other = (opOthers(it)[+e.target.value] || {}).name || '';
    else op[field] = e.target.value;
    renderPatterns(); // the example and the counts depend on every choice
    const again = $('panel-patterns').querySelector('[data-opf="' + field + '"]');
    if (again) again.focus();
  });

  document.addEventListener('click', (e) => {
    const sample = e.target.closest('[data-sample]');
    if (sample) setText(window.FPR_SAMPLES[sample.dataset.sample]);
  });

  $('bFromExample').addEventListener('click', () => buildFromExample($('bExample').value));
  $('bExample').addEventListener('keydown', (e) => { if (e.key === 'Enter') buildFromExample($('bExample').value); });
  $('bFromSelection').addEventListener('click', () => {
    const selected = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    if (!selected.trim()) return toast('Select an example in the editor first, then click this.');
    $('bExample').value = selected.split('\n')[0].trim();
    buildFromExample(selected);
  });
  $('bAdd').innerHTML = Object.entries(C.BLOCK_TYPES).map(([key, t]) => '<button class="chip" data-add="' + key + '">' + esc(t.label.replace('…', '')) + '</button>').join('');
  $('bAdd').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-add]');
    if (!chip) return;
    const block = C.newBlock(chip.dataset.add);
    state.builder.blocks.push(block);
    renderBuilder();
    applyBuilder();
    const first = $('blocks').querySelector('[data-id="' + block.id + '"] input[type="text"]');
    if (first) first.focus();
  });
  $('blocks').addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') onBlockField(e.target, true); });
  $('blocks').addEventListener('input', (e) => { if (e.target.tagName === 'INPUT') onBlockField(e.target, false); });
  $('blocks').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (btn) onBlockAction(btn);
  });
  $('bIgnoreCase').addEventListener('change', (e) => { state.builder.ignoreCase = e.target.checked; applyBuilder(); });
  $('bWholeWord').addEventListener('change', (e) => { state.builder.wholeWord = e.target.checked; applyBuilder(); });
  $('bCount').addEventListener('click', (e) => { if (e.target.id === 'bApply') applyBuilder(); });
  $('bSave').addEventListener('click', saveBuilderPattern);
  $('bName').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveBuilderPattern(); });
  $('bClear').addEventListener('click', () => { state.builder.blocks = []; renderBuilder(); applyBuilder(); });

  $('results').addEventListener('click', (e) => {
    if (e.target.closest('label.res-check')) return; // the tick box only decides about Replace
    const row = e.target.closest('.res');
    if (!row) return;
    if (row.dataset.c !== undefined) gotoChange(+row.dataset.c); else gotoMatch(+row.dataset.i);
  });
  $('chgNext').addEventListener('click', () => stepChange(1));
  $('chgPrev').addEventListener('click', () => stepChange(-1));
  $('chgHide').addEventListener('click', clearChanges);
  $('results').addEventListener('change', (e) => {
    if (!e.target.matches('[data-pick]')) return;
    const i = +e.target.closest('.res').dataset.i;
    setSkipped(i, !e.target.checked);
    const again = $('results').querySelector('.res[data-i="' + i + '"] [data-pick]'); // the list was redrawn
    if (again) again.focus();
  });
  $('btnPickAll').addEventListener('click', () => setAllSkipped(false));
  $('btnPickNone').addEventListener('click', () => setAllSkipped(true));
  $('btnCopyMatches').addEventListener('click', () => copyMatches(false));
  $('btnCopyUnique').addEventListener('click', () => copyMatches(true));

  /* ---------- keyboard shortcuts ---------- */

  document.addEventListener('keydown', (e) => {
    const mod = (e.ctrlKey || e.metaKey) && !e.altKey, key = e.key.toLowerCase();
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (mod && key === 'f') {
      e.preventDefault();
      const selected = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      const usable = document.activeElement === ta && selected && selected.length <= 200 && !selected.includes('\n');
      if (state.pattern) clearPattern(false);
      if (usable) { findInput.value = selected; search(); }
      findInput.focus();
      findInput.select();
    } else if (mod && key === 'h') {
      e.preventDefault();
      replaceInput.focus();
      replaceInput.select();
    } else if (e.key === 'F3') {
      e.preventDefault();
      step(e.shiftKey ? -1 : 1);
    } else if (mod && key === 'z' && !typing) {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (mod && key === 'y' && !typing) {
      e.preventDefault();
      redo();
    } else if (e.key === 'Escape' && state.pattern && (!typing || e.target === findInput || e.target === replaceInput)) {
      clearPattern(true);
    }
  });

  /* ---------- start ---------- */

  try {
    // saved data may come from an older version or be hand-edited: keep only entries the builder understands
    state.saved = JSON.parse(localStorage.getItem('fpr.saved') || '[]')
      .filter((s) => s && s.id && Array.isArray(s.blocks) && s.blocks.every((b) => b && C.BLOCK_TYPES[b.type]))
      .map((s) => Object.assign(s, { label: String(s.label || 'Saved pattern'), blocks: cloneBlocks(s.blocks) }));
  } catch (e) { state.saved = []; }
  try {
    if (localStorage.getItem('fpr.wrap') === '0') { editor.classList.add('nowrap'); $('btnWrap').setAttribute('aria-pressed', 'false'); }
  } catch (e) { /* keep the default */ }

  syncFindField();
  renderScope();
  renderBuilder();
  renderPatterns();
  render();
  updateFindUi();
  updateHistoryButtons();

  const sample = new URLSearchParams(location.search).get('sample');
  if (sample && window.FPR_SAMPLES[sample]) setText(window.FPR_SAMPLES[sample]); // e.g. index.html?sample=csv
})();
