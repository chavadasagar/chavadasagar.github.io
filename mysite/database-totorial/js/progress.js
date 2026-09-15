// Course Learning Progress & LocalStorage Tracker
(function() {
  const STORAGE_KEY = 'db_masterclass_progress';

  window.getProgressData = function() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { completedLessons: {}, quizScores: {} };
    } catch(e) {
      return { completedLessons: {}, quizScores: {} };
    }
  };

  window.markLessonCompleted = function(projectId, lessonId) {
    const data = window.getProgressData();
    if (!data.completedLessons[projectId]) {
      data.completedLessons[projectId] = [];
    }
    if (!data.completedLessons[projectId].includes(lessonId)) {
      data.completedLessons[projectId].push(lessonId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.showToast("Lesson completed! ✓");
    }
  };

  window.isLessonCompleted = function(projectId, lessonId) {
    const data = window.getProgressData();
    return data.completedLessons[projectId] && data.completedLessons[projectId].includes(lessonId);
  };

  window.saveQuizScore = function(projectId, score, total) {
    const data = window.getProgressData();
    data.quizScores[projectId] = { score, total, date: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };
})();
