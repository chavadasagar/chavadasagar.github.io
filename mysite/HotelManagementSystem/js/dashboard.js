/**
 * dashboard.js - Calculations and statistics for main portal page
 */

const dashboard = {
  render(container) {
    const rooms = window.db.getAll('rooms');
    const bookings = window.db.getAll('bookings');
    const hkTasks = window.db.getAll('housekeepingTasks');
    const maintRequests = window.db.getAll('maintenanceRequests');
    const payments = window.db.getAll('payments');

    // Filter calculations
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
    const availableRooms = rooms.filter(r => r.status === 'Available').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'Maintenance').length;
    const blockedRooms = rooms.filter(r => r.status === 'Blocked').length;

    const todayStr = new Date().toISOString().split('T')[0];

    // Today's Checkins
    const checkinsToday = bookings.filter(b => b.checkInDate === todayStr && b.bookingStatus !== 'Cancelled').length;
    // Today's Checkouts
    const checkoutsToday = bookings.filter(b => b.checkOutDate === todayStr && b.bookingStatus !== 'Cancelled').length;

    // Today's Revenue (payments done today)
    const revenueToday = payments
      .filter(p => p.paymentDate && p.paymentDate.startsWith(todayStr))
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Housekeeping tasks pending
    const pendingHk = hkTasks.filter(t => t.status === 'Pending' || t.status === 'InProgress').length;
    // Open maintenance requests
    const openMaint = maintRequests.filter(m => m.status === 'Open' || m.status === 'InProgress').length;

    // Recent 5 bookings
    const recentBookings = [...bookings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Calculate Occupancy Percentage by Room Type for Chart
    const roomTypes = window.db.getAll('roomTypes');
    const typeStats = roomTypes.map(rt => {
      const typeRooms = rooms.filter(r => r.roomTypeId === rt.id);
      const totalTypeRooms = typeRooms.length;
      const occupiedTypeRooms = typeRooms.filter(r => r.status === 'Occupied').length;
      const pct = totalTypeRooms > 0 ? Math.round((occupiedTypeRooms / totalTypeRooms) * 100) : 0;
      return { name: rt.name, total: totalTypeRooms, occupied: occupiedTypeRooms, percentage: pct };
    });

    // Render HTML structure
    container.innerHTML = `
      <div class="dashboard-header animate-fade-in">
        <h2>Dashboard Overview</h2>
        <div class="quick-actions">
          <button class="btn btn-primary" id="btn-quick-new-booking"><span class="icon">📅</span> New Booking</button>
          <button class="btn btn-accent" id="btn-quick-walkin"><span class="icon">🚶</span> Walk-in Check-in</button>
          <button class="btn btn-secondary" id="btn-quick-add-guest"><span class="icon">👤</span> Add Guest</button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid animate-fade-in">
        <div class="kpi-card">
          <div class="kpi-icon color-blue">🏢</div>
          <div class="kpi-info">
            <span class="kpi-label">Total Rooms</span>
            <span class="kpi-value">${totalRooms}</span>
            <span class="kpi-subtext">${availableRooms} Available, ${occupiedRooms} Occupied</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon color-green">📥</div>
          <div class="kpi-info">
            <span class="kpi-label">Today's Check-Ins</span>
            <span class="kpi-value">${checkinsToday}</span>
            <span class="kpi-subtext">Arrivals scheduled for today</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon color-red">📤</div>
          <div class="kpi-info">
            <span class="kpi-label">Today's Check-Outs</span>
            <span class="kpi-value">${checkoutsToday}</span>
            <span class="kpi-subtext">Departures scheduled for today</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon color-gold">💰</div>
          <div class="kpi-info">
            <span class="kpi-label">Today's Revenue</span>
            <span class="kpi-value">${window.utils.formatCurrency(revenueToday)}</span>
            <span class="kpi-subtext">Cash, card, & digital collections</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon color-orange">🧹</div>
          <div class="kpi-info">
            <span class="kpi-label">Housekeeping Queue</span>
            <span class="kpi-value">${pendingHk}</span>
            <span class="kpi-subtext">Active tasks to clean</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon color-purple">🛠️</div>
          <div class="kpi-info">
            <span class="kpi-label">Maintenance Requests</span>
            <span class="kpi-value">${openMaint}</span>
            <span class="kpi-subtext">Active engineering tickets</span>
          </div>
        </div>
      </div>

      <!-- Main Visual Row -->
      <div class="dashboard-row animate-fade-in">
        <!-- SVG Occupancy Chart Card -->
        <div class="dashboard-card card-chart">
          <h3>Occupancy by Room Type</h3>
          <div class="chart-wrapper">
            ${this._generateSvgOccupancyChart(typeStats)}
          </div>
          <div class="chart-legend">
            ${typeStats.map(stat => `
              <div class="legend-item">
                <span class="legend-label">${stat.name}</span>
                <span class="legend-bar-val">${stat.occupied} / ${stat.total} (${stat.percentage}%)</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Recent Bookings Table -->
        <div class="dashboard-card card-table">
          <h3>Recent Bookings</h3>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>Guest</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recentBookings.map(bk => {
                  const guest = window.db.getById('guests', bk.guestId) || { name: 'Unknown' };
                  let statusClass = 'badge-secondary';
                  if (bk.bookingStatus === 'Confirmed') statusClass = 'badge-primary';
                  else if (bk.bookingStatus === 'CheckedIn') statusClass = 'badge-success';
                  else if (bk.bookingStatus === 'CheckedOut') statusClass = 'badge-info';
                  else if (bk.bookingStatus === 'Cancelled') statusClass = 'badge-danger';

                  return `
                    <tr>
                      <td><strong>${bk.bookingReferenceNo}</strong></td>
                      <td>${guest.name}</td>
                      <td>${window.utils.formatDate(bk.checkInDate)} - ${window.utils.formatDate(bk.checkOutDate)}</td>
                      <td><span class="badge ${statusClass}">${bk.bookingStatus}</span></td>
                      <td>${window.utils.formatCurrency(bk.totalAmount)}</td>
                      <td>
                        <button class="btn btn-xs btn-outline btn-view-booking" data-id="${bk.id}">View</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
                ${recentBookings.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">No bookings recorded yet.</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Event Handlers for Quick Actions
    document.getElementById('btn-quick-new-booking').addEventListener('click', () => {
      window.location.hash = '#bookings';
      setTimeout(() => {
        if (window.bookingsController && typeof window.bookingsController.openBookingWizard === 'function') {
          window.bookingsController.openBookingWizard();
        }
      }, 100);
    });

    document.getElementById('btn-quick-walkin').addEventListener('click', () => {
      window.location.hash = '#bookings';
      setTimeout(() => {
        if (window.bookingsController && typeof window.bookingsController.openBookingWizard === 'function') {
          window.bookingsController.openBookingWizard('WalkIn');
        }
      }, 100);
    });

    document.getElementById('btn-quick-add-guest').addEventListener('click', () => {
      window.location.hash = '#guests';
      setTimeout(() => {
        if (window.guestsController && typeof window.guestsController.openGuestModal === 'function') {
          window.guestsController.openGuestModal();
        }
      }, 100);
    });

    // View booking click handler
    container.querySelectorAll('.btn-view-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bookingId = e.currentTarget.getAttribute('data-id');
        window.location.hash = '#bookings';
        setTimeout(() => {
          if (window.bookingsController && typeof window.bookingsController.viewBookingDetails === 'function') {
            window.bookingsController.viewBookingDetails(bookingId);
          }
        }, 100);
      });
    });
  },

  // Generate pure SVG horizontal bar representation
  _generateSvgOccupancyChart(stats) {
    const width = 400;
    const height = 180;
    const barHeight = 24;
    const gap = 16;
    
    let svgContent = `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">`;
    
    stats.forEach((stat, i) => {
      const y = i * (barHeight + gap) + 20;
      const fillWidth = (stat.percentage / 100) * 220; // max length 220
      
      // Label text
      svgContent += `<text x="10" y="${y + 16}" fill="var(--text-color)" font-size="12" font-weight="600">${stat.name.substring(0, 15)}</text>`;
      
      // Bar background
      svgContent += `<rect x="150" y="${y}" width="220" height="${barHeight}" rx="4" fill="var(--bg-hover)" />`;
      
      // Colored Fill bar
      let fillCol = 'var(--primary-color)';
      if (stat.percentage > 75) fillCol = 'var(--success-color)';
      else if (stat.percentage > 40) fillCol = 'var(--accent-color)';
      
      if (fillWidth > 0) {
        svgContent += `<rect x="150" y="${y}" width="${fillWidth}" height="${barHeight}" rx="4" fill="${fillCol}" />`;
      }
      
      // Percentage Text inside/next to bar
      svgContent += `<text x="${155 + fillWidth > 330 ? 155 : 155 + fillWidth}" y="${y + 16}" fill="${fillWidth > 40 ? '#ffffff' : 'var(--text-color)'}" font-size="11" font-weight="bold">${stat.percentage}%</text>`;
    });
    
    svgContent += `</svg>`;
    return svgContent;
  }
};

window.dashboardController = dashboard;
