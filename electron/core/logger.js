const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
const MAX_LOG_FILES = 30
const MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB

function generateRunId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

class Logger {
  constructor() {
    this.logDir = null
    this.currentLogPath = null
    this.currentLogSize = 0
    this.runId = generateRunId()
    this.minLevel = LEVELS.INFO // Default minimum level
    this.debug = this.debug.bind(this)
    this.info = this.info.bind(this)
    this.warn = this.warn.bind(this)
    this.error = this.error.bind(this)
    this.log = this.log.bind(this)
  }

  init() {
    try {
      this.logDir = path.join(app.getPath('userData'), 'logs')
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
      }
      const date = new Date().toISOString().slice(0, 10)
      this.currentLogPath = path.join(this.logDir, `app-${date}.log`)
      if (fs.existsSync(this.currentLogPath)) {
        this.currentLogSize = fs.statSync(this.currentLogPath).size
      }
      this.rotateLogs()
    } catch {
      this.logDir = null
    }
  }

  setMinLevel(level) {
    if (LEVELS[level] !== undefined) {
      this.minLevel = LEVELS[level]
    }
  }

  rotateLogs() {
    if (!this.logDir) return
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .map(f => ({ name: f, path: path.join(this.logDir, f), mtime: fs.statSync(path.join(this.logDir, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime)
      
      // Remove by count
      if (files.length >= MAX_LOG_FILES) {
        files.slice(MAX_LOG_FILES - 1).forEach(f => {
          try { fs.unlinkSync(f.path) } catch {}
        })
      }
      
      // Remove by total size (keep last 50MB total)
      const totalSize = files.reduce((sum, f) => sum + fs.statSync(f.path).size, 0)
      if (totalSize > 50 * 1024 * 1024) {
        const toDelete = files.slice(10) // Keep latest 10
        toDelete.forEach(f => {
          try { fs.unlinkSync(f.path) } catch {}
        })
      }
    } catch {
      // ignore rotation errors
    }
  }

  maybeRotateCurrentLog() {
    if (!this.currentLogPath || this.currentLogSize < MAX_LOG_SIZE) return
    try {
      const date = new Date().toISOString().slice(0, 10)
      const newPath = path.join(this.logDir, `app-${date}-${Date.now()}.log`)
      fs.renameSync(this.currentLogPath, newPath)
      this.currentLogPath = path.join(this.logDir, `app-${new Date().toISOString().slice(0, 10)}.log`)
      this.currentLogSize = 0
      this.rotateLogs()
    } catch {
      // ignore
    }
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString()
    return `[${level}] [${timestamp}] [${this.runId}] ${message}`
  }

  formatArgs(...args) {
    return args.map(a => (a && typeof a === 'object' && a.stack) ? a.stack : (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
  }

  log(level, ...args) {
    if (LEVELS[level] < this.minLevel) return
    
    const formatted = this.formatMessage(level, this.formatArgs(...args))
    console.log(formatted)

    if (this.currentLogPath) {
      try {
        this.maybeRotateCurrentLog()
        fs.appendFileSync(this.currentLogPath, formatted + '\n')
        this.currentLogSize += Buffer.byteLength(formatted + '\n')
      } catch {
        // ignore write errors
      }
    }
  }

  // Export logs for user (e.g., for bug reports)
  exportLogs(options = {}) {
    const { since, level, limit, format = 'text' } = options
    if (!this.logDir) return null

    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .map(f => ({ name: f, path: path.join(this.logDir, f), mtime: fs.statSync(path.join(this.logDir, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime)

      let allLogs = []
      for (const file of files) {
        const content = fs.readFileSync(file.path, 'utf-8')
        const lines = content.split('\n').filter(l => l.trim())
        allLogs.push(...lines.map(line => ({ ...this.parseLogLine(line), file: file.name })))
      }

      // Filter by date
      if (since) {
        const sinceDate = new Date(since)
        allLogs = allLogs.filter(log => new Date(log.timestamp) >= sinceDate)
      }

      // Filter by level
      if (level && LEVELS[level] !== undefined) {
        const minLevel = LEVELS[level]
        allLogs = allLogs.filter(log => LEVELS[log.level] >= minLevel)
      }

      // Limit
      if (limit && limit > 0) {
        allLogs = allLogs.slice(-limit)
      }

      if (format === 'json') {
        return JSON.stringify(allLogs, null, 2)
      }

      return allLogs.map(l => `${l.timestamp} [${l.level}] ${l.message}`).join('\n')
    } catch (e) {
      this.error('Failed to export logs:', e)
      return null
    }
  }

  parseLogLine(line) {
    // Format: [LEVEL] [TIMESTAMP] [RUNID] MESSAGE
    const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.*)$/)
    if (match) {
      return { level: match[1], timestamp: match[2], runId: match[3], message: match[4] }
    }
    return { level: 'UNKNOWN', timestamp: new Date().toISOString(), runId: this.runId, message: line }
  }

  getLogStats() {
    if (!this.logDir) return null
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .map(f => ({ name: f, size: fs.statSync(path.join(this.logDir, f)).size }))
      const totalSize = files.reduce((sum, f) => sum + f.size, 0)
      return { files: files.length, totalSize, totalSizeMB: (totalSize / 1024 / 1024).toFixed(2) }
    } catch {
      return null
    }
  }

  debug(...args) { this.log('DEBUG', ...args) }
  info(...args) { this.log('INFO', ...args) }
  warn(...args) { this.log('WARN', ...args) }
  error(...args) { this.log('ERROR', ...args) }
}

module.exports = new Logger()