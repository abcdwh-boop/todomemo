const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
  openCalendar: () => ipcRenderer.send('open-calendar'),
  openPolicy: () => ipcRenderer.send('open-policy'),
  selectDate: (date) => ipcRenderer.send('date-selected', date),
  notifyTasksUpdated: () => ipcRenderer.send('tasks-updated'),
  
  // Events
  onSyncDateSelected: (callback) => ipcRenderer.on('sync-date-selected', (event, date) => callback(date)),
  onSyncTasksUpdated: (callback) => ipcRenderer.on('sync-tasks-updated', () => callback()),
  onCalendarClosed: (callback) => ipcRenderer.on('calendar-closed', () => callback()),
  onCalendarOpened: (callback) => ipcRenderer.on('calendar-opened', () => callback()),
  
  // Cleanup
  removeListeners: () => {
    ipcRenderer.removeAllListeners('sync-date-selected');
    ipcRenderer.removeAllListeners('sync-tasks-updated');
    ipcRenderer.removeAllListeners('calendar-closed');
    ipcRenderer.removeAllListeners('calendar-opened');
  }
});

contextBridge.exposeInMainWorld('fileSystem', {
  existsSync: (filePath) => fs.existsSync(filePath),
  mkdirSync: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),
  readFileSync: (filePath) => fs.readFileSync(filePath, 'utf8'),
  writeFileSync: (filePath, content) => fs.writeFileSync(filePath, content, 'utf8'),
  renameSync: (oldPath, newPath) => fs.renameSync(oldPath, newPath),
  unlinkSync: (filePath) => fs.unlinkSync(filePath),
  joinPath: (...args) => path.join(...args)
});
