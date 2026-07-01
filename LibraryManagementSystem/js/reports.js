/**
 * REPORTS.JS
 * Aggregates analytical reports, outputs print sheets, and downloads CSV.
 */

let activeReport = 'most-borrowed';
let reportData = []; // cached for CSV exports

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Render
    generateReport();

    // 2. Tab switcher listeners
    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.report-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeReport = btn.dataset.report;
            generateReport();
        });
    });

    // 3. Action Listeners
    document.getElementById('print-report-btn').addEventListener('click', handlePrint);
    document.getElementById('export-csv-btn').addEventListener('click', handleCsvExport);
});

function generateReport() {
    const books = db.find('books');
    const members = db.find('members');
    const loans = db.find('loans');
    const copies = db.find('bookCopies');
    const categories = db.find('categories');
    const fines = db.find('fines');

    const summaryBox = document.getElementById('report-summary-box');
    summaryBox.innerHTML = ''; // Clear

    const cardTitle = document.getElementById('report-card-title');
    const printTitle = document.getElementById('print-report-title');

    switch (activeReport) {
        case 'most-borrowed':
            cardTitle.textContent = 'Most Borrowed Books';
            printTitle.textContent = 'Report: Most Borrowed Books';
            compileMostBorrowed(books, loans, copies, categories);
            break;
        case 'top-members':
            cardTitle.textContent = 'Top Active Members';
            printTitle.textContent = 'Report: Top Borrowing Members';
            compileTopMembers(members, loans);
            break;
        case 'overdue-list':
            cardTitle.textContent = 'Overdue Borrowers Ledger';
            printTitle.textContent = 'Report: Overdue Borrowers Ledger';
            compileOverdueList(members, loans, copies, books);
            break;
        case 'fine-statement':
            cardTitle.textContent = 'Fine Statement Statement';
            printTitle.textContent = 'Report: Fine Statement Statement';
            compileFineStatement(fines, members, loans);
            break;
        case 'inventory-status':
            cardTitle.textContent = 'Branch Inventory & Status';
            printTitle.textContent = 'Report: Branch Inventory Status';
            compileInventoryStatus(books, copies, categories);
            break;
    }
}

// ----------------------------------------------------
// 1. Compile Most Borrowed Books Report
// ----------------------------------------------------
function compileMostBorrowed(books, loans, copies, categories) {
    const thead = document.getElementById('reports-thead');
    const tbody = document.getElementById('reports-tbody');
    thead.innerHTML = `
        <tr>
            <th>Rank</th>
            <th>Book Title</th>
            <th>ISBN</th>
            <th>Category</th>
            <th>Checkout Frequency</th>
        </tr>
    `;

    // Group loans count by bookId
    const counts = {};
    loans.forEach(loan => {
        const copy = copies.find(c => c.id === loan.bookCopyId);
        if (copy) {
            counts[copy.bookId] = (counts[copy.bookId] || 0) + 1;
        }
    });

    // Compile rows data
    const list = books.map(book => {
        const cat = categories.find(c => c.id === book.categoryId);
        return {
            title: book.title,
            isbn: book.isbn,
            category: cat ? cat.name : '-',
            checkouts: counts[book.id] || 0
        };
    }).sort((a, b) => b.checkouts - a.checkouts);

    reportData = list; // cache

    tbody.innerHTML = '';
    list.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td>${item.title}</td>
            <td><code>${item.isbn}</code></td>
            <td>${item.category}</td>
            <td style="font-weight: 600;">${item.checkouts} times</td>
        `;
        tbody.appendChild(row);
    });

    // Render summary boxes
    const totalCirculations = loans.length;
    document.getElementById('report-summary-box').innerHTML = `
        <div class="summary-mini-card">
            <span class="kpi-label">Total Transactions</span>
            <span class="kpi-value" style="font-size: 1.4rem;">${totalCirculations}</span>
        </div>
        <div class="summary-mini-card">
            <span class="kpi-label">Top Circulating Title</span>
            <span class="kpi-value" style="font-size: 1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${list[0] ? list[0].title : '-'}
            </span>
        </div>
    `;
}

// ----------------------------------------------------
// 2. Compile Top Active Borrowers Report
// ----------------------------------------------------
function compileTopMembers(members, loans) {
    const thead = document.getElementById('reports-thead');
    const tbody = document.getElementById('reports-tbody');
    thead.innerHTML = `
        <tr>
            <th>Rank</th>
            <th>Member ID</th>
            <th>Member Name</th>
            <th>Email</th>
            <th>Type</th>
            <th>Total Borrowings</th>
        </tr>
    `;

    // Group loans count by memberId
    const counts = {};
    loans.forEach(loan => {
        counts[loan.memberId] = (counts[loan.memberId] || 0) + 1;
    });

    const list = members.map(m => {
        return {
            id: m.id,
            name: m.name,
            email: m.email,
            type: m.membershipType,
            borrowings: counts[m.id] || 0
        };
    }).sort((a, b) => b.borrowings - a.borrowings);

    reportData = list; // cache

    tbody.innerHTML = '';
    list.forEach((item, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${idx + 1}</strong></td>
            <td><code>${item.id}</code></td>
            <td>${item.name}</td>
            <td>${item.email}</td>
            <td><span class="badge badge-reserved">${item.type}</span></td>
            <td style="font-weight: 600;">${item.borrowings} checkouts</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('report-summary-box').innerHTML = `
        <div class="summary-mini-card">
            <span class="kpi-label">Total Members</span>
            <span class="kpi-value" style="font-size: 1.4rem;">${members.length}</span>
        </div>
        <div class="summary-mini-card">
            <span class="kpi-label">Most Active Member</span>
            <span class="kpi-value" style="font-size: 1.25rem;">
                ${list[0] ? list[0].name : '-'}
            </span>
        </div>
    `;
}

// ----------------------------------------------------
// 3. Compile Overdue Borrowers Report
// ----------------------------------------------------
function compileOverdueList(members, loans, copies, books) {
    const thead = document.getElementById('reports-thead');
    const tbody = document.getElementById('reports-tbody');
    thead.innerHTML = `
        <tr>
            <th>Member ID</th>
            <th>Member Name</th>
            <th>Book Title</th>
            <th>Barcode</th>
            <th>Due Date</th>
            <th>Days Late</th>
            <th>Fine Charged</th>
        </tr>
    `;

    const overdueLoans = loans.filter(l => l.status === 'Overdue' && l.returnDate === null);

    const list = overdueLoans.map(loan => {
        const member = members.find(m => m.id === loan.memberId);
        const copy = copies.find(c => c.id === loan.bookCopyId);
        const book = copy ? books.find(b => b.id === copy.bookId) : null;
        const daysLate = datetime.diffDays(loan.dueDate, datetime.today());

        return {
            memberId: loan.memberId,
            memberName: member ? member.name : 'Unknown',
            bookTitle: book ? book.title : 'Unknown',
            barcode: copy ? copy.barcode : 'Unknown',
            dueDate: loan.dueDate,
            daysLate: daysLate > 0 ? daysLate : 0,
            fine: loan.fineAmount
        };
    }).sort((a, b) => b.daysLate - a.daysLate);

    reportData = list; // cache

    tbody.innerHTML = '';
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No members currently overdue. Good job!</td></tr>`;
    } else {
        list.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${item.memberId}</code></td>
                <td>${item.memberName}</td>
                <td>${item.bookTitle}</td>
                <td><code>${item.barcode}</code></td>
                <td>${datetime.format(item.dueDate)}</td>
                <td style="color: var(--danger); font-weight: 500;">${item.daysLate} Days</td>
                <td style="color: var(--danger); font-weight: 600;">$${item.fine.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    const totalFinesSum = list.reduce((s,i) => s + i.fine, 0);
    document.getElementById('report-summary-box').innerHTML = `
        <div class="summary-mini-card">
            <span class="kpi-label">Overdue Books Count</span>
            <span class="kpi-value" style="font-size: 1.4rem; color: var(--danger);">${list.length}</span>
        </div>
        <div class="summary-mini-card">
            <span class="kpi-label">Outstanding Late Fines</span>
            <span class="kpi-value" style="font-size: 1.4rem; color: var(--danger);">$${totalFinesSum.toFixed(2)}</span>
        </div>
    `;
}

// ----------------------------------------------------
// 4. Compile Fines Statement Report
// ----------------------------------------------------
function compileFineStatement(fines, members, loans) {
    const thead = document.getElementById('reports-thead');
    const tbody = document.getElementById('reports-tbody');
    thead.innerHTML = `
        <tr>
            <th>Fine ID</th>
            <th>Borrower</th>
            <th>Amount Charged</th>
            <th>Date Charged</th>
            <th>Status</th>
        </tr>
    `;

    const list = fines.map(fine => {
        const member = members.find(m => m.id === fine.memberId);
        return {
            id: fine.id,
            memberName: member ? member.name : 'Unknown',
            amount: fine.amount,
            date: fine.createdDate,
            status: fine.status
        };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    reportData = list; // cache

    tbody.innerHTML = '';
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No fine statement data logged.</td></tr>`;
    } else {
        list.forEach(item => {
            const statusClass = item.status === 'Paid' ? 'badge-active' : 'badge-suspended';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.id}</strong></td>
                <td>${item.memberName}</td>
                <td style="font-weight: 600;">$${item.amount.toFixed(2)}</td>
                <td>${datetime.format(item.date)}</td>
                <td><span class="badge ${statusClass}">${item.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    const totalCollected = fines.filter(f => f.status === 'Paid').reduce((s,i) => s + i.amount, 0);
    const totalOutstanding = fines.filter(f => f.status === 'Unpaid').reduce((s,i) => s + i.amount, 0);

    document.getElementById('report-summary-box').innerHTML = `
        <div class="summary-mini-card">
            <span class="kpi-label">Fines Paid Collection</span>
            <span class="kpi-value" style="font-size: 1.4rem; color: var(--success);">$${totalCollected.toFixed(2)}</span>
        </div>
        <div class="summary-mini-card">
            <span class="kpi-label">Fines Unpaid Balance</span>
            <span class="kpi-value" style="font-size: 1.4rem; color: var(--danger);">$${totalOutstanding.toFixed(2)}</span>
        </div>
    `;
}

// ----------------------------------------------------
// 5. Compile Inventory Status Report
// ----------------------------------------------------
function compileInventoryStatus(books, copies, categories) {
    const thead = document.getElementById('reports-thead');
    const tbody = document.getElementById('reports-tbody');
    thead.innerHTML = `
        <tr>
            <th>Book Title</th>
            <th>Category</th>
            <th>Available Copies</th>
            <th>Issued Copies</th>
            <th>Maintenance</th>
            <th>Total Copies</th>
        </tr>
    `;

    const list = books.map(book => {
        const cat = categories.find(c => c.id === book.categoryId);
        const bookCopies = copies.filter(c => c.bookId === book.id);
        
        const avail = bookCopies.filter(c => c.status === 'Available').length;
        const issued = bookCopies.filter(c => c.status === 'Issued').length;
        const maint = bookCopies.filter(c => c.status === 'Maintenance').length;

        return {
            title: book.title,
            category: cat ? cat.name : '-',
            avail,
            issued,
            maint,
            total: bookCopies.length
        };
    }).sort((a,b) => b.total - a.total);

    reportData = list; // cache

    tbody.innerHTML = '';
    list.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.title}</strong></td>
            <td>${item.category}</td>
            <td style="color: var(--success); font-weight: 500;">${item.avail} copies</td>
            <td style="color: var(--warning); font-weight: 500;">${item.issued} copies</td>
            <td style="color: var(--danger); font-weight: 500;">${item.maint} copies</td>
            <td style="font-weight: 600;">${item.total} total</td>
        `;
        tbody.appendChild(row);
    });

    const totalPhysicalCopies = copies.length;
    const copiesAvailable = copies.filter(c => c.status === 'Available').length;
    const copiesMaintenance = copies.filter(c => c.status === 'Maintenance').length;

    document.getElementById('report-summary-box').innerHTML = `
        <div class="summary-mini-card">
            <span class="kpi-label">Total Copy Inventory</span>
            <span class="kpi-value" style="font-size: 1.4rem;">${totalPhysicalCopies}</span>
        </div>
        <div class="summary-mini-card">
            <span class="kpi-label">Available Copies Ratio</span>
            <span class="kpi-value" style="font-size: 1.35rem; color: var(--success);">
                ${Math.round((copiesAvailable / totalPhysicalCopies) * 100)}% Available
            </span>
        </div>
        <div class="summary-mini-card">
            <span class="kpi-label">Copies In Maintenance</span>
            <span class="kpi-value" style="font-size: 1.35rem; color: var(--danger);">${copiesMaintenance}</span>
        </div>
    `;
}

// ----------------------------------------------------
// Print Report utility
// ----------------------------------------------------
function handlePrint() {
    document.getElementById('print-timestamp').textContent = `Generated on: ${new Date().toLocaleString()}`;
    window.print();
}

// ----------------------------------------------------
// Export CSV utility
// ----------------------------------------------------
function handleCsvExport() {
    if (reportData.length === 0) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    
    // Fetch headers from active columns
    const columns = [];
    const headers = document.querySelectorAll('#reports-thead th');
    headers.forEach(h => columns.push(h.textContent.trim()));
    csvContent += columns.join(',') + '\n';

    // Parse cached rows
    reportData.forEach((item, index) => {
        let row = [];
        
        if (activeReport === 'most-borrowed') {
            row = [index + 1, item.title, item.isbn, item.category, item.checkouts];
        } else if (activeReport === 'top-members') {
            row = [index + 1, item.id, item.name, item.email, item.type, item.borrowings];
        } else if (activeReport === 'overdue-list') {
            row = [item.memberId, item.memberName, item.bookTitle, item.barcode, item.dueDate, item.daysLate, item.fine];
        } else if (activeReport === 'fine-statement') {
            row = [item.id, item.memberName, item.amount, item.date, item.status];
        } else if (activeReport === 'inventory-status') {
            row = [item.title, item.category, item.avail, item.issued, item.maint, item.total];
        }

        // Format cells to escape commas
        const cleanRow = row.map(cell => {
            const stringCell = cell !== undefined && cell !== null ? cell.toString() : '';
            if (stringCell.includes(',') || stringCell.includes('\n') || stringCell.includes('"')) {
                return `"${stringCell.replace(/"/g, '""')}"`;
            }
            return stringCell;
        });

        csvContent += cleanRow.join(',') + '\n';
    });

    // Spawn download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const filename = `aegislib_report_${activeReport}_${datetime.today()}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
