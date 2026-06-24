const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let calendarWindow = null;
let policyWindow = null;

function setupConsoleRedirect(win, name) {
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const file = path.basename(sourceId || '');
    console.log(`[Renderer Console - ${name}] ${message} (${file}:${line})`);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 380,
    minHeight: 600,
    alwaysOnTop: true,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // fs 및 path 사용을 위해 샌드박스 비활성화
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  setupConsoleRedirect(mainWindow, 'Main');

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (calendarWindow) calendarWindow.close();
    if (policyWindow) policyWindow.close();
    app.quit();
  });
}

function createCalendarWindow() {
  if (calendarWindow) {
    calendarWindow.focus();
    return;
  }

  calendarWindow = new BrowserWindow({
    width: 950,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  calendarWindow.loadFile(path.join(__dirname, 'src', 'calendar.html'));
  setupConsoleRedirect(calendarWindow, 'Calendar');

  calendarWindow.on('closed', () => {
    calendarWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('calendar-closed');
    }
  });
}

function createPolicyWindow() {
  if (policyWindow) {
    policyWindow.focus();
    return;
  }

  policyWindow = new BrowserWindow({
    width: 700,
    height: 800,
    minWidth: 500,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  policyWindow.loadFile(path.join(__dirname, 'src', 'policy_viewer.html'));
  setupConsoleRedirect(policyWindow, 'Policy');

  policyWindow.on('closed', () => {
    policyWindow = null;
  });
}

// IPC 핸들러 등록
ipcMain.handle('get-documents-path', () => {
  return app.getPath('documents');
});

ipcMain.on('open-calendar', () => {
  createCalendarWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('calendar-opened');
  }
});

ipcMain.on('open-policy', () => {
  createPolicyWindow();
});

// 날짜 선택 이벤트 브로드캐스트 (달력 -> 메인 창)
ipcMain.on('date-selected', (event, date) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync-date-selected', date);
  }
});

// 데이터 업데이트 이벤트 브로드캐스트 (메인 창 -> 달력)
ipcMain.on('tasks-updated', (event) => {
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.webContents.send('sync-tasks-updated');
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync-tasks-updated');
  }
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
