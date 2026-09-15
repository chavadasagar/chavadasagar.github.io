/**
 * Library Seat Booking & Billing System - Database Module (db.js)
 * Manages localStorage operations, cryptography, and initial data seeding.
 */

(function () {
  // Global Namespace
  window.DB = {
    // Keys
    KEYS: {
      USERS: 'lsb_users',
      SEATS: 'lsb_seats',
      BOOKINGS: 'lsb_bookings',
      PAYMENTS: 'lsb_payments',
      INVOICES: 'lsb_invoices',
      SESSION: 'lsb_session',
      SETTINGS: 'lsb_settings',
      SUBSCRIPTION_PLANS: 'lsb_subscriptionPlans',
      SUBSCRIPTIONS: 'lsb_subscriptions'
    },

    /**
     * Generate a unique ID with a prefix.
     * Works offline and across all contexts (including file:// protocol).
     */
    generateId: function (prefix = 'id') {
      const randomPart = Math.random().toString(36).substring(2, 11);
      const timePart = Date.now().toString(36);
      return `${prefix}_${randomPart}${timePart}`;
    },

    /**
     * Hash password using SHA-256 via SubtleCrypto.
     * Returns a Promise resolving to a hex string.
     */
    hashPassword: async function (password) {
      try {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
      } catch (e) {
        // Fallback simple hash for environments where SubtleCrypto might fail
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
          const char = password.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash |= 0;
        }
        return 'fallback_' + Math.abs(hash).toString(16);
      }
    },

    // Core localStorage CRUD Helper functions
    getAll: function (key) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    },

    saveAll: function (key, data) {
      localStorage.setItem(key, JSON.stringify(data));
    },

    getById: function (key, id) {
      const list = this.getAll(key);
      return list.find(item => item.id === id) || null;
    },

    insert: function (key, obj) {
      const list = this.getAll(key);
      if (!obj.id) {
        obj.id = this.generateId(key.replace('lsb_', '').substring(0, 4));
      }
      list.push(obj);
      this.saveAll(key, list);
      return obj;
    },

    update: function (key, id, updates) {
      const list = this.getAll(key);
      const idx = list.findIndex(item => item.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        this.saveAll(key, list);
        return list[idx];
      }
      return null;
    },

    remove: function (key, id) {
      const list = this.getAll(key);
      const filtered = list.filter(item => item.id !== id);
      this.saveAll(key, filtered);
      return filtered.length < list.length;
    },

    /**
     * Database Initialization / Seeding
     */
    init: async function () {
      // 1. Seed Settings
      if (!localStorage.getItem(this.KEYS.SETTINGS)) {
        const defaultSettings = {
          rates: {
            'AC': 200,
            'Non-AC': 120,
            'Cabin': 350
          },
          overdueDays: 2,
          gstPercentage: 18,
          gstEnabled: true,
          libraryName: 'Apex Study Center & Library',
          address: '404 Knowledge Hub, Sector 15, Gurgaon, HR',
          gstNumber: '06AAAAA1111A1Z1',
          logoBase64: ''
        };
        this.saveAll(this.KEYS.SETTINGS, defaultSettings);
      }

      // 2. Seed Admin User
      const users = this.getAll(this.KEYS.USERS);
      const adminExists = users.some(u => u.username === 'admin');
      if (!adminExists) {
        const adminPasswordHash = await this.hashPassword('admin123');
        const adminUser = {
          id: 'usr_admin',
          name: 'System Administrator',
          username: 'admin',
          passwordHash: adminPasswordHash,
          contact: '+919999999999',
          createdAt: new Date().toISOString(),
          isActive: true,
          isAdmin: true
        };
        users.push(adminUser);
        this.saveAll(this.KEYS.USERS, users);
      }

      // 3. Seed Seats
      const seats = this.getAll(this.KEYS.SEATS);
      if (seats.length === 0) {
        const sampleSeats = [
          { id: 'seat_a1', seatNumber: 'A-1', zone: 'AC', status: 'Available', blockedReason: '' },
          { id: 'seat_a2', seatNumber: 'A-2', zone: 'AC', status: 'Available', blockedReason: '' },
          { id: 'seat_a3', seatNumber: 'A-3', zone: 'AC', status: 'Available', blockedReason: '' },
          { id: 'seat_a4', seatNumber: 'A-4', zone: 'AC', status: 'Available', blockedReason: '' },
          { id: 'seat_b1', seatNumber: 'B-1', zone: 'Non-AC', status: 'Available', blockedReason: '' },
          { id: 'seat_b2', seatNumber: 'B-2', zone: 'Non-AC', status: 'Available', blockedReason: '' },
          { id: 'seat_b3', seatNumber: 'B-3', zone: 'Non-AC', status: 'Available', blockedReason: '' },
          { id: 'seat_b4', seatNumber: 'B-4', zone: 'Non-AC', status: 'Available', blockedReason: '' },
          { id: 'seat_c1', seatNumber: 'C-1', zone: 'Cabin', status: 'Available', blockedReason: '' },
          { id: 'seat_c2', seatNumber: 'C-2', zone: 'Cabin', status: 'Available', blockedReason: '' }
        ];
        this.saveAll(this.KEYS.SEATS, sampleSeats);
      }

      // 4. Seed Subscription Plans
      const plans = this.getAll(this.KEYS.SUBSCRIPTION_PLANS);
      if (plans.length === 0) {
        const defaultPlans = [
          {
            id: 'subplan_m_ac',
            name: 'AC Monthly Pass',
            type: 'Monthly',
            price: 3500,
            seatType: 'AC',
            seatAllocationType: 'FlexibleDaily',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'subplan_y_vip',
            name: 'Cabin Yearly Pass (Fixed Cabin)',
            type: 'Yearly',
            price: 45000,
            seatType: 'Cabin',
            seatAllocationType: 'FixedSeat',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'subplan_m_nonac',
            name: 'Non-AC Monthly Pass',
            type: 'Monthly',
            price: 2200,
            seatType: 'Non-AC',
            seatAllocationType: 'FlexibleDaily',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ];
        this.saveAll(this.KEYS.SUBSCRIPTION_PLANS, defaultPlans);
      }
    }
  };
})();
