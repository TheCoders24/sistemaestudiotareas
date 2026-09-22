import { toast } from '@/components/ui/use-toast'

type IsFunction<T> = T extends (...args: never[]) => unknown ? true : false

type NestedMethod<T> = {
  [K in keyof T & string]: IsFunction<T[K]> extends true
    ? K
    : T[K] extends object
      ? `${K}.${NestedMethod<T[K]>}`
      : never
}[keyof T & string]

type IpcMethod = NestedMethod<Window['electronAPI']>

interface CacheEntry<T> {
  data: T
  expiry: number
}

interface CacheConfig {
  ttl: number
  maxSize: number
}

const DEFAULT_CACHE_CONFIG: CacheConfig = { ttl: 5000, maxSize: 500 }

const methodTtlOverrides: Record<string, number> = {
  'tasks.list': 10000,
  'notes.list': 10000,
  'projects.list': 10000,
  'kanban.columns.list': 15000,
  'kanban.cards.list': 10000,
  'study.topics.list': 15000,
  'flashcards.decks.list': 15000,
  'habits.list': 10000,
  'goals.list': 10000,
  'settings.get': 30000,
  'dashboard.get': 5000,
  'stats.get': 10000,
  'search': 3000,
}

const cache = new Map<string, CacheEntry<unknown>>()
const accessOrder = new Set<string>()

function getTtl(method: string): number {
  for (const [prefix, ttl] of Object.entries(methodTtlOverrides)) {
    if (method.startsWith(prefix)) return ttl
  }
  return DEFAULT_CACHE_CONFIG.ttl
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (entry && entry.expiry > Date.now()) {
    accessOrder.delete(key)
    accessOrder.add(key)
    return entry.data
  }
  cache.delete(key)
  accessOrder.delete(key)
  return null
}

function setCache<T>(key: string, data: T, ttl: number) {
  if (cache.size >= DEFAULT_CACHE_CONFIG.maxSize && !cache.has(key)) {
    const oldest = accessOrder.values().next().value
    if (oldest) { cache.delete(oldest); accessOrder.delete(oldest) }
  }
  cache.set(key, { data, expiry: Date.now() + ttl })
  accessOrder.delete(key)
  accessOrder.add(key)
}

function makeCacheKey(method: string, args: unknown[]): string {
  try { return `${method}:${JSON.stringify(args)}` } catch { return `${method}:${args.length}` }
}

export function clearIpcCache(prefix?: string) {
  if (!prefix) { cache.clear(); accessOrder.clear(); return }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) { cache.delete(key); accessOrder.delete(key) }
  }
}

export function getIpcCacheStats() {
  return { size: cache.size, maxSize: DEFAULT_CACHE_CONFIG.maxSize, keys: [...cache.keys()] }
}

let RETRY_DELAYS = [500, 1500, 4000]

export function setRetryDelays(delays: number[]) {
  RETRY_DELAYS = delays
}

function resolvePath(obj: Record<string, unknown>, path: string): ((...args: unknown[]) => unknown) | null {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return null
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'function' ? (cur as (...args: unknown[]) => unknown) : null
}

export async function safeIpc<T>(method: IpcMethod, ...args: unknown[]): Promise<T | null> {
  if (!window.electronAPI) return null

  const cacheKey = makeCacheKey(method, args)
  const cached = getCached<T>(cacheKey)
  if (cached !== null) return cached

  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const api = resolvePath(window.electronAPI as unknown as Record<string, unknown>, method)
      if (!api) return null
      const result = (await api(...args)) as T
      const ttl = getTtl(method)
      if (ttl > 0) setCache(cacheKey, result, ttl)
      return result
    } catch (err) {
      lastError = err
      if (attempt < RETRY_DELAYS.length) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : 'Error desconocido'
  console.error(`[IPC Error] ${method}:`, lastError)
  toast({ title: 'Error', description: msg, variant: 'destructive' })
  return null
}

export async function safeIpcOrThrow<T>(method: IpcMethod, ...args: unknown[]): Promise<T> {
  const result = await safeIpc<T>(method, ...args)
  if (result === null) throw new Error(`IPC call "${method}" returned null`)
  return result
}
