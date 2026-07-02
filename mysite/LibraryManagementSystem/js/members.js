/**
 * MEMBERS.JS
 * CRUD actions for Member accounts & profiling.
 */

let membersList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    loadMembers();

    // Search and Filter Listeners
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-type').addEventListener('change', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);

    // Add Action
    document.getElementById('add-member-btn').addEventListener('click', () => {
        openMemberModal();
    });

    // Form Submit
    document.getElementById('member-form').addEventListener('submit', handleFormSubmit);

    // Sorting Headers
    document.querySelectorAll('#members-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Profile Modal Tab Controls
    setupProfileTabs();

    // Enforce Add Permission
    if (!auth.hasPermission('members', 'add')) {
        const btn = document.getElementById('add-member-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadMembers() {
    membersList = db.find('members');
    applyFilters();
}

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.trim().toLowerCase();
    const typeVal = document.getElementById('filter-type').value;
    const statusVal = document.getElementById('filter-status').value;

    filteredList = membersList.filter(member => {
        const matchesSearch = !searchVal ||
            member.id.toLowerCase().includes(searchVal) ||
            member.name.toLowerCase().includes(searchVal) ||
            member.email.toLowerCase().includes(searchVal) ||
            member.phone.toLowerCase().includes(searchVal);

        const matchesType = !typeVal || member.membershipType === typeVal;
        const matchesStatus = !statusVal || member.status === statusVal;

        return matchesSearch && matchesType && matchesStatus;
    });

    currentPage = 1;
    sortData();
}

function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    document.querySelectorAll('#members-table th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.column === sortColumn) {
            th.classList.add(sortDirection);
        }
    });

    sortData();
}

function sortData() {
    filteredList.sort((a, b) => {
        let valA = a[sortColumn] ? a[sortColumn].toString().toLowerCase() : '';
        let valB = b[sortColumn] ? b[sortColumn].toString().toLowerCase() : '';
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable();
}

function renderTable() {
    const canEdit = auth.hasPermission('members', 'edit');
    const canDelete = auth.hasPermission('members', 'delete');
    const tbody = document.getElementById('members-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty-state">
                    <i class="fas fa-users"></i>
                    <p>No members found matching filters.</p>
                </td>
            </tr>
        `;
        document.getElementById('pagination-info').textContent = 'Showing 0 to 0 of 0 entries';
        document.getElementById('pagination-controls').innerHTML = '';
        return;
    }

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
    const paginatedItems = filteredList.slice(startIdx, endIdx);

    paginatedItems.forEach(member => {
        let statusBadgeClass = member.status === 'Active' ? 'badge-active' : 'badge-suspended';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${member.id}</strong></td>
            <td>${member.name}</td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td><span class="badge badge-reserved" style="font-weight: 500;">${member.membershipType}</span></td>
            <td><span class="badge ${statusBadgeClass}">${member.status}</span></td>
            <td style="text-align: center;">
                <div class="table-actions">
                    <button class="action-btn view-btn" data-id="${member.id}" title="View Profile"><i class="fas fa-eye"></i></button>
                    ${canEdit ? `
                        <button class="action-btn edit-btn" data-id="${member.id}" title="Edit Member"><i class="fas fa-edit"></i></button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="action-btn delete-btn" data-id="${member.id}" title="Delete Member"><i class="fas fa-user-slash"></i></button>
                    ` : ''}
                    ${!canEdit && !canDelete ? '<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Locked</span>' : ''}
                </div>
            </td>
        `;

        row.querySelector('.view-btn').addEventListener('click', () => openProfileModal(member));
        if (canEdit) row.querySelector('.edit-btn').addEventListener('click', () => openMemberModal(member));
        if (canDelete) row.querySelector('.delete-btn').addEventListener('click', () => handleDelete(member));

        tbody.appendChild(row);
    });

    document.getElementById('pagination-info').textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalItems} entries`;
    renderPaginationControls(totalItems);
}

function renderPaginationControls(totalItems) {
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
        renderTable();
    });
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
        btn.textContent = i.toString();
        btn.addEventListener('click', () => {
            currentPage = i;
            renderTable();
        });
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => {
        currentPage++;
        renderTable();
    });
    container.appendChild(nextBtn);
}

// ----------------------------------------------------
// Add/Edit Member Form Modal
// ----------------------------------------------------
function openMemberModal(member = null) {
    const form = document.getElementById('member-form');
    validate.clearErrors(form);

    if (member) {
        document.getElementById('modal-title-text').textContent = 'Edit Member Profile';
        document.getElementById('member-id-field').value = member.id;
        form.name.value = member.name;
        form.email.value = member.email;
        form.phone.value = member.phone;
        form.membershipType.value = member.membershipType;
        form.status.value = member.status;
        document.getElementById('save-member-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Register New Member';
        document.getElementById('member-id-field').value = '';
        form.reset();
        form.membershipType.value = 'Regular';
        form.status.value = 'Active';
        document.getElementById('save-member-btn').textContent = 'Register Member';
    }

    modal.open('member-modal');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const memberId = document.getElementById('member-id-field').value;

    const nameVal = form.name.value.trim();
    const emailVal = form.email.value.trim();
    const phoneVal = form.phone.value.trim();
    const typeVal = form.membershipType.value;
    const statusVal = form.status.value;

    let errors = {};
    if (!validate.required(nameVal)) errors.name = 'Full name is required.';
    if (!validate.required(emailVal)) {
        errors.email = 'Email address is required.';
    } else if (!validate.email(emailVal)) {
        errors.email = 'Please enter a valid email address.';
    }
    if (!validate.required(phoneVal)) {
        errors.phone = 'Phone number is required.';
    } else if (!validate.phone(phoneVal)) {
        errors.phone = 'Enter a valid phone number (10-12 digits).';
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    // Determine max borrow capacity by category level
    let maxAllowed = 5;
    if (typeVal === 'Student') maxAllowed = 3;
    if (typeVal === 'Premium') maxAllowed = 10;

    const memberData = {
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        membershipType: typeVal,
        status: statusVal,
        maxBooksAllowed: maxAllowed
    };

    if (memberId) {
        const updated = db.update('members', memberId, memberData);
        if (updated) {
            toast.show('Member profile updated successfully!', 'success');
        } else {
            toast.show('Failed to update member.', 'error');
        }
    } else {
        memberData.joinDate = datetime.today();
        db.insert('members', memberData, 'MEM-70');
        toast.show('New member profile created!', 'success');
    }

    modal.close('member-modal');
    loadMembers();
}

function handleDelete(member) {
    // Check active loans & unpaid fines
    const activeLoans = db.find('loans', l => l.memberId === member.id && l.returnDate === null);
    const unpaidFines = db.find('fines', f => f.memberId === member.id && f.status === 'Unpaid');

    if (activeLoans.length > 0 || unpaidFines.length > 0) {
        dialog.alert('Account Balance Guard', `Cannot delete member profile. Account has ${activeLoans.length} active checked out copies and $${unpaidFines.reduce((s,f) => s+f.amount, 0).toFixed(2)} in outstanding fines.`);
        return;
    }

    dialog.confirm('Confirm Deletion', `Are you sure you want to remove member account: ${member.id}?`, () => {
        // Clean history loans and paid fines
        const oldLoans = db.find('loans', l => l.memberId === member.id);
        const oldFines = db.find('fines', f => f.memberId === member.id);
        const reservations = db.find('reservations', r => r.memberId === member.id);

        oldLoans.forEach(l => db.remove('loans', l.id));
        oldFines.forEach(f => db.remove('fines', f.id));
        reservations.forEach(r => db.remove('reservations', r.id));

        const success = db.remove('members', member.id);
        if (success) {
            toast.show('Member account removed.', 'success');
            loadMembers();
        } else {
            toast.show('Failed to delete member.', 'error');
        }
    });
}

// ----------------------------------------------------
// Member Profile Details Compiler
// ----------------------------------------------------
function openProfileModal(member) {
    // Fill sidebar fields
    const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    document.getElementById('prof-avatar').textContent = initials;
    document.getElementById('prof-name').textContent = member.name;
    document.getElementById('prof-id').textContent = member.id;
    document.getElementById('prof-type').textContent = member.membershipType;
    document.getElementById('prof-join').textContent = datetime.format(member.joinDate);
    document.getElementById('prof-email').textContent = member.email;
    document.getElementById('prof-phone').textContent = member.phone;

    const statusBadge = document.getElementById('prof-status-badge');
    statusBadge.textContent = member.status;
    statusBadge.className = `badge ${member.status === 'Active' ? 'badge-active' : 'badge-suspended'}`;

    // Load active checkouts table
    const activeTbody = document.getElementById('prof-active-tbody');
    activeTbody.innerHTML = '';
    const activeLoans = db.find('loans', l => l.memberId === member.id && l.returnDate === null);
    
    if (activeLoans.length === 0) {
        activeTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No active checkouts.</td></tr>`;
    } else {
        const copies = db.find('bookCopies');
        const books = db.find('books');
        
        activeLoans.forEach(loan => {
            const copy = copies.find(c => c.id === loan.bookCopyId);
            const book = copy ? books.find(b => b.id === copy.bookId) : null;
            
            // Calculate live overdue fine for preview
            let fineText = '$0.00';
            const daysOverdue = datetime.diffDays(loan.dueDate, datetime.today());
            if (daysOverdue > 0) {
                fineText = `$${(daysOverdue * 1.00).toFixed(2)} (Overdue)`;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${copy ? copy.barcode : 'Unknown'}</code></td>
                <td>${book ? book.title : 'Unknown Book'}</td>
                <td>${datetime.format(loan.dueDate)}</td>
                <td style="color: ${daysOverdue > 0 ? 'var(--danger)' : 'inherit'}">${fineText}</td>
            `;
            activeTbody.appendChild(row);
        });
    }

    // Load history returns table
    const historyTbody = document.getElementById('prof-history-tbody');
    historyTbody.innerHTML = '';
    const pastLoans = db.find('loans', l => l.memberId === member.id && l.returnDate !== null);
    
    if (pastLoans.length === 0) {
        historyTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No returned checkout history.</td></tr>`;
    } else {
        const copies = db.find('bookCopies');
        const books = db.find('books');
        
        pastLoans.forEach(loan => {
            const copy = copies.find(c => c.id === loan.bookCopyId);
            const book = copy ? books.find(b => b.id === copy.bookId) : null;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book ? book.title : 'Unknown Book'}</td>
                <td>${datetime.format(loan.issueDate)}</td>
                <td>${datetime.format(loan.returnDate)}</td>
            `;
            historyTbody.appendChild(row);
        });
    }

    // Load unpaid fines table
    const finesTbody = document.getElementById('prof-fines-tbody');
    finesTbody.innerHTML = '';
    const unpaidFines = db.find('fines', f => f.memberId === member.id && f.status === 'Unpaid');

    if (unpaidFines.length === 0) {
        finesTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No outstanding fines.</td></tr>`;
    } else {
        const loansList = db.find('loans');
        
        unpaidFines.forEach(fine => {
            const loan = loansList.find(l => l.id === fine.loanId);
            const overdueDays = loan ? datetime.diffDays(loan.dueDate, datetime.today()) : '-';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${fine.id}</code></td>
                <td>${loan ? datetime.format(loan.dueDate) : '-'}</td>
                <td>${overdueDays} Day(s)</td>
                <td style="color: var(--danger); font-weight: 600;">$${fine.amount.toFixed(2)}</td>
            `;
            finesTbody.appendChild(row);
        });
    }

    // Default to the first tab pane
    document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
        if (idx === 0) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content-pane').forEach((pane, idx) => {
        if (idx === 0) pane.classList.add('active');
        else pane.classList.remove('active');
    });

    modal.open('member-profile-modal');
}

function setupProfileTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content-pane').forEach(p => p.classList.remove('active'));

            // Set active class
            btn.classList.add('active');
            const targetId = btn.dataset.target;
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
}
