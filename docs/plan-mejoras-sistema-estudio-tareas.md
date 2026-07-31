# Plan de Mejoras y Reestructuración — Sistema Estudio y Tareas

**Documento para:** Modelo de implementación (DeepSeek)
**Preparado por:** Análisis técnico previo (Claude / Anthropic)
**Proyecto base:** Electron 42 + React 19 + TypeScript + Vite 8 + Tailwind CSS 3 + SQLite (better-sqlite3)
**Versión actual del sistema:** 1.0.0 — Esquema SQLite v12
**Fecha del plan:** 2026-07-30

---

## 0. CÓMO USAR ESTE DOCUMENTO

Este documento describe un plan de mejoras sobre una aplicación Electron ya funcional (30 tabs, 46 tablas SQLite, 190+ canales IPC, patrón Transactional Outbox + Repository Pattern). **No es un rediseño desde cero**: cada fase reutiliza lo que ya existe y lo reorganiza o extiende.

Reglas de trabajo para quien implemente esto:

1. **Sigue el orden de las fases.** Cada fase depende de que la anterior esté estable. No saltar a features nuevas (Fase 4+) sin haber cerrado seguridad y reorganización (Fases 1-2).
2. **No rompas el patrón existente.** El proyecto usa Repository Pattern (`src/core/domain/` interfaces, `electron/core/repositories/` implementaciones), IPC con formato `{ ok, value }` / `{ ok: false, error }`, y Transactional Outbox para eventos de dominio. Todo código nuevo debe seguir estos mismos patrones, no introducir uno paralelo.
3. **Cada cambio de esquema SQLite necesita una migración versionada.** El esquema actual es v12; cada cambio de tabla debe ir en un archivo de migración nuevo (v13, v14, etc.), nunca modificar migraciones ya aplicadas.
4. **Cada handler IPC nuevo debe llevar validación Zod desde el primer commit.** No repetir la deuda técnica que ya existe (validación parcial).
5. **Al final de cada fase, hay una sección "Criterio de aceptación"** — son las condiciones mínimas para considerar la fase terminada antes de pasar a la siguiente.

---

## 1. DIAGNÓSTICO RESUMIDO (contexto para el modelo)

La aplicación es funcionalmente muy completa pero tiene dos problemas de fondo, no de features:

- **Problema A — Seguridad/deuda técnica:** sandbox de Electron desactivado, validación Zod incompleta en los 20 handlers IPC, API IPC legacy duplicada (~250 líneas), sin tests.
- **Problema B — Sobrecarga de UX:** 30 tabs planos en la navegación es demasiada carga cognitiva, especialmente para usuarios no técnicos (estudiantes). Hay módulos solapados conceptualmente (ej. Study Map + Flashcards + Repaso Inteligente + Rachas por Materia son, en la práctica, una sola vista de "dominio de un tema" partida en 4 pantallas).

Además se detectó un **bug de navegación concreto**: el atajo `Ctrl+Shift+F` está duplicado entre el módulo **Flashcards** (3.18) y **Rachas por Materia** (3.24). Debe resolverse en la Fase 2 al fusionar ambos módulos.

El plan está pensado para dos perfiles de usuario simultáneos: desarrolladores/power users y gente no técnica (estudiantes). La solución no es quitar funciones, es **curar qué se ve por defecto** sin perder nada bajo el capó.

---

## 2. FASE 1 — SEGURIDAD Y DEUDA TÉCNICA

**Objetivo:** cerrar los riesgos de seguridad y consolidar la base de código antes de tocar UX o agregar features. Esta fase no debe cambiar comportamiento visible para el usuario.

### Paso 1.1 — Activar sandbox de Electron

- En la creación de `BrowserWindow` (`electron/core/window-manager.js` o equivalente), confirmar y forzar:
  - `sandbox: true`
  - `contextIsolation: true`
  - `nodeIntegration: false`
- Probar exhaustivamente `preload.js`: con sandbox activo, el preload corre en un contexto más restringido. Verificar que todo el `contextBridge.exposeInMainWorld(...)` siga funcionando y que no haya `require()` de módulos Node directamente en código que se ejecute en el renderer.
- **Riesgo a vigilar:** algunos módulos core (ej. `plugin-system.js`, `encryption.js`) podrían asumir acceso directo a Node desde el renderer. Auditar uno por uno.

### Paso 1.2 — Validación Zod completa en todos los handlers IPC

- Crear (si no existe ya de forma centralizada) un wrapper único:

```js
// electron/core/safe-handle.js
function safeHandle(channel, schema, handlerFn) {
  ipcMain.handle(channel, async (event, payload) => {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: `Validación falló en ${channel}: ${parsed.error.message}` };
    }
    try {
      const value = await handlerFn(parsed.data, event);
      return { ok: true, value };
    } catch (err) {
      logger.error(`Error en handler ${channel}`, err);
      return { ok: false, error: err.message };
    }
  });
}
```

- Reemplazar **todos** los `ipcMain.handle(...)` sueltos en los 20 módulos de `electron/handlers/` por `safeHandle(...)` con su schema Zod correspondiente.
- Crear los schemas Zod en `electron/core/schemas/` organizados por namespace (`tasks.schema.js`, `flashcards.schema.js`, etc.), para que se puedan compartir después con el frontend si se centraliza validación (ítem ya listado como recomendación en el reporte original).
- **Criterio de "completo":** ningún canal en la tabla de la sección 6.1 del reporte original debe quedar sin schema. Si un canal no tiene payload (ej. un `list()` sin argumentos), usar `z.undefined()` o `z.void()` explícito, no omitir el wrapper.

### Paso 1.3 — Eliminar API IPC legacy flat

- Localizar los ~80 métodos planos de compatibilidad hacia atrás mencionados en la sección 6.2 del reporte original.
- Verificar en el frontend (`src/`) que ningún componente o store Zustand siga llamando a la versión flat (`window.electronAPI.algo()` en vez de `window.electronAPI.namespace.algo()`).
- Eliminar del preload y de los handlers. Esto reduce superficie de ataque y mantenimiento.

### Paso 1.4 — Aislar módulos de diagnóstico interno

- Los namespaces `profiler`, `perf`, `perfMonitor`, `preload` (SmartPreload stats) y `plugins` son herramientas de debug/desarrollo, no funciones de usuario final.
- Moverlos detrás de un flag `settings.developerMode` (booleano, default `false`). Si `developerMode` es `false`, estos canales deben:
  - No aparecer en ningún menú/tab de la navegación normal.
  - Seguir respondiendo si se llaman directamente (no romper nada), pero no exponerse en la UI.

### Criterio de aceptación — Fase 1

- [ ] Sandbox activo y app funcionando sin errores de contextIsolation.
- [ ] 100% de los handlers IPC pasan por `safeHandle` con schema Zod.
- [ ] Cero referencias a la API flat legacy en el código fuente.
- [ ] `developerMode` implementado y namespaces de diagnóstico ocultos por defecto.
- [ ] La app compila y todas las funciones existentes (los 30 tabs) siguen operando igual que antes — esta fase no debe alterar comportamiento visible.

---

## 3. FASE 2 — REESTRUCTURACIÓN DE NAVEGACIÓN (sin perder funciones)

**Objetivo:** pasar de 30 tabs planos a una navegación agrupada en "hubs", sin eliminar ninguna funcionalidad existente. Esto es reorganización de UI/routing, no reescritura de lógica de negocio.

### Paso 2.1 — Definir la nueva estructura de navegación

Agrupar los 30 módulos actuales en 7 hubs. Cada hub es una ruta padre con sub-navegación (tabs internos o sidebar secundario). Mapeo exacto:

| Hub nuevo | Módulos actuales que agrupa (referencia a numeración del reporte original) |
|---|---|
| **Enfoque** | 3.2 Pomodoro, 3.25 Bloqueador Web, 3.26 Distracciones |
| **Estudio** | 3.12 Study Map, 3.18 Flashcards, 3.19 Repaso Inteligente, 3.24 Rachas por Materia (ver fusión detallada en Paso 2.2) |
| **Trabajo** | 3.3 Kanban, 3.4 Tareas, 3.5 Proyectos, 3.30 Automatización |
| **Registro** | 3.6 Daily Log, 3.7 Calendario, 3.9 Hábitos, 3.15 Metas, 3.29 Importar Calendario |
| **Conocimiento** | 3.14 Notas, 3.8 Snippets |
| **Progreso** | 3.13 Estadísticas, 3.10 Logros, 3.23 Tienda de Logros (fusionar con Logros), 3.11 Desafíos, 3.16 Reporte Semanal, 3.28 Informe Semanal PDF |
| **Sistema** | 3.27 Sincronización, Configuración general, `developerMode` (Fase 1) |

Módulos que quedan pendientes de decisión explícita (no asignarlos sin resolver primero):
- **3.22 Social** — está marcado "en desarrollo" en el reporte original. **No incluir en la navegación hasta que tenga funcionalidad real.** Ocultar completamente detrás de un flag hasta nueva instrucción, no dejarlo como tab vacío.
- **3.21 Smart Reminders** — pasa a ser parte de la configuración de Notificaciones dentro de "Sistema", no un hub propio.
- **3.20 Energy Planning** — pasa a ser una sub-vista dentro de "Registro" (se relaciona con Metas y Calendario), no hub propio.

### Paso 2.2 — Fusión del hub "Estudio" (el cambio más importante de esta fase)

Los 4 módulos (Study Map, Flashcards, Repaso Inteligente, Rachas por Materia) comparten el mismo dato de fondo: **dominio de un tema/materia**. Hoy están repartidos en 4 pantallas distintas y obligan al usuario a saltar entre ellas para responder una sola pregunta: *"¿qué tan bien domino este tema y qué me toca repasar hoy?"*.

Pasos concretos:

1. Crear una vista única `EstudioHub` con sub-tabs internos: `Mapa` | `Flashcards` | `Repaso de hoy` | `Progreso`.
2. **No tocar la lógica de negocio de cada módulo** (SM-2, forgetting curve, árbol de temas, heatmap de rachas) — solo se reorganiza dónde vive el componente en el árbol de rutas.
3. Añadir un **dashboard por materia** en el sub-tab `Progreso`: combina en una sola tarjeta por materia: nivel de dominio (de Study Map), próximas flashcards pendientes (de Flashcards/Repaso), curva de olvido (de Repaso Inteligente) y racha actual (de Rachas por Materia). Esta tarjeta es nueva UI, pero consulta datos que ya existen — no requiere tablas nuevas todavía (eso viene en Fase 4 con la entidad `courses`).
4. **Resolver el conflicto de atajo:** liberar `Ctrl+Shift+F`. Asignar el atajo unificado del hub Estudio a `Ctrl+Shift+F`, y los sub-tabs internos no necesitan atajo propio (se navega con clicks o con el Command Palette de la Fase 3).

### Paso 2.3 — Fusión de "Logros" + "Tienda de Logros"

- Unificar 3.10 y 3.23 en una sola vista con dos secciones internas: "Desbloqueados" y "Canjear puntos". Es la misma área mental (gamificación), no necesita ser dos tabs.

### Paso 2.4 — Fusión del hub "Enfoque"

- Pomodoro, Bloqueador Web y Distracciones se usan juntos en la práctica (una sesión de estudio implica temporizador + bloqueo de sitios + registro de distracciones). Unificar en una sola vista con el temporizador como elemento central y las otras dos funciones como paneles laterales/colapsables, no tabs separados.

### Paso 2.5 — Actualizar el sistema de atajos globales

- Revisar la tabla completa de atajos (`Ctrl+1` a `Ctrl+Shift+A`, etc.) del reporte original sección 3.x.
- Reasignar atajos para que correspondan a los 7 hubs nuevos, no a los 30 módulos viejos.
- **Importante:** dejar `Ctrl+K` libre — se reserva para el Command Palette de la Fase 3, aunque hoy esté asignado a Kanban (3.3). Kanban pasa a integrarse en el hub "Trabajo" sin atajo global propio, se accede desde ahí.

### Criterio de aceptación — Fase 2

- [ ] Los 30 módulos originales siguen existiendo funcionalmente, ninguno se eliminó, solo se reorganizó su ubicación en la navegación.
- [ ] Navegación principal muestra 7 hubs, no 30 tabs.
- [ ] El dashboard de "Progreso" dentro de Estudio combina datos de los 4 módulos fusionados en una sola tarjeta por materia.
- [ ] Atajo `Ctrl+Shift+F` ya no está duplicado.
- [ ] `Ctrl+K` queda libre para la Fase 3.
- [ ] Social queda oculto detrás de un flag, no visible en la navegación.

---

## 4. FASE 3 — COMMAND PALETTE

**Objetivo:** dar acceso universal a búsqueda y acciones sin depender de memorizar atajos, útil tanto para power users como para usuarios no técnicos que prefieren escribir lo que buscan.

### Paso 3.1 — Componente base

- Nuevo componente `CommandPalette` (modal overlay), invocado con `Ctrl+K` / `Cmd+K`.
- Usar `cmdk` (librería estándar para este patrón en React) o construir sobre los primitivos `@radix-ui/*` que ya están en las dependencias del proyecto — no introducir una librería de UI nueva si Radix ya cubre el caso.

### Paso 3.2 — Modo búsqueda

- Reutilizar el canal IPC `search.search` que ya existe (namespace `search` en la tabla de canales del reporte original) — no reimplementar indexado, ya está resuelto con `search.reindex`.
- Resultados deben cubrir: tareas, notas, snippets, proyectos, temas de estudio, flashcards (por su contenido de pregunta/respuesta).
- Al seleccionar un resultado, navegar directo a la entidad (abrir la tarea, la nota, etc.) dentro del hub correspondiente.

### Paso 3.3 — Modo acción

- Prefijo `>` (convención estándar, ej. `>crear tarea`) para listar acciones ejecutables en vez de resultados de búsqueda.
- Acciones mínimas a implementar en la primera versión:
  - Crear tarea rápida
  - Iniciar pomodoro
  - Nueva flashcard rápida
  - Nueva nota rápida
  - Cambiar de hub (ir a Estudio, ir a Trabajo, etc.)
- Cada acción del palette debe llamar al mismo canal IPC que ya usa el formulario tradicional correspondiente — el palette es una interfaz alternativa, no una lógica de negocio nueva.

### Criterio de aceptación — Fase 3

- [ ] `Ctrl+K` abre el palette desde cualquier hub.
- [ ] Búsqueda de texto libre encuentra tareas, notas, snippets, proyectos, temas y flashcards.
- [ ] Al menos 5 acciones rápidas funcionando (listadas arriba).
- [ ] Funciona por completo con teclado (flechas + enter), sin requerir mouse.

---

## 5. FASE 4 — ENTIDAD "COURSES" (MATERIAS) Y PERFILES DE USUARIO

**Objetivo:** formalizar el concepto de "materia/curso" como entidad real de base de datos (hoy es implícito, usado solo como string libre en Rachas por Materia), y separar la experiencia según si el usuario es estudiante o developer.

### Paso 4.1 — Migración de esquema v13: tabla `courses`

```sql
-- Migración v13
CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  term TEXT,              -- ej. "2026-2", semestre/cuatrimestre
  credits INTEGER,
  target_grade REAL,      -- para el futuro cálculo de GPA (Fase 6)
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_courses_workspace ON courses(workspace_id);
```

- Añadir `course_id INTEGER REFERENCES courses(id)` (nullable, para no romper datos existentes) a las tablas: `study_topics`, `flashcard_decks`, `streaks` (donde aplique a nivel materia), y opcionalmente `tasks` (para tareas académicas).
- Migración de datos: los valores de "materia" que hoy existen como texto libre en Rachas por Materia deben mapearse a filas nuevas en `courses` durante la migración, no perderse.

### Paso 4.2 — Handler IPC y repositorio para `courses`

- Seguir el mismo patrón que `projects.js` (CRUD simple: list, create, update, delete) ya que es la entidad más parecida en estructura.
- Repositorio en `electron/core/repositories/course-repository.js`, interfaz en `src/core/domain/`.
- Namespace IPC: `courses` con métodos `list, create, update, delete, archive`.

### Paso 4.3 — Actualizar el hub "Estudio" para colgar de `course_id`

- El dashboard de "Progreso" del Paso 2.2 ahora agrupa por `course_id` real en vez de por texto libre.
- Study Map, Flashcards y Rachas filtran/agrupan por curso seleccionado.

### Paso 4.4 — Perfiles de usuario

- Añadir a `settings`: `userProfile` con valores `'student' | 'developer' | 'custom'`.
- Pantalla de onboarding (nueva, solo se muestra si `settings.onboardingCompleted` es `false`):
  1. Elegir perfil.
  2. Si `student`: crear primer curso con plantilla de plan de estudio (ver Fase 5).
  3. Si `developer`: ofrecer conectar GitHub (ver Fase 6) o importar tareas desde `.ics`/Todoist.
- Según `userProfile`, el sidebar de hubs filtra qué se muestra por defecto:
  - `student`: Estudio, Registro, Progreso, Enfoque al frente. Trabajo y Conocimiento (Snippets) colapsados en "Ver todo".
  - `developer`: Trabajo, Conocimiento, Estudio, Sistema al frente.
  - `custom`: todo visible sin filtrar, como está hoy.
- **Importante:** esto es un filtro visual sobre el array de rutas del sidebar, no una restricción de acceso. Todo debe seguir siendo alcanzable desde "Ver todo" o desde el Command Palette (Fase 3), sin excepción.

### Criterio de aceptación — Fase 4

- [ ] Tabla `courses` creada y migración de datos de "materia" (texto libre) completada sin pérdida.
- [ ] Study Map, Flashcards, Rachas ahora referencian `course_id`.
- [ ] Onboarding funcional con selección de perfil.
- [ ] Sidebar se adapta según `userProfile` pero nada queda inaccesible.

---

## 6. FASE 5 — PLANTILLAS (TEMPLATES)

**Objetivo:** resolver el problema de "pantalla en blanco" para usuarios nuevos, especialmente estudiantes, con plantillas reutilizables sobre entidades que ya tienen CRUD completo.

### Paso 5.1 — Tabla `templates`

```sql
-- Migración v14
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,          -- 'project' | 'kanban_board' | 'study_plan'
  name TEXT NOT NULL,
  description TEXT,
  payload TEXT NOT NULL,       -- JSON con la estructura a instanciar
  is_builtin INTEGER DEFAULT 1, -- distingue plantillas del sistema vs. creadas por el usuario
  created_at TEXT DEFAULT (datetime('now'))
);
```

- El campo `payload` es JSON serializado con la estructura completa a crear (ej. para `study_plan`: lista de temas del Study Map + mazos de flashcards vacíos + metas asociadas).

### Paso 5.2 — Plantillas predefinidas a incluir (`is_builtin = 1`)

- **Proyecto:** "Proyecto de tesis", "Sprint de 2 semanas" (para developer profile).
- **Kanban:** tablero por defecto según tipo de trabajo (desarrollo de software vs. gestión de tareas académicas).
- **Plan de estudio:** "Repaso de 30 días antes de examen" — al instanciarse, genera automáticamente: un curso (si no existe), un árbol de Study Map con temas placeholder, mazos de flashcards vacíos asociados, y una meta de repaso diario.

### Paso 5.3 — Handler IPC `templates`

- Métodos: `list(type)`, `instantiate(templateId, params)`.
- `instantiate` debe ejecutarse dentro de una transacción SQLite (usar el mismo mecanismo transaccional que ya usa el Transactional Outbox) — si falla a mitad de creación, debe hacer rollback completo, no dejar entidades huérfanas.

### Paso 5.4 — UI de "Empezar con plantilla"

- En el onboarding (Fase 4, Paso 4.4) y en las pantallas vacías de Proyectos/Kanban/Estudio, mostrar "Empezar con plantilla" como alternativa a "Crear desde cero" cuando la lista está vacía.

### Criterio de aceptación — Fase 5

- [ ] Al menos 2 plantillas de proyecto, 2 de kanban, 1 de plan de estudio funcionando.
- [ ] `instantiate` es transaccional (probar forzando un error a mitad de proceso y confirmar que no quedan datos parciales).
- [ ] Plantillas visibles desde onboarding y desde pantallas vacías.

---

## 7. FASE 6 — FUNCIONALIDADES ESPECÍFICAS POR PERFIL

Esta fase se puede paralelizar en dos ramas de trabajo independientes si hay más de un desarrollador disponible, ya que no comparten código entre sí.

### 7.A — Rama Estudiante

**Paso 6.A.1 — Entidad `exams` (exámenes/entregas con cuenta regresiva)**

```sql
-- Migración v15
CREATE TABLE exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER REFERENCES courses(id),
  title TEXT NOT NULL,
  date TEXT NOT NULL,          -- fecha del examen/entrega
  weight REAL,                 -- ponderación en la nota final (0-1 o 0-100, definir convención)
  study_topic_ids TEXT,        -- JSON array de IDs de study_topics vinculados
  completed INTEGER DEFAULT 0,
  grade_obtained REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

- UI con countdown visual y, si `study_topic_ids` está poblado, mostrar el % de dominio agregado de esos temas (reutiliza el dashboard de Progreso de la Fase 2).

**Paso 6.A.2 — Cálculo de promedio/GPA**

- Añadir a `courses`: ya tiene `credits` y `target_grade` de la Fase 4.
- Nueva vista de cálculo que usa `exams.grade_obtained` + `exams.weight` por curso, y agrega ponderado por `credits` a nivel general.
- Esto es lógica de cálculo pura en el frontend o en un handler `stats.gpa` — no requiere tabla nueva más allá de lo ya definido.

**Paso 6.A.3 — Modo examen/simulacro**

- Nueva pantalla dentro del hub Estudio: selecciona un mazo de flashcards (o varios por curso), modo quiz cronometrado.
- Al finalizar: pantalla de resultados con desglose de fallos por tema (usa `study_topic_id` de cada flashcard si existe esa relación; si no existe, añadirla en esta migración).
- Guardar resultado en una tabla `exam_simulations` simple (fecha, mazo, aciertos, fallos, duración) para poder graficar progreso en el tiempo.

**Paso 6.A.4 — Exportación de "chuleta"/resumen imprimible**

- Reutilizar `jspdf` (ya está en dependencias) para generar PDF de un tema del Study Map, similar a como ya se genera el Informe Semanal PDF (3.28) — mismo patrón de código, no una implementación nueva desde cero.

### 7.B — Rama Developer

**Paso 6.B.1 — Integración Git en Proyectos**

- Cada proyecto ya tiene `repo_url`. Añadir llamada (vía `simple-git` en el main process, o llamadas directas a comandos git si el repo es local) para mostrar: branch activo, último commit (mensaje + fecha), estado (clean/dirty).
- Si se quiere ir más allá con GitHub/GitLab (PRs abiertos, issues), requiere OAuth — dejarlo como paso opcional posterior, no bloquear el resto de la fase por esto.

**Paso 6.B.2 — Abrir proyecto en editor externo**

- Botón "Abrir en VSCode" / "Abrir en Claude Code" en la vista de detalle de Proyecto.
- Implementación: `child_process.spawn('code', [projectPath])` en el main process, expuesto vía IPC `projects.openInEditor(id)`.
- Validar que el comando exista en el PATH del sistema antes de intentar ejecutar, y manejar el error con un mensaje claro si no está instalado.

**Paso 6.B.3 — Snippets ejecutables**

- Para snippets marcados como JS/Python/Bash, añadir botón "Ejecutar".
- **Importante — seguridad:** esto ejecuta código arbitrario. Debe correr en un proceso hijo aislado (`child_process` con timeout y límite de memoria), nunca en el proceso principal de Electron ni en el renderer. Mostrar advertencia clara la primera vez que se usa la función.

**Paso 6.B.4 — Webhooks salientes en Automatización**

- El motor de automatización (`automation-engine.js`) ya soporta disparadores y acciones internas (mover columna, cambiar prioridad, etc.).
- Añadir un nuevo tipo de acción: `webhook` con URL + payload configurable (JSON con variables del evento disponibles, ej. `{{task.title}}`).
- Esto conecta la app con Slack/Discord/n8n/Zapier sin necesitar integraciones específicas por servicio.

### Criterio de aceptación — Fase 6

- [ ] Rama Estudiante: countdown de exámenes funcionando, GPA calculado correctamente contra al menos 3 casos de prueba manuales, modo simulacro genera resultados guardados, exportación PDF de tema funcional.
- [ ] Rama Developer: estado de git visible en proyecto, apertura en editor externo funcional, ejecución de snippets aislada y con timeout, webhook de automatización probado contra un endpoint de prueba (ej. webhook.site).

---

## 8. FASE 7 — IA INTEGRADA (opcional, mayor esfuerzo)

**Objetivo:** el salto de mayor impacto en percepción de producto, pero también el de mayor complejidad. Solo abordar después de que las fases 1-6 estén estables.

### Paso 7.1 — Generación de flashcards asistida

- Handler nuevo `ai.generateFlashcards(topicId | noteId)`: toma el contenido de un tema del Study Map (incluyendo texto de archivos adjuntos si son extraíbles) o de una nota, llama a la API de Anthropic, y devuelve un array de pares pregunta/respuesta propuestos.
- El usuario revisa y confirma antes de que se inserten como flashcards reales — nunca insertar directo sin revisión humana.
- Requiere que el usuario configure su propia API key en Configuración (no debe ir hardcodeada ni ser responsabilidad de la app proveerla).

### Paso 7.2 — Resumen semanal con insights

- Handler `ai.summarizeWeek()`: toma los datos ya agregados de `weekly_reports`, `daily_logs`, `xp_log` de los últimos 7 días y genera un resumen en lenguaje natural con 2-3 observaciones (ej. patrones de baja productividad en días específicos).
- Se integra en el módulo de Reporte Semanal (3.16) existente, como una sección adicional, no un módulo nuevo.

### Paso 7.3 — Tutor conversacional sobre Study Map

- Vista de chat simple dentro del hub Estudio, con contexto limitado al tema seleccionado (nombre del tema + contenido de archivos adjuntos extraíbles como texto).
- Es RAG básico: no requiere embeddings/vector DB para el volumen de datos típico de esta app (decenas de temas, no miles) — basta con pasar el contexto relevante directo en el prompt.

### Criterio de aceptación — Fase 7

- [ ] Generación de flashcards funcional con paso de revisión obligatorio antes de guardar.
- [ ] Resumen semanal generado y visible en el módulo de Reporte Semanal.
- [ ] Chat de tutor responde con contexto correcto del tema seleccionado, sin alucinar contenido fuera de lo adjuntado (probar con al menos 3 temas distintos).

---

## 9. RESUMEN DE MIGRACIONES DE BASE DE DATOS

Para que quede como referencia rápida de qué migraciones crear y en qué orden:

| Versión | Fase | Cambio |
|---|---|---|
| v13 | Fase 4 | Tabla `courses` + columna `course_id` en `study_topics`, `flashcard_decks`, `streaks` |
| v14 | Fase 5 | Tabla `templates` |
| v15 | Fase 6.A | Tabla `exams`, tabla `exam_simulations`, columna `study_topic_id` en `flashcards` (si no existe) |
| v16 | Fase 7 (opcional) | Sin cambios de esquema obligatorios — solo config de API key en `settings` |

---

## 10. RESUMEN EJECUTIVO DEL ORDEN DE TRABAJO

1. **Fase 1** — Seguridad y deuda técnica (sandbox, Zod, eliminar legacy, aislar debug tools). No visible para el usuario final.
2. **Fase 2** — Reestructurar navegación de 30 tabs a 7 hubs, fusionando módulos solapados (Estudio, Enfoque, Logros). Resuelve el bug de atajo duplicado.
3. **Fase 3** — Command Palette (`Ctrl+K`), búsqueda y acciones rápidas.
4. **Fase 4** — Entidad `courses` formal + perfiles de usuario (estudiante/developer) + onboarding.
5. **Fase 5** — Sistema de plantillas para proyectos, kanban y planes de estudio.
6. **Fase 6** — Features específicas: rama Estudiante (exámenes, GPA, simulacros, exportación) y rama Developer (Git, editor externo, snippets ejecutables, webhooks) en paralelo.
7. **Fase 7** (opcional, mayor esfuerzo) — IA integrada: flashcards generadas, resúmenes semanales, tutor conversacional.

**No incluido en este plan** (mencionado en el análisis original pero fuera de alcance aquí, para no sobrecargar la implementación): sincronización en la nube multi-dispositivo, exportación/importación formato Anki `.apkg`, app mobile companion, integración Google Calendar vía `googleapis`. Estos quedan como fases futuras a definir por separado una vez estabilizado todo lo anterior.

---

*Fin del plan. Preparado para implementación por modelo externo (DeepSeek) a partir del reporte funcional original del sistema, versión 1.0.0.*
