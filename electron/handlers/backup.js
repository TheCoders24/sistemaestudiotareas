function doAutoBackup({ getStmt, getDb, app, fs, path }) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const lastBackup = getStmt("SELECT value FROM settings WHERE key = 'last_auto_backup'").get()
    if (lastBackup && lastBackup.value === today) return
    const backupDir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','study_progress','study_files','notes','goals','goal_progress','streaks','daily_logs','snippets','habits','habit_logs','tags','xp_log','achievements','user_achievements','challenges','user_challenges','weekly_reports','subtasks','entity_links']
    const data = {}
    for (const t of tables) { try { data[t] = getStmt(`SELECT * FROM ${t}`).all() } catch { data[t] = [] } }
    fs.writeFileSync(path.join(backupDir, `backup-${today}.json`), JSON.stringify(data, null, 2))
    const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-')).sort().reverse()
    if (backups.length > 30) { for (let i = 30; i < backups.length; i++) fs.unlinkSync(path.join(backupDir, backups[i])) }
    getStmt("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_auto_backup', ?)").run(today)
  } catch (e) { console.error('[AutoBackup]', e) }
}

function register(ipcMain, { getStmt, getDb, app, fs, path, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:importData', z.any(), (data) => {
    const tables = ['settings', 'projects', 'tasks', 'kanban_cards', 'pomodoro_sessions', 'study_topics', 'study_progress', 'study_files', 'notes', 'goals', 'goal_progress', 'streaks', 'daily_logs', 'snippets', 'habits', 'habit_logs', 'tags']
    const tx = getDb().transaction(() => {
      for (const table of tables) {
        try {
          getStmt(`DELETE FROM ${table}`).run()
          if (data[table] && data[table].length > 0) {
            const columns = Object.keys(data[table][0]).join(', ')
            const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
            const stmt = getStmt(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
            for (const row of data[table]) {
              stmt.run(row)
            }
          }
        } catch (e) {
          console.error(`Error importing ${table}:`, e)
        }
      }
    })
    tx()
    return true
  })

  safeHandle(ipcMain, 'db:listBackups', voidSchema(), () => {
    const backupDir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(backupDir)) return []
    return fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f))
        const date = f.replace('backup-', '').replace('.json', '')
        return { date, filename: f, size: stat.size }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  })

  safeHandle(ipcMain, 'db:restoreBackup', z.string().min(1), (filename) => {
    const backupPath = path.join(app.getPath('userData'), 'backups', filename)
    if (!fs.existsSync(backupPath)) throw new Error('Backup not found')
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
    const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','study_progress','study_files','notes','goals','goal_progress','streaks','daily_logs','snippets','habits','habit_logs','tags','xp_log','achievements','user_achievements','challenges','user_challenges','weekly_reports','subtasks','entity_links']
    const tx = getDb().transaction(() => {
      for (const table of tables) {
        try {
          getStmt(`DELETE FROM ${table}`).run()
          if (data[table] && data[table].length > 0) {
            const columns = Object.keys(data[table][0]).join(', ')
            const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
            const stmt = getStmt(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
            for (const row of data[table]) stmt.run(row)
          }
        } catch (e) { console.error(`Error restoring ${table}:`, e) }
      }
    })
    tx()
    return true
  })

  function exportAllData() {
    const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','notes','goals','daily_logs','snippets','habits','habit_logs','subtasks']
    const data = {}
    for (const table of tables) {
      try { data[table] = getDb().prepare(`SELECT * FROM ${table}`).all() } catch { data[table] = [] }
    }
    data._exportDate = new Date().toISOString()
    return data
  }

  safeHandle(ipcMain, 'db:exportData', voidSchema(), () => {
    return exportAllData()
  })

  safeHandle(ipcMain, 'db:restoreFromJSON', z.any(), (jsonData) => {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
    const tables = ['settings','projects','tasks','kanban_cards','pomodoro_sessions','study_topics','notes','goals','daily_logs','snippets','habits','habit_logs','subtasks']
    const tx = getDb().transaction(() => {
      for (const table of tables) {
        try {
          getDb().prepare(`DELETE FROM ${table}`).run()
          if (data[table] && data[table].length > 0) {
            const columns = Object.keys(data[table][0]).join(', ')
            const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
            const stmt = getDb().prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
            for (const row of data[table]) stmt.run(row)
          }
        } catch (e) { console.error(`Error restoring ${table}:`, e) }
      }
    })
    tx()
    return true
  })
}

module.exports = { register, doAutoBackup }
