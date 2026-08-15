/**
 * PUBLISHERS.JS
 * CRUD actions for Book Publishers.
 */

let publishersList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    loadPublishers();

    document.getElementById('search-input').addEventListener('input', (e) => {
        filterPublishers(e.target.value);
    });

    document.getElementById('add-publisher-btn').addEventListener('click', () => {
        openPublisherModal();
    });

    document.getElementById('publisher-form').addEventListener('submit', handleFormSubmit);

    document.querySelectorAll('#publishers-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Enforce Add Permission
    if (!auth.hasPermission('publishers', 'add')) {
        const btn = document.getElementById('add-publisher-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadPublishers() {
    publishersList = db.find('publishers');
    filterPublishers(document.getElementById('search-input').value);
}

function filterPublishers(keyword) {
    keyword = keyword.trim().toLowerCase();
    
    if (!keyword) {
        filteredList = [...publishersList];
    } else {
        filteredList = publishersList.filter(pub => 
            pub.id.toLowerCase().includes(keyword) ||
            pub.name.toLowerCase().includes(keyword) ||
            pub.address.toLowerCase().includes(keyword) ||
            pub.phone.toLowerCase().includes(keyword)
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

    document.querySelectorAll('#publishers-table th.sortable').forEach(th => {
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
    const canEdit = auth.hasPermission('publishers', 'edit');
    const canDelete = auth.hasPermission('publishers', 'delete');
    const tbody = document.getElementById('publishers-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty-state">
                    <i class="fas fa-building"></i>
                    <p>No publishers found matching filters.</p>
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

    paginatedItems.forEach(pub => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${pub.id}</strong></td>
            <td>${pub.name}</td>
            <td>${pub.address}</td>
            <td>${pub.phone}</td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${canEdit ? `
                        <button class="action-btn edit-btn" data-id="${pub.id}" title="Edit Publisher"><i class="fas fa-edit"></i></button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="action-btn delete-btn" data-id="${pub.id}" title="Delete Publisher"><i class="fas fa-trash-alt"></i></button>
                    ` : ''}
                    ${!canEdit && !canDelete ? '<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Locked</span>' : ''}
                </div>
            </td>
        `;

        if (canEdit) row.querySelector('.edit-btn').addEventListener('click', () => openPublisherModal(pub));
        if (canDelete) row.querySelector('.delete-btn').addEventListener('click', () => handleDelete(pub.id));

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

function openPublisherModal(pub = null) {
    const form = document.getElementById('publisher-form');
    validate.clearErrors(form);
    
    if (pub) {
        document.getElementById('modal-title-text').textContent = 'Edit Publisher';
        document.getElementById('publisher-id-field').value = pub.id;
        form.name.value = pub.name;
        form.address.value = pub.address;
        form.phone.value = pub.phone;
        document.getElementById('save-publisher-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Add New Publisher';
        document.getElementById('publisher-id-field').value = '';
        form.reset();
        document.getElementById('save-publisher-btn').textContent = 'Save Publisher';
    }
    
    modal.open('publisher-modal');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const pubId = document.getElementById('publisher-id-field').value;
    const nameVal = form.name.value.trim();
    const addrVal = form.address.value.trim();
    const phoneVal = form.phone.value.trim();

    let errors = {};
    if (!validate.required(nameVal)) {
        errors.name = 'Publisher name is required.';
    }
    if (!validate.required(addrVal)) {
        errors.address = 'Address is required.';
    }
    if (!validate.required(phoneVal)) {
        errors.phone = 'Phone number is required.';
    } else if (!validate.phone(phoneVal)) {
        errors.phone = 'Please enter a valid phone number.';
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    if (pubId) {
        const updated = db.update('publishers', pubId, { name: nameVal, address: addrVal, phone: phoneVal });
        if (updated) {
            toast.show('Publisher profile updated successfully!', 'success');
        } else {
            toast.show('Failed to update publisher.', 'error');
        }
    } else {
        db.insert('publishers', { name: nameVal, address: addrVal, phone: phoneVal }, 'PUB-');
        toast.show('New publisher profile added!', 'success');
    }

    modal.close('publisher-modal');
    loadPublishers();
}

function handleDelete(id) {
    const books = db.find('books', b => b.publisherId === id);
    if (books.length > 0) {
        dialog.alert('Deletion Denied', `Cannot delete publisher. There are ${books.length} cataloged book titles linked to this publisher.`);
        return;
    }

    dialog.confirm('Confirm Deletion', `Are you sure you want to delete publisher profile: ${id}?`, () => {
        const success = db.remove('publishers', id);
        if (success) {
            toast.show('Publisher profile deleted successfully.', 'success');
            loadPublishers();
        } else {
            toast.show('Failed to delete publisher.', 'error');
        }
    });
}
