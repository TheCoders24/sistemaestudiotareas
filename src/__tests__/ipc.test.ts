import { describe, it, expect, vi } from 'vitest'

describe('safeIpc', () => {
  it('should return null when electronAPI is not available', async () => {
    const { safeIpc } = await import('@/lib/ipc')
    const result = await safeIpc('getTasks')
    expect(result).toBeNull()
  })

  it('should handle IPC errors gracefully', async () => {
    window.electronAPI = {
      getTasks: () => Promise.reject(new Error('DB error')),
    } as any
    const { safeIpc } = await import('@/lib/ipc')
    const result = await safeIpc('getTasks')
    expect(result).toBeNull()
  })

  it('should return data on success', async () => {
    window.electronAPI = {
      getTasks: () => Promise.resolve([{ id: 1, title: 'Test' }]),
    } as any
    const { safeIpc } = await import('@/lib/ipc')
    const result = await safeIpc<any[]>('getTasks')
    expect(result).toHaveLength(1)
    expect(result![0].title).toBe('Test')
  })
})
