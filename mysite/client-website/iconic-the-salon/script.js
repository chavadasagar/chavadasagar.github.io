document.addEventListener('DOMContentLoaded', () => {
  console.log('iconic the salon Bridal Beauty Timeline Engine initialized.');

  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => navMenu.classList.remove('open'));
    });
  }

  // Toast System
  const toast = document.getElementById('toast');
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  };

  // BRIDAL BEAUTY TIMELINE PLANNER ENGINE
  const weddingDateInput = document.getElementById('weddingDateInput');
  const generateTimelineBtn = document.getElementById('generateTimelineBtn');
  const timelineResults = document.getElementById('timelineResults');
  const countdownBadge = document.getElementById('countdownBadge');
  const saveScheduleBtn = document.getElementById('saveScheduleBtn');

  // Set default date = 45 days from today
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 45);
  if (weddingDateInput) {
    weddingDateInput.value = defaultDate.toISOString().split('T')[0];
  }

  const calculateTimeline = () => {
    if (!weddingDateInput || !weddingDateInput.value) return;

    const selectedDate = new Date(weddingDateInput.value);
    const today = new Date();
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (countdownBadge) {
      if (diffDays > 0) {
        countdownBadge.textContent = `⏳ ${diffDays} Days Remaining until your big day!`;
      } else {
        countdownBadge.textContent = `🎉 Congratulations on your wedding day!`;
      }
    }

    if (timelineResults) {
      timelineResults.style.display = 'block';
    }

    showToast(`Bridal timeline calculated for ${selectedDate.toDateString()} (${diffDays} days away).`);
  };

  if (generateTimelineBtn) {
    generateTimelineBtn.addEventListener('click', calculateTimeline);
  }

  if (saveScheduleBtn) {
    saveScheduleBtn.addEventListener('click', () => {
      const dateVal = weddingDateInput ? weddingDateInput.value : 'Upcoming';
      const waText = encodeURIComponent(
        `*Custom Bridal Schedule Consultation - iconic the salon*\n` +
        `📅 *My Wedding Date:* ${dateVal}\n` +
        `👑 *Requested Schedule:* 30-Day Pre-Bridal Skin Care + HD Airbrush Makeup\n` +
        `Please schedule my consultation and trial slot.`
      );

      const waUrl = `https://wa.me/919724567890?text=${waText}`;
      showToast('Schedule ready! Opening WhatsApp to send to Iconic Studio...');
      setTimeout(() => window.open(waUrl, '_blank'), 1000);
    });
  }

  // Package Card Book Buttons
  document.querySelectorAll('.package-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pkgName = btn.getAttribute('data-package');
      const occasionSelect = document.getElementById('occasion');
      if (occasionSelect) occasionSelect.value = pkgName;

      const bookSection = document.getElementById('book');
      if (bookSection) bookSection.scrollIntoView({ behavior: 'smooth' });

      showToast(`Selected "${pkgName}". Select your wedding date.`);
    });
  });

  // Bridal Form Handler
  const bridalForm = document.getElementById('bridalForm');
  if (bridalForm) {
    bridalForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const occasion = document.getElementById('occasion').value;
      const date = document.getElementById('date').value;

      if (!name || !phone || !occasion || !date) {
        showToast('Please fill in required fields (*)');
        return;
      }

      const waText = encodeURIComponent(
        `*Bridal Consultation Request - iconic the salon*\n` +
        `👰 *Bride Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `👑 *Package / Occasion:* ${occasion}\n` +
        `📅 *Event Date:* ${date}`
      );

      const waUrl = `https://wa.me/919724567890?text=${waText}`;

      showToast('Consultation request ready! Connecting to WhatsApp...');
      setTimeout(() => {
        window.open(waUrl, '_blank');
        bridalForm.reset();
      }, 1000);
    });
  }
});
