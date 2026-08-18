# Materias en el Mapa de Estudio

> Organizá los temas del Mapa de estudio (StudyMap) por **materia/curso**,
> creándolas directamente desde la pantalla sin salir del mapa.

## Qué hace

| Función | Dónde | Cómo |
|---|---|---|
| Crear una materia | Botón **"Nueva materia"** (cabecera del Mapa de estudio) | Abre un diálogo con nombre, término/cuatrimestre y color. Se guarda en la tabla `courses`. |
| Asignar materia a un tema | Formulario **"Añadir Tema"** → campo "Curso (opcional)" | Al crear un tema se elige la materia y el `course_id` se **persiste** en la base. |
| Ver la materia de cada tema | Insignia de color con el nombre junto a cada tema | Aparece siempre que el tema tenga materia asignada. |
| Agrupar por materia | Toggle **"Todo / Por materias"** en la barra de herramientas | Vista agrupada: secciones por materia (con su color) + sección "Sin materia". Cada sección muestra el conteo de temas raíz. |
| Filtrar por materia | Select "Todos los cursos" | Filtra el mapa a una sola materia (combinable con búsqueda y vista agrupada). |

## Instrucciones de uso

1. **Crear una materia**
   - Abrí **Estudio → Mapa de estudio**.
   - Click en **Nueva materia** (arriba a la derecha).
   - Completá nombre (ej. *Anatomía I*), término opcional (ej. *2026-1*) y elegí un color.
   - Click en **Crear materia**.
2. **Agregar temas a la materia**
   - Click en **Añadir Tema**.
   - En "Curso (opcional)" seleccioná la materia.
   - Click en **Crear Tema**. La insignia de color aparece junto al tema.
3. **Ver el mapa por materias**
   - En la barra de herramientas usá el toggle **Por materias**.
   - Se listan secciones por materia (orden alfabético) y, al final, **Sin materia**.
4. **Filtrar / buscar**
   - El select de cursos y el buscador funcionan en ambas vistas.

> Tip: los subtemas heredan la sección de su tema padre en la vista agrupada,
> aunque cada tema conserve su propia materia. Para cambiar la materia de un
> tema ya creado usá la sección **Cursos** del sidebar.

## Cambios en el código

### Backend (Electron)

| Archivo | Cambio |
|---|---|
| `electron/handlers/study.js` | `db:createStudyTopic` ahora arma el `INSERT` dinámico con las columnas presentes (`parent_id, name, description, resource_url, course_id, workspace_id, order_position`). Antes **descartaba `course_id`** y lanzaba "Too many parameter values" si el renderer enviaba esa clave. |
| `electron/handlers/courses.js` | `courses:create` ahora arma el `INSERT` dinámico igual que study (antes fallaba con "Missing named parameter credits" si se omitían `credits`/`target_grade`). |
| `electron/utils.js` | `ALLOWED_COLUMNS.study_topics` ahora incluye `course_id` (permite reasignar la materia con `db:updateStudyTopic`). |
| `electron/core/schemas/index.js` | `study.topics.create` declara `course_id` como entero positivo opcional/nullable. |
| `electron/database.js` | **Migración v16**: `study_topics ADD COLUMN updated_at`. `safeUpdate` siempre escribe `updated_at` y la tabla no lo tenía → cualquier edición de tema fallaba. Ahora las bases existentes migran solas. |

### Frontend (React)

| Archivo | Cambio |
|---|---|
| `src/components/StudyMap/StudyMap.tsx` | Diálogo **Nueva materia** (`courses.create`), insignia de materia por tema, toggle **Todo / Por materias** con agrupación (`courseGroups`) y sección "Sin materia". |

## Testing

### Suite Vitest

| Suite | Qué cubre |
|---|---|
| `test/09-study-map-courses.test.ts` (11 tests) | Contrato del mock: crear materia, persistir `course_id`, agrupar por materia + "Sin materia", reasignar vía update, reordenar y niveles. Parte B: SQL dinámico del INSERT y columna permitida en `safeUpdate`. |

```bash
npx vitest run test/09-study-map-courses
```

### Verificación end-to-end real (Electron + SQLite)

`scripts/verify-study-course.js` ejecuta los **handlers IPC reales** contra una
base de datos temporal y comprueba: crear materia, crear tema con `course_id`
(sin "too many parameters"), tema sin materia, reasignar materia y listado
agrupado.

```bash
npx electron scripts/verify-study-course.js
```

Salida esperada (código de salida 0):

```
✓ courses:create devuelve la materia con id
✓ db:createStudyTopic no lanza "too many parameters"
✓ el tema creado persiste course_id = 1
✓ tema sin materia tiene course_id = null
✓ db:updateStudyTopic permite reasignar course_id
✓ listar temas → 2 pertenecen a la materia
=== TODAS LAS COMPROBACIONES OK ===
```

## Estado verificado

- `npx vitest run` → **21 archivos · 513 tests · 0 fallos**.
- Verificación end-to-end real: 6/6 comprobaciones OK.
- `npx vite build` → build correcto.
- Arranque de la app con renderer (`[MAIN] React rendered successfully`) sin errores.
