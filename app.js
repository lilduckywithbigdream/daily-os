
/* =====================================
   DAILY OS — Core App
   Version 1.0
   ===================================== */

"use strict";

// ---------- 1. APP DATA ----------

const STORAGE_KEY = "daily-os-data";

const today = getTodayKey();

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        habits: Array.isArray(parsed.habits) ? parsed.habits : []
      };
    }
  } catch (error) {
    console.error("Could not load DAILY OS data:", error);
  }

  return {
    tasks: [],
    habits: []
  };
}

const data = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Could not save DAILY OS data:", error);
    alert("Unable to save data. Please check your browser storage.");
  }
}

// ---------- 2. APP ELEMENTS ----------

const header = document.getElementById("app-header");
const main = document.getElementById("main-content");
const navigation = document.getElementById("bottom-navigation");

if (!header || !main || !navigation) {
  console.error(
    "DAILY OS could not start. Check the IDs in index.html."
  );
} else {
  startApp();
}

// ---------- 3. START APP ----------


function startApp() {
  try {
    console.log("DAILY OS: Starting...");

    renderHeader();
    console.log("DAILY OS: Header rendered.");

    renderNavigation();
    console.log("DAILY OS: Navigation rendered.");

    showPage("Today");
    console.log("DAILY OS: Today page rendered.");

  } catch (error) {
    console.error("DAILY OS STARTUP ERROR:", error);

    main.innerHTML = "";
    navigation.innerHTML = "";

    const errorCard = document.createElement("section");
    errorCard.className = "card";

    const errorTitle = document.createElement("h2");
    errorTitle.className = "section-title";
    errorTitle.textContent = "DAILY OS Startup Error";

    const errorMessage = document.createElement("p");
    errorMessage.className = "secondary-text";
    errorMessage.textContent =
      error.name + ": " + error.message;

    const instruction = document.createElement("p");
    instruction.className = "secondary-text";
    instruction.textContent =
      "Please send this error message to ChatGPT.";

    errorCard.append(
      errorTitle,
      errorMessage,
      instruction
    );

    main.appendChild(errorCard);
  }
}


function renderHeader() {
  header.innerHTML = `
    <div class="header-content">
      <div>
        <p class="eyebrow">YOUR PERSONAL SYSTEM</p>
        <h1 class="page-title">DAILY OS</h1>
      </div>
      <div class="header-date" id="header-date"></div>
    </div>
  `;

  const dateElement = document.getElementById("header-date");

  dateElement.textContent = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric"
    }
  );
}

// ---------- 4. NAVIGATION ----------

const pages = ["Today", "Tasks", "Habits", "Analytics"];

function renderNavigation() {
  navigation.innerHTML = "";

  pages.forEach((page) => {
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
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  if (page === "Today") renderToday();
  if (page === "Tasks") renderTasks();
  if (page === "Habits") renderHabits();
  if (page === "Analytics") renderAnalytics();
}

// ---------- 5. HELPER FUNCTIONS ----------

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function getCompletedTasks() {
  return data.tasks.filter((task) => task.completed).length;
}

function getCompletedHabits() {
  return data.habits.filter((habit) =>
    habit.completedDates.includes(today)
  ).length;
}

function createCard(title) {
  const card = createElement("section", "card");
  const heading = createElement("h2", "section-title", title);

  card.appendChild(heading);

  return card;
}

// ---------- 6. TODAY PAGE ----------

function renderToday() {
  main.innerHTML = "";

  const greeting = createElement(
    "p",
    "eyebrow",
    "FOCUS ON WHAT MATTERS"
  );

  const heading = createElement(
    "h2",
    "page-title",
    "Make today count."
  );

  const subtitle = createElement(
    "p",
    "secondary-text",
    "Small actions. Consistent progress."
  );

  main.append(greeting, heading, subtitle);

  // Daily progress
  const totalItems = data.tasks.length + data.habits.length;
  const completedItems =
    getCompletedTasks() + getCompletedHabits();

  const percentage = totalItems === 0
    ? 0
    : Math.round((completedItems / totalItems) * 100);

  const progressCard = createCard("DAILY PROGRESS");

  const progressText = createElement(
    "p",
    "progress-text",
    `${percentage}% completed`
  );

  const progressTrack = createElement("div", "progress-track");
  const progressBar = createElement("div", "progress-bar");

  progressTrack.style.cssText =
    "height:8px;background:#303030;border-radius:10px;overflow:hidden;";

  progressBar.style.cssText =
    `height:100%;width:${percentage}%;background:#ffffff;transition:width .2s ease;`;

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

// ---------- 7. TASKS PAGE ----------

function renderTasks() {
  main.innerHTML = "";

  main.appendChild(
    createElement("p", "eyebrow", "GET THINGS DONE")
  );

  main.appendChild(
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
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
      title,
      completed: false,
      createdAt: today
    });

    saveData();
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

    data.tasks.forEach((task) => {
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
    saveData();

    const currentPage =
      document.querySelector(".nav-item.active")?.dataset.page;

    showPage(currentPage || "Today");
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
        (entry) => entry.id !== task.id
      );

      saveData();
      renderTasks();
    });

    item.appendChild(deleteButton);
  }

  return item;
}

// ---------- 8. HABITS PAGE ----------

function renderHabits() {
  main.innerHTML = "";

  main.appendChild(
    createElement("p", "eyebrow", "BUILD YOUR ROUTINE")
  );

  main.appendChild(
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
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
      title,
      completedDates: []
    });

    saveData();
    renderHabits();
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

    data.habits.forEach((habit) => {
      list.appendChild(createHabitItem(habit, true));
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
    habit.completedDates.includes(today);

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
      habit.completedDates =
        habit.completedDates.filter((date) => date !== today);
    }

    saveData();

    const currentPage =
      document.querySelector(".nav-item.active")?.dataset.page;

    showPage(currentPage || "Habits");
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
        (entry) => entry.id !== habit.id
      );

      saveData();
      renderHabits();
    });

    item.appendChild(deleteButton);
  }

  return item;
}

// ---------- 9. ANALYTICS PAGE ----------

function renderAnalytics() {
  main.innerHTML = "";

  main.appendChild(
    createElement("p", "eyebrow", "MEASURE YOUR PROGRESS")
  );

  main.appendChild(
    createElement("h2", "page-title", "Analytics")
  );

  const taskCard = createCard("TASK OVERVIEW");

  const completedTasks = getCompletedTasks();
  const totalTasks = data.tasks.length;

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
      totalTasks === 0
        ? "No tasks recorded yet."
        : `${Math.round((completedTasks / totalTasks) * 100)}% completion rate`
    )
  );

  main.appendChild(taskCard);

  const habitCard = createCard("HABIT OVERVIEW");

  const completedHabits = getCompletedHabits();
  const totalHabits = data.habits.length;

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
      totalHabits === 0
        ? "No habits recorded yet."
        : `${Math.round((completedHabits / totalHabits) * 100)}% completed today`
    )
  );

  main.appendChild(habitCard);

  const totalCard = createCard("TOTAL ACTIVITY");

  totalCard.appendChild(
    createElement(
      "p",
      "progress-text",
      `${data.tasks.length + data.habits.length} items`
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
