/**
 * PERSISTENT DATABASE LAYER (localStorage)
 */
const DB = {
  // Read array from localStorage
  get(key) {
    try {
      const data = localStorage.getItem(key);
      if (key === 'jw_current_user') {
        return data ? JSON.parse(data) : null;
      }
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading key ${key} from DB`, e);
      return key === 'jw_current_user' ? null : [];
    }
  },

  // Save array to localStorage
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error writing key ${key} to DB`, e);
      return false;
    }
  },

  // Get item by ID
  getById(key, id) {
    const list = this.get(key);
    return list.find(item => Number(item.id) === Number(id)) || null;
  },

  // Compute next ID
  nextId(key) {
    const list = this.get(key);
    if (!list || list.length === 0) return 1;
    const ids = list.map(item => Number(item.id) || 0);
    return Math.max(...ids) + 1;
  },

  // Create record
  insert(key, obj) {
    const list = this.get(key);
    const id = this.nextId(key);
    const now = new Date().toISOString();
    
    const record = {
      id,
      ...obj,
      createdAt: now,
      updatedAt: now
    };
    
    list.push(record);
    this.set(key, list);
    
    // Log action to Audit Log (except audit log itself)
    if (key !== 'jw_audit_logs') {
      this.log('CREATE', key, id);
    }
    
    return record;
  },

  // Update record
  update(key, id, obj) {
    const list = this.get(key);
    const index = list.findIndex(item => Number(item.id) === Number(id));
    if (index === -1) return null;
    
    const now = new Date().toISOString();
    const existing = list[index];
    
    const record = {
      ...existing,
      ...obj,
      id: Number(id), // Safeguard ID mapping
      updatedAt: now
    };
    
    list[index] = record;
    this.set(key, list);
    
    if (key !== 'jw_audit_logs') {
      this.log('UPDATE', key, id);
    }
    
    return record;
  },

  // Delete record
  delete(key, id) {
    const list = this.get(key);
    const exists = list.some(item => Number(item.id) === Number(id));
    if (!exists) return false;
    
    const filtered = list.filter(item => Number(item.id) !== Number(id));
    this.set(key, filtered);
    
    if (key !== 'jw_audit_logs') {
      this.log('DELETE', key, id);
    }
    
    return true;
  },

  // Write audit log row
  log(action, tableName, recordId) {
    const currentUser = this.get('jw_current_user');
    const userId = currentUser ? currentUser.userId : 0;
    const username = currentUser ? currentUser.username : 'SYSTEM';
    
    const logItem = {
      userId,
      username,
      action,
      tableName,
      recordId: Number(recordId),
      timestamp: new Date().toISOString()
    };
    
    // Bypass insert to avoid recursive audits
    const logs = this.get('jw_audit_logs');
    const id = logs.length > 0 ? Math.max(...logs.map(l => l.id || 0)) + 1 : 1;
    logs.push({ id, ...logItem });
    this.set('jw_audit_logs', logs);
  },

  // Seed default data if database is empty
  seed() {
    // If metals is already seeded, assume DB has been initialized
    if (this.get('jw_metals').length > 0) return;
    
    console.log("Seeding database with demo data...");

    // 1. Metals
    const metals = [
      { id: 1, name: 'Gold', hsnCode: '7113', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, name: 'Silver', hsnCode: '7113', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, name: 'Platinum', hsnCode: '7113', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_metals', metals);

    // 2. Purities
    const purities = [
      { id: 1, metalId: 1, name: '24K (99.9%)', percent: 99.9, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, metalId: 1, name: '22K (91.6%)', percent: 91.6, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, metalId: 1, name: '18K (75.0%)', percent: 75.0, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 4, metalId: 2, name: '925 Silver', percent: 92.5, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_purities', purities);

    // 3. Categories
    const categories = [
      { id: 1, name: 'Necklace', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, name: 'Ring', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, name: 'Bangle', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 4, name: 'Earring', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 5, name: 'Chain', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 6, name: 'Bracelet', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 7, name: 'Pendant', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 8, name: 'Mangalsutra', parentId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_categories', categories);

    // 4. Stone Types
    const stones = [
      { id: 1, name: 'Diamond', uom: 'Carat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, name: 'Ruby', uom: 'Carat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, name: 'Emerald', uom: 'Carat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 4, name: 'Sapphire', uom: 'Carat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 5, name: 'CZ', uom: 'Piece', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 6, name: 'Polki', uom: 'Carat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 7, name: 'Pearl', uom: 'Piece', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_stone_types', stones);

    // 5. GST Rates
    const gstRates = [
      { id: 1, hsnCode: '7113', cgstPercent: 1.5, sgstPercent: 1.5, igstPercent: 3, effectiveDate: '2024-01-01', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_gst_rates', gstRates);

    // 6. Branch
    const branches = [
      { id: 1, name: 'Main Showroom', address: '101 Gold Plaza, MG Road, Mumbai', gstin: '27AADCB1234F1Z0', phone: '9876543200', isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_branches', branches);

    // 7. Users
    const users = [
      { id: 1, employeeName: 'Super Admin', username: 'admin', password: 'admin123', role: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, employeeName: 'Sales Lead', username: 'sales', password: 'sales123', role: 'Sales', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, employeeName: 'Cashier Manager', username: 'cashier', password: 'cashier123', role: 'Cashier', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_users', users);

    // 8. Rate Master (Seed daily rate for past 7 days)
    const today = new Date();
    const rateMaster = [];
    
    // Seed rates for past 7 days (id 2 = Gold 22K, id 3 = Gold 18K, id 4 = Silver 925)
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Seed Gold 22K (fluctuating around ₹6200)
      rateMaster.push({
        id: rateMaster.length + 1,
        metalId: 1,
        purityId: 2,
        ratePerGram: 6100 + (7 - i) * 15 - (i === 3 ? 50 : 0), // Fluctuations
        effectiveDate: dateStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Seed Gold 18K (fluctuating around ₹5100)
      rateMaster.push({
        id: rateMaster.length + 1,
        metalId: 1,
        purityId: 3,
        ratePerGram: 5000 + (7 - i) * 15,
        effectiveDate: dateStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Seed Silver 925 (fluctuating around ₹85)
      rateMaster.push({
        id: rateMaster.length + 1,
        metalId: 2,
        purityId: 4,
        ratePerGram: 80 + (7 - i) * 1,
        effectiveDate: dateStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.set('jw_rate_master', rateMaster);

    // 9. Suppliers & Karigars
    const suppliers = [
      { id: 1, name: 'Apex Gold Wholesalers', type: 'Wholesaler', gstin: '27AAAAA1111A1Z1', phone: '9000000001', email: 'sales@apex.com', address: 'Zaveri Bazaar, Mumbai', openingBalance: 50000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, name: 'Shankar Karigar', type: 'Karigar', gstin: '27BBBBB2222B2Z2', phone: '9000000002', email: 'shankar@karigar.com', address: 'Kalbadevi, Mumbai', openingBalance: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_suppliers', suppliers);

    // 10. Customers
    const customers = [
      { id: 1, name: 'Pratham Patel', phone: '9876543210', email: 'pratham@gmail.com', address: 'Andheri West', city: 'Mumbai', pan: 'ABCDE1234F', aadhaar: '123456789012', dob: '1990-05-15', anniversaryDate: '2018-12-10', type: 'Retail', loyaltyPoints: 250, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, name: 'Sagar Shah', phone: '9876543211', email: 'sagar@gmail.com', address: 'Borivali East', city: 'Mumbai', pan: 'WXYZP4321Q', aadhaar: '123456789013', dob: '1985-11-20', anniversaryDate: '', type: 'VIP', loyaltyPoints: 1200, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, name: 'Rajesh Kumar', phone: '9876543212', email: 'rajesh@gmail.com', address: 'Sector 15', city: 'Navi Mumbai', pan: 'QRSTU9876E', aadhaar: '123456789014', dob: '1978-02-10', anniversaryDate: '2005-05-20', type: 'Retail', loyaltyPoints: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_customers', customers);

    // 11. Schemes
    const schemes = [
      { id: 1, name: 'Swarna Varsha Gold Savings', durationMonths: 11, bonusMonth: 12, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, name: 'Dhanwantari Silver Scheme', durationMonths: 5, bonusMonth: 6, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_schemes', schemes);

    // 12. HUID Hallmarks
    const hallmarks = [
      { id: 1, huidCode: 'HUI987', hallmarkCenter: 'BIS Assaying Lab A', hallmarkDate: '2026-06-10', certificateNo: 'BIS-987654', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, huidCode: 'ABC123', hallmarkCenter: 'BIS Assaying Lab B', hallmarkDate: '2026-07-02', certificateNo: 'BIS-123456', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, huidCode: 'XYZ555', hallmarkCenter: 'BIS Assaying Lab A', hallmarkDate: '2026-07-12', certificateNo: 'BIS-555123', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_hallmarks', hallmarks);

    // 13. Products
    const products = [
      {
        id: 1,
        itemCode: 'NEC-20260714-01',
        categoryId: 1,
        designName: 'Antique Bridal Choker',
        metalId: 1,
        purityId: 2,
        supplierId: 1,
        size: '16 inch',
        huidCode: 'HUI987',
        grossWeight: 25.400,
        stoneWeight: 0.000,
        netWeight: 25.400,
        makingChargeType: 'Percentage',
        makingChargeValue: 6,
        wastagePercent: 2,
        mrp: 182000,
        purchaseRate: 5800,
        branchId: 1,
        status: 'InStock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        itemCode: 'RNG-20260714-02',
        categoryId: 2,
        designName: 'Solitaire Diamond Ring',
        metalId: 1,
        purityId: 3,
        supplierId: 2,
        size: '14',
        huidCode: 'ABC123',
        grossWeight: 4.800,
        stoneWeight: 0.200,
        netWeight: 4.600,
        makingChargeType: 'PerGram',
        makingChargeValue: 500,
        wastagePercent: 1,
        mrp: 55000,
        purchaseRate: 4850,
        branchId: 1,
        status: 'InStock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        itemCode: 'BGL-20260714-03',
        categoryId: 3,
        designName: 'Traditional Kada Bangle',
        metalId: 1,
        purityId: 2,
        supplierId: 2,
        size: '2.6',
        huidCode: 'XYZ555',
        grossWeight: 14.500,
        stoneWeight: 0.000,
        netWeight: 14.500,
        makingChargeType: 'Fixed',
        makingChargeValue: 4500,
        wastagePercent: 1.5,
        mrp: 99800,
        purchaseRate: 5900,
        branchId: 1,
        status: 'InStock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 4,
        itemCode: 'ERG-20260714-04',
        categoryId: 4,
        designName: 'Filigree Gold Jhumkas',
        metalId: 1,
        purityId: 2,
        supplierId: 1,
        size: 'Medium',
        huidCode: '',
        grossWeight: 8.200,
        stoneWeight: 0.000,
        netWeight: 8.200,
        makingChargeType: 'PerGram',
        makingChargeValue: 400,
        wastagePercent: 0,
        mrp: 54100,
        purchaseRate: 5850,
        branchId: 1,
        status: 'InStock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 5,
        itemCode: 'RNG-20260714-05',
        categoryId: 2,
        designName: 'Classic Men\'s Silver Band',
        metalId: 2,
        purityId: 4,
        supplierId: 1,
        size: '20',
        huidCode: '',
        grossWeight: 10.000,
        stoneWeight: 0.000,
        netWeight: 10.000,
        makingChargeType: 'Fixed',
        makingChargeValue: 600,
        wastagePercent: 0,
        mrp: 1450,
        purchaseRate: 70,
        branchId: 1,
        status: 'InStock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    this.set('jw_products', products);

    // 14. Product Stones (Add diamond details to Product 2)
    const productStones = [
      { id: 1, productId: 2, stoneTypeId: 1, weight: 1.000, rate: 30000, amount: 30000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
    this.set('jw_product_stones', productStones);

    console.log("Seeding complete!");
  }
};
