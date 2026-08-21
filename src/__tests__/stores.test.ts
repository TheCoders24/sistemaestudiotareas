import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('appStore', () => {
  beforeEach(async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.setState({
      activeTab: 'inicio',
      sidebarOpen: true,
      darkMode: true,
      autoDarkMode: false,
      autoDarkStart: '20:00',
      autoDarkEnd: '07:00',
      streak: { current: 0, max: 0 },
      focusMode: false,
      userName: '',
      fontSize: 'base',
      language: 'es',
      denseMode: false,
      firstRun: true,
    })
  })

  it('has correct initial state', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    const s = useAppStore.getState()
    expect(s.activeTab).toBe('inicio')
    expect(s.sidebarOpen).toBe(true)
    expect(s.darkMode).toBe(true)
    expect(s.autoDarkMode).toBe(false)
    expect(s.autoDarkStart).toBe('20:00')
    expect(s.autoDarkEnd).toBe('07:00')
    expect(s.streak).toEqual({ current: 0, max: 0 })
    expect(s.focusMode).toBe(false)
    expect(s.userName).toBe('')
    expect(s.fontSize).toBe('base')
    expect(s.language).toBe('es')
    expect(s.denseMode).toBe(false)
    expect(s.firstRun).toBe(true)
  })

  it('setActiveTab changes tab', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setActiveTab('kanban')
    expect(useAppStore.getState().activeTab).toBe('kanban')
    useAppStore.getState().setActiveTab('stats')
    expect(useAppStore.getState().activeTab).toBe('stats')
  })

  it('toggleSidebar toggles', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    expect(useAppStore.getState().sidebarOpen).toBe(true)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(false)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('setSidebarOpen sets specific value', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setSidebarOpen(false)
    expect(useAppStore.getState().sidebarOpen).toBe(false)
    useAppStore.getState().setSidebarOpen(true)
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('setDarkMode', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setDarkMode(false)
    expect(useAppStore.getState().darkMode).toBe(false)
    useAppStore.getState().setDarkMode(true)
    expect(useAppStore.getState().darkMode).toBe(true)
  })

  it('setAutoDarkMode and auto dark times', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setAutoDarkMode(true)
    expect(useAppStore.getState().autoDarkMode).toBe(true)
    useAppStore.getState().setAutoDarkStart('21:00')
    expect(useAppStore.getState().autoDarkStart).toBe('21:00')
    useAppStore.getState().setAutoDarkEnd('06:30')
    expect(useAppStore.getState().autoDarkEnd).toBe('06:30')
  })

  it('setStreak updates streak data', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setStreak({ current: 7, max: 14 })
    expect(useAppStore.getState().streak).toEqual({ current: 7, max: 14 })
  })

  it('setFocusMode', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setFocusMode(true)
    expect(useAppStore.getState().focusMode).toBe(true)
  })

  it('setUserName', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setUserName('Alexis')
    expect(useAppStore.getState().userName).toBe('Alexis')
  })

  it('setFontSize cycles through sm/base/lg', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setFontSize('sm')
    expect(useAppStore.getState().fontSize).toBe('sm')
    useAppStore.getState().setFontSize('lg')
    expect(useAppStore.getState().fontSize).toBe('lg')
    useAppStore.getState().setFontSize('base')
    expect(useAppStore.getState().fontSize).toBe('base')
  })

  it('setLanguage toggles es/en', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setLanguage('en')
    expect(useAppStore.getState().language).toBe('en')
    useAppStore.getState().setLanguage('es')
    expect(useAppStore.getState().language).toBe('es')
  })

  it('setDenseMode', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setDenseMode(true)
    expect(useAppStore.getState().denseMode).toBe(true)
  })

  it('setFirstRun', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    useAppStore.getState().setFirstRun(false)
    expect(useAppStore.getState().firstRun).toBe(false)
  })
})

describe('pomodoroStore', () => {
  beforeEach(async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.setState({
      timeLeft: 25 * 60,
      isRunning: false,
      focusTime: 25,
      totalPomodoros: 0,
      pomodoroCount: 0,
      startTime: null,
      sessionHistory: [],
    })
  })

  it('has correct initial state', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    const s = usePomodoroStore.getState()
    expect(s.timeLeft).toBe(25 * 60)
    expect(s.isRunning).toBe(false)
    expect(s.focusTime).toBe(25)
    expect(s.totalPomodoros).toBe(0)
    expect(s.pomodoroCount).toBe(0)
    expect(s.startTime).toBeNull()
    expect(s.sessionHistory).toEqual([])
  })

  it('start sets isRunning and startTime', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.getState().start()
    const s = usePomodoroStore.getState()
    expect(s.isRunning).toBe(true)
    expect(s.startTime).toBeInstanceOf(Date)
  })

  it('start resets timeLeft when 0', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.setState({ timeLeft: 0, focusTime: 30 })
    usePomodoroStore.getState().start()
    expect(usePomodoroStore.getState().timeLeft).toBe(30 * 60)
    expect(usePomodoroStore.getState().isRunning).toBe(true)
  })

  it('pause stops running', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.getState().start()
    usePomodoroStore.getState().pause()
    const s = usePomodoroStore.getState()
    expect(s.isRunning).toBe(false)
    expect(s.startTime).toBeNull()
  })

  it('reset restores timeLeft to focusTime', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.getState().start()
    usePomodoroStore.setState({ timeLeft: 300 })
    usePomodoroStore.getState().reset()
    const s = usePomodoroStore.getState()
    expect(s.timeLeft).toBe(25 * 60)
    expect(s.isRunning).toBe(false)
  })

  it('setFocusTime changes focus time and resets timeLeft', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.getState().setFocusTime(15)
    const s = usePomodoroStore.getState()
    expect(s.focusTime).toBe(15)
    expect(s.timeLeft).toBe(15 * 60)
  })

  it('tick decrements timeLeft when running', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.getState().start()
    usePomodoroStore.getState().tick()
    expect(usePomodoroStore.getState().timeLeft).toBe(25 * 60 - 1)
  })

  it('tick does nothing when not running', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.getState().tick()
    expect(usePomodoroStore.getState().timeLeft).toBe(25 * 60)
  })

  it('tick completes pomodoro at timeLeft=1', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.setState({ timeLeft: 1, isRunning: true })
    usePomodoroStore.getState().tick()
    const s = usePomodoroStore.getState()
    expect(s.isRunning).toBe(false)
    expect(s.timeLeft).toBe(0)
    expect(s.totalPomodoros).toBe(1)
    expect(s.pomodoroCount).toBe(1)
    expect(s.sessionHistory).toHaveLength(1)
    expect(s.sessionHistory[0].type).toBe('pomodoro')
  })

  it('multiple ticks accumulate pomodoros', async () => {
    const { usePomodoroStore } = await import('@/stores/pomodoroStore')
    usePomodoroStore.setState({ timeLeft: 1, isRunning: true })
    usePomodoroStore.getState().tick()
    usePomodoroStore.setState({ timeLeft: 1, isRunning: true })
    usePomodoroStore.getState().tick()
    expect(usePomodoroStore.getState().totalPomodoros).toBe(2)
    expect(usePomodoroStore.getState().sessionHistory).toHaveLength(2)
  })
})

describe('undoStore', () => {
  beforeEach(async () => {
    const { useUndoStore } = await import('@/stores/undoStore')
    useUndoStore.setState({ actions: [] })
  })

  it('pushAction adds an action', async () => {
    const { useUndoStore } = await import('@/stores/undoStore')
    const onUndo = vi.fn()
    useUndoStore.getState().pushAction({ label: 'Delete task', onUndo })
    expect(useUndoStore.getState().actions).toHaveLength(1)
    expect(useUndoStore.getState().actions[0].label).toBe('Delete task')
  })

  it('pushAction generates unique IDs', async () => {
    const { useUndoStore } = await import('@/stores/undoStore')
    useUndoStore.getState().pushAction({ label: 'A', onUndo: vi.fn() })
    useUndoStore.getState().pushAction({ label: 'B', onUndo: vi.fn() })
    const ids = useUndoStore.getState().actions.map(a => a.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('undo calls onUndo callback', async () => {
    const { useUndoStore } = await import('@/stores/undoStore')
    const onUndo = vi.fn().mockResolvedValue(undefined)
    useUndoStore.getState().pushAction({ label: 'Test', onUndo })
    const id = useUndoStore.getState().actions[0].id
    await useUndoStore.getState().undo(id)
    expect(onUndo).toHaveBeenCalledOnce()
    expect(useUndoStore.getState().actions).toHaveLength(0)
  })

  it('undo removes action from list', async () => {
    const { useUndoStore } = await import('@/stores/undoStore')
    useUndoStore.getState().pushAction({ label: 'A', onUndo: vi.fn() })
    useUndoStore.getState().pushAction({ label: 'B', onUndo: vi.fn() })
    const id = useUndoStore.getState().actions[0].id
    await useUndoStore.getState().undo(id)
    expect(useUndoStore.getState().actions).toHaveLength(1)
    expect(useUndoStore.getState().actions[0].label).toBe('B')
  })

  it('undo with non-existent id does nothing', async () => {
    const { useUndoStore } = await import('@/stores/undoStore')
    useUndoStore.getState().pushAction({ label: 'A', onUndo: vi.fn() })
    await useUndoStore.getState().undo('nonexistent')
    expect(useUndoStore.getState().actions).toHaveLength(1)
  })

  it('clearExpired removes old actions', async () => {
    const { useUndoStore } = await import('@/stores/undoStore')
    useUndoStore.getState().pushAction({ label: 'A', onUndo: vi.fn() })
    const action = useUndoStore.getState().actions[0]
    action.timestamp = Date.now() - 10000
    useUndoStore.setState({ actions: [...useUndoStore.getState().actions] })
    useUndoStore.getState().clearExpired()
    expect(useUndoStore.getState().actions).toHaveLength(0)
  })

  it('clearExpired keeps recent actions', async () => {
    const { useUndoStore } = await import('@/stores/undoStore')
    useUndoStore.getState().pushAction({ label: 'A', onUndo: vi.fn() })
    useUndoStore.getState().clearExpired()
    expect(useUndoStore.getState().actions).toHaveLength(1)
  })
})

describe('themeStore', () => {
  it('has 8 themes', async () => {
    const { THEMES } = await import('@/stores/themeStore')
    expect(THEMES).toHaveLength(8)
  })

  it('each theme has required properties', async () => {
    const { THEMES } = await import('@/stores/themeStore')
    for (const theme of THEMES) {
      expect(theme.id).toBeTruthy()
      expect(theme.label).toBeTruthy()
      expect(theme.primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.vars).toBeDefined()
      expect(theme.vars['--primary']).toBeTruthy()
    }
  })

  it('theme IDs are unique', async () => {
    const { THEMES } = await import('@/stores/themeStore')
    const ids = THEMES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('setThemeId changes theme', async () => {
    const { useThemeStore } = await import('@/stores/themeStore')
    useThemeStore.getState().setThemeId('rose')
    expect(useThemeStore.getState().themeId).toBe('rose')
  })

  it('defaults to indigo', async () => {
    const { useThemeStore } = await import('@/stores/themeStore')
    useThemeStore.setState({ themeId: 'indigo' })
    expect(useThemeStore.getState().themeId).toBe('indigo')
  })
})

describe('utils cn()', () => {
  it('merges class names', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
  })

  it('resolves tailwind conflicts', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles empty inputs', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn()).toBe('')
  })

  it('handles conditional classes', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })

  it('merges padding conflicts', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
