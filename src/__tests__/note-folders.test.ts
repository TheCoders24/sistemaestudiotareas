import { describe, it, expect, beforeEach } from 'vitest'

interface NoteFolder { id: number; name: string; parent_id: number | null; color: string }

function mockApi() {
  const folders: NoteFolder[] = []
  let nextId = 0

  return {
    api: {
      notes: {
        folders: {
          list: async () => [...folders],
          create: async (f: { name: string; parent_id?: number | null; color?: string }) => {
            const folder: NoteFolder = { id: ++nextId, name: f.name, parent_id: f.parent_id ?? null, color: f.color || '#6366f1' }
            folders.push(folder)
            return folder
          },
          update: async (id: number, data: Partial<NoteFolder>) => {
            const f = folders.find(x => x.id === id)
            if (f) Object.assign(f, data)
            return f
          },
          delete: async (id: number) => {
            const idx = folders.findIndex(x => x.id === id)
            if (idx >= 0) folders.splice(idx, 1)
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

describe('Note Folders CRUD', () => {
  it('create root folder', async () => {
    const f = await window.electronAPI!.notes.folders.create({ name: 'Notes' })
    expect(f.id).toBe(1)
    expect(f.name).toBe('Notes')
    expect(f.parent_id).toBeNull()
  })

  it('create subfolder', async () => {
    const parent = await window.electronAPI!.notes.folders.create({ name: 'Parent' })
    const child = await window.electronAPI!.notes.folders.create({ name: 'Child', parent_id: parent.id })
    expect(child.parent_id).toBe(parent.id)
  })

  it('create folder with custom color', async () => {
    const f = await window.electronAPI!.notes.folders.create({ name: 'Work', color: '#ff6600' })
    expect(f.color).toBe('#ff6600')
  })

  it('list folders', async () => {
    await window.electronAPI!.notes.folders.create({ name: 'A' })
    await window.electronAPI!.notes.folders.create({ name: 'B' })
    const list = await window.electronAPI!.notes.folders.list()
    expect(list).toHaveLength(2)
  })

  it('update folder name', async () => {
    const f = await window.electronAPI!.notes.folders.create({ name: 'Old' })
    await window.electronAPI!.notes.folders.update(f.id, { name: 'New' })
    const list = await window.electronAPI!.notes.folders.list()
    expect(list[0].name).toBe('New')
  })

  it('update folder reparent', async () => {
    const a = await window.electronAPI!.notes.folders.create({ name: 'A' })
    const b = await window.electronAPI!.notes.folders.create({ name: 'B' })
    await window.electronAPI!.notes.folders.update(b.id, { parent_id: a.id })
    const list = await window.electronAPI!.notes.folders.list()
    expect(list.find(x => x.id === b.id)!.parent_id).toBe(a.id)
  })

  it('delete folder', async () => {
    const f = await window.electronAPI!.notes.folders.create({ name: 'Temp' })
    await window.electronAPI!.notes.folders.delete(f.id)
    const list = await window.electronAPI!.notes.folders.list()
    expect(list).toHaveLength(0)
  })

  it('empty list returns []', async () => {
    expect(await window.electronAPI!.notes.folders.list()).toEqual([])
  })
})