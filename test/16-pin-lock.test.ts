/**
 * ============================================================================
 *  16-pin-lock.test.ts — Bloqueo por PIN (contrato de PinLock)
 * ============================================================================
 *
 *  Verifica el ciclo de vida del PIN usado por la pantalla de desbloqueo:
 *    A. isEnabled / setPin / verify / disable.
 *    B. Bloqueo temporal tras agotar los intentos.
 *
 *  Cómo ejecutarlo:
 *    npx vitest run test/16-pin-lock.test.ts
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const electronRoot = path.resolve(__dirname, '../electron')
const { PinLock } = require(path.join(electronRoot, 'core', 'pin-lock'))

function makeStore() {
  const settings: Record<string, string | null> = {}
  return {
    settings,
    get: (k: string) => (k in settings ? settings[k] : null),
    set: (k: string, v: string | null) => { settings[k] = v },
  }
}

describe('A · ciclo de vida del PIN', () => {
  let store: ReturnType<typeof makeStore>
  let pin: any

  beforeEach(() => {
    store = makeStore()
    pin = new PinLock(store.get, store.set)
  })

  it('no está habilitado si no hay hash/salt', () => {
    expect(pin.isEnabled()).toBe(false)
  })

  it('setPin habilita y guarda hash+salt', async () => {
    const ok = await pin.setPin('1234')
    expect(ok).toBe(true)
    expect(pin.isEnabled()).toBe(true)
    expect(store.get('pin_hash')).toBeTruthy()
    expect(store.get('pin_salt')).toBeTruthy()
  })

  it('verify acepta el PIN correcto y rechaza el incorrecto', async () => {
    await pin.setPin('1234')
    expect((await pin.verify('1234')).ok).toBe(true)
    const bad = await pin.verify('0000')
    expect(bad.ok).toBe(false)
    expect(bad.message).toContain('incorrecto')
  })

  it('verify devuelve ok si no hay PIN configurado', async () => {
    expect((await pin.verify('1234')).ok).toBe(true)
  })

  it('disable limpia el PIN', async () => {
    await pin.setPin('1234')
    expect(pin.disable()).toBe(true)
    expect(pin.isEnabled()).toBe(false)
    expect(store.get('pin_hash')).toBeNull()
  })
})

describe('B · bloqueo por intentos fallidos', () => {
  it('tras maxAttempts se activa el lockout', async () => {
    const store = makeStore()
    const pin = new PinLock(store.get, store.set)
    await pin.setPin('1234')

    let last: any
    for (let i = 0; i < pin.maxAttempts; i++) {
      last = await pin.verify('9999')
    }
    expect(last.ok).toBe(false)
    expect(last.locked).toBe(true)
    expect(pin.isLocked()).toBe(true)

    const blocked = await pin.verify('1234')
    expect(blocked.ok).toBe(false)
    expect(blocked.locked).toBe(true)
  })
})
