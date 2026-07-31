import { describe, it, expect, beforeEach } from 'vitest'

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
      createTask: async (t: any) => {
        const task: Task = { id: ++taskId, title: t.title, completed: 0, deleted: 0 }
        tasks.push(task)
        return task
      },
      getTask: async (id: number) => tasks.find(t => t.id === id) || null,
      getDependencies: async (taskId: number) => deps.filter(d => d.task_id === taskId).map(d => ({ ...d, task: tasks.find(t => t.id === d.depends_on_id) })),
      getDependents: async (taskId: number) => deps.filter(d => d.depends_on_id === taskId).map(d => ({ ...d, task: tasks.find(t => t.id === d.task_id) })),
      addDependency: async (taskId: number, dependsOnId: number) => {
        if (taskId === dependsOnId) throw new Error('Circular dependency')
        const existing = deps.find(d => d.task_id === taskId && d.depends_on_id === dependsOnId)
        if (existing) return existing
        const dep: TaskDep = { id: ++depId, task_id: taskId, depends_on_id: dependsOnId }
        deps.push(dep)
        return dep
      },
      removeDependency: async (id: number) => {
        const idx = deps.findIndex(d => d.id === id)
        if (idx >= 0) { deps.splice(idx, 1); return true }
        return false
      },
      getComments: async (taskId: number) => comments.filter(c => c.task_id === taskId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      addComment: async (taskId: number, content: string) => {
        const c: TaskComment = { id: ++commentId, task_id: taskId, content, created_at: new Date().toISOString() }
        comments.push(c)
        return c
      },
      deleteComment: async (id: number) => {
        const idx = comments.findIndex(c => c.id === id)
        if (idx >= 0) { comments.splice(idx, 1); return true }
        return false
      },
      getTimeEntries: async (taskId: number) => timeEntries.filter(e => e.task_id === taskId),
      startTimeEntry: async (taskId: number) => {
        const existing = timeEntries.find(e => e.task_id === taskId && !e.end_time)
        if (existing) return existing
        const entry: TimeEntry = { id: ++timeId, task_id: taskId, start_time: new Date().toISOString(), end_time: null, duration: 0 }
        timeEntries.push(entry)
        return entry
      },
      stopTimeEntry: async (id: number) => {
        const entry = timeEntries.find(e => e.id === id)
        if (!entry || entry.end_time) return entry
        entry.end_time = new Date().toISOString()
        entry.duration = Math.round((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / 1000)
        return entry
      },
      deleteTimeEntry: async (id: number) => {
        const idx = timeEntries.findIndex(e => e.id === id)
        if (idx >= 0) { timeEntries.splice(idx, 1); return true }
        return false
      },
      getTotalTrackedTime: async (taskId: number) => timeEntries.filter(e => e.task_id === taskId && e.end_time).reduce((sum, e) => sum + e.duration, 0),
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
    const t1 = await window.electronAPI!.createTask({ title: 'Setup' })
    const t2 = await window.electronAPI!.createTask({ title: 'Build' })
    const dep = await window.electronAPI!.addDependency(t1.id, t2.id)
    expect(dep.task_id).toBe(t1.id)
    expect(dep.depends_on_id).toBe(t2.id)
  })

  it('list dependencies for a task', async () => {
    const t1 = await window.electronAPI!.createTask({ title: 'A' })
    const t2 = await window.electronAPI!.createTask({ title: 'B' })
    const t3 = await window.electronAPI!.createTask({ title: 'C' })
    await window.electronAPI!.addDependency(t1.id, t2.id)
    await window.electronAPI!.addDependency(t1.id, t3.id)
    const deps = await window.electronAPI!.getDependencies(t1.id)
    expect(deps).toHaveLength(2)
    expect(deps[0].depends_on_id).toBe(t2.id)
    expect(deps[1].depends_on_id).toBe(t3.id)
  })

  it('list dependents for a task', async () => {
    const t1 = await window.electronAPI!.createTask({ title: 'Base' })
    const t2 = await window.electronAPI!.createTask({ title: 'Dep A' })
    const t3 = await window.electronAPI!.createTask({ title: 'Dep B' })
    await window.electronAPI!.addDependency(t2.id, t1.id)
    await window.electronAPI!.addDependency(t3.id, t1.id)
    const dependents = await window.electronAPI!.getDependents(t1.id)
    expect(dependents).toHaveLength(2)
    expect(dependents[0].task_id).toBe(t2.id)
    expect(dependents[1].task_id).toBe(t3.id)
  })

  it('remove dependency', async () => {
    const t1 = await window.electronAPI!.createTask({ title: 'A' })
    const t2 = await window.electronAPI!.createTask({ title: 'B' })
    const dep = await window.electronAPI!.addDependency(t1.id, t2.id)
    await window.electronAPI!.removeDependency(dep.id)
    const deps = await window.electronAPI!.getDependencies(t1.id)
    expect(deps).toHaveLength(0)
  })

  it('prevent self-dependency', async () => {
    const t = await window.electronAPI!.createTask({ title: 'Self' })
    await expect(window.electronAPI!.addDependency(t.id, t.id)).rejects.toThrow('Circular dependency')
  })

  it('duplicate dependency returns existing', async () => {
    const t1 = await window.electronAPI!.createTask({ title: 'A' })
    const t2 = await window.electronAPI!.createTask({ title: 'B' })
    const dep1 = await window.electronAPI!.addDependency(t1.id, t2.id)
    const dep2 = await window.electronAPI!.addDependency(t1.id, t2.id)
    expect(dep2.id).toBe(dep1.id)
  })
})

describe('Task Comments', () => {
  it('add comment to task', async () => {
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const comment = await window.electronAPI!.addComment(task.id, 'This is a comment')
    expect(comment.task_id).toBe(task.id)
    expect(comment.content).toBe('This is a comment')
  })

  it('list comments in order', async () => {
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const c1 = await window.electronAPI!.addComment(task.id, 'First')
    await new Promise(r => setTimeout(r, 5))
    const c2 = await window.electronAPI!.addComment(task.id, 'Second')
    const list = await window.electronAPI!.getComments(task.id)
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe(c1.id)
    expect(list[1].id).toBe(c2.id)
  })

  it('delete comment', async () => {
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const comment = await window.electronAPI!.addComment(task.id, 'To delete')
    await window.electronAPI!.deleteComment(comment.id)
    const list = await window.electronAPI!.getComments(task.id)
    expect(list).toHaveLength(0)
  })

  it('empty comments returns []', async () => {
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const list = await window.electronAPI!.getComments(task.id)
    expect(list).toEqual([])
  })
})

describe('Time Tracking', () => {
  it('start time entry', async () => {
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const entry = await window.electronAPI!.startTimeEntry(task.id)
    expect(entry.task_id).toBe(task.id)
    expect(entry.end_time).toBeNull()
    expect(entry.duration).toBe(0)
  })

  it('stop time entry calculates duration', async () => {
    vi.useFakeTimers()
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const entry = await window.electronAPI!.startTimeEntry(task.id)
    vi.advanceTimersByTime(1500)
    const stopped = await window.electronAPI!.stopTimeEntry(entry.id)
    expect(stopped.end_time).not.toBeNull()
    expect(stopped.duration).toBeGreaterThanOrEqual(1)
    vi.useRealTimers()
  })

  it('list time entries for task', async () => {
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const e1 = await window.electronAPI!.startTimeEntry(task.id)
    await window.electronAPI!.stopTimeEntry(e1.id)
    await window.electronAPI!.startTimeEntry(task.id)
    const entries = await window.electronAPI!.getTimeEntries(task.id)
    expect(entries).toHaveLength(2)
  })

  it('get total tracked time', async () => {
    vi.useFakeTimers()
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const e1 = await window.electronAPI!.startTimeEntry(task.id)
    vi.advanceTimersByTime(1500)
    await window.electronAPI!.stopTimeEntry(e1.id)
    const total = await window.electronAPI!.getTotalTrackedTime(task.id)
    expect(total).toBeGreaterThanOrEqual(1)
    vi.useRealTimers()
  })

  it('delete time entry', async () => {
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const entry = await window.electronAPI!.startTimeEntry(task.id)
    await window.electronAPI!.deleteTimeEntry(entry.id)
    const entries = await window.electronAPI!.getTimeEntries(task.id)
    expect(entries).toHaveLength(0)
  })

  it('double start returns existing entry', async () => {
    const task = await window.electronAPI!.createTask({ title: 'Task' })
    const e1 = await window.electronAPI!.startTimeEntry(task.id)
    const e2 = await window.electronAPI!.startTimeEntry(task.id)
    expect(e2.id).toBe(e1.id)
  })

  it('stop non-existent entry returns undefined', async () => {
    const result = await window.electronAPI!.stopTimeEntry(999)
    expect(result).toBeUndefined()
  })
})
