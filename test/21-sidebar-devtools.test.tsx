/**
 * ============================================================================
 *  21-sidebar-devtools.test.tsx — Menú lateral: modo desarrollador y acordeón
 * ============================================================================
 *
 *  Verifica que:
 *    - La pestaña "Herramientas de desarrollo" aparece en el hub "Sistema"
 *      cuando el modo desarrollador está activo (por prop o por evento).
 *    - La pestaña NO aparece cuando el modo desarrollador está apagado.
 *    - El acordeón de hubs despliega y retrae sus opciones al hacer clic.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Sidebar from '../src/components/Sidebar/Sidebar'

beforeEach(() => {
  localStorage.clear()
})

function renderSidebar(developerMode = false) {
  return render(
    <Sidebar activeTab="inicio" onNavigate={() => {}} developerMode={developerMode} userProfile="custom" />
  )
}

describe('Sidebar · modo desarrollador', () => {
  it('muestra "Herramientas de desarrollo" en Sistema cuando developerMode es true', () => {
    renderSidebar(true)
    expect(screen.getByText('Sistema')).toBeTruthy()
    expect(screen.getByText('Herramientas de desarrollo')).toBeTruthy()
  })

  it('oculta la pestaña cuando developerMode es false', () => {
    renderSidebar(false)
    expect(screen.queryByText('Herramientas de desarrollo')).toBeNull()
  })

  it('reacciona al evento developerModeChanged en vivo', () => {
    renderSidebar(false)
    expect(screen.queryByText('Herramientas de desarrollo')).toBeNull()
    act(() => {
      window.dispatchEvent(new CustomEvent('developerModeChanged', { detail: true }))
    })
    expect(screen.getByText('Herramientas de desarrollo')).toBeTruthy()
  })

  it('despliega Sistema automáticamente al activar el modo desarrollador', () => {
    renderSidebar(false)
    fireEvent.click(screen.getByText('Sistema'))
    expect(screen.queryByText('Sincronización')).toBeNull()
    act(() => {
      window.dispatchEvent(new CustomEvent('developerModeChanged', { detail: true }))
    })
    expect(screen.getByText('Herramientas de desarrollo')).toBeTruthy()
  })
})

describe('Sidebar · acordeón de hubs', () => {
  it('retrae y vuelve a desplegar las opciones al hacer clic en el hub', () => {
    renderSidebar(true)
    expect(screen.getByText('Sincronización')).toBeTruthy()
    fireEvent.click(screen.getByText('Sistema'))
    expect(screen.queryByText('Sincronización')).toBeNull()
    fireEvent.click(screen.getByText('Sistema'))
    expect(screen.getByText('Sincronización')).toBeTruthy()
  })
})
