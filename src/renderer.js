// DOM Elements
const dateDisplay = document.getElementById('date-display');
const prevDateBtn = document.getElementById('prev-date-btn');
const nextDateBtn = document.getElementById('next-date-btn');
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const toggleSmallCalBtn = document.getElementById('toggle-small-cal-btn');
const openLargeCalBtn = document.getElementById('open-large-cal-btn');
const openMenuBtn = document.getElementById('open-menu-btn');
const smallCalendarPanel = document.getElementById('small-calendar-panel');

// Small Calendar DOM Elements
const calPrevMonth = document.getElementById('cal-prev-month');
const calNextMonth = document.getElementById('cal-next-month');
const calMonthTitle = document.getElementById('cal-month-title');
const calGrid = document.getElementById('cal-grid');

// Draft Guard Modal DOM Elements
const draftModal = document.getElementById('draft-modal');
const draftSaveBtn = document.getElementById('draft-save-btn');
const draftDiscardBtn = document.getElementById('draft-discard-btn');
const draftCancelBtn = document.getElementById('draft-cancel-btn');

// Application States
let selectedDate = ''; // YYYY-MM-DD
let smallCalYear = 0;
let smallCalMonth = 0; // 0 ~ 11
let pendingTargetDate = ''; // 날짜 전환 보호 대기 날짜
let isSmallCalOpen = false;

// 1. 초기 기동
window.addEventListener('DOMContentLoaded', async () => {
  // 데이터 레포지토리 초기화 완료 대기
  await window.TaskRepository.init();

  // 오늘 날짜로 선택 설정
  const todayStr = window.CalendarService.formatDate(new Date());
  selectedDate = todayStr;

  const today = new Date();
  smallCalYear = today.getFullYear();
  smallCalMonth = today.getMonth();

  // UI 초기화 및 테마 적용
  applyTheme();
  updateDateDisplay();
  renderTasks();
  initSmallCalendarGrid();

  // IPC 이벤트 리스너 등록
  window.electronAPI.onSyncDateSelected((date) => {
    if (selectedDate !== date) {
      requestDateChange(date);
    }
  });

  window.electronAPI.onSyncTasksUpdated(() => {
    window.TaskRepository.loadTasks();
    applyTheme();
    renderTasks();
    if (isSmallCalOpen) {
      renderSmallCalendarDays();
    }
  });
});

// 테마 동적 적용
function applyTheme() {
  const settings = window.TaskRepository.getSettings();
  document.body.classList.toggle('light-theme', settings.theme === 'light');
}

// 2. 날짜 표시 업데이트
function updateDateDisplay() {
  dateDisplay.textContent = selectedDate;
}

// 3. 할 일 목록 렌더링
function renderTasks() {
  const tasks = window.TaskRepository.getTasksByDate(selectedDate);
  todoList.innerHTML = '';

  if (tasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = `todo-item ${task.done ? 'done' : ''}`;
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      window.TaskRepository.toggleDone(task.id);
    });

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'todo-content-wrapper';

    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = task.text;

    textSpan.addEventListener('dblclick', () => {
      enableInlineEdit(li, task);
    });

    contentWrapper.appendChild(textSpan);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit';
    editBtn.innerHTML = '✏️';
    editBtn.title = '편집';
    editBtn.addEventListener('click', () => {
      enableInlineEdit(li, task);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = '삭제';
    deleteBtn.addEventListener('click', () => {
      window.TaskRepository.deleteTask(task.id);
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(contentWrapper);
    li.appendChild(actionsDiv);
    todoList.appendChild(li);
  });
}

// 4. 인라인 편집 모드 활성화
function enableInlineEdit(li, task) {
  if (li.classList.contains('editing')) return;
  li.classList.add('editing');

  const contentWrapper = li.querySelector('.todo-content-wrapper');
  const oldTextSpan = contentWrapper.querySelector('.todo-text');
  const todoActions = li.querySelector('.todo-actions');

  const originalText = task.text;

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'todo-edit-input';
  editInput.value = originalText;
  
  todoActions.style.display = 'none';

  const editActionsDiv = document.createElement('div');
  editActionsDiv.className = 'edit-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'edit-btn';
  saveBtn.textContent = '저장';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = '취소';

  editActionsDiv.appendChild(saveBtn);
  editActionsDiv.appendChild(cancelBtn);

  const saveChange = () => {
    const newText = editInput.value.trim();
    if (newText && newText !== originalText) {
      window.TaskRepository.updateTask(task.id, { text: newText });
    } else {
      restoreItem();
    }
  };

  const restoreItem = () => {
    li.classList.remove('editing');
    contentWrapper.innerHTML = '';
    contentWrapper.appendChild(oldTextSpan);
    todoActions.style.display = 'flex';
    editActionsDiv.remove();
  };

  saveBtn.addEventListener('click', saveChange);
  cancelBtn.addEventListener('click', restoreItem);

  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveChange();
    } else if (e.key === 'Escape') {
      restoreItem();
    }
  });

  contentWrapper.innerHTML = '';
  contentWrapper.appendChild(editInput);
  li.appendChild(editActionsDiv);
  editInput.focus();
}

// 5. 할 일 추가
function addNewTodo() {
  const text = todoInput.value.trim();
  if (!text) return;

  window.TaskRepository.addTask(selectedDate, text);
  todoInput.value = '';
  renderTasks();
}

addBtn.addEventListener('click', addNewTodo);
todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addNewTodo();
  }
});

// 6. 날짜 전환 보호 모듈 (DraftGuard) 및 날짜 변경
function requestDateChange(targetDateStr) {
  const draftText = todoInput.value.trim();
  
  if (draftText !== '') {
    pendingTargetDate = targetDateStr;
    draftModal.style.display = 'flex';
  } else {
    executeDateChange(targetDateStr);
  }
}

function executeDateChange(targetDateStr) {
  selectedDate = targetDateStr;
  updateDateDisplay();
  renderTasks();
  
  if (isSmallCalOpen) {
    renderSmallCalendarDays();
  }

  window.electronAPI.selectDate(selectedDate);
}

// 드래프트 가드 버튼 바인딩
draftSaveBtn.addEventListener('click', () => {
  const draftText = todoInput.value.trim();
  if (draftText) {
    window.TaskRepository.addTask(selectedDate, draftText);
  }
  todoInput.value = '';
  draftModal.style.display = 'none';
  executeDateChange(pendingTargetDate);
});

draftDiscardBtn.addEventListener('click', () => {
  todoInput.value = '';
  draftModal.style.display = 'none';
  executeDateChange(pendingTargetDate);
});

draftCancelBtn.addEventListener('click', () => {
  draftModal.style.display = 'none';
  pendingTargetDate = '';
});

// 7. 상단 날짜 이동 핸들러
prevDateBtn.addEventListener('click', () => {
  const currentDate = window.CalendarService.parseDate(selectedDate);
  currentDate.setDate(currentDate.getDate() - 1);
  requestDateChange(window.CalendarService.formatDate(currentDate));
});

nextDateBtn.addEventListener('click', () => {
  const currentDate = window.CalendarService.parseDate(selectedDate);
  currentDate.setDate(currentDate.getDate() + 1);
  requestDateChange(window.CalendarService.formatDate(currentDate));
});

dateDisplay.addEventListener('click', () => {
  const todayStr = window.CalendarService.formatDate(new Date());
  requestDateChange(todayStr);
  
  const today = new Date();
  smallCalYear = today.getFullYear();
  smallCalMonth = today.getMonth();
  if (isSmallCalOpen) {
    initSmallCalendarGrid();
  }
});

// 8. 작은 달력 모듈 구현
toggleSmallCalBtn.addEventListener('click', () => {
  isSmallCalOpen = !isSmallCalOpen;
  if (isSmallCalOpen) {
    smallCalendarPanel.style.display = 'flex';
    toggleSmallCalBtn.classList.add('active');
    const curDate = window.CalendarService.parseDate(selectedDate);
    smallCalYear = curDate.getFullYear();
    smallCalMonth = curDate.getMonth();
    initSmallCalendarGrid();
  } else {
    smallCalendarPanel.style.display = 'none';
    toggleSmallCalBtn.classList.remove('active');
  }
});

function initSmallCalendarGrid() {
  calMonthTitle.textContent = `${smallCalYear}년 ${smallCalMonth + 1}월`;
  renderSmallCalendarDays();
}

function renderSmallCalendarDays() {
  calGrid.innerHTML = '';
  
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  weekdays.forEach((day) => {
    const div = document.createElement('div');
    div.className = 'cal-weekday';
    div.textContent = day;
    calGrid.appendChild(div);
  });

  const days = window.CalendarService.getMonthGrid(smallCalYear, smallCalMonth);
  const todayStr = window.CalendarService.formatDate(new Date());

  days.forEach((d) => {
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d.day;
    
    if (d.isCurrentMonth) {
      cell.classList.add('current-month');
    }

    if (d.dateString === todayStr) {
      cell.classList.add('today');
    }

    if (d.dateString === selectedDate) {
      cell.classList.add('selected');
    }

    cell.addEventListener('click', () => {
      requestDateChange(d.dateString);
    });

    calGrid.appendChild(cell);
  });
}

calPrevMonth.addEventListener('click', () => {
  if (smallCalMonth === 0) {
    smallCalMonth = 11;
    smallCalYear--;
  } else {
    smallCalMonth--;
  }
  initSmallCalendarGrid();
});

calNextMonth.addEventListener('click', () => {
  if (smallCalMonth === 11) {
    smallCalMonth = 0;
    smallCalYear++;
  } else {
    smallCalMonth++;
  }
  initSmallCalendarGrid();
});

// 9. 외부 연결 버튼 이벤트들
openLargeCalBtn.addEventListener('click', () => {
  window.electronAPI.openCalendar();
});

openMenuBtn.addEventListener('click', () => {
  window.electronAPI.openPolicy();
});
