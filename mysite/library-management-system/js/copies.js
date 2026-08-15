/**
 * COPIES.JS
 * CRUD actions for Individual Book Copies.
 */

let copiesList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

// Dropdowns data cache
let books = [];
let branches = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCopiesData();
    initializeSelectors();

    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    document.getElementById('filter-branch').addEventListener('change', applyFilters);

    document.getElementById('add-copy-btn').addEventListener('click', () => {
        openCopyModal();
    });

    document.getElementById('copy-form').addEventListener('submit', handleFormSubmit);

    document.querySelectorAll('#copies-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Enforce Add Permission
    if (!auth.hasPermission('copies', 'add')) {
        const btn = document.getElementById('add-copy-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadCopiesData() {
    copiesList = db.find('bookCopies');
    books = db.find('books');
    branches = db.find('branches');
    
    applyFilters();
}

function initializeSelectors() {
    const filterBrn = document.getElementById('filter-branch');
    const formBook = document.getElementById('copy-book');
    const formBranch = document.getElementById('copy-branch');

    // Populate branch filter
    filterBrn.innerHTML = '<option value="">All Branches</option>';
    branches.forEach(b => {
        filterBrn.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        formBranch.innerHTML += `<option value="${b.id}">${b.name}</option>`;
    });

    // Populate form books list
    formBook.innerHTML = '<option value="">Select Book</option>';
    books.forEach(b => {
        formBook.innerHTML += `<option value="${b.id}">${b.title} (ISBN: ${b.isbn})</option>`;
    });
}

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.trim().toLowerCase();
    const statusVal = document.getElementById('filter-status').value;
    const branchVal = document.getElementById('filter-branch').value;

    filteredList = copiesList.filter(copy => {
        const book = books.find(b => b.id === copy.bookId);
        const bookTitle = book ? book.title.toLowerCase() : '';
        
        const matchesSearch = !searchVal ||
            copy.barcode.toLowerCase().includes(searchVal) ||
            copy.shelfLocation.toLowerCase().includes(searchVal) ||
            bookTitle.includes(searchVal);

        const matchesStatus = !statusVal || copy.status === statusVal;
        const matchesBranch = !branchVal || copy.branchId === branchVal;

        return matchesSearch && matchesStatus && matchesBranch;
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

    document.querySelectorAll('#copies-table th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.column === sortColumn) {
            th.classList.add(sortDirection);
        }
    });

    sortData();
}

function sortData() {
    filteredList.sort((a, b) => {
        let valA = '';
        let valB = '';

        if (sortColumn === 'title') {
            const bookA = books.find(book => book.id === a.bookId);
            const bookB = books.find(book => book.id === b.bookId);
            valA = bookA ? bookA.title.toLowerCase() : '';
            valB = bookB ? bookB.title.toLowerCase() : '';
        } else {
            valA = a[sortColumn] ? a[sortColumn].toString().toLowerCase() : '';
            valB = b[sortColumn] ? b[sortColumn].toString().toLowerCase() : '';
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable();
}

function renderTable() {
    const canEdit = auth.hasPermission('copies', 'edit');
    const canDelete = auth.hasPermission('copies', 'delete');
    const tbody = document.getElementById('copies-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty-state">
                    <i class="fas fa-barcode"></i>
                    <p>No copies found matching filters.</p>
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

    paginatedItems.forEach(copy => {
        const book = books.find(b => b.id === copy.bookId);
        const branch = branches.find(b => b.id === copy.branchId);
        
        let statusBadgeClass = 'badge-available';
        if (copy.status === 'Issued') statusBadgeClass = 'badge-issued';
        if (copy.status === 'Reserved') statusBadgeClass = 'badge-reserved';
        if (copy.status === 'Maintenance') statusBadgeClass = 'badge-suspended';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${copy.id}</strong></td>
            <td><code>${copy.barcode}</code></td>
            <td>${book ? book.title : 'Unknown Book'}</td>
            <td>${branch ? branch.name : 'Unknown Branch'}</td>
            <td>${copy.shelfLocation}</td>
            <td><span class="badge ${statusBadgeClass}">${copy.status}</span></td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${canEdit ? `
                        <button class="action-btn edit-btn" data-id="${copy.id}" title="Edit Copy"><i class="fas fa-edit"></i></button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="action-btn delete-btn" data-id="${copy.id}" title="Delete Copy"><i class="fas fa-trash-alt"></i></button>
                    ` : ''}
                    ${!canEdit && !canDelete ? '<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Locked</span>' : ''}
                </div>
            </td>
        `;

        if (canEdit) row.querySelector('.edit-btn').addEventListener('click', () => openCopyModal(copy));
        if (canDelete) row.querySelector('.delete-btn').addEventListener('click', () => handleDelete(copy));

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

function openCopyModal(copy = null) {
    const form = document.getElementById('copy-form');
    validate.clearErrors(form);
    
    if (copy) {
        document.getElementById('modal-title-text').textContent = 'Edit Book Copy';
        document.getElementById('copy-id-field').value = copy.id;
        form.bookId.value = copy.bookId;
        form.barcode.value = copy.barcode;
        form.shelfLocation.value = copy.shelfLocation;
        form.branchId.value = copy.branchId;
        form.status.value = copy.status;
        document.getElementById('save-copy-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Add Book Copy';
        document.getElementById('copy-id-field').value = '';
        form.reset();
        form.status.value = 'Available';
        document.getElementById('save-copy-btn').textContent = 'Save Copy';
    }
    
    modal.open('copy-modal');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const copyId = document.getElementById('copy-id-field').value;

    const bookIdVal = form.bookId.value;
    const barcodeVal = form.barcode.value.trim();
    const shelfVal = form.shelfLocation.value.trim();
    const branchIdVal = form.branchId.value;
    const statusVal = form.status.value;

    let errors = {};
    if (!validate.required(bookIdVal)) errors.bookId = 'Book selection is required.';
    if (!validate.required(shelfVal)) errors.shelfLocation = 'Shelf location is required.';
    if (!validate.required(branchIdVal)) errors.branchId = 'Branch is required.';
    
    if (!validate.required(barcodeVal)) {
        errors.barcode = 'Barcode is required.';
    } else {
        // Check uniqueness
        const barcodeExists = copiesList.some(c => c.barcode.toLowerCase() === barcodeVal.toLowerCase() && c.id !== copyId);
        if (barcodeExists) {
            errors.barcode = 'This barcode is already registered.';
        }
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    const copyData = {
        bookId: bookIdVal,
        barcode: barcodeVal,
        shelfLocation: shelfVal,
        branchId: branchIdVal,
        status: statusVal
    };

    if (copyId) {
        const updated = db.update('bookCopies', copyId, copyData);
        if (updated) {
            toast.show('Copy details updated successfully!', 'success');
        } else {
            toast.show('Failed to update copy details.', 'error');
        }
    } else {
        db.insert('bookCopies', copyData, 'COP-');
        toast.show('New book copy added to inventory!', 'success');
    }

    modal.close('copy-modal');
    loadCopiesData();
}

function handleDelete(copy) {
    // If copy is issued, block deletion
    if (copy.status === 'Issued') {
        dialog.alert('Circulation Rule', 'Cannot delete this copy because it is currently issued to a member. It must be returned first.');
        return;
    }

    dialog.confirm('Confirm Copy Removal', `Are you sure you want to delete copy with barcode: ${copy.barcode}?`, () => {
        // Clean loans/reservations matching this copy if any
        const success = db.remove('bookCopies', copy.id);
        if (success) {
            toast.show('Book copy deleted successfully.', 'success');
            loadCopiesData();
        } else {
            toast.show('Failed to delete copy.', 'error');
        }
    });
}
