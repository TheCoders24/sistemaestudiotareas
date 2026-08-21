# Frontend

## Estructura

```
src/
├── App.tsx                     # Entry point con lazy loading + keyboard shortcuts
├── main.tsx                    # Mount point
├── components/                 # +40 módulos (tabs y features)
│   ├── Dashboard/              # Tab: Dashboard
│   ├── Pomodoro/               # Tab: Pomodoro Timer
│   ├── Kanban/                 # Tab: Kanban Board
│   ├── TaskList/               # Tab: Tareas
│   ├── TaskViews/              # Vistas alternas de tareas
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
│   ├── Achievements/           # Logros y gamificación
│   ├── Challenges/             # Retos
│   ├── Courses/                # Cursos
│   ├── Exams/                  # Exámenes
│   ├── Reports/                # Reportes
│   ├── WeeklyReview/           # Revisión semanal
│   ├── SpacedRepetition/       # Repetición espaciada
│   ├── Tutor/                  # Tutor AI
│   ├── Automation/             # Reglas de automatización
│   ├── EnergyPlanning/         # Planificación de energía
│   ├── SmartReminders/         # Recordatorios inteligentes
│   ├── FocusMode/              # Modo foco
│   ├── Calendar/               # Calendario
│   ├── CalendarImport/         # Importación de calendario
│   ├── Trash/                  # Papelera
│   ├── Search/                 # Búsqueda global
│   ├── CommandPalette/         # Paleta de comandos
│   ├── QuickCapture/           # Captura rápida
│   ├── Security/               # PIN lock
│   ├── Sync/                   # Sincronización (wifi)
│   ├── Social/                 # Social
│   ├── Templates/              # Plantillas
│   ├── WorkspaceSwitcher/      # Cambio de workspace
│   ├── WelcomeWizard/          # Onboarding
│   ├── Gamification/           # XP y niveles
│   ├── HeaderPomodoro/         # Temporizador en header
│   ├── Sidebar/                # Sidebar (siempre visible)
│   ├── Settings/               # Dialog de configuración (lazy)
│   ├── common/                 # Componentes compartidos
│   └── ui/                     # 34+ UI components (shadcn-style)
├── stores/
│   ├── appStore.ts             # Zustand: activeTab, darkMode, sidebar, streak, focus, perfil
│   ├── themeStore.ts           # 8 temas de color con CSS variables
│   └── undoStore.ts            # Acciones de deshacer
├── lib/
│   ├── ipc.ts                  # Wrapper tipado (safeIpc)
│   ├── constants.ts            # TABS, shortcut config, prioridades, recurrencia
│   ├── utils.ts                # cn() — clsx + tailwind-merge + i18n t()
│   └── translate.ts            # i18n t()
├── types/
│   └── index.ts                # Interfaces + declare global Window.electronAPI
└── __tests__/                  # Tests históricos por módulo
```

## App.tsx

### Lazy Loading
Cada tab page se carga con `React.lazy()` + `Suspense` (fallback: `CardSkeleton`).

### Hooks Personalizados

| Hook | Propósito |
|---|---|
| `useAppInitializer` | Carga tema y racha al inicio |
| `useThemePersistence` | Persiste dark mode en DB + clase `dark` en `<html>` |
| `useKeyboardShortcuts` | Atajos de teclado |

### Atajos de Teclado
Definidos en `constants.ts` como `SHORTCUT_CONFIG`; se iteran dinámicamente.

### Componentes siempre montados (React.memo)
`CommandPalette`, `GlobalSearch`, `WelcomeDialog`, `UpdateBanner`, `QuickCapture`,
`Sidebar`, `Toaster`.

## IPC Layer

Los componentes llaman directamente a `window.electronAPI.<dominio>.<metodo>()`
(tipado en `src/types/index.ts`). El API expuesta por el preload está documentada
en `docs/electron.md`.

Existe `src/lib/ipc.ts` (`safeIpc`) con retry + cache, pero el código actual
invoca `electronAPI` directamente.

## Theme System

8 temas de color definidos en `themeStore.ts` como variables CSS HSL:
Índigo, Esmeralda, Rosa, Ámbar, Violeta, Cielo, Naranja y Lima.

## Componentes UI (`src/components/ui/`)
Componentes Radix + class-variance-authority: button, card, input, textarea,
select, dialog, popover, tooltip, badge, checkbox, switch, slider, tabs,
separator, progress, scroll-area, skeleton, toast/toaster, label, dropdown-menu,
sheet, confirm-dialog, empty-state, loading-skeleton, command-palette,
global-search, welcome-dialog, update-banner, quick-capture, tag-picker,
tag-badge, error-boundary, use-toast.

## Settings Dialog
- Lazy-loaded (carga solo cuando se abre).
- Eye-rest timer (regla 20-20-20) con slider.
- 8 temas de color.
- **Gestión de backups**: listar y restaurar respaldos automáticos.
- Export/Import manual de datos JSON.
