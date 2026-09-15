document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('siteHeader');
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const sections = [...document.querySelectorAll('main section[id]')];

  const setHeaderState = () => header?.classList.toggle('scrolled', window.scrollY > 18);
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  const closeMenu = () => {
    menuToggle?.classList.remove('open');
    navMenu?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    document.body.classList.remove('menu-open');
  };

  menuToggle?.addEventListener('click', () => {
    const willOpen = !navMenu.classList.contains('open');
    menuToggle.classList.toggle('open', willOpen);
    navMenu.classList.toggle('open', willOpen);
    menuToggle.setAttribute('aria-expanded', String(willOpen));
    menuToggle.setAttribute('aria-label', willOpen ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('menu-open', willOpen);
  });

  document.querySelectorAll('#navMenu a').forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px' });

    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-25% 0px -62% 0px', threshold: 0 });

    sections.forEach(section => sectionObserver.observe(section));
  } else {
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('revealed'));
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  const emailAddress = 'sagarchavada80@gmail.com';

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const fields = ['name', 'email', 'subject', 'message'].map(id => document.getElementById(id));
    fields.forEach(field => field.classList.remove('invalid'));

    const invalidFields = fields.filter(field => !field.value.trim() || (field.type === 'email' && !field.validity.valid));
    if (invalidFields.length) {
      invalidFields.forEach(field => field.classList.add('invalid'));
      note.textContent = 'Please complete all fields with a valid email address.';
      note.className = 'form-note error';
      invalidFields[0].focus();
      return;
    }

    const [name, email, subject, message] = fields.map(field => field.value.trim());
    const mailSubject = `Project enquiry — ${subject}`;
    const mailBody = [
      `Hi Sagar,`,
      ``,
      `I'm ${name} (${email}).`,
      ``,
      `Service: ${subject}`,
      ``,
      `Project brief:`,
      message,
      ``,
      `Regards,`,
      name
    ].join('\n');

    note.textContent = 'Opening your email app with the details pre-filled…';
    note.className = 'form-note success';
    window.location.href = `mailto:${emailAddress}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
  });

  const copyEmail = document.getElementById('copyEmail');
  copyEmail?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(emailAddress);
      copyEmail.textContent = 'Email copied ✓';
      setTimeout(() => { copyEmail.textContent = 'Copy email address'; }, 1800);
    } catch {
      window.prompt('Copy this email address:', emailAddress);
    }
  });

  const canvas = document.getElementById('particle-canvas');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let points = [];
  let animationFrame = null;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(48, Math.max(20, Math.floor(width / 28)));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * .11,
      vy: (Math.random() - .5) * .11,
      r: Math.random() * 1.2 + .4
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    for (const point of points) {
      point.x += point.vx;
      point.y += point.vy;
      if (point.x < -10) point.x = width + 10;
      if (point.x > width + 10) point.x = -10;
      if (point.y < -10) point.y = height + 10;
      if (point.y > height + 10) point.y = -10;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(111, 197, 224, .24)';
      ctx.fill();
    }
    animationFrame = requestAnimationFrame(draw);
  };

  resize();
  draw();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animationFrame);
    else draw();
  });
});
