"use strict";

/* =========================================================
   DAILY OS 3.0 FINAL
   Storage key is intentionally preserved for existing data.
========================================================= */

const STORAGE_KEY = "daily-os-data";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parseDate = (key) => {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    ? date : null;
};

const addDays = (key, amount) => {
  const date = parseDate(key);
  if (!date) return key;
  date.setDate(date.getDate() + amount);
  return dateKey(date);
};

const formatDate = (key, options = { day: "numeric", month: "short", year: "numeric" }) => {
  const date = parseDate(key);
  return date ? date.toLocaleDateString(undefined, options) : "No date";
};

const uid = () =>
  (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

const safeArray = value => Array.isArray(value) ? value : [];

function normalizeTask(task) {
  const createdAt = task.createdAt || task.date || todayKey();
  return {
    id: String(task.id || uid()),
    title: String(task.title || task.name || "Untitled task"),
    priority: ["High", "Medium", "Low"].includes(task.priority) ? task.priority : "Medium",
    category: ["Personal", "Study", "Trading", "Basketball", "Health"].includes(task.category)
      ? task.category : "Personal",
    dueDate: task.dueDate || task.dateDue || "",
    completed: Boolean(task.completed),
    createdAt,
    completedAt: task.completedAt || (task.completed ? createdAt : null)
  };
}

function normalizeHabit(habit) {
  const history = Array.isArray(habit.history)
    ? habit.history.filter(value => typeof value === "string" && parseDate(value))
    : [];

  // Migrate common legacy completion fields without discarding history.
  if (habit.completed === true && !history.includes(todayKey())) {
    history.push(todayKey());
  }

  return {
    id: String(habit.id || uid()),
    title: String(habit.title || habit.name || "Untitled habit"),
    createdAt: habit.createdAt || todayKey(),
    history: [...new Set(history)].sort()
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [], habits: [] };

    const parsed = JSON.parse(raw);
    return {
      tasks: safeArray(parsed.tasks).map(normalizeTask),
      habits: safeArray(parsed.habits).map(normalizeHabit)
    };
  } catch (error) {
    console.error("DAILY OS: Could not read saved data.", error);
    return { tasks: [], habits: [] };
  }
}

let data = loadData();
let currentPage = "today";
let calendarMode = "month";
let calendarDate = new Date();
let selectedCalendarDate = todayKey();
let toastTimer = null;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("DAILY OS: Could not save data.", error);
    showToast("Could not save data. Check browser storage.");
    return false;
  }
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function setPage(page) {
  currentPage = page;
  $$(".nav-link").forEach(button =>
    button.classList.toggle("active", button.dataset.page === page)
  );
  $("#sidebar").classList.remove("open");
  render();
}

function updateHeader() {
  $("#header-date").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function pageHeading(title, subtitle, action = "") {
  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">DAILY OS / ${escapeHTML(currentPage)}</div>
        <h1>${title}</h1>
        <div class="subtitle">${subtitle}</div>
      </div>
      ${action}
    </div>`;
}

function emptyState(message) {
  return `<div class="empty">${escapeHTML(message)}</div>`;
}

function taskDone(task) {
  return Boolean(task.completed);
}

function tasksForDay(key) {
  return data.tasks.filter(task =>
    task.dueDate === key || (!task.dueDate && task.createdAt === key)
  );
}

function getStreak(habit) {
  const completed = new Set(habit.history);
  let cursor = todayKey();
  if (!completed.has(cursor)) cursor = addDays(cursor, -1);

  let streak = 0;
  while (completed.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
    if (streak > 10000) break;
  }
  return streak;
}

function statCard(label, value, foot = "") {
  return `
    <div class="panel">
      <div class="stat-label">${escapeHTML(label)}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-foot">${escapeHTML(foot)}</div>
    </div>`;
}

function taskRow(task) {
  const priority = task.priority.toLowerCase();
  const due = task.dueDate
    ? `Due ${formatDate(task.dueDate, { day: "numeric", month: "short" })}`
    : "No due date";

  return `
    <div class="item ${task.completed ? "completed" : ""}">
      <input class="check" type="checkbox" data-action="toggle-task"
        data-id="${escapeHTML(task.id)}" ${task.completed ? "checked" : ""}>
      <div class="item-main">
        <div class="item-title">${escapeHTML(task.title)}</div>
        <div class="item-meta">
          <span class="tag ${priority}">${escapeHTML(task.priority)}</span>
          <span class="tag">${escapeHTML(task.category)}</span>
          <span>${escapeHTML(due)}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="edit-task" data-id="${escapeHTML(task.id)}">Edit</button>
        <button class="icon-btn" data-action="delete-task" data-id="${escapeHTML(task.id)}">×</button>
      </div>
    </div>`;
}

function habitRow(habit) {
  const done = habit.history.includes(todayKey());
  return `
    <div class="item ${done ? "completed" : ""}">
      <input class="check" type="checkbox" data-action="toggle-habit"
        data-id="${escapeHTML(habit.id)}" ${done ? "checked" : ""}>
      <div class="item-main">
        <div class="item-title">${escapeHTML(habit.title)}</div>
        <div class="item-meta">
          <span class="habit-streak">🔥 ${getStreak(habit)} day streak</span>
          <span>${habit.history.length} completions</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="edit-habit" data-id="${escapeHTML(habit.id)}">Edit</button>
        <button class="icon-btn" data-action="delete-habit" data-id="${escapeHTML(habit.id)}">×</button>
      </div>
    </div>`;
}

/* ------------------------- TODAY ------------------------- */

function renderToday() {
  const key = todayKey();
  const todaysTasks = tasksForDay(key);
  const completed = todaysTasks.filter(taskDone).length;
  const total = todaysTasks.length;
  const percent = total ? Math.round(completed / total * 100) : 0;

  const habitsDone = data.habits.filter(h => h.history.includes(key)).length;
  const habitTotal = data.habits.length;
  const habitPercent = habitTotal ? Math.round(habitsDone / habitTotal * 100) : 0;

  const upcoming = data.tasks
    .filter(task => !task.completed && task.dueDate && task.dueDate > key)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const weekBars = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(key, index - 6);
    const dayTasks = tasksForDay(day);
    const done = dayTasks.filter(taskDone).length;
    const rate = dayTasks.length ? done / dayTasks.length * 100 : 0;
    const label = parseDate(day).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
    return `
      <div class="week-bar-wrap">
        <div class="week-bar" style="height:${Math.max(3, rate)}%"></div>
        <div class="week-bar-label">${label}</div>
      </div>`;
  }).join("");

  $("#main-content").innerHTML = `
    ${pageHeading("Today", "Focus on what matters. Make today count.",
      `<button class="btn" data-action="new-task">+ New Task</button>`)}
    <div class="grid grid-4">
      ${statCard("TASKS TODAY", `${completed}/${total}`, `${percent}% completed`)}
      ${statCard("HABITS TODAY", `${habitsDone}/${habitTotal}`, `${habitPercent}% completed`)}
      ${statCard("TOTAL TASKS", data.tasks.length, "All recorded tasks")}
      ${statCard("ACTIVE HABITS", habitTotal, "Your daily commitments")}
    </div>

    <div class="grid grid-2 section-gap">
      <section class="panel">
        <div class="panel-header">
          <h2>Today's Progress</h2><span class="mini-label">${percent}%</span>
        </div>
        <div class="day-summary">
          <div>
            <div class="big-percent">${percent}<span class="mini-label">%</span></div>
            <div class="mini-label">${completed} of ${total} tasks completed</div>
          </div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
        <div class="section-gap">
          <div class="section-title"><h3>Weekly Activity</h3><span class="mini-label">Last 7 days</span></div>
          <div class="week-bars">${weekBars}</div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header"><h2>Today's Habits</h2>
          <button class="btn btn-secondary btn-small" data-action="go-habits">View all</button>
        </div>
        <div class="list">
          ${data.habits.length ? data.habits.map(habitRow).join("") : emptyState("Add your first habit to get started.")}
        </div>
      </section>
    </div>

    <section class="panel section-gap">
      <div class="panel-header">
        <h2>Today's Tasks</h2>
        <button class="btn btn-secondary btn-small" data-action="go-tasks">View all</button>
      </div>
      <div class="list">
        ${todaysTasks.length ? todaysTasks.map(taskRow).join("") : emptyState("No tasks scheduled for today.")}
      </div>
    </section>

    <section class="panel section-gap">
      <div class="panel-header"><h2>Upcoming Tasks</h2><span class="mini-label">Next due dates</span></div>
      <div class="list">
        ${upcoming.length ? upcoming.map(taskRow).join("") : emptyState("No upcoming tasks.")}
      </div>
    </section>`;
}

/* ------------------------- TASKS ------------------------- */

function renderTasks() {
  $("#main-content").innerHTML = `
    ${pageHeading("Tasks", "Plan clearly. Execute consistently.",
      `<button class="btn" data-action="new-task">+ New Task</button>`)}
    <div class="toolbar">
      <input id="task-search" type="search" placeholder="Search tasks...">
      <select id="task-status">
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
      <select id="task-priority">
        <option value="all">All priorities</option>
        <option>High</option><option>Medium</option><option>Low</option>
      </select>
      <select id="task-category">
        <option value="all">All categories</option>
        <option>Personal</option><option>Study</option><option>Trading</option>
        <option>Basketball</option><option>Health</option>
      </select>
    </div>
    <section class="panel">
      <div class="panel-header"><h2>All Tasks</h2><span class="mini-label">${data.tasks.length} total</span></div>
      <div class="list" id="task-list"></div>
    </section>`;

  const update = () => {
    const query = ($("#task-search").value || "").toLowerCase().trim();
    const status = $("#task-status").value;
    const priority = $("#task-priority").value;
    const category = $("#task-category").value;

    const filtered = data.tasks.filter(task => {
      const matchesQuery = task.title.toLowerCase().includes(query);
      const matchesStatus = status === "all" ||
        (status === "active" && !task.completed) ||
        (status === "completed" && task.completed);
      return matchesQuery && matchesStatus &&
        (priority === "all" || task.priority === priority) &&
        (category === "all" || task.category === category);
    }).sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

    $("#task-list").innerHTML = filtered.length
      ? filtered.map(taskRow).join("")
      : emptyState("No matching tasks found.");
  };

  ["task-search", "task-status", "task-priority", "task-category"].forEach(id => {
    $(`#${id}`).addEventListener(id === "task-search" ? "input" : "change", update);
  });
  update();
}

/* ------------------------- HABITS ------------------------- */

function renderHabits() {
  $("#main-content").innerHTML = `
    ${pageHeading("Habits", "Consistency turns actions into identity.",
      `<button class="btn" data-action="new-habit">+ New Habit</button>`)}
    <div class="grid grid-3">
      ${statCard("TOTAL HABITS", data.habits.length, "Active habits")}
      ${statCard("COMPLETED TODAY", data.habits.filter(h => h.history.includes(todayKey())).length,
        "Habits checked today")}
      ${statCard("TOTAL CHECK-INS", data.habits.reduce((sum, h) => sum + h.history.length, 0),
        "All-time completions")}
    </div>
    <section class="panel section-gap">
      <div class="panel-header"><h2>Your Daily Habits</h2><span class="mini-label">${formatDate(todayKey())}</span></div>
      <div class="list">
        ${data.habits.length ? data.habits.map(habitRow).join("") : emptyState("No habits yet. Add one small commitment.")}
      </div>
    </section>
    <section class="panel section-gap">
      <div class="panel-header"><h2>Last 7 Days</h2><span class="mini-label">Habit history</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>HABIT</th>${Array.from({ length: 7 }, (_, i) =>
            `<th>${parseDate(addDays(todayKey(), i - 6)).toLocaleDateString(undefined, { weekday: "short" })}</th>`
          ).join("")}</tr></thead>
          <tbody>
            ${data.habits.map(h => `<tr><td>${escapeHTML(h.title)}</td>${
              Array.from({ length: 7 }, (_, i) => {
                const key = addDays(todayKey(), i - 6);
                return `<td>${h.history.includes(key) ? "✓" : "—"}</td>`;
              }).join("")
            }</tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

/* ------------------------- CALENDAR ------------------------- */

function calendarDayCell(date, currentMonth) {
  const key = dateKey(date);
  const tasks = tasksForDay(key);
  const habits = data.habits.filter(h => h.history.includes(key)).length;
  const isToday = key === todayKey();
  const isSelected = key === selectedCalendarDate;
  return `
    <button class="calendar-day ${currentMonth ? "" : "muted"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}"
      data-action="select-date" data-date="${key}">
      ${date.getDate()}
      <div class="calendar-dots">
        ${tasks.slice(0, 4).map(() => "<i></i>").join("")}
        ${habits ? "<i></i>" : ""}
      </div>
    </button>`;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthLabel = calendarDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const monthStart = new Date(year, month, 1);
  const start = new Date(year, month, 1 - monthStart.getDay());

  let calendarHTML = "";
  if (calendarMode === "month") {
    calendarHTML = `
      <div class="calendar-grid">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day =>
          `<div class="calendar-weekday">${day}</div>`).join("")}
        ${Array.from({ length: 42 }, (_, i) => {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          return calendarDayCell(date, date.getMonth() === month);
        }).join("")}
      </div>`;
  } else {
    const selected = parseDate(selectedCalendarDate) || new Date();
    const weekStart = new Date(selected);
    weekStart.setDate(selected.getDate() - selected.getDay());
    calendarHTML = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const key = dateKey(date);
      const tasks = tasksForDay(key);
      return `
        <div class="week-row">
          <div class="week-row-date">${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</div>
          <div class="week-row-content">
            ${tasks.length ? tasks.map(t => `<span class="tag ${t.priority.toLowerCase()}">${escapeHTML(t.title)}</span>`).join("") : '<span class="mini-label">No tasks</span>'}
            ${data.habits.filter(h => h.history.includes(key)).length
              ? `<span class="tag">Habit check-ins: ${data.habits.filter(h => h.history.includes(key)).length}</span>` : ""}
          </div>
        </div>`;
    }).join("");
  }

  const selectedTasks = tasksForDay(selectedCalendarDate);
  const selectedHabits = data.habits.filter(h => h.history.includes(selectedCalendarDate));

  $("#main-content").innerHTML = `
    ${pageHeading("Calendar", "See your commitments. Review your consistency.")}
    <section class="panel">
      <div class="panel-header">
        <div class="calendar-toolbar">
          <button class="icon-btn" data-action="calendar-prev">‹</button>
          <div class="calendar-title">${calendarMode === "month" ? monthLabel : "Selected week"}</div>
          <button class="icon-btn" data-action="calendar-next">›</button>
          <button class="icon-btn" data-action="calendar-today">Today</button>
        </div>
        <select id="calendar-mode" class="field-input" aria-label="Calendar view">
          <option value="month" ${calendarMode === "month" ? "selected" : ""}>Month</option>
          <option value="week" ${calendarMode === "week" ? "selected" : ""}>Week</option>
        </select>
      </div>
      ${calendarHTML}
    </section>
    <section class="panel section-gap">
      <div class="panel-header">
        <h2>${formatDate(selectedCalendarDate)}</h2>
        <button class="btn btn-secondary btn-small" data-action="new-task">+ Add Task</button>
      </div>
      <div class="list">
        ${selectedTasks.length ? selectedTasks.map(taskRow).join("") : emptyState("No tasks for this date.")}
        ${selectedHabits.map(h => `<div class="item"><div class="item-main"><div class="item-title">✓ ${escapeHTML(h.title)}</div><div class="item-meta">Habit completed</div></div></div>`).join("")}
      </div>
    </section>`;

  $("#calendar-mode").addEventListener("change", event => {
    calendarMode = event.target.value;
    renderCalendar();
  });
}

/* ------------------------- ANALYTICS ------------------------- */

function renderAnalytics() {
  const total = data.tasks.length;
  const completed = data.tasks.filter(t => t.completed).length;
  const active = total - completed;
  const rate = total ? Math.round(completed / total * 100) : 0;

  const priorityCounts = ["High", "Medium", "Low"].map(priority => ({
    label: priority,
    count: data.tasks.filter(t => t.priority === priority).length
  }));

  const categoryCounts = ["Personal", "Study", "Trading", "Basketball", "Health"].map(category => ({
    label: category,
    count: data.tasks.filter(t => t.category === category).length
  }));

  const lastSeven = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(todayKey(), i - 6);
    const created = data.tasks.filter(t => t.createdAt === key).length;
    const done = data.tasks.filter(t => t.completedAt === key).length;
    return { key, created, done };
  });

  const barRows = items => items.map(item => {
    const percent = total ? item.count / total * 100 : 0;
    return `
      <div class="bar-row">
        <span>${escapeHTML(item.label)}</span>
        <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
        <span>${item.count}</span>
      </div>`;
  }).join("");

  $("#main-content").innerHTML = `
    ${pageHeading("Analytics", "Measure your actions. Improve your system.")}
    <div class="grid grid-4">
      ${statCard("TOTAL TASKS", total, "All recorded tasks")}
      ${statCard("COMPLETED", completed, "Tasks completed")}
      ${statCard("ACTIVE", active, "Tasks remaining")}
      ${statCard("COMPLETION RATE", `${rate}%`, "Overall task completion")}
    </div>
    <div class="grid grid-2 section-gap">
      <section class="panel">
        <div class="panel-header"><h2>Priority Breakdown</h2></div>
        ${barRows(priorityCounts)}
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Category Breakdown</h2></div>
        ${barRows(categoryCounts)}
      </section>
    </div>
    <section class="panel section-gap">
      <div class="panel-header"><h2>Last 7 Days</h2><span class="mini-label">Task activity</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>DATE</th><th>CREATED</th><th>COMPLETED</th></tr></thead>
          <tbody>
            ${lastSeven.map(day => `<tr>
              <td>${formatDate(day.key, { weekday: "short", day: "numeric", month: "short" })}</td>
              <td>${day.created}</td><td>${day.done}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="panel section-gap">
      <div class="panel-header"><h2>Habit Overview</h2></div>
      ${data.habits.length ? data.habits.map(h => `
        <div class="bar-row">
          <span>${escapeHTML(h.title)}</span>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, h.history.length / Math.max(1, Math.floor((Date.now() - (parseDate(h.createdAt) || new Date()).getTime()) / 86400000) + 1) * 100)}%"></div></div>
          <span>${h.history.length}</span>
        </div>`).join("") : emptyState("Add habits to see your habit analytics.")}
    </section>`;
}

/* ------------------------- BACKUP ------------------------- */

function renderBackup() {
  const size = new Blob([JSON.stringify(data)]).size;
  $("#main-content").innerHTML = `
    ${pageHeading("Backup", "Protect your progress. Keep your data safe.")}
    <section class="panel">
      <div class="backup-card">
        <div>
          <h2>Export Backup</h2>
          <p>Download a copy of your tasks and habits as a JSON file.<br>
          Current records: ${data.tasks.length} tasks · ${data.habits.length} habits<br>
          Approximate data size: ${size} bytes</p>
        </div>
        <button class="btn" data-action="export-backup">Export JSON</button>
      </div>
    </section>
    <section class="panel section-gap">
      <div class="backup-card">
        <div>
          <h2>Import Backup</h2>
          <p>Restore your data from a DAILY OS JSON backup.<br>
          Importing replaces the current data in this browser.</p>
        </div>
        <label class="btn btn-secondary" for="import-file">Choose File</label>
        <input class="file-input" id="import-file" type="file" accept=".json,application/json">
      </div>
    </section>
    <section class="panel section-gap">
      <h2>Storage Information</h2>
      <p class="subtitle">DAILY OS stores information locally in this browser using localStorage.</p>
      <p class="subtitle">Data does not automatically sync between devices. Export backups regularly.</p>
    </section>`;
}

/* ------------------------- MODALS ------------------------- */

function openModal(content) {
  $("#modal").innerHTML = content;
  $("#modal-backdrop").classList.add("open");
}

function closeModal() {
  $("#modal-backdrop").classList.remove("open");
  $("#modal").innerHTML = "";
}

function taskForm(task = null) {
  const editing = Boolean(task);
  openModal(`
    <h2>${editing ? "Edit Task" : "New Task"}</h2>
    <form id="task-form">
      <div class="form-grid">
        <div class="field full">
          <label for="task-title-input">Task name</label>
          <input id="task-title-input" name="title" required maxlength="120"
            placeholder="What needs to be done?" value="${escapeHTML(task?.title || "")}">
        </div>
        <div class="field">
          <label for="task-priority-input">Priority</label>
          <select id="task-priority-input" name="priority">
            ${["High", "Medium", "Low"].map(v => `<option ${task?.priority === v ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="task-category-input">Category</label>
          <select id="task-category-input" name="category">
            ${["Personal", "Study", "Trading", "Basketball", "Health"].map(v => `<option ${task?.category === v ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </div>
        <div class="field full">
          <label for="task-due-input">Due date</label>
          <input id="task-due-input" name="dueDate" type="date" value="${escapeHTML(task?.dueDate || "")}">
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
        <button type="submit" class="btn">${editing ? "Save Changes" : "Add Task"}</button>
      </div>
    </form>`);

  $("#task-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) return;

    if (editing) {
      task.title = title;
      task.priority = String(form.get("priority"));
      task.category = String(form.get("category"));
      task.dueDate = String(form.get("dueDate") || "");
    } else {
      data.tasks.push(normalizeTask({
        id: uid(), title,
        priority: form.get("priority"),
        category: form.get("category"),
        dueDate: form.get("dueDate"),
        createdAt: todayKey(),
        completed: false
      }));
    }

    saveData();
    closeModal();
    render();
    showToast(editing ? "Task updated." : "Task added.");
  });
}

function habitForm(habit = null) {
  const editing = Boolean(habit);
  openModal(`
    <h2>${editing ? "Edit Habit" : "New Habit"}</h2>
    <form id="habit-form">
      <div class="field">
        <label for="habit-title-input">Habit name</label>
        <input id="habit-title-input" name="title" required maxlength="100"
          placeholder="e.g. Read 10 pages" value="${escapeHTML(habit?.title || "")}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
        <button type="submit" class="btn">${editing ? "Save Changes" : "Add Habit"}</button>
      </div>
    </form>`);

  $("#habit-form").addEventListener("submit", event => {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") || "").trim();
    if (!title) return;

    if (editing) habit.title = title;
    else data.habits.push({ id: uid(), title, createdAt: todayKey(), history: [] });

    saveData();
    closeModal();
    render();
    showToast(editing ? "Habit updated." : "Habit added.");
  });
}

/* ------------------------- ACTIONS ------------------------- */

function toggleTask(id, checked) {
  const task = data.tasks.find(item => item.id === id);
  if (!task) return;
  task.completed = checked;
  task.completedAt = checked ? todayKey() : null;
  saveData();
  render();
}

function toggleHabit(id, checked) {
  const habit = data.habits.find(item => item.id === id);
  if (!habit) return;
  const history = new Set(habit.history);
  if (checked) history.add(todayKey());
  else history.delete(todayKey());
  habit.history = [...history].sort();
  saveData();
  render();
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  data.tasks = data.tasks.filter(task => task.id !== id);
  saveData();
  render();
  showToast("Task deleted.");
}

function deleteHabit(id) {
  if (!confirm("Delete this habit and its history?")) return;
  data.habits = data.habits.filter(habit => habit.id !== id);
  saveData();
  render();
  showToast("Habit deleted.");
}

function exportBackup() {
  const backup = {
    app: "DAILY OS",
    version: "3.0",
    exportedAt: new Date().toISOString(),
    tasks: data.tasks,
    habits: data.habits
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daily-os-backup-${todayKey()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Backup exported.");
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.habits)) {
        throw new Error("Invalid backup structure");
      }
      if (!confirm("Importing will replace the current tasks and habits. Continue?")) return;

      data = {
        tasks: parsed.tasks.map(normalizeTask),
        habits: parsed.habits.map(normalizeHabit)
      };
      if (saveData()) {
        render();
        showToast("Backup imported successfully.");
      }
    } catch (error) {
      console.error(error);
      showToast("Invalid backup file.");
    } finally {
      $("#import-file").value = "";
    }
  };

  reader.onerror = () => showToast("Could not read the selected file.");
  reader.readAsText(file);
}

/* ------------------------- EVENT DELEGATION ------------------------- */

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-page]");
  if (nav) {
    setPage(nav.dataset.page);
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id, date } = button.dataset;

  switch (action) {
    case "new-task": taskForm(); break;
    case "new-habit": habitForm(); break;
    case "edit-task": {
      const task = data.tasks.find(item => item.id === id);
      if (task) taskForm(task);
      break;
    }
    case "edit-habit": {
      const habit = data.habits.find(item => item.id === id);
      if (habit) habitForm(habit);
      break;
    }
    case "delete-task": deleteTask(id); break;
    case "delete-habit": deleteHabit(id); break;
    case "close-modal": closeModal(); break;
    case "export-backup": exportBackup(); break;
    case "go-tasks": setPage("tasks"); break;
    case "go-habits": setPage("habits"); break;
    case "select-date":
      selectedCalendarDate = date;
      calendarDate = parseDate(date) || calendarDate;
      renderCalendar();
      break;
    case "calendar-prev":
      if (calendarMode === "month") calendarDate.setMonth(calendarDate.getMonth() - 1);
      else selectedCalendarDate = addDays(selectedCalendarDate, -7);
      if (calendarMode === "week") calendarDate = parseDate(selectedCalendarDate);
      renderCalendar();
      break;
    case "calendar-next":
      if (calendarMode === "month") calendarDate.setMonth(calendarDate.getMonth() + 1);
      else selectedCalendarDate = addDays(selectedCalendarDate, 7);
      if (calendarMode === "week") calendarDate = parseDate(selectedCalendarDate);
      renderCalendar();
      break;
    case "calendar-today":
      calendarDate = new Date();
      selectedCalendarDate = todayKey();
      renderCalendar();
      break;
  }
});

document.addEventListener("change", event => {
  const target = event.target;
  if (target.matches('[data-action="toggle-task"]')) {
    toggleTask(target.dataset.id, target.checked);
  }
  if (target.matches('[data-action="toggle-habit"]')) {
    toggleHabit(target.dataset.id, target.checked);
  }
  if (target.id === "import-file") {
    importBackup(target.files?.[0]);
  }
});

$("#mobile-menu").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

$("#modal-backdrop").addEventListener("click", event => {
  if (event.target.id === "modal-backdrop") closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

/* ------------------------- RENDER ------------------------- */

function render() {
  updateHeader();

  switch (currentPage) {
    case "today": renderToday(); break;
    case "tasks": renderTasks(); break;
    case "habits": renderHabits(); break;
    case "calendar": renderCalendar(); break;
    case "analytics": renderAnalytics(); break;
    case "backup": renderBackup(); break;
    default:
      currentPage = "today";
      renderToday();
  }
}

function init() {
  // Normalize legacy data and persist the compatible structure.
  data.tasks = data.tasks.map(normalizeTask);
  data.habits = data.habits.map(normalizeHabit);
  saveData();
  updateHeader();
  render();
}

init();
