// Interactive HTML/SVG Entity-Relationship Diagram Visualizer
(function() {
  window.renderInteractiveDiagram = function(containerId, nodes) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; gap:2rem; flex-wrap:wrap; padding:2rem; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md);">
        ${nodes.map(n => `
          <div class="comp-box" style="min-width:180px; text-align:center; cursor:pointer;" onclick="alert('Entity: ${n.name}')">
            <div style="font-weight:800; font-size:1.1rem; color:var(--accent-cyan);">${n.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${n.type || 'Entity'}</div>
          </div>
        `).join('<div style="font-size:1.5rem; color:var(--accent-purple);">➔</div>')}
      </div>
    `;
  };
})();
