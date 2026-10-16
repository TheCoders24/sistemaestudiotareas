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
    course_id: z.number().int().positive().optional().nullable(),
    duration: z.number().positive(),
    started_at: z.string().optional(),
    ended_at: z.string().optional(),
  }).passthrough(), (session) => {
    session.project_id = session.project_id ?? null
    session.course_id = session.course_id ?? null
    session.started_at = session.started_at ?? new Date().toISOString()
    session.ended_at = session.ended_at ?? null
    const allowed = ['task_id', 'project_id', 'course_id', 'duration', 'started_at', 'ended_at']
    const cols = allowed.filter(c => session[c] !== undefined)
    const sets = cols.map(c => `@${c}`).join(', ')
    const stmt = getStmt(`INSERT INTO pomodoro_sessions (${cols.join(', ')}) VALUES (${sets})`)
    const result = stmt.run(session)
    addXp(10, 'pomodoro completado')
    updateChallengeProgress('pomodoro', 1)
    return getStmt('SELECT * FROM pomodoro_sessions WHERE id = ?').get(result.lastInsertRowid)
  })
}
