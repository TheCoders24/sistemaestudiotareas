const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSetting: (key) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),

  // Tasks
  getTasks: () => ipcRenderer.invoke('db:getTasks'),
  createTask: (task) => ipcRenderer.invoke('db:createTask', task),
  updateTask: (id, data) => ipcRenderer.invoke('db:updateTask', id, data),
  deleteTask: (id) => ipcRenderer.invoke('db:deleteTask', id),
  toggleTask: (id) => ipcRenderer.invoke('db:toggleTask', id),

  // Kanban
  getKanbanCards: () => ipcRenderer.invoke('db:getKanbanCards'),
  createKanbanCard: (card) => ipcRenderer.invoke('db:createKanbanCard', card),
  updateKanbanCard: (id, data) => ipcRenderer.invoke('db:updateKanbanCard', id, data),
  deleteKanbanCard: (id) => ipcRenderer.invoke('db:deleteKanbanCard', id),
  moveKanbanCard: (id, column, position) => ipcRenderer.invoke('db:moveKanbanCard', id, column, position),

  // Pomodoro
  getPomodoroSessions: (date) => ipcRenderer.invoke('db:getPomodoroSessions', date),
  createPomodoroSession: (session) => ipcRenderer.invoke('db:createPomodoroSession', session),

  // Study Topics
  getStudyTopics: () => ipcRenderer.invoke('db:getStudyTopics'),
  createStudyTopic: (topic) => ipcRenderer.invoke('db:createStudyTopic', topic),
  updateStudyTopic: (id, data) => ipcRenderer.invoke('db:updateStudyTopic', id, data),
  deleteStudyTopic: (id) => ipcRenderer.invoke('db:deleteStudyTopic', id),
  toggleStudyProgress: (topicId, date) => ipcRenderer.invoke('db:toggleStudyProgress', topicId, date),

  // Notes
  getNotes: () => ipcRenderer.invoke('db:getNotes'),
  createNote: (note) => ipcRenderer.invoke('db:createNote', note),
  updateNote: (id, data) => ipcRenderer.invoke('db:updateNote', id, data),
  deleteNote: (id) => ipcRenderer.invoke('db:deleteNote', id),

  // Goals
  getGoals: () => ipcRenderer.invoke('db:getGoals'),
  createGoal: (goal) => ipcRenderer.invoke('db:createGoal', goal),
  updateGoal: (id, data) => ipcRenderer.invoke('db:updateGoal', id, data),
  deleteGoal: (id) => ipcRenderer.invoke('db:deleteGoal', id),
  addGoalProgress: (goalId, date, value) => ipcRenderer.invoke('db:addGoalProgress', goalId, date, value),

  // Streaks
  getStreak: (name) => ipcRenderer.invoke('db:getStreak', name),
  updateStreak: (name) => ipcRenderer.invoke('db:updateStreak', name),

  // Statistics
  getStats: (period) => ipcRenderer.invoke('db:getStats', period),

  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('notification:show', title, body),

  // Projects
  getProjects: () => ipcRenderer.invoke('db:getProjects'),
  createProject: (project) => ipcRenderer.invoke('db:createProject', project),
  updateProject: (id, data) => ipcRenderer.invoke('db:updateProject', id, data),
  deleteProject: (id) => ipcRenderer.invoke('db:deleteProject', id),

  // Daily Logs
  getDailyLogs: () => ipcRenderer.invoke('db:getDailyLogs'),
  getDailyLog: (date) => ipcRenderer.invoke('db:getDailyLog', date),
  createDailyLog: (log) => ipcRenderer.invoke('db:createDailyLog', log),
  updateDailyLog: (id, data) => ipcRenderer.invoke('db:updateDailyLog', id, data),

  // Snippets
  getSnippets: () => ipcRenderer.invoke('db:getSnippets'),
  createSnippet: (snippet) => ipcRenderer.invoke('db:createSnippet', snippet),
  updateSnippet: (id, data) => ipcRenderer.invoke('db:updateSnippet', id, data),
  deleteSnippet: (id) => ipcRenderer.invoke('db:deleteSnippet', id),

  // Habits
  getHabits: () => ipcRenderer.invoke('db:getHabits'),
  createHabit: (habit) => ipcRenderer.invoke('db:createHabit', habit),
  deleteHabit: (id) => ipcRenderer.invoke('db:deleteHabit', id),
  getHabitLogs: (habitId) => ipcRenderer.invoke('db:getHabitLogs', habitId),
  toggleHabitLog: (habitId, date) => ipcRenderer.invoke('db:toggleHabitLog', habitId, date),

  // Export/Import
  exportData: () => ipcRenderer.invoke('db:exportData'),
  importData: (data) => ipcRenderer.invoke('db:importData', data),
})
