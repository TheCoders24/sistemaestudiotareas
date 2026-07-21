const API_BASE = '/api'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

function apiGet(path) {
  return apiFetch(path)
}

function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
}

function apiPut(path, body) {
  return apiFetch(path, { method: 'PUT', body: JSON.stringify(body) })
}

function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' })
}

async function apiUpload(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Upload error: ${res.status}`)
  return res.json()
}

const api = {
  // Settings
  getSetting: (key) => apiGet(`/settings/${encodeURIComponent(key)}`),
  setSetting: (key, value) => apiPut(`/settings/${encodeURIComponent(key)}`, { value }),

  // Tasks
  getTasks: () => apiGet('/tasks'),
  getTasksWithSubtasks: () => apiGet('/tasks-with-subtasks'),
  createTask: (task) => apiPost('/tasks', task),
  updateTask: (id, data) => apiPut(`/tasks/${id}`, data),
  deleteTask: (id) => apiDelete(`/tasks/${id}`),
  toggleTask: (id) => apiPut(`/tasks/${id}/toggle`),
  reorderTasks: (orderedIds) => apiPost('/tasks/reorder', { orderedIds }),
  addTagToTask: (taskId, tag) => apiPost(`/tasks/${taskId}/tags`, { tag }),
  removeTagFromTask: (taskId, tag) => apiDelete(`/tasks/${taskId}/tags/${encodeURIComponent(tag)}`),
  getTasksByTag: (tag) => apiGet(`/tasks/tag/${encodeURIComponent(tag)}`),

  // Kanban
  getKanbanCards: () => apiGet('/kanban'),
  createKanbanCard: (card) => apiPost('/kanban', card),
  updateKanbanCard: (id, data) => apiPut(`/kanban/${id}`, data),
  deleteKanbanCard: (id) => apiDelete(`/kanban/${id}`),
  moveKanbanCard: (id, column, position) => apiPut(`/kanban/${id}/move`, { column, position }),

  // Pomodoro
  getPomodoroSessions: (date) => {
    if (date) return apiGet(`/pomodoros?date=${encodeURIComponent(date)}`)
    return apiGet('/pomodoros')
  },
  createPomodoroSession: (session) => apiPost('/pomodoros', session),

  // Study Topics
  getStudyTopics: () => apiGet('/study-topics'),
  createStudyTopic: (topic) => apiPost('/study-topics', topic),
  updateStudyTopic: (id, data) => apiPut(`/study-topics/${id}`, data),
  deleteStudyTopic: (id) => apiDelete(`/study-topics/${id}`),
  setStudyLevel: (topicId, level) => apiPut(`/study-topics/${topicId}/level`, { level }),
  getStudyStats: () => apiGet('/study-stats'),
  moveStudyTopic: (id, direction) => apiPut(`/study-topics/${id}/move`, { direction }),
  toggleStudyProgress: (topicId, date) => apiPost('/study-progress/toggle', { topicId, date }),

  // Study Files (adapted for web - uses fetch for form data)
  pickAndUploadFile: async (topicId) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.zip,.rar,.epub,.md,.csv,.xlsx,.pptx,.mp3,.wav,.webm,.avi,.mov'
    return new Promise((resolve) => {
      input.onchange = async () => {
        const file = input.files[0]
        if (!file) return resolve(null)
        const formData = new FormData()
        formData.append('file', file)
        const result = await apiUpload(`/study-files/upload/${topicId}`, formData)
        resolve(result)
      }
      input.click()
    })
  },
  getTopicFiles: (topicId) => apiGet(`/study-files/${topicId}`),
  deleteFile: (fileId) => apiDelete(`/study-files/${fileId}`),
  openFile: async (fileId) => {
    window.open(`${API_BASE}/study-files/${fileId}/download`, '_blank')
    return true
  },

  // Notes
  getNotes: () => apiGet('/notes'),
  createNote: (note) => apiPost('/notes', note),
  updateNote: (id, data) => apiPut(`/notes/${id}`, data),
  deleteNote: (id) => apiDelete(`/notes/${id}`),

  // Goals
  getGoals: () => apiGet('/goals'),
  createGoal: (goal) => apiPost('/goals', goal),
  updateGoal: (id, data) => apiPut(`/goals/${id}`, data),
  deleteGoal: (id) => apiDelete(`/goals/${id}`),
  addGoalProgress: (goalId, date, value) => apiPost(`/goals/${goalId}/progress`, { date, value }),
  getGoalProgress: (goalId, today) => apiGet(`/goals/${goalId}/progress/${encodeURIComponent(today)}`),

  // Streaks
  getStreak: (name) => apiGet(`/streaks/${encodeURIComponent(name)}`),
  updateStreak: (name) => apiPost(`/streaks/${encodeURIComponent(name)}/update`),

  // Statistics
  getStats: (period) => apiGet(`/stats/${period}`),

  // Projects
  getProjects: () => apiGet('/projects'),
  createProject: (project) => apiPost('/projects', project),
  updateProject: (id, data) => apiPut(`/projects/${id}`, data),
  deleteProject: (id) => apiDelete(`/projects/${id}`),

  // Daily Logs
  getDailyLogs: () => apiGet('/daily-logs'),
  getDailyLog: (date) => apiGet(`/daily-logs/${encodeURIComponent(date)}`),
  createDailyLog: (log) => apiPost('/daily-logs', log),
  updateDailyLog: (id, data) => apiPut(`/daily-logs/${id}`, data),

  // Snippets
  getSnippets: () => apiGet('/snippets'),
  createSnippet: (snippet) => apiPost('/snippets', snippet),
  updateSnippet: (id, data) => apiPut(`/snippets/${id}`, data),
  deleteSnippet: (id) => apiDelete(`/snippets/${id}`),

  // Habits
  getHabits: () => apiGet('/habits'),
  createHabit: (habit) => apiPost('/habits', habit),
  updateHabit: (id, data) => apiPut(`/habits/${id}`, data),
  deleteHabit: (id) => apiDelete(`/habits/${id}`),
  getHabitLogs: (habitId) => apiGet(`/habits/${habitId}/logs`),
  toggleHabitLog: (habitId, date) => apiPost(`/habits/${habitId}/toggle`, { date }),

  // Search
  search: (query) => apiGet(`/search?q=${encodeURIComponent(query)}`),

  // XP / Gamification
  getXp: () => apiGet('/xp'),
  addXp: (amount, reason) => apiPost('/xp/add', { amount, reason }),
  getXpHistory: (days) => apiGet(`/xp/history/${days}`),
  getAchievements: () => apiGet('/achievements'),
  checkAchievements: () => apiPost('/achievements/check'),

  // Subtasks
  getSubtasks: (taskId) => apiGet(`/subtasks/${taskId}`),
  createSubtask: (subtask) => apiPost('/subtasks', subtask),
  toggleSubtask: (id) => apiPut(`/subtasks/${id}/toggle`),
  deleteSubtask: (id) => apiDelete(`/subtasks/${id}`),

  // Trash
  softDeleteItem: (type, id) => apiPost('/trash/soft-delete', { type, id }),
  getTrashItems: () => apiGet('/trash'),
  restoreItem: (type, id) => apiPost('/trash/restore', { type, id }),
  deleteItemPermanent: (type, id) => apiPost('/trash/permanent', { type, id }),
  emptyTrash: () => apiPost('/trash/empty'),

  // Entity Links
  linkEntities: (fromType, fromId, toType, toId) => apiPost('/entity-links', { fromType, fromId, toType, toId }),
  getEntityLinks: (type, id) => apiGet(`/entity-links/${type}/${id}`),

  // Challenges
  getChallenges: () => apiGet('/challenges'),

  // Weekly Report
  getWeeklyReport: () => apiGet('/weekly-report'),

  // Dashboard
  getDashboard: () => apiGet('/dashboard'),
  getActivityFeed: () => apiGet('/activity-feed'),
  getHabitStats: () => apiGet('/habit-stats'),

  // Export/Import
  exportData: () => apiGet('/export'),
  importData: (data) => apiPost('/import', data),
  listBackups: () => apiGet('/backups'),
  restoreBackup: (filename) => apiPost(`/backups/restore/${encodeURIComponent(filename)}`),

  // Flashcards
  getFlashcardDecks: () => apiGet('/flashcard-decks'),
  createFlashcardDeck: (data) => apiPost('/flashcard-decks', data),
  deleteFlashcardDeck: (id) => apiDelete(`/flashcard-decks/${id}`),
  getFlashcards: (deckId) => apiGet(`/flashcards/${deckId}`),
  createFlashcard: (data) => apiPost('/flashcards', data),
  deleteFlashcard: (id) => apiDelete(`/flashcards/${id}`),
  getDueFlashcards: (deckId) => apiGet(`/flashcards/${deckId}/due`),
  reviewFlashcard: (id, ease) => apiPost(`/flashcards/${id}/review`, { ease }),
  getFlashcardStats: (deckId) => apiGet(`/flashcard-stats/${deckId}`),
  getRetentionStats: () => apiGet('/retention-stats'),

  // Notifications (web)
  showNotification: (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
    return true
  },
}

window.electronAPI = api
