/**
 * db.js - LocalStorage Database Wrapper & Initializer
 */

// Helper to generate IDs
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const COLLECTIONS = {
  CLINICS: 'clinics',
  SPECIALIZATIONS: 'specializations',
  DOCTORS: 'doctors',
  PATIENTS: 'patients',
  USERS: 'users',
  DOCTOR_SCHEDULES: 'doctorSchedules',
  DOCTOR_SLOTS: 'doctorSlots',
  APPOINTMENTS: 'appointments',
  STATUS_HISTORY: 'statusHistory',
  PAYMENTS: 'payments',
  REVIEWS: 'reviews',
  SETTINGS: 'clinicSettings'
};

const DB = {
  // Read all items from a collection
  get(collectionName) {
    const data = localStorage.getItem(collectionName);
    return data ? JSON.parse(data) : [];
  },

  // Read a single item by id
  getById(collectionName, id) {
    const items = this.get(collectionName);
    return items.find(item => item.id === id) || null;
  },

  // Save the entire array back to a collection
  save(collectionName, data) {
    localStorage.setItem(collectionName, JSON.stringify(data));
  },

  // Insert a new item
  insert(collectionName, item) {
    const items = this.get(collectionName);
    const newItem = { ...item };
    if (!newItem.id) {
      newItem.id = generateUUID();
    }
    items.push(newItem);
    this.save(collectionName, items);
    return newItem;
  },

  // Update an existing item
  update(collectionName, id, updatedFields) {
    const items = this.get(collectionName);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updatedFields };
      this.save(collectionName, items);
      return items[index];
    }
    return null;
  },

  // Delete an item by id
  delete(collectionName, id) {
    const items = this.get(collectionName);
    const filtered = items.filter(item => item.id !== id);
    this.save(collectionName, filtered);
    return filtered.length < items.length;
  },

  // Reseed database with fresh mock data
  reseed() {
    console.log("Reseeding database...");
    localStorage.clear();
    this.initialize(true);
  },

  // Check and seed mock data if collections are empty
  initialize(force = false) {
    const initialized = localStorage.getItem('db_initialized');
    if (initialized && !force) {
      console.log("Database already initialized.");
      return;
    }

    // Seed Specializations
    const specializations = [
      { id: 'spec-gen', name: 'General Medicine', description: 'Primary health care and general wellness consultations.' },
      { id: 'spec-ped', name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents.' },
      { id: 'spec-card', name: 'Cardiology', description: 'Heart and cardiovascular health and treatments.' },
      { id: 'spec-derm', name: 'Dermatology', description: 'Skin, hair, and nail conditions and aesthetic care.' },
      { id: 'spec-ortho', name: 'Orthopedics', description: 'Bones, joints, ligaments, tendons, and muscles.' }
    ];

    // Seed Clinics
    const clinics = [
      { id: 'clinic-1', name: 'City Health Clinic', address: '123 Main St', city: 'New York', contactNumber: '212-555-0199' },
      { id: 'clinic-2', name: 'Family Care Center', address: '456 Oak Ave', city: 'Brooklyn', contactNumber: '718-555-0210' },
      { id: 'clinic-3', name: 'Metro Medical Plaza', address: '789 Pine Rd', city: 'Manhattan', contactNumber: '646-555-0322' }
    ];

    // Seed Patients
    const patients = [
      { id: 'patient-demo-id', fullName: 'John Doe', phone: '555-0101', email: 'patient@demo.com', gender: 'Male', dob: '1990-05-15', password: 'Demo@123' },
      { id: 'pat-2', fullName: 'Jane Smith', phone: '555-0102', email: 'jane.smith@example.com', gender: 'Female', dob: '1985-08-22', password: 'Demo@123' },
      { id: 'pat-3', fullName: 'Bob Johnson', phone: '555-0103', email: 'bob.johnson@example.com', gender: 'Male', dob: '1978-11-03', password: 'Demo@123' },
      { id: 'pat-4', fullName: 'Mary Davis', phone: '555-0104', email: 'mary.davis@example.com', gender: 'Female', dob: '1995-02-14', password: 'Demo@123' },
      { id: 'pat-5', fullName: 'James Wilson', phone: '555-0105', email: 'james.wilson@example.com', gender: 'Male', dob: '2000-09-30', password: 'Demo@123' }
    ];

    // Seed Doctors
    const doctors = [
      {
        id: 'doctor-demo-id',
        fullName: 'Dr. Jane Doe',
        specializationId: 'spec-gen',
        clinicId: 'clinic-1',
        phone: '555-0201',
        email: 'doctor@demo.com',
        qualification: 'MD - Internal Medicine',
        experienceYears: 10,
        consultationFee: 50,
        avgSlotDurationMinutes: 15,
        rating: 4.8,
        isActive: true,
        password: 'Demo@123'
      },
      {
        id: 'doc-2',
        fullName: 'Dr. John Smith',
        specializationId: 'spec-ped',
        clinicId: 'clinic-2',
        phone: '555-0202',
        email: 'john.smith@example.com',
        qualification: 'MD - Pediatrics, Board Certified',
        experienceYears: 12,
        consultationFee: 60,
        avgSlotDurationMinutes: 20,
        rating: 4.9,
        isActive: true,
        password: 'Demo@123'
      },
      {
        id: 'doc-3',
        fullName: 'Dr. Alice Johnson',
        specializationId: 'spec-card',
        clinicId: 'clinic-3',
        phone: '555-0203',
        email: 'alice.j@example.com',
        qualification: 'FACC - Cardiology',
        experienceYears: 18,
        consultationFee: 120,
        avgSlotDurationMinutes: 30,
        rating: 4.7,
        isActive: true,
        password: 'Demo@123'
      },
      {
        id: 'doc-4',
        fullName: 'Dr. Robert Lee',
        specializationId: 'spec-derm',
        clinicId: 'clinic-1',
        phone: '555-0204',
        email: 'robert.l@example.com',
        qualification: 'MD - Dermatology & Aesthetics',
        experienceYears: 8,
        consultationFee: 80,
        avgSlotDurationMinutes: 20,
        rating: 4.6,
        isActive: true,
        password: 'Demo@123'
      },
      {
        id: 'doc-5',
        fullName: 'Dr. Emily Davis',
        specializationId: 'spec-ortho',
        clinicId: 'clinic-2',
        phone: '555-0205',
        email: 'emily.d@example.com',
        qualification: 'MS - Orthopedic Surgery',
        experienceYears: 15,
        consultationFee: 95,
        avgSlotDurationMinutes: 20,
        rating: 4.5,
        isActive: true,
        password: 'Demo@123'
      },
      {
        id: 'doc-6',
        fullName: 'Dr. Michael Brown',
        specializationId: 'spec-gen',
        clinicId: 'clinic-3',
        phone: '555-0206',
        email: 'michael.b@example.com',
        qualification: 'MD - Family Medicine',
        experienceYears: 6,
        consultationFee: 45,
        avgSlotDurationMinutes: 15,
        rating: 4.4,
        isActive: true,
        password: 'Demo@123'
      },
      {
        id: 'doc-7',
        fullName: 'Dr. Sarah Wilson',
        specializationId: 'spec-ped',
        clinicId: 'clinic-1',
        phone: '555-0207',
        email: 'sarah.w@example.com',
        qualification: 'MD - Child Care Specialist',
        experienceYears: 9,
        consultationFee: 55,
        avgSlotDurationMinutes: 15,
        rating: 4.9,
        isActive: true,
        password: 'Demo@123'
      },
      {
        id: 'doc-8',
        fullName: 'Dr. David Miller',
        specializationId: 'spec-card',
        clinicId: 'clinic-2',
        phone: '555-0208',
        email: 'david.m@example.com',
        qualification: 'MD - Cardiovascular Diseases',
        experienceYears: 20,
        consultationFee: 140,
        avgSlotDurationMinutes: 30,
        rating: 4.8,
        isActive: true,
        password: 'Demo@123'
      }
    ];

    // Seed Users for Authentication
    const users = [
      // Demo Roles
      { id: 'user-pat-demo', email: 'patient@demo.com', password: 'Demo@123', role: 'Patient', linkedId: 'patient-demo-id' },
      { id: 'user-doc-demo', email: 'doctor@demo.com', password: 'Demo@123', role: 'Doctor', linkedId: 'doctor-demo-id' },
      { id: 'user-rec-demo', email: 'reception@demo.com', password: 'Demo@123', role: 'Receptionist', linkedId: null },
      { id: 'user-adm-demo', email: 'admin@demo.com', password: 'Demo@123', role: 'ClinicAdmin', linkedId: null }
    ];

    // Generate users for other patients and doctors
    patients.forEach(pat => {
      if (pat.email !== 'patient@demo.com') {
        users.push({
          id: `user-${pat.id}`,
          email: pat.email,
          password: pat.password,
          role: 'Patient',
          linkedId: pat.id
        });
      }
    });

    doctors.forEach(doc => {
      if (doc.email !== 'doctor@demo.com') {
        users.push({
          id: `user-${doc.id}`,
          email: doc.email,
          password: doc.password,
          role: 'Doctor',
          linkedId: doc.id
        });
      }
    });

    // Seed Clinic Settings
    const settings = {
      cancellationWindowHours: 2,
      defaultWorkingHoursStart: '09:00',
      defaultWorkingHoursEnd: '17:00',
      timezone: 'GMT-4'
    };

    // Seed Doctor Schedules (Weekly availability templates)
    // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    const doctorSchedules = [];
    doctors.forEach(doc => {
      // Add Mon-Fri schedules
      for (let day = 1; day <= 5; day++) {
        doctorSchedules.push({
          id: `sched-${doc.id}-${day}`,
          doctorId: doc.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: doc.avgSlotDurationMinutes
        });
      }
    });

    // Create default slots for seed data
    // Let's create slots and appointments for Today, Yesterday, and Tomorrow
    const doctorSlots = [];
    const appointments = [];
    const statusHistory = [];
    const payments = [];
    const reviews = [];

    const todayStr = new Date().toISOString().split('T')[0];
    
    const dYesterday = new Date();
    dYesterday.setDate(dYesterday.getDate() - 1);
    const yesterdayStr = dYesterday.toISOString().split('T')[0];

    const dTomorrow = new Date();
    dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomorrowStr = dTomorrow.toISOString().split('T')[0];

    const datesToSeed = [yesterdayStr, todayStr, tomorrowStr];

    // Helper to generate slots for a specific date and doctor based on schedule
    const generateSlotsForDate = (docId, dateStr, schedulesList, slotsList) => {
      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getDay();
      
      const docScheds = schedulesList.filter(s => s.doctorId === docId && s.dayOfWeek === dayOfWeek);
      if (docScheds.length === 0) return;

      docScheds.forEach(sched => {
        let current = new Date(`${dateStr}T${sched.startTime}`);
        const end = new Date(`${dateStr}T${sched.endTime}`);
        
        while (current < end) {
          const startH = String(current.getHours()).padStart(2, '0');
          const startM = String(current.getMinutes()).padStart(2, '0');
          const slotStart = `${startH}:${startM}`;
          
          current.setMinutes(current.getMinutes() + sched.slotDurationMinutes);
          
          const endH = String(current.getHours()).padStart(2, '0');
          const endM = String(current.getMinutes()).padStart(2, '0');
          const slotEnd = `${endH}:${endM}`;
          
          if (current <= end) {
            slotsList.push({
              id: `slot-${docId}-${dateStr}-${slotStart.replace(':', '')}`,
              doctorId: docId,
              slotDate: dateStr,
              startTime: slotStart,
              endTime: slotEnd,
              isBooked: false,
              isBlocked: false
            });
          }
        }
      });
    };

    // Generate slots for our 3 main dates for all doctors
    doctors.forEach(doc => {
      datesToSeed.forEach(dateStr => {
        generateSlotsForDate(doc.id, dateStr, doctorSchedules, doctorSlots);
      });
    });

    // Let's pre-populate some appointments
    // 1. Yesterday completed appointment
    const yesSlots = doctorSlots.filter(s => s.slotDate === yesterdayStr && s.doctorId === 'doctor-demo-id');
    if (yesSlots.length >= 2) {
      // Book Slot 0
      const s0 = yesSlots[0];
      s0.isBooked = true;
      const apt1Id = 'apt-yesterday-1';
      appointments.push({
        id: apt1Id,
        patientId: 'patient-demo-id',
        doctorId: 'doctor-demo-id',
        clinicId: 'clinic-1',
        slotId: s0.id,
        appointmentDate: yesterdayStr,
        startTime: s0.startTime,
        endTime: s0.endTime,
        reason: 'Regular annual general health checkup.',
        status: 'COMPLETED',
        bookingType: 'ONLINE',
        createdAt: new Date(`${yesterdayStr}T08:00:00`).toISOString()
      });
      statusHistory.push({
        id: generateUUID(),
        appointmentId: apt1Id,
        oldStatus: 'PENDING',
        newStatus: 'CONFIRMED',
        changedBy: 'user-rec-demo',
        changedAt: new Date(`${yesterdayStr}T08:05:00`).toISOString(),
        remarks: 'Auto-confirmed'
      });
      statusHistory.push({
        id: generateUUID(),
        appointmentId: apt1Id,
        oldStatus: 'CONFIRMED',
        newStatus: 'IN_PROGRESS',
        changedBy: 'user-doc-demo',
        changedAt: new Date(`${yesterdayStr}T09:05:00`).toISOString(),
        remarks: 'Consultation started'
      });
      statusHistory.push({
        id: generateUUID(),
        appointmentId: apt1Id,
        oldStatus: 'IN_PROGRESS',
        newStatus: 'COMPLETED',
        changedBy: 'user-doc-demo',
        changedAt: new Date(`${yesterdayStr}T09:20:00`).toISOString(),
        remarks: 'Consultation completed successfully'
      });
      payments.push({
        id: generateUUID(),
        appointmentId: apt1Id,
        amount: 50,
        paymentMode: 'PAY_NOW',
        paymentStatus: 'PAID',
        paidAt: new Date(`${yesterdayStr}T08:02:00`).toISOString()
      });
      reviews.push({
        id: generateUUID(),
        appointmentId: apt1Id,
        patientId: 'patient-demo-id',
        doctorId: 'doctor-demo-id',
        rating: 5,
        comment: 'Dr. Jane Doe was extremely thorough and helpful during my general checkup. Highly recommended!',
        createdAt: new Date(`${yesterdayStr}T10:00:00`).toISOString()
      });

      // Book Slot 1 (Cancelled)
      const s1 = yesSlots[1];
      s1.isBooked = false; // keep open since it was cancelled
      const apt2Id = 'apt-yesterday-2';
      appointments.push({
        id: apt2Id,
        patientId: 'pat-2',
        doctorId: 'doctor-demo-id',
        clinicId: 'clinic-1',
        slotId: s1.id,
        appointmentDate: yesterdayStr,
        startTime: s1.startTime,
        endTime: s1.endTime,
        reason: 'Sore throat and mild fever.',
        status: 'CANCELLED',
        bookingType: 'ONLINE',
        cancelledBy: 'Patient',
        cancellationReason: 'Found another appointment elsewhere.',
        createdAt: new Date(`${yesterdayStr}T07:00:00`).toISOString()
      });
      statusHistory.push({
        id: generateUUID(),
        appointmentId: apt2Id,
        oldStatus: 'PENDING',
        newStatus: 'CANCELLED',
        changedBy: 'user-pat-demo',
        changedAt: new Date(`${yesterdayStr}T08:30:00`).toISOString(),
        remarks: 'Patient requested cancellation'
      });
    }

    // 2. Today upcoming/in-progress appointments
    const todaySlots = doctorSlots.filter(s => s.slotDate === todayStr && s.doctorId === 'doctor-demo-id');
    if (todaySlots.length >= 3) {
      // Appointment 1: Booked & Confirmed
      const s0 = todaySlots[0];
      s0.isBooked = true;
      const apt3Id = 'apt-today-1';
      appointments.push({
        id: apt3Id,
        patientId: 'patient-demo-id',
        doctorId: 'doctor-demo-id',
        clinicId: 'clinic-1',
        slotId: s0.id,
        appointmentDate: todayStr,
        startTime: s0.startTime,
        endTime: s0.endTime,
        reason: 'Follow-up consultation for lab reports.',
        status: 'CONFIRMED',
        bookingType: 'ONLINE',
        createdAt: new Date(`${todayStr}T07:00:00`).toISOString()
      });
      statusHistory.push({
        id: generateUUID(),
        appointmentId: apt3Id,
        oldStatus: 'PENDING',
        newStatus: 'CONFIRMED',
        changedBy: 'user-rec-demo',
        changedAt: new Date(`${todayStr}T07:15:00`).toISOString(),
        remarks: 'Confirmed by receptionist'
      });
      payments.push({
        id: generateUUID(),
        appointmentId: apt3Id,
        amount: 50,
        paymentMode: 'PAY_AT_CLINIC',
        paymentStatus: 'PENDING',
        paidAt: null
      });

      // Appointment 2: Walk-in appointment for today, confirmed
      const s1 = todaySlots[1];
      s1.isBooked = true;
      const apt4Id = 'apt-today-2';
      appointments.push({
        id: apt4Id,
        patientId: 'pat-3',
        doctorId: 'doctor-demo-id',
        clinicId: 'clinic-1',
        slotId: s1.id,
        appointmentDate: todayStr,
        startTime: s1.startTime,
        endTime: s1.endTime,
        reason: 'Acute back pain.',
        status: 'CONFIRMED',
        bookingType: 'WALK_IN',
        createdAt: new Date(`${todayStr}T09:30:00`).toISOString()
      });
      statusHistory.push({
        id: generateUUID(),
        appointmentId: apt4Id,
        oldStatus: 'PENDING',
        newStatus: 'CONFIRMED',
        changedBy: 'user-rec-demo',
        changedAt: new Date(`${todayStr}T09:30:00`).toISOString(),
        remarks: 'Walk-in booking confirmed'
      });
      payments.push({
        id: generateUUID(),
        appointmentId: apt4Id,
        amount: 50,
        paymentMode: 'PAY_AT_CLINIC',
        paymentStatus: 'PENDING',
        paidAt: null
      });
    }

    // 3. Tomorrow booking
    const tomSlots = doctorSlots.filter(s => s.slotDate === tomorrowStr && s.doctorId === 'doctor-demo-id');
    if (tomSlots.length >= 1) {
      const s0 = tomSlots[0];
      s0.isBooked = true;
      const apt5Id = 'apt-tomorrow-1';
      appointments.push({
        id: apt5Id,
        patientId: 'patient-demo-id',
        doctorId: 'doctor-demo-id',
        clinicId: 'clinic-1',
        slotId: s0.id,
        appointmentDate: tomorrowStr,
        startTime: s0.startTime,
        endTime: s0.endTime,
        reason: 'Monthly checkup.',
        status: 'CONFIRMED',
        bookingType: 'ONLINE',
        createdAt: new Date(`${todayStr}T11:00:00`).toISOString()
      });
      statusHistory.push({
        id: generateUUID(),
        appointmentId: apt5Id,
        oldStatus: 'PENDING',
        newStatus: 'CONFIRMED',
        changedBy: 'user-rec-demo',
        changedAt: new Date(`${todayStr}T11:05:00`).toISOString(),
        remarks: 'Auto-confirmed'
      });
      payments.push({
        id: generateUUID(),
        appointmentId: apt5Id,
        amount: 50,
        paymentMode: 'PAY_NOW',
        paymentStatus: 'PAID',
        paidAt: new Date(`${todayStr}T11:02:00`).toISOString()
      });
    }

    // Save everything to localStorage
    localStorage.setItem(COLLECTIONS.SPECIALIZATIONS, JSON.stringify(specializations));
    localStorage.setItem(COLLECTIONS.CLINICS, JSON.stringify(clinics));
    localStorage.setItem(COLLECTIONS.PATIENTS, JSON.stringify(patients));
    localStorage.setItem(COLLECTIONS.DOCTORS, JSON.stringify(doctors));
    localStorage.setItem(COLLECTIONS.USERS, JSON.stringify(users));
    localStorage.setItem(COLLECTIONS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem(COLLECTIONS.DOCTOR_SCHEDULES, JSON.stringify(doctorSchedules));
    localStorage.setItem(COLLECTIONS.DOCTOR_SLOTS, JSON.stringify(doctorSlots));
    localStorage.setItem(COLLECTIONS.APPOINTMENTS, JSON.stringify(appointments));
    localStorage.setItem(COLLECTIONS.STATUS_HISTORY, JSON.stringify(statusHistory));
    localStorage.setItem(COLLECTIONS.PAYMENTS, JSON.stringify(payments));
    localStorage.setItem(COLLECTIONS.REVIEWS, JSON.stringify(reviews));

    // Mark database as initialized
    localStorage.setItem('db_initialized', 'true');
    console.log("Database initialized successfully!");
  }
};

// Initialize immediately on script load
DB.initialize();

// Export to window object for access in multi-page structure
window.DB = DB;
window.DB_COLLECTIONS = COLLECTIONS;
