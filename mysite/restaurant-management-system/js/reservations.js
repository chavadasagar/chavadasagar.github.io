/**
 * reservations.js - Seating Bookings & conflicts checker (Multi-branch & Permissions updated)
 */

const ReservationsModule = {
  init() {
    window.addEventListener("render-section:reservations", () => this.renderReservations());

    const form = document.getElementById("reservation-crud-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const currentBranch = db.getCurrentBranch();
      if (currentBranch === "all") {
        app.showToast("Please select a specific branch to make reservations.", "warning");
        return;
      }
      this.saveReservation();
    });

    document.getElementById("btn-res-clear-edit").addEventListener("click", () => {
      this.resetReservationForm();
    });

    window.addEventListener("render-section:reservations", () => this.populateTablesSelect());
  },

  populateTablesSelect() {
    const select = document.getElementById("res-table-select");
    select.innerHTML = '<option value="">-- Select Table --</option>';

    const currentBranch = db.getCurrentBranch();
    const tables = db.get("tables").filter(t => currentBranch === "all" || t.branchId === currentBranch);
    
    tables.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.number} (Capacity: ${t.capacity} Pax)`;
      select.appendChild(opt);
    });
  },

  renderReservations() {
    app.enforcePermission("reservations");

    const tableBody = document.querySelector("#reservations-diary-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const reservations = db.get("reservations").filter(r => currentBranch === "all" || r.branchId === currentBranch);
    const tables = db.get("tables");
    const branches = db.get("branches");

    if (reservations.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted); padding: 2rem;">No reservations.</td></tr>`;
      return;
    }

    const sorted = [...reservations].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    const hasFullAccess = app.checkPermission("reservations", "full");

    sorted.forEach(res => {
      const tbl = tables.find(t => t.id === res.tableId);
      const bookingDate = new Date(res.dateTime);
      
      let badgeType = "neutral";
      if (res.status === "confirmed") badgeType = "success";
      if (res.status === "completed") badgeType = "info";
      if (res.status === "cancelled") badgeType = "neutral";
      if (res.status === "no-show") badgeType = "danger";

      const branch = branches.find(b => b.id === res.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong style="color:var(--text-primary);">${res.customerName}</strong> ${branchBadge}<br>
          <span style="font-size:0.8rem; color:var(--text-secondary);">${res.customerPhone}</span>
        </td>
        <td>
          <strong>${bookingDate.toLocaleDateString()}</strong><br>
          <span style="font-size:0.8rem; color:var(--text-secondary);">${bookingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </td>
        <td>${res.partySize} Pax</td>
        <td>${tbl ? tbl.number : 'Unassigned'}</td>
        <td><span class="badge badge-${badgeType}">${res.status}</span></td>
        <td>
          <div class="d-flex gap-2">
            ${res.status === 'confirmed' && hasFullAccess ? `
              <button class="btn btn-secondary btn-sm btn-res-arrive">Arrived</button>
              <button class="btn btn-secondary btn-sm btn-res-noshow">No-Show</button>
              <button class="btn btn-secondary btn-sm btn-res-edit">Edit</button>
              <button class="btn btn-danger btn-sm btn-res-cancel">Cancel</button>
            ` : `<span style="font-size:0.85rem; color:var(--text-muted);">Locked</span>`}
          </div>
        </td>
      `;

      if (hasFullAccess && res.status === 'confirmed') {
        tr.querySelector(".btn-res-arrive").addEventListener("click", () => {
          db.update("reservations", res.id, { status: "completed" });
          db.update("tables", res.tableId, { status: "occupied" });
          app.showToast(`Guest arrived. Seated.`, "success");
          
          localStorage.setItem("selectedBranchId", res.branchId);
          window.location.hash = "order-builder";
          setTimeout(() => {
            document.getElementById("builder-table-select").value = res.tableId;
            document.getElementById("builder-customer-phone").value = res.customerPhone;
            document.getElementById("builder-customer-phone").dispatchEvent(new Event("input"));
          }, 150);
        });

        tr.querySelector(".btn-res-noshow").addEventListener("click", () => {
          db.update("reservations", res.id, { status: "no-show" });
          db.update("tables", res.tableId, { status: "available" });
          app.showToast(`Guest marked as No-Show.`, "warning");
          this.renderReservations();
        });

        tr.querySelector(".btn-res-edit").addEventListener("click", () => this.editReservation(res));

        tr.querySelector(".btn-res-cancel").addEventListener("click", () => {
          if (confirm("Cancel this booking?")) {
            db.update("reservations", res.id, { status: "cancelled" });
            db.update("tables", res.tableId, { status: "available" });
            app.showToast("Booking cancelled.", "danger");
            this.renderReservations();
          }
        });
      }

      tableBody.appendChild(tr);
    });
  },

  saveReservation() {
    const editId = document.getElementById("res-edit-id").value;
    const customerName = document.getElementById("res-cust-name").value.trim();
    const customerPhone = document.getElementById("res-cust-phone").value.trim();
    const dateTime = document.getElementById("res-datetime").value;
    const partySize = parseInt(document.getElementById("res-party-size").value) || 1;
    const tableId = document.getElementById("res-table-select").value;
    const notes = document.getElementById("res-notes").value.trim();

    if (!customerName || !customerPhone || !dateTime || !tableId) {
      app.showToast("Please fill all required details.", "warning");
      return;
    }

    const currentBranch = db.getCurrentBranch();
    const tables = db.get("tables");
    const selectedTbl = tables.find(t => t.id === tableId);
    
    if (selectedTbl && selectedTbl.capacity < partySize) {
      if (!confirm(`Warning: Seating capacity of ${selectedTbl.number} is less than party size. Proceed?`)) {
        return;
      }
    }

    const reservations = db.get("reservations");
    const checkTime = new Date(dateTime).getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    const conflict = reservations.find(r => 
      r.id !== editId &&
      r.tableId === tableId && 
      r.status === "confirmed" &&
      Math.abs(new Date(r.dateTime).getTime() - checkTime) < twoHoursMs
    );

    if (conflict) {
      app.showToast(`Schedule Conflict: Table is already reserved by ${conflict.customerName}!`, "danger");
      return;
    }

    const payload = { 
      customerName, 
      customerPhone, 
      dateTime, 
      partySize, 
      tableId, 
      notes, 
      status: "confirmed",
      branchId: editId ? db.get("reservations").find(r => r.id === editId).branchId : currentBranch
    };

    if (editId) {
      db.update("reservations", editId, payload);
      app.showToast(`Updated reservation for ${customerName}.`, "success");
    } else {
      db.insert("reservations", payload);
      db.update("tables", tableId, { status: "reserved" });
      app.showToast(`Table reservation confirmed!`, "success");
    }

    this.resetReservationForm();
    this.renderReservations();
  },

  editReservation(res) {
    document.getElementById("res-edit-id").value = res.id;
    document.getElementById("res-cust-name").value = res.customerName;
    document.getElementById("res-cust-phone").value = res.customerPhone;
    document.getElementById("res-datetime").value = res.dateTime;
    document.getElementById("res-party-size").value = res.partySize;
    document.getElementById("res-table-select").value = res.tableId;
    document.getElementById("res-notes").value = res.notes;

    document.getElementById("reservation-form-title").textContent = "Edit Seating Reservation";
    document.getElementById("btn-res-save").textContent = "Update Seating";
    document.getElementById("btn-res-clear-edit").classList.remove("d-none");
  },

  resetReservationForm() {
    document.getElementById("res-edit-id").value = "";
    document.getElementById("reservation-crud-form").reset();
    document.getElementById("reservation-form-title").textContent = "Create Reservation";
    document.getElementById("btn-res-save").textContent = "Confirm Seating";
    document.getElementById("btn-res-clear-edit").classList.add("d-none");
  }
};

ReservationsModule.init();
