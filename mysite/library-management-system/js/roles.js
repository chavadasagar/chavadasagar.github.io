/**
 * ROLES.JS
 * Custom Role & Permission Management logic.
 */

let rolesList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 8;

const modules = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'books', label: 'Book Inventory' },
    { id: 'copies', label: 'Book Copies' },
    { id: 'loans', label: 'Checkouts & Returns' },
    { id: 'members', label: 'Members Directory' },
    { id: 'reservations', label: 'Holds & Reserves' },
    { id: 'authors', label: 'Authors' },
    { id: 'categories', label: 'Categories' },
    { id: 'publishers', label: 'Publishers' },
    { id: 'branches', label: 'Branches' },
    { id: 'reviews', label: 'Reviews & Ratings' },
    { id: 'reports', label: 'Reports & Exports' },
    { id: 'settings', label: 'System Settings' }
];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load data
    loadRolesData();

    // 2. Search filter
    document.getElementById('search-input').addEventListener('input', applyFilters);

    // 3. Open Modal for Add
    document.getElementById('add-role-btn').addEventListener('click', () => {
        openRoleModal();
    });

    // 4. Form Submit
    document.getElementById('role-form').addEventListener('submit', handleFormSubmit);
});

function loadRolesData() {
    rolesList = db.find('roles') || [];
    applyFilters();
}

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.trim().toLowerCase();
    
    filteredList = rolesList.filter(role => {
        return role.name.toLowerCase().includes(searchVal) || 
               role.description.toLowerCase().includes(searchVal);
    });

    currentPage = 1;
    renderRolesTable();
}

function renderRolesTable() {
    const tbody = document.getElementById('roles-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Render hardcoded Admin row for UI representation (locked)
    const adminRow = document.createElement('tr');
    adminRow.innerHTML = `
        <td><strong>SYS-ADM</strong></td>
        <td><strong>Admin</strong></td>
        <td style="color: var(--text-muted); font-style: italic;">Full system administrator. Access override on all modules.</td>
        <td><span class="module-badge active" style="font-weight: 600;">* Full System Access</span></td>
        <td style="text-align: center;">
            <span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Locked</span>
        </td>
    `;
    tbody.appendChild(adminRow);

    const totalItems = filteredList.length;
    if (totalItems === 0 && rolesList.length > 0) {
        // Just the admin row plus showing pagination info
        document.getElementById('pagination-info').textContent = `Showing Admin and 0 custom roles`;
        document.getElementById('pagination-controls').innerHTML = '';
        return;
    }

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
    const paginatedItems = filteredList.slice(startIdx, endIdx);

    paginatedItems.forEach(role => {
        // Compile allowed modules
        const activeModules = [];
        modules.forEach(mod => {
            const perms = role.permissions[mod.id];
            if (perms && perms.includes('view')) {
                activeModules.push(mod.label);
            }
        });

        const modulesHtml = activeModules.map(m => `<span class="module-badge active">${m}</span>`).join(' ') || 
                            `<span class="module-badge" style="color: var(--danger);">No Access</span>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${role.id}</strong></td>
            <td>${role.name}</td>
            <td>${role.description || '-'}</td>
            <td>
                <div style="max-height: 50px; overflow-y: auto;">
                    ${modulesHtml}
                </div>
            </td>
            <td style="text-align: center;">
                <div class="table-actions">
                    <button class="action-btn edit-btn" data-id="${role.id}" title="Edit Role"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" data-id="${role.id}" title="Delete Role"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        `;

        row.querySelector('.edit-btn').addEventListener('click', () => openRoleModal(role));
        row.querySelector('.delete-btn').addEventListener('click', () => handleDeleteRole(role));

        tbody.appendChild(row);
    });

    document.getElementById('pagination-info').textContent = `Showing 1 to ${totalItems} of ${totalItems} custom roles`;
    renderPagination(totalItems);
}

function renderPagination(totalItems) {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => {
        currentPage--;
        renderRolesTable();
    });
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
        btn.textContent = i.toString();
        btn.addEventListener('click', () => {
            currentPage = i;
            renderRolesTable();
        });
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => {
        currentPage++;
        renderRolesTable();
    });
    container.appendChild(nextBtn);
}

function generatePermissionsMatrix(permissions = {}) {
    const tbody = document.getElementById('permissions-matrix-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    modules.forEach(mod => {
        const modPerms = permissions[mod.id] || [];
        const hasView = modPerms.includes('view');
        const hasAdd = modPerms.includes('add');
        const hasEdit = modPerms.includes('edit');
        const hasDel = modPerms.includes('delete');

        const row = document.createElement('tr');
        row.setAttribute('data-module', mod.id);
        row.innerHTML = `
            <td>${mod.label}</td>
            <td><input type="checkbox" class="perm-checkbox" data-action="view" ${hasView ? 'checked' : ''}></td>
            <td><input type="checkbox" class="perm-checkbox" data-action="add" ${hasAdd ? 'checked' : ''} ${!hasView ? 'disabled' : ''}></td>
            <td><input type="checkbox" class="perm-checkbox" data-action="edit" ${hasEdit ? 'checked' : ''} ${!hasView ? 'disabled' : ''}></td>
            <td><input type="checkbox" class="perm-checkbox" data-action="delete" ${hasDel ? 'checked' : ''} ${!hasView ? 'disabled' : ''}></td>
        `;

        // Add linkage logic between View checkbox and Action checkboxes
        const viewCb = row.querySelector('[data-action="view"]');
        const otherCbs = row.querySelectorAll('[data-action="add"], [data-action="edit"], [data-action="delete"]');

        viewCb.addEventListener('change', () => {
            otherCbs.forEach(cb => {
                cb.disabled = !viewCb.checked;
                if (!viewCb.checked) {
                    cb.checked = false;
                }
            });
        });

        tbody.appendChild(row);
    });
}

function openRoleModal(role = null) {
    const form = document.getElementById('role-form');
    validate.clearErrors(form);

    if (role) {
        document.getElementById('modal-title-text').textContent = 'Edit Custom Access Role';
        document.getElementById('role-id-field').value = role.id;
        form.name.value = role.name;
        form.description.value = role.description || '';
        
        generatePermissionsMatrix(role.permissions);
        document.getElementById('save-role-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Create Custom Access Role';
        document.getElementById('role-id-field').value = '';
        form.reset();
        
        generatePermissionsMatrix({});
        document.getElementById('save-role-btn').textContent = 'Create Role';
    }

    modal.open('role-modal');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const roleId = document.getElementById('role-id-field').value;

    const nameVal = form.name.value.trim();
    const descVal = form.description.value.trim();

    let errors = {};
    if (!validate.required(nameVal)) {
        errors.name = 'Role name is required.';
    }

    // Check duplicate name
    const exists = rolesList.some(r => r.name.toLowerCase() === nameVal.toLowerCase() && r.id !== roleId);
    if (exists || nameVal.toLowerCase() === 'admin') {
        errors.name = 'This role name is already registered or reserved.';
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    // Extract permission states
    const permissions = {};
    const matrixTbody = document.getElementById('permissions-matrix-tbody');
    modules.forEach(mod => {
        const row = matrixTbody.querySelector(`tr[data-module="${mod.id}"]`);
        if (row) {
            const list = [];
            if (row.querySelector('[data-action="view"]').checked) list.push('view');
            if (row.querySelector('[data-action="add"]').checked) list.push('add');
            if (row.querySelector('[data-action="edit"]').checked) list.push('edit');
            if (row.querySelector('[data-action="delete"]').checked) list.push('delete');
            permissions[mod.id] = list;
        }
    });

    const roleData = {
        name: nameVal,
        description: descVal,
        permissions: permissions
    };

    if (roleId) {
        db.update('roles', roleId, roleData);
        toast.show('Access role updated successfully!', 'success');
    } else {
        db.insert('roles', roleData, 'ROL-');
        toast.show('New access role created!', 'success');
    }

    modal.close('role-modal');
    loadRolesData();
}

function handleDeleteRole(role) {
    // Check if any staff member is assigned to this role
    const staff = db.find('staff');
    const isAssigned = staff.some(s => s.role.toLowerCase() === role.name.toLowerCase());
    
    if (isAssigned) {
        dialog.alert('Role Dependency', `Cannot delete access role "${role.name}" because it is currently assigned to one or more staff accounts. Reassign the staff members first.`);
        return;
    }

    dialog.confirm('Confirm Role Removal', `Are you sure you want to delete access role "${role.name}"? This action cannot be undone.`, () => {
        const success = db.remove('roles', role.id);
        if (success) {
            toast.show('Access role removed successfully.', 'success');
            loadRolesData();
        } else {
            toast.show('Failed to remove access role.', 'error');
        }
    });
}
