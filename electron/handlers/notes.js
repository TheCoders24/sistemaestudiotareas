function register(ipcMain, { getStmt, safeUpdate, wsFilter, wsParams, addXp, updateChallengeProgress, safeHandle, voidSchema, z }) {
  safeHandle(ipcMain, 'notes:getFolders', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM note_folders WHERE workspace_id IS ? OR workspace_id = ? ORDER BY name ASC`).all(wsId || null, wsId || null)
  })
  safeHandle(ipcMain, 'notes:createFolder', z.object({
    name: z.string().default('Nueva carpeta'),
    parent_id: z.number().int().positive().optional().nullable(),
    color: z.string().optional().default('#6366f1'),
    workspace_id: z.number().int().positive().optional().nullable(),
  }).passthrough(), (data) => {
    const result = getStmt('INSERT INTO note_folders (name, parent_id, color, workspace_id) VALUES (@name, @parent_id, @color, @workspace_id)').run({
      name: data.name || 'Nueva carpeta', parent_id: data.parent_id ?? null, color: data.color || '#6366f1', workspace_id: data.workspace_id ?? null,
    })
    return getStmt('SELECT * FROM note_folders WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'notes:updateFolder', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    const allowed = ['name', 'parent_id', 'color']
    const keys = Object.keys(data).filter(k => allowed.includes(k))
    if (keys.length === 0) return getStmt('SELECT * FROM note_folders WHERE id = ?').get(id)
    const sets = keys.map(k => `${k} = @${k}`).join(', ')
    getStmt(`UPDATE note_folders SET ${sets} WHERE id = @id`).run({ ...data, id })
    return getStmt('SELECT * FROM note_folders WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'notes:deleteFolder', z.number().int().positive(), (id) => {
    getStmt('UPDATE notes SET folder_id = NULL WHERE folder_id = ?').run(id)
    getStmt('DELETE FROM note_folders WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'db:getNotes', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM notes WHERE deleted = 0${wsFilter(wsId)} ORDER BY updated_at DESC`).all(...wsParams(wsId))
  })
  safeHandle(ipcMain, 'notes:exportMarkdown', z.number().int().positive(), (id) => {
    const note = getStmt('SELECT * FROM notes WHERE id = ?').get(id)
    if (!note) return null
    const md = `# ${note.title}\n\n${note.content || ''}\n\n---\n*Exportado el ${new Date().toLocaleDateString()} desde EstudioApp*`
    return { title: `${note.title.replace(/[^a-zA-Z0-9\u00C0-\u024f\s_-]/g, '').trim() || 'nota'}.md`, content: md }
  })

  safeHandle(ipcMain, 'db:createNote', z.object({
    title: z.string().min(1).max(500),
    content: z.string().optional().default(''),
    project_id: z.number().int().positive().optional().nullable(),
  }).passthrough(), (note) => {
    note.project_id = note.project_id ?? null
    const stmt = getStmt('INSERT INTO notes (title, content, project_id) VALUES (@title, @content, @project_id)')
    const result = stmt.run(note)
    addXp(3, 'nota creada')
    updateChallengeProgress('note', 1)
    return getStmt('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:updateNote', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    safeUpdate('notes', id, data)
    return getStmt('SELECT * FROM notes WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'db:deleteNote', z.number().int().positive(), (id) => {
    getStmt('UPDATE notes SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
}

module.exports = { register }
