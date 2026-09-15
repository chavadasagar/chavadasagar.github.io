document.addEventListener('DOMContentLoaded', () => {
  console.log('DKs Unisex Salon Style Quiz Engine initialized.');

  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => navMenu.classList.remove('open'));
    });
  }

  // Toast Function
  const toast = document.getElementById('toast');
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  };

  // STYLE & LOOK FINDER QUIZ ENGINE
  const quizData = {
    hair: {
      options: [
        { label: '💆‍♀️ Dry, Frizzy & Damaged Hair', title: 'Kérastase Deep Hair Spa', desc: 'Nourishing botanical mask therapy with steam scalp massage.', price: '₹ 1,499' },
        { label: '✨ Unruly & Curly Hair', title: 'Keratin & Smoothening Treatment', desc: 'Formaldehyde-free protein smoothing for zero frizz.', price: '₹ 3,999' },
        { label: '✂️ Routine Haircut & Styling', title: 'Signature Haircut & Blowout', desc: 'Custom face-shaped precision haircut and styling.', price: '₹ 499' }
      ]
    },
    skin: {
      options: [
        { label: '🌊 Dullness & Clogged Pores', title: 'Hydrafacial & Oxy Glow', desc: 'Deep pore vacuum extraction & antioxidant LED therapy.', price: '₹ 2,499' },
        { label: '✨ Sun Tan & Uneven Tone', title: 'Vitamin C Brightening Facial', desc: 'Organic fruit enzyme peel for radiant skin glow.', price: '₹ 1,899' }
      ]
    },
    makeup: {
      options: [
        { label: '👰 Wedding Day Bridal Look', title: 'HD Airbrush Bridal Makeover', desc: 'Waterproof airbrush base, luxury hair styling & lashes.', price: '₹ 9,999' },
        { label: '💄 Party / Engagement Event', title: 'Glamorous Party Makeup', desc: 'High-definition event makeup & saree draping.', price: '₹ 3,499' }
      ]
    }
  };

  let selectedCategory = 'hair';
  let selectedRecommendation = null;

  const quizStep1Btns = document.querySelectorAll('#quizStep1 .quiz-option-btn');
  const quizStep2Options = document.getElementById('quizStep2Options');
  const quizStep1 = document.getElementById('quizStep1');
  const quizStep2 = document.getElementById('quizStep2');
  const quizResultStep = document.getElementById('quizResultStep');

  quizStep1Btns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.getAttribute('data-val') || 'hair';
      
      // Populate Step 2
      if (quizStep2Options) {
        quizStep2Options.innerHTML = '';
        const catData = quizData[selectedCategory] || quizData.hair;

        catData.options.forEach((opt, idx) => {
          const optBtn = document.createElement('button');
          optBtn.className = 'quiz-option-btn';
          optBtn.textContent = opt.label;
          optBtn.addEventListener('click', () => {
            selectedRecommendation = opt;
            showRecommendation(opt);
          });
          quizStep2Options.appendChild(optBtn);
        });
      }

      quizStep1.classList.remove('active');
      quizStep2.classList.add('active');
    });
  });

  const showRecommendation = (opt) => {
    quizStep2.classList.remove('active');
    quizResultStep.classList.add('active');

    document.getElementById('quizResultTitle').textContent = opt.title;
    document.getElementById('quizResultDesc').textContent = opt.desc;
    document.getElementById('quizResultPrice').textContent = opt.price;

    showToast(`Recommended: ${opt.title} (${opt.price})`);
  };

  const quizBookBtn = document.getElementById('quizBookBtn');
  if (quizBookBtn) {
    quizBookBtn.addEventListener('click', () => {
      if (selectedRecommendation) {
        const serviceSelect = document.getElementById('service');
        if (serviceSelect) {
          // If option exists in dropdown select it, else set custom value
          serviceSelect.value = selectedRecommendation.title;
        }
      }
      const bookSection = document.getElementById('book');
      if (bookSection) bookSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Service Tabs Filter
  const tabPills = document.querySelectorAll('.tab-pill');
  const serviceCards = document.querySelectorAll('.service-card');

  tabPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tabPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const targetCategory = pill.getAttribute('data-tab');

      serviceCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        card.style.display = (cardCategory === targetCategory) ? 'flex' : 'none';
      });
    });
  });

  // Appointment Form
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const service = document.getElementById('service').value;
      const date = document.getElementById('date').value;
      const time = document.getElementById('time').value;

      if (!name || !phone || !service || !date) {
        showToast('Please fill in required fields (*)');
        return;
      }

      const waText = encodeURIComponent(
        `*Salon Appointment Request - DKs Unisex Salon*\n` +
        `👤 *Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `💇 *Service:* ${service}\n` +
        `📅 *Date:* ${date}\n` +
        `⏰ *Time Slot:* ${time}`
      );

      const waUrl = `https://wa.me/919898912345?text=${waText}`;

      showToast('Appointment request ready! Opening WhatsApp...');
      setTimeout(() => {
        window.open(waUrl, '_blank');
        bookingForm.reset();
      }, 1000);
    });
  }
});
