/**
 * ============================================================================
 *  07-utils.test.ts — Utilidades puras del renderer (cn, t, constants)
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? Las funciones utilitarias que usa toda la UI:
 *
 *    - `cn()` (clsx + tailwind-merge): concatena clases y resuelve conflictos
 *      de tailwind (p. ej. `px-2` gana frente a `p-4` por orden).
 *    - `t(key)` / `useTranslate()` (translate.ts): i18n ES/EN con fallback.
 *    - `constants.ts`: los valores de configuración de pomodoro/descanso.
 *
 *  Cómo ejecutarlo:
 *    npm test -- 07-utils
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { cn } from '../src/lib/utils'
import { t, useTranslate } from '../src/lib/translate'
import { useAppStore } from '../src/stores/appStore'
import { PRIORITY_COLORS, TABS, KEYBOARD_SHORTCUTS } from '../src/lib/constants'

describe('PASO 1 · cn()', () => {
  it('concatena clases simples', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('ignora falsy', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b')
  })

  it('mergea clases de tailwind en conflicto (gana la última)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('funciona con condicionales', () => {
    expect(cn('base', true && 'si', false && 'no')).toBe('base si')
  })
})

describe('PASO 2 · traducción (ES/EN)', () => {
  beforeEach(() => {
    useAppStore.setState({ language: 'es' })
  })

  it('traduce claves existentes en español', () => {
    expect(t('app.name')).toBe('EstudioApp')
    expect(t('sidebar.inicio')).toBe('Inicio')
    expect(t('common.save')).toBe('Guardar')
  })

  it('traduce en inglés al cambiar idioma', () => {
    useAppStore.setState({ language: 'en' })
    expect(t('sidebar.inicio')).toBe('Dashboard')
    expect(t('common.save')).toBe('Save')
  })

  it('clave inexistente devuelve la misma clave (fallback)', () => {
    expect(t('no.existe.esta.clave')).toBe('no.existe.esta.clave')
  })

  it('useTranslate es reactivo al idioma del store', () => {
    function Probe() {
      const tr = useTranslate()
      return <div>{tr('common.cancel')}</div>
    }
    useAppStore.setState({ language: 'es' })
    const { rerender } = render(<Probe />)
    expect(screen.getByText('Cancelar')).toBeTruthy()
    useAppStore.setState({ language: 'en' })
    rerender(<Probe />)
    expect(screen.getByText('Cancel')).toBeTruthy()
  })
})

describe('PASO 3 · constantes del renderer', () => {
  it('colores por prioridad cubren baja/media/alta', () => {
    expect(PRIORITY_COLORS.baja).toBeTruthy()
    expect(PRIORITY_COLORS.media).toContain('amber')
    expect(PRIORITY_COLORS.alta).toContain('red')
  })

  it('la lista de pestañas tiene más de 10 y es estable', () => {
    expect(TABS.length).toBeGreaterThan(10)
    expect(new Set(TABS.map(t => t.id)).size).toBe(TABS.length)
  })

  it('los atajos de teclado están definidos', () => {
    expect(Object.keys(KEYBOARD_SHORTCUTS).length).toBeGreaterThan(0)
  })
})
