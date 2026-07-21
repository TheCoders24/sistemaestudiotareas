# Características Existentes

## 1. Dashboard (`dashboard`)
**Componente:** `Dashboard/Dashboard.tsx`

Resumen visual del día:
- 4 tarjetas de estadísticas: pomodoros de hoy, tareas pendientes, racha actual, tareas totales
- Notas recientes (últimas 5)
- Barra de progreso de tareas completadas
- Botón "Completar hoy" que actualiza la racha de estudio

---

## 2. Pomodoro Timer (`pomodoro`)
**Componente:** `Pomodoro/PomodoroTimer.tsx`

Temporizador Pomodoro completo:
- 3 modos: Pomodoro (25min), Short Break (5min), Long Break (15min)
- Duración personalizable por modo (guardada en DB)
- Círculo de progreso animado
- Play / Pause / Reset
- **Focus Mode**: oculta sidebar + distracciones
- **Task linker**: asocia la sesión a una tarea específica
- Notificación nativa al completar
- Contador de sesiones de hoy
- Vitacora: fondo de pantalla animado durante el enfoque

---

## 3. Kanban Board (`kanban`)
**Componente:** `Kanban/KanbanBoard.tsx` + `KanbanCard.tsx` + `KanbanColumn.tsx`

Tablero drag & drop con 3 columnas:
- **Por Hacer / En Progreso / Hecho**
- Drag & drop via `@dnd-kit` (core + sortable + utilities)
- Crear tarjetas con: título, descripción, prioridad (baja/media/alta), tags, fecha límite
- **Modal de solo lectura** al hacer click en tarjeta (sin drag)
- Grip de arrastre con `stopPropagation` para no interferir con el click

---

## 4. Task List — Tareas (`tareas`)
**Componente:** `TaskList/TaskList.tsx`

Gestor de tareas completo:
- Lista con checkboxes inline
- Filtros: Todas / Pendientes / Completadas
- **Subtareas** checklist (CRUD + toggle)
- **Tags** picker con colores
- **Prioridad** visual (baja/media/alta) con colores
- Fecha de vencimiento + recordatorio
- **Recurrencia**: daily / weekdays / weekly / monthly
- Edición inline de título
- Asociación a proyectos

---

## 5. Proyectos (`proyectos`)
**Componente:** `Projects/ProjectsPage.tsx`

Gestión de proyectos de software:
- Tarjetas con color, nombre, descripción
- Estado: Activo / En pausa / Completado / Archivado
- Tech stack (badges)
- URL del repositorio
- Búsqueda y filtro por estado

---

## 6. Flashcards (`flashcards`)
**Componente:** `Flashcards/FlashcardsPage.tsx`

Sistema de repaso espaciado (SM-2):
- **Mazos** (decks) con nombre y descripción
- **Tarjetas**: frente (pregunta) y dorso (respuesta)
- **Modo estudio**: voltear tarjeta + calificar (Hard/Regular/Easy)
  - Hard (0-2): resetea repeticiones, intervalo=1
  - Regular (3): aumenta intervalo según algoritmo SM-2
  - Easy (4-5): mayor aumento de intervalo
- **Stats por mazo**: total, pendientes, repasados hoy
- Algoritmo SM-2: ease factor (mín 1.3), intervalo, repeticiones

---

## 7. Daily Log — Diario (`diario`)
**Componente:** `DailyLog/DailyLogPage.tsx`

Diario personal estilo bullet journal:
- Selector de fecha (7 días atrás)
- 4 secciones Markdown: Contenido, Focus, Bloqueos, Plan de mañana
- Preview toggle (Markdown renderizado)
- Lista de entradas recientes
- Búsqueda por fecha

---

## 8. Code Snippets (`snippets`)
**Componente:** `Snippets/SnippetsPage.tsx`

Almacén de fragmentos de código:
- Syntax highlighting con Prism (react-syntax-highlighter)
- Filtro por lenguaje (tabs)
- Búsqueda por texto
- Tags de colores
- Botón copiar al portapapeles
- Asociación a proyectos

---

## 9. Habit Tracker — Hábitos (`habitos`)
**Componente:** `Habits/HabitsPage.tsx`

Seguimiento de hábitos:
- Calendario de 30 días (click para marcar/desmarcar)
- Icono + color por hábito
- Frecuencia: diario / semanal
- Estadísticas: racha actual, racha máxima
- Vista de cuadrícula mensual

---

## 10. Study Map — Mapa de Estudio (`mapa`)
**Componente:** `StudyMap/StudyMap.tsx`

Árbol jerárquico de temas de estudio:
- Temas con padre (parent_id) — anidación infinita
- Expandir/colapsar nodos
- Progreso diario por tema (check)
- Semillas de temas por defecto (programación)
- Arrastrar para reordenar

---

## 11. Statistics — Stats (`stats`)
**Componente:** `Statistics/Statistics.tsx`

Analíticas visuales:
- Selector de período: 7 días / 30 días
- 3 tarjetas: Pomodoros completados, Tareas completadas, Progreso general
- Gráfico de barras (Recharts): pomodoros por día
- Datos agregados desde la DB

---

## 12. Quick Notes — Notas (`notas`)
**Componente:** `QuickNotes/QuickNotes.tsx`

Notas rápidas:
- Grid de tarjetas
- Edición inline (click para editar)
- Tags de colores
- Selector de cuaderno (notebook)
- Búsqueda
- Creación rápida desde cualquier tab via QuickCapture (Ctrl+Shift+N)

---

## 13. Goals — Metas (`metas`)
**Componente:** `Goals/Goals.tsx`

Metas con tracking de progreso:
- Tipo: Diaria / Semanal
- Métrica: Pomodoros / Tareas / Estudio
- Target numérico
- Barra de progreso con valor actual vs target
- Log diario automático desde actividad

---

## 14. Activity Log — Actividad (`actividad`)
**Componente:** `ActivityLog/ActivityLog.tsx`

Feed de auditoría:
- Acciones: created, updated, deleted, completed, etc.
- Colores por tipo de acción
- Lista cronológica inversa (últimas 100)
- Integrado con todas las entidades vía `logActivity`

---

## 15. Sidebar
**Componente:** `Sidebar/Sidebar.tsx`

Panel lateral izquierdo (toggleable):
- Racha actual (mini-card)
- Top 5 notas recientes
- Metas de hoy con progreso
- Animación de entrada/salida con Framer Motion
- Oculto en Focus Mode

---

## 16. Settings (Dialog)
**Componente:** `Settings/Settings.tsx`

Configuración global (lazy-loaded):
- **Eye-rest timer**: regla 20-20-20 con slider de intervalo
- **8 temas de color** (Índigo, Esmeralda, Rosa, Ámbar, Violeta, Cielo, Naranja, Lima)
- **Auto-backup**: configuración hourly/daily/weekly
- **Export/Import manual** de datos (JSON)
- Persistencia en DB via settings table

---

## 17. Auto-updater (Background)
- Check de actualizaciones al inicio (GitHub releases)
- Banner de actualización disponible
- Barra de progreso de descarga
- Instalación al cerrar app

---

## 18. Templates (Transversal)
- Plantillas reutilizables por entity_type
- Crear desde cualquier entidad existente

## 19. Tags (Transversal)
- Sistema de etiquetas con colores
- Relación M:N con Tasks, Notes, Snippets
- Filtros por tag

## 20. Notebooks (Transversal)
- Cuadernos jerárquicos (parent_id)
- Organización de notas

## 21. Streaks (Transversal)
- Rachas de estudio consecutivas
- Actualización automática al completar pomodoro
- Display en navbar + sidebar
