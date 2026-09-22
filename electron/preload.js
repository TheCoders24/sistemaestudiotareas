const { contextBridge, ipcRenderer } = require('electron')

const listeners = new Map()
window.addEventListener('unload', () => {
  for (const [channel, cb] of listeners) {
    try { ipcRenderer.removeListener(channel, cb) } catch {}
  }
  listeners.clear()
})

function on(channel, callback) {
  const wrapper = (_event, ...args) => callback(...args)
  ipcRenderer.on(channel, wrapper)
  listeners.set(channel + ':' + callback.toString(), () => ipcRenderer.removeListener(channel, wrapper))
  return () => {
    ipcRenderer.removeListener(channel, wrapper)
    listeners.delete(channel + ':' + callback.toString())
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Structured domain API
  settings: {
    get: (key) => ipcRenderer.invoke('db:getSetting', key),
    set: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),
  },

  workspaces: {
    list: () => ipcRenderer.invoke('workspaces:list'),
    getActive: () => ipcRenderer.invoke('workspaces:getActive'),
    setActive: (id) => ipcRenderer.invoke('workspaces:setActive', id),
    create: (data) => ipcRenderer.invoke('workspaces:create', data),
    update: (id, data) => ipcRenderer.invoke('workspaces:update', id, data),
    delete: (id) => ipcRenderer.invoke('workspaces:delete', id),
    getEntities: (wsId) => ipcRenderer.invoke('workspaces:getEntities', wsId),
  },

  projects: {
    list: (wsId) => ipcRenderer.invoke('db:getProjects', wsId),
    create: (data) => ipcRenderer.invoke('db:createProject', data),
    update: (id, data) => ipcRenderer.invoke('db:updateProject', id, data),
    delete: (id) => ipcRenderer.invoke('db:deleteProject', id),
    gitStatus: (id) => ipcRenderer.invoke('projects:gitStatus', id),
    openInEditor: (id, editor) => ipcRenderer.invoke('projects:openInEditor', { id, editor }),
  },

  tasks: {
    list: (wsId) => ipcRenderer.invoke('db:getTasks', wsId),
    listWithSubtasks: (wsId) => ipcRenderer.invoke('db:getTasksWithSubtasks', wsId),
    create: (task) => ipcRenderer.invoke('db:createTask', task),
    update: (id, data) => ipcRenderer.invoke('db:updateTask', id, data),
    delete: (id) => ipcRenderer.invoke('db:deleteTask', id),
    toggle: (id) => ipcRenderer.invoke('db:toggleTask', id),
    reorder: (orderedIds) => ipcRenderer.invoke('db:reorderTasks', orderedIds),
    addTag: (taskId, tag) => ipcRenderer.invoke('db:addTagToTask', taskId, tag),
    removeTag: (taskId, tag) => ipcRenderer.invoke('db:removeTagFromTask', taskId, tag),
    getByTag: (tag) => ipcRenderer.invoke('db:getTasksByTag', tag),
    dependencies: {
      get: (taskId) => ipcRenderer.invoke('tasks:getDependencies', taskId),
      getDependents: (taskId) => ipcRenderer.invoke('tasks:getDependents', taskId),
      add: (taskId, dependsOnId) => ipcRenderer.invoke('tasks:addDependency', taskId, dependsOnId),
      remove: (taskId, dependsOnId) => ipcRenderer.invoke('tasks:removeDependency', taskId, dependsOnId),
    },
    comments: {
      list: (taskId) => ipcRenderer.invoke('tasks:getComments', taskId),
      add: (taskId, content) => ipcRenderer.invoke('tasks:addComment', taskId, content),
      delete: (id) => ipcRenderer.invoke('tasks:deleteComment', id),
    },
    timeTracking: {
      list: (taskId) => ipcRenderer.invoke('tasks:getTimeEntries', taskId),
      start: (taskId) => ipcRenderer.invoke('tasks:startTimeEntry', taskId),
      stop: (id) => ipcRenderer.invoke('tasks:stopTimeEntry', id),
      delete: (id) => ipcRenderer.invoke('tasks:deleteTimeEntry', id),
      total: (taskId) => ipcRenderer.invoke('tasks:getTotalTrackedTime', taskId),
    },
  },

  subtasks: {
    list: (taskId) => ipcRenderer.invoke('db:getSubtasks', taskId),
    create: (subtask) => ipcRenderer.invoke('db:createSubtask', subtask),
    toggle: (id) => ipcRenderer.invoke('db:toggleSubtask', id),
    delete: (id) => ipcRenderer.invoke('db:deleteSubtask', id),
  },

  kanban: {
    cards: {
      list: (wsId) => ipcRenderer.invoke('db:getKanbanCards', wsId),
      create: (card) => ipcRenderer.invoke('db:createKanbanCard', card),
      update: (id, data) => ipcRenderer.invoke('db:updateKanbanCard', id, data),
      delete: (id) => ipcRenderer.invoke('db:deleteKanbanCard', id),
      move: (id, column, position) => ipcRenderer.invoke('db:moveKanbanCard', id, column, position),
    },
    columns: {
      list: (wsId) => ipcRenderer.invoke('kanban:getColumns', wsId),
      create: (data) => ipcRenderer.invoke('kanban:createColumn', data),
      update: (id, data) => ipcRenderer.invoke('kanban:updateColumn', id, data),
      delete: (id) => ipcRenderer.invoke('kanban:deleteColumn', id),
    },
  },

  notes: {
    list: (wsId) => ipcRenderer.invoke('db:getNotes', wsId),
    create: (note) => ipcRenderer.invoke('db:createNote', note),
    update: (id, data) => ipcRenderer.invoke('db:updateNote', id, data),
    delete: (id) => ipcRenderer.invoke('db:deleteNote', id),
    folders: {
      list: (wsId) => ipcRenderer.invoke('notes:getFolders', wsId),
      create: (data) => ipcRenderer.invoke('notes:createFolder', data),
      update: (id, data) => ipcRenderer.invoke('notes:updateFolder', id, data),
      delete: (id) => ipcRenderer.invoke('notes:deleteFolder', id),
    },
  },

  habits: {
    list: (wsId) => ipcRenderer.invoke('db:getHabits', wsId),
    create: (habit) => ipcRenderer.invoke('db:createHabit', habit),
    update: (id, data) => ipcRenderer.invoke('db:updateHabit', id, data),
    delete: (id) => ipcRenderer.invoke('db:deleteHabit', id),
    logs: {
      list: (habitId) => ipcRenderer.invoke('db:getHabitLogs', habitId),
      listAll: () => ipcRenderer.invoke('db:getAllHabitLogs'),
      toggle: (habitId, date) => ipcRenderer.invoke('db:toggleHabitLog', habitId, date),
    },
    stats: () => ipcRenderer.invoke('db:getHabitStats'),
  },

  goals: {
    list: (wsId) => ipcRenderer.invoke('db:getGoals', wsId),
    create: (goal) => ipcRenderer.invoke('db:createGoal', goal),
    update: (id, data) => ipcRenderer.invoke('db:updateGoal', id, data),
    delete: (id) => ipcRenderer.invoke('db:deleteGoal', id),
    progress: {
      add: (goalId, date, value) => ipcRenderer.invoke('db:addGoalProgress', goalId, date, value),
      get: (goalId, today) => ipcRenderer.invoke('db:getGoalProgress', goalId, today),
    },
  },

  snippets: {
    list: (wsId) => ipcRenderer.invoke('db:getSnippets', wsId),
    create: (snippet) => ipcRenderer.invoke('db:createSnippet', snippet),
    update: (id, data) => ipcRenderer.invoke('db:updateSnippet', id, data),
    delete: (id) => ipcRenderer.invoke('db:deleteSnippet', id),
    execute: (id) => ipcRenderer.invoke('snippets:execute', id),
  },

  flashcards: {
    decks: {
      list: (wsId) => ipcRenderer.invoke('db:getFlashcardDecks', wsId),
      create: (data) => ipcRenderer.invoke('db:createFlashcardDeck', data),
      delete: (id) => ipcRenderer.invoke('db:deleteFlashcardDeck', id),
    },
    cards: {
      list: (deckId) => ipcRenderer.invoke('db:getFlashcards', deckId),
      create: (data) => ipcRenderer.invoke('db:createFlashcard', data),
      delete: (id) => ipcRenderer.invoke('db:deleteFlashcard', id),
      getDue: (deckId) => ipcRenderer.invoke('db:getDueFlashcards', deckId),
      review: (data) => ipcRenderer.invoke('db:reviewFlashcard', data),
    },
    stats: {
      deck: (deckId) => ipcRenderer.invoke('db:getFlashcardStats', deckId),
      retention: () => ipcRenderer.invoke('db:getRetentionStats'),
      reviews: () => ipcRenderer.invoke('db:getFlashcardReviewStats'),
      upcoming: () => ipcRenderer.invoke('db:getUpcomingFlashcardReviews'),
    },
    streak: {
      update: (data) => ipcRenderer.invoke('db:updateFlashcardStreak', data),
      subjects: () => ipcRenderer.invoke('db:getSubjectStreaks'),
    },
  },

  study: {
    topics: {
      list: (wsId) => ipcRenderer.invoke('db:getStudyTopics', wsId),
      create: (topic) => ipcRenderer.invoke('db:createStudyTopic', topic),
      update: (id, data) => ipcRenderer.invoke('db:updateStudyTopic', id, data),
      delete: (id) => ipcRenderer.invoke('db:deleteStudyTopic', id),
      move: (id, direction) => ipcRenderer.invoke('db:moveStudyTopic', id, direction),
      toggleProgress: (topicId, date) => ipcRenderer.invoke('db:toggleStudyProgress', topicId, date),
      setLevel: (topicId, level) => ipcRenderer.invoke('db:setStudyLevel', topicId, level),
    },
    files: {
      pickAndUpload: (topicId) => ipcRenderer.invoke('study:pickAndUploadFile', topicId),
      list: (topicId) => ipcRenderer.invoke('study:getTopicFiles', topicId),
      delete: (fileId) => ipcRenderer.invoke('study:deleteFile', fileId),
      open: (fileId) => ipcRenderer.invoke('study:openFile', fileId),
    },
    stats: () => ipcRenderer.invoke('db:getStudyStats'),
  },

  pomodoro: {
    sessions: {
      list: (date) => ipcRenderer.invoke('db:getPomodoroSessions', date),
      create: (session) => ipcRenderer.invoke('db:createPomodoroSession', session),
    },
  },

  search: (query) => ipcRenderer.invoke('db:search', query),

  gamification: {
    xp: {
      get: () => ipcRenderer.invoke('xp:get'),
      add: (amount, reason) => ipcRenderer.invoke('xp:add', amount, reason),
      history: (days) => ipcRenderer.invoke('xp:getHistory', days),
    },
    achievements: {
      list: () => ipcRenderer.invoke('xp:getAchievements'),
      check: () => ipcRenderer.invoke('xp:checkAchievements'),
    },
    challenges: {
      list: () => ipcRenderer.invoke('db:getChallenges'),
      updateProgress: (type, amount) => ipcRenderer.invoke('db:updateChallengeProgress', type, amount),
    },
  },

  streaks: {
    get: (name) => ipcRenderer.invoke('db:getStreak', name),
    update: (name) => ipcRenderer.invoke('db:updateStreak', name),
  },

  dailyLogs: {
    list: (wsId) => ipcRenderer.invoke('db:getDailyLogs', wsId),
    get: (date) => ipcRenderer.invoke('db:getDailyLog', date),
    create: (log) => ipcRenderer.invoke('db:createDailyLog', log),
    update: (id, data) => ipcRenderer.invoke('db:updateDailyLog', id, data),
  },

  trash: {
    list: () => ipcRenderer.invoke('db:getTrashItems'),
    softDelete: (type, id) => ipcRenderer.invoke('db:softDeleteItem', type, id),
    restore: (type, id) => ipcRenderer.invoke('db:restoreItem', type, id),
    deletePermanent: (type, id) => ipcRenderer.invoke('db:deleteItemPermanent', type, id),
    empty: () => ipcRenderer.invoke('db:emptyTrash'),
  },

  export: {
    data: () => ipcRenderer.invoke('db:exportData'),
    import: (data) => ipcRenderer.invoke('db:importData', data),
    importJSON: (data) => ipcRenderer.invoke('db:restoreFromJSON', data),
    noteMarkdown: (noteId) => ipcRenderer.invoke('notes:exportMarkdown', noteId),
  },

  searchReindex: () => ipcRenderer.invoke('db:reindexSearch'),

  backup: {
    list: () => ipcRenderer.invoke('db:listBackups'),
    restore: (filename) => ipcRenderer.invoke('db:restoreBackup', filename),
  },

  entity: {
    link: (fromType, fromId, toType, toId) => ipcRenderer.invoke('entity:link', fromType, fromId, toType, toId),
    getLinks: (type, id) => ipcRenderer.invoke('entity:getLinks', type, id),
  },

  tray: {
    updateMenu: () => ipcRenderer.invoke('tray:updateMenu'),
  },

  events: {
    onTrayAction: (callback) => on('tray:action', callback),
    onUpdateStatus: (callback) => on('updater:status', callback),
    onWifiDeviceFound: (callback) => on('wifi-sync:device-found', callback),
    onReminderNotification: (callback) => on('reminder:notification', callback),
    subscribe: (channel, callback) => on(channel, callback),
  },

  app: {
    autoStart: {
      get: () => ipcRenderer.invoke('app:getAutoStart'),
      set: (enabled) => ipcRenderer.invoke('app:setAutoStart', enabled),
    },
    shortcuts: {
      register: (accelerator, action) => ipcRenderer.invoke('shortcuts:register', { accelerator, action }),
      unregister: (accelerator) => ipcRenderer.invoke('shortcuts:unregister', accelerator),
    },
    updater: {
      check: () => ipcRenderer.invoke('updater:check'),
      install: () => ipcRenderer.invoke('updater:install'),
    },
    notification: {
      show: (title, body, severity) => ipcRenderer.invoke('notification:show', { title, body, severity }),
    },
  },

  wifiSync: {
    start: () => ipcRenderer.invoke('wifi-sync:start'),
    stop: () => ipcRenderer.invoke('wifi-sync:stop'),
    discover: () => ipcRenderer.invoke('wifi-sync:discover'),
    connect: (ip) => ipcRenderer.invoke('wifi-sync:connect', { ip }),
    pull: (ip) => ipcRenderer.invoke('wifi-sync:pull', { ip }),
    push: (ip) => ipcRenderer.invoke('wifi-sync:push', { ip }),
  },

  utils: {
    linkEntities: (fromType, fromId, toType, toId) => ipcRenderer.invoke('db:linkEntities', fromType, fromId, toType, toId),
    getEntityLinks: (type, id) => ipcRenderer.invoke('db:getEntityLinks', type, id),
    importICSEvents: (events) => ipcRenderer.invoke('db:importICSEvents', events),
  },

  dashboard: {
    get: () => ipcRenderer.invoke('db:getDashboard'),
    activityFeed: () => ipcRenderer.invoke('db:getActivityFeed'),
  },

  stats: {
    get: (period) => ipcRenderer.invoke('db:getStats', period),
    weeklyReport: () => ipcRenderer.invoke('db:getWeeklyReport'),
  },

  labels: {
    list: (wsId) => ipcRenderer.invoke('labels:list', wsId),
    create: (data) => ipcRenderer.invoke('labels:create', data),
    delete: (id) => ipcRenderer.invoke('labels:delete', id),
    addToTask: (taskId, labelId) => ipcRenderer.invoke('labels:addToTask', taskId, labelId),
    removeFromTask: (taskId, labelId) => ipcRenderer.invoke('labels:removeFromTask', taskId, labelId),
    getByTask: (taskId) => ipcRenderer.invoke('labels:getByTask', taskId),
  },

  activity: {
    list: (limit) => ipcRenderer.invoke('activity:list', limit),
    getByEntity: (entityType, entityId) => ipcRenderer.invoke('activity:getByEntity', entityType, entityId),
  },

  session: {
    save: (state) => ipcRenderer.invoke('session:save', state),
    restore: () => ipcRenderer.invoke('session:restore'),
    onRestored: (callback) => on('session:restored', callback),
  },

  automation: {
    list: (wsId) => ipcRenderer.invoke('automation:list', wsId),
    create: (data) => ipcRenderer.invoke('automation:create', data),
    update: (id, data) => ipcRenderer.invoke('automation:update', id, data),
    delete: (id) => ipcRenderer.invoke('automation:delete', id),
  },

  courses: {
    list: (wsId) => ipcRenderer.invoke('courses:list', wsId),
    create: (data) => ipcRenderer.invoke('courses:create', data),
    update: (id, data) => ipcRenderer.invoke('courses:update', id, data),
    delete: (id) => ipcRenderer.invoke('courses:delete', id),
    get: (id) => ipcRenderer.invoke('courses:get', id),
  },

  templates: {
    list: (type) => ipcRenderer.invoke('templates:list', type),
    create: (data) => ipcRenderer.invoke('templates:create', data),
    instantiate: (templateId, params) => ipcRenderer.invoke('templates:instantiate', { templateId, params }),
    delete: (id) => ipcRenderer.invoke('templates:delete', id),
  },
  exams: {
    list: (courseId) => ipcRenderer.invoke('exams:list', courseId),
    create: (data) => ipcRenderer.invoke('exams:create', data),
    update: (id, data) => ipcRenderer.invoke('exams:update', id, data),
    delete: (id) => ipcRenderer.invoke('exams:delete', id),
    gpa: (courseId) => ipcRenderer.invoke('exams:gpa', courseId),
  },
  examSimulations: {
    list: (deckId) => ipcRenderer.invoke('exam_simulations:list', deckId),
    create: (data) => ipcRenderer.invoke('exam_simulations:create', data),
  },
  ai: {
    generateFlashcards: (sourceType, sourceId) => ipcRenderer.invoke('ai:generateFlashcards', { sourceType, sourceId }),
    weeklySummary: () => ipcRenderer.invoke('ai:weeklySummary'),
    tutor: (topicId, message, history) => ipcRenderer.invoke('ai:tutor', { topicId, message, history }),
    validateKey: () => ipcRenderer.invoke('ai:validateKey'),
  },

  // Startup Profiler
  profiler: {
    getReport: () => ipcRenderer.invoke('profiler:getReport'),
    reset: () => ipcRenderer.invoke('profiler:reset'),
  },

  // Performance Modes
  perf: {
    getMode: () => ipcRenderer.invoke('perf:getMode'),
    setMode: (mode) => ipcRenderer.invoke('perf:setMode', mode),
    getConfig: () => ipcRenderer.invoke('perf:getConfig'),
    getModes: () => ipcRenderer.invoke('perf:getModes'),
  },

  // Performance Monitor
  perfMonitor: {
    start: (interval) => ipcRenderer.invoke('perf:monitor:start', interval),
    stop: () => ipcRenderer.invoke('perf:monitor:stop'),
    getReport: () => ipcRenderer.invoke('perf:monitor:getReport'),
    getLatest: () => ipcRenderer.invoke('perf:monitor:getLatest'),
    collectSample: () => ipcRenderer.invoke('perf:monitor:collectSample'),
  },

  // Smart Preload
  preload: {
    recordTransition: (fromModule, toModule, wsId) => ipcRenderer.invoke('preload:recordTransition', fromModule, toModule, wsId),
    getStats: () => ipcRenderer.invoke('preload:getStats'),
    setLevel: (level) => ipcRenderer.invoke('preload:setLevel', level),
  },

  // PIN Lock
  pin: {
    set: (pin) => ipcRenderer.invoke('pin:set', pin),
    verify: (pin) => ipcRenderer.invoke('pin:verify', pin),
    disable: () => ipcRenderer.invoke('pin:disable'),
    isEnabled: () => ipcRenderer.invoke('pin:isEnabled'),
    isLocked: () => ipcRenderer.invoke('pin:isLocked'),
  },

  // Plugins
  plugins: {
    list: () => ipcRenderer.invoke('plugins:list'),
    get: (id) => ipcRenderer.invoke('plugins:get', id),
    load: (id) => ipcRenderer.invoke('plugins:load', id),
    unload: (id) => ipcRenderer.invoke('plugins:unload', id),
    isActive: (id) => ipcRenderer.invoke('plugins:isActive', id),
  },

  // Encryption
  encryption: {
    encrypt: (text) => ipcRenderer.invoke('encryption:encrypt', text),
    decrypt: (data) => ipcRenderer.invoke('encryption:decrypt', data),
    hash: (data) => ipcRenderer.invoke('encryption:hash', data),
    generateKey: () => ipcRenderer.invoke('encryption:generateKey'),
  },
})
