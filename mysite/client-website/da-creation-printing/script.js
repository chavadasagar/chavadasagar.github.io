document.addEventListener('DOMContentLoaded', () => {
  console.log('D A CREATION Live Print Cost Estimator initialized.');

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

  // LIVE PRINT COST ESTIMATOR ENGINE
  const estProduct = document.getElementById('estProduct');
  const estPaper = document.getElementById('estPaper');
  const estQty = document.getElementById('estQty');
  const qtyValDisplay = document.getElementById('qtyValDisplay');
  const recProduct = document.getElementById('recProduct');
  const recPaper = document.getElementById('recPaper');
  const recQty = document.getElementById('recQty');
  const estTotalPrice = document.getElementById('estTotalPrice');
  const exportEstBtn = document.getElementById('exportEstBtn');

  const calculatePrintEstimate = () => {
    if (!estProduct || !estPaper || !estQty) return;

    const selectedOption = estProduct.options[estProduct.selectedIndex];
    const basePrice = parseFloat(selectedOption.getAttribute('data-base') || '1.5');
    const unitLabel = selectedOption.getAttribute('data-unit') || 'units';

    const paperMultiplier = parseFloat(estPaper.value || '1.0');
    const paperLabel = estPaper.options[estPaper.selectedIndex].getAttribute('data-label') || 'Standard';

    const qty = parseInt(estQty.value, 10);

    // Calculation formula: Base * Multiplier * Qty (with volume discount over 2500 units)
    let discount = 1.0;
    if (qty >= 5000) discount = 0.82;
    else if (qty >= 2500) discount = 0.90;

    const total = Math.round(basePrice * paperMultiplier * qty * discount);

    // Update Receipt Display
    if (qtyValDisplay) qtyValDisplay.textContent = `${qty.toLocaleString('en-IN')} ${unitLabel}`;
    if (recProduct) recProduct.textContent = selectedOption.text.split('(')[0];
    if (recPaper) recPaper.textContent = paperLabel;
    if (recQty) recQty.textContent = `${qty.toLocaleString('en-IN')} ${unitLabel}`;
    if (estTotalPrice) estTotalPrice.textContent = `₹ ${total.toLocaleString('en-IN')}`;

    return { product: selectedOption.text, finish: paperLabel, qty, total };
  };

  if (estProduct) estProduct.addEventListener('change', calculatePrintEstimate);
  if (estPaper) estPaper.addEventListener('change', calculatePrintEstimate);
  if (estQty) estQty.addEventListener('input', calculatePrintEstimate);

  calculatePrintEstimate(); // Initial run

  if (exportEstBtn) {
    exportEstBtn.addEventListener('click', () => {
      const est = calculatePrintEstimate();
      const waText = encodeURIComponent(
        `*Print Spec Sheet & Quote Request - D A CREATION*\n` +
        `🖨️ *Product:* ${est.product}\n` +
        `📜 *Paper & Finish:* ${est.finish}\n` +
        `📦 *Quantity:* ${est.qty.toLocaleString('en-IN')}\n` +
        `💵 *Estimated Total:* ₹ ${est.total.toLocaleString('en-IN')}\n` +
        `Please confirm order turnaround time.`
      );

      const waUrl = `https://wa.me/919898054321?text=${waText}`;
      showToast('Spec sheet ready! Opening WhatsApp...');
      setTimeout(() => window.open(waUrl, '_blank'), 1000);
    });
  }

  // General Quote Form Submit
  const printQuoteForm = document.getElementById('printQuoteForm');
  if (printQuoteForm) {
    printQuoteForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const service = document.getElementById('service').value;
      const quantity = document.getElementById('quantity').value.trim();

      if (!name || !phone || !service || !quantity) {
        showToast('Please fill in required fields (*)');
        return;
      }

      const waText = encodeURIComponent(
        `*Print Quote Request - D A CREATION*\n` +
        `👤 *Client Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `🎨 *Service:* ${service}\n` +
        `📏 *Specs:* ${quantity}`
      );

      const waUrl = `https://wa.me/919898054321?text=${waText}`;

      showToast('Quote request ready! Connecting to WhatsApp...');
      setTimeout(() => {
        window.open(waUrl, '_blank');
        printQuoteForm.reset();
      }, 1000);
    });
  }
});
