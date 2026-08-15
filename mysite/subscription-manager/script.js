/**
 * Modern Subscription & Feature Management System
 * End-to-End Enterprise Architecture with LocalStorage Persistence & Dynamic Renderers
 */

const SubscriptionStore = {
  plans: [],
  features: [],
  planFeatures: [], // Array of { planId, featureId }
  userSubscription: null, // { planId, billingCycle, subscribedAt }

  async init() {
    const cachedPlans = localStorage.getItem("sub_plans");
    const cachedFeatures = localStorage.getItem("sub_features");
    const cachedPlanFeatures = localStorage.getItem("sub_planFeatures");
    const cachedUserSub = localStorage.getItem("sub_userSubscription");

    if (cachedPlans && cachedFeatures && cachedPlanFeatures) {
      this.plans = JSON.parse(cachedPlans);
      this.features = JSON.parse(cachedFeatures);
      this.planFeatures = JSON.parse(cachedPlanFeatures);
      this.userSubscription = cachedUserSub ? JSON.parse(cachedUserSub) : { planId: "plan-2", billingCycle: "monthly" };
    } else {
      await this.loadSeedData();
    }
  },

  async loadSeedData() {
    try {
      const res = await fetch("data.json");
      if (res.ok) {
        const data = await res.json();
        this.plans = data.plans || [];
        this.features = data.features || [];
        this.planFeatures = data.planFeatures || [];
      }
    } catch (e) {
      console.warn("Failed to load data.json, fallback to defaults", e);
      this.loadDefaults();
    }
    if (!this.userSubscription) {
      this.userSubscription = { planId: "plan-2", billingCycle: "monthly" };
    }
    this.save();
  },

  loadDefaults() {
    this.plans = [
      { id: "plan-1", name: "Starter", tagline: "For individuals", priceMonthly: 9.99, priceYearly: 99, badge: "Trial", isPopular: false, subscribersCount: 120 },
      { id: "plan-2", name: "Pro", tagline: "For small teams", priceMonthly: 29.99, priceYearly: 299, badge: "Popular", isPopular: true, subscribersCount: 450 },
      { id: "plan-3", name: "Enterprise", tagline: "For large scale", priceMonthly: 99.99, priceYearly: 999, badge: "Scale", isPopular: false, subscribersCount: 80 }
    ];
    this.features = [
      { id: "feat-1", name: "Core Platform", category: "General", description: "Access to main tools" },
      { id: "feat-2", name: "24/7 Email Support", category: "Support", description: "Standard ticketing" },
      { id: "feat-3", name: "Advanced Analytics", category: "Analytics", description: "Custom metrics" }
    ];
    this.planFeatures = [
      { planId: "plan-1", featureId: "feat-1" },
      { planId: "plan-2", featureId: "feat-1" },
      { planId: "plan-2", featureId: "feat-2" },
      { planId: "plan-3", featureId: "feat-1" },
      { planId: "plan-3", featureId: "feat-2" },
      { planId: "plan-3", featureId: "feat-3" }
    ];
  },

  save() {
    localStorage.setItem("sub_plans", JSON.stringify(this.plans));
    localStorage.setItem("sub_features", JSON.stringify(this.features));
    localStorage.setItem("sub_planFeatures", JSON.stringify(this.planFeatures));
    if (this.userSubscription) {
      localStorage.setItem("sub_userSubscription", JSON.stringify(this.userSubscription));
    } else {
      localStorage.removeItem("sub_userSubscription");
    }
  },

  async resetData() {
    localStorage.removeItem("sub_plans");
    localStorage.removeItem("sub_features");
    localStorage.removeItem("sub_planFeatures");
    localStorage.removeItem("sub_userSubscription");
    await this.loadSeedData();
    showToast("Data reset to initial default state!", "success");
    renderApp();
  },

  /* CRUD Plans */
  addPlan(plan) {
    plan.id = "plan-" + Date.now();
    plan.subscribersCount = 0;
    this.plans.push(plan);
    this.save();
    showToast(`Plan "${plan.name}" created successfully!`, "success");
    renderApp();
  },

  updatePlan(id, updatedData) {
    const idx = this.plans.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.plans[idx] = { ...this.plans[idx], ...updatedData };
      this.save();
      showToast(`Plan updated successfully!`, "success");
      renderApp();
    }
  },

  deletePlan(id) {
    const plan = this.plans.find(p => p.id === id);
    this.plans = this.plans.filter(p => p.id !== id);
    this.planFeatures = this.planFeatures.filter(pf => pf.planId !== id);
    if (this.userSubscription && this.userSubscription.planId === id) {
      this.userSubscription = null;
    }
    this.save();
    showToast(`Plan "${plan?.name || ''}" deleted.`, "info");
    renderApp();
  },

  /* CRUD Features */
  addFeature(feature) {
    feature.id = "feat-" + Date.now();
    this.features.push(feature);
    this.save();
    showToast(`Feature "${feature.name}" added!`, "success");
    renderApp();
  },

  updateFeature(id, updatedData) {
    const idx = this.features.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.features[idx] = { ...this.features[idx], ...updatedData };
      this.save();
      showToast(`Feature updated successfully!`, "success");
      renderApp();
    }
  },

  deleteFeature(id) {
    const feat = this.features.find(f => f.id === id);
    this.features = this.features.filter(f => f.id !== id);
    this.planFeatures = this.planFeatures.filter(pf => pf.featureId !== id);
    this.save();
    showToast(`Feature "${feat?.name || ''}" deleted.`, "info");
    renderApp();
  },

  /* Feature Assignment Matrix */
  isFeatureAssigned(planId, featureId) {
    return this.planFeatures.some(pf => pf.planId === planId && pf.featureId === featureId);
  },

  togglePlanFeature(planId, featureId) {
    const exists = this.isFeatureAssigned(planId, featureId);
    if (exists) {
      this.planFeatures = this.planFeatures.filter(pf => !(pf.planId === planId && pf.featureId === featureId));
      showToast("Feature removed from plan", "info");
    } else {
      this.planFeatures.push({ planId, featureId });
      showToast("Feature assigned to plan!", "success");
    }
    this.save();
    renderApp();
  },

  assignFeaturesToPlan(planId, featureIds) {
    // Replace all features for this plan
    this.planFeatures = this.planFeatures.filter(pf => pf.planId !== planId);
    featureIds.forEach(fId => {
      this.planFeatures.push({ planId, featureId: fId });
    });
    this.save();
    showToast("Plan features updated successfully!", "success");
    renderApp();
  },

  /* User Subscription Simulation */
  subscribeUser(planId, billingCycle = "monthly") {
    const plan = this.plans.find(p => p.id === planId);
    this.userSubscription = {
      planId,
      billingCycle,
      subscribedAt: new Date().toISOString()
    };
    if (plan) {
      plan.subscribersCount = (plan.subscribersCount || 0) + 1;
    }
    this.save();
    showToast(`Successfully subscribed to ${plan ? plan.name : 'Plan'}!`, "success");
    renderApp();
  },

  cancelUserSubscription() {
    this.userSubscription = null;
    this.save();
    showToast("Subscription cancelled.", "warning");
    renderApp();
  }
};

/* State Flags */
let currentTab = "storefront";
let isYearlyBilling = false;

/* App Initialization */
document.addEventListener("DOMContentLoaded", async () => {
  await SubscriptionStore.init();

  // Read URL query param if present e.g. index.html?tab=plans
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get("tab");
  if (tabParam && ["storefront", "plans", "features", "matrix", "analytics"].includes(tabParam)) {
    currentTab = tabParam;
  }

  // Theme Init
  const savedTheme = localStorage.getItem("sub_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  setupEventListeners();
  renderApp();
});

/* Navigation & Rendering */
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll(".nav-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-content-panel").forEach(panel => {
    panel.classList.toggle("d-none", panel.id !== `panel-${tabId}`);
  });
  renderApp();
}

function renderApp() {
  renderUserStatusBar();
  if (currentTab === "storefront") renderStorefront();
  else if (currentTab === "plans") renderPlansTable();
  else if (currentTab === "features") renderFeaturesTable();
  else if (currentTab === "matrix") renderMatrixGrid();
  else if (currentTab === "analytics") renderAnalyticsDashboard();
}

/* User Status Bar Component */
function renderUserStatusBar() {
  const container = document.getElementById("user-status-container");
  if (!container) return;

  const sub = SubscriptionStore.userSubscription;
  const activePlan = sub ? SubscriptionStore.plans.find(p => p.id === sub.planId) : null;

  if (!sub || !activePlan) {
    container.innerHTML = `
      <div class="user-status-card">
        <div class="d-flex align-items-center gap-3">
          <div class="metric-icon" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">
            <i class="fas fa-user-slash"></i>
          </div>
          <div>
            <div class="fw-bold text-white fs-5">No Active Subscription</div>
            <div class="text-muted small">Select a pricing plan below to unlock premium features and start your workspace.</div>
          </div>
        </div>
        <button class="btn btn-primary-custom" onclick="switchTab('storefront')">
          <i class="fas fa-rocket me-2"></i> Choose Plan
        </button>
      </div>
    `;
    return;
  }

  const price = sub.billingCycle === "yearly" ? activePlan.priceYearly : activePlan.priceMonthly;
  const cycleText = sub.billingCycle === "yearly" ? "/year" : "/month";

  container.innerHTML = `
    <div class="user-status-card" style="border-left: 4px solid var(--accent-primary);">
      <div class="d-flex align-items-center gap-3">
        <div class="metric-icon">
          <i class="fas fa-crown"></i>
        </div>
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="fw-bold text-white fs-5">${activePlan.name} Plan</span>
            <span class="badge bg-success-subtle text-success border border-success fw-semibold px-2 py-1" style="font-size: 0.75rem;">Active</span>
          </div>
          <div class="text-muted small">
            Billed <strong>$${price.toFixed(2)}${cycleText}</strong> • Access to ${SubscriptionStore.planFeatures.filter(pf => pf.planId === activePlan.id).length} core features.
          </div>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-secondary-custom btn-sm" onclick="switchTab('storefront')">
          <i class="fas fa-sync-alt me-1"></i> Change Plan
        </button>
        <button class="btn btn-outline-danger btn-sm rounded-3" onclick="confirmCancelSubscription()">
          <i class="fas fa-times me-1"></i> Cancel
        </button>
      </div>
    </div>
  `;
}

/* Storefront Pricing View */
function renderStorefront() {
  const grid = document.getElementById("pricing-grid");
  if (!grid) return;

  const currentSub = SubscriptionStore.userSubscription;

  grid.innerHTML = SubscriptionStore.plans.map(plan => {
    const isCurrent = currentSub && currentSub.planId === plan.id;
    const price = isYearlyBilling ? plan.priceYearly : plan.priceMonthly;
    const period = isYearlyBilling ? "/year" : "/month";

    // Feature items for this plan
    const assignedFeatIds = SubscriptionStore.planFeatures.filter(pf => pf.planId === plan.id).map(pf => pf.featureId);
    
    const featureItemsHtml = SubscriptionStore.features.map(feat => {
      const isIncluded = assignedFeatIds.includes(feat.id);
      return `
        <li class="feature-list-item ${isIncluded ? '' : 'text-muted opacity-50'}">
          <span class="${isIncluded ? 'feature-icon-check' : 'feature-icon-cross'}">
            <i class="fas ${isIncluded ? 'fa-check' : 'fa-minus'}"></i>
          </span>
          <span>${feat.name}</span>
        </li>
      `;
    }).join("");

    return `
      <div class="col-lg-3 col-md-6 mb-4">
        <div class="pricing-card ${plan.isPopular ? 'popular-card' : ''}">
          ${plan.isPopular ? '<div class="popular-tag"><i class="fas fa-fire me-1"></i> Popular</div>' : ''}
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h4 class="fw-bold mb-0 text-white">${plan.name}</h4>
            ${plan.badge ? `<span class="category-badge">${plan.badge}</span>` : ''}
          </div>
          <p class="text-muted small mb-4" style="min-height: 40px;">${plan.tagline || 'Essential plan features'}</p>
          
          <div class="mb-4">
            <span class="plan-price-amount">$${price.toFixed(2)}</span>
            <span class="plan-price-period">${period}</span>
          </div>

          <button 
            class="btn ${isCurrent ? 'btn-secondary-custom w-100 disabled' : 'btn-primary-custom w-100'} mb-4"
            onclick="${isCurrent ? '' : `handleSubscribe('${plan.id}')`}"
            ${isCurrent ? 'disabled' : ''}
          >
            ${isCurrent ? '<i class="fas fa-check-circle me-1"></i> Current Active Plan' : 'Subscribe Now'}
          </button>

          <div class="border-top pt-3" style="border-color: var(--border-color) !important;">
            <div class="fw-semibold text-white small mb-3">Included Features:</div>
            <ul class="feature-list-group">
              ${featureItemsHtml}
            </ul>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* Plans Admin Table */
function renderPlansTable() {
  const tbody = document.getElementById("plans-table-body");
  if (!tbody) return;

  tbody.innerHTML = SubscriptionStore.plans.map(plan => {
    const featCount = SubscriptionStore.planFeatures.filter(pf => pf.planId === plan.id).length;
    return `
      <tr>
        <td>
          <div class="fw-bold text-white">${plan.name}</div>
          <div class="text-muted small">${plan.tagline || ''}</div>
        </td>
        <td>
          <span class="fw-bold text-success">$${plan.priceMonthly.toFixed(2)}</span> / mo
          <br>
          <span class="text-muted small">$${plan.priceYearly.toFixed(2)} / yr</span>
        </td>
        <td>
          ${plan.badge ? `<span class="category-badge">${plan.badge}</span>` : '-'}
          ${plan.isPopular ? `<span class="badge bg-warning text-dark ms-1">Popular</span>` : ''}
        </td>
        <td>
          <span class="badge bg-info-subtle text-info border border-info px-2 py-1">${featCount} Features</span>
        </td>
        <td>${plan.subscribersCount || 0}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary-custom btn-sm" onclick="openEditPlanModal('${plan.id}')">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-outline-danger btn-sm rounded-3" onclick="confirmDeletePlan('${plan.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/* Features Admin Table */
function renderFeaturesTable() {
  const tbody = document.getElementById("features-table-body");
  if (!tbody) return;

  tbody.innerHTML = SubscriptionStore.features.map(feat => {
    const assignedPlansCount = SubscriptionStore.planFeatures.filter(pf => pf.featureId === feat.id).length;
    return `
      <tr>
        <td>
          <div class="fw-bold text-white">${feat.name}</div>
          <div class="text-muted small">${feat.description || ''}</div>
        </td>
        <td>
          <span class="category-badge">${feat.category || 'General'}</span>
        </td>
        <td>
          <span class="badge bg-primary-subtle text-primary border border-primary px-2 py-1">In ${assignedPlansCount} Plans</span>
        </td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary-custom btn-sm" onclick="openEditFeatureModal('${feat.id}')">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-outline-danger btn-sm rounded-3" onclick="confirmDeleteFeature('${feat.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/* Feature Matrix Grid */
function renderMatrixGrid() {
  const matrixHead = document.getElementById("matrix-table-head");
  const matrixBody = document.getElementById("matrix-table-body");
  if (!matrixHead || !matrixBody) return;

  // Render Header (Features left, Plans on columns)
  matrixHead.innerHTML = `
    <tr>
      <th style="width: 35%;">Feature Name</th>
      <th style="width: 15%;">Category</th>
      ${SubscriptionStore.plans.map(p => `
        <th class="text-center">
          <div class="fw-bold text-white fs-6">${p.name}</div>
          <div class="text-muted small">$${p.priceMonthly}/mo</div>
        </th>
      `).join("")}
    </tr>
  `;

  // Render Rows
  matrixBody.innerHTML = SubscriptionStore.features.map(feat => {
    return `
      <tr>
        <td>
          <div class="fw-semibold text-white">${feat.name}</div>
          <div class="text-muted small">${feat.description || ''}</div>
        </td>
        <td><span class="category-badge">${feat.category || 'General'}</span></td>
        ${SubscriptionStore.plans.map(plan => {
          const isAssigned = SubscriptionStore.isFeatureAssigned(plan.id, feat.id);
          return `
            <td class="text-center">
              <button 
                class="matrix-check-btn ${isAssigned ? 'active' : 'inactive'}"
                onclick="SubscriptionStore.togglePlanFeature('${plan.id}', '${feat.id}')"
                title="${isAssigned ? 'Click to remove feature' : 'Click to assign feature'}"
              >
                <i class="fas ${isAssigned ? 'fa-check-circle' : 'fa-circle-notch'}"></i>
              </button>
            </td>
          `;
        }).join("")}
      </tr>
    `;
  }).join("");
}

/* Analytics Dashboard */
function renderAnalyticsDashboard() {
  const totalSubscribers = SubscriptionStore.plans.reduce((sum, p) => sum + (p.subscribersCount || 0), 0);
  const estMRR = SubscriptionStore.plans.reduce((sum, p) => sum + ((p.subscribersCount || 0) * p.priceMonthly), 0);

  const subscriberEl = document.getElementById("metric-subscribers");
  const mrrEl = document.getElementById("metric-mrr");
  const plansCountEl = document.getElementById("metric-plans-count");
  const featuresCountEl = document.getElementById("metric-features-count");

  if (subscriberEl) subscriberEl.textContent = totalSubscribers.toLocaleString();
  if (mrrEl) mrrEl.textContent = `$${estMRR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (plansCountEl) plansCountEl.textContent = SubscriptionStore.plans.length;
  if (featuresCountEl) featuresCountEl.textContent = SubscriptionStore.features.length;

  // Breakdown Bars
  const breakdownContainer = document.getElementById("analytics-breakdown");
  if (breakdownContainer) {
    breakdownContainer.innerHTML = SubscriptionStore.plans.map(p => {
      const pct = totalSubscribers > 0 ? ((p.subscribersCount || 0) / totalSubscribers * 100).toFixed(1) : 0;
      return `
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-1">
            <span class="fw-semibold text-white">${p.name} Plan</span>
            <span class="text-muted small">${p.subscribersCount || 0} subscribers (${pct}%)</span>
          </div>
          <div class="progress" style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 999px;">
            <div class="progress-bar" role="progressbar" style="width: ${pct}%; background: var(--accent-gradient); border-radius: 999px;"></div>
          </div>
        </div>
      `;
    }).join("");
  }
}

/* Event Listeners Setup */
function setupEventListeners() {
  // Navigation tabs
  document.querySelectorAll(".nav-pill-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Billing Toggle Switch
  const billingToggle = document.getElementById("billing-cycle-toggle");
  if (billingToggle) {
    billingToggle.addEventListener("change", (e) => {
      isYearlyBilling = e.target.checked;
      renderStorefront();
    });
  }

  // Theme Toggle Button
  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("sub_theme", newTheme);
      themeBtn.innerHTML = newTheme === "dark" ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
  }

  // Create Plan Form Submit
  const planForm = document.getElementById("plan-form");
  if (planForm) {
    planForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const planId = document.getElementById("plan-id-input").value;
      const planData = {
        name: document.getElementById("plan-name-input").value,
        tagline: document.getElementById("plan-tagline-input").value,
        priceMonthly: parseFloat(document.getElementById("plan-price-monthly").value) || 0,
        priceYearly: parseFloat(document.getElementById("plan-price-yearly").value) || 0,
        badge: document.getElementById("plan-badge-input").value,
        isPopular: document.getElementById("plan-popular-input").checked
      };

      if (planId) {
        SubscriptionStore.updatePlan(planId, planData);
      } else {
        SubscriptionStore.addPlan(planData);
      }

      const modalEl = document.getElementById("planModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    });
  }

  // Create Feature Form Submit
  const featureForm = document.getElementById("feature-form");
  if (featureForm) {
    featureForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const featId = document.getElementById("feature-id-input").value;
      const featData = {
        name: document.getElementById("feature-name-input").value,
        category: document.getElementById("feature-category-input").value,
        description: document.getElementById("feature-description-input").value
      };

      if (featId) {
        SubscriptionStore.updateFeature(featId, featData);
      } else {
        SubscriptionStore.addFeature(featData);
      }

      const modalEl = document.getElementById("featureModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    });
  }
}

/* Modal Helpers & Actions */
function openCreatePlanModal() {
  document.getElementById("plan-form").reset();
  document.getElementById("plan-id-input").value = "";
  document.getElementById("planModalLabel").textContent = "Create New Subscription Plan";
  const modal = new bootstrap.Modal(document.getElementById("planModal"));
  modal.show();
}

function openEditPlanModal(id) {
  const plan = SubscriptionStore.plans.find(p => p.id === id);
  if (!plan) return;
  document.getElementById("plan-id-input").value = plan.id;
  document.getElementById("plan-name-input").value = plan.name;
  document.getElementById("plan-tagline-input").value = plan.tagline || "";
  document.getElementById("plan-price-monthly").value = plan.priceMonthly;
  document.getElementById("plan-price-yearly").value = plan.priceYearly;
  document.getElementById("plan-badge-input").value = plan.badge || "";
  document.getElementById("plan-popular-input").checked = !!plan.isPopular;

  document.getElementById("planModalLabel").textContent = "Edit Subscription Plan";
  const modal = new bootstrap.Modal(document.getElementById("planModal"));
  modal.show();
}

function confirmDeletePlan(id) {
  if (confirm("Are you sure you want to delete this subscription plan?")) {
    SubscriptionStore.deletePlan(id);
  }
}

function openCreateFeatureModal() {
  document.getElementById("feature-form").reset();
  document.getElementById("feature-id-input").value = "";
  document.getElementById("featureModalLabel").textContent = "Create New Feature";
  const modal = new bootstrap.Modal(document.getElementById("featureModal"));
  modal.show();
}

function openEditFeatureModal(id) {
  const feat = SubscriptionStore.features.find(f => f.id === id);
  if (!feat) return;
  document.getElementById("feature-id-input").value = feat.id;
  document.getElementById("feature-name-input").value = feat.name;
  document.getElementById("feature-category-input").value = feat.category || "General";
  document.getElementById("feature-description-input").value = feat.description || "";

  document.getElementById("featureModalLabel").textContent = "Edit Feature";
  const modal = new bootstrap.Modal(document.getElementById("featureModal"));
  modal.show();
}

function confirmDeleteFeature(id) {
  if (confirm("Are you sure you want to delete this feature? It will be removed from all associated plans.")) {
    SubscriptionStore.deleteFeature(id);
  }
}

function handleSubscribe(planId) {
  const cycle = isYearlyBilling ? "yearly" : "monthly";
  SubscriptionStore.subscribeUser(planId, cycle);
}

function confirmCancelSubscription() {
  if (confirm("Are you sure you want to cancel your current subscription?")) {
    SubscriptionStore.cancelUserSubscription();
  }
}

/* Toast Notifications */
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container-custom";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast-item`;
  
  const icon = type === "success" ? "fa-check-circle text-success" : 
               type === "warning" ? "fa-exclamation-triangle text-warning" : "fa-info-circle text-info";
  
  toast.innerHTML = `<i class="fas ${icon} fs-5"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
