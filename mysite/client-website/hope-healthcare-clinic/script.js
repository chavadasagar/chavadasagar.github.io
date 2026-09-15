document.addEventListener('DOMContentLoaded', () => {
  console.log('Hope Health Care Clinic Website initialized.');

  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }

  // Toast System
  const toast = document.getElementById('toast');
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  };

  // Treatment Filter Tabs
  const tTabBtns = document.querySelectorAll('.t-tab-btn');
  const treatmentCards = document.querySelectorAll('.treatment-card');

  tTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');

      treatmentCards.forEach(card => {
        const cardCat = card.getAttribute('data-cat');
        if (cardCat === targetTab) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Interactive Before & After Range Slider
  const baRange = document.getElementById('baRange');
  const baAfter = document.getElementById('baAfter');

  if (baRange && baAfter) {
    baRange.addEventListener('input', (e) => {
      const val = e.target.value;
      baAfter.style.width = `${val}%`;
    });
  }

  // Treatment "Learn More" Pre-fill
  const tLinks = document.querySelectorAll('.t-link');
  const concernSelect = document.getElementById('concern');

  tLinks.forEach(link => {
    link.addEventListener('click', () => {
      const concernName = link.getAttribute('data-concern');
      showToast(`Selected "${concernName}". Fill in preferred date.`);
    });
  });

  // Clinic Consultation Form Handler
  const clinicForm = document.getElementById('clinicForm');
  if (clinicForm) {
    clinicForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const concern = document.getElementById('concern').value;
      const date = document.getElementById('date').value;
      const notes = document.getElementById('notes').value.trim();

      if (!name || !phone || !concern || !date) {
        showToast('Please fill in required fields (*)');
        return;
      }

      // Generate WhatsApp text
      const waText = encodeURIComponent(
        `*Skin Consultation Request - Hope Health Care Clinic*\n` +
        `👤 *Patient Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `🔬 *Primary Concern:* ${concern}\n` +
        `📅 *Preferred Date:* ${date}\n` +
        `📝 *Details:* ${notes || 'None'}`
      );

      const waUrl = `https://wa.me/919429087654?text=${waText}`;

      showToast('Consultation request ready! Opening WhatsApp...');

      setTimeout(() => {
        window.open(waUrl, '_blank');
        clinicForm.reset();
      }, 1000);
    });
  }
});
