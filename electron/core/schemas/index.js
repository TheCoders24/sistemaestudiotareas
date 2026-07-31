const { z } = require('zod')

const commonId = z.number().int().positive()
const commonString = z.string().min(1).max(500)
const commonOptionalString = z.string().max(500).optional().nullable()
const commonDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().nullable()
const commonPriority = z.enum(['baja', 'media', 'alta', 'urgente']).optional().default('media')

const workspaceId = z.number().int().positive()

exports.settings = {
  get: z.object({ 0: z.string() }).transform(a => a[0]),
  set: z.object({ 0: z.string(), 1: z.any() }).transform(a => ({ key: a[0], value: a[1] })),
}

exports.workspaces = {
  list: z.object({ 0: z.any().optional() }).optional(),
  getActive: z.any().optional(),
  setActive: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  create: z.object({
    name: commonString,
    icon: commonOptionalString,
    color: commonOptionalString,
  }),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({ name: commonOptionalString, icon: commonOptionalString, color: commonOptionalString }).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  getEntities: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
}

exports.tasks = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  listWithSubtasks: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  create: z.object({
    title: commonString,
    description: commonOptionalString,
    priority: commonPriority,
    due_date: commonDate,
    project_id: z.number().int().positive().optional().nullable(),
    workspace_id: workspaceId.optional(),
    repeat: z.enum(['daily', 'weekly', 'monthly', 'yearly', '']).optional().nullable(),
    tags: commonOptionalString,
    parent_task_id: z.number().int().positive().optional().nullable(),
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({}).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  toggle: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  reorder: z.object({ 0: z.array(z.number()) }).transform(a => a[0]),
  addTag: z.object({ 0: z.number(), 1: z.string() }).transform(a => ({ taskId: a[0], tag: a[1] })),
  removeTag: z.object({ 0: z.number(), 1: z.string() }).transform(a => ({ taskId: a[0], tag: a[1] })),
  getByTag: z.object({ 0: z.string() }).transform(a => a[0]),
  dependencies: {
    get: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    getDependents: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    add: z.object({ 0: z.number(), 1: z.number() }).transform(a => ({ taskId: a[0], dependsOnId: a[1] })),
    remove: z.object({ 0: z.number(), 1: z.number() }).transform(a => ({ taskId: a[0], dependsOnId: a[1] })),
  },
  comments: {
    list: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    add: z.object({ 0: z.number(), 1: z.string().min(1) }).transform(a => ({ taskId: a[0], content: a[1] })),
    delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  },
  timeTracking: {
    list: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    start: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    stop: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    total: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  },
}

exports.subtasks = {
  list: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  create: z.object({
    task_id: z.number().int().positive(),
    title: commonString,
    completed: z.boolean().optional().default(false),
  }),
  toggle: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
}

exports.kanban = {
  cards: {
    list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
    create: z.object({
      title: commonString,
      description: commonOptionalString,
      column_type: z.string().optional().default('todo'),
      priority: commonPriority,
      tags: commonOptionalString,
      due_date: commonDate,
      project_id: z.number().int().positive().optional().nullable(),
      workspace_id: workspaceId,
    }).passthrough(),
    update: z.object({
      0: z.number().int().positive(),
      1: z.object({}).passthrough(),
    }).transform(a => ({ id: a[0], data: a[1] })),
    delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    move: z.object({ 0: z.number(), 1: z.string(), 2: z.number() }).transform(a => ({ id: a[0], column: a[1], position: a[2] })),
  },
  columns: {
    list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
    create: z.object({
      name: commonString,
      color: commonOptionalString,
      wip_limit: z.number().int().positive().optional().nullable(),
      type: z.string().optional(),
    }).passthrough(),
    update: z.object({
      0: z.number().int().positive(),
      1: z.object({ name: commonOptionalString, color: commonOptionalString, wip_limit: z.number().optional().nullable(), position: z.number().optional(), type: z.string().optional() }).passthrough(),
    }).transform(a => ({ id: a[0], data: a[1] })),
    delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  },
}

exports.notes = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  create: z.object({
    title: commonString,
    content: z.string().optional().default(''),
    project_id: z.number().int().positive().optional().nullable(),
    workspace_id: workspaceId,
    folder_id: z.number().int().positive().optional().nullable(),
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({ title: commonOptionalString, content: z.string().optional() }).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  folders: {
    list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
    create: z.object({ name: commonString, parent_id: z.number().int().positive().optional().nullable(), color: commonOptionalString }).passthrough(),
    update: z.object({
      0: z.number().int().positive(),
      1: z.object({ name: commonOptionalString, parent_id: z.number().optional().nullable(), color: commonOptionalString }).passthrough(),
    }).transform(a => ({ id: a[0], data: a[1] })),
    delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  },
  exportMarkdown: z.number().int().positive(),
}

exports.habits = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  create: z.object({
    name: commonString,
    icon: commonOptionalString,
    color: commonOptionalString,
    frequency: z.string().optional().default('daily'),
    workspace_id: workspaceId,
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({ name: commonOptionalString, icon: commonOptionalString, color: commonOptionalString, frequency: commonOptionalString }).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  logs: {
    list: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    listAll: z.any().optional(),
    toggle: z.object({ 0: z.number(), 1: z.string() }).transform(a => ({ habitId: a[0], date: a[1] })),
  },
  stats: z.any().optional(),
}

exports.goals = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  create: z.object({
    title: commonString,
    type: z.string().optional().default('daily'),
    target: z.number().positive(),
    metric: commonOptionalString,
    workspace_id: workspaceId,
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({ title: commonOptionalString, type: commonOptionalString, target: z.number().optional(), metric: commonOptionalString }).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
  progress: {
    add: z.object({ 0: z.number(), 1: z.string(), 2: z.number() }).transform(a => ({ goalId: a[0], date: a[1], value: a[2] })),
    get: z.object({ 0: z.number(), 1: z.string() }).transform(a => ({ goalId: a[0], today: a[1] })),
  },
}

exports.snippets = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  create: z.object({
    title: commonString,
    code: z.string().optional().default(''),
    language: z.string().optional().default('text'),
    description: commonOptionalString,
    tags: commonOptionalString,
    project_id: z.number().int().positive().optional().nullable(),
    workspace_id: workspaceId,
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({ title: commonOptionalString, code: z.string().optional(), language: commonOptionalString, description: commonOptionalString, tags: commonOptionalString }).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
}

exports.projects = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  create: z.object({
    name: commonString,
    description: commonOptionalString,
    status: z.string().optional().default('active'),
    tech_stack: commonOptionalString,
    repo_url: z.string().optional().nullable(),
    color: commonOptionalString,
    workspace_id: workspaceId,
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({ name: commonOptionalString, description: commonOptionalString, status: commonOptionalString, tech_stack: commonOptionalString, repo_url: commonOptionalString, color: commonOptionalString }).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
}

exports.pomodoro = {
  sessions: {
    list: z.object({ 0: z.string().optional() }).transform(a => a[0]).optional(),
    create: z.object({
      duration: z.number().positive(),
      type: z.string().optional().default('focus'),
      date: z.string().optional(),
      task_id: z.number().int().positive().optional().nullable(),
    }).passthrough(),
  },
}

exports.dailyLogs = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  get: z.string(),
  create: z.object({
    date: z.string(),
    content: z.string().optional().default(''),
    focus: commonOptionalString,
    blockers: commonOptionalString,
    tomorrow_plan: commonOptionalString,
    workspace_id: workspaceId,
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({ content: z.string().optional(), focus: commonOptionalString, blockers: commonOptionalString, tomorrow_plan: commonOptionalString }).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
}

exports.flashcards = {
  decks: {
    list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
    create: z.object({ name: commonString, description: commonOptionalString, workspace_id: workspaceId }).passthrough(),
    delete: z.number().int().positive(),
  },
  cards: {
    list: z.number().int().positive(),
    create: z.object({ deck_id: z.number().int().positive(), question: commonString, answer: commonString, hint: commonOptionalString }).passthrough(),
    delete: z.number().int().positive(),
    getDue: z.number().int().positive(),
    review: z.object({ id: z.number().int().positive(), ease: z.number().int().min(0).max(5) }),
  },
  stats: {
    deck: z.number().int().positive(),
    retention: z.any().optional(),
    reviews: z.any().optional(),
    upcoming: z.any().optional(),
  },
  streak: {
    update: z.object({}).passthrough(),
    subjects: z.any().optional(),
  },
}

exports.study = {
  topics: {
    list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
    create: z.object({
      name: commonString,
      description: commonOptionalString,
      parent_id: z.number().int().positive().optional().nullable(),
      resource_url: z.string().optional().nullable(),
      workspace_id: workspaceId.optional(),
    }).passthrough(),
    update: z.object({
      0: z.number().int().positive(),
      1: z.object({ name: commonOptionalString, description: commonOptionalString, resource_url: commonOptionalString }).passthrough(),
    }).transform(a => ({ id: a[0], data: a[1] })),
    delete: z.object({ 0: z.number().int().positive() }).transform(a => a[0]),
    move: z.object({ 0: z.number(), 1: z.enum(['up', 'down']) }).transform(a => ({ id: a[0], direction: a[1] })),
    toggleProgress: z.object({ 0: z.number(), 1: z.string() }).transform(a => ({ topicId: a[0], date: a[1] })),
    setLevel: z.object({ 0: z.number(), 1: z.number().int().min(0).max(3) }).transform(a => ({ topicId: a[0], level: a[1] })),
  },
  files: {
    pickAndUpload: z.number().int().positive(),
    list: z.number().int().positive(),
    delete: z.number().int().positive(),
    open: z.number().int().positive(),
  },
  stats: z.any().optional(),
}

exports.search = {
  search: z.string(),
  reindex: z.any().optional(),
}

exports.gamification = {
  xp: {
    get: z.any().optional(),
    add: z.object({ 0: z.number(), 1: z.string() }).transform(a => ({ amount: a[0], reason: a[1] })),
    history: z.object({ 0: z.number().optional() }).transform(a => a[0]).optional(),
  },
  achievements: {
    list: z.any().optional(),
    check: z.any().optional(),
  },
  challenges: {
    list: z.any().optional(),
    updateProgress: z.object({ 0: z.string(), 1: z.number() }).transform(a => ({ type: a[0], amount: a[1] })),
  },
}

exports.streaks = {
  get: z.string(),
  update: z.string(),
}

exports.trash = {
  list: z.any().optional(),
  softDelete: z.object({ 0: z.string(), 1: z.number() }).transform(a => ({ type: a[0], id: a[1] })),
  restore: z.object({ 0: z.string(), 1: z.number() }).transform(a => ({ type: a[0], id: a[1] })),
  deletePermanent: z.object({ 0: z.string(), 1: z.number() }).transform(a => ({ type: a[0], id: a[1] })),
  empty: z.any().optional(),
}

exports.labels = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  create: z.object({ name: commonString, color: commonOptionalString }).passthrough(),
  delete: z.number().int().positive(),
  addToTask: z.object({ 0: z.number(), 1: z.number() }).transform(a => ({ taskId: a[0], labelId: a[1] })),
  removeFromTask: z.object({ 0: z.number(), 1: z.number() }).transform(a => ({ taskId: a[0], labelId: a[1] })),
  getByTask: z.number().int().positive(),
}

exports.sync = {
  wifi: {
    start: z.any().optional(),
    stop: z.any().optional(),
    discover: z.any().optional(),
    connect: z.object({ ip: z.string() }),
    pull: z.object({ ip: z.string() }),
    push: z.object({ ip: z.string() }),
  },
}

exports.backup = {
  list: z.any().optional(),
  restore: z.string(),
  export: z.any().optional(),
  import: z.any(),
  importJSON: z.any(),
}

exports.activity = {
  list: z.object({ 0: z.number().optional() }).transform(a => a[0]).optional(),
  getByEntity: z.object({ 0: z.string(), 1: z.number() }).transform(a => ({ entityType: a[0], entityId: a[1] })),
}

exports.dashboard = {
  get: z.any().optional(),
  activityFeed: z.any().optional(),
}

exports.stats = {
  get: z.object({ 0: z.string().optional() }).transform(a => a[0]).optional(),
  weeklyReport: z.any().optional(),
}

exports.automation = {
  list: z.object({ 0: workspaceId }).transform(a => a[0]).optional(),
  create: z.object({
    name: commonString,
    trigger_type: z.string(),
    trigger_config: z.any(),
    action_type: z.string(),
    action_config: z.any(),
    enabled: z.boolean().optional().default(true),
    workspace_id: workspaceId,
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({}).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.number().int().positive(),
}

exports.projects.gitStatus = z.number().int().positive()
exports.projects.openInEditor = z.object({
  id: z.number().int().positive(),
  editor: z.enum(['code', 'claude']).optional().default('code'),
}).transform(a => a)
exports.snippets.execute = z.object({
  id: z.number().int().positive(),
}).transform(a => a)
exports.app = {
  autoStart: {
    get: z.any().optional(),
    set: z.boolean(),
  },
  shortcuts: {
    register: z.object({ accelerator: z.string(), action: z.string() }),
    unregister: z.string(),
  },
  updater: {
    check: z.any().optional(),
    install: z.any().optional(),
  },
  notification: {
    show: z.object({ title: z.string(), body: z.string(), severity: z.string().optional() }),
  },
}

exports.templates = {
  list: z.string().optional(),
  create: z.object({
    type: z.enum(['project', 'kanban_board', 'study_plan']),
    name: z.string().min(1).max(500),
    description: z.string().optional().default(''),
    payload: z.string(),
  }).passthrough(),
  instantiate: z.object({
    templateId: z.number().int().positive(),
    params: z.object({}).passthrough().optional().default({}),
  }).transform(a => a),
  delete: z.number().int().positive(),
}
exports.exams = {
  list: z.number().int().positive().optional(),
  create: z.object({
    course_id: z.number().int().positive().nullable().optional(),
    title: z.string().min(1).max(500),
    date: z.string(),
    weight: z.number().min(0).max(100).nullable().optional(),
    study_topic_ids: z.string().nullable().optional(),
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({}).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.number().int().positive(),
  gpa: z.number().int().positive().optional(),
}
exports.examSimulations = {
  list: z.number().int().positive().optional(),
  create: z.object({
    deck_id: z.number().int().positive(),
    course_id: z.number().int().positive().nullable().optional(),
    total_questions: z.number().int().positive(),
    correct_answers: z.number().int().min(0),
    wrong_answers: z.number().int().min(0),
    duration_seconds: z.number().int().positive(),
  }).passthrough(),
}
exports.courses = {
  list: z.object({ 0: z.number().int().positive().optional() }).transform(a => a[0]).optional(),
  create: z.object({
    name: z.string().min(1).max(500),
    color: z.string().optional().default('#6366f1'),
    icon: z.string().optional().default('book'),
    term: z.string().optional().nullable(),
    credits: z.number().int().positive().optional().nullable(),
    target_grade: z.number().min(0).max(100).optional().nullable(),
    workspace_id: z.number().int().positive(),
  }).passthrough(),
  update: z.object({
    0: z.number().int().positive(),
    1: z.object({}).passthrough(),
  }).transform(a => ({ id: a[0], data: a[1] })),
  delete: z.number().int().positive(),
  get: z.number().int().positive(),
}

exports.ai = {
  generateFlashcards: z.object({
    sourceType: z.enum(['topic', 'note']),
    sourceId: z.number().int().positive(),
  }).transform(a => a),
  weeklySummary: z.object({}).transform(a => a).optional(),
  tutor: z.object({
    topicId: z.number().int().positive(),
    message: z.string().min(1).max(2000),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional().default([]),
  }).transform(a => a),
  validateKey: z.object({}).transform(a => a).optional(),
}
