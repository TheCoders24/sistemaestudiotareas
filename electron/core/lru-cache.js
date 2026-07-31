class LruCache {
  constructor(maxSize) {
    if (maxSize <= 0) throw new Error('LRU cache size must be greater than zero')
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key) {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) this.cache.delete(oldestKey)
    }
    this.cache.set(key, value)
  }

  has(key) { return this.cache.has(key) }
  delete(key) { return this.cache.delete(key) }
  clear() { this.cache.clear() }
  get size() { return this.cache.size }
}

module.exports = { LruCache }
