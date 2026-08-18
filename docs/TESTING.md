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

**Estado actual:** `21 archivos · 513 tests · 0 fallos` (verificado 2026-08-02).

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
| `09-study-map-courses.test.ts` | Materias en el StudyMap: crear materia, persistir `course_id`, agrupar por materia + "Sin materia", reasignar, reordenar y niveles. Parte B: SQL dinámico del INSERT. |

> Feature completa documentada en [`docs/materias-en-studymap.md`](materias-en-studymap.md),
> incluye la verificación end-to-end real con `npx electron scripts/verify-study-course.js`.

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

## Suite E2E real (Electron)

Además de Vitest, el proyecto tiene una suite **end-to-end contra los handlers IPC
reales** sobre una base SQLite real y desechable:

```bash
cmd /c "node_modules\.bin\electron.cmd scripts\automated-testing.js"
```

| Propiedad | Valor |
|---|---|
| Qué ejercita | Los **212 canales IPC** registrados por los 27 módulos de `electron/handlers/` (más los inline seguros de `main.js`), sobre una BD SQLite **real** en `%TEMP%\sistema-automated-tests` (se borra en cada corrida). |
| Cobertura | 26 grupos · 90 comprobaciones · **90/90 OK** (verificado 2026-08-02): workspaces, tareas, subtareas, proyectos, notas, kanban, pomodoro, mapa de estudio + materias, objetivos, hábitos, snippets, diarios, flashcards, automatizaciones, etiquetas, papelera, búsqueda, actividad, estadísticas, ajustes, plantillas, exámenes, gamificación, infraestructura, backups, vínculos y ICS. |
| Excluye (peligrosos) | IA (API externa), sincronización WiFi, restauración/importación masiva de BD, vaciar papelera, ejecutar snippets, diálogos de archivo, atajos globales, autoarranque, updater y PIN. |
| Salida | Tabla resumen por grupo + código de salida `0` (todo OK) o `1` (falló al menos una). |

> Requiere el binario de Electron (es un proceso real, no un mock).
> En PowerShell usa `cmd /c` porque `&&` no funciona.

### Bugs reales que la suite destapó y fueron corregidos

| Bug | Fix |
|---|---|
| `utils.getStmt`: el desalojo LRU llamaba `stmt.finalize()`, que **no existe** en `better-sqlite3` v12 → crasheaba al superar 200 sentencias únicas. | `utils.js`: guarda `typeof victim.finalize === 'function'` antes de finalizar. |
| `daily_logs` sin columna `updated_at` → `db:updateDailyLog` (safeUpdate) crasheaba. | `database.js` v17: migración `ALTER TABLE daily_logs ADD COLUMN updated_at` + columna en el `CREATE TABLE`. |
| `db:reviewFlashcard` / `db:getFlashcardReviewStats` / `db:getUpcomingFlashcardReviews`: literales SQL entre **dobles comillas** (`datetime("now")` = identificador) → `no such column: now`. | `flashcards.js`: comillas simples `datetime('now')`. |
| INSERTs con columnas fijas que crasheaban al omitir campos opcionales (`db:createTask` sin `reminder`/`description`, `db:createProject` sin `description`, kanban/pomodoro/snippets/exam_simulations). | INSERT dinámico que solo incluye las columnas presentes (tasks, projects, kanban, pomodoro, snippets, exams). |
| `db:updateStudyTopic` fallaba al usar `safeUpdate` antes de existir `study_topics.updated_at`. | `database.js` v16 (ya documentada) + cobertura en la suite. |
| `templates:instantiate` (botón "Empezar con plantilla" del StudyMap) crasheaba con `getStmt().transaction(...)` — `getStmt` exige un SQL y no tiene `.transaction`. | `templates.js`: usa `getDb().transaction(...)`. Cubierto por el test nuevo `templates:instantiate`. |

