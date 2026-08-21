const { ALL_TABLES } = require('../core/backup-tables')

function register(ipcMain, { getStmt, getDb, app, fs, path, safeHandle, schemas, voidSchema, z }) {
  safeHandle(ipcMain, 'db:importData', z.any(), (data) => {
    const tx = getDb().transaction(() => {
      for (const table of ALL_TABLES) {
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
    const tx = getDb().transaction(() => {
      for (const table of ALL_TABLES) {
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
    const data = {}
    for (const table of ALL_TABLES) {
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
    const tx = getDb().transaction(() => {
      for (const table of ALL_TABLES) {
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

module.exports = { register }