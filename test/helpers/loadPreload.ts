/**
 * ============================================================================
 *  helpers/loadPreload.ts — Carga el preload REAL con `electron` mockeado
 * ============================================================================
 *
 *  El preload (`electron/preload.js`) hace `require('electron')` en su primera
 *  línea. Fuera del runtime de Electron, `require('electron')` no expone
 *  `contextBridge`, así que para poder inspeccionar la API que expone hay que
 *  interceptar ese require.
 *
 *  `vi.mock('electron')` NO funciona aquí porque el preload se carga con un
 *  `require()` crudo (fuera del grafo de módulos de Vitest). Esta utilidad
 *  parchea temporalmente `Module._load` para devolver un doble de `electron`
 *  cada vez que cualquier módulo haga `require('electron')`, captura la API
 *  expuesta por `contextBridge.exposeInMainWorld` y restaura el hook.
 *
 *  Uso:
 *    import { loadPreload } from './helpers/loadPreload'
 *    const api = loadPreload()
 * ============================================================================
 */

import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

export interface PreloadHarness {
  /** El objeto expuesto como `window.electronAPI` */
  api: any
  /** El doble de ipcRenderer; permite espiar los canales invocados */
  ipcRenderer: { invoke: (...args: any[]) => Promise<any>; on: (...args: any[]) => void; removeListener: (...args: any[]) => void }
  /** Canales invocados por las funciones del preload durante la carga */
  invoked: { channel: string; args: any[] }[]
}

export function loadPreload(): PreloadHarness {
  const Module = require('node:module') as any
  const origLoad = Module._load

  const invoked: { channel: string; args: any[] }[] = []
  const ipcRenderer = {
    invoke: (...args: any[]) => {
      invoked.push({ channel: String(args[0]), args: args.slice(1) })
      return Promise.resolve(null)
    },
    on: () => {},
    removeListener: () => {},
  }

  let api: any = null
  const electronMock = {
    contextBridge: {
      exposeInMainWorld: (_name: string, value: any) => {
        api = value
      },
    },
    ipcRenderer,
  }

  Module._load = function (request: string, _parent: any, _isMain: boolean) {
    if (request === 'electron') return electronMock
    return origLoad.apply(this, arguments as any)
  }

  try {
    require(path.resolve(__dirname, '../../electron/preload.js'))
  } finally {
    Module._load = origLoad
  }

  return { api, ipcRenderer, invoked }
}
