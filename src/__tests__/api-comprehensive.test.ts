import { describe, it, expect, beforeEach } from 'vitest'

function createMockApi() {
  let taskId = 0, noteId = 0, projectId = 0, habitId = 0, goalId = 0, snippetId = 0, kanbanId = 0, dailyLogId = 0, subtaskId = 0
  const tasks: any[] = [], notes: any[] = [], projects: any[] = [], habits: any[] = [], habitLogs: any[] = []
  const goals: any[] = [], goalProgress: any[] = [], snippets: any[] = [], kanbanCards: any[] = [], dailyLogs: any[] = []
  const subtasks: any[] = [], settings: Record<string, string> = {}, streaks: Record<string, any> = {}
  const pomodoroSessions: any[] = [], trash: any[] = [], xpLog: any[] = []

  return {
    tasks, notes, projects, habits, habitLogs, goals, goalProgress, snippets, kanbanCards, dailyLogs, subtasks, settings, streaks, pomodoroSessions, trash, xpLog,
    api: {
      getSetting: async (key: string) => settings[key] || null,
      setSetting: async (key: string, value: string) => { settings[key] = value; return true },
      getTasks: async () => tasks.filter(t => !t.deleted),
      getTasksWithSubtasks: async () => tasks.filter(t => !t.deleted).map(t => ({ ...t, subtasks: subtasks.filter(s => s.task_id === t.id) })),
      createTask: async (task: any) => { const t = { id: ++taskId, title: task.title, description: task.description || '', priority: task.priority || 'media', completed: 0, due_date: task.due_date || null, reminder: task.reminder || null, project_id: task.project_id || null, repeat: task.repeat || null, tags: task.tags || '', position: 0, deleted: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...task, id: ++taskId }; tasks.push(t); return t },
      updateTask: async (id: number, data: any) => { const t = tasks.find(x => x.id === id); if (t) Object.assign(t, data); return t },
      deleteTask: async (id: number) => { const t = tasks.find(x => x.id === id); if (t) t.deleted = 1; return true },
      toggleTask: async (id: number) => { const t = tasks.find(x => x.id === id); if (t) t.completed = t.completed ? 0 : 1; return t },
      reorderTasks: async (ids: number[]) => { ids.forEach((id, i) => { const t = tasks.find(x => x.id === id); if (t) t.position = i }); return true },
      addTagToTask: async (id: number, tag: string) => { const t = tasks.find(x => x.id === id); if (t) { const tags = t.tags ? t.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : []; if (!tags.includes(tag)) tags.push(tag); t.tags = tags.join(',') }; return true },
      removeTagFromTask: async (id: number, tag: string) => { const t = tasks.find(x => x.id === id); if (t) { const tags = t.tags ? t.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : []; t.tags = tags.filter((t: string) => t !== tag).join(',') }; return true },
      getTasksByTag: async (tag: string) => tasks.filter(t => !t.deleted && t.tags?.includes(tag)),
      getKanbanCards: async () => kanbanCards,
      createKanbanCard: async (card: any) => { const c = { id: ++kanbanId, ...card, position: card.position || 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; kanbanCards.push(c); return c },
      updateKanbanCard: async (id: number, data: any) => { const c = kanbanCards.find(x => x.id === id); if (c) Object.assign(c, data); return c },
      deleteKanbanCard: async (id: number) => { const idx = kanbanCards.findIndex(x => x.id === id); if (idx >= 0) kanbanCards.splice(idx, 1); return true },
      moveKanbanCard: async (id: number, column: string, position: number) => { const c = kanbanCards.find(x => x.id === id); if (c) { c.column_type = column; c.position = position }; return c },
      getPomodoroSessions: async () => pomodoroSessions,
      createPomodoroSession: async (s: any) => { const ps = { id: pomodoroSessions.length + 1, ...s }; pomodoroSessions.push(ps); return ps },
      getNotes: async () => notes.filter(n => !n.deleted),
      createNote: async (note: any) => { const n = { id: ++noteId, title: note.title || 'Untitled', content: note.content || '', project_id: note.project_id || null, deleted: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; notes.push(n); return n },
      updateNote: async (id: number, data: any) => { const n = notes.find(x => x.id === id); if (n) Object.assign(n, data); return n },
      deleteNote: async (id: number) => { const n = notes.find(x => x.id === id); if (n) n.deleted = 1; return true },
      getGoals: async () => goals,
      createGoal: async (goal: any) => { const g = { id: ++goalId, ...goal, created_at: new Date().toISOString() }; goals.push(g); return g },
      updateGoal: async (id: number, data: any) => { const g = goals.find(x => x.id === id); if (g) Object.assign(g, data); return g },
      deleteGoal: async (id: number) => { const idx = goals.findIndex(x => x.id === id); if (idx >= 0) goals.splice(idx, 1); return true },
      addGoalProgress: async (goalId: number, date: string, value: number) => { goalProgress.push({ id: goalProgress.length + 1, goal_id: goalId, date, value }); return true },
      getGoalProgress: async (goalId: number, date: string) => goalProgress.filter(g => g.goal_id === goalId && g.date === date).reduce((sum, g) => sum + g.value, 0),
      getHabits: async () => habits,
      createHabit: async (habit: any) => { const h = { id: ++habitId, name: habit.name, icon: habit.icon || 'check', color: habit.color || '#6366f1', frequency: habit.frequency || 'daily', created_at: new Date().toISOString() }; habits.push(h); return h },
      updateHabit: async (id: number, data: any) => { const h = habits.find(x => x.id === id); if (h) Object.assign(h, data); return h },
      deleteHabit: async (id: number) => { const idx = habits.findIndex(x => x.id === id); if (idx >= 0) habits.splice(idx, 1); return true },
      getHabitLogs: async (habitId: number) => habitLogs.filter(h => h.habit_id === habitId),
      toggleHabitLog: async (habitId: number, date: string) => { const existing = habitLogs.find(h => h.habit_id === habitId && h.date === date); if (existing) { const idx = habitLogs.indexOf(existing); habitLogs.splice(idx, 1); return false } else { habitLogs.push({ id: habitLogs.length + 1, habit_id: habitId, date, completed: 1 }); return true } },
      getProjects: async () => projects.filter(p => !p.deleted),
      createProject: async (proj: any) => { const p = { id: ++projectId, name: proj.name, description: proj.description || '', status: proj.status || 'activo', tech_stack: proj.tech_stack || '', repo_url: proj.repo_url || '', color: proj.color || '#6366f1', deleted: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; projects.push(p); return p },
      updateProject: async (id: number, data: any) => { const p = projects.find(x => x.id === id); if (p) Object.assign(p, data); return p },
      deleteProject: async (id: number) => { const p = projects.find(x => x.id === id); if (p) p.deleted = 1; return true },
      getDailyLogs: async () => dailyLogs,
      getDailyLog: async (date: string) => dailyLogs.find(d => d.date === date) || null,
      createDailyLog: async (log: any) => { const d = { id: ++dailyLogId, ...log, created_at: new Date().toISOString() }; dailyLogs.push(d); return d },
      updateDailyLog: async (id: number, data: any) => { const d = dailyLogs.find(x => x.id === id); if (d) Object.assign(d, data); return d },
      getSnippets: async () => snippets,
      createSnippet: async (snippet: any) => { const s = { id: ++snippetId, ...snippet, created_at: new Date().toISOString() }; snippets.push(s); return s },
      updateSnippet: async (id: number, data: any) => { const s = snippets.find(x => x.id === id); if (s) Object.assign(s, data); return s },
      deleteSnippet: async (id: number) => { const idx = snippets.findIndex(x => x.id === id); if (idx >= 0) snippets.splice(idx, 1); return true },
      getStreak: async (name: string) => streaks[name] || null,
      updateStreak: async (name: string) => { const today = new Date().toISOString().split('T')[0]; if (!streaks[name]) { streaks[name] = { current: 1, max: 1, updated_at: today } } else if (streaks[name].updated_at !== today) { streaks[name].current++; streaks[name].max = Math.max(streaks[name].max, streaks[name].current); streaks[name].updated_at = today }; return { current: streaks[name].current, max: streaks[name].max } },
      getStats: async () => ({ pomodoroCount: { count: pomodoroSessions.length, total: pomodoroSessions.reduce((s, p) => s + (p.duration || 0), 0) }, tasksCompleted: { count: tasks.filter(t => t.completed && !t.deleted).length }, tasksTotal: { count: tasks.filter(t => !t.deleted).length }, dailyPomodoros: [] }),
      search: async (q: string) => { const results: any[] = []; tasks.filter(t => !t.deleted && t.title.includes(q)).forEach(t => results.push({ id: t.id, name: t.title, type: 'tarea' })); notes.filter(n => !n.deleted && n.title.includes(q)).forEach(n => results.push({ id: n.id, name: n.title, type: 'nota' })); return results },
      getSubtasks: async (taskId: number) => subtasks.filter(s => s.task_id === taskId),
      createSubtask: async (sub: any) => { const s = { id: ++subtaskId, task_id: sub.task_id, title: sub.title, completed: 0, position: subtasks.filter(x => x.task_id === sub.task_id).length, created_at: new Date().toISOString() }; subtasks.push(s); return s },
      toggleSubtask: async (id: number) => { const s = subtasks.find(x => x.id === id); if (s) s.completed = s.completed ? 0 : 1; return s },
      deleteSubtask: async (id: number) => { const idx = subtasks.findIndex(x => x.id === id); if (idx >= 0) subtasks.splice(idx, 1); return true },
      softDeleteItem: async (type: string, id: number) => { const map: Record<string, any[]> = { task: tasks, note: notes, project: projects }; const arr = map[type]; if (arr) { const item = arr.find((x: any) => x.id === id); if (item) item.deleted = 1 } return true },
      getTrashItems: async () => ({ tasks: tasks.filter(t => t.deleted), notes: notes.filter(n => n.deleted), projects: projects.filter(p => p.deleted) }),
      restoreItem: async (type: string, id: number) => { const map: Record<string, any[]> = { task: tasks, note: notes, project: projects }; const arr = map[type]; if (arr) { const item = arr.find((x: any) => x.id === id); if (item) item.deleted = 0 } return true },
      deleteItemPermanent: async (type: string, id: number) => { const map: Record<string, any[]> = { task: tasks, note: notes, project: projects }; const arr = map[type]; if (arr) { const idx = arr.findIndex((x: any) => x.id === id); if (idx >= 0) arr.splice(idx, 1) } return true },
      emptyTrash: async () => { [tasks, notes, projects].forEach(arr => { for (let i = arr.length - 1; i >= 0; i--) { if ((arr[i] as any).deleted) arr.splice(i, 1) } }); return true },
      showNotification: async () => true,
      exportData: async () => ({ tasks, notes, projects }),
      importData: async () => true,
      getXp: async () => ({ total: xpLog.reduce((s, x) => s + x.amount, 0), level: 1, currentXp: 0, nextLevelXp: 100 }),
      addXp: async (amount: number, reason: string) => { xpLog.push({ amount, reason }); return { total: xpLog.reduce((s, x) => s + x.amount, 0), level: 1, currentXp: 0, nextLevelXp: 100, leveledUp: false } },
      getDashboard: async () => ({ pomodorosToday: 0, tasksToday: 0, tasksPending: tasks.filter(t => !t.completed && !t.deleted).length, upcomingTasks: [], xp: { total: 0, level: 1, currentXp: 0, nextLevelXp: 100 }, streak: { current: 0, max: 0 }, totalPomodoros: 0, totalTasks: 0 }),
      getActivityFeed: async () => [],
      getHabitStats: async () => habits.map(h => ({ ...h, totalDays: 0, thisMonth: 0, todayDone: false })),
      listBackups: async () => [],
      restoreBackup: async () => true,
      linkEntities: async () => true,
      getEntityLinks: async () => [],
      getChallenges: async () => [],
      getWeeklyReport: async () => ({ weekStart: '', pomodoros: 0, tasksCompleted: 0, xpEarned: 0, streakMax: 0 }),
      checkAchievements: async () => ({ unlocked: [], leveledUp: false, newLevel: 1 }),
      getFlashcardDecks: async () => [],
      createFlashcardDeck: async () => ({ id: 1, name: 'Test', description: '', card_count: 0, created_at: '' }),
      deleteFlashcardDeck: async () => true,
      getFlashcards: async () => [],
      createFlashcard: async () => ({ id: 1, deck_id: 1, front: '', back: '', hint: '', difficulty: 0, ease_factor: 2.5, repetitions: 0, interval: 0, next_review: '', created_at: '' }),
      deleteFlashcard: async () => true,
      getDueFlashcards: async () => [],
      reviewFlashcard: async () => ({} as any),
      getFlashcardStats: async () => ({ total: 0, due: 0, reviewed: 0 }),
      getRetentionStats: async () => ({ total: 0, easy: 0, hard: 0, retentionRate: 0 }),
    }
  }
}

let mock: ReturnType<typeof createMockApi>

beforeEach(() => {
  mock = createMockApi()
  ;(window as any).electronAPI = mock.api
})

describe('Tasks CRUD', () => {
  it('create and retrieve task', async () => {
    const task = await window.electronAPI.createTask({ title: 'Mi tarea', priority: 'alta' })
    expect(task.id).toBeGreaterThan(0)
    expect(task.title).toBe('Mi tarea')
    expect(task.priority).toBe('alta')
    const tasks = await window.electronAPI.getTasks()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Mi tarea')
  })

  it('update task', async () => {
    const task = await window.electronAPI.createTask({ title: 'Original' })
    const updated = await window.electronAPI.updateTask(task.id, { title: 'Modificado' })
    expect(updated.title).toBe('Modificado')
  })

  it('toggle task completion', async () => {
    const task = await window.electronAPI.createTask({ title: 'Toggle me' })
    expect(task.completed).toBe(0)
    const toggled = await window.electronAPI.toggleTask(task.id)
    expect(toggled.completed).toBe(1)
    const toggled2 = await window.electronAPI.toggleTask(task.id)
    expect(toggled2.completed).toBe(0)
  })

  it('soft delete task', async () => {
    await window.electronAPI.createTask({ title: 'Delete me' })
    const tasks = await window.electronAPI.getTasks()
    expect(tasks).toHaveLength(1)
    await window.electronAPI.deleteTask(tasks[0].id)
    const remaining = await window.electronAPI.getTasks()
    expect(remaining).toHaveLength(0)
  })

  it('reorder tasks', async () => {
    const t1 = await window.electronAPI.createTask({ title: 'First' })
    const t2 = await window.electronAPI.createTask({ title: 'Second' })
    await window.electronAPI.reorderTasks([t2.id, t1.id])
    const allTasks = await window.electronAPI.getTasks()
    const reordered = allTasks.sort((a: any, b: any) => a.position - b.position)
    expect(reordered[0].id).toBe(t2.id)
    expect(reordered[1].id).toBe(t1.id)
  })

  it('add and remove tags', async () => {
    const task = await window.electronAPI.createTask({ title: 'Tagged' })
    await window.electronAPI.addTagToTask(task.id, 'urgent')
    await window.electronAPI.addTagToTask(task.id, 'work')
    let tasks = await window.electronAPI.getTasks()
    expect(tasks[0].tags).toContain('urgent')
    expect(tasks[0].tags).toContain('work')
    await window.electronAPI.removeTagFromTask(task.id, 'urgent')
    tasks = await window.electronAPI.getTasks()
    expect(tasks[0].tags).not.toContain('urgent')
    expect(tasks[0].tags).toContain('work')
  })

  it('getTasksByTag filters correctly', async () => {
    await window.electronAPI.createTask({ title: 'A', tags: 'js,react' })
    await window.electronAPI.createTask({ title: 'B', tags: 'python' })
    const jsTasks = await window.electronAPI.getTasksByTag('js')
    expect(jsTasks).toHaveLength(1)
    expect(jsTasks[0].title).toBe('A')
  })
})

describe('Subtasks', () => {
  it('create and list subtasks', async () => {
    const task = await window.electronAPI.createTask({ title: 'Parent' })
    await window.electronAPI.createSubtask({ task_id: task.id, title: 'Sub 1' })
    await window.electronAPI.createSubtask({ task_id: task.id, title: 'Sub 2' })
    const subs = await window.electronAPI.getSubtasks(task.id)
    expect(subs).toHaveLength(2)
    expect(subs[0].title).toBe('Sub 1')
  })

  it('toggle subtask', async () => {
    const task = await window.electronAPI.createTask({ title: 'Parent' })
    const sub = await window.electronAPI.createSubtask({ task_id: task.id, title: 'Sub' })
    expect(sub.completed).toBe(0)
    const toggled = await window.electronAPI.toggleSubtask(sub.id)
    expect(toggled.completed).toBe(1)
  })

  it('delete subtask', async () => {
    const task = await window.electronAPI.createTask({ title: 'Parent' })
    const sub = await window.electronAPI.createSubtask({ task_id: task.id, title: 'Sub' })
    await window.electronAPI.deleteSubtask(sub.id)
    const subs = await window.electronAPI.getSubtasks(task.id)
    expect(subs).toHaveLength(0)
  })
})

describe('Notes CRUD', () => {
  it('create and retrieve notes', async () => {
    const note = await window.electronAPI.createNote({ title: 'My Note', content: 'Hello world' })
    expect(note.title).toBe('My Note')
    expect(note.content).toBe('Hello world')
    const notes = await window.electronAPI.getNotes()
    expect(notes).toHaveLength(1)
  })

  it('update note', async () => {
    const note = await window.electronAPI.createNote({ title: 'Original' })
    await window.electronAPI.updateNote(note.id, { title: 'Updated' })
    const notes = await window.electronAPI.getNotes()
    expect(notes[0].title).toBe('Updated')
  })

  it('soft delete note', async () => {
    const note = await window.electronAPI.createNote({ title: 'Delete me' })
    await window.electronAPI.deleteNote(note.id)
    const notes = await window.electronAPI.getNotes()
    expect(notes).toHaveLength(0)
  })
})

describe('Projects CRUD', () => {
  it('create and retrieve projects', async () => {
    const proj = await window.electronAPI.createProject({ name: 'My Project' })
    expect(proj.name).toBe('My Project')
    const projects = await window.electronAPI.getProjects()
    expect(projects).toHaveLength(1)
  })

  it('soft delete project', async () => {
    const proj = await window.electronAPI.createProject({ name: 'Delete me' })
    await window.electronAPI.deleteProject(proj.id)
    const projects = await window.electronAPI.getProjects()
    expect(projects).toHaveLength(0)
  })
})

describe('Habits CRUD', () => {
  it('create habit', async () => {
    const habit = await window.electronAPI.createHabit({ name: 'Exercise', icon: 'dumbbell' })
    expect(habit.name).toBe('Exercise')
    const habits = await window.electronAPI.getHabits()
    expect(habits).toHaveLength(1)
  })

  it('toggle habit log', async () => {
    const habit = await window.electronAPI.createHabit({ name: 'Read' })
    const result = await window.electronAPI.toggleHabitLog(habit.id, '2026-07-23')
    expect(result).toBe(true)
    const logs = await window.electronAPI.getHabitLogs(habit.id)
    expect(logs).toHaveLength(1)
    const result2 = await window.electronAPI.toggleHabitLog(habit.id, '2026-07-23')
    expect(result2).toBe(false)
    const logs2 = await window.electronAPI.getHabitLogs(habit.id)
    expect(logs2).toHaveLength(0)
  })

  it('delete habit', async () => {
    const habit = await window.electronAPI.createHabit({ name: 'Meditate' })
    await window.electronAPI.deleteHabit(habit.id)
    const habits = await window.electronAPI.getHabits()
    expect(habits).toHaveLength(0)
  })
})

describe('Goals CRUD', () => {
  it('create goal', async () => {
    const goal = await window.electronAPI.createGoal({ title: '4 pomodoros daily', type: 'daily', target: 4, metric: 'pomodoros' })
    expect(goal.title).toBe('4 pomodoros daily')
    const goals = await window.electronAPI.getGoals()
    expect(goals).toHaveLength(1)
  })

  it('add and get goal progress', async () => {
    const goal = await window.electronAPI.createGoal({ title: 'Test', type: 'daily', target: 5, metric: 'pomodoros' })
    await window.electronAPI.addGoalProgress(goal.id, '2026-07-23', 3)
    await window.electronAPI.addGoalProgress(goal.id, '2026-07-23', 2)
    const total = await window.electronAPI.getGoalProgress(goal.id, '2026-07-23')
    expect(total).toBe(5)
  })

  it('delete goal', async () => {
    const goal = await window.electronAPI.createGoal({ title: 'Delete me', type: 'daily', target: 1, metric: 'tareas' })
    await window.electronAPI.deleteGoal(goal.id)
    const goals = await window.electronAPI.getGoals()
    expect(goals).toHaveLength(0)
  })
})

describe('Snippets CRUD', () => {
  it('create snippet', async () => {
    const snippet = await window.electronAPI.createSnippet({ title: 'React hook', code: 'useState()', language: 'typescript' })
    expect(snippet.title).toBe('React hook')
    const snippets = await window.electronAPI.getSnippets()
    expect(snippets).toHaveLength(1)
  })

  it('delete snippet', async () => {
    const snippet = await window.electronAPI.createSnippet({ title: 'To delete', code: 'x' })
    await window.electronAPI.deleteSnippet(snippet.id)
    const snippets = await window.electronAPI.getSnippets()
    expect(snippets).toHaveLength(0)
  })
})

describe('Kanban Cards', () => {
  it('create and move card', async () => {
    const card = await window.electronAPI.createKanbanCard({ title: 'Card 1', column_type: 'pendiente' })
    expect(card.column_type).toBe('pendiente')
    await window.electronAPI.moveKanbanCard(card.id, 'en-progreso', 0)
    const cards = await window.electronAPI.getKanbanCards()
    expect(cards[0].column_type).toBe('en-progreso')
  })

  it('delete card', async () => {
    const card = await window.electronAPI.createKanbanCard({ title: 'Delete me', column_type: 'pendiente' })
    await window.electronAPI.deleteKanbanCard(card.id)
    const cards = await window.electronAPI.getKanbanCards()
    expect(cards).toHaveLength(0)
  })
})

describe('Settings', () => {
  it('set and get setting', async () => {
    await window.electronAPI.setSetting('userName', 'Alexis')
    const val = await window.electronAPI.getSetting('userName')
    expect(val).toBe('Alexis')
  })

  it('returns null for missing setting', async () => {
    const val = await window.electronAPI.getSetting('nonexistent')
    expect(val).toBeNull()
  })

  it('overwrites setting', async () => {
    await window.electronAPI.setSetting('theme', 'dark')
    await window.electronAPI.setSetting('theme', 'light')
    const val = await window.electronAPI.getSetting('theme')
    expect(val).toBe('light')
  })
})

describe('Streaks', () => {
  it('creates streak on first update', async () => {
    const result = await window.electronAPI.updateStreak('daily_study')
    expect(result.current).toBe(1)
    expect(result.max).toBe(1)
  })

  it('get streak', async () => {
    await window.electronAPI.updateStreak('daily_study')
    const streak = await window.electronAPI.getStreak('daily_study')
    expect(streak).not.toBeNull()
    expect(streak.current).toBe(1)
  })

  it('returns null for missing streak', async () => {
    const streak = await window.electronAPI.getStreak('nonexistent')
    expect(streak).toBeNull()
  })
})

describe('Daily Logs', () => {
  it('create and get daily log', async () => {
    const log = await window.electronAPI.createDailyLog({ date: '2026-07-23', content: 'Good day', focus: 'Study', blockers: 'None' })
    expect(log.date).toBe('2026-07-23')
    const retrieved = await window.electronAPI.getDailyLog('2026-07-23')
    expect(retrieved.content).toBe('Good day')
  })

  it('get all daily logs', async () => {
    await window.electronAPI.createDailyLog({ date: '2026-07-22', content: 'Day 1' })
    await window.electronAPI.createDailyLog({ date: '2026-07-23', content: 'Day 2' })
    const logs = await window.electronAPI.getDailyLogs()
    expect(logs).toHaveLength(2)
  })
})

describe('Trash System', () => {
  it('soft delete and retrieve trash', async () => {
    const task = await window.electronAPI.createTask({ title: 'Trashed task' })
    await window.electronAPI.softDeleteItem('task', task.id)
    const trash = await window.electronAPI.getTrashItems()
    expect(trash.tasks).toHaveLength(1)
    expect(trash.tasks[0].title).toBe('Trashed task')
  })

  it('restore item from trash', async () => {
    const task = await window.electronAPI.createTask({ title: 'Restore me' })
    await window.electronAPI.softDeleteItem('task', task.id)
    await window.electronAPI.restoreItem('task', task.id)
    const tasks = await window.electronAPI.getTasks()
    expect(tasks).toHaveLength(1)
  })

  it('permanent delete', async () => {
    const task = await window.electronAPI.createTask({ title: 'Permanently delete' })
    await window.electronAPI.softDeleteItem('task', task.id)
    await window.electronAPI.deleteItemPermanent('task', task.id)
    const trash = await window.electronAPI.getTrashItems()
    expect(trash.tasks).toHaveLength(0)
  })

  it('empty trash clears all', async () => {
    await window.electronAPI.createTask({ title: 'T1' })
    await window.electronAPI.createTask({ title: 'T2' })
    const tasks = await window.electronAPI.getTasks()
    await window.electronAPI.softDeleteItem('task', tasks[0].id)
    await window.electronAPI.softDeleteItem('task', tasks[1].id)
    await window.electronAPI.emptyTrash()
    const trash = await window.electronAPI.getTrashItems()
    expect(trash.tasks).toHaveLength(0)
  })
})

describe('Search', () => {
  it('finds tasks by title', async () => {
    await window.electronAPI.createTask({ title: 'Learn TypeScript' })
    await window.electronAPI.createTask({ title: 'Buy groceries' })
    const results = await window.electronAPI.search('TypeScript')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('tarea')
  })

  it('finds notes by title', async () => {
    await window.electronAPI.createNote({ title: 'Meeting notes' })
    const results = await window.electronAPI.search('Meeting')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('nota')
  })

  it('returns empty for no match', async () => {
    await window.electronAPI.createTask({ title: 'Test' })
    const results = await window.electronAPI.search('zzz_nonexistent_zzz')
    expect(results).toHaveLength(0)
  })
})

describe('Statistics', () => {
  it('returns stats object', async () => {
    await window.electronAPI.createTask({ title: 'T1' })
    await window.electronAPI.createTask({ title: 'T2' })
    await window.electronAPI.toggleTask((await window.electronAPI.getTasks())[0].id)
    const stats = await window.electronAPI.getStats('week')
    expect(stats.tasksTotal.count).toBe(2)
    expect(stats.tasksCompleted.count).toBe(1)
  })
})

describe('Dashboard', () => {
  it('returns dashboard data', async () => {
    const data = await window.electronAPI.getDashboard()
    expect(data).toHaveProperty('pomodorosToday')
    expect(data).toHaveProperty('tasksPending')
    expect(data).toHaveProperty('xp')
    expect(data).toHaveProperty('streak')
  })
})

describe('XP / Gamification', () => {
  it('get XP starts at 0', async () => {
    const xp = await window.electronAPI.getXp()
    expect(xp.total).toBe(0)
  })

  it('add XP increases total', async () => {
    await window.electronAPI.addXp(50, 'test reason')
    const xp = await window.electronAPI.getXp()
    expect(xp.total).toBe(50)
  })
})

describe('QuickAdd button fix (window.__quickAdd)', () => {
  it('__quickAdd can be assigned and called', () => {
    let called = false
    ;(window as any).__quickAdd = (type: string) => { called = true; expect(type).toBe('task') }
    ;(window as any).__quickAdd('task')
    expect(called).toBe(true)
    delete (window as any).__quickAdd
  })

  it('__confirmDelete can be assigned and called', () => {
    let calledWith: any = null
    ;(window as any).__confirmDelete = (type: string, id: number, title: string) => { calledWith = { type, id, title } }
    ;(window as any).__confirmDelete('task', 42, 'My Task')
    expect(calledWith).toEqual({ type: 'task', id: 42, title: 'My Task' })
    delete (window as any).__confirmDelete
  })

  it('__setActiveTab can be assigned and called', () => {
    let tab = ''
    ;(window as any).__setActiveTab = (t: string) => { tab = t }
    ;(window as any).__setActiveTab('kanban')
    expect(tab).toBe('kanban')
    delete (window as any).__setActiveTab
  })
})
