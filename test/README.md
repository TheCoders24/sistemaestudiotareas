# Suite de Tests — Sistema de Estudio y Tareas

Documentación completa de los tests del proyecto. La suite se ejecuta con
**Vitest** sobre JSDOM y se divide en dos grupos:

| Grupo | Ubicación | Qué cubre |
| ----- | --------- | --------- |
| `test/` | `test/*.test.ts(x)` | **Test paso a paso** del runtime completo: contrato IPC, registro de handlers, forma del preload, consistencia renderer ⇄ preload, flujos CRUD, stores, utilidades y UI. |
| `src/__tests__/` | `src/__tests__/*.test.ts(x)` | Tests históricos por módulo del renderer y de la arquitectura. |

---

## Ejecutar los tests

```bash
# Todo el proyecto (test/ + src/__tests__/)
npx vitest run

# Una suite concreta
npx vitest run test/04-component-api-consistency

# Modo watch (solo mientras se desarrolla)
npx vitest
```

> En Windows PowerShell, si `npx vitest` falla, usa
> `cmd /c "node_modules\.bin\vitest.cmd run"`.

**Estado actual:** `20 archivos · 502 tests · 0 fallos` (verificado 2026-07-31).

---

## Grupo `test/` — Tests paso a paso (nuevos)

Cada archivo está numerado y documenta su objetivo en el encabezado. Son
**self-contained**: no tocan el main process, la base de datos ni la red.

### `test/helpers/mockApi.ts`
Mock **en memoria** de `window.electronAPI` con la MISMA forma anidada del
preload real (`tasks.*`, `subtasks.*`, `kanban.cards.*`, `flashcards.cards.*`,
`gamification.xp.*`, `streaks.*`, `trash.*`, `export.data()`, `dashboard.get()`,
etc.). `createMockApi()` devuelve un árbol aislado por test, así cada suite
parte de cero sin estado compartido.

### `test/helpers/loadPreload.ts`
Carga el preload real `electron/preload.js` **fuera de Electron** parcheando
temporalmente `Module._load` para interceptar `require('electron')`. Devuelve
`{ api, ipcRenderer, invoked }` con la API expuesta y los canales invocados.

### `test/01-ipc-contract.test.ts` — Contrato de `safe-handle.js`
Carga `electron/core/safe-handle.js` real con un `ipcMain` stub y verifica el
contrato IPC de toda la app:
- El handler devuelve el **valor crudo** (sin wrapper `{ok,value}`).
- **Parse dual**: `args[0]` se valida como `{0: arg0}` (1 argumento) o como
  `{0,1,2,3}` (N argumentos).
- Validación de `zod` por schema tupla; `voidSchema()` para handlers sin args.
- Re-throw de errores: `Error("Validación falló en <canal>: ...")`.
- Registro idempotente (no duplica handlers).

### `test/02-handler-registration.test.ts` — Registro de los 26 módulos
Registra los **26 módulos de `electron/handlers/`** con stubs (misma secuencia
que `main.js`) y comprueba:
- Que **ninguno lanza** al registrarse (era el fallo de bootstrap original).
- Que se registran **≥ 100 canales IPC**.
- Que los **canales críticos** usados a diario por el renderer existen
  (tasks, subtasks, kanban, flashcards, estudio, XP, dashboard, streaks,
  trash, export, backups, courses, templates, exams, ai, notification,
  session, linkEntities…). Los canales registrados directamente en `main.js`
  (p. ej. `notification:show`) se incluyen barriendo su código fuente.

### `test/03-preload-shape.test.ts` — Forma de la API expuesta
Carga el preload real con `loadPreload()` y verifica:
- Todos los **namespaces de primer nivel** existen (`settings`, `tasks`,
  `kanban`, `flashcards`, `study`, `gamification`, `app`, `wifiSync`…).
- Los **métodos anidados clave** son funciones.
- El preload **envuelve argumentos** correctamente cuando el handler espera
  un objeto plano: `notification.show(a,b,c)` → `{title,body,severity}`,
  `templates.instantiate(id, params)` → `{templateId, params}`,
  `flashcards.cards.review(id, ease)` → `{id, ease}`,
  `ai.tutor(...)` → `{topicId, message, history}`,
  `wifiSync.connect(ip)` → `{ip}`, `app.shortcuts.register` → `{accelerator, action}`.
- Y pasa **args separados** para handlers tupla: `settings.get(key)`,
  `settings.set(key, value)`, `search(query)`.

### `test/04-component-api-consistency.test.ts` — Renderer ⇄ preload
**Meta-test**: escanea TODO el código de `src/` extrayendo cada cadena
`window.electronAPI.x.y.z(...)` que el renderer invoca y la compara contra la
API real del preload. Cualquier llamada a un método inexistente rompe el test
indicando archivo y línea. Esta es exactamente la clase de bugs corregidos en
la sesión (FlashcardsPage, SocialPage, TaskList, CloudSync, EnergyPlanning,
SmartReminders…).
Excepciones documentadas (guardadas con `typeof === 'function'` porque aún no
hay handler IPC): ninguna — el código muerto fue eliminado.

### `test/05-crud-workflows.test.ts` — Flujos de usuario paso a paso
Recorridos completos sobre el mock anidado (`createMockApi`), complementando a
`api-comprehensive` con escenarios compuestos:
1. Tarea con subtareas (crear → añadir → tachar → listar).
2. Etiquetas (agregar, filtrar por etiqueta, quitar).
3. Hábitos: toggle diario y conteo de registros; racha inicial.
4. Pomodoros y acumulación de XP.
5. Dashboard refleja tareas pendientes.
6. Kanban: mover tarjetas entre columnas.
7. Ciclo de papelera (soft-delete → restaurar → vaciar).
8. Exportación contiene los datos creados.

### `test/06-stores.test.ts` — Stores de Zustand
- `useAppStore`: navegación, sidebar, tema, racha, focus mode, perfil e
  hidratación con `setInitialSettings` (solo hidrata lo provisto).
- `useThemeStore`: el cambio de tema aplica las variables CSS en `<html>`.
- `useUndoStore`: push/undo/clearExpired de acciones de deshacer.

### `test/11-backup-export.test.ts` — Backup/export con SQLite real
Usa `node:sqlite` (SQLite real, no mock) y registra los handlers reales:
- `export.data()` incluye **todas las tablas de `ALL_TABLES`** (regresión del
  bug donde solo se exportaban 13 y se perdían xp/achievements/retos/etc.).
- Roundtrips `export → importJSON` y `export → import` restauran los datos.
- `doAutoBackup` (core/auto-backup.js): escribe `backup-YYYY-MM-DD.json`,
  **deduplica por día**, `listBackups` lo lista y `restoreBackup` restaura.
- Casos de error (archivo inexistente, JSON inválido).

### `test/09-study-map-courses.test.ts` — Mapa de estudio y cursos

### `test/12-handler-fixes.test.ts` — Fixes de handlers sobre SQLite real
- `entity:link`/`entity:getLinks`/`db:linkEntities`/`db:getEntityLinks`:
  roundtrip sobre la tabla real (con UNIQUE) y resultados enriquecidos.
- `tray:updateMenu` responde `true` y llama a `updateTrayMenu`.
- `snippets:execute` acepta id posicional (regresión del schema `{id}`).
- `projects:openInEditor` espera objeto `{ id, editor }`; rechaza posicional.
- `db:reviewFlashcard` acepta `ease: 5` ("Fácil", antes `max(3)`) y rechaza 6.

---

## Grupo `src/__tests__/` — Tests por módulo (históricos)

| Archivo | Qué cubre |
| ------- | --------- |
| `api-comprehensive.test.ts` | CRUD exhaustivo de TODAS las entidades contra el mock anidado `createMockApi` (47 tests). Es el "paso a paso" de datos completo. |
| `basic.test.tsx` | Smoke de render de componentes. |
| `core-architecture.test.ts` | Arquitectura: capas, imports, convenciones del `src/`. |
| `stores.test.ts` | Stores (incluido `usePomodoroStore`). |
| `ipc.test.ts` | `src/lib/ipc.ts` (`safeIpc`). |
| `services.test.ts` | Servicios del renderer. |
| `workspaces.test.ts` | Workspaces. |
| `task-relationships.test.ts` | Dependencias entre tareas. |
| `kanban-columns.test.ts` | Columnas de kanban. |
| `note-folders.test.ts` | Carpetas de notas. |
| `flashcards-ipc.test.ts` | IPCs de flashcards. |
| `pomodoro-settings.test.ts` | Configuración de pomodoro. |

---

## Notas de mantenimiento

- **Añadir una entidad al preload**: actualiza `createMockApi` en
  `test/helpers/mockApi.ts` y, si la usa el renderer, el test 04 validará la
  cadena automáticamente.
- **Renombrar un canal IPC**: los tests 02/03/04 detectarán la incoherencia
  (registro vs preload vs renderer).
- **Nuevos módulos de handlers**: agrégalos a `HANDLER_MODULES` en
  `test/02-handler-registration.test.ts`.
- Los tests **no requieren** `npm run build` ni el binario de Electron; corren
  solo sobre código fuente y stubs.
