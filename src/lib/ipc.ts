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

const cache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL = 5000

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (entry && entry.expiry > Date.now()) return entry.data
  cache.delete(key)
  return null
}

function setCache<T>(key: string, data: T) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

let RETRY_DELAYS = [500, 1500, 4000]

export function setRetryDelays(delays: number[]) {
  RETRY_DELAYS = delays
}

export function clearIpcCache() {
  cache.clear()
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

  const cacheKey = `${method}:${JSON.stringify(args)}`
  const cached = getCached<T>(cacheKey)
  if (cached !== null) return cached

  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const api = resolvePath(window.electronAPI as unknown as Record<string, unknown>, method)
      if (!api) return null
      const result = (await api(...args)) as T
      if (args.length === 0 || (args.length === 1 && typeof args[0] === 'string' && method.startsWith('get'))) {
        setCache(cacheKey, result)
      }
      return result
    } catch (err) {
      lastError = err
      if (attempt < RETRY_DELAYS.length) {
        console.warn(`[IPC Retry] ${method} (attempt ${attempt + 1}/${RETRY_DELAYS.length})`)
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : 'Error desconocido'
  console.error(`[IPC Error] ${method}:`, lastError)
  toast({
    title: 'Error',
    description: msg,
    variant: 'destructive',
  })
  return null
}

export async function safeIpcOrThrow<T>(method: IpcMethod, ...args: unknown[]): Promise<T> {
  const result = await safeIpc<T>(method, ...args)
  if (result === null) throw new Error(`IPC call "${method}" returned null`)
  return result
}
