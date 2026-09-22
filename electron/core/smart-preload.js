const EVENT_PRELOADS = {
  'workspace.opened': [
    { type: 'db', method: 'getProjects', args: ['workspaceId'] },
    { type: 'db', method: 'getTasks', args: ['workspaceId'] },
    { type: 'db', method: 'getKanbanColumns', args: ['workspaceId'] },
  ],
  'project.opened': [
    { type: 'db', method: 'getTasks', args: ['projectId'] },
    { type: 'db', method: 'getNotes', args: ['projectId'] },
  ],
  'module:kanban': [
    { type: 'db', method: 'getKanbanColumns', args: ['workspaceId'] },
    { type: 'db', method: 'getProjects', args: ['workspaceId'] },
  ],
  'module:dashboard': [
    { type: 'db', method: 'getTasks', args: ['workspaceId'] },
    { type: 'db', method: 'getActivityLog', args: ['workspaceId'] },
  ],
  'module:calendar': [
    { type: 'db', method: 'getCalendarEvents', args: ['workspaceId'] },
  ],
}

function makeKey(method, args) {
  return `${method}:${JSON.stringify(args)}`
}

class SmartPreload {
  constructor(getDb, { level = 'basic', maxTransitions = 100, maxCacheSize = 50 } = {}) {
    this.getDb = getDb
    this.level = level
    this.maxTransitions = maxTransitions
    this.maxCacheSize = maxCacheSize
    this.transitionCounts = {}
    this.lastModule = null
    this.lastWorkspace = null
    this.preloadQueue = []
    this.active = false
    this.cache = new Map()
    this.accessOrder = []
    this.stmtCache = new Map()
  }

  setLevel(level) {
    this.level = level
  }

  getStmt(sql) {
    if (this.stmtCache.has(sql)) return this.stmtCache.get(sql)
    const stmt = this.getDb().prepare(sql)
    if (this.stmtCache.size >= 200) {
      const oldest = this.stmtCache.keys().next().value
      this.stmtCache.get(oldest)?.finalize()
      this.stmtCache.delete(oldest)
    }
    this.stmtCache.set(sql, stmt)
    return stmt
  }

  recordTransition(fromModule, toModule, workspaceId) {
    if (!fromModule || !toModule) return
    const key = `${fromModule}->${toModule}`
    this.transitionCounts[key] = (this.transitionCounts[key] || 0) + 1
    if (Object.keys(this.transitionCounts).length > this.maxTransitions) {
      const oldest = Object.keys(this.transitionCounts)[0]
      delete this.transitionCounts[oldest]
    }
    this.lastModule = toModule
    this.lastWorkspace = workspaceId
    this.schedulePreload(toModule, workspaceId)
  }

  schedulePreload(module, workspaceId) {
    if (this.level === 'none') return
    const db = this.getDb()
    if (!db) return

    const preloads = EVENT_PRELOADS[module] ? [...EVENT_PRELOADS[module]] : []

    const predictions = this.getPredictions(module)
    for (const pred of predictions.slice(0, this.level === 'aggressive' ? 3 : 1)) {
      const predPreloads = EVENT_PRELOADS[pred]
      if (predPreloads) {
        preloads.push(...predPreloads)
      }
    }

    if (this.active) return
    this.active = true

    setImmediate(() => {
      try {
        for (const item of preloads) {
          if (item.type === 'db' && typeof item.method === 'string') {
            try {
              const args = item.args.map(a => a === 'workspaceId' ? workspaceId : a === 'projectId' ? workspaceId : a).filter(Boolean)
              const cacheKey = makeKey(item.method, args)
              if (this.cache.has(cacheKey)) continue
              const stmt = this.getStmt(this.getQuery(item.method, args.length))
              const result = stmt.all(...args)
              this.setCache(cacheKey, result)
            } catch (e) {
            }
          }
        }
      } catch {
      } finally {
        this.active = false
      }
    })
  }

  getQuery(method, argCount) {
    const queries = {
      getProjects: argCount > 0 ? 'SELECT * FROM projects WHERE deleted = 0 AND workspace_id = ? ORDER BY name ASC' : 'SELECT * FROM projects WHERE deleted = 0 ORDER BY name ASC',
      getTasks: argCount > 0 ? 'SELECT * FROM tasks WHERE deleted = 0 AND completed = 0 AND workspace_id = ? ORDER BY due_date ASC LIMIT 50' : 'SELECT * FROM tasks WHERE deleted = 0 AND completed = 0 ORDER BY due_date ASC LIMIT 50',
      getKanbanColumns: argCount > 0 ? 'SELECT * FROM kanban_columns WHERE workspace_id = ? ORDER BY position ASC' : 'SELECT * FROM kanban_columns ORDER BY position ASC',
      getNotes: argCount > 0 ? 'SELECT * FROM notes WHERE deleted = 0 AND workspace_id = ? ORDER BY updated_at DESC LIMIT 20' : 'SELECT * FROM notes WHERE deleted = 0 ORDER BY updated_at DESC LIMIT 20',
      getActivityLog: argCount > 0 ? 'SELECT * FROM activity_log WHERE workspace_id = ? ORDER BY timestamp DESC LIMIT 30' : 'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 30',
      getCalendarEvents: argCount > 0 ? 'SELECT * FROM tasks WHERE deleted = 0 AND completed = 0 AND due_date IS NOT NULL AND workspace_id = ?' : 'SELECT * FROM tasks WHERE deleted = 0 AND completed = 0 AND due_date IS NOT NULL',
    }
    return queries[method] || 'SELECT 1'
  }

  setCache(key, data) {
    if (this.cache.size >= this.maxCacheSize) {
      const oldest = this.accessOrder.shift()
      if (oldest) this.cache.delete(oldest)
    }
    this.cache.set(key, { data, expiry: Date.now() + 60000 })
    this.accessOrder.push(key)
  }

  getCache(key) {
    const entry = this.cache.get(key)
    if (entry && entry.expiry > Date.now()) {
      const idx = this.accessOrder.indexOf(key)
      if (idx > -1) { this.accessOrder.splice(idx, 1); this.accessOrder.push(key) }
      return entry.data
    }
    this.cache.delete(key)
    return null
  }

  getPredictions(module) {
    const predictions = []
    for (const [key, count] of Object.entries(this.transitionCounts)) {
      const [from, to] = key.split('->')
      if (from === module && count > 1) {
        predictions.push({ module: to, count })
      }
    }
    return predictions.sort((a, b) => b.count - a.count).map(p => p.module)
  }

  getStats() {
    return {
      level: this.level,
      totalTransitions: Object.keys(this.transitionCounts).length,
      lastModule: this.lastModule,
      cacheSize: this.cache.size,
      topPredictions: this.getPredictions(this.lastModule).slice(0, 5),
    }
  }

  reset() {
    this.transitionCounts = {}
    this.lastModule = null
    this.cache.clear()
    this.accessOrder = []
  }
}

module.exports = { SmartPreload }
