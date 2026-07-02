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
  getGoalProgress: (goalId) => ipcRenderer.invoke('db:getGoalProgress', goalId),
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

  // Tags
  getTags: () => ipcRenderer.invoke('db:getTags'),
  createTag: (tag) => ipcRenderer.invoke('db:createTag', tag),
  deleteTag: (id) => ipcRenderer.invoke('db:deleteTag', id),
  getTaskTags: (taskId) => ipcRenderer.invoke('db:getTaskTags', taskId),
  setTaskTags: (taskId, tagIds) => ipcRenderer.invoke('db:setTaskTags', taskId, tagIds),
  getNoteTags: (noteId) => ipcRenderer.invoke('db:getNoteTags', noteId),
  setNoteTags: (noteId, tagIds) => ipcRenderer.invoke('db:setNoteTags', noteId, tagIds),
  getSnippetTags: (snippetId) => ipcRenderer.invoke('db:getSnippetTags', snippetId),
  setSnippetTags: (snippetId, tagIds) => ipcRenderer.invoke('db:setSnippetTags', snippetId, tagIds),
  getTasksByTag: (tagId) => ipcRenderer.invoke('db:getTasksByTag', tagId),
  getNotesByTag: (tagId) => ipcRenderer.invoke('db:getNotesByTag', tagId),
  getSnippetsByTag: (tagId) => ipcRenderer.invoke('db:getSnippetsByTag', tagId),

  // Flashcards
  getFlashcardDecks: () => ipcRenderer.invoke('db:getFlashcardDecks'),
  createFlashcardDeck: (deck) => ipcRenderer.invoke('db:createFlashcardDeck', deck),
  deleteFlashcardDeck: (id) => ipcRenderer.invoke('db:deleteFlashcardDeck', id),
  getFlashcards: (deckId) => ipcRenderer.invoke('db:getFlashcards', deckId),
  createFlashcard: (card) => ipcRenderer.invoke('db:createFlashcard', card),
  updateFlashcard: (id, data) => ipcRenderer.invoke('db:updateFlashcard', id, data),
  deleteFlashcard: (id) => ipcRenderer.invoke('db:deleteFlashcard', id),
  reviewFlashcard: (cardId, rating) => ipcRenderer.invoke('db:reviewFlashcard', cardId, rating),
  getDueFlashcards: (deckId) => ipcRenderer.invoke('db:getDueFlashcards', deckId),
  getFlashcardStats: (deckId) => ipcRenderer.invoke('db:getFlashcardStats', deckId),
  getRetentionStats: (deckId) => ipcRenderer.invoke('db:getRetentionStats', deckId),

  // Subtasks
  getSubtasks: (taskId) => ipcRenderer.invoke('db:getSubtasks', taskId),
  createSubtask: (subtask) => ipcRenderer.invoke('db:createSubtask', subtask),
  updateSubtask: (id, data) => ipcRenderer.invoke('db:updateSubtask', id, data),
  deleteSubtask: (id) => ipcRenderer.invoke('db:deleteSubtask', id),
  toggleSubtask: (id) => ipcRenderer.invoke('db:toggleSubtask', id),

  // Recurrence
  getTaskRecurrence: (taskId) => ipcRenderer.invoke('db:getTaskRecurrence', taskId),
  setTaskRecurrence: (taskId, data) => ipcRenderer.invoke('db:setTaskRecurrence', taskId, data),
  deleteTaskRecurrence: (taskId) => ipcRenderer.invoke('db:deleteTaskRecurrence', taskId),
  checkRecurringTasks: () => ipcRenderer.invoke('db:checkRecurringTasks'),

  // Activity log
  getActivityLog: (limit) => ipcRenderer.invoke('db:getActivityLog', limit),
  logActivity: (entry) => ipcRenderer.invoke('db:logActivity', entry),

  // Notebooks
  getNotebooks: () => ipcRenderer.invoke('db:getNotebooks'),
  createNotebook: (notebook) => ipcRenderer.invoke('db:createNotebook', notebook),
  updateNotebook: (id, data) => ipcRenderer.invoke('db:updateNotebook', id, data),
  deleteNotebook: (id) => ipcRenderer.invoke('db:deleteNotebook', id),

  // Templates
  getTemplates: (entityType) => ipcRenderer.invoke('db:getTemplates', entityType),
  createTemplate: (template) => ipcRenderer.invoke('db:createTemplate', template),
  deleteTemplate: (id) => ipcRenderer.invoke('db:deleteTemplate', id),

  // Backup
  saveBackupDialog: (data) => ipcRenderer.invoke('dialog:saveBackup', data),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (cb) => {
    const handler = (_event, info) => cb(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateDownloadProgress: (cb) => {
    const handler = (_event, progress) => cb(progress)
    ipcRenderer.on('update:downloadProgress', handler)
    return () => ipcRenderer.removeListener('update:downloadProgress', handler)
  },
  onUpdateDownloaded: (cb) => {
    const handler = () => cb()
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateError: (cb) => {
    const handler = (_event, msg) => cb(msg)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },

  // Batch handlers
  getAllTaskTags: (taskIds) => ipcRenderer.invoke('db:getAllTaskTags', taskIds),
  getAllNoteTags: (noteIds) => ipcRenderer.invoke('db:getAllNoteTags', noteIds),
  getAllSnippetTags: (snippetIds) => ipcRenderer.invoke('db:getAllSnippetTags', snippetIds),
  getAllSubtasks: (taskIds) => ipcRenderer.invoke('db:getAllSubtasks', taskIds),
  getAllTaskRecurrences: (taskIds) => ipcRenderer.invoke('db:getAllTaskRecurrences', taskIds),
  getAllHabitLogs: (habitIds, date) => ipcRenderer.invoke('db:getAllHabitLogs', habitIds, date),
  // Export/Import
  exportData: () => ipcRenderer.invoke('db:exportData'),
  importData: (data) => ipcRenderer.invoke('db:importData', data),
})
