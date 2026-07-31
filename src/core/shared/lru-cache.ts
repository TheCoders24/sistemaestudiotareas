export class LruCache<TKey, TValue> {
  private readonly cache = new Map<TKey, TValue>()

  constructor(private readonly maxSize: number) {
    if (maxSize <= 0) throw new Error('LRU cache size must be greater than zero')
  }

  get(key: TKey): TValue | undefined {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key) as TValue
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: TKey, value: TValue): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) this.cache.delete(oldestKey)
    }
    this.cache.set(key, value)
  }

  has(key: TKey): boolean {
    return this.cache.has(key)
  }

  delete(key: TKey): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}
