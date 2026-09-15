(() => {
  const KEYS = {
    USERS: "sf_users_v1",
    STOCK: "sf_stock_v1",
    REQUESTS: "sf_requests_v1",
    SESSION: "sf_session_v1"
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  let currentUser = null;
  let activePage = "dashboard";

  function id(prefix = "ID") {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function nowIso() { return new Date().toISOString(); }

  function fmtDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function todayLabel() {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric"
    });
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function get(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function seed() {
    if (!localStorage.getItem(KEYS.USERS)) {
      set(KEYS.USERS, [
        { id: "USR-ADMIN", username: "admin", password: "admin123", name: "Admin User", role: "admin", location: "Head Office" },
        { id: "USR-PUNE", username: "pune", password: "pune123", name: "Pune User", role: "requester", location: "Pune" },
        { id: "USR-APPROVER", username: "approver", password: "approve123", name: "Approver User", role: "approver", location: "Head Office" }
      ]);
    }

    if (!localStorage.getItem(KEYS.STOCK)) {
      const created = nowIso();
      set(KEYS.STOCK, [
        { id: "ITM-1001", name: "Dell Keyboard", sku: "KB-DELL-01", category: "Computer Accessory", qty: 35, minQty: 10, unit: "pcs", createdAt: created, updatedAt: created },
        { id: "ITM-1002", name: "Wireless Mouse", sku: "MS-WL-02", category: "Computer Accessory", qty: 24, minQty: 8, unit: "pcs", createdAt: created, updatedAt: created },
        { id: "ITM-1003", name: "A4 Paper Rim", sku: "PPR-A4-01", category: "Stationery", qty: 60, minQty: 15, unit: "rim", createdAt: created, updatedAt: created },
        { id: "ITM-1004", name: "Blue Ball Pen", sku: "PEN-BLU-01", category: "Stationery", qty: 120, minQty: 30, unit: "pcs", createdAt: created, updatedAt: created }
      ]);
    }

    if (!localStorage.getItem(KEYS.REQUESTS)) {
      const stock = get(KEYS.STOCK);
      set(KEYS.REQUESTS, [
        {
          id: "REQ-1001", itemId: stock[0]?.id, itemName: stock[0]?.name, sku: stock[0]?.sku,
          qty: 2, requesterId: "USR-PUNE", requesterName: "Pune User", location: "Pune",
          purpose: "Need for newly joined employees.", status: "Pending", reason: "",
          createdAt: nowIso(), reviewedAt: null, reviewedBy: null,
          history: [{ status: "Pending", by: "Pune User", at: nowIso(), note: "Request submitted." }]
        }
      ]);
    }
  }

  function roleLabel(role) {
    return ({ admin: "Admin", requester: "Pune Requester", approver: "Approver" })[role] || role;
  }

  function avatarClass(role) {
    return role === "admin" ? "admin" : role === "requester" ? "pune" : "approver";
  }

  function showToast(message, type = "success") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    $("#toastContainer").appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  function showLogin() {
    $("#loginScreen").classList.remove("hidden");
    $("#appShell").classList.add("hidden");
  }

  function showApp() {
    $("#loginScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    $("#todayChip").textContent = todayLabel();
    $("#sidebarName").textContent = currentUser.name;
    $("#sidebarRole").textContent = roleLabel(currentUser.role);
    $("#topUserName").textContent = currentUser.name;
    $("#topUserRole").textContent = roleLabel(currentUser.role);

    ["sidebarAvatar", "topAvatar"].forEach(id => {
      const el = document.getElementById(id);
      el.textContent = currentUser.name.split(" ").map(x => x[0]).join("").slice(0, 2);
      el.className = `avatar ${avatarClass(currentUser.role)}`;
    });

    buildNav();
    navigate("dashboard");
  }

  function buildNav() {
    const common = [{ page: "dashboard", label: "Dashboard", icon: "▦" }];
    const byRole = {
      admin: [
        { page: "stock", label: "Stock Management", icon: "▣" },
        { page: "requests", label: "All Requests", icon: "≣" }
      ],
      requester: [
        { page: "new-request", label: "Request Item", icon: "＋" },
        { page: "my-requests", label: "My Requests", icon: "⌁" },
        { page: "stock-view", label: "Available Stock", icon: "▣" }
      ],
      approver: [
        { page: "approvals", label: "Pending Approvals", icon: "✓" },
        { page: "requests", label: "All Requests", icon: "≣" },
        { page: "stock-view", label: "Stock Reference", icon: "▣" }
      ]
    };

    $("#sidebarNav").innerHTML = [...common, ...byRole[currentUser.role]]
      .map(x => `<button class="nav-item" data-page="${x.page}"><span class="nav-icon">${x.icon}</span>${x.label}</button>`).join("");

    $$("#sidebarNav .nav-item").forEach(btn => btn.addEventListener("click", () => {
      navigate(btn.dataset.page);
      $(".sidebar").classList.remove("open");
    }));
  }

  function navigate(page) {
    activePage = page;
    $$("#sidebarNav .nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));

    const titles = {
      dashboard: ["OVERVIEW", "Dashboard"],
      stock: ["INVENTORY", "Stock Management"],
      requests: ["REQUESTS", "All Requests"],
      "new-request": ["NEW REQUEST", "Request an Item"],
      "my-requests": ["REQUESTS", "My Requests"],
      "stock-view": ["INVENTORY", "Available Stock"],
      approvals: ["APPROVAL QUEUE", "Pending Approvals"]
    };
    $("#pageEyebrow").textContent = titles[page]?.[0] || "STOCKFLOW";
    $("#pageTitle").textContent = titles[page]?.[1] || "StockFlow";

    const renderers = {
      dashboard: renderDashboard,
      stock: renderStockManagement,
      requests: () => renderRequests(false),
      "new-request": renderNewRequest,
      "my-requests": () => renderRequests(true),
      "stock-view": renderStockView,
      approvals: renderApprovals
    };
    (renderers[page] || renderDashboard)();
  }

  function counts() {
    const stock = get(KEYS.STOCK);
    const requests = get(KEYS.REQUESTS);
    return {
      items: stock.length,
      totalQty: stock.reduce((s, x) => s + Number(x.qty || 0), 0),
      pending: requests.filter(x => x.status === "Pending").length,
      approved: requests.filter(x => x.status === "Approved").length,
      rejected: requests.filter(x => x.status === "Rejected").length,
      low: stock.filter(x => Number(x.qty) <= Number(x.minQty)).length
    };
  }

  function stat(label, value, icon, note) {
    return `<div class="stat-card">
      <div class="stat-top"><div><p>${label}</p><h3>${value}</h3><p>${note}</p></div><span class="stat-icon">${icon}</span></div>
    </div>`;
  }

  function renderDashboard() {
    const c = counts();
    const requests = get(KEYS.REQUESTS);
    let visible = requests;
    if (currentUser.role === "requester") visible = requests.filter(x => x.requesterId === currentUser.id);

    $("#pageContent").innerHTML = `
      <div class="stats-grid">
        ${stat("Stock Items", c.items, "▣", `${c.totalQty} total units`)}
        ${stat("Pending Requests", currentUser.role === "requester" ? visible.filter(x => x.status === "Pending").length : c.pending, "◷", "Waiting for decision")}
        ${stat("Approved", currentUser.role === "requester" ? visible.filter(x => x.status === "Approved").length : c.approved, "✓", "Successfully processed")}
        ${stat(currentUser.role === "admin" ? "Low Stock" : "Rejected", currentUser.role === "admin" ? c.low : visible.filter(x => x.status === "Rejected").length, currentUser.role === "admin" ? "!" : "×", currentUser.role === "admin" ? "Items at/below minimum" : "Declined requests")}
      </div>
      <div class="content-grid">
        <div class="panel">
          <div class="panel-head"><div><h3>Recent Requests</h3><p>Latest stock request activity</p></div></div>
          ${requestTable(visible.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6), { compact: true })}
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Quick Summary</h3><p>Current workflow status</p></div></div>
          <div class="quick-list">
            <div class="quick-item"><div><strong>${c.totalQty} units</strong><small>Current total stock</small></div><span>📦</span></div>
            <div class="quick-item"><div><strong>${c.pending} requests</strong><small>Need approval</small></div><span>⏳</span></div>
            <div class="quick-item"><div><strong>${c.low} items</strong><small>Low stock alert</small></div><span>⚠️</span></div>
          </div>
          <div class="kpi-note">${dashboardHint()}</div>
        </div>
      </div>`;
    bindRequestDetails();
  }

  function dashboardHint() {
    if (currentUser.role === "admin") return "Admin can add new stock, adjust quantity, edit item details and monitor all requests.";
    if (currentUser.role === "requester") return "Create a request only for the quantity you need. Approval status and rejection reason will be visible in My Requests.";
    return "Approving a request automatically deducts requested quantity from current stock. Rejected requests do not affect stock.";
  }

  function renderStockManagement() {
    const stock = get(KEYS.STOCK);
    $("#pageContent").innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div><h3>Stock Items</h3><p>Add and maintain inventory.</p></div>
          <button id="addStockBtn" class="btn btn-primary">+ Add Stock Item</button>
        </div>
        <div class="toolbar" style="margin-bottom:14px">
          <input id="stockSearch" placeholder="Search item / SKU..." />
          <select id="stockFilter">
            <option value="all">All Stock</option>
            <option value="low">Low Stock</option>
          </select>
        </div>
        <div id="stockTableHost">${stockTable(stock, true)}</div>
      </div>`;
    $("#addStockBtn").onclick = () => openStockModal();
    $("#stockSearch").oninput = applyStockFilter;
    $("#stockFilter").onchange = applyStockFilter;
    bindStockActions();
  }

  function applyStockFilter() {
    const term = $("#stockSearch").value.trim().toLowerCase();
    const filter = $("#stockFilter").value;
    let stock = get(KEYS.STOCK);
    stock = stock.filter(x =>
      (!term || [x.name,x.sku,x.category].some(v => String(v).toLowerCase().includes(term))) &&
      (filter !== "low" || Number(x.qty) <= Number(x.minQty))
    );
    $("#stockTableHost").innerHTML = stockTable(stock, true);
    bindStockActions();
  }

  function stockTable(stock, editable = false) {
    if (!stock.length) return empty("📦", "No stock items found.");
    return `<div class="table-wrap"><table>
      <thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Available</th><th>Minimum</th><th>Status</th>${editable ? "<th>Action</th>" : ""}</tr></thead>
      <tbody>${stock.map(x => `
        <tr>
          <td><div class="item-cell"><span class="item-icon">📦</span><div><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.unit)}</small></div></div></td>
          <td>${escapeHtml(x.sku)}</td>
          <td>${escapeHtml(x.category)}</td>
          <td><strong>${x.qty}</strong> ${escapeHtml(x.unit)}</td>
          <td>${x.minQty}</td>
          <td>${Number(x.qty)<=Number(x.minQty) ? '<span class="badge low">Low Stock</span>' : '<span class="badge active">In Stock</span>'}</td>
          ${editable ? `<td><div class="actions">
            <button class="btn btn-secondary btn-sm stock-edit" data-id="${x.id}">Edit</button>
            <button class="btn btn-success btn-sm stock-adjust" data-id="${x.id}">Adjust</button>
            <button class="btn btn-danger btn-sm stock-delete" data-id="${x.id}">Delete</button>
          </div></td>` : ""}
        </tr>`).join("")}
      </tbody></table></div>`;
  }

  function renderStockView() {
    const stock = get(KEYS.STOCK);
    $("#pageContent").innerHTML = `
      <div class="panel">
        <div class="panel-head"><div><h3>Available Inventory</h3><p>Reference stock before creating or reviewing requests.</p></div></div>
        ${stockTable(stock, false)}
      </div>`;
  }

  function bindStockActions() {
    $$(".stock-edit").forEach(b => b.onclick = () => openStockModal(b.dataset.id));
    $$(".stock-adjust").forEach(b => b.onclick = () => openAdjustModal(b.dataset.id));
    $$(".stock-delete").forEach(b => b.onclick = () => {
      const requests = get(KEYS.REQUESTS);
      if (requests.some(r => r.itemId === b.dataset.id && r.status === "Pending")) {
        return showToast("Pending request exists for this item. Cannot delete.", "error");
      }
      if (!confirm("Delete this stock item?")) return;
      set(KEYS.STOCK, get(KEYS.STOCK).filter(x => x.id !== b.dataset.id));
      showToast("Stock item deleted.");
      renderStockManagement();
    });
  }

  function openStockModal(itemId = null) {
    const item = get(KEYS.STOCK).find(x => x.id === itemId);
    openModal(item ? "EDIT ITEM" : "ADD ITEM", item ? "Edit Stock Item" : "Add Stock Item", `
      <form id="stockForm" class="form-grid">
        <label>Item Name<input id="itemName" required value="${escapeHtml(item?.name || "")}"></label>
        <label>SKU<input id="itemSku" required value="${escapeHtml(item?.sku || "")}"></label>
        <label>Category<input id="itemCategory" required value="${escapeHtml(item?.category || "")}" placeholder="Stationery"></label>
        <label>Unit<select id="itemUnit"><option>pcs</option><option>box</option><option>rim</option><option>pack</option><option>unit</option></select></label>
        <label>Opening Quantity<input id="itemQty" type="number" min="0" required value="${item?.qty ?? 0}"></label>
        <label>Minimum Quantity<input id="itemMinQty" type="number" min="0" required value="${item?.minQty ?? 0}"></label>
        <div class="full"><button class="btn btn-primary btn-block" type="submit">${item ? "Save Changes" : "Add Item"}</button></div>
      </form>`);
    $("#itemUnit").value = item?.unit || "pcs";

    $("#stockForm").onsubmit = e => {
      e.preventDefault();
      const stock = get(KEYS.STOCK);
      const sku = $("#itemSku").value.trim();
      if (stock.some(x => x.sku.toLowerCase() === sku.toLowerCase() && x.id !== itemId)) {
        return showToast("SKU already exists.", "error");
      }
      const payload = {
        name: $("#itemName").value.trim(),
        sku,
        category: $("#itemCategory").value.trim(),
        unit: $("#itemUnit").value,
        qty: Number($("#itemQty").value),
        minQty: Number($("#itemMinQty").value),
        updatedAt: nowIso()
      };
      if (item) Object.assign(item, payload);
      else stock.push({ id: id("ITM"), ...payload, createdAt: nowIso() });
      set(KEYS.STOCK, stock);
      closeModal();
      showToast(item ? "Stock item updated." : "Stock item added.");
      renderStockManagement();
    };
  }

  function openAdjustModal(itemId) {
    const stock = get(KEYS.STOCK);
    const item = stock.find(x => x.id === itemId);
    if (!item) return;
    openModal("ADJUST STOCK", item.name, `
      <div class="request-summary"><div><small>Current Qty</small><strong>${item.qty} ${escapeHtml(item.unit)}</strong></div><div><small>SKU</small><strong>${escapeHtml(item.sku)}</strong></div></div>
      <form id="adjustForm" class="form-stack">
        <label>Adjustment Type<select id="adjustType"><option value="add">Add Stock</option><option value="remove">Remove Stock</option><option value="set">Set Exact Quantity</option></select></label>
        <label>Quantity<input id="adjustQty" type="number" min="0" required></label>
        <button class="btn btn-primary" type="submit">Update Quantity</button>
      </form>`);
    $("#adjustForm").onsubmit = e => {
      e.preventDefault();
      const qty = Number($("#adjustQty").value);
      const type = $("#adjustType").value;
      let newQty = Number(item.qty);
      if (type === "add") newQty += qty;
      if (type === "remove") newQty -= qty;
      if (type === "set") newQty = qty;
      if (newQty < 0) return showToast("Stock cannot become negative.", "error");
      item.qty = newQty;
      item.updatedAt = nowIso();
      set(KEYS.STOCK, stock);
      closeModal();
      showToast("Stock quantity updated.");
      renderStockManagement();
    };
  }

  function renderNewRequest() {
    const stock = get(KEYS.STOCK).filter(x => Number(x.qty) > 0);
    $("#pageContent").innerHTML = `
      <div class="content-grid">
        <div class="panel">
          <div class="panel-head"><div><h3>Create Stock Request</h3><p>Submit an item request for approval.</p></div></div>
          <form id="requestForm" class="form-grid">
            <label class="full">Item
              <select id="requestItem" required>
                <option value="">Select item</option>
                ${stock.map(x => `<option value="${x.id}">${escapeHtml(x.name)} — ${x.qty} ${escapeHtml(x.unit)} available</option>`).join("")}
              </select>
            </label>
            <label>Quantity<input id="requestQty" type="number" min="1" required placeholder="1"></label>
            <label>Location<input value="${escapeHtml(currentUser.location)}" disabled></label>
            <label class="full">Purpose / Note<textarea id="requestPurpose" required placeholder="Why do you need this item?"></textarea></label>
            <div class="full"><button class="btn btn-primary" type="submit">Submit Request</button></div>
          </form>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Request Rules</h3><p>Before you submit</p></div></div>
          <div class="quick-list">
            <div class="quick-item"><div><strong>Pending first</strong><small>Every new request goes to approver.</small></div><span>⏳</span></div>
            <div class="quick-item"><div><strong>Approval deducts stock</strong><small>Stock changes only when approved.</small></div><span>📦</span></div>
            <div class="quick-item"><div><strong>Reason is mandatory</strong><small>Approver adds remarks for both decisions.</small></div><span>📝</span></div>
          </div>
        </div>
      </div>`;

    $("#requestForm").onsubmit = e => {
      e.preventDefault();
      const item = get(KEYS.STOCK).find(x => x.id === $("#requestItem").value);
      const qty = Number($("#requestQty").value);
      if (!item) return showToast("Select a valid item.", "error");
      if (qty <= 0) return showToast("Quantity must be greater than 0.", "error");
      if (qty > Number(item.qty)) return showToast(`Only ${item.qty} ${item.unit} currently available.`, "error");

      const requests = get(KEYS.REQUESTS);
      const createdAt = nowIso();
      requests.unshift({
        id: id("REQ"), itemId: item.id, itemName: item.name, sku: item.sku,
        qty, requesterId: currentUser.id, requesterName: currentUser.name,
        location: currentUser.location, purpose: $("#requestPurpose").value.trim(),
        status: "Pending", reason: "", createdAt, reviewedAt: null, reviewedBy: null,
        history: [{ status: "Pending", by: currentUser.name, at: createdAt, note: "Request submitted." }]
      });
      set(KEYS.REQUESTS, requests);
      showToast("Request submitted for approval.");
      navigate("my-requests");
    };
  }

  function renderRequests(myOnly) {
    let requests = get(KEYS.REQUESTS);
    if (myOnly) requests = requests.filter(x => x.requesterId === currentUser.id);
    requests.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

    $("#pageContent").innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div><h3>${myOnly ? "My Stock Requests" : "Request Register"}</h3><p>Track request status, quantity and decision reason.</p></div>
          ${myOnly ? '<button class="btn btn-primary" id="newReqShortcut">+ New Request</button>' : ""}
        </div>
        <div class="toolbar" style="margin-bottom:14px">
          <input id="requestSearch" placeholder="Search request / item..." />
          <select id="requestStatus">
            <option value="">All Status</option>
            <option>Pending</option><option>Approved</option><option>Rejected</option>
          </select>
        </div>
        <div id="requestTableHost">${requestTable(requests)}</div>
      </div>`;

    if ($("#newReqShortcut")) $("#newReqShortcut").onclick = () => navigate("new-request");
    $("#requestSearch").oninput = () => applyRequestFilter(myOnly);
    $("#requestStatus").onchange = () => applyRequestFilter(myOnly);
    bindRequestDetails();
  }

  function applyRequestFilter(myOnly) {
    const q = $("#requestSearch").value.trim().toLowerCase();
    const status = $("#requestStatus").value;
    let requests = get(KEYS.REQUESTS);
    if (myOnly) requests = requests.filter(x => x.requesterId === currentUser.id);
    requests = requests.filter(x =>
      (!q || [x.id,x.itemName,x.sku,x.requesterName].some(v => String(v).toLowerCase().includes(q))) &&
      (!status || x.status === status)
    );
    $("#requestTableHost").innerHTML = requestTable(requests);
    bindRequestDetails();
  }

  function requestTable(requests, opts = {}) {
    if (!requests.length) return empty("🧾", "No requests found.");
    return `<div class="table-wrap"><table>
      <thead><tr><th>Request</th><th>Item</th><th>Requester</th><th>Qty</th><th>Status</th><th>Requested On</th><th>Action</th></tr></thead>
      <tbody>${requests.map(r => `
        <tr>
          <td><strong>${escapeHtml(r.id)}</strong></td>
          <td><div class="item-cell"><span class="item-icon">📦</span><div><strong>${escapeHtml(r.itemName)}</strong><small>${escapeHtml(r.sku)}</small></div></div></td>
          <td>${escapeHtml(r.requesterName)}<br><span class="muted">${escapeHtml(r.location)}</span></td>
          <td><strong>${r.qty}</strong></td>
          <td>${statusBadge(r.status)}</td>
          <td>${fmtDate(r.createdAt)}</td>
          <td><button class="btn btn-secondary btn-sm request-detail" data-id="${r.id}">View</button></td>
        </tr>`).join("")}
      </tbody></table></div>`;
  }

  function renderApprovals() {
    const pending = get(KEYS.REQUESTS).filter(x => x.status === "Pending").sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    $("#pageContent").innerHTML = `
      <div class="panel">
        <div class="panel-head"><div><h3>Pending Approval Queue</h3><p>Oldest requests are shown first.</p></div><span class="badge pending">${pending.length} Pending</span></div>
        ${pending.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Request</th><th>Item</th><th>Requester</th><th>Qty</th><th>Available</th><th>Purpose</th><th>Action</th></tr></thead>
          <tbody>${pending.map(r => {
            const item = get(KEYS.STOCK).find(x => x.id === r.itemId);
            return `<tr>
              <td><strong>${escapeHtml(r.id)}</strong><br><span class="muted">${fmtDate(r.createdAt)}</span></td>
              <td>${escapeHtml(r.itemName)}<br><span class="muted">${escapeHtml(r.sku)}</span></td>
              <td>${escapeHtml(r.requesterName)}<br><span class="muted">${escapeHtml(r.location)}</span></td>
              <td><strong>${r.qty}</strong></td>
              <td>${item ? `<strong>${item.qty}</strong> ${escapeHtml(item.unit)}` : '<span class="badge rejected">Item missing</span>'}</td>
              <td>${escapeHtml(r.purpose)}</td>
              <td><div class="actions">
                <button class="btn btn-success btn-sm approve-btn" data-id="${r.id}">Approve</button>
                <button class="btn btn-danger btn-sm reject-btn" data-id="${r.id}">Reject</button>
                <button class="btn btn-secondary btn-sm request-detail" data-id="${r.id}">View</button>
              </div></td>
            </tr>`;
          }).join("")}</tbody></table></div>` : empty("✅", "No pending requests.")}
      </div>`;
    $$(".approve-btn").forEach(b => b.onclick = () => openDecisionModal(b.dataset.id, "Approved"));
    $$(".reject-btn").forEach(b => b.onclick = () => openDecisionModal(b.dataset.id, "Rejected"));
    bindRequestDetails();
  }

  function openDecisionModal(requestId, decision) {
    const request = get(KEYS.REQUESTS).find(x => x.id === requestId);
    const item = get(KEYS.STOCK).find(x => x.id === request?.itemId);
    if (!request) return;

    openModal(decision === "Approved" ? "APPROVE REQUEST" : "REJECT REQUEST", `${decision === "Approved" ? "Approve" : "Reject"} ${request.id}`, `
      <div class="request-summary">
        <div><small>Item</small><strong>${escapeHtml(request.itemName)}</strong></div>
        <div><small>Requested Qty</small><strong>${request.qty}</strong></div>
        <div><small>Requested By</small><strong>${escapeHtml(request.requesterName)}</strong></div>
        <div><small>Available Stock</small><strong>${item ? item.qty : "N/A"}</strong></div>
      </div>
      <form id="decisionForm" class="form-stack">
        <label>${decision === "Approved" ? "Approval Note / Reason" : "Rejection Reason"}
          <textarea id="decisionReason" required placeholder="${decision === "Approved" ? "Approved for office requirement." : "Mention why the request is rejected."}"></textarea>
        </label>
        <button class="btn ${decision === "Approved" ? "btn-primary" : "btn-danger"}" type="submit">Confirm ${decision}</button>
      </form>`);

    $("#decisionForm").onsubmit = e => {
      e.preventDefault();
      const reason = $("#decisionReason").value.trim();
      if (!reason) return showToast("Reason is required.", "error");

      const requests = get(KEYS.REQUESTS);
      const req = requests.find(x => x.id === requestId);
      if (!req || req.status !== "Pending") return showToast("Request is no longer pending.", "error");

      const stock = get(KEYS.STOCK);
      const stockItem = stock.find(x => x.id === req.itemId);

      if (decision === "Approved") {
        if (!stockItem) return showToast("Stock item no longer exists.", "error");
        if (Number(stockItem.qty) < Number(req.qty)) {
          return showToast(`Insufficient stock. Only ${stockItem.qty} available.`, "error");
        }
        stockItem.qty = Number(stockItem.qty) - Number(req.qty);
        stockItem.updatedAt = nowIso();
        set(KEYS.STOCK, stock);
      }

      req.status = decision;
      req.reason = reason;
      req.reviewedAt = nowIso();
      req.reviewedBy = currentUser.name;
      req.history = req.history || [];
      req.history.push({ status: decision, by: currentUser.name, at: req.reviewedAt, note: reason });
      set(KEYS.REQUESTS, requests);

      closeModal();
      showToast(`Request ${decision.toLowerCase()}.`);
      renderApprovals();
    };
  }

  function bindRequestDetails() {
    $$(".request-detail").forEach(b => b.onclick = () => openRequestDetail(b.dataset.id));
  }

  function openRequestDetail(requestId) {
    const r = get(KEYS.REQUESTS).find(x => x.id === requestId);
    if (!r) return;
    openModal("REQUEST DETAILS", r.id, `
      <div class="request-summary">
        <div><small>Item</small><strong>${escapeHtml(r.itemName)}</strong></div>
        <div><small>SKU</small><strong>${escapeHtml(r.sku)}</strong></div>
        <div><small>Quantity</small><strong>${r.qty}</strong></div>
        <div><small>Status</small>${statusBadge(r.status)}</div>
        <div><small>Requester</small><strong>${escapeHtml(r.requesterName)}</strong></div>
        <div><small>Location</small><strong>${escapeHtml(r.location)}</strong></div>
      </div>
      <label style="margin-bottom:16px">Purpose<textarea disabled>${escapeHtml(r.purpose)}</textarea></label>
      ${r.reason ? `<label style="margin-bottom:16px">Decision Reason<textarea disabled>${escapeHtml(r.reason)}</textarea></label>` : ""}
      <div>
        <p class="eyebrow">TIMELINE</p>
        <div class="timeline">
          ${(r.history || []).map(h => `<div class="timeline-row">
            <span class="timeline-dot">${h.status === "Approved" ? "✓" : h.status === "Rejected" ? "×" : "•"}</span>
            <div class="timeline-content"><strong>${escapeHtml(h.status)} · ${escapeHtml(h.by)}</strong><p>${fmtDate(h.at)} — ${escapeHtml(h.note || "")}</p></div>
          </div>`).join("")}
        </div>
      </div>`);
  }

  function statusBadge(status) {
    return `<span class="badge ${status.toLowerCase()}">${status}</span>`;
  }

  function empty(icon, text) {
    return `<div class="empty-state"><div class="emoji">${icon}</div><strong>${escapeHtml(text)}</strong></div>`;
  }

  function openModal(eyebrow, title, body) {
    $("#modalEyebrow").textContent = eyebrow;
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    $("#modalBackdrop").classList.remove("hidden");
  }

  function closeModal() {
    $("#modalBackdrop").classList.add("hidden");
    $("#modalBody").innerHTML = "";
  }

  function login(username, password) {
    const user = get(KEYS.USERS).find(x => x.username === username && x.password === password);
    if (!user) return showToast("Invalid username or password.", "error");
    currentUser = user;
    set(KEYS.SESSION, { userId: user.id });
    showApp();
    showToast(`Welcome, ${user.name}.`);
  }

  function logout() {
    localStorage.removeItem(KEYS.SESSION);
    currentUser = null;
    $("#loginForm").reset();
    showLogin();
  }

  function initEvents() {
    $("#loginForm").addEventListener("submit", e => {
      e.preventDefault();
      login($("#loginUsername").value.trim(), $("#loginPassword").value);
    });
    $$(".demo-user").forEach(btn => btn.addEventListener("click", () => {
      $("#loginUsername").value = btn.dataset.user;
      $("#loginPassword").value = btn.dataset.pass;
    }));
    $("#togglePassword").onclick = () => {
      const input = $("#loginPassword");
      input.type = input.type === "password" ? "text" : "password";
    };
    $("#logoutBtn").onclick = logout;
    $("#closeModalBtn").onclick = closeModal;
    $("#modalBackdrop").addEventListener("click", e => { if (e.target.id === "modalBackdrop") closeModal(); });
    $("#mobileMenuBtn").onclick = () => $(".sidebar").classList.toggle("open");
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  }

  seed();
  initEvents();
  const session = get(KEYS.SESSION, null);
  if (session?.userId) {
    currentUser = get(KEYS.USERS).find(x => x.id === session.userId);
  }
  currentUser ? showApp() : showLogin();
})();
