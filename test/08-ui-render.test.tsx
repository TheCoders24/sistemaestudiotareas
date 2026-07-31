/**
 * ============================================================================
 *  08-ui-render.test.tsx — Render de primitivos de UI con React Testing Library
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? Que los componentes base de la UI montan y se
 *  comportan correctamente en JSDOM (sin depender del main process):
 *
 *    - `Button`: renderiza botón real (o `asChild` con <a>), variantes, click.
 *    - `Badge`: variantes y contenido.
 *    - `Card`/`CardHeader`/`CardTitle`: estructura de tarjeta.
 *    - `Input`: acepta value y llama onChange.
 *    - `Checkbox`: toggle de estado.
 *    - `Switch`: toggle de estado.
 *
 *  Cómo ejecutarlo:
 *    npm test -- 08-ui-render
 * ============================================================================
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../src/components/ui/button'
import { Badge } from '../src/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../src/components/ui/card'
import { Input } from '../src/components/ui/input'
import { Checkbox } from '../src/components/ui/checkbox'
import { Switch } from '../src/components/ui/switch'

describe('PASO 1 · Button', () => {
  it('renderiza un botón con su texto', () => {
    render(<Button>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy()
  })

  it('ejecuta onClick', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Clic</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Clic' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('asChild renderiza otro elemento (link)', () => {
    render(<Button asChild><a href="/test">Enlace</a></Button>)
    expect(screen.getByRole('link', { name: 'Enlace' })).toBeTruthy()
  })

  it('disabled no dispara click', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>No</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('PASO 2 · Badge', () => {
  it('muestra su contenido', () => {
    render(<Badge>alta</Badge>)
    expect(screen.getByText('alta')).toBeTruthy()
  })
})

describe('PASO 3 · Card', () => {
  it('renderiza header, título y contenido', () => {
    render(
      <Card>
        <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
        <CardContent>Contenido</CardContent>
      </Card>
    )
    expect(screen.getByText('Resumen')).toBeTruthy()
    expect(screen.getByText('Contenido')).toBeTruthy()
  })
})

describe('PASO 4 · Input', () => {
  it('muestra el valor y emite cambios', () => {
    const onChange = vi.fn()
    render(<Input value="hola" onChange={onChange} aria-label="titulo" />)
    const input = screen.getByLabelText('titulo') as HTMLInputElement
    expect(input.value).toBe('hola')
    fireEvent.change(input, { target: { value: 'mundo' } })
    expect(onChange).toHaveBeenCalled()
  })
})

describe('PASO 5 · Checkbox', () => {
  it('marca/desmarca al hacer clic', () => {
    const onChecked = vi.fn()
    render(<Checkbox aria-label="hecho" onCheckedChange={onChecked} />)
    fireEvent.click(screen.getByLabelText('hecho'))
    expect(onChecked).toHaveBeenCalledWith(true)
  })
})

describe('PASO 6 · Switch', () => {
  it('alterna al hacer clic', () => {
    const onChecked = vi.fn()
    render(<Switch aria-label="auto" onCheckedChange={onChecked} />)
    fireEvent.click(screen.getByLabelText('auto'))
    expect(onChecked).toHaveBeenCalled()
  })
})
