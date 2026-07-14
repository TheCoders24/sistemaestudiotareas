# Reporte del Proyecto: Sistema Estudio y Tareas

> **Versión:** 1.0.0  
> **Plataforma:** Windows (Electron + React + Vite + SQLite)  
> **Build:** Portable `.exe` (sin instalador)  
> **Propósito:** Aplicación de productividad personal con Pomodoro, Kanban, gestión de tareas, hábitos, notas, snippets, mapa de estudio, gamificación y más.

---

## 1. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **UI** | React 19 + TypeScript 6 |
| **Build** | Vite 8 |
| **Desktop** | Electron 42 + electron-builder 26 |
| **Base de datos** | better-sqlite3 (SQLite embebido, WAL mode) |
| **Estilos** | Tailwind CSS 3 + CSS variables HSL (tema oscuro/claro) |
| **Animaciones** | framer-motion 12 |
| **Iconos** | lucide-react |
| **Charts** | recharts (Statistics page) |
| **Drag & Drop** | @dnd-kit/core + @dnd-kit/sortable |
| **Componentes UI** | Radix UI primitives (Dialog, Tabs, Select, Switch, Toast, Tooltip, etc.) |
| **Sonidos** | Web Audio API (oscillator beeps, sin archivos de audio) |

---

## 2. Estructura del Proyecto

```
sistemaestudiotareas/
├── electron/
│   ├── main.js          # Proceso principal de Electron (IPC handlers, ventana)
│   ├── preload.js        # contextBridge API (expone electronAPI al renderer)
│   └── database.js       # Inicialización SQLite, schema, migraciones, índices
├── src/
│   ├── App.tsx           # Componente principal (navbar, tabs, atajos, gamificación)
│   ├── main.tsx          # Entry point React
│   ├── index.css         # Estilos globales + variables CSS HSL
│   ├── types/index.ts    # Tipos TypeScript + declaración de window.electronAPI
│   ├── lib/utils.ts      # Utilidad clsx + tailwind-merge
│   └── components/
│       ├── ui/           # 23 componentes UI (badge, button, card, dialog, etc.)
│       ├── Dashboard/    # Página de inicio con stats, XP, racha, tareas próximas
│       ├── Pomodoro/     # Temporizador Pomodoro (focus/break)
│       ├── Kanban/       # Tablero Kanban con drag & drop (Board, Column, Card)
│       ├── TaskList/     # Lista de tareas con CRUD, filtros, prioridades
│       ├── StudyMap/     # Mapa de estudio jerárquico con progreso
│       ├── Statistics/   # Estadísticas con gráficos (Recharts)
│       ├── QuickNotes/   # Notas rápidas con Markdown
│       ├── Goals/        # Metas diarias/semanales con progreso
│       ├── Projects/     # Gestión de proyectos
│       ├── DailyLog/     # Diario personal
│       ├── Snippets/     # Fragmentos de código con resaltado de sintaxis
│       ├── Habits/       # Seguimiento de hábitos con calendario
│       ├── Search/       # Búsqueda global
│       ├── Achievements/ # Galería de logros
│       ├── Sidebar/      # Barra lateral (XP, racha, notas, metas)
│       └── Settings/     # Configuración (sonido, descanso visual, export/import)
├── dist/                 # Build de Vite (generado)
├── release/              # Build de electron-builder (generado)
├── docs/
│   └── OPTIMIZACIONES.md # Documentación de optimizaciones de rendimiento
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.mjs
├── electron-builder.yml
└── dev.bat              # Script para desarrollo
```

---

## 3. Arquitectura

### 3.1 Comunicación Renderer ↔ Main

```
[React UI] --ipcRenderer.invoke--> [preload.js (contextBridge)] --ipcMain.handle--> [main.js (SQLite)]
     ^                                                                                  |
     |<---- Promise return -------------------------------------------------------------|
```

- `window.electronAPI` expuesto via `contextBridge.exposeInMainWorld`
- Todos los handlers IPC están en `main.js` → `registerIpcHandlers()`
- Las consultas SQL se ejecutan mediante `getStmt(sql)` que cachea prepared statements en `stmts = {}`
- Base de datos en `app.getPath('userData')/sistema.db`

### 3.2 Persistencia

- **SQLite** única con WAL mode, synchronous=NORMAL, cache_size=-8000, temp_store=MEMORY
- **Schema versioning** via settings key `db_schema_version` (actual: v3)
- **Migraciones inteligentes**: verifica columnas existentes con `PRAGMA table_info()` antes de `ALTER TABLE`
- **Export/Import**: JSON de todas las tablas mediante handlers IPC

### 3.3 Temas

- Dark mode por defecto (`#0f172a` background en BrowserWindow + `class="dark"`)
- Persistencia via setting `theme` en DB
- Variables CSS HSL para colores del tema

---

## 4. Funcionalidades por Módulo

### 4.1 Dashboard (`Ctrl+1` / "Inicio")
- Saludo dinámico (Buenos días/tardes/noches) con frase motivacional aleatoria
- 4 tarjetas de stats: Pomodoros hoy, Tareas hoy, Racha (días), Nivel
- Barra de progreso XP (nivel actual / XP para siguiente nivel)
- Mini gráfico de barras XP últimos 7 días
- Lista de próximas tareas con fecha límite (top 5)
- Progreso total: pomodoros totales, tareas completadas, tareas pendientes

### 4.2 Pomodoro Timer (`Ctrl+P`)
- Temporizador con modos Focus (25min) / Break (5min)
- Start/Pause/Reset
- Al completar: registra sesión en DB, otorga +10 XP, ejecuta `onComplete` (updateStreak + checkAchievements)
- Selector de tarea asociada y proyecto
- Muestra historial de sesiones del día

### 4.3 Kanban Board (`Ctrl+K`)
- 4 columnas: Pendiente → En Progreso → En Revisión → Completado
- Drag & Drop entre columnas y reordenamiento interno
- CRUD de tarjetas (título, descripción, prioridad, tags, fecha, proyecto)
- Animaciones con framer-motion
- Persistencia de posición por columna

### 4.4 Task List (`Ctrl+T`)
- CRUD completo de tareas
- Campos: título, descripción, prioridad (baja/media/alta), fecha límite, recordatorio, proyecto
- Checkbox de completado → otorga +5 XP
- Filtros por prioridad, estado (todas/pendientes/completadas)
- Animaciones de entrada/salida

### 4.5 Proyectos (`Ctrl+Shift+P`)
- CRUD de proyectos
- Campos: nombre, descripción, estado, tech stack, repo URL, color
- Vista de lista con colores distintivos

### 4.6 Diario (`Ctrl+D`)
- Entradas de diario por fecha (UNIQUE)
- Campos: contenido, foco del día, blockers, plan para mañana
- Upsert (INSERT OR REPLACE)

### 4.7 Snippets (`Ctrl+Shift+S`)
- Fragmentos de código con resaltado de sintaxis (react-syntax-highlighter)
- Campos: título, código, lenguaje, descripción, tags, proyecto
- Crear snippet → +3 XP

### 4.8 Hábitos (`Ctrl+H`)
- CRUD de hábitos (nombre, icono, color, frecuencia)
- Grid calendario mensual con checkboxes
- Toggle diario por hábito

### 4.9 Logros / Achievements (`Ctrl+L`)
- Galería visual con todos los logros (desbloqueados/bloqueados)
- 9 logros totales:
  - Primer Pomodoro (+50 XP), En Racha - 10 pomodoros (+100 XP), Máquina - 50 pomodoros (+250 XP)
  - Primer Paso - 1 tarea (+50 XP), Productivo - 10 tareas (+100 XP)
  - Apuntes - 1 nota (+30 XP)
  - Constancia - 3 días racha (+100 XP), Semana Completa - 7 días (+250 XP), Imparable - 30 días (+500 XP)
- Logros bloqueados muestran "???" con candado
- Contador de progreso: "X / 9 desbloqueados"

### 4.10 Mapa de Estudio (`Ctrl+M`)
- Árbol jerárquico de temas de estudio
- Navegación breadcrumb por nivel
- Checkbox de progreso diario por tema
- Temas padre pueden expandirse/colapsarse

### 4.11 Estadísticas (`Ctrl+E`)
- Gráficos con Recharts
- Pomodoros por día (gráfico de barras)
- Progreso semanal/mensual
- Totales acumulados

### 4.12 Notas Rápidas (`Ctrl+N`)
- CRUD de notas con Markdown (react-markdown)
- Título + contenido
- Editor de texto completo

### 4.13 Metas (`Ctrl+G`)
- Metas diarias o semanales
- Target numérico + métrica
- Progreso por fecha
- Sidebar muestra progreso real (consulta goal_progress)

### 4.14 Sidebar
- Barra lateral derecha (toggle con botón menú)
- **Tarjeta XP**: nivel, barra de progreso, XP total, XP actual/siguiente nivel
- **Tarjeta Racha**: días consecutivos, máximo histórico
- **Notas rápidas**: últimas 5 notas con click para navegar
- **Metas**: lista con progreso real (antes hardcodeado a 0%)

### 4.15 Settings (engranaje en navbar)
- **Sound toggle**: activa/desactiva sonidos (persistido en DB)
- **Descanso Visual**: notificación 20-20-20 cada N minutos (slider 10-60)
- **Export**: descarga JSON backup de todas las tablas
- **Import**: restaura datos desde JSON backup

### 4.16 Búsqueda Global (`Ctrl+B`)
- Busca en tareas, notas, snippets y proyectos
- Navegación por teclado (flechas + Enter)
- Resultados agrupados por tipo

### 4.17 Atajos de Teclado (`Ctrl+/`)
- Panel modal con todos los atajos disponibles

---

## 5. Gamificación (Sistema de XP y Niveles)

### 5.1 Acciones que otorgan XP

| Acción | XP | Handler |
|--------|----|---------|
| Completar pomodoro | +10 | `createPomodoroSession` |
| Completar tarea | +5 | `toggleTask` (cuando pasa de 0→1) |
| Crear nota | +3 | `createNote` |
| Crear snippet | +3 | `createSnippet` |
| Crear proyecto | +15 | `createProject` |
| Actualizar racha | +20 | `updateStreak` |
| Desbloquear logro | +50~500 | `checkAchievements` (según logro) |

### 5.2 Niveles

- Fórmula: `nivel = floor(XP_total / 100) + 1`
- Cada nivel requiere `nivel * 100` XP acumulado
- Ejemplo: 0 XP → nivel 1, 100 XP → nivel 2, 250 XP → nivel 3

### 5.3 Rachas

- Nombre: `daily_study`
- Lógica: si ayer → incrementa; si hoy → no cambia; si antes → resetea a 1
- Se actualiza al completar un pomodoro (vía `onComplete`)
- Máximo histórico tracking

### 5.4 Feedback Visual/Sonoro

- **Logro desbloqueado**: confetti (canvas particles), sonido achievement/levelup, toast "🏆 Logro: ... +XP"
- **Subida de nivel**: modal "🎉 ¡Subiste de Nivel!", confetti, sonido levelup
- **Sonidos**: Web Audio API oscillator (beep doble para complete, escala ascendente para levelup)
- **Confeti**: 80 partículas de colores que caen durante 2 segundos

---

## 6. Base de Datos

### 6.1 Schema (v3)

**Tablas de datos:**
- `settings` (key TEXT PK, value TEXT)
- `projects` (id, name, description, status, tech_stack, repo_url, color, created_at, updated_at)
- `tasks` (id, title, description, completed, priority, due_date, reminder, project_id FK, created_at, updated_at)
- `kanban_cards` (id, title, description, column_type, position, priority, tags, due_date, project_id FK, created_at, updated_at)
- `pomodoro_sessions` (id, task_id FK, project_id FK, duration, started_at, ended_at)
- `study_topics` (id, parent_id FK self, name, description, order_position)
- `study_progress` (id, topic_id FK, completed, date)
- `notes` (id, title, content, project_id FK, created_at, updated_at)
- `goals` (id, title, type CHECK daily/weekly, target, metric, created_at)
- `goal_progress` (id, goal_id FK, date, value)
- `daily_logs` (id, date UNIQUE, content, focus, blockers, tomorrow_plan, created_at)
- `snippets` (id, title, code, language, description, tags, project_id FK, created_at)
- `habits` (id, name, icon, color, frequency, created_at)
- `habit_logs` (id, habit_id FK, date, completed)
- `tags` (id, name UNIQUE, color)
- `streaks` (id, name UNIQUE, current, max, updated_at)

**Tablas de gamificación:**
- `achievements` (id, key UNIQUE, name, description, icon, xp_reward)
- `user_achievements` (id, achievement_id FK UNIQUE, unlocked_at)
- `xp_log` (id, amount, reason, created_at)

### 6.2 Índices (21 total)

- tasks: project_id, completed, created_at, due_date
- kanban_cards: column_type, project_id, position
- pomodoro_sessions: started_at, task_id, project_id
- study_topics: parent_id
- study_progress: topic_id, (topic_id, date)
- notes: project_id, updated_at
- goals: type
- goal_progress: goal_id, (goal_id, date)
- snippets: project_id
- habit_logs: habit_id, (habit_id, date)

### 6.3 Optimizaciones de Rendimiento

- Prepared statements cacheados (getStmt con cache object)
- WAL mode + synchronous NORMAL + cache_size -8000 + temp_store MEMORY
- Debounce 500ms en saveWindowBounds
- N+1 fix en HabitsPage (LEFT JOIN en lugar de queries por separado)
- getStreak memoizado
- Migraciones solo cuando schema cambia (PRAGMA user_version)

---

## 7. Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| Ctrl+1 | Inicio |
| Ctrl+P | Pomodoro |
| Ctrl+K | Kanban |
| Ctrl+T | Tareas |
| Ctrl+Shift+P | Proyectos |
| Ctrl+D | Diario |
| Ctrl+Shift+S | Snippets |
| Ctrl+H | Hábitos |
| Ctrl+L | Logros |
| Ctrl+M | Mapa de Estudio |
| Ctrl+E | Estadísticas |
| Ctrl+N | Notas |
| Ctrl+G | Metas |
| Ctrl+B | Búsqueda global |
| Ctrl+/ | Atajos de teclado |
| Ctrl+Shift+L | Modo oscuro |
| Ctrl+Shift+A | Tarea rápida |

---

## 8. Build & Deploy

```bash
# Desarrollo
npm run dev          # Lanza Vite + Electron en paralelo

# Build producción
npm run build        # Vite build + electron-builder (portable .exe)

# Build portable solo
npx electron-builder --win portable

# Output: release/Sistema Estudio y Tareas-1.0.0-portable.exe
```

### electron-builder.yml

```yaml
appId: com.sistema.estudio-tareas
productName: Sistema Estudio y Tareas
output: release
target: portable (win)
signExecutable: false
```

---

## 9. Estado Actual y Bugs Conocidos

### Bugs resueltos recientemente:
- ~~`getStmt` recursión infinita → ahora usa `getDb().prepare(sql)`~~
- ~~Streak achievements (3, 7, 30 días) no se verificaban → agregados a `checkAchievements`~~
- ~~Goal progress en Sidebar hardcodeado a 0% → ahora consulta `goal_progress`~~

### Potenciales mejoras:
- No hay spinner/feedback visual durante operaciones pesadas (export/import)
- Las configuraciones de sonido en App.tsx y Settings.tsx están duplicadas
- El efecto de confeti usa canvas directo en lugar de una librería
- No hay notificaciones nativas de escritorio para tareas con recordatorio
- El slider de descanso visual no reinicia el timer al cambiar el intervalo
- La búsqueda global no incluye hábitos ni daily logs

---

## 10. Dependencias Clave

**Runtime:**
- `better-sqlite3` ^12.11.1 (SQLite síncrono para Electron)
- `framer-motion` ^12.40.0 (animaciones)
- `lucide-react` ^1.18.0 (iconos)
- `recharts` ^3.8.1 (gráficos Statistics)
- `react-markdown` ^10.1.0 (renderizado Markdown)
- `react-syntax-highlighter` ^16.1.1 (resaltado código)
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` ^10.0.0 (drag & drop)
- `node-notifier` ^10.0.1 (notificaciones fallback)

**Dev:**
- `electron` ^42.4.0 + `electron-builder` ^26.15.3
- `vite` ^8.0.16 + `@vitejs/plugin-react` ^6.0.2
- `typescript` ^6.0.3
- `tailwindcss` ^3.4.19 + `postcss` ^8.5.15
- `concurrently` ^10.0.3 (dev script)
- `wait-on` ^9.0.10 (esperar puerto dev)

---

*Reporte generado automáticamente para análisis de mejoras. Última actualización: Julio 2026.*
