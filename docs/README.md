# EstudioApp — Documentación del Sistema

Sistema de estudio y tareas con **Electron + React 19 + Vite + SQLite**.  
Aplicación de escritorio portable (Windows) con 14 módulos integrados.

## Índice

- [Arquitectura General](architecture.md)
- [Base de Datos](database.md)
- [Electron / IPC / Seguridad](electron.md)
- [Frontend](frontend.md)
- [Características Existentes](features.md)
- [Nuevas Características Propuestas](features-novas.md)

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Electron 42 + Node.js 22 |
| Frontend | React 19 + TypeScript 5.7 (strict) |
| Build | Vite 8 |
| Estilos | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Base de datos | SQLite via better-sqlite3 (WAL mode) |
| Estado | Zustand 5 |
| Animaciones | Framer Motion |
| Gráficos | Recharts |
| Testing | Vitest + jsdom |

## Estructura del Proyecto

```
sistemaestudiotareas/
├── electron/
│   ├── main.js          # Main process ~650 líneas
│   ├── preload.js       # contextBridge ~173 líneas
│   └── database.js      # SQLite init + migraciones ~367 líneas
├── src/
│   ├── components/      # 14 tab pages + 34 UI components
│   ├── stores/          # appStore (zustand) + themeStore
│   ├── lib/             # ipc.ts, constants.ts, utils.ts, useAutoBackup.ts
│   ├── types/           # TypeScript interfaces
│   └── __tests__/       # Vitest tests
├── build/               # Iconos (.svg, .ico)
├── scripts/             # generate-icon.js
├── dist/                # Build output
└── release/             # Electron builder output (.exe)
```

## Cómo empezar

```bash
npm install
npm run rebuild          # Rebuild better-sqlite3 para Electron
npm run dev              # Inicia en modo desarrollo
npm run build            # Build Vite + empaqueta .exe portable
npm run test             # Ejecuta tests
```
