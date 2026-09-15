/**
 * STAFF.JS
 * Library staff management, user registrations, and permissions.
 */

let staffList = [];
let branchesList = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Core initialization
    loadStaffData();
    setupAdminRestrictions();

    // 2. Staff Action Listeners
    document.getElementById('add-staff-btn').addEventListener('click', () => {
        openStaffModal();
    });

    document.getElementById('staff-form').addEventListener('submit', handleStaffSubmit);
});

function loadStaffData() {
    staffList = db.find('staff') || [];
    branchesList = db.find('branches') || [];

    // Populate branch select in form
    const staffBranchSel = document.getElementById('staff-branch');
    if (staffBranchSel) {
        staffBranchSel.innerHTML = '<option value="">Select Branch</option>';
        branchesList.forEach(b => {
            staffBranchSel.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        });
    }

    // Populate role select in form dynamically from seeded/created roles
    const staffRoleSel = document.getElementById('staff-role');
    if (staffRoleSel) {
        staffRoleSel.innerHTML = '<option value="Admin">Administrator</option>';
        const rolesList = db.find('roles') || [];
        rolesList.forEach(r => {
            staffRoleSel.innerHTML += `<option value="${r.name}">${r.name}</option>`;
        });
    }

    renderStaffTable();
}

function setupAdminRestrictions() {
    // If not Admin, disable edits
    if (!auth.isAdmin()) {
        const addBtn = document.getElementById('add-staff-btn');
        if (addBtn) addBtn.disabled = true;
        toast.show('Access restricted: Staff users cannot modify core configurations.', 'warning');
    }
}

function renderStaffTable() {
    const tbody = document.getElementById('staff-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const currentUser = auth.getCurrentUser();
    const isAdmin = auth.isAdmin();

    staffList.forEach(stf => {
        const branch = branchesList.find(b => b.id === stf.branchId);
        let statusBadgeClass = stf.status === 'Active' ? 'badge-active' : 'badge-suspended';

        // Restrict operations on other admins/accounts if user is not admin
        const canEdit = isAdmin && stf.id !== currentUser.id;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${stf.id}</strong></td>
            <td>${stf.name}</td>
            <td>${stf.email}</td>
            <td><span class="badge badge-reserved">${stf.role}</span></td>
            <td>${branch ? branch.name : '-'}</td>
            <td><span class="badge ${statusBadgeClass}">${stf.status}</span></td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${canEdit ? `
                        <button class="action-btn edit-btn" data-id="${stf.id}" title="Edit Staff"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" data-id="${stf.id}" title="Delete Staff"><i class="fas fa-user-slash"></i></button>
                    ` : `
                        <span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Locked</span>
                    `}
                </div>
            </td>
        `;

        if (canEdit) {
            row.querySelector('.edit-btn').addEventListener('click', () => openStaffModal(stf));
            row.querySelector('.delete-btn').addEventListener('click', () => handleDeleteStaff(stf.id));
        }

        tbody.appendChild(row);
    });
}

// ----------------------------------------------------
// Staff CRUD Handlers
// ----------------------------------------------------
function openStaffModal(stf = null) {
    const form = document.getElementById('staff-form');
    validate.clearErrors(form);

    if (stf) {
        document.getElementById('modal-title-text').textContent = 'Edit Staff Details';
        document.getElementById('staff-id-field').value = stf.id;
        form.name.value = stf.name;
        form.email.value = stf.email;
        form.password.value = stf.password;
        form.role.value = stf.role;
        form.branchId.value = stf.branchId;
        form.status.value = stf.status;
        document.getElementById('save-staff-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Add Staff Operator';
        document.getElementById('staff-id-field').value = '';
        form.reset();
        form.role.value = 'Staff';
        form.status.value = 'Active';
        document.getElementById('save-staff-btn').textContent = 'Save Operator';
    }

    modal.open('staff-modal');
}

function handleStaffSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const staffId = document.getElementById('staff-id-field').value;

    const nameVal = form.name.value.trim();
    const emailVal = form.email.value.trim();
    const passwordVal = form.password.value.trim();
    const roleVal = form.role.value;
    const branchVal = form.branchId.value;
    const statusVal = form.status.value;

    let errors = {};
    if (!validate.required(nameVal)) errors.name = 'Staff name is required.';
    if (!validate.required(emailVal)) {
        errors.email = 'Email address is required.';
    } else if (!validate.email(emailVal)) {
        errors.email = 'Please enter a valid email address.';
    }
    if (!validate.required(passwordVal)) errors.password = 'Password is required.';
    if (!validate.required(branchVal)) errors.branchId = 'Select a branch.';

    // Check duplicate email
    const emailExists = staffList.some(s => s.email.toLowerCase() === emailVal.toLowerCase() && s.id !== staffId);
    if (emailExists) {
        errors.email = 'This email is already registered to a staff account.';
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    const staffData = {
        name: nameVal,
        email: emailVal,
        password: passwordVal,
        role: roleVal,
        branchId: branchVal,
        status: statusVal
    };

    if (staffId) {
        db.update('staff', staffId, staffData);
        toast.show('Staff account details modified!', 'success');
    } else {
        db.insert('staff', staffData, 'STF-');
        toast.show('New staff account registered!', 'success');
    }

    modal.close('staff-modal');
    loadStaffData();
}

function handleDeleteStaff(id) {
    dialog.confirm('Deactivate Operator Account', `Are you sure you want to delete staff account: ${id}?`, () => {
        const success = db.remove('staff', id);
        if (success) {
            toast.show('Staff account removed successfully.', 'success');
            loadStaffData();
        } else {
            toast.show('Failed to remove staff account.', 'error');
        }
    });
}
