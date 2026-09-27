# 📋 Repository Change History & Changelog

All notable changes, updates, and additions to this workspace are documented in this file.

---

## [Unreleased] - 2026-09-01

### Added
- `adminerp`: Stripped the Web View down to a **bare iframe** — removed the URL bar with its input and Load/Reload/Open-in-new-tab/Close buttons, the hint text, the "load nahi hua" status message, the blocked-embed overlay and its watchdog, plus the route and parent-crumb badges from the dynamic route header. The embedded page now also **fills the full viewport height** (`#page-dynamic-view` is a full-height flex column), so no empty space is left below the frame.
- `adminerp`: Fixed the in-app **Web View not opening for submenu links** — URL detection is now unified in `resolveWebviewUrl()` (so `www.x.com` / `x.com/page` work like `https://x.com`), the Target Action is auto-set to the Web View when a link route is saved, the Route/Target fields are re-synced after a draft restore, and a watchdog overlay with an "open in new tab" button now appears when a site blocks being embedded instead of leaving a blank frame.
- `adminerp`: Added a **detach safety net** in the menu form — a menu that is already saved as a submenu keeps its parent even if the form is reset by a stale autosaved draft, so re-saving it can no longer silently demote it to a top-level group (the parent is only changed deliberately, via the Parent Menu dropdown).
- `adminerp`: Fixed submenu nesting being lost on browser refresh — the DB migration cycle-guard incorrectly cleared the `parentId` of **every** child (it compared the parent id against the menu's own ancestor list). Replaced with a dedicated `menuChainHasCycle` walk that only breaks genuinely circular references.
- `adminerp`: Parent menu deletion is now a **cascade delete** — the menu and its whole submenu tree are removed together after a confirmation that lists every affected submenu.
- `adminerp`: A **"No Parent" (top-level) menu is now a pure group folder**: the `Route Path / Link` and `Target Action` fields are hidden and not required for it, they appear only when a parent is selected (with an auto-suggested slug), childless route-less top-level menus render as a muted `empty` placeholder in the sidebar, and the grid labels them `📁 Group Header (no route)`.
- `adminerp`: Added a built-in **Web View** — every menu link (`http://` / `https://` route, top-level or submenu) now loads inside the app in a sandboxed iframe with URL bar, Load, Reload, "open in new tab" and Close controls, instead of opening a new browser tab. `Target Action` option relabelled to "Web View (URL Link Loaded Inside App)", link menus are validated as real http(s) URLs on save, and non-http schemes (`javascript:`, `data:`, `vbscript:`) are rejected.
- `adminerp`: Menus that have submenus are now **group headers only** in the sidebar — clicking them expands/collapses the submenu list and never navigates to the parent's own page (menus without submenus still open normally). The parent row shows an animated chevron, a sub-item count badge, and gets highlighted while one of its submenus is open.
- `adminerp`: Removed the role-selection UI from the menu form entirely (both the "Role Access — Not set here" and "Role Access — Inherited" notices and the role checkbox group). Submenus now always inherit the role access of their top-level parent, role mapping is only possible for **No Parent (top-level)** menus from the Role-Menu Mapping tab, and a DB migration merges any legacy submenu role list up into its top-level parent.
- `adminerp`: Submenu groups now open **expanded by default** with a live sub-item count badge on each parent, parent group auto-expands right after saving a submenu, manual collapse state is remembered per session, and the Role-Menu Mapping menu dropdown renders a flattened parent-before-child tree.
- `adminerp`: **Submenu (Nested Menu) support in Menu Builder** — new "Parent Menu" dropdown in the Add/Edit menu form, collapsible multi-level submenu groups in the sidebar with animated chevron toggle, auto-expanding parent group when a submenu is opened, `Parent › Grandparent` trail chip on the dynamic route view, "Submenu Of" grid column with indentation + level/sub-item badges, new "All Levels / Top-Level Menus / Submenus" filter, hierarchy-aware Role-Menu Mapping labels, cycle-safe parent validation (no self or descendant nesting), orphan submenus promoted to top level on parent deletion, and a `parentId` LocalStorage migration guard.
- Created root `README.md` for overall repository navigation and feature catalog.
- Added `AGENTS.md` as the primary AI entry point and workspace rule guide.
- Created central documentation hub in `docs/`:
  - `docs/RULES.md`: Core development rules & JavaScript/CSS coding standards.
  - `docs/DESIGN.md`: UI/UX design system & dark mode guidelines.
  - `docs/HTML_STRUCTURE.md`: Semantic HTML5 & OpenGraph standards.
  - `docs/ARCHITECTURE.md`: Sub-project blueprint & file layout conventions.
  - `docs/CONTENT.md`: Copywriting & content guidelines.
  - `docs/COMMIT.md`: Git commit message rules.
  - `docs/CHANGELOG.md`: Workspace change log.
- Added CLI scaffolding scripts (`scripts/manage_md.py` & `scripts/manage-md.js`).
- Added `Motor Driving School Management System`: Complete client-side admin dashboard with 14 operational modules.
- Mobile UI Enhancements: Fixed modal dialog backdrop overflow, card button clipping, responsive header search input, and button flex-wrapping on small viewports (< 480px).
- Defined mandatory rule in `AGENTS.md` & `docs/ARCHITECTURE.md` requiring every completed sub-project to be registered in `mysite/index.html`.
- Updated `driving-school-management` to 100% align with the 24-table relational database architecture (Students, Instructors, Staff, Vehicles, Maintenance, Categories, Courses, Enrollments, Slots, Sessions, Attendance, Payments, Refunds, Tests, Test Criteria, Scores, Documents, Slot Bookings, Feedback, Notifications, Expenses, Holidays, Users, Audit Logs).
- Fixed search input placeholder text overlap and clipping under the `Ctrl + K` badge by adjusting right padding (72px), adding `text-overflow: ellipsis;`, and vertically centering the shortcut badge.
- Added `docs/MISTAKES.md`: Centralized mistake prevention guide and lessons learned log for AI agents and developers.
- Fixed modal cancel button responsiveness by exposing `window.closeModal` globally on `window` and adding `Escape` key listener.
- Made `Staff & Roles` module fully interactive with complete CRUD controls: Added `Add Staff Member` modal, `Edit Staff` modal, `Delete Staff` action, `Create User Login` modal, and `Enable/Disable User Account` toggles.
- Defined mandatory **No Automatic Git Push** policy in `AGENTS.md`, `docs/COMMIT.md`, and `docs/RULES.md`: Prohibits executing `git push` automatically without explicit user permission.
- **Mobile Responsiveness Overhaul (Phase 15+ QA)**:
  - Resolved mobile navigation drawer z-index inversion where backdrop rendered over drawer (`--z-backdrop: 150` vs `--z-sidebar: 200/250`).
  - Implemented strict zero horizontal page overflow on 320px/375px screens across all modules (Dashboard, Users, Roles, Permissions, Workflows, Leaves, Approvals, Audit Logs, Settings).
  - Compacted top header on `< 768px`: Hiding verbose user chip text, logout text, breadcrumb roots, and status pills.
  - Formulated Mistakes 8, 9, 10, 11 in `docs/MISTAKES.md` and added mandatory mobile-first rules to `docs/RULES.md` and `docs/DESIGN.md`.

