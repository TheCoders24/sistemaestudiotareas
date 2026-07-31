/**
 * ============================================================================
 *  04-component-api-consistency.test.ts — Consistencia renderer ⇄ preload
 * ============================================================================
 *
 *  ¿Qué prueba este archivo? Un META-test que recorre TODO el código fuente de
 *  `src/` (componentes, hooks, lib, App.tsx, main.tsx…) y extrae cada cadena
 *  `window.electronAPI.x.y.z(...)` que se invoca. Luego compara contra la API
 *  REAL expuesta por `electron/preload.js` (cargada con electron mockeado).
 *
 *  Si un componente llama a un método que el preload NO expone (por ejemplo
 *  `electronAPI.getFlashcardDecks()` o `electronAPI.gamification.streaks.get`),
 *  este test falla indicando archivo y línea. Es exactamente la clase de bugs
 *  que se corrigieron en la sesión (FlashcardsPage, SocialPage, TaskList,
 *  CloudSync, EnergyPlanning, SmartReminders…).
 *
 *  Excepciones documentadas (funciones protegidas con `typeof … === 'function'`
 *  porque su handler IPC no existe todavía — degradan sin romper):
 *    - `snippets.setTags`            (SnippetsPage, sin backend de tags)
 *    - `backup.saveDialog`           (useAutoBackup, sin handler de diálogo)
 *
 *  Cómo ejecutarlo:
 *    npm test -- 04-component-api-consistency
 * ============================================================================
 */

import { describe, it, expect } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import { loadPreload } from './helpers/loadPreload'

// --- Cargar el preload REAL y aplanar su API --------------------------------
const api: any = loadPreload().api

// --- Aplanar la API del preload a un set de rutas (objetos y funciones) -----
function flattenPaths(node: any, prefix: string[] = [], out: Set<string> = new Set()): Set<string> {
  if (!node || typeof node !== 'object') return out
  for (const key of Object.keys(node)) {
    const child = node[key]
    const p = [...prefix, key]
    out.add(p.join('.'))
    if (child && typeof child === 'object') flattenPaths(child, p, out)
  }
  return out
}

const validPaths = flattenPaths(api)

/** Rutas protegidas con `typeof` (degradación controlada, no rompen). */
const LEGACY_GUARDED = new Set(['snippets.setTags', 'backup.saveDialog'])

// --- Escáner de cadenas electronAPI en el código fuente ---------------------
function extractChains(text: string): { parts: string[]; index: number }[] {
  const chains: { parts: string[]; index: number }[] = []
  const re = /electronAPI/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    let i = re.lastIndex
    const parts: string[] = []
    let advanced = false
    for (;;) {
      const ch = text[i]
      if (ch === '?' || ch === '!' || /\s/.test(ch || '')) { i++; continue }
      if (ch === '.') {
        i++
        if (text[i] === '[') {
          i++
          const q = text[i]
          if (q === "'" || q === '"') {
            i++
            const start = i
            while (i < text.length && text[i] !== q) i++
            const seg = text.slice(start, i)
            i++
            if (text[i] === ']') i++
            parts.push(seg)
            advanced = true
          } else break
        } else {
          const start = i
          while (i < text.length && /[A-Za-z0-9_$]/.test(text[i])) i++
          const seg = text.slice(start, i)
          if (!seg) break
          parts.push(seg)
          advanced = true
        }
      } else break
    }
    if (advanced && parts.length > 0) chains.push({ parts, index: m.index })
    re.lastIndex = advanced ? i : m.index + 1
  }
  return chains
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue
      collectSourceFiles(full, out)
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const srcRoot = path.resolve(__dirname, '../src')

interface Violation { file: string; line: number; path: string }

function findViolations(): Violation[] {
  const violations: Violation[] = []
  const files = collectSourceFiles(srcRoot)
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((lineText, idx) => {
      const chains = extractChains(lineText)
      for (const c of chains) {
        const joined = c.parts.join('.')
        if (LEGACY_GUARDED.has(joined)) continue
        if (!validPaths.has(joined)) {
          violations.push({ file: file.replace(/\\/g, '/').replace(srcRoot.replace(/\\/g, '/'), 'src'), line: idx + 1, path: joined })
        }
      }
    })
  }
  return violations
}

describe('PASO 1 · El preload se cargó y la API se aplanó', () => {
  it('electronAPI fue expuesta', () => {
    expect(api).toBeTruthy()
  })

  it('la API contiene cientos de rutas (objetos + funciones)', () => {
    expect(validPaths.size).toBeGreaterThan(100)
  })

  it('rutas representativas existen', () => {
    expect(validPaths.has('tasks.create')).toBe(true)
    expect(validPaths.has('flashcards.cards.review')).toBe(true)
    expect(validPaths.has('app.notification.show')).toBe(true)
    expect(validPaths.has('gamification.xp.history')).toBe(true)
    expect(validPaths.has('search')).toBe(true)
  })
})

describe('PASO 2 · Todo lo que el renderer llama existe en el preload', () => {
  const violations = findViolations()

  it('no hay ninguna llamada a un método inexistente', () => {
    const detail = violations.map(v => `  ${v.file}:${v.line}  ->  electronAPI.${v.path}`).join('\n')
    expect(violations, detail).toEqual([])
  })
})
