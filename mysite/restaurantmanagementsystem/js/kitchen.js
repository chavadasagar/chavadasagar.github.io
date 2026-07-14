/**
 * kitchen.js - KOT Kitchen Board (Multi-branch & Permissions updated)
 */

const KitchenModule = {
  previousOrderKeys: [],

  init() {
    window.addEventListener("render-section:kitchen", () => this.renderKitchenBoard());
    
    // Set periodic timer to refresh elapsed durations
    setInterval(() => {
      const activeSec = document.getElementById("section-kitchen").classList.contains("active");
      if (activeSec) {
        this.renderKitchenBoard(false);
      }
    }, 15000);

    // Watch for updates
    window.addEventListener("db-updated:orders", () => {
      const activeSec = document.getElementById("section-kitchen").classList.contains("active");
      if (activeSec) {
        this.renderKitchenBoard();
      }
    });
  },

  playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn("Chime play blocked.", e);
    }
  },

  // Renders active KOT columns
  renderKitchenBoard(triggerSound = true) {
    app.enforcePermission("kitchen");

    const listNew = document.getElementById("kitchen-list-new");
    const listPrep = document.getElementById("kitchen-list-preparing");
    const listReady = document.getElementById("kitchen-list-ready");

    listNew.innerHTML = "";
    listPrep.innerHTML = "";
    listReady.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => currentBranch === "all" || o.branchId === currentBranch);
    const tables = db.get("tables");
    const branches = db.get("branches");

    // Filter to active cooking tickets (pending, preparing, ready)
    const activeOrders = orders.filter(o => ["pending", "preparing", "ready"].includes(o.status));
    
    // Play sound if a new order arrives or quantities are edited/added
    const currentOrderKeys = activeOrders.map(o => `${o.id}_${o.items.reduce((sum, item) => sum + item.quantity, 0)}`);
    const newAddition = currentOrderKeys.some(key => !this.previousOrderKeys.includes(key));
    
    if (newAddition && triggerSound && this.previousOrderKeys.length > 0) {
      this.playChime();
    }
    this.previousOrderKeys = currentOrderKeys;

    let counts = { pending: 0, preparing: 0, ready: 0 };
    const hasFullAccess = app.checkPermission("kitchen", "full");

    activeOrders.forEach(ord => {
      let sourceLabel = "";
      if (ord.type === "dine_in") {
        const tbl = tables.find(t => t.id === ord.tableId);
        sourceLabel = tbl ? tbl.number : 'Table';
      } else if (ord.type === "takeaway") {
        sourceLabel = "Takeaway";
      } else if (ord.type === "delivery") {
        sourceLabel = "Delivery";
      }

      // Add branch badge label
      const branch = branches.find(b => b.id === ord.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<span style="font-size:0.7rem; font-weight:600; display:block; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      const createdTime = new Date(ord.createdAt);
      const elapsedMins = Math.floor((Date.now() - createdTime.getTime()) / 60000);
      const timeLabel = elapsedMins <= 0 ? 'Just now' : `${elapsedMins}m ago`;

      const ticket = document.createElement("div");
      ticket.className = `kot-ticket kot-${ord.status}`;
      
      const itemsListHTML = ord.items.map(item => `
        <li class="kot-item-row">
          <span class="kot-item-name">${item.name}</span>
          <span class="kot-item-qty">x${item.quantity}</span>
        </li>
      `).join('');

      let actionBtn = "";
      if (ord.status === "pending") {
        counts.pending++;
        if (hasFullAccess) {
          actionBtn = `<button class="btn btn-warning btn-sm w-100 btn-action" style="font-weight:700;">Start Preparing</button>`;
        }
      } else if (ord.status === "preparing") {
        counts.preparing++;
        if (hasFullAccess) {
          actionBtn = `<button class="btn btn-success btn-sm w-100 btn-action" style="font-weight:700;">Mark Ready</button>`;
        }
      } else if (ord.status === "ready") {
        counts.ready++;
        if (hasFullAccess) {
          if (ord.type === "dine_in") {
            actionBtn = `<button class="btn btn-primary btn-sm w-100 btn-action" style="font-weight:700;">Mark Served</button>`;
          } else {
            actionBtn = `<button class="btn btn-secondary btn-sm w-100 btn-action" style="font-weight:700;">Dismiss KOT</button>`;
          }
        }
      }

      ticket.innerHTML = `
        <div class="kot-header">
          <div class="kot-number">${ord.orderNo}</div>
          <div class="kot-meta">
            <strong>${sourceLabel}</strong>
            ${branchBadge}
            <span>${timeLabel}</span>
          </div>
        </div>
        <ul class="kot-items-list">
          ${itemsListHTML}
        </ul>
        <div class="kot-footer">
          ${actionBtn ? actionBtn : '<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No cooking actions</span>'}
        </div>
      `;

      if (hasFullAccess) {
        const btn = ticket.querySelector(".btn-action");
        if (btn) {
          btn.addEventListener("click", () => this.advanceOrderStatus(ord));
        }
      }

      if (ord.status === "pending") {
        listNew.appendChild(ticket);
      } else if (ord.status === "preparing") {
        listPrep.appendChild(ticket);
      } else if (ord.status === "ready") {
        listReady.appendChild(ticket);
      }
    });

    document.getElementById("kot-count-new").textContent = counts.pending;
    document.getElementById("kot-count-preparing").textContent = counts.preparing;
    document.getElementById("kot-count-ready").textContent = counts.ready;

    const activeBadge = document.getElementById("dash-active-kots");
    if (activeBadge) {
      activeBadge.textContent = counts.pending + counts.preparing;
    }
  },

  advanceOrderStatus(ord) {
    let nextStatus = "";
    let toastMsg = "";

    if (ord.status === "pending") {
      nextStatus = "preparing";
      toastMsg = `Kitchen started preparing ${ord.orderNo}`;
    } else if (ord.status === "preparing") {
      nextStatus = "ready";
      toastMsg = `Order ${ord.orderNo} is Ready to Serve!`;
    } else if (ord.status === "ready") {
      nextStatus = "served";
      toastMsg = `Order ${ord.orderNo} has been served.`;
    }

    if (nextStatus) {
      db.update("orders", ord.id, { status: nextStatus });
      app.showToast(toastMsg, "success");
      this.renderKitchenBoard();
    }
  }
};

KitchenModule.init();
