function register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'workspaces:list', schemas.workspaces.list, () => {
    return getStmt('SELECT * FROM workspaces WHERE deleted = 0 ORDER BY sort_order ASC, name ASC').all()
  })
  safeHandle(ipcMain, 'workspaces:create', z.object({
    name: z.string().min(1).max(500),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    sort_order: z.number().optional(),
  }).passthrough(), (data) => {
    const result = getStmt('INSERT INTO workspaces (name, icon, color, sort_order) VALUES (@name, @icon, @color, @sort_order)').run({
      name: data.name,
      icon: data.icon || 'briefcase',
      color: data.color || '#6366f1',
      sort_order: data.sort_order ?? 0,
    })
    return getStmt('SELECT * FROM workspaces WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'workspaces:update', schemas.workspaces.update, ({ id, data }) => {
    const allowed = ['name', 'icon', 'color', 'sort_order']
    const keys = Object.keys(data).filter(k => allowed.includes(k))
    if (keys.length === 0) return getStmt('SELECT * FROM workspaces WHERE id = ?').get(id)
    const sets = keys.map(k => `${k} = @${k}`).join(', ')
    getStmt(`UPDATE workspaces SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id })
    return getStmt('SELECT * FROM workspaces WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'workspaces:delete', schemas.workspaces.delete, (id) => {
    getStmt('UPDATE workspaces SET deleted = 1 WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'workspaces:getActive', voidSchema(), () => {
    const wsId = getStmt("SELECT value FROM settings WHERE key = 'active_workspace'").get()
    if (wsId) {
      const ws = getStmt('SELECT * FROM workspaces WHERE id = ? AND deleted = 0').get(Number(wsId.value))
      if (ws) return ws
    }
    const defaultWs = getStmt('SELECT * FROM workspaces WHERE is_default = 1 AND deleted = 0').get()
    return defaultWs || null
  })
  safeHandle(ipcMain, 'workspaces:setActive', schemas.workspaces.setActive, (id) => {
    getStmt("INSERT OR REPLACE INTO settings (key, value) VALUES ('active_workspace', ?)").run(String(id))
    return true
  })
  safeHandle(ipcMain, 'workspaces:getEntities', schemas.workspaces.getEntities, (wsId) => {
    const entities = {}
    for (const table of ['projects', 'tasks', 'notes', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'goals', 'habits', 'snippets', 'daily_logs', 'flashcard_decks']) {
      try {
        const row = getStmt(`SELECT COUNT(*) as count FROM ${table} WHERE workspace_id = ?`).get(wsId)
        entities[table] = row.count
      } catch { entities[table] = 0 }
    }
    return entities
  })
}

module.exports = { register }
