class PerformanceMonitor {
  constructor({ eventBus, getDb, maxSamples = 60 } = {}) {
    this.eventBus = eventBus
    this.getDb = getDb
    this.maxSamples = maxSamples
    this.samples = []
    this.interval = null
    this.enabled = false
    this.listeners = []
    this.thresholds = {
      heapUsedMB: 200,
      listeners: 100,
      subscribers: 50,
      stmtCount: 150,
    }
  }

  start(intervalMs = 30000) {
    if (this.interval) return
    this.enabled = true
    this.collectSample()
    this.interval = setInterval(() => this.collectSample(), intervalMs)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.enabled = false
  }

  collectSample() {
    const memory = process.memoryUsage ? process.memoryUsage() : {}
    const sample = {
      timestamp: Date.now(),
      heapUsedMB: Math.round((memory.heapUsed || 0) / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round((memory.heapTotal || 0) / 1024 / 1024 * 100) / 100,
      rssMB: Math.round((memory.rss || 0) / 1024 / 1024 * 100) / 100,
      listeners: this.listeners.length,
      subscribers: this.eventBus ? this.eventBus.subscriberCount || 0 : 0,
      stmtCount: this.getStmtCount(),
      warnings: [],
    }

    if (sample.heapUsedMB > this.thresholds.heapUsedMB) {
      sample.warnings.push(`Heap memory high: ${sample.heapUsedMB}MB`)
    }
    if (sample.listeners > this.thresholds.listeners) {
      sample.warnings.push(`Too many listeners: ${sample.listeners}`)
    }

    this.samples.push(sample)
    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }
    return sample
  }

  getStmtCount() {
    try {
      return 0
    } catch { return 0 }
  }

  getLatestSample() {
    return this.samples[this.samples.length - 1] || null
  }

  getAverages() {
    if (this.samples.length === 0) return null
    const sum = this.samples.reduce((acc, s) => ({
      heapUsedMB: acc.heapUsedMB + s.heapUsedMB,
      listeners: acc.listeners + s.listeners,
      subscribers: acc.subscribers + s.subscribers,
    }), { heapUsedMB: 0, listeners: 0, subscribers: 0 })
    const n = this.samples.length
    return {
      avgHeapMB: Math.round(sum.heapUsedMB / n * 100) / 100,
      avgListeners: Math.round(sum.listeners / n * 100) / 100,
      avgSubscribers: Math.round(sum.subscribers / n * 100) / 100,
      sampleCount: n,
    }
  }

  getReport() {
    return {
      enabled: this.enabled,
      latest: this.getLatestSample(),
      averages: this.getAverages(),
      thresholds: this.thresholds,
      totalSamples: this.samples.length,
    }
  }

  setThreshold(key, value) {
    if (key in this.thresholds) {
      this.thresholds[key] = value
    }
  }

  registerListener(name) {
    this.listeners.push({ name, addedAt: Date.now() })
  }

  unregisterListener(name) {
    this.listeners = this.listeners.filter(l => l.name !== name)
  }
}

module.exports = { PerformanceMonitor }
