/**
 * Storage Manager Module
 * Handles all client-side localStorage persistence for invoices, business profile, settings, and client directory.
 */

const STORAGE_KEYS = {
  PROFILE: 'inv_v2_profile',
  SETTINGS: 'inv_v2_settings',
  INVOICES: 'inv_v2_invoices',
  CLIENTS: 'inv_v2_clients',
  THEME: 'inv_v2_theme',
  ACCENT: 'inv_v2_accent',
  TEMPLATE: 'inv_v2_template',
};

// Default Settings
const DEFAULT_SETTINGS = {
  currency: 'USD',
  currencySymbol: '$',
  currencyPosition: 'before', // 'before' or 'after'
  decimals: 2,
  taxLabel: 'Tax / GST',
  defaultTaxRate: 0,
  taxType: 'single', // 'single' | 'gst' (CGST+SGST)
  invoicePrefix: 'INV-',
  nextInvoiceNum: 1,
  dateFormat: 'YYYY-MM-DD',
  defaultNotes: 'Thank you for your business! Payment is due within the specified due date.',
  defaultTerms: 'Payment via bank transfer or online payment link. Please include invoice number in payment description.'
};

// Default Sample Business Profile
const DEFAULT_PROFILE = {
  businessName: 'Acme Digital Studios',
  senderEmail: 'hello@acmestudios.com',
  senderPhone: '+1 (555) 234-5678',
  senderAddress: '742 Evergreen Terrace\nSuite 400\nSan Francisco, CA 94107',
  senderWebsite: 'www.acmestudios.com',
  senderTaxId: 'US-TAX-8934721',
  bankName: 'Silicon Valley Bank',
  accountNumber: '987654321098',
  routingNumber: '121000358',
  upiOrPaymentLink: 'pay@acmestudios',
  logo: '' // base64 data url
};

const Storage = {
  // Business Profile
  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : { ...DEFAULT_PROFILE };
    } catch (e) {
      console.error('Error reading profile from localStorage', e);
      return { ...DEFAULT_PROFILE };
    }
  },

  saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.error('Error saving profile to localStorage', e);
      return false;
    }
  },

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Error reading settings from localStorage', e);
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Error saving settings to localStorage', e);
      return false;
    }
  },

  // Invoices List
  getInvoices() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading invoices from localStorage', e);
      return [];
    }
  },

  getInvoiceById(id) {
    const invoices = this.getInvoices();
    return invoices.find(inv => inv.id === id) || null;
  },

  saveInvoice(invoice) {
    try {
      let invoices = this.getInvoices();
      const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
      
      const invoiceData = {
        ...invoice,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        invoices[existingIndex] = invoiceData;
      } else {
        invoiceData.createdAt = new Date().toISOString();
        invoices.unshift(invoiceData); // Add new to the top
        
        // Auto increment counter in settings if invoice number matched next number
        this.incrementNextInvoiceNum(invoice.invoiceNumber);
      }

      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));

      // Also auto-save client if client details provided
      if (invoice.client && invoice.client.name) {
        this.saveClientFromInvoice(invoice.client);
      }

      return invoiceData;
    } catch (e) {
      console.error('Error saving invoice to localStorage', e);
      return null;
    }
  },

  deleteInvoice(id) {
    try {
      let invoices = this.getInvoices();
      invoices = invoices.filter(inv => inv.id !== id);
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
      return true;
    } catch (e) {
      console.error('Error deleting invoice from localStorage', e);
      return false;
    }
  },

  // Auto-generation of next invoice number
  generateNextInvoiceNumber() {
    const settings = this.getSettings();
    const invoices = this.getInvoices();
    const prefix = settings.invoicePrefix || 'INV-';
    
    // Find highest existing sequence number
    let highestNum = settings.nextInvoiceNum || 1;
    invoices.forEach(inv => {
      if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
        const numPart = parseInt(inv.invoiceNumber.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart >= highestNum) {
          highestNum = numPart + 1;
        }
      }
    });

    const paddedNum = String(highestNum).padStart(4, '0');
    return `${prefix}${paddedNum}`;
  },

  incrementNextInvoiceNum(usedInvoiceNumber) {
    const settings = this.getSettings();
    const prefix = settings.invoicePrefix || 'INV-';
    if (usedInvoiceNumber && usedInvoiceNumber.startsWith(prefix)) {
      const numPart = parseInt(usedInvoiceNumber.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart >= (settings.nextInvoiceNum || 1)) {
        settings.nextInvoiceNum = numPart + 1;
        this.saveSettings(settings);
      }
    }
  },

  // Saved Clients Directory
  getClients() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading clients from localStorage', e);
      return [];
    }
  },

  saveClientFromInvoice(client) {
    if (!client || !client.name || !client.name.trim()) return;
    const clients = this.getClients();
    const cleanName = client.name.trim();
    const existingIndex = clients.findIndex(c => c.name.toLowerCase() === cleanName.toLowerCase());

    const clientData = {
      id: existingIndex >= 0 ? clients[existingIndex].id : 'cli_' + Date.now(),
      name: cleanName,
      contactPerson: client.contactPerson || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      shippingAddress: client.shippingAddress || '',
      taxId: client.taxId || '',
      lastUsed: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      clients[existingIndex] = { ...clients[existingIndex], ...clientData };
    } else {
      clients.push(clientData);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch (e) {
      console.error('Error saving client', e);
    }
  },

  deleteClient(id) {
    try {
      let clients = this.getClients();
      clients = clients.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
      return true;
    } catch (e) {
      console.error('Error deleting client', e);
      return false;
    }
  },

  // Theme & Appearance Preferences
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  },

  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getAccent() {
    return localStorage.getItem(STORAGE_KEYS.ACCENT) || 'indigo';
  },

  saveAccent(accent) {
    localStorage.setItem(STORAGE_KEYS.ACCENT, accent);
  },

  getTemplate() {
    return localStorage.getItem(STORAGE_KEYS.TEMPLATE) || 'modern';
  },

  saveTemplate(template) {
    localStorage.setItem(STORAGE_KEYS.TEMPLATE, template);
  },

  // Backup & Restore
  exportAllData() {
    const backup = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      profile: this.getProfile(),
      settings: this.getSettings(),
      invoices: this.getInvoices(),
      clients: this.getClients(),
      theme: this.getTheme(),
      accent: this.getAccent(),
      template: this.getTemplate()
    };
    return JSON.stringify(backup, null, 2);
  },

  importAllData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.profile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data.profile));
      if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      if (data.invoices && Array.isArray(data.invoices)) localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(data.invoices));
      if (data.clients && Array.isArray(data.clients)) localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(data.clients));
      if (data.theme) localStorage.setItem(STORAGE_KEYS.THEME, data.theme);
      if (data.accent) localStorage.setItem(STORAGE_KEYS.ACCENT, data.accent);
      if (data.template) localStorage.setItem(STORAGE_KEYS.TEMPLATE, data.template);
      return true;
    } catch (e) {
      console.error('Error importing backup data', e);
      return false;
    }
  },

  clearAllData() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      return true;
    } catch (e) {
      console.error('Error clearing data', e);
      return false;
    }
  }
};

window.Storage = Storage;
