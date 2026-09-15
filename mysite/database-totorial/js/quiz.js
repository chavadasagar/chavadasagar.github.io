// Global Masterclass Quiz Controller (quiz.html)
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const quizContainer = document.getElementById('global-quiz-container');
    if (!quizContainer || !window.QUIZ_DATA) return;

    let currentScore = 0;
    let answeredCount = 0;

    quizContainer.innerHTML = `
      <div style="margin-bottom:2rem; padding:1.25rem; background:var(--bg-surface); border-radius:var(--radius-md); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="margin-bottom:0.25rem;">Global Database Design Masterclass Quiz</h3>
          <p style="color:var(--text-muted); font-size:0.9rem;">Test your knowledge of primary keys, foreign keys, relationships, normalization, and indexing.</p>
        </div>
        <div style="font-size:1.25rem; font-weight:800; color:var(--accent-cyan);" id="quiz-live-score">Score: 0 / ${window.QUIZ_DATA.length}</div>
      </div>
      <div id="quiz-questions-list">
        ${window.QUIZ_DATA.map((q, qIdx) => `
          <div class="comp-box" style="margin-bottom:2rem;" id="q-box-${qIdx}">
            <h4 style="margin-bottom:1rem;">Question ${qIdx + 1}: ${q.question}</h4>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${q.options.map((opt, oIdx) => `
                <button class="btn btn-secondary global-opt-btn" data-q="${qIdx}" data-o="${oIdx}" style="text-align:left; justify-content:flex-start;">
                  ${String.fromCharCode(65 + oIdx)}. ${opt}
                </button>
              `).join('')}
            </div>
            <div class="global-feedback" id="feedback-${qIdx}" style="margin-top:1.25rem; display:none; padding:1rem; border-radius:var(--radius-sm);"></div>
          </div>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('.global-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qIdx = parseInt(btn.getAttribute('data-q'), 10);
        const oIdx = parseInt(btn.getAttribute('data-o'), 10);
        const q = window.QUIZ_DATA[qIdx];
        const box = document.getElementById(`q-box-${qIdx}`);
        const feedback = document.getElementById(`feedback-${qIdx}`);

        // Disable all options for this question
        box.querySelectorAll('.global-opt-btn').forEach(b => b.disabled = true);

        feedback.style.display = 'block';
        if (oIdx === q.correct) {
          currentScore++;
          feedback.style.background = 'rgba(16, 185, 129, 0.15)';
          feedback.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          feedback.style.color = 'var(--accent-emerald)';
          feedback.innerHTML = `<strong>Correct! ✓</strong><p style="margin-top:0.4rem; color:var(--text-main); font-size:0.9rem;">${q.explanation}</p>`;
        } else {
          feedback.style.background = 'rgba(244, 63, 94, 0.15)';
          feedback.style.border = '1px solid rgba(244, 63, 94, 0.4)';
          feedback.style.color = 'var(--accent-rose)';
          feedback.innerHTML = `<strong>Incorrect ❌</strong><p style="margin-top:0.4rem; color:var(--text-main); font-size:0.9rem;">${q.explanation}</p>`;
        }

        answeredCount++;
        document.getElementById('quiz-live-score').innerText = `Score: ${currentScore} / ${window.QUIZ_DATA.length}`;
      });
    });
  });
})();
