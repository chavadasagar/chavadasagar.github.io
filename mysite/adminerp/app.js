// AdminERP - HTML/CSS/JS + LocalStorage RBAC System
const DB_KEY = 'AdminERP_DB';
const SESSION_KEY = 'AdminERP_Session';
const THEME_KEY = 'AdminERP_Theme';

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  users: 'Users',
  roles: 'Access Control',
  departments: 'Department',
  categories: 'Category Tree',
  projects: 'Projects',
  documents: 'Documents',
  menus: 'Menu Builder',
  announcements: 'Announcements',
  audit: 'Audit Trail'
};

function applyTheme(theme) {
  theme = (theme === 'light') ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  localStorage.setItem(THEME_KEY, theme);
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      if (db && typeof db === 'object') {
        db.theme = theme;
        localStorage.setItem(DB_KEY, JSON.stringify(db));
      }
    }
  } catch (_) {}
}

function initTheme() {
  let saved = localStorage.getItem(THEME_KEY);
  if (!saved) {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const db = JSON.parse(raw);
        if (db && db.theme) saved = db.theme;
      }
    } catch (_) {}
  }
  applyTheme(saved || 'dark');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  toast(`Switched to ${next} theme`);
}

const MODULES = [
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'departments', label: 'Department' },
  { key: 'categories', label: 'Category' },
  { key: 'projects', label: 'Project' },
  { key: 'documents', label: 'Document' },
  { key: 'menus', label: 'Menus' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'audit', label: 'Audit' },
  { key: 'backup', label: 'Backup & Restore' }
];
const PERMS = ['read', 'add', 'update', 'delete'];

const $ = (id) => document.getElementById(id);
const escapeHtml = (str) => String(str ?? '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
// ---------- OFFLINE SVG ICON REGISTRY ----------
const OFFLINE_SVGS = {
  // Navigation & General
  'compass': '<svg class="erp-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor"/></svg>',
  'globe': '<svg class="erp-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  'bolt': '<svg class="erp-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/></svg>',
  'link': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  'external': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  'bars': '<svg class="erp-svg" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  'star': '<svg class="erp-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  'rocket': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
  'calendar': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  'bullseye': '<svg class="erp-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  'map-pin': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  'chevron-right': '<svg class="erp-svg" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',

  // Analytics & Reports
  'chart-line': '<svg class="erp-svg" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  'chart-pie': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
  'chart-column': '<svg class="erp-svg" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  'chart-area': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M19 9l-5 5-4-4-7 7v-5l7-7 4 4 5-5z"/></svg>',
  'gauge': '<svg class="erp-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 12 16 8"/></svg>',

  // Business & Finance
  'briefcase': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  'building': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22.01"/><line x1="15" y1="22" x2="15" y2="22.01"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/></svg>',
  'wallet': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M20 7h-7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 13h.01"/><path d="M4 18V6a2 2 0 0 1 2-2h14"/></svg>',
  'credit-card': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  'receipt': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="14" y2="14"/></svg>',
  'cart': '<svg class="erp-svg" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  'tag': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  'box': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  'truck': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',

  // Security & Users
  'users': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  'user': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  'shield': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  'key': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l1.5 1.5L10 13l-1.5-1.5L7 13l1.5 1.5L6 17H3v4h4v-3l1.5-1.5L10 18l1.5-1.5L13 18l3-3 4.5-4.5a3 3 0 1 0-4.24-4.24z"/></svg>',
  'lock': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',

  // Content & Files
  'folder': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  'file': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
  'database': '<svg class="erp-svg" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  'server': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',

  // Operations & Comms
  'gear': '<svg class="erp-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  'wrench': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  'bell': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  'envelope': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  'headset': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  'clock': '<svg class="erp-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  'cloud': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
  'calculator': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/></svg>',
  'clipboard': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
  'book': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  'money': '<svg class="erp-svg" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>',
  'dollar': '<svg class="erp-svg" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  'fingerprint': '<svg class="erp-svg" viewBox="0 0 24 24"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/><path d="M14 13.1v2.3"/><path d="M18 11a4 4 0 0 0-4-4"/><path d="M11 17.5v-3.6a2.5 2.5 0 0 1 5 0V17"/></svg>',
  'terminal': '<svg class="erp-svg" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  'sliders': '<svg class="erp-svg" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
  'layers': '<svg class="erp-svg" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
};

function normalizeIconKey(icon) {
  if (!icon) return 'compass';
  let str = String(icon).trim();
  str = str.replace(/^fa-[a-z0-9-]+\s+fa-/, '').replace(/^fa-/, '').toLowerCase();
  const aliasMap = {
    'chart-pie': 'chart-pie',
    'chart-bar': 'chart-column',
    'chart-column': 'chart-column',
    'magnifying-glass-chart': 'chart-area',
    'arrow-trend-up': 'chart-line',
    'gauge-high': 'gauge',
    'speedometer': 'gauge',
    'money-bill-wave': 'money',
    'sack-dollar': 'dollar',
    'file-invoice-dollar': 'receipt',
    'store': 'cart',
    'cart-shopping': 'cart',
    'boxes-stacked': 'box',
    'box-archive': 'box',
    'truck-fast': 'truck',
    'user-tie': 'user',
    'user-shield': 'shield',
    'shield-halved': 'shield',
    'user-group': 'users',
    'address-card': 'user',
    'file-lines': 'file',
    'folder-tree': 'folder',
    'clipboard-list': 'clipboard',
    'tags': 'tag',
    'gears': 'gear',
    'settings': 'gear',
    'network-wired': 'server',
    'comments': 'headset',
    'phone': 'headset',
    'bullhorn': 'bell',
    'calendar-days': 'calendar',
    'map-location-dot': 'compass',
    'layer-group': 'layers',
    'clock-rotate-left': 'clock',
    'arrow-up-right-from-square': 'external',
    'angle-right': 'chevron-right',
    'caret-right': 'chevron-right',
    'chevron-down': 'chevron-right',
    'angle-down': 'chevron-right',
    'list-tree': 'layers'
  };
  return aliasMap[str] || str;
}

const renderIcon = (icon, defaultIcon = 'compass') => {
  if (!icon) icon = defaultIcon;
  const s = String(icon).trim();
  const key = normalizeIconKey(s);

  if (OFFLINE_SVGS[key]) {
    return `<span class="erp-icon svg-icon">${OFFLINE_SVGS[key]}</span>`;
  }

  // If emoji or plain symbol
  if (!s.startsWith('fa-') && s.length <= 4) {
    return `<span class="erp-icon emoji">${escapeHtml(s)}</span>`;
  }

  // Fallback to compass SVG
  return `<span class="erp-icon svg-icon">${OFFLINE_SVGS['compass']}</span>`;
};
const uid = (p) => p + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1000);

// ---------- SWEETALERT HELPERS (fallback to native if CDN offline) ----------
function showAlert(msg, icon) {
  if (window.Swal) return Swal.fire({ icon: icon || 'warning', text: msg, confirmButtonColor: '#6c63ff' });
  alert(msg);
}
function askConfirm(text, confirmText) {
  if (window.Swal) {
    return Swal.fire({
      title: 'Are you sure?',
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151',
      confirmButtonText: confirmText || 'Yes, delete',
      cancelButtonText: 'Cancel',
      focusCancel: true
    }).then(r => r.isConfirmed);
  }
  return Promise.resolve(confirm(text));
}
function toast(msg, type = 'success') {
  if (window.Swal) {
    const isErr = (type === 'error' || type === 'danger');
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: isErr ? 'error' : (type === 'warning' ? 'warning' : (type === 'info' ? 'info' : 'success')),
      title: msg,
      showConfirmButton: false,
      timer: isErr ? 5000 : 2500,
      timerProgressBar: true
    });
  }
}

// ---------- DB ----------
function fullPerms() {
  const o = {};
  MODULES.forEach(m => o[m.key] = { read: true, add: true, update: true, delete: true });
  return o;
}
function emptyPerms() {
  const o = {};
  MODULES.forEach(m => o[m.key] = { read: false, add: false, update: false, delete: false });
  return o;
}
function seedDB() {
  const defaultMenus = [
    {
      id: 'menu_analytics',
      title: 'Analytics & BI',
      icon: 'fa-solid fa-chart-line',
      route: 'analytics',
      targetType: 'internal',
      order: 1,
      roleIds: [],
      status: 'active',
      description: 'Interactive business intelligence and reporting workspace'
    },
    {
      id: 'menu_helpdesk',
      title: 'Support Portal',
      icon: 'fa-solid fa-headset',
      route: 'https://support.example.com',
      targetType: 'external',
      order: 2,
      roleIds: [],
      status: 'active',
      description: 'External customer support ticket and knowledgebase portal'
    }
  ];

  if (!localStorage.getItem(DB_KEY)) {
    const db = {
      departments: [{ id: 'd1', name: 'Admin' }],
      roles: [{ id: 'r1', name: 'Admin', permissions: fullPerms() }],
      users: [{ id: 'u1', username: 'admin', password: 'admin', departmentId: 'd1', roleId: 'r1' }],
      categories: [],
      projects: [],
      documents: [],
      menus: defaultMenus,
      announcements: [
        {
          id: 'ann_welcome',
          title: 'Welcome to AdminERP Enterprise',
          description: 'System-wide announcement marquee ticker is now live. Administrators can schedule announcements with custom start and expiry dates.',
          type: 'info',
          startDateTime: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
          expiryDateTime: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
          status: 'active',
          createdBy: 'admin',
          createdAt: new Date().toISOString()
        }
      ],
      theme: localStorage.getItem(THEME_KEY) || 'dark'
    };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return;
  }
  // Migration: add new modules/fields to previously saved DB
  const db = JSON.parse(localStorage.getItem(DB_KEY));
  let changed = false;
  if (!Array.isArray(db.categories)) { db.categories = []; changed = true; }
  if (!Array.isArray(db.projects)) { db.projects = []; changed = true; }
  if (!Array.isArray(db.documents)) { db.documents = []; changed = true; }
  if (!Array.isArray(db.menus)) { db.menus = defaultMenus; changed = true; }
  if (!Array.isArray(db.announcements)) {
    db.announcements = [
      {
        id: 'ann_welcome',
        title: 'Welcome to AdminERP Enterprise',
        description: 'System-wide announcement marquee ticker is now live. Administrators can schedule announcements with custom start and expiry dates.',
        type: 'info',
        startDateTime: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
        expiryDateTime: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
        status: 'active',
        createdBy: 'admin',
        createdAt: new Date().toISOString()
      }
    ];
    changed = true;
  }
  (db.menus || []).forEach(m => {
    if (m.id === 'menu_analytics' && (m.icon === '📊' || !m.icon)) { m.icon = 'fa-solid fa-chart-line'; changed = true; }
    if (m.id === 'menu_helpdesk' && (m.icon === '🌐' || !m.icon)) { m.icon = 'fa-solid fa-headset'; changed = true; }
    // Submenu support: every menu is either a root item (parentId '') or a nested submenu
    if (typeof m.parentId !== 'string') { m.parentId = ''; changed = true; }
  });
  // Migration safety: drop parent references pointing at missing menus or creating cycles
  (db.menus || []).forEach(m => {
    if (!m.parentId) return;
    if (!db.menus.some(x => x.id === m.parentId) || m.parentId === m.id) {
      m.parentId = '';
      changed = true;
    }
  });
  // Cycle guard: only break the link when walking up from this menu revisits a node.
  // (Checking "parentId is one of the ancestors" would wrongly clear every submenu.)
  (db.menus || []).forEach(m => {
    if (!m.parentId) return;
    if (menuChainHasCycle(db.menus, m.id)) {
      m.parentId = '';
      changed = true;
    }
  });
  // Role inheritance migration: submenus no longer hold their own role list.
  // Any legacy roleIds on a submenu are merged up into its top-level parent so the
  // effective visibility of that submenu stays exactly the same after the upgrade.
  (db.menus || []).forEach(m => {
    if (!m.parentId) return;
    if (!Array.isArray(m.roleIds) || m.roleIds.length === 0) return;
    const root = (db.menus || []).find(x => x.id === getMenuRootId({ menus: db.menus }, m.id));
    if (root) {
      if (!Array.isArray(root.roleIds)) root.roleIds = [];
      m.roleIds.forEach(rid => { if (!root.roleIds.includes(rid)) root.roleIds.push(rid); });
    }
    m.roleIds = [];
    changed = true;
  });
  if (!Array.isArray(db.audit)) { db.audit = []; changed = true; }
  if (!db.stats || typeof db.stats !== 'object') { db.stats = {}; changed = true; }
  (db.roles || []).forEach(r => {
    if (!r.permissions) { r.permissions = emptyPerms(); changed = true; }
    MODULES.forEach(m => {
      if (!r.permissions[m.key]) {
        r.permissions[m.key] = (r.name === 'Admin')
          ? { read: true, add: true, update: true, delete: true }
          : { read: false, add: false, update: false, delete: false };
        changed = true;
      }
    });
  });
  (db.documents || []).forEach(d => {
    if (!Array.isArray(d.versions)) {
      d.versions = d.fileData ? [{
        v: 1, fileName: d.fileName || 'file', fileData: d.fileData,
        fileType: d.fileType || '', uploadedAt: d.createdAt || new Date().toISOString()
      }] : [];
      d.currentVersion = d.versions.length ? 1 : 0;
      changed = true;
    }
    if (typeof d.currentVersion !== 'number') {
      d.currentVersion = d.versions.length ? d.versions[d.versions.length - 1].v : 0;
      changed = true;
    }
  });
  if (!db.theme) {
    db.theme = localStorage.getItem(THEME_KEY) || 'dark';
    changed = true;
  }
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(db));
}
function loadDB() { return JSON.parse(localStorage.getItem(DB_KEY)); }
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

// ---------- AUTH ----------
function currentUser() {
  const db = loadDB();
  const sid = localStorage.getItem(SESSION_KEY);
  if (!sid) return null;
  return db.users.find(u => u.id === sid) || null;
}
function currentRole() {
  const db = loadDB();
  const u = currentUser();
  if (!u) return null;
  return db.roles.find(r => r.id === u.roleId) || null;
}
function hasPerm(module, action) {
  const role = currentRole();
  if (!role) return false;
  if (role.name === 'Admin') return true; // super admin
  return !!(role.permissions && role.permissions[module] && role.permissions[module][action]);
}

// ---------- PERSISTENT ROUTING & LAST NAVIGATED STATE ----------
const LAST_NAV_KEY = 'adminerp_last_nav';
const DRAFT_PREFIX = 'AdminERP_Draft_';

function saveLastNav(state) {
  try {
    localStorage.setItem(LAST_NAV_KEY, JSON.stringify(state));
  } catch (_) {}
}

function getLastNav() {
  try {
    const raw = localStorage.getItem(LAST_NAV_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function saveFormDraft(formId) {
  const form = $(formId);
  if (!form) return;
  try {
    const data = {};
    const elements = form.querySelectorAll('input, select, textarea');
    elements.forEach(el => {
      const key = el.id || el.name;
      if (!key) return;
      if (el.type === 'checkbox') {
        if (el.dataset.module && el.dataset.perm) {
          if (!data._perms) data._perms = {};
          if (!data._perms[el.dataset.module]) data._perms[el.dataset.module] = {};
          data._perms[el.dataset.module][el.dataset.perm] = el.checked;
        } else if (el.dataset.roleId) {
          if (!data._roles) data._roles = [];
          if (el.checked) data._roles.push(el.dataset.roleId);
        } else if (el.closest && el.closest('#projCatBox')) {
          if (!data._projCats) data._projCats = [];
          if (el.checked) data._projCats.push(el.value);
        } else {
          data[key] = el.checked;
        }
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[key] = el.value;
      }
    });
    localStorage.setItem(DRAFT_PREFIX + formId, JSON.stringify(data));
  } catch (_) {}
}

function restoreFormDraft(formId) {
  const form = $(formId);
  if (!form) return false;
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + formId);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;

    let hasData = false;
    const elements = form.querySelectorAll('input, select, textarea');
    elements.forEach(el => {
      const key = el.id || el.name;
      if (!key) return;
      if (el.type === 'checkbox') {
        // Handled specially
      } else if (el.type === 'radio') {
        if (data[el.name] && el.value === data[el.name]) {
          el.checked = true;
          hasData = true;
        }
      } else if (data[key] !== undefined && data[key] !== '') {
        el.value = data[key];
        hasData = true;
      }
    });

    if (data._perms && formId === 'roleForm' && typeof renderPermMatrix === 'function') {
      renderPermMatrix(data._perms);
      hasData = true;
    }
    if (data._projCats && formId === 'projForm') {
      data._projCats.forEach(cid => {
        const cb = form.querySelector(`#projCatBox input[value="${cid}"]`);
        if (cb) cb.checked = true;
      });
      if (typeof updateProjCatTags === 'function') updateProjCatTags();
      hasData = true;
    }

    if (formId === 'userForm' && typeof updateLiveUserPreview === 'function') updateLiveUserPreview();
    if (formId === 'deptForm' && typeof updateLiveDeptPreview === 'function') updateLiveDeptPreview();
    if (formId === 'projForm' && typeof updateProjDescCount === 'function') updateProjDescCount();
    if (formId === 'userForm' && typeof updateLiveUserPreview === 'function') updateLiveUserPreview();
    if (formId === 'deptForm' && typeof updateLiveDeptPreview === 'function') updateLiveDeptPreview();
    if (formId === 'projForm' && typeof updateProjDescCount === 'function') updateProjDescCount();
    if (formId === 'menuForm' && typeof updateLiveMenuPreview === 'function') updateLiveMenuPreview();
    if (formId === 'annForm' && typeof updateLiveAnnouncementPreview === 'function') updateLiveAnnouncementPreview();

    return hasData;
  } catch (_) {
    return false;
  }
}

function clearFormDraft(formId) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + formId);
  } catch (_) {}
}

window.saveFormDraft = saveFormDraft;
window.restoreFormDraft = restoreFormDraft;
window.clearFormDraft = clearFormDraft;

function canAccessPage(name) {
  if (name === 'dashboard') return true;
  if (['users', 'roles', 'departments', 'categories', 'projects', 'documents', 'menus', 'announcements', 'audit'].includes(name)) {
    return hasPerm(name, 'read');
  }
  return !!$('page-' + name);
}

function canAccessDynamicMenu(menuId) {
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === menuId);
  if (!m || m.status !== 'active') return false;
  // Submenus inherit the role access of their top-level parent
  const roleIds = getEffectiveRoleIds(db, menuId);
  if (roleIds.length === 0) return true;
  const role = currentRole();
  if (role && role.name === 'Admin') return true;
  return !!(role && roleIds.includes(role.id));
}

function restoreLastPage() {
  const hash = (window.location.hash || '').replace(/^#/, '').trim();
  const lastNav = getLastNav();

  function openModuleForm(mod, mode, editId, parentId) {
    if (!canAccessPage(mod)) {
      goPage('dashboard');
      return;
    }
    goPage(mod, 'form');
    if (mode === 'edit' && editId) {
      if (mod === 'users' && typeof editUser === 'function') editUser(editId);
      else if (mod === 'roles' && typeof editRole === 'function') editRole(editId);
      else if (mod === 'departments' && typeof editDept === 'function') editDept(editId);
      else if (mod === 'categories' && typeof editCat === 'function') editCat(editId);
      else if (mod === 'projects' && typeof editProj === 'function') editProj(editId);
      else if (mod === 'documents' && typeof editDoc === 'function') editDoc(editId);
      else if (mod === 'menus' && typeof editMenu === 'function') editMenu(editId);
      else if (mod === 'announcements' && typeof editAnnouncement === 'function') editAnnouncement(editId);
    } else {
      if (mod === 'users' && typeof openCreateUser === 'function') openCreateUser();
      else if (mod === 'roles' && typeof openCreateRole === 'function') openCreateRole();
      else if (mod === 'departments' && typeof openCreateDept === 'function') openCreateDept();
      else if (mod === 'categories' && typeof openCreateCat === 'function') openCreateCat(parentId);
      else if (mod === 'projects' && typeof openCreateProj === 'function') openCreateProj();
      else if (mod === 'documents' && typeof openCreateDoc === 'function') openCreateDoc();
      else if (mod === 'menus' && typeof openCreateMenu === 'function') openCreateMenu();
      else if (mod === 'announcements' && typeof openCreateAnnouncement === 'function') openCreateAnnouncement();
    }
  }

  // 1. URL Hash routing
  if (hash) {
    if (hash.startsWith('dynamic-')) {
      const dynId = hash.replace(/^dynamic-/, '');
      if (canAccessDynamicMenu(dynId)) {
        openDynamicPage(dynId);
        return;
      }
    } else if (hash === 'menus-mapping') {
      if (canAccessPage('menus')) {
        goPage('menus');
        if (typeof window.switchMenuSubTab === 'function') window.switchMenuSubTab('mapping');
        return;
      }
    } else if (hash.endsWith('-add')) {
      const mod = hash.replace(/-add$/, '');
      if (['users', 'roles', 'departments', 'categories', 'projects', 'documents', 'menus', 'announcements'].includes(mod)) {
        openModuleForm(mod, 'add', null, lastNav ? lastNav.parentId : null);
        return;
      }
    } else if (hash.includes('-edit-')) {
      const parts = hash.split('-edit-');
      const mod = parts[0];
      const editId = parts[1];
      if (['users', 'roles', 'departments', 'categories', 'projects', 'documents', 'menus', 'announcements'].includes(mod) && editId) {
        openModuleForm(mod, 'edit', editId);
        return;
      }
    } else if ($('page-' + hash)) {
      if (canAccessPage(hash)) {
        if (lastNav && lastNav.page === hash && lastNav.view === 'form') {
          openModuleForm(hash, lastNav.mode || 'add', lastNav.editId, lastNav.parentId);
          return;
        }
        goPage(hash);
        return;
      }
    }
  }

  // 2. localStorage lastNav fallback
  if (lastNav) {
    if (lastNav.type === 'dynamic' && lastNav.menuId) {
      if (canAccessDynamicMenu(lastNav.menuId)) {
        openDynamicPage(lastNav.menuId);
        return;
      }
    } else if (lastNav.type === 'page' && lastNav.page && $('page-' + lastNav.page)) {
      if (canAccessPage(lastNav.page)) {
        if (lastNav.view === 'form') {
          openModuleForm(lastNav.page, lastNav.mode || 'add', lastNav.editId, lastNav.parentId);
          return;
        }
        goPage(lastNav.page);
        if (lastNav.page === 'menus' && lastNav.subTab === 'mapping') {
          if (typeof window.switchMenuSubTab === 'function') window.switchMenuSubTab('mapping');
        }
        return;
      }
    }
  }

  goPage('dashboard');
}

// ---------- NAV ----------
function showApp() {
  $('loginScreen').classList.add('hidden');
  $('appScreen').classList.remove('hidden');
  const u = currentUser(), r = currentRole();
  $('loggedUser').textContent = u ? u.username : '';
  $('loggedRole').textContent = r ? r.name : '';
  $('avatarLetter').textContent = (u ? u.username : 'A')[0].toUpperCase();
  $('topAvatar').textContent = (u ? u.username : 'A')[0].toUpperCase();
  $('topUserName').textContent = u ? u.username : '';
  renderSidebar();
  renderAll();
  restoreLastPage();
}
function showLogin() {
  $('appScreen').classList.add('hidden');
  $('loginScreen').classList.remove('hidden');
  $('loginError').classList.add('hidden');
}
function doLogout() {
  const u = currentUser();
  if (u) logAudit('Auth', 'logout', u.username, 'Signed in', 'Signed out');
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LAST_NAV_KEY);
  try { history.replaceState(null, '', window.location.pathname); } catch (_) {}
  showLogin();
}

// ---------- USER PROFILE ----------
function openProfile() {
  const u = currentUser(), r = currentRole();
  if (!u) return;
  $('profileAvatar').textContent = (u.username || 'A')[0].toUpperCase();
  $('profileName').textContent = u.username;
  $('profileRole').textContent = r ? r.name : '-';
  const perms = r && r.permissions ? MODULES.map(m => {
    const p = r.permissions[m.key] || {};
    const on = PERMS.filter(k => p[k]);
    return `<div><b>${m.label}:</b> ${on.length ? on.join(', ') : '—'}</div>`;
  }).join('') : '';
  $('profileBody').innerHTML =
    `<table><tbody>` +
    `<tr><th>Username</th><td>${u.username}</td></tr>` +
    `<tr><th>Password</th><td>••••••</td></tr>` +
    `<tr><th>Department</th><td>${deptName(u.departmentId)}</td></tr>` +
    `<tr><th>Role</th><td>${r ? r.name : '-'}</td></tr>` +
    `</tbody></table>` +
    `<h4 class="mt">My Permissions</h4><div class="profile-perms">${perms || '—'}</div>`;
  $('profileModal').classList.remove('hidden');
}
function closeProfile() { $('profileModal').classList.add('hidden'); }
function openChangePassword() {
  const me = currentUser();
  if (!me) return showAlert('Please login again', 'error');
  if (!window.Swal) { // offline fallback
    const cur = prompt('Current password:');
    if (cur !== currentUser().password) return showAlert('Current password is incorrect', 'error');
    const nw = prompt('New password (min 4 characters):');
    if (!nw || nw.length < 4) return showAlert('New password must be at least 4 characters', 'error');
    if (prompt('Confirm new password:') !== nw) return showAlert('New passwords do not match', 'error');
    const db0 = loadDB();
    db0.users.find(x => x.id === me.id).password = nw;
    saveDB(db0);
    logAudit('Users', 'update', me.username, 'Password change requested', 'Password changed');
    renderUsers(); renderAudit();
    return toast('Password updated');
  }
  Swal.fire({
    title: 'Change Password',
    html: '<input type="password" id="swCur" class="swal2-input" placeholder="Current password" autocomplete="current-password">' +
      '<input type="password" id="swNew" class="swal2-input" placeholder="New password (min 4 characters)" autocomplete="new-password">' +
      '<input type="password" id="swConf" class="swal2-input" placeholder="Confirm new password" autocomplete="new-password">',
    focusConfirm: false, showCancelButton: true,
    confirmButtonText: 'Update', confirmButtonColor: '#1e3a8a',
    preConfirm: () => {
      const fresh = currentUser();
      const cur = document.getElementById('swCur').value;
      const nw = document.getElementById('swNew').value;
      const cf = document.getElementById('swConf').value;
      if (!fresh) { Swal.showValidationMessage('Session expired. Please login again.'); return false; }
      if (cur !== fresh.password) { Swal.showValidationMessage('Current password is incorrect'); return false; }
      if (!nw || nw.length < 4) { Swal.showValidationMessage('New password must be at least 4 characters'); return false; }
      if (nw !== cf) { Swal.showValidationMessage('New passwords do not match'); return false; }
      return { nw };
    }
  }).then(res => {
    if (!res.isConfirmed) return;
    const meNow = currentUser();
    if (!meNow) return;
    const db = loadDB();
    db.users.find(x => x.id === meNow.id).password = res.value.nw;
    saveDB(db);
    logAudit('Users', 'update', meNow.username, 'Password change requested', 'Password changed');
    renderUsers(); renderAudit();
    toast('Password updated');
  });
}

// ---------- CTRL+K COMMAND PALETTE ----------
const CMD_ITEMS = [
  { label: 'Dashboard', hint: 'Alt+1', page: 'dashboard', module: null },
  { label: 'Users', hint: 'Alt+2', page: 'users', module: 'users' },
  { label: 'Roles', hint: 'Alt+3', page: 'roles', module: 'roles' },
  { label: 'Department', hint: 'Alt+4', page: 'departments', module: 'departments' },
  { label: 'Category', hint: 'Alt+5', page: 'categories', module: 'categories' },
  { label: 'Project', hint: 'Alt+6', page: 'projects', module: 'projects' },
  { label: 'Document', hint: 'Alt+7', page: 'documents', module: 'documents' },
  { label: 'Audit Log', hint: 'Alt+8', page: 'audit', module: 'audit' },
  { label: 'Menu Builder', hint: 'Alt+9', page: 'menus', module: 'menus' },
  { label: 'Announcements', hint: 'Alt+0', page: 'announcements', module: 'announcements' },
  { label: 'Backup & Restore Data (JSON Export/Import)', hint: 'Backup', action: 'backup' },
  { label: 'New entry (open Add form)', hint: 'Ctrl+Shift+O', action: 'new' },
  { label: 'Cancel editing', hint: 'Esc', action: 'cancel' },
  { label: 'My Profile', hint: 'Profile', action: 'profile' },
  { label: 'Change Password', hint: 'Profile', action: 'password' },
  { label: 'Logout', hint: 'Ctrl+Shift+L', action: 'logout' },
];
let cmdActiveIdx = 0;

function cmdVisibleGroups() {
  const q = ($('cmdInput') && $('cmdInput').value || '').toLowerCase().trim();
  const db = loadDB();
  const groups = [];

  // 1. Navigation & Commands
  const cmds = CMD_ITEMS.filter(it => {
    if (it.module && !hasPerm(it.module, 'read')) return false;
    return !q || it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q);
  });
  if (cmds.length) groups.push({ title: 'Pages & Commands', items: cmds });

  if (q) {
    // 2. Users
    if (hasPerm('users', 'read')) {
      const users = (db.users || []).filter(u => u.username.toLowerCase().includes(q)).slice(0, 5).map(u => ({
        label: u.username,
        hint: deptName(u.departmentId) + ' • ' + roleName(u.roleId),
        avatar: '👤',
        action: 'viewUser',
        id: u.id
      }));
      if (users.length) groups.push({ title: 'Users', items: users });
    }

    // 3. Roles
    if (hasPerm('roles', 'read')) {
      const roles = (db.roles || []).filter(r => r.name.toLowerCase().includes(q)).slice(0, 5).map(r => ({
        label: r.name,
        hint: (r.name === 'Admin' ? 'System' : 'Custom'),
        avatar: '🛡️',
        action: 'viewRole',
        id: r.id
      }));
      if (roles.length) groups.push({ title: 'Roles', items: roles });
    }

    // 4. Departments
    if (hasPerm('departments', 'read')) {
      const depts = (db.departments || []).filter(d => d.name.toLowerCase().includes(q)).slice(0, 5).map(d => ({
        label: d.name,
        hint: d.head ? `Head: ${d.head}` : 'Department',
        avatar: '🏢',
        action: 'viewDept',
        id: d.id
      }));
      if (depts.length) groups.push({ title: 'Departments', items: depts });
    }

    // 5. Projects
    if (hasPerm('projects', 'read')) {
      const projs = (db.projects || []).filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)).slice(0, 5).map(p => ({
        label: p.name,
        hint: p.description ? (p.description.length > 30 ? p.description.slice(0, 30) + '...' : p.description) : 'Project',
        avatar: '📁',
        action: 'viewProj',
        id: p.id
      }));
      if (projs.length) groups.push({ title: 'Projects', items: projs });
    }

    // 6. Documents
    if (hasPerm('documents', 'read')) {
      const docs = (db.documents || []).filter(d => (d.title || '').toLowerCase().includes(q)).slice(0, 5).map(d => ({
        label: d.title,
        hint: d.fileName || 'Document',
        avatar: '📄',
        action: 'viewDoc',
        id: d.id
      }));
      if (docs.length) groups.push({ title: 'Documents', items: docs });
    }

    // 7. Announcements
    if (hasPerm('announcements', 'read')) {
      const anns = (db.announcements || []).filter(a => (a.title || '').toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q)).slice(0, 5).map(a => ({
        label: a.title,
        hint: `[${(a.type || 'info').toUpperCase()}] ${a.status === 'active' ? 'Broadcast' : 'Inactive'}`,
        avatar: '📢',
        action: 'viewAnnouncement',
        id: a.id
      }));
      if (anns.length) groups.push({ title: 'Announcements', items: anns });
    }
  }

  return groups;
}

function cmdFlatItems() {
  const groups = cmdVisibleGroups();
  const list = [];
  groups.forEach(g => {
    g.items.forEach(it => list.push(it));
  });
  return list;
}

function cmdVisibleItems() {
  return cmdFlatItems();
}

function renderCmdList() {
  const groups = cmdVisibleGroups();
  const flat = cmdFlatItems();
  if (cmdActiveIdx >= flat.length) cmdActiveIdx = 0;

  if (!flat.length) {
    $('cmdList').innerHTML = '<div class="cmd-empty">No results found for search</div>';
    return;
  }

  let curIdx = 0;
  $('cmdList').innerHTML = groups.map(g => {
    const itemsHtml = g.items.map(it => {
      const myIdx = curIdx++;
      const isActive = (myIdx === cmdActiveIdx);
      const avatarHtml = it.avatar ? `<span class="cmd-item-avatar">${it.avatar}</span>` : '';
      return `<div class="cmd-item ${isActive ? 'active' : ''}" data-idx="${myIdx}">
        <div style="display:flex;align-items:center;min-width:0;">
          ${avatarHtml}
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(it.label)}</span>
        </div>
        <span class="hint">${escapeHtml(it.hint || '')}</span>
      </div>`;
    }).join('');

    return `<div class="cmd-group-header">${escapeHtml(g.title)}</div>${itemsHtml}`;
  }).join('');

  document.querySelectorAll('.cmd-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx, 10);
      runCmdItem(flat[idx]);
    });
  });
}

function openCmdPalette() {
  $('cmdPalette').classList.remove('hidden');
  $('cmdInput').value = ''; cmdActiveIdx = 0;
  renderCmdList();
  setTimeout(() => $('cmdInput').focus(), 0);
}
function closeCmdPalette() { $('cmdPalette').classList.add('hidden'); }

function triggerActiveModuleAdd() {
  const active = document.querySelector('.page:not(.hidden)');
  if (!active) return;
  const mod = active.id.replace('page-', '');

  const createActions = {
    users: () => openCreateUser(),
    roles: () => openCreateRole(),
    departments: () => openCreateDept(),
    categories: () => openCreateCat(),
    projects: () => openCreateProj(),
    documents: () => openCreateDoc(),
    menus: () => openCreateMenu(),
    announcements: () => openCreateAnnouncement()
  };

  if (createActions[mod]) {
    if (!hasPerm(mod, 'add')) {
      return showAlert(`You do not have permission to add new ${PAGE_LABELS[mod] || mod} records`, 'warning');
    }
    createActions[mod]();
  } else {
    toast(`No creation form on ${PAGE_LABELS[mod] || mod} page`, 'info');
  }
}
window.triggerActiveModuleAdd = triggerActiveModuleAdd;

function runCmdItem(it) {
  if (!it) return;
  closeCmdPalette();
  if (it.page) goPage(it.page);
  else if (it.action === 'backup') openBackupModal();
  else if (it.action === 'logout') doLogout();
  else if (it.action === 'profile') openProfile();
  else if (it.action === 'password') openChangePassword();
  else if (it.action === 'viewUser') { viewUser(it.id); }
  else if (it.action === 'viewRole') { viewRole(it.id); }
  else if (it.action === 'viewDept') { viewDept(it.id); }
  else if (it.action === 'viewProj') { viewProj(it.id); }
  else if (it.action === 'viewDoc') { viewDoc(it.id); }
  else if (it.action === 'viewAnnouncement') { viewAnnouncement(it.id); }
  else if (it.action === 'new') {
    triggerActiveModuleAdd();
  }
  else if (it.action === 'cancel') {
    const active = document.querySelector('.page:not(.hidden)');
    if (active) {
      const mod = active.id.replace('page-', '');
      setModuleView(mod, 'list');
    }
  }
}
function setModuleView(module, viewName) {
  const listEl = $(module + '-list-view');
  const formEl = $(module + '-form-view');
  const detailEl = $(module + '-detail-view');
  if (listEl) listEl.classList.toggle('hidden', viewName !== 'list');
  if (formEl) formEl.classList.toggle('hidden', viewName !== 'form');
  if (detailEl) detailEl.classList.toggle('hidden', viewName !== 'detail');

  if (module === 'menus') {
    const mapEl = $('menus-mapping-view');
    if (mapEl && viewName !== 'mapping') mapEl.classList.add('hidden');
    if ($('tabBtnMenusList')) $('tabBtnMenusList').classList.toggle('active', viewName !== 'mapping');
    if ($('tabBtnRoleMapping')) $('tabBtnRoleMapping').classList.toggle('active', viewName === 'mapping');
  }

  const formMap = {
    users: 'userForm',
    roles: 'roleForm',
    departments: 'deptForm',
    categories: 'catForm',
    projects: 'projForm',
    documents: 'docForm',
    menus: 'menuForm',
    announcements: 'annForm'
  };

  if (viewName === 'form') {
    focusFirstField(module);
  } else {
    if (viewName === 'list' && formMap[module]) {
      clearFormDraft(formMap[module]);
      saveLastNav({ type: 'page', page: module, view: 'list' });
      if (window.location.hash !== '#' + module) {
        try { history.replaceState(null, '', '#' + module); } catch (_) {}
      }
    }
    setTimeout(() => {
      try {
        const grid = erpGrids[module];
        const container = $(module + 'Grid');
        if (grid && container && container.offsetParent !== null && typeof grid.sizeColumnsToFit === 'function') {
          const cols = (typeof grid.getColumnDefs === 'function') ? grid.getColumnDefs() : null;
          const totalColWidth = (cols || []).reduce((sum, col) => sum + (col.width || col.minWidth || 120), 0);
          if (container.clientWidth >= totalColWidth) {
            grid.sizeColumnsToFit();
          }
        }
      } catch (_) {}
    }, 60);
  }
}
window.setModuleView = setModuleView;

function goPage(name, viewName = 'list') {
  if (!canAccessPage(name)) {
    name = 'dashboard';
  }
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = $('page-' + name);
  if (target) target.classList.remove('hidden');
  if (window.activeDynamicMenuId) {
    // Leaving the dynamic route view: clear the highlight and collapse-state of custom menus
    window.activeDynamicMenuId = '';
    renderCustomSidebarMenus();
  }
  if (window.currentWebviewUrl) hideWebview(); // stop any embedded page while away
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.toggle('active', (b.dataset && b.dataset.page) === name));
  const label = PAGE_LABELS[name] || (name.charAt(0).toUpperCase() + name.slice(1));
  $('pageTitle').textContent = label;
  if ($('bcCurrent')) $('bcCurrent').textContent = label;
  closeNav();
  trackPageVisit(name);
  if (['users', 'roles', 'departments', 'categories', 'projects', 'documents', 'menus', 'announcements'].includes(name)) {
    setModuleView(name, viewName);
  }
  focusFirstField(name);

  // Sync state & URL hash only if viewName is list
  if (viewName === 'list') {
    saveLastNav({ type: 'page', page: name, view: 'list', subTab: name === 'menus' ? (window.curMenuSubTab || 'list') : null });
    if (window.location.hash !== '#' + name) {
      try { history.replaceState(null, '', '#' + name); } catch (_) {}
    }
  }

  setTimeout(() => {
    try {
      const grid = erpGrids[name];
      const container = $(name + 'Grid');
      if (grid && container && container.offsetParent !== null && typeof grid.sizeColumnsToFit === 'function') {
        const cols = (typeof grid.getColumnDefs === 'function') ? grid.getColumnDefs() : null;
        const totalColWidth = (cols || []).reduce((sum, col) => sum + (col.width || col.minWidth || 120), 0);
        if (container.clientWidth >= totalColWidth) {
          grid.sizeColumnsToFit();
        }
      }
    } catch (_) {}
  }, 60);
}
// Count every page open per logged-in user (drives "Most Used Modules")
function trackPageVisit(name) {
  try {
    const u = currentUser();
    if (!u) return;
    const db = loadDB();
    if (!db.stats || typeof db.stats !== 'object') db.stats = {};
    if (!db.stats[u.id]) db.stats[u.id] = {};
    db.stats[u.id][name] = (db.stats[u.id][name] || 0) + 1;
    saveDB(db);
  } catch (e) { /* stats must never break navigation */ }
}
function focusFirstField(page) {
  const map = {
    users: 'userName', roles: 'roleName', departments: 'deptName',
    categories: 'catName', projects: 'projName', documents: 'docTitle',
    menus: 'menuTitle', announcements: 'annTitle', audit: 'auditSearch'
  };
  const id = map[page];
  if (id && $(id)) setTimeout(() => $(id).focus(), 50);
}
// Edit click -> form panel tak smooth scroll + pehle field me focus (mobile + desktop)
function focusForm(formId, fieldId) {
  const f = $(formId);
  if (f) {
    const panel = f.closest('.panel');
    (panel || f).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (fieldId && $(fieldId)) setTimeout(() => {
    try { $(fieldId).focus({ preventScroll: true }); } catch (e) { $(fieldId).focus(); }
  }, 350);
}
function renderSidebar() {
  document.querySelectorAll('#sidebarMenu .menu-btn[data-module]').forEach(btn => {
    btn.style.display = hasPerm(btn.dataset.module, 'read') ? '' : 'none';
  });
  if ($('backupRestoreTopBtn')) {
    $('backupRestoreTopBtn').style.display = hasPerm('backup', 'read') ? '' : 'none';
  }
  renderCustomSidebarMenus();
}
// Mobile drawer
function openNav() { document.body.classList.add('nav-open'); $('navOverlay').classList.remove('hidden'); }
function closeNav() { document.body.classList.remove('nav-open'); if ($('navOverlay')) $('navOverlay').classList.add('hidden'); }

// ---------- DASHBOARD ----------
function renderDashboard() {
  const db = loadDB();
  $('cUsers').textContent = db.users.length;
  $('cRoles').textContent = db.roles.length;
  $('cDept').textContent = db.departments.length;
  $('cCat').textContent = db.categories.length;
  $('cProj').textContent = db.projects.length;
  if ($('cDocs')) $('cDocs').textContent = (db.documents || []).length;
  if ($('cAudit')) $('cAudit').textContent = (db.audit || []).length;
  if ($('cAnnouncements')) $('cAnnouncements').textContent = (db.announcements || []).length;
  renderCharts(); renderRecent(); renderMostUsed();
}
function renderMostUsed() {
  const u = currentUser();
  const stats = ((loadDB().stats || {})[u && u.id] || {});
  const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 7);
  if (!entries.length) { $('chartUsed').innerHTML = '<p class="muted">No usage data yet — open pages to track.</p>'; return; }
  const max = Math.max(1, entries[0][1]);
  $('chartUsed').innerHTML = entries.map(([p, n]) =>
    `<div class="hbar-row"><span class="hbar-label">${PAGE_LABELS[p] || p}</span><div class="hbar-track"><div class="hbar-fill alt" style="width:${Math.round(n / max * 100)}%"></div></div><b title="${n} visits">${n}</b></div>`
  ).join('');
}
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24); if (d < 30) return d + 'd ago';
  return new Date(iso).toLocaleDateString('en-IN');
}
function renderCharts() {
  const db = loadDB();
  const mods = [
    { label: 'Users', n: (db.users || []).length },
    { label: 'Roles', n: (db.roles || []).length },
    { label: 'Departments', n: (db.departments || []).length },
    { label: 'Categories', n: (db.categories || []).length },
    { label: 'Projects', n: (db.projects || []).length },
    { label: 'Documents', n: (db.documents || []).length },
  ];
  const max = Math.max(1, ...mods.map(m => m.n));
  const total = mods.reduce((a, b) => a + b.n, 0) || 1;
  $('chartModules').innerHTML = mods.map(m => {
    const pct = Math.round((m.n / total) * 100);
    return `<div class="hbar-row">
      <span class="hbar-label">${m.label}</span>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${Math.round(m.n / max * 100)}%"></div>
      </div>
      <div class="hbar-stats">
        <b>${m.n}</b>
        <span class="hbar-pct">${pct}%</span>
      </div>
    </div>`;
  }).join('');

  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
  const counts = days.map(d => {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return (db.audit || []).filter(a => { const t = new Date(a.datetime); return t >= d && t < next; }).length;
  });
  const mx = Math.max(1, ...counts);
  $('chartActivity').innerHTML = days.map((d, i) => {
    const isToday = (i === days.length - 1);
    const todayClass = isToday ? 'is-today' : '';
    const dateLabel = isToday ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    return `<div class="vbar-col" title="${counts[i]} audit events on ${d.toLocaleDateString('en-IN')}">
      <div class="vbar-track">
        <div class="vbar-fill ${todayClass}" style="height:${Math.round(counts[i] / mx * 100)}%"></div>
      </div>
      <span class="vbar-n">${counts[i]}</span>
      <span class="vbar-d" style="${isToday ? 'color:var(--brand-primary);font-weight:700;' : ''}">${dateLabel}</span>
    </div>`;
  }).join('');
}
function renderRecent() {
  const db = loadDB();
  const modIcons = {
    'Users': '👥',
    'Roles': '🛡️',
    'Departments': '🏢',
    'Categories': '📂',
    'Projects': '📁',
    'Documents': '📄'
  };
  const modPages = {
    'Users': 'users',
    'Roles': 'roles',
    'Departments': 'departments',
    'Categories': 'categories',
    'Projects': 'projects',
    'Documents': 'documents'
  };
  const mods = ['Users', 'Roles', 'Departments', 'Categories', 'Projects', 'Documents'];
  $('recentGrid').innerHTML = mods.map(m => {
    const items = [...(db.audit || [])]
      .filter(a => a.module === m && a.action === 'add')
      .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
      .slice(0, 5);
    const lis = items.length
      ? items.map(a => `
        <li style="cursor:pointer;" onclick="goPage('${modPages[m]}')" title="Click to open ${m}">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:12px;">${modIcons[m]}</span>
            <b>${escapeHtml(a.record || '—')}</b>
          </div>
          <span class="muted small">by ${escapeHtml(a.username)} • <span title="${new Date(a.datetime).toLocaleString('en-IN')}">${timeAgo(a.datetime)}</span></span>
        </li>`).join('')
      : '<li class="muted">Nothing added yet</li>';
    return `<div class="recent-box"><h4>${modIcons[m]} ${m}</h4><ul>${lis}</ul></div>`;
  }).join('');
}

// ---------- ENTITY AUDIT & LIVE PREVIEW HELPERS ----------
function getEntityAudit(moduleName, recordName) {
  const db = loadDB();
  const list = (db.audit || []).filter(a => {
    if (moduleName && a.module && a.module.toLowerCase() !== moduleName.toLowerCase()) return false;
    if (recordName && !(a.record || '').toLowerCase().includes(recordName.toLowerCase())) return false;
    return true;
  });
  return list.slice(-5).reverse();
}

function renderSideAudit(moduleName, recordName) {
  const list = getEntityAudit(moduleName, recordName);
  if (!list.length) {
    return `<p class="muted small" style="margin: 4px 0 0 0;">No audit events recorded for this ${moduleName.slice(0, -1).toLowerCase() || 'item'}.</p>`;
  }
  return `
    <div class="detail-audit-list">
      ${list.map(a => {
        const dt = new Date(a.datetime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `
          <div class="detail-audit-item">
            <div class="detail-audit-top">
              <b>${a.username}</b>
              <span class="badge sm">${a.action}</span>
            </div>
            <div class="detail-audit-time">${dt}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function updateLiveUserPreview() {
  const nameInput = $('userName');
  const passInput = $('userPass');
  const deptSelect = $('userDept');
  const roleSelect = $('userRole');

  if (!nameInput) return;

  const rawUsername = nameInput.value.trim();
  const username = rawUsername || 'New User';
  const avatarEl = $('liveUserAvatar');
  const nameEl = $('liveUserName');
  const roleEl = $('liveUserRole');
  const deptEl = $('liveUserDept');
  const strengthEl = $('liveUserPwdStrength');

  if (avatarEl) avatarEl.textContent = (rawUsername ? rawUsername[0] : 'U').toUpperCase();
  if (nameEl) nameEl.textContent = username;

  if (roleEl) {
    const selectedRole = roleSelect && roleSelect.selectedIndex >= 0 && roleSelect.options[roleSelect.selectedIndex]
      ? roleSelect.options[roleSelect.selectedIndex].text : '';
    roleEl.textContent = selectedRole ? `Role: ${selectedRole}` : 'Role: Not Selected';
  }

  if (deptEl) {
    const selectedDept = deptSelect && deptSelect.selectedIndex >= 0 && deptSelect.options[deptSelect.selectedIndex]
      ? deptSelect.options[deptSelect.selectedIndex].text : '';
    deptEl.textContent = selectedDept ? `Dept: ${selectedDept}` : 'Dept: Not Selected';
  }

  if (strengthEl) {
    const pwd = passInput ? passInput.value : '';
    if (!pwd) {
      strengthEl.textContent = '—';
      strengthEl.style.color = 'var(--text-muted)';
    } else if (pwd.length < 6) {
      strengthEl.textContent = 'Weak';
      strengthEl.style.color = 'var(--color-rose)';
    } else if (pwd.length < 10) {
      strengthEl.textContent = 'Good';
      strengthEl.style.color = 'var(--color-amber)';
    } else {
      strengthEl.textContent = 'Strong 🔒';
      strengthEl.style.color = 'var(--color-emerald)';
    }
  }
}

// ==========================================================================
// AG Grid Community v31 Integration Engine
// ==========================================================================
const erpGrids = {};

function initOrUpdateAGGrid(key, containerId, columnDefs, rowData, customOptions = {}) {
  const container = $(containerId);
  if (!container) return null;

  // Dynamically calculate height to eliminate excessive empty void when rowCount is small
  const count = (rowData && rowData.length) || 0;
  const targetHeight = Math.min(540, Math.max(220, (Math.min(count, 10) * 48) + 42 + 48 + 14));
  container.style.height = `${targetHeight}px`;

  if (erpGrids[key]) {
    try {
      erpGrids[key].setGridOption('rowData', rowData);
      if (customOptions.quickFilterText !== undefined) {
        erpGrids[key].setGridOption('quickFilterText', customOptions.quickFilterText);
      }
      setTimeout(() => {
        try {
          if (container.offsetParent !== null) {
            const totalColWidth = columnDefs.reduce((sum, col) => sum + (col.width || col.minWidth || 120), 0);
            if (container.clientWidth >= totalColWidth) {
              erpGrids[key].sizeColumnsToFit();
            }
          }
        } catch (_) {}
      }, 50);
      return erpGrids[key];
    } catch (e) {
      console.warn('Grid update error for ' + key + ', re-initializing', e);
      erpGrids[key] = null;
    }
  }

  if (typeof agGrid === 'undefined') {
    console.warn('agGrid library not loaded yet');
    return null;
  }

  container.innerHTML = '';
  const gridOptions = {
    theme: 'quartz',
    columnDefs: columnDefs,
    rowData: rowData,
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 25, 50, 100],
    overlayNoRowsTemplate: '<div class="grid-empty-state"><div class="empty-icon">📭</div><h4>No records yet</h4><p class="muted small">Create your first record or adjust your search filters.</p></div>',
    animateRows: false,
    rowHeight: 48,
    headerHeight: 42,
    suppressCellFocus: true,
    enableCellTextSelection: true,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 110
    },
    ...customOptions
  };

  try {
    const api = agGrid.createGrid(container, gridOptions);
    erpGrids[key] = api;
    setTimeout(() => {
      try {
        if (container.offsetParent !== null) {
          const totalColWidth = columnDefs.reduce((sum, col) => sum + (col.width || col.minWidth || 120), 0);
          if (container.clientWidth >= totalColWidth) {
            api.sizeColumnsToFit();
          }
        }
      } catch (_) {}
    }, 60);
    return api;
  } catch (err) {
    console.error('Failed to create AG Grid for ' + key, err);
    return null;
  }
}

// ---------- USERS ----------
function deptName(id) {
  const db = loadDB();
  const d = db.departments.find(x => x.id === id);
  return d ? d.name : '-';
}
function roleName(id) {
  const db = loadDB();
  const r = db.roles.find(x => x.id === id);
  return r ? r.name : '-';
}
function renderUsers() {
  const db = loadDB();
  // dropdowns
  $('userDept').innerHTML = db.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('') || '<option value="">No department</option>';
  $('userRole').innerHTML = db.roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  // form permission
  const canAdd = hasPerm('users', 'add'), canUpdate = hasPerm('users', 'update');
  if ($('userForm')) {
    const btn = $('userForm').querySelector('button[type=submit]');
    if (btn) btn.disabled = !(canAdd || canUpdate);
  }

  const columnDefs = [
    {
      headerName: 'Actions',
      field: 'id',
      pinned: 'left',
      lockPinned: true,
      width: 240,
      minWidth: 230,
      maxWidth: 265,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params) => {
        const u = params.data;
        if (!u) return '';
        const isDefaultAdmin = (u.username === 'admin' || u.id === 'u1');
        const viewBtn = `<button type="button" class="btn btn-act-view sm" onclick="viewUser('${u.id}')" title="View User">👁️ View</button>`;
        const editBtn = hasPerm('users', 'update')
          ? (isDefaultAdmin
              ? `<button type="button" class="btn warn sm" onclick="editUser('${u.id}')" title="Change Admin Password">🔑 Password</button>`
              : `<button type="button" class="btn warn sm" onclick="editUser('${u.id}')" title="Edit User">✏️ Edit</button>`)
          : '';
        const delBtn = (!isDefaultAdmin && hasPerm('users', 'delete'))
          ? `<button type="button" class="btn danger sm" onclick="deleteUser('${u.id}')" title="Delete User">🗑️ Del</button>`
          : (isDefaultAdmin ? `<span class="btn btn-act-locked sm" title="Default System Admin cannot be deleted">🔒 System</span>` : '');
        return `<div class="grid-actions-cell">${viewBtn}${editBtn}${delBtn}</div>`;
      }
    },
    {
      headerName: 'Username',
      field: 'username',
      minWidth: 160,
      cellRenderer: (params) => {
        const isAdm = (params.value === 'admin');
        return isAdm
          ? `<div style="display:flex;align-items:center;gap:6px;"><b>${escapeHtml(params.value || '')}</b><span class="badge primary xs" style="font-size:10px;padding:2px 7px;">System Admin</span></div>`
          : `<b>${escapeHtml(params.value || '')}</b>`;
      }
    },
    {
      headerName: 'Password',
      field: 'password',
      width: 120,
      valueGetter: () => '••••••'
    },
    {
      headerName: 'Department',
      field: 'departmentId',
      minWidth: 150,
      valueGetter: (params) => deptName(params.data?.departmentId)
    },
    {
      headerName: 'Role',
      field: 'roleId',
      minWidth: 140,
      cellRenderer: (params) => `<span class="badge">${escapeHtml(roleName(params.data?.roleId))}</span>`
    }
  ];

  const uq = ($('userSearch') && $('userSearch').value || '').toLowerCase().trim();
  const rowData = (db.users || []).map(u => ({
    ...u,
    _deptName: deptName(u.departmentId),
    _roleName: roleName(u.roleId)
  }));

  initOrUpdateAGGrid('users', 'usersGrid', columnDefs, rowData, {
    quickFilterText: uq
  });
}

window.openCreateUser = function() {
  if (!hasPerm('users', 'add')) return showAlert('You do not have add permission');
  resetForm('userForm', 'userFormTitle', 'Add User');
  $('userName').disabled = false;
  $('userDept').disabled = false;
  $('userRole').disabled = false;
  if ($('addRoleInlineBtn')) $('addRoleInlineBtn').style.display = '';
  if ($('addDeptInlineBtn')) $('addDeptInlineBtn').style.display = '';
  if ($('adminLockNotice')) $('adminLockNotice').classList.add('hidden');
  $('userCancel').classList.remove('hidden');
  restoreFormDraft('userForm');
  updateLiveUserPreview();
  setModuleView('users', 'form');
  saveLastNav({ type: 'page', page: 'users', view: 'form', mode: 'add' });
  if (window.location.hash !== '#users-add') {
    try { history.replaceState(null, '', '#users-add'); } catch (_) {}
  }
};

window.editUser = function (id) {
  const db = loadDB();
  const u = db.users.find(x => x.id === id);
  if (!u) return;
  const isDefaultAdmin = (u.username === 'admin' || u.id === 'u1');
  $('userId').value = u.id;
  $('userName').value = u.username;
  $('userPass').value = u.password;
  $('userDept').value = u.departmentId;
  $('userRole').value = u.roleId;

  if (isDefaultAdmin) {
    $('userFormTitle').textContent = '🔑 Change Admin Password';
    $('userName').disabled = true;
    $('userDept').disabled = true;
    $('userRole').disabled = true;
    if ($('addRoleInlineBtn')) $('addRoleInlineBtn').style.display = 'none';
    if ($('addDeptInlineBtn')) $('addDeptInlineBtn').style.display = 'none';
    if ($('adminLockNotice')) {
      $('adminLockNotice').classList.remove('hidden');
      $('adminLockNotice').innerHTML = `
        <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);border-radius:8px;padding:9px 13px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:18px;">🔒</span>
          <span style="font-size:12.5px;color:#fbbf24;line-height:1.4;"><strong>Protected System Account:</strong> Default admin username, department, and role are read-only. Only the password can be updated.</span>
        </div>`;
    }
  } else {
    $('userFormTitle').textContent = 'Edit User';
    $('userName').disabled = false;
    $('userDept').disabled = false;
    $('userRole').disabled = false;
    if ($('addRoleInlineBtn')) $('addRoleInlineBtn').style.display = '';
    if ($('addDeptInlineBtn')) $('addDeptInlineBtn').style.display = '';
    if ($('adminLockNotice')) $('adminLockNotice').classList.add('hidden');
  }

  // Restore draft if any, ensuring id remains
  restoreFormDraft('userForm');
  $('userId').value = u.id;
  if (isDefaultAdmin) {
    $('userName').value = u.username;
    $('userDept').value = u.departmentId;
    $('userRole').value = u.roleId;
  }

  $('userCancel').classList.remove('hidden');
  updateLiveUserPreview();
  setModuleView('users', 'form');
  saveLastNav({ type: 'page', page: 'users', view: 'form', mode: 'edit', editId: id });
  if (window.location.hash !== '#users-edit-' + id) {
    try { history.replaceState(null, '', '#users-edit-' + id); } catch (_) {}
  }
  if (isDefaultAdmin) {
    setTimeout(() => { if ($('userPass')) $('userPass').focus(); }, 120);
  }
};

window.viewUser = function(id) {
  const db = loadDB();
  const u = db.users.find(x => x.id === id);
  if (!u) return;
  const isDefaultAdmin = (u.username === 'admin' || u.id === 'u1');
  const r = db.roles.find(x => x.id === u.roleId);
  const d = db.departments.find(x => x.id === u.departmentId);
  const perms = r && r.permissions ? MODULES.map(m => {
    const p = r.permissions[m.key] || {};
    const on = PERMS.filter(k => p[k]);
    return `<span class="badge">${m.label}: ${on.length ? on.join(', ') : 'None'}</span>`;
  }).join(' ') : '—';

  $('userDetailActions').innerHTML = hasPerm('users', 'update')
    ? (isDefaultAdmin
        ? `<button class="btn warn sm" onclick="editUser('${u.id}')">🔑 Change Admin Password</button>`
        : `<button class="btn warn sm" onclick="editUser('${u.id}')">✏️ Edit User</button>`)
    : '';

  $('userDetailContent').innerHTML = `
    <div class="detail-layout-split">
      <div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>User Profile Overview</h4>
            <span class="badge">${isDefaultAdmin ? 'Super Administrator' : (r ? r.name : 'No Role')}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Username</span>
              <span class="detail-val"><b>${escapeHtml(u.username)}</b> ${isDefaultAdmin ? '<span class="badge primary xs">System Default</span>' : ''}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Department</span>
              <span class="detail-val">${d ? escapeHtml(d.name) : '—'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Role</span>
              <span class="detail-val">${r ? escapeHtml(r.name) : '—'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">User ID</span>
              <span class="detail-val"><code>${u.id}</code></span>
            </div>
          </div>
        </div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Assigned Role & Effective Permissions</h4>
          </div>
          <div class="detail-perms">${perms}</div>
        </div>
      </div>
      <div class="side-col">
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>📋 User Summary</h4>
            <span class="badge success">Active</span>
          </div>
          <p class="muted small">${isDefaultAdmin ? 'Primary built-in system administrator with immutable identity and role.' : 'Configured with client authentication and granular RBAC authorization.'}</p>
        </div>
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🕒 Recent Activity</h4>
          </div>
          ${renderSideAudit('Users', u.username)}
        </div>
      </div>
    </div>
  `;
  setModuleView('users', 'detail');
};
window.deleteUser = function (id) {
  if (!hasPerm('users', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const u = db.users.find(x => x.id === id);
  if (u && (u.username === 'admin' || u.id === 'u1')) return showAlert('The default admin cannot be deleted');
  if (currentUser() && currentUser().id === id) return showAlert('You cannot delete yourself');
  askConfirm(`Delete user "${u.username}"?`).then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    db2.users = db2.users.filter(x => x.id !== id);
    saveDB(db2);
    logAudit('Users', 'delete', u.username, summarize('users', u), '—');
    renderUsers(); renderDashboard(); renderAudit();
    toast('User deleted');
  });
};

// ---------- ROLES ----------
function renderPermMatrix(selected) {
  selected = selected || emptyPerms();
  $('permTable').innerHTML = MODULES.map(m => {
    const p = selected[m.key] || {};
    const rowAll = PERMS.every(k => p[k]) ? 'checked' : '';
    return `<tr><td>${m.label}</td>${PERMS.map(pm =>
      `<td><input type="checkbox" data-module="${m.key}" data-perm="${pm}" ${p[pm] ? 'checked' : ''}></td>`
    ).join('')}<td><input type="checkbox" data-row-all="${m.key}" ${rowAll} title="Full ${m.label} permission"></td></tr>`;
  }).join('');
  syncPermHeaders();
}
function syncPermHeaders() {
  // column-wise All
  PERMS.forEach(pm => {
    const box = document.querySelector(`[data-col-all="${pm}"]`);
    if (!box) return;
    const all = [...document.querySelectorAll(`#permTable input[data-module][data-perm="${pm}"]`)];
    box.checked = all.length > 0 && all.every(c => c.checked);
  });
  // row-wise All
  MODULES.forEach(m => {
    const box = document.querySelector(`#permTable input[data-row-all="${m.key}"]`);
    if (!box) return;
    const cells = [...document.querySelectorAll(`#permTable input[data-module="${m.key}"]`)];
    box.checked = cells.length > 0 && cells.every(c => c.checked);
  });
  // global All
  const g = $('permAllGlobal');
  if (g) {
    const all = [...document.querySelectorAll('#permTable input[data-module]')];
    g.checked = all.length > 0 && all.every(c => c.checked);
  }
}
function readPermMatrix() {
  const o = emptyPerms();
  document.querySelectorAll('#permTable input[data-module]').forEach(c => {
    o[c.dataset.module][c.dataset.perm] = c.checked;
  });
  return o;
}
function renderRoles() {
  const db = loadDB();
  if (!$('roleId').value) renderPermMatrix(emptyPerms());
  if ($('deleteAllRolesBtn')) $('deleteAllRolesBtn').style.display = hasPerm('roles', 'delete') ? '' : 'none';

  const columnDefs = [
    {
      headerName: 'Actions',
      field: 'id',
      pinned: 'left',
      lockPinned: true,
      width: 220,
      minWidth: 210,
      maxWidth: 250,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params) => {
        const r = params.data;
        if (!r) return '';
        const isAdminRole = (r.name === 'Admin' || r.id === 'r1');
        const viewBtn = `<button type="button" class="btn btn-act-view sm" onclick="viewRole('${r.id}')" title="View Role Details">👁️ View</button>`;
        const editBtn = isAdminRole
          ? `<span class="btn btn-act-locked sm" title="Default Admin role is read-only system role">🔒 Read Only</span>`
          : (hasPerm('roles', 'update') ? `<button type="button" class="btn warn sm" onclick="editRole('${r.id}')" title="Edit Role">✏️ Edit</button>` : '');
        const delBtn = (!isAdminRole && hasPerm('roles', 'delete')) ? `<button type="button" class="btn danger sm" onclick="deleteRole('${r.id}')" title="Delete Role">🗑️ Del</button>` : '';
        return `<div class="grid-actions-cell">${viewBtn}${editBtn}${delBtn}</div>`;
      }
    },
    {
      headerName: 'Role Name',
      field: 'name',
      minWidth: 180,
      cellRenderer: (params) => {
        const r = params.data;
        if (!r) return '';
        const isAdmin = (r.name === 'Admin');
        const roleIcon = isAdmin ? '🛡️' : '💼';
        const tag = isAdmin
          ? '<span class="badge primary xs" style="margin-left:6px;font-size:10px;padding:2px 7px;">System</span>'
          : '<span class="badge secondary xs" style="margin-left:6px;font-size:10px;padding:2px 7px;">Custom</span>';
        return `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:1.15rem;line-height:1;">${roleIcon}</span><strong style="color:var(--text-primary);font-size:0.92rem;">${escapeHtml(r.name || '')}</strong>${tag}</div>`;
      }
    },
    {
      headerName: 'Assigned Users',
      field: 'userCount',
      width: 160,
      minWidth: 150,
      cellRenderer: (params) => {
        const count = Number(params.value) || 0;
        const badgeClass = count > 0 ? 'badge-user-active' : 'badge-user-empty';
        return `<span class="badge ${badgeClass}"><span style="font-size:0.95rem;">👥</span> <strong>${count}</strong> Member${count === 1 ? '' : 's'}</span>`;
      }
    },
    {
      headerName: 'Permissions Summary',
      field: 'permSummary',
      minWidth: 320,
      flex: 2,
      cellRenderer: (params) => {
        const r = params.data;
        if (!r) return '—';
        if (r.name === 'Admin') {
          return '<span class="badge-role-full"><span style="font-size:1rem;">👑</span> <strong>Full Access (Super Admin)</strong></span>';
        }
        const activeModules = MODULES.map(m => {
          const p = (r.permissions && r.permissions[m.key]) || {};
          const on = PERMS.filter(k => p[k]);
          if (!on.length) return null;
          return {
            label: m.label,
            count: on.length,
            isAll: on.length === PERMS.length,
            perms: on.join(', ')
          };
        }).filter(Boolean);

        if (!activeModules.length) {
          return '<span class="badge-user-empty">No Permissions Assigned</span>';
        }

        if (activeModules.length === MODULES.length && activeModules.every(x => x.isAll)) {
          return '<span class="badge-role-full"><span style="font-size:1rem;">👑</span> <strong>Full Access (All Modules)</strong></span>';
        }

        return '<div class="role-perms-chips">' + activeModules.map(m => {
          const cls = m.isAll ? 'perm-chip-full' : '';
          const badgeText = m.isAll ? '★ All' : m.count;
          return `<span class="perm-chip ${cls}" title="${escapeHtml(m.label)}: ${escapeHtml(m.perms)}"><span>${escapeHtml(m.label)}</span><span class="chip-badge">${badgeText}</span></span>`;
        }).join('') + '</div>';
      }
    }
  ];

  const rq = ($('roleSearch') && $('roleSearch').value || '').toLowerCase().trim();
  const rowData = (db.roles || []).map(r => {
    const activeModLabels = MODULES.map(m => {
      const p = (r.permissions && r.permissions[m.key]) || {};
      const on = PERMS.filter(k => p[k]);
      return on.length ? `${m.label} (${on.join(',')})` : null;
    }).filter(Boolean);

    const uCount = (db.users || []).filter(u => u.roleId === r.id).length;
    return {
      ...r,
      userCount: uCount,
      permSummary: (r.name === 'Admin') ? 'Full Access Super Admin All Modules' : (activeModLabels.join(' | ') || 'None')
    };
  });

  initOrUpdateAGGrid('roles', 'rolesGrid', columnDefs, rowData, {
    quickFilterText: rq
  });
}

window.applyRolePreset = function(type) {
  const checkboxes = document.querySelectorAll('#permTable input[data-module][data-perm]');
  checkboxes.forEach(cb => {
    const p = cb.dataset.perm;
    if (type === 'all') {
      cb.checked = true;
    } else if (type === 'editor') {
      cb.checked = (p === 'read' || p === 'add' || p === 'update');
    } else if (type === 'readonly') {
      cb.checked = (p === 'read');
    } else if (type === 'clear') {
      cb.checked = false;
    }
  });
  syncPermHeaders();
  toast(`Applied preset: ${type.toUpperCase()}`);
};

// ---------- QUICK ROLE MODAL HELPERS (User Form) ----------
function renderQuickPermMatrix(selected) {
  selected = selected || emptyPerms();
  $('quickPermTable').innerHTML = MODULES.map(m => {
    const p = selected[m.key] || {};
    const rowAll = PERMS.every(k => p[k]) ? 'checked' : '';
    return `<tr><td>${m.label}</td>${PERMS.map(pm =>
      `<td><input type="checkbox" data-quick-module="${m.key}" data-quick-perm="${pm}" ${p[pm] ? 'checked' : ''}></td>`
    ).join('')}<td><input type="checkbox" data-quick-row-all="${m.key}" ${rowAll} title="Full ${m.label} permission"></td></tr>`;
  }).join('');
  syncQuickPermHeaders();
}

function syncQuickPermHeaders() {
  PERMS.forEach(pm => {
    const box = document.querySelector(`[data-quick-col="${pm}"]`);
    if (!box) return;
    const all = [...document.querySelectorAll(`#quickPermTable input[data-quick-module][data-quick-perm="${pm}"]`)];
    box.checked = all.length > 0 && all.every(c => c.checked);
  });
  MODULES.forEach(m => {
    const box = document.querySelector(`#quickPermTable input[data-quick-row-all="${m.key}"]`);
    if (!box) return;
    const cells = [...document.querySelectorAll(`#quickPermTable input[data-quick-module="${m.key}"]`)];
    box.checked = cells.length > 0 && cells.every(c => c.checked);
  });
  const g = $('quickPermAllGlobal');
  if (g) {
    const all = [...document.querySelectorAll('#quickPermTable input[data-quick-module]')];
    g.checked = all.length > 0 && all.every(c => c.checked);
  }
}

function readQuickPermMatrix() {
  const o = emptyPerms();
  document.querySelectorAll('#quickPermTable input[data-quick-module]').forEach(c => {
    o[c.dataset.quickModule][c.dataset.quickPerm] = c.checked;
  });
  return o;
}

window.applyQuickRolePreset = function(type) {
  const checkboxes = document.querySelectorAll('#quickPermTable input[data-quick-module][data-quick-perm]');
  checkboxes.forEach(cb => {
    const p = cb.dataset.quickPerm;
    if (type === 'all') {
      cb.checked = true;
    } else if (type === 'editor') {
      cb.checked = (p === 'read' || p === 'add' || p === 'update');
    } else if (type === 'readonly') {
      cb.checked = (p === 'read');
    } else if (type === 'clear') {
      cb.checked = false;
    }
  });
  syncQuickPermHeaders();
};

window.openQuickRoleModal = function() {
  if (!hasPerm('roles', 'add')) return showAlert('You do not have permission to add roles');
  $('quickRoleName').value = '';
  renderQuickPermMatrix(emptyPerms());
  $('quickRoleModal').classList.remove('hidden');
  setTimeout(() => $('quickRoleName').focus(), 50);
};

window.closeQuickRoleModal = function() {
  $('quickRoleModal').classList.add('hidden');
};

function updateQuickDeptLivePreview() {
  const nameInp = $('quickDeptName');
  const headInp = $('quickDeptHead');
  if (!nameInp) return;
  const rawName = nameInp.value.trim();
  const name = rawName || 'New Department';
  const head = (headInp && headInp.value.trim()) || '';

  if ($('quickDeptLiveName')) $('quickDeptLiveName').textContent = name;
  if ($('quickDeptLiveAvatar')) {
    const words = name.split(/\s+/).filter(Boolean);
    const initial = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : (name.slice(0, 2).toUpperCase() || '🏢');
    $('quickDeptLiveAvatar').textContent = initial;
  }
  if ($('quickDeptLiveHeadBadge')) {
    $('quickDeptLiveHeadBadge').textContent = head ? `Lead: ${head}` : 'Lead: Unassigned';
    $('quickDeptLiveHeadBadge').className = head ? 'badge' : 'badge secondary';
  }
  if ($('quickDeptLiveCodeBadge')) {
    const slug = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'DEPT';
    $('quickDeptLiveCodeBadge').textContent = `Code: ${slug}`;
  }
}
window.updateQuickDeptLivePreview = updateQuickDeptLivePreview;

function openQuickDeptModal() {
  if (!hasPerm('departments', 'add')) return showAlert('You do not have permission to add departments');
  if ($('quickDeptName')) $('quickDeptName').value = '';
  if ($('quickDeptHead')) $('quickDeptHead').value = '';
  updateQuickDeptLivePreview();
  const modal = $('quickDeptModal');
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if ($('quickDeptName')) $('quickDeptName').focus();
    }, 50);
  }
}
window.openQuickDeptModal = openQuickDeptModal;

function closeQuickDeptModal() {
  const modal = $('quickDeptModal');
  if (modal) modal.classList.add('hidden');
}
window.closeQuickDeptModal = closeQuickDeptModal;

window.openCreateRole = function() {
  if (!hasPerm('roles', 'add')) return showAlert('You do not have add permission');
  resetForm('roleForm', 'roleFormTitle', 'Add Role');
  renderPermMatrix(emptyPerms());
  $('roleCancel').classList.remove('hidden');
  restoreFormDraft('roleForm');
  setModuleView('roles', 'form');
  saveLastNav({ type: 'page', page: 'roles', view: 'form', mode: 'add' });
  if (window.location.hash !== '#roles-add') {
    try { history.replaceState(null, '', '#roles-add'); } catch (_) {}
  }
};

window.editRole = function (id) {
  const db = loadDB();
  const r = db.roles.find(x => x.id === id);
  if (!r) return;
  if (r.name === 'Admin' || r.id === 'r1') {
    return showAlert('The default Admin role is a protected system role and is read-only.');
  }
  $('roleId').value = r.id; $('roleName').value = r.name;
  renderPermMatrix(r.permissions);
  restoreFormDraft('roleForm');
  $('roleId').value = r.id;
  $('roleFormTitle').textContent = 'Edit Role';
  $('roleCancel').classList.remove('hidden');
  setModuleView('roles', 'form');
  saveLastNav({ type: 'page', page: 'roles', view: 'form', mode: 'edit', editId: id });
  if (window.location.hash !== '#roles-edit-' + id) {
    try { history.replaceState(null, '', '#roles-edit-' + id); } catch (_) {}
  }
};

window.viewRole = function(id) {
  const db = loadDB();
  const r = db.roles.find(x => x.id === id);
  if (!r) return;
  const isAdminRole = (r.name === 'Admin' || r.id === 'r1');
  const assignedUsers = db.users.filter(u => u.roleId === id);
  const userBadges = assignedUsers.length
    ? assignedUsers.map(u => `<span class="badge">${u.username}</span>`).join(' ')
    : '<span class="muted small">No users currently assigned to this role</span>';
  
  const permRows = MODULES.map(m => {
    const p = (r.permissions && r.permissions[m.key]) || {};
    const on = PERMS.filter(k => p[k]);
    return `<tr><td><b>${m.label}</b></td><td>${on.map(k => `<span class="badge">${k}</span>`).join(' ') || '<span class="muted">No permissions</span>'}</td></tr>`;
  }).join('');

  $('roleDetailActions').innerHTML = (!isAdminRole && hasPerm('roles', 'update'))
    ? `<button class="btn warn sm" onclick="editRole('${r.id}')">✏️ Edit Role</button>`
    : (isAdminRole ? `<span class="badge sm" style="background:rgba(52,211,153,0.18);color:#34d399;border:1px solid rgba(52,211,153,0.35);">🔒 System Role (Read Only)</span>` : '');

  $('roleDetailContent').innerHTML = `
    <div class="detail-layout-split">
      <div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Role Overview</h4>
            <span class="badge">${escapeHtml(r.name)}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Role Name</span>
              <span class="detail-val"><b>${escapeHtml(r.name)}</b> ${isAdminRole ? '<span class="badge primary xs">System Default</span>' : ''}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Role ID</span>
              <span class="detail-val"><code>${r.id}</code></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Assigned Users Count</span>
              <span class="detail-val">${assignedUsers.length} user(s)</span>
            </div>
          </div>
          <div class="mt">
            <span class="detail-label">Assigned Users:</span>
            <div class="mt-2">${userBadges}</div>
          </div>
        </div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Permissions Matrix Breakdown</h4>
          </div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Module</th><th>Allowed Permissions</th></tr></thead>
              <tbody>${permRows}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="side-col">
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🛡️ Role Classification</h4>
          </div>
          <p class="muted small">${isAdminRole ? 'Built-in Super Administrator Role with immutable full privileges.' : 'Custom enterprise role definition.'}</p>
        </div>
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🕒 Recent Activity</h4>
          </div>
          ${renderSideAudit('Roles', r.name)}
        </div>
      </div>
    </div>
  `;
  setModuleView('roles', 'detail');
};
window.deleteRole = function (id) {
  if (!hasPerm('roles', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const r = db.roles.find(x => x.id === id);
  if (r && (r.name === 'Admin' || r.id === 'r1')) return showAlert('The default Admin role cannot be deleted');
  if (db.users.some(u => u.roleId === id)) return showAlert('This role is assigned to users. Please change their role first.');
  askConfirm(`Delete role "${r.name}"?`).then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    db2.roles = db2.roles.filter(x => x.id !== id);
    saveDB(db2);
    logAudit('Roles', 'delete', r.name, summarize('roles', r), '—');
    renderRoles(); renderUsers(); renderDashboard(); renderSidebar(); renderMenus(); renderAudit();
    toast('Role deleted');
  });
};
// Password gate: bulk delete continues only after correct password of logged-in user
function askAdminPassword(text) {
  const me = currentUser();
  if (!me) return Promise.resolve(false);
  if (!window.Swal) return Promise.resolve(prompt(text || 'Enter your password to confirm:') === me.password);
  return Swal.fire({
    title: 'Password confirmation',
    text: text || `Enter the password of "${me.username}" to continue.`,
    input: 'password', inputPlaceholder: 'Password',
    inputAttributes: { autocomplete: 'current-password' },
    showCancelButton: true, confirmButtonText: 'Confirm', confirmButtonColor: '#dc2626',
    preConfirm: (val) => {
      const fresh = currentUser();
      if (!val || !fresh || val !== fresh.password) { Swal.showValidationMessage('Incorrect password'); return false; }
      return true;
    }
  }).then(r => r.isConfirmed && r.value === true);
}
window.deleteAllRoles = function () {
  if (!hasPerm('roles', 'delete')) return showAlert('You do not have delete permission');
  askAdminPassword('Enter your password to delete ALL roles (Admin role and roles assigned to users stay safe).').then(ok => {
    if (!ok) return;
    const db = loadDB();
    const assigned = new Set(db.users.map(x => x.roleId));
    const deletable = db.roles.filter(r => r.name !== 'Admin' && !assigned.has(r.id));
    const skipped = db.roles.length - deletable.length;
    const names = deletable.map(r => r.name).join(', ');
    db.roles = db.roles.filter(r => !deletable.includes(r));
    saveDB(db);
    logAudit('Roles', 'delete', 'Bulk delete (all roles)', deletable.length ? `${deletable.length} role(s): ${names}` : 'No deletable roles', '—');
    renderRoles(); renderUsers(); renderDashboard(); renderSidebar(); renderMenus(); renderAudit();
    if (window.Swal) Swal.fire({ icon: skipped ? 'info' : 'success', title: 'Done', text: `${deletable.length} role(s) deleted${skipped ? `, ${skipped} skipped (Admin / assigned to users)` : ''}.`, confirmButtonColor: '#1e3a8a' });
    else toast('Roles deleted');
  });
};

// ---------- DEPARTMENTS ----------
function renderDepartments() {
  const db = loadDB();
  const columnDefs = [
    {
      headerName: 'Actions',
      field: 'id',
      pinned: 'left',
      lockPinned: true,
      width: 215,
      minWidth: 205,
      maxWidth: 245,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params) => {
        const d = params.data;
        if (!d) return '';
        const viewBtn = `<button type="button" class="btn btn-act-view sm" onclick="viewDept('${d.id}')" title="View Department">👁️ View</button>`;
        const editBtn = hasPerm('departments', 'update') ? `<button type="button" class="btn warn sm" onclick="editDept('${d.id}')" title="Edit Department">✏️ Edit</button>` : '';
        const delBtn = (hasPerm('departments', 'delete') && d.name !== 'Admin') ? `<button type="button" class="btn danger sm" onclick="deleteDept('${d.id}')" title="Delete Department">🗑️ Del</button>` : '';
        return `<div class="grid-actions-cell">${viewBtn}${editBtn}${delBtn}</div>`;
      }
    },
    {
      headerName: 'Department Name',
      field: 'name',
      minWidth: 180,
      cellRenderer: (params) => `<b>${escapeHtml(params.value || '')}</b>`
    },
    {
      headerName: 'Head of Department',
      field: 'head',
      minWidth: 160,
      cellRenderer: (params) => {
        const val = params.value || '';
        return val ? `<span style="font-weight:600;color:var(--text-primary);"><span style="margin-right:4px;">👤</span>${escapeHtml(val)}</span>` : '<span class="muted small">— Not Assigned —</span>';
      }
    },
    {
      headerName: 'Assigned Users',
      field: 'userCount',
      width: 155,
      minWidth: 145,
      cellRenderer: (params) => {
        const c = Number(params.value) || 0;
        const cls = c > 0 ? 'badge-user-active' : 'badge-user-empty';
        return `<span class="badge ${cls}"><span style="font-size:0.95rem;">👥</span> <strong>${c}</strong> Member${c === 1 ? '' : 's'}</span>`;
      }
    }
  ];

  const dq = ($('deptSearch') && $('deptSearch').value || '').toLowerCase().trim();
  const rowData = (db.departments || []).map(d => ({
    ...d,
    userCount: (db.users || []).filter(u => u.departmentId === d.id).length
  }));

  initOrUpdateAGGrid('departments', 'departmentsGrid', columnDefs, rowData, {
    quickFilterText: dq
  });
}

function updateLiveDeptPreview() {
  const nameInp = $('deptName');
  const headInp = $('deptHead');
  const idInp = $('deptId');
  if (!nameInp) return;

  const rawName = nameInp.value.trim();
  const name = rawName || 'New Department';
  const head = (headInp && headInp.value.trim()) || '';
  const deptId = (idInp && idInp.value.trim()) || '';

  if ($('liveDeptName')) $('liveDeptName').textContent = name;
  if ($('liveDeptAvatar')) {
    const words = name.split(/\s+/).filter(Boolean);
    const initial = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : (name.slice(0, 2).toUpperCase() || '🏢');
    $('liveDeptAvatar').textContent = initial;
  }
  if ($('liveDeptHeadBadge')) {
    $('liveDeptHeadBadge').textContent = head ? `Lead: ${head}` : 'Lead: Unassigned';
    $('liveDeptHeadBadge').className = head ? 'badge' : 'badge secondary';
  }
  if ($('liveDeptCodeBadge')) {
    const slug = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'DEPT';
    $('liveDeptCodeBadge').textContent = `Code: ${slug}`;
  }

  if ($('liveDeptMembersCount')) {
    if (deptId) {
      const db = loadDB();
      const count = (db.users || []).filter(u => u.departmentId === deptId).length;
      $('liveDeptMembersCount').textContent = `${count} member${count === 1 ? '' : 's'}`;
    } else {
      $('liveDeptMembersCount').textContent = '0 members';
    }
  }
}
window.updateLiveDeptPreview = updateLiveDeptPreview;

function renderDeptHeadUserList() {
  const listEl = $('deptHeadUserList');
  if (!listEl) return;
  const db = loadDB();
  listEl.innerHTML = (db.users || []).map(u => `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)} (${escapeHtml(deptName(u.departmentId))})</option>`).join('');
}

window.openCreateDept = function() {
  if (!hasPerm('departments', 'add')) return showAlert('You do not have add permission');
  resetForm('deptForm', 'deptFormTitle', 'Add Department');
  if ($('deptHead')) $('deptHead').value = '';
  if ($('deptDesc')) $('deptDesc').value = '';
  renderDeptHeadUserList();
  $('deptCancel').classList.remove('hidden');
  restoreFormDraft('deptForm');
  updateLiveDeptPreview();
  setModuleView('departments', 'form');
  saveLastNav({ type: 'page', page: 'departments', view: 'form', mode: 'add' });
  if (window.location.hash !== '#departments-add') {
    try { history.replaceState(null, '', '#departments-add'); } catch (_) {}
  }
};

window.editDept = function (id) {
  const db = loadDB();
  const d = db.departments.find(x => x.id === id);
  if (!d) return;
  $('deptId').value = d.id;
  $('deptName').value = d.name;
  if ($('deptHead')) $('deptHead').value = d.head || '';
  if ($('deptDesc')) $('deptDesc').value = d.description || '';
  renderDeptHeadUserList();
  restoreFormDraft('deptForm');
  $('deptId').value = d.id;
  updateLiveDeptPreview();
  $('deptFormTitle').textContent = 'Edit Department';
  $('deptCancel').classList.remove('hidden');
  setModuleView('departments', 'form');
  saveLastNav({ type: 'page', page: 'departments', view: 'form', mode: 'edit', editId: id });
  if (window.location.hash !== '#departments-edit-' + id) {
    try { history.replaceState(null, '', '#departments-edit-' + id); } catch (_) {}
  }
};

window.viewDept = function(id) {
  const db = loadDB();
  const d = db.departments.find(x => x.id === id);
  if (!d) return;
  const users = db.users.filter(u => u.departmentId === id);
  const userBadges = users.length
    ? users.map(u => `<span class="badge">${u.username} (${roleName(u.roleId)})</span>`).join(' ')
    : '<span class="muted small">No users in this department</span>';

  $('deptDetailActions').innerHTML = hasPerm('departments', 'update')
    ? `<button class="btn warn sm" onclick="editDept('${d.id}')">✏️ Edit Department</button>` : '';

  $('deptDetailContent').innerHTML = `
    <div class="detail-layout-split">
      <div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Department Overview</h4>
            <span class="badge">${escapeHtml(d.name)}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Department Name</span>
              <span class="detail-val"><b>${escapeHtml(d.name)}</b></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Head of Department</span>
              <span class="detail-val"><b>${escapeHtml(d.head || 'Not Assigned')}</b></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Department ID</span>
              <span class="detail-val"><code>${d.id}</code></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Total Assigned Members</span>
              <span class="detail-val">${users.length} user(s)</span>
            </div>
          </div>
          <div class="mt">
            <span class="detail-label">Department Members:</span>
            <div class="mt-2">${userBadges}</div>
          </div>
        </div>
      </div>
      <div class="side-col">
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🏢 Department Metric</h4>
            <span class="badge">${users.length} Active</span>
          </div>
          <p class="muted small">Organizational unit for employee segregation and project governance.</p>
        </div>
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🕒 Recent Activity</h4>
          </div>
          ${renderSideAudit('Departments', d.name)}
        </div>
      </div>
    </div>
  `;
  setModuleView('departments', 'detail');
};
window.deleteDept = function (id) {
  if (!hasPerm('departments', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const d = db.departments.find(x => x.id === id);
  if (d && d.name === 'Admin') return showAlert('The Admin department cannot be deleted');
  if (db.users.some(u => u.departmentId === id)) return showAlert('This department has users. Please change their department first.');
  askConfirm(`Delete department "${d.name}"?`).then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    db2.departments = db2.departments.filter(x => x.id !== id);
    saveDB(db2);
    logAudit('Departments', 'delete', d.name, d.name, '—');
    renderDepartments(); renderUsers(); renderDashboard(); renderAudit();
    toast('Department deleted');
  });
};

// ---------- CATEGORIES (N-Level) ----------
function catPath(id) {
  const db = loadDB();
  const names = [];
  let cur = db.categories.find(c => c.id === id);
  let guard = 0;
  while (cur && guard++ < 50) {
    names.unshift(cur.name);
    cur = db.categories.find(c => c.id === cur.parentId);
  }
  return names.join(' › ');
}
function renderCatParentDropdown(selectId, excludeId) {
  const db = loadDB();
  let html = `<option value="">-- Root (Top Level) --</option>`;
  db.categories.forEach(c => {
    if (c.id === excludeId) return;
    html += `<option value="${c.id}">${catPath(c.id)}</option>`;
  });
  $(selectId).innerHTML = html;
}
const collapsedCatIds = new Set();
window.toggleCatCollapse = function(id, e) {
  if (e) e.stopPropagation();
  if (collapsedCatIds.has(id)) {
    collapsedCatIds.delete(id);
  } else {
    collapsedCatIds.add(id);
  }
  renderCategories();
};

function renderCategories() {
  const db = loadDB();
  if (!$('catId').value) renderCatParentDropdown('catParent');
  const cq = ($('catSearch').value || '').toLowerCase().trim();
  // search mode: flat matches with full path
  if (cq) {
    const matches = db.categories.filter(c =>
      c.name.toLowerCase().includes(cq) || catPath(c.id).toLowerCase().includes(cq));
    $('catTree').innerHTML = matches.length ? matches.map(c => {
      const viewBtn = `<button class="btn btn-act-view sm" onclick="viewCat('${c.id}')">👁️ View</button>`;
      const editBtn = hasPerm('categories', 'update') ? `<button class="btn warn sm" onclick="editCat('${c.id}')">✏️ Edit</button>` : '';
      const subBtn = hasPerm('categories', 'add') ? `<button class="btn primary sm" onclick="openCreateCat('${c.id}')">+ Sub</button>` : '';
      const delBtn = hasPerm('categories', 'delete') ? `<button class="btn danger sm" onclick="deleteCat('${c.id}')">🗑️ Delete</button>` : '';
      return `<div class="tree-item">
        <span class="tree-label-wrap">
          <span class="tree-folder-icon">📂</span>
          <div>
            <b>${escapeHtml(c.name)}</b>
            <div class="muted small">${escapeHtml(catPath(c.id))}</div>
          </div>
        </span>
        <span class="tree-actions">${viewBtn}${subBtn}${editBtn}${delBtn}</span>
      </div>`;
    }).join('') : '<p class="muted">No matches found.</p>';
    return;
  }
  // tree
  $('catTree').innerHTML = db.categories.length ? buildCatTree(null, 0) : '<p class="muted">No categories yet. Click "Add Top-Level Category" above.</p>';

  function buildCatTree(parentId, depth) {
    return db.categories.filter(c => (c.parentId || null) === (parentId || null)).map(c => {
      const children = db.categories.filter(x => x.parentId === c.id);
      const childCount = children.length;
      const isCollapsed = collapsedCatIds.has(c.id);
      const viewBtn = `<button class="btn btn-act-view sm" onclick="viewCat('${c.id}')">👁️ View</button>`;
      const editBtn = hasPerm('categories', 'update') ? `<button class="btn warn sm" onclick="editCat('${c.id}')">✏️ Edit</button>` : '';
      const subBtn = hasPerm('categories', 'add') ? `<button class="btn primary sm" onclick="openCreateCat('${c.id}')">+ Sub</button>` : '';
      const delBtn = hasPerm('categories', 'delete') ? `<button class="btn danger sm" onclick="deleteCat('${c.id}')">🗑️ Delete</button>` : '';

      const toggleBtn = childCount > 0
        ? `<button type="button" class="btn-tree-toggle" onclick="toggleCatCollapse('${c.id}', event)" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▸' : '▾'}</button>`
        : `<span class="btn-tree-toggle-placeholder"></span>`;
      const folderIcon = childCount > 0 ? (isCollapsed ? '📁' : '📂') : '📄';

      const rowHtml = `<div class="tree-item" style="margin-left:${depth * 24}px">
        <span class="tree-label-wrap">
          ${toggleBtn}
          <span class="tree-folder-icon">${folderIcon}</span>
          <b>${escapeHtml(c.name)}</b>
          <span class="muted small">${childCount ? '(' + childCount + ' sub)' : ''}</span>
        </span>
        <span class="tree-actions">${viewBtn}${subBtn}${editBtn}${delBtn}</span>
      </div>`;

      const childrenHtml = (!isCollapsed && childCount > 0) ? buildCatTree(c.id, depth + 1) : '';
      return rowHtml + childrenHtml;
    }).join('');
  }
}

window.openCreateCat = function(parentId) {
  if (!hasPerm('categories', 'add')) return showAlert('You do not have add permission');
  resetForm('catForm', 'catFormTitle', parentId ? ('Add Sub-Category of: ' + catPath(parentId)) : 'Add Category');
  renderCatParentDropdown('catParent');
  if (parentId) $('catParent').value = parentId;
  $('catCancel').classList.remove('hidden');
  restoreFormDraft('catForm');
  if (parentId && !$('catParent').value) $('catParent').value = parentId;
  setModuleView('categories', 'form');
  saveLastNav({ type: 'page', page: 'categories', view: 'form', mode: 'add', parentId: parentId || null });
  if (window.location.hash !== '#categories-add') {
    try { history.replaceState(null, '', '#categories-add'); } catch (_) {}
  }
};

window.subCat = function (id) {
  openCreateCat(id);
};

window.editCat = function (id) {
  const db = loadDB();
  const c = db.categories.find(x => x.id === id);
  if (!c) return;
  $('catId').value = c.id; $('catName').value = c.name;
  renderCatParentDropdown('catParent', id);
  $('catParent').value = c.parentId || '';
  restoreFormDraft('catForm');
  $('catId').value = c.id;
  $('catFormTitle').textContent = 'Edit Category';
  $('catCancel').classList.remove('hidden');
  setModuleView('categories', 'form');
  saveLastNav({ type: 'page', page: 'categories', view: 'form', mode: 'edit', editId: id });
  if (window.location.hash !== '#categories-edit-' + id) {
    try { history.replaceState(null, '', '#categories-edit-' + id); } catch (_) {}
  }
};

window.viewCat = function(id) {
  const db = loadDB();
  const c = db.categories.find(x => x.id === id);
  if (!c) return;
  const parent = c.parentId ? db.categories.find(x => x.id === c.parentId) : null;
  const subs = db.categories.filter(x => x.parentId === id);
  const projs = db.projects.filter(p => (p.categoryIds || []).includes(id));
  const docs = (db.documents || []).filter(d => d.categoryId === id);

  $('catDetailActions').innerHTML =
    (hasPerm('categories', 'add') ? `<button class="btn primary sm" onclick="openCreateCat('${c.id}')">➕ Add Sub</button>` : '') +
    (hasPerm('categories', 'update') ? `<button class="btn warn sm" onclick="editCat('${c.id}')">✏️ Edit Category</button>` : '');

  $('catDetailContent').innerHTML = `
    <div class="detail-layout-split">
      <div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Category Details</h4>
            <span class="badge">N-Level</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Category Name</span>
              <span class="detail-val"><b>${escapeHtml(c.name)}</b></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Hierarchy Path</span>
              <span class="detail-val">${escapeHtml(catPath(c.id))}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Parent Category</span>
              <span class="detail-val">${parent ? escapeHtml(parent.name) : 'Root (Top Level)'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Direct Sub-Categories</span>
              <span class="detail-val">${subs.length} sub-category(ies)</span>
            </div>
          </div>
        </div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Linked Resources</h4>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Linked Projects (${projs.length})</span>
              <div class="detail-val mt-2">${projs.map(p => `<span class="badge">${escapeHtml(p.name)}</span>`).join(' ') || '<span class="muted small">None</span>'}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">Linked Documents (${docs.length})</span>
              <div class="detail-val mt-2">${docs.map(d => `<span class="badge">${escapeHtml(d.title)}</span>`).join(' ') || '<span class="muted small">None</span>'}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="side-col">
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🌳 Category Path</h4>
          </div>
          <p class="muted small"><b>Breadcrumb:</b><br>${escapeHtml(catPath(c.id))}</p>
        </div>
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🕒 Recent Activity</h4>
          </div>
          ${renderSideAudit('Categories', c.name)}
        </div>
      </div>
    </div>
  `;
  setModuleView('categories', 'detail');
};
window.deleteCat = function (id) {
  if (!hasPerm('categories', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const toDelete = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    db.categories.forEach(c => {
      if (c.parentId && toDelete.has(c.parentId) && !toDelete.has(c.id)) { toDelete.add(c.id); changed = true; }
    });
  }
  const targetCat = db.categories.find(c => c.id === id);
  const targetLabel = targetCat ? catPath(id) : 'Category';
  const targetSummary = targetCat ? summarize('categories', targetCat) : '—';
  const subCount = toDelete.size - 1;
  const confirmMsg = subCount > 0
    ? `Category "${targetCat ? targetCat.name : ''}" has ${subCount} sub-category(ies). Deleting it will permanently remove all of them. Are you sure you want to proceed?`
    : `Delete category "${targetCat ? targetCat.name : ''}"?`;

  askConfirm(confirmMsg, 'Yes, delete all').then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    db2.categories = db2.categories.filter(c => !toDelete.has(c.id));
    // also remove from projects
    db2.projects.forEach(p => p.categoryIds = (p.categoryIds || []).filter(cid => !toDelete.has(cid)));
    // clear category on linked documents
    (db2.documents || []).forEach(d => { if (d.categoryId && toDelete.has(d.categoryId)) d.categoryId = null; });
    saveDB(db2);
    logAudit('Categories', 'delete', targetLabel, targetSummary, '—');
    renderCategories(); renderProjects(); renderDocuments(); renderDashboard(); renderAudit();
    toast('Category deleted');
  });
};

// ---------- PROJECTS ----------
function updateProjCatTags() {
  const container = $('projCatTags');
  if (!container) return;
  const checked = [...document.querySelectorAll('#projCatBox input[type="checkbox"]:checked')];
  if (!checked.length) {
    container.innerHTML = '<span class="muted small" style="display:inline-block;padding:4px 0;">No categories selected yet. Check boxes below.</span>';
    return;
  }
  container.innerHTML = checked.map(cb => {
    const id = cb.value;
    const path = catPath(id);
    return `<span class="cat-tag-chip" data-id="${id}">
      <span>🏷️ ${escapeHtml(path)}</span>
      <button type="button" class="cat-tag-remove" onclick="removeProjCat('${id}')" title="Remove tag">✕</button>
    </span>`;
  }).join('');
}

window.removeProjCat = function(id) {
  const cb = document.querySelector(`#projCatBox input[value="${id}"]`);
  if (cb) {
    cb.checked = false;
    updateProjCatTags();
  }
};

function updateProjDescCount() {
  if (!$('projDesc') || !$('projDescCount')) return;
  const len = $('projDesc').value.length;
  $('projDescCount').textContent = `${len}/250`;
}

function renderProjCatBox(checkedIds) {
  checkedIds = checkedIds || [];
  const db = loadDB();
  const box = $('projCatBox');
  if (!box) return;
  if (!db.categories.length) {
    box.innerHTML = '<p class="muted small">Create a category on the Category page first.</p>';
    if ($('projCatTags')) $('projCatTags').innerHTML = '';
    return;
  }
  box.innerHTML = db.categories.map(c => {
    const path = catPath(c.id);
    return `<label class="proj-cat-item" data-name="${escapeHtml(path.toLowerCase())}">
      <input type="checkbox" value="${c.id}" ${checkedIds.includes(c.id) ? 'checked' : ''} onchange="updateProjCatTags()">
      <span>${escapeHtml(path)}</span>
    </label>`;
  }).join('');
  updateProjCatTags();
}
function renderProjFilterCat() {
  const db = loadDB();
  const cur = $('projFilterCat').value;
  $('projFilterCat').innerHTML = '<option value="">All Categories</option>' +
    (db.categories || []).map(c => `<option value="${c.id}">${escapeHtml(catPath(c.id))}</option>`).join('');
  if ([...$('projFilterCat').options].some(o => o.value === cur)) $('projFilterCat').value = cur;
}
function renderProjects() {
  const db = loadDB();
  if ($('projId') && !$('projId').value) renderProjCatBox([]);
  renderProjFilterCat();
  const pq = ($('projSearch') && $('projSearch').value || '').toLowerCase().trim();
  const fc = ($('projFilterCat') && $('projFilterCat').value) || '';

  let allowed = null;
  if (fc) {
    allowed = new Set([fc]);
    let changed = true;
    while (changed) {
      changed = false;
      db.categories.forEach(c => {
        if (c.parentId && allowed.has(c.parentId) && !allowed.has(c.id)) { allowed.add(c.id); changed = true; }
      });
    }
  }

  const plist = (db.projects || []).filter(p => {
    if (allowed && !(p.categoryIds || []).some(id => allowed.has(id))) return false;
    return true;
  });

  const columnDefs = [
    {
      headerName: 'Actions',
      field: 'id',
      pinned: 'left',
      lockPinned: true,
      width: 215,
      minWidth: 205,
      maxWidth: 245,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params) => {
        const p = params.data;
        if (!p) return '';
        const viewBtn = `<button type="button" class="btn btn-act-view sm" onclick="viewProj('${p.id}')" title="View Project">👁️ View</button>`;
        const editBtn = hasPerm('projects', 'update') ? `<button type="button" class="btn warn sm" onclick="editProj('${p.id}')" title="Edit Project">✏️ Edit</button>` : '';
        const delBtn = hasPerm('projects', 'delete') ? `<button type="button" class="btn danger sm" onclick="deleteProj('${p.id}')" title="Delete Project">🗑️ Del</button>` : '';
        return `<div class="grid-actions-cell">${viewBtn}${editBtn}${delBtn}</div>`;
      }
    },
    {
      headerName: 'Project Name',
      field: 'name',
      minWidth: 180,
      cellRenderer: (params) => `<b>${escapeHtml(params.value || '')}</b>`
    },
    {
      headerName: 'Description',
      field: 'description',
      minWidth: 200,
      flex: 1.5,
      cellRenderer: (params) => escapeHtml(params.value || '—')
    },
    {
      headerName: 'Categories',
      field: 'categoryBadges',
      minWidth: 180,
      cellRenderer: (params) => params.value || '—'
    },
    {
      headerName: 'Documents',
      field: 'docCount',
      width: 130,
      cellRenderer: (params) => `<span class="badge">${params.value || 0} doc(s)</span>`
    }
  ];

  const rowData = plist.map(p => {
    const badges = (p.categoryIds || []).map(cid => `<span class="badge">${escapeHtml(catPath(cid) || '?')}</span>`).join(' ') || '—';
    const docCount = (db.documents || []).filter(d => d.projectId === p.id).length;
    return {
      ...p,
      categoryBadges: badges,
      docCount: docCount
    };
  });

  initOrUpdateAGGrid('projects', 'projectsGrid', columnDefs, rowData, {
    quickFilterText: pq
  });
}

window.openCreateProj = function() {
  if (!hasPerm('projects', 'add')) return showAlert('You do not have add permission');
  resetForm('projForm', 'projFormTitle', 'Add Project');
  renderProjCatBox([]);
  if ($('projCatSearchInput')) $('projCatSearchInput').value = '';
  $('projCancel').classList.remove('hidden');
  restoreFormDraft('projForm');
  updateProjDescCount();
  setModuleView('projects', 'form');
  saveLastNav({ type: 'page', page: 'projects', view: 'form', mode: 'add' });
  if (window.location.hash !== '#projects-add') {
    try { history.replaceState(null, '', '#projects-add'); } catch (_) {}
  }
};

window.editProj = function (id) {
  const db = loadDB();
  const p = db.projects.find(x => x.id === id);
  if (!p) return;
  $('projId').value = p.id; $('projName').value = p.name; $('projDesc').value = p.description || '';
  renderProjCatBox(p.categoryIds || []);
  if ($('projCatSearchInput')) $('projCatSearchInput').value = '';
  restoreFormDraft('projForm');
  $('projId').value = p.id;
  updateProjDescCount();
  $('projFormTitle').textContent = 'Edit Project';
  $('projCancel').classList.remove('hidden');
  setModuleView('projects', 'form');
  saveLastNav({ type: 'page', page: 'projects', view: 'form', mode: 'edit', editId: id });
  if (window.location.hash !== '#projects-edit-' + id) {
    try { history.replaceState(null, '', '#projects-edit-' + id); } catch (_) {}
  }
};

window.viewProj = function(id) {
  const db = loadDB();
  const p = db.projects.find(x => x.id === id);
  if (!p) return;
  const catBadges = (p.categoryIds || []).map(cid => `<span class="badge">${catPath(cid)}</span>`).join(' ') || '—';
  const docs = (db.documents || []).filter(d => d.projectId === id);

  $('projDetailActions').innerHTML = hasPerm('projects', 'update')
    ? `<button class="btn warn sm" onclick="editProj('${p.id}')">✏️ Edit Project</button>` : '';

  $('projDetailContent').innerHTML = `
    <div class="detail-layout-split">
      <div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Project Overview</h4>
            <span class="badge">${p.name}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Project Name</span>
              <span class="detail-val"><b>${p.name}</b></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Project ID</span>
              <span class="detail-val"><code>${p.id}</code></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Description</span>
              <span class="detail-val">${p.description || 'No description provided.'}</span>
            </div>
          </div>
          <div class="mt">
            <span class="detail-label">Assigned Categories:</span>
            <div class="mt-2">${catBadges}</div>
          </div>
        </div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Associated Documents (${docs.length})</h4>
          </div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Title</th><th>File</th><th>Version</th><th>Actions</th></tr></thead>
              <tbody>${docs.length ? docs.map(d => `<tr><td><b>${d.title}</b></td><td>${d.fileName || '—'}</td><td><span class="badge">v${d.currentVersion || 0}</span></td><td><button class="btn btn-act-view sm" onclick="viewDoc('${d.id}')">View</button></td></tr>`).join('') : '<tr><td colspan="4" class="muted">No documents linked to this project yet.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="side-col">
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>📁 Project Metrics</h4>
            <span class="badge success">Active</span>
          </div>
          <p class="muted small">${docs.length} linked document(s), ${(p.categoryIds || []).length} assigned category tags.</p>
        </div>
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🕒 Recent Activity</h4>
          </div>
          ${renderSideAudit('Projects', p.name)}
        </div>
      </div>
    </div>
  `;
  setModuleView('projects', 'detail');
};
window.deleteProj = function (id) {
  if (!hasPerm('projects', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const delProj = db.projects.find(x => x.id === id);
  askConfirm(`Delete project "${delProj ? delProj.name : ''}"?`).then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    db2.projects = db2.projects.filter(x => x.id !== id);
    (db2.documents || []).forEach(d => { if (d.projectId === id) d.projectId = null; });
    saveDB(db2);
    logAudit('Projects', 'delete', delProj ? delProj.name : 'Project', delProj ? summarize('projects', delProj) : '—', '—');
    renderProjects(); renderDocuments(); renderDashboard(); renderAudit();
    toast('Project deleted');
  });
};

// ---------- DOCUMENTS ----------
let pendingDocFile = null; // { name, type, data }
function projectName(id) {
  if (!id) return '—';
  const db = loadDB();
  const p = (db.projects || []).find(x => x.id === id);
  return p ? p.name : '—';
}
function renderDocDropdowns(selCat, selProj) {
  const db = loadDB();
  $('docCategory').innerHTML = `<option value="">-- No Category --</option>` +
    (db.categories || []).map(c => `<option value="${c.id}" ${c.id === selCat ? 'selected' : ''}>${catPath(c.id)}</option>`).join('');
  $('docProject').innerHTML = `<option value="">-- No Project --</option>` +
    (db.projects || []).map(p => `<option value="${p.id}" ${p.id === selProj ? 'selected' : ''}>${p.name}</option>`).join('');
}
function renderDocuments() {
  const db = loadDB();
  renderDocDropdowns($('docId').value ? $('docCategory').value : null, $('docId').value ? $('docProject').value : null);
  const q = ($('docSearch') && $('docSearch').value || '').toLowerCase().trim();
  const canAdd = hasPerm('documents', 'add'), canUpdate = hasPerm('documents', 'update');
  if ($('docForm')) {
    const btn = $('docForm').querySelector('button[type=submit]');
    if (btn) btn.disabled = !(canAdd || canUpdate);
  }

  const columnDefs = [
    {
      headerName: 'Actions',
      field: 'id',
      pinned: 'left',
      lockPinned: true,
      width: 215,
      minWidth: 205,
      maxWidth: 250,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params) => {
        const d = params.data;
        if (!d) return '';
        const viewBtn = `<button type="button" class="btn btn-act-view sm" onclick="viewDoc('${d.id}')" title="View Document">👁️ View</button>`;
        const histBtn = `<button type="button" class="btn sm" onclick="openVersions('${d.id}')" title="Version History">⏱️</button>`;
        const editBtn = hasPerm('documents', 'update') ? `<button type="button" class="btn warn sm" onclick="editDoc('${d.id}')" title="Edit Document">✏️</button>` : '';
        const delBtn = hasPerm('documents', 'delete') ? `<button type="button" class="btn danger sm" onclick="deleteDoc('${d.id}')" title="Delete Document">🗑️</button>` : '';
        return `<div class="grid-actions-cell">${viewBtn}${histBtn}${editBtn}${delBtn}</div>`;
      }
    },
    {
      headerName: 'Document Title',
      field: 'title',
      minWidth: 200,
      flex: 1.5,
      cellRenderer: (params) => {
        const d = params.data;
        return `<div><b>${escapeHtml(d.title || '')}</b>${d.description ? `<div class="muted small">${escapeHtml(d.description)}</div>` : ''}</div>`;
      }
    },
    {
      headerName: 'Category',
      field: 'categoryName',
      minWidth: 140,
      cellRenderer: (params) => escapeHtml(params.value || '—')
    },
    {
      headerName: 'Project',
      field: 'projectName',
      minWidth: 140,
      cellRenderer: (params) => escapeHtml(params.value || '—')
    },
    {
      headerName: 'File',
      field: 'fileCell',
      minWidth: 140,
      cellRenderer: (params) => params.value || '—'
    },
    {
      headerName: 'Version',
      field: 'currentVersion',
      width: 100,
      cellRenderer: (params) => `<span class="badge">v${params.value || 0}</span>`
    },
    {
      headerName: 'Uploaded Date',
      field: 'dateFormatted',
      width: 130
    }
  ];

  const rowData = (db.documents || []).map(d => {
    const fileCell = d.fileData
      ? `<a href="${d.fileData}" download="${escapeHtml(d.fileName || 'file')}">⬇ ${escapeHtml(d.fileName || 'Download')}</a>`
      : escapeHtml(d.fileName || '—');
    return {
      ...d,
      categoryName: d.categoryId ? catPath(d.categoryId) : '—',
      projectName: projectName(d.projectId),
      fileCell: fileCell,
      dateFormatted: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : '—'
    };
  });

  initOrUpdateAGGrid('documents', 'documentsGrid', columnDefs, rowData, {
    quickFilterText: q
  });
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showDocFilePreview(fileName, fileSizeStr) {
  if ($('docDropZone')) $('docDropZone').classList.add('hidden');
  if ($('docFilePreview')) {
    $('docFilePreview').classList.remove('hidden');
    if ($('docFileName')) $('docFileName').textContent = fileName;
    if ($('docFileSize')) $('docFileSize').textContent = fileSizeStr || '';
  }
}

function resetDocFileUpload() {
  pendingDocFile = null;
  if ($('docFile')) $('docFile').value = '';
  if ($('docFilePreview')) $('docFilePreview').classList.add('hidden');
  if ($('docDropZone')) $('docDropZone').classList.remove('hidden');
  if ($('docFileHint')) $('docFileHint').textContent = '';
}

function handleDocFileSelection(file) {
  if (!file) {
    resetDocFileUpload();
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showAlert('Files must be under 2MB (Offline LocalStorage limit)');
    resetDocFileUpload();
    return;
  }
  const rd = new FileReader();
  rd.onload = () => {
    pendingDocFile = { name: file.name, type: file.type, data: rd.result };
    showDocFilePreview(file.name, formatFileSize(file.size));
    if ($('docFileHint')) $('docFileHint').textContent = 'Selected: ' + file.name;
  };
  rd.readAsDataURL(file);
}

window.openCreateDoc = function() {
  if (!hasPerm('documents', 'add')) return showAlert('You do not have add permission');
  resetForm('docForm', 'docFormTitle', 'Add Document');
  renderDocDropdowns(null, null);
  resetDocFileUpload();
  $('docCancel').classList.remove('hidden');
  restoreFormDraft('docForm');
  setModuleView('documents', 'form');
  saveLastNav({ type: 'page', page: 'documents', view: 'form', mode: 'add' });
  if (window.location.hash !== '#documents-add') {
    try { history.replaceState(null, '', '#documents-add'); } catch (_) {}
  }
};

window.editDoc = function (id) {
  const db = loadDB();
  const d = (db.documents || []).find(x => x.id === id);
  if (!d) return;
  $('docId').value = d.id; $('docTitle').value = d.title || '';
  $('docDesc').value = d.description || '';
  renderDocDropdowns(d.categoryId, d.projectId);
  pendingDocFile = null;
  if ($('docFile')) $('docFile').value = '';
  if (d.fileName) {
    showDocFilePreview(d.fileName, `v${d.currentVersion || 1} • (Click ✕ to replace)`);
    $('docFileHint').textContent = 'Current file: ' + d.fileName + ' (remove or select a new file to replace it)';
  } else {
    resetDocFileUpload();
  }
  restoreFormDraft('docForm');
  $('docId').value = d.id;
  $('docFormTitle').textContent = 'Edit Document';
  $('docCancel').classList.remove('hidden');
  setModuleView('documents', 'form');
  saveLastNav({ type: 'page', page: 'documents', view: 'form', mode: 'edit', editId: id });
  if (window.location.hash !== '#documents-edit-' + id) {
    try { history.replaceState(null, '', '#documents-edit-' + id); } catch (_) {}
  }
};

window.viewDoc = function(id) {
  const db = loadDB();
  const d = (db.documents || []).find(x => x.id === id);
  if (!d) return;
  const cat = d.categoryId ? catPath(d.categoryId) : '—';
  const proj = projectName(d.projectId);
  const vers = d.versions || [];
  const date = d.createdAt ? new Date(d.createdAt).toLocaleString('en-IN') : '—';
  const downloadLink = d.fileData
    ? `<a href="${d.fileData}" download="${d.fileName || 'file'}" class="btn primary sm">⬇ Download (${d.fileName})</a>`
    : '<span class="muted">No file uploaded</span>';

  $('docDetailActions').innerHTML =
    `<button class="btn secondary sm" onclick="openVersions('${d.id}')">🕒 Versions (${vers.length})</button>` +
    (hasPerm('documents', 'update') ? `<button class="btn warn sm" onclick="editDoc('${d.id}')">✏️ Edit Document</button>` : '');

  $('docDetailContent').innerHTML = `
    <div class="detail-layout-split">
      <div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Document Details</h4>
            <span class="badge">v${d.currentVersion || 0}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Title</span>
              <span class="detail-val"><b>${d.title}</b></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Category</span>
              <span class="detail-val">${cat}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Project</span>
              <span class="detail-val">${proj}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Uploaded At</span>
              <span class="detail-val">${date}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Current File</span>
              <div class="detail-val">${downloadLink}</div>
            </div>
            <div class="detail-item">
              <span class="detail-label">Description</span>
              <span class="detail-val">${d.description || 'No description provided.'}</span>
            </div>
          </div>
        </div>
        <div class="detail-card">
          <div class="detail-card-header">
            <h4>Version History (${vers.length} versions)</h4>
          </div>
          <div class="table-responsive">
            <table>
              <thead><tr><th>Version</th><th>File Name</th><th>Size</th><th>Uploaded Date</th><th>Actions</th></tr></thead>
              <tbody>${vers.length ? vers.map(v => `<tr><td><span class="badge ${v.v === d.currentVersion ? 'badge-cur' : ''}">v${v.v}${v.v === d.currentVersion ? ' (Current)' : ''}</span></td><td>${v.fileName}</td><td>${fileSizeKB(v.fileData)}</td><td>${v.uploadedAt ? new Date(v.uploadedAt).toLocaleString('en-IN') : '—'}</td><td><button class="btn primary sm" onclick="downloadVersion('${d.id}', ${v.v})">Download</button></td></tr>`).join('') : '<tr><td colspan="5" class="muted">No version history yet.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="side-col">
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>📄 File Info</h4>
            <span class="badge">v${d.currentVersion || 0}</span>
          </div>
          <p class="muted small"><b>Filename:</b> ${d.fileName || 'None'}<br><b>Revisions:</b> ${vers.length} stored</p>
        </div>
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>🕒 Recent Activity</h4>
          </div>
          ${renderSideAudit('Documents', d.title)}
        </div>
      </div>
    </div>
  `;
  setModuleView('documents', 'detail');
};
window.deleteDoc = function (id) {
  if (!hasPerm('documents', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const delDoc = (db.documents || []).find(x => x.id === id);
  askConfirm(`Delete document "${delDoc ? delDoc.title : ''}"?`).then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    db2.documents = (db2.documents || []).filter(x => x.id !== id);
    saveDB(db2);
    logAudit('Documents', 'delete', delDoc ? delDoc.title : 'Document', delDoc ? summarize('documents', delDoc) : '—', '—');
    renderDocuments(); renderDashboard(); renderAudit();
    toast('Document deleted');
  });
};

// ---------- DOCUMENT VERSIONS ----------
let openVersionsDocId = null;
function fileSizeKB(dataURL) {
  if (!dataURL) return '';
  const bytes = Math.round((dataURL.length * 3) / 4);
  return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}
window.openVersions = function (id) {
  openVersionsDocId = id;
  renderVersions();
  $('versionsModal').classList.remove('hidden');
};
function closeVersions() { $('versionsModal').classList.add('hidden'); openVersionsDocId = null; }
function renderVersions() {
  const db = loadDB();
  const d = (db.documents || []).find(x => x.id === openVersionsDocId);
  if (!d) { $('versionsList').innerHTML = '<p class="muted">Document not found.</p>'; return; }
  $('versionsTitle').textContent = 'Versions: ' + (d.title || '');
  const vers = [...(d.versions || [])].sort((a, b) => b.v - a.v);
  $('versionsList').innerHTML = vers.length ? vers.map(ver => {
    const isCur = ver.v === d.currentVersion;
    const date = ver.uploadedAt ? new Date(ver.uploadedAt).toLocaleString('en-IN') : '—';
    const dlBtn = `<button class="btn primary sm" onclick="downloadVersion('${d.id}',${ver.v})">Download</button>`;
    const reBtn = (!isCur && hasPerm('documents', 'update')) ? `<button class="btn warn sm" onclick="restoreVersion('${d.id}',${ver.v})">Restore</button>` : '';
    const delBtn = (hasPerm('documents', 'delete') && vers.length > 1) ? `<button class="btn danger sm" onclick="deleteVersion('${d.id}',${ver.v})">Delete</button>` : '';
    return `<div class="ver-item"><span class="ver-info"><span class="ver-badge ${isCur ? 'current' : ''}">v${ver.v}${isCur ? ' • current' : ''}</span><b>${ver.fileName || 'file'}</b> <span class="muted small">${fileSizeKB(ver.fileData)} • ${date}</span></span><span class="tree-actions">${dlBtn}${reBtn}${delBtn}</span></div>`;
  }).join('') : '<p class="muted">No file versions yet. Edit the document and upload a file.</p>';
}
window.downloadVersion = function (docId, v) {
  const db = loadDB();
  const d = (db.documents || []).find(x => x.id === docId);
  const ver = d && (d.versions || []).find(x => x.v === v);
  if (!ver || !ver.fileData) return showAlert('File data not found');
  const a = document.createElement('a');
  a.href = ver.fileData; a.download = ver.fileName || 'file';
  document.body.appendChild(a); a.click(); a.remove();
};
window.restoreVersion = function (docId, v) {
  if (!hasPerm('documents', 'update')) return showAlert('You do not have update permission');
  const db = loadDB();
  const d = (db.documents || []).find(x => x.id === docId);
  const ver = d && (d.versions || []).find(x => x.v === v);
  if (!ver) return;
  d.fileName = ver.fileName; d.fileData = ver.fileData; d.fileType = ver.fileType;
  const oldV = d.currentVersion;
  d.currentVersion = ver.v;
  saveDB(db);
  logAudit('Documents', 'update', d.title, `${d.title} (v${oldV || 0})`, `${d.title} (v${ver.v}, restored)`);
  renderVersions(); renderDocuments(); renderAudit();
  toast('Version restored');
};
window.deleteVersion = function (docId, v) {
  if (!hasPerm('documents', 'delete')) return showAlert('You do not have delete permission');
  askConfirm(`Delete version v${v}?`).then(ok => {
    if (!ok) return;
    const db = loadDB();
    const d = (db.documents || []).find(x => x.id === docId);
    if (!d) return;
    d.versions = (d.versions || []).filter(x => x.v !== v);
    if (d.currentVersion === v) {
      if (d.versions.length) {
        const latest = d.versions.reduce((a, b) => (a.v > b.v ? a : b));
        d.fileName = latest.fileName; d.fileData = latest.fileData; d.fileType = latest.fileType;
        d.currentVersion = latest.v;
      } else { d.fileName = ''; d.fileData = ''; d.fileType = ''; d.currentVersion = 0; }
    }
    saveDB(db); renderVersions(); renderDocuments();
    toast('Version deleted');
  });
};

// ---------- MENUS (DYNAMIC BUILDER & ROLE MAPPING) ----------
const FA_ICONS = [
  // Analytics & Charts
  { cls: 'fa-solid fa-chart-line', name: 'Line Chart', cat: 'analytics', tags: 'chart analytics graph trend' },
  { cls: 'fa-solid fa-chart-pie', name: 'Pie Chart', cat: 'analytics', tags: 'pie chart analytics circle stats' },
  { cls: 'fa-solid fa-chart-column', name: 'Bar Chart', cat: 'analytics', tags: 'column bar chart stats' },
  { cls: 'fa-solid fa-chart-area', name: 'Area Chart', cat: 'analytics', tags: 'area chart stats report' },
  { cls: 'fa-solid fa-gauge-high', name: 'Dashboard / KPI', cat: 'analytics', tags: 'gauge speedometer dashboard kpi speed' },
  { cls: 'fa-solid fa-magnifying-glass-chart', name: 'Analysis', cat: 'analytics', tags: 'analytics search inspect audit' },
  { cls: 'fa-solid fa-arrow-trend-up', name: 'Growth', cat: 'analytics', tags: 'trend growth profit increase' },

  // Business & Commerce
  { cls: 'fa-solid fa-briefcase', name: 'Briefcase', cat: 'business', tags: 'business job work office' },
  { cls: 'fa-solid fa-building', name: 'Enterprise', cat: 'business', tags: 'building enterprise company org' },
  { cls: 'fa-solid fa-wallet', name: 'Wallet', cat: 'business', tags: 'wallet money payment finance' },
  { cls: 'fa-solid fa-credit-card', name: 'Credit Card', cat: 'business', tags: 'card credit debit payment banking' },
  { cls: 'fa-solid fa-money-bill-wave', name: 'Billing', cat: 'business', tags: 'cash currency money payment bill' },
  { cls: 'fa-solid fa-receipt', name: 'Receipt / Invoices', cat: 'business', tags: 'receipt invoice billing tax checkout' },
  { cls: 'fa-solid fa-cart-shopping', name: 'Cart / Orders', cat: 'business', tags: 'shopping cart store commerce order' },
  { cls: 'fa-solid fa-boxes-stacked', name: 'Inventory', cat: 'business', tags: 'inventory stock warehouse box storage' },
  { cls: 'fa-solid fa-truck-fast', name: 'Logistics', cat: 'business', tags: 'truck shipping delivery logistics' },
  { cls: 'fa-solid fa-calculator', name: 'Accounting', cat: 'business', tags: 'calculator math finance tax accounting' },
  { cls: 'fa-solid fa-sack-dollar', name: 'Revenue', cat: 'business', tags: 'money profit dollar wealth fund' },
  { cls: 'fa-solid fa-store', name: 'Storefront', cat: 'business', tags: 'shop store retail commerce' },

  // Users & Security
  { cls: 'fa-solid fa-users', name: 'Users', cat: 'users', tags: 'users group team people staff members' },
  { cls: 'fa-solid fa-user-tie', name: 'Executive', cat: 'users', tags: 'executive manager boss tie admin' },
  { cls: 'fa-solid fa-user-shield', name: 'Security Admin', cat: 'users', tags: 'security admin role permission' },
  { cls: 'fa-solid fa-shield-halved', name: 'Roles & Perms', cat: 'users', tags: 'shield role security protect auth' },
  { cls: 'fa-solid fa-lock', name: 'Lock / Access', cat: 'users', tags: 'lock security private password' },
  { cls: 'fa-solid fa-key', name: 'API Keys', cat: 'users', tags: 'key auth credentials password access' },
  { cls: 'fa-solid fa-fingerprint', name: 'Biometric / Auth', cat: 'users', tags: 'fingerprint identity login auth 2fa' },
  { cls: 'fa-solid fa-address-card', name: 'Profiles', cat: 'users', tags: 'card profile contact identity badge' },
  { cls: 'fa-solid fa-user-group', name: 'Teams', cat: 'users', tags: 'team collaboration dept department' },

  // Files & Documents
  { cls: 'fa-solid fa-file-lines', name: 'Documents', cat: 'files', tags: 'file doc document text report' },
  { cls: 'fa-solid fa-file-invoice-dollar', name: 'Invoices', cat: 'files', tags: 'invoice bill file accounting' },
  { cls: 'fa-solid fa-folder', name: 'Folders', cat: 'files', tags: 'folder directory storage archive' },
  { cls: 'fa-solid fa-folder-tree', name: 'Categories / Tree', cat: 'files', tags: 'folder tree hierarchy category' },
  { cls: 'fa-solid fa-clipboard-list', name: 'Checklist / Tasks', cat: 'files', tags: 'clipboard tasks list survey todo' },
  { cls: 'fa-solid fa-box-archive', name: 'Archives', cat: 'files', tags: 'archive backup storage history' },
  { cls: 'fa-solid fa-tags', name: 'Tags / Meta', cat: 'files', tags: 'tag label category taxonomy' },
  { cls: 'fa-solid fa-book', name: 'Knowledgebase', cat: 'files', tags: 'book guide docs documentation' },

  // System & Tools
  { cls: 'fa-solid fa-gear', name: 'Settings', cat: 'system', tags: 'gear settings config options preferences' },
  { cls: 'fa-solid fa-gears', name: 'System Operations', cat: 'system', tags: 'gears automation workflows process' },
  { cls: 'fa-solid fa-wrench', name: 'Tools / Maintenance', cat: 'system', tags: 'wrench repair fix tools maintenance' },
  { cls: 'fa-solid fa-sliders', name: 'Parameters', cat: 'system', tags: 'sliders controls filters config' },
  { cls: 'fa-solid fa-database', name: 'Database / Storage', cat: 'system', tags: 'database sql db tables storage' },
  { cls: 'fa-solid fa-server', name: 'Servers', cat: 'system', tags: 'server hosting cloud infrastructure' },
  { cls: 'fa-solid fa-cloud', name: 'Cloud Integration', cat: 'system', tags: 'cloud sync backup saas' },
  { cls: 'fa-solid fa-network-wired', name: 'Integrations / API', cat: 'system', tags: 'network api connection bridge webhook' },
  { cls: 'fa-solid fa-terminal', name: 'CLI / Console', cat: 'system', tags: 'terminal console code command prompt' },
  { cls: 'fa-solid fa-clock-rotate-left', name: 'Audit Trail', cat: 'system', tags: 'audit history logs clock rollback' },

  // Communication & Support
  { cls: 'fa-solid fa-bell', name: 'Notifications', cat: 'communication', tags: 'bell notification alert reminder' },
  { cls: 'fa-solid fa-envelope', name: 'Messages / Email', cat: 'communication', tags: 'mail email message inbox letter' },
  { cls: 'fa-solid fa-comments', name: 'Live Chat', cat: 'communication', tags: 'chat conversation discussion support' },
  { cls: 'fa-solid fa-headset', name: 'Helpdesk / Support', cat: 'communication', tags: 'support helpdesk call assistance service' },
  { cls: 'fa-solid fa-bullhorn', name: 'Announcements', cat: 'communication', tags: 'announcement news marketing broadcast' },
  { cls: 'fa-solid fa-phone', name: 'Contact', cat: 'communication', tags: 'phone call hotline dial' },

  // General & Navigation
  { cls: 'fa-solid fa-compass', name: 'Navigation / Compass', cat: 'general', tags: 'compass direction route navigate' },
  { cls: 'fa-solid fa-globe', name: 'Portal / Web', cat: 'general', tags: 'globe web internet portal world' },
  { cls: 'fa-solid fa-bolt', name: 'Quick Actions', cat: 'general', tags: 'lightning bolt fast instant energy' },
  { cls: 'fa-solid fa-bullseye', name: 'Objectives / Goals', cat: 'general', tags: 'target goal objective milestone' },
  { cls: 'fa-solid fa-star', name: 'Favorites / Featured', cat: 'general', tags: 'star favorite bookmark highlight' },
  { cls: 'fa-solid fa-rocket', name: 'Launches / Releases', cat: 'general', tags: 'rocket fast speed boost deploy' },
  { cls: 'fa-solid fa-calendar-days', name: 'Calendar / Schedule', cat: 'general', tags: 'calendar date schedule agenda' },
  { cls: 'fa-solid fa-map-location-dot', name: 'Locations', cat: 'general', tags: 'map pin location branches address' },
  { cls: 'fa-solid fa-link', name: 'External Link', cat: 'general', tags: 'link url website external' },
  { cls: 'fa-solid fa-layer-group', name: 'Modules / Stacks', cat: 'general', tags: 'layers stack modules components' },
];

let curIconCategory = 'all';
let stagedIconCls = 'compass';
let stagedIconName = 'Compass';

function updatePickerSelectedChip(cls, name) {
  stagedIconCls = cls || 'compass';
  stagedIconName = name || cls || 'Compass';
  if ($('pickerSelectedIconBox')) $('pickerSelectedIconBox').innerHTML = renderIcon(stagedIconCls);
  if ($('pickerSelectedIconName')) $('pickerSelectedIconName').textContent = stagedIconName;
  if ($('pickerSelectedIconCode')) $('pickerSelectedIconCode').textContent = stagedIconCls;
}

window.stageFAIcon = function(cls, name) {
  updatePickerSelectedChip(cls, name);
  const items = document.querySelectorAll('.icon-grid-item');
  items.forEach(el => {
    if (el.getAttribute('data-icon-cls') === cls) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
};

function renderIconCategoryPills(activeCat) {
  curIconCategory = activeCat || 'all';
  const cats = [
    { id: 'all', label: 'All Icons', count: FA_ICONS.length },
    { id: 'analytics', label: '📊 Analytics', count: FA_ICONS.filter(i => i.cat === 'analytics').length },
    { id: 'business', label: '💼 Business', count: FA_ICONS.filter(i => i.cat === 'business').length },
    { id: 'users', label: '🛡️ Users & Roles', count: FA_ICONS.filter(i => i.cat === 'users').length },
    { id: 'files', label: '📁 Files', count: FA_ICONS.filter(i => i.cat === 'files').length },
    { id: 'system', label: '⚙️ System', count: FA_ICONS.filter(i => i.cat === 'system').length },
    { id: 'communication', label: '🔔 Comms', count: FA_ICONS.filter(i => i.cat === 'communication').length },
    { id: 'general', label: '🧭 General', count: FA_ICONS.filter(i => i.cat === 'general').length },
  ];
  const container = $('iconCategoryTabs');
  if (!container) return;
  container.innerHTML = cats.map(c => `
    <button type="button" class="icon-category-pill ${c.id === curIconCategory ? 'active' : ''}" onclick="filterIconCategory('${c.id}')">
      <span>${c.label}</span>
      <span style="font-size: 10px; opacity: 0.75; font-weight: 700;">(${c.count})</span>
    </button>
  `).join('');
}

window.filterIconCategory = function(cat) {
  renderIconCategoryPills(cat);
  const q = ($('iconSearchInput') && $('iconSearchInput').value || '').toLowerCase().trim();
  renderIconGrid(q, cat);
};

function renderIconGrid(query = '', category = 'all') {
  const grid = $('iconPickerGrid');
  if (!grid) return;
  const currentVal = ($('menuIcon') && $('menuIcon').value) || '';

  let list = FA_ICONS;
  if (category && category !== 'all') {
    list = list.filter(it => it.cat === category);
  }
  if (query) {
    list = list.filter(it =>
      it.cls.toLowerCase().includes(query) ||
      it.name.toLowerCase().includes(query) ||
      (it.tags && it.tags.toLowerCase().includes(query))
    );
  }

  // Update real-time counter badge and clear button
  if ($('iconSearchCountBadge')) {
    if (!query && category === 'all') {
      $('iconSearchCountBadge').textContent = `${list.length} icons`;
    } else {
      $('iconSearchCountBadge').textContent = `${list.length} of ${FA_ICONS.length}`;
    }
  }
  if ($('iconSearchClearBtn')) {
    $('iconSearchClearBtn').classList.toggle('hidden', !query);
  }

  // Update selected chip preview in footer with staged value
  updatePickerSelectedChip(stagedIconCls, stagedIconName);

  if (!list.length) {
    grid.innerHTML = `
      <div style="padding: 44px 20px; text-align: center; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 10px; opacity: 0.8;">🔍</div>
        <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">No matching icons found</div>
        <p style="font-size: 0.82rem; margin: 0 auto; max-width: 320px; color: var(--text-secondary);">Try another search term or type an emoji/custom icon class in the box below.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = `<div class="icon-grid">` + list.map(it => {
    const isSelected = stagedIconCls === it.cls;
    return `
      <div class="icon-grid-item ${isSelected ? 'active' : ''}" 
           data-icon-cls="${it.cls}"
           onclick="stageFAIcon('${it.cls}', '${escapeHtml(it.name)}')" 
           ondblclick="selectFAIcon('${it.cls}', '${escapeHtml(it.name)}')"
           title="${escapeHtml(it.name)} (${it.cls}) — Click to stage, double-click to select">
        <div class="icon-avatar-wrap">
          ${renderIcon(it.cls)}
        </div>
        <span class="icon-grid-label">${escapeHtml(it.name)}</span>
      </div>
    `;
  }).join('') + `</div>`;
}

window.clearIconSearch = function() {
  if ($('iconSearchInput')) {
    $('iconSearchInput').value = '';
    $('iconSearchInput').focus();
  }
  renderIconGrid('', curIconCategory);
};

window.openIconPickerModal = function() {
  const modal = $('iconPickerModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  if ($('iconSearchInput')) {
    $('iconSearchInput').value = '';
    setTimeout(() => $('iconSearchInput').focus(), 60);
  }
  const curVal = ($('menuIcon') && $('menuIcon').value) || 'compass';
  const activeIcon = FA_ICONS.find(i => i.cls === curVal);
  updatePickerSelectedChip(curVal, activeIcon ? activeIcon.name : curVal);

  renderIconCategoryPills('all');
  renderIconGrid('', 'all');
};

window.closeIconPickerModal = function() {
  const modal = $('iconPickerModal');
  if (modal) modal.classList.add('hidden');
};

window.confirmSelectedIcon = function() {
  selectFAIcon(stagedIconCls, stagedIconName);
};

window.selectFAIcon = function(cls, name) {
  const chosenCls = cls || stagedIconCls || 'compass';
  const chosenName = name || stagedIconName || chosenCls;
  if ($('menuIcon')) $('menuIcon').value = chosenCls;
  if ($('menuIconPreview')) $('menuIconPreview').innerHTML = renderIcon(chosenCls);
  if ($('menuIconText')) $('menuIconText').textContent = chosenCls;
  updatePickerSelectedChip(chosenCls, chosenName);
  updateLiveMenuPreview();
  closeIconPickerModal();
  toast(`Selected icon: ${chosenName}`);
};

window.applyCustomIcon = function() {
  const val = ($('customIconInput') && $('customIconInput').value.trim()) || '';
  if (!val) return showAlert('Please enter an icon class or emoji');
  updatePickerSelectedChip(val, val);
  toast(`Staged custom icon "${val}". Click "Select Icon" to confirm.`);
};

// Sub-Tab Switching (Menus List vs Role-Menu Mapping)
window.switchMenuSubTab = function(subTab) {
  window.curMenuSubTab = subTab;
  const tabListBtn = $('tabBtnMenusList');
  const tabMapBtn = $('tabBtnRoleMapping');
  const listView = $('menus-list-view');
  const formView = $('menus-form-view');
  const detailView = $('menus-detail-view');
  const mapView = $('menus-mapping-view');

  if (subTab === 'list') {
    if (tabListBtn) tabListBtn.classList.add('active');
    if (tabMapBtn) tabMapBtn.classList.remove('active');
    if (mapView) mapView.classList.add('hidden');
    if ((formView && !formView.classList.contains('hidden')) || (detailView && !detailView.classList.contains('hidden'))) {
      // keep current form or detail
    } else {
      if (listView) listView.classList.remove('hidden');
    }
    saveLastNav({ type: 'page', page: 'menus', subTab: 'list' });
    if (window.location.hash !== '#menus') {
      try { history.replaceState(null, '', '#menus'); } catch (_) {}
    }
  } else if (subTab === 'mapping') {
    if (tabListBtn) tabListBtn.classList.remove('active');
    if (tabMapBtn) tabMapBtn.classList.add('active');
    if (listView) listView.classList.add('hidden');
    if (formView) formView.classList.add('hidden');
    if (detailView) detailView.classList.add('hidden');
    if (mapView) mapView.classList.remove('hidden');
    renderRoleMenuMappingUI();
    saveLastNav({ type: 'page', page: 'menus', subTab: 'mapping' });
    if (window.location.hash !== '#menus-mapping') {
      try { history.replaceState(null, '', '#menus-mapping'); } catch (_) {}
    }
  }
};

// ---------- MENU HIERARCHY (Submenu Support) ----------
window.expandedMenuGroups = window.expandedMenuGroups || new Set();
window.collapsedMenuGroups = window.collapsedMenuGroups || new Set();

function sortMenusByOrder(list) {
  return (list || []).slice().sort((a, b) => (parseInt(a.order, 10) || 1) - (parseInt(b.order, 10) || 1));
}

// All ancestor menu ids of a menu, walking up the parent chain (cycle safe)
function getMenuAncestorIds(dbLike, menuId) {
  const menus = (dbLike && dbLike.menus) || [];
  const out = [];
  const seen = new Set([menuId]);
  let cur = menus.find(x => x.id === menuId);
  let guard = 0;
  while (cur && cur.parentId && guard++ < 50) {
    if (seen.has(cur.parentId)) break;
    out.push(cur.parentId);
    seen.add(cur.parentId);
    cur = menus.find(x => x.id === cur.parentId);
  }
  return out;
}

// True when walking up the parent chain from a menu revisits a node (self/loop nesting)
function menuChainHasCycle(menus, menuId) {
  const seen = new Set();
  let cur = (menus || []).find(x => x.id === menuId);
  let guard = 0;
  while (cur && guard++ < 50) {
    if (seen.has(cur.id)) return true;
    seen.add(cur.id);
    if (!cur.parentId) return false;
    cur = (menus || []).find(x => x.id === cur.parentId);
    if (!cur) return false; // dangling parent reference
  }
  return true;
}

// All descendant menu ids of a menu (cycle safe)
function getMenuDescendantIds(dbLike, menuId) {
  const menus = (dbLike && dbLike.menus) || [];
  const out = new Set();
  const stack = [menuId];
  const seen = new Set([menuId]);
  let guard = 0;
  while (stack.length && guard++ < 200) {
    const pid = stack.pop();
    menus.forEach(m => {
      if (m.parentId === pid && !seen.has(m.id)) {
        seen.add(m.id);
        out.add(m.id);
        stack.push(m.id);
      }
    });
  }
  return out;
}

function getMenuChildren(dbLike, parentId) {
  return sortMenusByOrder((dbLike.menus || []).filter(m => (m.parentId || '') === (parentId || '')));
}

function getMenuChildCount(dbLike, menuId) {
  return (dbLike.menus || []).filter(m => m.parentId === menuId).length;
}

function menuParentTitle(dbLike, menuId) {
  if (!menuId) return '';
  const p = (dbLike.menus || []).find(x => x.id === menuId);
  return p ? p.title : '';
}

// Top-level ancestor that owns the role access of a menu group.
// Submenus never store roles of their own: they inherit from this root menu.
function getMenuRootId(dbLike, menuId) {
  const menus = (dbLike && dbLike.menus) || [];
  const ancestors = getMenuAncestorIds(dbLike, menuId);
  return ancestors.length ? ancestors[ancestors.length - 1] : menuId;
}

function getMenuRoot(dbLike, menuId) {
  const menus = (dbLike && dbLike.menus) || [];
  return menus.find(x => x.id === getMenuRootId(dbLike, menuId)) || null;
}

// Effective role access for a menu: inherited from the top-level parent for submenus
function getEffectiveRoleIds(dbLike, menuId) {
  const root = getMenuRoot(dbLike, menuId);
  if (!root) return [];
  return Array.isArray(root.roleIds) ? root.roleIds : [];
}

// The menu whose role list actually governs this menu (itself, or its top-level parent)
function getMenuRoleOwner(dbLike, menu) {
  if (!menu) return null;
  if (!menu.parentId) return menu;
  return getMenuRoot(dbLike, menu.id) || menu;
}

// "Parent › Child" breadcrumb label used in grids, dropdowns and detail views
function menuPathLabel(dbLike, menu, maxDepth = 3) {
  const chain = [menu.title];
  let cur = menu;
  let depth = 0;
  while (cur && cur.parentId && depth < maxDepth) {
    const p = (dbLike.menus || []).find(x => x.id === cur.parentId);
    if (!p) break;
    chain.unshift(p.title);
    cur = p;
    depth++;
  }
  return chain.join(' › ');
}

// Populate the "Parent Menu" select of the menu form.
// Excludes the menu itself and all of its descendants so a cycle can never be created.
function renderMenuParentOptions(selectedParentId = '', excludeMenuId = '') {
  const sel = $('menuParent');
  if (!sel) return;
  const db = loadDB();
  const blocked = new Set();
  if (excludeMenuId) {
    blocked.add(excludeMenuId);
    getMenuDescendantIds(db, excludeMenuId).forEach(i => blocked.add(i));
  }

  const render = (parentId, depth) => {
    let html = '';
    getMenuChildren(db, parentId).forEach(m => {
      if (blocked.has(m.id)) return;
      const pad = depth > 0 ? '&nbsp;'.repeat(depth * 4) + '└ ' : '';
      const kids = getMenuChildren(db, m.id).length;
      const sub = kids ? ` <(${kids})` : '';
      html += `<option value="${escapeHtml(m.id)}">${pad}${escapeHtml(m.title)}${sub}</option>`;
      html += render(m.id, depth + 1);
    });
    return html;
  };

  sel.innerHTML = `<option value="">🚫 No Parent — Top-Level Menu</option>` + render('', 0);
  sel.value = (selectedParentId && !blocked.has(selectedParentId)) ? selectedParentId : '';
  if (sel.value !== (selectedParentId || '')) sel.value = '';
}

// Top-level menu = group header (no route, not clickable).
// As soon as a parent is picked the Route Path + Target Action fields appear,
// because only submenus own a page slug or a web link.
function onMenuParentChange() {
  const sel = $('menuParent');
  const routeField = $('menuRouteField');
  const targetField = $('menuTargetField');
  const routeInput = $('menuRoute');
  const currentId = ($('menuId') && $('menuId').value) || '';
  const isChild = !!(sel && sel.value);

  if (routeField) routeField.classList.toggle('hidden', !isChild);
  if (targetField) targetField.classList.toggle('hidden', !isChild);
  if (routeInput) routeInput.required = isChild;

  if (isChild && routeInput && !routeInput.value.trim()) {
    // Convenience: suggest a slug from the title (only for internal SPA routes)
    const title = ($('menuTitle') && $('menuTitle').value) || '';
    const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (slug) routeInput.value = slug;
  }

  // Safety net: a menu already saved as a submenu can never be silently demoted to a
  // top-level group, so a stale form draft or a hand-edited value cannot detach it.
  if (currentId && !isChild) {
    const saved = (loadDB().menus || []).find(x => x.id === currentId);
    if (saved && saved.parentId && isValidMenuParent(currentId, saved.parentId)) {
      sel.value = saved.parentId;
      routeField && routeField.classList.remove('hidden');
      targetField && targetField.classList.remove('hidden');
      if (routeInput) {
        routeInput.required = true;
        if (!routeInput.value.trim()) routeInput.value = saved.route || '';
      }
      toast(`"${saved.title}" is a submenu of "${menuParentTitle(loadDB(), saved.parentId)}" — parent kept`, 'info');
    }
  }
}
window.onMenuParentChange = onMenuParentChange;

// Validate a candidate parent for a menu (blocks self-parenting and cycles)
function isValidMenuParent(menuId, parentId) {
  if (!parentId) return true;
  if (menuId && parentId === menuId) return false;
  const db = loadDB();
  if (!(db.menus || []).some(m => m.id === parentId)) return false;
  if (!menuId) return true;
  return !getMenuDescendantIds(db, menuId).has(parentId);
}

function renderCustomSidebarMenus() {
  const db = loadDB();
  const cRole = currentRole();
  const menuContainer = $('customSidebarMenu');
  const divider = $('customMenuDivider');
  const heading = $('customMenuHeading');
  if (!menuContainer) return;

  const menus = sortMenusByOrder(db.menus || []);

  // Visibility:
  // 1. Menu must be active
  // 2. Role access is owned by the top-level parent: a submenu always inherits it,
  //    so an entire group (parent + submenus) is shown or hidden together.
  const visible = menus.filter(m => {
    if (m.status !== 'active') return false;
    const roleIds = getEffectiveRoleIds(db, m.id);
    if (roleIds.length === 0) return true;
    return cRole && roleIds.includes(cRole.id);
  });

  if (!visible.length) {
    if (divider) divider.classList.add('hidden');
    if (heading) heading.classList.add('hidden');
    menuContainer.innerHTML = '';
    return;
  }

  if (divider) divider.classList.remove('hidden');
  if (heading) heading.classList.remove('hidden');

  // Build the visible tree. A submenu is only nested when its parent group is
  // visible for the current role; otherwise it is promoted to top level.
  const visibleIds = new Set(visible.map(m => m.id));
  const kidsOf = new Map();
  visible.forEach(m => {
    const pid = (m.parentId && visibleIds.has(m.parentId)) ? m.parentId : '';
    if (!kidsOf.has(pid)) kidsOf.set(pid, []);
    kidsOf.get(pid).push(m);
  });

  const activeId = window.activeDynamicMenuId || '';
  // Groups on the path of the currently open submenu stay auto-expanded
  const activeAncestors = new Set();
  {
    let cur = (db.menus || []).find(x => x.id === activeId);
    let guard = 0;
    while (cur && cur.parentId && guard++ < 50) {
      if (activeAncestors.has(cur.parentId)) break;
      activeAncestors.add(cur.parentId);
      cur = (db.menus || []).find(x => x.id === cur.parentId);
    }
  }

  const groupHtml = (menu, depth) => {
    const kids = kidsOf.get(menu.id) || [];
    const icon = renderIcon(menu.icon, depth > 0 ? 'fa-solid fa-file-lines' : 'fa-solid fa-compass');
    const isWebLink = !!resolveWebviewUrl(menu);
    const extBadge = isWebLink
      ? `<span class="menu-ext-indicator" title="Opens inside the app Web View">${renderIcon('external')}</span>` : '';
    const extTitle = isWebLink ? ' (opens in app Web View)' : '';

    // A menu WITHOUT submenus is a normal link: clicking it opens its page.
    // Web URL routes open in the in-app Web View (never a new browser tab).
    if (!kids.length) {
      // A top-level group with no route and no submenus yet: a placeholder folder
      if (!menu.route) {
        return `<div class="menu-btn custom-menu-btn custom-menu-empty" title="${escapeHtml(menu.title)} — is group header me abhi koi submenu nahi hai. Iske andar submenu banayein.">
          <span class="menu-icon">${icon}</span>
          <span class="menu-label">${escapeHtml(menu.title)}</span>
          <span class="custom-menu-empty-hint">empty</span>
        </div>`;
      }
      return `<button type="button" class="menu-btn custom-menu-btn ${depth > 0 ? 'custom-submenu-item' : ''}" data-menuid="${menu.id}" onclick="openDynamicPage('${menu.id}')" title="${escapeHtml(menu.title)}${extTitle}">
          <span class="menu-icon">${icon}</span>
          <span class="menu-label">${escapeHtml(menu.title)}</span>${extBadge}
        </button>`;
    }

    // A menu WITH submenus is a pure group header: clicking it ONLY expands/collapses
    // the submenu list, it never navigates to the parent's own page.
    // Groups are OPEN by default so a freshly added submenu is always visible in the
    // sidebar. The user's manual collapse choice is remembered for the session.
    const isExpanded = window.collapsedMenuGroups.has(menu.id)
      ? activeAncestors.has(menu.id) || window.expandedMenuGroups.has(menu.id)
      : true;
    const onActivePath = activeAncestors.has(menu.id);
    const childHtml = kids.map(c => groupHtml(c, depth + 1)).join('');

    return `<div class="custom-menu-group ${isExpanded ? 'submenu-expanded' : ''}" data-group="${menu.id}">
      <div class="custom-menu-row">
        <button type="button" class="menu-btn custom-menu-btn custom-menu-parent ${depth > 0 ? 'custom-submenu-item' : ''} ${onActivePath ? 'submenu-parent-active' : ''}"
                onclick="toggleMenuGroup('${menu.id}', event)"
                aria-expanded="${isExpanded}"
                title="${escapeHtml(menu.title)} — click to ${isExpanded ? 'collapse' : 'expand'} its ${kids.length} submenu item(s)">
          <span class="menu-icon">${icon}</span>
          <span class="menu-label">${escapeHtml(menu.title)}</span>
          <span class="custom-menu-count" title="${kids.length} submenu item(s)">${kids.length}</span>
          <span class="menu-caret-icon">${renderIcon('chevron-right')}</span>
        </button>
      </div>
      <div class="custom-submenu ${isExpanded ? 'expanded' : 'collapsed'}">${childHtml}</div>
    </div>`;
  };

  menuContainer.innerHTML = (kidsOf.get('') || []).map(m => groupHtml(m, 0)).join('');
}

// Expand / collapse a submenu group inside the sidebar (groups open by default)
window.toggleMenuGroup = function(menuId, evt) {
  if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
  const group = document.querySelector(`.custom-menu-group[data-group="${menuId}"]`);
  const currentlyOpen = group ? group.classList.contains('submenu-expanded') : true;
  if (currentlyOpen) {
    window.collapsedMenuGroups.add(menuId);
    window.expandedMenuGroups.delete(menuId);
  } else {
    window.collapsedMenuGroups.delete(menuId);
    window.expandedMenuGroups.add(menuId);
  }
  renderCustomSidebarMenus();
  closeNav();
};

// ---------- IN-APP WEB VIEW (iframe) ----------
// Only http/https URLs are ever loaded: blocks javascript:, data:, vbscript: etc.
function sanitizeWebUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  // Reject anything that declares a non-http(s) scheme (javascript:, data:, ftp:, ...)
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return '';
  const withProto = /^https?:\/\//i.test(s) ? s : 'https://' + s.replace(/^\/+/, '');
  try {
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.href;
  } catch (_) {
    return '';
  }
}

function isWebUrlRoute(route) {
  const s = String(route || '').trim();
  if (/^https?:\/\//i.test(s)) return true;
  // "www.example.com" / "example.com/x" are usable links too (https is assumed)
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(s);
}

// Single source of truth: the URL a menu should load in the Web View (or '' for none).
// Accepts "https://x.com", "www.x.com" and "x.com" — fixes the mismatch that made
// a valid Web View route fail to open.
function resolveWebviewUrl(menu) {
  if (!menu) return '';
  const wantsWebView = menu.targetType === 'external' || isWebUrlRoute(menu.route);
  if (!wantsWebView) return '';
  return sanitizeWebUrl(menu.route);
}

// Show the in-app web view: a bare iframe, no toolbar / status text around it
function showWebview(url) {
  const shell = $('dynWebview');
  const frame = $('webviewFrame');
  const canvas = $('dynCanvas');
  const safe = sanitizeWebUrl(url);
  if (!shell || !frame) return false;
  if (!safe) {
    toast('Invalid web link — only http:// or https:// URLs can open in the Web View', 'warning');
    return false;
  }
  if (canvas) canvas.classList.add('hidden');
  shell.classList.remove('hidden');
  window.currentWebviewUrl = safe;
  try { frame.src = safe; } catch (_) { frame.setAttribute('src', safe); }
  return true;
}

function hideWebview() {
  const shell = $('dynWebview');
  const frame = $('webviewFrame');
  const canvas = $('dynCanvas');
  if (shell) shell.classList.add('hidden');
  if (canvas) canvas.classList.remove('hidden');
  if (frame) frame.removeAttribute('src');
  window.currentWebviewUrl = '';
}

window.openDynamicPage = function(menuId) {
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === menuId);
  if (!m) return showAlert('Menu route not found');
  if (!canAccessDynamicMenu(menuId)) return showAlert('You do not have permission to access this menu', 'warning');

  // Auto-expand every parent group of the opened submenu
  window.activeDynamicMenuId = menuId;
  getMenuAncestorIds(db, menuId).forEach(pid => {
    window.expandedMenuGroups.add(pid);
    window.collapsedMenuGroups.delete(pid);
  });
  renderCustomSidebarMenus();

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = $('page-dynamic-view');
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.menu-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset && b.dataset.menuid) === menuId);
  });

  const pageTitle = m.title;
  $('pageTitle').textContent = pageTitle;
  if ($('bcCurrent')) $('bcCurrent').textContent = pageTitle;

  if ($('dynPageTitle')) $('dynPageTitle').textContent = m.title;
  if ($('dynPageIcon')) $('dynPageIcon').innerHTML = renderIcon(m.icon, 'fa-solid fa-compass');

  // Any web URL (top-level or submenu link) opens inside the in-app Web View.
  // Internal slugs keep the SPA placeholder canvas.
  const webUrl = resolveWebviewUrl(m);
  if (webUrl) {
    showWebview(webUrl);
  } else {
    hideWebview();
    if (m.targetType === 'external' && m.route) {
      toast(`"${m.title}" ka route valid web link nahi hai ("${m.route}") — Web View me nahi khul sakta`, 'warning');
    }
  }
  if ($('dynCanvasHeading')) $('dynCanvasHeading').textContent = m.title;
  if ($('dynCanvasDesc')) $('dynCanvasDesc').textContent = m.description || 'Dynamic route view configured via AdminERP Menu Builder.';

  if ($('dynRolesStrip')) {
    const owner = getMenuRoleOwner(db, m);
    const roleIds = getEffectiveRoleIds(db, menuId);
    const inheritedTag = m.parentId
      ? `<span class="badge submenu-badge" style="margin-right:6px;">${renderIcon('layers')} Inherited from ${escapeHtml(owner ? owner.title : 'parent')}</span>`
      : '';
    if (roleIds.length === 0) {
      $('dynRolesStrip').innerHTML = inheritedTag + `<span class="badge primary">${renderIcon('globe')} Available to All Roles</span>`;
    } else {
      $('dynRolesStrip').innerHTML = inheritedTag + roleIds.map(rid => {
        const r = (db.roles || []).find(x => x.id === rid);
        return `<span class="badge role-badge">${renderIcon('shield')} ${r ? escapeHtml(r.name) : 'Unknown Role'}</span>`;
      }).join('');
    }
  }

  closeNav();
  trackPageVisit('dyn_' + menuId);

  // Sync state & URL hash
  saveLastNav({ type: 'dynamic', menuId: menuId });
  if (window.location.hash !== '#dynamic-' + menuId) {
    try { history.replaceState(null, '', '#dynamic-' + menuId); } catch (_) {}
  }
};

window.navigateHome = function() {
  goPage('dashboard');
};

function renderMenus() {
  const db = loadDB();
  const q = ($('menuSearch') && $('menuSearch').value || '').toLowerCase().trim();
  const stFilter = ($('menuFilterStatus') && $('menuFilterStatus').value || '').trim();
  const lvFilter = ($('menuFilterLevel') && $('menuFilterLevel').value || '').trim();

  let list = sortMenusByOrder(db.menus || []);
  if (stFilter) {
    list = list.filter(m => m.status === stFilter);
  }
  if (lvFilter === 'root') {
    list = list.filter(m => !m.parentId);
  } else if (lvFilter === 'child') {
    list = list.filter(m => !!m.parentId);
  }

  const columnDefs = [
    {
      headerName: 'Actions',
      field: 'id',
      pinned: 'left',
      lockPinned: true,
      width: 215,
      minWidth: 205,
      maxWidth: 245,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params) => {
        const m = params.data;
        if (!m) return '';
        const viewBtn = `<button type="button" class="btn btn-act-view sm" onclick="viewMenu('${m.id}')" title="View Menu">👁️ View</button>`;
        const editBtn = hasPerm('menus', 'update') ? `<button type="button" class="btn warn sm" onclick="editMenu('${m.id}')" title="Edit Menu">✏️ Edit</button>` : '';
        const delBtn = hasPerm('menus', 'delete') ? `<button type="button" class="btn danger sm" onclick="deleteMenu('${m.id}')" title="Delete Menu">🗑️ Del</button>` : '';
        return `<div class="grid-actions-cell">${viewBtn}${editBtn}${delBtn}</div>`;
      }
    },
    {
      headerName: 'Menu Item',
      field: 'title',
      minWidth: 200,
      cellRenderer: (params) => {
        const m = params.data;
        const depth = m.depth || 0;
        const indent = depth > 0
          ? `<span class="grid-tree-indent" title="Nested ${depth} level(s) deep">${'&nbsp;'.repeat(depth * 3)}↳</span>`
          : '';
        const levelTag = depth > 0
          ? `<span class="badge submenu-badge sm">${renderIcon('layers')} Submenu</span>`
          : `<span class="badge muted sm">${renderIcon('compass')} Top-Level</span>`;
        const kids = m.childCount || 0;
        const kidsTag = kids ? `<span class="badge info sm" title="${kids} submenu item(s)">${kids} sub-item(s)</span>` : '';
        return `<div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.1rem;width:24px;text-align:center;">${renderIcon(m.icon)}</span>
          <div>
            <b>${indent}${escapeHtml(m.title || '')}</b> ${levelTag} ${kidsTag}
            ${m.description ? `<div class="muted small">${escapeHtml(m.description)}</div>` : ''}
          </div>
        </div>`;
      }
    },
    {
      headerName: 'Submenu Of',
      field: 'parentId',
      minWidth: 150,
      cellRenderer: (params) => {
        const m = params.data;
        if (!m.parentId) return '<span class="muted small">— Root Menu —</span>';
        return `<span class="badge submenu-badge">${renderIcon('layers')} ${escapeHtml(m.parentTitle || 'Deleted Menu')}</span>`;
      }
    },
    {
      headerName: 'Route Path / Link',
      field: 'route',
      minWidth: 160,
      cellRenderer: (params) => {
        const m = params.data;
        if (!m.route) return '<span class="badge muted sm">📁 Group Header (no route)</span>';
        return isWebUrlRoute(m.route) ? `<code>${escapeHtml(m.route)}</code>` : `<code>/${escapeHtml(String(m.route).replace(/^\/+/, ''))}</code>`;
      }
    },
    {
      headerName: 'Target Type',
      field: 'targetType',
      width: 140,
      cellRenderer: (params) => params.value === 'external'
        ? `<span class="badge warn">${renderIcon('external')} Web View</span>`
        : `<span class="badge primary">${renderIcon('bolt')} SPA View</span>`
    },
    {
      headerName: 'Order',
      field: 'order',
      width: 90,
      cellRenderer: (params) => `<span class="badge" style="font-weight:700;">#${params.value || 1}</span>`
    },
    {
      headerName: 'Role Access (Inherited by Submenus)',
      field: 'rolesFormatted',
      minWidth: 200,
      flex: 1.5,
      cellRenderer: (params) => params.value || '—'
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 110,
      cellRenderer: (params) => params.value === 'active'
        ? '<span class="badge success">Active</span>'
        : '<span class="badge muted">Inactive</span>'
    }
  ];

  const rowData = list.map(m => {
    // Role access is owned by the top-level parent; submenus show it as inherited
    const roleIds = getEffectiveRoleIds(db, m.id);
    const owner = getMenuRoleOwner(db, m);
    const inheritedTag = m.parentId
      ? `<span class="badge submenu-badge" style="margin-right:4px;" title="Inherited from ${escapeHtml(owner ? owner.title : 'parent')}">${renderIcon('layers')} Inherited</span>`
      : '';
    let rolesHtml = '';
    if (roleIds.length === 0) {
      rolesHtml = inheritedTag + `<span class="badge info">${renderIcon('globe')} All Roles</span>`;
    } else {
      const badges = roleIds.map(rid => {
        const r = (db.roles || []).find(x => x.id === rid);
        return `<span class="badge role-badge" style="margin-right:3px;">${renderIcon('shield')} ${r ? escapeHtml(r.name) : 'Deleted'}</span>`;
      });
      rolesHtml = inheritedTag + badges.join('');
    }
    return {
      ...m,
      parentId: m.parentId || '',
      depth: getMenuAncestorIds(db, m.id).length,
      parentTitle: m.parentId ? menuParentTitle(db, m.parentId) : '',
      childCount: getMenuChildCount(db, m.id),
      pathLabel: menuPathLabel(db, m),
      roleOwnerTitle: owner ? owner.title : '',
      rolesFormatted: rolesHtml
    };
  });

  initOrUpdateAGGrid('menus', 'menusGrid', columnDefs, rowData, {
    quickFilterText: q
  });
}

function updateLiveMenuPreview() {
  const title = ($('menuTitle') && $('menuTitle').value.trim()) || 'Menu Item Preview';
  const icon = ($('menuIcon') && $('menuIcon').value.trim()) || 'fa-solid fa-compass';
  const route = ($('menuRoute') && $('menuRoute').value.trim()) || 'custom-route';
  const status = ($('menuStatus') && $('menuStatus').value) || 'active';

  if ($('liveMenuTitle')) $('liveMenuTitle').textContent = title;
  if ($('liveMenuIcon')) $('liveMenuIcon').innerHTML = renderIcon(icon);
  if ($('liveMenuRoute')) $('liveMenuRoute').textContent = route.startsWith('http') ? route : ('/' + route.replace(/^\/+/, ''));
  if ($('liveMenuStatusBadge')) {
    $('liveMenuStatusBadge').className = `badge ${status === 'active' ? 'success' : 'muted'}`;
    $('liveMenuStatusBadge').textContent = status === 'active' ? 'Active' : 'Inactive';
  }
}

// Role checkboxes intentionally do not exist in the menu form any more:
// submenus inherit the role access of their top-level parent. Kept only so that
// a stale draft (saved before this change) can never crash the form.
function renderMenuFormRoleBoxes() {
  const container = $('menuFormRoleBoxes');
  if (container) container.innerHTML = '';
}

window.openCreateMenu = function() {
  if (!hasPerm('menus', 'add')) return showAlert('You do not have add permission');
  const db = loadDB();
  resetForm('menuForm', 'menuFormTitle', 'Add Dynamic Menu', () => {
    $('menuCancel').classList.add('hidden');
  });
  if ($('menuId')) $('menuId').value = '';
  if ($('menuIcon')) $('menuIcon').value = 'fa-solid fa-compass';
  if ($('menuIconPreview')) $('menuIconPreview').innerHTML = renderIcon('fa-solid fa-compass');
  if ($('menuIconText')) $('menuIconText').textContent = 'fa-solid fa-compass';
  if ($('menuTargetType')) $('menuTargetType').value = 'internal';
  if ($('menuOrder')) $('menuOrder').value = (db.menus || []).length + 1;
  if ($('menuStatus')) $('menuStatus').value = 'active';
  renderMenuParentOptions('');
  onMenuParentChange();
  $('menuCancel').classList.remove('hidden');
  restoreFormDraft('menuForm');
  // Draft restore writes the parent/select values without firing onchange, so the
  // Route Path + Target Action fields must be re-synced with the restored parent
  onMenuParentChange();
  updateLiveMenuPreview();
  switchMenuSubTab('list');
  setModuleView('menus', 'form');
  saveLastNav({ type: 'page', page: 'menus', view: 'form', mode: 'add' });
  if (window.location.hash !== '#menus-add') {
    try { history.replaceState(null, '', '#menus-add'); } catch (_) {}
  }
};

window.editMenu = function(id) {
  if (!hasPerm('menus', 'update')) return showAlert('You do not have update permission');
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === id);
  if (!m) return;
  $('menuId').value = m.id;
  $('menuTitle').value = m.title;
  const ic = m.icon || 'fa-solid fa-compass';
  $('menuIcon').value = ic;
  if ($('menuIconPreview')) $('menuIconPreview').innerHTML = renderIcon(ic);
  if ($('menuIconText')) $('menuIconText').textContent = ic;
  $('menuRoute').value = m.route;
  $('menuTargetType').value = m.targetType || 'internal';
  $('menuOrder').value = m.order || 1;
  $('menuStatus').value = m.status || 'active';
  $('menuDesc').value = m.description || '';
  $('menuFormTitle').textContent = 'Edit Menu: ' + m.title;
  $('menuCancel').classList.remove('hidden');
  renderMenuParentOptions(m.parentId || '', m.id);
  restoreFormDraft('menuForm');
  $('menuId').value = m.id;
  // Draft restore may have injected a stale parent, re-assert a valid one
  if ($('menuParent') && !isValidMenuParent(m.id, $('menuParent').value)) $('menuParent').value = m.parentId || '';
  onMenuParentChange();
  updateLiveMenuPreview();
  switchMenuSubTab('list');
  setModuleView('menus', 'form');
  focusForm('menuForm', 'menuTitle');
  saveLastNav({ type: 'page', page: 'menus', view: 'form', mode: 'edit', editId: id });
  if (window.location.hash !== '#menus-edit-' + id) {
    try { history.replaceState(null, '', '#menus-edit-' + id); } catch (_) {}
  }
};

// Role-Menu Mapping Functions
function renderRoleMenuMappingUI() {
  const db = loadDB();
  const menuSel = $('mapMenuSelect');
  const roleSel = $('mapRoleSelect');
  if (!menuSel || !roleSel) return;

  const menus = sortMenusByOrder(db.menus || []);
  const roles = db.roles || [];

  // Role access belongs to top-level menus only: submenus inherit it from their
  // parent group, so the mapping dropdown lists root menus with a submenu count.
  const roots = menus.filter(m => !m.parentId);

  const curMenuVal = menuSel.value;
  menuSel.innerHTML = roots.length ? roots.map(m => {
    const kidCount = getMenuChildCount(db, m.id);
    const sub = kidCount ? ` — ${kidCount} submenu item(s) included` : '';
    return `<option value="${escapeHtml(m.id)}">📂 ${escapeHtml(m.title)} (${escapeHtml(m.route)})${sub}</option>`;
  }).join('') : '<option value="">No top-level menus available</option>';

  if (curMenuVal && roots.some(m => m.id === curMenuVal)) {
    menuSel.value = curMenuVal;
  }

  const curRoleVal = roleSel.value;
  roleSel.innerHTML = roles.length ? roles.map(r => `
    <option value="${r.id}">🛡️ ${escapeHtml(r.name)}</option>
  `).join('') : '<option value="">No roles available</option>';

  if (curRoleVal && roles.some(r => r.id === curRoleVal)) {
    roleSel.value = curRoleVal;
  }

  onMapMenuSelectChange();
  renderRoleMenuMappingTable();
}

function onMapMenuSelectChange() {
  const db = loadDB();
  const menuId = $('mapMenuSelect') && $('mapMenuSelect').value;
  const container = $('mapSelectedMenuRoles');
  if (!container) return;

  const m = (db.menus || []).find(x => x.id === menuId);
  if (!m) {
    container.innerHTML = '<span class="muted small">Select a top-level menu to view mapped roles</span>';
    return;
  }

  // Safety net: roles always live on the top-level menu that owns the whole group
  const owner = getMenuRoleOwner(db, m);
  const roleIds = Array.isArray(owner.roleIds) ? owner.roleIds : [];

  const kidCount = getMenuChildCount(db, m.id);
  const groupTag = `<span class="badge muted" style="margin-right:8px;">${renderIcon('compass')} Top-Level Menu${kidCount ? ` (${kidCount} submenu item(s) included)` : ''}</span>`;

  if (roleIds.length === 0) {
    container.innerHTML = groupTag + `<span class="badge info">${renderIcon('globe')} Public (All Roles Allowed)</span>`;
    return;
  }

  container.innerHTML = groupTag + roleIds.map(rid => {
    const r = (db.roles || []).find(x => x.id === rid);
    return `
      <span class="badge role-badge" style="display:inline-flex; align-items:center;">
        ${renderIcon('shield')} ${r ? escapeHtml(r.name) : 'Deleted Role'}
        <button type="button" class="unmap-badge-btn" onclick="unmapRoleFromMenu('${m.id}', '${rid}')" title="Unmap this role">✕</button>
      </span>
    `;
  }).join(' ');
}
window.onMapMenuSelectChange = onMapMenuSelectChange;

window.unmapRoleFromMenu = function(menuId, roleId) {
  if (!hasPerm('menus', 'update')) return showAlert('You do not have update permission');
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === menuId);
  if (!m) return;
  const r = (db.roles || []).find(x => x.id === roleId);
  const rName = r ? r.name : 'Role';

  m.roleIds = (m.roleIds || []).filter(id => id !== roleId);
  saveDB(db);

  logAudit('Menus', 'update', m.title, `Role "${rName}" mapped`, `Role "${rName}" unmapped`);
  renderSidebar();
  renderMenus();
  renderRoleMenuMappingUI();
  toast(`Unmapped "${rName}" from menu "${m.title}"`);
};

window.makeMenuPublic = function() {
  if (!hasPerm('menus', 'update')) return showAlert('You do not have update permission');
  const db = loadDB();
  const menuId = $('mapMenuSelect') && $('mapMenuSelect').value;
  const m = (db.menus || []).find(x => x.id === menuId);
  if (!m) return showAlert('Please select a valid top-level menu');

  const kids = getMenuDescendantIds(db, m.id).size;
  askConfirm(`Make menu "${m.title}" public to ALL roles?${kids ? `\n\nIts ${kids} submenu item(s) will also become public because they inherit this access.` : ''}`, 'Yes, make public').then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    const target = (db2.menus || []).find(x => x.id === menuId);
    if (!target) return;
    target.roleIds = [];
    saveDB(db2);
    logAudit('Menus', 'update', target.title, 'Role-restricted', 'Public (All Roles)');
    renderSidebar();
    renderMenus();
    renderRoleMenuMappingUI();
    toast(`Menu "${target.title}" is now public to all roles`);
  });
};

function renderRoleMenuMappingTable() {
  const db = loadDB();
  const q = ($('mapSearch') && $('mapSearch').value || '').toLowerCase().trim();
  const list = sortMenusByOrder(db.menus || []);

  const columnDefs = [
    {
      headerName: 'Actions',
      field: 'id',
      pinned: 'left',
      lockPinned: true,
      width: 185,
      minWidth: 175,
      maxWidth: 220,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params) => {
        const m = params.data;
        if (!m) return '';
        // Only top-level menus own role access; submenus inherit it
        if (m.parentId) {
          return `<span class="muted small" title="Submenus inherit the role access of their top-level parent">${renderIcon('lock')} Inherited</span>`;
        }
        const mapBtn = `<button type="button" class="btn primary sm" onclick="openRoleMappingModal('${m.id}')" title="Map Role to this Menu Group">➕ Map Role</button>`;
        const pubBtn = (m.roleIds && m.roleIds.length > 0)
          ? `<button type="button" class="btn secondary sm" onclick="makeMenuPublicDirect('${m.id}')" title="Make Public (Allow All Roles)">${renderIcon('globe')}</button>`
          : '';
        return `<div class="grid-actions-cell">${mapBtn}${pubBtn}</div>`;
      }
    },
    {
      headerName: 'Menu Item',
      field: 'title',
      minWidth: 180,
      cellRenderer: (params) => {
        const m = params.data;
        const depth = m.depth || 0;
        const indent = depth > 0 ? `<span class="grid-tree-indent">${'&nbsp;'.repeat(depth * 3)}↳</span>` : '';
        const tag = depth > 0
          ? `<span class="badge submenu-badge sm">${renderIcon('layers')} Submenu</span>`
          : `<span class="badge muted sm">${renderIcon('compass')} Top-Level</span>`;
        return `<div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.1rem;width:24px;text-align:center;">${renderIcon(m.icon)}</span>
          <b>${indent}${escapeHtml(m.title || '')}</b> ${tag}
        </div>`;
      }
    },
    {
      headerName: 'Route',
      field: 'route',
      minWidth: 140,
      cellRenderer: (params) => `<code>${escapeHtml(params.value || '')}</code>`
    },
    {
      headerName: 'Target',
      field: 'targetType',
      width: 120,
      cellRenderer: (params) => params.value === 'external'
        ? '<span class="badge warn">Web View</span>'
        : '<span class="badge primary">Internal</span>'
    },
    {
      headerName: 'Mapped Roles (Click ✕ to unmap)',
      field: 'rolesFormatted',
      minWidth: 260,
      flex: 2,
      cellRenderer: (params) => params.value || '—'
    }
  ];

  const rowData = list.map(m => {
    // Submenu rows show the inherited access of their top-level parent (read only)
    const owner = getMenuRoleOwner(db, m);
    const roleIds = Array.isArray(owner.roleIds) ? owner.roleIds : [];
    let rolesHtml = '';
    if (roleIds.length === 0) {
      rolesHtml = `<span class="badge info">${renderIcon('globe')} All Roles (Public)</span>`;
    } else {
      const badges = roleIds.map(rid => {
        const r = (db.roles || []).find(x => x.id === rid);
        const rName = r ? escapeHtml(r.name) : 'Unknown';
        const unmap = m.parentId
          ? ''
          : `<button type="button" class="unmap-badge-btn" onclick="unmapRoleFromMenu('${m.id}', '${rid}')" title="Remove role">&times;</button>`;
        return `<span class="badge role-badge" style="margin-right: 4px; display:inline-flex; align-items:center; gap:4px;">
          ${renderIcon('shield')} ${rName}
          ${unmap}
        </span>`;
      });
      rolesHtml = badges.join('');
    }
    if (m.parentId) {
      rolesHtml = `<span class="badge submenu-badge" style="margin-right:4px;">${renderIcon('layers')} Inherited</span>` + rolesHtml;
    }
    return {
      ...m,
      parentId: m.parentId || '',
      depth: getMenuAncestorIds(db, m.id).length,
      parentTitle: m.parentId ? menuParentTitle(db, m.parentId) : '',
      childCount: getMenuChildCount(db, m.id),
      pathLabel: menuPathLabel(db, m),
      roleOwnerTitle: owner ? owner.title : '',
      rolesFormatted: rolesHtml
    };
  });

  initOrUpdateAGGrid('roleMenuMapping', 'roleMenuMappingGrid', columnDefs, rowData, {
    quickFilterText: q
  });
}

window.makeMenuPublicDirect = function(id) {
  if (!hasPerm('menus', 'update')) return showAlert('You do not have update permission');
  const db = loadDB();
  const target = (db.menus || []).find(x => x.id === id);
  if (!target) return;
  askConfirm(`Make menu "${target.title}" public to ALL roles?`, 'Yes, make public').then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    const m = (db2.menus || []).find(x => x.id === id);
    if (!m) return;
    m.roleIds = [];
    saveDB(db2);
    logAudit('Menus', 'update', m.title, 'Role-restricted', 'Public (All Roles)');
    renderSidebar();
    renderMenus();
    renderRoleMenuMappingUI();
    toast(`Menu "${m.title}" is now public to all roles`);
  });
};

window.openRoleMappingForMenu = function(menuId) {
  openRoleMappingModal(menuId);
};

window.openRoleMappingModal = function(menuId) {
  const db = loadDB();
  const found = (db.menus || []).find(x => x.id === menuId);
  if (!found) return showAlert('Menu not found');

  // A submenu has no role option of its own: it inherits from its top-level parent,
  // so the mapping dialog is opened on the parent menu group instead.
  const m = getMenuRoleOwner(db, found);
  if (!m) return showAlert('Menu not found');
  if (m.id !== found.id) {
    toast(`"${found.title}" is a submenu — showing role access of parent "${m.title}"`, 'info');
  }

  const modal = $('roleMappingModal');
  if (!modal) return;

  $('modalMapMenuId').value = m.id;
  $('modalMapMenuTitle').textContent = m.title;
  $('modalMapMenuRoute').textContent = '/' + m.route.replace(/^\/+/, '');
  $('modalMapMenuIcon').innerHTML = renderIcon(m.icon);

  // Populate roles dropdown
  const roles = db.roles || [];
  const roleSel = $('modalMapRoleSelect');
  if (roleSel) {
    roleSel.innerHTML = roles.length
      ? roles.map(r => `<option value="${r.id}">🛡️ ${escapeHtml(r.name)}</option>`).join('')
      : '<option value="">No roles available</option>';
  }

  renderModalMappedRoles(m.id);
  modal.classList.remove('hidden');
};

function renderModalMappedRoles(menuId) {
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === menuId);
  const container = $('modalMappedRolesContainer');
  if (!container || !m) return;

  if (!m.roleIds || m.roleIds.length === 0) {
    container.innerHTML = `<span class="badge info">${renderIcon('globe')} Public (All Roles Allowed)</span>`;
    return;
  }

  container.innerHTML = m.roleIds.map(rid => {
    const r = (db.roles || []).find(x => x.id === rid);
    return `
      <span class="badge role-badge" style="display:inline-flex; align-items:center; gap:6px; margin: 3px; padding: 4px 10px;">
        ${renderIcon('shield')} ${r ? escapeHtml(r.name) : 'Deleted Role'}
        <button type="button" class="unmap-badge-btn" onclick="unmapRoleInModal('${m.id}', '${rid}')" title="Remove role access">✕</button>
      </span>
    `;
  }).join('');
}

window.addRoleInModal = function() {
  const menuId = $('modalMapMenuId') && $('modalMapMenuId').value;
  const roleId = $('modalMapRoleSelect') && $('modalMapRoleSelect').value;
  if (!menuId) return showAlert('Menu not found');
  if (!roleId) return showAlert('Please select a role to map');
  
  if (!hasPerm('menus', 'update')) return showAlert('You do not have update permission');

  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === menuId);
  const r = (db.roles || []).find(x => x.id === roleId);
  if (!m || !r) return;

  if (!Array.isArray(m.roleIds)) m.roleIds = [];
  if (m.roleIds.includes(roleId)) {
    return showAlert(`Role "${r.name}" is already mapped to menu "${m.title}"`);
  }

  m.roleIds.push(roleId);
  saveDB(db);
  logAudit('Menus', 'update', m.title, 'Role mapping updated', `Mapped role "${r.name}"`);
  
  renderModalMappedRoles(menuId);
  renderSidebar();
  renderMenus();
  renderRoleMenuMappingUI();
  toast(`Mapped role "${r.name}" to menu "${m.title}"!`);
};

window.unmapRoleInModal = function(menuId, roleId) {
  if (!hasPerm('menus', 'update')) return showAlert('You do not have update permission');
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === menuId);
  if (!m) return;
  const r = (db.roles || []).find(x => x.id === roleId);
  const rName = r ? r.name : 'Role';

  m.roleIds = (m.roleIds || []).filter(id => id !== roleId);
  saveDB(db);
  logAudit('Menus', 'update', m.title, `Role "${rName}" mapped`, `Role "${rName}" unmapped`);

  renderModalMappedRoles(menuId);
  renderSidebar();
  renderMenus();
  renderRoleMenuMappingUI();
  toast(`Unmapped "${rName}"`);
};

window.makePublicInModal = function() {
  if (!hasPerm('menus', 'update')) return showAlert('You do not have update permission');
  const menuId = $('modalMapMenuId') && $('modalMapMenuId').value;
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === menuId);
  if (!m) return;

  m.roleIds = [];
  saveDB(db);
  logAudit('Menus', 'update', m.title, 'Role-restricted', 'Public (All Roles)');
  
  renderModalMappedRoles(menuId);
  renderSidebar();
  renderMenus();
  renderRoleMenuMappingUI();
  toast(`Menu "${m.title}" is now public to all roles`);
};

window.closeRoleMappingModal = function() {
  const modal = $('roleMappingModal');
  if (modal) modal.classList.add('hidden');
};

window.viewMenu = function(id) {
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === id);
  if (!m) return;

  const mapBtn = `<button class="btn secondary" onclick="openRoleMappingForMenu('${m.id}')" title="${m.parentId ? 'Submenus inherit role access — opens the top-level parent' : 'Manage role access for this menu group'}">${renderIcon('shield')} ${m.parentId ? 'Parent Role Access' : 'Manage Role Mappings'}</button>`;
  const editBtn = hasPerm('menus', 'update')
    ? `<button class="btn warn" onclick="editMenu('${m.id}')">✏️ Edit Menu</button>`
    : '';
  const delBtn = hasPerm('menus', 'delete')
    ? `<button class="btn danger" onclick="deleteMenu('${m.id}')">🗑️ Delete Menu</button>`
    : '';

  if ($('menuDetailActions')) {
    $('menuDetailActions').innerHTML = `${mapBtn} ${editBtn} ${delBtn}`;
  }

  // Role access lives on the top-level parent; submenus show it as inherited
  const roleOwner = getMenuRoleOwner(db, m);
  const roleIds = Array.isArray(roleOwner.roleIds) ? roleOwner.roleIds : [];
  const inheritedNote = m.parentId
    ? `<div class="badge submenu-badge" style="margin-bottom:10px;">${renderIcon('layers')} Inherited from top-level menu "${escapeHtml(roleOwner.title)}" — submenus have no separate role option</div>`
    : '';

  let rolesBlock = '';
  if (roleIds.length === 0) {
    rolesBlock = `<div class="detail-card">
      <h4>🛡️ Role Access Mapping</h4>
      ${inheritedNote}
      <div class="badge primary" style="font-size:0.9rem; padding: 6px 14px; margin-top:8px;">${renderIcon('globe')} Available to All Roles</div>
      <p class="muted small" style="margin-top:8px;">No role restrictions applied. Every authenticated user can see this menu group in their navigation sidebar.</p>
    </div>`;
  } else {
    const rolesList = roleIds.map(rid => {
      const r = (db.roles || []).find(x => x.id === rid);
      const userCount = (db.users || []).filter(u => u.roleId === rid).length;
      return `<div class="mapped-role-row">
        <div class="mapped-role-name">${renderIcon('shield')} <b>${r ? escapeHtml(r.name) : 'Deleted Role'}</b></div>
        <div class="mapped-role-meta"><span class="badge info">${userCount} user(s) assigned</span></div>
      </div>`;
    }).join('');

    rolesBlock = `<div class="detail-card">
      <h4>🛡️ Mapped Roles (${roleIds.length})</h4>
      ${inheritedNote}
      <p class="muted small" style="margin-bottom:12px;">Users belonging to any of these roles have sidebar navigation access:</p>
      <div class="mapped-roles-list">${rolesList}</div>
    </div>`;
  }

  const logs = getEntityAudit('Menus', m.title);
  const auditHtml = logs.length ? `
    <div class="detail-card">
      <h4>📜 Activity Audit Trail</h4>
      <div class="entity-audit-list">
        ${logs.map(l => `
          <div class="entity-audit-item">
            <div class="space-between">
              <span class="badge ${l.action === 'add' ? 'success' : l.action === 'update' ? 'warn' : 'danger'}">${l.action.toUpperCase()}</span>
              <span class="muted small">${timeAgo(l.timestamp)}</span>
            </div>
            <div class="small mt"><b>User:</b> ${escapeHtml(l.user)}</div>
            ${l.action === 'update' ? `<div class="small mt muted"><b>Changes:</b><br>${l.newValue}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  if ($('menuDetailContent')) {
    $('menuDetailContent').innerHTML = `
      <div class="detail-layout-split">
        <div class="detail-main">
          <div class="detail-card">
            <div class="space-between mb">
              <div class="user-cell">
                <div class="user-avatar" style="font-size: 1.5rem; width: 48px; height: 48px; background: var(--bg-hover);">${renderIcon(m.icon)}</div>
                <div>
                  <h3 style="margin:0;">${escapeHtml(m.title)}</h3>
                  <code style="color: var(--primary);">${escapeHtml(m.route)}</code>
                </div>
              </div>
              <span class="badge ${m.status === 'active' ? 'success' : 'muted'}">${m.status.toUpperCase()}</span>
            </div>
            <div class="detail-grid mt">
              <div class="detail-field">
                <span class="detail-label">Menu ID</span>
                <span class="detail-value"><code>${escapeHtml(m.id)}</code></span>
              </div>
              <div class="detail-field">
                <span class="detail-label">Target Type</span>
                <span class="detail-value">${m.targetType === 'external' ? '🌐 Web View (opens inside the app)' : '⚡ SPA Internal Route'}</span>
              </div>
              <div class="detail-field">
                <span class="detail-label">Menu Level</span>
                <span class="detail-value">${m.parentId
                  ? `<span class="badge submenu-badge">${renderIcon('layers')} Submenu of ${escapeHtml(menuParentTitle(db, m.parentId) || 'Deleted Menu')}</span>`
                  : `<span class="badge muted">${renderIcon('compass')} Top-Level Menu</span>`}</span>
              </div>
              <div class="detail-field">
                <span class="detail-label">Navigation Path</span>
                <span class="detail-value"><code>${escapeHtml(menuPathLabel(db, m))}</code></span>
              </div>
              <div class="detail-field">
                <span class="detail-label">Sub-items (Submenus)</span>
                <span class="detail-value">${(() => {
                  const kids = getMenuChildren(db, m.id);
                  if (!kids.length) return '<span class="muted small">None</span>';
                  return kids.map(k => `<span class="badge submenu-badge" style="margin: 2px 4px 2px 0;">${renderIcon('chevron-right')} ${escapeHtml(k.title)}</span>`).join('');
                })()}</span>
              </div>
              <div class="detail-field">
                <span class="detail-label">Display Order</span>
                <span class="detail-value"><b>#${m.order || 1}</b></span>
              </div>
              <div class="detail-field">
                <span class="detail-label">Access Policy</span>
                <span class="detail-value">${!m.roleIds || m.roleIds.length === 0 ? 'Public (All Roles)' : `${m.roleIds.length} Roles Mapped`}</span>
              </div>
              <div class="detail-field full">
                <span class="detail-label">Description</span>
                <span class="detail-value">${escapeHtml(m.description || 'No description provided')}</span>
              </div>
            </div>
          </div>
          ${rolesBlock}
        </div>
        <div class="detail-side">
          ${auditHtml}
        </div>
      </div>
    `;
  }

  setModuleView('menus', 'detail');
};

window.deleteMenu = function(id) {
  if (!hasPerm('menus', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const m = (db.menus || []).find(x => x.id === id);
  if (!m) return;

  // Cascade delete: a parent takes its whole submenu tree down with it
  const doomed = new Set([id, ...getMenuDescendantIds(db, id)]);
  const kids = (db.menus || []).filter(x => x.id !== id && doomed.has(x.id));
  const extraMsg = kids.length
    ? `\n\n⚠️ Iske ${kids.length} submenu item(s) bhi delete ho jayenge:\n• ${kids.map(k => k.title).join('\n• ')}\n\nYe action wapas nahi aayega.`
    : '';
  askConfirm(`Delete menu "${m.title}"?${extraMsg}`, 'Yes, delete menu + submenus').then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    db2.menus = (db2.menus || []).filter(x => !doomed.has(x.id));
    saveDB(db2);
    logAudit('Menus', 'delete', m.title, summarize('menus', m),
      kids.length ? `— (cascade deleted with ${kids.length} submenu item(s): ${kids.map(k => k.title).join(', ')})` : '—');
    doomed.forEach(did => {
      window.expandedMenuGroups.delete(did);
      window.collapsedMenuGroups.delete(did);
      if (window.activeDynamicMenuId === did) window.activeDynamicMenuId = '';
    });
    renderMenus();
    renderSidebar();
    renderRoleMenuMappingUI();
    renderAudit();
    setModuleView('menus', 'list');
    toast(kids.length
      ? `Menu + ${kids.length} submenu item(s) deleted`
      : 'Menu deleted');
  });
};

// ---------- AUDIT LOG ----------
function countPerms(p) {
  let n = 0;
  Object.values(p || {}).forEach(m => PERMS.forEach(k => { if (m && m[k]) n++; }));
  return n;
}
function parentName(pid) {
  if (!pid) return '';
  const db = loadDB();
  const p = (db.categories || []).find(x => x.id === pid);
  return p ? p.name : '';
}
function catName(id) {
  if (!id) return '—';
  const db = loadDB();
  const c = (db.categories || []).find(x => x.id === id);
  return c ? c.name : '—';
}
// Field-wise diff: only changed fields as "label: old" / "label: new" lines
function diffRows(pairs) {
  const changed = pairs.filter(([l, o, n]) => String(o ?? '—') !== String(n ?? '—'));
  if (!changed.length) return { old: 'No changes', new: 'No changes' };
  return {
    old: changed.map(([l, o]) => `${l}: ${o ?? '—'}`).join('<br>'),
    new: changed.map(([l, , n]) => `${l}: ${n ?? '—'}`).join('<br>')
  };
}
// Field-wise list for newly added records
function addRows(pairs) {
  return pairs.map(([l, v]) => `${l}: ${v ?? '—'}`).join('<br>');
}
function summarize(module, o) {
  if (!o) return '—';
  switch (module) {
    case 'users': return `${o.username} (dept: ${deptName(o.departmentId)}, role: ${roleName(o.roleId)})`;
    case 'roles': return `${o.name} [${countPerms(o.permissions)} permissions]`;
    case 'departments': return o.name;
    case 'categories': return parentName(o.parentId) ? `${o.name} (parent: ${parentName(o.parentId)})` : o.name;
    case 'projects': return `${o.name} [${(o.categoryIds || []).length} categories]`;
    case 'documents': return `${o.title} (v${o.currentVersion || 0})`;
    case 'menus': return `${o.icon || '🧭'} ${o.title} (${o.route || ''})${o.parentId ? ' [submenu]' : ''} [${(o.roleIds || []).length ? o.roleIds.length + ' roles' : 'All roles'}]`;
    default: return o.name || o.title || o.username || '';
  }
}
function logAudit(module, action, record, oldValue, newValue) {
  const db = loadDB();
  if (!Array.isArray(db.audit)) db.audit = [];
  const u = currentUser();
  db.audit.push({
    id: uid('a'), datetime: new Date().toISOString(),
    userId: u ? u.id : null, username: u ? u.username : 'System',
    module, action, record: record || '',
    oldValue: oldValue || '—', newValue: newValue || '—'
  });
  while (db.audit.length > 500) db.audit.shift(); // cap storage
  saveDB(db);
}
function renderAuditModuleFilter() {
  const db = loadDB();
  const mods = [...new Set((db.audit || []).map(a => a.module))];
  MODULES.forEach(m => { if (!mods.includes(m.label)) mods.push(m.label); });
  if (!mods.includes('Auth')) mods.push('Auth');
  const cur = $('auditModule').value;
  $('auditModule').innerHTML = '<option value="">All Modules</option>' +
    mods.map(m => `<option value="${m}">${m}</option>`).join('');
  if ([...$('auditModule').options].some(o => o.value === cur)) $('auditModule').value = cur;
}
let auditPage = 1;
const AUDIT_PER_PAGE = 10;
function getFilteredAudit() {
  const db = loadDB();
  const q = ($('auditSearch').value || '').toLowerCase();
  const fm = $('auditModule').value, fa = $('auditAction').value;
  const all = [...(db.audit || [])].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  return all.filter(a => {
    if (fm && a.module !== fm) return false;
    if (fa && a.action !== fa) return false;
    if (q && !((a.username || '').toLowerCase().includes(q) || (a.record || '').toLowerCase().includes(q))) return false;
    return true;
  });
}
function renderAudit() {
  if (!$('auditGrid') && !$('auditTable')) return;
  renderAuditModuleFilter();
  const list = getFilteredAudit();
  const total = list.length;
  if ($('auditCount')) {
    $('auditCount').textContent = total
      ? `Total ${total} audit log entr${total === 1 ? 'y' : 'ies'} recorded.`
      : 'No audit entries yet.';
  }
  const canClear = hasPerm('audit', 'delete');
  if ($('auditClear')) $('auditClear').disabled = !canClear;

  const columnDefs = [
    {
      headerName: 'Action',
      field: 'action',
      pinned: 'left',
      lockPinned: true,
      width: 120,
      minWidth: 110,
      maxWidth: 150,
      cellRenderer: (params) => {
        const act = params.value || '';
        let cls = 'primary';
        if (act === 'delete') cls = 'danger';
        else if (act === 'update') cls = 'warning';
        else if (act === 'add') cls = 'success';
        return `<span class="badge ${cls}">${escapeHtml(act)}</span>`;
      }
    },
    {
      headerName: 'Timestamp',
      field: 'datetime',
      width: 175,
      valueFormatter: (params) => new Date(params.value).toLocaleString('en-IN')
    },
    {
      headerName: 'Actor',
      field: 'username',
      width: 130,
      cellRenderer: (params) => `<b>${escapeHtml(params.value || '')}</b>`
    },
    {
      headerName: 'Module',
      field: 'module',
      width: 130,
      cellRenderer: (params) => `<span class="badge">${escapeHtml(params.value || '')}</span>`
    },
    {
      headerName: 'Target Record',
      field: 'record',
      minWidth: 160,
      flex: 1.2,
      cellRenderer: (params) => `<b>${escapeHtml(params.value || '')}</b>`
    },
    {
      headerName: 'Original Value',
      field: 'oldValue',
      minWidth: 160,
      flex: 1.2,
      cellRenderer: (params) => escapeHtml(params.value || '—')
    },
    {
      headerName: 'New Value',
      field: 'newValue',
      minWidth: 160,
      flex: 1.2,
      cellRenderer: (params) => escapeHtml(params.value || '—')
    }
  ];

  initOrUpdateAGGrid('audit', 'auditGrid', columnDefs, list, {
    paginationPageSize: 15,
    paginationPageSizeSelector: [15, 30, 50, 100]
  });
}
function renderAuditPager(pages) {
  const el = $('auditPager');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }
  const nums = [];
  const push = p => { if (p >= 1 && p <= pages && !nums.includes(p)) nums.push(p); };
  push(1); push(auditPage - 1); push(auditPage); push(auditPage + 1); push(pages);
  nums.sort((a, b) => a - b);
  let html = `<button onclick="auditGoto(${auditPage - 1})" ${auditPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;
  let prev = 0;
  nums.forEach(p => {
    if (p - prev > 1) html += '<span class="muted">…</span>';
    html += `<button class="${p === auditPage ? 'active' : ''}" onclick="auditGoto(${p})">${p}</button>`;
    prev = p;
  });
  html += `<button onclick="auditGoto(${auditPage + 1})" ${auditPage === pages ? 'disabled' : ''}>Next ›</button>`;
  el.innerHTML = html;
}
window.auditGoto = function (p) {
  auditPage = p;
  renderAudit();
};
function csvCell(v) {
  let s = String(v ?? '').replace(/<br\s*\/?>/gi, ' | ').replace(/<[^>]*>/g, '');
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
window.exportAuditCSV = function () {
  if (!hasPerm('audit', 'read')) return showAlert('You do not have permission to export');
  const list = getFilteredAudit();
  if (!list.length) return showAlert('Nothing to export with current filters');
  const rows = [['Date & Time', 'User', 'Module', 'Action', 'Record', 'Old Value', 'New Value']];
  list.forEach(a => rows.push([
    new Date(a.datetime).toLocaleString('en-IN'),
    a.username || '', a.module || '', a.action || '', a.record || '',
    a.oldValue || '', a.newValue || ''
  ]));
  const csv = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\n');
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  const fname = `audit-log-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = fname;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  toast(`${list.length} entries exported`);
};
window.clearAudit = function () {  if (!hasPerm('audit', 'delete')) return showAlert('You do not have delete permission');
  askConfirm('Clear the entire audit log?', 'Yes, clear').then(ok => {
    if (!ok) return;
    const db = loadDB();
    db.audit = [];
    auditPage = 1;
    saveDB(db); renderAudit(); renderDashboard();
    toast('Audit log cleared');
  });
};

// ==========================================================================
// ANNOUNCEMENT BROADCAST ENGINE & HEADER MARQUEE TICKER
// ==========================================================================
window._tickerPaused = false;
window._tickerDismissed = false;

function toLocalDateTimeInput(d) {
  if (!d) d = new Date();
  if (typeof d === 'string') d = new Date(d);
  if (isNaN(d.getTime())) d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimePretty(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return isoStr;
  }
}

function isAnnouncementActive(a) {
  if (!a || a.status !== 'active') return false;
  const now = Date.now();
  const start = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
  const expiry = a.expiryDateTime ? new Date(a.expiryDateTime).getTime() : Infinity;
  return now >= start && now < expiry;
}

function getAnnouncementState(a) {
  if (!a || a.status === 'inactive') return 'inactive';
  const now = Date.now();
  const start = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
  const expiry = a.expiryDateTime ? new Date(a.expiryDateTime).getTime() : Infinity;
  if (now < start) return 'scheduled';
  if (now >= expiry) return 'expired';
  return 'active';
}

function formatTimeRemaining(expiryStr) {
  if (!expiryStr) return '';
  const diff = new Date(expiryStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const totalMins = Math.floor(diff / 60000);
  if (totalMins < 60) return `${totalMins}m left`;
  const hrs = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m left`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h left`;
}

function getAnnTypeMeta(type) {
  switch (type) {
    case 'urgent':
      return { label: 'URGENT', icon: '🚨', cssClass: 'ticker-type-urgent' };
    case 'important':
      return { label: 'IMPORTANT', icon: '⚠️', cssClass: 'ticker-type-important' };
    case 'info':
    default:
      return { label: 'INFO', icon: 'ℹ️', cssClass: 'ticker-type-info' };
  }
}

function updateAnnouncementTicker() {
  const db = loadDB();
  if (!db || !Array.isArray(db.announcements)) return;

  // Filter ONLY currently active (non-expired and started) announcements
  const activeList = db.announcements.filter(isAnnouncementActive);
  const tickerBar = $('announcementTickerBar');
  const notifBadge = $('notifBadge');

  if (notifBadge) {
    if (activeList.length > 0) {
      notifBadge.textContent = activeList.length;
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }
  }

  if (!tickerBar) return;

  if (activeList.length === 0 || window._tickerDismissed) {
    tickerBar.classList.add('hidden');
    return;
  }

  tickerBar.classList.remove('hidden');
  const liveCountEl = $('tickerLiveCount');
  if (liveCountEl) liveCountEl.textContent = activeList.length;

  const track = $('tickerMarqueeTrack');
  if (track) {
    const itemsHtml = activeList.map(a => {
      const meta = getAnnTypeMeta(a.type);
      const rem = formatTimeRemaining(a.expiryDateTime);
      const descSnippet = (a.description || '').replace(/\s+/g, ' ');
      return `
        <div class="ticker-item" onclick="openAnnouncementDetailModal('${a.id}')" title="Click to view full announcement">
          <span class="ticker-type-pill ${meta.cssClass}">${meta.icon} ${meta.label}</span>
          <span class="ticker-item-title">${escapeHtml(a.title)}:</span>
          <span class="ticker-item-desc">${escapeHtml(descSnippet)}</span>
          <span class="ticker-item-time">⏳ ${rem}</span>
          <span class="ticker-item-sep">•</span>
        </div>`;
    }).join('');

    // Duplicate content if short to make continuous loop marquee seamless
    track.innerHTML = itemsHtml + (activeList.length < 3 ? itemsHtml : '');
    track.classList.toggle('paused', !!window._tickerPaused);
  }
}

window.toggleTickerPause = function() {
  window._tickerPaused = !window._tickerPaused;
  const track = $('tickerMarqueeTrack');
  const btn = $('tickerPauseBtn');
  if (track) track.classList.toggle('paused', window._tickerPaused);
  if (btn) btn.textContent = window._tickerPaused ? '▶' : '⏸';
  toast(window._tickerPaused ? 'Ticker animation paused' : 'Ticker animation resumed', 'info');
};

window.dismissTickerBar = function() {
  window._tickerDismissed = true;
  const tickerBar = $('announcementTickerBar');
  if (tickerBar) tickerBar.classList.add('hidden');
  toast('Announcement ticker hidden. Click the notification bell to restore.', 'info');
};

window.handleNotifBellClick = function() {
  const db = loadDB();
  const activeList = (db.announcements || []).filter(isAnnouncementActive);
  if (window._tickerDismissed && activeList.length > 0) {
    window._tickerDismissed = false;
    updateAnnouncementTicker();
    toast(`Restored announcement ticker (${activeList.length} live notice${activeList.length > 1 ? 's' : ''})`, 'success');
  } else if (activeList.length > 0) {
    openAnnouncementDetailModal(activeList[0].id);
  } else {
    toast('No live announcements at this time.', 'info');
  }
};

window.openAnnouncementDetailModal = function(id) {
  const db = loadDB();
  const a = (db.announcements || []).find(x => x.id === id);
  if (!a) return;

  const modal = $('annDetailModal');
  if (!modal) return;

  const meta = getAnnTypeMeta(a.type);
  const state = getAnnouncementState(a);
  const rem = formatTimeRemaining(a.expiryDateTime);

  $('modalAnnTypeBadge').className = `ticker-type-pill ${meta.cssClass}`;
  $('modalAnnTypeBadge').textContent = `${meta.icon} ${meta.label}`;
  $('modalAnnTitle').textContent = a.title;
  $('modalAnnStart').textContent = formatDateTimePretty(a.startDateTime);
  $('modalAnnExpiry').textContent = formatDateTimePretty(a.expiryDateTime);
  $('modalAnnRemaining').textContent = rem;
  $('modalAnnDesc').textContent = a.description || '—';

  const statusBadge = $('modalAnnStatusBadge');
  if (statusBadge) {
    statusBadge.className = `badge badge-${state}`;
    statusBadge.textContent = state === 'active' ? '🟢 Live Broadcast' : (state === 'scheduled' ? '⏳ Scheduled' : (state === 'expired' ? '⛔ Expired' : '⚪ Inactive'));
  }

  const actBox = $('modalAnnActionBtns');
  if (actBox) {
    let extraBtns = '';
    if (hasPerm('announcements', 'update')) {
      extraBtns += `<button type="button" class="btn warn sm" onclick="closeAnnModal(); editAnnouncement('${a.id}');">✏️ Edit</button>`;
    }
    if (hasPerm('announcements', 'delete')) {
      extraBtns += `<button type="button" class="btn danger sm" onclick="closeAnnModal(); deleteAnnouncement('${a.id}');">🗑️ Delete</button>`;
    }
    actBox.innerHTML = extraBtns + `<button type="button" class="btn primary sm" onclick="closeAnnModal()">Close</button>`;
  }

  modal.classList.remove('hidden');
};

window.closeAnnModal = function() {
  const modal = $('annDetailModal');
  if (modal) modal.classList.add('hidden');
};

function renderAnnouncements(refreshGrid = true) {
  const db = loadDB();
  if (!Array.isArray(db.announcements)) db.announcements = [];

  const list = db.announcements;

  // Summary counts
  let activeCount = 0, schedCount = 0, expCount = 0;
  list.forEach(a => {
    const s = getAnnouncementState(a);
    if (s === 'active') activeCount++;
    else if (s === 'scheduled') schedCount++;
    else if (s === 'expired') expCount++;
  });

  if ($('statTotalAnn')) $('statTotalAnn').textContent = list.length;
  if ($('statActiveAnn')) $('statActiveAnn').textContent = activeCount;
  if ($('statScheduledAnn')) $('statScheduledAnn').textContent = schedCount;
  if ($('statExpiredAnn')) $('statExpiredAnn').textContent = expCount;

  // Form permission guard
  if ($('annForm')) {
    const btn = $('annForm').querySelector('button[type=submit]');
    if (btn) btn.disabled = !(hasPerm('announcements', 'add') || hasPerm('announcements', 'update'));
  }

  // Filter values
  const q = ($('annSearch') && $('annSearch').value || '').toLowerCase().trim();
  const fType = ($('annFilterType') && $('annFilterType').value || '').trim();
  const fStatus = ($('annFilterStatus') && $('annFilterStatus').value || '').trim();

  const filtered = list.filter(a => {
    if (fType && a.type !== fType) return false;
    if (fStatus && getAnnouncementState(a) !== fStatus) return false;
    if (q) {
      const match = (a.title || '').toLowerCase().includes(q) ||
                    (a.description || '').toLowerCase().includes(q) ||
                    (a.createdBy || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const columnDefs = [
    {
      headerName: 'Actions',
      field: 'id',
      pinned: 'left',
      lockPinned: true,
      width: 250,
      minWidth: 240,
      maxWidth: 275,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params) => {
        const a = params.data;
        if (!a) return '';
        const viewBtn = `<button type="button" class="btn btn-act-view sm" onclick="viewAnnouncement('${a.id}')" title="View Announcement">👁️ View</button>`;
        const editBtn = hasPerm('announcements', 'update')
          ? `<button type="button" class="btn warn sm" onclick="editAnnouncement('${a.id}')" title="Edit Announcement">✏️ Edit</button>` : '';
        const delBtn = hasPerm('announcements', 'delete')
          ? `<button type="button" class="btn danger sm" onclick="deleteAnnouncement('${a.id}')" title="Delete Announcement">🗑️ Del</button>` : '';
        const toggleBtn = hasPerm('announcements', 'update')
          ? `<button type="button" class="btn secondary sm" onclick="toggleAnnouncementStatus('${a.id}')" title="Toggle active/inactive">${a.status === 'active' ? '⏸ Pause' : '▶ Publish'}</button>` : '';
        return `<div class="grid-actions-cell">${viewBtn}${editBtn}${delBtn}${toggleBtn}</div>`;
      }
    },
    {
      headerName: 'Alert Level',
      field: 'type',
      width: 135,
      minWidth: 125,
      cellRenderer: (params) => {
        const meta = getAnnTypeMeta(params.value);
        return `<span class="ticker-type-pill ${meta.cssClass}">${meta.icon} ${meta.label}</span>`;
      }
    },
    {
      headerName: 'Announcement Title',
      field: 'title',
      width: 240,
      minWidth: 200,
      flex: 1.2,
      cellRenderer: (params) => `<div class="ann-grid-cell-title" title="${escapeHtml(params.value || '')}"><b>${escapeHtml(params.value || '')}</b></div>`
    },
    {
      headerName: 'Message Excerpt',
      field: 'description',
      width: 320,
      minWidth: 240,
      flex: 1.5,
      cellRenderer: (params) => `<div class="ann-grid-cell-desc" title="${escapeHtml(params.value || '')}">${escapeHtml(params.value || '—')}</div>`
    },
    {
      headerName: 'Live Status',
      field: '_state',
      width: 160,
      minWidth: 150,
      cellRenderer: (params) => {
        const st = params.value;
        if (st === 'active') return `<span class="badge badge-live">🟢 Live in Header</span>`;
        if (st === 'scheduled') return `<span class="badge badge-scheduled">⏳ Scheduled</span>`;
        if (st === 'expired') return `<span class="badge badge-expired">⛔ Auto-Expired</span>`;
        return `<span class="badge badge-inactive">⚪ Inactive</span>`;
      }
    },
    {
      headerName: 'Start Date & Time',
      field: 'startDateTime',
      width: 180,
      minWidth: 165,
      cellRenderer: (params) => `<span class="ann-grid-datetime" title="${params.value || ''}">📅 ${formatDateTimePretty(params.value)}</span>`
    },
    {
      headerName: 'Expiry Date & Time',
      field: 'expiryDateTime',
      width: 180,
      minWidth: 165,
      cellRenderer: (params) => `<span class="ann-grid-datetime" title="${params.value || ''}">⏱️ ${formatDateTimePretty(params.value)}</span>`
    },
    {
      headerName: 'Time Left',
      field: '_timeLeft',
      width: 130,
      minWidth: 115,
      cellRenderer: (params) => `<span class="badge ${params.value === 'Expired' ? 'badge-expired' : 'warn'}">${escapeHtml(params.value || '—')}</span>`
    }
  ];

  const rowData = filtered.map(a => ({
    ...a,
    _state: getAnnouncementState(a),
    _timeLeft: formatTimeRemaining(a.expiryDateTime)
  }));

  if (refreshGrid) {
    initOrUpdateAGGrid('announcements', 'announcementsGrid', columnDefs, rowData, {
      quickFilterText: q
    });
  }

  // Update fallback table
  const tbody = $('annTable');
  if (tbody) {
    tbody.innerHTML = rowData.map(a => `
      <tr>
        <td><b>${escapeHtml(a.title)}</b></td>
        <td>${escapeHtml(a.type)}</td>
        <td>${escapeHtml(a._state)}</td>
        <td>${formatDateTimePretty(a.startDateTime)}</td>
        <td>${formatDateTimePretty(a.expiryDateTime)}</td>
      </tr>
    `).join('');
  }
}

window.openCreateAnnouncement = function() {
  if (!hasPerm('announcements', 'add')) return showAlert('You do not have permission to create announcements');
  resetForm('annForm', 'annFormTitle', 'Add Announcement');
  $('annId').value = '';
  $('annType').value = 'info';
  $('annStatus').value = 'active';

  // Set default start now, default expiry 7 days later
  const now = new Date();
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  $('annStart').value = toLocalDateTimeInput(now);
  $('annExpiry').value = toLocalDateTimeInput(future);

  $('annCancel').classList.remove('hidden');
  restoreFormDraft('annForm');
  updateLiveAnnouncementPreview();
  setModuleView('announcements', 'form');
  saveLastNav({ type: 'page', page: 'announcements', view: 'form', mode: 'add' });
  if (window.location.hash !== '#announcements-add') {
    try { history.replaceState(null, '', '#announcements-add'); } catch (_) {}
  }
};

window.editAnnouncement = function(id) {
  const db = loadDB();
  const a = (db.announcements || []).find(x => x.id === id);
  if (!a) return;

  $('annId').value = a.id;
  $('annTitle').value = a.title || '';
  $('annType').value = a.type || 'info';
  $('annStatus').value = a.status || 'active';
  $('annStart').value = toLocalDateTimeInput(a.startDateTime);
  $('annExpiry').value = toLocalDateTimeInput(a.expiryDateTime);
  $('annDesc').value = a.description || '';

  restoreFormDraft('annForm');
  $('annId').value = a.id;
  $('annFormTitle').textContent = 'Edit Announcement';
  $('annCancel').classList.remove('hidden');
  updateLiveAnnouncementPreview();
  setModuleView('announcements', 'form');
  saveLastNav({ type: 'page', page: 'announcements', view: 'form', mode: 'edit', editId: id });
  if (window.location.hash !== '#announcements-edit-' + id) {
    try { history.replaceState(null, '', '#announcements-edit-' + id); } catch (_) {}
  }
};

window.viewAnnouncement = function(id) {
  const db = loadDB();
  const a = (db.announcements || []).find(x => x.id === id);
  if (!a) return;

  const meta = getAnnTypeMeta(a.type);
  const state = getAnnouncementState(a);
  const rem = formatTimeRemaining(a.expiryDateTime);

  $('annDetailActions').innerHTML = `
    ${hasPerm('announcements', 'update') ? `<button class="btn warn sm" onclick="editAnnouncement('${a.id}')">✏️ Edit Announcement</button>` : ''}
    ${hasPerm('announcements', 'delete') ? `<button class="btn danger sm" onclick="deleteAnnouncement('${a.id}')">🗑️ Delete</button>` : ''}
  `;

  $('annDetailContent').innerHTML = `
    <div class="detail-layout-split">
      <div>
        <div class="detail-card">
          <div class="detail-card-header space-between">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="ticker-type-pill ${meta.cssClass}">${meta.icon} ${meta.label}</span>
              <h3 style="margin:0;">${escapeHtml(a.title)}</h3>
            </div>
            <span class="badge badge-${state}">${state === 'active' ? '🟢 Live in Header' : (state === 'scheduled' ? '⏳ Scheduled' : (state === 'expired' ? '⛔ Expired' : '⚪ Inactive'))}</span>
          </div>
          <div class="detail-grid mt">
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <span class="detail-value">${escapeHtml(a.status)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Created By</span>
              <span class="detail-value">${escapeHtml(a.createdBy || 'admin')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Broadcast Starts</span>
              <span class="detail-value">${formatDateTimePretty(a.startDateTime)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Broadcast Expires</span>
              <span class="detail-value">${formatDateTimePretty(a.expiryDateTime)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Time Remaining</span>
              <span class="detail-value"><span class="badge warn">${rem}</span></span>
            </div>
          </div>
          <div class="detail-desc mt">
            <h4 style="margin:0 0 8px;">Detailed Content:</h4>
            <div style="background:var(--bg-surface-subtle);padding:14px;border-radius:8px;border:1px solid var(--border-subtle);line-height:1.6;white-space:pre-wrap;">${escapeHtml(a.description || '—')}</div>
          </div>
        </div>
      </div>
      <div class="side-col">
        <div class="side-info-card">
          <div class="side-card-header">
            <h4>📢 Live Ticker Simulation</h4>
          </div>
          <div class="preview-ticker-strip">
            <div class="ticker-badge sm"><span>📢</span></div>
            <div class="preview-ticker-content">
              <span class="ticker-type-pill ${meta.cssClass}">${meta.icon} ${meta.label}</span>
              <strong>${escapeHtml(a.title)}</strong>: ${escapeHtml((a.description || '').slice(0, 70))}...
            </div>
          </div>
          <p class="muted small mt-xs">This announcement broadcasts directly across header bar for all system users when active.</p>
        </div>
      </div>
    </div>
  `;

  setModuleView('announcements', 'detail');
};

window.deleteAnnouncement = function(id) {
  if (!hasPerm('announcements', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const a = (db.announcements || []).find(x => x.id === id);
  if (!a) return;

  askConfirm(`Are you sure you want to delete announcement "${a.title}"?`, 'Yes, delete').then(ok => {
    if (!ok) return;
    db.announcements = db.announcements.filter(x => x.id !== id);
    saveDB(db);
    logAudit('Announcements', 'delete', a.title, `Type: ${a.type}`, 'Deleted');
    renderAnnouncements();
    updateAnnouncementTicker();
    renderDashboard();
    renderAudit();
    setModuleView('announcements', 'list');
    toast(`Announcement "${a.title}" deleted`);
  });
};

window.toggleAnnouncementStatus = function(id) {
  if (!hasPerm('announcements', 'update')) return showAlert('You do not have update permission');
  const db = loadDB();
  const a = (db.announcements || []).find(x => x.id === id);
  if (!a) return;

  const nextStatus = a.status === 'active' ? 'inactive' : 'active';
  a.status = nextStatus;
  saveDB(db);
  logAudit('Announcements', 'update', a.title, `Status: ${a.status === 'active' ? 'inactive' : 'active'}`, `Status: ${nextStatus}`);
  renderAnnouncements();
  updateAnnouncementTicker();
  toast(`Announcement status changed to ${nextStatus}`);
};

function updateLiveAnnouncementPreview() {
  const title = ($('annTitle') && $('annTitle').value.trim()) || 'Notice Title';
  const type = ($('annType') && $('annType').value) || 'info';
  const status = ($('annStatus') && $('annStatus').value) || 'active';
  const desc = ($('annDesc') && $('annDesc').value.trim()) || 'Notice message snippet...';
  const start = $('annStart') ? $('annStart').value : '';
  const expiry = $('annExpiry') ? $('annExpiry').value : '';

  const meta = getAnnTypeMeta(type);

  if ($('prevTypePill')) {
    $('prevTypePill').className = `ticker-type-pill ${meta.cssClass}`;
    $('prevTypePill').textContent = `${meta.icon} ${meta.label}`;
  }
  if ($('prevTitle')) $('prevTitle').textContent = title;
  if ($('prevDesc')) $('prevDesc').textContent = desc.length > 70 ? desc.slice(0, 70) + '...' : desc;

  if ($('prevCardType')) {
    $('prevCardType').className = `ticker-type-pill ${meta.cssClass}`;
    $('prevCardType').textContent = `${meta.icon} ${meta.label}`;
  }
  if ($('prevCardStatus')) {
    $('prevCardStatus').textContent = status === 'active' ? 'Active' : 'Inactive';
    $('prevCardStatus').className = `badge ${status === 'active' ? 'badge-live' : 'badge-inactive'}`;
  }
  if ($('prevCardTitle')) $('prevCardTitle').textContent = title;
  if ($('prevCardDesc')) $('prevCardDesc').textContent = desc;
  if ($('prevCardTimers')) {
    $('prevCardTimers').textContent = `Starts: ${formatDateTimePretty(start)} • Expires: ${formatDateTimePretty(expiry)}`;
  }
  if ($('annDescCount')) {
    const len = ($('annDesc') && $('annDesc').value.length) || 0;
    $('annDescCount').textContent = `${len}/600`;
  }
}
window.updateLiveAnnouncementPreview = updateLiveAnnouncementPreview;

// ==========================================================================
// DATA BACKUP & RESTORE (JSON EXPORT / IMPORT ENGINE)
// ==========================================================================
let curBackupTab = 'export';
window._stagedBackupData = null;

window.openBackupModal = function() {
  if (!hasPerm('backup', 'read')) return showAlert('You do not have permission to access Backup & Restore');
  const modal = $('backupModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  switchBackupTab('export');
  updateBackupStats();
};

window.closeBackupModal = function() {
  const modal = $('backupModal');
  if (modal) modal.classList.add('hidden');
  window._stagedBackupData = null;
  if ($('backupFileInput')) $('backupFileInput').value = '';
  if ($('backupPasteArea')) $('backupPasteArea').value = '';
  if ($('importValidationBox')) {
    $('importValidationBox').className = 'import-validation-box hidden';
    $('importValidationBox').innerHTML = '';
  }
  if ($('btnExecuteRestore')) $('btnExecuteRestore').disabled = true;
};

window.switchBackupTab = function(tabName) {
  curBackupTab = tabName;
  ['export', 'import', 'reset'].forEach(t => {
    const btn = $('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1) + 'Backup');
    const pane = $('backupTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle('active', t === tabName);
    if (pane) pane.classList.toggle('hidden', t !== tabName);
  });
  if (tabName === 'export') updateBackupStats();
};

function updateBackupStats() {
  const db = loadDB();
  const raw = localStorage.getItem(DB_KEY) || '{}';
  const sizeKb = (new Blob([raw]).size / 1024).toFixed(1);
  if ($('backupDbSizeBadge')) $('backupDbSizeBadge').textContent = `${sizeKb} KB JSON`;

  const counts = [
    { label: 'Users', val: (db.users || []).length, icon: '👥' },
    { label: 'Roles', val: (db.roles || []).length, icon: '🛡️' },
    { label: 'Depts', val: (db.departments || []).length, icon: '🏢' },
    { label: 'Categories', val: (db.categories || []).length, icon: '📂' },
    { label: 'Projects', val: (db.projects || []).length, icon: '📁' },
    { label: 'Documents', val: (db.documents || []).length, icon: '📄' },
    { label: 'Menus', val: (db.menus || []).length, icon: '🧭' },
    { label: 'Announcements', val: (db.announcements || []).length, icon: '📢' },
    { label: 'Audit Logs', val: (db.audit || []).length, icon: '📋' },
  ];

  const grid = $('backupEntityStats');
  if (grid) {
    grid.innerHTML = counts.map(c => `
      <div class="backup-stat-item">
        <div class="backup-stat-val">${c.val}</div>
        <div class="backup-stat-lbl">${c.icon} ${c.label}</div>
      </div>
    `).join('');
  }
}

function verifyAdminPassword(entered) {
  if (!entered) return false;
  const db = loadDB();
  const adminUser = (db.users || []).find(u => u.username.toLowerCase() === 'admin');
  const adminRole = (db.roles || []).find(r => r.name === 'Admin');
  const adminUsers = (db.users || []).filter(u => u.username.toLowerCase() === 'admin' || (adminRole && u.roleId === adminRole.id));
  return adminUsers.some(u => u.password === entered || u.password === entered.trim()) ||
         (adminUser && (adminUser.password === entered || adminUser.password === entered.trim()));
}

function promptAdminPasswordAuth({ title, subtitle, confirmBtnText = 'Verify & Proceed', confirmBtnColor = '#4f46e5', icon = 'warning', onVerified }) {
  if (window.Swal) {
    Swal.fire({
      title: title || '🔒 Admin Password Required',
      html: `
        ${subtitle ? `<div style="text-align: left; margin-bottom: 12px; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); background: var(--bg-surface-subtle); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-subtle);">${subtitle}</div>` : ''}
        <p style="margin: 0 0 10px 0; font-size: 0.92rem; text-align: left; font-weight: 500;">Please enter the <strong>Admin Password</strong> to authorize:</p>
      `,
      input: 'password',
      inputPlaceholder: 'Enter admin password',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off',
        autocomplete: 'current-password',
        style: 'box-sizing: border-box; font-size: 1rem;'
      },
      icon: icon || 'warning',
      showCancelButton: true,
      confirmButtonText: confirmBtnText,
      confirmButtonColor: confirmBtnColor,
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#4b5563',
      focusConfirm: false,
      focusCancel: true,
      preConfirm: (inputPassword) => {
        if (!inputPassword) {
          Swal.showValidationMessage('Admin password is required');
          return false;
        }
        if (!verifyAdminPassword(inputPassword)) {
          Swal.showValidationMessage('Incorrect admin password. Action rejected.');
          return false;
        }
        return true;
      }
    }).then(result => {
      if (result.isConfirmed && typeof onVerified === 'function') {
        onVerified();
      }
    });
  } else {
    const entered = prompt((subtitle ? subtitle + '\n\n' : '') + 'Please enter the Admin Password to authorize:');
    if (entered === null) return;
    if (!entered) {
      return showAlert('Admin password is required', 'error');
    }
    if (!verifyAdminPassword(entered)) {
      return showAlert('Incorrect admin password. Action aborted.', 'error');
    }
    if (typeof onVerified === 'function') onVerified();
  }
}

function doExportApplicationJSON() {
  const db = loadDB();
  const u = currentUser();
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const currentTheme = localStorage.getItem(THEME_KEY) || db.theme || (document.documentElement.getAttribute('data-theme') || 'dark');
  db.theme = currentTheme;

  const payload = {
    _meta: {
      generator: 'AdminERP Backup Engine',
      app: 'AdminERP Enterprise',
      version: '2.5.0',
      exportedAt: now.toISOString(),
      exportedBy: u ? u.username : 'admin',
      format: 'AdminERP_FullBackup_v1',
      theme: currentTheme,
      counts: {
        users: (db.users || []).length,
        roles: (db.roles || []).length,
        departments: (db.departments || []).length,
        categories: (db.categories || []).length,
        projects: (db.projects || []).length,
        documents: (db.documents || []).length,
        menus: (db.menus || []).length,
        announcements: (db.announcements || []).length,
        audit: (db.audit || []).length
      }
    },
    theme: currentTheme,
    data: db
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const fname = `adminerp-backup-${timestamp}.json`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { URL.revokeObjectURL(a.href); } catch (_) {}
    if (typeof a.remove === 'function') a.remove();
    else if (a.parentNode) a.parentNode.removeChild(a);
  }, 150);

  logAudit('System', 'export', u ? u.username : 'admin', 'Full Database Backup', `Exported ${payload._meta.counts.users} users, ${payload._meta.counts.roles} roles, ${payload._meta.counts.menus} menus, theme: ${currentTheme} with admin password authorization`);
  toast('JSON Backup downloaded successfully!');
}

window.exportApplicationJSON = function() {
  if (!hasPerm('backup', 'read')) {
    return showAlert('You do not have permission to export backup data', 'error');
  }

  promptAdminPasswordAuth({
    title: '🔒 Export Backup Authorization',
    subtitle: 'Downloading the full system backup JSON contains user accounts, roles, documents, and database records.',
    confirmBtnText: 'Verify & Download',
    confirmBtnColor: '#4f46e5',
    onVerified: () => {
      doExportApplicationJSON();
    }
  });
};

function doCopyBackupJSONToClipboard() {
  const db = loadDB();
  const u = currentUser();
  const currentTheme = localStorage.getItem(THEME_KEY) || db.theme || (document.documentElement.getAttribute('data-theme') || 'dark');
  db.theme = currentTheme;
  const payload = {
    _meta: {
      generator: 'AdminERP Backup Engine',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      exportedBy: u ? u.username : 'admin',
      theme: currentTheme
    },
    theme: currentTheme,
    data: db
  };
  const jsonStr = JSON.stringify(payload, null, 2);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(() => {
      toast('Backup JSON copied to clipboard!');
      logAudit('System', 'export', u ? u.username : 'admin', 'Backup JSON Copy', 'Copied full database JSON to clipboard with admin password authorization');
    }).catch(() => fallbackCopy(jsonStr));
  } else {
    fallbackCopy(jsonStr);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('Backup JSON copied to clipboard!');
      logAudit('System', 'export', u ? u.username : 'admin', 'Backup JSON Copy', 'Copied full database JSON to clipboard with admin password authorization');
    } catch (_) {
      showAlert('Could not copy automatically. Please export file instead.');
    }
    if (typeof ta.remove === 'function') ta.remove();
    else if (ta.parentNode) ta.parentNode.removeChild(ta);
  }
}

window.copyBackupJSONToClipboard = function() {
  if (!hasPerm('backup', 'read')) {
    return showAlert('You do not have permission to export backup data', 'error');
  }

  promptAdminPasswordAuth({
    title: '🔒 Export Backup Authorization',
    subtitle: 'Copying the full database JSON to clipboard contains all credentials and records.',
    confirmBtnText: 'Verify & Copy',
    confirmBtnColor: '#4f46e5',
    onVerified: () => {
      doCopyBackupJSONToClipboard();
    }
  });
};

window.handleBackupFileSelect = function(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    parseAndValidateBackupJSON(evt.target.result);
  };
  reader.onerror = function() {
    showAlert('Error reading backup file', 'error');
  };
  reader.readAsText(file);
};

window.validatePastedJSON = function() {
  const raw = ($('backupPasteArea') && $('backupPasteArea').value || '').trim();
  if (!raw) {
    if ($('importValidationBox')) {
      $('importValidationBox').className = 'import-validation-box hidden';
      $('importValidationBox').innerHTML = '';
    }
    if ($('btnExecuteRestore')) $('btnExecuteRestore').disabled = true;
    window._stagedBackupData = null;
    return;
  }
  parseAndValidateBackupJSON(raw);
};

function parseAndValidateBackupJSON(rawText) {
  const box = $('importValidationBox');
  const btn = $('btnExecuteRestore');
  window._stagedBackupData = null;

  try {
    const parsed = JSON.parse(rawText);
    const dbData = (parsed && parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;

    if (!dbData || typeof dbData !== 'object' || Array.isArray(dbData)) {
      throw new Error('Invalid JSON format: root must be an object.');
    }

    if (!Array.isArray(dbData.users) || !Array.isArray(dbData.roles)) {
      throw new Error('Missing core application tables: `users` and `roles` arrays are required.');
    }

    // Capture theme from root payload, _meta, or dbData
    const backupTheme = parsed.theme || (parsed._meta && parsed._meta.theme) || dbData.theme;
    if (backupTheme && (backupTheme === 'dark' || backupTheme === 'light')) {
      dbData.theme = backupTheme;
    }

    const counts = {
      users: (dbData.users || []).length,
      roles: (dbData.roles || []).length,
      departments: (dbData.departments || []).length,
      categories: (dbData.categories || []).length,
      projects: (dbData.projects || []).length,
      documents: (dbData.documents || []).length,
      menus: (dbData.menus || []).length,
      announcements: (dbData.announcements || []).length,
      audit: (dbData.audit || []).length
    };

    window._stagedBackupData = dbData;

    if (box) {
      box.className = 'import-validation-box valid';
      box.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span>✅ Valid AdminERP Backup File</span>
        </div>
        <div style="font-size: 0.8rem; opacity: 0.95;">
          ${counts.users} Users • ${counts.roles} Roles • ${counts.departments} Depts • ${counts.projects} Projects • ${counts.menus} Dynamic Menus • ${counts.announcements} Announcements • ${counts.documents} Documents${backupTheme ? ` • 🎨 <b>${escapeHtml(backupTheme.toUpperCase())}</b> Theme` : ''}
        </div>
      `;
      box.classList.remove('hidden');
    }
    if (btn) btn.disabled = false;
  } catch (err) {
    window._stagedBackupData = null;
    if (box) {
      box.className = 'import-validation-box invalid';
      box.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span>❌ Invalid Backup JSON</span>
        </div>
        <div style="font-size: 0.8rem;">${escapeHtml(err.message || 'Error parsing JSON file')}</div>
      `;
      box.classList.remove('hidden');
    }
    if (btn) btn.disabled = true;
  }
}

window.executeDataRestore = function() {
  if (!window._stagedBackupData) return showAlert('Please select or paste a valid JSON backup file first', 'warning');
  if (!hasPerm('backup', 'update') && !hasPerm('backup', 'add')) {
    return showAlert('You do not have permission to restore system data', 'error');
  }

  const mode = document.querySelector('input[name="restoreMode"]:checked')?.value || 'replace';
  const staged = window._stagedBackupData;

  const confirmMsg = mode === 'replace'
    ? 'Are you sure you want to completely replace all application data with this backup? Current data will be overwritten.'
    : 'Are you sure you want to merge this backup data into your existing application?';

  return askConfirm(confirmMsg, mode === 'replace' ? 'Yes, Replace & Restore' : 'Yes, Merge & Restore').then(ok => {
    if (!ok) return;

    let finalDB;
    const backupTheme = staged.theme;
    if (mode === 'replace') {
      finalDB = {
        departments: Array.isArray(staged.departments) ? staged.departments : [],
        roles: Array.isArray(staged.roles) ? staged.roles : [],
        users: Array.isArray(staged.users) ? staged.users : [],
        categories: Array.isArray(staged.categories) ? staged.categories : [],
        projects: Array.isArray(staged.projects) ? staged.projects : [],
        documents: Array.isArray(staged.documents) ? staged.documents : [],
        menus: Array.isArray(staged.menus) ? staged.menus : [],
        announcements: Array.isArray(staged.announcements) ? staged.announcements : [],
        audit: Array.isArray(staged.audit) ? staged.audit : [],
        stats: (staged.stats && typeof staged.stats === 'object') ? staged.stats : {},
        theme: backupTheme || localStorage.getItem(THEME_KEY) || 'dark'
      };
    } else {
      const currentDB = loadDB();
      const mergeArr = (cur, inc) => {
        const existingIds = new Set((cur || []).map(x => x.id));
        const merged = (cur || []).slice();
        (inc || []).forEach(item => {
          if (!existingIds.has(item.id)) merged.push(item);
        });
        return merged;
      };

      finalDB = {
        departments: mergeArr(currentDB.departments, staged.departments),
        roles: mergeArr(currentDB.roles, staged.roles),
        users: mergeArr(currentDB.users, staged.users),
        categories: mergeArr(currentDB.categories, staged.categories),
        projects: mergeArr(currentDB.projects, staged.projects),
        documents: mergeArr(currentDB.documents, staged.documents),
        menus: mergeArr(currentDB.menus, staged.menus),
        announcements: mergeArr(currentDB.announcements, staged.announcements),
        audit: (currentDB.audit || []).concat(staged.audit || []),
        stats: Object.assign({}, currentDB.stats || {}, staged.stats || {}),
        theme: backupTheme || currentDB.theme || localStorage.getItem(THEME_KEY) || 'dark'
      };
    }

    saveDB(finalDB);
    seedDB();
    if (backupTheme && (backupTheme === 'dark' || backupTheme === 'light')) {
      applyTheme(backupTheme);
    }
    logAudit('System', 'import', (currentUser() && currentUser().username) || 'admin', 'Database Restore', `Restored via ${mode} mode${backupTheme ? ` (Theme: ${backupTheme})` : ''}`);

    closeBackupModal();
    renderAll();
    renderSidebar();
    restoreLastPage();

    if (window.Swal) {
      Swal.fire({
        icon: 'success',
        title: 'Restore Completed!',
        text: `Application data and ${backupTheme ? backupTheme.toUpperCase() + ' theme ' : ''}successfully restored (${mode === 'replace' ? 'Full Replace' : 'Smart Merge'}).`,
        confirmButtonColor: '#1e3a8a'
      });
    } else {
      toast('Application data restored successfully!');
    }
  });
};

window.executeFactoryReset = function() {
  if (!hasPerm('backup', 'delete')) {
    return showAlert('You do not have permission to reset system data to factory defaults', 'error');
  }

  const verifyAdminPassword = (entered) => {
    if (!entered) return false;
    const db = loadDB();
    const adminUser = (db.users || []).find(u => u.username.toLowerCase() === 'admin');
    const adminRole = (db.roles || []).find(r => r.name === 'Admin');
    const adminUsers = (db.users || []).filter(u => u.username.toLowerCase() === 'admin' || (adminRole && u.roleId === adminRole.id));
    return adminUsers.some(u => u.password === entered || u.password === entered.trim()) ||
           (adminUser && (adminUser.password === entered || adminUser.password === entered.trim()));
  };

  const performReset = () => {
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(DRAFT_PREFIX)) localStorage.removeItem(k);
      });
      localStorage.removeItem(LAST_NAV_KEY);
    } catch (_) {}

    localStorage.removeItem(DB_KEY);
    seedDB();
    localStorage.setItem(SESSION_KEY, 'u1');
    renderAll();
    renderSidebar();
    goPage('dashboard');
    closeBackupModal();
    logAudit('System', 'reset', 'admin', 'Factory Reset', 'Database reset to factory defaults with admin password authorization');

    if (window.Swal) {
      Swal.fire({
        icon: 'success',
        title: 'Factory Reset Completed',
        text: 'The system has been successfully reset to default factory state.',
        confirmButtonColor: '#1e3a8a'
      });
    } else {
      toast('System reset to factory defaults.');
    }
  };

  if (window.Swal) {
    Swal.fire({
      title: '⚠️ Factory Reset Authorization',
      html: `
        <div style="text-align: left; margin-bottom: 12px; font-size: 0.9rem; line-height: 1.5; color: #b91c1c; background: rgba(239, 68, 68, 0.08); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.25);">
          <strong>CRITICAL WARNING:</strong> This will permanently erase all custom users, roles, departments, categories, projects, documents, navigation menus, announcements, and audit logs.
        </div>
        <p style="margin: 0 0 10px 0; font-size: 0.92rem; text-align: left; font-weight: 500;">Please enter the <strong>Admin Password</strong> to authorize reset:</p>
      `,
      input: 'password',
      inputPlaceholder: 'Enter admin password',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off',
        autocomplete: 'current-password',
        style: 'box-sizing: border-box; font-size: 1rem;'
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Authorize & Reset',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#4b5563',
      focusConfirm: false,
      focusCancel: true,
      preConfirm: (inputPassword) => {
        if (!inputPassword) {
          Swal.showValidationMessage('Admin password is required');
          return false;
        }
        if (!verifyAdminPassword(inputPassword)) {
          Swal.showValidationMessage('Incorrect admin password. Action rejected.');
          return false;
        }
        return true;
      }
    }).then(result => {
      if (result.isConfirmed) {
        performReset();
      }
    });
  } else {
    const entered = prompt('CRITICAL WARNING: This will permanently erase all custom data and restore factory defaults.\n\nPlease enter the Admin Password to confirm Factory Reset:');
    if (entered === null) return;
    if (!entered) {
      return showAlert('Admin password is required to perform Factory Reset', 'error');
    }
    if (!verifyAdminPassword(entered)) {
      return showAlert('Incorrect admin password. Factory Reset aborted.', 'error');
    }
    performReset();
  }
};

function renderAll() {
  renderDashboard(); renderUsers(); renderRoles(); renderDepartments(); renderCategories(); renderProjects(); renderDocuments(); renderMenus(); renderRoleMenuMappingUI(); renderAnnouncements(); updateAnnouncementTicker(); renderAudit();
}
function resetForm(formId, titleId, titleText, extra) {
  $(formId).reset();
  const hid = $(formId).querySelector('input[type=hidden]');
  if (hid) hid.value = '';
  $(titleId).textContent = titleText;
  if (extra) extra();
}

// ---------- EVENTS ----------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  seedDB();
  if (currentUser()) showApp(); else showLogin();

  // Theme Switcher
  const themeBtn = $('themeToggleBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Spotlight Search trigger
  const searchBtn = $('searchTriggerBtn');
  if (searchBtn) searchBtn.addEventListener('click', openCmdPalette);

  // Password visibility toggle
  const togglePwBtn = $('togglePasswordBtn');
  if (togglePwBtn) {
    togglePwBtn.addEventListener('click', () => {
      const pwInput = $('loginPassword');
      if (!pwInput) return;
      const isPass = pwInput.type === 'password';
      pwInput.type = isPass ? 'text' : 'password';
      togglePwBtn.textContent = isPass ? '🙈' : '👁️';
    });
  }

  // Autofill demo admin credentials
  const demoBtn = $('fillDemoBtn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      $('loginUsername').value = 'admin';
      $('loginPassword').value = 'admin';
      toast('Demo credentials populated!');
    });
  }

  // KPI cards click-to-navigate
  document.querySelectorAll('.card-kpi[data-goto]').forEach(card => {
    card.addEventListener('click', () => {
      const page = card.dataset.goto;
      if (page) {
        if (hasPerm(page, 'read') || page === 'dashboard') {
          goPage(page);
        } else {
          showAlert('You do not have permission to access this module', 'warning');
        }
      }
    });
  });

  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const u = $('loginUsername').value.trim(), p = $('loginPassword').value;
    const found = db.users.find(x => x.username === u && x.password === p);
    if (!found) {
      showAlert('Invalid username or password!', 'error');
      return;
    }
    localStorage.setItem(SESSION_KEY, found.id);
    logAudit('Auth', 'login', found.username, '—', 'Signed in');
    $('loginForm').reset();
    showApp();
  });

  $('logoutBtn').addEventListener('click', doLogout);

  // ---------- MOBILE DRAWER ----------
  $('navToggle').addEventListener('click', () => {
    document.body.classList.contains('nav-open') ? closeNav() : openNav();
  });
  $('navOverlay').addEventListener('click', closeNav);

  // ---------- PROFILE ----------
  $('profileBtn').addEventListener('click', openProfile);
  document.querySelector('.userbox').addEventListener('click', openProfile);
  $('profileClose').addEventListener('click', closeProfile);
  $('changePassBtn').addEventListener('click', openChangePassword);
  $('deleteAllRolesBtn').addEventListener('click', () => { if (typeof window.deleteAllRoles === 'function') window.deleteAllRoles(); });
  $('profileModal').addEventListener('click', (e) => { if (e.target === $('profileModal')) closeProfile(); });

  // ---------- VERSIONS MODAL ----------
  $('versionsClose').addEventListener('click', closeVersions);
  $('versionsModal').addEventListener('click', (e) => { if (e.target === $('versionsModal')) closeVersions(); });

  // ---------- TOPBAR PROFILE DROPDOWN (3 options) ----------
  $('topAvatarBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('profileDropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.profile-menu-wrap')) $('profileDropdown').classList.add('hidden');
  });
  document.querySelectorAll('#profileDropdown button').forEach(b =>
    b.addEventListener('click', () => {
      $('profileDropdown').classList.add('hidden');
      if (b.dataset.act === 'profile') openProfile();
      else if (b.dataset.act === 'search') openCmdPalette();
      else if (b.dataset.act === 'backup') openBackupModal();
      else if (b.dataset.act === 'logout') doLogout();
    }));

  document.querySelectorAll('.menu-btn[data-page]').forEach(b =>
    b.addEventListener('click', () => goPage(b.dataset.page)));

  // ---------- KEYBOARD SHORTCUTS ----------
  // Ctrl+K = Search | Ctrl+Shift+L = Logout | Alt+1..7 = Pages | Alt+N = New focus | / = Search | Esc = Cancel
  // Palette events
  $('cmdInput').addEventListener('input', () => { cmdActiveIdx = 0; renderCmdList(); });
  $('cmdInput').addEventListener('keydown', (e) => {
    const list = cmdVisibleItems();
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdActiveIdx = Math.min(cmdActiveIdx + 1, list.length - 1); renderCmdList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdActiveIdx = Math.max(cmdActiveIdx - 1, 0); renderCmdList(); }
    else if (e.key === 'Enter') { e.preventDefault(); runCmdItem(list[cmdActiveIdx]); }
  });
  $('cmdPalette').addEventListener('click', (e) => { if (e.target === $('cmdPalette')) closeCmdPalette(); });
  document.addEventListener('keydown', (e) => {
    const loggedIn = !$('appScreen').classList.contains('hidden');
    const paletteOpen = !$('cmdPalette').classList.contains('hidden');

    // Ctrl + K -> Search palette
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (loggedIn) { paletteOpen ? closeCmdPalette() : openCmdPalette(); }
      return;
    }

    // Ctrl + Shift + L -> Logout (safe on login screen, runs only in app)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (loggedIn) doLogout();
      return;
    }
    if (!loggedIn) return;

    // Alt + 1..9 -> page navigation
    if (e.altKey && !e.ctrlKey && !e.shiftKey && ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
      e.preventDefault();
      const map = [
        { page: 'dashboard', module: null },
        { page: 'users', module: 'users' },
        { page: 'roles', module: 'roles' },
        { page: 'departments', module: 'departments' },
        { page: 'categories', module: 'categories' },
        { page: 'projects', module: 'projects' },
        { page: 'documents', module: 'documents' },
        { page: 'audit', module: 'audit' },
        { page: 'menus', module: 'menus' },
      ];
      const t = map[parseInt(e.key, 10) - 1];
      if (t.module && !hasPerm(t.module, 'read')) return; // no read permission, stay
      goPage(t.page);
      return;
    }

    // Alt + 0 -> Announcements
    if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key === '0') {
      e.preventDefault();
      if (hasPerm('announcements', 'read')) goPage('announcements');
      return;
    }

    // Ctrl + Shift + O -> open create screen for active module
    if (e.ctrlKey && e.shiftKey && !e.altKey && (e.key === 'O' || e.key === 'o' || e.code === 'KeyO')) {
      e.preventDefault();
      e.stopPropagation();
      triggerActiveModuleAdd();
      return;
    }

    // Alt + N -> open create screen for active module (backward compatible)
    if (e.altKey && !e.ctrlKey && !e.shiftKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) {
      e.preventDefault();
      triggerActiveModuleAdd();
      return;
    }

    // Esc -> close drawer/palette/profile/versions/quickRole first, then switch back to list view
    if (e.key === 'Escape') {
      if (document.body.classList.contains('nav-open')) { closeNav(); return; }
      if (paletteOpen) { closeCmdPalette(); return; }
      if ($('annDetailModal') && !$('annDetailModal').classList.contains('hidden')) { closeAnnModal(); return; }
      if ($('quickRoleModal') && !$('quickRoleModal').classList.contains('hidden')) { closeQuickRoleModal(); return; }
      if ($('quickDeptModal') && !$('quickDeptModal').classList.contains('hidden')) { closeQuickDeptModal(); return; }
      if ($('iconPickerModal') && !$('iconPickerModal').classList.contains('hidden')) { closeIconPickerModal(); return; }
      if (!$('profileModal').classList.contains('hidden')) { closeProfile(); return; }
      if (!$('versionsModal').classList.contains('hidden')) { closeVersions(); return; }
      const active = document.querySelector('.page:not(.hidden)');
      if (active) {
        const mod = active.id.replace('page-', '');
        const formEl = $(mod + '-form-view');
        const detailEl = $(mod + '-detail-view');
        if ((formEl && !formEl.classList.contains('hidden')) || (detailEl && !detailEl.classList.contains('hidden'))) {
          setModuleView(mod, 'list');
          return;
        }
      }
      return;
    }

    // "/" -> focus Document search (not while typing in an input)
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) {
      const docsVisible = !$('page-documents').classList.contains('hidden');
      if (docsVisible && $('docSearch')) { e.preventDefault(); $('docSearch').focus(); }
    }
  });

  // ---------- ENTER = NEXT FIELD (last field par Enter = submit) ----------
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = e.target;
    if (!t || !t.closest) return;
    const form = t.closest('form');
    if (!form) return;
    const tag = (t.tagName || '').toUpperCase();
    const type = (t.type || '').toLowerCase();
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
    if (type === 'checkbox' || type === 'radio' || type === 'file' || type === 'submit' || type === 'button') return;
    e.preventDefault();
    const fields = [...form.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), select')]
      .filter(el => !el.disabled && el.offsetParent !== null);
    const i = fields.indexOf(t);
    if (i >= 0 && i < fields.length - 1) fields[i + 1].focus();
    else if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else { const b = form.querySelector('button[type=submit]'); if (b) b.click(); }
  });

  // ---------- DRAFT AUTO-SAVE FOR ALL FORMS ----------
  const monitoredDraftForms = ['userForm', 'roleForm', 'deptForm', 'catForm', 'projForm', 'docForm', 'menuForm', 'announcementForm'];
  document.addEventListener('input', (e) => {
    const form = e.target && e.target.closest && e.target.closest('form');
    if (form && monitoredDraftForms.includes(form.id)) {
      saveFormDraft(form.id);
    }
  });
  document.addEventListener('change', (e) => {
    const form = e.target && e.target.closest && e.target.closest('form');
    if (form && monitoredDraftForms.includes(form.id)) {
      saveFormDraft(form.id);
    }
  });

  // USER FORM
  $('userForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('userId').value;
    const isDefaultAdmin = id && (id === 'u1' || db.users.some(x => x.id === id && x.username === 'admin'));
    if (isDefaultAdmin) {
      const ex = db.users.find(u => u.id === id);
      const newPass = $('userPass').value;
      if (!newPass) return showAlert('Password is required');
      ex.password = newPass;
      saveDB(db);
      logAudit('Users', 'update', 'admin', 'password changed', '••••••');
      resetForm('userForm', 'userFormTitle', 'Add User', () => {
        $('userCancel').classList.add('hidden');
        $('userName').disabled = false;
        $('userDept').disabled = false;
        $('userRole').disabled = false;
        if ($('adminLockNotice')) $('adminLockNotice').classList.add('hidden');
      });
      renderUsers(); renderDashboard(); renderAudit();
      setModuleView('users', 'list');
      toast('Admin password successfully updated');
      return;
    }

    const data = { username: $('userName').value.trim(), password: $('userPass').value, departmentId: $('userDept').value, roleId: $('userRole').value };
    if (!data.username || !data.password) return showAlert('Username and password are required');
    if (!id && !hasPerm('users', 'add')) return showAlert('You do not have add permission');
    if (id && !hasPerm('users', 'update')) return showAlert('You do not have update permission');
    if (db.users.some(u => u.username.toLowerCase() === data.username.toLowerCase() && u.id !== id))
      return showAlert('This username already exists');
    if (id) { const ex = db.users.find(u => u.id === id); var userBefore = { ...ex }; Object.assign(ex, data); }
    else db.users.push({ id: uid('u'), ...data });
    saveDB(db);
    if (id) {
      const ud = diffRows([
        ['username', userBefore.username, data.username],
        ['password', '••••', data.password === userBefore.password ? '••••' : '•••• (changed)'],
        ['department', deptName(userBefore.departmentId), deptName(data.departmentId)],
        ['role', roleName(userBefore.roleId), roleName(data.roleId)]
      ]);
      logAudit('Users', 'update', data.username, ud.old, ud.new);
    } else logAudit('Users', 'add', data.username, '—', addRows([
      ['username', data.username],
      ['password', '••••'],
      ['department', deptName(data.departmentId)],
      ['role', roleName(data.roleId)]
    ]));
    resetForm('userForm', 'userFormTitle', 'Add User', () => {
      $('userCancel').classList.add('hidden');
      $('userName').disabled = false;
      $('userDept').disabled = false;
      $('userRole').disabled = false;
      if ($('adminLockNotice')) $('adminLockNotice').classList.add('hidden');
    });
    renderUsers(); renderDashboard(); renderAudit();
    setModuleView('users', 'list');
    toast(id ? 'User updated' : 'User added');
  });
  $('userCancel').addEventListener('click', () => {
    resetForm('userForm', 'userFormTitle', 'Add User', () => {
      $('userCancel').classList.add('hidden');
      $('userName').disabled = false;
      $('userDept').disabled = false;
      $('userRole').disabled = false;
      if ($('adminLockNotice')) $('adminLockNotice').classList.add('hidden');
    });
    updateLiveUserPreview();
    setModuleView('users', 'list');
  });

  // LIVE USER PREVIEW LISTENERS
  if ($('userName')) $('userName').addEventListener('input', updateLiveUserPreview);
  if ($('userPass')) $('userPass').addEventListener('input', updateLiveUserPreview);
  if ($('userDept')) $('userDept').addEventListener('change', updateLiveUserPreview);
  if ($('userRole')) $('userRole').addEventListener('change', updateLiveUserPreview);

  // ROLE FORM
  renderPermMatrix(emptyPerms());
  // Row-wise All + Column-wise All + Global All
  document.addEventListener('change', (e) => {
    const t = e.target;
    // Row All: toggle all 4 permissions of one module row
    if (t.matches('#permTable input[data-row-all]')) {
      const mk = t.dataset.rowAll;
      document.querySelectorAll(`#permTable input[data-module="${mk}"]`).forEach(c => c.checked = t.checked);
      syncPermHeaders();
    }
    // Column All: toggle one permission for all modules
    else if (t.matches('[data-col-all]')) {
      const pm = t.dataset.colAll;
      document.querySelectorAll(`#permTable input[data-perm="${pm}"]`).forEach(c => c.checked = t.checked);
      syncPermHeaders();
    }
    // Global All: toggle everything
    else if (t.id === 'permAllGlobal') {
      document.querySelectorAll('#permTable input[type=checkbox]').forEach(c => c.checked = t.checked);
    }
    // re-sync headers when a single checkbox changes
    else if (t.matches('#permTable input[data-module]')) {
      syncPermHeaders();
    }

    // Quick role modal: Row All, Column All, Global All, Single checkbox
    else if (t.matches('#quickPermTable input[data-quick-row-all]')) {
      const mk = t.dataset.quickRowAll;
      document.querySelectorAll(`#quickPermTable input[data-quick-module="${mk}"]`).forEach(c => c.checked = t.checked);
      syncQuickPermHeaders();
    }
    else if (t.matches('[data-quick-col]')) {
      const pm = t.dataset.quickCol;
      document.querySelectorAll(`#quickPermTable input[data-quick-perm="${pm}"]`).forEach(c => c.checked = t.checked);
      syncQuickPermHeaders();
    }
    else if (t.id === 'quickPermAllGlobal') {
      document.querySelectorAll('#quickPermTable input[type=checkbox]').forEach(c => c.checked = t.checked);
    }
    else if (t.matches('#quickPermTable input[data-quick-module]')) {
      syncQuickPermHeaders();
    }
  });
  $('roleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('roleId').value;
    const name = $('roleName').value.trim();
    const permissions = readPermMatrix();
    if (!name) return showAlert('Role name is required');
    if (id) {
      const exRole = db.roles.find(r => r.id === id);
      if (exRole && (exRole.name === 'Admin' || exRole.id === 'r1')) {
        return showAlert('The default Admin role is a protected system role and cannot be modified');
      }
    }
    if (!id && !hasPerm('roles', 'add')) return showAlert('You do not have add permission');
    if (id && !hasPerm('roles', 'update')) return showAlert('You do not have update permission');
    if (db.roles.some(r => r.name.toLowerCase() === name.toLowerCase() && r.id !== id))
      return showAlert('This role already exists');
    if (id) { const ex = db.roles.find(r => r.id === id); var roleBefore = { ...ex, permissions: JSON.parse(JSON.stringify(ex.permissions || {})) }; Object.assign(ex, { name, permissions }); }
    else db.roles.push({ id: uid('r'), name, permissions });
    saveDB(db);
    if (id) {
      const permPairs = MODULES.map(m => {
        const oo = PERMS.filter(k => (roleBefore.permissions[m.key] || {})[k]).join(', ') || '—';
        const nn = PERMS.filter(k => (permissions[m.key] || {})[k]).join(', ') || '—';
        return [m.label + ' access', oo, nn];
      });
      const rd = diffRows([['name', roleBefore.name, name], ...permPairs]);
      logAudit('Roles', 'update', name, rd.old, rd.new);
    } else logAudit('Roles', 'add', name, '—', addRows([
      ['name', name],
      ...MODULES.map(m => [m.label + ' access', PERMS.filter(k => (permissions[m.key] || {})[k]).join(', ') || '—'])
    ]));
    resetForm('roleForm', 'roleFormTitle', 'Add Role', () => { $('roleCancel').classList.add('hidden'); renderPermMatrix(emptyPerms()); });
    renderRoles(); renderUsers(); renderDashboard(); renderSidebar(); renderMenus(); renderAudit();
    setModuleView('roles', 'list');
    toast(id ? 'Role updated' : 'Role added');
  });
  $('roleCancel').addEventListener('click', () => {
    resetForm('roleForm', 'roleFormTitle', 'Add Role', () => { $('roleCancel').classList.add('hidden'); renderPermMatrix(emptyPerms()); });
    setModuleView('roles', 'list');
  });

  // QUICK ROLE MODAL FORM
  if ($('quickRoleForm')) {
    $('quickRoleForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const db = loadDB();
      const name = $('quickRoleName').value.trim();
      if (!name) return showAlert('Role name is required');
      if (!hasPerm('roles', 'add')) return showAlert('You do not have permission to add roles');
      if (db.roles.some(r => r.name.toLowerCase() === name.toLowerCase())) {
        return showAlert(`A role named "${name}" already exists`);
      }

      const permissions = readQuickPermMatrix();
      const newRoleId = uid('r');
      db.roles.push({ id: newRoleId, name, permissions });
      saveDB(db);

      logAudit('Roles', 'add', name, '—', addRows([
        ['name', name],
        ...MODULES.map(m => [m.label + ' access', PERMS.filter(k => (permissions[m.key] || {})[k]).join(', ') || '—'])
      ]));

      // Update system stores and directories
      renderRoles();
      renderSidebar();
      renderMenus();
      renderDashboard();
      renderAudit();

      // Refresh #userRole dropdown on the user form
      $('userRole').innerHTML = db.roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
      // Auto-select newly created role!
      $('userRole').value = newRoleId;
      // Update live preview card
      updateLiveUserPreview();

      closeQuickRoleModal();
      toast(`Role "${name}" created and selected!`);
    });
  }

  if ($('quickRoleModal')) {
    $('quickRoleModal').addEventListener('click', (e) => {
      if (e.target === $('quickRoleModal')) closeQuickRoleModal();
    });
  }

  // QUICK DEPARTMENT MODAL FORM
  if ($('quickDeptForm')) {
    $('quickDeptForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const db = loadDB();
      const name = $('quickDeptName').value.trim();
      const head = $('quickDeptHead') ? $('quickDeptHead').value.trim() : '';
      if (!name) return showAlert('Department name is required');
      if (name.length < 2) return showAlert('Department name must be at least 2 characters');
      if (!hasPerm('departments', 'add')) return showAlert('You do not have permission to add departments');
      if (db.departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
        return showAlert(`A department named "${name}" already exists`);
      }

      const newDeptId = uid('d');
      db.departments.push({ id: newDeptId, name, head });
      saveDB(db);

      logAudit('Departments', 'add', name, '—', addRows([
        ['name', name],
        ['head', head || '—']
      ]));

      // Update system stores and directories
      renderDepartments();
      renderUsers();
      renderDashboard();
      renderAudit();

      // Refresh #userDept dropdown on the user form
      if ($('userDept')) {
        $('userDept').innerHTML = db.departments.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
        // Auto-select newly created department!
        $('userDept').value = newDeptId;
      }

      // Update live preview card
      updateLiveUserPreview();

      closeQuickDeptModal();
      toast(`Department "${name}" created and selected!`);
    });
  }

  if ($('quickDeptModal')) {
    $('quickDeptModal').addEventListener('click', (e) => {
      if (e.target === $('quickDeptModal')) closeQuickDeptModal();
    });
  }

  if ($('quickDeptName')) $('quickDeptName').addEventListener('input', updateQuickDeptLivePreview);
  if ($('quickDeptHead')) $('quickDeptHead').addEventListener('input', updateQuickDeptLivePreview);

  // DEPT FORM
  $('deptForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('deptId').value, name = $('deptName').value.trim();
    const head = $('deptHead') ? $('deptHead').value.trim() : '';
    const description = $('deptDesc') ? $('deptDesc').value.trim() : '';
    if (!name) return showAlert('Department name is required');
    if (name.length < 2) return showAlert('Department name must be at least 2 characters');
    if (!id && !hasPerm('departments', 'add')) return showAlert('You do not have add permission');
    if (id && !hasPerm('departments', 'update')) return showAlert('You do not have update permission');
    if (db.departments.some(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== id))
      return showAlert('This department already exists');
    if (id) {
      const ex = db.departments.find(d => d.id === id);
      var deptBefore = { name: ex.name, head: ex.head || '', description: ex.description || '' };
      ex.name = name;
      ex.head = head;
      ex.description = description;
    } else {
      db.departments.push({ id: uid('d'), name, head, description });
    }
    saveDB(db);
    if (id) {
      const dd2 = diffRows([['name', deptBefore.name, name], ['head', deptBefore.head || '—', head || '—'], ['description', deptBefore.description || '—', description || '—']]);
      logAudit('Departments', 'update', name, dd2.old, dd2.new);
    } else {
      logAudit('Departments', 'add', name, '—', addRows([['name', name], ['head', head || '—'], ['description', description || '—']]));
    }
    resetForm('deptForm', 'deptFormTitle', 'Add Department', () => $('deptCancel').classList.add('hidden'));
    if ($('deptHead')) $('deptHead').value = '';
    if ($('deptDesc')) $('deptDesc').value = '';
    updateLiveDeptPreview();
    renderDepartments(); renderUsers(); renderDashboard(); renderAudit();
    setModuleView('departments', 'list');
    toast(id ? 'Department updated' : 'Department added');
  });
  $('deptCancel').addEventListener('click', () => {
    resetForm('deptForm', 'deptFormTitle', 'Add Department', () => $('deptCancel').classList.add('hidden'));
    if ($('deptHead')) $('deptHead').value = '';
    if ($('deptDesc')) $('deptDesc').value = '';
    updateLiveDeptPreview();
    setModuleView('departments', 'list');
  });

  // CATEGORY FORM
  $('catForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('catId').value, name = $('catName').value.trim();
    const parentId = $('catParent').value || null;
    if (!name) return;
    if (name.length < 2) return showAlert('Category name must be at least 2 characters');
    if (!id && !hasPerm('categories', 'add')) return showAlert('You do not have add permission');
    if (id && !hasPerm('categories', 'update')) return showAlert('You do not have update permission');
    if (parentId === id) return showAlert('A category cannot be its own parent');
    if (id) { const ex = db.categories.find(c => c.id === id); var catBefore = { ...ex }; Object.assign(ex, { name, parentId }); }
    else db.categories.push({ id: uid('c'), name, parentId });
    saveDB(db);
    if (id) {
      const cd = diffRows([
        ['name', catBefore.name, name],
        ['parent', parentName(catBefore.parentId) || 'Root (top level)', parentName(parentId) || 'Root (top level)']
      ]);
      logAudit('Categories', 'update', name, cd.old, cd.new);
    } else logAudit('Categories', 'add', name, '—', addRows([
      ['name', name],
      ['parent', parentName(parentId) || 'Root (top level)']
    ]));
    resetForm('catForm', 'catFormTitle', 'Add Category', () => { $('catCancel').classList.add('hidden'); renderCatParentDropdown('catParent'); });
    renderCategories(); renderProjects(); renderDocuments(); renderDashboard(); renderAudit();
    setModuleView('categories', 'list');
    toast(id ? 'Category updated' : 'Category added');
  });
  $('catCancel').addEventListener('click', () => {
    resetForm('catForm', 'catFormTitle', 'Add Category', () => { $('catCancel').classList.add('hidden'); renderCatParentDropdown('catParent'); });
    setModuleView('categories', 'list');
  });

  // PROJECT FORM
  if ($('projDesc')) {
    $('projDesc').addEventListener('input', updateProjDescCount);
  }
  if ($('projCatSearchInput')) {
    $('projCatSearchInput').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#projCatBox .proj-cat-item').forEach(item => {
        const match = !q || (item.dataset.name || '').includes(q);
        item.style.display = match ? 'flex' : 'none';
      });
    });
  }

  $('projForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('projId').value;
    const name = $('projName').value.trim(), description = $('projDesc').value.trim();
    const categoryIds = [...document.querySelectorAll('#projCatBox input:checked')].map(c => c.value);
    if (!name) return showAlert('Project name is required');
    if (name.length < 2) return showAlert('Project name must be at least 2 characters');
    if (!id && !hasPerm('projects', 'add')) return showAlert('You do not have add permission');
    if (id && !hasPerm('projects', 'update')) return showAlert('You do not have update permission');
    if (id) { const ex = db.projects.find(p => p.id === id); var projBefore = { ...ex, categoryIds: [...(ex.categoryIds || [])] }; Object.assign(ex, { name, description, categoryIds }); }
    else db.projects.push({ id: uid('p'), name, description, categoryIds });
    saveDB(db);
    if (id) {
      const catNames = ids => (ids || []).map(catName).join(', ') || '—';
      const pd = diffRows([
        ['name', projBefore.name, name],
        ['description', projBefore.description || '—', description || '—'],
        ['categories', catNames(projBefore.categoryIds), catNames(categoryIds)]
      ]);
      logAudit('Projects', 'update', name, pd.old, pd.new);
    } else logAudit('Projects', 'add', name, '—', addRows([
      ['name', name],
      ['description', description || '—'],
      ['categories', (categoryIds || []).map(catName).join(', ') || '—']
    ]));
    resetForm('projForm', 'projFormTitle', 'Add Project', () => {
      $('projCancel').classList.add('hidden');
      renderProjCatBox([]);
      if ($('projCatSearchInput')) $('projCatSearchInput').value = '';
      updateProjDescCount();
    });
    renderProjects(); renderDocuments(); renderDashboard(); renderAudit();
    setModuleView('projects', 'list');
    toast(id ? 'Project updated' : 'Project added');
  });
  $('projCancel').addEventListener('click', () => {
    resetForm('projForm', 'projFormTitle', 'Add Project', () => {
      $('projCancel').classList.add('hidden');
      renderProjCatBox([]);
      if ($('projCatSearchInput')) $('projCatSearchInput').value = '';
      updateProjDescCount();
    });
    setModuleView('projects', 'list');
  });

  // DOCUMENT FORM & DRAG-AND-DROP
  const dropZone = $('docDropZone');
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(evtName => {
      dropZone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-active');
      });
    });
    ['dragleave', 'drop'].forEach(evtName => {
      dropZone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-active');
      });
    });
    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt && dt.files;
      if (files && files.length) {
        handleDocFileSelection(files[0]);
      }
    });
  }

  if ($('docRemoveFileBtn')) {
    $('docRemoveFileBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      resetDocFileUpload();
    });
  }

  $('docForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    if (!db.documents) db.documents = [];
    const id = $('docId').value;
    const title = $('docTitle').value.trim(), description = $('docDesc').value.trim();
    const categoryId = $('docCategory').value || null, projectId = $('docProject').value || null;
    if (!title) return showAlert('Document title is required');
    if (title.length < 2) return showAlert('Document title must be at least 2 characters');
    if (!id && !hasPerm('documents', 'add')) return showAlert('You do not have add permission');
    if (id && !hasPerm('documents', 'update')) return showAlert('You do not have update permission');
    if (id) {
      const d = db.documents.find(x => x.id === id);
      var docBefore = { ...d };
      Object.assign(d, { title, description, categoryId, projectId });
      if (!Array.isArray(d.versions)) d.versions = [];
      if (pendingDocFile) {
        const nextV = d.versions.length ? Math.max(...d.versions.map(x => x.v)) + 1 : 1;
        d.versions.push({ v: nextV, fileName: pendingDocFile.name, fileData: pendingDocFile.data, fileType: pendingDocFile.type, uploadedAt: new Date().toISOString() });
        d.fileName = pendingDocFile.name; d.fileData = pendingDocFile.data; d.fileType = pendingDocFile.type;
        d.currentVersion = nextV;
      }
    } else {
      const ver = pendingDocFile ? [{ v: 1, fileName: pendingDocFile.name, fileData: pendingDocFile.data, fileType: pendingDocFile.type, uploadedAt: new Date().toISOString() }] : [];
      db.documents.push({
        id: uid('doc'), title, description, categoryId, projectId,
        fileName: pendingDocFile ? pendingDocFile.name : '',
        fileData: pendingDocFile ? pendingDocFile.data : '',
        fileType: pendingDocFile ? pendingDocFile.type : '',
        versions: ver, currentVersion: ver.length ? 1 : 0,
        createdAt: new Date().toISOString()
      });
    }
    saveDB(db);
    resetDocFileUpload();
    if (id) {
      const saved = db.documents.find(x => x.id === id);
      const dd = diffRows([
        ['title', docBefore.title, title],
        ['description', docBefore.description || '—', description || '—'],
        ['category', catName(docBefore.categoryId), catName(categoryId)],
        ['project', projectName(docBefore.projectId), projectName(projectId)],
        ['file', docBefore.fileName ? `v${docBefore.currentVersion || 0} (${docBefore.fileName})` : 'no file',
                 saved.fileName ? `v${saved.currentVersion || 0} (${saved.fileName})` : 'no file']
      ]);
      logAudit('Documents', 'update', title, dd.old, dd.new);
    } else {
      const created = db.documents[db.documents.length - 1];
      logAudit('Documents', 'add', title, '—', addRows([
        ['title', title],
        ['description', description || '—'],
        ['category', catName(categoryId)],
        ['project', projectName(projectId)],
        ['file', created.fileName ? `v${created.currentVersion || 0} (${created.fileName})` : 'no file']
      ]));
    }
    resetForm('docForm', 'docFormTitle', 'Add Document', () => { $('docCancel').classList.add('hidden'); });
    renderDocuments(); renderDashboard(); renderAudit();
    setModuleView('documents', 'list');
    toast(id ? 'Document updated' : 'Document added');
  });
  $('docCancel').addEventListener('click', () => {
    resetDocFileUpload();
    resetForm('docForm', 'docFormTitle', 'Add Document', () => { $('docCancel').classList.add('hidden'); });
    setModuleView('documents', 'list');
  });

  // KPI Dashboard Cards Click Navigation
  document.querySelectorAll('.card-kpi[data-goto]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-goto');
      if (target) goPage(target);
    });
  });

  $('auditClear').addEventListener('click', () => { if (typeof window.clearAudit === 'function') window.clearAudit(); });
  $('auditExport').addEventListener('click', () => { if (typeof window.exportAuditCSV === 'function') window.exportAuditCSV(); });
  // ---------- LISTING FILTERS (reset audit to page 1) ----------
  const auditFilter = () => { auditPage = 1; renderAudit(); };
  $('auditSearch').addEventListener('input', auditFilter);
  $('auditModule').addEventListener('change', auditFilter);
  $('auditAction').addEventListener('change', auditFilter);

  // ---------- LISTING FILTERS ----------
  $('userSearch').addEventListener('input', renderUsers);
  $('roleSearch').addEventListener('input', renderRoles);
  $('deptSearch').addEventListener('input', renderDepartments);
  $('catSearch').addEventListener('input', renderCategories);
  $('projSearch').addEventListener('input', renderProjects);
  $('projFilterCat').addEventListener('change', renderProjects);
  $('docSearch').addEventListener('input', renderDocuments);

  // MENU FORM & FILTERS
  if ($('menuForm')) {
    $('menuForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const db = loadDB();
      if (!Array.isArray(db.menus)) db.menus = [];
      const id = $('menuId').value;
      const title = $('menuTitle').value.trim();
      const icon = $('menuIcon').value.trim() || 'fa-solid fa-compass';
      const parentSel = $('menuParent');
      let parentId = (parentSel && parentSel.value) || '';
      const routeInput = $('menuRoute');
      const order = parseInt($('menuOrder').value, 10) || 1;
      const status = $('menuStatus').value || 'active';
      const description = $('menuDesc').value.trim();

      // Safety net: a menu saved as a submenu keeps its parent even if the form
      // was reset by a stale draft — it can only be detached deliberately.
      if (id && !parentId) {
        const saved = db.menus.find(x => x.id === id);
        if (saved && saved.parentId && isValidMenuParent(id, saved.parentId)) {
          parentId = saved.parentId;
          if (parentSel) parentSel.value = parentId;
          onMenuParentChange();
        }
      }

      // A top-level menu is only a group header, so it has no route of its own
      const route = parentId ? (routeInput.value.trim() || (((db.menus.find(x => x.id === id) || {}).route) || '')) : '';
      let targetType = parentId ? ($('menuTargetType').value || 'internal') : 'internal';

      // Auto-detect: a web link must always open in the Web View, whatever the dropdown says
      if (parentId && route && isWebUrlRoute(route) && targetType !== 'external') {
        targetType = 'external';
        if ($('menuTargetType')) $('menuTargetType').value = 'external';
      }

      if (!title) return showAlert('Menu title is required');
      if (parentId && !route) return showAlert('Submenu ke liye Route Path / Link zaroori hai (page slug ya http(s) URL)');
      if (parentId && targetType === 'external' && !sanitizeWebUrl(route)) {
        return showAlert('Web View needs a valid link starting with http:// or https:// (e.g. https://example.com)');
      }
      if (!id && !hasPerm('menus', 'add')) return showAlert('You do not have add permission');
      if (id && !hasPerm('menus', 'update')) return showAlert('You do not have update permission');

      if (parentId && !isValidMenuParent(id, parentId)) {
        return showAlert('Invalid parent menu: a menu cannot be nested inside itself or one of its own submenus');
      }

      const dupTitle = db.menus.find(m => m.title.toLowerCase() === title.toLowerCase() && m.id !== id);
      if (dupTitle) return showAlert(`A menu with title "${title}" already exists`);

      // Roles are NOT part of this form:
      // - a new top-level menu starts public and is configured in "Role-Menu Mapping"
      // - a submenu always inherits the role access of its top-level parent (roleIds = [])
      if (id) {
        const ex = db.menus.find(m => m.id === id);
        var menuBefore = { ...ex, roleIds: [...(ex.roleIds || [])] };
        Object.assign(ex, { title, icon, route, targetType, order, status, description, parentId });
        if (parentId) ex.roleIds = []; // submenu: access is always inherited
      } else {
        const newMenu = {
          id: uid('menu'),
          title,
          icon,
          route,
          targetType,
          order,
          status,
          description,
          roleIds: [],
          parentId
        };
        db.menus.push(newMenu);
      }
      saveDB(db);

      const parentLabel = parentId ? menuParentTitle(db, parentId) : '— Top-Level Menu —';
      const accessLabel = parentId
        ? `Inherited from "${(getMenuRoot(db, parentId) || {}).title || menuParentTitle(db, parentId)}"`
        : 'Public (set from Role-Menu Mapping tab)';

      if (id) {
        const md = diffRows([
          ['title', menuBefore.title, title],
          ['icon', menuBefore.icon, icon],
          ['route', menuBefore.route, route],
          ['target', menuBefore.targetType, targetType],
          ['parent', menuBefore.parentId ? menuParentTitle(db, menuBefore.parentId) : '—', parentLabel],
          ['order', menuBefore.order, order],
          ['status', menuBefore.status, status],
          ['description', menuBefore.description || '—', description || '—']
        ]);
        logAudit('Menus', 'update', title, md.old, md.new);
      } else {
        logAudit('Menus', 'add', title, '—', addRows([
          ['title', title],
          ['icon', icon],
          ['route', route],
          ['target', targetType],
          ['parent', parentLabel],
          ['order', order],
          ['status', status],
          ['role access', accessLabel],
          ['description', description || '—']
        ]));
      }

      resetForm('menuForm', 'menuFormTitle', 'Add Dynamic Menu', () => {
        $('menuCancel').classList.add('hidden');
        $('menuIcon').value = 'fa-solid fa-compass';
        $('menuIconPreview').innerHTML = renderIcon('fa-solid fa-compass');
        $('menuIconText').textContent = 'fa-solid fa-compass';
        if ($('menuParent')) $('menuParent').value = '';
      });
      // Make sure the freshly saved submenu is visible in the sidebar straight away
      if (parentId) {
        window.expandedMenuGroups.add(parentId);
        window.collapsedMenuGroups.delete(parentId);
      }
      renderMenus();
      renderSidebar();
      renderRoleMenuMappingUI();
      renderAudit();
      setModuleView('menus', 'list');
      toast(id ? `Menu updated${parentId ? ` (submenu of "${parentLabel}")` : ''}` : `Menu created${parentId ? ` as submenu of "${parentLabel}" — role access inherited` : ''}`);
    });
  }

  if ($('menuCancel')) {
    $('menuCancel').addEventListener('click', () => {
      resetForm('menuForm', 'menuFormTitle', 'Add Dynamic Menu', () => {
        $('menuCancel').classList.add('hidden');
        $('menuIcon').value = 'fa-solid fa-compass';
        $('menuIconPreview').innerHTML = renderIcon('fa-solid fa-compass');
        $('menuIconText').textContent = 'fa-solid fa-compass';
      });
      setModuleView('menus', 'list');
    });
  }

  // ROLE-MENU MAPPING FORM
  window.saveRoleMappingDirect = function(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (!hasPerm('menus', 'update')) return showAlert('You do not have update permission');
    const db = loadDB();
    const menuId = $('mapMenuSelect') && $('mapMenuSelect').value;
    const roleId = $('mapRoleSelect') && $('mapRoleSelect').value;
    if (!menuId) return showAlert('Please select a top-level menu');
    if (!roleId) return showAlert('Please select a role to map');

    // Only top-level menus own role access; a submenu always resolves to its parent group
    const selected = (db.menus || []).find(x => x.id === menuId);
    if (!selected) return showAlert('Menu not found');
    if (selected.parentId) return showAlert('Role access can only be mapped on a top-level menu (No Parent)');
    const m = selected;
    const r = (db.roles || []).find(x => x.id === roleId);
    if (!r) return showAlert('Role not found');

    if (!Array.isArray(m.roleIds)) m.roleIds = [];
    if (m.roleIds.includes(roleId)) {
      return showAlert(`Role "${r.name}" is already mapped to menu "${m.title}"`);
    }

    m.roleIds.push(roleId);
    saveDB(db);

    logAudit('Menus', 'update', m.title, 'Role mapping updated', `Mapped role "${r.name}"`);
    renderSidebar();
    renderMenus();
    renderRoleMenuMappingUI();
    toast(`Mapped role "${r.name}" to menu "${m.title}"!`);
  };

  if ($('roleMenuMapForm')) {
    $('roleMenuMapForm').addEventListener('submit', window.saveRoleMappingDirect);
  }

  // Filters & Live preview
  if ($('menuTitle')) $('menuTitle').addEventListener('input', updateLiveMenuPreview);
  if ($('menuRoute')) $('menuRoute').addEventListener('input', updateLiveMenuPreview);
  if ($('menuStatus')) $('menuStatus').addEventListener('change', updateLiveMenuPreview);
  if ($('menuSearch')) $('menuSearch').addEventListener('input', renderMenus);
  if ($('menuFilterStatus')) $('menuFilterStatus').addEventListener('change', renderMenus);
  if ($('menuFilterLevel')) $('menuFilterLevel').addEventListener('change', renderMenus);
  if ($('mapSearch')) $('mapSearch').addEventListener('input', renderRoleMenuMappingTable);

  // Icon Picker search & overlay listeners
  if ($('iconSearchInput')) {
    $('iconSearchInput').addEventListener('input', (e) => {
      renderIconGrid(e.target.value.toLowerCase().trim(), curIconCategory);
    });
  }
  if ($('iconPickerModal')) {
    $('iconPickerModal').addEventListener('click', (e) => {
      if (e.target === $('iconPickerModal')) closeIconPickerModal();
    });
  }

  // ANNOUNCEMENT FORM & FILTERS
  if ($('annForm')) {
    $('annForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const db = loadDB();
      if (!Array.isArray(db.announcements)) db.announcements = [];

      const id = $('annId').value;
      const title = $('annTitle').value.trim();
      const type = $('annType').value || 'info';
      const status = $('annStatus').value || 'active';
      const startDateTime = $('annStart').value;
      const expiryDateTime = $('annExpiry').value;
      const description = $('annDesc').value.trim();

      if (!title) return showAlert('Announcement title is required');
      if (title.length < 2) return showAlert('Title must be at least 2 characters');
      if (!description) return showAlert('Announcement description is required');
      if (description.length < 3) return showAlert('Description must be at least 3 characters');
      if (!startDateTime) return showAlert('Start Date & Time is required');
      if (!expiryDateTime) return showAlert('Expiry Date & Time is required');

      const startTime = new Date(startDateTime).getTime();
      const expiryTime = new Date(expiryDateTime).getTime();
      if (isNaN(startTime) || isNaN(expiryTime)) {
        return showAlert('Invalid date or time provided');
      }
      if (expiryTime <= startTime) {
        return showAlert('Expiry Date & Time must be after Start Date & Time');
      }

      if (!id && !hasPerm('announcements', 'add')) return showAlert('You do not have add permission');
      if (id && !hasPerm('announcements', 'update')) return showAlert('You do not have update permission');

      const u = currentUser();
      const username = u ? u.username : 'admin';

      if (id) {
        const ex = db.announcements.find(a => a.id === id);
        if (!ex) return showAlert('Announcement not found');
        const before = { ...ex };
        Object.assign(ex, {
          title,
          type,
          status,
          startDateTime,
          expiryDateTime,
          description,
          updatedAt: new Date().toISOString()
        });
        logAudit('Announcements', 'update', title, `Type: ${before.type}, Status: ${before.status}`, `Type: ${type}, Status: ${status}`);
      } else {
        const newAnn = {
          id: uid('ann'),
          title,
          type,
          status,
          startDateTime,
          expiryDateTime,
          description,
          createdBy: username,
          createdAt: new Date().toISOString()
        };
        db.announcements.unshift(newAnn);
        logAudit('Announcements', 'add', title, '-', `Type: ${type}, Status: ${status}, Expires: ${expiryDateTime}`);
      }

      saveDB(db);
      clearFormDraft('annForm');
      resetForm('annForm', 'annFormTitle', 'Add Announcement', () => {
        $('annCancel').classList.add('hidden');
        $('annType').value = 'info';
        $('annStatus').value = 'active';
        $('annStart').value = toLocalDateTimeInput(new Date());
        $('annExpiry').value = toLocalDateTimeInput(new Date(Date.now() + 7 * 86400000));
        updateLiveAnnouncementPreview();
      });
      renderAnnouncements();
      updateAnnouncementTicker();
      renderDashboard();
      renderAudit();
      setModuleView('announcements', 'list');
      toast(id ? 'Announcement updated successfully' : 'Announcement created and live in header');
    });
  }

  if ($('annCancel')) {
    $('annCancel').addEventListener('click', () => {
      clearFormDraft('annForm');
      resetForm('annForm', 'annFormTitle', 'Add Announcement', () => {
        $('annCancel').classList.add('hidden');
        updateLiveAnnouncementPreview();
      });
      setModuleView('announcements', 'list');
    });
  }

  // Live preview & counter listeners for Announcement Form
  if ($('annTitle')) $('annTitle').addEventListener('input', updateLiveAnnouncementPreview);
  if ($('annType')) $('annType').addEventListener('change', updateLiveAnnouncementPreview);
  if ($('annStatus')) $('annStatus').addEventListener('change', updateLiveAnnouncementPreview);
  if ($('annStart')) $('annStart').addEventListener('change', updateLiveAnnouncementPreview);
  if ($('annExpiry')) $('annExpiry').addEventListener('change', updateLiveAnnouncementPreview);
  if ($('annDesc')) $('annDesc').addEventListener('input', updateLiveAnnouncementPreview);

  // Filters for Announcements List
  if ($('annSearch')) $('annSearch').addEventListener('input', () => renderAnnouncements());
  if ($('annFilterType')) $('annFilterType').addEventListener('change', () => renderAnnouncements());
  if ($('annFilterStatus')) $('annFilterStatus').addEventListener('change', () => renderAnnouncements());

  // Recurring live expiry ticker check:
  // Every 10 seconds, checks active announcements. If an announcement expires, it immediately
  // vanishes from the header marquee across the entire application without page reload.
  setInterval(() => {
    updateAnnouncementTicker();
    const active = document.querySelector('.page:not(.hidden)');
    if (active && active.id === 'page-announcements') {
      renderAnnouncements(false);
    }
  }, 10000);

  // Handle browser Back / Forward history navigation
  window.addEventListener('hashchange', () => {
    if (!currentUser()) return;
    restoreLastPage();
  });
});
