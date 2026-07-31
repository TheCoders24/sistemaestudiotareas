const { getStmt, safeUpdate, wsFilter, wsParams } = require('../utils')

function register(ipcMain, { addXp, updateChallengeProgress, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getSnippets', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM snippets WHERE deleted = 0${wsFilter(wsId)} ORDER BY created_at DESC`).all(...wsParams(wsId))
  })
  safeHandle(ipcMain, 'db:createSnippet', z.object({
    title: z.string().min(1).max(500),
    code: z.string().optional().default(''),
    language: z.string().optional().default('text'),
    description: z.string().max(2000).optional().nullable(),
    tags: z.string().optional().nullable(),
    project_id: z.number().int().positive().optional().nullable(),
  }).passthrough(), (snippet) => {
    snippet.project_id = snippet.project_id ?? null
    const stmt = getStmt('INSERT INTO snippets (title, code, language, description, tags, project_id) VALUES (@title, @code, @language, @description, @tags, @project_id)')
    const result = stmt.run(snippet)
    addXp(3, 'snippet creado')
    updateChallengeProgress('note', 1)
    return getStmt('SELECT * FROM snippets WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:updateSnippet', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    safeUpdate('snippets', id, data)
    return getStmt('SELECT * FROM snippets WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'db:deleteSnippet', z.number().int().positive(), (id) => {
    getStmt('DELETE FROM snippets WHERE id = ?').run(id)
    return true
  })
}

module.exports = { register }
