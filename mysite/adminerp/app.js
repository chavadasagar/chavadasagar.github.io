// AdminERP - HTML/CSS/JS + LocalStorage RBAC System
const DB_KEY = 'AdminERP_DB';
const SESSION_KEY = 'AdminERP_Session';

const MODULES = [
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'departments', label: 'Department' },
  { key: 'categories', label: 'Category' },
  { key: 'projects', label: 'Project' },
  { key: 'documents', label: 'Document' },
  { key: 'audit', label: 'Audit' },
];
const PERMS = ['read', 'add', 'update', 'delete'];

const $ = (id) => document.getElementById(id);
const uid = (p) => p + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1000);

// ---------- SWEETALERT HELPERS (fallback to native if CDN offline) ----------
function showAlert(msg, icon) {
  if (window.Swal) return Swal.fire({ icon: icon || 'warning', text: msg, confirmButtonColor: '#1e3a8a' });
  alert(msg);
}
function askConfirm(text, confirmText) {
  if (window.Swal) {
    return Swal.fire({
      title: 'Are you sure?', text, icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280',
      confirmButtonText: confirmText || 'Yes, delete', cancelButtonText: 'Cancel'
    }).then(r => r.isConfirmed);
  }
  return Promise.resolve(confirm(text));
}
function toast(msg) {
  if (window.Swal) Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: msg, showConfirmButton: false, timer: 1500 });
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
  if (!localStorage.getItem(DB_KEY)) {
    const db = {
      departments: [{ id: 'd1', name: 'Admin' }],
      roles: [{ id: 'r1', name: 'Admin', permissions: fullPerms() }],
      users: [{ id: 'u1', username: 'admin', password: 'admin', departmentId: 'd1', roleId: 'r1' }],
      categories: [],
      projects: [],
      documents: []
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
  goPage('dashboard');
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
  { label: 'New entry (focus form)', hint: 'Alt+N', action: 'new' },
  { label: 'Cancel editing', hint: 'Esc', action: 'cancel' },
  { label: 'My Profile', hint: 'Profile', action: 'profile' },
  { label: 'Change Password', hint: 'Profile', action: 'password' },
  { label: 'Logout', hint: 'Ctrl+Shift+L', action: 'logout' },
];
let cmdActiveIdx = 0;
function cmdVisibleItems() {
  const q = ($('cmdInput') && $('cmdInput').value || '').toLowerCase().trim();
  return CMD_ITEMS.filter(it => {
    if (it.module && !hasPerm(it.module, 'read')) return false;
    return !q || it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q);
  });
}
function renderCmdList() {
  const list = cmdVisibleItems();
  if (cmdActiveIdx >= list.length) cmdActiveIdx = 0;
  $('cmdList').innerHTML = list.length ? list.map((it, i) =>
    `<div class="cmd-item ${i === cmdActiveIdx ? 'active' : ''}" data-idx="${i}"><span>${it.label}</span><span class="hint">${it.hint}</span></div>`
  ).join('') : '<div class="cmd-empty">No results found</div>';
  document.querySelectorAll('.cmd-item').forEach(el =>
    el.addEventListener('click', () => runCmdItem(list[parseInt(el.dataset.idx, 10)])));
}
function openCmdPalette() {
  $('cmdPalette').classList.remove('hidden');
  $('cmdInput').value = ''; cmdActiveIdx = 0;
  renderCmdList();
  setTimeout(() => $('cmdInput').focus(), 0);
}
function closeCmdPalette() { $('cmdPalette').classList.add('hidden'); }
function runCmdItem(it) {
  if (!it) return;
  closeCmdPalette();
  if (it.page) goPage(it.page);
  else if (it.action === 'logout') doLogout();
  else if (it.action === 'profile') openProfile();
  else if (it.action === 'password') openChangePassword();
  else if (it.action === 'new') {
    const active = document.querySelector('.page:not(.hidden)');
    if (active) focusFirstField(active.id.replace('page-', ''));
  }
  else if (it.action === 'cancel') {
    ['userCancel', 'roleCancel', 'deptCancel', 'catCancel', 'projCancel', 'docCancel'].forEach(id => {
      const b = $(id);
      if (b && !b.classList.contains('hidden')) b.click();
    });
  }
}
function goPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  $('page-' + name).classList.remove('hidden');
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  $('pageTitle').textContent = name.charAt(0).toUpperCase() + name.slice(1);
  closeNav();
  trackPageVisit(name);
  focusFirstField(name);
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
    audit: 'auditSearch'
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
  renderCharts(); renderRecent(); renderMostUsed();
}
const PAGE_LABELS = { dashboard: 'Dashboard', users: 'Users', roles: 'Roles', departments: 'Department', categories: 'Category', projects: 'Project', documents: 'Document', audit: 'Audit' };
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
  $('chartModules').innerHTML = mods.map(m =>
    `<div class="hbar-row"><span class="hbar-label">${m.label}</span><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(m.n / max * 100)}%"></div></div><b>${m.n}</b></div>`
  ).join('');
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
  const counts = days.map(d => {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return (db.audit || []).filter(a => { const t = new Date(a.datetime); return t >= d && t < next; }).length;
  });
  const mx = Math.max(1, ...counts);
  $('chartActivity').innerHTML = days.map((d, i) =>
    `<div class="vbar-col"><div class="vbar-track"><div class="vbar-fill" style="height:${Math.round(counts[i] / mx * 100)}%" title="${counts[i]} actions"></div></div><span class="vbar-n">${counts[i]}</span><span class="vbar-d">${d.toLocaleDateString('en-IN', { weekday: 'short' })}</span></div>`
  ).join('');
}
function renderRecent() {
  const db = loadDB();
  const mods = ['Users', 'Roles', 'Departments', 'Categories', 'Projects', 'Documents'];
  $('recentGrid').innerHTML = mods.map(m => {
    const items = [...(db.audit || [])]
      .filter(a => a.module === m && a.action === 'add')
      .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
      .slice(0, 5);
    const lis = items.length
      ? items.map(a => `<li><b>${a.record || '—'}</b><span class="muted small">by ${a.username} • <span title="${new Date(a.datetime).toLocaleString('en-IN')}">${timeAgo(a.datetime)}</span></span></li>`).join('')
      : '<li class="muted">Nothing yet</li>';
    return `<div class="recent-box"><h4>${m}</h4><ul>${lis}</ul></div>`;
  }).join('');
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
  $('userForm').querySelector('button[type=submit]').disabled = !(canAdd || canUpdate);
  // table (with search filter)
  const uq = ($('userSearch').value || '').toLowerCase();
  const ulist = db.users.filter(u =>
    !uq || u.username.toLowerCase().includes(uq) ||
    deptName(u.departmentId).toLowerCase().includes(uq) ||
    roleName(u.roleId).toLowerCase().includes(uq));
  $('usersTable').innerHTML = ulist.map(u => {
    const editBtn = hasPerm('users', 'update') ? `<button class="btn warn sm" onclick="editUser('${u.id}')">Edit</button>` : '';
    const delBtn = (hasPerm('users', 'delete') && u.username !== 'admin') ? `<button class="btn danger sm" onclick="deleteUser('${u.id}')">Delete</button>` : '';
    return `<tr><td>${u.username}</td><td>${u.password}</td><td>${deptName(u.departmentId)}</td><td>${roleName(u.roleId)}</td><td>${editBtn}${delBtn}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="muted">No matches found.</td></tr>';
}
window.editUser = function (id) {
  const db = loadDB();
  const u = db.users.find(x => x.id === id);
  if (!u) return;
  $('userId').value = u.id; $('userName').value = u.username;
  $('userPass').value = u.password; $('userDept').value = u.departmentId; $('userRole').value = u.roleId;
  $('userFormTitle').textContent = 'Edit User';
  $('userCancel').classList.remove('hidden');
  focusForm('userForm', 'userName');
};
window.deleteUser = function (id) {
  if (!hasPerm('users', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const u = db.users.find(x => x.id === id);
  if (u && u.username === 'admin') return showAlert('The default admin cannot be deleted');
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
  const rq = ($('roleSearch').value || '').toLowerCase();
  const rlist = db.roles.filter(r => !rq || r.name.toLowerCase().includes(rq));
  $('rolesTable').innerHTML = rlist.map(r => {
    const summary = MODULES.map(m => {
      const p = (r.permissions && r.permissions[m.key]) || {};
      const on = PERMS.filter(k => p[k]);
      return `<div><b>${m.label}:</b> ${on.length ? on.join(',') : '—'}</div>`;
    }).join('');
    const editBtn = hasPerm('roles', 'update') ? `<button class="btn warn sm" onclick="editRole('${r.id}')">Edit</button>` : '';
    const delBtn = (hasPerm('roles', 'delete') && r.name !== 'Admin') ? `<button class="btn danger sm" onclick="deleteRole('${r.id}')">Delete</button>` : '';
    return `<tr><td><b>${r.name}</b></td><td>${summary}</td><td>${editBtn}${delBtn}</td></tr>`;
  }).join('') || '<tr><td colspan="3" class="muted">No matches found.</td></tr>';
  if ($('deleteAllRolesBtn')) $('deleteAllRolesBtn').style.display = hasPerm('roles', 'delete') ? '' : 'none';
}
window.editRole = function (id) {
  const db = loadDB();
  const r = db.roles.find(x => x.id === id);
  if (!r) return;
  $('roleId').value = r.id; $('roleName').value = r.name;
  renderPermMatrix(r.permissions);
  $('roleFormTitle').textContent = 'Edit Role';
  $('roleCancel').classList.remove('hidden');
  focusForm('roleForm', 'roleName');
};
window.deleteRole = function (id) {
  if (!hasPerm('roles', 'delete')) return showAlert('You do not have delete permission');
  const db = loadDB();
  const r = db.roles.find(x => x.id === id);
  if (r && r.name === 'Admin') return showAlert('The Admin role cannot be deleted');
  if (db.users.some(u => u.roleId === id)) return showAlert('This role is assigned to users. Please change their role first.');
  askConfirm(`Delete role "${r.name}"?`).then(ok => {
    if (!ok) return;
    const db2 = loadDB();
    db2.roles = db2.roles.filter(x => x.id !== id);
    saveDB(db2);
    logAudit('Roles', 'delete', r.name, summarize('roles', r), '—');
    renderRoles(); renderUsers(); renderDashboard(); renderSidebar(); renderAudit();
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
    renderRoles(); renderUsers(); renderDashboard(); renderSidebar(); renderAudit();
    if (window.Swal) Swal.fire({ icon: skipped ? 'info' : 'success', title: 'Done', text: `${deletable.length} role(s) deleted${skipped ? `, ${skipped} skipped (Admin / assigned to users)` : ''}.`, confirmButtonColor: '#1e3a8a' });
    else toast('Roles deleted');
  });
};

// ---------- DEPARTMENTS ----------
function renderDepartments() {
  const db = loadDB();
  const dq = ($('deptSearch').value || '').toLowerCase();
  const dlist = db.departments.filter(d => !dq || d.name.toLowerCase().includes(dq));
  $('deptTable').innerHTML = dlist.map(d => {
    const editBtn = hasPerm('departments', 'update') ? `<button class="btn warn sm" onclick="editDept('${d.id}')">Edit</button>` : '';
    const delBtn = (hasPerm('departments', 'delete') && d.name !== 'Admin') ? `<button class="btn danger sm" onclick="deleteDept('${d.id}')">Delete</button>` : '';
    return `<tr><td>${d.name}</td><td>${editBtn}${delBtn}</td></tr>`;
  }).join('') || '<tr><td colspan="2" class="muted">No matches found.</td></tr>';
}
window.editDept = function (id) {
  const db = loadDB();
  const d = db.departments.find(x => x.id === id);
  $('deptId').value = d.id; $('deptName').value = d.name;
  $('deptFormTitle').textContent = 'Edit Department';
  $('deptCancel').classList.remove('hidden');
  focusForm('deptForm', 'deptName');
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
  return names.join(' > ');
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
function renderCategories() {
  const db = loadDB();
  if (!$('catId').value) renderCatParentDropdown('catParent');
  const cq = ($('catSearch').value || '').toLowerCase().trim();
  // search mode: flat matches with full path
  if (cq) {
    const matches = db.categories.filter(c =>
      c.name.toLowerCase().includes(cq) || catPath(c.id).toLowerCase().includes(cq));
    $('catTree').innerHTML = matches.length ? matches.map(c => {
      const editBtn = hasPerm('categories', 'update') ? `<button class="btn warn sm" onclick="editCat('${c.id}')">Edit</button>` : '';
      const subBtn = hasPerm('categories', 'add') ? `<button class="btn primary sm" onclick="subCat('${c.id}')">+ Sub</button>` : '';
      const delBtn = hasPerm('categories', 'delete') ? `<button class="btn danger sm" onclick="deleteCat('${c.id}')">Delete</button>` : '';
      return `<div class="tree-item"><span>📂 <b>${c.name}</b><br><span class="muted small">${catPath(c.id)}</span></span><span class="tree-actions">${subBtn}${editBtn}${delBtn}</span></div>`;
    }).join('') : '<p class="muted">No matches found.</p>';
    return;
  }
  // tree
  const roots = db.categories.filter(c => !c.parentId);
  $('catTree').innerHTML = db.categories.length ? buildCatTree(null, 0) : '<p class="muted">No categories yet. Add one above.</p>';
  function buildCatTree(parentId, depth) {
    return db.categories.filter(c => (c.parentId || null) === (parentId || null)).map(c => {
      const childCount = db.categories.filter(x => x.parentId === c.id).length;
      const editBtn = hasPerm('categories', 'update') ? `<button class="btn warn sm" onclick="editCat('${c.id}')">Edit</button>` : '';
      const subBtn = hasPerm('categories', 'add') ? `<button class="btn primary sm" onclick="subCat('${c.id}')">+ Sub</button>` : '';
      const delBtn = hasPerm('categories', 'delete') ? `<button class="btn danger sm" onclick="deleteCat('${c.id}')">Delete</button>` : '';
      return `<div class="tree-item" style="margin-left:${depth * 22}px">
        <span>📂 <b>${c.name}</b> <span class="muted small">${childCount ? '(' + childCount + ' sub)' : ''}</span></span>
        <span class="tree-actions">${subBtn}${editBtn}${delBtn}</span>
      </div>` + buildCatTree(c.id, depth + 1);
    }).join('');
  }
}
window.editCat = function (id) {
  const db = loadDB();
  const c = db.categories.find(x => x.id === id);
  $('catId').value = c.id; $('catName').value = c.name;
  renderCatParentDropdown('catParent', id);
  $('catParent').value = c.parentId || '';
  $('catFormTitle').textContent = 'Edit Category';
  $('catCancel').classList.remove('hidden');
  focusForm('catForm', 'catName');
};
window.subCat = function (id) {
  $('catId').value = ''; $('catName').value = '';
  renderCatParentDropdown('catParent');
  $('catParent').value = id;
  $('catFormTitle').textContent = 'Add Sub-Category of: ' + catPath(id);
  focusForm('catForm', 'catName');
};
window.deleteCat = function (id) {
  if (!hasPerm('categories', 'delete')) return showAlert('You do not have delete permission');
  askConfirm('This will delete the category and all its sub-categories. Continue?', 'Yes, delete all').then(ok => {
    if (!ok) return;
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
    db.categories = db.categories.filter(c => !toDelete.has(c.id));
    // also remove from projects
    db.projects.forEach(p => p.categoryIds = (p.categoryIds || []).filter(cid => !toDelete.has(cid)));
    // clear category on linked documents
    (db.documents || []).forEach(d => { if (d.categoryId && toDelete.has(d.categoryId)) d.categoryId = null; });
    saveDB(db);
    logAudit('Categories', 'delete', targetLabel, targetSummary, '—');
    renderCategories(); renderProjects(); renderDocuments(); renderDashboard(); renderAudit();
    toast('Category deleted');
  });
};

// ---------- PROJECTS ----------
function renderProjCatBox(checkedIds) {
  checkedIds = checkedIds || [];
  const db = loadDB();
  if (!db.categories.length) {
    $('projCatBox').innerHTML = '<p class="muted small">Create a category on the Category page first.</p>';
    return;
  }
  $('projCatBox').innerHTML = db.categories.map(c =>
    `<label><input type="checkbox" value="${c.id}" ${checkedIds.includes(c.id) ? 'checked' : ''}> ${catPath(c.id)}</label>`
  ).join('');
}
function renderProjFilterCat() {
  const db = loadDB();
  const cur = $('projFilterCat').value;
  $('projFilterCat').innerHTML = '<option value="">All Categories</option>' +
    (db.categories || []).map(c => `<option value="${c.id}">${catPath(c.id)}</option>`).join('');
  if ([...$('projFilterCat').options].some(o => o.value === cur)) $('projFilterCat').value = cur;
}
function renderProjects() {
  const db = loadDB();
  if (!$('projId').value) renderProjCatBox([]);
  renderProjFilterCat();
  const pq = ($('projSearch').value || '').toLowerCase();
  const fc = $('projFilterCat').value;
  let allowed = null;
  if (fc) { // selected category + all its sub-categories
    allowed = new Set([fc]);
    let changed = true;
    while (changed) {
      changed = false;
      db.categories.forEach(c => {
        if (c.parentId && allowed.has(c.parentId) && !allowed.has(c.id)) { allowed.add(c.id); changed = true; }
      });
    }
  }
  const plist = db.projects.filter(p => {
    if (allowed && !(p.categoryIds || []).some(id => allowed.has(id))) return false;
    if (pq && !(p.name.toLowerCase().includes(pq) ||
      (p.description || '').toLowerCase().includes(pq) ||
      (p.categoryIds || []).some(id => (catPath(id) || '').toLowerCase().includes(pq)))) return false;
    return true;
  });
  $('projTable').innerHTML = plist.map(p => {
    const badges = (p.categoryIds || []).map(cid => `<span class="badge">${catPath(cid) || '?'}</span>`).join(' ') || '—';
    const editBtn = hasPerm('projects', 'update') ? `<button class="btn warn sm" onclick="editProj('${p.id}')">Edit</button>` : '';
    const delBtn = hasPerm('projects', 'delete') ? `<button class="btn danger sm" onclick="deleteProj('${p.id}')">Delete</button>` : '';
    return `<tr><td><b>${p.name}</b></td><td>${p.description || ''}</td><td>${badges}</td><td>${editBtn}${delBtn}</td></tr>`;
  }).join('') || '<tr><td colspan="4" class="muted">No matches found.</td></tr>';
}
window.editProj = function (id) {
  const db = loadDB();
  const p = db.projects.find(x => x.id === id);
  $('projId').value = p.id; $('projName').value = p.name; $('projDesc').value = p.description || '';
  renderProjCatBox(p.categoryIds || []);
  $('projFormTitle').textContent = 'Edit Project';
  $('projCancel').classList.remove('hidden');
  focusForm('projForm', 'projName');
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
  const q = ($('docSearch') && $('docSearch').value || '').toLowerCase();
  const list = (db.documents || []).filter(d => {
    if (!q) return true;
    return (d.title || '').toLowerCase().includes(q) || (d.fileName || '').toLowerCase().includes(q);
  });
  const canAdd = hasPerm('documents', 'add'), canUpdate = hasPerm('documents', 'update');
  $('docForm').querySelector('button[type=submit]').disabled = !(canAdd || canUpdate);
  $('docTable').innerHTML = list.map(d => {
    const vers = d.versions || [];
    const fileCell = d.fileData
      ? `<a href="${d.fileData}" download="${d.fileName || 'file'}">⬇ ${d.fileName || 'Download'}</a>`
      : (d.fileName || '—');
    const verCell = `<span class="badge">v${d.currentVersion || 0}</span> <span class="muted small">(${vers.length})</span>`;
    const date = d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : '—';
    const histBtn = `<button class="btn sm" onclick="openVersions('${d.id}')">History</button>`;
    const editBtn = hasPerm('documents', 'update') ? `<button class="btn warn sm" onclick="editDoc('${d.id}')">Edit</button>` : '';
    const delBtn = hasPerm('documents', 'delete') ? `<button class="btn danger sm" onclick="deleteDoc('${d.id}')">Delete</button>` : '';
    return `<tr><td><b>${d.title}</b><br><span class="muted small">${d.description || ''}</span></td><td>${d.categoryId ? catPath(d.categoryId) : '—'}</td><td>${projectName(d.projectId)}</td><td>${fileCell}</td><td>${verCell}</td><td>${date}</td><td>${histBtn}${editBtn}${delBtn}</td></tr>`;
  }).join('') || '<tr><td colspan="7" class="muted">No documents yet.</td></tr>';
}
window.editDoc = function (id) {
  const db = loadDB();
  const d = (db.documents || []).find(x => x.id === id);
  if (!d) return;
  $('docId').value = d.id; $('docTitle').value = d.title || '';
  $('docDesc').value = d.description || '';
  renderDocDropdowns(d.categoryId, d.projectId);
  pendingDocFile = null; $('docFile').value = '';
  $('docFileHint').textContent = d.fileName ? 'Current file: ' + d.fileName + ' (select a new file to replace it)' : '';
  $('docFormTitle').textContent = 'Edit Document';
  $('docCancel').classList.remove('hidden');
  focusForm('docForm', 'docTitle');
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
  if (!$('auditTable')) return;
  renderAuditModuleFilter();
  const list = getFilteredAudit();
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / AUDIT_PER_PAGE));
  if (auditPage > pages) auditPage = pages;
  if (auditPage < 1) auditPage = 1;
  const start = (auditPage - 1) * AUDIT_PER_PAGE;
  const shown = list.slice(start, start + AUDIT_PER_PAGE);
  $('auditCount').textContent = total
    ? `Showing ${start + 1}–${start + shown.length} of ${total} entries (page ${auditPage}/${pages})`
    : 'No audit entries yet.';
  const canClear = hasPerm('audit', 'delete');
  $('auditClear').disabled = !canClear;
  $('auditTable').innerHTML = shown.map(a => {
    const dt = new Date(a.datetime).toLocaleString('en-IN');
    return `<tr><td>${dt}</td><td><b>${a.username}</b></td><td>${a.module}</td><td><span class="badge">${a.action}</span></td><td>${a.record}</td><td>${a.oldValue}</td><td>${a.newValue}</td></tr>`;
  }).join('') || '<tr><td colspan="7" class="muted">No audit entries yet.</td></tr>';
  renderAuditPager(pages);
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

function renderAll() {
  renderDashboard(); renderUsers(); renderRoles(); renderDepartments(); renderCategories(); renderProjects(); renderDocuments(); renderAudit();
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
  seedDB();
  if (currentUser()) showApp(); else showLogin();

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
  $('deleteAllRolesBtn').addEventListener('click', deleteAllRoles);
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
      else if (b.dataset.act === 'logout') doLogout();
    }));

  document.querySelectorAll('.menu-btn').forEach(b =>
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

    // Alt + 1..8 -> page navigation
    if (e.altKey && !e.ctrlKey && !e.shiftKey && ['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
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
      ];
      const t = map[parseInt(e.key, 10) - 1];
      if (t.module && !hasPerm(t.module, 'read')) return; // no read permission, stay
      goPage(t.page);
      return;
    }

    // Alt + N -> focus first field of the active page form
    if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      const active = document.querySelector('.page:not(.hidden)');
      if (active) focusFirstField(active.id.replace('page-', ''));
      return;
    }

    // Esc -> close drawer/palette/profile/versions first, then visible cancel button
    if (e.key === 'Escape') {
      if (document.body.classList.contains('nav-open')) { closeNav(); return; }
      if (paletteOpen) { closeCmdPalette(); return; }
      if (!$('profileModal').classList.contains('hidden')) { closeProfile(); return; }
      if (!$('versionsModal').classList.contains('hidden')) { closeVersions(); return; }
      const cancels = ['userCancel', 'roleCancel', 'deptCancel', 'catCancel', 'projCancel', 'docCancel'];
      for (const id of cancels) {
        const btn = $(id);
        if (btn && !btn.classList.contains('hidden')) { btn.click(); break; }
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

  // USER FORM
  $('userForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('userId').value;
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
    resetForm('userForm', 'userFormTitle', 'Add User', () => $('userCancel').classList.add('hidden'));
    renderUsers(); renderDashboard(); renderAudit();
    toast(id ? 'User updated' : 'User added');
  });
  $('userCancel').addEventListener('click', () => resetForm('userForm', 'userFormTitle', 'Add User', () => $('userCancel').classList.add('hidden')));

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
  });
  $('roleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('roleId').value;
    const name = $('roleName').value.trim();
    const permissions = readPermMatrix();
    if (!name) return showAlert('Role name is required');
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
    renderRoles(); renderUsers(); renderDashboard(); renderSidebar(); renderAudit();
    toast(id ? 'Role updated' : 'Role added');
  });
  $('roleCancel').addEventListener('click', () => resetForm('roleForm', 'roleFormTitle', 'Add Role', () => { $('roleCancel').classList.add('hidden'); renderPermMatrix(emptyPerms()); }));

  // DEPT FORM
  $('deptForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('deptId').value, name = $('deptName').value.trim();
    if (!name) return;
    if (!id && !hasPerm('departments', 'add')) return showAlert('You do not have add permission');
    if (id && !hasPerm('departments', 'update')) return showAlert('You do not have update permission');
    if (db.departments.some(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== id))
      return showAlert('This department already exists');
    if (id) { const ex = db.departments.find(d => d.id === id); var deptBefore = ex.name; ex.name = name; }
    else db.departments.push({ id: uid('d'), name });
    saveDB(db);
    if (id) {
      const dd2 = diffRows([['name', deptBefore, name]]);
      logAudit('Departments', 'update', name, dd2.old, dd2.new);
    } else logAudit('Departments', 'add', name, '—', addRows([['name', name]]));
    resetForm('deptForm', 'deptFormTitle', 'Add Department', () => $('deptCancel').classList.add('hidden'));
    renderDepartments(); renderUsers(); renderDashboard(); renderAudit();
    toast(id ? 'Department updated' : 'Department added');
  });
  $('deptCancel').addEventListener('click', () => resetForm('deptForm', 'deptFormTitle', 'Add Department', () => $('deptCancel').classList.add('hidden')));

  // CATEGORY FORM
  $('catForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('catId').value, name = $('catName').value.trim();
    const parentId = $('catParent').value || null;
    if (!name) return;
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
    toast(id ? 'Category updated' : 'Category added');
  });
  $('catCancel').addEventListener('click', () => resetForm('catForm', 'catFormTitle', 'Add Category', () => { $('catCancel').classList.add('hidden'); renderCatParentDropdown('catParent'); }));

  // PROJECT FORM
  $('projForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    const id = $('projId').value;
    const name = $('projName').value.trim(), description = $('projDesc').value.trim();
    const categoryIds = [...document.querySelectorAll('#projCatBox input:checked')].map(c => c.value);
    if (!name) return;
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
    resetForm('projForm', 'projFormTitle', 'Add Project', () => { $('projCancel').classList.add('hidden'); renderProjCatBox([]); });
    renderProjects(); renderDocuments(); renderDashboard(); renderAudit();
    toast(id ? 'Project updated' : 'Project added');
  });
  $('projCancel').addEventListener('click', () => resetForm('projForm', 'projFormTitle', 'Add Project', () => { $('projCancel').classList.add('hidden'); renderProjCatBox([]); }));

  // DOCUMENT FORM
  $('auditClear').addEventListener('click', clearAudit);
  $('auditExport').addEventListener('click', exportAuditCSV);
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
  $('docFile').addEventListener('change', () => {
    const f = $('docFile').files[0];
    if (!f) { pendingDocFile = null; return; }
    if (f.size > 2 * 1024 * 1024) { showAlert('Files must be under 2MB (LocalStorage limit)'); $('docFile').value = ''; pendingDocFile = null; return; }
    const rd = new FileReader();
    rd.onload = () => { pendingDocFile = { name: f.name, type: f.type, data: rd.result }; $('docFileHint').textContent = 'Selected: ' + f.name; };
    rd.readAsDataURL(f);
  });
  $('docForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = loadDB();
    if (!db.documents) db.documents = [];
    const id = $('docId').value;
    const title = $('docTitle').value.trim(), description = $('docDesc').value.trim();
    const categoryId = $('docCategory').value || null, projectId = $('docProject').value || null;
    if (!title) return;
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
    pendingDocFile = null;
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
    resetForm('docForm', 'docFormTitle', 'Add Document', () => { $('docCancel').classList.add('hidden'); $('docFileHint').textContent = ''; });
    renderDocuments(); renderDashboard(); renderAudit();
    toast(id ? 'Document updated' : 'Document added');
  });
  $('docCancel').addEventListener('click', () => {
    pendingDocFile = null;
    resetForm('docForm', 'docFormTitle', 'Add Document', () => { $('docCancel').classList.add('hidden'); $('docFileHint').textContent = ''; });
  });
  $('docSearch').addEventListener('input', renderDocuments);
});
