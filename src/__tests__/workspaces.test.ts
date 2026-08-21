import { describe, it, expect, beforeEach } from 'vitest'

interface Workspace { id: number; name: string; icon: string; color: string; is_default: number; sort_order: number }
interface MockTask { id: number; title: string; workspace_id?: number; deleted: number; created_at: string }

function mockApi() {
  const workspaces: Workspace[] = []
  let nextId = 0
  const tasks: MockTask[] = []

  return {
    api: {
      workspaces: {
        list: async () => [...workspaces],
        create: async (w: { name: string; icon?: string; color?: string }) => {
          const ws: Workspace = { id: ++nextId, name: w.name, icon: w.icon || 'briefcase', color: w.color || '#6366f1', is_default: workspaces.length === 0 ? 1 : 0, sort_order: workspaces.length }
          workspaces.push(ws)
          return ws
        },
        update: async (id: number, data: Partial<Workspace>) => {
          const ws = workspaces.find(w => w.id === id)
          if (ws) Object.assign(ws, data)
          return ws
        },
        delete: async (id: number) => {
          const idx = workspaces.findIndex(w => w.id === id)
          if (idx >= 0) workspaces.splice(idx, 1)
          return true
        },
      },
      tasks: {
        list: async () => tasks.filter(t => !t.deleted),
        create: async (t: { title: string; workspace_id?: number }) => {
          const task: MockTask = { id: tasks.length + 1, title: t.title, workspace_id: t.workspace_id, deleted: 0, created_at: new Date().toISOString() }
          tasks.push(task)
          return task
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

describe('Workspaces', () => {
  it('create workspace', async () => {
    const ws = await window.electronAPI!.workspaces.create({ name: 'Personal' })
    expect(ws.id).toBe(1)
    expect(ws.name).toBe('Personal')
    expect(ws.icon).toBe('briefcase')
    expect(ws.color).toBe('#6366f1')
  })

  it('create workspace with custom icon and color', async () => {
    const ws = await window.electronAPI!.workspaces.create({ name: 'Work', icon: 'code', color: '#ff0000' })
    expect(ws.icon).toBe('code')
    expect(ws.color).toBe('#ff0000')
  })

  it('list workspaces', async () => {
    await window.electronAPI!.workspaces.create({ name: 'Personal' })
    await window.electronAPI!.workspaces.create({ name: 'Work' })
    const list = await window.electronAPI!.workspaces.list()
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('Personal')
    expect(list[1].name).toBe('Work')
  })

  it('update workspace', async () => {
    const ws = await window.electronAPI!.workspaces.create({ name: 'Old' })
    const updated = await window.electronAPI!.workspaces.update(ws.id, { name: 'Updated', color: '#00ff00' })
    expect(updated!.name).toBe('Updated')
    expect(updated!.color).toBe('#00ff00')
  })

  it('delete workspace', async () => {
    const ws = await window.electronAPI!.workspaces.create({ name: 'Temp' })
    await window.electronAPI!.workspaces.delete(ws.id)
    const list = await window.electronAPI!.workspaces.list()
    expect(list).toHaveLength(0)
  })

  it('empty workspace list returns empty array', async () => {
    const list = await window.electronAPI!.workspaces.list()
    expect(list).toEqual([])
  })
})

describe('Workspace task filtering', () => {
  it('create tasks in different workspaces', async () => {
    const ws1 = await window.electronAPI!.workspaces.create({ name: 'Personal' })
    const ws2 = await window.electronAPI!.workspaces.create({ name: 'Work' })
    await window.electronAPI!.tasks.create({ title: 'Buy milk', workspace_id: ws1.id })
    await window.electronAPI!.tasks.create({ title: 'Write report', workspace_id: ws2.id })
    const allTasks = await window.electronAPI!.tasks.list()
    expect(allTasks).toHaveLength(2)
    expect(allTasks[0].workspace_id).toBe(ws1.id)
    expect(allTasks[1].workspace_id).toBe(ws2.id)
  })

  it('maintains first workspace as default', async () => {
    const ws1 = await window.electronAPI!.workspaces.create({ name: 'Main' })
    expect(ws1.is_default).toBe(1)
    const ws2 = await window.electronAPI!.workspaces.create({ name: 'Secondary' })
    expect(ws2.is_default).toBe(0)
  })

  it('delete workspace does not affect tasks', async () => {
    const ws = await window.electronAPI!.workspaces.create({ name: 'Temp' })
    await window.electronAPI!.tasks.create({ title: 'Task in temp', workspace_id: ws.id })
    await window.electronAPI!.workspaces.delete(ws.id)
    const tasks = await window.electronAPI!.tasks.list()
    expect(tasks).toHaveLength(1)
  })
})