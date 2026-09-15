document.addEventListener('DOMContentLoaded', () => {
  console.log('Shreejibapa Clinic Symptom Navigator Engine initialized.');

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

  // SYMPTOM & SPECIALTY NAVIGATOR ENGINE
  const symptomData = {
    skin: {
      category: 'DERMATOLOGY & SKIN CARE',
      title: 'Acne Clearance & Chemical Peel Therapy',
      protocol: 'US-FDA approved Salicylic & Glycolic Peels with LED anti-bacterial therapy.',
      timeline: '3 to 5 sessions spaced 3 weeks apart for clear skin results.',
      specialist: 'Dr. Shreejibapa Specialist Team (MBBS, Fellowship Aesthetic Medicine)',
      selectVal: 'Skin Dermatology'
    },
    joint: {
      category: 'ORTHOPEDIC & JOINT CARE',
      title: 'Arthritis & Non-Surgical Joint Pain Therapy',
      protocol: 'Intra-articular PRP & hyaluronic gel injections with specialized physiotherapy.',
      timeline: '3 target sessions for long-term mobility and pain reduction.',
      specialist: 'Senior Joint & Spine Care Specialist',
      selectVal: 'Joint & Pain Relief'
    },
    hair: {
      category: 'HAIR RESTORATION',
      title: 'PRP Hair Growth & Follicle Rejuvenation',
      protocol: 'Autologous Platelet-Rich Plasma injections enriched with biotin & growth factors.',
      timeline: '4 to 6 monthly sessions for visible hair density increase.',
      specialist: 'Hair Transplant & PRP Consultant',
      selectVal: 'Hair Loss & PRP'
    },
    laser: {
      category: 'AESTHETIC LASER CLINIC',
      title: 'Painless Diode Laser Hair Reduction',
      protocol: 'US-FDA certified triple wavelength diode laser with contact cooling tip.',
      timeline: '6 to 8 sessions for permanent hair reduction.',
      specialist: 'Certified Laser Practitioner & Cosmetologist',
      selectVal: 'Laser & Cosmetology'
    },
    weight: {
      category: 'METABOLIC & WEIGHT WELLNESS',
      title: 'Medical Weight Loss & Body Contouring',
      protocol: 'Metabolic assessment, clinical diet plan, and non-invasive fat lipolysis.',
      timeline: 'Custom 8-week medical wellness program.',
      specialist: 'Clinical Nutritionist & Weight Consultant',
      selectVal: 'Weight Management'
    }
  };

  let currentSelectedSpecialty = 'Skin Dermatology';

  const sChipBtns = document.querySelectorAll('.s-chip-btn');
  const navCategoryBadge = document.getElementById('navCategoryBadge');
  const navTreatmentTitle = document.getElementById('navTreatmentTitle');
  const navProtocolText = document.getElementById('navProtocolText');
  const navTimelineText = document.getElementById('navTimelineText');
  const navSpecialistText = document.getElementById('navSpecialistText');
  const navBookBtn = document.getElementById('navBookBtn');

  sChipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sChipBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const symptomKey = btn.getAttribute('data-symptom') || 'skin';
      const data = symptomData[symptomKey] || symptomData.skin;

      if (navCategoryBadge) navCategoryBadge.textContent = data.category;
      if (navTreatmentTitle) navTreatmentTitle.textContent = data.title;
      if (navProtocolText) navProtocolText.textContent = data.protocol;
      if (navTimelineText) navTimelineText.textContent = data.timeline;
      if (navSpecialistText) navSpecialistText.textContent = data.specialist;

      currentSelectedSpecialty = data.selectVal;
      showToast(`Selected Category: ${data.category}`);
    });
  });

  if (navBookBtn) {
    navBookBtn.addEventListener('click', () => {
      const specialtySelect = document.getElementById('specialty');
      if (specialtySelect) {
        specialtySelect.value = currentSelectedSpecialty;
      }
      const bookSection = document.getElementById('book');
      if (bookSection) bookSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Appointment Form Submit
  const appointmentForm = document.getElementById('appointmentForm');
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const specialty = document.getElementById('specialty').value;

      if (!name || !phone || !specialty) {
        showToast('Please fill in required fields (*)');
        return;
      }

      const waText = encodeURIComponent(
        `*Doctor Appointment Request - Shreejibapa Clinic*\n` +
        `👤 *Patient Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `🏥 *Specialty Needed:* ${specialty}`
      );

      const waUrl = `https://wa.me/919825212345?text=${waText}`;

      showToast('Appointment request ready! Opening WhatsApp...');
      setTimeout(() => {
        window.open(waUrl, '_blank');
        appointmentForm.reset();
      }, 1000);
    });
  }
});
