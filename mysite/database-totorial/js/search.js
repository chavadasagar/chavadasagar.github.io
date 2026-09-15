// Global Search Modal Engine
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const searchModalBtn = document.getElementById('search-modal-btn');
    const modalOverlay = document.getElementById('global-search-modal');
    const searchInput = document.getElementById('global-search-input');
    const resultsContainer = document.getElementById('global-search-results');

    if (!searchModalBtn || !modalOverlay) return;

    searchModalBtn.addEventListener('click', openSearchModal);

    // Shortcut Cmd/Ctrl + K
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
      if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        closeSearchModal();
      }
    });

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeSearchModal();
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        performSearch(query);
      });
    }

    function openSearchModal() {
      modalOverlay.classList.add('active');
      if (searchInput) searchInput.focus();
    }

    function closeSearchModal() {
      modalOverlay.classList.remove('active');
    }

    function performSearch(query) {
      if (!query || !window.PROJECTS_DATA) {
        resultsContainer.innerHTML = '<div style="padding:1rem; color:var(--text-muted);">Type to search projects, modules, tables, or concepts...</div>';
        return;
      }

      const matches = [];

      // Search projects
      window.PROJECTS_DATA.forEach(p => {
        if (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)) {
          matches.push({ type: 'Project', title: p.name, desc: p.description, url: `project.html?id=${p.id}` });
        }
        
        p.tables.forEach(tbl => {
          if (tbl.name.toLowerCase().includes(query) || tbl.purpose.toLowerCase().includes(query)) {
            matches.push({ type: 'Table', title: `${p.name} → ${tbl.name}`, desc: tbl.purpose, url: `project.html?id=${p.id}` });
          }
        });
      });

      // Search concepts
      if (window.CONCEPTS_DATA) {
        window.CONCEPTS_DATA.forEach(c => {
          if (c.title.toLowerCase().includes(query) || c.definition.toLowerCase().includes(query)) {
            matches.push({ type: 'Concept', title: c.title, desc: c.definition, url: `concepts.html#${c.id}` });
          }
        });
      }

      if (matches.length === 0) {
        resultsContainer.innerHTML = '<div style="padding:1rem; color:var(--text-muted);">No results found.</div>';
        return;
      }

      resultsContainer.innerHTML = matches.slice(0, 8).map(m => `
        <a href="${m.url}" class="search-result-item">
          <div>
            <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">${m.title}</div>
            <div style="font-size:0.82rem; color:var(--text-muted);">${m.desc.slice(0, 80)}...</div>
          </div>
          <span class="badge badge-category">${m.type}</span>
        </a>
      `).join('');
    }
  });
})();
