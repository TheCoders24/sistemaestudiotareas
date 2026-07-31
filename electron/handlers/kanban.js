function register(ipcMain, { getStmt, safeUpdate, wsFilter, wsParams, safeHandle, voidSchema, z }) {
  safeHandle(ipcMain, 'kanban:getColumns', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM kanban_columns WHERE workspace_id IS ? OR workspace_id = ? ORDER BY position ASC`).all(wsId || null, wsId || null)
  })
  safeHandle(ipcMain, 'kanban:createColumn', z.object({
    name: z.string().default('Nueva columna'),
    type: z.string().optional().default('custom'),
    color: z.string().optional().default('#6366f1'),
    wip_limit: z.number().int().optional().default(0),
    position: z.number().int().optional().default(0),
    workspace_id: z.number().int().positive().optional().nullable(),
  }).passthrough(), (data) => {
    const result = getStmt('INSERT INTO kanban_columns (name, type, color, wip_limit, position, workspace_id) VALUES (@name, @type, @color, @wip_limit, @position, @workspace_id)').run({
      name: data.name || 'Nueva columna',
      type: data.type || 'custom',
      color: data.color || '#6366f1',
      wip_limit: data.wip_limit || 0,
      position: data.position ?? 0,
      workspace_id: data.workspace_id ?? null,
    })
    return getStmt('SELECT * FROM kanban_columns WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'kanban:updateColumn', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    const allowed = ['name', 'color', 'wip_limit', 'position', 'type']
    const keys = Object.keys(data).filter(k => allowed.includes(k))
    if (keys.length === 0) return getStmt('SELECT * FROM kanban_columns WHERE id = ?').get(id)
    const sets = keys.map(k => `${k} = @${k}`).join(', ')
    getStmt(`UPDATE kanban_columns SET ${sets} WHERE id = @id`).run({ ...data, id })
    return getStmt('SELECT * FROM kanban_columns WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'kanban:deleteColumn', z.number().int().positive(), (id) => {
    getStmt('DELETE FROM kanban_columns WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'db:getKanbanCards', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM kanban_cards WHERE deleted = 0${wsFilter(wsId)} ORDER BY position ASC`).all(...wsParams(wsId))
  })
  safeHandle(ipcMain, 'db:createKanbanCard', z.object({
    title: z.string().min(1).max(500),
    description: z.string().optional().default(''),
    column_type: z.string().optional().default('todo'),
    priority: z.enum(['baja', 'media', 'alta', 'urgente']).optional().default('media'),
    tags: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    project_id: z.number().int().positive().optional().nullable(),
  }).passthrough(), (card) => {
    const maxPos = getStmt('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM kanban_cards WHERE column_type = ?').get(card.column_type)
    card.position = maxPos.pos
    card.project_id = card.project_id ?? null
    const stmt = getStmt('INSERT INTO kanban_cards (title, description, column_type, position, priority, tags, due_date, project_id) VALUES (@title, @description, @column_type, @position, @priority, @tags, @due_date, @project_id)')
    const result = stmt.run(card)
    return getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:updateKanbanCard', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    safeUpdate('kanban_cards', id, data)
    return getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'db:deleteKanbanCard', z.number().int().positive(), (id) => {
    getStmt('UPDATE kanban_cards SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'db:moveKanbanCard', z.object({ 0: z.number(), 1: z.string(), 2: z.number() }).transform(a => ({ id: a[0], column: a[1], position: a[2] })), ({ id, column, position }) => {
    getStmt('UPDATE kanban_cards SET column_type = ?, position = ?, updated_at = datetime(\'now\') WHERE id = ?').run(column, position, id)
    return getStmt('SELECT * FROM kanban_cards WHERE id = ?').get(id)
  })
}

module.exports = { register }
