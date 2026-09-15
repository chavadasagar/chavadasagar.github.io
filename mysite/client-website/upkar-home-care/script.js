document.addEventListener('DOMContentLoaded', () => {
  console.log('Upkar Home Care Service Caregiver Match Wizard Engine initialized.');

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

  // CAREGIVER MATCH WIZARD ENGINE
  let wizardSelection = {
    person: 'Senior / Elderly Parent',
    shift: 'Full-Time Day (12 Hours)'
  };

  const wizStep1Btns = document.querySelectorAll('#wizStep1 .wiz-opt-btn');
  const wizStep2Btns = document.querySelectorAll('#wizStep2 .wiz-opt-btn');
  const wizStep1 = document.getElementById('wizStep1');
  const wizStep2 = document.getElementById('wizStep2');
  const wizResultStep = document.getElementById('wizResultStep');
  const wizResultTitle = document.getElementById('wizResultTitle');
  const wizResultDesc = document.getElementById('wizResultDesc');
  const wizRequestBtn = document.getElementById('wizRequestBtn');

  wizStep1Btns.forEach(btn => {
    btn.addEventListener('click', () => {
      wizardSelection.person = btn.getAttribute('data-val') || 'Elderly Parent';
      wizStep1.classList.remove('active');
      wizStep2.classList.add('active');
    });
  });

  wizStep2Btns.forEach(btn => {
    btn.addEventListener('click', () => {
      wizardSelection.shift = btn.getAttribute('data-val') || '12 Hours';
      wizStep2.classList.remove('active');
      wizResultStep.classList.add('active');

      if (wizResultTitle) {
        wizResultTitle.textContent = `Matched ${wizardSelection.person} Caregiver (${wizardSelection.shift})`;
      }

      if (wizResultDesc) {
        wizResultDesc.textContent = `100% Aadhaar & Police Verified staff ready for ${wizardSelection.person} care on a ${wizardSelection.shift} basis in Bhavnagar.`;
      }

      showToast(`Matched Caregiver Pool for ${wizardSelection.person}!`);
    });
  });

  if (wizRequestBtn) {
    wizRequestBtn.addEventListener('click', () => {
      const serviceTypeSelect = document.getElementById('serviceType');
      if (serviceTypeSelect) {
        if (wizardSelection.person.includes('Elderly')) serviceTypeSelect.value = 'Elderly Care';
        else if (wizardSelection.person.includes('Patient')) serviceTypeSelect.value = 'Patient Care';
        else if (wizardSelection.person.includes('Newborn')) serviceTypeSelect.value = 'Baby Care';
        else serviceTypeSelect.value = 'Maid Service';
      }

      const inquirySection = document.getElementById('inquiry');
      if (inquirySection) inquirySection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Care Request Form Submit
  const careForm = document.getElementById('careForm');
  if (careForm) {
    careForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const serviceType = document.getElementById('serviceType').value;
      const startDate = document.getElementById('startDate').value;

      if (!name || !phone || !serviceType || !startDate) {
        showToast('Please fill in required fields (*)');
        return;
      }

      const waText = encodeURIComponent(
        `*Caregiver Match Request - Upkar Home Care*\n` +
        `👤 *Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `🏡 *Service:* ${serviceType}\n` +
        `📅 *Start Date:* ${startDate}\n` +
        `🤝 *Wizard Match:* ${wizardSelection.person} (${wizardSelection.shift})`
      );

      const waUrl = `https://wa.me/919726012345?text=${waText}`;

      showToast('Care request ready! Connecting to WhatsApp...');
      setTimeout(() => {
        window.open(waUrl, '_blank');
        careForm.reset();
      }, 1000);
    });
  }
});
