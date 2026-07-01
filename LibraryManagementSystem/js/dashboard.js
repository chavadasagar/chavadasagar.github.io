/**
 * DASHBOARD.JS
 * Computes analytics and renders custom SVG charts.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Re-render when database changes
    window.addEventListener('db-changed', loadDashboardData);
    
    // Initial load
    loadDashboardData();
});

function loadDashboardData() {
    // 1. Fetch Collections
    const books = db.find('books');
    const copies = db.find('bookCopies');
    const members = db.find('members');
    const loans = db.find('loans');
    const reservations = db.find('reservations');
    const fines = db.find('fines');
    const categories = db.find('categories');

    // 2. Compute KPIs
    const totalBooksVal = books.length;
    const availableCopiesVal = copies.filter(c => c.status === 'Available').length;
    const issuedCopiesVal = copies.filter(c => c.status === 'Issued').length;
    const overdueLoansVal = loans.filter(l => l.status === 'Overdue').length;
    const pendingReservationsVal = reservations.filter(r => r.status === 'Pending').length;
    const totalMembersVal = members.length;
    
    // Sum unpaid fines
    const outstandingFinesVal = fines
        .filter(f => f.status === 'Unpaid')
        .reduce((sum, f) => sum + f.amount, 0);

    // 3. Update DOM Elements
    document.getElementById('kpi-total-books').textContent = totalBooksVal;
    document.getElementById('kpi-available-books').textContent = availableCopiesVal;
    document.getElementById('kpi-issued-books').textContent = issuedCopiesVal;
    document.getElementById('kpi-overdue-loans').textContent = overdueLoansVal;
    document.getElementById('kpi-reservations').textContent = pendingReservationsVal;
    document.getElementById('kpi-total-members').textContent = totalMembersVal;
    document.getElementById('kpi-fines-collected').textContent = `$${outstandingFinesVal.toFixed(2)}`;

    // 4. Render Line Chart (Loan volume last 7 days)
    renderLoanTrendsChart(loans);

    // 5. Render Donut Chart (Books by category)
    renderCategoryDistributionChart(books, categories);

    // 6. Load Recent Activities Table
    renderRecentCirculationTable(loans, books, members, copies);
}

// ----------------------------------------------------
// 1. Loan Volume SVG Line Chart
// ----------------------------------------------------
function renderLoanTrendsChart(loans) {
    const svg = document.getElementById('line-chart-svg');
    const tooltip = document.getElementById('line-chart-tooltip');
    if (!svg) return;
    svg.innerHTML = ''; // clear

    // Generate last 7 days labels and count loans issued on those days
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Label format (e.g. "Jun 24")
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Count checkouts
        const dayLoans = loans.filter(l => l.issueDate === dateStr).length;
        data.push(dayLoans);
    }

    const svgWidth = 600;
    const svgHeight = 240;
    const paddingX = 50;
    const paddingY = 40;
    const chartWidth = svgWidth - paddingX * 2;
    const chartHeight = svgHeight - paddingY * 2;

    // Find max value in dataset (default to 5 to avoid flat scale)
    const maxVal = Math.max(...data, 5);

    // Y Axis Scale ticks
    const ticksCount = 4;
    for (let i = 0; i <= ticksCount; i++) {
        const yVal = Math.round((maxVal / ticksCount) * i);
        const yPos = svgHeight - paddingY - (yVal / maxVal) * chartHeight;
        
        // Draw grid lines
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', paddingX.toString());
        line.setAttribute('y1', yPos.toString());
        line.setAttribute('x2', (svgWidth - paddingX).toString());
        line.setAttribute('y2', yPos.toString());
        line.setAttribute('class', 'chart-grid-line');
        svg.appendChild(line);

        // Draw Y Axis Labels
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (paddingX - 10).toString());
        text.setAttribute('y', (yPos + 4).toString());
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('class', 'chart-axis-text');
        text.textContent = yVal.toString();
        svg.appendChild(text);
    }

    // Coordinates generation
    const points = [];
    labels.forEach((label, i) => {
        const xPos = paddingX + (i / (labels.length - 1)) * chartWidth;
        const yPos = svgHeight - paddingY - (data[i] / maxVal) * chartHeight;
        points.push({ x: xPos, y: yPos, val: data[i], label });

        // Draw X axis labels
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', xPos.toString());
        text.setAttribute('y', (svgHeight - paddingY + 20).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'chart-axis-text');
        text.textContent = label;
        svg.appendChild(text);
    });

    // Make smooth curved area and line
    let pathD = `M ${points[0].x} ${points[0].y}`;
    let areaD = `M ${points[0].x} ${svgHeight - paddingY} L ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        // Control points for cubic bezier
        const cpX1 = curr.x + (next.x - curr.x) / 2;
        const cpY1 = curr.y;
        const cpX2 = curr.x + (next.x - curr.x) / 2;
        const cpY2 = next.y;

        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
        areaD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    areaD += ` L ${points[points.length - 1].x} ${svgHeight - paddingY} Z`;

    // Render Area path
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('fill', 'url(#line-grad)');
    areaPath.setAttribute('class', 'chart-area');
    svg.appendChild(areaPath);

    // Render Line path
    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linePath.setAttribute('d', pathD);
    linePath.setAttribute('stroke', 'var(--primary)');
    linePath.setAttribute('class', 'chart-line');
    svg.appendChild(linePath);

    // Gradient definitions inside SVG
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0"/>
        </linearGradient>
    `;
    svg.appendChild(defs);

    // Render interactive data points
    points.forEach(pt => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pt.x.toString());
        circle.setAttribute('cy', pt.y.toString());
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', 'var(--primary)');
        circle.setAttribute('stroke', 'var(--bg-tertiary)');
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('class', 'chart-point');

        // Tooltip hover actions
        circle.addEventListener('mouseenter', (e) => {
            circle.setAttribute('r', '6');
            tooltip.style.display = 'block';
            tooltip.innerHTML = `<strong>${pt.label}</strong>: ${pt.val} Checkout(s)`;
            
            // Calculate absolute position
            const parentRect = svg.getBoundingClientRect();
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            tooltip.style.left = `${pt.x - 60}px`;
            tooltip.style.top = `${pt.y - 45}px`;
        });

        circle.addEventListener('mouseleave', () => {
            circle.setAttribute('r', '4');
            tooltip.style.display = 'none';
        });

        svg.appendChild(circle);
    });
}

// ----------------------------------------------------
// 2. Books by Category Donut Chart
// ----------------------------------------------------
function renderCategoryDistributionChart(books, categories) {
    const svg = document.getElementById('donut-chart-svg');
    const legend = document.getElementById('donut-legend');
    if (!svg || !legend) return;
    svg.innerHTML = '';
    legend.innerHTML = '';

    // Count books per category
    const catCounts = {};
    books.forEach(b => {
        catCounts[b.categoryId] = (catCounts[b.categoryId] || 0) + 1;
    });

    // Match count with category names
    const data = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        count: catCounts[cat.id] || 0
    })).filter(d => d.count > 0);

    const totalCount = data.reduce((sum, item) => sum + item.count, 0);

    if (totalCount === 0) {
        // Render Empty state in SVG
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '100');
        text.setAttribute('y', '105');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'var(--text-muted)');
        text.setAttribute('font-size', '12px');
        text.textContent = 'No book data available';
        svg.appendChild(text);
        return;
    }

    // Chart properties
    const r = 50;
    const cx = 100;
    const cy = 100;
    const circumference = 2 * Math.PI * r; // 314.159

    const colors = [
        'var(--primary)',
        'var(--accent)',
        'var(--info)',
        'var(--warning)',
        'var(--success)',
        '#ec4899',
        '#8b5cf6'
    ];

    let currentOffset = 0;

    data.forEach((item, index) => {
        const pct = item.count / totalCount;
        const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
        const dashOffset = circumference - currentOffset;
        const color = colors[index % colors.length];

        // Draw Circle segment
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx.toString());
        circle.setAttribute('cy', cy.toString());
        circle.setAttribute('r', r.toString());
        circle.setAttribute('fill', 'transparent');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '16');
        circle.setAttribute('stroke-dasharray', dashArray);
        circle.setAttribute('stroke-dashoffset', dashOffset.toString());
        circle.setAttribute('transform', 'rotate(-90 100 100)'); // start from top
        circle.setAttribute('class', 'donut-slice');

        // Tooltip text update
        circle.innerHTML = `<title>${item.name}: ${item.count} books (${Math.round(pct * 100)}%)</title>`;
        svg.appendChild(circle);

        currentOffset += circumference * pct;

        // Render Legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color" style="background: ${color}"></span>
            <span>${item.name} (<strong>${item.count}</strong>)</span>
        `;
        legend.appendChild(legendItem);
    });

    // Draw center hole details (Total count)
    const holeTextLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    holeTextLabel.setAttribute('x', '100');
    holeTextLabel.setAttribute('y', '95');
    holeTextLabel.setAttribute('text-anchor', 'middle');
    holeTextLabel.setAttribute('fill', 'var(--text-secondary)');
    holeTextLabel.setAttribute('font-size', '10px');
    holeTextLabel.setAttribute('font-weight', '500');
    holeTextLabel.textContent = 'TOTAL BOOKS';
    svg.appendChild(holeTextLabel);

    const holeTextVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    holeTextVal.setAttribute('x', '100');
    holeTextVal.setAttribute('y', '118');
    holeTextVal.setAttribute('text-anchor', 'middle');
    holeTextVal.setAttribute('fill', 'var(--text-primary)');
    holeTextVal.setAttribute('font-size', '20px');
    holeTextVal.setAttribute('font-weight', '700');
    holeTextVal.textContent = totalCount.toString();
    svg.appendChild(holeTextVal);
}

// ----------------------------------------------------
// 3. Recent Circulation Activity Table
// ----------------------------------------------------
function renderRecentCirculationTable(loans, books, members, copies) {
    const tbody = document.getElementById('recent-loans-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Sort loans by issueDate descending, take top 5
    const recentLoans = [...loans]
        .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
        .slice(0, 5);

    if (recentLoans.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-secondary);">
                    No checkout records found in history.
                </td>
            </tr>
        `;
        return;
    }

    recentLoans.forEach(loan => {
        const copy = copies.find(c => c.id === loan.bookCopyId);
        const book = copy ? books.find(b => b.id === copy.bookId) : null;
        const member = members.find(m => m.id === loan.memberId);

        const bookTitle = book ? book.title : 'Unknown Book';
        const memberName = member ? member.name : 'Unknown Member';
        
        let statusBadgeClass = 'badge-issued';
        if (loan.status === 'Returned') statusBadgeClass = 'badge-returned';
        if (loan.status === 'Overdue') statusBadgeClass = 'badge-overdue';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${bookTitle}</strong></td>
            <td>${memberName}</td>
            <td>${datetime.format(loan.issueDate)}</td>
            <td>${datetime.format(loan.dueDate)}</td>
            <td><span class="badge ${statusBadgeClass}">${loan.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}
