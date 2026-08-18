import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { toast } from '@/components/ui/use-toast'

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

import { installFaultTolerance, resetFaultTolerance } from '@/lib/fault-tolerance'

const toastMock = vi.mocked(toast)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  resetFaultTolerance()
  toastMock.mockClear()
  window.electronAPI = undefined as any
})

afterEach(() => {
  vi.useRealTimers()
  window.electronAPI = undefined as any
})

function installWith(api: unknown): void {
  window.electronAPI = api as any
  installFaultTolerance()
}

describe('installFaultTolerance', () => {
  it('envuelve la API anidada y propaga valores en éxito', async () => {
    installWith({
      tasks: { list: () => Promise.resolve([{ id: 1, title: 'A' }]) },
      settings: { get: () => Promise.resolve('x') },
    })

    const result = await (window.electronAPI as any).tasks.list()
    expect(result).toEqual([{ id: 1, title: 'A' }])
    expect(await (window.electronAPI as any).settings.get()).toBe('x')
    expect(toastMock).not.toHaveBeenCalled()
  })

  it('devuelve null y tostea cuando un handler rechaza', async () => {
    installWith({
      dashboard: { get: () => Promise.reject(new Error('DB lock')) },
    })

    const result = await (window.electronAPI as any).dashboard.get()
    expect(result).toBeNull()
    expect(toastMock).toHaveBeenCalledTimes(1)
    expect(toastMock.mock.calls[0][0].description).toContain('DB lock')
  })

  it('tolera rechazos que no son Error (string/null)', async () => {
    installWith({ stats: { weeklyReport: () => Promise.reject('boom') } })
    const result = await (window.electronAPI as any).stats.weeklyReport()
    expect(result).toBeNull()
    expect(toastMock).toHaveBeenCalledTimes(1)
  })

  it('preserva funciones síncronas (callbacks de eventos) sin convertirlas en promesa', () => {
    const cleanup = vi.fn()
    installWith({ onTrayAction: (cb: unknown) => { void cb; return cleanup } })

    const returned = (window.electronAPI as any).onTrayAction(() => {})
    expect(returned).toBe(cleanup)
    expect(returned).not.toBeInstanceOf(Promise)
  })

  it('propaga errores síncronos como null + toast', () => {
    installWith({ utils: { getVersion: () => { throw new Error('sync fail') } } })
    const result = (window.electronAPI as any).utils.getVersion()
    expect(result).toBeNull()
    expect(toastMock).toHaveBeenCalledTimes(1)
  })

  it('es idempotente: instalar dos veces no envuelve dos veces', async () => {
    let calls = 0
    installWith({ tasks: { list: () => { calls++; return Promise.resolve('ok') } } })
    installFaultTolerance()

    await (window.electronAPI as any).tasks.list()
    await (window.electronAPI as any).tasks.list()
    expect(calls).toBe(2)
  })

  it('limita a un toast cada 2.5s para no spamear', async () => {
    installWith({ a: { f: () => Promise.reject(new Error('e1')) } })
    const api = window.electronAPI as any

    await api.a.f()
    await api.a.f()
    expect(toastMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2600)
    await api.a.f()
    expect(toastMock).toHaveBeenCalledTimes(2)
  })

  it('no hace nada cuando no hay electronAPI', () => {
    expect(() => installFaultTolerance()).not.toThrow()
  })
})
