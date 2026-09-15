# 📏 Development & Coding Rules

This document outlines the coding standards, technical constraints, and best practices for developing applications within this repository.

---

## 1. Core Technical Constraints

- **Client-Side Processing**: All processing (image compression, conversions, generation, storage) MUST happen locally in the browser memory using HTML5 Canvas, Web Workers, FileReader, LocalStorage, or Web Crypto APIs.
- **Zero Heavy Dependencies**: Avoid importing large monolithic libraries (e.g. React, Angular, jQuery) for small utilities. Prefer modern Vanilla JS (ES6+).
- **Offline Reliability**: Applications should remain functional without continuous internet connectivity whenever possible.

---

## 2. JavaScript Coding Standards

- **Use Modern ES6+**: Use `const`/`let`, arrow functions, async/await, destructuring, modules, and template literals.
- **Scope Isolation**: Wrap script initialization in `document.addEventListener('DOMContentLoaded', ...)` or use IIFE/modules to avoid global namespace pollution.
- **Error Handling**: Use `try...catch` blocks around file reads, JSON parsing, API calls, and local storage access. Provide clear user notifications on errors.
- **LocalStorage Safety**: Always wrap `localStorage.getItem` and `localStorage.setItem` in try/catch to gracefully handle disabled cookies or quota exceeded exceptions.

```js
// Preferred pattern
document.addEventListener('DOMContentLoaded', () => {
  const initApp = () => {
    try {
      const savedData = localStorage.getItem('app_config');
      if (savedData) {
        // Parse safely
      }
    } catch (err) {
      console.warn('Storage unavailable:', err);
    }
  };

  initApp();
});
```

---

## 3. CSS & Layout Standards (MANDATORY Mobile Responsiveness)

- **Strict Zero Horizontal Overflow**: Every page MUST fit within `100vw` without any horizontal scrolling on the root `window` or `document.body`. Test explicitly against 320px and 375px (iPhone SE) viewports.
- **Global Shell Safety**: The root shell containers (`html, body, .app-container, .main-wrapper, .main-content`) MUST always specify `max-width: 100vw; overflow-x: hidden; width: 100%; box-sizing: border-box;`.
- **Navigation Drawer Z-Index Rule**: Off-canvas drawers MUST have a higher z-index than the backdrop overlay (e.g., Drawer: `z-index: 250`, Backdrop: `z-index: 150`). An inverted z-index (backdrop > drawer) creates an unusable blurred/blank screen.
- **Contained Table Scrolling**: NEVER let data tables widen the page. All data tables MUST be placed inside `.table-wrapper` or `.table-responsive` with `width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; display: block;`.
- **Flex Wrap Requirement**: Any container holding buttons, status pills, or filters MUST specify `flex-wrap: wrap;`. Never use hardcoded `min-width` exceeding 100% on inputs or filter blocks.
- **Header Mobile Compaction**: On screens `< 768px`, collapse top headers to compact icon buttons. Hide user profile names, role subtitles, and verbose logout text (`.user-chip-text, .logout-text, .breadcrumb-root, .header-badge { display: none !important; }`).
- **Touch Targets**: Buttons and interactive controls must have at least `34px` to `44px` touch targets on mobile devices.
- **CSS Custom Properties**: Define colors, fonts, shadows, and radii in `:root` CSS variables. Always provide dark theme compliance.

---

## 4. Performance & Memory Management

- **Canvas Memory**: When using HTML5 Canvas for image manipulation, release memory buffers or blob URLs (`URL.revokeObjectURL(url)`) when no longer needed.
- **Debouncing Inputs**: Debounce text input search handlers and range slider input events to prevent UI lag.

---

## 5. Git & Version Control Policy

- **No Automatic Git Push**: NEVER execute `git push` automatically without explicit user permission under ANY condition. Only push when the user explicitly instructs you to push to remote.
