# AdminERP - Enterprise RBAC Management Portal

AdminERP is a modern, responsive, client-side Enterprise Resource Planning (ERP) and Role-Based Access Control (RBAC) management portal built with HTML5, CSS3, and Vanilla JavaScript, powered by local AG Grid Community and a 100% offline self-contained architecture.

---

## 🚀 Key Features

- **Universal AG Grid Enterprise Tables**: All data management tables (Users, Roles, Departments, Categories, Projects, Documents, Dynamic Menus, and Role-Menu Access Mappings) powered by AG Grid with high-performance sorting, filtering, quick-filter search, pagination selector (10, 25, 50, 100), and left-pinned actions.
- **Left-Pinned Sticky Actions Column**: The Actions column across all grids is locked and pinned to the left edge (`pinned: 'left', lockPinned: true`), ensuring essential actions (View, Edit, Delete, Map Role) stay visible during wide table horizontal scrolling.
- **100% Offline & CDN-Free Operation**: Zero external network or font dependencies. All libraries (`ag-grid-community.min.js`, `ag-grid.css`, `ag-theme-quartz.css`, `sweetalert2.all.min.js`) are served locally from `lib/`.
- **Offline Vector SVG Icon Engine**: Inline vector SVGs and crisp system emojis across the entire UI, eliminating missing square boxes (`□`) offline and under `file:///` protocols.
- **Full JSON Backup & Restore Engine**: Comprehensive export & import of all system entities (users, roles, departments, categories, projects, documents, dynamic menus, announcements, and audit trails), including active UI theme preference (Dark / Light mode), with safety validations and schema checks.
- **Form Screen & User Draft Persistence on Refresh (F5)**: Navigating to any Add or Edit screen across all 7 modules (Users, Roles, Departments, Categories, Projects, Documents, Dynamic Menus) and reloading the browser automatically restores the exact Form View instead of defaulting back to list view. Real-time auto-saving preserves all user-entered draft values (text, passwords, selects, textareas, checkboxes, tag chips, permission matrices) across browser refreshes, live previews are immediately updated upon reload, and drafts are cleanly removed upon form submit or cancel.
- **Granular Backup & Restore Module Permissions**: The RBAC Module Permission Matrix includes a dedicated "Backup & Restore" module row, empowering administrators to control access to export/import operations via Read, Add, Update, and Delete permission flags.
- **Live Department Preview Card & Quick Department Creation Modal**: Interactive real-time live preview card for department setup and fast inline modal dialog (`➕ Add New Department`) directly accessible from user creation forms.
- **Nested Submenu Support in Menu Builder**: Every dynamic menu can now be marked as a submenu of another menu via the new **"Parent Menu (Make this item a Submenu)"** dropdown. The sidebar renders parents as collapsible groups with an animated chevron toggle (multiple nesting levels supported), the active submenu's parent group auto-expands on page open, the dynamic route view shows a `Parent › Grandparent` trail chip, the Menus grid adds a **"Submenu Of"** column with indentation, level badges and sub-item counts, a new **"All Levels / Top-Level / Submenus"** filter isolates top-level vs nested items, and the Role-Menu Mapping screens display full hierarchy paths.
- **In-App Web View for Every Link**: Any menu route that is a web URL — top-level or submenu — opens inside the app as a **bare, full-width sandboxed `iframe`** instead of spawning a new browser tab. The view is intentionally chrome-free: no URL bar, no toolbar buttons, no status/hint text, no route or parent badges — only the back button, the menu title and the embedded page. The dynamic route view is turned into a full-height flex column so the embedded page **fills the entire available viewport height with no empty space below it**. URL detection is unified in `resolveWebviewUrl()`, so `https://x.com`, `www.x.com` and `x.com/page` all load correctly, and saving a submenu whose route looks like a link automatically switches its Target Action to the Web View. Only `http`/`https` URLs are accepted (validated on save and again at load time, blocking `javascript:` / `data:` / `vbscript:` URLs).
- **Form Drafts Keep Target Action Consistent**: The `Route Path` and `Target Action` fields are re-synced with the parent selection after an autosaved draft is restored on refresh, so a submenu link never silently falls back to the internal SPA view.
- **Group Headers Are Toggle-Only**: As soon as a menu has at least one submenu, its sidebar row becomes a pure group header — clicking it only expands/collapses the submenu list (animated chevron + `aria-expanded`) and never navigates to the parent's own page. Menus without submenus keep behaving as normal links/buttons. While a submenu is open, its parent header is highlighted so the user never loses the current position.
- **Role Access Belongs to Top-Level Menus Only**: The menu form intentionally shows **no role option at all** — neither for a "No Parent" (top-level) menu nor for a submenu. Submenus store no roles of their own and automatically inherit the role access of their top-level parent, so a whole menu group (parent + all nested submenus) is always shown or hidden together. Role access is configured exclusively from the **Role-Menu Mapping** tab, whose "Select Top-Level Menu" dropdown lists only No-Parent menus (with their submenu counts) and whose grid shows submenu rows as read-only `Inherited`. Legacy submenu role lists are automatically merged up into the top-level parent on upgrade so no access is silently lost, and deleting a parent promotes its submenus to top level while keeping the inherited access.
- **Top-Level Menus Are Group Folders (No Route)**: A menu created with **"No Parent"** is a pure group header — the `Route Path / Link` and `Target Action` fields are hidden and not required for it, because it has no page of its own. As soon as a parent is selected in the form, those fields appear (a slug is auto-suggested from the title) and the item becomes a real submenu with a page or a Web View link. A top-level folder that has neither submenus nor a route renders muted as an `empty` placeholder in the sidebar, and the Menus grid labels it `📁 Group Header (no route)`.
- **Submenu Safety & Lifecycle Rules**: A menu can never be nested inside itself or one of its own submenus (cycle validation on save, in the parent dropdown, and via a `menuChainHasCycle` migration guard that only breaks genuinely circular links — so nesting survives a browser refresh). Deleting a menu is a **cascade delete**: the menu and its entire submenu tree are removed together after an explicit confirmation listing every affected submenu. Submenus whose parent is hidden by role-based visibility are promoted to the sidebar top level so allowed users never lose navigation.
- **Submenus Are Visible Immediately**: Submenu groups open expanded by default so a freshly saved submenu is never hidden behind a collapsed parent, each parent row shows a live sub-item count badge, saving a submenu force-expands its parent group, and the user's manual collapse choice is remembered for the rest of the session. The Role-Menu Mapping menu dropdown is flattened into a parent-before-child tree (`📂 Parent` → `↳ Submenu`) so nested menus are easy to pick.
- **Announcement Broadcast Center & Header Marquee Ticker**: Comprehensive system alert and notification module allowing administrators to create and schedule time-bound announcements with priority badges (`Info`, `Important`, `Urgent`). All active announcements scroll across the top header in an animated CSS marquee ticker accessible to all users. Features include hover-to-pause, click-to-read detail modal, real-time automated expiration engine (announcements automatically disappear from the ticker when their expiry time is reached with zero reload required), live preview during authoring, full RBAC permission matrix (Read, Add, Update, Delete), and JSON backup/restore support.
- **Global Quick-Add Keyboard Shortcut (`Ctrl + Shift + O`)**: Pressing `Ctrl + Shift + O` from any module page immediately opens the Add / Create form for that active module (Users, Roles, Departments, Categories, Projects, Documents, Menus, Announcements) with automatic RBAC permission validation.
- **Admin Password Protected Factory Reset**: Performing a system Factory Reset requires mandatory administrator password authorization via a secure prompt, preventing accidental or unauthorized database wipes.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
|---|---|
| `Ctrl + Shift + O` | **Quick Add / Create**: Opens the creation form for the currently active module |
| `Alt + 1` .. `Alt + 0` | Direct navigation across modules (Dashboard, Users, Roles, Depts, Cats, Projs, Docs, Audit, Menus, Announcements) |
| `Ctrl + K` | Universal Command Palette & quick search |
| `Ctrl + Shift + L` | Quick Logout |
| `/` | Focus search bar on Documents page |
| `Enter` | Jump to next form field / submit on last field |
| `Esc` | Close active modal, command palette, or exit create/edit form back to list view |

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
