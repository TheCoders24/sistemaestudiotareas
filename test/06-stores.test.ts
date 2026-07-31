/**
 * ============================================================================
 *  06-stores.test.ts — Stores de Zustand (appStore, themeStore, undoStore)
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? Los tres stores globales del renderer:
 *
 *    - `useAppStore` : pestaña activa, sidebar, tema manual/auto, racha,
 *                      focus mode, perfil (nombre/tipo/idioma/densidad) e
 *                      hidratación desde settings con `setInitialSettings`.
 *    - `useThemeStore`: cambio de tema aplica variables CSS en <html>.
 *    - `useUndoStore` : cola de acciones de deshacer (push / undo / expiry).
 *
 *  Usa el estado REAL del store (`useXStore.getState()`) para evitar
 *  entrelazar pruerbas; se resetea con `setState` antes de cada test.
 *
 *  Cómo ejecutarlo:
 *    npm test -- 06-stores
 * ============================================================================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '../src/stores/appStore'
import { useThemeStore } from '../src/stores/themeStore'
import { useUndoStore } from '../src/stores/undoStore'

const APP_DEFAULTS = useAppStore.getState()

beforeEach(() => {
  useAppStore.setState(APP_DEFAULTS, true)
  useThemeStore.setState({ themeId: 'indigo' })
  useUndoStore.setState({ actions: [] })
})

describe('PASO 1 · appStore', () => {
  it('estado inicial correcto', () => {
    const s = useAppStore.getState()
    expect(s.activeTab).toBe('inicio')
    expect(s.sidebarOpen).toBe(true)
    expect(s.darkMode).toBe(true)
    expect(s.focusMode).toBe(false)
    expect(s.language).toBe('es')
    expect(s.firstRun).toBe(true)
    expect(s.streak).toEqual({ current: 0, max: 0 })
  })

  it('navegación y sidebar', () => {
    useAppStore.getState().setActiveTab('kanban')
    expect(useAppStore.getState().activeTab).toBe('kanban')
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(false)
    useAppStore.getState().setSidebarOpen(true)
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('tema y focus mode', () => {
    useAppStore.getState().setDarkMode(false)
    expect(useAppStore.getState().darkMode).toBe(false)
    useAppStore.getState().setFocusMode(true)
    expect(useAppStore.getState().focusMode).toBe(true)
  })

  it('racha se actualiza', () => {
    useAppStore.getState().setStreak({ current: 5, max: 9 })
    expect(useAppStore.getState().streak).toEqual({ current: 5, max: 9 })
  })

  it('perfil (nombre, fuente, idioma, densidad)', () => {
    const s = useAppStore.getState()
    s.setUserName('Ana')
    s.setFontSize('lg')
    s.setLanguage('en')
    s.setDenseMode(true)
    const next = useAppStore.getState()
    expect(next.userName).toBe('Ana')
    expect(next.fontSize).toBe('lg')
    expect(next.language).toBe('en')
    expect(next.denseMode).toBe(true)
  })

  it('setInitialSettings hidrata solo lo provisto', () => {
    useAppStore.getState().setInitialSettings({ darkMode: false, userName: 'Luis', language: 'en' })
    const s = useAppStore.getState()
    expect(s.darkMode).toBe(false)
    expect(s.userName).toBe('Luis')
    expect(s.language).toBe('en')
    // Los no provistos conservan su valor
    expect(s.fontSize).toBe('base')
    expect(s.focusMode).toBe(false)
  })
})

describe('PASO 2 · themeStore', () => {
  it('cambiar de tema actualiza themeId y las variables CSS', () => {
    const root = document.documentElement
    useThemeStore.getState().setThemeId('emerald')
    expect(useThemeStore.getState().themeId).toBe('emerald')
    expect(root.style.getPropertyValue('--primary')).toContain('160')
  })

  it('tema inexistente cae a indigo y no rompe', () => {
    useThemeStore.getState().setThemeId('no-existe')
    expect(useThemeStore.getState().themeId).toBe('no-existe')
    expect(document.documentElement.style.getPropertyValue('--primary')).not.toBe('')
  })
})

describe('PASO 3 · undoStore', () => {
  it('pushAction agrega y undo ejecuta onUndo y remueve', async () => {
    const onUndo = vi.fn()
    useUndoStore.getState().pushAction({ label: 'Eliminar tarea', onUndo })
    const entry = useUndoStore.getState().actions[0]
    expect(useUndoStore.getState().actions).toHaveLength(1)
    expect(entry.label).toBe('Eliminar tarea')

    await useUndoStore.getState().undo(entry.id)
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(useUndoStore.getState().actions).toHaveLength(0)
  })

  it('undo de id inexistente no hace nada', async () => {
    await useUndoStore.getState().undo('xyz')
    expect(useUndoStore.getState().actions).toHaveLength(0)
  })

  it('clearExpired elimina acciones mayores a 8s', () => {
    const now = Date.now()
    useUndoStore.setState({
      actions: [
        { id: 'vieja', label: 'a', timestamp: now - 9000, onUndo: () => {} },
        { id: 'nueva', label: 'b', timestamp: now - 1000, onUndo: () => {} },
      ],
    })
    useUndoStore.getState().clearExpired()
    const ids = useUndoStore.getState().actions.map(a => a.id)
    expect(ids).toEqual(['nueva'])
  })
})
