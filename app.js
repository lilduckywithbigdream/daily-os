
/* =========================================
   DAILY OS — Core App
   Version 1.3
   Tasks | Habits | Analytics
   ========================================= */

"use strict";

// =========================================
// 1. CONFIGURATION
// =========================================

// IMPORTANT: Declare pages before starting the app.
const pages = ["Today", "Tasks", "Habits", "Analytics"];

const STORAGE_KEY = "daily-os-data";

let data = {
  tasks: [],
  habits: []
};

let header = null;
let main = null;
let navigation = null;
let currentPage = "Today";

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
// 3. DATA MANAGEMENT
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
            typeof task.title === "string"
          )
          .map(task => ({
            id: task.id || createId(),
            title: task.title,
            completed: task.completed === true,
            createdAt: task.createdAt || getTodayKey()
          }))
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
                  date => typeof date === "string"
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
    alert("Unable to save data. Please check browser storage.");
    return false;
  }
}

// =========================================
// 4. GENERAL HELPERS
// =========================================

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function createCard(title) {
  const card = createElement("section", "card");
  const heading = createElement("h2", "section-title", title);

  card.appendChild(heading);

  return card;
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
// 5. ERROR DISPLAY
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

  const message = createElement(
    "p",
    "secondary-text",
    `${error.name}: ${error.message}`
  );

  const instruction = createElement(
    "p",
    "secondary-text",
    "Please send this error message to ChatGPT."
  );

  card.append(message, instruction);
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
// 6. APP INITIALIZATION
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

// Start only after the HTML document is ready.
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
// 7. HEADER
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

  const dateElement = createElement(
    "div",
    "header-date"
  );

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
// 8. NAVIGATION
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

    if (page === "Today") renderToday();
    else if (page === "Tasks") renderTasks();
    else if (page === "Habits") renderHabits();
    else if (page === "Analytics") renderAnalytics();

  } catch (error) {
    showStartupError(error);
  }
}

// =========================================
// 9. TODAY PAGE
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

  // Daily progress
  const totalItems = data.tasks.length + data.habits.length;

  const completedItems =
    getCompletedTasks() + getCompletedHabits();

  const percentage = totalItems === 0
    ? 0
    : Math.round((completedItems / totalItems) * 100);

  const progressCard = createCard("DAILY PROGRESS");

  progressCard.appendChild(
    createElement(
      "p",
      "progress-text",
      `${percentage}% completed`
    )
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

  // Task preview
  const taskCard = createCard("TODAY'S TASKS");

  const pendingTasks = data.tasks.filter(
    task => !task.completed
  );

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

  // Habit preview
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
// 10. TASKS PAGE
// =========================================

function renderTasks() {
  main.replaceChildren();

  main.append(
    createElement("p", "eyebrow", "GET THINGS DONE"),
    createElement("h2", "page-title", "Tasks")
  );

  const form = document.createElement("form");
  form.className = "card";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Write a new task...";
  input.maxLength = 120;
  input.required = true;
  input.className = "task-input";
  input.setAttribute("aria-label", "New task");

  const addButton = createElement(
    "button",
    "primary-button",
    "＋ Add Task"
  );

  addButton.type = "submit";

  form.append(input, addButton);

  form.addEventListener("submit", event => {
    event.preventDefault();

    const title = input.value.trim();
    if (!title) return;

    data.tasks.push({
      id: createId(),
      title,
      completed: false,
      createdAt: getTodayKey()
    });

    if (saveData()) renderTasks();
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

function createTaskItem(task, allowDelete = false) {
  const item = createElement("div", "task-item");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;

  checkbox.setAttribute(
    "aria-label",
    `Mark ${task.title} as ${task.completed ? "incomplete" : "complete"}`
  );

  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;

    if (saveData()) showPage(currentPage);
  });

  const title = createElement(
    "span",
    "task-title",
    task.title
  );

  if (task.completed) {
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
      `Delete ${task.title}`
    );

    deleteButton.addEventListener("click", () => {
      data.tasks = data.tasks.filter(
        entry => entry.id !== task.id
      );

      if (saveData()) renderTasks();
    });

    item.appendChild(deleteButton);
  }

  return item;
}

// =========================================
// 11. HABITS PAGE
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

    data.habits.push({
      id: createId(),
      title,
      completedDates: []
    });

    if (saveData()) renderHabits();
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
    if (checkbox.checked) {
      if (!habit.completedDates.includes(today)) {
        habit.completedDates.push(today);
      }
    } else {
      habit.completedDates = habit.completedDates.filter(
        date => date !== today
      );
    }

    if (saveData()) showPage(currentPage);
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
      data.habits = data.habits.filter(
        entry => entry.id !== habit.id
      );

      if (saveData()) renderHabits();
    });

    item.appendChild(deleteButton);
  }

  return item;
}

// =========================================
// 12. ANALYTICS PAGE
// =========================================

function renderAnalytics() {
  main.replaceChildren();

  main.append(
    createElement("p", "eyebrow", "MEASURE YOUR PROGRESS"),
    createElement("h2", "page-title", "Analytics")
  );

  // Task overview
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

  // Habit overview
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

  // Total activity
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
}

// =========================================
// 13. APP STATUS
// =========================================

console.log("DAILY OS: Script loaded.");
