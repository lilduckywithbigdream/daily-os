
/* =========================================
   DAILY OS — Core App
   Version 1.1
   Tasks | Habits | Analytics
   ========================================= */

"use strict";

// =========================================
// 1. CONFIGURATION & APP DATA
// =========================================

const STORAGE_KEY = "daily-os-data";

let data = {
  tasks: [],
  habits: []
};

let header = null;
let main = null;
let navigation = null;
let currentPage = "Today";

// Get today's date in local time
function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Generate a unique ID
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
// 2. DATA MANAGEMENT
// =========================================

// Load saved data safely
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {
        tasks: [],
        habits: []
      };
    }

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid saved data.");
    }

    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks
          .filter((task) =>
            task &&
            typeof task.title === "string"
          )
          .map((task) => ({
            id: task.id || createId(),
            title: task.title,
            completed: task.completed === true,
            createdAt: task.createdAt || getTodayKey()
          }))
      : [];

    const habits = Array.isArray(parsed.habits)
      ? parsed.habits
          .filter((habit) =>
            habit &&
            typeof habit.title === "string"
          )
          .map((habit) => ({
            id: habit.id || createId(),
            title: habit.title,
            completedDates: Array.isArray(habit.completedDates)
              ? habit.completedDates.filter(
                  (date) => typeof date === "string"
                )
              : []
          }))
      : [];

    return { tasks, habits };

  } catch (error) {
    console.error("DAILY OS: Data loading error:", error);

    return {
      tasks: [],
      habits: []
    };
  }
}

// Save data safely
function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (error) {
    console.error("DAILY OS: Data saving error:", error);

    showMessage(
      "Unable to save data. Please check browser storage."
    );

    return false;
  }
}

// =========================================
// 3. GENERAL HELPERS
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

function clearElement(element) {
  element.replaceChildren();
}

function showMessage(message) {
  if (!main) return;

  const messageElement = createElement(
    "p",
    "secondary-text",
    message
  );

  messageElement.setAttribute("role", "status");
  main.prepend(messageElement);
}

function createCard(title) {
  const card = createElement("section", "card");

  const heading = createElement(
    "h2",
    "section-title",
    title
  );

  card.appendChild(heading);

  return card;
}

function createButton(text, className, onClick) {
  const button = createElement(
    "button",
    className,
    text
  );

  button.type = "button";
  button.addEventListener("click", onClick);

  return button;
}

function getCompletedTasks() {
  return data.tasks.filter(
    (task) => task.completed
  ).length;
}

function getCompletedHabits() {
  const today = getTodayKey();

  return data.habits.filter(
    (habit) => habit.completedDates.includes(today)
  ).length;
}

// =========================================
// 4. ERROR HANDLING
// =========================================

function showStartupError(error) {
  console.error("DAILY OS STARTUP ERROR:", error);

  const container = main || document.body;

  clearElement(container);

  const errorCard = createElement("section", "card");

  const title = createElement(
    "h2",
    "section-title",
    "DAILY OS Startup Error"
  );

  const message = createElement(
    "p",
    "secondary-text",
    error.name + ": " + error.message
  );

  message.style.cssText =
    "margin-top:12px;overflow-wrap:anywhere;";

  const instruction = createElement(
    "p",
    "secondary-text",
    "Please share this error message with ChatGPT."
  );

  instruction.style.marginTop = "12px";

  errorCard.append(title, message, instruction);
  container.appendChild(errorCard);
}

function showFatalError(message) {
  const errorBox = createElement("section", "card");

  const title = createElement(
    "h2",
    "section-title",
    "DAILY OS Setup Error"
  );

  const description = createElement(
    "p",
    "secondary-text",
    message
  );

  errorBox.append(title, description);
  document.body.appendChild(errorBox);

  console.error("DAILY OS:", message);
}

// =========================================
// 5. APP INITIALIZATION
// =========================================

function startApp() {
  try {
    console.log("DAILY OS: Starting...");

    header = document.getElementById("app-header");
    main = document.getElementById("main-content");
    navigation = document.getElementById("bottom-navigation");

    // Check required HTML elements
    if (!header || !main || !navigation) {
      showFatalError(
        "Required HTML elements are missing. " +
        "Please check app-header, main-content, " +
        "and bottom-navigation in index.html."
      );

      return;
    }

    // Load saved data
    data = loadData();

    console.log("DAILY OS: Data loaded.");

    // Build the application
    renderHeader();

    console.log("DAILY OS: Header rendered.");

    renderNavigation();

    console.log("DAILY OS: Navigation rendered.");

    showPage("Today");

    console.log("DAILY OS: Today page rendered.");

  } catch (error) {
    showStartupError(error);
  }
}

// Start after HTML is ready
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
// 6. HEADER
// =========================================

function renderHeader() {
  clearElement(header);

  const wrapper = createElement(
    "div",
    "header-content"
  );

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

  const date = createElement(
    "div",
    "header-date"
  );

  date.id = "header-date";

  date.textContent = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric"
    }
  );

  wrapper.append(titleGroup, date);
  header.appendChild(wrapper);
}

// =========================================
// 7. NAVIGATION
// =========================================

const pages = [
  "Today",
  "Tasks",
  "Habits",
  "Analytics"
];

function renderNavigation() {
  clearElement(navigation);

  pages.forEach((page) => {
    const button = createButton(
      page,
      "nav-item",
      () => showPage(page)
    );

    button.dataset.page = page;

    navigation.appendChild(button);
  });
}

function showPage(page) {
  try {
    if (!pages.includes(page)) {
      throw new Error("Unknown page: " + page);
    }

    currentPage = page;

    navigation
      .querySelectorAll(".nav-item")
      .forEach((button) => {
        const active = button.dataset.page === page;

        button.classList.toggle("active", active);

        if (active) {
          button.setAttribute("aria-current", "page");
        } else {
          button.removeAttribute("aria-current");
        }
      });

    if (page === "Today") {
      renderToday();
    }

    if (page === "Tasks") {
      renderTasks();
    }

    if (page === "Habits") {
      renderHabits();
    }

    if (page === "Analytics") {
      renderAnalytics();
    }

  } catch (error) {
    showStartupError(error);
  }
}

// =========================================
// 8. TODAY PAGE
// =========================================

function renderToday() {
  clearElement(main);

  main.appendChild(
    createElement(
      "p",
      "eyebrow",
      "FOCUS ON WHAT MATTERS"
    )
  );

  main.appendChild(
    createElement(
      "h2",
      "page-title",
      "Make today count."
    )
  );

  main.appendChild(
    createElement(
      "p",
      "secondary-text",
      "Small actions. Consistent progress."
    )
  );

  // Daily progress
  const totalItems =
    data.tasks.length + data.habits.length;

  const completedItems =
    getCompletedTasks() + getCompletedHabits();

  const percentage = totalItems === 0
    ? 0
    : Math.round(
        (completedItems / totalItems) * 100
      );

  const progressCard = createCard("DAILY PROGRESS");

  const progressText = createElement(
    "p",
    "progress-text",
    `${percentage}% completed`
  );

  const progressTrack = createElement(
    "div",
    "progress-track"
  );

  const progressBar = createElement(
    "div",
    "progress-bar"
  );

  progressBar.style.width = percentage + "%";

  progressTrack.appendChild(progressBar);

  const progressDetails = createElement(
    "p",
    "secondary-text",
    `${completedItems} of ${totalItems} items completed`
  );

  progressCard.append(
    progressText,
    progressTrack,
    progressDetails
  );

  main.appendChild(progressCard);

  // Tasks preview
  const taskCard = createCard("TODAY'S TASKS");

  const pendingTasks = data.tasks.filter(
    (task) => !task.completed
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

    pendingTasks.slice(0, 3).forEach((task) => {
      list.appendChild(createTaskItem(task));
    });

    taskCard.appendChild(list);
  }

  main.appendChild(taskCard);

  // Habits preview
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

    data.habits.forEach((habit) => {
      list.appendChild(createHabitItem(habit));
    });

    habitCard.appendChild(list);
  }

  main.appendChild(habitCard);
}

// =========================================
// 9. TASKS PAGE
// =========================================

function renderTasks() {
  clearElement(main);

  main.appendChild(
    createElement(
      "p",
      "eyebrow",
      "GET THINGS DONE"
    )
  );

  main.appendChild(
    createElement(
      "h2",
      "page-title",
      "Tasks"
    )
  );

  // Add task form
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = input.value.trim();

    if (!title) return;

    data.tasks.push({
      id: createId(),
      title,
      completed: false,
      createdAt: getTodayKey()
    });

    saveData();
    renderTasks();
  });

  main.appendChild(form);

  // Task list
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

    data.tasks.forEach((task) => {
      list.appendChild(
        createTaskItem(task, true)
      );
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
    "Mark " + task.title + " as completed"
  );

  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;

    saveData();
    showPage(currentPage);
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
    const deleteButton = createButton(
      "×",
      "delete-button",
      () => {
        data.tasks = data.tasks.filter(
          (entry) => entry.id !== task.id
        );

        saveData();
        renderTasks();
      }
    );

    deleteButton.setAttribute(
      "aria-label",
      "Delete " + task.title
    );

    item.appendChild(deleteButton);
  }

  return item;
}

// =========================================
// 10. HABITS PAGE
// =========================================

function renderHabits() {
  clearElement(main);

  main.appendChild(
    createElement(
      "p",
      "eyebrow",
      "BUILD YOUR ROUTINE"
    )
  );

  main.appendChild(
    createElement(
      "h2",
      "page-title",
      "Habits"
    )
  );

  // Add habit form
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = input.value.trim();

    if (!title) return;

    data.habits.push({
      id: createId(),
      title,
      completedDates: []
    });

    saveData();
    renderHabits();
  });

  main.appendChild(form);

  // Habit list
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

    data.habits.forEach((habit) => {
      list.appendChild(
        createHabitItem(habit, true)
      );
    });

    habitCard.appendChild(list);
  }

  main.appendChild(habitCard);
}

function createHabitItem(habit, allowDelete = false) {
  const item = createElement("div", "habit-item");

  const checkbox = document.createElement("input");

  checkbox.type = "checkbox";

  const completedToday =
    habit.completedDates.includes(getTodayKey());

  checkbox.checked = completedToday;

  checkbox.setAttribute(
    "aria-label",
    "Mark " + habit.title + " as completed today"
  );

  checkbox.addEventListener("change", () => {
    const today = getTodayKey();

    if (checkbox.checked) {
      if (!habit.completedDates.includes(today)) {
        habit.completedDates.push(today);
      }
    } else {
      habit.completedDates =
        habit.completedDates.filter(
          (date) => date !== today
        );
    }

    saveData();
    showPage(currentPage);
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
    const deleteButton = createButton(
      "×",
      "delete-button",
      () => {
        data.habits = data.habits.filter(
          (entry) => entry.id !== habit.id
        );

        saveData();
        renderHabits();
      }
    );

    deleteButton.setAttribute(
      "aria-label",
      "Delete " + habit.title
    );

    item.appendChild(deleteButton);
  }

  return item;
}

// =========================================
// 11. ANALYTICS PAGE
// =========================================

function renderAnalytics() {
  clearElement(main);

  main.appendChild(
    createElement(
      "p",
      "eyebrow",
      "MEASURE YOUR PROGRESS"
    )
  );

  main.appendChild(
    createElement(
      "h2",
      "page-title",
      "Analytics"
    )
  );

  // Task overview
  const taskCard = createCard("TASK OVERVIEW");

  const completedTasks = getCompletedTasks();
  const totalTasks = data.tasks.length;

  const taskPercentage = totalTasks === 0
    ? 0
    : Math.round(
        (completedTasks / totalTasks) * 100
      );

  taskCard.appendChild(
    createElement(
      "p",
      "progress-text",
      `${completedTasks} / ${totalTasks} tasks completed`
    )
  );

  taskCard.appendChild(
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
    : Math.round(
        (completedHabits / totalHabits) * 100
      );

  habitCard.appendChild(
    createElement(
      "p",
      "progress-text",
      `${completedHabits} / ${totalHabits} habits completed today`
    )
  );

  habitCard.appendChild(
    createElement(
      "p",
      "secondary-text",
      `${habitPercentage}% completed today`
    )
  );

  main.appendChild(habitCard);

  // Total activity
  const totalCard = createCard("TOTAL ACTIVITY");

  const totalItems =
    data.tasks.length + data.habits.length;

  totalCard.appendChild(
    createElement(
      "p",
      "progress-text",
      `${totalItems} items`
    )
  );

  totalCard.appendChild(
    createElement(
      "p",
      "secondary-text",
      "Your current tasks and habits combined."
    )
  );

  main.appendChild(totalCard);
}

// =========================================
// 12. END OF DAILY OS
// =========================================

console.log("DAILY OS: App script loaded.");
