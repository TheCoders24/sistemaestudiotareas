import { describe, it, expect } from 'vitest'
import { ok, fail, isOk, isFail, unwrap, unwrapOr, map, mapError, flatMap } from '../core/shared/result'
import { TaskNotFoundError, WorkspaceNotFoundError, InvalidTaskTitleError, CircularDependencyError, ValidationError } from '../core/shared/errors'
import { InMemoryEventBus } from '../core/shared/event-bus'
import { LruCache } from '../core/shared/lru-cache'
import { createTask, completeTask, uncompleteTask } from '../core/domain/task'
import { createWorkspace } from '../core/domain/workspace'
import { createProject } from '../core/domain/project'
import { createKanbanColumn } from '../core/domain/kanban'
import { createNote } from '../core/domain/note'
import { createCalendarEvent } from '../core/domain/calendar-event'
import { createLabel } from '../core/domain/label'
import { createAttachment } from '../core/domain/attachment'
import { DEFAULT_SETTINGS } from '../core/domain/settings'
import { validateCreateTask, validateCreateWorkspace } from '../core/application/validators'
import { toIpcResult, fromIpcResult, wrapIpcHandler, sanitizeFileName, validateId } from '../core/infrastructure/ipc/validation'
import { ICommand, CommandHistory } from '../core/application/use-cases/undo-redo'

describe('Result Pattern', () => {
  it('ok creates success result', () => {
    const r = ok(42)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(42)
  })

  it('fail creates failure result', () => {
    const r = fail(new Error('fail'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message).toBe('fail')
  })

  it('isOk type guard', () => {
    expect(isOk(ok(1))).toBe(true)
    expect(isOk(fail(new Error('x')))).toBe(false)
  })

  it('isFail type guard', () => {
    expect(isFail(fail(new Error('x')))).toBe(true)
    expect(isFail(ok(1))).toBe(false)
  })

  it('unwrap returns value on ok', () => {
    expect(unwrap(ok(42))).toBe(42)
  })

  it('unwrap throws on fail', () => {
    expect(() => unwrap(fail(new Error('e')))).toThrow('e')
  })

  it('unwrapOr returns fallback on fail', () => {
    expect(unwrapOr(fail(new Error('e')), 0)).toBe(0)
    expect(unwrapOr(ok(42), 0)).toBe(42)
  })

  it('map transforms value', () => {
    const r = map(ok(2), x => x * 3)
    expect(unwrap(r)).toBe(6)
  })

  it('map skips on fail', () => {
    const r = map(fail(new Error('e')), x => x)
    expect(isFail(r)).toBe(true)
  })

  it('flatMap chains results', () => {
    const r = flatMap(ok(5), x => ok(x * 2))
    expect(unwrap(r)).toBe(10)
  })

  it('mapError transforms error', () => {
    const r = mapError(fail(new Error('original')), e => new Error(`wrapped: ${e.message}`))
    expect(isFail(r)).toBe(true)
    if (!r.ok) expect(r.error.message).toBe('wrapped: original')
  })
})

describe('Domain Errors', () => {
  it('TaskNotFoundError', () => {
    const e = new TaskNotFoundError(42)
    expect(e.name).toBe('TaskNotFoundError')
    expect(e.message).toContain('42')
  })

  it('WorkspaceNotFoundError', () => {
    const e = new WorkspaceNotFoundError('ws_1')
    expect(e.name).toBe('WorkspaceNotFoundError')
    expect(e.message).toContain('ws_1')
  })

  it('InvalidTaskTitleError', () => {
    const e = new InvalidTaskTitleError()
    expect(e.name).toBe('InvalidTaskTitleError')
  })

  it('CircularDependencyError', () => {
    const e = new CircularDependencyError()
    expect(e.name).toBe('CircularDependencyError')
  })

  it('ValidationError with issues', () => {
    const e = new ValidationError([{ path: 'title', message: 'Title is required' }])
    expect(e.name).toBe('ValidationError')
    expect(e.issues).toHaveLength(1)
    expect(e.issues[0].path).toBe('title')
  })
})

describe('EventBus', () => {
  it('publish and subscribe', async () => {
    const bus = new InMemoryEventBus()
    const received: string[] = []
    bus.subscribe('task.completed', (e: any) => { received.push(e.payload.taskId) })
    await bus.publish({ id: '1', type: 'task.completed', occurredAt: '', aggregateId: 1, payload: { taskId: '1', projectId: null, workspaceId: 1, completedAt: '' } } as any)
    expect(received).toEqual(['1'])
  })

  it('unsubscribe removes handler', async () => {
    const bus = new InMemoryEventBus()
    let count = 0
    const unsub = bus.subscribe('task.created', () => { count++ })
    unsub()
    await bus.publish({ id: '1', type: 'task.created', occurredAt: '', payload: {} } as any)
    expect(count).toBe(0)
  })

  it('multiple subscribers all receive event', async () => {
    const bus = new InMemoryEventBus()
    let a = 0, b = 0
    bus.subscribe('task.completed', () => { a++ })
    bus.subscribe('task.completed', () => { b++ })
    await bus.publish({ id: '1', type: 'task.completed', occurredAt: '', payload: {} } as any)
    expect(a).toBe(1)
    expect(b).toBe(1)
  })

  it('subscribeAll receives all events', async () => {
    const bus = new InMemoryEventBus()
    const events: string[] = []
    bus.subscribeAll((e: any) => { events.push(e.type) })
    await bus.publish({ id: '1', type: 'a', occurredAt: '', payload: {} } as any)
    await bus.publish({ id: '2', type: 'b', occurredAt: '', payload: {} } as any)
    expect(events).toEqual(['a', 'b'])
  })

  it('error in handler does not crash bus', async () => {
    const bus = new InMemoryEventBus()
    bus.subscribe('task.completed', () => { throw new Error('handler error') })
    bus.subscribe('task.completed', () => { /* ok */ })
    await expect(bus.publish({ id: '1', type: 'task.completed', occurredAt: '', payload: {} } as any)).resolves.toBeUndefined()
  })

  it('clear removes all handlers', async () => {
    const bus = new InMemoryEventBus()
    let count = 0
    bus.subscribe('task.created', () => { count++ })
    bus.clear()
    await bus.publish({ id: '1', type: 'task.created', occurredAt: '', payload: {} } as any)
    expect(count).toBe(0)
  })
})

describe('LRU Cache', () => {
  it('set and get', () => {
    const cache = new LruCache<string, number>(3)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })

  it('evicts oldest when over max size', () => {
    const cache = new LruCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a')
    cache.set('c', 3)
    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(cache.get('c')).toBe(3)
  })

  it('size returns current count', () => {
    const cache = new LruCache<string, number>(10)
    cache.set('a', 1)
    expect(cache.size).toBe(1)
    cache.set('b', 2)
    expect(cache.size).toBe(2)
  })

  it('delete removes key', () => {
    const cache = new LruCache<string, number>(3)
    cache.set('a', 1)
    cache.delete('a')
    expect(cache.has('a')).toBe(false)
  })

  it('clear removes all', () => {
    const cache = new LruCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('constructor throws with invalid size', () => {
    expect(() => new LruCache<string, number>(0)).toThrow()
  })

  it('set updates existing key without evicting', () => {
    const cache = new LruCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 3)
    cache.set('c', 4)
    expect(cache.get('a')).toBe(3)
    expect(cache.has('b')).toBe(false)
    expect(cache.get('c')).toBe(4)
  })
})

describe('Domain Entities', () => {
  describe('Workspace', () => {
    it('createWorkspace generates default fields', () => {
      const ws = createWorkspace({ name: 'Personal' })
      expect(ws.name).toBe('Personal')
      expect(ws.theme).toBe('system')
      expect(ws.isFavorite).toBe(false)
      expect(ws.isDefault).toBe(false)
      expect(ws.archivedAt).toBeNull()
      expect(ws.createdAt).toBeDefined()
      expect(ws.updatedAt).toBeDefined()
    })

    it('createWorkspace with custom fields', () => {
      const ws = createWorkspace({ name: 'Work', color: '#ff0000', icon: 'code', theme: 'dark' })
      expect(ws.color).toBe('#ff0000')
      expect(ws.icon).toBe('code')
      expect(ws.theme).toBe('dark')
    })
  })

  describe('Task', () => {
    it('createTask generates default fields', () => {
      const t = createTask({ workspaceId: 1, title: 'Test task' })
      expect(t.title).toBe('Test task')
      expect(t.priority).toBe('medium')
      expect(t.completedAt).toBeNull()
      expect(t.parentTaskId).toBeNull()
      expect(t.projectId).toBeNull()
    })

    it('createTask throws on empty title', () => {
      expect(() => createTask({ workspaceId: 1, title: '' })).toThrow()
    })

    it('createTask throws on long title', () => {
      expect(() => createTask({ workspaceId: 1, title: 'x'.repeat(501) })).toThrow()
    })

    it('completeTask sets completedAt', () => {
      const t = createTask({ workspaceId: 1, title: 'Task' }) as any
      t.id = 1
      const completed = completeTask(t)
      expect(completed.completedAt).not.toBeNull()
    })

    it('uncompleteTask clears completedAt', () => {
      const t = createTask({ workspaceId: 1, title: 'Task' }) as any
      t.id = 1
      t.completedAt = new Date().toISOString()
      const uncompleted = uncompleteTask(t)
      expect(uncompleted.completedAt).toBeNull()
    })

    it('createTask trims title', () => {
      const t = createTask({ workspaceId: 1, title: '  trimmed  ' })
      expect(t.title).toBe('trimmed')
    })

    it('createTask with optional fields', () => {
      const t = createTask({ workspaceId: 1, title: 'Task', priority: 'high', dueAt: '2026-12-31T00:00:00Z', estimatedMinutes: 60 })
      expect(t.priority).toBe('high')
      expect(t.dueAt).toBe('2026-12-31T00:00:00Z')
      expect(t.estimatedMinutes).toBe(60)
    })
  })

  describe('Project', () => {
    it('createProject generates defaults', () => {
      const p = createProject({ workspaceId: 1, name: 'Project' })
      expect(p.name).toBe('Project')
      expect(p.status).toBe('active')
      expect(p.priority).toBe('medium')
      expect(p.parentId).toBeNull()
    })

    it('createProject with nested parent', () => {
      const p = createProject({ workspaceId: 1, name: 'Sub', parentId: 1 })
      expect(p.parentId).toBe(1)
    })
  })

  describe('KanbanColumn', () => {
    it('createKanbanColumn generates defaults', () => {
      const c = createKanbanColumn({ workspaceId: 1, name: 'To Do' })
      expect(c.name).toBe('To Do')
      expect(c.position).toBe(0)
      expect(c.wipLimit).toBeNull()
    })

    it('createKanbanColumn with wip limit', () => {
      const c = createKanbanColumn({ workspaceId: 1, name: 'WIP', wipLimit: 5 })
      expect(c.wipLimit).toBe(5)
    })
  })

  describe('Note', () => {
    it('createNote generates defaults', () => {
      const n = createNote({ workspaceId: 1 })
      expect(n.title).toBe('Sin título')
      expect(n.content).toBe('')
      expect(n.folderId).toBeNull()
    })

    it('createNote with content', () => {
      const n = createNote({ workspaceId: 1, title: 'Meeting', content: '# Notes' })
      expect(n.title).toBe('Meeting')
      expect(n.content).toBe('# Notes')
    })
  })
})

describe('Validators', () => {
  it('validateCreateTask passes valid input', () => {
    const issues = validateCreateTask({ title: 'Task', priority: 'high' })
    expect(issues).toHaveLength(0)
  })

  it('validateCreateTask catches missing title', () => {
    const issues = validateCreateTask({})
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].path).toBe('title')
  })

  it('validateCreateTask catches invalid priority', () => {
    const issues = validateCreateTask({ title: 'Task', priority: 'invalid' })
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].path).toBe('priority')
  })

  it('validateCreateWorkspace passes valid input', () => {
    expect(validateCreateWorkspace({ name: 'Workspace' })).toHaveLength(0)
  })

  it('validateCreateWorkspace catches missing name', () => {
    expect(validateCreateWorkspace({})).toHaveLength(1)
  })
})

describe('IPC Validation Utilities', () => {
  it('toIpcResult converts ok result', () => {
    const ipc = toIpcResult(ok(42))
    expect(ipc.ok).toBe(true)
    expect(ipc.value).toBe(42)
  })

  it('toIpcResult converts fail result', () => {
    const ipc = toIpcResult(fail(new Error('err')))
    expect(ipc.ok).toBe(false)
    expect(ipc.error?.message).toBe('err')
  })

  it('toIpcResult includes validation issues', () => {
    const ipc = toIpcResult(fail(new ValidationError([{ path: 'title', message: 'required' }])))
    expect(ipc.error?.issues).toHaveLength(1)
  })

  it('fromIpcResult converts back', () => {
    const r = fromIpcResult({ ok: true, value: 42 })
    expect(unwrap(r)).toBe(42)
  })

  it('wrapIpcHandler wraps handler', async () => {
    const wrapped = wrapIpcHandler(async (x: number) => ok(x * 2))
    const result = await wrapped(21)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(42)
  })

  it('wrapIpcHandler catches errors', async () => {
    const wrapped = wrapIpcHandler(async () => { throw new Error('unexpected') })
    const result = await wrapped()
    expect(result.ok).toBe(false)
  })

  it('sanitizeFileName removes dangerous characters', () => {
    expect(sanitizeFileName('../../../etc/passwd')).toBe('___etc_passwd')
    expect(sanitizeFileName('normal-file.pdf')).toBe('normal-file.pdf')
    expect(sanitizeFileName('a<b>c:d')).toBe('a_b_c_d')
  })

  it('validateId returns null for invalid', () => {
    expect(validateId(null)).toBeNull()
    expect(validateId(0)).toBeNull()
    expect(validateId(-1)).toBeNull()
    expect(validateId('abc')).toBeNull()
  })

  it('validateId returns number for valid', () => {
    expect(validateId(1)).toBe(1)
    expect(validateId('5')).toBe(5)
  })
})

describe('CalendarEvent', () => {
  it('creates a calendar event', () => {
    const event = createCalendarEvent({
      workspaceId: 1,
      title: 'Meeting',
      startDate: '2026-01-01T10:00:00Z',
    })
    expect(event.workspaceId).toBe(1)
    expect(event.title).toBe('Meeting')
    expect(event.startDate).toBe('2026-01-01T10:00:00Z')
    expect(event.allDay).toBe(false)
  })

  it('accepts optional fields', () => {
    const event = createCalendarEvent({
      workspaceId: 1,
      title: 'All-day',
      startDate: '2026-01-01',
      allDay: true,
      color: '#ff0000',
      projectId: 5,
    })
    expect(event.allDay).toBe(true)
    expect(event.color).toBe('#ff0000')
    expect(event.projectId).toBe(5)
  })
})

describe('Label', () => {
  it('creates a label', () => {
    const label = createLabel({ workspaceId: 1, name: 'urgent' })
    expect(label.workspaceId).toBe(1)
    expect(label.name).toBe('urgent')
    expect(label.color).toBe('#6366f1')
  })
})

describe('Attachment', () => {
  it('creates an attachment', () => {
    const att = createAttachment({
      workspaceId: 1,
      entityType: 'task',
      entityId: 42,
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      storagePath: '/storage/doc.pdf',
    })
    expect(att.entityType).toBe('task')
    expect(att.fileName).toBe('doc.pdf')
    expect(att.sizeBytes).toBe(1024)
  })
})

describe('Settings', () => {
  it('has defaults', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('dark')
    expect(DEFAULT_SETTINGS.language).toBe('es')
    expect(DEFAULT_SETTINGS.fontSize).toBe('base')
  })
})

describe('CommandHistory', () => {
  it('executes, undoes, and redoes commands', async () => {
    const log: string[] = []
    class TestCommand implements ICommand {
      constructor(private label: string) {}
      async execute() { log.push(`exec:${this.label}`) }
      async undo() { log.push(`undo:${this.label}`) }
    }

    const history = new CommandHistory()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)

    await history.execute(new TestCommand('a'))
    expect(log).toEqual(['exec:a'])
    expect(history.canUndo).toBe(true)

    await history.execute(new TestCommand('b'))
    expect(log).toEqual(['exec:a', 'exec:b'])

    const undone = await history.undo()
    expect(undone).toBe(true)
    expect(log).toEqual(['exec:a', 'exec:b', 'undo:b'])
    expect(history.canRedo).toBe(true)

    const redone = await history.redo()
    expect(redone).toBe(true)
    expect(log).toEqual(['exec:a', 'exec:b', 'undo:b', 'exec:b'])

    await history.undo()
    await history.execute(new TestCommand('c'))
    expect(history.canRedo).toBe(false)
    expect(log).toEqual(['exec:a', 'exec:b', 'undo:b', 'exec:b', 'undo:b', 'exec:c'])
  })
})
