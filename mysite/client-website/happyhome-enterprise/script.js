document.addEventListener('DOMContentLoaded', () => {
  console.log('Happyhome Enterprise Room Visualizer initialized.');

  // Mobile Nav Toggle
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

  // ROOM VISUALIZER INTERACTIVE ENGINE
  const themeBtns = document.querySelectorAll('.theme-btn');
  const vizCanvas = document.getElementById('vizCanvas');
  const vizStatusText = document.getElementById('vizStatusText');
  const fixtureCheckboxes = document.querySelectorAll('.fixture-checkbox input');
  const selectedCountEl = document.getElementById('selectedCount');
  const packageTotalEl = document.getElementById('packageTotal');
  const vizQuoteBtn = document.getElementById('vizQuoteBtn');

  // Theme Switcher
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const theme = btn.getAttribute('data-theme');
      if (vizCanvas) {
        vizCanvas.setAttribute('data-current-theme', theme);
      }

      const themeName = btn.textContent.trim();
      if (vizStatusText) {
        vizStatusText.innerHTML = `🎨 Current Style: <strong>${themeName}</strong> · Jaquar & Cera Certified`;
      }

      showToast(`Applied Finish: ${themeName}`);
    });
  });

  // Calculate Package Cost
  const updateVisualizerTotal = () => {
    let total = 0;
    let count = 0;
    let selectedNames = [];

    fixtureCheckboxes.forEach(cb => {
      if (cb.checked) {
        total += parseInt(cb.getAttribute('data-price') || '0', 10);
        count++;
        selectedNames.push(cb.getAttribute('data-name'));
      }
    });

    if (selectedCountEl) selectedCountEl.textContent = `${count} Items`;
    if (packageTotalEl) packageTotalEl.textContent = `₹ ${total.toLocaleString('en-IN')}`;

    return { total, count, selectedNames };
  };

  fixtureCheckboxes.forEach(cb => {
    cb.addEventListener('change', updateVisualizerTotal);
  });

  // Visualizer Quote Button Click
  if (vizQuoteBtn) {
    vizQuoteBtn.addEventListener('click', () => {
      const { total, count, selectedNames } = updateVisualizerTotal();
      const activeThemeBtn = document.querySelector('.theme-btn.active');
      const themeName = activeThemeBtn ? activeThemeBtn.textContent.trim() : 'Modern Matte Black';

      const productSelect = document.getElementById('product');
      const messageInput = document.getElementById('message');

      if (productSelect) productSelect.value = 'Custom Visualizer Package';
      if (messageInput) {
        messageInput.value = `Custom 3D Visualizer Package:\n- Theme: ${themeName}\n- Selected Fixtures (${count}): ${selectedNames.join(', ')}\n- Estimated Total: ₹ ${total.toLocaleString('en-IN')}`;
      }

      const quoteSection = document.getElementById('quote');
      if (quoteSection) quoteSection.scrollIntoView({ behavior: 'smooth' });

      showToast(`Visualizer Package (₹ ${total.toLocaleString('en-IN')}) loaded into quote form.`);
    });
  }

  // Product Filter Tabs
  const filterTabs = document.querySelectorAll('.tab-btn');
  const productCards = document.querySelectorAll('.product-card');

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      productCards.forEach(card => {
        const cardType = card.getAttribute('data-type');
        card.style.display = (filter === 'all' || cardType === filter) ? 'flex' : 'none';
      });
    });
  });

  // Product Card "Get Quote"
  document.querySelectorAll('.btn-quote-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemName = btn.getAttribute('data-item');
      const messageInput = document.getElementById('message');
      if (messageInput) {
        messageInput.value = `I am interested in getting a quotation for: ${itemName}.`;
      }
      const quoteSection = document.getElementById('quote');
      if (quoteSection) quoteSection.scrollIntoView({ behavior: 'smooth' });
      showToast(`Selected "${itemName}". Complete the form to submit quote.`);
    });
  });

  // Quotation Form Submit
  const quoteForm = document.getElementById('quoteForm');
  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const product = document.getElementById('product').value;
      const message = document.getElementById('message').value.trim();

      if (!name || !phone || !product) {
        showToast('Please fill in required fields (*)');
        return;
      }

      const waText = encodeURIComponent(
        `*New Quotation Request - Happyhome Enterprise*\n` +
        `👤 *Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `📦 *Category/Package:* ${product}\n` +
        `📝 *Details:* ${message || 'N/A'}`
      );

      const waUrl = `https://wa.me/919426212345?text=${waText}`;

      showToast('Quotation request submitted! Opening WhatsApp...');
      setTimeout(() => {
        window.open(waUrl, '_blank');
        quoteForm.reset();
      }, 1000);
    });
  }
});
