document.addEventListener('DOMContentLoaded', () => {
  console.log("Mr. Gill's Heritage Kitchen Virtual Thali Engine initialized.");

  // Mobile Nav Toggle
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

  // VIRTUAL THALI BUILDER ENGINE
  const thaliState = {
    gravy1: { name: 'Paneer Butter Masala', cal: 280 },
    gravy2: { name: '12-Hour Dal Makhani', cal: 310 },
    bread: { name: 'Butter Amritsari Kulcha (2 pcs)', cal: 290 },
    beverage: { name: 'Kulhad Lassi & Gulab Jamun', cal: 250 }
  };

  const setupChipGroup = (containerId, stateKey, plateElemId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const btns = container.querySelectorAll('.chip-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const name = btn.getAttribute('data-name');
        const cal = parseInt(btn.getAttribute('data-cal') || '200', 10);

        thaliState[stateKey] = { name, cal };

        // Update visual katori label
        const plateElem = document.getElementById(plateElemId);
        if (plateElem) {
          plateElem.querySelector('.k-label').textContent = name.split('(')[0];
        }

        updateThaliStats();
      });
    });
  };

  const updateThaliStats = () => {
    // Fixed base rice & salad = 150 kcal
    const totalCal = thaliState.gravy1.cal + thaliState.gravy2.cal + thaliState.bread.cal + thaliState.beverage.cal + 150;
    const calTotalEl = document.getElementById('calTotal');
    if (calTotalEl) {
      calTotalEl.textContent = `${totalCal.toLocaleString()} kcal`;
    }
  };

  setupChipGroup('gravy1Options', 'gravy1', 'plateGravy1');
  setupChipGroup('gravy2Options', 'gravy2', 'plateGravy2');
  setupChipGroup('breadOptions', 'bread', 'plateBread');
  setupChipGroup('beverageOptions', 'beverage', 'plateSweet');

  const orderThaliBtn = document.getElementById('orderThaliBtn');
  if (orderThaliBtn) {
    orderThaliBtn.addEventListener('click', () => {
      const waText = encodeURIComponent(
        `*Custom Amritsari Thali Order - Mr. Gill's Kitchen*\n` +
        `🍱 *Paneer/Sabzi:* ${thaliState.gravy1.name}\n` +
        `🍲 *Dal:* ${thaliState.gravy2.name}\n` +
        `🫓 *Bread:* ${thaliState.bread.name}\n` +
        `🥛 *Beverage & Sweet:* ${thaliState.beverage.name}\n` +
        `💵 *Total Price:* ₹ 260\n` +
        `Please confirm delivery time.`
      );

      const waUrl = `https://wa.me/916353421313?text=${waText}`;
      showToast('Custom Thali order generated! Opening WhatsApp...');
      setTimeout(() => window.open(waUrl, '_blank'), 1000);
    });
  }

  // Menu Category Filter Tabs
  const menuTabs = document.querySelectorAll('.menu-tab-btn');
  const menuItems = document.querySelectorAll('.menu-item');

  menuTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      menuTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.getAttribute('data-category');

      menuItems.forEach(item => {
        const itemCat = item.getAttribute('data-cat');
        item.style.display = (category === itemCat) ? 'flex' : 'none';
      });
    });
  });

  // Table Reservation Form
  const tableForm = document.getElementById('tableForm');
  if (tableForm) {
    tableForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const party = document.getElementById('party').value;
      const date = document.getElementById('date').value;
      const notes = document.getElementById('notes').value.trim();

      if (!name || !phone || !date) {
        showToast('Please fill in required fields (*)');
        return;
      }

      const waText = encodeURIComponent(
        `*Table Reservation - Mr. Gill's Heritage Kitchen*\n` +
        `👤 *Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `👥 *Party Size:* ${party}\n` +
        `📅 *Date:* ${date}\n` +
        `📝 *Notes:* ${notes || 'None'}`
      );

      const waUrl = `https://wa.me/916353421313?text=${waText}`;

      showToast('Reservation request ready! Connecting to WhatsApp...');
      setTimeout(() => {
        window.open(waUrl, '_blank');
        tableForm.reset();
      }, 1000);
    });
  }
});
