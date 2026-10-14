const { Worker } = require('worker_threads')
const path = require('path')

class DatabaseHeavyProxy {
  constructor() {
    this.worker = null
    this.ready = false
    this.requestId = 0
    this.pendingRequests = new Map()
    this.initPromise = null
  }

  async init() {
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      try {
        const workerPath = path.join(__dirname, 'database-worker.js')
        this.worker = new Worker(workerPath)

        this.worker.on('message', (message) => {
          if (message.type === 'ready') {
            this.ready = true
            resolve()
          } else if (message.type === 'response') {
            const pending = this.pendingRequests.get(message.requestId)
            if (pending) {
              this.pendingRequests.delete(message.requestId)
              if (message.error) {
                pending.reject(new Error(message.error.message))
              } else {
                pending.resolve(message.result)
              }
            }
          } else if (message.type === 'error') {
            console.error('[DB Heavy Proxy] Worker error:', message.payload)
          }
        })

        this.worker.on('error', (error) => {
          console.error('[DB Heavy Proxy] Worker error:', error)
        })

        this.worker.on('exit', (code) => {
          if (code !== 0) {
            console.error('[DB Heavy Proxy] Worker exited with code:', code)
          }
        })

        this.worker.postMessage({ type: 'init' })
      } catch (error) {
        reject(error)
      }
    })

    return this.initPromise
  }

  async execute(type, payload = {}) {
    if (!this.ready) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId
      this.pendingRequests.set(requestId, { resolve, reject })

      this.worker.postMessage({ type, payload, requestId })

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Heavy DB operation timeout'))
        }
      }, 60000)
    })
  }

  async backup(path) {
    return this.execute('backup', { path })
  }

  async migrate() {
    return this.execute('migrate', {})
  }

  async createIndexes() {
    return this.execute('createIndexes', {})
  }

  async reindexSearch() {
    return this.execute('reindexSearch', {})
  }

  async vacuum() {
    return this.execute('vacuum', {})
  }

  async analyze() {
    return this.execute('analyze', {})
  }

  async largeQuery(sql, params = [], method = 'all') {
    return this.execute('largeQuery', { sql, params, method })
  }

  async close() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.ready = false
    }
  }
}

let instance = null

function getHeavyProxy() {
  if (!instance) {
    instance = new DatabaseHeavyProxy()
  }
  return instance
}

module.exports = { DatabaseHeavyProxy, getHeavyProxy }