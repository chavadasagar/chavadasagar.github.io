# AdminERP - Enterprise RBAC Management Portal

AdminERP is a modern, responsive, client-side Enterprise Resource Planning (ERP) and Role-Based Access Control (RBAC) management portal built with HTML5, CSS3, and Vanilla JavaScript, powered by local AG Grid Community and a 100% offline self-contained architecture.

---

## 🚀 Key Features

- **Universal AG Grid Enterprise Tables**: All data management tables (Users, Roles, Departments, Categories, Projects, Documents, Dynamic Menus, and Role-Menu Access Mappings) powered by AG Grid with high-performance sorting, filtering, quick-filter search, pagination selector (10, 25, 50, 100), and left-pinned actions.
- **Left-Pinned Sticky Actions Column**: The Actions column across all grids is locked and pinned to the left edge (`pinned: 'left', lockPinned: true`), ensuring essential actions (View, Edit, Delete, Map Role) stay visible during wide table horizontal scrolling.
- **100% Offline & CDN-Free Operation**: Zero external network or font dependencies. All libraries (`ag-grid-community.min.js`, `ag-grid.css`, `ag-theme-quartz.css`, `sweetalert2.all.min.js`) are served locally from `lib/`.
- **Offline Vector SVG Icon Engine**: Inline vector SVGs and crisp system emojis across the entire UI, eliminating missing square boxes (`□`) offline and under `file:///` protocols.
- **Full JSON Backup & Restore Engine**: Comprehensive export & import of all system entities (users, roles, departments, categories, projects, documents, dynamic menus, and audit trails) with safety validations and schema checks.
- **Form Screen & User Draft Persistence on Refresh (F5)**: Navigating to any Add or Edit screen across all 7 modules (Users, Roles, Departments, Categories, Projects, Documents, Dynamic Menus) and reloading the browser automatically restores the exact Form View instead of defaulting back to list view. Real-time auto-saving preserves all user-entered draft values (text, passwords, selects, textareas, checkboxes, tag chips, permission matrices) across browser refreshes, live previews are immediately updated upon reload, and drafts are cleanly removed upon form submit or cancel.
- **Granular Backup & Restore Module Permissions**: The RBAC Module Permission Matrix includes a dedicated "Backup & Restore" module row, empowering administrators to control access to export/import operations via Read, Add, Update, and Delete permission flags.
- **Live Department Preview Card & Quick Department Creation Modal**: Interactive real-time live preview card for department setup and fast inline modal dialog (`➕ Add New Department`) directly accessible from user creation forms.

---

## 🛠️ Technology Stack

- **Markup**: Semantic HTML5 with accessible labels and clean section layouts
- **Styling**: Modern CSS3 (CSS Variables, Flexbox, Grid, AG Grid Quartz Theme, Native System Font Stack)
- **Logic**: Vanilla JavaScript (ES6+, DOM API, LocalStorage persistence)
- **Data Grids**: AG Grid Community v31 (Local in `lib/`)
- **Icons**: Inline Vector SVGs (`OFFLINE_SVGS`) + Emojis (Zero font downloads)
- **Dialogs**: SweetAlert2 (Local in `lib/` with native fallback)

---

## 💻 How to Run Locally

1. Open `index.html` directly in any modern web browser (`file:///` protocol supported 100% offline).
2. Alternatively, serve using any static HTTP server:
   ```bash
   npx serve .
   ```
3. Default login credentials:
   - **Username**: `admin`
   - **Password**: `admin`

---

## 📁 File Structure

```text
adminerp/
├── index.html        # Main application layout, AG Grid containers, and modals
├── style.css         # Modern dual-theme design system and AG Grid styles
├── app.js            # Core RBAC engine, AG Grid setup, and offline SVGs
├── README.md         # Project documentation and specifications
└── lib/              # Localized vendor libraries (100% offline)
    ├── ag-grid-community.min.js
    ├── ag-grid.css
    ├── ag-theme-quartz.css
    └── sweetalert2.all.min.js
```

---

## 📱 Browser Compatibility

- Google Chrome / Microsoft Edge / Brave
- Mozilla Firefox
- Apple Safari (iOS / macOS)
