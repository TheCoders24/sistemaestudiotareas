import { describe, it, expect, beforeEach } from 'vitest'
import { createMockApi } from '../../test/helpers/mockApi'

let mock: ReturnType<typeof createMockApi>

beforeEach(() => {
  mock = createMockApi()
  ;(window as any).electronAPI = mock
})

describe('Tasks CRUD', () => {
  it('create and retrieve task', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Mi tarea', priority: 'alta' })
    expect(task.id).toBeGreaterThan(0)
    expect(task.title).toBe('Mi tarea')
    expect(task.priority).toBe('alta')
    const tasks = await window.electronAPI.tasks.list()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Mi tarea')
  })

  it('update task', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Original' })
    const updated = await window.electronAPI.tasks.update(task.id, { title: 'Modificado' })
    expect(updated.title).toBe('Modificado')
  })

  it('toggle task completion', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Toggle me' })
    expect(task.completed).toBe(0)
    const toggled = await window.electronAPI.tasks.toggle(task.id)
    expect(toggled.completed).toBe(1)
    const toggled2 = await window.electronAPI.tasks.toggle(task.id)
    expect(toggled2.completed).toBe(0)
  })

  it('soft delete task', async () => {
    await window.electronAPI.tasks.create({ title: 'Delete me' })
    const tasks = await window.electronAPI.tasks.list()
    expect(tasks).toHaveLength(1)
    await window.electronAPI.tasks.delete(tasks[0].id)
    const remaining = await window.electronAPI.tasks.list()
    expect(remaining).toHaveLength(0)
  })

  it('reorder tasks', async () => {
    const t1 = await window.electronAPI.tasks.create({ title: 'First' })
    const t2 = await window.electronAPI.tasks.create({ title: 'Second' })
    await window.electronAPI.tasks.reorder([t2.id, t1.id])
    const allTasks = await window.electronAPI.tasks.list()
    const reordered = allTasks.sort((a: any, b: any) => a.position - b.position)
    expect(reordered[0].id).toBe(t2.id)
    expect(reordered[1].id).toBe(t1.id)
  })

  it('add and remove tags', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Tagged' })
    await window.electronAPI.tasks.addTag(task.id, 'urgent')
    await window.electronAPI.tasks.addTag(task.id, 'work')
    let tasks = await window.electronAPI.tasks.list()
    expect(tasks[0].tags).toContain('urgent')
    expect(tasks[0].tags).toContain('work')
    await window.electronAPI.tasks.removeTag(task.id, 'urgent')
    tasks = await window.electronAPI.tasks.list()
    expect(tasks[0].tags).not.toContain('urgent')
    expect(tasks[0].tags).toContain('work')
  })

  it('getTasksByTag filters correctly', async () => {
    await window.electronAPI.tasks.create({ title: 'A', tags: 'js,react' })
    await window.electronAPI.tasks.create({ title: 'B', tags: 'python' })
    const jsTasks = await window.electronAPI.tasks.getByTag('js')
    expect(jsTasks).toHaveLength(1)
    expect(jsTasks[0].title).toBe('A')
  })
})

describe('Subtasks', () => {
  it('create and list subtasks', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Parent' })
    await window.electronAPI.subtasks.create({ task_id: task.id, title: 'Sub 1' })
    await window.electronAPI.subtasks.create({ task_id: task.id, title: 'Sub 2' })
    const subs = await window.electronAPI.subtasks.list(task.id)
    expect(subs).toHaveLength(2)
    expect(subs[0].title).toBe('Sub 1')
  })

  it('toggle subtask', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Parent' })
    const sub = await window.electronAPI.subtasks.create({ task_id: task.id, title: 'Sub' })
    expect(sub.completed).toBe(0)
    const toggled = await window.electronAPI.subtasks.toggle(sub.id)
    expect(toggled.completed).toBe(1)
  })

  it('delete subtask', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Parent' })
    const sub = await window.electronAPI.subtasks.create({ task_id: task.id, title: 'Sub' })
    await window.electronAPI.subtasks.delete(sub.id)
    const subs = await window.electronAPI.subtasks.list(task.id)
    expect(subs).toHaveLength(0)
  })
})

describe('Notes CRUD', () => {
  it('create and retrieve notes', async () => {
    const note = await window.electronAPI.notes.create({ title: 'My Note', content: 'Hello world' })
    expect(note.title).toBe('My Note')
    expect(note.content).toBe('Hello world')
    const notes = await window.electronAPI.notes.list()
    expect(notes).toHaveLength(1)
  })

  it('update note', async () => {
    const note = await window.electronAPI.notes.create({ title: 'Original' })
    await window.electronAPI.notes.update(note.id, { title: 'Updated' })
    const notes = await window.electronAPI.notes.list()
    expect(notes[0].title).toBe('Updated')
  })

  it('soft delete note', async () => {
    const note = await window.electronAPI.notes.create({ title: 'Delete me' })
    await window.electronAPI.notes.delete(note.id)
    const notes = await window.electronAPI.notes.list()
    expect(notes).toHaveLength(0)
  })
})

describe('Projects CRUD', () => {
  it('create and retrieve projects', async () => {
    const proj = await window.electronAPI.projects.create({ name: 'My Project' })
    expect(proj.name).toBe('My Project')
    const projects = await window.electronAPI.projects.list()
    expect(projects).toHaveLength(1)
  })

  it('soft delete project', async () => {
    const proj = await window.electronAPI.projects.create({ name: 'Delete me' })
    await window.electronAPI.projects.delete(proj.id)
    const projects = await window.electronAPI.projects.list()
    expect(projects).toHaveLength(0)
  })
})

describe('Habits CRUD', () => {
  it('create habit', async () => {
    const habit = await window.electronAPI.habits.create({ name: 'Exercise', icon: 'dumbbell' })
    expect(habit.name).toBe('Exercise')
    const habits = await window.electronAPI.habits.list()
    expect(habits).toHaveLength(1)
  })

  it('toggle habit log', async () => {
    const habit = await window.electronAPI.habits.create({ name: 'Read' })
    const result = await window.electronAPI.habits.logs.toggle(habit.id, '2026-07-23')
    expect(result).toBe(true)
    const logs = await window.electronAPI.habits.logs.list(habit.id)
    expect(logs).toHaveLength(1)
    const result2 = await window.electronAPI.habits.logs.toggle(habit.id, '2026-07-23')
    expect(result2).toBe(false)
    const logs2 = await window.electronAPI.habits.logs.list(habit.id)
    expect(logs2).toHaveLength(0)
  })

  it('delete habit', async () => {
    const habit = await window.electronAPI.habits.create({ name: 'Meditate' })
    await window.electronAPI.habits.delete(habit.id)
    const habits = await window.electronAPI.habits.list()
    expect(habits).toHaveLength(0)
  })
})

describe('Goals CRUD', () => {
  it('create goal', async () => {
    const goal = await window.electronAPI.goals.create({ title: '4 pomodoros daily', type: 'daily', target: 4, metric: 'pomodoros' })
    expect(goal.title).toBe('4 pomodoros daily')
    const goals = await window.electronAPI.goals.list()
    expect(goals).toHaveLength(1)
  })

  it('add and get goal progress', async () => {
    const goal = await window.electronAPI.goals.create({ title: 'Test', type: 'daily', target: 5, metric: 'pomodoros' })
    await window.electronAPI.goals.progress.add(goal.id, '2026-07-23', 3)
    await window.electronAPI.goals.progress.add(goal.id, '2026-07-23', 2)
    const total = await window.electronAPI.goals.progress.get(goal.id, '2026-07-23')
    expect(total).toBe(5)
  })

  it('delete goal', async () => {
    const goal = await window.electronAPI.goals.create({ title: 'Delete me', type: 'daily', target: 1, metric: 'tareas' })
    await window.electronAPI.goals.delete(goal.id)
    const goals = await window.electronAPI.goals.list()
    expect(goals).toHaveLength(0)
  })
})

describe('Snippets CRUD', () => {
  it('create snippet', async () => {
    const snippet = await window.electronAPI.snippets.create({ title: 'React hook', code: 'useState()', language: 'typescript' })
    expect(snippet.title).toBe('React hook')
    const snippets = await window.electronAPI.snippets.list()
    expect(snippets).toHaveLength(1)
  })

  it('delete snippet', async () => {
    const snippet = await window.electronAPI.snippets.create({ title: 'To delete', code: 'x' })
    await window.electronAPI.snippets.delete(snippet.id)
    const snippets = await window.electronAPI.snippets.list()
    expect(snippets).toHaveLength(0)
  })
})

describe('Kanban Cards', () => {
  it('create and move card', async () => {
    const card = await window.electronAPI.kanban.cards.create({ title: 'Card 1', column_type: 'pendiente' })
    expect(card.column_type).toBe('pendiente')
    await window.electronAPI.kanban.cards.move(card.id, 'en-progreso', 0)
    const cards = await window.electronAPI.kanban.cards.list()
    expect(cards[0].column_type).toBe('en-progreso')
  })

  it('delete card', async () => {
    const card = await window.electronAPI.kanban.cards.create({ title: 'Delete me', column_type: 'pendiente' })
    await window.electronAPI.kanban.cards.delete(card.id)
    const cards = await window.electronAPI.kanban.cards.list()
    expect(cards).toHaveLength(0)
  })
})

describe('Settings', () => {
  it('set and get setting', async () => {
    await window.electronAPI.settings.set('userName', 'Alexis')
    const val = await window.electronAPI.settings.get('userName')
    expect(val).toBe('Alexis')
  })

  it('returns null for missing setting', async () => {
    const val = await window.electronAPI.settings.get('nonexistent')
    expect(val).toBeNull()
  })

  it('overwrites setting', async () => {
    await window.electronAPI.settings.set('theme', 'dark')
    await window.electronAPI.settings.set('theme', 'light')
    const val = await window.electronAPI.settings.get('theme')
    expect(val).toBe('light')
  })
})

describe('Streaks', () => {
  it('creates streak on first update', async () => {
    const result = await window.electronAPI.streaks.update('daily_study')
    expect(result.current).toBe(1)
    expect(result.max).toBe(1)
  })

  it('get streak', async () => {
    await window.electronAPI.streaks.update('daily_study')
    const streak = await window.electronAPI.streaks.get('daily_study')
    expect(streak).not.toBeNull()
    expect(streak!.current).toBe(1)
  })

  it('returns null for missing streak', async () => {
    const streak = await window.electronAPI.streaks.get('nonexistent')
    expect(streak).toBeNull()
  })
})

describe('Daily Logs', () => {
  it('create and get daily log', async () => {
    const log = await window.electronAPI.dailyLogs.create({ date: '2026-07-23', content: 'Good day', focus: 'Study', blockers: 'None' })
    expect(log.date).toBe('2026-07-23')
    const retrieved = await window.electronAPI.dailyLogs.get('2026-07-23')
    expect(retrieved!.content).toBe('Good day')
  })

  it('get all daily logs', async () => {
    await window.electronAPI.dailyLogs.create({ date: '2026-07-22', content: 'Day 1' })
    await window.electronAPI.dailyLogs.create({ date: '2026-07-23', content: 'Day 2' })
    const logs = await window.electronAPI.dailyLogs.list()
    expect(logs).toHaveLength(2)
  })
})

describe('Trash System', () => {
  it('soft delete and retrieve trash', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Trashed task' })
    await window.electronAPI.trash.softDelete('task', task.id)
    const trash = await window.electronAPI.trash.list()
    expect(trash.tasks).toHaveLength(1)
    expect(trash.tasks[0].title).toBe('Trashed task')
  })

  it('restore item from trash', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Restore me' })
    await window.electronAPI.trash.softDelete('task', task.id)
    await window.electronAPI.trash.restore('task', task.id)
    const tasks = await window.electronAPI.tasks.list()
    expect(tasks).toHaveLength(1)
  })

  it('permanent delete', async () => {
    const task = await window.electronAPI.tasks.create({ title: 'Permanently delete' })
    await window.electronAPI.trash.softDelete('task', task.id)
    await window.electronAPI.trash.deletePermanent('task', task.id)
    const trash = await window.electronAPI.trash.list()
    expect(trash.tasks).toHaveLength(0)
  })

  it('empty trash clears all', async () => {
    await window.electronAPI.tasks.create({ title: 'T1' })
    await window.electronAPI.tasks.create({ title: 'T2' })
    const tasks = await window.electronAPI.tasks.list()
    await window.electronAPI.trash.softDelete('task', tasks[0].id)
    await window.electronAPI.trash.softDelete('task', tasks[1].id)
    await window.electronAPI.trash.empty()
    const trash = await window.electronAPI.trash.list()
    expect(trash.tasks).toHaveLength(0)
  })
})

describe('Search', () => {
  it('finds tasks by title', async () => {
    await window.electronAPI.tasks.create({ title: 'Learn TypeScript' })
    await window.electronAPI.tasks.create({ title: 'Buy groceries' })
    const results = await window.electronAPI.search('TypeScript')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('tarea')
  })

  it('finds notes by title', async () => {
    await window.electronAPI.notes.create({ title: 'Meeting notes' })
    const results = await window.electronAPI.search('Meeting')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('nota')
  })

  it('returns empty for no match', async () => {
    await window.electronAPI.tasks.create({ title: 'Test' })
    const results = await window.electronAPI.search('zzz_nonexistent_zzz')
    expect(results).toHaveLength(0)
  })
})

describe('Statistics', () => {
  it('returns stats object', async () => {
    await window.electronAPI.tasks.create({ title: 'T1' })
    await window.electronAPI.tasks.create({ title: 'T2' })
    await window.electronAPI.tasks.toggle((await window.electronAPI.tasks.list())[0].id)
    const stats = await window.electronAPI.stats.get('week')
    expect(stats.tasksTotal.count).toBe(2)
    expect(stats.tasksCompleted.count).toBe(1)
  })
})

describe('Dashboard', () => {
  it('returns dashboard data', async () => {
    const data = await window.electronAPI.dashboard.get()
    expect(data).toHaveProperty('pomodorosToday')
    expect(data).toHaveProperty('tasksPending')
    expect(data).toHaveProperty('xp')
    expect(data).toHaveProperty('streak')
  })
})

describe('XP / Gamification', () => {
  it('get XP starts at 0', async () => {
    const xp = await window.electronAPI.gamification.xp.get()
    expect(xp.total).toBe(0)
  })

  it('add XP increases total', async () => {
    await window.electronAPI.gamification.xp.add(50, 'test reason')
    const xp = await window.electronAPI.gamification.xp.get()
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

  it('__confirmDelete accepts an onConfirm callback (refresco tras eliminar)', () => {
    let refreshCalled = false
    ;(window as any).__confirmDelete = (_type: string, _id: number, _title: string, onConfirm?: () => void) => { onConfirm?.(); refreshCalled = true }
    ;(window as any).__confirmDelete('task', 42, 'My Task', () => { refreshCalled = true })
    expect(refreshCalled).toBe(true)
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
