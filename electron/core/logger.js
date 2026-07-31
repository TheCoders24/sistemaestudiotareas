const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
const MAX_LOG_FILES = 7

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
    this.runId = generateRunId()
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
      this.rotateLogs()
    } catch {
      this.logDir = null
    }
  }

  rotateLogs() {
    if (!this.logDir) return
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .sort()
        .reverse()
      if (files.length >= MAX_LOG_FILES) {
        files.slice(MAX_LOG_FILES - 1).forEach(f => {
          fs.unlinkSync(path.join(this.logDir, f))
        })
      }
    } catch {
      // ignore rotation errors
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
    const formatted = this.formatMessage(level, this.formatArgs(...args))
    console.log(formatted)

    if (this.currentLogPath) {
      try {
        fs.appendFileSync(this.currentLogPath, formatted + '\n')
      } catch {
        // ignore write errors
      }
    }
  }

  debug(...args) {
    this.log('DEBUG', ...args)
  }

  info(...args) {
    this.log('INFO', ...args)
  }

  warn(...args) {
    this.log('WARN', ...args)
  }

  error(...args) {
    this.log('ERROR', ...args)
  }
}

module.exports = new Logger()
