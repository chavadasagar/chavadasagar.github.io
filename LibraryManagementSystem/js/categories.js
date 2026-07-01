/**
 * CATEGORIES.JS
 * CRUD actions for Book Categories.
 */

let categoriesList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();

    document.getElementById('search-input').addEventListener('input', (e) => {
        filterCategories(e.target.value);
    });

    document.getElementById('add-category-btn').addEventListener('click', () => {
        openCategoryModal();
    });

    document.getElementById('category-form').addEventListener('submit', handleFormSubmit);

    document.querySelectorAll('#categories-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Enforce Add Permission
    if (!auth.hasPermission('categories', 'add')) {
        const btn = document.getElementById('add-category-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadCategories() {
    categoriesList = db.find('categories');
    filterCategories(document.getElementById('search-input').value);
}

function filterCategories(keyword) {
    keyword = keyword.trim().toLowerCase();
    
    if (!keyword) {
        filteredList = [...categoriesList];
    } else {
        filteredList = categoriesList.filter(cat => 
            cat.id.toLowerCase().includes(keyword) ||
            cat.name.toLowerCase().includes(keyword) ||
            cat.description.toLowerCase().includes(keyword)
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

    document.querySelectorAll('#categories-table th.sortable').forEach(th => {
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
    const canEdit = auth.hasPermission('categories', 'edit');
    const canDelete = auth.hasPermission('categories', 'delete');
    const tbody = document.getElementById('categories-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty-state">
                    <i class="fas fa-tags"></i>
                    <p>No categories found matching filters.</p>
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

    paginatedItems.forEach(cat => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${cat.id}</strong></td>
            <td>${cat.name}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cat.description}</td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${canEdit ? `
                        <button class="action-btn edit-btn" data-id="${cat.id}" title="Edit Category"><i class="fas fa-edit"></i></button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="action-btn delete-btn" data-id="${cat.id}" title="Delete Category"><i class="fas fa-trash-alt"></i></button>
                    ` : ''}
                    ${!canEdit && !canDelete ? '<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Locked</span>' : ''}
                </div>
            </td>
        `;

        if (canEdit) row.querySelector('.edit-btn').addEventListener('click', () => openCategoryModal(cat));
        if (canDelete) row.querySelector('.delete-btn').addEventListener('click', () => handleDelete(cat.id));

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

function openCategoryModal(cat = null) {
    const form = document.getElementById('category-form');
    validate.clearErrors(form);
    
    if (cat) {
        document.getElementById('modal-title-text').textContent = 'Edit Category';
        document.getElementById('category-id-field').value = cat.id;
        form.name.value = cat.name;
        form.description.value = cat.description;
        document.getElementById('save-category-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Add New Category';
        document.getElementById('category-id-field').value = '';
        form.reset();
        document.getElementById('save-category-btn').textContent = 'Save Category';
    }
    
    modal.open('category-modal');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const catId = document.getElementById('category-id-field').value;
    const nameVal = form.name.value.trim();
    const descVal = form.description.value.trim();

    let errors = {};
    if (!validate.required(nameVal)) {
        errors.name = 'Category name is required.';
    }
    if (!validate.required(descVal)) {
        errors.description = 'Description is required.';
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    if (catId) {
        const updated = db.update('categories', catId, { name: nameVal, description: descVal });
        if (updated) {
            toast.show('Category details updated successfully!', 'success');
        } else {
            toast.show('Failed to update category.', 'error');
        }
    } else {
        db.insert('categories', { name: nameVal, description: descVal }, 'CAT-');
        toast.show('New category created successfully!', 'success');
    }

    modal.close('category-modal');
    loadCategories();
}

function handleDelete(id) {
    // Check if any books use this category
    const books = db.find('books', b => b.categoryId === id);
    if (books.length > 0) {
        dialog.alert('Deletion Guarded', `Cannot delete category. There are ${books.length} books categorised under this ID.`);
        return;
    }

    dialog.confirm('Confirm Deletion', `Are you sure you want to delete category: ${id}?`, () => {
        const success = db.remove('categories', id);
        if (success) {
            toast.show('Category deleted successfully.', 'success');
            loadCategories();
        } else {
            toast.show('Failed to delete category.', 'error');
        }
    });
}
