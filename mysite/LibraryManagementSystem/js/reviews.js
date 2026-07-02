/**
 * REVIEWS.JS
 * Reviews and Star Ratings logic.
 */

let reviewsList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

// Selections lists caches
let members = [];
let books = [];

document.addEventListener('DOMContentLoaded', () => {
    loadReviewsData();

    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-rating').addEventListener('change', applyFilters);

    document.getElementById('add-review-btn').addEventListener('click', () => {
        openReviewModal();
    });

    document.getElementById('review-form').addEventListener('submit', handleReviewSubmit);

    document.querySelectorAll('#reviews-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Enforce Add Permission
    if (!auth.hasPermission('reviews', 'add')) {
        const btn = document.getElementById('add-review-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadReviewsData() {
    reviewsList = db.find('reviews');
    members = db.find('members');
    books = db.find('books');
    
    applyFilters();
}

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.trim().toLowerCase();
    const ratingVal = document.getElementById('filter-rating').value;

    filteredList = reviewsList.filter(rev => {
        const book = books.find(b => b.id === rev.bookId);
        const member = members.find(m => m.id === rev.memberId);

        const title = book ? book.title.toLowerCase() : '';
        const name = member ? member.name.toLowerCase() : '';
        const comment = rev.comment.toLowerCase();

        const matchesSearch = !searchVal ||
            rev.id.toLowerCase().includes(searchVal) ||
            title.includes(searchVal) ||
            name.includes(searchVal) ||
            comment.includes(searchVal);

        const matchesRating = !ratingVal || rev.rating.toString() === ratingVal;

        return matchesSearch && matchesRating;
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

    document.querySelectorAll('#reviews-table th.sortable').forEach(th => {
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
            const bookA = books.find(b => b.id === a.bookId);
            const bookB = books.find(b => b.id === b.bookId);
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
    const canDelete = auth.hasPermission('reviews', 'delete');
    const tbody = document.getElementById('reviews-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty-state">
                    <i class="fas fa-star"></i>
                    <p>No reviews found in database.</p>
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

    paginatedItems.forEach(rev => {
        const book = books.find(b => b.id === rev.bookId);
        const member = members.find(m => m.id === rev.memberId);

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<i class="${i <= rev.rating ? 'fas' : 'far'} fa-star" style="color: #fbbf24; font-size: 0.8rem;"></i>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${rev.id}</strong></td>
            <td>${book ? book.title : 'Unknown Book'}</td>
            <td>${member ? member.name : 'Unknown Member'}</td>
            <td>${starsHtml}</td>
            <td>${datetime.format(rev.reviewDate)}</td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rev.comment}">${rev.comment}</td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${canDelete ? `
                        <button class="action-btn delete-btn" data-id="${rev.id}" title="Remove Review"><i class="fas fa-trash-alt"></i></button>
                    ` : `<span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Locked</span>`}
                </div>
            </td>
        `;

        if (canDelete) row.querySelector('.delete-btn').addEventListener('click', () => handleDelete(rev.id));

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

function openReviewModal() {
    const form = document.getElementById('review-form');
    validate.clearErrors(form);
    form.reset();

    const memberSel = document.getElementById('review-member');
    const bookSel = document.getElementById('review-book');

    memberSel.innerHTML = '<option value="">Select Member</option>';
    members.filter(m => m.status === 'Active').forEach(m => {
        memberSel.innerHTML += `<option value="${m.id}">${m.name} (${m.id})</option>`;
    });

    bookSel.innerHTML = '<option value="">Select Book Title</option>';
    books.forEach(b => {
        bookSel.innerHTML += `<option value="${b.id}">${b.title}</option>`;
    });

    modal.open('review-modal');
}

function handleReviewSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    const memberId = form.memberId.value;
    const bookId = form.bookId.value;
    const ratingVal = parseInt(form.rating.value, 10);
    const commentVal = form.comment.value.trim();

    let errors = {};
    if (!validate.required(memberId)) errors.memberId = 'Member selection is required.';
    if (!validate.required(bookId)) errors.bookId = 'Book selection is required.';
    if (!validate.required(commentVal)) errors.comment = 'Comments remarks are required.';

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    // Insert Review
    db.insert('reviews', {
        memberId,
        bookId,
        rating: ratingVal,
        comment: commentVal,
        reviewDate: datetime.today()
    }, 'REV-');

    toast.show('Review submitted successfully!', 'success');
    modal.close('review-modal');
    loadReviewsData();
}

function handleDelete(id) {
    dialog.confirm('Remove Review', `Are you sure you want to remove review record: ${id}?`, () => {
        const success = db.remove('reviews', id);
        if (success) {
            toast.show('Review record deleted successfully.', 'success');
            loadReviewsData();
        } else {
            toast.show('Failed to delete review.', 'error');
        }
    });
}
