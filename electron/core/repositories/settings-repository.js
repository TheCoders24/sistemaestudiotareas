const { getDb } = require('../../database')

class SettingsRepository {
  get(key) {
    const db = getDb()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  }

  set(key, value) {
    const db = getDb()
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value)
  }

  getMultiple(keys) {
    const db = getDb()
    const placeholders = keys.map(() => '?').join(',')
    const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...keys)
    const result = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  }

  getAll() {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const result = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  }
}

module.exports = { SettingsRepository }
