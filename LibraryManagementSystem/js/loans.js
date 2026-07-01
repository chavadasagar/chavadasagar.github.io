/**
 * LOANS.JS
 * Checkouts and Returns desk business rules engine.
 */

let loansList = [];
let filteredList = [];
let currentPage = 1;
const itemsPerPage = 5;
let sortColumn = 'id';
let sortDirection = 'asc';

// Cache datasets
let members = [];
let copies = [];
let books = [];
let fines = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCirculationDesk();

    // Table Filters Listeners
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);

    // Checkout Modal opener
    document.getElementById('issue-book-btn').addEventListener('click', () => {
        openCheckoutTerminal();
    });

    // Process Checkout Submit
    document.getElementById('issue-form').addEventListener('submit', handleCheckoutSubmit);

    // Sorting Headers
    document.querySelectorAll('#loans-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            handleSort(column);
        });
    });

    // Enforce Add Permission
    if (!auth.hasPermission('loans', 'add')) {
        const btn = document.getElementById('issue-book-btn');
        if (btn) btn.style.display = 'none';
    }
});

function loadCirculationDesk() {
    loansList = db.find('loans');
    members = db.find('members');
    copies = db.find('bookCopies');
    books = db.find('books');
    fines = db.find('fines');

    // Auto recalculate late statuses on load
    checkOverdueLoans();

    applyFilters();
}

// Scans loans to mark overdue items dynamically based on current system time
function checkOverdueLoans() {
    let updatedCount = 0;
    loansList.forEach(loan => {
        if (loan.status === 'Issued' && loan.returnDate === null) {
            const daysOverdue = datetime.diffDays(loan.dueDate, datetime.today());
            if (daysOverdue > 0) {
                loan.status = 'Overdue';
                loan.fineAmount = daysOverdue * 1.00; // $1 fine per day overdue
                db.update('loans', loan.id, { status: 'Overdue', fineAmount: loan.fineAmount });
                
                // Ensure fine record is created if not already existing
                const existingFine = fines.find(f => f.loanId === loan.id);
                if (!existingFine) {
                    db.insert('fines', {
                        loanId: loan.id,
                        memberId: loan.memberId,
                        amount: loan.fineAmount,
                        status: 'Unpaid',
                        createdDate: datetime.today()
                    }, 'FIN-');
                } else {
                    db.update('fines', existingFine.id, { amount: loan.fineAmount });
                }
                updatedCount++;
            }
        }
    });
    if (updatedCount > 0) {
        // reload cache
        loansList = db.find('loans');
        fines = db.find('fines');
    }
}

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.trim().toLowerCase();
    const statusVal = document.getElementById('filter-status').value;

    filteredList = loansList.filter(loan => {
        const copy = copies.find(c => c.id === loan.bookCopyId);
        const book = copy ? books.find(b => b.id === copy.bookId) : null;
        const member = members.find(m => m.id === loan.memberId);

        const title = book ? book.title.toLowerCase() : '';
        const name = member ? member.name.toLowerCase() : '';
        const barcode = copy ? copy.barcode.toLowerCase() : '';

        const matchesSearch = !searchVal ||
            loan.id.toLowerCase().includes(searchVal) ||
            title.includes(searchVal) ||
            name.includes(searchVal) ||
            barcode.includes(searchVal);

        const matchesStatus = !statusVal || loan.status === statusVal;

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

    document.querySelectorAll('#loans-table th.sortable').forEach(th => {
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
            const copyA = copies.find(c => c.id === a.bookCopyId);
            const copyB = copies.find(c => c.id === b.bookCopyId);
            const bookA = copyA ? books.find(b => b.id === copyA.bookId) : null;
            const bookB = copyB ? books.find(b => b.id === copyB.bookId) : null;
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
    const canEdit = auth.hasPermission('loans', 'edit');
    const tbody = document.getElementById('loans-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = filteredList.length;
    
    if (totalItems === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="table-empty-state">
                    <i class="fas fa-exchange-alt"></i>
                    <p>No circulation records found matching filters.</p>
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

    paginatedItems.forEach(loan => {
        const copy = copies.find(c => c.id === loan.bookCopyId);
        const book = copy ? books.find(b => b.id === copy.bookId) : null;
        const member = members.find(m => m.id === loan.memberId);

        let statusBadgeClass = 'badge-issued';
        if (loan.status === 'Returned') statusBadgeClass = 'badge-returned';
        if (loan.status === 'Overdue') statusBadgeClass = 'badge-overdue';

        const fineDisplay = loan.fineAmount > 0 ? `$${loan.fineAmount.toFixed(2)}` : '-';
        const returnDateDisplay = loan.returnDate ? datetime.format(loan.returnDate) : '-';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${loan.id}</strong></td>
            <td><code>${copy ? copy.barcode : 'Unknown'}</code></td>
            <td>${book ? book.title : 'Unknown Book'}</td>
            <td>${member ? member.name : 'Unknown Member'}</td>
            <td>${datetime.format(loan.issueDate)}</td>
            <td>${datetime.format(loan.dueDate)}</td>
            <td>${returnDateDisplay}</td>
            <td style="color: ${loan.status === 'Overdue' ? 'var(--danger)' : 'inherit'}; font-weight: 500;">${fineDisplay}</td>
            <td><span class="badge ${statusBadgeClass}">${loan.status}</span></td>
            <td style="text-align: center;">
                <div class="table-actions">
                    ${loan.returnDate === null ? (
                        canEdit ? `
                            <button class="btn btn-success return-btn" data-id="${loan.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;">
                                <i class="fas fa-undo"></i> Return
                            </button>
                        ` : `<span style="color: var(--text-muted); font-size: 0.8rem;">Active</span>`
                    ) : `
                        <span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Completed</span>
                    `}
                </div>
            </td>
        `;

        if (loan.returnDate === null && canEdit) {
            row.querySelector('.return-btn').addEventListener('click', () => handleReturnProcess(loan));
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
// Checkout Terminal Modal Handlers
// ----------------------------------------------------
function openCheckoutTerminal() {
    const form = document.getElementById('issue-form');
    validate.clearErrors(form);
    form.reset();

    const memberSelect = document.getElementById('issue-member');
    const copySelect = document.getElementById('issue-copy');

    // Populate members (Only Active accounts)
    memberSelect.innerHTML = '<option value="">Select Borrower</option>';
    members.filter(m => m.status === 'Active').forEach(m => {
        memberSelect.innerHTML += `<option value="${m.id}">${m.name} (${m.id} - ${m.membershipType})</option>`;
    });

    // Populate copies (Only Available ones)
    copySelect.innerHTML = '<option value="">Select Copy Barcode</option>';
    copies.filter(c => c.status === 'Available').forEach(c => {
        const book = books.find(b => b.id === c.bookId);
        const title = book ? book.title : 'Unknown';
        copySelect.innerHTML += `<option value="${c.id}">${c.barcode} - ${title}</option>`;
    });

    // Default dates
    const today = datetime.today();
    form.issueDate.value = today;
    form.dueDate.value = datetime.addDays(today, 14); // 14 days default issue duration

    modal.open('issue-modal');
}

function handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const memberId = form.memberId.value;
    const copyId = form.bookCopyId.value;
    const issueDateVal = form.issueDate.value;
    const dueDateVal = form.dueDate.value;

    let errors = {};
    if (!validate.required(memberId)) errors.memberId = 'Select a member borrower.';
    if (!validate.required(copyId)) errors.bookCopyId = 'Select copy barcode.';

    if (Object.keys(errors).length > 0) {
        validate.showErrors(form, errors);
        return;
    }

    // Business Rules validation
    const member = members.find(m => m.id === memberId);
    
    // Rule 1: Member status check
    if (member.status !== 'Active') {
        dialog.alert('Block Checkout', 'Cannot issue books. Member account is suspended.');
        return;
    }

    // Rule 2: Borrow limits check
    const activeCheckouts = loansList.filter(l => l.memberId === memberId && l.returnDate === null).length;
    if (activeCheckouts >= member.maxBooksAllowed) {
        dialog.alert('Limit Exceeded', `Cannot issue book. Member ${member.name} has reached their borrowing limit of ${member.maxBooksAllowed} checkouts.`);
        return;
    }

    // Process Issue
    const newLoan = db.insert('loans', {
        memberId,
        bookCopyId: copyId,
        issueDate: issueDateVal,
        dueDate: dueDateVal,
        returnDate: null,
        fineAmount: 0.00,
        status: 'Issued'
    }, 'LON-');

    // Update copy status
    db.update('bookCopies', copyId, { status: 'Issued' });

    toast.show('Book issued successfully!', 'success');
    modal.close('issue-modal');
    loadCirculationDesk();
}

// ----------------------------------------------------
// Return Process Flow
// ----------------------------------------------------
function handleReturnProcess(loan) {
    const copy = copies.find(c => c.id === loan.bookCopyId);
    const book = copy ? books.find(b => b.id === copy.bookId) : null;
    const member = members.find(m => m.id === loan.memberId);

    dialog.confirm('Process Return', `Confirm check-in for book: "${book ? book.title : 'Unknown'}"?`, () => {
        const returnDate = datetime.today();
        
        // Calculate late fine
        const daysLate = datetime.diffDays(loan.dueDate, returnDate);
        let fineAmount = 0.00;
        let isOverdue = false;

        if (daysLate > 0) {
            fineAmount = daysLate * 1.00; // $1 fine rate per day
            isOverdue = true;
        }

        // Update loan record
        db.update('loans', loan.id, {
            returnDate: returnDate,
            fineAmount: fineAmount,
            status: 'Returned'
        });

        // Create Fine record if overdue
        if (isOverdue) {
            db.insert('fines', {
                loanId: loan.id,
                memberId: loan.memberId,
                amount: fineAmount,
                status: 'Unpaid',
                createdDate: returnDate
            }, 'FIN-');

            dialog.alert('Fine Generated', `Book was returned ${daysLate} days late. An overdue fine of $${fineAmount.toFixed(2)} has been charged to ${member ? member.name : 'member'}'s account.`);
        } else {
            toast.show('Book checked-in successfully.', 'success');
        }

        // Reset copy status
        let targetCopyStatus = 'Available';

        // BUSINESS RULE: Reservations triggers
        // Check for holds queue matching this returned book
        const reservations = db.find('reservations');
        const pendingHolds = reservations
            .filter(r => r.bookId === copy.bookId && r.status === 'Pending')
            .sort((a, b) => new Date(a.reservationDate) - new Date(b.reservationDate)); // FIFO

        if (pendingHolds.length > 0) {
            const oldestHold = pendingHolds[0];
            const reservingMember = members.find(m => m.id === oldestHold.memberId);
            
            // Mark reservation as complete
            db.update('reservations', oldestHold.id, { status: 'Completed' });

            // Copy is now Reserved for that member
            targetCopyStatus = 'Reserved';

            dialog.alert('Hold Alert', `This copy is reserved by member: ${reservingMember ? reservingMember.name : 'Unknown'} (Hold ID: ${oldestHold.id}). Status set to Reserved.`);
        }

        db.update('bookCopies', copy.id, { status: targetCopyStatus });

        loadCirculationDesk();
    });
}
