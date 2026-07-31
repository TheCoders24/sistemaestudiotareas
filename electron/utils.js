const { getDb } = require('./database')

const stmts = new Map()
const LRU_MAX = 200
function getStmt(sql) {
  if (stmts.has(sql)) {
    const stmt = stmts.get(sql)
    stmts.delete(sql)
    stmts.set(sql, stmt)
    return stmt
  }
  if (stmts.size >= LRU_MAX) {
    const oldest = stmts.keys().next().value
    stmts.get(oldest).finalize()
    stmts.delete(oldest)
  }
  const stmt = getDb().prepare(sql)
  stmts.set(sql, stmt)
  return stmt
}

const ALLOWED_COLUMNS = {
  tasks: ['title', 'description', 'completed', 'priority', 'due_date', 'reminder', 'project_id', 'workspace_id', 'repeat', 'tags', 'position'],
  kanban_cards: ['title', 'description', 'column_type', 'position', 'priority', 'tags', 'due_date', 'project_id', 'workspace_id', 'deleted'],
  notes: ['title', 'content', 'project_id', 'workspace_id', 'deleted'],
  projects: ['name', 'description', 'status', 'tech_stack', 'repo_url', 'color', 'workspace_id', 'deleted'],
  study_topics: ['parent_id', 'name', 'description', 'resource_url', 'order_position', 'workspace_id', 'study_level', 'study_level_updated_at'],
  snippets: ['title', 'code', 'language', 'description', 'tags', 'project_id', 'workspace_id', 'deleted'],
  habits: ['name', 'icon', 'color', 'frequency', 'workspace_id', 'deleted'],
  daily_logs: ['content', 'focus', 'blockers', 'tomorrow_plan', 'workspace_id'],
  goals: ['title', 'type', 'target', 'metric', 'workspace_id', 'deleted'],
}

function safeUpdate(table, id, data) {
  const allowed = ALLOWED_COLUMNS[table]
  if (!allowed) throw new Error(`Unknown table: ${table}`)
  const keys = Object.keys(data).filter(k => allowed.includes(k) && k !== 'id')
  if (keys.length === 0) return
  const sets = keys.map(k => `${k} = @${k}`).join(', ')
  const filtered = { id }
  for (const k of keys) filtered[k] = data[k]
  getStmt(`UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(filtered)
}

function wsFilter(wsId) {
  return wsId ? ' AND workspace_id = ?' : ''
}
function wsParams(wsId) {
  return wsId ? [wsId] : []
}

const lazy = {}
module.exports = { getStmt, safeUpdate, wsFilter, wsParams, getDb, lazy }
