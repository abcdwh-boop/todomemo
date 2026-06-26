// DOM Elements
const monthDisplay = document.getElementById('month-display');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const todayBtn = document.getElementById('today-btn');
const daysGrid = document.getElementById('days-grid');

// Calendar States
let selectedDate = ''; // YYYY-MM-DD
let currentYear = 0;
let currentMonth = 0; // 0 ~ 11

window.addEventListener('DOMContentLoaded', async () => {
  // 1. 데이터 레포지토리 초기화
  await window.TaskRepository.init();

  const todayStr = window.CalendarService.formatDate(new Date());
  selectedDate = todayStr;

  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  // 2. 초기 렌더링 및 테마 적용
  applyTheme();
  renderCalendar();

  // 3. IPC 이벤트 리스너 등록
  window.electronAPI.onSyncDateSelected((date) => {
    selectedDate = date;
    const parsed = window.CalendarService.parseDate(date);
    
    if (parsed.getFullYear() !== currentYear || parsed.getMonth() !== currentMonth) {
      currentYear = parsed.getFullYear();
      currentMonth = parsed.getMonth();
    }
    
    renderCalendar();
  });

  window.electronAPI.onSyncTasksUpdated(() => {
    window.TaskRepository.loadTasks();
    applyTheme();
    renderCalendar();
  });
});

// 테마 동적 적용
function applyTheme() {
  const settings = window.TaskRepository.getSettings();
  document.body.classList.toggle('light-theme', settings.theme === 'light');
}

// 달력 그리기 메인 함수
function renderCalendar() {
  monthDisplay.textContent = `${currentYear}년 ${currentMonth + 1}월`;
  daysGrid.innerHTML = '';

  const days = window.CalendarService.getMonthGrid(currentYear, currentMonth);
  const todayStr = window.CalendarService.formatDate(new Date());

  days.forEach((d) => {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (!d.isCurrentMonth) {
      cell.classList.add('other-month');
    }

    if (d.dateString === todayStr) {
      cell.classList.add('today');
    }

    if (d.dateString === selectedDate) {
      cell.classList.add('selected');
    }

    // 날짜 번호 표시
    const numberDiv = document.createElement('div');
    numberDiv.className = 'day-number';
    numberDiv.textContent = d.day;
    cell.appendChild(numberDiv);

    // 해당 날짜의 투두 목록 표시 (생성순 최대 3개)
    const tasks = window.TaskRepository.getTasksByDate(d.dateString);
    if (tasks.length > 0) {
      const todoListUl = document.createElement('ul');
      todoListUl.className = 'cell-todo-list';

      const visibleTasks = tasks.slice(0, 3);
      visibleTasks.forEach((task) => {
        const itemLi = document.createElement('li');
        itemLi.className = `cell-todo-item ${task.done ? 'done' : ''}`;
        
        const truncatedText = window.CalendarService.truncateText(task.text, 10);
        itemLi.textContent = `· ${truncatedText}`;
        itemLi.title = task.text + (task.memo ? `\n(메모: ${task.memo})` : '');

        todoListUl.appendChild(itemLi);
      });

      cell.appendChild(todoListUl);
    }

    cell.addEventListener('click', () => {
      selectedDate = d.dateString;
      window.electronAPI.selectDate(d.dateString);
      
      document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
    });

    daysGrid.appendChild(cell);
  });
}

// 달력 네비게이션
prevMonthBtn.addEventListener('click', () => {
  if (currentMonth === 0) {
    currentMonth = 11;
    currentYear--;
  } else {
    currentMonth--;
  }
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  if (currentMonth === 11) {
    currentMonth = 0;
    currentYear++;
  } else {
    currentMonth++;
  }
  renderCalendar();
});

todayBtn.addEventListener('click', () => {
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();
  const todayStr = window.CalendarService.formatDate(today);
  selectedDate = todayStr;
  window.electronAPI.selectDate(todayStr);
  renderCalendar();
});
