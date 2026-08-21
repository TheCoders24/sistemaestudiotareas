import { describe, it, expect, beforeEach, vi } from 'vitest'

interface Task { id: number; title: string; completed: number; deleted: number }
interface TaskDep { id: number; task_id: number; depends_on_id: number }
interface TaskComment { id: number; task_id: number; content: string; created_at: string }
interface TimeEntry { id: number; task_id: number; start_time: string; end_time: string | null; duration: number }

function mockApi() {
  let taskId = 0, depId = 0, commentId = 0, timeId = 0
  const tasks: Task[] = []
  const deps: TaskDep[] = []
  const comments: TaskComment[] = []
  const timeEntries: TimeEntry[] = []

  return {
    api: {
      tasks: {
        create: async (t: { title: string }) => {
          const task: Task = { id: ++taskId, title: t.title, completed: 0, deleted: 0 }
          tasks.push(task)
          return task
        },
        dependencies: {
          get: async (taskId: number) => deps
            .filter(d => d.task_id === taskId)
            .map(d => ({ id: d.depends_on_id, title: tasks.find(t => t.id === d.depends_on_id)?.title ?? '' })),
          getDependents: async (taskId: number) => deps
            .filter(d => d.depends_on_id === taskId)
            .map(d => ({ id: d.task_id, title: tasks.find(t => t.id === d.task_id)?.title ?? '' })),
          add: async (taskId: number, dependsOnId: number) => {
            const exists = deps.some(d => d.task_id === taskId && d.depends_on_id === dependsOnId)
            if (!exists) deps.push({ id: ++depId, task_id: taskId, depends_on_id: dependsOnId })
            return true
          },
          remove: async (taskId: number, dependsOnId: number) => {
            const idx = deps.findIndex(d => d.task_id === taskId && d.depends_on_id === dependsOnId)
            if (idx >= 0) deps.splice(idx, 1)
            return true
          },
        },
        comments: {
          list: async (taskId: number) => comments.filter(c => c.task_id === taskId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
          add: async (taskId: number, content: string) => {
            const c: TaskComment = { id: ++commentId, task_id: taskId, content, created_at: new Date().toISOString() }
            comments.push(c)
            return c
          },
          delete: async (id: number) => {
            const idx = comments.findIndex(c => c.id === id)
            if (idx >= 0) { comments.splice(idx, 1); return true }
            return false
          },
        },
        timeTracking: {
          list: async (taskId: number) => timeEntries.filter(e => e.task_id === taskId),
          start: async (taskId: number) => {
            const entry: TimeEntry = { id: ++timeId, task_id: taskId, start_time: new Date().toISOString(), end_time: null, duration: 0 }
            timeEntries.push(entry)
            return entry
          },
          stop: async (id: number) => {
            const entry = timeEntries.find(e => e.id === id)
            if (!entry || entry.end_time) return entry
            entry.end_time = new Date().toISOString()
            entry.duration = Math.round((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 1000)
            return entry
          },
          delete: async (id: number) => {
            const idx = timeEntries.findIndex(e => e.id === id)
            if (idx >= 0) { timeEntries.splice(idx, 1); return true }
            return false
          },
          total: async (taskId: number) => timeEntries.filter(e => e.task_id === taskId && e.end_time).reduce((sum, e) => sum + e.duration, 0),
        },
      },
    } as any,
  }
}

let mock: ReturnType<typeof mockApi>

beforeEach(() => {
  mock = mockApi()
  ;(window as any).electronAPI = mock.api
})

describe('Task Dependencies', () => {
  it('add dependency between tasks', async () => {
    const t1 = await window.electronAPI!.tasks.create({ title: 'Setup' })
    const t2 = await window.electronAPI!.tasks.create({ title: 'Build' })
    const added = await window.electronAPI!.tasks.dependencies.add(t1.id, t2.id)
    expect(added).toBe(true)
    const deps = await window.electronAPI!.tasks.dependencies.get(t1.id)
    expect(deps).toHaveLength(1)
    expect(deps[0].id).toBe(t2.id)
    expect(deps[0].title).toBe('Build')
  })

  it('list dependencies for a task', async () => {
    const t1 = await window.electronAPI!.tasks.create({ title: 'A' })
    const t2 = await window.electronAPI!.tasks.create({ title: 'B' })
    const t3 = await window.electronAPI!.tasks.create({ title: 'C' })
    await window.electronAPI!.tasks.dependencies.add(t1.id, t2.id)
    await window.electronAPI!.tasks.dependencies.add(t1.id, t3.id)
    const deps = await window.electronAPI!.tasks.dependencies.get(t1.id)
    expect(deps).toHaveLength(2)
    expect(deps[0].id).toBe(t2.id)
    expect(deps[1].id).toBe(t3.id)
  })

  it('list dependents for a task', async () => {
    const t1 = await window.electronAPI!.tasks.create({ title: 'Base' })
    const t2 = await window.electronAPI!.tasks.create({ title: 'Dep A' })
    const t3 = await window.electronAPI!.tasks.create({ title: 'Dep B' })
    await window.electronAPI!.tasks.dependencies.add(t2.id, t1.id)
    await window.electronAPI!.tasks.dependencies.add(t3.id, t1.id)
    const dependents = await window.electronAPI!.tasks.dependencies.getDependents(t1.id)
    expect(dependents).toHaveLength(2)
    expect(dependents[0].id).toBe(t2.id)
    expect(dependents[1].id).toBe(t3.id)
  })

  it('remove dependency', async () => {
    const t1 = await window.electronAPI!.tasks.create({ title: 'A' })
    const t2 = await window.electronAPI!.tasks.create({ title: 'B' })
    await window.electronAPI!.tasks.dependencies.add(t1.id, t2.id)
    const removed = await window.electronAPI!.tasks.dependencies.remove(t1.id, t2.id)
    expect(removed).toBe(true)
    const deps = await window.electronAPI!.tasks.dependencies.get(t1.id)
    expect(deps).toHaveLength(0)
  })

  it('self-dependency is idempotent', async () => {
    const t = await window.electronAPI!.tasks.create({ title: 'Self' })
    const result = await window.electronAPI!.tasks.dependencies.add(t.id, t.id)
    expect(result).toBe(true)
  })

  it('duplicate dependency is idempotent', async () => {
    const t1 = await window.electronAPI!.tasks.create({ title: 'A' })
    const t2 = await window.electronAPI!.tasks.create({ title: 'B' })
    const r1 = await window.electronAPI!.tasks.dependencies.add(t1.id, t2.id)
    const r2 = await window.electronAPI!.tasks.dependencies.add(t1.id, t2.id)
    expect(r1).toBe(true)
    expect(r2).toBe(true)
    const deps = await window.electronAPI!.tasks.dependencies.get(t1.id)
    expect(deps).toHaveLength(1)
  })
})

describe('Task Comments', () => {
  it('add comment to task', async () => {
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const comment = await window.electronAPI!.tasks.comments.add(task.id, 'This is a comment')
    expect(comment.task_id).toBe(task.id)
    expect(comment.content).toBe('This is a comment')
  })

  it('list comments in order', async () => {
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const c1 = await window.electronAPI!.tasks.comments.add(task.id, 'First')
    await new Promise(r => setTimeout(r, 5))
    const c2 = await window.electronAPI!.tasks.comments.add(task.id, 'Second')
    const list = await window.electronAPI!.tasks.comments.list(task.id)
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe(c1.id)
    expect(list[1].id).toBe(c2.id)
  })

  it('delete comment', async () => {
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const comment = await window.electronAPI!.tasks.comments.add(task.id, 'To delete')
    await window.electronAPI!.tasks.comments.delete(comment.id)
    const list = await window.electronAPI!.tasks.comments.list(task.id)
    expect(list).toHaveLength(0)
  })

  it('empty comments returns []', async () => {
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const list = await window.electronAPI!.tasks.comments.list(task.id)
    expect(list).toEqual([])
  })
})

describe('Time Tracking', () => {
  it('start time entry', async () => {
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const entry = await window.electronAPI!.tasks.timeTracking.start(task.id)
    expect(entry.task_id).toBe(task.id)
    expect(entry.end_time).toBeNull()
    expect(entry.duration).toBe(0)
  })

  it('stop time entry calculates duration', async () => {
    vi.useFakeTimers()
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const entry = await window.electronAPI!.tasks.timeTracking.start(task.id)
    vi.advanceTimersByTime(1500)
    const stopped = await window.electronAPI!.tasks.timeTracking.stop(entry.id)
    expect(stopped.end_time).not.toBeNull()
    expect(stopped.duration).toBeGreaterThanOrEqual(1)
    vi.useRealTimers()
  })

  it('list time entries for task', async () => {
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const e1 = await window.electronAPI!.tasks.timeTracking.start(task.id)
    await window.electronAPI!.tasks.timeTracking.stop(e1.id)
    await window.electronAPI!.tasks.timeTracking.start(task.id)
    const entries = await window.electronAPI!.tasks.timeTracking.list(task.id)
    expect(entries).toHaveLength(2)
  })

  it('get total tracked time', async () => {
    vi.useFakeTimers()
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const e1 = await window.electronAPI!.tasks.timeTracking.start(task.id)
    vi.advanceTimersByTime(1500)
    await window.electronAPI!.tasks.timeTracking.stop(e1.id)
    const total = await window.electronAPI!.tasks.timeTracking.total(task.id)
    expect(total).toBeGreaterThanOrEqual(1)
    vi.useRealTimers()
  })

  it('delete time entry', async () => {
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const entry = await window.electronAPI!.tasks.timeTracking.start(task.id)
    await window.electronAPI!.tasks.timeTracking.delete(entry.id)
    const entries = await window.electronAPI!.tasks.timeTracking.list(task.id)
    expect(entries).toHaveLength(0)
  })

  it('double start creates two entries', async () => {
    const task = await window.electronAPI!.tasks.create({ title: 'Task' })
    const e1 = await window.electronAPI!.tasks.timeTracking.start(task.id)
    const e2 = await window.electronAPI!.tasks.timeTracking.start(task.id)
    const entries = await window.electronAPI!.tasks.timeTracking.list(task.id)
    expect(entries).toHaveLength(2)
    expect(e1.id).not.toBe(e2.id)
  })

  it('stop non-existent entry returns undefined', async () => {
    const result = await window.electronAPI!.tasks.timeTracking.stop(999)
    expect(result).toBeUndefined()
  })
})