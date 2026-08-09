/**
 * Global Instant Search (Ctrl+K) Modal for TutorialStudio
 */
window.TutorialSearch = {
  isOpen: false,
  allTopics: [],
  filtered: [],
  selectedIndex: -1,

  init() {
    this.createModal();
    this.bindEvents();
    this.loadCatalog();
  },

  loadCatalog() {
    if (window.TUTORIAL_CATALOG && window.TUTORIAL_CATALOG.all_topics) {
      this.allTopics = window.TUTORIAL_CATALOG.all_topics;
    } else {
      fetch('assets/data/catalog.json')
        .then(r => r.json())
        .then(data => {
          this.allTopics = data.all_topics || [];
        })
        .catch(() => {});
    }
  },

  createModal() {
    const modalHtml = `
      <div class="search-modal-backdrop" id="searchBackdrop">
        <div class="search-modal" id="searchModal">
          <div class="search-input-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="globalSearchInput" placeholder="Search 3,500+ topics, tutorials, or subjects..." autocomplete="off">
            <span class="search-kbd">ESC</span>
          </div>
          <ul class="search-results-list" id="searchResultsList">
            <li style="padding: 2rem 1rem; text-align: center; color: var(--text-muted);">
              Type to search tutorials across 38 subjects...
            </li>
          </ul>
          <div class="search-footer-bar">
            <span><strong style="color: var(--text-primary)">↑ / ↓</strong> to navigate</span>
            <span><strong style="color: var(--text-primary)">ENTER</strong> to open</span>
            <span><strong style="color: var(--text-primary)">ESC</strong> to close</span>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  bindEvents() {
    // Keyboard hotkeys Ctrl+K / Cmd+K or Slash /
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.open();
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.open();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      } else if (this.isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
          e.preventDefault();
          const target = this.filtered[this.selectedIndex];
          if (target) {
            this.goToTopic(target);
          }
        }
      }
    });

    // Search input change
    const input = document.getElementById('globalSearchInput');
    if (input) {
      input.addEventListener('input', (e) => {
        this.performSearch(e.target.value);
      });
    }

    // Backdrop click
    const backdrop = document.getElementById('searchBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      });
    }

    // Trigger buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.search-trigger-btn') || e.target.closest('.search-pill-btn')) {
        this.open();
      }
    });
  },

  open() {
    this.isOpen = true;
    const backdrop = document.getElementById('searchBackdrop');
    const input = document.getElementById('globalSearchInput');
    if (backdrop) backdrop.classList.add('active');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
    this.renderDefaultRecents();
  },

  close() {
    this.isOpen = false;
    const backdrop = document.getElementById('searchBackdrop');
    if (backdrop) backdrop.classList.remove('active');
    this.selectedIndex = -1;
  },

  performSearch(query) {
    const list = document.getElementById('searchResultsList');
    if (!list) return;

    const q = query.trim().toLowerCase();
    if (!q) {
      this.renderDefaultRecents();
      return;
    }

    if (!this.allTopics || this.allTopics.length === 0) {
      this.loadCatalog();
    }

    // Fuzzy / substring matching
    this.filtered = this.allTopics.filter(t => {
      return (
        t.title.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.summary && t.summary.toLowerCase().includes(q))
      );
    }).slice(0, 25);

    this.selectedIndex = this.filtered.length > 0 ? 0 : -1;
    this.renderResults();
  },

  renderResults() {
    const list = document.getElementById('searchResultsList');
    if (!list) return;

    if (this.filtered.length === 0) {
      list.innerHTML = `
        <li style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
          No matching tutorials found. Try another keyword like "HTML", "Flexbox", "Loops", or "SQL".
        </li>
      `;
      return;
    }

    list.innerHTML = this.filtered.map((t, idx) => `
      <li class="search-result-item ${idx === this.selectedIndex ? 'selected' : ''}" data-index="${idx}">
        <div>
          <div class="search-res-title">${this.escapeHtml(t.title)}</div>
          <div class="search-res-sub">${t.subject} • ${t.category}</div>
        </div>
        <span class="badge badge-primary">${t.examples_count || 0} examples</span>
      </li>
    `).join('');

    // Click handler for items
    list.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        const target = this.filtered[idx];
        if (target) this.goToTopic(target);
      });
    });
  },

  renderDefaultRecents() {
    const list = document.getElementById('searchResultsList');
    if (!list) return;

    const bookmarks = window.TutorialStorage ? window.TutorialStorage.getBookmarks() : [];
    if (bookmarks.length > 0) {
      this.filtered = bookmarks.map(b => ({
        topic_id: b.topicId,
        title: b.title,
        subject_slug: b.subjectSlug,
        subject: b.subject,
        category: b.category,
        examples_count: 0
      }));
      this.selectedIndex = 0;

      list.innerHTML = `
        <li style="padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
          Saved Bookmarks
        </li>
        ${this.filtered.map((t, idx) => `
          <li class="search-result-item ${idx === 0 ? 'selected' : ''}" data-index="${idx}">
            <div>
              <div class="search-res-title">★ ${this.escapeHtml(t.title)}</div>
              <div class="search-res-sub">${t.subject} • ${t.category}</div>
            </div>
            <span class="badge badge-cyan">Bookmarked</span>
          </li>
        `).join('')}
      `;

      list.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.getAttribute('data-index'), 10);
          const target = this.filtered[idx];
          if (target) this.goToTopic(target);
        });
      });
    } else {
      list.innerHTML = `
        <li style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
          Search across 3,500+ tutorials, topics, or code examples...
        </li>
      `;
    }
  },

  moveSelection(delta) {
    if (this.filtered.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.filtered.length) % this.filtered.length;
    
    const items = document.querySelectorAll('.search-result-item');
    items.forEach((item, idx) => {
      if (idx === this.selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  },

  goToTopic(topic) {
    this.close();
    window.location.href = `tutorial.html#subject=${topic.subject_slug}&topic=${topic.topic_id}`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.TutorialSearch.init();
});
