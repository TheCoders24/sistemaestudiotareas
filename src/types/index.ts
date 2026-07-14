export interface Task {
  id: number
  title: string
  description: string
  completed: number
  priority: string
  due_date: string | null
  reminder: string | null
  project_id: number | null
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
  created_at: string
  updated_at: string
}

export interface PomodoroSession {
  id: number
  task_id: number | null
  project_id: number | null
  duration: number
  started_at: string
  ended_at: string
}

export interface StudyTopic {
  id: number
  parent_id: number | null
  name: string
  description: string
  order_position: number
}

export interface Note {
  id: number
  title: string
  content: string
  project_id: number | null
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

export interface Project {
  id: number
  name: string
  description: string
  status: string
  tech_stack: string
  repo_url: string
  color: string
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
  created_at: string
}

export interface Habit {
  id: number
  name: string
  icon: string
  color: string
  frequency: string
  created_at: string
}

export interface HabitLog {
  id: number
  habit_id: number
  date: string
  completed: number
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

declare global {
  interface Window {
    electronAPI: {
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<boolean>

      // Tasks
      getTasks: () => Promise<Task[]>
      getTasksWithSubtasks: () => Promise<Task[]>
      createTask: (task: Partial<Task>) => Promise<Task>
      updateTask: (id: number, data: Partial<Task>) => Promise<Task>
      deleteTask: (id: number) => Promise<boolean>
      toggleTask: (id: number) => Promise<Task>
      reorderTasks: (orderedIds: number[]) => Promise<boolean>

      // Kanban
      getKanbanCards: () => Promise<KanbanCard[]>
      createKanbanCard: (card: Partial<KanbanCard>) => Promise<KanbanCard>
      updateKanbanCard: (id: number, data: Partial<KanbanCard>) => Promise<KanbanCard>
      deleteKanbanCard: (id: number) => Promise<boolean>
      moveKanbanCard: (id: number, column: string, position: number) => Promise<KanbanCard>

      // Pomodoro
      getPomodoroSessions: (date?: string) => Promise<PomodoroSession[]>
      createPomodoroSession: (session: Partial<PomodoroSession>) => Promise<PomodoroSession>

      // Study Topics
      getStudyTopics: () => Promise<StudyTopic[]>
      createStudyTopic: (topic: Partial<StudyTopic>) => Promise<StudyTopic>
      updateStudyTopic: (id: number, data: Partial<StudyTopic>) => Promise<StudyTopic>
      deleteStudyTopic: (id: number) => Promise<boolean>
      toggleStudyProgress: (topicId: number, date: string) => Promise<boolean>

      // Notes
      getNotes: () => Promise<Note[]>
      createNote: (note: Partial<Note>) => Promise<Note>
      updateNote: (id: number, data: Partial<Note>) => Promise<Note>
      deleteNote: (id: number) => Promise<boolean>

      // Goals
      getGoals: () => Promise<Goal[]>
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

      // Projects
      getProjects: () => Promise<Project[]>
      createProject: (project: Partial<Project>) => Promise<Project>
      updateProject: (id: number, data: Partial<Project>) => Promise<Project>
      deleteProject: (id: number) => Promise<boolean>

      // Daily Logs
      getDailyLogs: () => Promise<DailyLog[]>
      getDailyLog: (date: string) => Promise<DailyLog | undefined>
      createDailyLog: (log: Partial<DailyLog>) => Promise<DailyLog>
      updateDailyLog: (id: number, data: Partial<DailyLog>) => Promise<DailyLog>

      // Snippets
      getSnippets: () => Promise<Snippet[]>
      createSnippet: (snippet: Partial<Snippet>) => Promise<Snippet>
      updateSnippet: (id: number, data: Partial<Snippet>) => Promise<Snippet>
      deleteSnippet: (id: number) => Promise<boolean>

      // Habits
      getHabits: () => Promise<Habit[]>
      createHabit: (habit: Partial<Habit>) => Promise<Habit>
      updateHabit: (id: number, data: Partial<Habit>) => Promise<Habit>
      deleteHabit: (id: number) => Promise<boolean>
      getHabitLogs: (habitId: number) => Promise<HabitLog[]>
      toggleHabitLog: (habitId: number, date: string) => Promise<boolean>

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
    }
    __confirmDelete?: (type: string, id: number, title: string) => void
    __exitFocusMode?: () => void
    __reminderNotification?: (title: string) => void
  }
}