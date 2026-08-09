/**
 * Cheatsheets View Controller for TutorialStudio
 */
document.addEventListener('DOMContentLoaded', () => {
  const data = window.TUTORIAL_CHEATSHEETS || [];
  const grid = document.getElementById('cheatsheetsGrid');
  const tabs = document.querySelectorAll('.category-tab');

  function render(filter = 'all') {
    if (!grid) return;

    const filtered = filter === 'all' 
      ? data 
      : data.filter(c => c.id === filter || c.category.toLowerCase().includes(filter.toLowerCase()));

    grid.innerHTML = filtered.map(sheet => `
      <div class="category-card" style="margin-bottom: 2rem;">
        <div class="cat-header">
          <h3 style="font-size: 1.35rem; font-weight: 700;">${sheet.title}</h3>
          <span class="badge badge-primary">${sheet.category}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
          ${sheet.sections.map(sec => `
            <div style="background: var(--bg-code); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem; color: #818CF8; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.5rem;">
                ${sec.title}
              </h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${sec.items.map(item => `
                  <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                      <code style="color: #38BDF8; font-size: 0.85rem; background: rgba(0,0,0,0.3); padding: 0.2rem 0.5rem; border-radius: 4px; word-break: break-all;">
                        ${escapeHtml(item.name)}
                      </code>
                      <button class="code-btn btn-copy-cheat" data-copy="${escapeHtml(item.name)}" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;">
                        Copy
                      </button>
                    </div>
                    <span style="font-size: 0.775rem; color: var(--text-muted);">${escapeHtml(item.desc)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-copy-cheat').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-copy');
        navigator.clipboard.writeText(text).then(() => {
          window.showToast('Copied to clipboard!', 'success');
        });
      });
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      render(tab.getAttribute('data-filter') || 'all');
    });
  });

  render('all');

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
