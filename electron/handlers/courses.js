function register(ipcMain, { getStmt, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'courses:list', z.number().int().positive().optional(), (wsId) => {
    if (wsId) return getStmt('SELECT * FROM courses WHERE archived = 0 AND workspace_id = ? ORDER BY name ASC').all(wsId)
    return getStmt('SELECT * FROM courses WHERE archived = 0 ORDER BY name ASC').all()
  })
  safeHandle(ipcMain, 'courses:create', z.object({
    name: z.string().min(1).max(500),
    color: z.string().optional().default('#6366f1'),
    icon: z.string().optional().default('book'),
    term: z.string().optional().nullable(),
    credits: z.number().int().positive().optional().nullable(),
    target_grade: z.number().min(0).max(100).optional().nullable(),
    workspace_id: z.number().int().positive(),
  }).passthrough(), (data) => {
    const allowed = ['name', 'color', 'icon', 'term', 'credits', 'target_grade', 'workspace_id']
    const keys = allowed.filter(k => data[k] !== undefined)
    if (keys.length === 0) throw new Error('No se proporcionaron columnas válidas para crear el curso')
    const cols = keys.join(', ')
    const named = keys.map(k => `@${k}`).join(', ')
    const filtered = {}
    for (const k of keys) filtered[k] = data[k]
    const result = getStmt(`INSERT INTO courses (${cols}) VALUES (${named})`).run(filtered)
    return getStmt('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'courses:update', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    const allowed = ['name', 'color', 'icon', 'term', 'credits', 'target_grade', 'archived']
    const keys = Object.keys(data).filter(k => allowed.includes(k))
    if (keys.length === 0) return getStmt('SELECT * FROM courses WHERE id = ?').get(id)
    const sets = keys.map(k => `${k} = @${k}`).join(', ')
    getStmt(`UPDATE courses SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id })
    return getStmt('SELECT * FROM courses WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'courses:delete', z.number().int().positive(), (id) => {
    getStmt('UPDATE courses SET archived = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'courses:get', z.number().int().positive(), (id) => {
    return getStmt('SELECT * FROM courses WHERE id = ?').get(id)
  })
}

module.exports = { register }
