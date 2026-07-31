# Testing

## Ejecutar los tests

```bash
npm run test              # alias → vitest
npx vitest run            # Correr todos los tests una vez
npx vitest                # Modo watch
npx vitest run test/04-component-api-consistency  # Suite concreta
```

> En Windows PowerShell, si `npx vitest` falla, usa
> `cmd /c "node_modules\.bin\vitest.cmd run"` desde la raíz del proyecto.

**Estado actual:** `20 archivos · 502 tests · 0 fallos` (verificado 2026-07-31).

## Organización

| Grupo | Ubicación | Qué cubre |
|---|---|---|
| `test/` | `test/*.test.ts(x)` | **Suite "paso a paso"** del runtime completo: contrato IPC, registro de handlers, forma del preload, consistencia renderer ⇄ preload, flujos CRUD, stores, utilidades y UI. |
| `src/__tests__/` | `src/__tests__/*.test.ts(x)` | Tests históricos por módulo del renderer y de la arquitectura. |

Documentación detallada de cada suite nueva: `test/README.md`.

## Suites `test/` (paso a paso)

| Archivo | Qué cubre |
|---|---|
| `01-ipc-contract.test.ts` | Contrato de `safe-handle.js`: valor crudo, parse dual, `voidSchema()`, re-lanzamiento de errores, registro idempotente, y regresión de `workspace_id` opcional en `tasks.create`/`study.topics.create`. |
| `02-handler-registration.test.ts` | Registro de los 27 módulos de `electron/handlers/` con stubs: ninguno lanza, ≥ 100 canales, canales críticos presentes. |
| `03-preload-shape.test.ts` | Forma del API real expuesto por `preload.js` (cargado fuera de Electron): namespaces, métodos anidados, envoltura de argumentos. |
| `04-component-api-consistency.test.ts` | **Meta-test**: escanea `src/` y valida que cada `window.electronAPI.x.y.z()` exista en el preload. Excepciones guardadas: `snippets.setTags`, `backup.saveDialog`. |
| `05-crud-workflows.test.ts` | Flujos de usuario paso a paso sobre el mock anidado (subtareas, etiquetas, hábitos/rachas, pomodoro/XP, dashboard, kanban, papelera, export). |
| `06-stores.test.ts` | `appStore`, `themeStore`, `undoStore`. |
| `07-utils.test.tsx` | `cn()`, i18n `t()`/`useTranslate()`, constantes. |
| `08-ui-render.test.tsx` | Render real (RTL) de primitivos UI: Button, Badge, Card, Input, Checkbox, Switch. |

## Helpers

| Helper | Propósito |
|---|---|
| `test/helpers/mockApi.ts` | `createMockApi()` — mock en memoria con la **misma forma anidada** del preload real (tasks, subtasks, kanban, notes, habits, goals, snippets, pomodoro, search, gamification, streaks, dailyLogs, trash, export, backup, stats, dashboard, activity). Árbol aislado por test. |
| `test/helpers/loadPreload.ts` | Carga `electron/preload.js` real fuera de Electron (parchea `Module._load` para `require('electron')`). Devuelve `{ api, ipcRenderer, invoked }`. |

## Suite `src/__tests__/` (histórica)

| Archivo | Qué cubre |
|---|---|
| `api-comprehensive.test.ts` | CRUD exhaustivo de todas las entidades contra `createMockApi` (47 tests). |
| `basic.test.tsx` | Smoke de render. |
| `core-architecture.test.ts` | Arquitectura de capas del `src/`. |
| `stores.test.ts` | Stores (incluido `usePomodoroStore`). |
| `ipc.test.ts` | `src/lib/ipc.ts` (`safeIpc`). |
| `services.test.ts` | Servicios del renderer. |
| `workspaces.test.ts`, `task-relationships.test.ts`, `kanban-columns.test.ts`, `note-folders.test.ts`, `flashcards-ipc.test.ts`, `pomodoro-settings.test.ts` | Módulos específicos. |

## Notas de mantenimiento

- **Añadir una entidad al preload**: actualiza `createMockApi` en
  `test/helpers/mockApi.ts`; el test 04 validará las cadenas del renderer.
- **Renombrar un canal IPC**: los tests 02/03/04 detectarán la incoherencia.
- **Nuevos módulos de handlers**: agrégalos a `HANDLER_MODULES` en
  `test/02-handler-registration.test.ts`.
- Tests con JSX deben ser `.tsx` (Vitest no parsea JSX en `.ts`).
- Los tests no requieren build ni el binario de Electron.
