/**
 * seed-data.js - Seeds realistic demo data for the Hospital Management System
 */

window.HMS_SEED = {
  seedAll: function() {
    const db = window.HMS_DB;
    if (!db) return;

    // Check if seeding is already done (e.g., check users)
    const existingUsers = db.getAll(db.KEYS.USERS);
    if (existingUsers && existingUsers.length > 0) {
      console.log('Database already seeded. Skipping seeder...');
      return;
    }

    console.log('Seeding initial data...');

    // 1. Wards and Beds
    const wards = [
      { id: 'w-icu', name: 'ICU', type: 'ICU', total_beds: 5, bed_rate: 1500 },
      { id: 'w-gen', name: 'General Ward', type: 'General', total_beds: 10, bed_rate: 300 },
      { id: 'w-mat', name: 'Maternity Ward', type: 'Maternity', total_beds: 5, bed_rate: 500 },
      { id: 'w-pvt', name: 'Private Ward', type: 'Private', total_beds: 4, bed_rate: 1000 }
    ];
    db.set(db.KEYS.WARDS, wards);

    const beds = [];
    wards.forEach(w => {
      for (let i = 1; i <= w.total_beds; i++) {
        beds.push({
          id: `bed-${w.id}-${i}`,
          ward_id: w.id,
          bed_number: `${w.name.charAt(0)}${i}`,
          status: 'Available',
          occupant_id: null
        });
      }
    });
    // Set some beds as occupied later dynamically, or keep available. Let's make a few occupied.
    db.set(db.KEYS.BEDS, beds);

    // 2. Departments
    const departments = [
      { id: 'dept-cardio', name: 'Cardiology', description: 'Heart and vascular system diagnosis and treatment' },
      { id: 'dept-pedia', name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents' },
      { id: 'dept-neuro', name: 'Neurology', description: 'Brain, spinal cord, and nervous system specialists' },
      { id: 'dept-ortho', name: 'Orthopedics', description: 'Musculoskeletal system, joints, bones, and ligaments' },
      { id: 'dept-genmed', name: 'General Medicine', description: 'Primary healthcare and internal medicine diagnosis' }
    ];
    db.set(db.KEYS.DEPARTMENTS, departments);

    // 3. Doctors (10 Doctors)
    const doctors = [
      {
        id: 'doc-1',
        name: 'Dr. Sarah Connor',
        department_id: 'dept-cardio',
        specialization: 'Cardiologist',
        qualification: 'MD, DM (Cardiology)',
        experience: 12,
        consultation_fee: 800,
        available_days: ['Monday', 'Wednesday', 'Friday'],
        status: 'Active',
        rating: 4.8
      },
      {
        id: 'doc-2',
        name: 'Dr. Gregory House',
        department_id: 'dept-neuro',
        specialization: 'Neurologist',
        qualification: 'MD, PhD',
        experience: 20,
        consultation_fee: 1200,
        available_days: ['Tuesday', 'Thursday'],
        status: 'Active',
        rating: 4.9
      },
      {
        id: 'doc-3',
        name: 'Dr. Arizona Robbins',
        department_id: 'dept-pedia',
        specialization: 'Pediatric Surgeon',
        qualification: 'MD, FACS',
        experience: 15,
        consultation_fee: 700,
        available_days: ['Monday', 'Tuesday', 'Thursday'],
        status: 'Active',
        rating: 4.7
      },
      {
        id: 'doc-4',
        name: 'Dr. John Watson',
        department_id: 'dept-genmed',
        specialization: 'General Physician',
        qualification: 'MBBS, MD (Internal Medicine)',
        experience: 8,
        consultation_fee: 400,
        available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        status: 'Active',
        rating: 4.5
      },
      {
        id: 'doc-5',
        name: 'Dr. Derek Shepherd',
        department_id: 'dept-neuro',
        specialization: 'Neurosurgeon',
        qualification: 'MD, FACS (Harvard)',
        experience: 18,
        consultation_fee: 1500,
        available_days: ['Wednesday', 'Thursday', 'Friday'],
        status: 'Active',
        rating: 5.0
      },
      {
        id: 'doc-6',
        name: 'Dr. Callie Torres',
        department_id: 'dept-ortho',
        specialization: 'Orthopedic Surgeon',
        qualification: 'MD',
        experience: 14,
        consultation_fee: 900,
        available_days: ['Monday', 'Wednesday', 'Thursday'],
        status: 'Active',
        rating: 4.8
      },
      {
        id: 'doc-7',
        name: 'Dr. Miranda Bailey',
        department_id: 'dept-genmed',
        specialization: 'General Surgeon',
        qualification: 'MD, FACS',
        experience: 16,
        consultation_fee: 1000,
        available_days: ['Tuesday', 'Wednesday', 'Friday'],
        status: 'Active',
        rating: 4.9
      },
      {
        id: 'doc-8',
        name: 'Dr. Preston Burke',
        department_id: 'dept-cardio',
        specialization: 'Cardiothoracic Surgeon',
        qualification: 'MD',
        experience: 17,
        consultation_fee: 1300,
        available_days: ['Tuesday', 'Thursday', 'Friday'],
        status: 'Active',
        rating: 4.8
      },
      {
        id: 'doc-9',
        name: 'Dr. Alex Karev',
        department_id: 'dept-pedia',
        specialization: 'Pediatrician',
        qualification: 'MD',
        experience: 7,
        consultation_fee: 500,
        available_days: ['Monday', 'Wednesday', 'Friday'],
        status: 'Active',
        rating: 4.6
      },
      {
        id: 'doc-10',
        name: 'Dr. Owen Hunt',
        department_id: 'dept-ortho',
        specialization: 'Trauma Specialist',
        qualification: 'MD, FACS',
        experience: 15,
        consultation_fee: 850,
        available_days: ['Monday', 'Tuesday', 'Friday'],
        status: 'Active',
        rating: 4.7
      }
    ];
    db.set(db.KEYS.DOCTORS, doctors);

    // 4. Patients (15 Patients)
    const patients = [
      { id: 'pat-1', name: 'John Doe', dob: '1985-05-12', gender: 'Male', blood_group: 'O+', phone: '9876543210', email: 'john@example.com', address: '123 Main St, Springfield', emergency_contact: 'Jane Doe (Wife) - 9876543211', medical_history: 'Hypertension, Dust Allergy' },
      { id: 'pat-2', name: 'Jane Smith', dob: '1990-08-22', gender: 'Female', blood_group: 'A-', phone: '8765432109', email: 'jane@example.com', address: '456 Elm St, Shelbyville', emergency_contact: 'Bob Smith (Husband) - 8765432108', medical_history: 'None' },
      { id: 'pat-3', name: 'Robert Johnson', dob: '1972-11-05', gender: 'Male', blood_group: 'B+', phone: '7654321098', email: 'robert@example.com', address: '789 Oak Ave, Capital City', emergency_contact: 'Mary Johnson (Daughter) - 7654321097', medical_history: 'Diabetes Type 2' },
      { id: 'pat-4', name: 'Emily Davis', dob: '2005-03-14', gender: 'Female', blood_group: 'AB+', phone: '6543210987', email: 'emily@example.com', address: '321 Pine Rd, Springfield', emergency_contact: 'Paul Davis (Father) - 6543210986', medical_history: 'Asthma' },
      { id: 'pat-5', name: 'Michael Wilson', dob: '1960-01-30', gender: 'Male', blood_group: 'O-', phone: '5432109876', email: 'michael@example.com', address: '987 Maple Dr, Shelbyville', emergency_contact: 'Sarah Wilson (Wife) - 5432109875', medical_history: 'Heart Disease (Coronary)' },
      { id: 'pat-6', name: 'Linda Martinez', dob: '1995-07-19', gender: 'Female', blood_group: 'A+', phone: '4321098765', email: 'linda@example.com', address: '555 Cedar Ln, Capital City', emergency_contact: 'Carlos Martinez (Brother) - 4321098764', medical_history: 'Penicillin Allergy' },
      { id: 'pat-7', name: 'William Anderson', dob: '1955-09-08', gender: 'Male', blood_group: 'B-', phone: '3210987654', email: 'william@example.com', address: '444 Birch St, Springfield', emergency_contact: 'Helen Anderson (Wife) - 3210987653', medical_history: 'Chronic Kidney Disease' },
      { id: 'pat-8', name: 'Elizabeth Taylor', dob: '1988-12-03', gender: 'Female', blood_group: 'AB-', phone: '2109876543', email: 'elizabeth@example.com', address: '222 Walnut Rd, Shelbyville', emergency_contact: 'Richard Taylor (Father) - 2109876542', medical_history: 'Thyroid Hypothyroidism' },
      { id: 'pat-9', name: 'David Thomas', dob: '2012-04-25', gender: 'Male', blood_group: 'O+', phone: '1098765432', email: 'david@example.com', address: '777 Cherry Pl, Springfield', emergency_contact: 'George Thomas (Father) - 1098765431', medical_history: 'Peanut Allergy' },
      { id: 'pat-10', name: 'Jennifer Jackson', dob: '1980-02-15', gender: 'Female', blood_group: 'A+', phone: '9087654321', email: 'jennifer@example.com', address: '111 Ash St, Capital City', emergency_contact: 'Thomas Jackson (Husband) - 9087654320', medical_history: 'None' },
      { id: 'pat-11', name: 'Charles White', dob: '1978-06-30', gender: 'Male', blood_group: 'O-', phone: '8097654321', email: 'charles@example.com', address: '888 Willow Ln, Springfield', emergency_contact: 'Ann White (Sister) - 8097654320', medical_history: 'Gout' },
      { id: 'pat-12', name: 'Patricia Harris', dob: '1967-10-10', gender: 'Female', blood_group: 'B+', phone: '7098654321', email: 'patricia@example.com', address: '333 Poplar Rd, Shelbyville', emergency_contact: 'James Harris (Son) - 7098654320', medical_history: 'Sulfa Drugs Allergy' },
      { id: 'pat-13', name: 'Christopher Martin', dob: '2001-11-20', gender: 'Male', blood_group: 'A-', phone: '6098754321', email: 'chris@example.com', address: '666 Redwood Dr, Springfield', emergency_contact: 'Diana Martin (Mother) - 6098754320', medical_history: 'Lactose Intolerant' },
      { id: 'pat-14', name: 'Margaret Thompson', dob: '1948-08-14', gender: 'Female', blood_group: 'O+', phone: '5098764321', email: 'margaret@example.com', address: '124 Sycamore Ave, Capital City', emergency_contact: 'Paul Thompson (Son) - 5098764320', medical_history: 'Osteoarthritis' },
      { id: 'pat-15', name: 'Daniel Garcia', dob: '1992-04-04', gender: 'Male', blood_group: 'AB+', phone: '4098765321', email: 'daniel@example.com', address: '909 Palm Blvd, Springfield', emergency_contact: 'Lucia Garcia (Mother) - 4098765320', medical_history: 'None' }
    ];
    db.set(db.KEYS.PATIENTS, patients);

    // 5. Staff
    const staff = [
      { id: 'staff-1', name: 'Nurse Carol Hathaway', role: 'Nurse', phone: '9998887771', email: 'carol@example.com', status: 'Active' },
      { id: 'staff-2', name: 'Nurse Abby Lockhart', role: 'Nurse', phone: '9998887772', email: 'abby@example.com', status: 'Active' },
      { id: 'staff-3', name: 'Staff James Carter', role: 'Receptionist', phone: '9998887773', email: 'james@example.com', status: 'Active' },
      { id: 'staff-4', name: 'Staff Shirley Gibson', role: 'Pharmacist', phone: '9998887774', email: 'shirley@example.com', status: 'Active' },
      { id: 'staff-5', name: 'Staff Gregory Pratt', role: 'Lab Technician', phone: '9998887775', email: 'pratt@example.com', status: 'Active' }
    ];
    db.set(db.KEYS.STAFF, staff);

    // 6. Users (Auth credentials)
    const users = [
      { id: 'usr-admin', username: 'admin', password: 'password', role: 'Admin', name: 'Administrator', entityId: 'staff-3' },
      { id: 'usr-doctor', username: 'doctor', password: 'password', role: 'Doctor', name: 'Dr. John Watson', entityId: 'doc-4' },
      { id: 'usr-reception', username: 'receptionist', password: 'password', role: 'Receptionist', name: 'Staff James Carter', entityId: 'staff-3' },
      { id: 'usr-pharmacist', username: 'pharmacist', password: 'password', role: 'Pharmacist', name: 'Staff Shirley Gibson', entityId: 'staff-4' },
      { id: 'usr-lab', username: 'labtech', password: 'password', role: 'Lab Technician', name: 'Staff Gregory Pratt', entityId: 'staff-5' },
      { id: 'usr-patient', username: 'patient', password: 'password', role: 'Patient', name: 'John Doe', entityId: 'pat-1' }
    ];
    // Add all doctors as users
    doctors.forEach(d => {
      users.push({
        id: `usr-${d.id}`,
        username: d.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        password: 'password',
        role: 'Doctor',
        name: d.name,
        entityId: d.id
      });
    });
    // Add all patients as users
    patients.forEach(p => {
      users.push({
        id: `usr-${p.id}`,
        username: p.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        password: 'password',
        role: 'Patient',
        name: p.name,
        entityId: p.id
      });
    });
    db.set(db.KEYS.USERS, users);

    // 7. Medicines (30 Medicines, with some low stock & expiring)
    // Date of 2026-07-14. 
    // Expiring soon = within 30 days of 2026-07-14 (i.e. before 2026-08-14)
    const medicines = [
      { id: 'med-1', name: 'Paracetamol 500mg', manufacturer: 'GSK', category: 'Analgesics', unit_price: 5.00, stock_quantity: 500, expiry_date: '2027-12-15', reorder_level: 50 },
      { id: 'med-2', name: 'Amoxicillin 250mg', manufacturer: 'Sandoz', category: 'Antibiotics', unit_price: 15.50, stock_quantity: 12, expiry_date: '2026-11-20', reorder_level: 20 }, // Low Stock
      { id: 'med-3', name: 'Ibuprofen 400mg', manufacturer: 'Abbott', category: 'Analgesics', unit_price: 8.00, stock_quantity: 350, expiry_date: '2026-07-28', reorder_level: 30 }, // Expiring Soon
      { id: 'med-4', name: 'Atorvastatin 10mg', manufacturer: 'Pfizer', category: 'Cardiovascular', unit_price: 25.00, stock_quantity: 150, expiry_date: '2028-01-10', reorder_level: 40 },
      { id: 'med-5', name: 'Metformin 500mg', manufacturer: 'Merck', category: 'Antidiabetic', unit_price: 10.00, stock_quantity: 200, expiry_date: '2026-08-05', reorder_level: 30 }, // Expiring Soon
      { id: 'med-6', name: 'Amlodipine 5mg', manufacturer: 'Pfizer', category: 'Cardiovascular', unit_price: 12.00, stock_quantity: 8, expiry_date: '2027-05-18', reorder_level: 20 }, // Low Stock
      { id: 'med-7', name: 'Omeprazole 20mg', manufacturer: 'AstraZeneca', category: 'Gastrointestinal', unit_price: 18.00, stock_quantity: 180, expiry_date: '2027-10-30', reorder_level: 25 },
      { id: 'med-8', name: 'Albuterol Inhaler', manufacturer: 'GSK', category: 'Respiratory', unit_price: 120.00, stock_quantity: 5, expiry_date: '2026-10-12', reorder_level: 10 }, // Low Stock
      { id: 'med-9', name: 'Lisinopril 10mg', manufacturer: 'Lupin', category: 'Cardiovascular', unit_price: 14.00, stock_quantity: 110, expiry_date: '2026-07-22', reorder_level: 20 }, // Expiring Soon
      { id: 'med-10', name: 'Cetirizine 10mg', manufacturer: 'McNeil', category: 'Antihistamines', unit_price: 6.50, stock_quantity: 400, expiry_date: '2028-03-24', reorder_level: 50 },
      { id: 'med-11', name: 'Losartan 50mg', manufacturer: 'Merck', category: 'Cardiovascular', unit_price: 18.00, stock_quantity: 90, expiry_date: '2027-09-12', reorder_level: 20 },
      { id: 'med-12', name: 'Gabapentin 300mg', manufacturer: 'Actavis', category: 'Anticonvulsants', unit_price: 32.00, stock_quantity: 120, expiry_date: '2026-08-10', reorder_level: 15 }, // Expiring Soon
      { id: 'med-13', name: 'Hydrochlorothiazide 12.5mg', manufacturer: 'Sandoz', category: 'Cardiovascular', unit_price: 8.50, stock_quantity: 140, expiry_date: '2027-08-08', reorder_level: 20 },
      { id: 'med-14', name: 'Sertraline 50mg', manufacturer: 'Pfizer', category: 'Antidepressants', unit_price: 30.00, stock_quantity: 80, expiry_date: '2027-04-14', reorder_level: 15 },
      { id: 'med-15', name: 'Montelukast 10mg', manufacturer: 'Organon', category: 'Respiratory', unit_price: 22.00, stock_quantity: 6, expiry_date: '2027-11-19', reorder_level: 15 }, // Low Stock
      { id: 'med-16', name: 'Fluticasone Nasal Spray', manufacturer: 'Glaxo', category: 'Respiratory', unit_price: 75.00, stock_quantity: 25, expiry_date: '2026-12-05', reorder_level: 8 },
      { id: 'med-17', name: 'Amoxicillin-Clavulanate 625mg', manufacturer: 'GSK', category: 'Antibiotics', unit_price: 45.00, stock_quantity: 75, expiry_date: '2027-01-30', reorder_level: 15 },
      { id: 'med-18', name: 'Levothyroxine 50mcg', manufacturer: 'AbbVie', category: 'Hormonal', unit_price: 11.00, stock_quantity: 300, expiry_date: '2028-05-15', reorder_level: 40 },
      { id: 'med-19', name: 'Prednisone 5mg', manufacturer: 'West-Ward', category: 'Corticosteroids', unit_price: 9.00, stock_quantity: 4, expiry_date: '2026-08-01', reorder_level: 15 }, // Low Stock and Expiring Soon!
      { id: 'med-20', name: 'Pantoprazole 40mg', manufacturer: 'Takeda', category: 'Gastrointestinal', unit_price: 16.00, stock_quantity: 210, expiry_date: '2027-09-12', reorder_level: 25 },
      { id: 'med-21', name: 'Escitalopram 10mg', manufacturer: 'Allergan', category: 'Antidepressants', unit_price: 28.00, stock_quantity: 95, expiry_date: '2027-11-22', reorder_level: 15 },
      { id: 'med-22', name: 'Metoprolol Succinate 50mg', manufacturer: 'AstraZeneca', category: 'Cardiovascular', unit_price: 22.00, stock_quantity: 130, expiry_date: '2028-02-18', reorder_level: 20 },
      { id: 'med-23', name: 'Tramadol 50mg', manufacturer: 'Ortho-McNeil', category: 'Analgesics', unit_price: 18.00, stock_quantity: 85, expiry_date: '2027-03-01', reorder_level: 20 },
      { id: 'med-24', name: 'Clopidogrel 75mg', manufacturer: 'Sanofi', category: 'Cardiovascular', unit_price: 35.00, stock_quantity: 90, expiry_date: '2026-08-12', reorder_level: 15 }, // Expiring Soon
      { id: 'med-25', name: 'Rosuvastatin 20mg', manufacturer: 'AstraZeneca', category: 'Cardiovascular', unit_price: 40.00, stock_quantity: 150, expiry_date: '2028-06-25', reorder_level: 20 },
      { id: 'med-26', name: 'Tamsulosin 0.4mg', manufacturer: 'Boehringer', category: 'Urological', unit_price: 24.00, stock_quantity: 140, expiry_date: '2027-12-01', reorder_level: 15 },
      { id: 'med-27', name: 'Duloxetine 30mg', manufacturer: 'Lilly', category: 'Antidepressants', unit_price: 45.00, stock_quantity: 70, expiry_date: '2027-07-14', reorder_level: 10 },
      { id: 'med-28', name: 'Meloxicam 15mg', manufacturer: 'Boehringer', category: 'NSAID', unit_price: 14.50, stock_quantity: 180, expiry_date: '2027-10-25', reorder_level: 20 },
      { id: 'med-29', name: 'Warfarin 5mg', manufacturer: 'Bristol-Myers', category: 'Cardiovascular', unit_price: 12.00, stock_quantity: 95, expiry_date: '2027-09-09', reorder_level: 15 },
      { id: 'med-30', name: 'Spironolactone 25mg', manufacturer: 'Pfizer', category: 'Cardiovascular', unit_price: 15.00, stock_quantity: 110, expiry_date: '2027-08-20', reorder_level: 15 }
    ];
    db.set(db.KEYS.MEDICINES, medicines);

    // 8. Suppliers
    const suppliers = [
      { id: 'sup-1', name: 'Astra Bio-pharma', contact: 'Walter White', phone: '9988776655', address: 'Industrial Area, Albuquerque' },
      { id: 'sup-2', name: 'Apex Medical Supplies', contact: 'Gus Fring', phone: '9988776644', address: 'Downtown Plaza, El Paso' }
    ];
    db.set(db.KEYS.SUPPLIERS, suppliers);

    // Seeding Inventory Transaction Logs (initial stocking)
    const initialTxs = medicines.map(med => ({
      id: `tx-${med.id}-init`,
      medicine_id: med.id,
      type: 'Purchase',
      quantity: med.stock_quantity,
      notes: 'Initial stocking on system setup',
      created_at: '2026-07-01T10:00:00.000Z'
    }));
    db.set(db.KEYS.INVENTORY_TXS, initialTxs);

    // 9. Lab Tests list
    const labTests = [
      { id: 'lab-t1', test_name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 250, normal_range: 'WBC: 4.5-11.0 k/uL, RBC: 4.5-5.9 M/uL, Hgb: 13.5-17.5 g/dL' },
      { id: 'lab-t2', test_name: 'Lipid Profile', category: 'Biochemistry', price: 450, normal_range: 'Cholesterol: <200 mg/dL, Triglycerides: <150 mg/dL' },
      { id: 'lab-t3', test_name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 600, normal_range: 'TSH: 0.4-4.0 mIU/L' },
      { id: 'lab-t4', test_name: 'Kidney Function Test (KFT)', category: 'Biochemistry', price: 350, normal_range: 'Urea: 7-20 mg/dL, Creatinine: 0.6-1.2 mg/dL' },
      { id: 'lab-t5', test_name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 400, normal_range: 'SGOT: 5-40 U/L, SGPT: 7-56 U/L' },
      { id: 'lab-t6', test_name: 'Chest X-Ray', category: 'Radiology', price: 300, normal_range: 'Lungs clear, Cardiac silhouette normal' },
      { id: 'lab-t7', test_name: 'Brain MRI', category: 'Radiology', price: 2500, normal_range: 'No acute intracranial pathology' }
    ];
    db.set(db.KEYS.LAB_TESTS, labTests);

    // 10. Operation Theatres
    const ots = [
      { id: 'ot-1', name: 'OT Block A - Cardiac', status: 'Available' },
      { id: 'ot-2', name: 'OT Block B - Neuro', status: 'Available' },
      { id: 'ot-3', name: 'OT Block C - General', status: 'Available' }
    ];
    db.set(db.KEYS.OTS, ots);

    // 11. Ambulances
    const ambulances = [
      { id: 'amb-1', vehicle_number: 'AMB-101', driver_name: 'Max Rockatansky', phone: '9898989801', availability: true, status: 'Available' },
      { id: 'amb-2', vehicle_number: 'AMB-102', driver_name: 'Furiosa', phone: '9898989802', availability: true, status: 'Available' },
      { id: 'amb-3', vehicle_number: 'AMB-103', driver_name: 'Nux', phone: '9898989803', availability: false, status: 'Busy' },
      { id: 'amb-4', vehicle_number: 'AMB-104', driver_name: 'Slit', phone: '9898989804', availability: false, status: 'Out of Service' }
    ];
    db.set(db.KEYS.AMBULANCES, ambulances);

    // 12. APPOINTMENTS (20 Records)
    // Date of "today" in 2026-07-14.
    // Past dates: 2026-07-10, 2026-07-12, 2026-07-13.
    // Today's date: 2026-07-14.
    // Future dates: 2026-07-15, 2026-07-16, 2026-07-18.
    const appointments = [
      // Completed Past
      { id: 'appt-1', patient_id: 'pat-1', doctor_id: 'doc-4', date: '2026-07-10', time_slot: '09:00 - 09:30', reason: 'Fever and cold', status: 'Completed' },
      { id: 'appt-2', patient_id: 'pat-2', doctor_id: 'doc-1', date: '2026-07-10', time_slot: '10:00 - 10:30', reason: 'Routine heart checkup', status: 'Completed' },
      { id: 'appt-3', patient_id: 'pat-3', doctor_id: 'doc-2', date: '2026-07-12', time_slot: '11:00 - 11:30', reason: 'Follow up on neuropathy symptoms', status: 'Completed' },
      { id: 'appt-4', patient_id: 'pat-4', doctor_id: 'doc-3', date: '2026-07-12', time_slot: '14:00 - 14:30', reason: 'Asthma checkup', status: 'Completed' },
      { id: 'appt-5', patient_id: 'pat-5', doctor_id: 'doc-8', date: '2026-07-13', time_slot: '10:30 - 11:00', reason: 'Chest pressure follow-up', status: 'Completed' },
      // Cancelled/No-Show Past
      { id: 'appt-6', patient_id: 'pat-6', doctor_id: 'doc-7', date: '2026-07-13', time_slot: '11:30 - 12:00', reason: 'Consultation for minor surgery', status: 'Cancelled', cancel_reason: 'Patient had a conflict' },
      { id: 'appt-7', patient_id: 'pat-7', doctor_id: 'doc-4', date: '2026-07-13', time_slot: '15:00 - 15:30', reason: 'Kidney health follow-up', status: 'No-Show' },

      // Today (2026-07-14)
      { id: 'appt-8', patient_id: 'pat-1', doctor_id: 'doc-4', date: '2026-07-14', time_slot: '09:00 - 09:30', reason: 'Review blood test results', status: 'Confirmed' },
      { id: 'appt-9', patient_id: 'pat-8', doctor_id: 'doc-4', date: '2026-07-14', time_slot: '09:30 - 10:00', reason: 'Thyroid level check', status: 'Scheduled' },
      { id: 'appt-10', patient_id: 'pat-9', doctor_id: 'doc-9', date: '2026-07-14', time_slot: '10:00 - 10:30', reason: 'Childhood vaccinations', status: 'Confirmed' },
      { id: 'appt-11', patient_id: 'pat-10', doctor_id: 'doc-2', date: '2026-07-14', time_slot: '10:30 - 11:00', reason: 'Chronic migraines', status: 'Scheduled' },
      { id: 'appt-12', patient_id: 'pat-11', doctor_id: 'doc-6', date: '2026-07-14', time_slot: '11:00 - 11:30', reason: 'Joint pain in left knee', status: 'Confirmed' },
      { id: 'appt-13', patient_id: 'pat-12', doctor_id: 'doc-4', date: '2026-07-14', time_slot: '14:00 - 14:30', reason: 'Regular health assessment', status: 'Scheduled' },

      // Future (2026-07-15 and onwards)
      { id: 'appt-14', patient_id: 'pat-13', doctor_id: 'doc-4', date: '2026-07-15', time_slot: '09:30 - 10:00', reason: 'Lactose intolerance consultation', status: 'Scheduled' },
      { id: 'appt-15', patient_id: 'pat-14', doctor_id: 'doc-10', date: '2026-07-15', time_slot: '10:30 - 11:00', reason: 'Osteoarthritis therapy check', status: 'Scheduled' },
      { id: 'appt-16', patient_id: 'pat-15', doctor_id: 'doc-1', date: '2026-07-16', time_slot: '11:30 - 12:00', reason: 'High blood pressure inquiry', status: 'Scheduled' },
      { id: 'appt-17', patient_id: 'pat-2', doctor_id: 'doc-3', date: '2026-07-16', time_slot: '14:30 - 15:00', reason: 'Pediatric surgical checkup for baby', status: 'Scheduled' },
      { id: 'appt-18', patient_id: 'pat-3', doctor_id: 'doc-7', date: '2026-07-18', time_slot: '10:00 - 10:30', reason: 'Hernia evaluation', status: 'Scheduled' },
      { id: 'appt-19', patient_id: 'pat-5', doctor_id: 'doc-8', date: '2026-07-18', time_slot: '15:30 - 16:00', reason: 'Heart status evaluation', status: 'Scheduled' },
      { id: 'appt-20', patient_id: 'pat-6', doctor_id: 'doc-5', date: '2026-07-20', time_slot: '10:00 - 10:30', reason: 'Neuro exam review', status: 'Scheduled' }
    ];
    db.set(db.KEYS.APPOINTMENTS, appointments);

    // 13. Reminders Log
    const reminders = [
      { id: 'rem-1', appointment_id: 'appt-8', type: 'SMS', status: 'Sent', sent_at: '2026-07-13T09:00:00.000Z', message: 'Reminder: Your appointment with Dr. John Watson is tomorrow at 09:00 AM. HMS Hospital.' },
      { id: 'rem-2', appointment_id: 'appt-9', type: 'Email', status: 'Sent', sent_at: '2026-07-13T09:15:00.000Z', message: 'Reminder: Your appointment with Dr. John Watson is tomorrow at 09:30 AM. HMS Hospital.' },
      { id: 'rem-3', appointment_id: 'appt-10', type: 'SMS', status: 'Sent', sent_at: '2026-07-13T10:00:00.000Z', message: 'Reminder: Your appointment with Dr. Alex Karev is tomorrow at 10:00 AM. HMS Hospital.' }
    ];
    db.set(db.KEYS.REMINDERS, reminders);

    // 14. Admissions
    // Add two active admissions, and one discharged admission.
    // Discharge admission will have calculated bed charges.
    // Occupied beds: bed-w-icu-1 (occupied by pat-5), bed-w-gen-3 (occupied by pat-7)
    // Make sure we update the status in beds!
    const updatedBeds = db.getAll(db.KEYS.BEDS);
    const bedIcu1 = updatedBeds.find(b => b.id === 'bed-w-icu-1');
    if (bedIcu1) {
      bedIcu1.status = 'Occupied';
      bedIcu1.occupant_id = 'pat-5';
    }
    const bedGen3 = updatedBeds.find(b => b.id === 'bed-w-gen-3');
    if (bedGen3) {
      bedGen3.status = 'Occupied';
      bedGen3.occupant_id = 'pat-7';
    }
    db.set(db.KEYS.BEDS, updatedBeds);

    const admissions = [
      {
        id: 'admit-1',
        patient_id: 'pat-5',
        doctor_id: 'doc-8',
        ward_id: 'w-icu',
        bed_id: 'bed-w-icu-1',
        admission_date: '2026-07-10',
        discharge_date: null,
        reason: 'Acute angina episode, monitoring required',
        status: 'Admitted',
        bed_charges: 0
      },
      {
        id: 'admit-2',
        patient_id: 'pat-7',
        doctor_id: 'doc-4',
        ward_id: 'w-gen',
        bed_id: 'bed-w-gen-3',
        admission_date: '2026-07-12',
        discharge_date: null,
        reason: 'Uremia complication checkup and hydration',
        status: 'Admitted',
        bed_charges: 0
      },
      {
        id: 'admit-3',
        patient_id: 'pat-3',
        doctor_id: 'doc-4',
        ward_id: 'w-pvt',
        bed_id: 'bed-w-pvt-1',
        admission_date: '2026-07-05',
        discharge_date: '2026-07-09', // 4 days * 1000 = 4000
        reason: 'Diabetic ketoacidosis stabilization',
        status: 'Discharged',
        bed_charges: 4000
      }
    ];
    db.set(db.KEYS.ADMISSIONS, admissions);

    // 15. Medical Records & Prescriptions
    const medicalRecords = [
      { id: 'rec-1', patient_id: 'pat-1', doctor_id: 'doc-4', appointment_id: 'appt-1', diagnosis: 'Common Cold & Mild Bronchitis', symptoms: 'Sore throat, chesty cough, low-grade fever (100.2 F) for 3 days.', notes: 'Advised rest, warm water, and avoid cold food. Return if breathing difficulty develops.', created_at: '2026-07-10T09:30:00.000Z' },
      { id: 'rec-2', patient_id: 'pat-2', doctor_id: 'doc-1', appointment_id: 'appt-2', diagnosis: 'Mild Mitral Valve Prolapse', symptoms: 'Occasional palpitations during heavy exercise.', notes: 'Echocardiogram shows stable mitral valve leaflet. No active intervention required. annual follow-up.', created_at: '2026-07-10T10:30:00.000Z' },
      { id: 'rec-3', patient_id: 'pat-3', doctor_id: 'doc-2', appointment_id: 'appt-3', diagnosis: 'Diabetic Neuropathy - Lower limbs', symptoms: 'Tingling and numbness in bilateral feet, worse at night.', notes: 'Review glycemic control index. Prescription adjusted.', created_at: '2026-07-12T11:30:00.000Z' }
    ];
    db.set(db.KEYS.MEDICAL_RECORDS, medicalRecords);

    const prescriptions = [
      { id: 'pres-1', patient_id: 'pat-1', doctor_id: 'doc-4', appointment_id: 'appt-1', status: 'Dispensed', created_at: '2026-07-10T09:30:00.000Z' },
      { id: 'pres-2', patient_id: 'pat-3', doctor_id: 'doc-2', appointment_id: 'appt-3', status: 'Pending', created_at: '2026-07-12T11:30:00.000Z' }
    ];
    db.set(db.KEYS.PRESCRIPTIONS, prescriptions);

    const prescriptionItems = [
      // For pres-1 (Dispensed Paracetamol + Albuterol)
      { id: 'pitem-1', prescription_id: 'pres-1', medicine_id: 'med-1', dosage: '500mg', frequency: '1-0-1', duration: 5, instructions: 'Take after meals' },
      { id: 'pitem-2', prescription_id: 'pres-1', medicine_id: 'med-8', dosage: '1 puff', frequency: 'As needed', duration: 30, instructions: 'Inhale when feeling short of breath' },
      // For pres-2 (Pending Gabapentin + Metformin)
      { id: 'pitem-3', prescription_id: 'pres-2', medicine_id: 'med-12', dosage: '300mg', frequency: '0-0-1', duration: 30, instructions: 'Before bedtime' },
      { id: 'pitem-4', prescription_id: 'pres-2', medicine_id: 'med-5', dosage: '500mg', frequency: '1-0-1', duration: 30, instructions: 'With breakfast and dinner' }
    ];
    db.set(db.KEYS.PRESCRIPTION_ITEMS, prescriptionItems);

    // 16. Lab Test Orders & Results
    const labOrders = [
      { id: 'lab-o-1', patient_id: 'pat-1', doctor_id: 'doc-4', test_id: 'lab-t1', appointment_id: 'appt-1', status: 'Completed', result_value: 'WBC: 6.8 k/uL, RBC: 4.8 M/uL, Hgb: 14.2 g/dL (Normal)', mock_report_file: 'cbc_report_pat1.pdf', created_at: '2026-07-10T09:30:00.000Z' },
      { id: 'lab-o-2', patient_id: 'pat-3', doctor_id: 'doc-2', test_id: 'lab-t2', appointment_id: 'appt-3', status: 'Processing', result_value: '', mock_report_file: '', created_at: '2026-07-12T11:30:00.000Z' },
      { id: 'lab-o-3', patient_id: 'pat-8', doctor_id: 'doc-4', test_id: 'lab-t3', appointment_id: 'appt-9', status: 'Sample Collected', result_value: '', mock_report_file: '', created_at: '2026-07-14T09:45:00.000Z' },
      { id: 'lab-o-4', patient_id: 'pat-9', doctor_id: 'doc-9', test_id: 'lab-t1', appointment_id: 'appt-10', status: 'Ordered', result_value: '', mock_report_file: '', created_at: '2026-07-14T10:15:00.000Z' }
    ];
    db.set(db.KEYS.LAB_TEST_ORDERS, labOrders);

    // 17. Surgeries (Completed, Scheduled)
    // Doctor 8 (Preston Burke) is Lead Surgeon.
    // Doctor 6 (Callie Torres) is Lead Surgeon.
    const surgeries = [
      {
        id: 'surg-1',
        patient_id: 'pat-3',
        ot_id: 'ot-3',
        lead_surgeon_id: 'doc-7',
        surgery_type: 'Inguinal Hernia Repair',
        date_time: '2026-07-08T09:00',
        status: 'Completed',
        notes: 'Hernia repaired successfully using mesh. Patient discharged after 24hr observation.',
        created_at: '2026-07-05T12:00:00.000Z'
      },
      {
        id: 'surg-2',
        patient_id: 'pat-5',
        ot_id: 'ot-1',
        lead_surgeon_id: 'doc-8',
        surgery_type: 'Coronary Artery Bypass Graft (CABG)',
        date_time: '2026-07-16T08:00',
        status: 'Scheduled',
        notes: 'Pre-surgery evaluations done. ICU bed reserved.',
        created_at: '2026-07-12T10:00:00.000Z'
      }
    ];
    db.set(db.KEYS.SURGERIES, surgeries);

    const surgeryTeam = [
      // For surg-1
      { id: 'steam-1', surgery_id: 'surg-1', staff_id: 'doc-4', role: 'Assistant Surgeon' },
      { id: 'steam-2', surgery_id: 'surg-1', staff_id: 'staff-1', role: 'Scrub Nurse' },
      // For surg-2
      { id: 'steam-3', surgery_id: 'surg-2', staff_id: 'doc-1', role: 'Anesthetist' },
      { id: 'steam-4', surgery_id: 'surg-2', staff_id: 'staff-2', role: 'Scrub Nurse' }
    ];
    db.set(db.KEYS.SURGERY_TEAM, surgeryTeam);

    // 18. Invoices, Invoice Items, Payments & Claims
    // Invoice 1: Linked to Completed Appt (appt-1) + Lab (lab-o-1) + Medicine (pres-1)
    // Patient: John Doe (pat-1). Doctor: doc-4 (fee 400). Lab test (250). Medicine (Paracetamol + Albuterol = 500x5 + 5x120 = 25 + 600 = 625).
    // Total = 400 + 250 + 625 = 1275.
    const invoices = [
      {
        id: 'inv-1',
        patient_id: 'pat-1',
        subtotal: 1275,
        discount_percent: 10,
        tax_percent: 5,
        net_payable: 1204.88,
        status: 'Paid',
        created_at: '2026-07-10T12:00:00.000Z'
      },
      // Invoice 2: Discharged Admission (admit-3)
      // Patient: Robert Johnson (pat-3). Bed charges = 4000. Consultation = 400. Surgery = 15000.
      // Total = 19400.
      {
        id: 'inv-2',
        patient_id: 'pat-3',
        subtotal: 19400,
        discount_percent: 0,
        tax_percent: 8,
        net_payable: 20952,
        status: 'Partially Paid',
        created_at: '2026-07-09T16:00:00.000Z'
      },
      // Invoice 3: Pending consultation
      // Patient: Jane Smith (pat-2). Doctor: doc-1 (fee 800)
      {
        id: 'inv-3',
        patient_id: 'pat-2',
        subtotal: 800,
        discount_percent: 0,
        tax_percent: 5,
        net_payable: 840,
        status: 'Pending',
        created_at: '2026-07-10T11:00:00.000Z'
      }
    ];
    db.set(db.KEYS.INVOICES, invoices);

    const invoiceItems = [
      // inv-1
      { id: 'invit-1', invoice_id: 'inv-1', description: 'General Physician Consultation (Dr. John Watson)', amount: 400, type: 'Consultation' },
      { id: 'invit-2', invoice_id: 'inv-1', description: 'Lab Test: Complete Blood Count (CBC)', amount: 250, type: 'Lab' },
      { id: 'invit-3', invoice_id: 'inv-1', description: 'Pharmacy Dispensation (Paracetamol & Albuterol)', amount: 625, type: 'Medicine' },
      // inv-2
      { id: 'invit-4', invoice_id: 'inv-2', description: 'Private Ward Bed Charges (4 Days)', amount: 4000, type: 'Bed' },
      { id: 'invit-5', invoice_id: 'inv-2', description: 'Surgery: Inguinal Hernia Repair', amount: 15000, type: 'Surgery' },
      { id: 'invit-6', invoice_id: 'inv-2', description: 'Anesthetist & Surgical Assistant Fees', amount: 400, type: 'Consultation' },
      // inv-3
      { id: 'invit-7', invoice_id: 'inv-3', description: 'Cardiology Consultation (Dr. Sarah Connor)', amount: 800, type: 'Consultation' }
    ];
    db.set(db.KEYS.INVOICE_ITEMS, invoiceItems);

    const payments = [
      { id: 'pmt-1', invoice_id: 'inv-1', amount_paid: 1204.88, payment_mode: 'UPI', transaction_date: '2026-07-10' },
      { id: 'pmt-2', invoice_id: 'inv-2', amount_paid: 10000, payment_mode: 'Insurance', transaction_date: '2026-07-09' }
    ];
    db.set(db.KEYS.PAYMENTS, payments);

    const insuranceClaims = [
      {
        id: 'claim-1',
        invoice_id: 'inv-2',
        patient_id: 'pat-3',
        company_name: 'Star Health Insurance',
        policy_number: 'POL-908711-23',
        status: 'Settled',
        claim_amount: 15000,
        approved_amount: 10000,
        notes: 'Co-pay applied of 33%. Remaining settled directly.',
        created_at: '2026-07-09T16:15:00.000Z'
      }
    ];
    db.set(db.KEYS.INSURANCE_CLAIMS, insuranceClaims);

    // 19. Ambulance requests
    const ambulanceRequests = [
      {
        id: 'amb-r-1',
        patient_id: 'pat-1',
        name: 'John Doe',
        pickup_location: 'Central Mall Sector 4',
        drop_location: 'HMS Emergency Ward',
        ambulance_id: 'amb-1',
        status: 'Completed',
        created_at: '2026-07-10T14:20:00.000Z'
      },
      {
        id: 'amb-r-2',
        patient_id: null,
        name: 'Unidentified Male (Trauma)',
        pickup_location: 'Highway 5 Intersection',
        drop_location: 'HMS ER Resuscitation',
        ambulance_id: 'amb-3',
        status: 'Dispatched',
        created_at: '2026-07-14T15:30:00.000Z'
      }
    ];
    db.set(db.KEYS.AMBULANCE_REQUESTS, ambulanceRequests);

    console.log('Seeding completed successfully!');
  }
};
