/**
 * db.js - LocalStorage Database Access Layer & Seeding
 */

const DB_PREFIX = 'hms_';

const db = {
  // Helper to load collection from localStorage
  _load(collectionName) {
    const data = localStorage.getItem(DB_PREFIX + collectionName);
    return data ? JSON.parse(data) : [];
  },

  // Helper to save collection to localStorage
  _save(collectionName, data) {
    localStorage.setItem(DB_PREFIX + collectionName, JSON.stringify(data));
  },

  // Get all records in a collection
  getAll(collectionName) {
    return this._load(collectionName);
  },

  // Get single record by ID
  getById(collectionName, id) {
    const collection = this._load(collectionName);
    return collection.find(item => item.id === id) || null;
  },

  // Insert a new record
  create(collectionName, record) {
    const collection = this._load(collectionName);
    if (!record.id) {
      record.id = 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    record.createdAt = record.createdAt || new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    collection.push(record);
    this._save(collectionName, collection);
    return record;
  },

  // Update an existing record
  update(collectionName, id, updatedFields) {
    const collection = this._load(collectionName);
    const index = collection.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    collection[index] = {
      ...collection[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };
    this._save(collectionName, collection);
    return collection[index];
  },

  // Delete a record
  delete(collectionName, id) {
    const collection = this._load(collectionName);
    const filtered = collection.filter(item => item.id !== id);
    this._save(collectionName, filtered);
    return true;
  },

  // Custom queries
  query(collectionName, predicateFn) {
    const collection = this._load(collectionName);
    return collection.filter(predicateFn);
  },

  // Force re-seed database with demo data
  resetAndSeed() {
    // Clear our keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(DB_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    this.seed();
  },

  // Seed default dataset
  seed() {
    if (this.getAll('users').length > 0) {
      return; // Already seeded
    }

    console.log("Seeding Hotel Management System Database...");

    // 1. Users
    const users = [
      { id: 'usr_admin', username: 'admin', password: 'admin123', role: 'Admin', name: 'John Admin' },
      { id: 'usr_manager', username: 'manager', password: 'manager123', role: 'Manager', name: 'Sarah Manager' },
      { id: 'usr_recep', username: 'recep', password: 'recep123', role: 'Receptionist', name: 'Robert Front Desk' },
      { id: 'usr_housekeeping', username: 'housekeeper', password: 'housekeeper123', role: 'Housekeeping Staff', name: 'Elena Cleaner' }
    ];
    this._save('users', users);

    // 2. Hotel Properties
    const hotels = [
      { id: 'hot_1', name: 'StayEase Royal Plaza', address: '128 Hospitality Boulevard, Suite 500', phone: '+1 (555) 019-2834', email: 'royal@stayease.com', taxRate: 12, checkInTime: '14:00', checkOutTime: '11:00' }
    ];
    this._save('hotels', hotels);

    // 3. Floors
    const floors = [
      { id: 'flr_1', number: 1, name: 'Ground Floor' },
      { id: 'flr_2', number: 2, name: 'Second Floor' },
      { id: 'flr_3', number: 3, name: 'Third Floor Penthouse' }
    ];
    this._save('floors', floors);

    // 4. Room Types
    const roomTypes = [
      { id: 'rt_single', name: 'Standard Single', basePrice: 1200, maxAdults: 1, maxChildren: 0, bedType: 'Single Bed', size: '180 sq ft', amenities: ['WiFi', 'TV', 'AC'], image: '🛏️' },
      { id: 'rt_double', name: 'Deluxe Double', basePrice: 2200, maxAdults: 2, maxChildren: 1, bedType: 'Queen Bed', size: '280 sq ft', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'], image: '🛏️🛏️' },
      { id: 'rt_family', name: 'Executive Suite', basePrice: 4500, maxAdults: 4, maxChildren: 2, bedType: '2 King Beds', size: '520 sq ft', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Safe'], image: '🏨' },
      { id: 'rt_penthouse', name: 'Presidential Penthouse', basePrice: 9500, maxAdults: 6, maxChildren: 4, bedType: '3 King Beds', size: '1200 sq ft', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Safe', 'Kitchenette'], image: '👑' }
    ];
    this._save('roomTypes', roomTypes);

    // 5. Rooms
    const rooms = [
      // Floor 1 (Standard & Deluxe)
      { id: 'rm_101', roomNumber: '101', floorId: 'flr_1', roomTypeId: 'rt_single', status: 'Available', housekeepingStatus: 'Clean', viewType: 'City View', smokingAllowed: false },
      { id: 'rm_102', roomNumber: '102', floorId: 'flr_1', roomTypeId: 'rt_single', status: 'Available', housekeepingStatus: 'Clean', viewType: 'City View', smokingAllowed: false },
      { id: 'rm_103', roomNumber: '103', floorId: 'flr_1', roomTypeId: 'rt_single', status: 'Available', housekeepingStatus: 'Dirty', viewType: 'No View', smokingAllowed: true },
      { id: 'rm_104', roomNumber: '104', floorId: 'flr_1', roomTypeId: 'rt_double', status: 'Occupied', housekeepingStatus: 'Clean', viewType: 'Garden View', smokingAllowed: false },
      { id: 'rm_105', roomNumber: '105', floorId: 'flr_1', roomTypeId: 'rt_double', status: 'Occupied', housekeepingStatus: 'Clean', viewType: 'Garden View', smokingAllowed: false },
      { id: 'rm_106', roomNumber: '106', floorId: 'flr_1', roomTypeId: 'rt_double', status: 'Maintenance', housekeepingStatus: 'Dirty', viewType: 'City View', smokingAllowed: false },
      { id: 'rm_107', roomNumber: '107', floorId: 'flr_1', roomTypeId: 'rt_double', status: 'Blocked', housekeepingStatus: 'Clean', viewType: 'City View', smokingAllowed: false },

      // Floor 2 (Double & Executive Suite)
      { id: 'rm_201', roomNumber: '201', floorId: 'flr_2', roomTypeId: 'rt_double', status: 'Available', housekeepingStatus: 'Clean', viewType: 'Pool View', smokingAllowed: false },
      { id: 'rm_202', roomNumber: '202', floorId: 'flr_2', roomTypeId: 'rt_double', status: 'Available', housekeepingStatus: 'Clean', viewType: 'Pool View', smokingAllowed: false },
      { id: 'rm_203', roomNumber: '203', floorId: 'flr_2', roomTypeId: 'rt_double', status: 'Available', housekeepingStatus: 'Clean', viewType: 'City View', smokingAllowed: true },
      { id: 'rm_204', roomNumber: '204', floorId: 'flr_2', roomTypeId: 'rt_family', status: 'Occupied', housekeepingStatus: 'Clean', viewType: 'Pool View', smokingAllowed: false },
      { id: 'rm_205', roomNumber: '205', floorId: 'flr_2', roomTypeId: 'rt_family', status: 'Available', housekeepingStatus: 'Clean', viewType: 'Pool View', smokingAllowed: false },
      { id: 'rm_206', roomNumber: '206', floorId: 'flr_2', roomTypeId: 'rt_family', status: 'Available', housekeepingStatus: 'Dirty', viewType: 'Garden View', smokingAllowed: false },

      // Floor 3 (Executive Suite & Presidential Penthouse)
      { id: 'rm_301', roomNumber: '301', floorId: 'flr_3', roomTypeId: 'rt_family', status: 'Available', housekeepingStatus: 'Clean', viewType: 'Skyline View', smokingAllowed: false },
      { id: 'rm_302', roomNumber: '302', floorId: 'flr_3', roomTypeId: 'rt_family', status: 'Available', housekeepingStatus: 'Clean', viewType: 'Skyline View', smokingAllowed: false },
      { id: 'rm_303', roomNumber: '303', floorId: 'flr_3', roomTypeId: 'rt_penthouse', status: 'Occupied', housekeepingStatus: 'Clean', viewType: '360 Panoramic Skyline View', smokingAllowed: false },
      { id: 'rm_304', roomNumber: '304', floorId: 'flr_3', roomTypeId: 'rt_penthouse', status: 'Available', housekeepingStatus: 'Clean', viewType: '360 Panoramic Skyline View', smokingAllowed: false }
    ];
    this._save('rooms', rooms);

    // 6. Amenities Master List
    const amenities = [
      { id: 'am_wifi', name: 'High-speed WiFi', category: 'Connectivity' },
      { id: 'am_tv', name: 'Smart TV with Streaming', category: 'Entertainment' },
      { id: 'am_ac', name: 'Central Air Conditioning', category: 'Climate' },
      { id: 'am_minibar', name: 'Fully Stocked Mini Bar', category: 'Refreshment' },
      { id: 'am_balcony', name: 'Private Balcony', category: 'Facility' },
      { id: 'am_safe', name: 'Digital Safety Deposit Box', category: 'Security' },
      { id: 'am_kitchenette', name: 'Private Kitchenette', category: 'Facility' }
    ];
    this._save('amenities', amenities);

    // 7. Guests
    const guests = [
      { id: 'gst_1', name: 'Alice Smith', email: 'alice.smith@example.com', phone: '+15550100234', dob: '1988-04-12', gender: 'Female', nationality: 'United States', address: '452 Elm St, Boston, MA' },
      { id: 'gst_2', name: 'Bob Johnson', email: 'bob.johnson@example.com', phone: '+15550119283', dob: '1975-09-22', gender: 'Male', nationality: 'Canada', address: '12 Yonge St, Toronto, ON' },
      { id: 'gst_3', name: 'Carlos Gomez', email: 'carlos.gomez@example.com', phone: '+34600123456', dob: '1992-11-05', gender: 'Male', nationality: 'Spain', address: 'Calle Mayor 14, Madrid' },
      { id: 'gst_4', name: 'Diana Prince', email: 'diana.prince@example.com', phone: '+15550143829', dob: '1985-02-18', gender: 'Female', nationality: 'United Kingdom', address: '77 Gateway Lane, London' },
      { id: 'gst_5', name: 'Evan Wright', email: 'evan.wright@example.com', phone: '+61298765432', dob: '1990-07-30', gender: 'Male', nationality: 'Australia', address: '88 George St, Sydney, NSW' },
      { id: 'gst_6', name: 'Fiona Gallagher', email: 'fiona.g@example.com', phone: '+15550193498', dob: '1995-10-04', gender: 'Female', nationality: 'United States', address: '2119 North Ave, Chicago, IL' },
      { id: 'gst_7', name: 'Gaurav Sharma', email: 'gaurav.sharma@example.com', phone: '+919876543210', dob: '1987-03-25', gender: 'Male', nationality: 'India', address: 'Sector 15, Gurgaon, HR' },
      { id: 'gst_8', name: 'Helen Mirren', email: 'helen.m@example.com', phone: '+442079460192', dob: '1955-07-26', gender: 'Female', nationality: 'United Kingdom', address: '42 Kensington Gardens, London' },
      { id: 'gst_9', name: 'Ian Chen', email: 'ian.chen@example.com', phone: '+861065551234', dob: '2000-01-15', gender: 'Male', nationality: 'China', address: 'Chaoyang District, Beijing' },
      { id: 'gst_10', name: 'Julia Roberts', email: 'julia.r@example.com', phone: '+15550172345', dob: '1967-10-28', gender: 'Female', nationality: 'United States', address: 'Malibu Coast Rd, Malibu, CA' }
    ];
    this._save('guests', guests);

    // Guest ID Proofs
    const guestIdProofs = [
      { id: 'idp_1', guestId: 'gst_1', type: 'Passport', number: 'US123456789', filePlaceholder: 'passport_alice.png' },
      { id: 'idp_2', guestId: 'gst_2', type: 'Driving License', number: 'DL-CAN-8837112', filePlaceholder: 'dl_bob.png' },
      { id: 'idp_7', guestId: 'gst_7', type: 'Aadhaar', number: '1234-5678-9012', filePlaceholder: 'aadhaar_gaurav.png' }
    ];
    this._save('guestIdProofs', guestIdProofs);

    // Loyalty Accounts
    const loyaltyAccounts = [
      { id: 'loy_1', guestId: 'gst_1', tier: 'Gold', pointsBalance: 2450, totalStays: 4 },
      { id: 'loy_2', guestId: 'gst_2', tier: 'Silver', pointsBalance: 800, totalStays: 2 },
      { id: 'loy_7', guestId: 'gst_7', tier: 'Platinum', pointsBalance: 6200, totalStays: 9 }
    ];
    this._save('loyaltyAccounts', loyaltyAccounts);

    // 8. Promo Codes
    const promoCodes = [
      { id: 'pr_1', code: 'WELCOME10', type: 'Percentage', value: 10, minAmount: 1000, description: '10% discount for first-time guests', startDate: '2026-01-01', endDate: '2026-12-31', usageLimit: 500, usageCount: 42, active: true },
      { id: 'pr_2', code: 'ROYAL500', type: 'Flat', value: 500, minAmount: 3000, description: 'Flat $500 discount on Executive and Penthouse suites', startDate: '2026-06-01', endDate: '2026-09-30', usageLimit: 100, usageCount: 15, active: true },
      { id: 'pr_3', code: 'STAYGOLD', type: 'Percentage', value: 15, minAmount: 2000, description: 'Exclusive 15% discount for Gold/Platinum loyalty members', startDate: '2026-01-01', endDate: '2026-12-31', usageLimit: 200, usageCount: 8, active: true }
    ];
    this._save('promoCodes', promoCodes);

    // Helper to construct ISO dates relative to today
    const getRelativeDateString = (offsetDays) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    // 9. Bookings & BookingRooms
    // Let's create past, current, and future bookings
    const bookings = [
      // Booking 1: Past Checked-out stay
      {
        id: 'bk_1',
        bookingReferenceNo: 'STAY-2026-0001',
        guestId: 'gst_1',
        hotelId: 'hot_1',
        bookingSource: 'Website',
        bookingStatus: 'CheckedOut',
        checkInDate: getRelativeDateString(-5),
        checkOutDate: getRelativeDateString(-2),
        actualCheckInTime: getRelativeDateString(-5) + 'T14:15:00Z',
        actualCheckOutTime: getRelativeDateString(-2) + 'T10:45:00Z',
        totalAdults: 1,
        totalChildren: 0,
        specialRequests: 'High floor, feather pillows.',
        totalAmount: 3600,
        discountAmount: 360, // used WELCOME10
        createdByEmployeeId: 'emp_2',
        createdAt: getRelativeDateString(-15) + 'T09:30:00Z'
      },
      // Booking 2: Current stay (Checked In room 104)
      {
        id: 'bk_2',
        bookingReferenceNo: 'STAY-2026-0002',
        guestId: 'gst_2',
        hotelId: 'hot_1',
        bookingSource: 'OTA',
        bookingStatus: 'CheckedIn',
        checkInDate: getRelativeDateString(-2),
        checkOutDate: getRelativeDateString(2),
        actualCheckInTime: getRelativeDateString(-2) + 'T14:40:00Z',
        actualCheckOutTime: null,
        totalAdults: 2,
        totalChildren: 1,
        specialRequests: 'Baby cot needed.',
        totalAmount: 8800,
        discountAmount: 0,
        createdByEmployeeId: 'emp_2',
        createdAt: getRelativeDateString(-10) + 'T11:20:00Z'
      },
      // Booking 3: Current stay (Checked In room 204)
      {
        id: 'bk_3',
        bookingReferenceNo: 'STAY-2026-0003',
        guestId: 'gst_7',
        hotelId: 'hot_1',
        bookingSource: 'WalkIn',
        bookingStatus: 'CheckedIn',
        checkInDate: getRelativeDateString(-1),
        checkOutDate: getRelativeDateString(3),
        actualCheckInTime: getRelativeDateString(-1) + 'T15:00:00Z',
        actualCheckOutTime: null,
        totalAdults: 3,
        totalChildren: 1,
        specialRequests: 'Near elevator, extra water bottles.',
        totalAmount: 18000,
        discountAmount: 2700, // STAYGOLD 15%
        createdByEmployeeId: 'emp_1',
        createdAt: getRelativeDateString(-1) + 'T14:45:00Z'
      },
      // Booking 4: Current stay (Checked In Room 303 Penthouse)
      {
        id: 'bk_4',
        bookingReferenceNo: 'STAY-2026-0004',
        guestId: 'gst_4',
        hotelId: 'hot_1',
        bookingSource: 'Phone',
        bookingStatus: 'CheckedIn',
        checkInDate: getRelativeDateString(-3),
        checkOutDate: getRelativeDateString(1),
        actualCheckInTime: getRelativeDateString(-3) + 'T16:10:00Z',
        actualCheckOutTime: null,
        totalAdults: 2,
        totalChildren: 0,
        specialRequests: 'Champagne on arrival.',
        totalAmount: 38000,
        discountAmount: 500, // ROYAL500
        createdByEmployeeId: 'emp_1',
        createdAt: getRelativeDateString(-8) + 'T16:00:00Z'
      },
      // Booking 5: Upcoming Confirmed stay
      {
        id: 'bk_5',
        bookingReferenceNo: 'STAY-2026-0005',
        guestId: 'gst_3',
        hotelId: 'hot_1',
        bookingSource: 'Website',
        bookingStatus: 'Confirmed',
        checkInDate: getRelativeDateString(1),
        checkOutDate: getRelativeDateString(4),
        actualCheckInTime: null,
        actualCheckOutTime: null,
        totalAdults: 2,
        totalChildren: 0,
        specialRequests: 'Quiet room.',
        totalAmount: 6600,
        discountAmount: 0,
        createdByEmployeeId: 'emp_2',
        createdAt: getRelativeDateString(-2) + 'T10:15:00Z'
      },
      // Booking 6: Upcoming Confirmed stay
      {
        id: 'bk_6',
        bookingReferenceNo: 'STAY-2026-0006',
        guestId: 'gst_10',
        hotelId: 'hot_1',
        bookingSource: 'Website',
        bookingStatus: 'Confirmed',
        checkInDate: getRelativeDateString(3),
        checkOutDate: getRelativeDateString(6),
        actualCheckInTime: null,
        actualCheckOutTime: null,
        totalAdults: 1,
        totalChildren: 0,
        specialRequests: 'Allergies: no wool blankets.',
        totalAmount: 3600,
        discountAmount: 0,
        createdByEmployeeId: 'emp_2',
        createdAt: getRelativeDateString(-1) + 'T08:00:00Z'
      },
      // Booking 7: Cancelled stay
      {
        id: 'bk_7',
        bookingReferenceNo: 'STAY-2026-0007',
        guestId: 'gst_6',
        hotelId: 'hot_1',
        bookingSource: 'OTA',
        bookingStatus: 'Cancelled',
        checkInDate: getRelativeDateString(-2),
        checkOutDate: getRelativeDateString(0),
        actualCheckInTime: null,
        actualCheckOutTime: null,
        totalAdults: 2,
        totalChildren: 0,
        specialRequests: 'Flight cancelled.',
        totalAmount: 4400,
        discountAmount: 0,
        createdByEmployeeId: 'emp_2',
        createdAt: getRelativeDateString(-5) + 'T12:00:00Z'
      }
    ];
    this._save('bookings', bookings);

    // bookingRooms mapping
    const bookingRooms = [
      { id: 'bkr_1', bookingId: 'bk_1', roomId: 'rm_101', ratePerNight: 1200, nights: 3, roomStatus: 'CheckedOut' },
      { id: 'bkr_2', bookingId: 'bk_2', roomId: 'rm_104', ratePerNight: 2200, nights: 4, roomStatus: 'CheckedIn' },
      { id: 'bkr_3', bookingId: 'bk_3', roomId: 'rm_204', ratePerNight: 4500, nights: 4, roomStatus: 'CheckedIn' },
      { id: 'bkr_4', bookingId: 'bk_4', roomId: 'rm_303', ratePerNight: 9500, nights: 4, roomStatus: 'CheckedIn' },
      // Upcoming bookings block rooms (rooms will be blocked during date range check, but room.status is "Available" when viewed on floor plan today)
      { id: 'bkr_5', bookingId: 'bk_5', roomId: 'rm_201', ratePerNight: 2200, nights: 3, roomStatus: 'Reserved' },
      { id: 'bkr_6', bookingId: 'bk_6', roomId: 'rm_102', ratePerNight: 1200, nights: 3, roomStatus: 'Reserved' }
    ];
    this._save('bookingRooms', bookingRooms);

    // 10. Billing, Invoices & Payments
    const invoices = [
      // Invoice 1: Past stay (Fully Paid)
      { id: 'inv_1', invoiceNumber: 'INV-2026-0001', bookingId: 'bk_1', subTotal: 3600, taxAmount: 388.8, discountAmount: 360, totalAmount: 3628.8, invoiceDate: getRelativeDateString(-2), paymentStatus: 'Paid' },
      // Invoice 2: Current stay (Partially Paid)
      { id: 'inv_2', invoiceNumber: 'INV-2026-0002', bookingId: 'bk_2', subTotal: 8800, taxAmount: 1056, discountAmount: 0, totalAmount: 9856, invoiceDate: getRelativeDateString(-2), paymentStatus: 'PartiallyPaid' },
      // Invoice 3: Current stay (Unpaid)
      { id: 'inv_3', invoiceNumber: 'INV-2026-0003', bookingId: 'bk_3', subTotal: 18000, taxAmount: 1836, discountAmount: 2700, totalAmount: 17136, invoiceDate: getRelativeDateString(-1), paymentStatus: 'Unpaid' },
      // Invoice 4: Current stay (Fully Paid in advance)
      { id: 'inv_4', invoiceNumber: 'INV-2026-0004', bookingId: 'bk_4', subTotal: 38000, taxAmount: 4500, discountAmount: 500, totalAmount: 42000, invoiceDate: getRelativeDateString(-3), paymentStatus: 'Paid' }
    ];
    this._save('invoices', invoices);

    const invoiceItems = [
      // Items for past stay bk_1
      { id: 'ivi_1', invoiceId: 'inv_1', itemType: 'RoomCharge', description: 'Room 101 - Standard Single (3 nights)', quantity: 3, unitPrice: 1200, amount: 3600 },
      // Items for current bk_2
      { id: 'ivi_2', invoiceId: 'inv_2', itemType: 'RoomCharge', description: 'Room 104 - Deluxe Double (4 nights)', quantity: 4, unitPrice: 2200, amount: 8800 },
      // Items for current bk_3
      { id: 'ivi_3', invoiceId: 'inv_3', itemType: 'RoomCharge', description: 'Room 204 - Executive Suite (4 nights)', quantity: 4, unitPrice: 4500, amount: 18000 },
      // Items for penthouse bk_4
      { id: 'ivi_4', invoiceId: 'inv_4', itemType: 'RoomCharge', description: 'Room 303 - Presidential Penthouse (4 nights)', quantity: 4, unitPrice: 9500, amount: 38000 }
    ];
    this._save('invoiceItems', invoiceItems);

    const payments = [
      // Past stay payment (Cash)
      { id: 'pmt_1', invoiceId: 'inv_1', paymentMode: 'Cash', amount: 3628.8, transactionReference: 'CASH-99881', paymentDate: getRelativeDateString(-2) + 'T10:45:00Z' },
      // Current stay invoice_2 partial payment (Card)
      { id: 'pmt_2', invoiceId: 'inv_2', paymentMode: 'Card', amount: 5000, transactionReference: 'TXN-CARD-88371', paymentDate: getRelativeDateString(-2) + 'T14:45:00Z' },
      // Current stay invoice_4 full advance payment (UPI)
      { id: 'pmt_3', invoiceId: 'inv_4', paymentMode: 'UPI', amount: 42000, transactionReference: 'UPI-RAZOR-99182', paymentDate: getRelativeDateString(-3) + 'T16:15:00Z' }
    ];
    this._save('payments', payments);

    // 11. Staff, Departments & Employees
    const departments = [
      { id: 'dept_front', name: 'Front Desk / Reception' },
      { id: 'dept_hk', name: 'Housekeeping' },
      { id: 'dept_maint', name: 'Maintenance & Facility' },
      { id: 'dept_fb', name: 'Food & Beverage' },
      { id: 'dept_admin', name: 'Administration' }
    ];
    this._save('departments', departments);

    const employees = [
      { id: 'emp_1', name: 'Sarah Jenkins', departmentId: 'dept_front', role: 'Front Desk Lead', shift: 'Morning', phone: '+1 555-010-0992', email: 'sjenkins@stayease.com', status: 'Active' },
      { id: 'emp_2', name: 'Robert Chen', departmentId: 'dept_front', role: 'Receptionist', shift: 'Evening', phone: '+1 555-010-0988', email: 'rchen@stayease.com', status: 'Active' },
      { id: 'emp_3', name: 'Elena Rostova', departmentId: 'dept_hk', role: 'Housekeeping Supervisor', shift: 'Morning', phone: '+1 555-010-0811', email: 'erostova@stayease.com', status: 'Active' },
      { id: 'emp_4', name: 'Marcus Miller', departmentId: 'dept_maint', role: 'Chief Technician', shift: 'Morning', phone: '+1 555-010-0844', email: 'mmiller@stayease.com', status: 'Active' },
      { id: 'emp_5', name: 'David Cho', departmentId: 'dept_fb', role: 'Room Service Captain', shift: 'Night', phone: '+1 555-010-0899', email: 'dcho@stayease.com', status: 'Active' }
    ];
    this._save('employees', employees);

    // 12. Services & Service Orders
    const services = [
      { id: 'srv_1', category: 'Room Service', name: 'Club Sandwich with Fries', price: 350 },
      { id: 'srv_2', category: 'Room Service', name: 'Classic Beef Burger', price: 450 },
      { id: 'srv_3', category: 'Room Service', name: 'Hot Cappuccino / Tea', price: 120 },
      { id: 'srv_4', category: 'Laundry', name: 'Express Shirt Wash & Iron', price: 150 },
      { id: 'srv_5', category: 'Spa', name: 'Aromatherapy Massage (60 mins)', price: 1800 },
      { id: 'srv_6', category: 'Transport', name: 'Airport Shuttle Dropoff', price: 1200 }
    ];
    this._save('services', services);

    const serviceOrders = [
      { id: 'svo_1', bookingId: 'bk_2', roomId: 'rm_104', serviceId: 'srv_1', quantity: 2, status: 'Delivered', notes: 'No onions.', employeeId: 'emp_5', createdAt: getRelativeDateString(-1) + 'T19:00:00Z' },
      { id: 'svo_2', bookingId: 'bk_2', roomId: 'rm_104', serviceId: 'srv_3', quantity: 1, status: 'Delivered', notes: 'Extra sugar.', employeeId: 'emp_5', createdAt: getRelativeDateString(-1) + 'T19:05:00Z' },
      { id: 'svo_3', bookingId: 'bk_3', roomId: 'rm_204', serviceId: 'srv_5', quantity: 1, status: 'Requested', notes: 'Schedule for 5:00 PM today.', employeeId: null, createdAt: getRelativeDateString(0) + 'T11:00:00Z' },
      { id: 'svo_4', bookingId: 'bk_4', roomId: 'rm_303', serviceId: 'srv_4', quantity: 3, status: 'InProgress', notes: 'Heavy starch on collar.', employeeId: 'emp_3', createdAt: getRelativeDateString(0) + 'T09:30:00Z' }
    ];
    this._save('serviceOrders', serviceOrders);

    // Update invoices running balances for items if they ordered room services
    this.create('invoiceItems', { id: 'ivi_s1', invoiceId: 'inv_2', itemType: 'ServiceCharge', description: 'Room Service: Club Sandwich with Fries (x2)', quantity: 2, unitPrice: 350, amount: 700 });
    this.create('invoiceItems', { id: 'ivi_s2', invoiceId: 'inv_2', itemType: 'ServiceCharge', description: 'Room Service: Hot Cappuccino / Tea (x1)', quantity: 1, unitPrice: 120, amount: 120 });
    
    // Update invoice subtotal & total amount
    const inv2 = this.getById('invoices', 'inv_2');
    inv2.subTotal += 820;
    inv2.taxAmount = parseFloat((inv2.subTotal * 0.12).toFixed(2));
    inv2.totalAmount = inv2.subTotal + inv2.taxAmount;
    this.update('invoices', 'inv_2', inv2);

    // 13. Housekeeping Tasks
    const housekeepingTasks = [
      { id: 'hk_1', roomId: 'rm_103', taskType: 'Cleaning', status: 'Pending', assignedEmployeeId: null, notes: 'Checked out today. Clean immediately.', createdAt: getRelativeDateString(0) + 'T11:00:00Z' },
      { id: 'hk_2', roomId: 'rm_206', taskType: 'Deep Cleaning', status: 'InProgress', assignedEmployeeId: 'emp_3', notes: 'Regular cleaning and linen swap.', createdAt: getRelativeDateString(0) + 'T08:30:00Z' }
    ];
    this._save('housekeepingTasks', housekeepingTasks);

    // 14. Inventory Management
    const inventoryItems = [
      { id: 'inv_item_1', name: 'Luxury Bedsheet (King Size)', category: 'Linen', unit: 'Pcs', currentStock: 80, reorderLevel: 20 },
      { id: 'inv_item_2', name: 'Pillow Cover (Standard)', category: 'Linen', unit: 'Pcs', currentStock: 120, reorderLevel: 30 },
      { id: 'inv_item_3', name: 'Bath Towel (White)', category: 'Linen', unit: 'Pcs', currentStock: 15, reorderLevel: 25 }, // Low stock
      { id: 'inv_item_4', name: 'Shampoo Bottle (Mini 30ml)', category: 'Toiletries', unit: 'Pcs', currentStock: 450, reorderLevel: 100 },
      { id: 'inv_item_5', name: 'Conditioner Bottle (Mini 30ml)', category: 'Toiletries', unit: 'Pcs', currentStock: 400, reorderLevel: 100 },
      { id: 'inv_item_6', name: 'Dental Kit', category: 'Toiletries', unit: 'Pcs', currentStock: 18, reorderLevel: 50 }, // Low stock
      { id: 'inv_item_7', name: 'All-Purpose Detergent', category: 'Cleaning supplies', unit: 'Liters', currentStock: 45, reorderLevel: 10 }
    ];
    this._save('inventoryItems', inventoryItems);

    const stockTransactions = [
      { id: 'st_1', itemId: 'inv_item_3', transactionType: 'StockIn', quantity: 50, note: 'Quarterly supply batch', employeeId: 'emp_3', createdAt: getRelativeDateString(-20) },
      { id: 'st_2', itemId: 'inv_item_3', transactionType: 'StockOut', quantity: 35, note: 'Deployed to Floor 2 and 3', employeeId: 'emp_3', createdAt: getRelativeDateString(-2) },
      { id: 'st_3', itemId: 'inv_item_6', transactionType: 'Adjustment', quantity: -10, note: 'Found damaged in supply closet', employeeId: 'emp_3', createdAt: getRelativeDateString(-1) }
    ];
    this._save('stockTransactions', stockTransactions);

    // 15. Maintenance Requests
    const maintenanceRequests = [
      { id: 'mr_1', roomId: 'rm_106', issueType: 'Plumbing', priority: 'High', description: 'Leaking pipe under bathroom sink.', reportedBy: 'emp_3', assignedEmployeeId: 'emp_4', status: 'InProgress', resolutionNotes: '', createdAt: getRelativeDateString(-1) + 'T09:00:00Z' }
    ];
    this._save('maintenanceRequests', maintenanceRequests);

    // 16. Reviews
    const reviews = [
      { id: 'rv_1', bookingId: 'bk_1', guestId: 'gst_1', rating: 5, comment: 'Phenomenal service! The Room 101 was spotless and check-in was seamless. Definitely returning.', createdAt: getRelativeDateString(-2) + 'T15:00:00Z' },
      { id: 'rv_2', bookingId: 'bk_1', guestId: 'gst_2', rating: 4, comment: 'Very comfortable room and nice view. Front desk service was a bit slow during check-in rush, but otherwise very good.', createdAt: getRelativeDateString(-1) + 'T12:00:00Z' }
    ];
    this._save('reviews', reviews);

    console.log("Seeding complete!");
  }
};

// Auto initialize on script load
db.seed();
window.db = db;
