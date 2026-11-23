
/* =========================================
   DAILY OS — Core App
   Version 2.0
   Tasks | Habits | Analytics | Backup
   ========================================= */

"use strict";

// =========================================
// 1. CONFIGURATION
// =========================================

const pages = ["Today", "Tasks", "Habits", "Analytics"];

const STORAGE_KEY = "daily-os-data";
const BACKUP_VERSION = 2;

const TASK_PRIORITIES = ["High", "Medium", "Low"];

const TASK_CATEGORIES = [
  "Personal",
  "Study",
  "Trading",
  "Basketball",
  "Health"
];

let data = {
  tasks: [],
  habits: []
};

let header = null;
let main = null;
let navigation = null;
let currentPage = "Today";
let editingTaskId = null;

// =========================================
// 2. DATE AND ID HELPERS
// =========================================

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateKey(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function formatDate(value) {
  if (!isValidDateKey(value)) return "";

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "id-" + Date.now() + "-" +
    Math.random().toString(36).slice(2);
}

// =========================================
// 3. TASK NORMALIZATION
// =========================================

function normalizeTask(task) {
  return {
    id: typeof task.id === "string" && task.id
      ? task.id
      : createId(),

    title: task.title.trim(),

    completed: task.completed === true,

    createdAt: isValidDateKey(task.createdAt)
      ? task.createdAt
      : getTodayKey(),

    priority: TASK_PRIORITIES.includes(task.priority)
      ? task.priority
      : "Medium",

    category: TASK_CATEGORIES.includes(task.category)
      ? task.category
      : "Personal",

    dueDate: isValidDateKey(task.dueDate)
      ? task.dueDate
      : ""
  };
}

// =========================================
// 4. DATA MANAGEMENT
// =========================================

function loadData() {
  const emptyData = {
    tasks: [],
    habits: []
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return emptyData;

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return emptyData;
    }

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter(task =>
            task &&
            typeof task.title === "string" &&
            task.title.trim().length > 0
          )
          .map(normalizeTask)
      : [];

    const habits = Array.isArray(parsed.habits)
      ? parsed.habits
          .filter(habit =>
            habit &&
            typeof habit.title === "string"
          )
          .map(habit => ({
            id: habit.id || createId(),
            title: habit.title,
            completedDates: Array.isArray(habit.completedDates)
              ? habit.completedDates.filter(
                  date => typeof date === "string" &&
                    isValidDateKey(date)
                )
              : []
          }))
      : [];

    return { tasks, habits };

  } catch (error) {
    console.error("DAILY OS: Could not load data:", error);
    return emptyData;
  }
}

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (error) {
    console.error("DAILY OS: Could not save data:", error);

    alert(
      "Unable to save data. Please check browser storage."
    );

    return false;
  }
}

// =========================================
// 5. BACKUP DATA VALIDATION
// =========================================

function validateBackupData(backupData) {
  if (
    !backupData ||
    typeof backupData !== "object" ||
    !Array.isArray(backupData.tasks) ||
    !Array.isArray(backupData.habits)
  ) {
    throw new Error(
      "Invalid backup structure. Tasks and Habits are required."
    );
  }

  const invalidTask = backupData.tasks.some(task =>
    !task ||
    typeof task !== "object" ||
    typeof task.title !== "string" ||
    !task.title.trim()
  );

  if (invalidTask) {
    throw new Error("Backup contains an invalid task.");
  }

  const invalidTaskFields = backupData.tasks.some(task =>
    (
      task.priority !== undefined &&
      !TASK_PRIORITIES.includes(task.priority)
    ) ||
    (
      task.category !== undefined &&
      !TASK_CATEGORIES.includes(task.category)
    ) ||
    (
      task.dueDate !== undefined &&
      task.dueDate !== "" &&
      !isValidDateKey(task.dueDate)
    )
  );

  if (invalidTaskFields) {
    throw new Error("Backup contains invalid task details.");
  }

  const invalidHabit = backupData.habits.some(habit =>
    !habit ||
    typeof habit !== "object" ||
    typeof habit.title !== "string" ||
    (
      habit.completedDates !== undefined &&
      !Array.isArray(habit.completedDates)
    )
  );

  if (invalidHabit) {
    throw new Error("Backup contains an invalid habit.");
  }

  const invalidHabitDates = backupData.habits.some(habit =>
    Array.isArray(habit.completedDates) &&
    habit.completedDates.some(
      date => !isValidDateKey(date)
    )
  );

  if (invalidHabitDates) {
    throw new Error("Backup contains invalid habit dates.");
  }

  return true;
}

// =========================================
// 6. BACKUP DATA NORMALIZATION
// =========================================

function normalizeBackupData(backupData) {
  validateBackupData(backupData);

  const tasks = backupData.tasks.map(normalizeTask);

  const habits = backupData.habits.map(habit => ({
    id: habit.id || createId(),
    title: habit.title,
    completedDates: Array.isArray(habit.completedDates)
      ? [...habit.completedDates]
      : []
  }));

  return {
    tasks,
    habits
  };
}

// =========================================
// 7. BACKUP EXPORT
// =========================================

function exportBackup() {
  try {
    const backup = {
      app: "DAILY OS",
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(data))
    };

    const json = JSON.stringify(backup, null, 2);

    const blob = new Blob(
      [json],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `daily-os-backup-${getTodayKey()}.json`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

  } catch (error) {
    console.error("DAILY OS: Backup export failed:", error);

    alert("Unable to export backup. Please try again.");
  }
}

// =========================================
// 8. BACKUP IMPORT
// =========================================

function importBackupFile(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);

      let backupData;

      if (parsed && parsed.app === "DAILY OS") {
        if (
          !Number.isInteger(parsed.backupVersion) ||
          parsed.backupVersion < 1 ||
          parsed.backupVersion > BACKUP_VERSION
        ) {
          throw new Error("Unsupported backup version.");
        }

        backupData = parsed.data;
      } else {
        // Support older { tasks, habits } backup format.
        backupData = parsed;
      }

      const importedData = normalizeBackupData(backupData);

      const confirmed = window.confirm(
        "Import this backup?\n\n" +
        `Tasks: ${importedData.tasks.length}\n` +
        `Habits: ${importedData.habits.length}\n\n` +
        "WARNING: Your current Tasks and Habits " +
        "will be replaced by the backup."
      );

      if (!confirmed) return;

      const previousData = data;
      data = importedData;

      if (!saveData()) {
        data = previousData;
        return;
      }

      editingTaskId = null;

      alert(
        "Backup imported successfully!\n\n" +
        `Tasks: ${data.tasks.length}\n` +
        `Habits: ${data.habits.length}`
      );

      showPage(currentPage);

    } catch (error) {
      console.error("DAILY OS: Backup import failed:", error);

      alert(
        "Backup import failed.\n\n" +
        (error.message || "Invalid backup file.") +
        "\n\nYour current data has not been intentionally replaced."
      );
    }
  };

  reader.onerror = () => {
    alert("Unable to read this file. Please try another backup file.");
  };

  reader.readAsText(file);
}

// =========================================
// 9. GENERAL HELPERS
// =========================================

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function applyStyles(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function createCard(title) {
  const card = createElement("section", "card");
  const heading = createElement("h2", "section-title", title);

  card.appendChild(heading);

  return card;
}

function createFieldLabel(text) {
  return createElement("label", "secondary-text", text);
}

function createSelect(options, selectedValue) {
  const select = document.createElement("select");

  applyStyles(select, {
    width: "100%",
    minHeight: "44px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #444",
    background: "#171717",
    color: "#fff",
    fontSize: "14px"
  });

  options.forEach(option => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    select.appendChild(item);
  });

  select.value = selectedValue;

  return select;
}

function createInput(type, placeholder) {
  const input = document.createElement("input");

  input.type = type;
  input.placeholder = placeholder;

  applyStyles(input, {
    width: "100%",
    minHeight: "44px",
    boxSizing: "border-box",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #444",
    background: "#171717",
    color: "#fff",
    fontSize: "14px"
  });

  return input;
}

function createActionButton(text, secondary = false) {
  const button = createElement(
    "button",
    secondary ? "secondary-button" : "primary-button",
    text
  );

  button.type = "button";

  if (secondary) {
    applyStyles(button, {
      background: "#252525",
      color: "#fff",
      border: "1px solid #444",
      borderRadius: "10px",
      padding: "10px 14px",
      cursor: "pointer"
    });
  }

  return button;
}

function getCompletedTasks() {
  return data.tasks.filter(task => task.completed).length;
}

function getCompletedHabits() {
  const today = getTodayKey();

  return data.habits.filter(habit =>
    habit.completedDates.includes(today)
  ).length;
}

// =========================================
// 10. ERROR DISPLAY
// =========================================

function showStartupError(error) {
  console.error("DAILY OS STARTUP ERROR:", error);

  if (!main) {
    const fallback = createElement("main");
    document.body.appendChild(fallback);
    main = fallback;
  }

  main.replaceChildren();

  const card = createCard("DAILY OS Startup Error");

  card.append(
    createElement(
      "p",
      "secondary-text",
      `${error.name}: ${error.message}`
    ),
    createElement(
      "p",
      "secondary-text",
      "Please send this error message to ChatGPT."
    )
  );

  main.appendChild(card);
}

function showSetupError(message) {
  console.error("DAILY OS SETUP ERROR:", message);

  const card = createCard("DAILY OS Setup Error");

  card.appendChild(
    createElement("p", "secondary-text", message)
  );

  document.body.appendChild(card);
}

// =========================================
// 11. APP INITIALIZATION
// =========================================

function startApp() {
  try {
    console.log("DAILY OS: Starting...");

    header = document.getElementById("app-header");
    main = document.getElementById("main-content");
    navigation = document.getElementById("bottom-navigation");

    if (!header || !main || !navigation) {
      showSetupError(
        "Missing HTML element. Check these IDs in index.html: " +
        "app-header, main-content, bottom-navigation."
      );
      return;
    }

    data = loadData();

    renderHeader();
    renderNavigation();
    showPage("Today");

    console.log("DAILY OS: App started successfully.");

  } catch (error) {
    showStartupError(error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startApp,
    { once: true }
  );
} else {
  startApp();
}

// =========================================
// 12. HEADER
// =========================================

function renderHeader() {
  header.replaceChildren();

  const wrapper = createElement("div", "header-content");
  const titleGroup = createElement("div");

  const eyebrow = createElement(
    "p",
    "eyebrow",
    "YOUR PERSONAL SYSTEM"
  );

  const title = createElement(
    "h1",
    "page-title",
    "DAILY OS"
  );

  titleGroup.append(eyebrow, title);

  const dateElement = createElement("div", "header-date");

  dateElement.id = "header-date";

  dateElement.textContent = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric"
    }
  );

  wrapper.append(titleGroup, dateElement);
  header.appendChild(wrapper);
}

// =========================================
// 13. NAVIGATION
// =========================================

function renderNavigation() {
  navigation.replaceChildren();

  pages.forEach(page => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "nav-item";
    button.textContent = page;
    button.dataset.page = page;

    button.addEventListener("click", () => {
      showPage(page);
    });

    navigation.appendChild(button);
  });
}

function showPage(page) {
  if (!pages.includes(page)) {
    console.error("DAILY OS: Unknown page:", page);
    return;
  }

  try {
    currentPage = page;

    navigation.querySelectorAll(".nav-item").forEach(button => {
      const isActive = button.dataset.page === page;

      button.classList.toggle("active", isActive);

      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    if (page !== "Tasks") {
      editingTaskId = null;
    }

    if (page === "Today") renderToday();
    else if (page === "Tasks") renderTasks();
    else if (page === "Habits") renderHabits();
    else if (page === "Analytics") renderAnalytics();

  } catch (error) {
    showStartupError(error);
  }
}

// =========================================
// 14. TODAY PAGE
// =========================================

function renderToday() {
  main.replaceChildren();

  main.append(
    createElement("p", "eyebrow", "FOCUS ON WHAT MATTERS"),
    createElement("h2", "page-title", "Make today count."),
    createElement(
      "p",
      "secondary-text",
      "Small actions. Consistent progress."
    )
  );

  const totalItems = data.tasks.length + data.habits.length;

  const completedItems =
    getCompletedTasks() + getCompletedHabits();

  const percentage = totalItems === 0
    ? 0
    : Math.round((completedItems / totalItems) * 100);

  const progressCard = createCard("DAILY PROGRESS");

  progressCard.appendChild(
    createElement("p", "progress-text", `${percentage}% completed`)
  );

  const track = createElement("div", "progress-track");
  const bar = createElement("div", "progress-bar");

  track.style.cssText =
    "height:8px;background:#303030;border-radius:10px;overflow:hidden;";

  bar.style.cssText =
    "height:100%;background:#fff;border-radius:10px;transition:width .2s ease;";

  bar.style.width = `${percentage}%`;

  track.appendChild(bar);

  progressCard.append(
    track,
    createElement(
      "p",
      "secondary-text",
      `${completedItems} of ${totalItems} items completed`
    )
  );

  main.appendChild(progressCard);

  const taskCard = createCard("TODAY'S TASKS");

  const pendingTasks = data.tasks.filter(task => !task.completed);

  if (pendingTasks.length === 0) {
    taskCard.appendChild(
      createElement(
        "p",
        "secondary-text",
        "No pending tasks. Add a task to get started."
      )
    );
  } else {
    const list = createElement("div", "task-list");

    pendingTasks.slice(0, 3).forEach(task => {
      list.appendChild(createTaskItem(task));
    });

    taskCard.appendChild(list);
  }

  main.appendChild(taskCard);

  const habitCard = createCard("DAILY HABITS");

  if (data.habits.length === 0) {
    habitCard.appendChild(
      createElement(
        "p",
        "secondary-text",
        "No habits yet. Start building your routine."
      )
    );
  } else {
    const list = createElement("div", "habit-list");

    data.habits.forEach(habit => {
      list.appendChild(createHabitItem(habit));
    });

    habitCard.appendChild(list);
  }

  main.appendChild(habitCard);
}

// =========================================
// 15. TASKS PAGE — VERSION 2.0
// =========================================

function renderTasks() {
  main.replaceChildren();

  main.append(
    createElement("p", "eyebrow", "GET THINGS DONE"),
    createElement("h2", "page-title", "Tasks"),
    createElement(
      "p",
      "secondary-text",
      "Organize your work. Focus on what matters."
    )
  );

  const editingTask = editingTaskId
    ? data.tasks.find(task => task.id === editingTaskId)
    : null;

  if (editingTaskId && !editingTask) {
    editingTaskId = null;
  }

  const form = document.createElement("form");
  form.className = "card";

  const formTitle = createElement(
    "h3",
    "section-title",
    editingTask ? "EDIT TASK" : "NEW TASK"
  );

  const titleInput = createInput(
    "text",
    "Write a new task..."
  );

  titleInput.maxLength = 120;
  titleInput.required = true;
  titleInput.setAttribute("aria-label", "Task title");

  titleInput.value = editingTask ? editingTask.title : "";

  const fields = applyStyles(
    createElement("div", "task-fields"),
    {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
      gap: "12px",
      marginTop: "14px"
    }
  );

  const priorityField = createElement("div", "task-field");
  const priorityLabel = createFieldLabel("PRIORITY");

  const prioritySelect = createSelect(
    TASK_PRIORITIES,
    editingTask ? editingTask.priority : "Medium"
  );

  priorityField.append(priorityLabel, prioritySelect);

  const categoryField = createElement("div", "task-field");
  const categoryLabel = createFieldLabel("CATEGORY");

  const categorySelect = createSelect(
    TASK_CATEGORIES,
    editingTask ? editingTask.category : "Personal"
  );

  categoryField.append(categoryLabel, categorySelect);

  const dateField = createElement("div", "task-field");
  const dateLabel = createFieldLabel("DUE DATE");

  const dateInput = createInput("date", "");
  dateInput.setAttribute("aria-label", "Task due date");

  dateInput.value = editingTask ? editingTask.dueDate : "";

  dateField.append(dateLabel, dateInput);

  [priorityLabel, categoryLabel, dateLabel].forEach(label => {
    label.style.display = "block";
    label.style.marginBottom = "6px";
    label.style.fontSize = "11px";
    label.style.letterSpacing = "1px";
  });

  fields.append(priorityField, categoryField, dateField);

  const formActions = applyStyles(
    createElement("div", "task-form-actions"),
    {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      marginTop: "16px"
    }
  );

  const submitButton = createActionButton(
    editingTask ? "Save Changes" : "＋ Add Task"
  );

  submitButton.type = "submit";

  formActions.appendChild(submitButton);

  if (editingTask) {
    const cancelButton = createActionButton("Cancel", true);

    cancelButton.addEventListener("click", () => {
      editingTaskId = null;
      renderTasks();
    });

    formActions.appendChild(cancelButton);
  }

  form.append(
    formTitle,
    titleInput,
    fields,
    formActions
  );

  form.addEventListener("submit", event => {
    event.preventDefault();

    const title = titleInput.value.trim();

    if (!title) {
      titleInput.focus();
      return;
    }

    const previousData = JSON.parse(JSON.stringify(data));

    if (editingTask) {
      const task = data.tasks.find(
        entry => entry.id === editingTask.id
      );

      if (!task) return;

      task.title = title;
      task.priority = prioritySelect.value;
      task.category = categorySelect.value;
      task.dueDate = dateInput.value || "";

    } else {
      data.tasks.push({
        id: createId(),
        title,
        completed: false,
        createdAt: getTodayKey(),
        priority: prioritySelect.value,
        category: categorySelect.value,
        dueDate: dateInput.value || ""
      });
    }

    if (!saveData()) {
      data = previousData;
      return;
    }

    editingTaskId = null;
    renderTasks();
  });

  main.appendChild(form);

  const taskCard = createCard(
    `ALL TASKS (${data.tasks.length})`
  );

  if (data.tasks.length === 0) {
    taskCard.appendChild(
      createElement(
        "p",
        "secondary-text",
        "Your task list is empty."
      )
    );
  } else {
    const list = createElement("div", "task-list");

    data.tasks.forEach(task => {
      list.appendChild(createTaskItem(task, true));
    });

    taskCard.appendChild(list);
  }

  main.appendChild(taskCard);
}

// =========================================
// 16. TASK ITEM
// =========================================

function createTaskItem(task, allowActions = false) {
  const item = createElement("div", "task-item");

  applyStyles(item, {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    padding: "10px 0"
  });

  const checkbox = document.createElement("input");

  checkbox.type = "checkbox";
  checkbox.checked = task.completed;

  checkbox.setAttribute(
    "aria-label",
    `Mark ${task.title} as ${task.completed ? "incomplete" : "complete"}`
  );

  checkbox.addEventListener("change", () => {
    const previous = task.completed;

    task.completed = checkbox.checked;

    if (!saveData()) {
      task.completed = previous;
      checkbox.checked = previous;
      return;
    }

    showPage(currentPage);
  });

  const info = applyStyles(
    createElement("div", "task-information"),
    {
      flex: "1",
      minWidth: "0"
    }
  );

  const title = createElement("span", "task-title", task.title);

  if (task.completed) {
    title.classList.add("completed");
  }

  const metadata = applyStyles(
    createElement("div", "task-metadata"),
    {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flexWrap: "wrap",
      marginTop: "6px"
    }
  );

  const priority = createElement(
    "span",
    "task-priority",
    task.priority
  );

  const priorityColors = {
    High: {
      color: "#ff8585",
      background: "#3a2020"
    },
    Medium: {
      color: "#e8c47c",
      background: "#352e1e"
    },
    Low: {
      color: "#bcbcbc",
      background: "#292929"
    }
  };

  applyStyles(priority, {
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "20px",
    ...priorityColors[task.priority]
  });

  const category = createElement(
    "span",
    "task-category",
    task.category
  );

  applyStyles(category, {
    fontSize: "11px",
    color: "#ccc",
    background: "#292929",
    padding: "4px 8px",
    borderRadius: "20px"
  });

  metadata.append(priority, category);

  if (task.dueDate) {
    const isOverdue =
      !task.completed && task.dueDate < getTodayKey();

    const due = createElement(
      "span",
      "task-due-date",
      `${isOverdue ? "Overdue · " : "Due · "}${formatDate(task.dueDate)}`
    );

    applyStyles(due, {
      fontSize: "11px",
      color: isOverdue ? "#ff8585" : "#aaa"
    });

    metadata.appendChild(due);
  }

  info.append(title, metadata);
  item.append(checkbox, info);

  if (allowActions) {
    const actions = applyStyles(
      createElement("div", "task-actions"),
      {
        display: "flex",
        gap: "6px",
        alignItems: "center"
      }
    );

    const editButton = createActionButton("Edit", true);

    editButton.addEventListener("click", () => {
      editingTaskId = task.id;
      renderTasks();
    });

    const deleteButton = createElement(
      "button",
      "delete-button",
      "×"
    );

    deleteButton.type = "button";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${task.title}`
    );

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(
        `Delete "${task.title}"?`
      );

      if (!confirmed) return;

      const previousTasks = data.tasks;

      data.tasks = data.tasks.filter(
        entry => entry.id !== task.id
      );

      if (!saveData()) {
        data.tasks = previousTasks;
        return;
      }

      if (editingTaskId === task.id) {
        editingTaskId = null;
      }

      renderTasks();
    });

    actions.append(editButton, deleteButton);
    item.appendChild(actions);
  }

  return item;
}

// =========================================
// 17. HABITS PAGE
// =========================================

function renderHabits() {
  main.replaceChildren();

  main.append(
    createElement("p", "eyebrow", "BUILD YOUR ROUTINE"),
    createElement("h2", "page-title", "Habits")
  );

  const form = document.createElement("form");
  form.className = "card";

  const input = document.createElement("input");

  input.type = "text";
  input.placeholder = "Example: Read 10 pages";
  input.maxLength = 100;
  input.required = true;
  input.className = "habit-input";
  input.setAttribute("aria-label", "New habit");

  const addButton = createElement(
    "button",
    "primary-button",
    "＋ Add Habit"
  );

  addButton.type = "submit";

  form.append(input, addButton);

  form.addEventListener("submit", event => {
    event.preventDefault();

    const title = input.value.trim();
    if (!title) return;

    const previousHabits = data.habits;

    data.habits.push({
      id: createId(),
      title,
      completedDates: []
    });

    if (saveData()) {
      renderHabits();
    } else {
      data.habits = previousHabits;
    }
  });

  main.appendChild(form);

  const habitCard = createCard(
    `YOUR HABITS (${data.habits.length})`
  );

  if (data.habits.length === 0) {
    habitCard.appendChild(
      createElement(
        "p",
        "secondary-text",
        "Add one small habit to begin."
      )
    );
  } else {
    const list = createElement("div", "habit-list");

    data.habits.forEach(habit => {
      list.appendChild(createHabitItem(habit, true));
    });

    habitCard.appendChild(list);
  }

  main.appendChild(habitCard);
}

function createHabitItem(habit, allowDelete = false) {
  const item = createElement("div", "habit-item");
  const today = getTodayKey();

  const completedToday =
    habit.completedDates.includes(today);

  const checkbox = document.createElement("input");

  checkbox.type = "checkbox";
  checkbox.checked = completedToday;

  checkbox.setAttribute(
    "aria-label",
    `Mark ${habit.title} as ${completedToday ? "not done" : "done"} today`
  );

  checkbox.addEventListener("change", () => {
    const previousDates = [...habit.completedDates];

    if (checkbox.checked) {
      if (!habit.completedDates.includes(today)) {
        habit.completedDates.push(today);
      }
    } else {
      habit.completedDates = habit.completedDates.filter(
        date => date !== today
      );
    }

    if (saveData()) {
      showPage(currentPage);
    } else {
      habit.completedDates = previousDates;
      checkbox.checked = previousDates.includes(today);
    }
  });

  const title = createElement(
    "span",
    "habit-title",
    habit.title
  );

  if (completedToday) {
    title.classList.add("completed");
  }

  item.append(checkbox, title);

  if (allowDelete) {
    const deleteButton = createElement(
      "button",
      "delete-button",
      "×"
    );

    deleteButton.type = "button";

    deleteButton.setAttribute(
      "aria-label",
      `Delete ${habit.title}`
    );

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(
        `Delete habit "${habit.title}"?`
      );

      if (!confirmed) return;

      const previousHabits = data.habits;

      data.habits = data.habits.filter(
        entry => entry.id !== habit.id
      );

      if (saveData()) {
        renderHabits();
      } else {
        data.habits = previousHabits;
      }
    });

    item.appendChild(deleteButton);
  }

  return item;
}

// =========================================
// 18. BACKUP INTERFACE
// =========================================

function renderBackupSection() {
  const backupCard = createCard("DATA BACKUP");

  backupCard.appendChild(
    createElement(
      "p",
      "secondary-text",
      "Protect your Tasks and Habits by keeping a backup file."
    )
  );

  const actions = createElement("div", "backup-actions");

  actions.style.cssText = [
    "display:flex",
    "flex-direction:column",
    "gap:10px",
    "margin-top:16px"
  ].join(";");

  const exportButton = createElement(
    "button",
    "primary-button",
    "↓ Export Backup"
  );

  exportButton.type = "button";

  exportButton.addEventListener("click", exportBackup);

  const importButton = createElement(
    "button",
    "primary-button",
    "↑ Import Backup"
  );

  importButton.type = "button";

  const fileInput = document.createElement("input");

  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;

  fileInput.setAttribute(
    "aria-label",
    "Choose a DAILY OS backup file"
  );

  importButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];

    if (file) importBackupFile(file);

    fileInput.value = "";
  });

  actions.append(exportButton, importButton, fileInput);
  backupCard.appendChild(actions);

  backupCard.appendChild(
    createElement(
      "p",
      "secondary-text",
      "Importing a backup replaces your current Tasks and Habits. " +
      "Always export your latest data before importing."
    )
  );

  main.appendChild(backupCard);
}

// =========================================
// 19. ANALYTICS PAGE
// =========================================

function renderAnalytics() {
  main.replaceChildren();

  main.append(
    createElement("p", "eyebrow", "MEASURE YOUR PROGRESS"),
    createElement("h2", "page-title", "Analytics")
  );

  const taskCard = createCard("TASK OVERVIEW");

  const completedTasks = getCompletedTasks();
  const totalTasks = data.tasks.length;

  const taskPercentage = totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * 100);

  taskCard.append(
    createElement(
      "p",
      "progress-text",
      `${completedTasks} / ${totalTasks} tasks completed`
    ),
    createElement(
      "p",
      "secondary-text",
      `${taskPercentage}% completion rate`
    )
  );

  main.appendChild(taskCard);

  const habitCard = createCard("HABIT OVERVIEW");

  const completedHabits = getCompletedHabits();
  const totalHabits = data.habits.length;

  const habitPercentage = totalHabits === 0
    ? 0
    : Math.round((completedHabits / totalHabits) * 100);

  habitCard.append(
    createElement(
      "p",
      "progress-text",
      `${completedHabits} / ${totalHabits} habits completed today`
    ),
    createElement(
      "p",
      "secondary-text",
      `${habitPercentage}% completed today`
    )
  );

  main.appendChild(habitCard);

  const totalCard = createCard("TOTAL ACTIVITY");

  totalCard.append(
    createElement(
      "p",
      "progress-text",
      `${data.tasks.length + data.habits.length} items`
    ),
    createElement(
      "p",
      "secondary-text",
      "Your current tasks and habits combined."
    )
  );

  main.appendChild(totalCard);

  // Task priority overview
  const priorityCard = createCard("TASK PRIORITIES");

  TASK_PRIORITIES.forEach(priority => {
    const count = data.tasks.filter(
      task => task.priority === priority && !task.completed
    ).length;

    const row = applyStyles(
      createElement("div", "priority-overview-row"),
      {
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid #303030"
      }
    );

    row.append(
      createElement("span", "secondary-text", priority),
      createElement("strong", "", String(count))
    );

    priorityCard.appendChild(row);
  });

  main.appendChild(priorityCard);

  // Backup section
  renderBackupSection();
}

// =========================================
// 20. APP STATUS
// =========================================

console.log("DAILY OS: Version 2.0 script loaded.");
