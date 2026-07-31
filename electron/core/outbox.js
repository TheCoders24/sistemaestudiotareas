const { getDb } = require('../database')

const OUTBOX_SQL = `
CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT
)`

const SNAPSHOTS_SQL = `
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`

const ACTIVITY_LOG_SQL = `
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`

class OutboxDispatcher {
  constructor(eventBus) {
    this.eventBus = eventBus
  }

  init(db) {
    db.exec(OUTBOX_SQL)
    db.exec(SNAPSHOTS_SQL)
    db.exec(ACTIVITY_LOG_SQL)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_events(published_at) WHERE published_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_snapshots_entity ON snapshots(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
    `)
  }

  addEvent(db, type, payload) {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    db.prepare(`
      INSERT INTO outbox_events (id, type, payload_json)
      VALUES (?, ?, ?)
    `).run(id, type, JSON.stringify(payload))
    return id
  }

  dispatchPending() {
    const db = getDb()
    if (!db) return

    const events = db.prepare(`
      SELECT id, type, payload_json FROM outbox_events WHERE published_at IS NULL ORDER BY created_at ASC LIMIT 50
    `).all()

    for (const event of events) {
      try {
        this.eventBus.publish({
          id: event.id,
          type: event.type,
          occurredAt: '',
          payload: JSON.parse(event.payload_json),
        })
        db.prepare('UPDATE outbox_events SET published_at = ? WHERE id = ?')
          .run(new Date().toISOString(), event.id)
      } catch (err) {
        console.error(`[Outbox] Failed to publish event ${event.id}:`, err)
      }
    }
  }

  addActivity(db, params) {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    db.prepare(`
      INSERT INTO activity_log (id, workspace_id, entity_type, entity_id, action, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, params.workspaceId || null, params.entityType, params.entityId, params.action, JSON.stringify(params.payload || {}))
  }
}

module.exports = { OutboxDispatcher, OUTBOX_SQL, SNAPSHOTS_SQL, ACTIVITY_LOG_SQL }
