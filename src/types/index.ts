export interface Workspace {
  id: number
  name: string
  icon: string
  color: string
  is_default: number
  sort_order: number
  deleted: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  title: string
  description: string
  completed: number
  priority: string
  due_date: string | null
  reminder: string | null
  tags?: string
  project_id: number | null
  workspace_id: number | null
  repeat: string | null
  position: number
  created_at: string
  updated_at: string
  subtasks?: Subtask[]
}

export interface Subtask {
  id: number
  task_id: number
  title: string
  completed: number
  position: number
  created_at: string
}

export interface KanbanColumn {
  id: number
  name: string
  type: string
  color: string
  wip_limit: number
  position: number
  workspace_id: number | null
  created_at: string
}

export interface KanbanCard {
  id: number
  title: string
  description: string
  column_type: string
  position: number
  priority: string
  tags: string
  due_date: string | null
  project_id: number | null
  workspace_id: number | null
  created_at: string
  updated_at: string
}

export interface PomodoroSession {
  id: number
  task_id: number | null
  project_id: number | null
  workspace_id: number | null
  duration: number
  started_at: string
  ended_at: string | null
}

export interface Exam {
  id: number
  course_id: number | null
  title: string
  date: string
  weight: number | null
  study_topic_ids: string | null
  completed: number
  grade_obtained: number | null
  created_at: string
}

export interface GpaEntry {
  course_id: number
  course_name: string
  target_grade: number | null
  course_grade: number | null
  credits: number | null
  exams_count: number
}

export interface StudyTopic {
  id: number
  parent_id: number | null
  name: string
  description: string
  resource_url: string
  order_position: number
  workspace_id: number | null
  course_id?: number | null
  study_level?: number
  study_level_updated_at?: string
}

export interface StudyFile {
  id: number
  topic_id: number
  original_name: string
  stored_name: string
  file_size: number
  mime_type: string
  created_at: string
}

export interface NoteFolder {
  id: number
  name: string
  parent_id: number | null
  color: string
  workspace_id: number | null
  created_at: string
}

export interface Note {
  id: number
  title: string
  content: string
  project_id: number | null
  folder_id: number | null
  workspace_id: number | null
  deleted: number
  created_at: string
  updated_at: string
}

export interface Goal {
  id: number
  title: string
  type: string
  target: number
  metric: string
  workspace_id: number | null
  created_at: string
}

export interface GoalProgress {
  id: number
  goal_id: number
  date: string
  value: number
}

export interface Streak {
  id: number
  name: string
  current: number
  max: number
  updated_at: string
}

export interface Course {
  id: number
  workspace_id: number
  name: string
  color: string
  icon: string
  term: string | null
  credits: number | null
  target_grade: number | null
  archived: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  name: string
  description: string
  status: string
  tech_stack: string
  repo_url: string
  color: string
  workspace_id: number | null
  deleted: number
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: number
  date: string
  content: string
  focus: string
  blockers: string
  tomorrow_plan: string
  workspace_id: number | null
  created_at: string
}

export interface Snippet {
  id: number
  title: string
  code: string
  language: string
  description: string
  tags: string
  project_id: number | null
  workspace_id: number | null
  created_at: string
}

export interface Habit {
  id: number
  name: string
  icon: string
  color: string
  frequency: string
  workspace_id: number | null
  created_at: string
}

export interface HabitLog {
  id: number
  habit_id: number
  date: string
  completed: number
}

export interface TaskComment {
  id: number
  task_id: number
  content: string
  created_at: string
}

export interface TaskRef {
  id: number
  title: string
}

export interface TimeEntry {
  id: number
  task_id: number
  start_time: string
  end_time: string | null
  duration: number
  created_at: string
}

export interface Challenge {
  id: number
  key: string
  name: string
  description: string
  icon: string
  requirement_type: string
  requirement_count: number
  period: string
  xp_reward: number
  progress: number
  completed: number
  target: number
}

export interface WeeklyReport {
  weekStart: string
  pomodoros: number
  tasksCompleted: number
  xpEarned: number
  streakMax: number
}

export interface Stats {
  pomodoroCount: { count: number; total: number }
  tasksCompleted: { count: number }
  tasksTotal: { count: number }
  dailyPomodoros: Array<{ date: string; count: number }>
}

export interface EntityLink {
  id: number
  name: string
  linkType: string
}

export interface DashboardData {
  pomodorosToday: number
  tasksToday: number
  tasksPending: number
  upcomingTasks: Array<{ id: number; title: string; due_date: string | null }>
  xp: { total: number; level: number; currentXp: number; nextLevelXp: number }
  streak: { current: number; max: number }
  totalPomodoros: number
  totalTasks: number
}

export interface FlashcardDeck {
  id: number; name: string; description: string; workspace_id: number | null; course_id?: number | null; card_count: number; created_at: string
}
export interface Flashcard {
  id: number; deck_id: number; front: string; back: string; hint: string;
  difficulty: number; ease_factor: number; repetitions: number;
  interval: number; next_review: string; created_at: string
}

declare global {
  interface Window {
    electronAPI: {
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<boolean>
      }
      workspaces: {
        list: () => Promise<Workspace[]>
        getActive: () => Promise<Workspace | null>
        setActive: (id: number) => Promise<boolean>
        create: (data: Partial<Workspace>) => Promise<Workspace>
        update: (id: number, data: Partial<Workspace>) => Promise<Workspace>
        delete: (id: number) => Promise<boolean>
        getEntities: (wsId: number) => Promise<Record<string, number>>
      }
      projects: {
        list: (wsId?: number) => Promise<Project[]>
        create: (data: Partial<Project>) => Promise<Project>
        update: (id: number, data: Partial<Project>) => Promise<Project>
        delete: (id: number) => Promise<boolean>
        gitStatus: (id: number) => Promise<{ clean: boolean; branch: string }>
        openInEditor: (id: number, editor: string) => Promise<boolean>
      }
      tasks: {
        list: (wsId?: number) => Promise<Task[]>
        listWithSubtasks: (wsId?: number) => Promise<Task[]>
        create: (task: Partial<Task>) => Promise<Task>
        update: (id: number, data: Partial<Task>) => Promise<Task>
        delete: (id: number) => Promise<boolean>
        toggle: (id: number) => Promise<Task>
        reorder: (orderedIds: number[]) => Promise<boolean>
        addTag: (taskId: number, tag: string) => Promise<boolean>
        removeTag: (taskId: number, tag: string) => Promise<boolean>
        getByTag: (tag: string) => Promise<Task[]>
        dependencies: {
          get: (taskId: number) => Promise<TaskRef[]>
          getDependents: (taskId: number) => Promise<TaskRef[]>
          add: (taskId: number, dependsOnId: number) => Promise<boolean>
          remove: (taskId: number, dependsOnId: number) => Promise<boolean>
        }
        comments: {
          list: (taskId: number) => Promise<TaskComment[]>
          add: (taskId: number, content: string) => Promise<TaskComment>
          delete: (id: number) => Promise<boolean>
        }
        timeTracking: {
          list: (taskId: number) => Promise<TimeEntry[]>
          start: (taskId: number) => Promise<TimeEntry>
          stop: (id: number) => Promise<TimeEntry>
          delete: (id: number) => Promise<boolean>
          total: (taskId: number) => Promise<number>
        }
      }
      subtasks: {
        list: (taskId: number) => Promise<Subtask[]>
        create: (subtask: Partial<Subtask>) => Promise<Subtask>
        toggle: (id: number) => Promise<Subtask>
        delete: (id: number) => Promise<boolean>
      }
      kanban: {
        cards: {
          list: (wsId?: number) => Promise<KanbanCard[]>
          create: (card: Partial<KanbanCard>) => Promise<KanbanCard>
          update: (id: number, data: Partial<KanbanCard>) => Promise<KanbanCard>
          delete: (id: number) => Promise<boolean>
          move: (id: number, column: string, position: number) => Promise<KanbanCard>
        }
        columns: {
          list: (wsId?: number) => Promise<KanbanColumn[]>
          create: (data: Partial<KanbanColumn>) => Promise<KanbanColumn>
          update: (id: number, data: Partial<KanbanColumn>) => Promise<KanbanColumn>
          delete: (id: number) => Promise<boolean>
        }
      }
      notes: {
        list: (wsId?: number) => Promise<Note[]>
        create: (note: Partial<Note>) => Promise<Note>
        update: (id: number, data: Partial<Note>) => Promise<Note>
        delete: (id: number) => Promise<boolean>
        folders: {
          list: (wsId?: number) => Promise<NoteFolder[]>
          create: (data: Partial<NoteFolder>) => Promise<NoteFolder>
          update: (id: number, data: Partial<NoteFolder>) => Promise<NoteFolder>
          delete: (id: number) => Promise<boolean>
        }
      }
      habits: {
        list: (wsId?: number) => Promise<Habit[]>
        create: (habit: Partial<Habit>) => Promise<Habit>
        update: (id: number, data: Partial<Habit>) => Promise<Habit>
        delete: (id: number) => Promise<boolean>
        logs: {
          list: (habitId: number) => Promise<HabitLog[]>
          listAll: () => Promise<HabitLog[]>
          toggle: (habitId: number, date: string) => Promise<boolean>
        }
        stats: () => Promise<Array<{ id: number; name: string; completionRate: number }>>
      }
      goals: {
        list: (wsId?: number) => Promise<Goal[]>
        create: (goal: Partial<Goal>) => Promise<Goal>
        update: (id: number, data: Partial<Goal>) => Promise<Goal>
        delete: (id: number) => Promise<boolean>
        progress: {
          add: (goalId: number, date: string, value: number) => Promise<boolean>
          get: (goalId: number, today: string) => Promise<number>
        }
      }
      snippets: {
        list: (wsId?: number) => Promise<Snippet[]>
        create: (snippet: Partial<Snippet>) => Promise<Snippet>
        update: (id: number, data: Partial<Snippet>) => Promise<Snippet>
        delete: (id: number) => Promise<boolean>
        execute: (id: number) => Promise<{ stdout: string; stderr: string; exitCode: number }>
      }
      flashcards: {
        decks: {
          list: (wsId?: number) => Promise<FlashcardDeck[]>
          create: (data: { name: string; description?: string; course_id?: number | null }) => Promise<FlashcardDeck>
          delete: (id: number) => Promise<boolean>
        }
        cards: {
          list: (deckId: number) => Promise<Flashcard[]>
          create: (data: { deck_id: number; front: string; back: string; hint?: string }) => Promise<Flashcard>
          delete: (id: number) => Promise<boolean>
          getDue: (deckId: number) => Promise<Flashcard[]>
          review: (data: { id: number; ease: number }) => Promise<Flashcard>
        }
        stats: {
          deck: (deckId: number) => Promise<{ total: number; due: number; reviewed: number }>
          retention: () => Promise<{ total: number; easy: number; hard: number; retentionRate: number }>
          reviews: () => Promise<{ totalDue: number; reviewedToday: number; totalCards: number; retention: number; streak: number }>
          upcoming: () => Promise<Array<{ date: string; count: number; label: string }>>
        }
        streak: {
          update: (data: { studied: boolean }) => Promise<{ streak: number }>
          subjects: () => Promise<Array<{ id: number; name: string; color: string; current: number; max: number; heatmap: Array<{ date: string; count: number }> }>>
        }
      }
      study: {
        topics: {
          list: (wsId?: number) => Promise<StudyTopic[]>
          create: (topic: Partial<StudyTopic>) => Promise<StudyTopic>
          update: (id: number, data: Partial<StudyTopic>) => Promise<StudyTopic>
          delete: (id: number) => Promise<boolean>
          move: (id: number, direction: 'up' | 'down') => Promise<boolean>
          toggleProgress: (topicId: number, date: string) => Promise<boolean>
          setLevel: (topicId: number, level: number) => Promise<boolean>
        }
        files: {
          pickAndUpload: (topicId: number) => Promise<StudyFile | null>
          list: (topicId: number) => Promise<StudyFile[]>
          delete: (fileId: number) => Promise<boolean>
          open: (fileId: number) => Promise<boolean>
        }
        stats: () => Promise<{ levels: Array<{ study_level: number; count: number }>; total: number }>
      }
      pomodoro: {
        sessions: {
          list: (date?: string) => Promise<PomodoroSession[]>
          create: (session: Partial<PomodoroSession>) => Promise<PomodoroSession>
        }
      }
      search: (query: string) => Promise<Array<{ id: number; name: string; type: string }>>
      gamification: {
        xp: {
          get: () => Promise<{ total: number; level: number; currentXp: number; nextLevelXp: number }>
          add: (amount: number, reason: string) => Promise<{ total: number; level: number; currentXp: number; nextLevelXp: number; leveledUp: boolean }>
          history: (days?: number) => Promise<Array<{ date: string; xp: number }>>
        }
        achievements: {
          list: () => Promise<Array<{ id: number; key: string; name: string; description: string; icon: string; xp_reward: number; unlocked: number }>>
          check: () => Promise<{ unlocked: Array<{ id: number; key: string; name: string; icon: string; xp_reward: number }>; leveledUp: boolean; newLevel: number }>
        }
        challenges: {
          list: () => Promise<Challenge[]>
          updateProgress: (type: string, amount: number) => Promise<void>
        }
      }
      streaks: {
        get: (name: string) => Promise<Streak | undefined>
        update: (name: string) => Promise<{ current: number; max: number }>
      }
      dailyLogs: {
        list: (wsId?: number) => Promise<DailyLog[]>
        get: (date: string) => Promise<DailyLog | undefined>
        create: (log: Partial<DailyLog>) => Promise<DailyLog>
        update: (id: number, data: Partial<DailyLog>) => Promise<DailyLog>
      }
      trash: {
        list: () => Promise<{ tasks: Task[]; notes: Note[]; projects: Project[] }>
        softDelete: (type: string, id: number) => Promise<boolean>
        restore: (type: string, id: number) => Promise<boolean>
        deletePermanent: (type: string, id: number) => Promise<boolean>
        empty: () => Promise<boolean>
      }
      export: {
        data: () => Promise<Record<string, unknown[]>>
        import: (data: Record<string, unknown[]>) => Promise<boolean>
        importJSON: (data: unknown) => Promise<boolean>
        noteMarkdown: (noteId: number) => Promise<string>
      }
      searchReindex: () => Promise<boolean>
      backup: {
        list: () => Promise<Array<{ date: string; filename: string; size: number }>>
        restore: (filename: string) => Promise<boolean>
      }
      entity: {
        link: (fromType: string, fromId: number, toType: string, toId: number) => Promise<boolean>
        getLinks: (type: string, id: number) => Promise<Array<{ id: number; from_type: string; from_id: number; to_type: string; to_id: number }>>
      }
      tray: {
        updateMenu: () => Promise<boolean>
      }
      events: {
        onTrayAction: (callback: (action: string) => void) => () => void
        onUpdateStatus: (callback: (data: { status: string; percent?: number }) => void) => () => void
        onWifiDeviceFound: (callback: (data: { name: string; ip: string; port: number }) => void) => () => void
        onReminderNotification: (callback: (data: { id: number; title: string }) => void) => () => void
        subscribe: (channel: string, callback: (data: unknown) => void) => () => void
      }
      app: {
        autoStart: {
          get: () => Promise<boolean>
          set: (enabled: boolean) => Promise<boolean>
        }
        shortcuts: {
          register: (accelerator: string, action: string) => Promise<boolean>
          unregister: (accelerator: string) => Promise<boolean>
        }
        updater: {
          check: () => Promise<void>
          install: () => Promise<void>
        }
        notification: {
          show: (title: string, body: string, severity?: string) => Promise<boolean>
        }
      }
      wifiSync: {
        start: () => Promise<{ ok: boolean; port: number }>
        stop: () => Promise<{ ok: boolean }>
        discover: () => Promise<Array<{ ip: string; name: string }>>
        connect: (ip: string) => Promise<{ name: string; app: string; version: string }>
        pull: (ip: string) => Promise<{ ok: boolean }>
        push: (ip: string) => Promise<{ ok: boolean }>
      }
      utils: {
        linkEntities: (fromType: string, fromId: number, toType: string, toId: number) => Promise<boolean>
        getEntityLinks: (type: string, id: number) => Promise<EntityLink[]>
        importICSEvents: (events: Array<{ title: string; description: string; startDate: string }>) => Promise<Array<{ id: number; title: string }>>
      }
      dashboard: {
        get: () => Promise<DashboardData>
        activityFeed: () => Promise<Array<{ id: number; type: string; entity_type: string; entity_id: number; description: string; created_at: string }>>
      }
      stats: {
        get: (period: string) => Promise<Stats>
        weeklyReport: () => Promise<WeeklyReport>
      }
      labels: {
        list: (wsId?: number) => Promise<Array<{ id: number; name: string; color: string; workspace_id: number | null }>>
        create: (data: { name: string; color: string }) => Promise<{ id: number; name: string; color: string; workspace_id: number | null }>
        delete: (id: number) => Promise<boolean>
        addToTask: (taskId: number, labelId: number) => Promise<boolean>
        removeFromTask: (taskId: number, labelId: number) => Promise<boolean>
        getByTask: (taskId: number) => Promise<Array<{ id: number; name: string; color: string }>>
      }
      activity: {
        list: (limit?: number) => Promise<Array<{ id: number; type: string; entity_type: string; entity_id: number; description: string; created_at: string }>>
        getByEntity: (entityType: string, entityId: number) => Promise<Array<{ id: number; type: string; description: string; created_at: string }>>
      }
      session: {
        save: (state: unknown) => Promise<boolean>
        restore: () => Promise<unknown>
        onRestored: (callback: (data: unknown) => void) => () => void
      }
      automation: {
        list: (wsId?: number) => Promise<Array<{ id: number; name: string; trigger: string; action: string; workspace_id: number | null; active: number }>>
        create: (data: Record<string, unknown>) => Promise<{ id: number; name: string }>
        update: (id: number, data: Record<string, unknown>) => Promise<{ id: number }>
        delete: (id: number) => Promise<boolean>
      }
      courses: {
        list: (wsId?: number) => Promise<Course[]>
        create: (data: Partial<Course>) => Promise<Course>
        update: (id: number, data: Partial<Course>) => Promise<Course>
        delete: (id: number) => Promise<boolean>
        get: (id: number) => Promise<Course | null>
      }
      templates: {
        list: (type?: string) => Promise<Array<{ id: number; name: string; type: string; data: string; created_at: string }>>
        create: (data: { name: string; type: string; data: string }) => Promise<{ id: number; name: string; type: string }>
        instantiate: (templateId: number, params: Record<string, unknown>) => Promise<{ projects: number[]; studyTopics: number[] }>
        delete: (id: number) => Promise<boolean>
      }
      exams: {
        list: (courseId?: number) => Promise<Exam[]>
        create: (data: Record<string, unknown>) => Promise<Exam>
        update: (id: number, data: Record<string, unknown>) => Promise<Exam>
        delete: (id: number) => Promise<boolean>
        gpa: (courseId?: number) => Promise<GpaEntry[] | GpaEntry | null>
      }
      examSimulations: {
        list: (deckId?: number) => Promise<Array<{ id: number; name: string; score: number }>>
        create: (data: Record<string, unknown>) => Promise<{ id: number; name: string }>
      }
      ai: {
        generateFlashcards: (sourceType: string, sourceId: number) => Promise<Array<{ front: string; back: string }>>
        weeklySummary: () => Promise<{ summary: string }>
        tutor: (topicId: number, message: string, history?: Array<{ role: string; content: string }>) => Promise<string>
        validateKey: () => Promise<{ valid: boolean }>
        listModels: () => Promise<string[]>
      }
      profiler: {
        getReport: () => Promise<Record<string, unknown>>
        reset: () => Promise<boolean>
      }
      perf: {
        getMode: () => Promise<string>
        setMode: (mode: string) => Promise<boolean>
        getConfig: () => Promise<Record<string, unknown>>
        getModes: () => Promise<Array<{ id: string; name: string }>>
      }
      perfMonitor: {
        start: (interval?: number) => Promise<boolean>
        stop: () => Promise<boolean>
        getReport: () => Promise<Record<string, unknown>>
        getLatest: () => Promise<Record<string, unknown>>
        collectSample: () => Promise<Record<string, unknown>>
      }
      preload: {
        recordTransition: (fromModule: string, toModule: string, wsId?: number) => Promise<boolean>
        getStats: () => Promise<Record<string, number>>
        setLevel: (level: string) => Promise<boolean>
      }
      pin: {
        set: (pin: string) => Promise<boolean>
        verify: (pin: string) => Promise<{ ok: boolean; message?: string; locked?: boolean }>
        disable: () => Promise<boolean>
        isEnabled: () => Promise<boolean>
        isLocked: () => Promise<boolean>
      }
      plugins: {
        list: () => Promise<Array<{ id: string; name: string; version: string }>>
        get: (id: string) => Promise<{ id: string; name: string; version: string }>
        load: (id: string) => Promise<boolean>
        unload: (id: string) => Promise<boolean>
        isActive: (id: string) => Promise<boolean>
      }
      encryption: {
        encrypt: (text: string) => Promise<string>
        decrypt: (data: string) => Promise<string>
        hash: (data: string) => Promise<string>
        generateKey: () => Promise<string>
      }
    }
    __confirmDelete?: (type: string, id: number, title: string, onConfirm?: () => void) => void
    __exitFocusMode?: () => void
  }
}