const MODES = {
  ahorro: {
    label: 'Ahorro',
    description: 'M\u00ednimo consumo de recursos',
    cacheMaxSize: 50,
    preloadLevel: 'none',
    animationEnabled: false,
    debounceMs: 500,
    virtualOverscan: 5,
    gcIntervalMs: 60000,
    prefetchModules: false,
    maxListeners: 30,
  },
  balanceado: {
    label: 'Balanceado',
    description: 'Rendimiento y caracter\u00edsticas equilibradas',
    cacheMaxSize: 200,
    preloadLevel: 'basic',
    animationEnabled: true,
    debounceMs: 300,
    virtualOverscan: 10,
    gcIntervalMs: 120000,
    prefetchModules: true,
    maxListeners: 80,
  },
  maximo: {
    label: 'M\u00e1ximo',
    description: 'M\u00e1ximo rendimiento con precarga inteligente',
    cacheMaxSize: 500,
    preloadLevel: 'aggressive',
    animationEnabled: true,
    debounceMs: 100,
    virtualOverscan: 20,
    gcIntervalMs: 300000,
    prefetchModules: true,
    maxListeners: 200,
  },
}

class PerformanceModes {
  constructor(initialMode = 'balanceado') {
    this.currentMode = initialMode
    this.onChangeCallbacks = []
  }

  get modes() {
    return Object.entries(MODES).map(([key, value]) => ({
      id: key,
      ...value,
    }))
  }

  get current() {
    return MODES[this.currentMode] || MODES.balanceado
  }

  get modeId() {
    return this.currentMode
  }

  setMode(modeId) {
    if (!MODES[modeId]) return false
    this.currentMode = modeId
    const config = this.current
    for (const cb of this.onChangeCallbacks) {
      try { cb(modeId, config) } catch {}
    }
    return true
  }

  onChange(callback) {
    this.onChangeCallbacks.push(callback)
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(cb => cb !== callback)
    }
  }

  getConfig() {
    return { mode: this.currentMode, ...this.current }
  }

  toJSON() {
    return this.getConfig()
  }
}

module.exports = { PerformanceModes, MODES }
