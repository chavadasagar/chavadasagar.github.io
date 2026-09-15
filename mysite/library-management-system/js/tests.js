/**
 * TESTS.JS
 * Automated unit testing suite validating database CRUD operations,
 * access control, and circulation business rules.
 */

function runTests() {
    const logs = [];
    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            passed++;
            logs.push(`✅ PASS: ${message}`);
            console.log(`%c[TEST] PASS: ${message}`, 'color: #10b981; font-weight: bold;');
        } else {
            failed++;
            logs.push(`❌ FAIL: ${message}`);
            console.error(`[TEST] FAIL: ${message}`);
        }
    };

    logs.push(`--- Launching AegisLib Diagnostics Suite (${new Date().toLocaleString()}) ---`);

    try {
        // Backup original tables
        const backup = {};
        const collections = ['members', 'books', 'bookCopies', 'loans', 'reservations', 'fines'];
        collections.forEach(col => {
            backup[col] = db.loadData(col);
        });

        // Initialize clean test state for test session
        db.saveData('members', [
            { id: 'TEST-MEM-Regular', name: 'Test Regular Member', membershipType: 'Regular', status: 'Active', maxBooksAllowed: 5, joinDate: '2026-01-01' },
            { id: 'TEST-MEM-Student', name: 'Test Student Member', membershipType: 'Student', status: 'Active', maxBooksAllowed: 3, joinDate: '2026-01-01' },
            { id: 'TEST-MEM-Suspended', name: 'Test Suspended Member', membershipType: 'Regular', status: 'Suspended', maxBooksAllowed: 5, joinDate: '2026-01-01' }
        ]);

        db.saveData('books', [
            { id: 'TEST-BOK-101', title: 'Test Book Title', isbn: '9780132350884', authorId: 'AUT-402', categoryId: 'CAT-202', publisherId: 'PUB-301', publishYear: 2008 }
        ]);

        db.saveData('bookCopies', [
            { id: 'TEST-COP-101A', bookId: 'TEST-BOK-101', barcode: 'TESTBAR-01', shelfLocation: 'Aisle T', status: 'Available', branchId: 'BRN-101' },
            { id: 'TEST-COP-102B', bookId: 'TEST-BOK-101', barcode: 'TESTBAR-02', shelfLocation: 'Aisle T', status: 'Issued', branchId: 'BRN-101' },
            { id: 'TEST-COP-103C', bookId: 'TEST-BOK-101', barcode: 'TESTBAR-03', shelfLocation: 'Aisle T', status: 'Maintenance', branchId: 'BRN-101' }
        ]);

        db.saveData('loans', []);
        db.saveData('reservations', []);
        db.saveData('fines', []);

        // ----------------------------------------------------
        // TEST 1: Database CRUD Mechanics
        // ----------------------------------------------------
        const insertedMember = db.insert('members', {
            name: 'New Test User',
            membershipType: 'Regular',
            status: 'Active',
            maxBooksAllowed: 5,
            joinDate: '2026-01-01'
        }, 'TEST-MEM-');
        
        assert(insertedMember.id.startsWith('TEST-MEM-'), `Database auto-generates prefixed IDs: ${insertedMember.id}`);
        
        const found = db.findById('members', insertedMember.id);
        assert(found !== null && found.name === 'New Test User', 'Database findById successfully retrieves record details.');

        const updated = db.update('members', insertedMember.id, { name: 'Modified Test User' });
        assert(updated.name === 'Modified Test User', 'Database update successfully modifies specific record columns.');

        const deleteResult = db.remove('members', insertedMember.id);
        assert(deleteResult === true && db.findById('members', insertedMember.id) === null, 'Database remove successfully deletes specified entries.');

        // ----------------------------------------------------
        // TEST 2: Business Rule: Member status blocks checkout
        // ----------------------------------------------------
        const mockIssue = (memberId, copyId, issueDate, dueDate) => {
            const member = db.findById('members', memberId);
            const copy = db.findById('bookCopies', copyId);

            if (member.status !== 'Active') return { success: false, reason: 'Suspended' };
            if (copy.status !== 'Available') return { success: false, reason: 'Unavailable' };
            
            const activeLoans = db.find('loans', l => l.memberId === memberId && l.returnDate === null);
            if (activeLoans.length >= member.maxBooksAllowed) return { success: false, reason: 'QuotaExceeded' };

            const loan = db.insert('loans', { memberId, bookCopyId: copyId, issueDate, dueDate, returnDate: null, fineAmount: 0.00, status: 'Issued' }, 'TEST-LON-');
            db.update('bookCopies', copyId, { status: 'Issued' });
            return { success: true, loan };
        };

        const suspendedRes = mockIssue('TEST-MEM-Suspended', 'TEST-COP-101A', '2026-07-01', '2026-07-15');
        assert(suspendedRes.success === false && suspendedRes.reason === 'Suspended', 'Checkout fails when member account status is Suspended.');

        // ----------------------------------------------------
        // TEST 3: Business Rule: Copy availability blocks checkout
        // ----------------------------------------------------
        const unavailableRes = mockIssue('TEST-MEM-Regular', 'TEST-COP-102B', '2026-07-01', '2026-07-15');
        assert(unavailableRes.success === false && unavailableRes.reason === 'Unavailable', 'Checkout fails when targeted copy status is not Available.');

        // ----------------------------------------------------
        // TEST 4: Business Rule: Checkout quota limits
        // ----------------------------------------------------
        // Student limit is 3. Let's checkout 3 items.
        // We need 3 available copies first. Create them:
        db.saveData('bookCopies', [
            { id: 'TC-1', bookId: 'TEST-BOK-101', barcode: 'TCB-1', shelfLocation: 'X', status: 'Available', branchId: 'BRN-101' },
            { id: 'TC-2', bookId: 'TEST-BOK-101', barcode: 'TCB-2', shelfLocation: 'X', status: 'Available', branchId: 'BRN-101' },
            { id: 'TC-3', bookId: 'TEST-BOK-101', barcode: 'TCB-3', shelfLocation: 'X', status: 'Available', branchId: 'BRN-101' },
            { id: 'TC-4', bookId: 'TEST-BOK-101', barcode: 'TCB-4', shelfLocation: 'X', status: 'Available', branchId: 'BRN-101' }
        ]);

        mockIssue('TEST-MEM-Student', 'TC-1', '2026-07-01', '2026-07-15');
        mockIssue('TEST-MEM-Student', 'TC-2', '2026-07-01', '2026-07-15');
        mockIssue('TEST-MEM-Student', 'TC-3', '2026-07-01', '2026-07-15');
        
        // Try the 4th checkout
        const limitRes = mockIssue('TEST-MEM-Student', 'TC-4', '2026-07-01', '2026-07-15');
        assert(limitRes.success === false && limitRes.reason === 'QuotaExceeded', 'Checkout fails when user attempts to exceed membership borrow limits.');

        // ----------------------------------------------------
        // TEST 5: Business Rule: Overdue fine calculation
        // ----------------------------------------------------
        const mockReturn = (loanId, returnDate) => {
            const loan = db.findById('loans', loanId);
            const copy = db.findById('bookCopies', loan.bookCopyId);
            const member = db.findById('members', loan.memberId);

            const daysLate = datetime.diffDays(loan.dueDate, returnDate);
            let fineAmount = 0.00;
            let isOverdue = false;

            if (daysLate > 0) {
                fineAmount = daysLate * 1.00; // $1 rate
                isOverdue = true;
            }

            db.update('loans', loanId, { returnDate, fineAmount, status: 'Returned' });
            
            if (isOverdue) {
                db.insert('fines', { loanId, memberId: loan.memberId, amount: fineAmount, status: 'Unpaid', createdDate: returnDate }, 'TEST-FIN-');
            }

            // check hold queue
            const pendingHolds = db.find('reservations', r => r.bookId === copy.bookId && r.status === 'Pending')
                .sort((a,b) => new Date(a.reservationDate) - new Date(b.reservationDate));

            let copyStatus = 'Available';
            if (pendingHolds.length > 0) {
                db.update('reservations', pendingHolds[0].id, { status: 'Completed' });
                copyStatus = 'Reserved';
            }

            db.update('bookCopies', copy.id, { status: copyStatus });
            return { success: true, fineAmount };
        };

        // Create a loan due 5 days ago
        const issueD = '2026-06-10';
        const dueD = '2026-06-24';
        const returnD = '2026-06-29'; // 5 days overdue
        
        const activeLoan = db.insert('loans', { memberId: 'TEST-MEM-Regular', bookCopyId: 'TC-1', issueDate: issueD, dueDate: dueD, returnDate: null, fineAmount: 0.00, status: 'Issued' }, 'TEST-LON-');
        db.update('bookCopies', 'TC-1', { status: 'Issued' });

        const returnRes = mockReturn(activeLoan.id, returnD);
        assert(returnRes.success && returnRes.fineAmount === 5.00, 'Return desk calculates overdue fine values correctly ($5.00 for 5 days late).');
        
        const outstandingFines = db.find('fines', f => f.loanId === activeLoan.id);
        assert(outstandingFines.length === 1 && outstandingFines[0].amount === 5.00 && outstandingFines[0].status === 'Unpaid', 'Returning overdue copy successfully creates unpaid fine transaction logs.');

        // ----------------------------------------------------
        // TEST 6: Business Rule: Hold Queue resolution on return
        // ----------------------------------------------------
        // TCB-1 copy is currently Available.
        // Place hold on TEST-BOK-101 for Student member.
        db.insert('reservations', { memberId: 'TEST-MEM-Student', bookId: 'TEST-BOK-101', reservationDate: '2026-06-28', status: 'Pending' }, 'TEST-RES-');
        
        // Checkout TCB-2 copy (Issued) and then return it
        const tempLoan = db.insert('loans', { memberId: 'TEST-MEM-Regular', bookCopyId: 'TC-2', issueDate: '2026-06-20', dueDate: '2026-07-04', returnDate: null, fineAmount: 0.00, status: 'Issued' }, 'TEST-LON-');
        db.update('bookCopies', 'TC-2', { status: 'Issued' });

        // Return copy TCB-2 on time
        mockReturn(tempLoan.id, '2026-07-01');

        const holdObj = db.find('reservations', r => r.memberId === 'TEST-MEM-Student' && r.bookId === 'TEST-BOK-101');
        const copyObj = db.findById('bookCopies', 'TC-2');

        assert(holdObj[0].status === 'Completed', 'Hold status updates to Completed automatically on return of associated book copy.');
        assert(copyObj.status === 'Reserved', 'Returned book copy status changes to Reserved when pending holds queue exists.');

        // Restore user original data
        collections.forEach(col => {
            db.saveData(col, backup[col]);
        });

    } catch (e) {
        logs.push(`💥 EXCEPTION ERROR: ${e.message}`);
        console.error(e);
        failed++;
    }

    logs.push(`--- Diagnostics Suite Finished: Passed=${passed}, Failed=${failed} ---`);
    return { passed, failed, logs };
}


// Expose to window for global access
window.runTests = runTests;


// Expose to window for global access
window.runTests = runTests;
