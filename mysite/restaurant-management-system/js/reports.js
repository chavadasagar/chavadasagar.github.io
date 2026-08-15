/**
 * reports.js - Analytics Calculations, Canvas Charting, and CSV Export (Multi-branch & Permissions updated)
 */

const ReportsModule = {
  init() {
    // Render Dashboard
    window.addEventListener("render-section:dashboard", () => this.renderDashboardChart());
    // Render Reports
    window.addEventListener("render-section:reports", () => this.renderReportsPage());

    // Bind Apply date filter
    const applyBtn = document.getElementById("btn-apply-report-filters");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => this.renderReportsPage());
    }

    // Bind CSV Export
    const csvBtn = document.getElementById("btn-export-sales-csv");
    if (csvBtn) {
      csvBtn.addEventListener("click", () => this.exportSalesToCSV());
    }

    // Set default date range input parameters (Last 30 days)
    const startInput = document.getElementById("report-filter-start");
    const endInput = document.getElementById("report-filter-end");
    if (startInput && endInput) {
      const today = new Date();
      const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      startInput.value = pastMonth.toISOString().slice(0, 10);
      endInput.value = today.toISOString().slice(0, 10);
    }
  },

  // Renders the Last 7 Days trend chart
  renderDashboardChart() {
    const canvas = document.getElementById("dashboard-sales-chart");
    if (!canvas) return;

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => o.status === "completed" && (currentBranch === "all" || o.branchId === currentBranch));

    const labels = [];
    const totals = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().slice(0, 10);
      const prettyLabel = date.toLocaleDateString([], { weekday: 'short' });

      labels.push(prettyLabel);

      const dateTotal = orders
        .filter(o => o.createdAt.slice(0, 10) === dateString)
        .reduce((sum, o) => sum + o.total, 0);
      totals.push(dateTotal);
    }

    this.drawCanvasChart(canvas, labels, totals);
    this.updateDashboardMetrics();
  },

  // Aggregates dashboard cards values
  updateDashboardMetrics() {
    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => currentBranch === "all" || o.branchId === currentBranch);
    const todayStr = new Date().toISOString().slice(0, 10);

    const todayOrders = orders.filter(o => o.createdAt.slice(0,10) === todayStr);
    const completedToday = todayOrders.filter(o => o.status === "completed");
    
    const totalSalesAmt = completedToday.reduce((sum, o) => sum + o.total, 0);
    
    const salesWidget = document.getElementById("dash-total-sales");
    if (salesWidget) salesWidget.textContent = app.formatCurrency(totalSalesAmt);

    const ordersWidget = document.getElementById("dash-total-orders");
    if (ordersWidget) ordersWidget.textContent = todayOrders.length;
  },

  // Renders full Reports and Analytics section
  renderReportsPage() {
    app.enforcePermission("reports");

    const startStr = document.getElementById("report-filter-start").value;
    const endStr = document.getElementById("report-filter-end").value;

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => o.status === "completed" && (currentBranch === "all" || o.branchId === currentBranch));
    const categories = db.get("categories");
    
    const filteredOrders = orders.filter(o => {
      const orderDate = o.createdAt.slice(0, 10);
      return orderDate >= startStr && orderDate <= endStr;
    });

    // 1. Calculate General Metrics
    const totalRev = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    document.getElementById("report-total-revenue").textContent = app.formatCurrency(totalRev);
    document.getElementById("report-total-orders").textContent = filteredOrders.length;

    // 2. Revenue split by Type
    let dineInSales = 0, takeawaySales = 0, deliverySales = 0;
    filteredOrders.forEach(o => {
      if (o.type === "dine_in") dineInSales += o.total;
      if (o.type === "takeaway") takeawaySales += o.total;
      if (o.type === "delivery") deliverySales += o.total;
    });

    document.getElementById("report-revenue-types").innerHTML = `
      Dine-In: <strong>${app.formatCurrency(dineInSales)}</strong><br>
      Takeaway: <strong>${app.formatCurrency(takeawaySales)}</strong><br>
      Delivery: <strong>${app.formatCurrency(deliverySales)}</strong>
    `;

    // 3. Compile Top-Selling Items
    const itemSales = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        if (!itemSales[item.itemId]) {
          itemSales[item.itemId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        itemSales[item.itemId].quantity += item.quantity;
        itemSales[item.itemId].revenue += item.price * item.quantity;
      });
    });

    const menu = db.get("menu");
    const sortedItems = Object.keys(itemSales)
      .map(id => {
        const itemInfo = menu.find(m => m.id === id);
        const cat = itemInfo ? categories.find(c => c.id === itemInfo.categoryId) : null;
        return {
          id,
          name: itemSales[id].name,
          category: cat ? cat.name : "Uncategorized",
          quantity: itemSales[id].quantity,
          revenue: itemSales[id].revenue
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    const tableBody = document.querySelector("#report-top-items-table tbody");
    tableBody.innerHTML = "";

    if (sortedItems.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--text-muted); padding:1rem;">No items sold.</td></tr>`;
    } else {
      sortedItems.slice(0, 5).forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight:600;">${item.name}</td>
          <td>${item.category}</td>
          <td style="font-weight:700;">${item.quantity} units</td>
          <td style="font-weight:700; color:var(--color-primary);">${app.formatCurrency(item.revenue)}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

    this.renderIntervalChart(startStr, endStr, filteredOrders);
  },

  renderIntervalChart(startStr, endStr, filteredOrders) {
    const canvas = document.getElementById("reports-breakdown-chart");
    if (!canvas) return;

    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const labels = [];
    const totals = [];

    const step = Math.max(1, Math.floor(diffDays / 10));

    for (let i = 0; i < diffDays; i += step) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().slice(0, 10);
      
      labels.push(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
      
      const dateTotal = filteredOrders
        .filter(o => o.createdAt.slice(0, 10) === dateString)
        .reduce((sum, o) => sum + o.total, 0);
      totals.push(dateTotal);
    }

    this.drawCanvasChart(canvas, labels, totals);
  },

  drawCanvasChart(canvas, labels, values) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 220;
    
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    if (values.length === 0 || Math.max(...values) === 0) {
      ctx.font = "500 13px Outfit, sans-serif";
      ctx.fillStyle = "var(--text-muted)";
      ctx.textAlign = "center";
      ctx.fillText("No financial data recorded for this range.", width / 2, height / 2);
      return;
    }

    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 25;
    const paddingBottom = 35;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    
    const maxVal = Math.max(...values);
    const maxValScaled = maxVal * 1.15;

    const gridLines = 4;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.font = "500 9px Inter, sans-serif";
    ctx.fillStyle = "var(--text-muted)";
    ctx.textAlign = "right";

    for (let i = 0; i <= gridLines; i++) {
      const lineVal = (maxValScaled / gridLines) * i;
      const yCoor = height - paddingBottom - (plotHeight / gridLines) * i;

      ctx.beginPath();
      ctx.moveTo(paddingLeft, yCoor);
      ctx.lineTo(width - paddingRight, yCoor);
      ctx.stroke();

      ctx.fillText(Math.round(lineVal), paddingLeft - 8, yCoor + 3);
    }

    const barCount = values.length;
    const barSpacing = Math.max(8, plotWidth / (barCount * 4));
    const barWidth = (plotWidth - (barSpacing * (barCount - 1))) / barCount;

    labels.forEach((label, idx) => {
      const val = values[idx];
      const barHeight = (val / maxValScaled) * plotHeight;
      const xCoor = paddingLeft + idx * (barWidth + barSpacing);
      const yCoor = height - paddingBottom - barHeight;

      const grad = ctx.createLinearGradient(xCoor, yCoor, xCoor, yCoor + barHeight);
      grad.addColorStop(0, "#6366f1");
      grad.addColorStop(1, "#818cf8");

      ctx.fillStyle = grad;
      
      if (barHeight > 0) {
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(xCoor, yCoor, barWidth, barHeight, [6, 6, 0, 0]);
        } else {
          ctx.rect(xCoor, yCoor, barWidth, barHeight);
        }
        ctx.fill();
      }

      if (val > 0) {
        ctx.fillStyle = "var(--text-primary)";
        ctx.font = "700 9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(Math.round(val), xCoor + barWidth / 2, yCoor - 6);
      }

      ctx.fillStyle = "var(--text-muted)";
      ctx.font = "500 9px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, xCoor + barWidth / 2, height - paddingBottom + 16);
    });
  },

  exportSalesToCSV() {
    const startStr = document.getElementById("report-filter-start").value;
    const endStr = document.getElementById("report-filter-end").value;

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => o.status === "completed" && (currentBranch === "all" || o.branchId === currentBranch));
    
    const filtered = orders.filter(o => {
      const d = o.createdAt.slice(0, 10);
      return d >= startStr && d <= endStr;
    });

    if (filtered.length === 0) {
      app.showToast("No records found in range to export.", "warning");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order No,Date,Type,BranchId,Customer CRM,Subtotal,Tax Paid,Discount Applied,Net Total\r\n";

    filtered.forEach(o => {
      const line = [
        o.orderNo,
        new Date(o.createdAt).toLocaleDateString(),
        o.type,
        o.branchId,
        o.customerPhone || "Walk-in",
        o.subtotal.toFixed(2),
        o.tax.toFixed(2),
        o.discount.toFixed(2),
        o.total.toFixed(2)
      ].join(",");
      csvContent += line + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GrillDine_Sales_${startStr}_to_${endStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    app.showToast("CSV Sales export download completed!", "success");
  }
};

ReportsModule.init();
