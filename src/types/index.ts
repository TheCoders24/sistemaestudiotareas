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
  ended_at: string
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
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<boolean>

      // Tasks
      getTasks: (wsId?: number) => Promise<Task[]>
      getTasksWithSubtasks: (wsId?: number) => Promise<Task[]>
      createTask: (task: Partial<Task>) => Promise<Task>
      updateTask: (id: number, data: Partial<Task>) => Promise<Task>
      deleteTask: (id: number) => Promise<boolean>
      toggleTask: (id: number) => Promise<Task>
      reorderTasks: (orderedIds: number[]) => Promise<boolean>
      addTagToTask: (taskId: number, tag: string) => Promise<boolean>
      removeTagFromTask: (taskId: number, tag: string) => Promise<boolean>
      getTasksByTag: (tag: string) => Promise<Task[]>

      // Kanban
      getKanbanCards: (wsId?: number) => Promise<KanbanCard[]>
      createKanbanCard: (card: Partial<KanbanCard>) => Promise<KanbanCard>
      updateKanbanCard: (id: number, data: Partial<KanbanCard>) => Promise<KanbanCard>
      deleteKanbanCard: (id: number) => Promise<boolean>
      moveKanbanCard: (id: number, column: string, position: number) => Promise<KanbanCard>

      // Pomodoro
      getPomodoroSessions: (date?: string) => Promise<PomodoroSession[]>
      createPomodoroSession: (session: Partial<PomodoroSession>) => Promise<PomodoroSession>

      // Study Topics
      getStudyTopics: (wsId?: number) => Promise<StudyTopic[]>
      createStudyTopic: (topic: Partial<StudyTopic>) => Promise<StudyTopic>
      updateStudyTopic: (id: number, data: Partial<StudyTopic>) => Promise<StudyTopic>
      deleteStudyTopic: (id: number) => Promise<boolean>
      toggleStudyProgress: (topicId: number, date: string) => Promise<boolean>
      setStudyLevel: (topicId: number, level: number) => Promise<boolean>
      getStudyStats: () => Promise<{ levels: { study_level: number, count: number }[], total: number }>
      moveStudyTopic: (id: number, direction: 'up' | 'down') => Promise<boolean>

      // Study Files
      pickAndUploadFile: (topicId: number) => Promise<StudyFile | null>
      getTopicFiles: (topicId: number) => Promise<StudyFile[]>
      deleteFile: (fileId: number) => Promise<boolean>
      openFile: (fileId: number) => Promise<boolean>

      // Notes
      getNotes: (wsId?: number) => Promise<Note[]>
      createNote: (note: Partial<Note>) => Promise<Note>
      updateNote: (id: number, data: Partial<Note>) => Promise<Note>
      deleteNote: (id: number) => Promise<boolean>

      // Goals
      getGoals: (wsId?: number) => Promise<Goal[]>
      createGoal: (goal: Partial<Goal>) => Promise<Goal>
      updateGoal: (id: number, data: Partial<Goal>) => Promise<Goal>
      deleteGoal: (id: number) => Promise<boolean>
      addGoalProgress: (goalId: number, date: string, value: number) => Promise<boolean>
      getGoalProgress: (goalId: number, today: string) => Promise<number>

      // Streaks
      getStreak: (name: string) => Promise<Streak | undefined>
      updateStreak: (name: string) => Promise<{ current: number; max: number }>

      // Statistics
      getStats: (period: string) => Promise<Stats>

      // Notifications
      showNotification: (title: string, body: string) => Promise<boolean>

      // Export/Import
      exportData: () => Promise<Record<string, unknown[]>>
      importData: (data: Record<string, unknown[]>) => Promise<boolean>
      listBackups: () => Promise<{ date: string, filename: string, size: number }[]>
      restoreBackup: (filename: string) => Promise<boolean>

      // Projects
      getProjects: (wsId?: number) => Promise<Project[]>
      createProject: (project: Partial<Project>) => Promise<Project>
      updateProject: (id: number, data: Partial<Project>) => Promise<Project>
      deleteProject: (id: number) => Promise<boolean>

      // Daily Logs
      getDailyLogs: (wsId?: number) => Promise<DailyLog[]>
      getDailyLog: (date: string) => Promise<DailyLog | undefined>
      createDailyLog: (log: Partial<DailyLog>) => Promise<DailyLog>
      updateDailyLog: (id: number, data: Partial<DailyLog>) => Promise<DailyLog>

      // Snippets
      getSnippets: (wsId?: number) => Promise<Snippet[]>
      createSnippet: (snippet: Partial<Snippet>) => Promise<Snippet>
      updateSnippet: (id: number, data: Partial<Snippet>) => Promise<Snippet>
      deleteSnippet: (id: number) => Promise<boolean>

      // Habits
      getHabits: (wsId?: number) => Promise<Habit[]>
      createHabit: (habit: Partial<Habit>) => Promise<Habit>
      updateHabit: (id: number, data: Partial<Habit>) => Promise<Habit>
      deleteHabit: (id: number) => Promise<boolean>
      getHabitLogs: (habitId: number) => Promise<HabitLog[]>
      toggleHabitLog: (habitId: number, date: string) => Promise<HabitLog>
      getAllHabitLogs: () => Promise<HabitLog[]>

      // Search
      search: (query: string) => Promise<Array<{ id: number; name: string; type: string }>>

      // XP / Gamification
      getXp: () => Promise<{ total: number; level: number; currentXp: number; nextLevelXp: number }>
      addXp: (amount: number, reason: string) => Promise<{ total: number; level: number; currentXp: number; nextLevelXp: number; leveledUp: boolean }>
      getXpHistory: (days?: number) => Promise<Array<{ date: string; xp: number }>>
      getAchievements: () => Promise<Array<{ id: number; key: string; name: string; description: string; icon: string; xp_reward: number; unlocked: number }>>
      checkAchievements: () => Promise<{ unlocked: Array<{ id: number; key: string; name: string; icon: string; xp_reward: number }>; leveledUp: boolean; newLevel: number }>

      // Subtasks
      getSubtasks: (taskId: number) => Promise<Subtask[]>
      createSubtask: (subtask: Partial<Subtask>) => Promise<Subtask>
      toggleSubtask: (id: number) => Promise<Subtask>
      deleteSubtask: (id: number) => Promise<boolean>

      // Trash / Soft Delete
      softDeleteItem: (type: string, id: number) => Promise<boolean>
      getTrashItems: () => Promise<{ tasks: any[]; notes: any[]; projects: any[] }>
      restoreItem: (type: string, id: number) => Promise<boolean>
      deleteItemPermanent: (type: string, id: number) => Promise<boolean>
      emptyTrash: () => Promise<boolean>

      // Note Folders
      getNoteFolders: (wsId?: number) => Promise<NoteFolder[]>
      createNoteFolder: (data: Partial<NoteFolder>) => Promise<NoteFolder>
      updateNoteFolder: (id: number, data: Partial<NoteFolder>) => Promise<NoteFolder>
      deleteNoteFolder: (id: number) => Promise<boolean>

      // Task Dependencies
      getTaskDependencies: (taskId: number) => Promise<TaskRef[]>
      getTaskDependents: (taskId: number) => Promise<TaskRef[]>
      addTaskDependency: (taskId: number, dependsOnId: number) => Promise<boolean>
      removeTaskDependency: (taskId: number, dependsOnId: number) => Promise<boolean>

      // Task Comments
      getTaskComments: (taskId: number) => Promise<TaskComment[]>
      addTaskComment: (taskId: number, content: string) => Promise<TaskComment>
      deleteTaskComment: (id: number) => Promise<boolean>

      // Time Tracking
      getTimeEntries: (taskId: number) => Promise<TimeEntry[]>
      startTimeEntry: (taskId: number) => Promise<TimeEntry>
      stopTimeEntry: (id: number) => Promise<TimeEntry>
      deleteTimeEntry: (id: number) => Promise<boolean>
      getTotalTrackedTime: (taskId: number) => Promise<number>

      // Entity Links
      linkEntities: (fromType: string, fromId: number, toType: string, toId: number) => Promise<boolean>
      getEntityLinks: (type: string, id: number) => Promise<any[]>

      // Challenges
      getChallenges: () => Promise<Challenge[]>
      updateChallengeProgress: (type: string, amount: number) => Promise<void>

      // Weekly Report
      getWeeklyReport: () => Promise<WeeklyReport>

      // Dashboard
      getDashboard: () => Promise<DashboardData>
      getActivityFeed: () => Promise<any[]>
      getHabitStats: () => Promise<any[]>

      // Flashcards
      getFlashcardDecks: (wsId?: number) => Promise<FlashcardDeck[]>
      createFlashcardDeck: (data: { name: string; description?: string }) => Promise<FlashcardDeck>
      deleteFlashcardDeck: (id: number) => Promise<boolean>
      getFlashcards: (deckId: number) => Promise<Flashcard[]>
      createFlashcard: (data: { deck_id: number; front: string; back: string; hint?: string }) => Promise<Flashcard>
      deleteFlashcard: (id: number) => Promise<boolean>
      getDueFlashcards: (deckId: number) => Promise<Flashcard[]>
      reviewFlashcard: (data: { id: number; ease: number }) => Promise<Flashcard>
      getFlashcardStats: (deckId: number) => Promise<{ total: number; due: number; reviewed: number }>
      getRetentionStats: () => Promise<{ total: number; easy: number; hard: number; retentionRate: number }>
      getFlashcardReviewStats: () => Promise<{ totalDue: number; reviewedToday: number; totalCards: number; retention: number; streak: number }>
      getUpcomingFlashcardReviews: () => Promise<{ date: string; count: number; label: string }[]>
      updateFlashcardStreak: (data: { studied: boolean }) => Promise<{ streak: number }>
      getSubjectStreaks: () => Promise<{ id: number; name: string; color: string; current: number; max: number; heatmap: { date: string; count: number }[] }[]>
      importICSEvents: (events: { title: string; description: string; startDate: string }[]) => Promise<{ id: number; title: string }[]>
      // Kanban Columns
      getKanbanColumns: (wsId?: number) => Promise<KanbanColumn[]>
      createKanbanColumn: (data: Partial<KanbanColumn>) => Promise<KanbanColumn>
      updateKanbanColumn: (id: number, data: Partial<KanbanColumn>) => Promise<KanbanColumn>
      deleteKanbanColumn: (id: number) => Promise<boolean>

      // Workspaces
      getWorkspaces: () => Promise<Workspace[]>
      createWorkspace: (data: Partial<Workspace>) => Promise<Workspace>
      updateWorkspace: (id: number, data: Partial<Workspace>) => Promise<Workspace>
      deleteWorkspace: (id: number) => Promise<boolean>
      getActiveWorkspace: () => Promise<Workspace | null>
      setActiveWorkspace: (id: number) => Promise<boolean>
      getWorkspaceEntities: (wsId: number) => Promise<Record<string, number>>

      // Courses
      courses: {
        list: (wsId?: number) => Promise<Course[]>
        create: (data: Partial<Course>) => Promise<Course>
        update: (id: number, data: Partial<Course>) => Promise<Course>
        delete: (id: number) => Promise<boolean>
        get: (id: number) => Promise<Course | null>
      }

      startWifiSync: () => Promise<{ ok: boolean; port: number }>
      stopWifiSync: () => Promise<{ ok: boolean }>
      discoverWifiSync: () => Promise<{ ip: string; name: string }[]>
      connectWifiSync: (ip: string) => Promise<{ name: string; app: string; version: string }>
      pullWifiSync: (ip: string) => Promise<{ ok: boolean }>
      pushWifiSync: (ip: string) => Promise<{ ok: boolean }>
      onWifiSyncDevice?: (callback: (data: { name: string; ip: string; port: number }) => void) => void
      restoreFromJSON: (data: any) => Promise<boolean>
      onTrayAction?: (callback: (action: string) => void) => void
      getAutoStart?: () => Promise<boolean>
      setAutoStart?: (enabled: boolean) => Promise<boolean>
      registerShortcut?: (accelerator: string, action: string) => Promise<boolean>
      unregisterShortcut?: (accelerator: string) => Promise<boolean>
      checkForUpdates?: () => Promise<void>
      installUpdate?: () => Promise<void>
      onUpdateStatus?: (callback: (data: { status: string; percent?: number }) => void) => void
    }
    __confirmDelete?: (type: string, id: number, title: string) => void
    __exitFocusMode?: () => void
    __reminderNotification?: (title: string) => void
  }
}