const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSetting: (key) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),

  // Tasks
  getTasks: () => ipcRenderer.invoke('db:getTasks'),
  getTasksWithSubtasks: () => ipcRenderer.invoke('db:getTasksWithSubtasks'),
  createTask: (task) => ipcRenderer.invoke('db:createTask', task),
  updateTask: (id, data) => ipcRenderer.invoke('db:updateTask', id, data),
  deleteTask: (id) => ipcRenderer.invoke('db:deleteTask', id),
  toggleTask: (id) => ipcRenderer.invoke('db:toggleTask', id),
  reorderTasks: (orderedIds) => ipcRenderer.invoke('db:reorderTasks', orderedIds),
  addTagToTask: (taskId, tag) => ipcRenderer.invoke('db:addTagToTask', taskId, tag),
  removeTagFromTask: (taskId, tag) => ipcRenderer.invoke('db:removeTagFromTask', taskId, tag),
  getTasksByTag: (tag) => ipcRenderer.invoke('db:getTasksByTag', tag),

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
  setStudyLevel: (topicId, level) => ipcRenderer.invoke('db:setStudyLevel', topicId, level),
  getStudyStats: () => ipcRenderer.invoke('db:getStudyStats'),
moveStudyTopic: (id, direction) => ipcRenderer.invoke('db:moveStudyTopic', id, direction),

  // Study Files
  pickAndUploadFile: (topicId) => ipcRenderer.invoke('study:pickAndUploadFile', topicId),
  getTopicFiles: (topicId) => ipcRenderer.invoke('study:getTopicFiles', topicId),
  deleteFile: (fileId) => ipcRenderer.invoke('study:deleteFile', fileId),
  openFile: (fileId) => ipcRenderer.invoke('study:openFile', fileId),

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
  updateHabit: (id, data) => ipcRenderer.invoke('db:updateHabit', id, data),
  deleteHabit: (id) => ipcRenderer.invoke('db:deleteHabit', id),
  getHabitLogs: (habitId) => ipcRenderer.invoke('db:getHabitLogs', habitId),
  toggleHabitLog: (habitId, date) => ipcRenderer.invoke('db:toggleHabitLog', habitId, date),

  // Search
  search: (query) => ipcRenderer.invoke('db:search', query),

  // XP / Gamification
  getXp: () => ipcRenderer.invoke('xp:get'),
  addXp: (amount, reason) => ipcRenderer.invoke('xp:add', amount, reason),
  getXpHistory: (days) => ipcRenderer.invoke('xp:getHistory', days),
  getAchievements: () => ipcRenderer.invoke('xp:getAchievements'),
  checkAchievements: () => ipcRenderer.invoke('xp:checkAchievements'),
  getGoalProgress: (goalId, today) => ipcRenderer.invoke('db:getGoalProgress', goalId, today),

  // Subtasks
  getSubtasks: (taskId) => ipcRenderer.invoke('db:getSubtasks', taskId),
  createSubtask: (subtask) => ipcRenderer.invoke('db:createSubtask', subtask),
  toggleSubtask: (id) => ipcRenderer.invoke('db:toggleSubtask', id),
  deleteSubtask: (id) => ipcRenderer.invoke('db:deleteSubtask', id),

  // Trash
  softDeleteItem: (type, id) => ipcRenderer.invoke('db:softDeleteItem', type, id),
  getTrashItems: () => ipcRenderer.invoke('db:getTrashItems'),
  restoreItem: (type, id) => ipcRenderer.invoke('db:restoreItem', type, id),
  deleteItemPermanent: (type, id) => ipcRenderer.invoke('db:deleteItemPermanent', type, id),
  emptyTrash: () => ipcRenderer.invoke('db:emptyTrash'),

  // Entity Links
  linkEntities: (fromType, fromId, toType, toId) => ipcRenderer.invoke('db:linkEntities', fromType, fromId, toType, toId),
  getEntityLinks: (type, id) => ipcRenderer.invoke('db:getEntityLinks', type, id),

  // Challenges
  getChallenges: () => ipcRenderer.invoke('db:getChallenges'),
  updateChallengeProgress: (type, amount) => ipcRenderer.invoke('db:updateChallengeProgress', type, amount),

  // Weekly Report
  getWeeklyReport: () => ipcRenderer.invoke('db:getWeeklyReport'),

  // Dashboard
  getDashboard: () => ipcRenderer.invoke('db:getDashboard'),
  getActivityFeed: () => ipcRenderer.invoke('db:getActivityFeed'),
  getHabitStats: () => ipcRenderer.invoke('db:getHabitStats'),

  // Export/Import
  exportData: () => ipcRenderer.invoke('db:exportData'),
  importData: (data) => ipcRenderer.invoke('db:importData', data),
  listBackups: () => ipcRenderer.invoke('db:listBackups'),
  restoreBackup: (filename) => ipcRenderer.invoke('db:restoreBackup', filename),

  // Flashcards
  getFlashcardDecks: () => ipcRenderer.invoke('db:getFlashcardDecks'),
  createFlashcardDeck: (data) => ipcRenderer.invoke('db:createFlashcardDeck', data),
  deleteFlashcardDeck: (id) => ipcRenderer.invoke('db:deleteFlashcardDeck', id),
  getFlashcards: (deckId) => ipcRenderer.invoke('db:getFlashcards', deckId),
  createFlashcard: (data) => ipcRenderer.invoke('db:createFlashcard', data),
  deleteFlashcard: (id) => ipcRenderer.invoke('db:deleteFlashcard', id),
  getDueFlashcards: (deckId) => ipcRenderer.invoke('db:getDueFlashcards', deckId),
  reviewFlashcard: (id, ease) => ipcRenderer.invoke('db:reviewFlashcard', { id, ease }),
  getFlashcardStats: (deckId) => ipcRenderer.invoke('db:getFlashcardStats', deckId),
  getRetentionStats: () => ipcRenderer.invoke('db:getRetentionStats'),
})
