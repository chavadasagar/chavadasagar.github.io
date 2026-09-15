/* ==========================================================================
   Nexus Agile System - Multi-Tenant Application Engine
   ========================================================================== */

const STORAGE_KEY = "nexus_agile_system_db";

// Global Runtime State
let AppState = {
  tenants: [],
  projects: [],
  sprints: [],
  tasks: [],
  users: [],
  statuses: [],
  currentRole: "none", // 'none' | 'admin' | 'client'
  currentTenantId: null,
  activeProjectId: "all",
  activeSprintId: null,
  activeView: "dashboard-view",
  searchQuery: "",
  transientSubtasks: []
};

// Initialization on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  await loadStore();
  setupGlobalEvents();

  // Show Role Selection Screen on startup
  showRoleSelection();
}

/* ==========================================================================
   Data Store & Persistence
   ========================================================================== */

async function loadStore() {
  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      AppState.tenants = parsed.tenants || [];
      AppState.projects = parsed.projects || [];
      AppState.sprints = parsed.sprints || [];
      AppState.tasks = parsed.tasks || [];
      AppState.users = parsed.users || [];
      AppState.statuses = parsed.statuses || [];
    } catch (e) {
      console.error("Failed to parse LocalStorage data. Seeding default...", e);
      await fetchSeedData();
    }
  } else {
    await fetchSeedData();
  }

  // Ensure default statuses exist if empty
  if (AppState.statuses.length === 0) {
    AppState.statuses = [
      { id: "status-backlog", name: "Backlog", color: "#64748b", order: 1 },
      { id: "status-todo", name: "To Do", color: "#3b82f6", order: 2 },
      { id: "status-in-progress", name: "In Progress", color: "#f59e0b", order: 3 },
      { id: "status-in-review", name: "In Review", color: "#8b5cf6", order: 4 },
      { id: "status-done", name: "Done", color: "#10b981", order: 5 }
    ];
  }
}

async function fetchSeedData() {
  try {
    const response = await fetch("data.json");
    if (response.ok) {
      const data = await response.json();
      AppState.tenants = data.tenants || [];
      AppState.projects = data.projects || [];
      AppState.sprints = data.sprints || [];
      AppState.tasks = data.tasks || [];
      AppState.users = data.users || [];
      AppState.statuses = data.statuses || [];
      saveStore();
    }
  } catch (err) {
    console.warn("Unable to load data.json seed file:", err);
  }
}

function saveStore() {
  const payload = {
    tenants: AppState.tenants,
    projects: AppState.projects,
    sprints: AppState.sprints,
    tasks: AppState.tasks,
    users: AppState.users,
    statuses: AppState.statuses
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function generateId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

/* ==========================================================================
   Multi-Tenant Portal Navigation & Authentication
   ========================================================================== */

function hideAllScreens() {
  document.getElementById("role-selection-view").style.display = "none";
  document.getElementById("tenant-auth-view").style.display = "none";
  document.getElementById("admin-dashboard-view").style.display = "none";
  document.getElementById("app-workspace-container").style.display = "none";
}

function showRoleSelection() {
  hideAllScreens();
  AppState.currentRole = "none";
  AppState.currentTenantId = null;
  document.getElementById("role-selection-view").style.display = "flex";
}

function selectPortalRole(role) {
  hideAllScreens();
  AppState.currentRole = role;

  if (role === "admin") {
    document.getElementById("admin-dashboard-view").style.display = "flex";
    renderAdminDashboard();
  } else if (role === "client") {
    document.getElementById("tenant-auth-view").style.display = "flex";
    switchAuthTab("login");
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById("tenant-login-form");
  const signupForm = document.getElementById("tenant-signup-form");
  const loginTab = document.getElementById("tab-btn-login");
  const signupTab = document.getElementById("tab-btn-signup");

  if (tab === "login") {
    loginForm.style.display = "block";
    signupForm.style.display = "none";
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
  } else {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
  }
}

/* Client Sign Up (Creates a new Tenant) */
function handleTenantSignUp(e) {
  e.preventDefault();
  const name = document.getElementById("signup-tenant-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  // Check if tenant email already exists
  if (AppState.tenants.some(t => t.email.toLowerCase() === email.toLowerCase())) {
    showToast("A Tenant with this email already exists. Please login.", "error");
    return;
  }

  const newTenant = {
    id: generateId("tenant"),
    name: name,
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    email: email,
    password: password,
    createdAt: new Date().toISOString()
  };

  AppState.tenants.push(newTenant);

  // Seed a default starter project for the new tenant
  const starterProject = {
    id: generateId("proj"),
    tenantId: newTenant.id,
    name: `${name} Initial Project`,
    description: "Welcome to your new workspace! Manage tasks and sprints here.",
    category: "General",
    color: "#6366f1",
    createdAt: new Date().toISOString()
  };
  AppState.projects.push(starterProject);

  // Seed a default sprint
  const starterSprint = {
    id: generateId("sprint"),
    tenantId: newTenant.id,
    projectId: starterProject.id,
    name: "Sprint 1 - Getting Started",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "active"
  };
  AppState.sprints.push(starterSprint);

  saveStore();
  showToast(`Tenant "${name}" created successfully!`, "success");
  enterTenantWorkspace(newTenant.id);
}

/* Client Login */
function handleTenantLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const tenant = AppState.tenants.find(t => 
    t.email.toLowerCase() === email.toLowerCase() && t.password === password
  );

  if (!tenant) {
    showToast("Invalid email or password. Please try again.", "error");
    return;
  }

  showToast(`Logged in as ${tenant.name}`, "success");
  enterTenantWorkspace(tenant.id);
}

/* Enter Workspace View */
function enterTenantWorkspace(tenantId) {
  const tenant = AppState.tenants.find(t => t.id === tenantId);
  if (!tenant) return;

  AppState.currentTenantId = tenantId;
  hideAllScreens();

  document.getElementById("app-workspace-container").style.display = "flex";
  document.getElementById("sidebar-tenant-name-badge").textContent = tenant.name;

  // Reset active project for this tenant
  const tenantProjects = getTenantProjects();
  AppState.activeProjectId = tenantProjects.length > 0 ? tenantProjects[0].id : "all";

  populateDropdowns();
  switchView("dashboard-view");
}

/* Super Admin Dashboard Logic */
function renderAdminDashboard() {
  document.getElementById("admin-stat-tenants").textContent = AppState.tenants.length;
  document.getElementById("admin-stat-projects").textContent = AppState.projects.length;
  document.getElementById("admin-stat-tasks").textContent = AppState.tasks.length;

  const grid = document.getElementById("admin-tenants-grid");
  grid.innerHTML = "";

  if (AppState.tenants.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏢</div><p>No Client Tenants registered yet.</p></div>`;
    return;
  }

  AppState.tenants.forEach(tenant => {
    const tProjects = AppState.projects.filter(p => p.tenantId === tenant.id);
    const tUsers = AppState.users.filter(u => u.tenantId === tenant.id);
    const createdDate = new Date(tenant.createdAt || Date.now()).toLocaleDateString();

    const card = document.createElement("div");
    card.className = "project-card";
    card.style.setProperty("--card-color", "#ec4899");
    card.innerHTML = `
      <div class="project-card-header">
        <h4 class="project-card-title">${escapeHtml(tenant.name)}</h4>
        <span class="project-category-badge">Tenant ID: ${tenant.slug}</span>
      </div>
      <p class="project-card-desc">
        <strong>Email:</strong> ${escapeHtml(tenant.email)}<br/>
        <strong>Registered:</strong> ${createdDate}
      </p>
      
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
        <div>📁 Projects: <strong>${tProjects.length}</strong></div>
        <div>👥 Team Members: <strong>${tUsers.length}</strong></div>
      </div>

      <div class="project-card-footer">
        <button class="btn btn-primary btn-sm" onclick="enterTenantWorkspace('${tenant.id}')">
          Enter Workspace →
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteTenant('${tenant.id}')">
          Delete
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function deleteTenant(tenantId) {
  if (confirm("Are you sure you want to delete this tenant and all their data?")) {
    AppState.tenants = AppState.tenants.filter(t => t.id !== tenantId);
    AppState.projects = AppState.projects.filter(p => p.tenantId !== tenantId);
    AppState.sprints = AppState.sprints.filter(s => s.tenantId !== tenantId);
    AppState.tasks = AppState.tasks.filter(t => t.tenantId !== tenantId);
    AppState.users = AppState.users.filter(u => u.tenantId !== tenantId);

    saveStore();
    renderAdminDashboard();
    showToast("Tenant removed.", "warning");
  }
}

/* ==========================================================================
   Tenant Scoped Helpers
   ========================================================================== */

function getTenantProjects() {
  if (!AppState.currentTenantId) return AppState.projects;
  return AppState.projects.filter(p => p.tenantId === AppState.currentTenantId);
}

function getTenantSprints() {
  if (!AppState.currentTenantId) return AppState.sprints;
  return AppState.sprints.filter(s => s.tenantId === AppState.currentTenantId);
}

function getTenantTasks() {
  if (!AppState.currentTenantId) return AppState.tasks;
  return AppState.tasks.filter(t => t.tenantId === AppState.currentTenantId);
}

function getTenantUsers() {
  if (!AppState.currentTenantId) return AppState.users;
  return AppState.users.filter(u => u.tenantId === AppState.currentTenantId);
}

/* ==========================================================================
   Navigation & View Routing inside Workspace
   ========================================================================== */

function switchView(viewId) {
  AppState.activeView = viewId;

  // Update Nav Active state
  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-view") === viewId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update View Containers
  document.querySelectorAll(".view-section").forEach(sec => {
    if (sec.id === viewId) {
      sec.classList.add("active-view");
    } else {
      sec.classList.remove("active-view");
    }
  });

  renderAllViews();
}

function onGlobalProjectChange(projectId) {
  AppState.activeProjectId = projectId;
  AppState.activeSprintId = null;
  populateDropdowns();
  renderAllViews();
}

function onGlobalSearch(query) {
  AppState.searchQuery = query.trim().toLowerCase();
  renderAllViews();
}

function setupGlobalEvents() {
  // Close modals on overlay backdrop click
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });
}

/* ==========================================================================
   Render Controllers inside Workspace
   ========================================================================== */

function renderAllViews() {
  switch (AppState.activeView) {
    case "dashboard-view":
      renderDashboard();
      break;
    case "kanban-view":
      renderKanban();
      break;
    case "projects-view":
      renderProjects();
      break;
    case "team-view":
      renderTeam();
      break;
    case "settings-view":
      renderStatuses();
      break;
  }
}

/* 1. Dashboard View */
function renderDashboard() {
  const tenantProjects = getTenantProjects();
  const tenantSprints = getTenantSprints();
  const tenantTasks = getTenantTasks();
  const tenantUsers = getTenantUsers();

  const totalProjects = tenantProjects.length;
  const activeSprints = tenantSprints.filter(s => s.status === "active").length;
  
  const doneStatusId = AppState.statuses.find(s => s.name.toLowerCase() === "done")?.id || "status-done";
  const completedTasks = tenantTasks.filter(t => t.statusId === doneStatusId).length;
  const totalTeam = tenantUsers.length;

  document.getElementById("stat-total-projects").textContent = totalProjects;
  document.getElementById("stat-active-sprints").textContent = activeSprints;
  document.getElementById("stat-completed-tasks").textContent = completedTasks;
  document.getElementById("stat-team-count").textContent = totalTeam;

  // Render Projects Grid
  const grid = document.getElementById("dashboard-projects-grid");
  grid.innerHTML = "";

  const filteredProjects = tenantProjects.filter(p => 
    !AppState.searchQuery || p.name.toLowerCase().includes(AppState.searchQuery) || (p.description && p.description.toLowerCase().includes(AppState.searchQuery))
  );

  if (filteredProjects.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📁</div><p>No projects found for this workspace.</p></div>`;
    return;
  }

  filteredProjects.forEach(project => {
    const projectTasks = tenantTasks.filter(t => t.projectId === project.id);
    const completedCount = projectTasks.filter(t => t.statusId === doneStatusId).length;
    const progressPercent = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;
    const sprintCount = tenantSprints.filter(s => s.projectId === project.id).length;

    const card = document.createElement("div");
    card.className = "project-card";
    card.style.setProperty("--card-color", project.color || "#6366f1");
    card.innerHTML = `
      <div class="project-card-header">
        <h4 class="project-card-title">${escapeHtml(project.name)}</h4>
        <span class="project-category-badge">${escapeHtml(project.category || "General")}</span>
      </div>
      <p class="project-card-desc">${escapeHtml(project.description || "No description provided.")}</p>
      
      <div class="progress-bar-wrapper">
        <div class="progress-bar-header">
          <span>Task Progress</span>
          <span>${progressPercent}% (${completedCount}/${projectTasks.length})</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="project-card-footer">
        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">
          🏃 ${sprintCount} Sprints
        </span>
        <button class="btn btn-secondary btn-sm" onclick="selectProjectAndOpenKanban('${project.id}')">
          View Board →
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function selectProjectAndOpenKanban(projectId) {
  AppState.activeProjectId = projectId;
  document.getElementById("global-project-select").value = projectId;
  switchView("kanban-view");
}

/* 2. Sprint Kanban Board View */
function renderKanban() {
  const tenantProjects = getTenantProjects();
  const currentProject = tenantProjects.find(p => p.id === AppState.activeProjectId) || tenantProjects[0];
  const titleEl = document.getElementById("kanban-project-title");

  if (!currentProject) {
    titleEl.textContent = "Sprint Board";
    document.getElementById("sprint-tabs-bar").innerHTML = "";
    document.getElementById("kanban-board-container").innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><p>No projects found in this workspace. Create a project to start.</p></div>`;
    return;
  }

  titleEl.textContent = `${currentProject.name} - Sprint Board`;

  const projectSprints = getTenantSprints().filter(s => s.projectId === currentProject.id);

  if (!AppState.activeSprintId || !projectSprints.some(s => s.id === AppState.activeSprintId)) {
    const activeOne = projectSprints.find(s => s.status === "active") || projectSprints[0];
    AppState.activeSprintId = activeOne ? activeOne.id : null;
  }

  // Render Sprint Tabs
  const tabsBar = document.getElementById("sprint-tabs-bar");
  tabsBar.innerHTML = "";

  if (projectSprints.length === 0) {
    tabsBar.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-dim); padding: 0.4rem 0.8rem;">No sprints created for this project yet.</span>`;
  } else {
    projectSprints.forEach(sprint => {
      const tab = document.createElement("div");
      tab.className = `sprint-tab ${sprint.id === AppState.activeSprintId ? "active" : ""}`;
      tab.innerHTML = `
        ${escapeHtml(sprint.name)}
        <span style="font-size: 0.7rem; opacity: 0.8; margin-left: 0.4rem;">(${sprint.status})</span>
      `;
      tab.onclick = () => {
        AppState.activeSprintId = sprint.id;
        renderKanban();
      };
      tabsBar.appendChild(tab);
    });
  }

  // Render Kanban Board Columns
  const container = document.getElementById("kanban-board-container");
  container.innerHTML = "";

  const sprintTasks = getTenantTasks().filter(t => 
    t.projectId === currentProject.id && 
    (!AppState.activeSprintId || t.sprintId === AppState.activeSprintId) &&
    (!AppState.searchQuery || t.name.toLowerCase().includes(AppState.searchQuery) || (t.description && t.description.toLowerCase().includes(AppState.searchQuery)))
  );

  AppState.statuses.forEach(status => {
    const colTasks = sprintTasks.filter(t => t.statusId === status.id);

    const col = document.createElement("div");
    col.className = "kanban-column";
    col.innerHTML = `
      <div class="kanban-column-header">
        <div class="column-title-group">
          <div class="column-status-dot" style="background: ${status.color || '#6366f1'};"></div>
          <span class="column-title">${escapeHtml(status.name)}</span>
        </div>
        <span class="task-count-badge">${colTasks.length}</span>
      </div>
      <div class="kanban-cards-container" 
           ondragover="handleDragOver(event)" 
           ondragleave="handleDragLeave(event)" 
           ondrop="handleDrop(event, '${status.id}')">
      </div>
    `;

    const cardsContainer = col.querySelector(".kanban-cards-container");

    colTasks.forEach(task => {
      const user = getTenantUsers().find(u => u.id === task.assignedUserId);
      const subtaskCount = task.subtasks ? task.subtasks.length : 0;
      const completedSubtasks = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;

      const card = document.createElement("div");
      card.className = "task-card";
      card.draggable = true;
      card.ondragstart = (e) => handleDragStart(e, task.id);
      card.onclick = () => openTaskModal(task.id);

      card.innerHTML = `
        <div class="task-card-header">
          <span class="priority-badge priority-${task.priority || 'medium'}">${escapeHtml(task.priority || 'medium')}</span>
          ${task.dueDate ? `<span class="task-due-date">📅 ${task.dueDate}</span>` : ""}
        </div>
        <h5 class="task-card-title">${escapeHtml(task.name)}</h5>
        ${subtaskCount > 0 ? `
          <div class="task-subtasks-summary">
            <span>☑ ${completedSubtasks}/${subtaskCount} Subtasks</span>
          </div>
        ` : ""}
        <div class="task-card-footer">
          ${user ? `
            <div class="user-avatar" style="background: ${user.avatarBg || '#6366f1'};" title="${escapeHtml(user.fullname)}">
              ${getUserInitials(user.fullname)}
            </div>
          ` : `<span style="font-size: 0.75rem; color: var(--text-dim);">Unassigned</span>`}
          <span style="font-size: 0.75rem; color: var(--text-dim);">Edit →</span>
        </div>
      `;
      cardsContainer.appendChild(card);
    });

    container.appendChild(col);
  });
}

/* Drag & Drop Handlers */
let draggedTaskId = null;

function handleDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function handleDrop(e, newStatusId) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");

  if (draggedTaskId) {
    const task = AppState.tasks.find(t => t.id === draggedTaskId);
    if (task && task.statusId !== newStatusId) {
      task.statusId = newStatusId;
      saveStore();
      showToast(`Task moved to ${getStatusName(newStatusId)}`, "success");
      renderKanban();
    }
    draggedTaskId = null;
  }
}

/* 3. Projects View */
function renderProjects() {
  const grid = document.getElementById("all-projects-grid");
  grid.innerHTML = "";

  const tenantProjects = getTenantProjects();
  const tenantTasks = getTenantTasks();
  const tenantSprints = getTenantSprints();

  tenantProjects.forEach(project => {
    const projectTasks = tenantTasks.filter(t => t.projectId === project.id);
    const sprintCount = tenantSprints.filter(s => s.projectId === project.id).length;

    const card = document.createElement("div");
    card.className = "project-card";
    card.style.setProperty("--card-color", project.color || "#6366f1");
    card.innerHTML = `
      <div class="project-card-header">
        <h4 class="project-card-title">${escapeHtml(project.name)}</h4>
        <span class="project-category-badge">${escapeHtml(project.category || "General")}</span>
      </div>
      <p class="project-card-desc">${escapeHtml(project.description || "No description provided.")}</p>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
        <div>📊 Total Tasks: <strong>${projectTasks.length}</strong></div>
        <div>🏃 Total Sprints: <strong>${sprintCount}</strong></div>
      </div>
      <div class="project-card-footer">
        <button class="btn btn-secondary btn-sm" onclick="openProjectModal('${project.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProject('${project.id}')">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* 4. Team Members View */
function renderTeam() {
  const grid = document.getElementById("team-members-grid");
  grid.innerHTML = "";

  const tenantUsers = getTenantUsers();
  const tenantTasks = getTenantTasks();

  tenantUsers.forEach(user => {
    const assignedTasks = tenantTasks.filter(t => t.assignedUserId === user.id);

    const card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML = `
      <div class="user-avatar-large" style="background: ${user.avatarBg || '#6366f1'};">
        ${getUserInitials(user.fullname)}
      </div>
      <div class="user-name">${escapeHtml(user.fullname)}</div>
      <div class="user-role">${escapeHtml(user.role || "Team Member")}</div>
      <div class="user-email">${escapeHtml(user.email || "")}</div>
      <div style="font-size: 0.8rem; font-weight: 600; color: var(--accent-primary); margin-top: 0.5rem;">
        📌 ${assignedTasks.length} Assigned Tasks
      </div>
      <button class="btn btn-secondary btn-sm" style="margin-top: 0.5rem;" onclick="deleteUser('${user.id}')">Remove</button>
    `;
    grid.appendChild(card);
  });
}

/* 5. Workflow Statuses View */
function renderStatuses() {
  const container = document.getElementById("statuses-list-container");
  container.innerHTML = "";

  AppState.statuses.forEach(status => {
    const item = document.createElement("div");
    item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.25rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md);";
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.8rem;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: ${status.color};"></div>
        <span style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(status.name)}</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteStatus('${status.id}')">Delete</button>
    `;
    container.appendChild(item);
  });
}

/* Dropdown Populator */
function populateDropdowns() {
  const tenantProjects = getTenantProjects();
  const tenantUsers = getTenantUsers();
  const tenantSprints = getTenantSprints();

  // Global Project Select
  const globalSelect = document.getElementById("global-project-select");
  globalSelect.innerHTML = `<option value="all">All Projects</option>`;
  tenantProjects.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === AppState.activeProjectId) opt.selected = true;
    globalSelect.appendChild(opt);
  });

  // Sprint Modal Project Select
  const sprintProjSelect = document.getElementById("sprint-project-id");
  sprintProjSelect.innerHTML = "";
  tenantProjects.forEach(p => {
    sprintProjSelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
  });

  // Task Modal Project Select
  const taskProjSelect = document.getElementById("task-project-id");
  taskProjSelect.innerHTML = "";
  tenantProjects.forEach(p => {
    taskProjSelect.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
  });

  if (tenantProjects.length > 0) {
    populateTaskSprintOptions(taskProjSelect.value || tenantProjects[0].id);
  }

  // Task Modal Status Select
  const taskStatusSelect = document.getElementById("task-status-id");
  taskStatusSelect.innerHTML = "";
  AppState.statuses.forEach(s => {
    taskStatusSelect.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
  });

  // Task Modal User Select
  const taskUserSelect = document.getElementById("task-assigned-user");
  taskUserSelect.innerHTML = `<option value="">Unassigned</option>`;
  tenantUsers.forEach(u => {
    taskUserSelect.innerHTML += `<option value="${u.id}">${escapeHtml(u.fullname)}</option>`;
  });
}

function populateTaskSprintOptions(projectId) {
  const sprintSelect = document.getElementById("task-sprint-id");
  sprintSelect.innerHTML = "";
  const sprints = getTenantSprints().filter(s => s.projectId === projectId);
  
  if (sprints.length === 0) {
    sprintSelect.innerHTML = `<option value="">No sprints available</option>`;
    return;
  }

  sprints.forEach(s => {
    sprintSelect.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)} (${s.status})</option>`;
  });
}

/* Modals & Forms */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

/* Project Form */
function openProjectModal(projectId = null) {
  const form = document.getElementById("project-form");
  form.reset();

  if (projectId) {
    const project = AppState.projects.find(p => p.id === projectId);
    if (project) {
      document.getElementById("project-id").value = project.id;
      document.getElementById("project-name").value = project.name;
      document.getElementById("project-description").value = project.description || "";
      document.getElementById("project-category").value = project.category || "";
      document.getElementById("project-color").value = project.color || "#6366f1";
    }
  } else {
    document.getElementById("project-id").value = "";
  }
  openModal("project-modal");
}

function handleSaveProject(e) {
  e.preventDefault();
  const id = document.getElementById("project-id").value;
  const name = document.getElementById("project-name").value.trim();
  const description = document.getElementById("project-description").value.trim();
  const category = document.getElementById("project-category").value.trim();
  const color = document.getElementById("project-color").value;

  if (id) {
    const p = AppState.projects.find(x => x.id === id);
    if (p) {
      p.name = name;
      p.description = description;
      p.category = category;
      p.color = color;
    }
  } else {
    const newProj = {
      id: generateId("proj"),
      tenantId: AppState.currentTenantId,
      name,
      description,
      category,
      color,
      createdAt: new Date().toISOString()
    };
    AppState.projects.push(newProj);
    AppState.activeProjectId = newProj.id;
  }

  saveStore();
  populateDropdowns();
  renderAllViews();
  closeModal("project-modal");
  showToast("Project saved successfully!", "success");
}

function deleteProject(id) {
  if (confirm("Are you sure you want to delete this project and all related sprints/tasks?")) {
    AppState.projects = AppState.projects.filter(p => p.id !== id);
    AppState.sprints = AppState.sprints.filter(s => s.projectId !== id);
    AppState.tasks = AppState.tasks.filter(t => t.projectId !== id);

    const tenantProjects = getTenantProjects();
    if (AppState.activeProjectId === id) {
      AppState.activeProjectId = tenantProjects.length > 0 ? tenantProjects[0].id : "all";
    }

    saveStore();
    populateDropdowns();
    renderAllViews();
    showToast("Project deleted.", "warning");
  }
}

/* Sprint Form */
function handleSaveSprint(e) {
  e.preventDefault();
  const id = document.getElementById("sprint-id").value;
  const projectId = document.getElementById("sprint-project-id").value;
  const name = document.getElementById("sprint-name").value.trim();
  const startDate = document.getElementById("sprint-start-date").value;
  const endDate = document.getElementById("sprint-end-date").value;
  const status = document.getElementById("sprint-status").value;

  if (id) {
    const s = AppState.sprints.find(x => x.id === id);
    if (s) {
      s.projectId = projectId;
      s.name = name;
      s.startDate = startDate;
      s.endDate = endDate;
      s.status = status;
    }
  } else {
    const newSprint = {
      id: generateId("sprint"),
      tenantId: AppState.currentTenantId,
      projectId,
      name,
      startDate,
      endDate,
      status
    };
    AppState.sprints.push(newSprint);
    AppState.activeSprintId = newSprint.id;
  }

  saveStore();
  renderAllViews();
  closeModal("sprint-modal");
  showToast("Sprint saved!", "success");
}

/* Task Form & Subtasks */
function openTaskModal(taskId = null) {
  const form = document.getElementById("task-form");
  form.reset();
  AppState.transientSubtasks = [];

  const deleteBtn = document.getElementById("task-delete-btn");

  if (taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (task) {
      document.getElementById("task-id").value = task.id;
      document.getElementById("task-project-id").value = task.projectId;
      populateTaskSprintOptions(task.projectId);
      document.getElementById("task-sprint-id").value = task.sprintId;
      document.getElementById("task-name").value = task.name;
      document.getElementById("task-description").value = task.description || "";
      document.getElementById("task-status-id").value = task.statusId;
      document.getElementById("task-priority").value = task.priority || "medium";
      document.getElementById("task-assigned-user").value = task.assignedUserId || "";
      document.getElementById("task-due-date").value = task.dueDate || "";

      AppState.transientSubtasks = task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [];
      deleteBtn.style.display = "block";
    }
  } else {
    document.getElementById("task-id").value = "";
    const tenantProjects = getTenantProjects();
    if (AppState.activeProjectId !== "all" && AppState.activeProjectId) {
      document.getElementById("task-project-id").value = AppState.activeProjectId;
      populateTaskSprintOptions(AppState.activeProjectId);
    } else if (tenantProjects.length > 0) {
      document.getElementById("task-project-id").value = tenantProjects[0].id;
      populateTaskSprintOptions(tenantProjects[0].id);
    }
    deleteBtn.style.display = "none";
  }

  renderSubtaskChecklist();
  openModal("task-modal");
}

function handleSaveTask(e) {
  e.preventDefault();
  const id = document.getElementById("task-id").value;
  const projectId = document.getElementById("task-project-id").value;
  const sprintId = document.getElementById("task-sprint-id").value;
  const name = document.getElementById("task-name").value.trim();
  const description = document.getElementById("task-description").value.trim();
  const statusId = document.getElementById("task-status-id").value;
  const priority = document.getElementById("task-priority").value;
  const assignedUserId = document.getElementById("task-assigned-user").value;
  const dueDate = document.getElementById("task-due-date").value;

  if (id) {
    const task = AppState.tasks.find(t => t.id === id);
    if (task) {
      task.projectId = projectId;
      task.sprintId = sprintId;
      task.name = name;
      task.description = description;
      task.statusId = statusId;
      task.priority = priority;
      task.assignedUserId = assignedUserId;
      task.dueDate = dueDate;
      task.subtasks = AppState.transientSubtasks;
    }
  } else {
    const newTask = {
      id: generateId("task"),
      tenantId: AppState.currentTenantId,
      projectId,
      sprintId,
      name,
      description,
      statusId,
      priority,
      assignedUserId,
      dueDate,
      subtasks: AppState.transientSubtasks
    };
    AppState.tasks.push(newTask);
  }

  saveStore();
  renderAllViews();
  closeModal("task-modal");
  showToast("Task saved successfully!", "success");
}

function handleDeleteCurrentTask() {
  const id = document.getElementById("task-id").value;
  if (id && confirm("Are you sure you want to delete this task?")) {
    AppState.tasks = AppState.tasks.filter(t => t.id !== id);
    saveStore();
    renderAllViews();
    closeModal("task-modal");
    showToast("Task deleted.", "warning");
  }
}

/* Subtask checklist logic */
function handleAddSubtaskFromInput() {
  const input = document.getElementById("new-subtask-input");
  const text = input.value.trim();
  if (!text) return;

  AppState.transientSubtasks.push({
    id: generateId("sub"),
    name: text,
    completed: false
  });

  input.value = "";
  renderSubtaskChecklist();
}

function renderSubtaskChecklist() {
  const container = document.getElementById("subtasks-list-container");
  const countText = document.getElementById("subtasks-count-text");
  container.innerHTML = "";

  const total = AppState.transientSubtasks.length;
  const done = AppState.transientSubtasks.filter(s => s.completed).length;
  countText.textContent = `${done}/${total} completed`;

  AppState.transientSubtasks.forEach((sub, idx) => {
    const item = document.createElement("div");
    item.className = "subtask-item";
    item.innerHTML = `
      <input type="checkbox" class="subtask-checkbox" ${sub.completed ? "checked" : ""} onchange="toggleSubtaskItem(${idx})" />
      <span class="subtask-text ${sub.completed ? "completed" : ""}">${escapeHtml(sub.name)}</span>
      <button type="button" class="btn-close" style="background: none; border: none; color: var(--text-dim); cursor: pointer;" onclick="removeSubtaskItem(${idx})">&times;</button>
    `;
    container.appendChild(item);
  });
}

function toggleSubtaskItem(index) {
  if (AppState.transientSubtasks[index]) {
    AppState.transientSubtasks[index].completed = !AppState.transientSubtasks[index].completed;
    renderSubtaskChecklist();
  }
}

function removeSubtaskItem(index) {
  AppState.transientSubtasks.splice(index, 1);
  renderSubtaskChecklist();
}

/* User Form */
function handleSaveUser(e) {
  e.preventDefault();
  const fullname = document.getElementById("user-fullname").value.trim();
  const role = document.getElementById("user-role").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const avatarBg = document.getElementById("user-avatar-bg").value;

  const newUser = {
    id: generateId("usr"),
    tenantId: AppState.currentTenantId,
    fullname,
    role,
    email,
    avatarBg
  };

  AppState.users.push(newUser);
  saveStore();
  populateDropdowns();
  renderAllViews();
  closeModal("user-modal");
  document.getElementById("user-form").reset();
  showToast("Team member added!", "success");
}

function deleteUser(id) {
  if (confirm("Remove team member?")) {
    AppState.users = AppState.users.filter(u => u.id !== id);
    saveStore();
    populateDropdowns();
    renderAllViews();
    showToast("Team member removed.", "warning");
  }
}

/* Status Form */
function handleSaveStatus(e) {
  e.preventDefault();
  const name = document.getElementById("status-name").value.trim();
  const color = document.getElementById("status-color").value;

  const newStatus = {
    id: generateId("status"),
    name,
    color,
    order: AppState.statuses.length + 1
  };

  AppState.statuses.push(newStatus);
  saveStore();
  populateDropdowns();
  renderAllViews();
  closeModal("status-modal");
  document.getElementById("status-form").reset();
  showToast("Custom workflow status added!", "success");
}

function deleteStatus(id) {
  if (AppState.statuses.length <= 2) {
    showToast("You must maintain at least 2 status columns.", "error");
    return;
  }

  if (confirm("Delete status column? Tasks with this status will be moved to the first column.")) {
    const fallbackStatusId = AppState.statuses.find(s => s.id !== id).id;
    AppState.tasks.forEach(t => {
      if (t.statusId === id) t.statusId = fallbackStatusId;
    });

    AppState.statuses = AppState.statuses.filter(s => s.id !== id);
    saveStore();
    populateDropdowns();
    renderAllViews();
    showToast("Status deleted.", "warning");
  }
}

/* ==========================================================================
   Utilities & Toast Notifications
   ========================================================================== */

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : 'ℹ'}</span>
    <div>${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getUserInitials(name) {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getStatusName(statusId) {
  return AppState.statuses.find(s => s.id === statusId)?.name || statusId;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
