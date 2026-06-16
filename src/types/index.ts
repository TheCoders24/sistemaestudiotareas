export interface Task {
  id: number
  title: string
  description: string
  completed: number
  priority: string
  due_date: string | null
  reminder: string | null
  project_id: number | null
  created_at: string
  updated_at: string
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

export interface Stats {
  pomodoroCount: { count: number; total: number }
  tasksCompleted: { count: number }
  tasksTotal: { count: number }
  dailyPomodoros: Array<{ date: string; count: number }>
}

declare global {
  interface Window {
    electronAPI: {
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<boolean>

      getTasks: () => Promise<Task[]>
      createTask: (task: Partial<Task>) => Promise<Task>
      updateTask: (id: number, data: Partial<Task>) => Promise<Task>
      deleteTask: (id: number) => Promise<boolean>
      toggleTask: (id: number) => Promise<Task>

      getKanbanCards: () => Promise<KanbanCard[]>
      createKanbanCard: (card: Partial<KanbanCard>) => Promise<KanbanCard>
      updateKanbanCard: (id: number, data: Partial<KanbanCard>) => Promise<KanbanCard>
      deleteKanbanCard: (id: number) => Promise<boolean>
      moveKanbanCard: (id: number, column: string, position: number) => Promise<KanbanCard>

      getPomodoroSessions: (date?: string) => Promise<PomodoroSession[]>
      createPomodoroSession: (session: Partial<PomodoroSession>) => Promise<PomodoroSession>

      getStudyTopics: () => Promise<StudyTopic[]>
      createStudyTopic: (topic: Partial<StudyTopic>) => Promise<StudyTopic>
      updateStudyTopic: (id: number, data: Partial<StudyTopic>) => Promise<StudyTopic>
      deleteStudyTopic: (id: number) => Promise<boolean>
      toggleStudyProgress: (topicId: number, date: string) => Promise<boolean>

      getNotes: () => Promise<Note[]>
      createNote: (note: Partial<Note>) => Promise<Note>
      updateNote: (id: number, data: Partial<Note>) => Promise<Note>
      deleteNote: (id: number) => Promise<boolean>

      getGoals: () => Promise<Goal[]>
      createGoal: (goal: Partial<Goal>) => Promise<Goal>
      updateGoal: (id: number, data: Partial<Goal>) => Promise<Goal>
      deleteGoal: (id: number) => Promise<boolean>
      addGoalProgress: (goalId: number, date: string, value: number) => Promise<boolean>

      getStreak: (name: string) => Promise<Streak | undefined>
      updateStreak: (name: string) => Promise<{ current: number; max: number }>

      getStats: (period: string) => Promise<Stats>
      showNotification: (title: string, body: string) => Promise<boolean>

      exportData: () => Promise<Record<string, unknown[]>>
      importData: (data: Record<string, unknown[]>) => Promise<boolean>

      // New: Projects
      getProjects: () => Promise<Project[]>
      createProject: (project: Partial<Project>) => Promise<Project>
      updateProject: (id: number, data: Partial<Project>) => Promise<Project>
      deleteProject: (id: number) => Promise<boolean>

      // New: Daily Logs
      getDailyLogs: () => Promise<DailyLog[]>
      getDailyLog: (date: string) => Promise<DailyLog | undefined>
      createDailyLog: (log: Partial<DailyLog>) => Promise<DailyLog>
      updateDailyLog: (id: number, data: Partial<DailyLog>) => Promise<DailyLog>

      // New: Snippets
      getSnippets: () => Promise<Snippet[]>
      createSnippet: (snippet: Partial<Snippet>) => Promise<Snippet>
      updateSnippet: (id: number, data: Partial<Snippet>) => Promise<Snippet>
      deleteSnippet: (id: number) => Promise<boolean>

      // New: Habits
      getHabits: () => Promise<Habit[]>
      createHabit: (habit: Partial<Habit>) => Promise<Habit>
      deleteHabit: (id: number) => Promise<boolean>
      getHabitLogs: (habitId: number) => Promise<HabitLog[]>
      toggleHabitLog: (habitId: number, date: string) => Promise<boolean>
    }
  }
}
