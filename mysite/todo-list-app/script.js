/**
 * TaskMaster - Modern Todo & Kanban Board Web Application
 * Features:
 * - HTML5 Drag & Drop Kanban Board (To Do, In Progress, Done)
 * - Mobile Touch Friendly Quick Move Actions
 * - Dual View: Kanban Board & Traditional List View
 * - Backwards compatibility with localStorage.alltodo schema
 */

// Application State
let currentView = localStorage.getItem('todo_view_mode') || 'kanban';
let currentFilter = 'all';
let searchQuery = '';
let selectedPriority = 'Low';
let selectedAddStatus = 'todo';
let editSelectedPriority = 'Low';
let editSelectedStatus = 'todo';
let draggedTaskId = null;

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDateDisplay();
  migrateOldDataIfNeeded();
  setupEventListeners();
  switchView(currentView, false);
});

/**
 * Format Date & Greeting
 */
function initDateDisplay() {
  const dateEl = document.getElementById('current-date-display');
  const greetingEl = document.getElementById('greeting-text');
  
  const now = new Date();
  const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString(undefined, options);
  }

  if (greetingEl) {
    const hours = now.getHours();
    let greeting = 'Good Evening!';
    if (hours < 12) greeting = 'Good Morning!';
    else if (hours < 17) greeting = 'Good Afternoon!';
    greetingEl.textContent = `${greeting} • Stay Productive`;
  }
}

/**
 * Theme Management (Dark / Light)
 */
function initTheme() {
  const savedTheme = localStorage.getItem('todo_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(savedTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'light' : 'dark');
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('todo_theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) {
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
      icon.style.color = '#facc15';
    } else {
      icon.className = 'fa-solid fa-moon';
      icon.style.color = '';
    }
  }
}

/**
 * View Switcher (Kanban vs List)
 */
function switchView(viewMode, shouldSave = true) {
  currentView = viewMode;
  if (shouldSave) {
    localStorage.setItem('todo_view_mode', viewMode);
  }

  const kanbanContainer = document.getElementById('kanban-view-container');
  const listContainer = document.getElementById('list-view-container');
  const kanbanBtn = document.getElementById('view-kanban-btn');
  const listBtn = document.getElementById('view-list-btn');

  if (viewMode === 'kanban') {
    if (kanbanContainer) kanbanContainer.style.display = 'grid';
    if (listContainer) listContainer.style.display = 'none';
    if (kanbanBtn) kanbanBtn.classList.add('active');
    if (listBtn) listBtn.classList.remove('active');
  } else {
    if (kanbanContainer) kanbanContainer.style.display = 'none';
    if (listContainer) listContainer.style.display = 'flex';
    if (kanbanBtn) kanbanBtn.classList.remove('active');
    if (listBtn) listBtn.classList.add('active');
  }

  Display();
}

/**
 * Event Listeners Setup
 */
function setupEventListeners() {
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportTodosBackup);
  }

  // Keyboard shortcut: Escape closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
    }
  });

  // Modal overlay click outside to close
  const modalOverlay = document.getElementById('edit-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeEditModal();
      }
    });
  }
}

/**
 * Normalize & Migrate Data
 */
function migrateOldDataIfNeeded() {
  if (localStorage.alltodo) {
    try {
      const data = JSON.parse(localStorage.alltodo);
      if (Array.isArray(data)) {
        let changed = false;
        const normalized = data.map((item, idx) => {
          if (!item.id) {
            item.id = Date.now() + idx;
            changed = true;
          }
          const isDone = Boolean(item.isComplate || item.isComplete);
          if (!item.status) {
            item.status = isDone ? 'done' : 'todo';
            changed = true;
          }
          if (item.isComplete !== undefined && item.isComplate === undefined) {
            item.isComplate = item.isComplete;
            changed = true;
          }
          if (!item.priority) {
            item.priority = 'Low';
            changed = true;
          }
          if (!item.createdTime) {
            item.createdTime = new Date().toISOString();
            changed = true;
          }
          return item;
        });
        if (changed) {
          localStorage.alltodo = JSON.stringify(normalized);
        }
      }
    } catch (e) {
      console.warn("Could not parse existing todos:", e);
    }
  }
}

/**
 * Storage Helpers
 */
function getTodosList() {
  if (!localStorage.alltodo) return [];
  try {
    const list = JSON.parse(localStorage.alltodo);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("Error reading localStorage.alltodo", err);
    return [];
  }
}

function saveTodosList(todos) {
  localStorage.alltodo = JSON.stringify(todos);
}

/**
 * Input Selector Helpers
 */
function setPriority(level) {
  selectedPriority = level;
  document.querySelectorAll('#priority-options .option-chip').forEach(chip => {
    if (chip.getAttribute('data-priority') === level) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function setAddStatus(status) {
  selectedAddStatus = status;
  document.querySelectorAll('#status-options .option-chip').forEach(chip => {
    if (chip.getAttribute('data-status') === status) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function setEditPriority(level) {
  editSelectedPriority = level;
  document.querySelectorAll('#edit-priority-options .edit-priority-chip').forEach(chip => {
    if (chip.getAttribute('data-priority') === level) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function setEditStatus(status) {
  editSelectedStatus = status;
  document.querySelectorAll('#edit-status-options .edit-status-chip').forEach(chip => {
    if (chip.getAttribute('data-status') === status) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

/**
 * Add a New Todo
 */
function addtodo(customStatus) {
  const inputEl = document.querySelector("#todo");
  if (!inputEl) return;

  const todoText = inputEl.value.trim();

  if (!todoText) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Task name required',
        text: 'Please write a task name before submitting!',
        confirmButtonColor: '#4f46e5',
        timer: 2500
      });
    } else {
      alert("Please enter a todo name");
    }
    return;
  }

  const currentList = getTodosList();
  const status = customStatus || selectedAddStatus || 'todo';
  const isDone = status === 'done';

  const newItem = {
    id: Date.now(),
    name: todoText,
    status: status,
    isComplate: isDone,
    isComplete: isDone,
    priority: selectedPriority || 'Low',
    createdTime: new Date().toISOString()
  };

  currentList.unshift(newItem);
  saveTodosList(currentList);
  
  inputEl.value = "";
  showToast("Task added to " + getStatusLabel(status));
  Display();
}

function quickAddForColumn(status) {
  const inputEl = document.querySelector("#todo");
  setAddStatus(status);
  if (inputEl) {
    inputEl.focus();
    inputEl.placeholder = `Add task to ${getStatusLabel(status)}...`;
  }
}

function getStatusLabel(status) {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'done') return 'Done';
  return 'To Do';
}

/**
 * Format Time Helper
 */
function formatTime(timeVal) {
  if (!timeVal) return "";
  try {
    const d = new Date(timeVal);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return "";
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Drag and Drop Event Handlers (Desktop & Touch)
 */
function handleDragStart(e, id) {
  draggedTaskId = id;
  e.dataTransfer.setData('text/plain', String(id));
  e.dataTransfer.effectAllowed = 'move';
  
  const targetCard = document.getElementById(`kanban-card-${id}`);
  if (targetCard) {
    setTimeout(() => targetCard.classList.add('is-dragging'), 0);
  }
}

function handleDragEnd(e) {
  if (draggedTaskId) {
    const targetCard = document.getElementById(`kanban-card-${draggedTaskId}`);
    if (targetCard) {
      targetCard.classList.remove('is-dragging');
    }
  }
  draggedTaskId = null;
  document.querySelectorAll('.kanban-dropzone').forEach(zone => {
    zone.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const dropzone = e.currentTarget;
  if (dropzone && !dropzone.classList.contains('drag-over')) {
    dropzone.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  const dropzone = e.currentTarget;
  if (dropzone && (!e.relatedTarget || !dropzone.contains(e.relatedTarget))) {
    dropzone.classList.remove('drag-over');
  }
}

function handleDrop(e, targetStatus) {
  e.preventDefault();
  const dropzone = e.currentTarget;
  if (dropzone) {
    dropzone.classList.remove('drag-over');
  }

  const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
  if (!id) return;

  moveTaskStatus(id, targetStatus);
}

/**
 * Move Task Status Helper (Used by Drag-Drop & Mobile Quick Buttons)
 */
function moveTaskStatus(id, newStatus) {
  const todos = getTodosList();
  let taskName = '';
  const updated = todos.map(todo => {
    if (String(todo.id) === String(id)) {
      taskName = todo.name;
      const isDone = (newStatus === 'done');
      return {
        ...todo,
        status: newStatus,
        isComplate: isDone,
        isComplete: isDone
      };
    }
    return todo;
  });

  saveTodosList(updated);
  showToast(`Moved to ${getStatusLabel(newStatus)}`);
  Display();
}

/**
 * Render Todos to DOM (Kanban & List Views)
 */
function Display() {
  const allTodos = getTodosList();

  // Normalize item statuses if missing
  allTodos.forEach(item => {
    if (!item.status) {
      item.status = (item.isComplate || item.isComplete) ? 'done' : 'todo';
    }
  });

  // Calculate statistics
  const totalCount = allTodos.length;
  const todoCount = allTodos.filter(t => t.status === 'todo').length;
  const inprogressCount = allTodos.filter(t => t.status === 'in-progress').length;
  const completedCount = allTodos.filter(t => t.status === 'done' || t.isComplate || t.isComplete).length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Update Header & Badge Stats
  const statTotal = document.getElementById('stat-total');
  const statInProgress = document.getElementById('stat-inprogress');
  const statCompleted = document.getElementById('stat-completed');
  const countAll = document.getElementById('count-all');
  const countTodo = document.getElementById('count-todo');
  const countInprogress = document.getElementById('count-inprogress');
  const countDone = document.getElementById('count-done');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-percent');

  if (statTotal) statTotal.textContent = `${totalCount} ${totalCount === 1 ? 'Task' : 'Tasks'}`;
  if (statInProgress) statInProgress.textContent = `${inprogressCount} In Progress`;
  if (statCompleted) statCompleted.textContent = `${completedCount} Done`;

  if (countAll) countAll.textContent = totalCount;
  if (countTodo) countTodo.textContent = todoCount;
  if (countInprogress) countInprogress.textContent = inprogressCount;
  if (countDone) countDone.textContent = completedCount;

  if (progressFill) progressFill.style.width = `${progressPercent}%`;
  if (progressText) progressText.textContent = `${progressPercent}%`;

  // Update Kanban Column Header Counts
  const kCountTodo = document.getElementById('kanban-count-todo');
  const kCountInprog = document.getElementById('kanban-count-inprogress');
  const kCountDone = document.getElementById('kanban-count-done');
  if (kCountTodo) kCountTodo.textContent = todoCount;
  if (kCountInprog) kCountInprog.textContent = inprogressCount;
  if (kCountDone) kCountDone.textContent = completedCount;

  // Filter tasks based on Search Query
  const filteredTodos = allTodos.filter(todo => {
    if (searchQuery) {
      return (todo.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Render Current View
  if (currentView === 'kanban') {
    renderKanbanBoard(filteredTodos);
  } else {
    renderListView(filteredTodos, totalCount);
  }
}

/**
 * Render Kanban Board View
 */
function renderKanbanBoard(todos) {
  const dropTodo = document.getElementById('dropzone-todo');
  const dropInProg = document.getElementById('dropzone-in-progress');
  const dropDone = document.getElementById('dropzone-done');

  if (!dropTodo || !dropInProg || !dropDone) return;

  const todoTasks = todos.filter(t => t.status === 'todo');
  const inprogressTasks = todos.filter(t => t.status === 'in-progress');
  const doneTasks = todos.filter(t => t.status === 'done');

  dropTodo.innerHTML = renderKanbanCards(todoTasks, 'todo');
  dropInProg.innerHTML = renderKanbanCards(inprogressTasks, 'in-progress');
  dropDone.innerHTML = renderKanbanCards(doneTasks, 'done');
}

function renderKanbanCards(tasks, columnStatus) {
  if (tasks.length === 0) {
    return `
      <div class="drop-empty-hint">
        <i class="fa-regular fa-folder-open" style="font-size: 1.5rem; opacity: 0.5;"></i>
        <span>No tasks in ${getStatusLabel(columnStatus)}</span>
      </div>
    `;
  }

  return tasks.map(todo => {
    const isDone = (todo.status === 'done');
    const priority = todo.priority || 'Low';
    const priorityLower = priority.toLowerCase();
    const formattedTime = formatTime(todo.createdTime);

    // Mobile / Quick Shift Buttons
    let moveButtons = '';
    if (columnStatus === 'todo') {
      moveButtons = `
        <button class="move-pill-btn" onclick="moveTaskStatus(${todo.id}, 'in-progress')" title="Move to In Progress">
          <span>In Progress</span> <i class="fa-solid fa-arrow-right"></i>
        </button>
      `;
    } else if (columnStatus === 'in-progress') {
      moveButtons = `
        <button class="move-pill-btn" onclick="moveTaskStatus(${todo.id}, 'todo')" title="Move back to To Do">
          <i class="fa-solid fa-arrow-left"></i> <span>To Do</span>
        </button>
        <button class="move-pill-btn" onclick="moveTaskStatus(${todo.id}, 'done')" title="Move to Done">
          <span>Done</span> <i class="fa-solid fa-arrow-right"></i>
        </button>
      `;
    } else if (columnStatus === 'done') {
      moveButtons = `
        <button class="move-pill-btn" onclick="moveTaskStatus(${todo.id}, 'in-progress')" title="Reopen to In Progress">
          <i class="fa-solid fa-arrow-left"></i> <span>In Progress</span>
        </button>
      `;
    }

    return `
      <div
        class="kanban-card ${isDone ? 'completed' : ''}"
        id="kanban-card-${todo.id}"
        draggable="true"
        ondragstart="handleDragStart(event, ${todo.id})"
        ondragend="handleDragEnd(event)"
      >
        <div class="kanban-card-top">
          <span class="priority-tag ${priorityLower}">${priority}</span>
          <div class="kanban-card-actions">
            <button class="card-tiny-btn" onclick="showpopup(${todo.id})" title="Edit task" aria-label="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="card-tiny-btn del" onclick="deletetodo(${todo.id})" title="Delete task" aria-label="Delete">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        <div class="kanban-card-title">${escapeHtml(todo.name)}</div>

        <div class="kanban-card-footer">
          <div class="kanban-move-actions">
            ${moveButtons}
          </div>
          ${formattedTime ? `<span class="meta-time"><i class="fa-regular fa-clock"></i> ${formattedTime}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Traditional List View
 */
function renderListView(todos, totalCount) {
  const container = document.getElementById('list-view-container');
  if (!container) return;

  // Apply tab filter in list view
  const filtered = todos.filter(todo => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'todo') return todo.status === 'todo';
    if (currentFilter === 'in-progress') return todo.status === 'in-progress';
    if (currentFilter === 'done') return todo.status === 'done' || todo.isComplate || todo.isComplete;
    return true;
  });

  if (filtered.length === 0) {
    if (totalCount === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-clipboard-list"></i></div>
          <div class="empty-title">No tasks yet!</div>
          <div class="empty-sub">Add your first task above to kickstart your productive day.</div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-filter-circle-xmark"></i></div>
          <div class="empty-title">No matching tasks</div>
          <div class="empty-sub">Try adjusting your search query or switching active filter tabs.</div>
        </div>
      `;
    }
    return;
  }

  let html = '';
  filtered.forEach(todo => {
    const isDone = (todo.status === 'done' || todo.isComplate || todo.isComplete);
    const priority = todo.priority || 'Low';
    const priorityLower = priority.toLowerCase();
    const formattedTime = formatTime(todo.createdTime);
    const status = todo.status || 'todo';

    html += `
      <div class="todo-card ${isDone ? 'completed' : ''} priority-${priorityLower}" id="todo-card-${todo.id}">
        <div class="todo-left" onclick="toggleTaskCompletion(${todo.id})" title="Click to toggle status">
          <div class="custom-checkbox" aria-label="Toggle task completion">
            <i class="fa-solid fa-check"></i>
          </div>
          <div class="todo-content">
            <div class="todo-title">${escapeHtml(todo.name)}</div>
            <div class="todo-meta-row">
              <span class="status-badge ${status}">${getStatusLabel(status)}</span>
              ${priority !== 'Low' ? `<span class="priority-tag ${priorityLower}">${priority}</span>` : ''}
              ${formattedTime ? `<span class="meta-time"><i class="fa-regular fa-clock"></i> ${formattedTime}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="todo-actions">
          <button class="action-btn edit" onclick="showpopup(${todo.id})" title="Edit task" aria-label="Edit task">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="action-btn delete" onclick="deletetodo(${todo.id})" title="Delete task" aria-label="Delete task">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Toggle Task Completion (List View Checkbox)
 */
function toggleTaskCompletion(id) {
  const todos = getTodosList();
  const updated = todos.map(todo => {
    if (String(todo.id) === String(id)) {
      const isCurrentlyDone = (todo.status === 'done' || todo.isComplate || todo.isComplete);
      const nextDone = !isCurrentlyDone;
      const nextStatus = nextDone ? 'done' : 'todo';
      return {
        ...todo,
        status: nextStatus,
        isComplate: nextDone,
        isComplete: nextDone
      };
    }
    return todo;
  });

  saveTodosList(updated);
  Display();
}

// Backward-compatible alias
function isFinish(id) {
  toggleTaskCompletion(id);
}

/**
 * Delete a Single Todo with SweetAlert Confirmation
 */
function deletetodo(id) {
  const todos = getTodosList();
  const target = todos.find(t => String(t.id) === String(id));
  const taskName = target ? target.name : 'this task';

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Delete Task?',
      text: `Are you sure you want to delete "${taskName.substring(0, 40)}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it'
    }).then((result) => {
      if (result.isConfirmed) {
        performDelete(id);
        showToast("Task deleted");
      }
    });
  } else {
    if (confirm("Are you sure you want to delete this task?")) {
      performDelete(id);
    }
  }
}

function performDelete(id) {
  const todos = getTodosList().filter(t => String(t.id) !== String(id));
  saveTodosList(todos);
  Display();
}

/**
 * Show Edit Popup / Modal
 */
function showpopup(id) {
  const todos = getTodosList();
  const target = todos.find(t => String(t.id) === String(id));
  if (!target) return;

  const idInput = document.querySelector("#todoid");
  const nameInput = document.querySelector("#newtodoname");

  if (idInput) idInput.value = target.id;
  if (nameInput) {
    nameInput.value = target.name || "";
    setTimeout(() => nameInput.focus(), 150);
  }

  setEditPriority(target.priority || 'Low');
  setEditStatus(target.status || 'todo');

  const modal = document.getElementById("edit-modal");
  if (modal) {
    modal.classList.add("active");
  }
}

/**
 * Close Edit Modal
 */
function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

/**
 * Save / Update Todo from Modal
 */
function updatetodo() {
  const idInput = document.querySelector("#todoid");
  const nameInput = document.querySelector("#newtodoname");

  if (!idInput || !nameInput) return;

  const id = idInput.value;
  const newName = nameInput.value.trim();

  if (!newName) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Task cannot be empty',
        text: 'Please enter a valid task name.',
        confirmButtonColor: '#4f46e5'
      });
    } else {
      alert("Please enter a valid task name");
    }
    return;
  }

  const todos = getTodosList();
  const updated = todos.map(todo => {
    if (String(todo.id) === String(id)) {
      const isDone = (editSelectedStatus === 'done');
      return {
        ...todo,
        name: newName,
        priority: editSelectedPriority || todo.priority || 'Low',
        status: editSelectedStatus || todo.status || 'todo',
        isComplate: isDone,
        isComplete: isDone
      };
    }
    return todo;
  });

  saveTodosList(updated);
  closeEditModal();
  showToast("Task updated successfully!");
  Display();
}

/**
 * Clear All Todos with Confirmation
 */
function clearalltodo() {
  const todos = getTodosList();
  if (todos.length === 0) {
    showToast("Todo list is already empty.");
    return;
  }

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Clear All Tasks?',
      text: "This will permanently remove all your todos from all columns.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, clear all!'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("alltodo");
        Display();
        showToast("All tasks have been cleared.");
      }
    });
  } else {
    if (confirm("Are you sure you want to clear all tasks?")) {
      localStorage.removeItem("alltodo");
      Display();
    }
  }
}

/**
 * Clear Completed / Done Todos
 */
function clearCompletedTodos() {
  const todos = getTodosList();
  const activeTodos = todos.filter(t => t.status !== 'done' && !t.isComplate && !t.isComplete);
  
  if (activeTodos.length === todos.length) {
    showToast("No completed tasks to clean!");
    return;
  }

  saveTodosList(activeTodos);
  Display();
  showToast("Cleaned completed tasks!");
}

/**
 * Search Handler
 */
function handleSearch(val) {
  searchQuery = (val || '').trim();
  const clearBtn = document.getElementById('clear-search');
  if (clearBtn) {
    clearBtn.style.display = searchQuery ? 'block' : 'none';
  }
  Display();
}

function clearSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  handleSearch('');
}

/**
 * Filter Tabs Handler (List View)
 */
function setFilter(filterType) {
  currentFilter = filterType;
  document.querySelectorAll('#list-filter-tabs .filter-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === filterType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  Display();
}

/**
 * Export Backup as JSON
 */
function exportTodosBackup() {
  const todos = getTodosList();
  if (todos.length === 0) {
    showToast("No tasks to export!");
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `taskmaster_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Backup exported successfully!");
}

/**
 * Lightweight Toast Notification
 */
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success)"></i> <span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}
