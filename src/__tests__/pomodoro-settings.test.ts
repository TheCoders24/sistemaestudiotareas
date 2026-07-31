import { describe, it, expect, beforeEach } from 'vitest'

interface PomodoroSettings {
  pomodoroDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  autoStartBreak: boolean
  autoStartPomodoro: boolean
}

function defaultSettings(): PomodoroSettings {
  return { pomodoroDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, autoStartBreak: false, autoStartPomodoro: false }
}

function mockApi() {
  let settings = defaultSettings()
  return {
    api: {
      getPomodoroSettings: async () => ({ ...settings }),
      savePomodoroSettings: async (s: Partial<PomodoroSettings>) => {
        settings = { ...settings, ...s, pomodoroDuration: clamp(s.pomodoroDuration ?? settings.pomodoroDuration, 1, 120), shortBreakDuration: clamp(s.shortBreakDuration ?? settings.shortBreakDuration, 1, 30), longBreakDuration: clamp(s.longBreakDuration ?? settings.longBreakDuration, 1, 60) }
        return { ...settings }
      },
      resetPomodoroSettings: async () => {
        settings = defaultSettings()
        return { ...settings }
      },
    } as any,
  }
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

let mock: ReturnType<typeof mockApi>

beforeEach(() => {
  mock = mockApi()
  ;(window as any).electronAPI = mock.api
  localStorage.clear()
})

describe('Pomodoro Settings', () => {
  it('default settings', async () => {
    const s = await window.electronAPI!.getPomodoroSettings()
    expect(s.pomodoroDuration).toBe(25)
    expect(s.shortBreakDuration).toBe(5)
    expect(s.longBreakDuration).toBe(15)
    expect(s.autoStartBreak).toBe(false)
    expect(s.autoStartPomodoro).toBe(false)
  })

  it('custom durations', async () => {
    const s = await window.electronAPI!.savePomodoroSettings({ pomodoroDuration: 50, shortBreakDuration: 10, longBreakDuration: 30 })
    expect(s.pomodoroDuration).toBe(50)
    expect(s.shortBreakDuration).toBe(10)
    expect(s.longBreakDuration).toBe(30)
  })

  it('persist across get', async () => {
    await window.electronAPI!.savePomodoroSettings({ pomodoroDuration: 45 })
    const s = await window.electronAPI!.getPomodoroSettings()
    expect(s.pomodoroDuration).toBe(45)
  })

  it('auto-start toggles', async () => {
    let s = await window.electronAPI!.savePomodoroSettings({ autoStartBreak: true })
    expect(s.autoStartBreak).toBe(true)
    expect(s.autoStartPomodoro).toBe(false)
    s = await window.electronAPI!.savePomodoroSettings({ autoStartPomodoro: true, autoStartBreak: false })
    expect(s.autoStartPomodoro).toBe(true)
    expect(s.autoStartBreak).toBe(false)
  })

  it('reset to defaults', async () => {
    await window.electronAPI!.savePomodoroSettings({ pomodoroDuration: 60 })
    const s = await window.electronAPI!.resetPomodoroSettings()
    expect(s.pomodoroDuration).toBe(25)
    expect(s.shortBreakDuration).toBe(5)
    expect(s.longBreakDuration).toBe(15)
  })

  it('clamp pomodoro to 1-120', async () => {
    let s = await window.electronAPI!.savePomodoroSettings({ pomodoroDuration: 999 })
    expect(s.pomodoroDuration).toBe(120)
    s = await window.electronAPI!.savePomodoroSettings({ pomodoroDuration: -5 })
    expect(s.pomodoroDuration).toBe(1)
  })

  it('clamp short break to 1-30', async () => {
    const s = await window.electronAPI!.savePomodoroSettings({ shortBreakDuration: 99 })
    expect(s.shortBreakDuration).toBe(30)
  })

  it('clamp long break to 1-60', async () => {
    const s = await window.electronAPI!.savePomodoroSettings({ longBreakDuration: 99 })
    expect(s.longBreakDuration).toBe(60)
  })

  it('partial update preserves other fields', async () => {
    await window.electronAPI!.savePomodoroSettings({ pomodoroDuration: 30, autoStartBreak: true })
    const s = await window.electronAPI!.savePomodoroSettings({ shortBreakDuration: 7 })
    expect(s.pomodoroDuration).toBe(30)
    expect(s.shortBreakDuration).toBe(7)
    expect(s.autoStartBreak).toBe(true)
    expect(s.longBreakDuration).toBe(15)
  })
})
