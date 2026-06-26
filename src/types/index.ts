export interface Task {
  id: number
  title: string
  description: string
  completed: number
  priority: string
  due_date: string | null
  reminder: string | null
  project_id: number | null
  recurrence_rule: string | null
  recurrence_end: string | null
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
  notebook_id: number | null
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

export interface Tag {
  id: number
  name: string
  color: string
}

export interface FlashcardDeck {
  id: number
  name: string
  description: string
  created_at: string
}

export interface Flashcard {
  id: number
  deck_id: number
  front: string
  back: string
  ease: number
  interval: number
  repetitions: number
  next_review: string
  created_at: string
}

export interface FlashcardReview {
  id: number
  card_id: number
  rating: number
  reviewed_at: string
}

export interface Subtask {
  id: number
  task_id: number
  title: string
  completed: number
  position: number
}

export interface TaskRecurrence {
  id: number
  task_id: number
  frequency: string
  interval_days: number
  day_of_week: number | null
  day_of_month: number | null
  end_date: string | null
}

export interface ActivityLogEntry {
  id: number
  entity_type: string
  entity_id: number | null
  action: string
  description: string
  created_at: string
}

export interface Notebook {
  id: number
  parent_id: number | null
  name: string
  description: string
  color: string
  created_at: string
}

export interface Template {
  id: number
  name: string
  entity_type: string
  content: string
  created_at: string
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

      // Backup
      saveBackupDialog: (data: Record<string, unknown[]>) => Promise<string | null>

      // Tags
      getTags: () => Promise<Tag[]>
      createTag: (tag: Partial<Tag>) => Promise<Tag>
      deleteTag: (id: number) => Promise<boolean>
      getTaskTags: (taskId: number) => Promise<Tag[]>
      setTaskTags: (taskId: number, tagIds: number[]) => Promise<boolean>
      getNoteTags: (noteId: number) => Promise<Tag[]>
      setNoteTags: (noteId: number, tagIds: number[]) => Promise<boolean>
      getSnippetTags: (snippetId: number) => Promise<Tag[]>
      setSnippetTags: (snippetId: number, tagIds: number[]) => Promise<boolean>
      getTasksByTag: (tagId: number) => Promise<Task[]>
      getNotesByTag: (tagId: number) => Promise<Note[]>
      getSnippetsByTag: (tagId: number) => Promise<Snippet[]>

      // Flashcards
      getFlashcardDecks: () => Promise<FlashcardDeck[]>
      createFlashcardDeck: (deck: Partial<FlashcardDeck>) => Promise<FlashcardDeck>
      deleteFlashcardDeck: (id: number) => Promise<boolean>
      getFlashcards: (deckId: number) => Promise<Flashcard[]>
      createFlashcard: (card: Partial<Flashcard>) => Promise<Flashcard>
      updateFlashcard: (id: number, data: Partial<Flashcard>) => Promise<Flashcard>
      deleteFlashcard: (id: number) => Promise<boolean>
      reviewFlashcard: (cardId: number, rating: number) => Promise<Flashcard>
      getDueFlashcards: (deckId: number) => Promise<Flashcard[]>
      getFlashcardStats: (deckId: number) => Promise<{ total: number; due: number; reviewed: number }>

      // Subtasks
      getSubtasks: (taskId: number) => Promise<Subtask[]>
      createSubtask: (subtask: Partial<Subtask>) => Promise<Subtask>
      updateSubtask: (id: number, data: Partial<Subtask>) => Promise<Subtask>
      deleteSubtask: (id: number) => Promise<boolean>
      toggleSubtask: (id: number) => Promise<Subtask>

      // Recurrence
      getTaskRecurrence: (taskId: number) => Promise<TaskRecurrence | undefined>
      setTaskRecurrence: (taskId: number, data: Partial<TaskRecurrence>) => Promise<boolean>
      deleteTaskRecurrence: (taskId: number) => Promise<boolean>
      checkRecurringTasks: () => Promise<Task[]>

      // Activity log
      getActivityLog: (limit?: number) => Promise<ActivityLogEntry[]>
      logActivity: (entry: Partial<ActivityLogEntry>) => Promise<boolean>

      // Notebooks
      getNotebooks: () => Promise<Notebook[]>
      createNotebook: (notebook: Partial<Notebook>) => Promise<Notebook>
      updateNotebook: (id: number, data: Partial<Notebook>) => Promise<Notebook>
      deleteNotebook: (id: number) => Promise<boolean>

      // Templates
      getTemplates: (entityType?: string) => Promise<Template[]>
      createTemplate: (template: Partial<Template>) => Promise<Template>
      deleteTemplate: (id: number) => Promise<boolean>

      // New: Habits
      getHabits: () => Promise<Habit[]>
      createHabit: (habit: Partial<Habit>) => Promise<Habit>
      deleteHabit: (id: number) => Promise<boolean>
      getHabitLogs: (habitId: number) => Promise<HabitLog[]>
      toggleHabitLog: (habitId: number, date: string) => Promise<boolean>
    }
  }
}
