/**
 * Main Application Logic for Markdown Notes App
 * Handles UI state, live split-preview, debounced auto-save, mobile navigation,
 * tag filtering, interactive task list sync, toolbar actions, and shortcuts.
 */
(function () {
  'use strict';

  // Application State
  const state = {
    notes: [],
    activeNote: null,
    currentFilterTag: 'ALL',
    searchQuery: '',
    mobileViewMode: 'edit', // 'edit' or 'preview'
    zenMode: false,
    theme: 'dark',
    saveDebounceTimer: null,
    editorSettings: {
      fontSize: 15
    }
  };

  // DOM Element Selectors Cache
  const el = {
    app: document.getElementById('app'),
    sidebar: document.getElementById('sidebar'),
    notesList: document.getElementById('notes-list'),
    notesCounter: document.getElementById('notes-counter'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    tagFilterBar: document.getElementById('tag-filter-bar'),
    tagCountAll: document.getElementById('tag-count-all'),
    btnNewNote: document.getElementById('btn-new-note'),
    mobileFabNew: document.getElementById('mobile-fab-new'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    btnOpenShortcuts: document.getElementById('btn-open-shortcuts'),
    btnOpenExport: document.getElementById('btn-open-export'),

    // Workspace & Editor
    workspace: document.getElementById('workspace'),
    btnBackMobile: document.getElementById('btn-back-mobile'),
    noteTitleInput: document.getElementById('note-title-input'),
    btnSegEdit: document.getElementById('btn-seg-edit'),
    btnSegPreview: document.getElementById('btn-seg-preview'),
    splitViewContainer: document.getElementById('split-view-container'),
    editorPane: document.getElementById('editor-pane'),
    previewPane: document.getElementById('preview-pane'),
    markdownEditor: document.getElementById('markdown-editor'),
    previewContent: document.getElementById('preview-content'),

    // Toolbar & Tags
    markdownToolbar: document.getElementById('markdown-toolbar'),
    noteTagsChips: document.getElementById('note-tags-chips'),
    addTagForm: document.getElementById('add-tag-form'),
    addTagInput: document.getElementById('add-tag-input'),

    // Actions & Badges
    saveStatusBadge: document.getElementById('save-status-badge'),
    saveStatusText: document.getElementById('save-status-text'),
    statusDot: document.getElementById('status-dot'),
    btnTogglePin: document.getElementById('btn-toggle-pin'),
    btnToggleZen: document.getElementById('btn-toggle-zen'),
    btnExitZen: document.getElementById('btn-exit-zen'),
    btnDownloadMd: document.getElementById('btn-download-md'),
    btnDeleteNote: document.getElementById('btn-delete-note'),

    // Stats & Modals
    statWords: document.getElementById('stat-words'),
    statChars: document.getElementById('stat-chars'),
    statReadTime: document.getElementById('stat-read-time'),
    noteLastEdited: document.getElementById('note-last-edited'),
    toastContainer: document.getElementById('toast-container'),

    // Export Modal Buttons
    btnExportActiveMd: document.getElementById('btn-export-active-md'),
    btnExportActiveHtml: document.getElementById('btn-export-active-html'),
    btnCopyRawMd: document.getElementById('btn-copy-raw-md'),
    btnBackupAllJson: document.getElementById('btn-backup-all-json'),
    importJsonInput: document.getElementById('import-json-input')
  };

  /**
   * Show non-intrusive toast notification
   */
  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    el.toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('visible'), 10);

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Initialize Application
   */
  function initApp() {
    // 1. Initialize Theme
    state.theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', state.theme);

    // 2. Load Notes from Storage
    state.notes = Storage.getAllNotes();

    // 3. Determine Active Note
    const storedActiveId = Storage.getActiveNoteId();
    if (storedActiveId) {
      state.activeNote = Storage.getNoteById(storedActiveId);
    }
    if (!state.activeNote && state.notes.length > 0) {
      state.activeNote = state.notes[0];
      Storage.setActiveNoteId(state.activeNote.id);
    }

    // 4. Render UI Components
    renderTagFilterBar();
    renderNotesList();
    loadActiveNoteIntoEditor();

    // 5. Setup Event Listeners
    setupEventListeners();
    setupKeyboardShortcuts();

    // Check responsive state on initial mobile load
    if (window.innerWidth < 768 && !state.activeNote) {
      document.body.classList.remove('mobile-view-editor');
    }
  }

  /**
   * Render Filter Tag Bar in Sidebar
   */
  function renderTagFilterBar() {
    const tagMap = Storage.getAllTagsWithCounts();
    const tags = Object.keys(tagMap).sort();

    // Update 'All Notes' counter
    el.tagCountAll.textContent = state.notes.length;

    // Remove old dynamic chips (keep ALL chip)
    const chips = el.tagFilterBar.querySelectorAll('.tag-chip:not([data-tag="ALL"])');
    chips.forEach(c => c.remove());

    tags.forEach(tag => {
      const chip = document.createElement('button');
      chip.className = `tag-chip ${state.currentFilterTag === tag ? 'active' : ''}`;
      chip.dataset.tag = tag;
      chip.innerHTML = `<span>#${tag}</span><span class="tag-count">${tagMap[tag]}</span>`;
      el.tagFilterBar.appendChild(chip);
    });

    // Highlight active chip
    const allChips = el.tagFilterBar.querySelectorAll('.tag-chip');
    allChips.forEach(chip => {
      if (chip.dataset.tag === state.currentFilterTag) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  /**
   * Filter and Sort Notes
   */
  function getFilteredNotes() {
    let result = [...state.notes];

    // Filter by Tag
    if (state.currentFilterTag && state.currentFilterTag !== 'ALL') {
      result = result.filter(n => {
        return Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase() === state.currentFilterTag.toLowerCase());
      });
    }

    // Filter by Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const contentMatch = (n.content || '').toLowerCase().includes(q);
        const tagsMatch = Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(q));
        return titleMatch || contentMatch || tagsMatch;
      });
    }

    // Sort: Pinned first, then by updatedAt descending
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    return result;
  }

  /**
   * Helper to format relative or short date
   */
  function formatDate(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /**
   * Strip markdown tokens to create clean text excerpt
   */
  function createExcerpt(markdown) {
    if (!markdown) return 'No additional text...';
    return markdown
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/(\*\*|__|\*|_|~~|==)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/>\s?/g, '')
      .replace(/[-*+]\s+\[[ xX]\]\s+/g, '')
      .replace(/[-*+]\s+/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 110) || 'Empty note content...';
  }

  /**
   * Render Notes List in Sidebar
   */
  function renderNotesList() {
    const filtered = getFilteredNotes();
    el.notesList.innerHTML = '';
    el.notesCounter.textContent = `${state.notes.length} ${state.notes.length === 1 ? 'note' : 'notes'}`;

    if (filtered.length === 0) {
      el.notesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>No notes found matching your search or tag filter.</p>
          <button class="btn-primary" id="btn-empty-create" style="margin-top:8px;">+ New Note</button>
        </div>
      `;
      const btnEmptyCreate = document.getElementById('btn-empty-create');
      if (btnEmptyCreate) {
        btnEmptyCreate.addEventListener('click', handleCreateNewNote);
      }
      return;
    }

    filtered.forEach(note => {
      const card = document.createElement('article');
      const isActive = state.activeNote && state.activeNote.id === note.id;
      card.className = `note-card ${isActive ? 'active' : ''}`;
      card.dataset.id = note.id;
      card.setAttribute('role', 'listitem');

      const excerpt = createExcerpt(note.content);
      const dateText = formatDate(note.updatedAt || note.createdAt);

      let tagsHtml = '';
      if (Array.isArray(note.tags) && note.tags.length > 0) {
        tagsHtml = note.tags.map(t => `<span class="note-card-tag">#${t}</span>`).join('');
      }

      card.innerHTML = `
        <div class="note-card-header">
          <h2 class="note-card-title">${MarkdownParser.escapeHtml(note.title || 'Untitled Note')}</h2>
          <button class="note-card-pin-btn ${note.pinned ? 'pinned' : ''}" title="${note.pinned ? 'Unpin note' : 'Pin note'}" data-action="pin" data-id="${note.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${note.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 2v10l3 3H9l3-3V2z"></path>
              <line x1="12" y1="15" x2="12" y2="22"></line>
            </svg>
          </button>
        </div>
        <p class="note-card-snippet">${MarkdownParser.escapeHtml(excerpt)}</p>
        <div class="note-card-footer">
          <span>${dateText}</span>
          <div class="note-card-tags">${tagsHtml}</div>
        </div>
      `;

      el.notesList.appendChild(card);
    });
  }

  /**
   * Load active note into editor and preview panes
   */
  function loadActiveNoteIntoEditor() {
    if (!state.activeNote) {
      el.noteTitleInput.value = '';
      el.markdownEditor.value = '';
      el.previewContent.innerHTML = '<p class="md-empty-preview">Select or create a note to begin writing.</p>';
      el.noteTagsChips.innerHTML = '';
      updateStats('', '');
      return;
    }

    el.noteTitleInput.value = state.activeNote.title || '';
    el.markdownEditor.value = state.activeNote.content || '';
    
    // Update Pin icon state
    if (state.activeNote.pinned) {
      el.btnTogglePin.classList.add('active');
      el.btnTogglePin.style.color = 'var(--accent-warning)';
    } else {
      el.btnTogglePin.classList.remove('active');
      el.btnTogglePin.style.color = '';
    }

    // Render Live Markdown Preview
    renderMarkdownPreview();

    // Render active note tag chips
    renderNoteTags();

    // Update word & char stats
    updateStats(state.activeNote.title, state.activeNote.content);

    // Update last edited timestamp in status bar
    el.noteLastEdited.textContent = `Edited ${formatDate(state.activeNote.updatedAt || Date.now())}`;
  }

  /**
   * Render Live Markdown Preview
   */
  function renderMarkdownPreview() {
    const rawMarkdown = el.markdownEditor.value;
    const html = MarkdownParser.parse(rawMarkdown);
    el.previewContent.innerHTML = html;

    // Attach listeners for code block copy buttons
    const copyButtons = el.previewContent.querySelectorAll('.code-copy-btn');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const targetId = this.dataset.target;
        const codeElement = document.getElementById(targetId);
        if (codeElement) {
          navigator.clipboard.writeText(codeElement.textContent).then(() => {
            this.classList.add('copied');
            this.innerHTML = '✓ Copied';
            setTimeout(() => {
              this.classList.remove('copied');
              this.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> <span>Copy</span>';
            }, 2000);
          });
        }
      });
    });

    // Attach interactive task list checkbox syncing
    const checkboxes = el.previewContent.querySelectorAll('.task-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', function () {
        const lineIdx = parseInt(this.dataset.line, 10);
        toggleTaskCheckboxInEditor(lineIdx, this.checked);
      });
    });
  }

  /**
   * Interactive checkbox toggling in Markdown text
   */
  function toggleTaskCheckboxInEditor(lineIndex, isChecked) {
    const text = el.markdownEditor.value;
    const lines = text.split('\n');

    if (lineIndex >= 0 && lineIndex < lines.length) {
      let line = lines[lineIndex];
      if (isChecked) {
        line = line.replace(/(\s*[-*+]\s+)\[ \]/, '$1[x]');
      } else {
        line = line.replace(/(\s*[-*+]\s+)\[[xX]\]/, '$1[ ]');
      }
      lines[lineIndex] = line;
      el.markdownEditor.value = lines.join('\n');

      // Trigger debounced auto-save & re-render
      triggerAutoSave();
    }
  }

  /**
   * Render Tags for Active Note
   */
  function renderNoteTags() {
    el.noteTagsChips.innerHTML = '';
    if (!state.activeNote || !Array.isArray(state.activeNote.tags)) return;

    state.activeNote.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'editable-tag-chip';
      chip.innerHTML = `
        <span>#${MarkdownParser.escapeHtml(tag)}</span>
        <button type="button" class="remove-tag-btn" data-tag="${MarkdownParser.escapeHtml(tag)}" title="Remove tag">&times;</button>
      `;
      el.noteTagsChips.appendChild(chip);
    });

    // Remove tag button listeners
    const removeButtons = el.noteTagsChips.querySelectorAll('.remove-tag-btn');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const tagToRemove = this.dataset.tag;
        removeTagFromActiveNote(tagToRemove);
      });
    });
  }

  /**
   * Add a new tag to the active note
   */
  function addTagToActiveNote(rawTag) {
    if (!state.activeNote || !rawTag) return;
    const cleanTag = rawTag.trim().toLowerCase().replace(/^[#]+/, '');
    if (!cleanTag) return;

    if (!Array.isArray(state.activeNote.tags)) {
      state.activeNote.tags = [];
    }

    if (!state.activeNote.tags.includes(cleanTag)) {
      state.activeNote.tags.push(cleanTag);
      Storage.updateNote(state.activeNote.id, { tags: state.activeNote.tags });
      renderNoteTags();
      renderTagFilterBar();
      renderNotesList();
      showToast(`Added tag #${cleanTag}`, 'success', 2000);
    }
    el.addTagInput.value = '';
  }

  /**
   * Remove a tag from the active note
   */
  function removeTagFromActiveNote(tag) {
    if (!state.activeNote || !Array.isArray(state.activeNote.tags)) return;
    state.activeNote.tags = state.activeNote.tags.filter(t => t !== tag);
    Storage.updateNote(state.activeNote.id, { tags: state.activeNote.tags });
    renderNoteTags();
    renderTagFilterBar();
    renderNotesList();
  }

  /**
   * Update Word, Character, and Reading Time Statistics
   */
  function updateStats(title, content) {
    const fullText = (title + ' ' + content).trim();
    const words = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
    const chars = fullText.length;
    const readMinutes = Math.max(1, Math.ceil(words / 200));

    el.statWords.textContent = words.toLocaleString();
    el.statChars.textContent = chars.toLocaleString();
    el.statReadTime.textContent = words > 0 ? `${readMinutes} min` : '0 min';
  }

  /**
   * Debounced Auto-Save
   */
  function triggerAutoSave() {
    if (!state.activeNote) return;

    // Show saving pulse indicator
    el.statusDot.classList.add('saving');
    el.saveStatusText.textContent = 'Saving...';

    clearTimeout(state.saveDebounceTimer);
    state.saveDebounceTimer = setTimeout(() => {
      saveActiveNoteData();
    }, 300);
  }

  /**
   * Save Active Note to LocalStorage immediately
   */
  function saveActiveNoteData() {
    if (!state.activeNote) return;

    const title = el.noteTitleInput.value.trim() || 'Untitled Note';
    const content = el.markdownEditor.value;

    const updated = Storage.updateNote(state.activeNote.id, {
      title: title,
      content: content,
      updatedAt: Date.now()
    });

    if (updated) {
      state.activeNote = updated;
      state.notes = Storage.getAllNotes();

      // Update UI Status
      el.statusDot.classList.remove('saving');
      el.saveStatusText.textContent = 'Saved';
      el.noteLastEdited.textContent = 'Edited just now';

      // Update preview and list snippet
      renderMarkdownPreview();
      updateStats(title, content);
      renderNotesList();
    }
  }

  /**
   * Switch Active Note
   */
  function setActiveNote(id) {
    if (state.activeNote && state.activeNote.id === id) return;

    // Save pending changes first
    saveActiveNoteData();

    const note = Storage.getNoteById(id);
    if (note) {
      state.activeNote = note;
      Storage.setActiveNoteId(id);
      renderNotesList();
      loadActiveNoteIntoEditor();

      // On mobile, switch to editor view screen
      if (window.innerWidth < 768) {
        document.body.classList.add('mobile-view-editor');
      }
    }
  }

  /**
   * Create New Note Handler
   */
  function handleCreateNewNote() {
    saveActiveNoteData();

    const newNote = Storage.createNote({
      title: 'Untitled Note',
      content: '',
      tags: state.currentFilterTag !== 'ALL' ? [state.currentFilterTag] : [],
      pinned: false
    });

    state.notes = Storage.getAllNotes();
    state.activeNote = newNote;

    renderTagFilterBar();
    renderNotesList();
    loadActiveNoteIntoEditor();

    // Switch view on mobile
    if (window.innerWidth < 768) {
      document.body.classList.add('mobile-view-editor');
    }

    // Focus on title input for fast typing
    setTimeout(() => {
      el.noteTitleInput.focus();
      el.noteTitleInput.select();
    }, 100);

    showToast('New note created', 'success', 2000);
  }

  /**
   * Delete Active Note Handler
   */
  function handleDeleteActiveNote() {
    if (!state.activeNote) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete "${state.activeNote.title}"?`);
    if (!confirmDelete) return;

    const deletedId = state.activeNote.id;
    const nextActiveId = Storage.deleteNote(deletedId);

    state.notes = Storage.getAllNotes();
    state.activeNote = nextActiveId ? Storage.getNoteById(nextActiveId) : null;

    renderTagFilterBar();
    renderNotesList();
    loadActiveNoteIntoEditor();

    // On mobile, return to notes list if no active note
    if (window.innerWidth < 768 && !state.activeNote) {
      document.body.classList.remove('mobile-view-editor');
    }

    showToast('Note deleted', 'info', 2000);
  }

  /**
   * Toggle Pin Status of Active Note
   */
  function handleTogglePin(id) {
    const targetId = id || (state.activeNote ? state.activeNote.id : null);
    if (!targetId) return;

    const updated = Storage.togglePin(targetId);
    if (updated) {
      state.notes = Storage.getAllNotes();
      if (state.activeNote && state.activeNote.id === targetId) {
        state.activeNote = updated;
        if (updated.pinned) {
          el.btnTogglePin.classList.add('active');
          el.btnTogglePin.style.color = 'var(--accent-warning)';
          showToast('📌 Note pinned to top', 'info', 2000);
        } else {
          el.btnTogglePin.classList.remove('active');
          el.btnTogglePin.style.color = '';
          showToast('Note unpinned', 'info', 2000);
        }
      }
      renderNotesList();
    }
  }

  /**
   * Toggle Zen Mode (Distraction-Free)
   */
  function toggleZenMode() {
    state.zenMode = !state.zenMode;
    if (state.zenMode) {
      document.body.classList.add('zen-mode');
      showToast('Zen Mode activated (Press Esc to exit)', 'info', 2500);
      el.markdownEditor.focus();
    } else {
      document.body.classList.remove('zen-mode');
    }
  }

  /**
   * Toggle Light/Dark Theme
   */
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    Storage.setTheme(state.theme);
    showToast(`Switched to ${state.theme} theme`, 'info', 1500);
  }

  /**
   * Insert Markdown Formatting snippet around selection
   */
  function insertFormatting(formatType) {
    const textarea = el.markdownEditor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let before = '';
    let after = '';
    let defaultPlaceholder = '';

    switch (formatType) {
      case 'h1':
        before = '# ';
        defaultPlaceholder = 'Heading 1';
        break;
      case 'h2':
        before = '## ';
        defaultPlaceholder = 'Heading 2';
        break;
      case 'h3':
        before = '### ';
        defaultPlaceholder = 'Heading 3';
        break;
      case 'bold':
        before = '**';
        after = '**';
        defaultPlaceholder = 'bold text';
        break;
      case 'italic':
        before = '*';
        after = '*';
        defaultPlaceholder = 'italic text';
        break;
      case 'strike':
        before = '~~';
        after = '~~';
        defaultPlaceholder = 'strikethrough text';
        break;
      case 'highlight':
        before = '==';
        after = '==';
        defaultPlaceholder = 'highlighted text';
        break;
      case 'code-inline':
        before = '`';
        after = '`';
        defaultPlaceholder = 'code';
        break;
      case 'code-block':
        before = '```javascript\n';
        after = '\n```';
        defaultPlaceholder = '// your code here';
        break;
      case 'quote':
        before = '> ';
        defaultPlaceholder = 'Quote';
        break;
      case 'callout':
        before = '> [!NOTE]\n> ';
        defaultPlaceholder = 'This is an important note.';
        break;
      case 'ul':
        before = '- ';
        defaultPlaceholder = 'List item';
        break;
      case 'ol':
        before = '1. ';
        defaultPlaceholder = 'Numbered item';
        break;
      case 'task':
        before = '- [ ] ';
        defaultPlaceholder = 'New task item';
        break;
      case 'table':
        before = '\n| Header 1 | Header 2 | Header 3 |\n| :--- | :---: | ---: |\n| Cell 1 | Cell 2 | Cell 3 |\n';
        break;
      case 'link':
        before = '[';
        after = '](https://example.com)';
        defaultPlaceholder = 'link text';
        break;
      case 'hr':
        before = '\n---\n';
        break;
      default:
        break;
    }

    const insertion = selectedText || defaultPlaceholder;
    const replacement = before + insertion + after;
    textarea.setRangeText(replacement, start, end, 'end');

    // Restore focus and trigger save
    textarea.focus();
    triggerAutoSave();
  }

  /**
   * Export Active Note as Markdown File (.md)
   */
  function exportActiveNoteMarkdown() {
    if (!state.activeNote) return;
    const titleSlug = (state.activeNote.title || 'note').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const filename = `${titleSlug}.md`;
    const blob = new Blob([state.activeNote.content || ''], { type: 'text/markdown;charset=utf-8' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  }

  /**
   * Export Active Note as Rendered HTML File (.html)
   */
  function exportActiveNoteHTML() {
    if (!state.activeNote) return;
    const titleSlug = (state.activeNote.title || 'note').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const filename = `${titleSlug}.html`;
    const parsedBody = MarkdownParser.parse(state.activeNote.content || '');

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${MarkdownParser.escapeHtml(state.activeNote.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1, h2, h3 { font-family: "Plus Jakarta Sans", sans-serif; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #6366f1; padding: 8px 16px; margin: 16px 0; background: #f8fafc; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    .task-list-item { list-style: none; margin-left: -20px; }
  </style>
</head>
<body>
  ${parsedBody}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}`, 'success');
  }

  /**
   * Copy Raw Markdown to Clipboard
   */
  function copyRawMarkdown() {
    if (!state.activeNote) return;
    navigator.clipboard.writeText(state.activeNote.content || '').then(() => {
      showToast('Raw markdown copied to clipboard!', 'success');
    });
  }

  /**
   * Backup all notes to JSON
   */
  function backupAllNotesJSON() {
    const jsonStr = Storage.exportAllToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const filename = `markdown_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Saved full backup to ${filename}`, 'success');
  }

  /**
   * Import Notes from JSON file
   */
  function importNotesFromJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      const res = Storage.importFromJSON(content);
      if (res.success) {
        state.notes = Storage.getAllNotes();
        state.activeNote = state.notes.length > 0 ? state.notes[0] : null;
        renderTagFilterBar();
        renderNotesList();
        loadActiveNoteIntoEditor();
        showToast(`Successfully imported ${res.count} notes!`, 'success');
        closeAllModals();
      } else {
        showToast(`Import failed: ${res.error}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  /**
   * Modal Management
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  }

  function closeAllModals() {
    const modals = document.querySelectorAll('.modal-backdrop');
    modals.forEach(m => m.classList.remove('open'));
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // New Note buttons
    el.btnNewNote.addEventListener('click', handleCreateNewNote);
    el.mobileFabNew.addEventListener('click', handleCreateNewNote);

    // Note item clicks & Pin button clicks in list (event delegation)
    el.notesList.addEventListener('click', function (e) {
      const pinBtn = e.target.closest('[data-action="pin"]');
      if (pinBtn) {
        e.stopPropagation();
        handleTogglePin(pinBtn.dataset.id);
        return;
      }

      const card = e.target.closest('.note-card');
      if (card) {
        setActiveNote(card.dataset.id);
      }
    });

    // Tag Filter Bar clicks
    el.tagFilterBar.addEventListener('click', function (e) {
      const chip = e.target.closest('.tag-chip');
      if (chip) {
        state.currentFilterTag = chip.dataset.tag;
        renderTagFilterBar();
        renderNotesList();
      }
    });

    // Search Input
    el.searchInput.addEventListener('input', function () {
      state.searchQuery = this.value;
      if (this.value.trim()) {
        el.searchClearBtn.classList.add('visible');
      } else {
        el.searchClearBtn.classList.remove('visible');
      }
      renderNotesList();
    });

    el.searchClearBtn.addEventListener('click', function () {
      el.searchInput.value = '';
      state.searchQuery = '';
      this.classList.remove('visible');
      renderNotesList();
      el.searchInput.focus();
    });

    // Back button on Mobile
    el.btnBackMobile.addEventListener('click', function () {
      saveActiveNoteData();
      document.body.classList.remove('mobile-view-editor');
    });

    // Mobile Segmented Toggle (Edit / Preview)
    el.btnSegEdit.addEventListener('click', function () {
      state.mobileViewMode = 'edit';
      el.btnSegEdit.classList.add('active');
      el.btnSegPreview.classList.remove('active');
      el.splitViewContainer.className = 'split-view-container mobile-mode-edit';
    });

    el.btnSegPreview.addEventListener('click', function () {
      state.mobileViewMode = 'preview';
      el.btnSegPreview.classList.add('active');
      el.btnSegEdit.classList.remove('active');
      el.splitViewContainer.className = 'split-view-container mobile-mode-preview';
      renderMarkdownPreview();
    });

    // Note Inputs: Title & Markdown Textarea
    el.noteTitleInput.addEventListener('input', triggerAutoSave);
    el.markdownEditor.addEventListener('input', () => {
      triggerAutoSave();
      renderMarkdownPreview();
      updateStats(el.noteTitleInput.value, el.markdownEditor.value);
    });

    // Add Tag Form
    el.addTagForm.addEventListener('submit', function (e) {
      e.preventDefault();
      addTagToActiveNote(el.addTagInput.value);
    });

    // Top action buttons
    el.btnThemeToggle.addEventListener('click', toggleTheme);
    el.btnTogglePin.addEventListener('click', () => handleTogglePin());
    el.btnToggleZen.addEventListener('click', toggleZenMode);
    el.btnExitZen.addEventListener('click', toggleZenMode);
    el.btnDownloadMd.addEventListener('click', exportActiveNoteMarkdown);
    el.btnDeleteNote.addEventListener('click', handleDeleteActiveNote);

    // Markdown Toolbar actions
    el.markdownToolbar.addEventListener('click', function (e) {
      const btn = e.target.closest('.tool-btn');
      if (btn && btn.dataset.action) {
        insertFormatting(btn.dataset.action);
      }
    });

    // Modal Triggers
    el.btnOpenShortcuts.addEventListener('click', () => openModal('modal-shortcuts'));
    el.btnOpenExport.addEventListener('click', () => openModal('modal-export'));

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    // Modal Backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', function (e) {
        if (e.target === this) closeAllModals();
      });
    });

    // Export Modal Actions
    el.btnExportActiveMd.addEventListener('click', exportActiveNoteMarkdown);
    el.btnExportActiveHtml.addEventListener('click', exportActiveNoteHTML);
    el.btnCopyRawMd.addEventListener('click', copyRawMarkdown);
    el.btnBackupAllJson.addEventListener('click', backupAllNotesJSON);

    // Import JSON File
    el.importJsonInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        importNotesFromJSON(this.files[0]);
      }
    });
  }

  /**
   * Keyboard Shortcuts Handler
   */
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', function (e) {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 1. Save (Ctrl+S)
      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveNoteData();
        showToast('Saved note', 'success', 1200);
        return;
      }

      // 2. New Note (Ctrl+N)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateNewNote();
        return;
      }

      // 3. Bold (Ctrl+B)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'b') {
        if (document.activeElement === el.markdownEditor) {
          e.preventDefault();
          insertFormatting('bold');
          return;
        }
      }

      // 4. Italic (Ctrl+I)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'i') {
        if (document.activeElement === el.markdownEditor) {
          e.preventDefault();
          insertFormatting('italic');
          return;
        }
      }

      // 5. Insert Link (Ctrl+K)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'k') {
        if (document.activeElement === el.markdownEditor) {
          e.preventDefault();
          insertFormatting('link');
          return;
        }
      }

      // 6. Search Focus (Ctrl+F)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'f') {
        if (document.activeElement !== el.markdownEditor) {
          e.preventDefault();
          el.searchInput.focus();
          el.searchInput.select();
          return;
        }
      }

      // 7. Zen Mode Toggle (Alt+Z)
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        toggleZenMode();
        return;
      }

      // 8. Escape: Exit Zen Mode, close Modals, or back to notes on Mobile
      if (e.key === 'Escape') {
        if (document.querySelector('.modal-backdrop.open')) {
          closeAllModals();
          return;
        }
        if (state.zenMode) {
          toggleZenMode();
          return;
        }
        if (window.innerWidth < 768 && document.body.classList.contains('mobile-view-editor')) {
          saveActiveNoteData();
          document.body.classList.remove('mobile-view-editor');
          return;
        }
      }

      // 9. Tab key in Editor (Insert 2 spaces indent)
      if (e.key === 'Tab' && document.activeElement === el.markdownEditor) {
        e.preventDefault();
        const textarea = el.markdownEditor;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.setRangeText('  ', start, end, 'end');
        triggerAutoSave();
      }
    });
  }

  // Run on DOM Content Loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
