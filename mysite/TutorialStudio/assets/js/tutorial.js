/**
 * Tutorial Reader Engine for TutorialStudio
 */
document.addEventListener('DOMContentLoaded', () => {
  let catalog = window.TUTORIAL_CATALOG;
  let currentSubjectSlug = 'html';
  let currentTopicId = 'html_default';
  let currentSubjectData = [];
  let currentTopic = null;

  // Initialize
  if (catalog) {
    initReader();
  } else {
    fetch('assets/data/catalog.json')
      .then(r => r.json())
      .then(data => {
        window.TUTORIAL_CATALOG = data;
        catalog = data;
        initReader();
      })
      .catch(err => {
        console.error('Catalog load failed:', err);
      });
  }

  function initReader() {
    parseHashParams();
    window.addEventListener('hashchange', () => {
      parseHashParams();
    });

    setupSidebarSearch();
    setupSubjectModal();
  }

  function parseHashParams() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const sub = params.get('subject') || 'html';
    const topic = params.get('topic');

    currentSubjectSlug = sub;
    loadSubjectData(sub, topic);
  }

  function loadSubjectData(subSlug, targetTopicId) {
    const varName = 'SUBJECT_DATA_' + subSlug.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();

    if (window[varName]) {
      currentSubjectData = window[varName];
      selectTopic(targetTopicId);
    } else {
      // Load script dynamically
      const script = document.createElement('script');
      script.src = `assets/data/subjects/${subSlug}.js`;
      script.onload = () => {
        currentSubjectData = window[varName] || [];
        selectTopic(targetTopicId);
      };
      script.onerror = () => {
        // Fallback fetch JSON
        fetch(`assets/data/subjects/${subSlug}.json`)
          .then(r => r.json())
          .then(data => {
            currentSubjectData = data;
            selectTopic(targetTopicId);
          })
          .catch(() => {
            document.getElementById('tutorialBody').innerHTML = `
              <div class="callout-box warning">
                <h3>Failed to load subject content</h3>
                <p>Could not load tutorials for <code>${subSlug}</code>. Please choose another subject from the menu.</p>
              </div>
            `;
          });
      };
      document.head.appendChild(script);
    }
  }

  function selectTopic(targetTopicId) {
    if (!currentSubjectData || currentSubjectData.length === 0) return;

    if (targetTopicId) {
      currentTopic = currentSubjectData.find(t => t.topic_id === targetTopicId);
    }
    if (!currentTopic) {
      currentTopic = currentSubjectData[0];
    }

    currentTopicId = currentTopic.topic_id;

    // Save recent
    if (window.TutorialStorage) {
      window.TutorialStorage.saveRecentTopic(currentTopic);
    }

    renderSidebar();
    renderTopicContent(currentTopic);
    renderTOC();
    updateProgressIndicator();
    updateBookmarkButton();
  }

  function renderSidebar(filterQuery = '') {
    const listEl = document.getElementById('sidebarTopicsList');
    const titleEl = document.getElementById('sidebarSubjectTitle');
    const catBadge = document.getElementById('sidebarCatBadge');

    if (!listEl) return;

    const first = currentSubjectData[0];
    if (titleEl && first) titleEl.textContent = first.subject;
    if (catBadge && first) catBadge.textContent = first.category;

    const q = filterQuery.toLowerCase().trim();
    const filtered = q 
      ? currentSubjectData.filter(t => t.title.toLowerCase().includes(q))
      : currentSubjectData;

    listEl.innerHTML = filtered.map(t => {
      const isAct = t.topic_id === currentTopicId ? 'active' : '';
      const isDone = window.TutorialStorage && window.TutorialStorage.isCompleted(t.topic_id) ? 'completed' : '';

      return `
        <li class="sidebar-topic-item">
          <a href="#subject=${t.subject_slug}&topic=${t.topic_id}" class="sidebar-topic-link ${isAct} ${isDone}" data-topic-id="${t.topic_id}">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(t.title)}</span>
            <span class="topic-status-icon">✓</span>
          </a>
        </li>
      `;
    }).join('');

    // Scroll active item into view
    setTimeout(() => {
      const activeItem = listEl.querySelector('.sidebar-topic-link.active');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }, 50);
  }

  function renderTopicContent(topic) {
    document.title = `${topic.title} - ${topic.subject} Tutorial | TutorialStudio`;

    const breadcrumbEl = document.getElementById('tutorialBreadcrumb');
    const titleEl = document.getElementById('tutorialTitle');
    const bodyEl = document.getElementById('tutorialBody');
    const navFooterEl = document.getElementById('tutorialFooterNav');

    if (breadcrumbEl) {
      breadcrumbEl.innerHTML = `
        <a href="index.html">Home</a>
        <span>/</span>
        <a href="subjects.html">${escapeHtml(topic.category)}</a>
        <span>/</span>
        <a href="#subject=${topic.subject_slug}&topic=${currentSubjectData[0].topic_id}">${escapeHtml(topic.subject)}</a>
        <span>/</span>
        <span style="color: var(--text-primary);">${escapeHtml(topic.title)}</span>
      `;
    }

    if (titleEl) {
      titleEl.textContent = topic.title;
    }

    // Build Body Content
    let html = '';

    // Summary banner
    if (topic.summary && topic.summary.length > 20 && !topic.summary.includes('Well organized and easy')) {
      html += `
        <div class="callout-box note">
          <div class="callout-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Overview
          </div>
          <p style="margin: 0;">${escapeHtml(topic.summary)}</p>
        </div>
      `;
    }

    // Code Examples (if at top)
    if (topic.code_examples && topic.code_examples.length > 0) {
      topic.code_examples.forEach((ex, idx) => {
        html += renderCodeCard(ex, idx);
      });
    }

    // Sections
    if (topic.sections && topic.sections.length > 0) {
      topic.sections.forEach((sec, idx) => {
        const secId = `section-${idx}`;
        html += `<h2 id="${secId}">${escapeHtml(sec.heading)}</h2>`;
        html += formatSectionContent(sec.content);
      });
    } else if (!topic.code_examples || topic.code_examples.length === 0) {
      html += `<p style="color: var(--text-muted); padding: 2rem 0;">This topic is a quick reference guide. Explore the examples and navigation below.</p>`;
    }

    // Notes and Tips
    if (topic.notes_and_tips && topic.notes_and_tips.length > 0) {
      topic.notes_and_tips.forEach(note => {
        html += `
          <div class="callout-box tip">
            <div class="callout-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>
              Pro Tip
            </div>
            <p style="margin: 0;">${escapeHtml(note)}</p>
          </div>
        `;
      });
    }

    bodyEl.innerHTML = html;

    // Render Navigation Footer (Prev / Next)
    renderPaginationFooter(navFooterEl);

    // Bind Code Block Actions
    bindCodeActions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCodeCard(ex, idx) {
    const rawCode = ex.code.trim();
    const encodedForPlayground = encodeURIComponent(rawCode);
    const lang = (ex.language || 'html').toLowerCase();

    return `
      <div class="code-example-card">
        <div class="code-header">
          <span class="code-lang-tag">${escapeHtml(ex.heading || 'Example')} (${lang.toUpperCase()})</span>
          <div class="code-actions">
            <button class="code-btn btn-copy-code" data-code="${escapeHtml(rawCode)}" title="Copy Code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
            <a href="playground.html#lang=${lang}&code=${encodedForPlayground}" class="code-btn code-btn-run" title="Run in Live Sandbox">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Try It Live
            </a>
          </div>
        </div>
        <pre class="code-pre"><code>${escapeHtml(rawCode)}</code></pre>
      </div>
    `;
  }

  function formatSectionContent(content) {
    if (!content) return '';

    const lines = content.split('\n');
    let out = '';
    let inList = false;
    let listType = 'ul';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) {
          out += `</${listType}>`;
          inList = false;
        }
        return;
      }

      // Check if line looks like code
      if (trimmed.startsWith('<') && trimmed.endsWith('>') || trimmed.startsWith('def ') || trimmed.startsWith('function ') || trimmed.startsWith('const ') || trimmed.startsWith('import ')) {
        if (inList) { out += `</${listType}>`; inList = false; }
        out += `<pre class="code-pre" style="margin: 1rem 0; padding: 0.85rem 1rem; border-radius: var(--radius-md); background: var(--bg-code); font-size: 0.9rem;"><code>${escapeHtml(trimmed)}</code></pre>`;
        return;
      }

      // Bullet points
      if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) {
          out += '<ul>';
          inList = true;
          listType = 'ul';
        }
        const text = trimmed.replace(/^[•\-\*]\s*/, '');
        out += `<li>${escapeHtml(text)}</li>`;
        return;
      }

      // Regular paragraph
      if (inList) {
        out += `</${listType}>`;
        inList = false;
      }
      out += `<p>${escapeHtml(trimmed)}</p>`;
    });

    if (inList) {
      out += `</${listType}>`;
    }

    return out;
  }

  function renderPaginationFooter(navEl) {
    if (!navEl || !currentSubjectData) return;

    const currentIndex = currentSubjectData.findIndex(t => t.topic_id === currentTopicId);
    const prevTopic = currentIndex > 0 ? currentSubjectData[currentIndex - 1] : null;
    const nextTopic = currentIndex < currentSubjectData.length - 1 ? currentSubjectData[currentIndex + 1] : null;
    const isDone = window.TutorialStorage && window.TutorialStorage.isCompleted(currentTopicId);

    navEl.innerHTML = `
      <div class="nav-prev-next">
        ${prevTopic ? `
          <a href="#subject=${prevTopic.subject_slug}&topic=${prevTopic.topic_id}" class="topic-nav-btn">
            <span class="topic-nav-label">&larr; Previous</span>
            <span class="topic-nav-title">${escapeHtml(prevTopic.title)}</span>
          </a>
        ` : `<div></div>`}

        ${nextTopic ? `
          <a href="#subject=${nextTopic.subject_slug}&topic=${nextTopic.topic_id}" class="topic-nav-btn" style="text-align: right;">
            <span class="topic-nav-label">Next &rarr;</span>
            <span class="topic-nav-title">${escapeHtml(nextTopic.title)}</span>
          </a>
        ` : `<div></div>`}
      </div>

      <button class="btn ${isDone ? 'btn-secondary' : 'btn-primary'} btn-complete-topic" id="btnCompleteTopic">
        ${isDone ? '✓ Completed (Click to Undo)' : 'Mark as Completed & Continue'}
      </button>
    `;

    const btnComplete = document.getElementById('btnCompleteTopic');
    if (btnComplete) {
      btnComplete.addEventListener('click', () => {
        if (window.TutorialStorage) {
          const completed = window.TutorialStorage.toggleCompleted(currentTopicId, currentSubjectSlug);
          if (completed) {
            window.showToast('🎉 Topic marked as completed!', 'success');
            if (nextTopic) {
              setTimeout(() => {
                window.location.hash = `#subject=${nextTopic.subject_slug}&topic=${nextTopic.topic_id}`;
              }, 400);
            }
          } else {
            window.showToast('Topic marked as incomplete.', 'info');
          }
          renderSidebar();
          updateProgressIndicator();
          renderPaginationFooter(navEl);
        }
      });
    }
  }

  function renderTOC() {
    const tocList = document.getElementById('tocList');
    if (!tocList || !currentTopic) return;

    if (!currentTopic.sections || currentTopic.sections.length === 0) {
      tocList.innerHTML = `<li style="font-size: 0.8rem; color: var(--text-muted);">No subheadings</li>`;
      return;
    }

    tocList.innerHTML = currentTopic.sections.map((sec, idx) => `
      <li>
        <a href="#section-${idx}" class="toc-link">${escapeHtml(sec.heading)}</a>
      </li>
    `).join('');
  }

  function updateProgressIndicator() {
    const bar = document.getElementById('sidebarProgressBar');
    const label = document.getElementById('sidebarProgressLabel');
    if (!bar || !currentSubjectData) return;

    const progress = window.TutorialStorage 
      ? window.TutorialStorage.getSubjectProgress(currentSubjectSlug, currentSubjectData.length)
      : 0;

    bar.style.width = `${progress}%`;
    if (label) label.textContent = `${progress}% Completed`;
  }

  function updateBookmarkButton() {
    const btn = document.getElementById('btnBookmarkTopic');
    if (!btn || !currentTopic) return;

    const isBookmarked = window.TutorialStorage && window.TutorialStorage.isBookmarked(currentTopic.topic_id);
    btn.innerHTML = isBookmarked
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';
    btn.title = isBookmarked ? 'Remove Bookmark' : 'Bookmark this tutorial';

    btn.onclick = () => {
      if (window.TutorialStorage) {
        const saved = window.TutorialStorage.toggleBookmark(currentTopic);
        updateBookmarkButton();
        window.showToast(saved ? '★ Tutorial bookmarked!' : 'Bookmark removed.', 'info');
      }
    };
  }

  function bindCodeActions() {
    document.querySelectorAll('.btn-copy-code').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard.writeText(code).then(() => {
          window.showToast('Code copied to clipboard!', 'success');
        });
      });
    });
  }

  function setupSidebarSearch() {
    const input = document.getElementById('sidebarSearchInput');
    if (input) {
      input.addEventListener('input', (e) => {
        renderSidebar(e.target.value);
      });
    }

    // Toggle sidebar on mobile
    const toggleBtn = document.getElementById('btnToggleSidebar');
    const sidebar = document.querySelector('.tutorial-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  function setupSubjectModal() {
    const changeBtn = document.getElementById('btnChangeSubject');
    if (!changeBtn || !catalog) return;

    changeBtn.addEventListener('click', () => {
      // Open instant subject switcher
      const selectHtml = `
        <div class="search-modal-backdrop active" id="subjectPickerBackdrop">
          <div class="search-modal" style="max-width: 500px;">
            <div class="search-input-wrap">
              <h3 style="font-size: 1.1rem; margin: 0;">Switch Subject (38 Available)</h3>
              <span class="search-kbd" id="closeSubjectPicker" style="cursor: pointer;">ESC</span>
            </div>
            <ul class="search-results-list" style="max-height: 400px;">
              ${catalog.subjects.map(s => `
                <li class="search-result-item" style="cursor: pointer;" onclick="window.location.hash='#subject=${s.slug}&topic=${s.first_topic_id}'; document.getElementById('subjectPickerBackdrop').remove();">
                  <div>
                    <div class="search-res-title">${escapeHtml(s.name)}</div>
                    <div class="search-res-sub">${escapeHtml(s.category)}</div>
                  </div>
                  <span class="badge badge-primary">${s.topics_count} topics</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', selectHtml);

      document.getElementById('closeSubjectPicker').onclick = () => {
        document.getElementById('subjectPickerBackdrop').remove();
      };
      document.getElementById('subjectPickerBackdrop').onclick = (e) => {
        if (e.target.id === 'subjectPickerBackdrop') {
          e.target.remove();
        }
      };
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
