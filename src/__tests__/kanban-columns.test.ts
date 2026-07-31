import { describe, it, expect, beforeEach } from 'vitest'

interface KanbanColumn { id: number; name: string; type: string; color: string; wip_limit: number; position: number }

function mockApi() {
  const columns: KanbanColumn[] = []
  let nextId = 0

  return {
    api: {
      getKanbanColumns: async () => [...columns],
      createKanbanColumn: async (c: any) => {
        const col: KanbanColumn = { id: ++nextId, name: c.name, type: c.type || 'custom', color: c.color || '#6366f1', wip_limit: c.wip_limit || 0, position: columns.length }
        columns.push(col)
        return col
      },
      updateKanbanColumn: async (id: number, data: any) => {
        const col = columns.find(c => c.id === id)
        if (col) Object.assign(col, data)
        return col
      },
      deleteKanbanColumn: async (id: number) => {
        const idx = columns.findIndex(c => c.id === id)
        if (idx >= 0) columns.splice(idx, 1)
        return true
      },
      reorderKanbanColumns: async (ids: number[]) => {
        ids.forEach((id, i) => {
          const col = columns.find(c => c.id === id)
          if (col) col.position = i
        })
        return true
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
    const col = await window.electronAPI!.createKanbanColumn({ name: 'To Do' })
    expect(col.id).toBe(1)
    expect(col.name).toBe('To Do')
    expect(col.position).toBe(0)
  })

  it('create column with custom color and wip limit', async () => {
    const col = await window.electronAPI!.createKanbanColumn({ name: 'In Progress', color: '#ff8800', wip_limit: 3 })
    expect(col.color).toBe('#ff8800')
    expect(col.wip_limit).toBe(3)
  })

  it('list columns returns all', async () => {
    await window.electronAPI!.createKanbanColumn({ name: 'A' })
    await window.electronAPI!.createKanbanColumn({ name: 'B' })
    const list = await window.electronAPI!.getKanbanColumns()
    expect(list).toHaveLength(2)
  })

  it('update column', async () => {
    const col = await window.electronAPI!.createKanbanColumn({ name: 'Old', wip_limit: 2 })
    const updated = await window.electronAPI!.updateKanbanColumn(col.id, { name: 'New', wip_limit: 5 })
    expect(updated!.name).toBe('New')
    expect(updated!.wip_limit).toBe(5)
  })

  it('delete column', async () => {
    const col = await window.electronAPI!.createKanbanColumn({ name: 'Temp' })
    await window.electronAPI!.deleteKanbanColumn(col.id)
    const list = await window.electronAPI!.getKanbanColumns()
    expect(list).toHaveLength(0)
  })

  it('reorder updates positions', async () => {
    const a = await window.electronAPI!.createKanbanColumn({ name: 'A' })
    const b = await window.electronAPI!.createKanbanColumn({ name: 'B' })
    const c = await window.electronAPI!.createKanbanColumn({ name: 'C' })
    await window.electronAPI!.reorderKanbanColumns([c.id, a.id, b.id])
    const cols = await window.electronAPI!.getKanbanColumns()
    expect(cols.find((x: any) => x.id === c.id)!.position).toBe(0)
    expect(cols.find((x: any) => x.id === a.id)!.position).toBe(1)
    expect(cols.find((x: any) => x.id === b.id)!.position).toBe(2)
  })

  it('empty list returns []', async () => {
    const list = await window.electronAPI!.getKanbanColumns()
    expect(list).toEqual([])
  })

  it('update non-existent column returns undefined', async () => {
    const result = await window.electronAPI!.updateKanbanColumn(999, { name: 'Ghost' })
    expect(result).toBeUndefined()
  })
})
