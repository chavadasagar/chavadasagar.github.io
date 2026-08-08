/**
 * Storage Layer for Markdown Notes App
 * Zero-backend LocalStorage persistence with seed templates and export/import.
 */
(function (global) {
  'use strict';

  const STORAGE_KEYS = {
    NOTES: 'md_notes_data_v1',
    ACTIVE_NOTE: 'md_notes_active_id',
    THEME: 'md_notes_theme',
    EDITOR_SETTINGS: 'md_notes_editor_settings'
  };

  const SEED_NOTES = [
    {
      id: 'note_welcome_guide',
      title: '✨ Welcome to Markdown Notes',
      content: `# ✨ Welcome to Markdown Notes!

A fast, mobile-friendly **Markdown Note-Taking** app built with zero dependencies, live split-preview, and auto-save.

---

## 🎯 Quick Start Checklist
- [x] Explore the mobile & desktop split view
- [x] Try writing markdown in the editor
- [ ] Create your first custom note with the **+ New Note** button
- [ ] Add tags like \`work\`, \`ideas\`, or \`tasks\`
- [ ] Pin your most important notes to keep them at the top
- [ ] Toggle **Zen Mode** for distraction-free writing

---

## 📝 Markdown Styling Showcase

### 1. Typography & Inline Styles
You can format text using standard markdown tokens:
- **Bold text** with \`**bold**\` or \`__bold__\`
- *Italic text* with \`*italic*\` or \`_italic_\`
- ***Bold and Italic*** with \`***triple asterisks***\`
- ~~Strikethrough~~ with \`~~strikethrough~~\`
- ==Highlighted text== with \`==highlight==\`
- Keyboard shortcut styling: [[Ctrl]] + [[Shift]] + [[Z]]

### 2. GitHub-Style Callout Alerts
> [!NOTE]
> All your notes are saved securely in your browser's **localStorage**. No external server or database required!

> [!TIP]
> On desktop, enjoy the live side-by-side preview. On mobile devices, tap the **Edit / Preview** pill button to switch screens instantly.

> [!IMPORTANT]
> You can download any note as a \`.md\` file, export as styled HTML, or copy raw markdown with a single click.

### 3. Code Blocks with Copy Button
\`\`\`javascript
// Debounced auto-save function
function autoSave(noteId, content) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    Storage.updateNote(noteId, { content, updatedAt: Date.now() });
    console.log('✨ Note saved seamlessly to localStorage!');
  }, 300);
}
\`\`\`

### 4. Interactive Tables
| Feature | Mobile View | Desktop View | Storage |
| :--- | :---: | :---: | ---: |
| Full-Screen Editor | ✅ Yes | Optional (Zen) | Local |
| Live Split Preview | Toggle Pill | ✅ Side-by-Side | Local |
| Pinning & Tag Filtering | ✅ Drawer & Bar | ✅ Left Sidebar | Local |
| Auto-Save (Debounced) | ✅ 300ms | ✅ 300ms | Local |

---

## ⚡ Keyboard Shortcuts
| Shortcut | Action |
| :--- | :--- |
| [[Ctrl]] + [[N]] | Create a new note |
| [[Ctrl]] + [[S]] | Force save changes immediately |
| [[Ctrl]] + [[B]] | Toggle **Bold** |
| [[Ctrl]] + [[I]] | Toggle *Italic* |
| [[Ctrl]] + [[K]] | Insert Link |
| [[Alt]] + [[Z]] | Toggle **Zen Mode** (Distraction-Free) |
| [[Esc]] | Exit Zen Mode / Return to notes list |

> *"Simplicity is the soul of efficiency."* — Austin Freeman
`,
      tags: ['guide', 'welcome', 'markdown'],
      pinned: true,
      createdAt: Date.now() - 3600000 * 24 * 2,
      updatedAt: Date.now() - 3600000 * 2
    },
    {
      id: 'note_project_roadmap',
      title: '🚀 Q3 Product Roadmap & Ideas',
      content: `# 🚀 Q3 Product Roadmap & Ideas

Brainstorming and milestone tracking for upcoming releases.

## 📌 High Priority Milestones
- [x] Complete mobile-first responsive navigation
- [x] Implement live split-screen editor & preview
- [x] Build vanilla JS Markdown parser with XSS sanitization
- [ ] Add custom color accent themes
- [ ] Offline export bundle (Markdown + Assets ZIP)

## 💡 Feature Ideas
1. **Voice Dictation Mode**: Quick speech-to-text notes on mobile browsers
2. **Template Library**: Meeting minutes, daily journals, weekly sprints
3. **Graph View**: Visual link connection between tagged notes

> [!TIP]
> Keep notes organized by attaching concise tags like \`dev\`, \`roadmap\`, or \`brainstorm\`.
`,
      tags: ['work', 'roadmap', 'planning'],
      pinned: true,
      createdAt: Date.now() - 3600000 * 24 * 5,
      updatedAt: Date.now() - 3600000 * 8
    },
    {
      id: 'note_daily_journal',
      title: '☕ Daily Reflections & Habits',
      content: `# ☕ Daily Reflections & Habits

*"Small daily improvements over time lead to stunning results."*

### 🌿 Morning Routine
- [x] 10-minute mindfulness breathing
- [x] 20 oz cold water + lemon
- [x] 30 minutes reading technical books
- [ ] 5 km morning jog or brisk walk

### 🎯 3 Wins for Today
1. Shipped the mobile-friendly Markdown Notes app 🚀
2. Solved the split-view auto-scroll sync challenge
3. Explored new minimalist typography designs

### 💭 Thought of the Day
Writing things down externalizes thought, clarifies thinking, and removes mental clutter.
`,
      tags: ['personal', 'journal', 'habits'],
      pinned: false,
      createdAt: Date.now() - 3600000 * 24 * 1,
      updatedAt: Date.now() - 3600000 * 12
    }
  ];

  const Storage = {
    /**
     * Initialize storage with default seeds if empty
     */
    init: function () {
      const existing = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (!existing) {
        this.saveAllNotes(SEED_NOTES);
        this.setActiveNoteId(SEED_NOTES[0].id);
      }
    },

    /**
     * Get all notes from localStorage
     */
    getAllNotes: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
        if (!raw) return [];
        const notes = JSON.parse(raw);
        return Array.isArray(notes) ? notes : [];
      } catch (e) {
        console.error('Failed to parse notes from storage:', e);
        return [];
      }
    },

    /**
     * Save full list of notes
     */
    saveAllNotes: function (notes) {
      try {
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
        return true;
      } catch (e) {
        console.error('Failed to save notes to storage:', e);
        return false;
      }
    },

    /**
     * Get a single note by ID
     */
    getNoteById: function (id) {
      const notes = this.getAllNotes();
      return notes.find(n => n.id === id) || null;
    },

    /**
     * Create a new note
     */
    createNote: function (noteData = {}) {
      const notes = this.getAllNotes();
      const newNote = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: noteData.title || 'Untitled Note',
        content: noteData.content || '',
        tags: Array.isArray(noteData.tags) ? noteData.tags : [],
        pinned: Boolean(noteData.pinned),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      notes.unshift(newNote);
      this.saveAllNotes(notes);
      this.setActiveNoteId(newNote.id);
      return newNote;
    },

    /**
     * Update an existing note
     */
    updateNote: function (id, updates = {}) {
      const notes = this.getAllNotes();
      const index = notes.findIndex(n => n.id === id);
      if (index === -1) return null;

      const current = notes[index];
      const updated = {
        ...current,
        ...updates,
        updatedAt: Date.now()
      };

      notes[index] = updated;
      this.saveAllNotes(notes);
      return updated;
    },

    /**
     * Delete a note by ID
     */
    deleteNote: function (id) {
      const notes = this.getAllNotes();
      const filtered = notes.filter(n => n.id !== id);
      this.saveAllNotes(filtered);

      const activeId = this.getActiveNoteId();
      if (activeId === id) {
        const nextActive = filtered.length > 0 ? filtered[0].id : null;
        this.setActiveNoteId(nextActive);
        return nextActive;
      }
      return activeId;
    },

    /**
     * Toggle pinned status of a note
     */
    togglePin: function (id) {
      const note = this.getNoteById(id);
      if (!note) return null;
      return this.updateNote(id, { pinned: !note.pinned });
    },

    /**
     * Duplicate an existing note
     */
    duplicateNote: function (id) {
      const original = this.getNoteById(id);
      if (!original) return null;

      return this.createNote({
        title: original.title + ' (Copy)',
        content: original.content,
        tags: [...original.tags],
        pinned: false
      });
    },

    /**
     * Get unique tags across all notes with counts
     */
    getAllTagsWithCounts: function () {
      const notes = this.getAllNotes();
      const tagMap = {};
      notes.forEach(note => {
        if (Array.isArray(note.tags)) {
          note.tags.forEach(tag => {
            const cleanTag = tag.trim().toLowerCase();
            if (cleanTag) {
              tagMap[cleanTag] = (tagMap[cleanTag] || 0) + 1;
            }
          });
        }
      });
      return tagMap;
    },

    /**
     * Active note tracking
     */
    getActiveNoteId: function () {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_NOTE) || null;
    },

    setActiveNoteId: function (id) {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_NOTE, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_NOTE);
      }
    },

    /**
     * Theme preference (dark, light, system)
     */
    getTheme: function () {
      return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    },

    setTheme: function (theme) {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    },

    /**
     * Editor settings (zenMode, fontSize, etc.)
     */
    getSettings: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.EDITOR_SETTINGS);
        return raw ? JSON.parse(raw) : { fontSize: 16, lineNumbers: false, spellcheck: true };
      } catch (e) {
        return { fontSize: 16, lineNumbers: false, spellcheck: true };
      }
    },

    saveSettings: function (settings) {
      localStorage.setItem(STORAGE_KEYS.EDITOR_SETTINGS, JSON.stringify(settings));
    },

    /**
     * Export all notes as a JSON file
     */
    exportAllToJSON: function () {
      const notes = this.getAllNotes();
      const exportData = {
        app: 'MarkdownNotesApp',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        notesCount: notes.length,
        notes: notes
      };
      return JSON.stringify(exportData, null, 2);
    },

    /**
     * Import notes from JSON data string
     */
    importFromJSON: function (jsonString) {
      try {
        const data = JSON.parse(jsonString);
        const importedList = Array.isArray(data) ? data : data.notes;
        if (!Array.isArray(importedList)) {
          throw new Error('Invalid notes structure in JSON file');
        }

        const currentNotes = this.getAllNotes();
        const currentIds = new Set(currentNotes.map(n => n.id));
        let addedCount = 0;

        importedList.forEach(item => {
          if (item && item.title) {
            let noteId = item.id;
            if (!noteId || currentIds.has(noteId)) {
              noteId = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            }
            currentNotes.unshift({
              id: noteId,
              title: String(item.title || 'Imported Note'),
              content: String(item.content || ''),
              tags: Array.isArray(item.tags) ? item.tags : [],
              pinned: Boolean(item.pinned),
              createdAt: item.createdAt || Date.now(),
              updatedAt: item.updatedAt || Date.now()
            });
            currentIds.add(noteId);
            addedCount++;
          }
        });

        this.saveAllNotes(currentNotes);
        if (currentNotes.length > 0) {
          this.setActiveNoteId(currentNotes[0].id);
        }
        return { success: true, count: addedCount };
      } catch (e) {
        console.error('Import error:', e);
        return { success: false, error: e.message };
      }
    }
  };

  // Run initialization
  Storage.init();

  // Expose storage globally
  global.Storage = Storage;
})(typeof window !== 'undefined' ? window : this);
