// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Tab 1: Settings
const radioThemeDark = document.getElementById('theme-dark');
const radioThemeLight = document.getElementById('theme-light');
const checkboxAutoSave = document.getElementById('autosave-checkbox');
const storagePathDisplay = document.getElementById('storage-path-display');

// Tab 2: Compliance
const radioUsageTeacher = document.getElementById('use-teacher');
const radioUsageStudent = document.getElementById('use-student');
const radioUsageHome = document.getElementById('use-home');
const inputManagerName = document.getElementById('manager-name');
const inputManagerContact = document.getElementById('manager-contact');

const warningBox = document.getElementById('warning-box');
const saveBtn = document.getElementById('save-settings-btn');

window.addEventListener('DOMContentLoaded', async () => {
  // 1. 데이터 레포지토리 초기화 완료 대기
  await window.TaskRepository.init();

  // 2. 탭 이벤트 리스너 연결
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');
    });
  });

  // 3. 기존 저장된 설정 값 로드 및 테마 반영
  loadSettings();
  applyTheme();

  // 4. 저장 폴더 경로 동적 조회 및 표출 (메인에서 이관)
  try {
    const docsPath = await window.electronAPI.getDocumentsPath();
    if (storagePathDisplay) {
      storagePathDisplay.value = window.fileSystem.joinPath(docsPath, 'TodoMemoApp');
    }
  } catch (err) {
    console.error('Failed to get documents path:', err);
  }

  // 5. 사용 목적 변경 감지
  const usageRadios = document.querySelectorAll('input[name="usage-type"]');
  usageRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      toggleWarningBox(radio.value);
    });
  });
});

// 테마 동적 적용
function applyTheme() {
  const settings = window.TaskRepository.getSettings();
  document.body.classList.toggle('light-theme', settings.theme === 'light');
}

// 기존 설정 값 채우기
function loadSettings() {
  const settings = window.TaskRepository.getSettings();
  
  if (settings.theme === 'light') {
    radioThemeLight.checked = true;
  } else {
    radioThemeDark.checked = true;
  }
  checkboxAutoSave.checked = settings.autoSave !== false;

  if (settings.usageType === 'class-student') {
    radioUsageStudent.checked = true;
  } else if (settings.usageType === 'home-homework') {
    radioUsageHome.checked = true;
  } else {
    radioUsageTeacher.checked = true;
  }

  inputManagerName.value = settings.managerName || '';
  inputManagerContact.value = settings.managerContact || '';

  toggleWarningBox(settings.usageType);
}

function toggleWarningBox(usageType) {
  if (usageType === 'class-student' || usageType === 'home-homework') {
    warningBox.style.display = 'block';
  } else {
    warningBox.style.display = 'none';
  }
}

// 설정 및 변경 사항 저장
saveBtn.addEventListener('click', (e) => {
  e.preventDefault();

  const selectedThemeRadio = document.querySelector('input[name="theme-type"]:checked');
  const theme = selectedThemeRadio ? selectedThemeRadio.value : 'dark';
  
  const autoSave = checkboxAutoSave.checked;

  const selectedUsageRadio = document.querySelector('input[name="usage-type"]:checked');
  const usageType = selectedUsageRadio ? selectedUsageRadio.value : 'teacher-only';

  const managerName = inputManagerName.value.trim();
  const managerContact = inputManagerContact.value.trim();

  window.TaskRepository.updateSettings({
    theme,
    autoSave,
    usageType,
    managerName,
    managerContact
  });

  applyTheme();

  alert('설정 및 테마 변경 사항이 안전하게 저장되었습니다.');
  window.close();
});
