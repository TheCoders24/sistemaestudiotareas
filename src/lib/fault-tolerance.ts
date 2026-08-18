import { toast } from '@/components/ui/use-toast'

const INSTALLED = Symbol.for('fault-tolerance.installed')

const TOAST_THROTTLE_MS = 2500
let lastToastAt = Number.NEGATIVE_INFINITY
let globalHandlersInstalled = false

type ApiFn = (...args: unknown[]) => unknown

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err === null || err === undefined) return 'Error desconocido'
  return String(err)
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  )
}

function logFailure(path: string, err: unknown): void {
  console.error(`[fault-tolerance] falló "${path}":`, err)
}

function showThrottledToast(path: string, err: unknown): void {
  const now = Date.now()
  if (now - lastToastAt < TOAST_THROTTLE_MS) return
  lastToastAt = now
  toast({
    title: 'Algo falló',
    description: path
      ? `No se pudo completar "${path}". Detalle: ${describeError(err)}`
      : `Ocurrió un error inesperado: ${describeError(err)}`,
    variant: 'destructive',
  })
}

function wrapFn(original: ApiFn, path: string): (...args: unknown[]) => unknown {
  return (...args: unknown[]): unknown => {
    try {
      const result = original(...args)
      if (isPromiseLike(result)) {
        return result.then(
          (value) => value,
          (err: unknown) => {
            logFailure(path, err)
            showThrottledToast(path, err)
            return null
          },
        )
      }
      return result
    } catch (err) {
      logFailure(path, err)
      showThrottledToast(path, err)
      return null
    }
  }
}

function wrapTree(node: unknown, path: string, seen: WeakSet<object>): unknown {
  if (node === null || typeof node !== 'object') return node
  if (seen.has(node)) return node
  seen.add(node)

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(node as Record<string, unknown>)) {
    const value = (node as Record<string, unknown>)[key]
    const childPath = path ? `${path}.${key}` : key
    if (typeof value === 'function') {
      out[key] = wrapFn(value as ApiFn, childPath)
    } else if (value && typeof value === 'object') {
      out[key] = wrapTree(value, childPath, seen)
    } else {
      out[key] = value
    }
  }
  return out
}

function installGlobalErrorHandlers(): void {
  if (globalHandlersInstalled) return
  globalHandlersInstalled = true

  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason
    logFailure('(promesa no controlada)', err)
    showThrottledToast('una operación en segundo plano', err)
    event.preventDefault()
  })

  window.addEventListener('error', (event) => {
    const err = event.error ?? event.message
    logFailure('(error global)', err)
    showThrottledToast('una operación', err)
  })
}

export function resetFaultTolerance(): void {
  lastToastAt = Number.NEGATIVE_INFINITY
  globalHandlersInstalled = false
}

export function installFaultTolerance(): void {
  const api = window.electronAPI as unknown as Record<string, unknown> & { [INSTALLED]?: boolean }
  if (!api) {
    installGlobalErrorHandlers()
    return
  }
  if (api[INSTALLED]) return

  const wrapped = wrapTree(api, '', new WeakSet()) as Record<string, unknown> & { [INSTALLED]?: boolean }
  wrapped[INSTALLED] = true

  const before = window.electronAPI
  window.electronAPI = wrapped as unknown as Window['electronAPI']
  if (window.electronAPI === before) {
    console.warn('[fault-tolerance] no se pudo reemplazar window.electronAPI; solo quedan los handlers globales activos')
  }
  installGlobalErrorHandlers()
}
