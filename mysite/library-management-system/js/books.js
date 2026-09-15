/**
 * BOOKS.JS
 * Book Catalog CRUD and Details compilation.
 */

let booksList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 6;

// Dropdowns data cache
let authors = [];
let categories = [];
let publishers = [];
let copies = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load and Dropdowns Setup
    loadCatalogData();
    initializeSelectors();

    // 2. Filter Listeners
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-category').addEventListener('change', applyFilters);
    document.getElementById('filter-author').addEventListener('change', applyFilters);
    document.getElementById('filter-availability').addEventListener('change', applyFilters);

    // 3. Add Button Listener
    document.getElementById('add-book-btn').addEventListener('click', () => {
        openBookFormModal();
    });

    // 4. Form Submit Listener
    document.getElementById('book-form').addEventListener('submit', handleFormSubmit);

    // 5. Uploader Drag-and-Drop / File Listeners
    setupImageUploader();

    // Enforce Add Permission
    if (!auth.hasPermission('books', 'add')) {
        const btn = document.getElementById('add-book-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadCatalogData() {
    booksList = db.find('books');
    authors = db.find('authors');
    categories = db.find('categories');
    publishers = db.find('publishers');
    copies = db.find('bookCopies');
    
    applyFilters();
}

function initializeSelectors() {
    const filterCat = document.getElementById('filter-category');
    const filterAut = document.getElementById('filter-author');
    
    const formAut = document.getElementById('book-author');
    const formCat = document.getElementById('book-category');
    const formPub = document.getElementById('book-publisher');

    // Clear and populate Category selectors
    filterCat.innerHTML = '<option value="">All Categories</option>';
    formCat.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(c => {
        filterCat.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        formCat.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    // Clear and populate Author selectors
    filterAut.innerHTML = '<option value="">All Authors</option>';
    formAut.innerHTML = '<option value="">Select Author</option>';
    authors.forEach(a => {
        filterAut.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        formAut.innerHTML += `<option value="${a.id}">${a.name}</option>`;
    });

    // Populate Publisher form selector
    formPub.innerHTML = '<option value="">Select Publisher</option>';
    publishers.forEach(p => {
        formPub.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
}

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.trim().toLowerCase();
    const catVal = document.getElementById('filter-category').value;
    const autVal = document.getElementById('filter-author').value;
    const availVal = document.getElementById('filter-availability').value;

    filteredList = booksList.filter(book => {
        // Search matches
        const authorObj = authors.find(a => a.id === book.authorId);
        const authorName = authorObj ? authorObj.name.toLowerCase() : '';
        const matchesSearch = !searchVal || 
            book.title.toLowerCase().includes(searchVal) ||
            authorName.includes(searchVal) ||
            book.isbn.toLowerCase().includes(searchVal);

        // Category matches
        const matchesCat = !catVal || book.categoryId === catVal;

        // Author matches
        const matchesAut = !autVal || book.authorId === autVal;

        // Availability matches
        let matchesAvail = true;
        const bookCopies = copies.filter(c => c.bookId === book.id);
        const availCopiesCount = bookCopies.filter(c => c.status === 'Available').length;
        
        if (availVal === 'available') {
            matchesAvail = availCopiesCount > 0;
        } else if (availVal === 'unavailable') {
            matchesAvail = bookCopies.length > 0 && availCopiesCount === 0;
        }

        return matchesSearch && matchesCat && matchesAut && matchesAvail;
    });

    currentPage = 1;
    renderCatalog();
}

function renderCatalog() {
    const canEdit = auth.hasPermission('books', 'edit');
    const canDelete = auth.hasPermission('books', 'delete');
    const grid = document.getElementById('catalog-grid-container');
    if (!grid) return;
    grid.innerHTML = '';

    const totalItems = filteredList.length;

    if (totalItems === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
                <i class="fas fa-book" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem; display: block;"></i>
                <p style="font-weight: 500;">No books matched your criteria.</p>
            </div>
        `;
        document.getElementById('pagination-info').textContent = 'Showing 0 to 0 of 0 entries';
        document.getElementById('pagination-controls').innerHTML = '';
        return;
    }

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
    const paginatedItems = filteredList.slice(startIdx, endIdx);

    paginatedItems.forEach(book => {
        const authorObj = authors.find(a => a.id === book.authorId);
        const authorName = authorObj ? authorObj.name : 'Unknown Author';
        
        const bookCopies = copies.filter(c => c.bookId === book.id);
        const totalCopiesCount = bookCopies.length;
        const availCopiesCount = bookCopies.filter(c => c.status === 'Available').length;

        const card = document.createElement('div');
        card.className = 'card book-card';

        // Cover Setup
        let coverImgHtml = `<div class="book-cover-fallback">${book.title}</div>`;
        if (book.coverImage) {
            coverImgHtml = `<img src="${book.coverImage}" alt="${book.title} Cover">`;
        }

        card.innerHTML = `
            <div class="book-card-cover">
                ${coverImgHtml}
            </div>
            <div class="book-card-details">
                <div>
                    <h4 class="book-card-title" title="${book.title}">${book.title}</h4>
                    <p class="book-card-author">${authorName}</p>
                    <div class="book-card-meta">
                        <span>ISBN: ${book.isbn}</span>
                        <span>Published: ${book.publishYear}</span>
                    </div>
                </div>
                <div class="book-card-badges">
                    <span class="badge ${availCopiesCount > 0 ? 'badge-available' : 'badge-overdue'}" style="font-size: 0.65rem;">
                        ${availCopiesCount} / ${totalCopiesCount} Avail
                    </span>
                </div>
                <div class="book-card-actions">
                    <button class="action-btn view-btn" data-id="${book.id}" title="View Details"><i class="fas fa-eye"></i></button>
                    ${canEdit ? `<button class="action-btn edit-btn" data-id="${book.id}" title="Edit Book"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDelete ? `<button class="action-btn delete-btn" data-id="${book.id}" title="Delete Book"><i class="fas fa-trash-alt"></i></button>` : ''}
                </div>
            </div>
        `;

        // Bind Actions
        card.querySelector('.view-btn').addEventListener('click', () => openBookDetailModal(book));
        if (canEdit) card.querySelector('.edit-btn').addEventListener('click', () => openBookFormModal(book));
        if (canDelete) card.querySelector('.delete-btn').addEventListener('click', () => handleDelete(book.id));

        grid.appendChild(card);
    });

    document.getElementById('pagination-info').textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalItems} books`;
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
        renderCatalog();
    });
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
        btn.textContent = i.toString();
        btn.addEventListener('click', () => {
            currentPage = i;
            renderCatalog();
        });
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => {
        currentPage++;
        renderCatalog();
    });
    container.appendChild(nextBtn);
}

// ----------------------------------------------------
// Image Base64 Uploader Logic
// ----------------------------------------------------
function setupImageUploader() {
    const dropZone = document.getElementById('cover-drop-zone');
    const fileInput = document.getElementById('cover-file-input');
    const previewContainer = document.getElementById('cover-preview-container');
    const previewImg = document.getElementById('cover-preview-img');
    const removeBtn = document.getElementById('cover-preview-remove');
    const base64Input = document.getElementById('book-cover-base64');

    const handleFiles = (files) => {
        if (files.length === 0) return;
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            toast.show('Please upload an image file only.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            base64Input.value = base64;
            previewImg.src = base64;
            dropZone.style.display = 'none';
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    };

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    removeBtn.addEventListener('click', () => {
        base64Input.value = '';
        previewImg.src = '';
        previewContainer.style.display = 'none';
        dropZone.style.display = 'flex';
        fileInput.value = '';
    });
}

function resetUploader() {
    document.getElementById('book-cover-base64').value = '';
    document.getElementById('cover-preview-img').src = '';
    document.getElementById('cover-preview-container').style.display = 'none';
    document.getElementById('cover-drop-zone').style.display = 'flex';
    document.getElementById('cover-file-input').value = '';
}

// ----------------------------------------------------
// Add/Edit Book Form Modal
// ----------------------------------------------------
function openBookFormModal(book = null) {
    const form = document.getElementById('book-form');
    validate.clearErrors(form);
    resetUploader();

    if (book) {
        document.getElementById('modal-title-text').textContent = 'Edit Book Catalog';
        document.getElementById('book-id-field').value = book.id;
        form.title.value = book.title;
        form.isbn.value = book.isbn;
        form.authorId.value = book.authorId;
        form.categoryId.value = book.categoryId;
        form.publisherId.value = book.publisherId;
        form.publishYear.value = book.publishYear;
        form.description.value = book.description || '';

        // If cover exists, show preview
        if (book.coverImage) {
            document.getElementById('book-cover-base64').value = book.coverImage;
            document.getElementById('cover-preview-img').src = book.coverImage;
            document.getElementById('cover-drop-zone').style.display = 'none';
            document.getElementById('cover-preview-container').style.display = 'block';
        }
        document.getElementById('save-book-btn').textContent = 'Save Changes';
    } else {
        document.getElementById('modal-title-text').textContent = 'Add New Book Title';
        document.getElementById('book-id-field').value = '';
        form.reset();
        document.getElementById('save-book-btn').textContent = 'Save Book';
    }

    modal.open('book-modal');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const bookId = document.getElementById('book-id-field').value;

    const titleVal = form.title.value.trim();
    const isbnVal = form.isbn.value.trim();
    const authorVal = form.authorId.value;
    const categoryVal = form.categoryId.value;
    const publisherVal = form.publisherId.value;
    const yearVal = parseInt(form.publishYear.value, 10);
    const descVal = form.description.value.trim();
    const coverVal = document.getElementById('book-cover-base64').value;

    let errors = {};
    if (!validate.required(titleVal)) errors.title = 'Book title is required.';
    if (!validate.required(isbnVal)) {
        errors.isbn = 'ISBN code is required.';
    } else if (!validate.isbn(isbnVal)) {
        errors.isbn = 'ISBN must be 10 or 13 digits.';
    }
    if (!validate.required(authorVal)) errors.authorId = 'Author selection is required.';
    if (!validate.required(categoryVal)) errors.categoryId = 'Category selection is required.';
    if (!validate.required(publisherVal)) errors.publisherId = 'Publisher selection is required.';
    if (isNaN(yearVal) || yearVal < 1000 || yearVal > 2100) {
        errors.publishYear = 'Enter a valid year (1000 - 2100).';
    }

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    const bookData = {
        title: titleVal,
        authorId: authorVal,
        categoryId: categoryVal,
        publisherId: publisherVal,
        isbn: isbnVal,
        publishYear: yearVal,
        description: descVal,
        coverImage: coverVal
    };

    if (bookId) {
        const updated = db.update('books', bookId, bookData);
        if (updated) {
            toast.show('Book catalog updated successfully!', 'success');
        } else {
            toast.show('Failed to update book details.', 'error');
        }
    } else {
        db.insert('books', bookData, 'BOK-');
        toast.show('New book title added to catalog!', 'success');
    }

    modal.close('book-modal');
    loadCatalogData();
}

// Delete Book Handler
function handleDelete(id) {
    // Check if copies of this book exist
    const bookCopies = copies.filter(c => c.bookId === id);
    if (bookCopies.length > 0) {
        dialog.alert('Catalog Dependency', `Cannot delete catalog record. There are ${bookCopies.length} physical copies linked to this book. Delete copies first.`);
        return;
    }

    dialog.confirm('Confirm Catalog Removal', 'Are you sure you want to remove this book title? This removes metadata and reviews.', () => {
        // Also remove reviews & reservations of this book
        const bookReviews = db.find('reviews', r => r.bookId === id);
        const bookHolds = db.find('reservations', r => r.bookId === id);
        
        bookReviews.forEach(r => db.remove('reviews', r.id));
        bookHolds.forEach(h => db.remove('reservations', h.id));

        const success = db.remove('books', id);
        if (success) {
            toast.show('Book title and metadata removed.', 'success');
            loadCatalogData();
        } else {
            toast.show('Failed to delete book.', 'error');
        }
    });
}

// ----------------------------------------------------
// Book Details Overlay Modal
// ----------------------------------------------------
function openBookDetailModal(book) {
    const authorObj = authors.find(a => a.id === book.authorId);
    const catObj = categories.find(c => c.id === book.categoryId);
    const pubObj = publishers.find(p => p.id === book.publisherId);
    const bookCopiesList = copies.filter(c => c.bookId === book.id);
    const reviewsList = db.find('reviews', r => r.bookId === book.id);
    const membersList = db.find('members');

    // Fill fields
    document.getElementById('detail-modal-title').textContent = `${book.title} Info`;
    document.getElementById('detail-title').textContent = book.title;
    document.getElementById('detail-author').textContent = `by ${authorObj ? authorObj.name : 'Unknown Author'}`;
    document.getElementById('detail-desc').textContent = book.description || 'No description summary logged.';
    document.getElementById('detail-category').textContent = catObj ? catObj.name : 'Unknown';
    document.getElementById('detail-publisher').textContent = pubObj ? pubObj.name : 'Unknown';
    document.getElementById('detail-isbn').textContent = book.isbn;
    document.getElementById('detail-year').textContent = book.publishYear;

    // Cover Panel
    const coverPanel = document.getElementById('detail-cover-panel');
    if (book.coverImage) {
        coverPanel.innerHTML = `<img src="${book.coverImage}" alt="${book.title} Cover">`;
    } else {
        coverPanel.innerHTML = `<div class="book-cover-fallback" style="height: 100%; display: flex; align-items: center; justify-content: center;">${book.title}</div>`;
    }

    // Copies Table
    const copiesTbody = document.getElementById('detail-copies-tbody');
    copiesTbody.innerHTML = '';
    if (bookCopiesList.length === 0) {
        copiesTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No physical copies registered.</td></tr>`;
    } else {
        const branchesList = db.find('branches');
        bookCopiesList.forEach(copy => {
            const branch = branchesList.find(b => b.id === copy.branchId);
            const branchName = branch ? branch.name : 'Unknown Branch';
            
            let statusClass = 'badge-available';
            if (copy.status === 'Issued') statusClass = 'badge-issued';
            if (copy.status === 'Reserved') statusClass = 'badge-reserved';
            if (copy.status === 'Maintenance') statusClass = 'badge-suspended';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${copy.barcode}</code></td>
                <td>${branchName}</td>
                <td>${copy.shelfLocation}</td>
                <td><span class="badge ${statusClass}">${copy.status}</span></td>
            `;
            copiesTbody.appendChild(row);
        });
    }

    // Reviews Section
    const reviewsCont = document.getElementById('detail-reviews-container');
    reviewsCont.innerHTML = '';
    if (reviewsList.length === 0) {
        reviewsCont.innerHTML = `<p style="color: var(--text-muted); font-size: 0.875rem; font-style: italic;">No reviews logged for this book.</p>`;
    } else {
        reviewsList.forEach(rev => {
            const member = membersList.find(m => m.id === rev.memberId);
            const memberName = member ? member.name : 'Anonymous Member';
            
            // Build stars
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += `<i class="${i <= rev.rating ? 'fas' : 'far'} fa-star"></i>`;
            }

            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `
                <div class="review-header">
                    <strong>${memberName}</strong>
                    <div class="stars-container">${starsHtml}</div>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${rev.comment}</div>
            `;
            reviewsCont.appendChild(item);
        });
    }

    modal.open('book-detail-modal');
}
