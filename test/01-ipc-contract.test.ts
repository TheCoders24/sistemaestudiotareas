/**
 * ============================================================================
 *  01-ipc-contract.test.ts — Contrato de la capa IPC (`safe-handle.js`)
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? El corazón de la corrección de bootstrap:
 *  `electron/core/safe-handle.js`. Es el adaptador entre los handlers IPC
 *  (esquemas Zod) y el renderer.
 *
 *  Contrato REAL verificado aquí:
 *    1. safeHandle devuelve el VALOR CRUDO del handler (sin wrapper {ok,...}).
 *    2. Soporta DOS formas de argumentos (candidatos) porque el preload usa
 *       `ipcRenderer.invoke(ch, ...args)` (args separados):
 *         - 0 args        -> `undefined`
 *         - 1 arg  valor  -> intenta `args[0]` y luego `{ 0: args[0] }`
 *         - N args        -> `{ 0: arg0, 1: arg1, ... }`
 *    3. Los errores de validación lanzan `Error("Validación falló en <ch>: ...")`.
 *    4. Los errores del handler se re-lanzan (NO se envuelven en {ok:false}).
 *    5. `voidSchema()` acepta `undefined` y `{}`.
 *
 *  Cómo ejecutarlo:
 *    npm test -- 01-ipc-contract            (o vitest run test/01-ipc-contract.test.ts)
 * ============================================================================
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { safeHandle, voidSchema, z } = require(path.resolve(__dirname, '../electron/core/safe-handle'))
const schemas = require(path.resolve(__dirname, '../electron/core/schemas'))

/**
 * Stub de `ipcMain` de Electron que captura los handlers registrados para
 * poder invocarlos de forma aislada (sin Electron real).
 */
function makeStubIpcMain() {
  const handlers = new Map<string, (...args: any[]) => Promise<any>>()
  return {
    handle: (channel: string, fn: (...args: any[]) => Promise<any>) => { handlers.set(channel, fn) },
    removeHandler: (channel: string) => { handlers.delete(channel) },
    /** Invoca el handler registrado como lo haría `ipcRenderer.invoke`. */
    invoke: async (channel: string, ...args: any[]) => {
      const fn = handlers.get(channel)
      if (!fn) throw new Error(`No handler for channel ${channel}`)
      return fn({}, ...args)
    },
  }
}

describe('PASO 1 · El handler devuelve el valor crudo (sin wrapper)', () => {
  it('un handler síncrono devuelve exactamente lo que retorna', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'raw:value', z.object({ n: z.number() }), ({ n }: { n: number }) => ({ ok: true, n }))

    const result = await ipc.invoke('raw:value', { n: 5 })
    // El renderer NO recibe {ok:{ok:true}} ni ningún envoltorio extra.
    expect(result).toEqual({ ok: true, n: 5 })
  })

  it('un handler async devuelve el valor resuelto', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'raw:async', voidSchema(), async () => 42)
    expect(await ipc.invoke('raw:async')).toBe(42)
  })

  it('un handler que devuelve null llega como null (no se reenvuelve)', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'raw:null', voidSchema(), () => null)
    expect(await ipc.invoke('raw:null')).toBeNull()
  })
})

describe('PASO 2 · Parse dual de argumentos (tupla-objeto vs valor único)', () => {
  it('1 arg: esquema object `{0: string}` acepta invok(...,"hola") (settings.get)', async () => {
    const ipc = makeStubIpcMain()
    let received: any = null
    safeHandle(ipc as any, 'dual:single', z.object({ 0: z.string() }), (a: any) => { received = a; return a[0] })

    // El preload hace invoke('dual:single', key) -> args = ["hola"]
    const out = await ipc.invoke('dual:single', 'hola')
    expect(out).toBe('hola')
    expect(received).toEqual({ 0: 'hola' })
  })

  it('1 arg: esquema de valor simple acepta invoke(...,"hola") (db:restoreBackup)', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'dual:string', z.string().min(1), (v: string) => v.toUpperCase())
    expect(await ipc.invoke('dual:string', 'abc')).toBe('ABC')
  })

  it('2 args: esquema tupla `{0,1}` acepta invoke(...,a,b) (settings.set)', async () => {
    const ipc = makeStubIpcMain()
    let received: any = null
    safeHandle(ipc as any, 'dual:tuple', z.object({ 0: z.string(), 1: z.string() }), (a: any) => { received = a; return true })

    // settings.set(key, value) -> args = ["theme", "dark"]
    const ok = await ipc.invoke('dual:tuple', 'theme', 'dark')
    expect(ok).toBe(true)
    expect(received).toEqual({ 0: 'theme', 1: 'dark' })
  })

  it('1 arg: esquema object plano `{title}` acepta invoke(...,{title}) (notification.show)', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(
      ipc as any,
      'dual:object',
      z.object({ title: z.string(), body: z.string(), severity: z.string().optional() }),
      ({ title, body }: { title: string; body: string }) => `${title}:${body}`,
    )
    expect(await ipc.invoke('dual:object', { title: 'T', body: 'B' })).toBe('T:B')
  })

  it('0 args: esquema voidSchema acepta invoke() sin argumentos', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'dual:void', voidSchema(), () => 'ok')
    expect(await ipc.invoke('dual:void')).toBe('ok')
  })

  it('3 args: esquema tupla `{0,1,2}` acepta invoke(...,a,b,c) (tasks:addDependency)', async () => {
    const ipc = makeStubIpcMain()
    let received: any = null
    safeHandle(ipc as any, 'dual:three', z.object({ 0: z.number(), 1: z.number(), 2: z.number() }), (a: any) => { received = a; return a[0] + a[1] + a[2] })
    expect(await ipc.invoke('dual:three', 1, 2, 3)).toBe(6)
    expect(received).toEqual({ 0: 1, 1: 2, 2: 3 })
  })
})

describe('PASO 3 · Errores de validación', () => {
  it('lanza un Error que menciona el canal y "Validación falló"', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'err:validate', z.number(), () => 'nunca llega')

    await expect(ipc.invoke('err:validate', 'no-es-numero')).rejects.toThrow(/Validación falló en err:validate/)
  })

  it('no llama al handler cuando la validación falla', async () => {
    const ipc = makeStubIpcMain()
    let called = false
    safeHandle(ipc as any, 'err:notcalled', z.object({ id: z.number() }), () => { called = true })
    await ipc.invoke('err:notcalled', { id: 'texto' }).catch(() => {})
    expect(called).toBe(false)
  })
})

describe('PASO 4 · Los errores del handler se re-lanzan (no se tragan)', () => {
  it('un handler que lanza propaga el mismo error al renderer', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'err:handler', voidSchema(), () => { throw new Error('boom interno') })
    await expect(ipc.invoke('err:handler')).rejects.toThrow('boom interno')
  })

  it('un rechazo async se propaga', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'err:async', voidSchema(), async () => { throw new Error('async boom') })
    await expect(ipc.invoke('err:async')).rejects.toThrow('async boom')
  })
})

describe('PASO 5 · voidSchema() acepta undefined, {} y undefined implícito', () => {
  it('acepta undefined explícito', () => {
    const r = voidSchema().safeParse(undefined)
    expect(r.success).toBe(true)
  })

  it('acepta {} (compatibilidad con handlers que reciben objeto vacío)', () => {
    const r = voidSchema().safeParse({})
    expect(r.success).toBe(true)
  })

  it('rechaza valores no vacíos', () => {
    expect(voidSchema().safeParse(123).success).toBe(false)
    expect(voidSchema().safeParse('x').success).toBe(false)
  })
})

describe('PASO 6 · Registro idempotente', () => {
  it('re-registrar el mismo canal reemplaza el handler sin romperse', async () => {
    const ipc = makeStubIpcMain()
    safeHandle(ipc as any, 'idem:ch', voidSchema(), () => 'primero')
    safeHandle(ipc as any, 'idem:ch', voidSchema(), () => 'segundo')
    expect(await ipc.invoke('idem:ch')).toBe('segundo')
  })
})

describe('PASO 7 · workspace_id es opcional en create (regresión StudyMap/Tasks)', () => {
  // El renderer crea tareas y temas SIN enviar workspace_id (p. ej.
  // StudyMap.handleCreate y TaskList.handleCreate), y los INSERT de los
  // handlers no lo usan. Exigirlo rompía db:createStudyTopic y db:createTask
  // con "workspace_id: Invalid input: expected number, received undefined".

  it('db:createTask acepta un payload sin workspace_id', async () => {
    const r = schemas.tasks.create.safeParse({ title: 'Mi tarea', priority: 'media' })
    expect(r.success).toBe(true)
  })

  it('db:createTask sigue aceptando workspace_id si se provee', async () => {
    const r = schemas.tasks.create.safeParse({ title: 'T', priority: 'media', workspace_id: 3 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.workspace_id).toBe(3)
  })

  it('db:createStudyTopic acepta un payload sin workspace_id', async () => {
    const r = schemas.study.topics.create.safeParse({ name: 'Anatomía', parent_id: null })
    expect(r.success).toBe(true)
  })

  it('db:createStudyTopic sigue exigiendo el nombre (title/name obligatorio)', async () => {
    expect(schemas.study.topics.create.safeParse({ name: '' }).success).toBe(false)
    expect(schemas.tasks.create.safeParse({ priority: 'media' }).success).toBe(false)
  })
})
