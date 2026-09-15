# 🎨 UI/UX Design & Theme Guidelines

This document defines the visual hierarchy, theme color palettes, typography, and UI component standards across all projects.

---

## 1. Color Palette & Dark Theme System

All applications in this repository prioritize a modern, sleek dark theme by default, using standard CSS variables:

```css
:root {
  --bg-primary: #0d1117;       /* Main page background */
  --bg-secondary: #161b22;     /* Card and panel background */
  --bg-tertiary: #21262d;      /* Hover states & input fields */
  --border-color: #30363d;     /* Subdued borders */
  --text-primary: #f0f6fc;     /* Primary headings and text */
  --text-secondary: #8b949e;   /* Muted captions and labels */
  --accent-cyan: #00f0ff;      /* Cyan highlight accent */
  --accent-teal: #2de2c4;      /* Teal primary button accent */
  --accent-purple: #8a2be2;    /* Purple secondary highlight */
  --danger-color: #f85149;     /* Error & delete buttons */
  --success-color: #3fb950;    /* Success notifications */
}
```

---

## 2. Typography

- **Primary Sans-Serif Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, `sans-serif`
- **Monospace Font**: `'JetBrains Mono'`, `'Fira Code'`, `Consolas`, `monospace` (for code, hashes, GUIDs, and numeric outputs).

---

## 3. Component Design Rules

### Buttons & Interactive Controls
- **Primary Buttons**: Vibrant background (`var(--accent-teal)` or gradient), bold text, clear hover transform or box-shadow glow.
- **Secondary Buttons**: Transparent background with border `1px solid var(--border-color)` and hover state.
- **Disabled State**: Opacity `0.5`, cursor `not-allowed`.

### Cards & Panels
- **Glassmorphism / Panel Style**: Slightly translucent dark panels (`#161b22`) with `1px solid #30363d` border and subtle rounded corners (`border-radius: 8px` to `12px`).
- **Paddings**: Mobile `16px`, Tablet/Desktop `24px` to `32px`.

---

## 4. Responsive Breakpoints & Mobile Adaptation Standards

```css
/* 1. Ultra-Small Mobile (320px - 375px iPhone SE) */
@media (max-width: 479px) {
  /* Buttons stretch full width in footers/dialogs */
  /* Sidebar drawer max-width 82vw */
  /* Single-column grid inputs */
}

/* 2. Standard Mobile & Small Tablets (< 768px) */
@media (max-width: 767px) {
  /* Page headers collapse from horizontal row to vertical column */
  /* Top header hides user chip text and verbose logout text */
  /* Tables scroll in isolated .table-wrapper without breaking 100vw */
  /* Filter toolbars stack search inputs and selects vertically */
}

/* 3. Tablet & Drawer Mode (< 1024px) */
@media (max-width: 1023px) {
  /* Fixed off-canvas sidebar: z-index 250 */
  /* Backdrop overlay: z-index 150 */
  /* Hamburger button visible */
}

/* 4. Desktop (>= 1024px) */
@media (min-width: 1024px) {
  /* Static persistent sidebar */
  /* Hamburger and backdrop hidden */
}
```

### Mobile Layout Checklist:
- **Zero Horizontal Scroll**: Root page width must never exceed device viewport.
- **Top Header Compaction**: Avatar circle + compact action buttons only; no multi-word labels.
- **Isolated Table Overflow**: Large tables must scroll independently inside `.table-wrapper` or `.table-responsive`.
- **Drawer Z-Index Rule**: Drawer (`250`) > Backdrop (`150`). Never invert.

