class SessionManager {
  constructor() {
    this.state = {}
    this.saveTimeout = null
    this.debounceMs = 300
  }

  async save(state) {
    this.state = { ...this.state, ...state }
    if (this.saveTimeout) clearTimeout(this.saveTimeout)
    this.saveTimeout = setTimeout(() => this.persist(), this.debounceMs)
  }

  persist() {
    try {
      const { getDb } = require('../database')
      const db = getDb()
      db.prepare("INSERT INTO settings (key, value) VALUES ('session_state', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .run(JSON.stringify(this.state))
    } catch {
      // settings table may not exist yet
    }
  }

  async restore() {
    try {
      const { getDb } = require('../database')
      const db = getDb()
      const row = db.prepare("SELECT value FROM settings WHERE key = 'session_state'").get()
      if (row) {
        this.state = JSON.parse(row.value)
      }
    } catch {
      this.state = {}
    }
    return this.state
  }

  get(key) {
    return this.state[key]
  }

  set(key, value) {
    this.state[key] = value
    this.save({ [key]: value })
  }
}

module.exports = new SessionManager()
