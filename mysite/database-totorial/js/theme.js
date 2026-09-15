// Theme Switcher & Persistence (Dark / Light Mode)
(function() {
  const currentTheme = localStorage.getItem('db_masterclass_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  window.toggleTheme = function() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('db_masterclass_theme', theme);
    updateThemeIcon();
  };

  function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      const theme = document.documentElement.getAttribute('data-theme');
      btn.innerHTML = theme === 'dark' ? '🌙' : '☀️';
      btn.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`;
    }
  }

  document.addEventListener('DOMContentLoaded', updateThemeIcon);
})();
