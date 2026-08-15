/**
 * Invoice Calculation & Modeling Module
 * Handles financial computations, number-to-words translation, formatting, and sample data.
 */

const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', minor: 'Cent', minors: 'Cents' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', minor: 'Cent', minors: 'Cents' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', minor: 'Penny', minors: 'Pence' },
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', minor: 'Paisa', minors: 'Paise' },
  CAD: { symbol: 'CA$', code: 'CAD', name: 'Canadian Dollar', minor: 'Cent', minors: 'Cents' },
  AUD: { symbol: 'AU$', code: 'AUD', name: 'Australian Dollar', minor: 'Cent', minors: 'Cents' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen', minor: '', minors: '' },
  AED: { symbol: 'AED', code: 'AED', name: 'UAE Dirham', minor: 'Fils', minors: 'Fils' },
  SGD: { symbol: 'SG$', code: 'SGD', name: 'Singapore Dollar', minor: 'Cent', minors: 'Cents' }
};

const InvoiceModel = {
  /**
   * Calculates all totals for an invoice object
   */
  calculateTotals(invoice) {
    const items = invoice.items || [];
    
    // 1. Calculate Line Item Totals and Subtotal
    let subtotal = 0;
    const processedItems = items.map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = Math.max(0, qty * rate);
      subtotal += amount;
      return {
        ...item,
        quantity: qty,
        rate: rate,
        amount: Number(amount.toFixed(2))
      };
    });

    // 2. Discount
    let discountAmount = 0;
    const discountVal = parseFloat(invoice.discountValue) || 0;
    if (invoice.discountType === 'percentage') {
      discountAmount = (subtotal * Math.min(100, Math.max(0, discountVal))) / 100;
    } else {
      discountAmount = Math.min(subtotal, Math.max(0, discountVal));
    }
    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

    // 3. Tax Calculation
    let taxAmount = 0;
    const taxRate = parseFloat(invoice.taxRate) || 0;
    if (taxRate > 0) {
      taxAmount = (subtotalAfterDiscount * taxRate) / 100;
    }

    // 4. Shipping / Extra Fee
    const shippingFee = Math.max(0, parseFloat(invoice.shippingFee) || 0);

    // 5. Total before round-off
    let grandTotal = subtotalAfterDiscount + taxAmount + shippingFee;
    let roundOffAmount = 0;

    if (invoice.enableRoundOff) {
      const rounded = Math.round(grandTotal);
      roundOffAmount = Number((rounded - grandTotal).toFixed(2));
      grandTotal = rounded;
    }

    // 6. Paid & Balance Due
    const paidAmount = Math.max(0, parseFloat(invoice.paidAmount) || 0);
    const balanceDue = Math.max(0, grandTotal - paidAmount);

    return {
      items: processedItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      shippingFee: Number(shippingFee.toFixed(2)),
      roundOffAmount: Number(roundOffAmount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      paidAmount: Number(paidAmount.toFixed(2)),
      balanceDue: Number(balanceDue.toFixed(2)),
      totalInWords: this.numberToWords(grandTotal, invoice.currency || 'USD')
    };
  },

  /**
   * Format numbers nicely with currency symbol and decimal formatting
   */
  formatCurrency(amount, currencyCode = 'USD', symbolOverride = null, position = 'before') {
    const num = Number(amount) || 0;
    const curr = CURRENCIES[currencyCode] || { symbol: symbolOverride || '$', code: currencyCode };
    const sym = symbolOverride || curr.symbol || '$';
    
    const formattedNum = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return position === 'after' ? `${formattedNum} ${sym}` : `${sym}${formattedNum}`;
  },

  /**
   * Convert financial numbers to words in English (International & Indian Rupee format support)
   */
  numberToWords(amount, currencyCode = 'USD') {
    if (isNaN(amount) || amount === 0) return 'Zero Dollars Only';
    
    const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;
    const integerPart = Math.floor(Math.abs(amount));
    const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertGroup(n) {
      let str = '';
      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + ' ';
      }
      return str.trim();
    }

    function intToWords(num) {
      if (num === 0) return 'Zero';
      
      if (currencyCode === 'INR') {
        // Indian Numbering Format (Crore, Lakh, Thousand, Hundred)
        let res = '';
        const crore = Math.floor(num / 10000000);
        num %= 10000000;
        const lakh = Math.floor(num / 100000);
        num %= 100000;
        const thousand = Math.floor(num / 1000);
        num %= 1000;

        if (crore > 0) res += convertGroup(crore) + ' Crore ';
        if (lakh > 0) res += convertGroup(lakh) + ' Lakh ';
        if (thousand > 0) res += convertGroup(thousand) + ' Thousand ';
        if (num > 0) res += convertGroup(num) + ' ';
        return res.trim();
      } else {
        // International Numbering Format (Billion, Million, Thousand)
        let res = '';
        const billion = Math.floor(num / 1000000000);
        num %= 1000000000;
        const million = Math.floor(num / 1000000);
        num %= 1000000;
        const thousand = Math.floor(num / 1000);
        num %= 1000;

        if (billion > 0) res += convertGroup(billion) + ' Billion ';
        if (million > 0) res += convertGroup(million) + ' Million ';
        if (thousand > 0) res += convertGroup(thousand) + ' Thousand ';
        if (num > 0) res += convertGroup(num) + ' ';
        return res.trim();
      }
    }

    const intWords = intToWords(integerPart);
    const currName = integerPart === 1 ? curr.name : curr.name + 's';
    
    let words = `${intWords} ${curr.name || 'Dollars'}`;

    if (decimalPart > 0) {
      const decWords = intToWords(decimalPart);
      const minorUnit = decimalPart === 1 ? (curr.minor || 'Cent') : (curr.minors || 'Cents');
      words += ` and ${decWords} ${minorUnit}`;
    }

    return `${words} Only`;
  },

  /**
   * Helper to format Date string to YYYY-MM-DD
   */
  formatDateToISO(date = new Date()) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  },

  /**
   * Helper to calculate Due Date with Net days
   */
  calculateDueDate(startDateStr, daysToAdd = 0) {
    const base = startDateStr ? new Date(startDateStr) : new Date();
    base.setDate(base.getDate() + daysToAdd);
    return this.formatDateToISO(base);
  },

  /**
   * Generates a rich demo invoice for instant testing
   */
  getDemoInvoice(defaultProfile = null) {
    const today = this.formatDateToISO();
    const dueDate = this.calculateDueDate(today, 15);

    return {
      id: 'inv_demo_' + Date.now(),
      invoiceNumber: Storage.generateNextInvoiceNumber(),
      poNumber: 'PO-99420',
      issueDate: today,
      dueDate: dueDate,
      status: 'pending', // draft | pending | paid | overdue
      currency: 'USD',
      currencySymbol: '$',
      
      sender: defaultProfile || Storage.getProfile(),

      client: {
        name: 'Nexus Interactive Inc.',
        contactPerson: 'Sarah Jenkins',
        email: 's.jenkins@nexusinteractive.io',
        phone: '+1 (415) 890-1234',
        address: '100 Montgomery St, Suite 1800\nSan Francisco, CA 94104',
        shippingAddress: '',
        taxId: 'US-EIN-94-3214567'
      },

      items: [
        {
          id: 'item_1',
          description: 'Custom Web Application Design & UI/UX Design System',
          notes: 'Figma prototypes, design tokens, design system documentation & assets',
          quantity: 1,
          unit: 'service',
          rate: 2800.00
        },
        {
          id: 'item_2',
          description: 'Frontend Development & Responsive Implementation',
          notes: 'Mobile-first layout, accessible components, clean semantic code',
          quantity: 40,
          unit: 'hrs',
          rate: 85.00
        },
        {
          id: 'item_3',
          description: 'Cloud Infrastructure Setup & CI/CD Deployment',
          notes: 'Automated build pipeline, staging environment, SSL setup',
          quantity: 1,
          unit: 'project',
          rate: 750.00
        }
      ],

      discountType: 'percentage',
      discountValue: 5,
      taxLabel: 'State Tax / GST',
      taxRate: 8.5,
      shippingFee: 0,
      enableRoundOff: false,
      paidAmount: 1500.00,
      notes: 'Thank you for your business! Please make the payment before the due date.',
      terms: 'Payment is accepted via Wire Transfer or ACH. A late fee of 1.5% applies after 30 days.'
    };
  },

  /**
   * Generates a blank new invoice template
   */
  getBlankInvoice(defaultProfile = null) {
    const today = this.formatDateToISO();
    const settings = Storage.getSettings();

    return {
      id: 'inv_' + Date.now(),
      invoiceNumber: Storage.generateNextInvoiceNumber(),
      poNumber: '',
      issueDate: today,
      dueDate: this.calculateDueDate(today, 15),
      status: 'draft',
      currency: settings.currency || 'USD',
      currencySymbol: settings.currencySymbol || '$',
      
      sender: defaultProfile || Storage.getProfile(),

      client: {
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        shippingAddress: '',
        taxId: ''
      },

      items: [
        {
          id: 'item_' + Date.now(),
          description: '',
          notes: '',
          quantity: 1,
          unit: 'units',
          rate: 0
        }
      ],

      discountType: 'percentage',
      discountValue: 0,
      taxLabel: settings.taxLabel || 'Tax / GST',
      taxRate: settings.defaultTaxRate || 0,
      shippingFee: 0,
      enableRoundOff: false,
      paidAmount: 0,
      notes: settings.defaultNotes || '',
      terms: settings.defaultTerms || ''
    };
  }
};

window.InvoiceModel = InvoiceModel;
