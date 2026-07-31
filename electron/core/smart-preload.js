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

class SmartPreload {
  constructor(getDb, { level = 'basic', maxTransitions = 100 } = {}) {
    this.getDb = getDb
    this.level = level
    this.maxTransitions = maxTransitions
    this.transitionCounts = {}
    this.lastModule = null
    this.lastWorkspace = null
    this.preloadQueue = []
    this.active = false
  }

  setLevel(level) {
    this.level = level
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
          if (item.type === 'db') {
            try {
              db.prepare('SELECT 1').get()
            } catch {}
          }
        }
      } catch {
      } finally {
        this.active = false
      }
    })
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
      topPredictions: this.getPredictions(this.lastModule).slice(0, 5),
    }
  }

  reset() {
    this.transitionCounts = {}
    this.lastModule = null
  }
}

module.exports = { SmartPreload }
