const fs = require('fs')
const path = require('path')
const { ALL_TABLES } = require('../core/backup-tables')

class BackupService {
  constructor(getDb, userDataPath) {
    this.getDb = getDb
    this.userDataPath = userDataPath
    this._backupDir = path.join(userDataPath, 'backups')
    this._ensureDir()
  }

  _ensureDir() {
    if (!fs.existsSync(this._backupDir)) fs.mkdirSync(this._backupDir, { recursive: true })
  }

  getAllTables() {
    return ALL_TABLES
  }

  doAutoBackup() {
    const db = this.getDb()
    if (!db) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const lastBackup = db.prepare("SELECT value FROM settings WHERE key = 'last_auto_backup'").get()
      if (lastBackup && lastBackup.value === today) return
      const data = {}
      for (const t of this.getAllTables()) { try { data[t] = db.prepare(`SELECT * FROM ${t}`).all() } catch { data[t] = [] } }
      fs.writeFileSync(path.join(this._backupDir, `backup-${today}.json`), JSON.stringify(data, null, 2))
      const backups = fs.readdirSync(this._backupDir).filter(f => f.startsWith('backup-')).sort().reverse()
      if (backups.length > 30) { for (let i = 30; i < backups.length; i++) fs.unlinkSync(path.join(this._backupDir, backups[i])) }
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_auto_backup', ?)").run(today)
    } catch (e) { console.error('[BackupService]', e) }
  }

  listBackups() {
    if (!fs.existsSync(this._backupDir)) return []
    return fs.readdirSync(this._backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => { const stat = fs.statSync(path.join(this._backupDir, f)); return { date: f.replace('backup-', '').replace('.json', ''), filename: f, size: stat.size } })
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  restoreBackup(filename) {
    const backupPath = path.join(this._backupDir, filename)
    if (!fs.existsSync(backupPath)) throw new Error('Backup not found')
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
    return this._restoreData(data)
  }

  restoreFromJSON(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
    return this._restoreData(data)
  }

  _restoreData(data) {
    const db = this.getDb()
    if (!db) return false
    const tables = this.getAllTables()
    const tx = db.transaction(() => {
      for (const table of tables) {
        try {
          db.prepare(`DELETE FROM ${table}`).run()
          if (data[table] && data[table].length > 0) {
            const columns = Object.keys(data[table][0]).join(', ')
            const placeholders = Object.keys(data[table][0]).map(k => `@${k}`).join(', ')
            const stmt = db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
            for (const row of data[table]) stmt.run(row)
          }
        } catch (e) { console.error(`Error restoring ${table}:`, e) }
      }
    })
    tx()
    return true
  }
}

module.exports = { BackupService }
