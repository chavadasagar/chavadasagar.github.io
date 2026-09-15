// 3-Column Learning Interface Controller (project.html)
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    const notFoundEl = document.getElementById('project-not-found');
    const learningLayoutEl = document.getElementById('learning-layout');

    if (!projectId || !window.PROJECTS_DATA) {
      showNotFound();
      return;
    }

    const project = window.PROJECTS_DATA.find(p => p.id === projectId);

    if (!project) {
      showNotFound();
      return;
    }

    // Found project! Render layout
    if (notFoundEl) notFoundEl.style.display = 'none';
    if (learningLayoutEl) learningLayoutEl.style.display = 'grid';

    renderProjectHeader(project);
    renderSidebar(project);
    renderLesson('overview', project);

    function showNotFound() {
      if (notFoundEl) notFoundEl.style.display = 'block';
      if (learningLayoutEl) learningLayoutEl.style.display = 'none';
    }
  });

  function renderProjectHeader(project) {
    const titleEl = document.getElementById('project-title');
    const metaEl = document.getElementById('project-meta');
    if (titleEl) titleEl.innerText = `${project.icon} ${project.name}`;
    if (metaEl) {
      metaEl.innerHTML = `
        <span class="badge badge-category">${project.category}</span>
        <span class="badge badge-difficulty">${project.difficulty}</span>
        <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">⏱️ ${project.estimatedTime}</span>
      `;
    }
  }

  function renderSidebar(project) {
    const menuEl = document.getElementById('lesson-menu');
    if (!menuEl) return;

    const lessonsList = [
      { id: 'overview', title: '1. System Overview' },
      { id: 'modules', title: '2. Business Modules' },
      { id: 'er-diagram', title: '3. ER Diagram Visualizer' },
      { id: 'table-explorer', title: '4. Table Explorer' },
      { id: 'design-decisions', title: '5. Design Decisions (Why?)' },
      { id: 'business-rules', title: '6. Business Rules' },
      { id: 'common-mistakes', title: '7. Common Mistakes' },
      { id: 'quiz', title: '8. Practice Quiz' }
    ];

    menuEl.innerHTML = lessonsList.map(l => {
      const isDone = window.isLessonCompleted(project.id, l.id);
      return `
        <div class="lesson-menu-item ${l.id === 'overview' ? 'active' : ''}" data-lesson="${l.id}">
          <span>${l.title}</span>
          <span style="font-size:0.85rem;">${isDone ? '✓' : '⚪'}</span>
        </div>
      `;
    }).join('');

    menuEl.querySelectorAll('.lesson-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        menuEl.querySelectorAll('.lesson-menu-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const lessonId = item.getAttribute('data-lesson');
        renderLesson(lessonId, project);
      });
    });
  }

  function renderLesson(lessonId, project) {
    const mainEl = document.getElementById('lesson-content');
    if (!mainEl) return;

    // Mark completed in LocalStorage progress tracker
    window.markLessonCompleted(project.id, lessonId);

    if (lessonId === 'overview') {
      const les = project.lessons.find(l => l.id === 'overview') || {};
      mainEl.innerHTML = `
        <div class="lesson-header">
          <h1>1. System Overview & Workflows</h1>
          <p class="sub-text">${project.description}</p>
        </div>
        ${les.content || ''}
      `;
    } 
    else if (lessonId === 'modules') {
      mainEl.innerHTML = `
        <div class="lesson-header">
          <h1>2. Business Modules</h1>
          <p class="sub-text">Every enterprise system is divided into functional domain modules:</p>
        </div>
        <div class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
          ${project.modules.map((m, idx) => `
            <div class="comp-box">
              <div class="comp-header">📦 Module ${idx+1}: ${m}</div>
              <p style="font-size:0.88rem; color:var(--text-muted);">Encapsulates entities and business rules relating to ${m.toLowerCase()}.</p>
            </div>
          `).join('')}
        </div>
      `;
    }
    else if (lessonId === 'er-diagram') {
      mainEl.innerHTML = `
        <div class="lesson-header">
          <h1>3. Entity Relationship (ER) Diagram</h1>
          <p class="sub-text">Interactive view of entity relationships for ${project.name}:</p>
        </div>
        <div class="comp-box" style="margin-bottom:1.5rem;">
          <div style="font-weight:700; margin-bottom:0.75rem;">Key Relationships Summary:</div>
          <ul style="padding-left:1.25rem;">
            ${project.relationships.map(r => `<li style="margin-bottom:0.4rem; color:var(--text-muted);"><strong>${r.source} ↔ ${r.target} (${r.type}):</strong> ${r.explanation}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    else if (lessonId === 'table-explorer') {
      mainEl.innerHTML = `
        <div class="lesson-header">
          <h1>4. Table Explorer & Constraints</h1>
          <p class="sub-text">Explore database tables, columns, constraints, and data types:</p>
        </div>
        ${project.tables.map(tbl => `
          <div class="comp-box" style="margin-bottom:2rem;">
            <div style="font-size:1.15rem; font-weight:700; color:var(--accent-cyan); font-family:var(--font-mono); margin-bottom:0.4rem;">
              🗄️ ${tbl.name}
            </div>
            <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">${tbl.purpose}</p>
            <div class="explorer-table-wrap">
              <table class="explorer-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Data Type</th>
                    <th>Constraints</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  ${tbl.columns.map(c => `
                    <tr>
                      <td class="col-mono">${c.name}</td>
                      <td class="type-mono">${c.type}</td>
                      <td>${c.constraints.map(k => `<span class="key-badge ${k.replace(' ', '_')}">${k}</span>`).join('')}</td>
                      <td>${c.description}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      `;
    }
    else if (lessonId === 'design-decisions') {
      mainEl.innerHTML = `
        <div class="lesson-header">
          <h1>5. Architectural Design Decisions</h1>
          <p class="sub-text">Discover why specific database decisions were made:</p>
        </div>
        ${project.designDecisions.map(d => `
          <div style="margin-bottom:2rem;">
            <h3 style="margin-bottom:0.75rem;">💡 ${d.title}</h3>
            <div class="comparison-container">
              <div class="comp-box bad">
                <div class="comp-header">❌ Naive / Bad Design</div>
                <p style="font-size:0.9rem; color:var(--text-muted);">${d.badDesign}</p>
              </div>
              <div class="comp-box better">
                <div class="comp-header">✅ Production / Better Design</div>
                <p style="font-size:0.9rem; color:var(--text-main); font-weight:500;">${d.betterDesign}</p>
              </div>
            </div>
            <p style="font-size:0.92rem; color:var(--text-muted); background:var(--bg-surface); padding:1rem; border-radius:var(--radius-sm); border-left:3px solid var(--accent-cyan);">
              <strong>Why this works better:</strong> ${d.reasoning}
            </p>
          </div>
        `).join('')}
      `;
    }
    else if (lessonId === 'business-rules') {
      mainEl.innerHTML = `
        <div class="lesson-header">
          <h1>6. Business Rules & Enforcement</h1>
          <p class="sub-text">Critical business domain rules and how they are enforced:</p>
        </div>
        ${project.businessRules.map(b => `
          <div class="comp-box" style="margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <span style="font-weight:700; font-size:1.05rem;">📌 ${b.title}</span>
              <span class="badge badge-category">${b.type}</span>
            </div>
            <p style="color:var(--text-muted); font-size:0.92rem;">${b.rule}</p>
          </div>
        `).join('')}
      `;
    }
    else if (lessonId === 'common-mistakes') {
      mainEl.innerHTML = `
        <div class="lesson-header">
          <h1>7. Common Beginner Mistakes</h1>
          <p class="sub-text">Avoid these common database design pitfalls:</p>
        </div>
        ${project.commonMistakes.map(m => `
          <div class="comp-box bad" style="margin-bottom:1.5rem;">
            <div class="comp-header">⚠️ ${m.title}</div>
            <div style="font-family:var(--font-mono); font-size:0.85rem; background:rgba(0,0,0,0.3); padding:0.75rem; border-radius:4px; margin:0.5rem 0; color:#fca5a5;">❌ Bad: ${m.badCode}</div>
            <div style="font-family:var(--font-mono); font-size:0.85rem; background:rgba(0,0,0,0.3); padding:0.75rem; border-radius:4px; margin-bottom:0.5rem; color:#6ee7b7;">✅ Good: ${m.goodCode}</div>
            <p style="font-size:0.88rem; color:var(--text-muted);">${m.explanation}</p>
          </div>
        `).join('')}
      `;
    }
    else if (lessonId === 'quiz') {
      renderProjectQuiz(project, mainEl);
    }
  }

  function renderProjectQuiz(project, mainEl) {
    if (!project.quiz || project.quiz.length === 0) {
      mainEl.innerHTML = '<div class="lesson-header"><h1>8. Practice Quiz</h1><p class="sub-text">No quiz questions configured for this project yet.</p></div>';
      return;
    }

    const q = project.quiz[0];
    mainEl.innerHTML = `
      <div class="lesson-header">
        <h1>8. Course Quiz</h1>
        <p class="sub-text">Test your understanding of ${project.name}:</p>
      </div>
      <div class="comp-box">
        <h3 style="margin-bottom:1rem;">Question 1 of ${project.quiz.length}:</h3>
        <p style="font-size:1.1rem; font-weight:600; margin-bottom:1.25rem;">${q.question}</p>
        <div id="quiz-options-list" style="display:flex; flex-direction:column; gap:0.75rem;">
          ${q.options.map((opt, i) => `
            <button class="btn btn-secondary quiz-opt-btn" data-opt="${i}" style="text-align:left; justify-content:flex-start;">
              ${String.fromCharCode(65 + i)}. ${opt}
            </button>
          `).join('')}
        </div>
        <div id="quiz-feedback" style="margin-top:1.5rem; display:none; padding:1rem; border-radius:var(--radius-sm);"></div>
      </div>
    `;

    mainEl.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = parseInt(btn.getAttribute('data-opt'), 10);
        const feedbackEl = document.getElementById('quiz-feedback');
        if (!feedbackEl) return;

        feedbackEl.style.display = 'block';
        if (selected === q.correct) {
          feedbackEl.style.background = 'rgba(16, 185, 129, 0.15)';
          feedbackEl.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          feedbackEl.style.color = 'var(--accent-emerald)';
          feedbackEl.innerHTML = `<strong>Correct! ✓</strong><p style="margin-top:0.4rem; color:var(--text-main); font-size:0.9rem;">${q.explanation}</p>`;
          window.saveQuizScore(project.id, 1, 1);
        } else {
          feedbackEl.style.background = 'rgba(244, 63, 94, 0.15)';
          feedbackEl.style.border = '1px solid rgba(244, 63, 94, 0.4)';
          feedbackEl.style.color = 'var(--accent-rose)';
          feedbackEl.innerHTML = `<strong>Incorrect ❌</strong><p style="margin-top:0.4rem; color:var(--text-main); font-size:0.9rem;">${q.explanation}</p>`;
        }
      });
    });
  }
})();
