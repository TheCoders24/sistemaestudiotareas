import { describe, it, expect } from 'vitest'

describe('utils', () => {
  it('cn should merge class names', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
  })
})

describe('appStore', () => {
  it('should toggle sidebar', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    const store = useAppStore.getState()
    expect(store.sidebarOpen).toBe(true)
    store.toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(false)
  })

  it('should set active tab', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    const store = useAppStore.getState()
    store.setActiveTab('kanban')
    expect(useAppStore.getState().activeTab).toBe('kanban')
  })

  it('should toggle dark mode', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    const store = useAppStore.getState()
    const initial = store.darkMode
    store.setDarkMode(!initial)
    expect(useAppStore.getState().darkMode).toBe(!initial)
  })

  it('should toggle focus mode', async () => {
    const { useAppStore } = await import('@/stores/appStore')
    const store = useAppStore.getState()
    store.setFocusMode(true)
    expect(useAppStore.getState().focusMode).toBe(true)
    store.setFocusMode(false)
    expect(useAppStore.getState().focusMode).toBe(false)
  })
})

describe('themeStore', () => {
  it('should have 8 themes', async () => {
    const { THEMES } = await import('@/stores/themeStore')
    expect(THEMES.length).toBe(8)
  })

  it('should change theme', async () => {
    const { useThemeStore } = await import('@/stores/themeStore')
    const store = useThemeStore.getState()
    store.setThemeId('rose')
    expect(useThemeStore.getState().themeId).toBe('rose')
  })
})

describe('empty-state', () => {
  it('should render with icon and title', async () => {
    const { EmptyState } = await import('@/components/ui/empty-state')
    const { StickyNote } = await import('lucide-react')
    const el = EmptyState({ icon: StickyNote, title: 'Test Title' })
    expect(el.type).toBe('div')
  })
})
