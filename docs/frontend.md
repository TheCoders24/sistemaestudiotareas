# Frontend

## Estructura

```
src/
├── App.tsx                     # Entry point con lazy loading + keyboard shortcuts
├── main.tsx                    # Mount point
├── components/
│   ├── Dashboard/              # Tab: Dashboard
│   ├── Pomodoro/               # Tab: Pomodoro Timer
│   ├── Kanban/                 # Tab: Kanban Board
│   ├── TaskList/               # Tab: Tareas
│   ├── StudyMap/               # Tab: Mapa de Estudio
│   ├── Statistics/             # Tab: Stats
│   ├── QuickNotes/             # Tab: Notas
│   ├── Goals/                  # Tab: Metas
│   ├── Projects/               # Tab: Proyectos
│   ├── DailyLog/               # Tab: Diario
│   ├── Snippets/               # Tab: Snippets
│   ├── Habits/                 # Tab: Hábitos
│   ├── Flashcards/             # Tab: Flashcards
│   ├── ActivityLog/            # Tab: Actividad
│   ├── Sidebar/                # Sidebar (siempre visible)
│   ├── Settings/               # Dialog de configuración (lazy)
│   ├── common/                 # Componentes compartidos
│   └── ui/                     # 34 UI components (shadcn-style)
├── stores/
│   ├── appStore.ts             # Zustand: activeTab, darkMode, sidebar, streak, focus
│   └── themeStore.ts           # 8 temas de color con CSS variables
├── lib/
│   ├── ipc.ts                  # safeIpc() con retry + cache
│   ├── constants.ts            # TABS, shortcut config, prioridades, recurrencia
│   ├── utils.ts                # cn() — clsx + tailwind-merge
│   └── useAutoBackup.ts        # Hook de backup automático
├── types/
│   └── index.ts                # Interfaces + declare global Window.electronAPI
└── __tests__/
    ├── basic.test.tsx
    └── ipc.test.ts
```

## App.tsx

### Lazy Loading
Cada tab page se carga con `React.lazy()` + `Suspense` (fallback: `CardSkeleton`).

### Hooks Personalizados

| Hook | Propósito |
|---|---|
| `useAppInitializer` | Carga tema y racha al inicio |
| `useThemePersistence` | Persiste dark mode en DB + clase `dark` en `<html>` |
| `useKeyboardShortcuts` | Atajos de teclado (Ctrl+N, Ctrl+P, etc.) |

### Atajos de Teclado
Definidos en `constants.ts` como `SHORTCUT_CONFIG`:
```typescript
const SHORTCUT_CONFIG = [
  { id: 'dashboard', key: 'h', shift: true },
  { id: 'pomodoro', key: 'p', shift: false },
  // ...
]
```
Se iteran dinámicamente — añadir un tab nuevo solo requiere agregarlo al array.

### Componentes siempre montados (React.memo)
- `CommandPalette`, `GlobalSearch`, `WelcomeDialog`, `UpdateBanner`
- `QuickCapture`, `Sidebar`, `Toaster`

## IPC Layer: safeIpc

`src/lib/ipc.ts` — wrapper tipado sobre `window.electronAPI`:

```typescript
safeIpc<T>(method, ...args): Promise<T | null>
safeIpcOrThrow<T>(method, ...args): Promise<T>
```

**Características:**
- **Retry**: 3 intentos con delays [500ms, 1500ms, 4000ms]
- **Cache**: en memoria, 5s TTL, solo para métodos GET con 0-1 args string
- **Error toast**: muestra error al usuario si fallan todos los intentos
- **Null safety**: retorna `null` si `window.electronAPI` no existe (SSR/testing)
- **`clearIpcCache()`**: limpiar caché manualmente
- **`setRetryDelays()`**: configurar delays

## Theme System

8 temas de color definidos en `themeStore.ts` como CSS variables HSL:

| Tema | ID | Primary |
|---|---|---|
| Índigo | indigo | #6366f1 |
| Esmeralda | emerald | #10b981 |
| Rosa | rose | #f43f5e |
| Ámbar | amber | #f59e0b |
| Violeta | violet | #8b5cf6 |
| Cielo | sky | #0ea5e9 |
| Naranja | orange | #f97316 |
| Lima | lime | #84cc16 |

## Constants (`src/lib/constants.ts`)
- `TABS` — array con id, label, icon para renderizar navbar y atajos
- `KEYBOARD_SHORTCUTS` — map para mostrar en tooltips
- `SHORTCUT_CONFIG` — array para iterar en el handler de teclado
- `PRIORITY_LABELS` / `PRIORITY_COLORS` — configuración de prioridades
- `RECURRENCE_OPTIONS` — opciones de recurrencia de tareas

## Componentes UI (`src/components/ui/`)

34 componentes basados en Radix primitives + class-variance-authority:
button, card, input, textarea, select, dialog, popover, tooltip, badge, checkbox, switch, slider, tabs, separator, progress, scroll-area, skeleton, toast/toaster, label, dropdown-menu, sheet, confirm-dialog, empty-state, loading-skeleton, command-palette, global-search, welcome-dialog, update-banner, quick-capture, tag-picker, tag-badge, error-boundary, use-toast.

## Settings Dialog
- Lazy-loaded (carga solo cuando se abre)
- Eye-rest timer (regla 20-20-20) con slider
- 8 temas de color
- Auto-backup configurable (hourly/daily/weekly)
- Export/Import manual de datos JSON
