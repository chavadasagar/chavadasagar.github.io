/**
 * app.js - Single Page Application Core & Router
 * Manages login, dynamic role-based permissions, multi-branch dropdown updates, and DOM alerts.
 */

// Global App State Wrapper
const app = {
  currentUser: null,
  settings: null,

  // Initialize Application
  init() {
    this.loadSettings();
    this.setupClock();
    this.setupLoginFlow();
    this.setupRouting();
    this.setupGlobalEvents();
    this.setupBranchSelector();

    // Check if user already logged in
    const cachedUser = localStorage.getItem("currentUser");
    if (cachedUser) {
      this.login(JSON.parse(cachedUser));
    } else {
      this.showLoginScreen();
    }
  },

  // Load and refresh settings config
  loadSettings() {
    const rawSettings = localStorage.getItem("restaurant_settings");
    if (rawSettings) {
      this.settings = JSON.parse(rawSettings);
    } else {
      this.settings = {
        restaurantName: "Grill & Dine",
        currencySymbol: "₹",
        taxPercent: 5,
        pointsPerRupee: 0.1
      };
    }
    // Update headers referencing settings
    document.getElementById("display-restaurant-name").textContent = this.settings.restaurantName;
  },

  // Real-time Topbar clock
  setupClock() {
    const clockEl = document.getElementById("clock-display");
    const updateTime = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' | ' + now.toLocaleDateString();
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  // Branch Selector topbar setup
  setupBranchSelector() {
    const selector = document.getElementById("topbar-branch-selector");
    
    selector.addEventListener("change", (e) => {
      const value = e.target.value;
      localStorage.setItem("selectedBranchId", value);
      
      const branchName = value === "all" ? "All Branches (Combined)" : db.get("branches").find(b => b.id === value).name;
      this.showToast(`Switched view to ${branchName}`, "success");
      
      // Refresh current active view
      const currentHash = window.location.hash.slice(1) || "dashboard";
      this.routeTo(currentHash);
    });
  },

  // Populates Topbar Selector options based on logged-in role
  updateBranchSelectorOptions() {
    const selector = document.getElementById("topbar-branch-selector");
    selector.innerHTML = "";

    const branches = db.get("branches").filter(b => b.isActive);
    const hasBranchManage = this.checkPermission("branches", "full");

    // Add All Branches option only if Admin/Manager has full access
    if (hasBranchManage) {
      const optAll = document.createElement("option");
      optAll.value = "all";
      optAll.textContent = "🏢 All Branches";
      selector.appendChild(optAll);
    }

    branches.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = `📍 ${b.name}`;
      selector.appendChild(opt);
    });

    // Preset selected branch
    const activeBranch = db.getCurrentBranch();
    selector.value = activeBranch;

    // Restrict staff dropdown access
    if (!hasBranchManage && this.currentUser) {
      selector.value = this.currentUser.branchId;
      selector.disabled = true;
      localStorage.setItem("selectedBranchId", this.currentUser.branchId);
    } else {
      selector.disabled = false;
    }
  },

  // Login UI interactions
  setupLoginFlow() {
    const roleSelector = document.getElementById("login-role-selector");
    const staffSelect = document.getElementById("login-staff-select");
    const submitBtn = document.getElementById("btn-submit-login");

    // Click on role buttons
    roleSelector.addEventListener("click", (e) => {
      const roleBtn = e.target.closest(".role-btn");
      if (!roleBtn) return;

      // Toggle active states
      roleSelector.querySelectorAll(".role-btn").forEach(btn => btn.classList.remove("active"));
      roleBtn.classList.add("active");

      // Populate user profiles dropdown for selected role
      const role = roleBtn.dataset.role;
      const allStaff = db.get("staff");
      const filteredStaff = allStaff.filter(s => s.role === role && s.isActive);
      
      staffSelect.innerHTML = "";
      if (filteredStaff.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = `No active profiles. Reset DB in settings.`;
        staffSelect.appendChild(opt);
        submitBtn.disabled = true;
      } else {
        filteredStaff.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.id;
          
          // Get primary branch label
          const branch = db.get("branches").find(b => b.id === s.branchId);
          const branchLabel = branch ? ` (${branch.name})` : '';
          
          opt.textContent = s.name + branchLabel;
          staffSelect.appendChild(opt);
        });
        submitBtn.disabled = false;
      }
    });

    // Handle Login Submit
    submitBtn.addEventListener("click", () => {
      const selectedStaffId = staffSelect.value;
      if (!selectedStaffId) {
        this.showToast("Please choose a valid user profile", "warning");
        return;
      }

      const allStaff = db.get("staff");
      const matchedUser = allStaff.find(s => s.id === selectedStaffId);
      if (matchedUser) {
        this.login(matchedUser);
        this.showToast(`Logged in successfully as ${matchedUser.name}!`, "success");
      }
    });

    // Handle Logout
    document.getElementById("btn-logout").addEventListener("click", () => {
      if (confirm("Are you sure you want to log out of the system?")) {
        this.logout();
      }
    });

    // Trigger initial click for Admin role selector
    const defaultBtn = roleSelector.querySelector('[data-role="role_admin"]');
    if (defaultBtn) defaultBtn.click();
  },

  // Save login state & customize navigation
  login(user) {
    this.currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(user));
    
    // Hide login screen overlay
    document.getElementById("login-screen").style.display = "none";
    
    // Update Sidebar Profiler details
    document.getElementById("sidebar-user-name").textContent = user.name;
    
    // Get role name to display
    const roles = db.get("roles");
    const roleData = roles.find(r => r.id === user.role);
    document.getElementById("sidebar-user-role").textContent = roleData ? roleData.name : "Staff";
    
    // Update branch selector options
    this.updateBranchSelectorOptions();

    // Filter Navigation lists using custom role permissions mapping
    const navItems = document.querySelectorAll("#sidebar-nav-menu .nav-item");
    let firstAllowedSection = "";
    
    navItems.forEach(item => {
      const section = item.dataset.section;
      const permission = this.checkPermission(section, "view");
      
      if (permission) {
        item.classList.remove("d-none");
        if (!firstAllowedSection) {
          firstAllowedSection = section;
        }
      } else {
        item.classList.add("d-none");
      }
    });

    // Set user-defined route or default allowed route
    const currentHash = window.location.hash.slice(1);
    const hasAccess = this.checkPermission(currentHash, "view");
    
    if (currentHash && hasAccess) {
      this.routeTo(currentHash);
    } else if (firstAllowedSection) {
      this.routeTo(firstAllowedSection);
    }
  },

  // Terminate login session
  logout() {
    this.currentUser = null;
    localStorage.removeItem("currentUser");
    window.location.hash = "";
    this.showLoginScreen();
  },

  showLoginScreen() {
    document.getElementById("login-screen").style.display = "flex";
  },

  // Navigation SPA Router
  setupRouting() {
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.slice(1) || "dashboard";
      this.routeTo(hash);
    });

    // Quick Order action header button
    document.getElementById("btn-quick-new-order").addEventListener("click", () => {
      this.routeTo("order-builder");
    });
  },

  routeTo(sectionId) {
    if (!this.currentUser) return;

    // Validate access
    let isAllowed = false;
    if (sectionId === "order-builder") {
      isAllowed = this.checkPermission("orders", "full");
    } else {
      isAllowed = this.checkPermission(sectionId, "view");
    }

    if (!isAllowed) {
      this.showToast("Access Denied: Your role does not have permission.", "danger");
      return;
    }

    // Toggle active sections class
    document.querySelectorAll(".app-section").forEach(sec => sec.classList.remove("active"));
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
      targetSection.classList.add("active");
      
      // Update topbar title
      let prettyTitle = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
      if (sectionId === "order-builder") prettyTitle = "New Order Creator";
      if (sectionId === "kitchen") prettyTitle = "KOT Kitchen Board";
      if (sectionId === "roles") prettyTitle = "Roles & Permissions";
      if (sectionId === "branches") prettyTitle = "Branch Management";
      document.getElementById("main-page-title").textContent = prettyTitle;
      
      // Toggle sidebar active highlights
      document.querySelectorAll("#sidebar-nav-menu .nav-item").forEach(item => {
        if (item.dataset.section === sectionId) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

      // Update URL hash
      if (window.location.hash !== `#${sectionId}`) {
        window.location.hash = sectionId;
      }

      // Enforce view-only restrictions (Disable editing tags if view only)
      if (sectionId !== "order-builder") {
        this.enforcePermission(sectionId);
      }

      // Fire module-specific render hooks
      this.triggerModuleRender(sectionId);
    }
  },

  // Helper checking permissions level
  checkPermission(module, level = "view") {
    if (!this.currentUser) return false;
    
    const roles = db.get("roles");
    const matchedRole = roles.find(r => r.id === this.currentUser.role);
    if (!matchedRole) return false;

    // Admin override
    if (matchedRole.id === "role_admin") return true;

    // Normal mapping check
    const permVal = matchedRole.permissions[module] || "none";
    
    if (level === "full") {
      return permVal === "full";
    }
    if (level === "view") {
      return permVal === "view" || permVal === "full";
    }
    return false;
  },

  // Enforces view-only disables/hides
  enforcePermission(moduleName) {
    const targetSec = document.getElementById(`section-${moduleName}`);
    if (!targetSec) return;

    let banner = targetSec.querySelector(".view-only-banner");
    
    if (this.checkPermission(moduleName, "full")) {
      // Remove banner if exists
      if (banner) banner.remove();
      // Enable inputs
      targetSec.querySelectorAll("button, input, select, textarea").forEach(el => {
        if (el.id !== "topbar-branch-selector") {
          el.disabled = false;
        }
      });
    } else if (this.checkPermission(moduleName, "view")) {
      // Create view-only warning banner if not exists
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "view-only-banner";
        banner.style.cssText = "background-color: var(--color-warning-light); color: var(--color-warning); font-size: 0.85rem; padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 4px solid var(--color-warning); margin-bottom: 1rem; font-weight: 600;";
        banner.innerHTML = "⚠️ View-Only Access: You can browse details but cannot add, edit, or delete records.";
        targetSec.insertBefore(banner, targetSec.firstChild);
      }

      // Disable CRUD forms and buttons, except selectors and search boxes
      targetSec.querySelectorAll("button, input, select, textarea").forEach(el => {
        // Keep search inputs and date filters enabled
        const keepEnabledIds = [
          "menu-management-search", "order-menu-search", "order-menu-veg-filter", 
          "customer-crm-search", "report-filter-start", "report-filter-end", 
          "btn-apply-report-filters"
        ];
        const isDetailsOrHistory = el.classList.contains("btn-view-details") || el.classList.contains("btn-view-history") || el.classList.contains("close-btn");
        
        if (!keepEnabledIds.includes(el.id) && !isDetailsOrHistory && el.id !== "topbar-branch-selector") {
          el.disabled = true;
          // For buttons, make them visually faded
          if (el.tagName === "BUTTON") {
            el.style.opacity = "0.55";
            el.style.pointerEvents = "none";
          }
        }
      });
    }
  },

  // Trigger custom render events for each JS module to repaint views
  triggerModuleRender(sectionId) {
    const eventName = `render-section:${sectionId}`;
    window.dispatchEvent(new CustomEvent(eventName));
  },

  setupGlobalEvents() {
    // Listen to Database Resets
    window.addEventListener("db-reset-complete", () => {
      this.loadSettings();
      this.showToast("Database reset to initial demo seeds!", "success");
      // Force reload UI
      if (this.currentUser) {
        // Auto-login to first staff record in seeded DB
        const staffList = db.get("staff");
        const defaultAdmin = staffList.find(s => s.id === "stf_admin");
        if (defaultAdmin) {
          this.login(defaultAdmin);
        } else {
          this.logout();
        }
      } else {
        this.showLoginScreen();
      }
    });

    window.addEventListener("db-clear-complete", () => {
      this.showToast("Local database cleared completely!", "danger");
      this.logout();
    });
  },

  // Dynamic Toast Alerts
  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    // Choose emoji status
    let statusEmoji = "ℹ️";
    if (type === "success") statusEmoji = "✅";
    if (type === "danger") statusEmoji = "❌";
    if (type === "warning") statusEmoji = "⚠️";

    toast.innerHTML = `
      <span>${statusEmoji}</span>
      <span style="font-size: 0.9rem; font-weight: 500;">${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove toast
    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, 3500);
  },

  // Shared Common Modal Utility
  showModal(htmlContent) {
    const modal = document.getElementById("common-modal");
    const content = document.getElementById("common-modal-content");
    content.innerHTML = htmlContent;
    modal.classList.add("active");

    // Auto-bind close elements
    const closeBtns = content.querySelectorAll(".close-btn, [data-dismiss='modal']");
    closeBtns.forEach(btn => {
      btn.addEventListener("click", () => this.closeModal());
    });
  },

  closeModal() {
    const modal = document.getElementById("common-modal");
    modal.classList.remove("active");
  },

  // Formatting helpers
  formatCurrency(value) {
    return `${this.settings.currencySymbol}${parseFloat(value).toFixed(2)}`;
  }
};

// Initialize App on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
