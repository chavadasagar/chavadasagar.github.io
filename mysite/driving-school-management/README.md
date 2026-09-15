# 🚗 Motor Driving School Management System

A comprehensive, 100% browser-based single-file Web Application for managing motor driving schools. Built with modern HTML5, CSS3, and Vanilla JavaScript with **LocalStorage** offline persistence.

---

## 🌟 Key Features & Highlights

- **📊 Interactive Dashboard:** Real-time live computed metrics for active students, enrollments, today's schedule, pending dues, monthly revenue, and available vehicles.
- **👨🎓 Student Management:** Register, view full profiles, edit, and track enrollments with auto-generated registration numbers (`DS-2024-001`).
- **👨🏫 Instructors Roster:** Track experience, salary, license eligibility categories (MCWOG / MC / LMV / HMV), and get automatic DL expiry warnings (within 30 days).
- **🚙 Fleet Management:** Manage vehicle details (Car, Motorcycle, Heavy, Auto), dual-control status, and automated Insurance & PUC expiry alerts.
- **📦 Course Catalog:** Configurable course durations, practical/theory hours, and fees.
- **📝 Student Enrollments:** Track student course progress, auto-calculate net fees, sessions progress, and completion percentages.
- **🗓️ Smart Session Scheduler:** Conflict detection engine prevents double-booking of instructors or vehicles for overlapping time slots. Auto-updates student progress upon session completion.
- **💰 Payment Register & Printable Receipts:** Record payments across Cash, UPI, Card, Cheque, and Bank Transfer with instant printable receipt generation (`window.print()`).
- **🧪 RTO & Internal Tests:** Log mock and RTO theory/practical exams with automated Pass/Fail calculation based on passing thresholds.
- **⚙️ Settings & Data Backup:** Manage school profile info, export full JSON data backups, restore backups, or reset system data.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** Vanilla HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6+).
- **Persistence:** Browser `localStorage` (`ds_students`, `ds_instructors`, `ds_vehicles`, `ds_courses`, `ds_enrollments`, `ds_sessions`, `ds_payments`, `ds_tests`, `ds_settings`, `ds_counters`).
- **Design System:** Professional Dark Sidebar Layout with Inter typography and responsive flexbox grid layout.
- **Zero Dependencies:** No external JavaScript frameworks, npm modules, or API backend required.

---

## 🚀 Getting Started

Simply open `index.html` in any modern web browser (Google Chrome, Firefox, Microsoft Edge, Safari). No backend server setup needed.
