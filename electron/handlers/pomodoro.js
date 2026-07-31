module.exports = { register }

function register(ipcMain, { getStmt, addXp, updateChallengeProgress, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:getPomodoroSessions', z.string().optional(), (date) => {
    if (date) {
      return getStmt("SELECT * FROM pomodoro_sessions WHERE date(started_at) = ? ORDER BY started_at DESC").all(date)
    }
    return getStmt('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC').all()
  })

  safeHandle(ipcMain, 'db:createPomodoroSession', z.object({
    task_id: z.number().int().positive().optional().nullable(),
    project_id: z.number().int().positive().optional().nullable(),
    duration: z.number().positive(),
    started_at: z.string().optional(),
    ended_at: z.string().optional(),
  }).passthrough(), (session) => {
    session.project_id = session.project_id ?? null
    const stmt = getStmt('INSERT INTO pomodoro_sessions (task_id, project_id, duration, started_at, ended_at) VALUES (@task_id, @project_id, @duration, @started_at, @ended_at)')
    const result = stmt.run(session)
    addXp(10, 'pomodoro completado')
    updateChallengeProgress('pomodoro', 1)
    return getStmt('SELECT * FROM pomodoro_sessions WHERE id = ?').get(result.lastInsertRowid)
  })
}
