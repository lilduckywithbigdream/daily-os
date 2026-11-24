/* =========================================================
   DAILY OS — Complete Personal Productivity System
   Version 3.0
   Today | Tasks | Habits | Calendar | Analytics | Backup
   ========================================================= */
"use strict";

/* ----------------------------- CONFIG ----------------------------- */
const APP_VERSION = "3.0";
const STORAGE_KEY = "daily-os-data";
const BACKUP_VERSION = 3;
const PAGES = ["Today", "Tasks", "Habits", "Calendar", "Analytics"];
const PRIORITIES = ["High", "Medium", "Low"];
const CATEGORIES = ["Personal", "Study", "Trading", "Basketball", "Health"];

let data = { tasks: [], habits: [] };
let headerEl, mainEl, navEl;
let currentPage = "Today";
let editingTaskId = null;
let editingHabitId = null;
let taskFilters = { search: "", category: "All", priority: "All", status: "Active" };
let calendarMode = "Month";
let calendarCursor = new Date();
let selectedCalendarDate = todayKey();

/* ----------------------------- DATE HELPERS ----------------------------- */
function todayKey() {
  const d = new Date();
  return dateKeyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function dateKeyFromParts(y, m, d) {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
function dateFromKey(key) {
  if (!isValidDateKey(key)) return new Date();
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function keyFromDate(date) {
  return dateKeyFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
function addDays(key, amount) {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + amount);
  return keyFromDate(d);
}
function formatDate(key, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!isValidDateKey(key)) return "No date";
  return dateFromKey(key).toLocaleDateString(undefined, options);
}
function monthTitle(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function startOfWeek(key) {
  const d = dateFromKey(key);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return keyFromDate(d);
}
function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ----------------------------- DATA MODEL ----------------------------- */
function normalizeTask(task) {
  return {
    id: typeof task.id === "string" && task.id ? task.id : createId(),
    title: String(task.title || "").trim(),
    completed: task.completed === true,
    createdAt: isValidDateKey(task.createdAt) ? task.createdAt : todayKey(),
    completedAt: isValidDateKey(task.completedAt) ? task.completedAt : "",
    priority: PRIORITIES.includes(task.priority) ? task.priority : "Medium",
    category: CATEGORIES.includes(task.category) ? task.category : "Personal",
    dueDate: isValidDateKey(task.dueDate) ? task.dueDate : ""
  };
}
function normalizeHabit(habit) {
  const dates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
  return {
    id: typeof habit.id === "string" && habit.id ? habit.id : createId(),
    title: String(habit.title || "").trim(),
    createdAt: isValidDateKey(habit.createdAt) ? habit.createdAt : todayKey(),
    completedDates: [...new Set(dates.filter(isValidDateKey))]
  };
}
function normalizeData(raw) {
  if (!raw || typeof raw !== "object") throw new Error("The data file has an invalid structure.");
  const tasks = Array.isArray(raw.tasks) ? raw.tasks.filter(x => x && typeof x.title === "string" && x.title.trim()).map(normalizeTask) : [];
  const habits = Array.isArray(raw.habits) ? raw.habits.filter(x => x && typeof x.title === "string" && x.title.trim()).map(normalizeHabit) : [];
  return { tasks, habits };
}
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { tasks: [], habits: [] };
    const parsed = JSON.parse(saved);
    return normalizeData(parsed);
  } catch (error) {
    console.error("DAILY OS: Data load failed; original local data was left untouched.", error);
    showToast("Could not read saved data. The stored data has not been deleted.", "error");
    return { tasks: [], habits: [] };
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("DAILY OS: Save failed.", error);
    showToast("Could not save. Check available browser storage.", "error");
    return false;
  }
}

/* ----------------------------- DOM HELPERS ----------------------------- */
function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}
function button(text, className = "button button-secondary", onClick, type = "button") {
  const node = el("button", className, text);
  node.type = type;
  if (onClick) node.addEventListener("click", onClick);
  return node;
}
function card(title, subtitle = "") {
  const node = el("section", "card");
  if (title) {
    const head = el("div", "card-heading");
    head.appendChild(el("h3", "section-title", title));
    if (subtitle) head.appendChild(el("p", "muted small", subtitle));
    node.appendChild(head);
  }
  return node;
}
function field(labelText, control) {
  const wrap = el("label", "field");
  wrap.append(el("span", "field-label", labelText), control);
  return wrap;
}
function input(type, value = "", placeholder = "") {
  const node = document.createElement("input");
  node.type = type;
  node.value = value;
  node.placeholder = placeholder;
  node.className = "control";
  return node;
}
function select(options, value) {
  const node = document.createElement("select");
  node.className = "control";
  options.forEach(option => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    node.appendChild(item);
  });
  node.value = value;
  return node;
}
function pageIntro(eyebrow, title, description) {
  const wrap = el("div", "page-intro");
  wrap.append(el("p", "eyebrow", eyebrow), el("h2", "page-title", title));
  if (description) wrap.appendChild(el("p", "muted page-description", description));
  mainEl.appendChild(wrap);
}
function showToast(message, type = "success") {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = el("div");
    toast.id = "app-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  toast.textContent = message;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 2600);
  toast.classList.add("visible");
}
function emptyState(title, text) {
  const wrap = el("div", "empty-state");
  wrap.append(el("strong", "", title), el("p", "muted small", text));
  return wrap;
}
function progressBar(percent) {
  const track = el("div", "progress-track");
  const fill = el("div", "progress-fill");
  fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  track.appendChild(fill);
  return track;
}
function safeAppend(parent, ...children) {
  children.filter(Boolean).forEach(child => parent.appendChild(child));
}

/* ----------------------------- COUNTS / METRICS ----------------------------- */
function completedTasksCount() {
  return data.tasks.filter(task => task.completed).length;
}
function completedHabitsCount(key = todayKey()) {
  return data.habits.filter(habit => habit.completedDates.includes(key)).length;
}
function habitStreak(habit) {
  let cursor = todayKey();
  if (!habit.completedDates.includes(cursor)) cursor = addDays(cursor, -1);
  let count = 0;
  while (habit.completedDates.includes(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}
function taskIsOverdue(task) {
  return !!task.dueDate && !task.completed && task.dueDate < todayKey();
}

/* ----------------------------- HEADER / NAV ----------------------------- */
function renderHeader() {
  headerEl.replaceChildren();
  const left = el("div", "brand-lockup");
  left.append(el("p", "eyebrow", "YOUR PERSONAL SYSTEM"), el("h1", "brand-title", "DAILY OS"));
  const right = el("div", "header-right");
  right.append(el("span", "header-date", formatDate(todayKey(), { weekday: "short", month: "short", day: "numeric" })));
  headerEl.append(left, right);
}
function renderNavigation() {
  navEl.replaceChildren();
  const labels = {
    Today: "Today",
    Tasks: "Tasks",
    Habits: "Habits",
    Calendar: "Calendar",
    Analytics: "Analytics"
  };
  PAGES.forEach(page => {
    const b = button(labels[page], "nav-item", () => showPage(page));
    b.dataset.page = page;
    b.setAttribute("aria-label", page);
    navEl.appendChild(b);
  });
}
function showPage(page) {
  if (!PAGES.includes(page)) return;
  currentPage = page;
  if (page !== "Tasks") editingTaskId = null;
  if (page !== "Habits") editingHabitId = null;
  navEl.querySelectorAll(".nav-item").forEach(item => {
    const active = item.dataset.page === page;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  try {
    if (page === "Today") renderToday();
    if (page === "Tasks") renderTasks();
    if (page === "Habits") renderHabits();
    if (page === "Calendar") renderCalendar();
    if (page === "Analytics") renderAnalytics();
  } catch (error) {
    console.error("DAILY OS render error:", error);
    mainEl.replaceChildren();
    const c = card("Something went wrong");
    c.appendChild(el("p", "muted", `${error.name}: ${error.message}`));
    mainEl.appendChild(c);
  }
}

/* ----------------------------- TASK COMPONENT ----------------------------- */
function makeTaskRow(task, actions = true) {
  const row = el("article", `task-row${task.completed ? " is-complete" : ""}`);
  const check = input("checkbox");
  check.checked = task.completed;
  check.className = "check-control";
  check.setAttribute("aria-label", `Complete task: ${task.title}`);
  check.addEventListener("change", () => {
    const old = task.completed;
    task.completed = check.checked;
    task.completedAt = check.checked ? todayKey() : "";
    if (saveData()) showPage(currentPage);
    else task.completed = old;
  });
  const body = el("div", "task-row-body");
  body.appendChild(el("div", "task-row-title", task.title));
  const meta = el("div", "meta-line");
  const p = el("span", `pill priority-${task.priority.toLowerCase()}`, task.priority);
  const c = el("span", "pill pill-neutral", task.category);
  meta.append(p, c);
  if (task.dueDate) {
    const dueLabel = taskIsOverdue(task) ? `Overdue · ${formatDate(task.dueDate)}` : `Due · ${formatDate(task.dueDate)}`;
    meta.appendChild(el("span", `due-label${taskIsOverdue(task) ? " overdue" : ""}`, dueLabel));
  }
  body.appendChild(meta);
  row.append(check, body);
  if (actions) {
    const actionWrap = el("div", "row-actions");
    actionWrap.append(
      button("Edit", "text-button", () => { editingTaskId = task.id; renderTasks(); }),
      button("Delete", "text-button danger-text", () => {
        if (!confirm(`Delete "${task.title}"?`)) return;
        const previous = data.tasks;
        data.tasks = data.tasks.filter(item => item.id !== task.id);
        if (saveData()) { showToast("Task deleted."); renderTasks(); }
        else data.tasks = previous;
      })
    );
    row.appendChild(actionWrap);
  }
  return row;
}

/* ----------------------------- TODAY ----------------------------- */
function renderToday() {
  mainEl.replaceChildren();
  pageIntro("FOCUS ON WHAT MATTERS", "Make today count.", "Small actions. Consistent progress.");
  const total = data.tasks.length + data.habits.length;
  const done = completedTasksCount() + completedHabitsCount();
  const pct = total ? Math.round(done / total * 100) : 0;
  const summary = card("DAILY PROGRESS", `${formatDate(todayKey(), { weekday: "long", month: "long", day: "numeric" })}`);
  const metric = el("div", "progress-summary");
  metric.append(el("strong", "progress-number", `${pct}%`), el("span", "muted", `${done} of ${total} items complete`));
  summary.append(metric, progressBar(pct));
  const stats = el("div", "mini-stats");
  stats.append(
    miniStat("OPEN TASKS", String(data.tasks.filter(t => !t.completed).length)),
    miniStat("HABITS DONE", `${completedHabitsCount()}/${data.habits.length}`),
    miniStat("OVERDUE", String(data.tasks.filter(taskIsOverdue).length))
  );
  summary.appendChild(stats);
  mainEl.appendChild(summary);

  const tasksCard = card("TODAY'S FOCUS", "Your next actions");
  const todayTasks = data.tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate <= todayKey())).slice(0, 5);
  if (!todayTasks.length) tasksCard.appendChild(emptyState("Clear space.", "No tasks due today. Add a task or enjoy the breathing room."));
  else todayTasks.forEach(task => tasksCard.appendChild(makeTaskRow(task, false)));
  tasksCard.appendChild(button("View all tasks", "button button-secondary full-button", () => showPage("Tasks")));
  mainEl.appendChild(tasksCard);

  const habitsCard = card("DAILY HABITS", "Consistency is built one day at a time");
  if (!data.habits.length) habitsCard.appendChild(emptyState("Start small.", "Add one habit you want to make consistent."));
  else data.habits.forEach(habit => habitsCard.appendChild(makeHabitRow(habit, false)));
  habitsCard.appendChild(button("Manage habits", "button button-secondary full-button", () => showPage("Habits")));
  mainEl.appendChild(habitsCard);

  const overdue = data.tasks.filter(taskIsOverdue);
  if (overdue.length) {
    const overdueCard = card("NEEDS ATTENTION", `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`);
    overdue.slice(0, 3).forEach(task => overdueCard.appendChild(makeTaskRow(task, false)));
    mainEl.appendChild(overdueCard);
  }
}
function miniStat(label, value) {
  const box = el("div", "mini-stat");
  box.append(el("span", "eyebrow", label), el("strong", "", value));
  return box;
}

/* ----------------------------- TASKS ----------------------------- */
function renderTasks() {
  mainEl.replaceChildren();
  pageIntro("PLAN WITH INTENTION", "Tasks", "Capture the work. Set priorities. Follow through.");
  const editing = editingTaskId ? data.tasks.find(t => t.id === editingTaskId) : null;
  if (editingTaskId && !editing) editingTaskId = null;

  const formCard = card(editing ? "EDIT TASK" : "NEW TASK", "Keep the next action clear and specific.");
  const form = el("form", "task-form");
  const title = input("text", editing ? editing.title : "", "What needs to get done?");
  title.maxLength = 120;
  title.required = true;
  title.setAttribute("aria-label", "Task title");
  const priority = select(PRIORITIES, editing ? editing.priority : "Medium");
  const category = select(CATEGORIES, editing ? editing.category : "Personal");
  const due = input("date", editing ? editing.dueDate : "");
  const fields = el("div", "form-grid");
  fields.append(field("PRIORITY", priority), field("CATEGORY", category), field("DUE DATE", due));
  const actions = el("div", "form-actions");
  actions.appendChild(button(editing ? "Save changes" : "＋ Add task", "button button-primary", null, "submit"));
  if (editing) actions.appendChild(button("Cancel", "button button-secondary", () => { editingTaskId = null; renderTasks(); }));
  form.append(title, fields, actions);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const taskTitle = title.value.trim();
    if (!taskTitle) { title.focus(); return; }
    const previous = JSON.stringify(data);
    if (editing) {
      const target = data.tasks.find(t => t.id === editing.id);
      if (!target) return;
      Object.assign(target, { title: taskTitle, priority: priority.value, category: category.value, dueDate: due.value || "" });
    } else {
      data.tasks.unshift({ id: createId(), title: taskTitle, completed: false, createdAt: todayKey(), completedAt: "", priority: priority.value, category: category.value, dueDate: due.value || "" });
    }
    if (!saveData()) { data = JSON.parse(previous); return; }
    editingTaskId = null;
    showToast(editing ? "Task updated." : "Task added.");
    renderTasks();
  });
  formCard.appendChild(form);
  mainEl.appendChild(formCard);

  const controlsCard = card("TASK LIST", `${data.tasks.length} total`);
  const controls = el("div", "filter-grid");
  const search = input("search", taskFilters.search, "Search tasks...");
  search.addEventListener("input", () => { taskFilters.search = search.value; renderTaskListInto(listWrap); });
  const categoryFilter = select(["All", ...CATEGORIES], taskFilters.category);
  categoryFilter.addEventListener("change", () => { taskFilters.category = categoryFilter.value; renderTaskListInto(listWrap); });
  const priorityFilter = select(["All", ...PRIORITIES], taskFilters.priority);
  priorityFilter.addEventListener("change", () => { taskFilters.priority = priorityFilter.value; renderTaskListInto(listWrap); });
  const statusFilter = select(["Active", "Completed", "All"], taskFilters.status);
  statusFilter.addEventListener("change", () => { taskFilters.status = statusFilter.value; renderTaskListInto(listWrap); });
  controls.append(field("SEARCH", search), field("CATEGORY", categoryFilter), field("PRIORITY", priorityFilter), field("STATUS", statusFilter));
  const listWrap = el("div", "task-list");
  controlsCard.append(controls, listWrap);
  renderTaskListInto(listWrap);
  mainEl.appendChild(controlsCard);
}
function renderTaskListInto(container) {
  container.replaceChildren();
  const q = taskFilters.search.toLowerCase().trim();
  const filtered = data.tasks.filter(task => {
    const searchMatch = !q || task.title.toLowerCase().includes(q);
    const categoryMatch = taskFilters.category === "All" || task.category === taskFilters.category;
    const priorityMatch = taskFilters.priority === "All" || task.priority === taskFilters.priority;
    const statusMatch = taskFilters.status === "All" || (taskFilters.status === "Completed" ? task.completed : !task.completed);
    return searchMatch && categoryMatch && priorityMatch && statusMatch;
  });
  if (!filtered.length) {
    container.appendChild(emptyState("No matching tasks.", "Try changing your filters or add a new task."));
    return;
  }
  filtered.forEach(task => container.appendChild(makeTaskRow(task, true)));
}

/* ----------------------------- HABITS ----------------------------- */
function makeHabitRow(habit, allowActions = true) {
  const row = el("article", "habit-row");
  const done = habit.completedDates.includes(todayKey());
  const check = input("checkbox");
  check.checked = done;
  check.className = "check-control";
  check.setAttribute("aria-label", `Mark ${habit.title} complete today`);
  check.addEventListener("change", () => {
    const previous = [...habit.completedDates];
    if (check.checked) {
      if (!habit.completedDates.includes(todayKey())) habit.completedDates.push(todayKey());
    } else {
      habit.completedDates = habit.completedDates.filter(date => date !== todayKey());
    }
    if (saveData()) showPage(currentPage);
    else habit.completedDates = previous;
  });
  const info = el("div", "habit-row-info");
  info.append(el("strong", "", habit.title), el("span", "muted small", `${habitStreak(habit)} day streak`));
  row.append(check, info);
  if (allowActions) {
    const actions = el("div", "row-actions");
    actions.append(
      button("Edit", "text-button", () => { editingHabitId = habit.id; renderHabits(); }),
      button("Delete", "text-button danger-text", () => {
        if (!confirm(`Delete habit "${habit.title}" and its history?`)) return;
        const previous = data.habits;
        data.habits = data.habits.filter(item => item.id !== habit.id);
        if (saveData()) { showToast("Habit deleted."); renderHabits(); }
        else data.habits = previous;
      })
    );
    row.appendChild(actions);
  }
  return row;
}
function renderHabits() {
  mainEl.replaceChildren();
  pageIntro("BUILD YOUR ROUTINE", "Habits", "Small actions, repeated consistently, become part of who you are.");
  const editing = editingHabitId ? data.habits.find(h => h.id === editingHabitId) : null;
  if (editingHabitId && !editing) editingHabitId = null;
  const formCard = card(editing ? "EDIT HABIT" : "NEW HABIT");
  const form = el("form", "task-form");
  const title = input("text", editing ? editing.title : "", "Example: Read 10 pages");
  title.maxLength = 100;
  title.required = true;
  const actions = el("div", "form-actions");
  actions.appendChild(button(editing ? "Save habit" : "＋ Add habit", "button button-primary", null, "submit"));
  if (editing) actions.appendChild(button("Cancel", "button button-secondary", () => { editingHabitId = null; renderHabits(); }));
  form.append(title, actions);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = title.value.trim();
    if (!value) return;
    const previous = JSON.stringify(data);
    if (editing) {
      const target = data.habits.find(h => h.id === editing.id);
      if (!target) return;
      target.title = value;
    } else {
      data.habits.push({ id: createId(), title: value, createdAt: todayKey(), completedDates: [] });
    }
    if (!saveData()) { data = JSON.parse(previous); return; }
    editingHabitId = null;
    showToast(editing ? "Habit updated." : "Habit added.");
    renderHabits();
  });
  formCard.appendChild(form);
  mainEl.appendChild(formCard);

  const listCard = card("YOUR HABITS", `${completedHabitsCount()}/${data.habits.length} completed today`);
  if (!data.habits.length) listCard.appendChild(emptyState("Build your first routine.", "Choose one small habit you can repeat daily."));
  else data.habits.forEach(habit => listCard.appendChild(makeHabitRow(habit, true)));
  mainEl.appendChild(listCard);

  if (data.habits.length) {
    const historyCard = card("LAST 7 DAYS", "A simple record of consistency");
    const grid = el("div", "habit-history");
    const start = addDays(todayKey(), -6);
    data.habits.forEach(habit => {
      const item = el("div", "history-row");
      item.appendChild(el("strong", "", habit.title));
      const days = el("div", "history-days");
      for (let i = 0; i < 7; i++) {
        const key = addDays(start, i);
        const cell = el("span", `history-dot${habit.completedDates.includes(key) ? " done" : ""}`);
        cell.title = `${formatDate(key)}${habit.completedDates.includes(key) ? " · Done" : ""}`;
        days.appendChild(cell);
      }
      item.appendChild(days);
      grid.appendChild(item);
    });
    historyCard.appendChild(grid);
    mainEl.appendChild(historyCard);
  }
}

/* ----------------------------- CALENDAR ----------------------------- */
function calendarItemsFor(key) {
  return {
    tasks: data.tasks.filter(task => task.dueDate === key),
    habits: data.habits.filter(habit => habit.completedDates.includes(key))
  };
}
function renderCalendar() {
  mainEl.replaceChildren();
  pageIntro("SEE THE BIG PICTURE", "Calendar", "Review deadlines and the days you showed up.");
  const shell = card("PLANNER", "Monthly and weekly views");
  const toolbar = el("div", "calendar-toolbar");
  const title = el("strong", "calendar-title", "");
  const left = button("‹", "icon-button", () => moveCalendar(-1));
  const right = button("›", "icon-button", () => moveCalendar(1));
  const todayBtn = button("Today", "button button-secondary compact", () => {
    calendarCursor = new Date();
    selectedCalendarDate = todayKey();
    renderCalendar();
  });
  const mode = el("div", "segmented");
  const monthBtn = button("Month", calendarMode === "Month" ? "segment active" : "segment", () => { calendarMode = "Month"; renderCalendar(); });
  const weekBtn = button("Week", calendarMode === "Week" ? "segment active" : "segment", () => { calendarMode = "Week"; renderCalendar(); });
  mode.append(monthBtn, weekBtn);
  toolbar.append(left, title, right, todayBtn, mode);
  shell.appendChild(toolbar);

  if (calendarMode === "Month") {
    title.textContent = monthTitle(calendarCursor);
    const grid = el("div", "month-grid");
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => grid.appendChild(el("div", "weekday", day)));
    const first = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((offset + daysInMonth(calendarCursor.getFullYear(), calendarCursor.getMonth())) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - offset + 1;
      const d = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), dayNum, 12);
      const key = keyFromDate(d);
      const inMonth = d.getMonth() === calendarCursor.getMonth();
      const items = calendarItemsFor(key);
      const count = items.tasks.length + items.habits.length;
      const cell = button("", `calendar-day${inMonth ? "" : " outside"}${key === todayKey() ? " today" : ""}${key === selectedCalendarDate ? " selected" : ""}`, () => {
        selectedCalendarDate = key;
        renderCalendar();
      });
      cell.append(el("span", "day-number", String(d.getDate())));
      if (count) cell.appendChild(el("span", "day-count", String(count)));
      grid.appendChild(cell);
    }
    shell.appendChild(grid);
  } else {
    const weekStart = startOfWeek(keyFromDate(calendarCursor));
    const weekEnd = addDays(weekStart, 6);
    title.textContent = `${formatDate(weekStart, { month: "short", day: "numeric" })} – ${formatDate(weekEnd, { month: "short", day: "numeric", year: "numeric" })}`;
    const grid = el("div", "week-grid");
    for (let i = 0; i < 7; i++) {
      const key = addDays(weekStart, i);
      const items = calendarItemsFor(key);
      const cell = button("", `week-day${key === todayKey() ? " today" : ""}${key === selectedCalendarDate ? " selected" : ""}`, () => { selectedCalendarDate = key; renderCalendar(); });
      cell.append(el("span", "weekday", formatDate(key, { weekday: "short" })), el("strong", "week-day-number", String(dateFromKey(key).getDate())));
      if (items.tasks.length + items.habits.length) cell.appendChild(el("span", "day-count", String(items.tasks.length + items.habits.length)));
      grid.appendChild(cell);
    }
    shell.appendChild(grid);
  }
  mainEl.appendChild(shell);

  const selected = calendarItemsFor(selectedCalendarDate);
  const selectedCard = card(formatDate(selectedCalendarDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" }), "Scheduled tasks and completed habits");
  if (!selected.tasks.length && !selected.habits.length) selectedCard.appendChild(emptyState("Nothing recorded.", "Tasks with this due date and completed habits will appear here."));
  selected.tasks.forEach(task => selectedCard.appendChild(makeTaskRow(task, true)));
  selected.habits.forEach(habit => {
    const line = el("div", "calendar-entry");
    line.append(el("span", "event-dot habit-dot"), el("span", "", habit.title), el("span", "muted small", "Habit completed"));
    selectedCard.appendChild(line);
  });
  mainEl.appendChild(selectedCard);
}
function moveCalendar(direction) {
  if (calendarMode === "Month") calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + direction, 1, 12);
  else calendarCursor.setDate(calendarCursor.getDate() + direction * 7);
  selectedCalendarDate = keyFromDate(calendarCursor);
  renderCalendar();
}

/* ----------------------------- ANALYTICS ----------------------------- */
function renderAnalytics() {
  mainEl.replaceChildren();
  pageIntro("MEASURE WHAT MATTERS", "Analytics", "Use the numbers to learn, not to judge yourself.");
  const totalTasks = data.tasks.length;
  const doneTasks = completedTasksCount();
  const activeTasks = totalTasks - doneTasks;
  const totalHabits = data.habits.length;
  const doneHabits = completedHabitsCount();
  const overview = card("OVERVIEW", "Current snapshot");
  const statGrid = el("div", "analytics-grid");
  statGrid.append(
    analyticsStat("TASKS COMPLETED", `${doneTasks}/${totalTasks}`, totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0),
    analyticsStat("ACTIVE TASKS", String(activeTasks), null),
    analyticsStat("HABITS TODAY", `${doneHabits}/${totalHabits}`, totalHabits ? Math.round(doneHabits / totalHabits * 100) : 0),
    analyticsStat("OVERDUE TASKS", String(data.tasks.filter(taskIsOverdue).length), null)
  );
  overview.appendChild(statGrid);
  mainEl.appendChild(overview);

  const priorities = card("OPEN TASKS BY PRIORITY");
  PRIORITIES.forEach(priority => {
    const count = data.tasks.filter(t => !t.completed && t.priority === priority).length;
    priorities.appendChild(analyticsLine(priority, count, activeTasks ? count / activeTasks * 100 : 0));
  });
  mainEl.appendChild(priorities);

  const categories = card("TASKS BY CATEGORY");
  CATEGORIES.forEach(category => {
    const count = data.tasks.filter(t => t.category === category).length;
    categories.appendChild(analyticsLine(category, count, totalTasks ? count / totalTasks * 100 : 0));
  });
  mainEl.appendChild(categories);

  const weekly = card("LAST 7 DAYS", "Tasks completed and habits checked");
  const chart = el("div", "week-chart");
  const start = addDays(todayKey(), -6);
  for (let i = 0; i < 7; i++) {
    const key = addDays(start, i);
    const taskCount = data.tasks.filter(t => t.completed && t.completedAt === key).length;
    const habitCount = data.habits.filter(h => h.completedDates.includes(key)).length;
    const total = taskCount + habitCount;
    const col = el("div", "chart-column");
    const bar = el("div", "chart-bar-wrap");
    const fill = el("div", "chart-bar");
    fill.style.height = `${Math.max(4, Math.min(100, total * 18))}%`;
    bar.appendChild(fill);
    col.append(bar, el("strong", "", String(total)), el("span", "muted tiny", formatDate(key, { weekday: "short" })));
    chart.appendChild(col);
  }
  weekly.appendChild(chart);
  mainEl.appendChild(weekly);

  const habitStats = card("HABIT CONSISTENCY", "Current streaks");
  if (!data.habits.length) habitStats.appendChild(emptyState("No habits yet.", "Add habits to start tracking consistency."));
  else data.habits.forEach(habit => {
    const line = el("div", "analytics-line");
    line.append(el("span", "", habit.title), el("strong", "", `${habitStreak(habit)} days`));
    habitStats.appendChild(line);
  });
  mainEl.appendChild(habitStats);

  const backup = card("DATA BACKUP", "Keep a copy of your information.");
  backup.appendChild(el("p", "muted small", "Export a JSON backup before changing devices or importing another backup."));
  const backupActions = el("div", "backup-actions");
  backupActions.appendChild(button("↓ Export backup", "button button-primary", exportBackup));
  const importBtn = button("↑ Import backup", "button button-secondary", () => fileInput.click());
  const fileInput = input("file");
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) importBackup(file);
    fileInput.value = "";
  });
  backupActions.append(importBtn, fileInput);
  backup.appendChild(backupActions);
  mainEl.appendChild(backup);
}
function analyticsStat(label, value, percent) {
  const box = el("div", "analytics-stat");
  box.append(el("span", "eyebrow", label), el("strong", "", value));
  if (percent !== null) box.appendChild(progressBar(percent));
  return box;
}
function analyticsLine(label, count, percent) {
  const line = el("div", "analytics-line");
  const left = el("div", "analytics-line-main");
  left.append(el("span", "", label), progressBar(percent));
  line.append(left, el("strong", "", String(count)));
  return line;
}

/* ----------------------------- BACKUP ----------------------------- */
function exportBackup() {
  try {
    const payload = {
      app: "DAILY OS",
      backupVersion: BACKUP_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(data))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = `daily-os-backup-${todayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast("Backup exported.");
  } catch (error) {
    console.error(error);
    showToast("Could not export backup.", "error");
  }
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      let raw = parsed;
      if (parsed && parsed.app === "DAILY OS") {
        if (!Number.isInteger(parsed.backupVersion) || parsed.backupVersion < 1 || parsed.backupVersion > BACKUP_VERSION) {
          throw new Error("This backup version is not supported.");
        }
        raw = parsed.data;
      }
      const imported = normalizeData(raw);
      if (!confirm(`Import this backup?\n\nTasks: ${imported.tasks.length}\nHabits: ${imported.habits.length}\n\nYour current data will be replaced.`)) return;
      const previous = data;
      data = imported;
      if (!saveData()) { data = previous; return; }
      editingTaskId = null;
      editingHabitId = null;
      showToast("Backup imported successfully.");
      showPage(currentPage);
    } catch (error) {
      console.error("Backup import failed:", error);
      showToast(error.message || "Invalid backup file.", "error");
    }
  };
  reader.onerror = () => showToast("Could not read that file.", "error");
  reader.readAsText(file);
}

/* ----------------------------- INITIALIZATION ----------------------------- */
function startApp() {
  headerEl = document.getElementById("app-header");
  mainEl = document.getElementById("main-content");
  navEl = document.getElementById("bottom-navigation");
  if (!headerEl || !mainEl || !navEl) {
    document.body.textContent = "DAILY OS could not start: required page elements are missing.";
    return;
  }
  data = loadData();
  renderHeader();
  renderNavigation();
  showPage("Today");
  console.log(`DAILY OS ${APP_VERSION} ready.`);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp, { once: true });
else startApp();
