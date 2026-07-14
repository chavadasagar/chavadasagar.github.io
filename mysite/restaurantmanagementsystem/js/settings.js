/**
 * settings.js - Restaurant preferences & database tools config (Multi-branch & Permissions updated)
 */

const SettingsModule = {
  init() {
    window.addEventListener("render-section:settings", () => this.loadSettingsForm());

    // Bind settings form submit
    const form = document.getElementById("settings-pref-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.savePreferences();
    });

    // Bind reset database
    document.getElementById("btn-reset-demo").addEventListener("click", () => {
      this.triggerResetDemoFlow();
    });

    // Bind clear database
    document.getElementById("btn-clear-db").addEventListener("click", () => {
      this.triggerClearDatabaseFlow();
    });
  },

  // Load preferences values into inputs fields
  loadSettingsForm() {
    app.enforcePermission("settings");
    app.loadSettings();
    
    document.getElementById("set-rest-name").value = app.settings.restaurantName;
    document.getElementById("set-currency").value = app.settings.currencySymbol;
    document.getElementById("set-tax-percent").value = app.settings.taxPercent;
    document.getElementById("set-points-ratio").value = app.settings.pointsPerRupee;

    // Check full settings permissions to lock diagnostic CTAs
    const hasFullAccess = app.checkPermission("settings", "full");
    const resetBtn = document.getElementById("btn-reset-demo");
    const clearBtn = document.getElementById("btn-clear-db");
    
    if (resetBtn && clearBtn) {
      if (!hasFullAccess) {
        resetBtn.disabled = true;
        resetBtn.style.opacity = "0.55";
        resetBtn.style.pointerEvents = "none";
        
        clearBtn.disabled = true;
        clearBtn.style.opacity = "0.55";
        clearBtn.style.pointerEvents = "none";
      } else {
        resetBtn.disabled = false;
        resetBtn.style.opacity = "1";
        resetBtn.style.pointerEvents = "auto";
        
        clearBtn.disabled = false;
        clearBtn.style.opacity = "1";
        clearBtn.style.pointerEvents = "auto";
      }
    }
  },

  // Save settings values to localStorage
  savePreferences() {
    if (!app.checkPermission("settings", "full")) {
      app.showToast("Access Denied: You do not have edit rights for settings.", "danger");
      return;
    }

    const restaurantName = document.getElementById("set-rest-name").value.trim();
    const currencySymbol = document.getElementById("set-currency").value.trim() || "₹";
    const taxPercent = parseFloat(document.getElementById("set-tax-percent").value) || 0;
    const pointsPerRupee = parseFloat(document.getElementById("set-points-ratio").value) || 0.1;

    if (!restaurantName) {
      app.showToast("Restaurant name is required.", "warning");
      return;
    }

    const payload = { restaurantName, currencySymbol, taxPercent, pointsPerRupee };
    localStorage.setItem("restaurant_settings", JSON.stringify(payload));
    
    app.loadSettings();
    app.showToast("Restaurant settings saved successfully!", "success");
  },

  // Double confirmed reset flow
  triggerResetDemoFlow() {
    if (!app.checkPermission("settings", "full")) {
      app.showToast("Access Denied.", "danger");
      return;
    }

    const firstConfirm = confirm("Warning: This resets all branches, menu layouts, custom roles, active tickets, and sales reports to initial sample demo data. Proceed?");
    if (!firstConfirm) return;

    const secondConfirm = confirm("Double Check: Type 'RESET' to confirm formatting databases back to seed records:");
    if (secondConfirm) {
      db.resetDemoData();
    }
  },

  // Double confirmed clear database flow
  triggerClearDatabaseFlow() {
    if (!app.checkPermission("settings", "full")) {
      app.showToast("Access Denied.", "danger");
      return;
    }

    const firstConfirm = confirm("CRITICAL WARNING: This deletes ALL records, locations, custom roles, and configurations. You will be logged out and database will be empty. Proceed?");
    if (!firstConfirm) return;

    const secondConfirm = confirm("Type 'CLEAR' to proceed with absolute database deletion:");
    if (secondConfirm) {
      db.clearAllData();
    }
  }
};

SettingsModule.init();
