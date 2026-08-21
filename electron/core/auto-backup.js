const { ALL_TABLES } = require('./backup-tables')

function doAutoBackup({ getStmt, getDb, app, fs, path, logger = console }) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const lastBackup = getStmt("SELECT value FROM settings WHERE key = 'last_auto_backup'").get()
    if (lastBackup && lastBackup.value === today) return { skipped: true, date: today }
    const backupDir = path.join(app.getPath('userData'), 'backups')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const data = {}
    for (const t of ALL_TABLES) { try { data[t] = getStmt(`SELECT * FROM ${t}`).all() } catch { data[t] = [] } }
    const filename = `backup-${today}.json`
    fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(data, null, 2))
    const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-')).sort().reverse()
    if (backups.length > 30) { for (let i = 30; i < backups.length; i++) fs.unlinkSync(path.join(backupDir, backups[i])) }
    getStmt("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_auto_backup', ?)").run(today)
    return { skipped: false, date: today, filename }
  } catch (e) { logger.error('AutoBackup:', e); return { skipped: true, error: String(e && e.message || e) } }
}

module.exports = { doAutoBackup }