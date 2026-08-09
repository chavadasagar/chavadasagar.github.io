/**
 * Progress Tracking & Bookmarks Storage Manager
 */
window.TutorialStorage = {
  COMPLETED_KEY: 'tutorialstudio_completed_topics',
  BOOKMARKS_KEY: 'tutorialstudio_bookmarks',
  RECENT_KEY: 'tutorialstudio_recent_topics',

  getCompleted() {
    try {
      return JSON.parse(localStorage.getItem(this.COMPLETED_KEY)) || {};
    } catch {
      return {};
    }
  },

  isCompleted(topicId) {
    const data = this.getCompleted();
    return !!data[topicId];
  },

  toggleCompleted(topicId, subjectSlug) {
    const data = this.getCompleted();
    if (data[topicId]) {
      delete data[topicId];
    } else {
      data[topicId] = {
        subjectSlug: subjectSlug,
        completedAt: new Date().toISOString()
      };
    }
    localStorage.setItem(this.COMPLETED_KEY, JSON.stringify(data));
    return !!data[topicId];
  },

  getSubjectProgress(subjectSlug, totalTopics) {
    if (!totalTopics || totalTopics === 0) return 0;
    const data = this.getCompleted();
    let count = 0;
    for (let key in data) {
      if (data[key].subjectSlug === subjectSlug) {
        count++;
      }
    }
    return Math.min(100, Math.round((count / totalTopics) * 100));
  },

  getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(this.BOOKMARKS_KEY)) || [];
    } catch {
      return [];
    }
  },

  isBookmarked(topicId) {
    const list = this.getBookmarks();
    return list.some(b => b.topicId === topicId);
  },

  toggleBookmark(topic) {
    let list = this.getBookmarks();
    const idx = list.findIndex(b => b.topicId === topic.topic_id);
    let bookmarked = false;
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.unshift({
        topicId: topic.topic_id,
        title: topic.title,
        subjectSlug: topic.subject_slug,
        subject: topic.subject,
        category: topic.category,
        savedAt: new Date().toISOString()
      });
      bookmarked = true;
      if (list.length > 50) list.pop();
    }
    localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(list));
    return bookmarked;
  },

  saveRecentTopic(topic) {
    if (!topic || !topic.topic_id) return;
    try {
      let recents = JSON.parse(localStorage.getItem(this.RECENT_KEY)) || [];
      recents = recents.filter(r => r.topicId !== topic.topic_id);
      recents.unshift({
        topicId: topic.topic_id,
        title: topic.title,
        subjectSlug: topic.subject_slug,
        subject: topic.subject,
        category: topic.category,
        visitedAt: new Date().toISOString()
      });
      if (recents.length > 10) recents.pop();
      localStorage.setItem(this.RECENT_KEY, JSON.stringify(recents));
    } catch (e) {
      console.error(e);
    }
  },

  getLastRecentTopic() {
    try {
      const recents = JSON.parse(localStorage.getItem(this.RECENT_KEY)) || [];
      return recents.length > 0 ? recents[0] : null;
    } catch {
      return null;
    }
  }
};
