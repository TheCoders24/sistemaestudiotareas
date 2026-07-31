const { getStmt, safeUpdate, wsFilter, wsParams } = require('../utils')

function register(ipcMain, { safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getGoals', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM goals WHERE deleted = 0${wsFilter(wsId)} ORDER BY created_at DESC`).all(...wsParams(wsId))
  })
  safeHandle(ipcMain, 'db:createGoal', z.object({
    title: z.string().min(1).max(500),
    type: z.string().optional().default('daily'),
    target: z.number().positive(),
    metric: z.string().max(500).optional().nullable(),
  }).passthrough(), (goal) => {
    const stmt = getStmt('INSERT INTO goals (title, type, target, metric) VALUES (@title, @type, @target, @metric)')
    const result = stmt.run(goal)
    return getStmt('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:updateGoal', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    safeUpdate('goals', id, data)
    return getStmt('SELECT * FROM goals WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'db:deleteGoal', z.number().int().positive(), (id) => {
    getStmt('UPDATE goals SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'db:getGoalProgress', z.object({ 0: z.number(), 1: z.string() }).transform(a => ({ goalId: a[0], today: a[1] })), ({ goalId, today }) => {
    const row = getStmt('SELECT COALESCE(SUM(value), 0) as total FROM goal_progress WHERE goal_id = ? AND date = ?').get(goalId, today)
    return row ? row.total : 0
  })
  safeHandle(ipcMain, 'db:addGoalProgress', z.object({ 0: z.number(), 1: z.string(), 2: z.number() }).transform(a => ({ goalId: a[0], date: a[1], value: a[2] })), ({ goalId, date, value }) => {
    const existing = getStmt('SELECT * FROM goal_progress WHERE goal_id = ? AND date = ?').get(goalId, date)
    if (existing) {
      getStmt('UPDATE goal_progress SET value = ? WHERE id = ?').run(value, existing.id)
    } else {
      getStmt('INSERT INTO goal_progress (goal_id, date, value) VALUES (?, ?, ?)').run(goalId, date, value)
    }
    return true
  })
}

module.exports = { register }
