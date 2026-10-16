# Informe de cambios — Release v1.6.0

- **Proyecto:** Sistema Estudio y Tareas
- **Repositorio:** https://github.com/TheCoders24/sistemaestudiotareas
- **Rama:** `main`
- **Versión publicada:** `1.6.0`
- **Tag final:** `af4942f` (fuerza-actualizada durante el proceso)
- **Fecha:** 2026-10-16
- **Autor de los cambios:** sesión de asistencia técnica

---

## 1. Resumen ejecutivo

En esta sesión se trabajó sobre cuatro frentes:

1. **Build / Release (P0):** se corrigió el nombre de los artefactos para que el auto-actualizador funcione (antes daba 404) y se eliminó un bloque de auto-actualización duplicado.
2. **UI — Modo desarrollador y menú lateral:** las herramientas de diagnóstico no aparecían y el menú no se expandía/plegaba correctamente.
3. **Sincronización WiFi local:** la función no funcionaba entre dispositivos de la misma red (bind en loopback, doble `bind` de UDP y autenticación por token rota).
4. **Botón de actualizaciones en Configuración:** no existía forma de buscar/instalar actualizaciones desde la interfaz.

Además se e**liminó código muerto** (`SyncService`) y se realizó una **auditoría de seguridad** del repositorio, cuyos resultados se documentan en la sección 8.

**Resultado:** release `v1.6.0` republicado con instaladores corregidos; verificación con `tsc` limpio, **616 tests / 34 archivos** y `vite build` OK.

---

## 2. Entorno y stack

- **Electron** 42.4.0 + **React** 19 + **Vite** 8 (rolldown).
- **SQLite:** `better-sqlite3` en producción; `node:sqlite` (`DatabaseSync`) en tests.
- **Estado global:** Zustand. **UI:** shadcn/ui (new-york) + Radix + Tailwind CSS 3.4.
- **Empaquetado:** electron-builder 26.15.3 (NSIS + portable).
- **Sistema operativo de desarrollo:** Windows (PowerShell 5.1).

Flujo de verificación por cambio:

```
npm run typecheck   ->  npx vitest run   ->  npm run build:vite
```

---

## 3. Cambios por bloque

### 3.1. Build / Release (P0) — commit `79d7012`

**Problemas detectados**

- El auto-actualizador apuntaba a un archivo que no existía: `latest.yml` referenciaba un `path` con espacios, pero el asset subido tenía otro nombre → la URL de descarga devolvía **404**.
- `electron/main.js` inicializaba el auto-updater **dos veces**: un bloque a nivel de módulo (al importar) y otro dentro de `whenReady`, con listeners duplicados.

**Cambios**

| Archivo | Cambio |
|---|---|
| `electron-builder.yml` | `artifactName` sin espacios (`Sistema-Estudio-y-Tareas-${version}-{setup,portable,mac,linux}.${ext}`) para que el `path` de `latest.yml` coincida con el asset. |
| `electron/main.js` | Eliminado el bloque de auto-actualización a nivel de módulo y los listeners muertos (`update:available` / `update:downloaded`). El updater se inicializa una sola vez dentro de `whenReady`, condicionado a `app-update.yml`, con `autoUpdater.logger = logger`. Se conservan los handlers `update:check/download/install`. |
| `package.json` | Agregado `"author": "TheCoders24 <support@sistemaestudioytareas.com>"` (quita warning de electron-builder y el publisher vacío en NSIS). |

**Verificación:** URL del instalador pasó de **404** a **200** tras renombrar los assets.

---

### 3.2. Modo desarrollador + menú lateral — commit `e504496`

**Problemas detectados**

- Activar "Modo desarrollador" en Configuración no hacía visible la herramienta `devtools` en el menú Sistema.
- El acordeón de secciones (hubs) no se plegaba/expandía correctamente y el estado no se conservaba.
- `App.tsx` tenía un doble gate para la ruta `devtools` que impedía el acceso.

**Cambios**

| Archivo | Cambio |
|---|---|
| `src/components/Sidebar/Sidebar.tsx` | Detección interna de dev mode (prop + `settings.get('developerMode')` + evento `developerModeChanged` → `effDevMode`). Nuevo `openHubForTab(tabId)` que auto-expande el hub de la pestaña activa (abre `devtools` al activar el modo). Persistencia del estado de los hubs en `localStorage` (`sidebar-hubs-open`). `aria-expanded` en el botón de hub, animación `animate-fade-slide-in` y render condicional del contenido colapsado. |
| `src/App.tsx` | Quitado el doble gate (`activeTab === 'devtools' && developerMode` → solo `activeTab === 'devtools'`). Agregado efecto que redirige a `inicio` si se desactiva el modo desarrollador estando en `devtools`. |
| `test/21-sidebar-devtools.test.tsx` | **Nuevo.** 5 tests: devtools visible por prop y por evento, oculto al desactivar, auto-expansión de “Sistema” al activar y plegado/desplegado de hubs. |

---

### 3.3. Sincronización WiFi local — commit `aa0508c`

**Problemas detectados en `electron/handlers/sync.js`**

1. **HTTP en loopback:** el servidor escuchaba en `127.0.0.1`, por lo que ningún equipo de la LAN podía alcanzarlo.
2. **Doble `bind` de UDP:** se llamaba `bind(callback)` y luego `bind(SYNC_PORT)` sobre el mismo socket → `ERR_SOCKET_ALREADY_BOUND`; `wifi-sync:start` fallaba.
3. **Token roto por diseño:** cada dispositivo generaba su propio token aleatorio y lo enviaba como `X-Sync-Token`; el servidor lo comparaba con el suyo → siempre **401**. Además `/info` informaba `requiresAuth: true` pero **no** devolvía el token, por lo que el cliente nunca podía autenticarse.
4. **`mergeSyncData` frágil:** no validaba contra `ALL_TABLES` (riesgo de inyección por nombre de tabla), fallaba en tablas sin columna `id` (p. ej. `settings`, cuya PK es `key`) y el `catch` por tabla abortaba el resto de las filas.
5. **`INSERT OR REPLACE`** con `foreign_keys = ON` podía borrar en cascada filas hijas.

**Cambios** (reescritura de `electron/handlers/sync.js`)

- El servidor HTTP escucha en `0.0.0.0:27346` (alcanzable en LAN).
- UDP con **un solo `bind`** a `SYNC_PORT` (`27345`) dentro del callback, `reuseAddr: true`, `setBroadcast(true)`, manejo de `error`, y envío a **direcciones de broadcast por subred** (calculadas desde `os.networkInterfaces()` + máscara). El intervalo de anuncio se limpia al detener.
- **Token compartido:** `/info` ahora devuelve el `token`; `pull`/`push` obtienen el token del par consultando `/info` antes de operar (`resolvePeerToken`). Se eliminó la generación de token divergente entre cliente y servidor.
- **`mergeSyncData` genérico y seguro:**
  - Whitelist contra `ALL_TABLES` (ignora tablas desconocidas).
  - Detección de la PK real vía `PRAGMA table_info` (soporta `key`, PKs compuestas, etc.).
  - Filtra columnas inexistentes en la tabla destino.
  - `catch` **por fila** (no aborta el resto).
  - `UPDATE` de filas existentes e `INSERT OR IGNORE` de nuevas (sin borrados por `REPLACE`).
  - `PRAGMA foreign_keys` se alterna con `db.exec` **fuera** de la transacción (compatible con `better-sqlite3` y `node:sqlite`).
- Bound de parámetros con placeholders **posicionales** (`?`) por compatibilidad con ambas librerías SQLite.

| Archivo | Cambio |
|---|---|
| `electron/handlers/sync.js` | Reescritura con todos los arreglos anteriores. |
| `test/22-wifi-sync.test.ts` | **Nuevo.** 5 tests: insert/update por `id`, PK no-`id` (`settings.key`), whitelist (`ALL_TABLES`), filtrado de columnas inexistentes y `exportAllData`. |

---

### 3.4. Botón de actualizaciones en Configuración — commit `3ed1184`

**Problema:** no había ninguna acción en la UI para buscar/instalar actualizaciones; los handlers existían pero `updater:check` no devolvía estado y solo se registraban si existía `app-update.yml` (en desarrollo no quedaban disponibles).

**Cambios**

| Archivo | Cambio |
|---|---|
| `electron/main.js` | Handlers `updater:check`, `updater:install` y `app:getVersion` registrados **siempre** (en dev devuelven `supported: false`). Eventos `updater:status` ampliados: `checking`, `available`, `not-available`, `downloading` (con `percent`), `downloaded`, `error`. `app-update.yml` se verifica antes de inicializar el updater. |
| `electron/preload.js` | Nuevo `app.getVersion()`; `updater.check/install` ya expuestos. |
| `src/types/index.ts` | Tipos actualizados: `app.getVersion`, retorno de `updater.check/install` y `onUpdateStatus` (con `version`/`message`). |
| `src/components/Settings/Settings.tsx` | Nueva tarjeta **“Actualizaciones”**: muestra la versión instalada, botón **“Buscar actualizaciones”**, estado (buscando / nueva versión / descargando % / al día / error / no disponible) y botón **“Reiniciar e instalar”** cuando la descarga termina. Se suscribe a `events.onUpdateStatus`. |

---

### 3.5. Eliminación de código muerto (`SyncService`) — commit `af4942f`

`electron/services/SyncService.js` era una implementación de sincronización **sin llamadores** (la real vive en `electron/handlers/sync.js`) que además conservaba el doble `bind` de UDP.

| Archivo | Cambio |
|---|---|
| `electron/services/SyncService.js` | **Eliminado.** |
| `electron/services/index.js` | Quitado del barrel de exportaciones. |
| `test/15-backup-tables.test.ts` | La sección C ahora prueba `exportAllData` de `handlers/sync.js`. |
| `docs/backup.md` | Actualizada la recomendación (SyncService ya no existe). |

---

### 3.6. Limpieza de cachés locales y `.gitignore` — commits `8be2268` y `6beb6ed`

- Destrackeados del repositorio: `.vitest-cache/vitest/.../results.json` y `.tscache/build-info`.
- `.gitignore` ampliado con `.vitest-cache/`, `.tscache/` y `*.tsbuildinfo`.

---

## 4. Verificación

| Comando | Resultado |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | Limpio, sin errores. |
| `npx vitest run` | **616 tests / 34 archivos**, todos pasan. |
| `npm run build:vite` | Build correcto (se mantiene el warning de chunks > 500 kB: `syntax-highlight` 620 kB, `QuickNotes` 404 kB, `jspdf` 400 kB, `charts` 392 kB). |
| `npm run build` | Instaladores NSIS + portable generados en `release/`. |

---

## 5. Publicación del release `v1.6.0`

- Tag `v1.6.0` movido al commit final del bloque (`af4942f`) y `force-push` al remoto.
- Assets reemplazados (marcados como *latest*, sin draft/prerelease):

| Asset | Tamaño (bytes) |
|---|---|
| `Sistema-Estudio-y-Tareas-1.6.0-setup.exe` | 122 938 471 |
| `Sistema-Estudio-y-Tareas-1.6.0-portable.exe` | 122 712 353 |
| `Sistema-Estudio-y-Tareas-1.6.0-setup.exe.blockmap` | 129 784 |
| `latest.yml` | 377 |

- `latest.yml` público verificado: `sha512` = `OMUEy8xCT3te1xS5MPar+hjLVJAMcVlvOzHjGamyiu7nStoaCvdhoigftxdyTQAskIQeDvI0ZRezsyBZJq14qQ==`, `size` = `122938471`.
- Verificación en vivo: `setup.exe` → **HTTP 200** (122938471 bytes).
- URL: https://github.com/TheCoders24/sistemaestudiotareas/releases/tag/v1.6.0

---

## 6. Resumen de commits

| Hash | Mensaje |
|---|---|
| `79d7012` | `fix(release): nombre de artefactos sin espacios y auto-updater unico` |
| `e504496` | `fix(ui): modo desarrollador y menu lateral (devtools visible + acordeon persistente)` |
| `aa0508c` | `fix(sync): sincronizacion WiFi local funcional (bind LAN, UDP, token y merge generico)` |
| `3ed1184` | `feat(settings): boton para buscar e instalar actualizaciones` |
| `af4942f` | `chore(sync): elimina SyncService sin uso (la sync vive en handlers/sync.js)` |
| `8be2268` | `chore: ignora y destrackea caches locales (.vitest-cache, .tscache)` |
| `6beb6ed` | `chore: agrega reglas de ignore para caches locales` |

---

## 7. Archivos nuevos

- `test/21-sidebar-devtools.test.tsx` — devtools y acordeón del menú lateral.
- `test/22-wifi-sync.test.ts` — merge genérico de la sincronización WiFi.
- `docs/informe/` — este informe.

---

## 8. Auditoría de seguridad del repositorio

Se auditó el contenido **publicado** (árbol actual + historial de git) en busca de credenciales que pudieran comprometer cuentas. **Resultado: sin hallazgos.**

- Claves/tokens hardcodeados (`sk-ant-`, `sk-`, `ghp_`, `github_pat_`, `xox[baprs]-`, `AIza...`/Google, `AKIA...`/AWS, `GOCSPX`, `client_secret`, `Bearer eyJ...`, `PRIVATE KEY`): **0 coincidencias** en árbol e historial.
- Archivos sensibles (`.env`, `.pem`, `.key`, `.p12`, `.pfx`, `id_rsa`, `credentials*`, `.npmrc`, `.netrc`): **ninguno** trackeado.
- Bases de datos (`*.db`, `*.sqlite`) o binarios (`*.exe`, `*.dll`, `win-unpacked`, `*.asar`): **no** trackeados.
- `git remote` sin usuario/token embebido. Email de commits = `162842416+TheCoders24@users.noreply.github.com` (noreply).
- Las API keys (Anthropic / LM Studio) se leen en runtime desde `settings` y nunca se hardcodean.

**Observaciones menores (no son filtraciones):**

- El directorio `.git` pesa ~47 MB porque en el pasado se trackearon binarios de `release_new/win-unpacked` (quitados en `ecf08c6`, pero sus blobs permanecen en el historial). Es *bloat*, no un secreto. Se acordó **no** reescribir el historial por ahora.
- `.gitignore` ignoraba `.github/workflows/` (por scope de PAT); `ci.yml` ya está trackeado y no contiene secretos.

---

## 9. Pendientes / recomendaciones

- Bajar el tamaño real del repo (eliminar blobs de `win-unpacked` del historial) con `git filter-repo` o BFG + `force-push`, si se desea.
- Evaluar *code-splitting* para los chunks > 500 kB (P2 del plan de mejoras).
- Ampliar CI (`.github/workflows/ci.yml`) para incluir `lint`, `format` y `build` además de `typecheck` y tests (P1).
