class TaskRepository {
  constructor() {
    this.data = {
      version: 1,
      settings: {
        autoSave: true,
        usageType: 'teacher-only',
        managerName: '',
        managerContact: '',
        theme: 'dark' // 테마 설정 추가 (기본값: dark)
      },
      tasksByDate: {}
    };
    this.filePath = null;
    this.bakFilePath = null;
    this.tmpFilePath = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      const docsPath = await window.electronAPI.getDocumentsPath();
      const appDir = window.fileSystem.joinPath(docsPath, 'TodoMemoApp');
      
      if (!window.fileSystem.existsSync(appDir)) {
        window.fileSystem.mkdirSync(appDir);
      }

      this.filePath = window.fileSystem.joinPath(appDir, 'tasks.json');
      this.bakFilePath = window.fileSystem.joinPath(appDir, 'tasks.json.bak');
      this.tmpFilePath = window.fileSystem.joinPath(appDir, 'tasks.json.tmp');

      this.loadTasks();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize TaskRepository:', error);
      alert('데이터 저장소를 초기화하는 데 실패했습니다.');
    }
  }

  loadTasks() {
    if (!this.filePath) return;

    if (!window.fileSystem.existsSync(this.filePath)) {
      this.saveTasksInternal();
      return;
    }

    try {
      const content = window.fileSystem.readFileSync(this.filePath);
      this.data = JSON.parse(content);
      
      if (!this.data.tasksByDate) this.data.tasksByDate = {};
      if (!this.data.settings) {
        this.data.settings = {
          autoSave: true,
          usageType: 'teacher-only',
          managerName: '',
          managerContact: '',
          theme: 'dark'
        };
      } else if (!this.data.settings.theme) {
        this.data.settings.theme = 'dark'; // 하위 호환성을 위해 테마가 없으면 주입
      }
    } catch (error) {
      console.error('Failed to parse tasks.json, trying recovery from backup:', error);
      this.recoverFromBackup();
    }
  }

  recoverFromBackup() {
    if (window.fileSystem.existsSync(this.bakFilePath)) {
      try {
        const content = window.fileSystem.readFileSync(this.bakFilePath);
        this.data = JSON.parse(content);
        this.saveTasksInternal();
        alert('메모 데이터가 손상되어 백업 파일(tasks.json.bak)로부터 복구했습니다.');
      } catch (bakError) {
        console.error('Backup file is also broken:', bakError);
        alert('백업 데이터마저 손상되어 데이터 초기화 상태로 기동합니다.');
        this.resetData();
      }
    } else {
      alert('메모 데이터 파일이 손상되었으며 백업 파일이 존재하지 않아 새로 초기화합니다.');
      this.resetData();
    }
  }

  resetData() {
    this.data = {
      version: 1,
      settings: {
        autoSave: true,
        usageType: 'teacher-only',
        managerName: '',
        managerContact: '',
        theme: 'dark'
      },
      tasksByDate: {}
    };
    this.saveTasksInternal();
  }

  saveTasksInternal() {
    if (!this.filePath) return;

    try {
      const jsonString = JSON.stringify(this.data, null, 2);
      window.fileSystem.writeFileSync(this.tmpFilePath, jsonString);
      
      if (window.fileSystem.existsSync(this.filePath)) {
        try {
          const currentContent = window.fileSystem.readFileSync(this.filePath);
          window.fileSystem.writeFileSync(this.bakFilePath, currentContent);
        } catch (e) {
          console.warn('Could not create backup before overwrite:', e);
        }
      }
      
      window.fileSystem.renameSync(this.tmpFilePath, this.filePath);
      window.electronAPI.notifyTasksUpdated();
    } catch (error) {
      console.error('Failed to save tasks atomically:', error);
      try {
        if (window.fileSystem.existsSync(this.tmpFilePath)) {
          window.fileSystem.unlinkSync(this.tmpFilePath);
        }
      } catch (unlinkErr) {
        // 무시
      }
    }
  }

  saveTasks() {
    if (this.data.settings.autoSave) {
      this.saveTasksInternal();
    }
  }

  getTasksByDate(date) {
    const list = this.data.tasksByDate[date] || [];
    return [...list].sort((a, b) => a.createdAt - b.createdAt);
  }

  generateId() {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
  }

  addTask(date, text) {
    if (!this.data.tasksByDate[date]) {
      this.data.tasksByDate[date] = [];
    }

    const newTask = {
      id: this.generateId(),
      text: text.trim(),
      done: false,
      memoHidden: false,
      createdAt: Date.now()
    };

    this.data.tasksByDate[date].push(newTask);
    this.saveTasks();
    return newTask;
  }

  updateTask(taskId, patch) {
    let found = false;
    for (const date in this.data.tasksByDate) {
      const index = this.data.tasksByDate[date].findIndex(t => t.id === taskId);
      if (index !== -1) {
        this.data.tasksByDate[date][index] = {
          ...this.data.tasksByDate[date][index],
          ...patch
        };
        found = true;
        break;
      }
    }
    if (found) {
      this.saveTasks();
    }
    return found;
  }

  deleteTask(taskId) {
    let found = false;
    for (const date in this.data.tasksByDate) {
      const index = this.data.tasksByDate[date].findIndex(t => t.id === taskId);
      if (index !== -1) {
        this.data.tasksByDate[date].splice(index, 1);
        if (this.data.tasksByDate[date].length === 0) {
          delete this.data.tasksByDate[date];
        }
        found = true;
        break;
      }
    }
    if (found) {
      this.saveTasks();
    }
    return found;
  }

  toggleDone(taskId) {
    let found = false;
    for (const date in this.data.tasksByDate) {
      const index = this.data.tasksByDate[date].findIndex(t => t.id === taskId);
      if (index !== -1) {
        this.data.tasksByDate[date][index].done = !this.data.tasksByDate[date][index].done;
        found = true;
        break;
      }
    }
    if (found) {
      this.saveTasks();
    }
    return found;
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(patch) {
    this.data.settings = {
      ...this.data.settings,
      ...patch
    };
    this.saveTasksInternal();
  }
}

window.TaskRepository = new TaskRepository();
