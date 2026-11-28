(() => {
  'use strict';

  const STORAGE_KEY = 'daily-os-data';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const safeDate = value => value ? new Date(`${value}T00:00:00`) : null;
  const fmtDate = value => {
    const d = safeDate(value);
    return d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      : 'No date';
  };
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const defaultData = () => ({tasks:[],habits:[],goals:[]});

  function normalizeData(raw) {
    const data = raw && typeof raw === 'object' ? raw : {};
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const habits = Array.isArray(data.habits) ? data.habits : [];
    const goals = Array.isArray(data.goals) ? data.goals : [];

    return {
      ...data,
      tasks: tasks.map(t => ({
        ...t,
        id:t.id || uid(),
        title:String(t.title || 'Untitled task'),
        completed:Boolean(t.completed),
        priority:['High','Medium','Low'].includes(t.priority)?t.priority:'Medium',
        category:t.category || 'Personal',
        dueDate:t.dueDate || '',
        goalId:t.goalId || '',
        milestoneId:t.milestoneId || ''
      })),
      habits: habits.map(h => ({
        ...h,
        id:h.id || uid(),
        title:String(h.title || 'Untitled habit'),
        history:Array.isArray(h.history)?h.history:(h.completedDates || [])
      })),
      goals: goals.map(g => ({
        ...g,
        id:g.id || uid(),
        title:String(g.title || 'Untitled goal'),
        description:g.description || '',
        category:g.category || 'Personal',
        startDate:g.startDate || '',
        targetDate:g.targetDate || '',
        milestones:Array.isArray(g.milestones)?g.milestones:[]
      }))
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeData(JSON.parse(raw)) : defaultData();
    } catch (error) {
      console.error('DAILY OS could not read saved data:', error);
      return defaultData();
    }
  }

  let state = loadData();
  let currentView = 'today';
  let selectedGoalId = '';
  let calendarDate = new Date();
  let modalSubmitHandler = null;
  let toastTimer = null;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('DAILY OS save failed:', error);
      showToast('Save failed — export a backup and check browser storage.');
      return false;
    }
  }

  function showToast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function setView(view) {
    currentView = view;
    selectedGoalId = '';

    $$('.nav-item[data-view]').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.view === view)
    );

    const names = {
      today:'Today',
      tasks:'Tasks',
      habits:'Habits',
      goals:'Goals',
      calendar:'Calendar',
      analytics:'Analytics',
      backup:'Backup & Settings'
    };

    $('#crumbCurrent').textContent = names[view] || 'Today';
    $('#sidebar').classList.remove('open');
    render();
  }

  function openModal(title, eyebrow, fields, onSubmit, submitText = 'Save changes') {
    $('#modalTitle').textContent = title;
    $('#modalEyebrow').textContent = eyebrow;
    $('#modalSubmit').textContent = submitText;
    $('#modalFields').innerHTML = fields;
    modalSubmitHandler = onSubmit;
    $('#modalBackdrop').hidden = false;

    setTimeout(() => {
      $('#modalFields input, #modalFields textarea, #modalFields select')?.focus();
    }, 40);
  }

  function closeModal() {
    $('#modalBackdrop').hidden = true;
    $('#modalForm').reset();
    modalSubmitHandler = null;
  }

  function field(label, name, value = '', type = 'text', full = false, extra = '') {
    return `<div class="form-field${full?' full':''}">
      <label for="f-${name}">${label}</label>
      <input id="f-${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" ${extra}>
    </div>`;
  }

  function selectField(label,name,options,value,full=false) {
    return `<div class="form-field${full?' full':''}">
      <label for="f-${name}">${label}</label>
      <select id="f-${name}" name="${name}">
        ${options.map(o => `<option value="${escapeHTML(o)}" ${o===value?'selected':''}>${escapeHTML(o)}</option>`).join('')}
      </select>
    </div>`;
  }

  function textareaField(label,name,value='',full=true) {
    return `<div class="form-field${full?' full':''}">
      <label for="f-${name}">${label}</label>
      <textarea id="f-${name}" name="${name}">${escapeHTML(value)}</textarea>
    </div>`;
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  // TASK FORM
  function taskForm(task = {}) {
    const taskCategories = [...new Set([
      'Personal','Study','Trading','Basketball','Health','Work','Other',
      ...(task.category ? [task.category] : [])
    ])];

    const fields =
      field('Task title','title',task.title || '','text',true,'required maxlength="120"') +
      selectField('Priority','priority',['High','Medium','Low'],task.priority || 'Medium') +
      selectField('Category','category',taskCategories,task.category || 'Personal') +
      field('Due date','dueDate',task.dueDate || '','date') +
      selectField('Linked goal','goalId',['',...state.goals.map(g=>g.id)],task.goalId || '',true) +
      selectField(
        'Linked milestone',
        'milestoneId',
        ['',...(state.goals.find(g=>g.id===(task.goalId||''))?.milestones || []).map(m=>m.id)],
        task.milestoneId || '',
        true
      );

    openModal(
      task.id?'Edit task':'New task',
      'TASK MANAGEMENT',
      fields,
      values => {
        const item = {
          ...task,
          ...values,
          title:values.title.trim(),
          completed:Boolean(task.completed)
        };

        if (task.id) {
          Object.assign(task,item);
        } else {
          state.tasks.unshift({id:uid(),...item,completed:false});
        }

        save();
        closeModal();
        render();
        showToast(task.id?'Task updated':'Task created');
      }
    );

    const goalSelect = $('#f-goalId');
    const milestoneSelect = $('#f-milestoneId');

    const fillGoalOptions = () => {
      if (!goalSelect) return;

      [...goalSelect.options].forEach(option => {
        option.textContent = option.value
          ? (state.goals.find(g=>g.id===option.value)?.title || 'Unknown goal')
          : 'No linked goal';
      });
    };

    const fillMilestoneOptions = () => {
      if (!milestoneSelect) return;

      const selectedGoal = state.goals.find(g=>g.id===goalSelect.value);
      const previous = milestoneSelect.value;

      milestoneSelect.innerHTML =
        '<option value="">No linked milestone</option>' +
        (selectedGoal?.milestones || []).map(m =>
          `<option value="${escapeHTML(m.id)}">${escapeHTML(m.title)}</option>`
        ).join('');

      if ((selectedGoal?.milestones || []).some(m=>m.id===previous)) {
        milestoneSelect.value = previous;
      }
    };

    fillGoalOptions();
    fillMilestoneOptions();

    goalSelect?.addEventListener('change',()=>{
      if (milestoneSelect) milestoneSelect.value='';
      fillMilestoneOptions();
    });
  }

  // HABIT FORM
  function habitForm(habit = {}) {
    const fields = field(
      'Habit name',
      'title',
      habit.title || '',
      'text',
      true,
      'required maxlength="90"'
    );

    openModal(
      habit.id?'Edit habit':'New habit',
      'HABIT TRACKER',
      fields,
      values => {
        if (habit.id) {
          habit.title = values.title.trim();
        } else {
          state.habits.push({
            id:uid(),
            title:values.title.trim(),
            history:[]
          });
        }

        save();
        closeModal();
        render();
        showToast(habit.id?'Habit updated':'Habit created');
      }
    );
  }

  // GOAL FORM
  function goalForm(goal = {}) {
    const fields =
      field('Goal title','title',goal.title || '','text',true,'required maxlength="120"') +
      textareaField('Description','description',goal.description || '') +
      selectField(
        'Category',
        'category',
        [...new Set([
          'Personal','Study','Trading','Basketball','Health','Career','Finance','Other',
          ...(goal.category ? [goal.category] : [])
        ])],
        goal.category || 'Personal'
      ) +
      field('Start date','startDate',goal.startDate || todayISO(),'date') +
      field('Target date','targetDate',goal.targetDate || '','date');

    openModal(
      goal.id?'Edit goal':'Create a goal',
      'GOALS & PERSONAL GROWTH',
      fields,
      values => {
        const clean = {
          ...values,
          title:values.title.trim(),
          description:values.description.trim()
        };

        if (goal.id) {
          Object.assign(goal,clean);
        } else {
          state.goals.unshift({
            id:uid(),
            ...clean,
            milestones:[],
            createdAt:new Date().toISOString()
          });
        }

        save();
        closeModal();
        render();
        showToast(goal.id?'Goal updated':'Goal created');
      }
    );
  }

  // MILESTONE FORM
  function milestoneForm(goal, milestone = {}) {
    const fields =
      field('Milestone title','title',milestone.title || '','text',true,'required maxlength="100"') +
      textareaField('Notes','description',milestone.description || '') +
      field('Due date','dueDate',milestone.dueDate || '','date');

    openModal(
      milestone.id?'Edit milestone':'Add milestone',
      goal.title.toUpperCase(),
      fields,
      values => {
        if (milestone.id) {
          Object.assign(milestone,values,{title:values.title.trim()});
        } else {
          goal.milestones.push({
            id:uid(),
            ...values,
            title:values.title.trim(),
            completed:false,
            taskIds:[]
          });
        }

        save();
        closeModal();
        render();
        showToast('Milestone saved');
      }
    );
  }

  function goalProgress(goal) {
    const milestones = goal.milestones || [];
    if (!milestones.length) return 0;

    return Math.round(
      milestones.filter(m=>m.completed).length / milestones.length * 100
    );
  }

  function taskGoalLink(task) {
    return state.goals.find(g=>g.id===task.goalId);
  }

  // TASK ROW
  function taskRow(task) {
    const goal = taskGoalLink(task);

    return `<div class="task-row">
      <button class="check-btn ${task.completed?'checked':''}" data-action="toggle-task" data-id="${task.id}" aria-label="Toggle task">${task.completed?'✓':''}</button>
      <div class="item-main">
        <div class="item-title ${task.completed?'done':''}">${escapeHTML(task.title)}</div>
        <div class="item-meta">
          <span>${escapeHTML(task.category)}</span>
          <span>·</span>
          <span>${task.dueDate?fmtDate(task.dueDate):'No due date'}</span>
          ${goal?`<span>·</span><span>${escapeHTML(goal.title)}</span>`:''}
        </div>
      </div>
      <span class="pill ${task.priority.toLowerCase()}">${task.priority}</span>
      <button class="tiny-btn" data-action="edit-task" data-id="${task.id}" aria-label="Edit task">···</button>
    </div>`;
  }

  // GOAL ROW
  function goalRow(goal) {
    const progress = goalProgress(goal);

    return `<div class="goal-row">
      <div class="goal-content">
        <div class="goal-category">${escapeHTML(goal.category)} · ${progress===100?'COMPLETED':progress?'IN PROGRESS':'NOT STARTED'}</div>
        <div class="item-title" style="margin-top:5px">${escapeHTML(goal.title)}</div>
        <div class="progress-line">
          <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
          <span class="progress-number">${progress}%</span>
        </div>
        <div class="item-meta">${goal.milestones.length} milestones · Target ${goal.targetDate?fmtDate(goal.targetDate):'not set'}</div>
      </div>
      <button class="tiny-btn" data-action="open-goal" data-id="${goal.id}" aria-label="Open goal">↗</button>
    </div>`;
  }

  function stat(label,value,note,symbol) {
    return `<div class="stat-card">
      <div class="stat-top"><span>${label}</span><span class="stat-symbol">${symbol}</span></div>
      <div class="stat-value">${value}</div>
      <div class="stat-note">${note}</div>
    </div>`;
  }

  function pageHeading(kicker,title,desc,actions='') {
    return `<div class="page-heading">
      <div>
        <span class="eyebrow">${kicker}</span>
        <h1>${title}</h1>
        <p>${desc}</p>
      </div>
      <div class="heading-actions">${actions}</div>
    </div>`;
  }

  // TODAY
  function renderToday() {
    const today = todayISO();
    const openTasks = state.tasks.filter(t=>!t.completed);
    const due = openTasks.filter(t=>t.dueDate===today);
    const completedToday = state.tasks.filter(t=>t.completed && t.completedAt===today).length;

    const tasks = [...openTasks].sort((a,b)=>
      ({High:0,Medium:1,Low:2}[a.priority]-({High:0,Medium:1,Low:2}[b.priority]))
    ).slice(0,5);

    const goals = [...state.goals]
      .sort((a,b)=>goalProgress(b)-goalProgress(a))
      .slice(0,4);

    const actions =
      '<button class="btn btn-primary" data-action="new-task">＋ New task</button>' +
      '<button class="btn btn-ghost" data-action="new-goal">＋ New goal</button>';

    $('#viewRoot').innerHTML =
      pageHeading(
        'MONDAY MINDSET · DAILY OVERVIEW',
        'Make today count.',
        'A clear mind. A focused plan. One deliberate step at a time.',
        actions
      ) +
      `<div class="grid stats-grid">
        ${stat('OPEN TASKS',openTasks.length,'Across all categories','☷')}
        ${stat('DUE TODAY',due.length,'Tasks scheduled for today','◷')}
        ${stat('HABITS',state.habits.length,'Routines you are building','◇')}
        ${stat('ACTIVE GOALS',state.goals.filter(g=>goalProgress(g)<100).length,'Long-term direction','◎')}
      </div>`+
      `<div class="grid content-grid">
        <div>
          <section class="panel">
            <div class="panel-head">
              <h2>Priority queue</h2>
              <button class="text-link" data-view-link="tasks">View all →</button>
            </div>
            <div class="list">
              ${tasks.length?tasks.map(taskRow).join(''):'<div class="empty-state"><strong>Nothing on your list.</strong>Add a task to give your day direction.</div>'}
            </div>
          </section>
          <section class="panel">
            <div class="panel-head">
              <h2>Goals in motion</h2>
              <button class="text-link" data-view-link="goals">All goals →</button>
            </div>
            <div class="list">
              ${goals.length?goals.map(goalRow).join(''):'<div class="empty-state"><strong>Start with a direction.</strong>Create your first goal and break it into milestones.</div>'}
            </div>
          </section>
        </div>
        <div>
          <section class="panel">
            <div class="panel-head">
              <h2>Daily habits</h2>
              <span class="subtle">${today}</span>
            </div>
            <div class="list">
              ${state.habits.length?state.habits.map(habitRow).join(''):'<div class="empty-state"><strong>Build your rhythm.</strong>Add a habit you want to practice daily.</div>'}
            </div>
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Quick actions</h2></div>
            <div class="quick-actions">
              <button class="quick-action" data-action="new-task"><span>＋</span>New task</button>
              <button class="quick-action" data-action="new-habit"><span>◇</span>New habit</button>
              <button class="quick-action" data-action="new-goal"><span>◎</span>New goal</button>
              <button class="quick-action" data-view-link="calendar"><span>▦</span>Open calendar</button>
            </div>
          </section>
        </div>
      </div>`;
  }

  function habitRow(habit) {
    const done = habit.history.includes(todayISO());

    return `<div class="habit-row">
      <button class="check-btn ${done?'checked':''}" data-action="toggle-habit" data-id="${habit.id}" aria-label="Check habit">${done?'✓':''}</button>
      <div class="item-main">
        <div class="item-title">${escapeHTML(habit.title)}</div>
        <div class="item-meta">${habit.history.length} check-ins recorded</div>
      </div>
      <span class="pill">${done?'DONE':'TODAY'}</span>
    </div>`;
  }

  // TASKS — CATEGORY FILTERS
  function renderTasks() {
    const actions = '<button class="btn btn-primary" data-action="new-task">＋ New task</button>';

    const standardCategories = [
      'Personal','Study','Trading','Basketball','Health','Work','Other'
    ];

    const categories = [...new Set([
      ...standardCategories,
      ...state.tasks.map(task => task.category).filter(Boolean)
    ])].sort((a,b) => {
      const ai = standardCategories.indexOf(a);
      const bi = standardCategories.indexOf(b);

      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
    });

    $('#viewRoot').innerHTML =
      pageHeading(
        'EXECUTION',
        'Tasks',
        'Turn intention into action. Keep the next step visible.',
        actions
      ) +
      `<div class="toolbar task-toolbar">
        <input class="field-control search-control" id="taskSearch" type="search" placeholder="Search tasks…" aria-label="Search tasks">
        <select class="field-control" id="taskCategory" aria-label="Filter by category">
          <option value="all">All categories</option>
          ${categories.map(category =>
            `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
          ).join('')}
        </select>
        <select class="field-control" id="taskStatus" aria-label="Filter by status">
          <option value="all">All tasks</option>
          <option value="open">Open</option>
          <option value="done">Completed</option>
        </select>
        <select class="field-control" id="taskPriority" aria-label="Filter by priority">
          <option value="all">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div class="task-results-meta" id="taskResultsMeta" aria-live="polite"></div>
      <div class="grid card-grid" id="taskGrid"></div>`;

    const update = () => {
      const q = $('#taskSearch').value.trim().toLocaleLowerCase();
      const category = $('#taskCategory').value;
      const status = $('#taskStatus').value;
      const priority = $('#taskPriority').value;

      const list = state.tasks.filter(task =>
        (
          task.title.toLocaleLowerCase().includes(q) ||
          String(task.category).toLocaleLowerCase().includes(q)
        ) &&
        (category === 'all' || task.category === category) &&
        (status === 'all' || (status === 'done' ? task.completed : !task.completed)) &&
        (priority === 'all' || task.priority === priority)
      );

      $('#taskResultsMeta').textContent =
        `${list.length} of ${state.tasks.length} tasks`;

      $('#taskGrid').innerHTML = list.length
        ? list.map(task => {
            const linkedGoal = taskGoalLink(task);

            return `<article class="task-card">
              <div class="card-top">
                <div class="item-main">
                  <div class="item-title ${task.completed?'done':''}">${escapeHTML(task.title)}</div>
                  <div class="item-meta">
                    <span class="category-label">${escapeHTML(task.category)}</span>
                    <span>·</span>
                    <span>${task.dueDate?fmtDate(task.dueDate):'No due date'}</span>
                  </div>
                </div>
                <div class="card-actions">
                  <button class="tiny-btn" data-action="edit-task" data-id="${task.id}" aria-label="Edit ${escapeHTML(task.title)}">✎</button>
                  <button class="tiny-btn danger" data-action="delete-task" data-id="${task.id}" aria-label="Delete ${escapeHTML(task.title)}">×</button>
                </div>
              </div>
              <p class="card-description">${linkedGoal ? 'Linked to ' + escapeHTML(linkedGoal.title) : 'No goal linked'}</p>
              <div class="task-card-footer">
                <span class="pill ${task.priority.toLowerCase()}">${task.priority}</span>
                <button class="btn ${task.completed?'btn-ghost':'btn-primary'}" data-action="toggle-task" data-id="${task.id}">${task.completed?'Mark open':'Complete'}</button>
              </div>
            </article>`;
          }).join('')
        : '<div class="empty-state"><strong>No matching tasks.</strong>Try another category or filter, or create a new task.</div>';
    };

    $('#taskSearch').addEventListener('input', update);

    ['taskCategory','taskStatus','taskPriority'].forEach(id => {
      $('#'+id).addEventListener('change', update);
    });

    update();
  }

  // HABITS
  function renderHabits() {
    $('#viewRoot').innerHTML =
      pageHeading(
        'CONSISTENCY',
        'Habits',
        'Small actions, repeated with intention.',
        '<button class="btn btn-primary" data-action="new-habit">＋ New habit</button>'
      ) +
      `<div class="grid card-grid">
        ${state.habits.length
          ? state.habits.map(h => {
              const done = h.history.includes(todayISO());
              const streak = calculateStreak(h.history);
              const last7 = Array.from({length:7},(_,i) => {
                const d = new Date();
                d.setDate(d.getDate()-(6-i));
                return dateKey(d);
              });

              return `<article class="habit-card">
                <div class="card-top">
                  <div class="item-main">
                    <div class="item-title">${escapeHTML(h.title)}</div>
                    <div class="item-meta">DAILY PRACTICE</div>
                  </div>
                  <div class="card-actions">
                    <button class="tiny-btn" data-action="edit-habit" data-id="${h.id}">✎</button>
                    <button class="tiny-btn danger" data-action="delete-habit" data-id="${h.id}">×</button>
                  </div>
                </div>
                <div class="habit-streak">${streak} <span class="subtle">day streak</span></div>
                <div class="subtle">${h.history.length} total check-ins</div>
                <div class="habit-days">
                  ${last7.map((d,i) =>
                    `<span class="day-dot ${h.history.includes(d)?'done':''}" title="${d}">${['M','T','W','T','F','S','S'][i]}</span>`
                  ).join('')}
                </div>
                <div style="margin-top:15px">
                  <button class="btn ${done?'btn-ghost':'btn-primary'}" data-action="toggle-habit" data-id="${h.id}" style="width:100%">
                    ${done?'✓ Completed today':'Check in today'}
                  </button>
                </div>
              </article>`;
            }).join('')
          : '<div class="empty-state"><strong>No habits yet.</strong>Choose one small action you can repeat consistently.</div>'
        }
      </div>`;
  }

  function calculateStreak(history) {
    const set = new Set(history);
    const d = new Date();

    if (!set.has(dateKey(d))) d.setDate(d.getDate()-1);

    let count = 0;

    while (set.has(dateKey(d))) {
      count++;
      d.setDate(d.getDate()-1);
    }

    return count;
  }

  // GOALS
  function renderGoals() {
    const cards = state.goals.map(g => {
      const p = goalProgress(g);
      const completed = g.milestones.filter(m=>m.completed).length;

      return `<article class="goal-card">
        <div class="card-top">
          <div class="item-main">
            <div class="goal-category">${escapeHTML(g.category)}</div>
            <div class="item-title" style="margin-top:6px">${escapeHTML(g.title)}</div>
          </div>
          <div class="card-actions">
            <button class="tiny-btn" data-action="edit-goal" data-id="${g.id}">✎</button>
            <button class="tiny-btn danger" data-action="delete-goal" data-id="${g.id}">×</button>
          </div>
        </div>
        <p class="card-description">${escapeHTML(g.description || 'No description added yet.')}</p>
        <div class="progress-line">
          <div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div>
          <span class="progress-number">${p}%</span>
        </div>
        <div class="item-meta">${completed}/${g.milestones.length} milestones complete · Target ${g.targetDate?fmtDate(g.targetDate):'not set'}</div>
        <div class="card-top" style="margin-top:14px">
          <span class="pill">${p===100?'COMPLETED':p?'IN PROGRESS':'NOT STARTED'}</span>
          <button class="btn btn-ghost" data-action="open-goal" data-id="${g.id}">View details ↗</button>
        </div>
      </article>`;
    }).join('');

    $('#viewRoot').innerHTML =
      pageHeading(
        'LONG-TERM DIRECTION',
        'Goals',
        'Define what matters. Break it down. Track the work.',
        '<button class="btn btn-primary" data-action="new-goal">＋ Create goal</button>'
      ) +
      `<div class="grid stats-grid">
        ${stat('TOTAL GOALS',state.goals.length,'All your ambitions','◎')}
        ${stat('IN PROGRESS',state.goals.filter(g=>goalProgress(g)>0&&goalProgress(g)<100).length,'Goals with momentum','↗')}
        ${stat('COMPLETED',state.goals.filter(g=>goalProgress(g)===100).length,'Goals fully achieved','✓')}
        ${stat('MILESTONES',state.goals.reduce((n,g)=>n+g.milestones.length,0),'Steps along the way','◇')}
      </div>
      <div class="grid card-grid">
        ${cards || '<div class="empty-state"><strong>Your next chapter starts here.</strong>Create a goal, then add milestones to make progress measurable.</div>'}
      </div>`;
  }

  function renderGoalDetail(goal) {
    const p = goalProgress(goal);

    $('#viewRoot').innerHTML =
      pageHeading(
        'GOAL DETAILS',
        escapeHTML(goal.title),
        escapeHTML(goal.description || 'A clear outcome, built one milestone at a time.'),
        '<button class="btn btn-ghost" data-view-link="goals">← All goals</button><button class="btn btn-primary" data-action="new-milestone" data-id="'+goal.id+'">＋ Add milestone</button>'
      ) +
      `<section class="panel">
        <div class="panel-head">
          <h2>Overall progress</h2>
          <span class="subtle">${p}% complete</span>
        </div>
        <div class="progress-track" style="height:10px">
          <div class="progress-fill" style="width:${p}%"></div>
        </div>
        <div class="item-meta" style="margin-top:12px">
          ${escapeHTML(goal.category)} · Started ${goal.startDate?fmtDate(goal.startDate):'not set'} · Target ${goal.targetDate?fmtDate(goal.targetDate):'not set'}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Milestones</h2>
          <span class="subtle">${goal.milestones.filter(m=>m.completed).length} / ${goal.milestones.length} complete</span>
        </div>
        <div class="milestone-list">
          ${goal.milestones.length
            ? goal.milestones.map(m =>
                `<div class="milestone-row">
                  <button class="check-btn ${m.completed?'checked':''}" data-action="toggle-milestone" data-id="${m.id}" data-goal="${goal.id}">${m.completed?'✓':''}</button>
                  <div class="item-main">
                    <div class="item-title ${m.completed?'done':''}">${escapeHTML(m.title)}</div>
                    <div class="item-meta">${escapeHTML(m.description || 'No notes')}${m.dueDate?' · '+fmtDate(m.dueDate):''}</div>
                  </div>
                  <button class="tiny-btn" data-action="edit-milestone" data-id="${m.id}" data-goal="${goal.id}">✎</button>
                  <button class="tiny-btn danger" data-action="delete-milestone" data-id="${m.id}" data-goal="${goal.id}">×</button>
                </div>`
              ).join('')
            : '<div class="empty-state"><strong>No milestones yet.</strong>Add the first measurable step toward this goal.</div>'
          }
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Linked tasks</h2>
          <button class="text-link" data-action="new-task-for-goal" data-id="${goal.id}">＋ Create linked task</button>
        </div>
        <div class="list">
          ${state.tasks.filter(t=>t.goalId===goal.id).map(taskRow).join('') || '<div class="empty-state">No tasks linked to this goal.</div>'}
        </div>
      </section>`;
  }

  // CALENDAR
  function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year,month,1);
    const start = new Date(year,month,1-first.getDay());
    const today = todayISO();

    const cells = Array.from({length:42},(_,i) => {
      const d = new Date(start);
      d.setDate(start.getDate()+i);

      const key = dateKey(d);
      const inMonth = d.getMonth()===month;
      const tasks = state.tasks.filter(t=>t.dueDate===key);
      const goals = state.goals.filter(g=>g.targetDate===key);

      return `<div class="calendar-cell ${inMonth?'':'muted'} ${key===today?'today':''}">
        <div class="day-number">${d.getDate()}</div>
        <div class="calendar-events">
          ${tasks.slice(0,2).map(t=>`<div class="calendar-event">${escapeHTML(t.title)}</div>`).join('')}
          ${goals.slice(0,1).map(g=>`<div class="calendar-event goal">◎ ${escapeHTML(g.title)}</div>`).join('')}
        </div>
      </div>`;
    }).join('');

    $('#viewRoot').innerHTML =
      pageHeading(
        'TIME & COMMITMENTS',
        'Calendar',
        'See your deadlines and goal targets in one place.',
        '<button class="btn btn-ghost" data-action="calendar-today">Today</button>'
      ) +
      `<section class="panel">
        <div class="calendar-head">
          <button class="icon-button" data-action="calendar-prev">‹</button>
          <div class="calendar-month">${calendarDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
          <button class="icon-button" data-action="calendar-next">›</button>
        </div>
        <div class="calendar-grid">
          ${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d=>`<div class="calendar-day-label">${d}</div>`).join('')}
          ${cells}
        </div>
      </section>
      <div class="subtle">Calendar displays task due dates and goal target dates. Create or edit an item to change its date.</div>`;
  }

  // ANALYTICS
  function renderAnalytics() {
    const total = state.tasks.length;
    const done = state.tasks.filter(t=>t.completed).length;
    const rate = total?Math.round(done/total*100):0;

    const priorities = ['High','Medium','Low'].map(p => ({
      name:p,
      count:state.tasks.filter(t=>t.priority===p).length
    }));

    const cats = [...new Set(state.tasks.map(t=>t.category))].map(c => ({
      name:c,
      count:state.tasks.filter(t=>t.category===c).length
    }));

    const last7 = Array.from({length:7},(_,i) => {
      const d = new Date();
      d.setDate(d.getDate()-(6-i));
      const key = dateKey(d);

      return {
        label:d.toLocaleDateString('en-US',{weekday:'short'}),
        count:state.tasks.filter(t=>t.completedAt===key).length
      };
    });

    const bars = arr => arr.length
      ? arr.map(x =>
          `<div class="bar-row">
            <span>${escapeHTML(x.name)}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.max(3,x.count/(Math.max(...arr.map(a=>a.count),1))*100)}%"></div>
            </div>
            <span>${x.count}</span>
          </div>`
        ).join('')
      : '<div class="subtle">No data yet.</div>';

    $('#viewRoot').innerHTML =
      pageHeading(
        'REFLECTION & INSIGHT',
        'Analytics',
        'Measure what matters. Learn from the work you have done.'
      ) +
      `<div class="grid stats-grid">
        ${stat('TASKS COMPLETED',done,`${total} tasks created`,'✓')}
        ${stat('COMPLETION RATE',rate+'%','All recorded tasks','↗')}
        ${stat('GOALS COMPLETED',state.goals.filter(g=>goalProgress(g)===100).length,`${state.goals.length} goals created`,'◎')}
        ${stat('HABIT CHECK-INS',state.habits.reduce((n,h)=>n+h.history.length,0),'Total recorded check-ins','◇')}
      </div>
      <div class="grid content-grid">
        <section class="panel">
          <div class="panel-head"><h2>7-day activity</h2><span class="subtle">Completed tasks</span></div>
          <div class="analytics-bars">
            ${last7.map(x =>
              `<div class="bar-row">
                <span>${x.label}</span>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${Math.max(2,x.count/(Math.max(...last7.map(a=>a.count),1))*100)}%"></div>
                </div>
                <span>${x.count}</span>
              </div>`
            ).join('')}
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Priority distribution</h2></div>
          <div class="analytics-bars">${bars(priorities)}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Category distribution</h2></div>
          <div class="analytics-bars">${bars(cats)}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Goal overview</h2></div>
          <div class="list">
            ${state.goals.length?state.goals.map(goalRow).join(''):'<div class="subtle">Create a goal to start tracking long-term progress.</div>'}
          </div>
        </section>
      </div>`;
  }

  // BACKUP & SETTINGS
  function renderBackup() {
    $('#viewRoot').innerHTML =
      pageHeading(
        'DATA & PREFERENCES',
        'Backup & Settings',
        'Your data is stored locally in this browser. Keep a backup somewhere safe.'
      ) +
      `<section class="panel">
        <div class="panel-head"><h2>Data protection</h2><span class="pill">LOCAL STORAGE</span></div>
        <div class="settings-row">
          <div><strong>Export backup</strong><p>Download a JSON copy of tasks, habits and goals.</p></div>
          <button class="btn btn-primary" data-action="export">Export JSON</button>
        </div>
        <div class="settings-row">
          <div><strong>Restore backup</strong><p>Import a previous DAILY OS JSON backup. Current data will be replaced.</p></div>
          <button class="btn btn-ghost" data-action="import">Choose file</button>
        </div>
        <div class="settings-row">
          <div><strong>Storage overview</strong><p>${state.tasks.length} tasks · ${state.habits.length} habits · ${state.goals.length} goals</p></div>
          <span class="pill">${STORAGE_KEY}</span>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>About DAILY OS</h2></div>
        <div class="settings-row">
          <div><strong>Version</strong><p>Goals & Personal Growth edition</p></div>
          <span class="pill">4.0.2</span>
        </div>
        <div class="settings-row">
          <div><strong>Privacy</strong><p>No account or cloud sync is configured. Data stays in this browser unless you export it.</p></div>
        </div>
      </section>`;
  }

  // VIEW RENDERER
  function render() {
    if (currentView==='goal-detail') {
      const goal = findById(state.goals,selectedGoalId);

      if (goal) {
        renderGoalDetail(goal);
      } else {
        setView('goals');
      }

      return;
    }

    if (currentView==='today') renderToday();
    else if (currentView==='tasks') renderTasks();
    else if (currentView==='habits') renderHabits();
    else if (currentView==='goals') renderGoals();
    else if (currentView==='calendar') renderCalendar();
    else if (currentView==='analytics') renderAnalytics();
    else if (currentView==='backup') renderBackup();
  }

  function findById(arr,id) {
    return arr.find(x=>x.id===id);
  }

  // DELETE TASK
  function deleteTask(id) {
    const task = findById(state.tasks,id);
    if (!task) return;

    if (!confirm(`Delete task “${task.title}”?`)) return;

    state.tasks = state.tasks.filter(t=>t.id!==id);

    state.goals.forEach(g =>
      g.milestones.forEach(m => {
        m.taskIds = (m.taskIds||[]).filter(taskId=>taskId!==id);
      })
    );

    save();
    render();
    showToast('Task deleted');
  }

  // DELETE GOAL
  function deleteGoal(id) {
    const goal = findById(state.goals,id);
    if (!goal) return;

    if (!confirm(`Delete goal “${goal.title}”? Linked tasks will remain, but become unlinked.`)) return;

    state.goals = state.goals.filter(g=>g.id!==id);

    state.tasks.forEach(t => {
      if (t.goalId===id) {
        t.goalId='';
        t.milestoneId='';
      }
    });

    save();
    render();
    showToast('Goal deleted');
  }

  // EXPORT BACKUP
  function exportBackup() {
    const payload = {
      ...state,
      backupVersion:4,
      exportedAt:new Date().toISOString(),
      app:'DAILY OS'
    };

    const blob = new Blob(
      [JSON.stringify(payload,null,2)],
      {type:'application/json'}
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `daily-os-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('Backup exported');
  }

  // IMPORT BACKUP
  async function importBackup(file) {
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.tasks) ||
        !Array.isArray(parsed.habits)
      ) {
        throw new Error('This file does not look like a DAILY OS backup.');
      }

      if (!confirm('Import this backup? Your current browser data will be replaced.')) {
        return;
      }

      state = normalizeData(parsed);

      if (!save()) return;

      render();
      showToast('Backup restored successfully');

    } catch (error) {
      showToast(error.message || 'Could not import this file');
    }
  }

  // GLOBAL CLICK HANDLER
  document.addEventListener('click',event => {
    const nav = event.target.closest('[data-view]');

    if (nav) {
      setView(nav.dataset.view);
      return;
    }

    const viewLink = event.target.closest('[data-view-link]');

    if (viewLink) {
      setView(viewLink.dataset.viewLink);
      return;
    }

    const button = event.target.closest('[data-action]');
    if (!button) return;

    const {action,id,goal:goalId} = button.dataset;

    switch(action) {
      case 'new-task':
        taskForm();
        break;

      case 'new-habit':
        habitForm();
        break;

      case 'new-goal':
        goalForm();
        break;

      case 'edit-task': {
        const t = findById(state.tasks,id);
        if (t) taskForm(t);
        break;
      }

      case 'toggle-task': {
        const t = findById(state.tasks,id);

        if (t) {
          t.completed = !t.completed;
          t.completedAt = t.completed ? todayISO() : '';
          save();
          render();
        }

        break;
      }

      case 'delete-task':
        deleteTask(id);
        break;

      case 'edit-habit': {
        const h = findById(state.habits,id);
        if (h) habitForm(h);
        break;
      }

      case 'toggle-habit': {
        const h = findById(state.habits,id);

        if (h) {
          const today = todayISO();

          h.history = h.history.includes(today)
            ? h.history.filter(d=>d!==today)
            : [...h.history,today];

          save();
          render();
        }

        break;
      }

      case 'delete-habit': {
        const h = findById(state.habits,id);

        if (h && confirm(`Delete habit “${h.title}”?`)) {
          state.habits = state.habits.filter(x=>x.id!==id);
          save();
          render();
          showToast('Habit deleted');
        }

        break;
      }

      case 'edit-goal': {
        const g = findById(state.goals,id);
        if (g) goalForm(g);
        break;
      }

      case 'delete-goal':
        deleteGoal(id);
        break;

      case 'open-goal': {
        const g = findById(state.goals,id);

        if (g) {
          selectedGoalId = g.id;
          currentView = 'goal-detail';
          renderGoalDetail(g);
          $('#crumbCurrent').textContent = 'Goal details';

          $$('.nav-item[data-view]').forEach(x =>
            x.classList.toggle('active',x.dataset.view==='goals')
          );
        }

        break;
      }

      case 'new-milestone': {
        const g = findById(state.goals,id);
        if (g) milestoneForm(g);
        break;
      }

      case 'edit-milestone': {
        const g = findById(state.goals,goalId);
        const m = g?.milestones.find(x=>x.id===id);

        if (g && m) milestoneForm(g,m);
        break;
      }

      case 'delete-milestone': {
        const g = findById(state.goals,goalId);

        if (g && confirm('Delete this milestone?')) {
          g.milestones = g.milestones.filter(m=>m.id!==id);
          save();
          renderGoalDetail(g);
        }

        break;
      }

      case 'toggle-milestone': {
        const g = findById(state.goals,goalId);
        const m = g?.milestones.find(x=>x.id===id);

        if (g && m) {
          m.completed = !m.completed;
          save();
          renderGoalDetail(g);
        }

        break;
      }

      case 'new-task-for-goal': {
        const g = findById(state.goals,id);

        if (g) {
          taskForm({goalId:g.id,category:g.category});
        }

        break;
      }

      case 'calendar-prev':
        calendarDate.setMonth(calendarDate.getMonth()-1);
        renderCalendar();
        break;

      case 'calendar-next':
        calendarDate.setMonth(calendarDate.getMonth()+1);
        renderCalendar();
        break;

      case 'calendar-today':
        calendarDate = new Date();
        renderCalendar();
        break;

      case 'export':
        exportBackup();
        break;

      case 'import':
        $('#importFile').click();
        break;
    }
  });

  // MODAL EVENTS
  $('#modalClose').addEventListener('click',closeModal);
  $('#modalCancel').addEventListener('click',closeModal);

  $('#modalBackdrop').addEventListener('click',e => {
    if (e.target===$('#modalBackdrop')) closeModal();
  });

  $('#modalForm').addEventListener('submit',e => {
    e.preventDefault();

    if (modalSubmitHandler) {
      modalSubmitHandler(formData(e.currentTarget));
    }
  });

  // MOBILE SIDEBAR
  document.addEventListener('click', event => {
    const menuButton = event.target.closest('#mobileMenu');
    const sidebar = document.getElementById('sidebar');

    if (!sidebar) return;

    if (menuButton) {
      const isOpen = sidebar.classList.toggle('open');

      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute(
        'aria-label',
        isOpen ? 'Close navigation' : 'Open navigation'
      );

      return;
    }

    // Close sidebar when tapping outside it on mobile
    if (
      window.matchMedia('(max-width: 900px)').matches &&
      sidebar.classList.contains('open') &&
      !event.target.closest('#sidebar')
    ) {
      sidebar.classList.remove('open');

      const button = document.getElementById('mobileMenu');

      if (button) {
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Open navigation');
      }
    }
  });

  // BACKUP IMPORT
  $('#importFile').addEventListener('change',e => {
    importBackup(e.target.files?.[0]);
    e.target.value='';
  });

  // ESCAPE KEY
  document.addEventListener('keydown',e => {
    if (e.key==='Escape' && !$('#modalBackdrop').hidden) {
      closeModal();
    }
  });

  // HEADER DATE
  $('#headerDate').textContent = new Date().toLocaleDateString(
    'en-US',
    {weekday:'short',month:'short',day:'numeric'}
  ).toUpperCase();

  // START APP
  render();
})();
