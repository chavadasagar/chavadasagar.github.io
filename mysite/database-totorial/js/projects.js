// All Projects Page Controller (Filtering & Search)
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('all-projects-grid');
    const searchInput = document.getElementById('projects-search');
    const filterPills = document.getElementById('projects-filter-pills');
    const projectCountEl = document.getElementById('projects-count');

    if (!grid || !window.PROJECTS_DATA) return;

    let activeFilter = 'ALL';
    let searchQuery = '';

    function render() {
      const filtered = window.PROJECTS_DATA.filter(p => {
        // Filter check
        if (activeFilter !== 'ALL') {
          const cat = p.category.toUpperCase();
          const diff = p.difficulty.toUpperCase();
          if (cat !== activeFilter && diff !== activeFilter) return false;
        }

        // Search check
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const nameMatch = p.name.toLowerCase().includes(q);
          const descMatch = p.description.toLowerCase().includes(q);
          const moduleMatch = p.modules.some(m => m.toLowerCase().includes(q));
          const tableMatch = p.tables.some(t => t.name.toLowerCase().includes(q));
          return nameMatch || descMatch || moduleMatch || tableMatch;
        }

        return true;
      });

      if (projectCountEl) projectCountEl.innerText = filtered.length;

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">No matching projects found. Try another search or filter.</div>';
        return;
      }

      grid.innerHTML = filtered.map(p => `
        <div class="card">
          <div>
            <div class="card-icon">${p.icon}</div>
            <div style="display:flex; gap:6px; margin-bottom:0.5rem;">
              <span class="badge badge-category">${p.category}</span>
              <span class="badge badge-difficulty">${p.difficulty}</span>
            </div>
            <h3 class="card-title">${p.name}</h3>
            <p class="card-desc">${p.description}</p>
          </div>
          <div>
            <div class="card-meta">
              <span>📋 ${p.modules.length} Modules</span>
              <span>🗄️ ${p.tables.length} Tables</span>
              <span>⏱️ ${p.estimatedTime}</span>
            </div>
            <a href="project.html?id=${p.id}" class="btn btn-primary btn-sm" style="width:100%; margin-top:1.25rem;">Start Learning →</a>
          </div>
        </div>
      `).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    if (filterPills) {
      filterPills.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill')) {
          filterPills.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
          e.target.classList.add('active');
          activeFilter = e.target.getAttribute('data-filter').toUpperCase();
          render();
        }
      });
    }

    render();
  });
})();
