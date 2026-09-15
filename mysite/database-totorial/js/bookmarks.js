// Bookmarks Manager (Lessons & Tables)
(function() {
  const STORAGE_KEY = 'db_masterclass_bookmarks';

  window.getBookmarks = function() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch(e) {
      return [];
    }
  };

  window.toggleBookmark = function(item) {
    let bookmarks = window.getBookmarks();
    const idx = bookmarks.findIndex(b => b.id === item.id);
    
    if (idx > -1) {
      bookmarks.splice(idx, 1);
      window.showToast("Bookmark removed");
    } else {
      bookmarks.push(item);
      window.showToast("Saved to Bookmarks! ⭐");
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  };

  window.isBookmarked = function(id) {
    const bookmarks = window.getBookmarks();
    return bookmarks.some(b => b.id === id);
  };
})();
