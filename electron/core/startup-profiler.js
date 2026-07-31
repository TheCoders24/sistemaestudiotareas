class StartupProfiler {
  constructor() {
    this.marks = {}
    this.measures = []
    this.startedAt = null
  }

  start() {
    this.startedAt = Date.now()
    this.mark('app-start')
  }

  mark(name) {
    this.marks[name] = Date.now()
    if (this.startedAt === null) {
      this.startedAt = this.marks[name]
    }
  }

  measure(from, to, label) {
    const fromTime = this.marks[from]
    const toTime = this.marks[to]
    if (fromTime === undefined || toTime === undefined) return
    this.measures.push({
      label: label || `${from} \u2192 ${to}`,
      from,
      to,
      durationMs: toTime - fromTime,
      startedAt: new Date(fromTime).toISOString(),
    })
  }

  getReport() {
    const total = this.startedAt !== null ? Date.now() - this.startedAt : 0
    return {
      totalStartupMs: total,
      measures: [...this.measures].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
      markCount: Object.keys(this.marks).length,
      capturedAt: new Date().toISOString(),
    }
  }

  getTotalMs() {
    if (this.startedAt === null) return 0
    return Date.now() - this.startedAt
  }

  reset() {
    this.marks = {}
    this.measures = []
    this.startedAt = null
  }

  toJSON() {
    return this.getReport()
  }
}

module.exports = { StartupProfiler }
