(() => {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress span');
  const menuButton = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const themeButton = document.querySelector('.theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');
  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.nav-menu a')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelector('#year').textContent = new Date().getFullYear();

  const savedTheme = localStorage.getItem('portfolio-theme');
  const preferredTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  setTheme(savedTheme || preferredTheme);

  themeButton.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portfolio-theme', next);
  });

  function setTheme(theme) {
    root.dataset.theme = theme;
    themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
    themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  }

  menuButton.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  navLinks.forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', event => {
    if (!navMenu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });

  function closeMenu() {
    navMenu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
  }

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.style.setProperty('--delay', `${entry.target.dataset.delay || 0}ms`);
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => {
    if (reduceMotion) el.classList.add('visible');
    else revealObserver.observe(el);
  });

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 14);

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (y / scrollable) * 100 : 0;
    progress.style.width = `${Math.min(100, percent)}%`;

    let current = sections[0]?.id || '';
    for (const section of sections) {
      if (y >= section.offsetTop - 180) current = section.id;
    }
    navLinks.forEach(link => link.classList.toggle('active', link.hash === `#${current}`));
  }

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const resumeUrl = 'https://chavadasagar.github.io/mysite/resume/Sagar_Chavda_Resume.pdf';
  const dialog = document.querySelector('#resumeDialog');
  const frame = document.querySelector('#resumeFrame');
  const loader = document.querySelector('#resumeLoader');
  const closeResume = document.querySelector('#closeResume');

  document.querySelectorAll('[data-resume]').forEach(link => {
    link.addEventListener('click', event => {
      if (!dialog?.showModal || window.innerWidth < 720) return;
      event.preventDefault();
      loader.style.display = 'grid';
      frame.src = resumeUrl;
      dialog.showModal();
    });
  });

  frame.addEventListener('load', () => { loader.style.display = 'none'; });
  closeResume.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });
  dialog.addEventListener('close', () => {
    frame.removeAttribute('src');
    loader.style.display = 'grid';
  });
})();
