# ⚠️ MISTAKES.md — Prevention Guide & Lessons Learned

This document serves as an explicit checklist of past UI, layout, CSS, and architectural mistakes discovered during development. All AI agents and developers operating in this repository MUST review and obey these rules to prevent repeating past bugs.

---

## 📋 Table of Common Mistakes & Prevention Rules

| # | Category | Mistake Description | Root Cause | Mandatory Prevention Rule |
|---|---|---|---|---|
| 1 | **Search Bars** | Placeholder text overlapping or clipping behind absolute badges (e.g. `Ctrl + K`). | Insufficient right padding on `<input>` and missing `text-overflow: ellipsis`. | Set `padding-right: 72px` (or badge width + 16px), `text-overflow: ellipsis; white-space: nowrap; overflow: hidden;` on inputs with floating badges. Keep placeholders concise. |
| 2 | **Modals** | Modal header/close icon scrolling off-screen on mobile devices. | Modal box missing fixed header/footer flex structure. | `.modal-box` MUST have `display: flex; flex-direction: column; max-height: calc(100vh - 24px); overflow: hidden;`. ONLY `.modal-body` gets `overflow-y: auto; flex: 1;`. |
| 3 | **Modal Buttons** | Side-by-side modal action buttons ("Cancel", "Save Student") clipping text on mobile (< 480px) e.g., `"Save Stude..."`. | Horizontal flex layout on small screens with `white-space: nowrap`. | Apply `@media (max-width: 480px)` to `.modal-footer` using `flex-direction: column-reverse; gap: 8px;`. Primary button expands to 100% width on top, secondary on bottom. |
| 4 | **CSS Grid** | Form controls or date inputs expanding parent container beyond 100% viewport width. | CSS Grid items defaulting to `min-width: auto;`. | Explicitly set `min-width: 0; max-width: 100%; box-sizing: border-box;` across `.form-grid`, `.form-group`, `.form-control`, `<input>`, `<select>`, and `<textarea>`. |
| 5 | **Header Layout** | Search bar or navigation controls overlapping user profile avatar or notification icon on tablet/mobile. | Missing `flex-shrink: 0;` on fixed width icons and unconstrained search bar. | Give `.global-search-container` a responsive max-width (`width: 360px; max-width: 100%;`) and apply `flex-shrink: 0;` to action buttons and user profile badges. |
| 6 | **Double Booking** | Booking same vehicle or instructor in multiple slots on the same date. | Missing validation guard before state mutation. | Always check existing active bookings (`vehicle_id` + `slot_id` + `booking_date` and `instructor_id` + `slot_id` + `booking_date`) before persisting slot reservations. |
| 7 | **Modal Cancel Button** | Cancel button or inline `onclick="window.closeModal()"` not responding when clicked inside modals. | `closeModal` function defined inside DOMContentLoaded scope without global `window` exposure. | MUST explicitly attach `window.closeModal = function() { UI.closeModal(); };` to `window` and bind `Escape` key event listener. |
| 8 | **Mobile Navigation** | Clicking hamburger menu causes screen to turn blank/dark/blurry and navigation links are unclickable. | Z-index inversion: `--z-backdrop` was higher than `--z-sidebar` (e.g. 300 > 200), causing the blurred overlay to render on top of the drawer. | Sidebar drawer z-index (`250`) MUST strictly exceed backdrop z-index (`150`). Re-enforce with `!important` in mobile media queries. |
| 9 | **Viewport Blowout** | Page clips horizontally on mobile screens (375px/320px); horizontal scrollbar appears on entire page. | Page header flex rows, status badges, and search bars with fixed `min-width: 260px` or missing `flex-wrap: wrap`. | Global shell (`html, body, .app-container, .main-wrapper, .main-content`) MUST have `max-width: 100vw; overflow-x: hidden;`. Stack header flex items vertically on `< 768px`. |
| 10 | **Table Clipping** | Tables expand parent card and stretch entire webpage horizontally on mobile devices. | Missing isolated horizontal scroll container on tables. | Wrap every table in `.table-wrapper` or `.table-responsive` with `width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; display: block;`. |
| 11 | **Header Overcrowding** | Top navigation bar with user chip, role, logout button, and online badge overflows on 375px/320px screens. | Unconstrained text elements in fixed-height top bar side-by-side. | On `< 768px`, hide `.user-chip-text`, `.logout-text`, `.breadcrumb-root`, and `.header-badge`. Convert avatar and logout to compact 34px icon circles. |

---

## 🔍 Detailed Analysis & Fix Guidelines

### 1. Global Search Input Badges (`Ctrl + K`)
- **Problem**: Floating badges inside `<input>` fields sit over text if padding is too small or placeholder string is long.
- **Rule**:
  ```css
  .search-input-wrapper input {
    width: 100%;
    padding: 8px 72px 8px 36px; /* 72px right padding guarantees badge clearance */
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .search-shortcut {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }
  ```

---

### 2. Mobile Modal Dialog Architecture (< 480px Viewports)
- **Problem**: Modals containing long forms scroll as a single block on mobile, causing the header title, close `&times;` button, and submit buttons to scroll out of view or clip horizontally.
- **Rule**:
  ```css
  .modal-box {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 24px);
    overflow: hidden;
  }

  .modal-header, .modal-footer {
    flex-shrink: 0;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
  }

  @media (max-width: 480px) {
    .modal-footer {
      flex-direction: column-reverse;
      gap: 8px;
    }
    .modal-footer .btn {
      width: 100%;
      justify-content: center;
    }
  }
  ```

---

### 3. Grid & Input Sizing Safeguards
- **Problem**: HTML `<input type="date">` or long select options widen grid containers beyond screen limits.
- **Rule**:
  ```css
  *, .form-grid, .form-group, .form-control, input, select, textarea {
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }
  ```

---

### 4. Mobile Navigation Drawer Z-Index Rule
- **Problem**: Opening mobile off-canvas drawer shows a dark blurry screen where links cannot be tapped because the backdrop covers the drawer.
- **Rule**:
  ```css
  /* Sidebar MUST be strictly higher than backdrop */
  :root {
    --z-backdrop: 150;
    --z-sidebar: 200;
  }
  @media (max-width: 1023px) {
    .sidebar {
      position: fixed !important;
      z-index: 250 !important; /* Always above backdrop */
    }
    .sidebar-backdrop {
      z-index: 150 !important;
    }
  }
  ```

---

### 5. Mobile Viewport Zero-Overflow Guarantee (320px / 375px)
- **Problem**: Page headers, badges, or search bars overflow on small screens, causing the document body to scroll horizontally.
- **Rule**:
  ```css
  /* Enforce zero horizontal page scrolling */
  html, body, .app-container, .main-wrapper, .main-content {
    max-width: 100vw !important;
    overflow-x: hidden !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  @media (max-width: 767px) {
    /* Stack page headers vertically */
    .page-header,
    [class*="-page"] > .flex:first-child {
      flex-direction: column !important;
      align-items: flex-start !important;
      width: 100% !important;
    }
    .page-actions,
    [class*="-page"] > .flex:first-child > div:last-child {
      width: 100% !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
    }
    /* Compact top header */
    .user-chip-text, .logout-text, .breadcrumb-root, .header-badge {
      display: none !important;
    }
    /* Contained table scroll */
    .table-wrapper, .table-responsive {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch !important;
      display: block !important;
    }
  }
  ```

---

## 🛠️ Protocol for Adding New Lessons Learned

Whenever a new UI bug, layout clipping, or logic mistake is identified and fixed:
1. Document the issue in **`docs/MISTAKES.md`** under the Table of Common Mistakes.
2. Add a clear code example or rule under *Detailed Analysis & Fix Guidelines*.
3. Log the update in **`docs/CHANGELOG.md`**.
