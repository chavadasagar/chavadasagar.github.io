/**
 * storage.js - The Database Layer for the Restaurant Management System
 * Manages all localStorage entities, hooks, event dispatches, and multi-branch data seeding.
 */

const DB_PREFIX = "restaurant_";

const db = {
  // Read array from localStorage
  get(table) {
    const key = DB_PREFIX + table;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  // Write array to localStorage
  set(table, data) {
    const key = DB_PREFIX + table;
    localStorage.setItem(key, JSON.stringify(data));
    // Dispatch custom event to notify components of changes
    window.dispatchEvent(new CustomEvent(`db-updated:${table}`, { detail: data }));
    window.dispatchEvent(new CustomEvent('db-any-update', { detail: { table, data } }));
  },

  // Insert a single item
  insert(table, item) {
    const data = this.get(table);
    if (!item.id) {
      item.id = `${table.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    // Auto-tag with current branch if the table supports branching and is not already tagged
    const branchLinkedTables = ["categories", "menu", "tables", "orders", "reservations", "inventory", "staff", "coupons", "recipes"];
    if (branchLinkedTables.includes(table) && !item.branchId) {
      item.branchId = this.getCurrentBranch();
    }
    data.push(item);
    this.set(table, data);
    return item;
  },

  // Update a single item matching id
  update(table, id, updatedFields) {
    const data = this.get(table);
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updatedFields };
      this.set(table, data);
      return data[index];
    }
    return null;
  },

  // Delete an item matching id
  delete(table, id) {
    let data = this.get(table);
    const initialLength = data.length;
    data = data.filter(item => item.id !== id);
    if (data.length !== initialLength) {
      this.set(table, data);
      return true;
    }
    return false;
  },

  // Get currently active branch
  getCurrentBranch() {
    let selected = localStorage.getItem("selectedBranchId");
    if (!selected) {
      const branches = this.get("branches");
      if (branches.length > 0) {
        selected = branches[0].id;
      } else {
        selected = "br_junagadh";
      }
      localStorage.setItem("selectedBranchId", selected);
    }
    return selected;
  },

  // Reset entire database to default demo seed data
  resetDemoData() {
    localStorage.clear();
    seedDatabase();
    window.dispatchEvent(new CustomEvent('db-reset-complete'));
  },

  // Clear all database tables
  clearAllData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(DB_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem("currentUser");
    localStorage.removeItem("selectedBranchId");
    window.dispatchEvent(new CustomEvent('db-clear-complete'));
  }
};

// Seed realistic data
function seedDatabase() {
  // 1. Settings (Global)
  localStorage.setItem(DB_PREFIX + "settings", JSON.stringify({
    restaurantName: "Grill & Dine",
    currencySymbol: "₹",
    taxPercent: 5,
    pointsPerRupee: 0.1
  }));

  // 2. Branches
  const branches = [
    { id: "br_junagadh", name: "Junagadh Main Road", address: "Opp. Town Hall, Main Road", city: "Junagadh", phone: "9825012345", openingTime: "10:00", closingTime: "23:00", isActive: true },
    { id: "br_rajkot", name: "Rajkot Ring Road", address: "Crystal Mall Chowk, Kalawad Road", city: "Rajkot", phone: "9825054321", openingTime: "11:00", closingTime: "23:30", isActive: true }
  ];
  db.set("branches", branches);

  // Default selected branch
  localStorage.setItem("selectedBranchId", "br_junagadh");

  // 3. Custom Roles and Permissions (Global)
  const roles = [
    {
      id: "role_admin",
      name: "Admin",
      permissions: {
        dashboard: "full", tables: "full", orders: "full", kitchen: "full", billing: "full",
        menu: "full", reservations: "full", customers: "full", inventory: "full", staff: "full",
        coupons: "full", delivery: "full", reviews: "full", reports: "full", settings: "full",
        roles: "full", branches: "full"
      }
    },
    {
      id: "role_manager",
      name: "Manager",
      permissions: {
        dashboard: "full", tables: "full", orders: "full", kitchen: "full", billing: "full",
        menu: "full", reservations: "full", customers: "full", inventory: "full", staff: "view",
        coupons: "full", delivery: "full", reviews: "full", reports: "full", settings: "view",
        roles: "none", branches: "view"
      }
    },
    {
      id: "role_waiter",
      name: "Waiter",
      permissions: {
        dashboard: "view", tables: "full", orders: "full", kitchen: "none", billing: "view",
        menu: "view", reservations: "full", customers: "full", inventory: "none", staff: "none",
        coupons: "none", delivery: "full", reviews: "full", reports: "none", settings: "none",
        roles: "none", branches: "none"
      }
    },
    {
      id: "role_cashier",
      name: "Cashier",
      permissions: {
        dashboard: "view", tables: "view", orders: "full", kitchen: "none", billing: "full",
        menu: "view", reservations: "none", customers: "full", inventory: "none", staff: "none",
        coupons: "full", delivery: "none", reviews: "none", reports: "none", settings: "none",
        roles: "none", branches: "none"
      }
    },
    {
      id: "role_chef",
      name: "Chef",
      permissions: {
        dashboard: "view", tables: "none", orders: "none", kitchen: "full", billing: "none",
        menu: "none", reservations: "none", customers: "none", inventory: "view", staff: "none",
        coupons: "none", delivery: "none", reviews: "none", reports: "none", settings: "none",
        roles: "none", branches: "none"
      }
    },
    {
      id: "role_delivery",
      name: "Delivery Agent",
      permissions: {
        dashboard: "none", tables: "none", orders: "none", kitchen: "none", billing: "none",
        menu: "none", reservations: "none", customers: "none", inventory: "none", staff: "none",
        coupons: "none", delivery: "full", reviews: "none", reports: "none", settings: "none",
        roles: "none", branches: "none"
      }
    }
  ];
  db.set("roles", roles);

  // 4. Categories (Branch linked)
  const categories = [
    // Junagadh
    { id: "cat_starters_j", branchId: "br_junagadh", name: "Starters (JND)", description: "Appetizers in Junagadh" },
    { id: "cat_mains_j", branchId: "br_junagadh", name: "Main Course (JND)", description: "Mains in Junagadh" },
    { id: "cat_beverages_j", branchId: "br_junagadh", name: "Beverages (JND)", description: "Drinks in Junagadh" },
    // Rajkot
    { id: "cat_starters_r", branchId: "br_rajkot", name: "Starters (RJT)", description: "Appetizers in Rajkot" },
    { id: "cat_mains_r", branchId: "br_rajkot", name: "Main Course (RJT)", description: "Mains in Rajkot" },
    { id: "cat_beverages_r", branchId: "br_rajkot", name: "Beverages (RJT)", description: "Drinks in Rajkot" }
  ];
  db.set("categories", categories);

  // 5. Menu Items (Branch linked)
  const menuItems = [
    // Junagadh items
    {
      id: "menu_paneer_tikka_j",
      branchId: "br_junagadh",
      categoryId: "cat_starters_j",
      name: "Paneer Tikka JND",
      basePrice: 180,
      isVeg: true,
      isAvailable: true,
      image: "🧀",
      variants: [{ name: "Single Portion", price: 180 }, { name: "Double Platter", price: 320 }],
      addons: [{ name: "Extra Mint Chutney", price: 10 }]
    },
    {
      id: "menu_chicken_wings_j",
      branchId: "br_junagadh",
      categoryId: "cat_starters_j",
      name: "Crispy Chicken Wings JND",
      basePrice: 220,
      isVeg: false,
      isAvailable: true,
      image: "🍗",
      variants: [],
      addons: []
    },
    {
      id: "menu_butter_chicken_j",
      branchId: "br_junagadh",
      categoryId: "cat_mains_j",
      name: "Butter Chicken JND",
      basePrice: 260,
      isVeg: false,
      isAvailable: true,
      image: "🥘",
      variants: [{ name: "Half Serving", price: 260 }, { name: "Full Serving", price: 440 }],
      addons: [{ name: "Extra Butter", price: 20 }]
    },
    {
      id: "menu_dal_makhani_j",
      branchId: "br_junagadh",
      categoryId: "cat_mains_j",
      name: "Dal Makhani JND",
      basePrice: 190,
      isVeg: true,
      isAvailable: true,
      image: "🥣",
      variants: [],
      addons: []
    },
    {
      id: "menu_mojito_j",
      branchId: "br_junagadh",
      categoryId: "cat_beverages_j",
      name: "Mint Virgin Mojito JND",
      basePrice: 120,
      isVeg: true,
      isAvailable: true,
      image: "🍹",
      variants: [],
      addons: []
    },
    
    // Rajkot items
    {
      id: "menu_paneer_tikka_r",
      branchId: "br_rajkot",
      categoryId: "cat_starters_r",
      name: "Paneer Tikka RJT",
      basePrice: 190,
      isVeg: true,
      isAvailable: true,
      image: "🧀",
      variants: [{ name: "Single Portion", price: 190 }, { name: "Double Platter", price: 340 }],
      addons: [{ name: "Extra Mint Chutney", price: 10 }]
    },
    {
      id: "menu_chicken_wings_r",
      branchId: "br_rajkot",
      categoryId: "cat_starters_r",
      name: "Crispy Chicken Wings RJT",
      basePrice: 230,
      isVeg: false,
      isAvailable: true,
      image: "🍗",
      variants: [],
      addons: []
    },
    {
      id: "menu_butter_chicken_r",
      branchId: "br_rajkot",
      categoryId: "cat_mains_r",
      name: "Butter Chicken RJT",
      basePrice: 280,
      isVeg: false,
      isAvailable: true,
      image: "🥘",
      variants: [{ name: "Half Serving", price: 280 }, { name: "Full Serving", price: 480 }],
      addons: [{ name: "Extra Butter", price: 20 }]
    },
    {
      id: "menu_dal_makhani_r",
      branchId: "br_rajkot",
      categoryId: "cat_mains_r",
      name: "Dal Makhani RJT",
      basePrice: 200,
      isVeg: true,
      isAvailable: true,
      image: "🥣",
      variants: [],
      addons: []
    },
    {
      id: "menu_mojito_r",
      branchId: "br_rajkot",
      categoryId: "cat_beverages_r",
      name: "Mint Virgin Mojito RJT",
      basePrice: 130,
      isVeg: true,
      isAvailable: true,
      image: "🍹",
      variants: [],
      addons: []
    }
  ];
  db.set("menu", menuItems);

  // 6. Tables (Branch linked)
  const tables = [
    // Junagadh tables
    { id: "tbl_j1", branchId: "br_junagadh", number: "T1 (J)", capacity: 2, status: "available" },
    { id: "tbl_j2", branchId: "br_junagadh", number: "T2 (J)", capacity: 4, status: "available" },
    { id: "tbl_j3", branchId: "br_junagadh", number: "T3 (J)", capacity: 4, status: "occupied" },
    { id: "tbl_j4", branchId: "br_junagadh", number: "T4 (J)", capacity: 6, status: "available" },
    // Rajkot tables
    { id: "tbl_r1", branchId: "br_rajkot", number: "T1 (R)", capacity: 2, status: "available" },
    { id: "tbl_r2", branchId: "br_rajkot", number: "T2 (R)", capacity: 4, status: "available" },
    { id: "tbl_r3", branchId: "br_rajkot", number: "T3 (R)", capacity: 6, status: "occupied" },
    { id: "tbl_r4", branchId: "br_rajkot", number: "T4 (R)", capacity: 8, status: "reserved" }
  ];
  db.set("tables", tables);

  // 7. Staff (Branch linked)
  const staff = [
    // Junagadh Staff
    { id: "stf_admin", branchId: "br_junagadh", name: "Pratham (Admin)", role: "role_admin", phone: "9999900001", email: "admin@grill.com", joinDate: "2025-01-10", isActive: true },
    { id: "stf_manager_j", branchId: "br_junagadh", name: "Sagar (JND Mgr)", role: "role_manager", phone: "9999900002", email: "sagar@grill.com", joinDate: "2025-02-15", isActive: true },
    { id: "stf_chef_j", branchId: "br_junagadh", name: "Chef Rahul (JND)", role: "role_chef", phone: "9999900003", email: "rahul@grill.com", joinDate: "2025-03-01", isActive: true },
    { id: "stf_waiter_j", branchId: "br_junagadh", name: "Waiter Amit (JND)", role: "role_waiter", phone: "9999900004", email: "amit@grill.com", joinDate: "2025-04-10", isActive: true },
    { id: "stf_cashier_j", branchId: "br_junagadh", name: "Cashier Pooja (JND)", role: "role_cashier", phone: "9999900005", email: "pooja@grill.com", joinDate: "2025-04-15", isActive: true },
    
    // Rajkot Staff
    { id: "stf_manager_r", branchId: "br_rajkot", name: "Sagar (RJT Mgr)", role: "role_manager", phone: "9999900102", email: "sagar.r@grill.com", joinDate: "2025-02-15", isActive: true },
    { id: "stf_chef_r", branchId: "br_rajkot", name: "Chef Mohan (RJT)", role: "role_chef", phone: "9999900103", email: "mohan@grill.com", joinDate: "2025-03-01", isActive: true },
    { id: "stf_waiter_r", branchId: "br_rajkot", name: "Waiter Nilesh (RJT)", role: "role_waiter", phone: "9999900104", email: "nilesh@grill.com", joinDate: "2025-04-10", isActive: true },
    { id: "stf_delivery_r", branchId: "br_rajkot", name: "Delivery Rohan (RJT)", role: "role_delivery", phone: "9999900106", email: "rohan@grill.com", joinDate: "2025-05-01", isActive: true }
  ];
  db.set("staff", staff);

  // 8. Customers (Global or Shared across branches)
  const customers = [
    { id: "cust_rajesh", name: "Rajesh Kumar", phone: "9876543210", loyaltyPoints: 35 },
    { id: "cust_priya", name: "Priya Sharma", phone: "9123456789", loyaltyPoints: 120 }
  ];
  db.set("customers", customers);

  // 9. Inventory Items (Branch linked)
  const inventory = [
    // Junagadh ingredients
    { id: "inv_paneer_j", branchId: "br_junagadh", name: "Paneer (Cottage Cheese)", unit: "kg", currentStock: 12.5, reorderLevel: 5.0, costPerUnit: 350 },
    { id: "inv_chicken_j", branchId: "br_junagadh", name: "Fresh Chicken Breast", unit: "kg", currentStock: 18.0, reorderLevel: 8.0, costPerUnit: 220 },
    { id: "inv_butter_j", branchId: "br_junagadh", name: "Amul Butter Placks", unit: "kg", currentStock: 2.1, reorderLevel: 3.0, costPerUnit: 480 },
    // Rajkot ingredients
    { id: "inv_paneer_r", branchId: "br_rajkot", name: "Paneer (Cottage Cheese)", unit: "kg", currentStock: 15.0, reorderLevel: 5.0, costPerUnit: 360 },
    { id: "inv_chicken_r", branchId: "br_rajkot", name: "Fresh Chicken Breast", unit: "kg", currentStock: 12.0, reorderLevel: 8.0, costPerUnit: 230 },
    { id: "inv_butter_r", branchId: "br_rajkot", name: "Amul Butter Placks", unit: "kg", currentStock: 4.5, reorderLevel: 3.0, costPerUnit: 490 }
  ];
  db.set("inventory", inventory);

  // 10. Recipe Mapping (Branch linked)
  const recipes = [
    // Junagadh Recipes
    { id: "rec_j1", branchId: "br_junagadh", menuItemId: "menu_paneer_tikka_j", ingredientId: "inv_paneer_j", quantityRequired: 0.2 },
    { id: "rec_j2", branchId: "br_junagadh", menuItemId: "menu_butter_chicken_j", ingredientId: "inv_chicken_j", quantityRequired: 0.25 },
    { id: "rec_j3", branchId: "br_junagadh", menuItemId: "menu_butter_chicken_j", ingredientId: "inv_butter_j", quantityRequired: 0.05 },
    // Rajkot Recipes
    { id: "rec_r1", branchId: "br_rajkot", menuItemId: "menu_paneer_tikka_r", ingredientId: "inv_paneer_r", quantityRequired: 0.2 },
    { id: "rec_r2", branchId: "br_rajkot", menuItemId: "menu_butter_chicken_r", ingredientId: "inv_chicken_r", quantityRequired: 0.25 },
    { id: "rec_r3", branchId: "br_rajkot", menuItemId: "menu_butter_chicken_r", ingredientId: "inv_butter_r", quantityRequired: 0.05 }
  ];
  db.set("recipes", recipes);

  // 11. Coupons (Branch linked/Global - let's make it branch linked)
  const coupons = [
    { id: "cpn_welcome_j", branchId: "br_junagadh", code: "WELCOME50", type: "flat", value: 50, minOrderValue: 200, validFrom: "2025-01-01", validTill: "2027-12-31", usageLimit: 100, usageCount: 15, isActive: true },
    { id: "cpn_welcome_r", branchId: "br_rajkot", code: "WELCOME50", type: "flat", value: 50, minOrderValue: 200, validFrom: "2025-01-01", validTill: "2027-12-31", usageLimit: 100, usageCount: 5, isActive: true },
    { id: "cpn_festive_r", branchId: "br_rajkot", code: "FESTIVE10", type: "percentage", value: 10, minOrderValue: 400, validFrom: "2025-01-01", validTill: "2027-12-31", usageLimit: 200, usageCount: 2, isActive: true }
  ];
  db.set("coupons", coupons);

  // 12. Reservations (Branch linked)
  const todayISO = new Date().toISOString();
  const reservations = [
    {
      id: "res_j1",
      branchId: "br_junagadh",
      customerName: "Priya Sharma",
      customerPhone: "9123456789",
      dateTime: `${todayISO.slice(0, 10)}T19:30`,
      partySize: 4,
      tableId: "tbl_j2",
      status: "confirmed",
      notes: "High chair needed"
    },
    {
      id: "res_r1",
      branchId: "br_rajkot",
      customerName: "Priya Sharma",
      customerPhone: "9123456789",
      dateTime: `${todayISO.slice(0, 10)}T20:30`,
      partySize: 6,
      tableId: "tbl_r4",
      status: "confirmed",
      notes: "VIP table"
    }
  ];
  db.set("reservations", reservations);

  // 13. Orders (Branch linked)
  const yesterdayISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const orders = [
    // Junagadh Orders
    {
      id: "ord_j_1",
      branchId: "br_junagadh",
      orderNo: "ORD-1001",
      type: "dine_in",
      tableId: "tbl_j2",
      customerPhone: "9876543210",
      items: [
        { itemId: "menu_paneer_tikka_j", name: "Paneer Tikka JND (Single Portion)", quantity: 1, variant: "Single Portion", addons: [], price: 180 }
      ],
      status: "completed",
      subtotal: 180,
      taxPercent: 5,
      tax: 9,
      discount: 50,
      total: 139,
      createdAt: yesterdayISO
    },
    {
      id: "ord_j_2",
      branchId: "br_junagadh",
      orderNo: "ORD-1002",
      type: "dine_in",
      tableId: "tbl_j3",
      customerPhone: "9123456789",
      items: [
        { itemId: "menu_butter_chicken_j", name: "Butter Chicken JND (Full Serving)", quantity: 1, variant: "Full Serving", addons: [], price: 440 }
      ],
      status: "preparing",
      subtotal: 440,
      taxPercent: 5,
      tax: 22,
      discount: 0,
      total: 462,
      createdAt: todayISO
    },

    // Rajkot Orders
    {
      id: "ord_r_1",
      branchId: "br_rajkot",
      orderNo: "ORD-2001",
      type: "dine_in",
      tableId: "tbl_r3",
      customerPhone: "9123456789",
      items: [
        { itemId: "menu_butter_chicken_r", name: "Butter Chicken RJT (Full Serving)", quantity: 1, variant: "Full Serving", addons: [], price: 480 }
      ],
      status: "preparing",
      subtotal: 480,
      taxPercent: 5,
      tax: 24,
      discount: 0,
      total: 504,
      createdAt: todayISO
    }
  ];
  db.set("orders", orders);

  // 14. Reviews (Global or linked via order)
  const reviews = [
    {
      id: "rev_1",
      orderId: "ord_j_1",
      rating: 5,
      comment: "Delicious paneer tikka JND!",
      createdAt: yesterdayISO
    }
  ];
  db.set("reviews", reviews);

  // 15. Payments (Global/Linked via order)
  const payments = [
    {
      id: "pay_1",
      orderId: "ord_j_1",
      amount: 139,
      method: "upi",
      timestamp: yesterdayISO
    }
  ];
  db.set("payments", payments);
}

// Auto-run seeding if empty
if (localStorage.getItem(DB_PREFIX + "settings") === null) {
  seedDatabase();
}
