/**
 * Homepage Application Logic for TutorialStudio
 */
document.addEventListener('DOMContentLoaded', () => {
  let catalog = window.TUTORIAL_CATALOG;

  if (catalog) {
    initApp(catalog);
  } else {
    fetch('assets/data/catalog.json')
      .then(res => res.json())
      .then(data => {
        window.TUTORIAL_CATALOG = data;
        initApp(data);
      })
      .catch(err => {
        console.error('Failed to load catalog:', err);
      });
  }

  function initApp(data) {
    renderContinueBanner();
    renderStats(data.stats);
    renderCategories(data.categories);
    renderSubjects(data.subjects, 'all');
    setupCategoryTabs(data.subjects);
  }

  function renderContinueBanner() {
    const continueWrap = document.getElementById('continueLearningWrap');
    if (!continueWrap) return;

    const recent = window.TutorialStorage ? window.TutorialStorage.getLastRecentTopic() : null;
    if (recent) {
      continueWrap.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-focus); border-radius: var(--radius-lg); padding: 1.25rem 1.75rem; margin-bottom: 2.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: var(--shadow-md);">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.2rem;">
              ▶
            </div>
            <div>
              <span class="badge badge-primary" style="margin-bottom: 0.25rem;">Resume Learning</span>
              <h3 style="font-size: 1.1rem; margin-top: 0.15rem;">${escapeHtml(recent.title)}</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">${recent.subject} • ${recent.category}</p>
            </div>
          </div>
          <a href="tutorial.html#subject=${recent.subjectSlug}&topic=${recent.topicId}" class="btn btn-primary btn-sm">
            Continue Reading &rarr;
          </a>
        </div>
      `;
    }
  }

  function renderStats(stats) {
    if (!stats) return;
    const catEl = document.getElementById('statCategories');
    const subEl = document.getElementById('statSubjects');
    const topEl = document.getElementById('statTopics');
    const exEl = document.getElementById('statExamples');

    if (catEl) catEl.innerHTML = `${stats.total_categories}<span>+</span>`;
    if (subEl) subEl.innerHTML = `${stats.total_subjects}<span>+</span>`;
    if (topEl) topEl.innerHTML = `${stats.total_topics.toLocaleString()}<span>+</span>`;
    if (exEl) exEl.innerHTML = `${stats.total_examples.toLocaleString()}<span>+</span>`;
  }

  function renderCategories(categories) {
    const grid = document.getElementById('categoriesGrid');
    if (!grid || !categories) return;

    grid.innerHTML = categories.map(cat => {
      const sampleTags = cat.subjects.slice(0, 5).map(s => `<span class="cat-tag">${s.name}</span>`).join('');
      const firstSub = cat.subjects[0];
      const linkUrl = firstSub ? `tutorial.html#subject=${firstSub.slug}&topic=${firstSub.first_topic_id}` : 'subjects.html';

      return `
        <div class="category-card">
          <div class="cat-header">
            <div class="cat-icon-badge">
              ${getCategoryIcon(cat.icon)}
            </div>
            <span class="badge badge-primary">${cat.subjects_count} Subjects</span>
          </div>
          <h3 class="cat-title">${escapeHtml(cat.name)}</h3>
          <p class="cat-desc">${escapeHtml(cat.description)}</p>
          <div class="cat-subject-tags">
            ${sampleTags}
            ${cat.subjects.length > 5 ? `<span class="cat-tag">+${cat.subjects.length - 5} more</span>` : ''}
          </div>
          <div class="cat-footer">
            <span>${cat.topics_count} Tutorials</span>
            <a href="${linkUrl}" class="sub-link-arrow">
              Start Learning &rarr;
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderSubjects(subjects, categoryFilter) {
    const grid = document.getElementById('subjectsGrid');
    if (!grid || !subjects) return;

    const filtered = categoryFilter === 'all' 
      ? subjects 
      : subjects.filter(s => s.category.toLowerCase().replace(/[^a-z0-9]/g, '') === categoryFilter.toLowerCase().replace(/[^a-z0-9]/g, ''));

    grid.innerHTML = filtered.map(sub => {
      const progress = window.TutorialStorage ? window.TutorialStorage.getSubjectProgress(sub.slug, sub.topics_count) : 0;
      const firstTopicId = sub.first_topic_id || (sub.topics && sub.topics[0] ? sub.topics[0].topic_id : '');
      const link = `tutorial.html#subject=${sub.slug}&topic=${firstTopicId}`;

      return `
        <a href="${link}" class="subject-card">
          <div>
            <div class="sub-top">
              <div>
                <h4 class="sub-name">${escapeHtml(sub.name)}</h4>
                <div class="sub-cat">${escapeHtml(sub.category)}</div>
              </div>
              <span class="badge ${progress === 100 ? 'badge-success' : 'badge-primary'}">${progress}%</span>
            </div>
            <div class="sub-progress-bar">
              <div class="sub-progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          <div class="sub-meta">
            <span>${sub.topics_count} Topics</span>
            <span class="sub-link-arrow">Explore &rarr;</span>
          </div>
        </a>
      `;
    }).join('');
  }

  function setupCategoryTabs(subjects) {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter') || 'all';
        renderSubjects(subjects, filter);
      });
    });
  }

  function getCategoryIcon(type) {
    switch (type) {
      case 'code':
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
      case 'layout':
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>';
      case 'server':
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>';
      case 'cpu':
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>';
      case 'database':
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>';
      case 'shield':
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
      default:
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
