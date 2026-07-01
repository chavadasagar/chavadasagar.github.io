/**
 * RESERVATIONS.JS
 * Holds and Queue queue management rules.
 */

let holdsList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

// Selections lists caches
let members = [];
let books = [];
let copies = [];

document.addEventListener('DOMContentLoaded', () => {
    loadHoldsQueue();

    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);

    document.getElementById('add-hold-btn').addEventListener('click', () => {
        openHoldsModal();
    });

    document.getElementById('hold-form').addEventListener('submit', handleHoldSubmit);

    document.querySelectorAll('#holds-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Enforce Add Permission
    if (!auth.hasPermission('reservations', 'add')) {
        const btn = document.getElementById('add-hold-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadHoldsQueue() {
    holdsList = db.find('reservations');
    members = db.find('members');
    books = db.find('books');
    copies = db.find('bookCopies');
    
    applyFilters();
}

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.trim().toLowerCase();
    const statusVal = document.getElementById('filter-status').value;

    filteredList = holdsList.filter(hold => {
        const book = books.find(b => b.id === hold.bookId);
        const member = members.find(m => m.id === hold.memberId);

        const title = book ? book.title.toLowerCase() : '';
        const name = member ? member.name.toLowerCase() : '';

        const matchesSearch = !searchVal ||
            hold.id.toLowerCase().includes(searchVal) ||
            title.includes(searchVal) ||
            name.includes(searchVal);

        const matchesStatus = !statusVal || hold.status === statusVal;

        return matchesSearch && matchesStatus;
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

    document.querySelectorAll('#holds-table th.sortable').forEach(th => {
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
    const canEdit = auth.hasPermission('reservations', 'edit');
    const tbody = document.getElementById('holds-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty-state">
                    <i class="fas fa-bookmark"></i>
                    <p>No reservation holds found in history.</p>
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

    paginatedItems.forEach(hold => {
        const book = books.find(b => b.id === hold.bookId);
        const member = members.find(m => m.id === hold.memberId);

        let statusBadgeClass = 'badge-pending';
        if (hold.status === 'Completed') statusBadgeClass = 'badge-available';
        if (hold.status === 'Cancelled') statusBadgeClass = 'badge-overdue';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${hold.id}</strong></td>
            <td>${book ? book.title : 'Unknown Book'}</td>
            <td>${member ? member.name : 'Unknown Member'}</td>
            <td>${datetime.format(hold.reservationDate)}</td>
            <td><span class="badge ${statusBadgeClass}">${hold.status}</span></td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${hold.status === 'Pending' ? (
                        canEdit ? `
                            <button class="btn btn-danger cancel-btn" data-id="${hold.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;">
                                <i class="fas fa-times-circle"></i> Cancel
                            </button>
                        ` : `<span style="color: var(--text-muted); font-size: 0.8rem;">Active</span>`
                    ) : `
                        <span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Settled</span>
                    `}
                </div>
            </td>
        `;

        if (hold.status === 'Pending' && canEdit) {
            row.querySelector('.cancel-btn').addEventListener('click', () => handleCancelHold(hold));
        }

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
// Add Hold Handlers
// ----------------------------------------------------
function openHoldsModal() {
    const form = document.getElementById('hold-form');
    validate.clearErrors(form);
    form.reset();

    const memberSel = document.getElementById('hold-member');
    const bookSel = document.getElementById('hold-book');

    memberSel.innerHTML = '<option value="">Select Borrower</option>';
    members.filter(m => m.status === 'Active').forEach(m => {
        memberSel.innerHTML += `<option value="${m.id}">${m.name} (${m.id})</option>`;
    });

    bookSel.innerHTML = '<option value="">Select Book Title</option>';
    books.forEach(b => {
        bookSel.innerHTML += `<option value="${b.id}">${b.title} (ISBN: ${b.isbn})</option>`;
    });

    modal.open('hold-modal');
}

function handleHoldSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    const memberId = form.memberId.value;
    const bookId = form.bookId.value;

    let errors = {};
    if (!validate.required(memberId)) errors.memberId = 'Member is required.';
    if (!validate.required(bookId)) errors.bookId = 'Book selection is required.';

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    // Rule 1: Suspended borrower block
    const member = members.find(m => m.id === memberId);
    if (member.status !== 'Active') {
        dialog.alert('Suspended Member', 'Cannot place holds for suspended member accounts.');
        return;
    }

    // Rule 2: Duplicate check
    const holdExists = holdsList.some(r => r.memberId === memberId && r.bookId === bookId && r.status === 'Pending');
    if (holdExists) {
        dialog.alert('Active Hold Exists', 'This member already has a pending reservation hold placed on this book.');
        return;
    }

    // Create Hold
    db.insert('reservations', {
        memberId,
        bookId,
        reservationDate: datetime.today(),
        status: 'Pending'
    }, 'RES-');

    // Notify of hold
    // Check if copies of this book are available immediately. If copies are available, notify operator!
    const bookCopies = copies.filter(c => c.bookId === bookId);
    const availableCopies = bookCopies.filter(c => c.status === 'Available');

    if (availableCopies.length > 0) {
        // If there's an available copy, auto-assign this hold to Completed and copy to Reserved!
        const targetCopy = availableCopies[0];
        const reservationsList = db.find('reservations');
        const latestHold = reservationsList.find(r => r.memberId === memberId && r.bookId === bookId && r.status === 'Pending');
        
        db.update('reservations', latestHold.id, { status: 'Completed' });
        db.update('bookCopies', targetCopy.id, { status: 'Reserved' });

        dialog.alert('Hold Completed', `A copy of this book (Barcode: ${targetCopy.barcode}) is available at ${targetCopy.shelfLocation}. The copy status has been updated to Reserved.`);
    } else {
        toast.show('Book hold placed successfully in queue.', 'success');
    }

    modal.close('hold-modal');
    loadHoldsQueue();
}

// ----------------------------------------------------
// Cancel Hold
// ----------------------------------------------------
function handleCancelHold(hold) {
    dialog.confirm('Cancel Reservation Hold', `Are you sure you want to cancel reservation hold: ${hold.id}?`, () => {
        db.update('reservations', hold.id, { status: 'Cancelled' });
        toast.show('Reservation hold cancelled successfully.', 'success');

        // BUSINESS RULE: If copy was reserved for this hold, release and assign to the NEXT hold in queue
        // First find if there's a copy marked 'Reserved' that was linked to this book
        const bookCopiesList = copies.filter(c => c.bookId === hold.bookId && c.status === 'Reserved');
        
        if (bookCopiesList.length > 0) {
            const targetCopy = bookCopiesList[0];
            
            // Check if there are other pending holds for this book
            const pendingHolds = holdsList
                .filter(r => r.bookId === hold.bookId && r.status === 'Pending' && r.id !== hold.id)
                .sort((a,b) => new Date(a.reservationDate) - new Date(b.reservationDate));

            if (pendingHolds.length > 0) {
                const nextHold = pendingHolds[0];
                const nextMember = members.find(m => m.id === nextHold.memberId);
                
                db.update('reservations', nextHold.id, { status: 'Completed' });
                // Copy remains Reserved, but now owned by the next hold
                dialog.alert('Hold Reassigned', `Cancelled hold was linking copy barcode: ${targetCopy.barcode}. It has been reassigned to next borrower in queue: ${nextMember ? nextMember.name : 'Unknown'}.`);
            } else {
                // No more holds, release copy
                db.update('bookCopies', targetCopy.id, { status: 'Available' });
                toast.show(`Copy barcode: ${targetCopy.barcode} has been set to Available.`, 'info');
            }
        }

        loadHoldsQueue();
    });
}
