/**
 * AUTHORS.JS
 * CRUD actions for Author Profiles.
 */

// Table Circulation States
let authorsList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Render
    loadAuthors();

    // 2. Search Listener
    document.getElementById('search-input').addEventListener('input', (e) => {
        filterAuthors(e.target.value);
    });

    // 3. Add Button Listener
    document.getElementById('add-author-btn').addEventListener('click', () => {
        openAuthorModal();
    });

    // 4. Form Submit Listener
    document.getElementById('author-form').addEventListener('submit', handleFormSubmit);

    // 5. Sorting Listeners
    document.querySelectorAll('#authors-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Enforce Add Permission
    if (!auth.hasPermission('authors', 'add')) {
        const btn = document.getElementById('add-author-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadAuthors() {
    authorsList = db.find('authors');
    filterAuthors(document.getElementById('search-input').value);
}

function filterAuthors(keyword) {
    keyword = keyword.trim().toLowerCase();
    
    if (!keyword) {
        filteredList = [...authorsList];
    } else {
        filteredList = authorsList.filter(author => 
            author.id.toLowerCase().includes(keyword) ||
            author.name.toLowerCase().includes(keyword) ||
            author.bio.toLowerCase().includes(keyword)
        );
    }

    currentPage = 1; // reset page to 1
    sortData();
}

function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    // Update th headers UI
    document.querySelectorAll('#authors-table th.sortable').forEach(th => {
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
    const canEdit = auth.hasPermission('authors', 'edit');
    const canDelete = auth.hasPermission('authors', 'delete');
    const tbody = document.getElementById('authors-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty-state">
                    <i class="fas fa-feather-alt"></i>
                    <p>No authors found matching filters.</p>
                </td>
            </tr>
        `;
        document.getElementById('pagination-info').textContent = 'Showing 0 to 0 of 0 entries';
        document.getElementById('pagination-controls').innerHTML = '';
        return;
    }

    // Pagination calculations
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
    const paginatedItems = filteredList.slice(startIdx, endIdx);

    paginatedItems.forEach(author => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${author.id}</strong></td>
            <td>${author.name}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${author.bio}</td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${canEdit ? `
                        <button class="action-btn edit-btn" data-id="${author.id}" title="Edit Author"><i class="fas fa-edit"></i></button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="action-btn delete-btn" data-id="${author.id}" title="Delete Author"><i class="fas fa-trash-alt"></i></button>
                    ` : ''}
                    ${!canEdit && !canDelete ? '<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Locked</span>' : ''}
                </div>
            </td>
        `;

        // Bind Actions
        if (canEdit) row.querySelector('.edit-btn').addEventListener('click', () => openAuthorModal(author));
        if (canDelete) row.querySelector('.delete-btn').addEventListener('click', () => handleDelete(author.id));

        tbody.appendChild(row);
    });

    // Update Pagination UI details
    document.getElementById('pagination-info').textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalItems} entries`;
    renderPaginationControls(totalItems);
}

function renderPaginationControls(totalItems) {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => {
        currentPage--;
        renderTable();
    });
    container.appendChild(prevBtn);

    // Number Buttons
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

    // Next Button
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

// Open Form Modal (Resets on Null, Populates on Object)
function openAuthorModal(author = null) {
    const form = document.getElementById('author-form');
    validate.clearErrors(form);
    
    if (author) {
        document.getElementById('modal-title-text').textContent = 'Edit Author';
        document.getElementById('author-id-field').value = author.id;
        form.name.value = author.name;
        form.bio.value = author.bio;
        document.getElementById('save-author-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Add New Author';
        document.getElementById('author-id-field').value = '';
        form.reset();
        document.getElementById('save-author-btn').textContent = 'Save Author';
    }
    
    modal.open('author-modal');
}

// Create/Update Form Handler
function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const authorId = document.getElementById('author-id-field').value;
    const nameVal = form.name.value.trim();
    const bioVal = form.bio.value.trim();

    // Validation
    let errors = {};
    if (!validate.required(nameVal)) {
        errors.name = 'Author name is required.';
    }
    if (!validate.required(bioVal)) {
        errors.bio = 'Biography details are required.';
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    if (authorId) {
        // Edit Mode
        const updated = db.update('authors', authorId, { name: nameVal, bio: bioVal });
        if (updated) {
            toast.show('Author profile updated successfully!', 'success');
        } else {
            toast.show('Error updating author.', 'error');
        }
    } else {
        // Create Mode
        db.insert('authors', { name: nameVal, bio: bioVal }, 'AUT-');
        toast.show('New author profile added!', 'success');
    }

    modal.close('author-modal');
    loadAuthors();
}

// Delete Profile Handler
function handleDelete(id) {
    // Business validation: Check if author has active books
    const books = db.find('books', b => b.authorId === id);
    if (books.length > 0) {
        dialog.alert('Dependency Warning', `Cannot delete author. There are ${books.length} book records associated with this author.`);
        return;
    }

    dialog.confirm('Confirm Deletion', `Are you sure you want to delete author profile: ${id}? This action is irreversible.`, () => {
        const success = db.remove('authors', id);
        if (success) {
            toast.show('Author profile deleted successfully.', 'success');
            loadAuthors();
        } else {
            toast.show('Failed to delete author.', 'error');
        }
    });
}
