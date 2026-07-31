class AutomationEngine {
  constructor(eventBus, getDb) {
    this.eventBus = eventBus
    this.getDb = getDb
    this.rules = []
    this.subscriptions = []
  }

  async init() {
    await this.loadRules()
    this.subscribeToEvents()
  }

  async loadRules() {
    try {
      const db = this.getDb()
      const rows = db.prepare('SELECT * FROM automation_rules WHERE enabled = 1').all()
      this.rules = rows.map(row => ({
        id: row.id,
        name: row.name,
        trigger: row.trigger,
        conditions: JSON.parse(row.conditions_json || '[]'),
        actions: JSON.parse(row.actions_json || '[]')
      }))
    } catch {
      this.rules = []
    }
  }

  subscribeToEvents() {
    const events = [
      'task.created', 'task.updated', 'task.deleted', 'task.moved',
      'project.created', 'project.updated', 'project.archived',
      'workspace.switched', 'module.changed'
    ]

    events.forEach(event => {
      const handler = (data) => this.handleEvent(event, data)
      this.eventBus.subscribe(event, handler)
      this.subscriptions.push({ event, handler })
    })
  }

  async handleEvent(event, data) {
    for (const rule of this.rules) {
      if (rule.trigger !== event) continue
      if (!this.evaluateConditions(rule.conditions, data)) continue
      await this.executeActions(rule.actions, data, rule)
    }
  }

  evaluateConditions(conditions, context) {
    if (!conditions || conditions.length === 0) return true
    return conditions.every(condition => {
      if (condition.type === 'equals') {
        return context[condition.field] === condition.value
      }
      if (condition.type === 'exists') {
        return context[condition.field] != null
      }
      return true
    })
  }

  async executeActions(actions, context, rule) {
    for (const action of actions) {
      try {
        await this.executeAction(action, context)
        this.logTriggered(rule, action)
      } catch (err) {
        console.error(`[AutomationEngine] Action failed for rule "${rule.name}":`, err)
      }
    }
  }

  async executeAction(action, context) {
    switch (action.type) {
      case 'task.move.column': {
        const { getDb } = this.getDb ? { getDb: this.getDb } : {}
        const db = this.getDb()
        db.prepare('UPDATE tasks SET column_id = ? WHERE id = ?')
          .run(action.payload.columnId, context.taskId || action.payload.taskId)
        break
      }
      case 'task.set.priority': {
        const db = this.getDb()
        db.prepare('UPDATE tasks SET priority = ? WHERE id = ?')
          .run(action.payload.priority, context.taskId || action.payload.taskId)
        break
      }
      case 'task.create': {
        const db = this.getDb()
        db.prepare('INSERT INTO tasks (title, description, column_id, priority, workspace_id) VALUES (?, ?, ?, ?, ?)')
          .run(action.payload.title, action.payload.description || '', action.payload.columnId, action.payload.priority || 'medium', action.payload.workspaceId || context.workspaceId)
        break
      }
      case 'project.archive': {
        const db = this.getDb()
        db.prepare('UPDATE projects SET archived = 1 WHERE id = ?')
          .run(action.payload.projectId || context.projectId)
        break
      }
      case 'notification.show': {
        const notificationManager = require('./notification-manager')
        await notificationManager.show(
          action.payload.title || 'Automation',
          action.payload.body || `Rule triggered: ${action.payload.message || ''}`,
          action.payload.severity || 'info'
        )
        break
      }
      case 'webhook': {
        const https = require('https')
        const http = require('http')
        const url = new URL(action.payload.url)
        const body = JSON.stringify(resolveWebhookPayload(action.payload.template || {}, context))
        const client = url.protocol === 'https:' ? https : http
        return new Promise((resolve, reject) => {
          const req = client.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: 10000,
          }, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => resolve(data))
          })
          req.on('error', reject)
          req.on('timeout', () => { req.destroy(); reject(new Error('Webhook timeout')) })
          req.write(body)
          req.end()
        })
      }
      default:
        console.warn(`[AutomationEngine] Unknown action type: ${action.type}`)
    }
  }

  logTriggered(rule, action) {
    const { default: logger } = require('./logger')
    logger.info(`Automation triggered: rule="${rule.name}" action="${action.type}"`)
  }

  async addRule(rule) {
    try {
      const db = this.getDb()
      const result = db.prepare(
        `INSERT INTO automation_rules (workspace_id, name, enabled, trigger, conditions_json, actions_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).run(
        rule.workspaceId || null,
        rule.name,
        rule.enabled !== false ? 1 : 0,
        rule.trigger,
        JSON.stringify(rule.conditions || []),
        JSON.stringify(rule.actions || [])
      )
      rule.id = result.lastInsertRowid
      if (rule.enabled !== false) {
        this.rules.push({
          id: rule.id,
          name: rule.name,
          trigger: rule.trigger,
          conditions: rule.conditions || [],
          actions: rule.actions || []
        })
      }
    } catch (err) {
      console.error('[AutomationEngine] Failed to add rule:', err)
    }
  }

  async removeRule(ruleId) {
    try {
      const db = this.getDb()
      db.prepare('DELETE FROM automation_rules WHERE id = ?').run(ruleId)
      this.rules = this.rules.filter(r => r.id !== ruleId)
    } catch (err) {
      console.error('[AutomationEngine] Failed to remove rule:', err)
    }
  }
}

function resolveWebhookPayload(template, context) {
  const result = {}
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      result[key] = value.replace(/\{\{(\w+)\}\}/g, (_, k) => context[k] ?? `{{${k}}}`)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = resolveWebhookPayload(value, context)
    } else {
      result[key] = value
    }
  }
  return result
}

module.exports = AutomationEngine
