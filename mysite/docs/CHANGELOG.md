# 📋 Repository Change History & Changelog

All notable changes, updates, and additions to this workspace are documented in this file.

---

## [Unreleased] - 2026-09-01

### Added
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

