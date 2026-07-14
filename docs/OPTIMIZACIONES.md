# Optimizaciones de Rendimiento

## Resumen

Optimizaciones aplicadas al sistema para mejorar velocidad de carga, capacidad de respuesta y eficiencia general.

---

## 1. Índices de Base de Datos (21 índices agregados)

**Archivo:** `electron/database.js`

Se agregaron 21 índices a las tablas para acelerar joins, filtrados y ordenamientos:

| Tabla | Índices | Beneficio |
|-------|---------|-----------|
| `tasks` | `project_id`, `completed`, `created_at`, `due_date` | Joins con proyectos, filtro completadas/pendientes, orden por fecha |
| `kanban_cards` | `column_type`, `project_id`, `position` | Filtro por columna Kanban, joins, orden por posición |
| `pomodoro_sessions` | `started_at`, `task_id`, `project_id` | Stats por fecha, joins |
| `study_topics` | `parent_id` | Árbol de temas |
| `study_progress` | `topic_id`, `(topic_id, date)` | Toggle progreso por tema/fecha |
| `notes` | `project_id`, `updated_at` | Joins, orden por actualización |
| `goals` | `type` | Filtro diario/semanal |
| `goal_progress` | `goal_id`, `(goal_id, date)` | UPSERT por meta/fecha |
| `snippets` | `project_id` | Joins con proyectos |
| `habit_logs` | `habit_id`, `(habit_id, date)` | Toggle hábito por fecha |

**Antes:** Full table scan en cada consulta.
**Después:** Búsqueda por índice O(log n).

---

## 2. Cache de Prepared Statements

**Archivo:** `electron/main.js`

Se creó un caché de prepared statements para evitar que `better-sqlite3` recompile las consultas SQL en cada llamada IPC:

```js
const stmts = {}
function getStmt(sql) {
  if (!stmts[sql]) stmts[sql] = getDb().prepare(sql)
  return stmts[sql]
}
```

**Antes:** ~41 `db.prepare()` nuevos por cada operación.
**Después:** Cada SQL se compila una sola vez. Las llamadas posteriores reusan el statement cacheado.

**Beneficio:** Elimina la sobrecarga de parseo y compilación SQL en cada operación.

---

## 3. Debounce en saveWindowBounds

**Archivo:** `electron/main.js`

Los eventos `resize` y `move` de la ventana ahora tienen debounce de 500ms antes de escribir a la base de datos:

```js
mainWindow.on('resize', () => {
  clearTimeout(boundsSaveTimeout)
  boundsSaveTimeout = setTimeout(saveWindowBounds, 500)
})
```

**Antes:** Escritura a BD en cada píxel de resize/move (docenas de veces/segundo).
**Después:** Una sola escritura 500ms después de que el usuario termina de mover/redimensionar.

---

## 4. Fix N+1 Query en HabitsPage

**Archivo:** `src/components/Habits/HabitsPage.tsx`

Se reemplazó el loop secuencial de consultas de logs por `Promise.all()`:

```ts
// Antes: 1 consulta + N consultas secuenciales + N re-renders
for (const h of data) {
  const logs = await window.electronAPI.getHabitLogs(h.id)
  setHabitLogs(prev => ({ ...prev, [h.id]: logs }))
}

// Después: 1 consulta + N consultas en paralelo + 1 re-render
const allLogs: Record<number, any[]> = {}
await Promise.all(data.map(async (h) => {
  allLogs[h.id] = await window.electronAPI.getHabitLogs(h.id)
}))
setHabitLogs(allLogs)
```

**Beneficio:** Con 10 hábitos, pasa de 11 consultas secuenciales + 10 re-renders a 1 + 10 consultas en paralelo + 1 re-render.

---

## 5. getStreak Memoizado

**Archivo:** `src/components/Habits/HabitsPage.tsx`

La función `getStreak()` que antes se ejecutaba en cada render para cada hábito (recorriendo hasta 365 días con `new Date()` y `.some()`) ahora se computa una sola vez con `useMemo`:

```ts
const streaks = useMemo(() => {
  // calcula streak para todos los hábitos
  return result  // Record<habitId, streak>
}, [habitLogs])
```

**Antes:** 365 iteraciones × N hábitos × cada render (con creación de objetos Date).
**Después:** Se calcula solo cuando cambian `habitLogs`.

Además se extrajo la fecha actual (`todayStr`) y el cálculo de fechas a constantes fuera del componente para evitar recreación.

---

## 6. Migración Inteligente con PRAGMA table_info

**Archivo:** `electron/database.js`

Las migraciones ahora verifican si cada columna existe antes de ejecutar `ALTER TABLE`:

```ts
function hasColumn(table, column) {
  if (!columnsCache[table]) {
    columnsCache[table] = db.prepare(`PRAGMA table_info('${table}')`).all().map(c => c.name)
  }
  return columnsCache[table].includes(column)
}
```

**Antes:** 24 `ALTER TABLE` intentados siempre, con catch silencioso de errores.
**Después:** Solo se ejecutan los `ALTER TABLE` necesarios. Las columnas existentes se saltan.

---

## 7. getColumnCards con useMemo (KanbanBoard)

**Archivo:** `src/components/Kanban/KanbanBoard.tsx`

Se reemplazó la función `getColumnCards` que filtraba el array 3 veces por render con un mapa precomputado:

```ts
const cardsByColumn = useMemo(() => {
  const map = { pendiente: [], progreso: [], hecho: [] }
  cards.forEach(c => { if (map[c.column_type]) map[c.column_type].push(c) })
  return map
}, [cards])
```

**Antes:** 3 filtros O(n) por render.
**Después:** 1 recorrido O(n) solo cuando cambian las cards.

---

## 8. TaskList: useMemo para Conteos + Cleanup de Timeouts

**Archivo:** `src/components/TaskList/TaskList.tsx`

**Conteos memoizados:**
```ts
const taskCounts = useMemo(() => {
  let pending = 0, done = 0
  for (const t of tasks) { t.completed ? done++ : pending++ }
  return { total: tasks.length, pending, done }
}, [tasks])
```

**Antes:** 2 filtros completos del array por render.
**Después:** 1 recorrido único solo cuando cambian las tareas.

**Cleanup de timeouts:**
```ts
const reminderTimeouts = useRef<ReturnType<typeof setTimeout>[]>([])
useEffect(() => {
  return () => { reminderTimeouts.current.forEach(clearTimeout) }
}, [])
```

**Antes:** Los `setTimeout` de recordatorios no se limpiaban al desmontar, causando fugas de memoria y notificaciones fantasma.
**Después:** Todos los timeouts se limpian al desmontar el componente.

---

## 9. Pomodoro: Stale Closure Fix

**Archivo:** `src/components/Pomodoro/PomodoroTimer.tsx`

Se eliminó el anti-patrón de llamar a `handleComplete()` dentro del updater de `setState`:

```ts
// Antes (anti-patrón):
setTimeLeft(prev => {
  if (prev <= 1) {
    handleComplete()  // efecto secundario en función pura
    return 0
  }
  return prev - 1
})

// Después:
setTimeLeft(prev => {
  if (prev <= 1) {
    intervalRef.current = null
    completedRef.current = true
    return 0
  }
  return prev - 1
})

useEffect(() => {
  if (completedRef.current) {
    completedRef.current = false
    handleComplete()
  }
}, [timeLeft])
```

**Beneficio:** Elimina el anti-patrón React, evita dobles invocaciones en StrictMode, separa la lógica de cuenta regresiva de la lógica de finalización.

---

## 10. backgroundColor en BrowserWindow

**Archivo:** `electron/main.js`

```js
mainWindow = new BrowserWindow({
  ...
  backgroundColor: '#0f172a',  // ← Nuevo
  show: false,
  ...
})
```

**Beneficio:** Elimina el flash de pantalla blanca antes de que React hidrate la UI. El fondo oscuro coincide con el tema de la app.

---

## Resumen de Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `electron/database.js` | +21 índices, migración inteligente con `PRAGMA table_info` |
| `electron/main.js` | Cache prepared statements, debounce saveWindowBounds, backgroundColor |
| `src/components/Habits/HabitsPage.tsx` | Fix N+1, getStreak memoizado, todayStr constante |
| `src/components/Kanban/KanbanBoard.tsx` | getColumnCards → useMemo |
| `src/components/TaskList/TaskList.tsx` | useMemo conteos, cleanup setTimeout |
| `src/components/Pomodoro/PomodoroTimer.tsx` | Fix stale closure con useRef + useEffect |

## Métricas de Mejora Esperadas

| Aspecto | Antes | Después |
|---------|-------|---------|
| Consultas BD | Full table scans | Índices O(log n) |
| Compilación SQL | ~41 compilaciones/operación | 1 compilación por consulta única |
| HabitsPage N+1 | 11 consultas secuenciales | 1 + 10 consultas paralelas |
| HabitsPage re-renders | 10 re-renders (1 por hábito) | 1 re-render |
| getStreak | 3650 iteraciones/render | 0 iteraciones (memoizado) |
| saveWindowBounds | ~60 escrituras/segundo | 1 escritura/500ms |
| Kanban filtros | 3 filtros O(n)/render | 1 recorrido O(n) (memoizado) |
| TaskList conteos | 2 filtros completos/render | 1 recorrido (memoizado) |
| Pomodoro setState | Anti-patrón en updater | useEffect separado |
| Timeouts | Fugas de memoria | Cleanup al desmontar |
