// Database Tutorial Studio - Client Application Controller

(function() {
  // State variables
  let currentLang = localStorage.getItem('db_tutorial_lang') || 'hi';
  let activeCategory = 'ALL';
  let searchQuery = '';
  let activeProject = null;

  // DOM Elements
  const elLangHi = document.getElementById('lang-hi');
  const elLangEn = document.getElementById('lang-en');
  const elSearchInput = document.getElementById('search-input');
  const elFilterPills = document.getElementById('filter-pills');
  const elProjectsGrid = document.getElementById('projects-grid');
  const elProjectCount = document.getElementById('project-count');
  
  // Modal Elements
  const elModalOverlay = document.getElementById('modal-overlay');
  const elModalClose = document.getElementById('modal-close');
  const elModalTitle = document.getElementById('modal-title');
  const elModalTagline = document.getElementById('modal-tagline');
  const elModalCategory = document.getElementById('modal-category');
  const elModalTargetDB = document.getElementById('modal-target-db');
  
  // Tab Panes
  const elTabBtns = document.querySelectorAll('.tab-btn');
  const elPaneOverview = document.getElementById('pane-overview');
  const elPaneSchema = document.getElementById('pane-schema');
  const elPaneSql = document.getElementById('pane-sql');
  const elPaneQueries = document.getElementById('pane-queries');
  const elPaneBestPractices = document.getElementById('pane-best-practices');

  // UI Translation strings
  const UI_TEXT = {
    hi: {
      heroBadge: "⚡ 12 Real-World Projects DB Design",
      heroTitle: "Master Production Database Designs <span>Hinglish & English</span>",
      heroDesc: "System design, SQL schemas, ER diagrams, indexes, and concurrency logic for 12 industry-grade projects.",
      searchPlaceholder: "Search table names, columns, concepts (e.g. seat_locks, SKU, BCrypt, order_status)...",
      gridTitle: "Project DB Designs",
      viewBtn: "View DB Design →",
      tabOverview: "Overview & ER Diagram",
      tabSchema: "Schema Deep-Dive",
      tabSql: "Production SQL",
      tabQueries: "Key SQL Queries",
      tabBestPractices: "Best Practices & Edge Cases",
      architectureHeading: "Architecture & System Scope",
      erHeading: "Entity Relationship (ER) Diagram",
      copyBtn: "Copy SQL",
      copiedBtn: "Copied! ✓",
      colName: "Column Name",
      colType: "Data Type",
      colKey: "Keys",
      colNull: "Nullable",
      colDefault: "Default",
      colDesc: "Explanation",
      noResults: "No matching project DB designs found. Try another search term."
    },
    en: {
      heroBadge: "⚡ 12 Real-World Projects DB Design",
      heroTitle: "Master Production Database Designs <span>Hinglish & English</span>",
      heroDesc: "System design, SQL schemas, ER diagrams, indexes, and concurrency logic for 12 industry-grade projects.",
      searchPlaceholder: "Search table names, columns, concepts (e.g. seat_locks, SKU, BCrypt, order_status)...",
      gridTitle: "Project DB Designs",
      viewBtn: "View DB Design →",
      tabOverview: "Overview & ER Diagram",
      tabSchema: "Schema Deep-Dive",
      tabSql: "Production SQL",
      tabQueries: "Key SQL Queries",
      tabBestPractices: "Best Practices & Edge Cases",
      architectureHeading: "Architecture & System Scope",
      erHeading: "Entity Relationship (ER) Diagram",
      copyBtn: "Copy SQL",
      copiedBtn: "Copied! ✓",
      colName: "Column Name",
      colType: "Data Type",
      colKey: "Keys",
      colNull: "Nullable",
      colDefault: "Default",
      colDesc: "Explanation",
      noResults: "No matching project DB designs found. Try another search term."
    }
  };

  // Initialize App
  function init() {
    setupEventListeners();
    updateLangUI();
    renderProjects();
  }

  // Set up UI Event Listeners
  function setupEventListeners() {
    // Language buttons
    elLangHi.addEventListener('click', () => switchLanguage('hi'));
    elLangEn.addEventListener('click', () => switchLanguage('en'));

    // Search Input
    elSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderProjects();
    });

    // Category Filter Pills
    elFilterPills.addEventListener('click', (e) => {
      if (e.target.classList.contains('pill')) {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        activeCategory = e.target.getAttribute('data-cat');
        renderProjects();
      }
    });

    // Modal Close
    elModalClose.addEventListener('click', closeModal);
    elModalOverlay.addEventListener('click', (e) => {
      if (e.target === elModalOverlay) closeModal();
    });

    // ESC Key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Modal Tabs
    elTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const targetTab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`pane-${targetTab}`).classList.add('active');

        // Re-render Mermaid if overview tab selected
        if (targetTab === 'overview' && window.mermaid && activeProject) {
          setTimeout(renderMermaid, 50);
        }
      });
    });
  }

  // Switch Language
  function switchLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('db_tutorial_lang', lang);
    
    if (lang === 'hi') {
      elLangHi.classList.add('active');
      elLangEn.classList.remove('active');
    } else {
      elLangEn.classList.add('active');
      elLangHi.classList.remove('active');
    }

    updateLangUI();
    renderProjects();
    if (activeProject) {
      populateModal(activeProject);
    }
  }

  // Update static UI text labels according to selected language
  function updateLangUI() {
    const t = UI_TEXT[currentLang];
    document.getElementById('ui-hero-badge').innerHTML = t.heroBadge;
    document.getElementById('ui-hero-title').innerHTML = t.heroTitle;
    document.getElementById('ui-hero-desc').innerText = t.heroDesc;
    elSearchInput.placeholder = t.searchPlaceholder;
    document.getElementById('ui-grid-title').innerText = t.gridTitle;

    // Modal Tabs
    document.getElementById('ui-tab-overview').innerText = t.tabOverview;
    document.getElementById('ui-tab-schema').innerText = t.tabSchema;
    document.getElementById('ui-tab-sql').innerText = t.tabSql;
    document.getElementById('ui-tab-queries').innerText = t.tabQueries;
    document.getElementById('ui-tab-best-practices').innerText = t.tabBestPractices;
  }

  // Filter projects based on search query & category
  function getFilteredProjects() {
    const data = window.PROJECT_DB_DATA || [];
    return data.filter(proj => {
      // Category check
      if (activeCategory !== 'ALL' && proj.category.toUpperCase() !== activeCategory) {
        return false;
      }

      // Search check
      if (searchQuery) {
        const titleEn = proj.title.en.toLowerCase();
        const titleHi = proj.title.hi.toLowerCase();
        const tagEn = proj.tagline.en.toLowerCase();
        const tagHi = proj.tagline.hi.toLowerCase();
        const overviewEn = proj.overview.en.toLowerCase();
        const overviewHi = proj.overview.hi.toLowerCase();
        const cat = proj.category.toLowerCase();
        const target = proj.targetDB.toLowerCase();
        
        // Search inside table names & column names
        const tableMatch = proj.tables.some(tbl => 
          tbl.name.toLowerCase().includes(searchQuery) ||
          tbl.columns.some(col => col.name.toLowerCase().includes(searchQuery))
        );

        const textMatch = titleEn.includes(searchQuery) || titleHi.includes(searchQuery) ||
                          tagEn.includes(searchQuery) || tagHi.includes(searchQuery) ||
                          overviewEn.includes(searchQuery) || overviewHi.includes(searchQuery) ||
                          cat.includes(searchQuery) || target.includes(searchQuery);

        return textMatch || tableMatch;
      }

      return true;
    });
  }

  // Render Projects Grid
  function renderProjects() {
    const filtered = getFilteredProjects();
    const t = UI_TEXT[currentLang];
    elProjectCount.innerText = filtered.length;

    if (filtered.length === 0) {
      elProjectsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <svg style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-dim);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p>${t.noResults}</p>
        </div>
      `;
      return;
    }

    elProjectsGrid.innerHTML = filtered.map(proj => {
      const title = proj.title[currentLang] || proj.title.en;
      const tagline = proj.tagline[currentLang] || proj.tagline.en;

      return `
        <div class="project-card" data-id="${proj.id}">
          <div class="card-top">
            <div class="card-meta">
              <span class="badge-cat">${proj.category}</span>
              <span class="badge-db">${proj.targetDB}</span>
            </div>
            <h3>${title}</h3>
            <p>${tagline}</p>
          </div>
          <div class="card-bottom">
            <span class="tables-count">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
              ${proj.tables.length} Tables
            </span>
            <span class="view-btn">${t.viewBtn}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards
    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const projId = card.getAttribute('data-id');
        const proj = window.PROJECT_DB_DATA.find(p => p.id === projId);
        if (proj) openModal(proj);
      });
    });
  }

  // Open Detail Modal
  function openModal(proj) {
    activeProject = proj;
    populateModal(proj);
    elModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Default to Overview tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="overview"]').classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    elPaneOverview.classList.add('active');

    // Render Mermaid Diagram
    setTimeout(renderMermaid, 100);
  }

  // Close Modal
  function closeModal() {
    elModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    activeProject = null;
  }

  // Populate Modal Content
  function populateModal(proj) {
    const t = UI_TEXT[currentLang];
    
    elModalTitle.innerText = proj.title[currentLang] || proj.title.en;
    elModalTagline.innerText = proj.tagline[currentLang] || proj.tagline.en;
    elModalCategory.innerText = proj.category;
    elModalTargetDB.innerText = proj.targetDB;

    // Tab 1: Overview & ER Diagram
    const overviewText = proj.overview[currentLang] || proj.overview.en;
    const archText = proj.architecture[currentLang] || proj.architecture.en;

    elPaneOverview.innerHTML = `
      <div class="info-card">
        <h4>System Overview</h4>
        <p>${overviewText}</p>
      </div>
      <div class="info-card">
        <h4>${t.architectureHeading}</h4>
        <p>${archText}</p>
      </div>
      <div class="info-card">
        <h4>${t.erHeading}</h4>
        <div class="mermaid-wrapper">
          <div class="mermaid" id="mermaid-container">${proj.mermaid}</div>
        </div>
      </div>
    `;

    // Tab 2: Schema Deep-Dive Tables
    elPaneSchema.innerHTML = proj.tables.map(tbl => {
      const tblDesc = tbl.description[currentLang] || tbl.description.en;
      
      const rowsHtml = tbl.columns.map(col => {
        const colDesc = col.desc[currentLang] || col.desc.en;
        const keyBadge = col.key ? `<span class="key-badge ${col.key}">${col.key}</span>` : '-';

        return `
          <tr>
            <td class="col-name">${col.name}</td>
            <td class="col-type">${col.type}</td>
            <td>${keyBadge}</td>
            <td>${col.nullable}</td>
            <td><code>${col.defaultVal}</code></td>
            <td>${col.desc ? colDesc : '-'}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="schema-block">
          <div class="schema-title">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            ${tbl.name}
          </div>
          <p class="schema-desc">${tblDesc}</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>${t.colName}</th>
                  <th>${t.colType}</th>
                  <th>${t.colKey}</th>
                  <th>${t.colNull}</th>
                  <th>${t.colDefault}</th>
                  <th>${t.colDesc}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    // Tab 3: Production SQL
    elPaneSql.innerHTML = `
      <div class="code-container">
        <div class="code-header">
          <span>${proj.id}_schema.sql</span>
          <button class="copy-btn" onclick="window.copyToClipboard(this, \`${escapeJsString(proj.sql)}\`)">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            ${t.copyBtn}
          </button>
        </div>
        <pre><code>${escapeHtml(proj.sql)}</code></pre>
      </div>
    `;

    // Tab 4: Key Business Queries
    elPaneQueries.innerHTML = proj.queries.map(q => {
      const qTitle = q.title[currentLang] || q.title.en;
      const qExp = q.explanation[currentLang] || q.explanation.en;

      return `
        <div class="info-card">
          <h4>${qTitle}</h4>
          <p style="margin-bottom: 0.8rem; color: var(--text-muted);">${qExp}</p>
          <div class="code-container">
            <div class="code-header">
              <span>SQL Query</span>
              <button class="copy-btn" onclick="window.copyToClipboard(this, \`${escapeJsString(q.sql)}\`)">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                ${t.copyBtn}
              </button>
            </div>
            <pre><code>${escapeHtml(q.sql)}</code></pre>
          </div>
        </div>
      `;
    }).join('');

    // Tab 5: Best Practices & Edge Cases
    const bpList = proj.bestPractices[currentLang] || proj.bestPractices.en || [];
    const ecList = proj.edgeCases[currentLang] || proj.edgeCases.en || [];

    elPaneBestPractices.innerHTML = `
      <div class="info-card">
        <h4>Best Practices & Indexing Strategy</h4>
        <ul>
          ${bpList.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
      <div class="info-card">
        <h4>Edge Cases & System Design Pitfalls</h4>
        <ul>
          ${ecList.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Render Mermaid ER Diagram
  function renderMermaid() {
    if (window.mermaid) {
      try {
        window.mermaid.contentLoaded();
      } catch(e) {
        console.log("Mermaid init:", e);
      }
    }
  }

  // Copy to Clipboard Utility
  window.copyToClipboard = function(btnEl, text) {
    navigator.clipboard.writeText(text).then(() => {
      const origText = btnEl.innerText;
      btnEl.innerText = UI_TEXT[currentLang].copiedBtn;
      btnEl.style.borderColor = 'var(--accent-teal)';
      btnEl.style.color = 'var(--accent-teal)';
      setTimeout(() => {
        btnEl.innerText = origText;
        btnEl.style.borderColor = '';
        btnEl.style.color = '';
      }, 2000);
    });
  };

  // Helper escape HTML
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper escape JS string
  function escapeJsString(str) {
    return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
  }

  // Run on DOM loaded
  document.addEventListener('DOMContentLoaded', init);
})();
