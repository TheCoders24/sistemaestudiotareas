import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(async () => {
  window.electronAPI = undefined as any
  const mod = await import('@/lib/ipc')
  mod.clearIpcCache()
  mod.setRetryDelays([])
})

describe('safeIpc', () => {
  it('should return null when electronAPI is not available', async () => {
    const { safeIpc } = await import('@/lib/ipc')
    const result = await safeIpc('getTasks')
    expect(result).toBeNull()
  })

  it('should handle IPC errors gracefully', async () => {
    window.electronAPI = { getTasks: () => Promise.reject(new Error('DB error')) } as any
    const mod = await import('@/lib/ipc')
    const result = await mod.safeIpc('getTasks')
    expect(result).toBeNull()
  })

  it('should return data on success', async () => {
    window.electronAPI = { getTasks: () => Promise.resolve([{ id: 1, title: 'Test' }]) } as any
    const mod = await import('@/lib/ipc')
    const result = await mod.safeIpc<any[]>('getTasks')
    expect(result).toHaveLength(1)
    expect(result![0].title).toBe('Test')
  })

  it('should cache IPC results', async () => {
    let count = 0
    window.electronAPI = { getTasks: () => { count++; return Promise.resolve([{ id: 1 }]) } } as any
    const mod = await import('@/lib/ipc')
    await mod.safeIpc('getTasks')
    await mod.safeIpc('getTasks')
    expect(count).toBe(1)
  })

  it('should retry on failure', async () => {
    let count = 0
    window.electronAPI = {
      getTasks: () => {
        count++
        if (count === 1) return Promise.reject(new Error('DB locked'))
        return Promise.resolve([{ id: 1 }])
      },
    } as any
    const mod = await import('@/lib/ipc')
    mod.setRetryDelays([1])
    const result = await mod.safeIpc<any[]>('getTasks')
    expect(result).toHaveLength(1)
    expect(count).toBe(2)
  })
})