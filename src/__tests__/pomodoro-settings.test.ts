import { describe, it, expect, beforeEach } from 'vitest'

function mockApi() {
  const store = new Map<string, string>()

  return {
    api: {
      settings: {
        get: async (key: string) => store.get(key) ?? null,
        set: async (key: string, value: string) => {
          store.set(key, value)
          return true
        },
      },
    } as any,
  }
}

let mock: ReturnType<typeof mockApi>

beforeEach(() => {
  mock = mockApi()
  ;(window as any).electronAPI = mock.api
})

describe('Pomodoro Settings', () => {
  it('returns null for unset keys', async () => {
    expect(await window.electronAPI!.settings.get('pomodoro_preset')).toBeNull()
    expect(await window.electronAPI!.settings.get('pomodoro_focus')).toBeNull()
  })

  it('persists preset selection', async () => {
    await window.electronAPI!.settings.set('pomodoro_preset', 'long')
    expect(await window.electronAPI!.settings.get('pomodoro_preset')).toBe('long')
  })

  it('persists focus time as string', async () => {
    await window.electronAPI!.settings.set('pomodoro_focus', '50')
    expect(await window.electronAPI!.settings.get('pomodoro_focus')).toBe('50')
  })

  it('overwrites previous value', async () => {
    await window.electronAPI!.settings.set('pomodoro_focus', '25')
    await window.electronAPI!.settings.set('pomodoro_focus', '15')
    expect(await window.electronAPI!.settings.get('pomodoro_focus')).toBe('15')
  })

  it('keeps preset and focus independent', async () => {
    await window.electronAPI!.settings.set('pomodoro_preset', 'short')
    await window.electronAPI!.settings.set('pomodoro_focus', '30')
    expect(await window.electronAPI!.settings.get('pomodoro_preset')).toBe('short')
    expect(await window.electronAPI!.settings.get('pomodoro_focus')).toBe('30')
  })

  it('supports clearing a key with null', async () => {
    await window.electronAPI!.settings.set('pomodoro_focus', '25')
    await window.electronAPI!.settings.set('pomodoro_focus', '')
    expect(await window.electronAPI!.settings.get('pomodoro_focus')).toBe('')
  })

  it('stays isolated between tests', async () => {
    expect(await window.electronAPI!.settings.get('pomodoro_preset')).toBeNull()
  })
})