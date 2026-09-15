/**
 * BRANCHES.JS
 * CRUD actions for Library Branches.
 */

let branchesList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    loadBranches();

    document.getElementById('search-input').addEventListener('input', (e) => {
        filterBranches(e.target.value);
    });

    document.getElementById('add-branch-btn').addEventListener('click', () => {
        openBranchModal();
    });

    document.getElementById('branch-form').addEventListener('submit', handleFormSubmit);

    document.querySelectorAll('#branches-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Enforce Add Permission
    if (!auth.hasPermission('branches', 'add')) {
        const btn = document.getElementById('add-branch-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadBranches() {
    branchesList = db.find('branches');
    filterBranches(document.getElementById('search-input').value);
}

function filterBranches(keyword) {
    keyword = keyword.trim().toLowerCase();
    
    if (!keyword) {
        filteredList = [...branchesList];
    } else {
        filteredList = branchesList.filter(brn => 
            brn.id.toLowerCase().includes(keyword) ||
            brn.name.toLowerCase().includes(keyword) ||
            brn.location.toLowerCase().includes(keyword)
        );
    }

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

    document.querySelectorAll('#branches-table th.sortable').forEach(th => {
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
    const canEdit = auth.hasPermission('branches', 'edit');
    const canDelete = auth.hasPermission('branches', 'delete');
    const tbody = document.getElementById('branches-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty-state">
                    <i class="fas fa-map-marker-alt"></i>
                    <p>No branches found matching filters.</p>
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

    paginatedItems.forEach(brn => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${brn.id}</strong></td>
            <td>${brn.name}</td>
            <td>${brn.location}</td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${canEdit ? `
                        <button class="action-btn edit-btn" data-id="${b.id}" title="Edit Branch"><i class="fas fa-edit"></i></button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="action-btn delete-btn" data-id="${b.id}" title="Delete Branch"><i class="fas fa-trash-alt"></i></button>
                    ` : ''}
                    ${!canEdit && !canDelete ? '<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Locked</span>' : ''}
                </div>
            </td>
        `;

        if (canEdit) row.querySelector('.edit-btn').addEventListener('click', () => openBranchModal(brn));
        if (canDelete) row.querySelector('.delete-btn').addEventListener('click', () => handleDelete(brn.id));

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

function openBranchModal(brn = null) {
    const form = document.getElementById('branch-form');
    validate.clearErrors(form);
    
    if (brn) {
        document.getElementById('modal-title-text').textContent = 'Edit Branch';
        document.getElementById('branch-id-field').value = brn.id;
        form.name.value = brn.name;
        form.location.value = brn.location;
        document.getElementById('save-branch-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Add New Branch';
        document.getElementById('branch-id-field').value = '';
        form.reset();
        document.getElementById('save-branch-btn').textContent = 'Save Branch';
    }
    
    modal.open('branch-modal');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const brnId = document.getElementById('branch-id-field').value;
    const nameVal = form.name.value.trim();
    const locVal = form.location.value.trim();

    let errors = {};
    if (!validate.required(nameVal)) {
        errors.name = 'Branch name is required.';
    }
    if (!validate.required(locVal)) {
        errors.location = 'Location address is required.';
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    if (brnId) {
        const updated = db.update('branches', brnId, { name: nameVal, location: locVal });
        if (updated) {
            toast.show('Branch details updated successfully!', 'success');
        } else {
            toast.show('Failed to update branch.', 'error');
        }
    } else {
        db.insert('branches', { name: nameVal, location: locVal }, 'BRN-');
        toast.show('New library branch registered!', 'success');
    }

    modal.close('branch-modal');
    loadBranches();
}

function handleDelete(id) {
    // Check if copies or staff belong to this branch
    const copies = db.find('bookCopies', c => c.branchId === id);
    const staff = db.find('staff', s => s.branchId === id);

    if (copies.length > 0 || staff.length > 0) {
        dialog.alert('Dependency Check Failed', `Cannot delete branch. There are ${copies.length} copies and ${staff.length} staff records registered to this branch.`);
        return;
    }

    dialog.confirm('Confirm Deletion', `Are you sure you want to delete branch: ${id}?`, () => {
        const success = db.remove('branches', id);
        if (success) {
            toast.show('Branch details deleted successfully.', 'success');
            loadBranches();
        } else {
            toast.show('Failed to delete branch.', 'error');
        }
    });
}
