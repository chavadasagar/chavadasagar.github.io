/**
 * reports.js - Custom SVG visualizations, financial audits, channel percentages, occupancy trends
 */

const reportsController = {
  render(container) {
    const bookings = window.db.getAll('bookings');
    const invoices = window.db.getAll('invoices');
    const payments = window.db.getAll('payments');
    const rooms = window.db.getAll('rooms');
    const roomTypes = window.db.getAll('roomTypes');

    // Calculations
    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    // Split revenue by payment mode
    const paymentModes = { Cash: 0, Card: 0, UPI: 0, NetBanking: 0 };
    payments.forEach(p => {
      if (paymentModes[p.paymentMode] !== undefined) {
        paymentModes[p.paymentMode] += parseFloat(p.amount);
      }
    });

    // Split bookings by sources
    const bookingSources = { Website: 0, WalkIn: 0, Phone: 0, OTA: 0 };
    bookings.forEach(b => {
      if (bookingSources[b.bookingSource] !== undefined) {
        bookingSources[b.bookingSource]++;
      }
    });

    // Occupancy metrics
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
    const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    container.innerHTML = `
      <div class="reports-header animate-fade-in">
        <h2>HMS Reports & Business Analytics</h2>
      </div>

      <div class="reports-kpi-grid animate-fade-in" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom:25px;">
        <div class="kpi-card card">
          <span style="font-size:12px; color:var(--text-muted); font-weight:600;">LIFETIME REVENUE</span>
          <h2 style="margin:5px 0; color:var(--success-color); font-size:24px;">${window.utils.formatCurrency(totalRevenue)}</h2>
          <span style="font-size:11px;">Total transactions processed</span>
        </div>
        <div class="kpi-card card">
          <span style="font-size:12px; color:var(--text-muted); font-weight:600;">ACTIVE OCCUPANCY</span>
          <h2 style="margin:5px 0; color:var(--accent-color); font-size:24px;">${occupancyPercentage}%</h2>
          <span style="font-size:11px;">${occupiedRooms} of ${totalRooms} rooms filled tonight</span>
        </div>
        <div class="kpi-card card">
          <span style="font-size:12px; color:var(--text-muted); font-weight:600;">TOTAL RESERVATIONS</span>
          <h2 style="margin:5px 0; color:var(--primary-color); font-size:24px;">${bookings.length} Bookings</h2>
          <span style="font-size:11px;">Including completed and upcoming</span>
        </div>
      </div>

      <div class="reports-visuals-grid animate-fade-in">
        <!-- SVG Revenue by payment mode bar chart -->
        <div class="dashboard-card card">
          <h3>Revenue by Payment Channel</h3>
          <div class="chart-wrapper">
            ${this._generatePaymentModeChart(paymentModes)}
          </div>
          <div class="chart-legend" style="margin-top:15px;">
            ${Object.keys(paymentModes).map(mode => `
              <div class="legend-item" style="display:flex; justify-content:space-between; margin:5px 0; font-size:12px;">
                <span><strong>${mode}</strong></span>
                <span>${window.utils.formatCurrency(paymentModes[mode])}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SVG Donut Booking Source Chart -->
        <div class="dashboard-card card">
          <h3>Booking Source Share</h3>
          <div class="chart-wrapper" style="display:flex; justify-content:center; align-items:center;">
            ${this._generateDonutSourceChart(bookingSources)}
          </div>
        </div>
      </div>
    `;
  },

  _generatePaymentModeChart(data) {
    const width = 400;
    const height = 180;
    const maxValue = Math.max(...Object.values(data), 1000);
    const barHeight = 20;
    const gap = 16;

    let svg = `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

    Object.keys(data).forEach((mode, i) => {
      const val = data[mode];
      const y = i * (barHeight + gap) + 20;
      const fillWidth = (val / maxValue) * 200; // max length 200

      svg += `<text x="10" y="${y + 14}" fill="var(--text-color)" font-size="12" font-weight="600">${mode}</text>`;
      svg += `<rect x="120" y="${y}" width="220" height="${barHeight}" rx="4" fill="var(--bg-hover)" />`;
      if (fillWidth > 0) {
        svg += `<rect x="120" y="${y}" width="${fillWidth}" height="${barHeight}" rx="4" fill="var(--success-color)" />`;
      }
      svg += `<text x="350" y="${y + 14}" fill="var(--text-color)" font-size="11" font-weight="bold">${Math.round(val)}</text>`;
    });

    svg += `</svg>`;
    return svg;
  },

  _generateDonutSourceChart(data) {
    const total = Object.values(data).reduce((sum, v) => sum + v, 0);
    if (total === 0) return '<p class="text-center text-muted">No booking source data available.</p>';

    // Set SVG parameters
    const size = 180;
    const center = size / 2;
    const r = 50; // radius
    const strokeWidth = 20;
    const circ = 2 * Math.PI * r;

    let accumAngle = 0;
    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;

    // Colors mapping
    const colors = {
      Website: 'var(--primary-color)',
      WalkIn: 'var(--accent-color)',
      Phone: 'var(--info-color)',
      OTA: 'var(--warning-color)'
    };

    const keys = Object.keys(data);
    let cumulativePercent = 0;

    keys.forEach(source => {
      const val = data[source];
      if (val === 0) return;

      const pct = val / total;
      const strokeDasharray = `${pct * circ} ${circ}`;
      const strokeDashoffset = `${-cumulativePercent * circ}`;
      
      svg += `
        <circle cx="${center}" cy="${center}" r="${r}" 
                fill="transparent" 
                stroke="${colors[source] || '#cccccc'}" 
                stroke-width="${strokeWidth}" 
                stroke-dasharray="${strokeDasharray}" 
                stroke-dashoffset="${strokeDashoffset}"
                transform="rotate(-90 ${center} ${center})" />
      `;
      cumulativePercent += pct;
    });

    // Donut hole
    svg += `<circle cx="${center}" cy="${center}" r="${r - strokeWidth/2}" fill="var(--card-bg)" />`;
    
    // Text in middle
    svg += `
      <text x="${center}" y="${center - 2}" text-anchor="middle" fill="var(--text-color)" font-size="14" font-weight="bold">${total}</text>
      <text x="${center}" y="${center + 12}" text-anchor="middle" fill="var(--text-muted)" font-size="9">Total Bookings</text>
    `;

    svg += `</svg>`;

    // Add list legend next to chart
    let legendHtml = '<div style="display:flex; flex-direction:column; gap:5px; margin-left:20px; text-align:left;">';
    keys.forEach(source => {
      const val = data[source];
      const pctVal = total > 0 ? Math.round((val / total) * 100) : 0;
      legendHtml += `
        <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
          <span style="display:inline-block; width:12px; height:12px; background:${colors[source]}; border-radius:3px;"></span>
          <strong>${source}:</strong>
          <span>${val} bookings (${pctVal}%)</span>
        </div>
      `;
    });
    legendHtml += '</div>';

    return `<div style="display:flex; align-items:center;">${svg} ${legendHtml}</div>`;
  }
};

window.reportsController = reportsController;
