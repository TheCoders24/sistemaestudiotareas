const { getStmt, safeUpdate, wsFilter, wsParams } = require('../utils')

function register(ipcMain, { safeHandle, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getHabits', z.number().int().positive().optional(), (wsId) => {
    return getStmt(`SELECT * FROM habits WHERE deleted = 0${wsFilter(wsId)} ORDER BY name ASC`).all(...wsParams(wsId))
  })
  safeHandle(ipcMain, 'db:createHabit', z.object({
    name: z.string().min(1).max(500),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    frequency: z.string().optional().default('daily'),
  }).passthrough(), (habit) => {
    const stmt = getStmt('INSERT INTO habits (name, icon, color, frequency) VALUES (@name, @icon, @color, @frequency)')
    const result = stmt.run(habit)
    return getStmt('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid)
  })
  safeHandle(ipcMain, 'db:updateHabit', z.object({ 0: z.number().int().positive(), 1: z.object({}).passthrough() }).transform(a => ({ id: a[0], data: a[1] })), ({ id, data }) => {
    safeUpdate('habits', id, data)
    return getStmt('SELECT * FROM habits WHERE id = ?').get(id)
  })
  safeHandle(ipcMain, 'db:deleteHabit', z.number().int().positive(), (id) => {
    getStmt('UPDATE habits SET deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id)
    return true
  })
  safeHandle(ipcMain, 'db:getHabitLogs', z.number().int().positive(), (habitId) => {
    return getStmt('SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC').all(habitId)
  })
  safeHandle(ipcMain, 'db:getAllHabitLogs', voidSchema(), () => {
    return getStmt('SELECT * FROM habit_logs ORDER BY date DESC').all()
  })
  safeHandle(ipcMain, 'db:toggleHabitLog', z.object({ 0: z.number(), 1: z.string() }).transform(a => ({ habitId: a[0], date: a[1] })), ({ habitId, date }) => {
    const existing = getStmt('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habitId, date)
    if (existing) {
      getStmt('DELETE FROM habit_logs WHERE id = ?').run(existing.id)
      return false
    } else {
      getStmt('INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, 1)').run(habitId, date)
      return true
    }
  })
  safeHandle(ipcMain, 'db:getHabitStats', voidSchema(), () => {
    const habits = getStmt('SELECT * FROM habits WHERE deleted = 0').all()
    const today = new Date().toISOString().split('T')[0]
    return habits.map(h => {
      const totalDays = getStmt("SELECT COUNT(DISTINCT date) as count FROM habit_logs WHERE habit_id = ? AND completed = 1").get(h.id).count
      const thisMonth = getStmt("SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND completed = 1 AND date >= date('now', '-30 days')").get(h.id).count
      const todayDone = getStmt("SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND date = ? AND completed = 1").get(h.id, today).count
      return { ...h, totalDays, thisMonth, todayDone: todayDone > 0 }
    })
  })
}

module.exports = { register }
