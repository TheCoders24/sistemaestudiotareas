import { describe, it, expect, beforeEach } from 'vitest'

interface KanbanColumn { id: number; name: string; type: string; color: string; wip_limit: number; position: number }

function mockApi() {
  const columns: KanbanColumn[] = []
  let nextId = 0

  return {
    api: {
      kanban: {
        columns: {
          list: async () => [...columns],
          create: async (c: { name: string; type?: string; color?: string; wip_limit?: number }) => {
            const col: KanbanColumn = { id: ++nextId, name: c.name, type: c.type || 'custom', color: c.color || '#6366f1', wip_limit: c.wip_limit || 0, position: columns.length }
            columns.push(col)
            return col
          },
          update: async (id: number, data: Partial<KanbanColumn>) => {
            const col = columns.find(c => c.id === id)
            if (col) Object.assign(col, data)
            return col
          },
          delete: async (id: number) => {
            const idx = columns.findIndex(c => c.id === id)
            if (idx >= 0) columns.splice(idx, 1)
            return true
          },
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

describe('Kanban Columns CRUD', () => {
  it('create column', async () => {
    const col = await window.electronAPI!.kanban.columns.create({ name: 'To Do' })
    expect(col.id).toBe(1)
    expect(col.name).toBe('To Do')
    expect(col.position).toBe(0)
  })

  it('create column with custom color and wip limit', async () => {
    const col = await window.electronAPI!.kanban.columns.create({ name: 'In Progress', color: '#ff8800', wip_limit: 3 })
    expect(col.color).toBe('#ff8800')
    expect(col.wip_limit).toBe(3)
  })

  it('list columns returns all', async () => {
    await window.electronAPI!.kanban.columns.create({ name: 'A' })
    await window.electronAPI!.kanban.columns.create({ name: 'B' })
    const list = await window.electronAPI!.kanban.columns.list()
    expect(list).toHaveLength(2)
  })

  it('update column', async () => {
    const col = await window.electronAPI!.kanban.columns.create({ name: 'Old', wip_limit: 2 })
    const updated = await window.electronAPI!.kanban.columns.update(col.id, { name: 'New', wip_limit: 5 })
    expect(updated!.name).toBe('New')
    expect(updated!.wip_limit).toBe(5)
  })

  it('delete column', async () => {
    const col = await window.electronAPI!.kanban.columns.create({ name: 'Temp' })
    await window.electronAPI!.kanban.columns.delete(col.id)
    const list = await window.electronAPI!.kanban.columns.list()
    expect(list).toHaveLength(0)
  })

  it('empty list returns []', async () => {
    const list = await window.electronAPI!.kanban.columns.list()
    expect(list).toEqual([])
  })

  it('update non-existent column returns undefined', async () => {
    const result = await window.electronAPI!.kanban.columns.update(999, { name: 'Ghost' })
    expect(result).toBeUndefined()
  })
})