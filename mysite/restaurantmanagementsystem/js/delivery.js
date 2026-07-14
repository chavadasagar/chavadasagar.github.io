/**
 * delivery.js - Home Delivery Agents allocation & tracking logs (Multi-branch & Permissions updated)
 */

const DeliveryModule = {
  init() {
    window.addEventListener("render-section:delivery", () => this.renderDeliveryTable());
  },

  // Renders the delivery orders listing
  renderDeliveryTable() {
    app.enforcePermission("delivery");

    const tableBody = document.querySelector("#delivery-tracking-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => currentBranch === "all" || o.branchId === currentBranch);
    const staff = db.get("staff");
    const branches = db.get("branches");

    // Select delivery-type orders
    const deliveryOrders = orders.filter(o => o.type === "delivery");

    if (deliveryOrders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted); padding:2rem;">No home delivery orders registered.</td></tr>`;
      return;
    }

    const hasFullAccess = app.checkPermission("delivery", "full");

    deliveryOrders.forEach(ord => {
      const agent = staff.find(s => s.id === ord.deliveryAgentId);
      const agentName = agent ? agent.name : '<span style="color:var(--color-danger); font-weight:700;">Unassigned</span>';

      let timestampLog = "";
      if (ord.deliveryTimestamps) {
        const ts = ord.deliveryTimestamps;
        if (ts.assignedAt) timestampLog += `Assigned: ${new Date(ts.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br>`;
        if (ts.pickedUpAt) timestampLog += `Picked Up: ${new Date(ts.pickedUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br>`;
        if (ts.deliveredAt) timestampLog += `Delivered: ${new Date(ts.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        timestampLog = '<span style="color:var(--text-muted);">No records</span>';
      }

      // If "All Branches" view, add branch name label
      const branch = branches.find(b => b.id === ord.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      let actionColumn = "";
      const currentRole = app.currentUser ? app.currentUser.role : '';
      const isAdminOrManager = this.isAdminOrManagerRole(currentRole);
      const isAgentHimself = app.currentUser && app.currentUser.id === ord.deliveryAgentId;

      if (!ord.deliveryAgentId) {
        if (isAdminOrManager && hasFullAccess) {
          actionColumn = `<button class="btn btn-primary btn-sm btn-assign-agent">Assign Agent</button>`;
        } else {
          actionColumn = '<span style="color:var(--text-muted);">Unassigned</span>';
        }
      } else {
        if (ord.deliveryStatus === "assigned") {
          if ((isAgentHimself || isAdminOrManager) && hasFullAccess) {
            actionColumn = `<button class="btn btn-warning btn-sm btn-pick-up">Mark Picked Up</button>`;
          } else {
            actionColumn = '<span style="color:var(--text-secondary);">Agent assigned</span>';
          }
        } else if (ord.deliveryStatus === "picked_up") {
          if ((isAgentHimself || isAdminOrManager) && hasFullAccess) {
            actionColumn = `<button class="btn btn-success btn-sm btn-deliver">Mark Delivered</button>`;
          } else {
            actionColumn = '<span style="color:var(--color-primary); font-weight:600;">Out for Delivery</span>';
          }
        } else if (ord.deliveryStatus === "delivered") {
          actionColumn = '<span class="badge badge-success">Delivered</span>';
        }
      }

      let badgeType = "neutral";
      if (ord.deliveryStatus === "assigned") badgeType = "info";
      if (ord.deliveryStatus === "picked_up") badgeType = "warning";
      if (ord.deliveryStatus === "delivered") badgeType = "success";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:700;">${ord.orderNo}</td>
        <td>${agentName}</td>
        <td style="font-size:0.85rem;">
          Phone: ${ord.customerPhone || 'Walk-in'}<br>
          <span style="color:var(--text-secondary);">Total: ${app.formatCurrency(ord.total)}</span>
          ${branchBadge}
        </td>
        <td><span class="badge badge-${badgeType}">${ord.deliveryStatus || 'Pending'}</span></td>
        <td style="font-size:0.75rem; line-height:1.4; color:var(--text-secondary);">${timestampLog}</td>
        <td>${actionColumn}</td>
      `;

      if (hasFullAccess) {
        const assignBtn = tr.querySelector(".btn-assign-agent");
        if (assignBtn) {
          assignBtn.addEventListener("click", () => this.openAssignAgentModal(ord));
        }

        const pickupBtn = tr.querySelector(".btn-pick-up");
        if (pickupBtn) {
          pickupBtn.addEventListener("click", () => {
            db.update("orders", ord.id, {
              deliveryStatus: "picked_up",
              deliveryTimestamps: { ...ord.deliveryTimestamps, pickedUpAt: new Date().toISOString() }
            });
            app.showToast(`Order ${ord.orderNo} picked up!`, "info");
            this.renderDeliveryTable();
          });
        }

        const deliverBtn = tr.querySelector(".btn-deliver");
        if (deliverBtn) {
          deliverBtn.addEventListener("click", () => {
            db.update("orders", ord.id, {
              deliveryStatus: "delivered",
              deliveryTimestamps: { ...ord.deliveryTimestamps, deliveredAt: new Date().toISOString() }
            });
            app.showToast(`Order ${ord.orderNo} delivered!`, "success");
            this.renderDeliveryTable();
          });
        }
      }

      tableBody.appendChild(tr);
    });
  },

  isAdminOrManagerRole(roleId) {
    // Check if role is admin or has branches full access
    if (roleId === "role_admin" || roleId === "role_manager") return true;
    return false;
  },

  openAssignAgentModal(ord) {
    const staff = db.get("staff");
    // Show active delivery staff from the order's branch
    const deliveryAgents = staff.filter(s => s.branchId === ord.branchId && s.role === "role_delivery" && s.isActive);

    if (deliveryAgents.length === 0) {
      app.showToast("No active delivery agents at this branch. Add them in Staff directory.", "warning");
      return;
    }

    const modalHTML = `
      <div class="modal-header">
        <h3>Assign Delivery Agent: ${ord.orderNo}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <form id="assign-agent-form">
          <div class="form-group">
            <label class="form-label">Choose Delivery Staff</label>
            <select id="assign-agent-select" class="form-control">
              ${deliveryAgents.map(a => `<option value="${a.id}">${a.name} (${a.phone})</option>`).join('')}
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-assign-agent">Assign Agent</button>
      </div>
    `;

    app.showModal(modalHTML);

    document.getElementById("btn-submit-assign-agent").addEventListener("click", () => {
      const agentId = document.getElementById("assign-agent-select").value;
      const agent = deliveryAgents.find(a => a.id === agentId);
      
      if (agent) {
        db.update("orders", ord.id, {
          deliveryAgentId: agent.id,
          deliveryStatus: "assigned",
          deliveryTimestamps: { assignedAt: new Date().toISOString() }
        });
        app.showToast(`Assigned ${agent.name} to order ${ord.orderNo}.`, "success");
      }

      app.closeModal();
      this.renderDeliveryTable();
    });
  }
};

DeliveryModule.init();
