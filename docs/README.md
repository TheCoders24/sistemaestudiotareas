# EstudioApp — Documentación del Sistema

Sistema de estudio y tareas con **Electron + React 19 + Vite + SQLite**.
Aplicación de escritorio portable (Windows) con más de 40 módulos integrados.

## Índice

- [Arquitectura General](architecture.md)
- [Base de Datos](database.md)
- [Electron / IPC / Seguridad](electron.md)
- [Frontend](frontend.md)
- [Sistema de Backup](backup.md)
- [Testing](TESTING.md)
- [Características](features.md)
- [Materias en el Mapa de Estudio](materias-en-studymap.md)

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Electron 42 + Node.js 22 |
| Frontend | React 19 + TypeScript 6 (strict) |
| Build | Vite 8 |
| Estilos | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Base de datos | SQLite via better-sqlite3 (WAL mode) |
| Estado | Zustand 5 |
| Validación IPC | Zod 4 (schemas por canal) |
| Animaciones | Framer Motion |
| Gráficos | Recharts |
| Testing | Vitest 4 + jsdom + Testing Library |

## Estructura del Proyecto

```
sistemaestudiotareas/
├── electron/
│   ├── main.js              # Main process (bootstrap, ventana, registros)
│   ├── preload.js           # contextBridge — API anidada expuesta al renderer
│   ├── database.js          # SQLite init + 34 tablas + migraciones
│   ├── core/                # Infraestructura (safe-handle, schemas, logger, etc.)
│   │   ├── safe-handle.js   # Wrapper IPC con validación Zod dual
│   │   └── schemas/         # Definición de todos los canales IPC (Zod)
│   ├── handlers/            # 27 módulos de handlers IPC por dominio
│   └── services/            # Servicios de respaldo
├── src/
│   ├── components/          # +40 tab pages/módulos + UI components
│   ├── stores/              # appStore, themeStore, undoStore (zustand)
│   ├── lib/                 # ipc.ts, constants.ts, utils.ts
│   ├── types/               # TypeScript interfaces
│   └── __tests__/           # Tests históricos por módulo
├── test/                    # Suite "paso a paso" completa (20 archivos)
├── docs/                    # Esta documentación
├── build/                   # Iconos (.svg, .ico)
├── scripts/                 # Utilidades
└── release/                 # Electron builder output (.exe)
```

## Cómo empezar

```bash
npm install
npm run rebuild          # Rebuild better-sqlite3 para Electron
npm run dev              # Inicia en modo desarrollo (dev.bat: Vite + Electron)
npm run build            # Build Vite + empaqueta .exe portable
npm run test             # Ejecuta tests (Vitest)
```

## Estado actual verificado

- Arranque limpio (Vite → handlers IPC → render React) sin errores.
- Suite de tests: **21 archivos · 513 tests · 0 fallos** (ver `docs/TESTING.md`).
