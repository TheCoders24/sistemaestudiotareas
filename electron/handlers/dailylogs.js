const { getStmt, safeUpdate, wsFilter, wsParams } = require('../utils')

function register(ipcMain, { safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getDailyLogs', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM daily_logs${wsId ? ' WHERE workspace_id = ?' : ''} ORDER BY date DESC`).all(...wsParams(wsId))
  })
  safeHandle(ipcMain, 'db:getDailyLog', z.string(), (date) => {
    return getStmt('SELECT * FROM daily_logs WHERE date = ?').get(date)
  })
  safeHandle(ipcMain, 'db:createDailyLog', z.object({
    date: z.string(),
    content: z.string().optional().default(''),
    focus: z.string().max(500).optional().nullable(),
    blockers: z.string().max(2000).optional().nullable(),
    tomorrow_plan: z.string().max(2000).optional().nullable(),
  }).passthrough(), (log) => {
    const allowed = ['date', 'content', 'focus', 'blockers', 'tomorrow_plan', 'workspace_id']
    const cols = allowed.filter(c => log[c] !== undefined)
    const sets = cols.map(c => `@${c}`).join(', ')
    const stmt = getStmt(`INSERT OR REPLACE INTO daily_logs (${cols.join(', ')}) VALUES (${sets})`)
    const result = stmt.run(log)
    return getStmt('SELECT * FROM daily_logs WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:updateDailyLog', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    safeUpdate('daily_logs', id, data)
    return getStmt('SELECT * FROM daily_logs WHERE id = ?').get(id)
  })
}

module.exports = { register }
