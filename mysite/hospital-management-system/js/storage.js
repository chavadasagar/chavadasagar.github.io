/**
 * storage.js - Local Storage Management Layer for HMS
 */

window.HMS_DB = {
  // Constants for localStorage keys
  KEYS: {
    USERS: 'hms_users',
    PATIENTS: 'hms_patients',
    DEPARTMENTS: 'hms_departments',
    DOCTORS: 'hms_doctors',
    STAFF: 'hms_staff',
    APPOINTMENTS: 'hms_appointments',
    REMINDERS: 'hms_appointment_reminders',
    WARDS: 'hms_wards',
    BEDS: 'hms_beds',
    ADMISSIONS: 'hms_admissions',
    MEDICAL_RECORDS: 'hms_medical_records',
    PRESCRIPTIONS: 'hms_prescriptions',
    PRESCRIPTION_ITEMS: 'hms_prescription_items',
    LAB_TESTS: 'hms_lab_tests',
    LAB_TEST_ORDERS: 'hms_lab_test_orders',
    MEDICINES: 'hms_medicines',
    INVENTORY_TXS: 'hms_inventory_transactions',
    SUPPLIERS: 'hms_suppliers',
    INVOICES: 'hms_invoices',
    INVOICE_ITEMS: 'hms_invoice_items',
    PAYMENTS: 'hms_payments',
    INSURANCE_CLAIMS: 'hms_insurance_claims',
    OTS: 'hms_operation_theatres',
    SURGERIES: 'hms_surgeries',
    SURGERY_TEAM: 'hms_surgery_team',
    AMBULANCES: 'hms_ambulances',
    AMBULANCE_REQUESTS: 'hms_ambulance_requests',
    SESSION: 'hms_current_session'
  },

  // Generates a unique v4-like ID
  generateUUID: function() {
    return 'hms-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  },

  // Basic storage utilities
  get: function(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  set: function(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // CRUD helpers
  getAll: function(key) {
    return this.get(key);
  },

  getById: function(key, id) {
    const list = this.get(key);
    return list.find(item => item.id === id) || null;
  },

  insert: function(key, record) {
    const list = this.get(key);
    const now = new Date().toISOString();
    record.id = record.id || this.generateUUID();
    record.created_at = now;
    record.updated_at = now;
    list.push(record);
    this.set(key, list);
    return record;
  },

  update: function(key, id, updates) {
    const list = this.get(key);
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return null;
    
    list[idx] = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.set(key, list);
    return list[idx];
  },

  delete: function(key, id) {
    const list = this.get(key);
    const filtered = list.filter(item => item.id !== id);
    if (list.length === filtered.length) return false;
    this.set(key, filtered);
    return true;
  },

  // Check if a record is referenced elsewhere (Referential Integrity Check)
  isReferenced: function(key, id) {
    if (key === this.KEYS.DOCTORS) {
      const appointments = this.getAll(this.KEYS.APPOINTMENTS);
      const surgeries = this.getAll(this.KEYS.SURGERIES);
      const activeAppt = appointments.some(a => a.doctor_id === id && ['Scheduled', 'Confirmed'].includes(a.status));
      const activeSurg = surgeries.some(s => s.lead_surgeon_id === id && ['Scheduled', 'In Progress'].includes(s.status));
      return activeAppt || activeSurg;
    }
    if (key === this.KEYS.PATIENTS) {
      const appointments = this.getAll(this.KEYS.APPOINTMENTS);
      const admissions = this.getAll(this.KEYS.ADMISSIONS);
      const activeAppt = appointments.some(a => a.patient_id === id && ['Scheduled', 'Confirmed'].includes(a.status));
      const activeAdmit = admissions.some(a => a.patient_id === id && a.status === 'Admitted');
      return activeAppt || activeAdmit;
    }
    if (key === this.KEYS.DEPARTMENTS) {
      const doctors = this.getAll(this.KEYS.DOCTORS);
      return doctors.some(d => d.department_id === id);
    }
    if (key === this.KEYS.MEDICINES) {
      const prescrItems = this.getAll(this.KEYS.PRESCRIPTION_ITEMS);
      return prescrItems.some(item => item.medicine_id === id);
    }
    if (key === this.KEYS.WARDS) {
      const beds = this.getAll(this.KEYS.BEDS);
      return beds.some(b => b.ward_id === id && b.status === 'Occupied');
    }
    if (key === this.KEYS.AMBULANCES) {
      const requests = this.getAll(this.KEYS.AMBULANCE_REQUESTS);
      return requests.some(r => r.ambulance_id === id && ['Requested', 'Dispatched'].includes(r.status));
    }
    return false;
  },

  // Custom scheduling/checking logic
  isDoctorAvailable: function(doctorId, dateStr, timeSlot) {
    const appointments = this.getAll(this.KEYS.APPOINTMENTS);
    const conflict = appointments.some(a => 
      a.doctor_id === doctorId && 
      a.date === dateStr && 
      a.time_slot === timeSlot && 
      !['Cancelled', 'No-Show'].includes(a.status)
    );
    return !conflict;
  },

  // Auth Helpers
  getCurrentSession: function() {
    const sess = localStorage.getItem(this.KEYS.SESSION);
    return sess ? JSON.parse(sess) : null;
  },

  setCurrentSession: function(user) {
    if (user) {
      localStorage.setItem(this.KEYS.SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.KEYS.SESSION);
    }
  }
};
