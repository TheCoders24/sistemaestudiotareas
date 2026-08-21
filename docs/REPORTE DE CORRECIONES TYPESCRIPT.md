# Reporte de corrección de errores de TypeScript

## Información general

- **Proyecto:** `sistema-estudio-tareas`
- **Comando ejecutado:**

```bash
npm run typecheck
```

- **Comando interno:**

```bash
tsc --noEmit
```

- **Resultado actual:** fallo con código de salida `2`.
- **Objetivo:** corregir todos los errores de TypeScript sin debilitar el tipado, sin usar `any`, sin usar `@ts-ignore` y sin romper la funcionalidad existente.

---

## Salida completa de errores

```text
> sistema-estudio-tareas@1.0.0 typecheck
> tsc --noEmit

Error: src/App.tsx(19,16): error TS6133: 'KEYBOARD_SHORTCUTS' is declared but its value is never read.
Error: src/App.tsx(87,24): error TS6133: 'setTaskViewMode' is declared but its value is never read.
Error: src/App.tsx(92,36): error TS6133: 'type' is declared but its value is never read.
Error: src/__tests__/api-comprehensive.test.ts(17,439): error TS1117: An object literal cannot have multiple properties with the same name.
Error: src/__tests__/api-comprehensive.test.ts(359,12): error TS18048: 'streak' is possibly 'undefined'.
Error: src/__tests__/api-comprehensive.test.ts(373,12): error TS18048: 'retrieved' is possibly 'undefined'.
Error: src/__tests__/flashcards-ipc.test.ts(130,73): error TS2554: Expected 1 arguments, but got 2.
Error: src/__tests__/flashcards-ipc.test.ts(149,63): error TS2554: Expected 1 arguments, but got 2.
Error: src/__tests__/flashcards-ipc.test.ts(150,63): error TS2554: Expected 1 arguments, but got 2.
Error: src/__tests__/flashcards-ipc.test.ts(154,59): error TS2554: Expected 1 arguments, but got 2.
Error: src/__tests__/stores.test.ts(247,20): error TS2304: Cannot find name 'vi'.
Error: src/__tests__/stores.test.ts(255,62): error TS2304: Cannot find name 'vi'.
Error: src/__tests__/stores.test.ts(256,62): error TS2304: Cannot find name 'vi'.
Error: src/__tests__/stores.test.ts(263,20): error TS2304: Cannot find name 'vi'.
Error: src/__tests__/stores.test.ts(273,62): error TS2304: Cannot find name 'vi'.
Error: src/__tests__/stores.test.ts(274,62): error TS2304: Cannot find name 'vi'.
Error: src/__tests__/stores.test.ts(283,62): error TS2304: Cannot find name 'vi'.
Error: src/__tests__/stores.test.ts(290,62): error TS2304: Cannot find name 'vi'.
Error: src/__tests__/stores.test.ts(300,62): error TS2304: Cannot find name 'vi'.
Error: src/components/CalendarImport/CalendarImport.tsx(3,75): error TS6133: 'Trash2' is declared but its value is never read.
Error: src/components/EnergyPlanning/EnergyPlanning.tsx(3,48): error TS6133: 'BatteryWarning' is declared but its value is never read.
Error: src/components/FocusMode/DistractionStats.tsx(2,33): error TS6133: 'TrendingDown' is declared but its value is never read.
Error: src/components/FocusMode/DistractionStats.tsx(18,55): error TS2345: Argument of type '(data: PomodoroSession[]) => void' is not assignable to parameter of type '(value: PomodoroSession[]) => void | PromiseLike<void>'.
  Types of parameters 'data' and 'value' are incompatible.
    Type 'import("/home/runner/work/sistemaestudiotareas/sistemaestudiotareas/src/types/index").PomodoroSession[]' is not assignable to type 'PomodoroSession[]'.
      Property 'completed' is missing in type 'import("/home/runner/work/sistemaestudiotareas/sistemaestudiotareas/src/types/index").PomodoroSession' but required in type 'PomodoroSession'.
Error: src/components/Gamification/AchievementShop.tsx(3,55): error TS6133: 'Palette' is declared but its value is never read.
Error: src/components/Gamification/AchievementShop.tsx(3,64): error TS6133: 'User' is declared but its value is never read.
Error: src/components/Gamification/AchievementShop.tsx(3,70): error TS6133: 'Zap' is declared but its value is never read.
Error: src/components/Gamification/AchievementShop.tsx(3,75): error TS6133: 'Shield' is declared but its value is never read.
Error: src/components/Gamification/AchievementShop.tsx(3,83): error TS6133: 'RotateCcw' is declared but its value is never read.
Error: src/components/Gamification/AchievementShop.tsx(3,94): error TS6133: 'Image' is declared but its value is never read.
Error: src/components/Gamification/AchievementShop.tsx(3,101): error TS6133: 'Volume2' is declared but its value is never read.
Error: src/components/Gamification/AchievementShop.tsx(6,1): error TS6133: 'Badge' is declared but its value is never read.
Error: src/components/Gamification/AvatarPet.tsx(1,31): error TS6133: 'useMemo' is declared but its value is never read.
Error: src/components/Gamification/AvatarPet.tsx(5,10): error TS6133: 'Zap' is declared but its value is never read.
Error: src/components/Gamification/AvatarPet.tsx(57,25): error TS6133: 'setLastStudyDate' is declared but its value is never read.
Error: src/components/Gamification/AvatarPet.tsx(58,10): error TS6133: 'showTooltip' is declared but its value is never read.
Error: src/components/Gamification/AvatarPet.tsx(91,21): error TS2322: Type '{ y: number[]; transition: { repeat: number; duration: number; ease: string; }; opacity?: undefined; } | { opacity: number[]; transition: { repeat: number; duration: number; ease: string; }; y?: undefined; } | { ...; }' is not assignable to type 'boolean | TargetAndTransition | VariantLabels | LegacyAnimationControls | undefined'.
  Type '{ y: number[]; transition: { repeat: number; duration: number; ease: string; }; opacity?: undefined; }' is not assignable to type 'boolean | TargetAndTransition | VariantLabels | LegacyAnimationControls | undefined'.
    Type '{ y: number[]; transition: { repeat: number; duration: number; ease: string; }; opacity?: undefined; }' is not assignable to type 'TargetAndTransition'.
      Type '{ y: number[]; transition: { repeat: number; duration: number; ease: string; }; opacity?: undefined; }' is not assignable to type '{ transition?: Transition<any> | undefined; transitionEnd?: ResolvedValues$1 | undefined; }'.
        Types of property 'transition' are incompatible.
          Type '{ repeat: number; duration: number; ease: string; }' is not assignable to type 'Transition<any> | undefined'.
            Type '{ repeat: number; duration: number; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
              Type '{ repeat: number; duration: number; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                Types of property 'ease' are incompatible.
                  Type 'string' is not assignable to type 'Easing | Easing[] | undefined'.
Error: src/components/Gamification/AvatarPet.tsx(112,15): error TS2322: Type '{ y: number[]; transition: { repeat: number; duration: number; ease: string; }; opacity?: undefined; } | { opacity: number[]; transition: { repeat: number; duration: number; ease: string; }; y?: undefined; } | { ...; }' is not assignable to type 'boolean | TargetAndTransition | VariantLabels | LegacyAnimationControls | undefined'.
  Type '{ y: number[]; transition: { repeat: number; duration: number; ease: string; }; opacity?: undefined; }' is not assignable to type 'boolean | TargetAndTransition | VariantLabels | LegacyAnimationControls | undefined'.
    Type '{ y: number[]; transition: { repeat: number; duration: number; ease: string; }; opacity?: undefined; }' is not assignable to type 'TargetAndTransition'.
      Type '{ y: number[]; transition: { repeat: number; duration: number; ease: string; }; opacity?: undefined; }' is not assignable to type '{ transition?: Transition<any> | undefined; transitionEnd?: ResolvedValues$1 | undefined; }'.
        Types of property 'transition' are incompatible.
          Type '{ repeat: number; duration: number; ease: string; }' is not assignable to type 'Transition<any> | undefined'.
            Type '{ repeat: number; duration: number; ease: string; }' is not assignable to type 'TransitionWithValueOverrides<any>'.
              Type '{ repeat: number; duration: number; ease: string; }' is not assignable to type 'ValueAnimationTransition<any>'.
                Types of property 'ease' are incompatible.
                  Type 'string' is not assignable to type 'Easing | Easing[] | undefined'.
Error: src/components/Gamification/SubjectStreaks.tsx(3,17): error TS6133: 'Calendar' is declared but its value is never read.
Error: src/components/Gamification/SubjectStreaks.tsx(5,1): error TS6133: 'Badge' is declared but its value is never read.
Error: src/components/Pomodoro/PomodoroTimer.tsx(80,21): error TS7006: Parameter 'prev' implicitly has an 'any' type.
Error: src/components/Reports/WeeklyPDFReport.tsx(2,63): error TS6133: 'CheckSquare' is declared but its value is never read.
Error: src/components/Reports/WeeklyPDFReport.tsx(2,76): error TS6133: 'Timer' is declared but its value is never read.
Error: src/components/Reports/WeeklyPDFReport.tsx(2,83): error TS6133: 'Activity' is declared but its value is never read.
Error: src/components/Reports/WeeklyPDFReport.tsx(2,93): error TS6133: 'Brain' is declared but its value is never read.
Error: src/components/Reports/WeeklyPDFReport.tsx(2,100): error TS6133: 'Trophy' is declared but its value is never read.
Error: src/components/Reports/WeeklyPDFReport.tsx(2,108): error TS6133: 'ListTodo' is declared but its value is never read.
Error: src/components/Reports/WeeklyPDFReport.tsx(3,1): error TS6192: All imports in import declaration are unused.
Error: src/components/Reports/WeeklyPDFReport.tsx(5,1): error TS6133: 'Badge' is declared but its value is never read.
Error: src/components/Reports/WeeklyPDFReport.tsx(74,23): error TS2345: Argument of type 'Task[]' is not assignable to parameter of type 'SetStateAction<Task[]>'.
  Type 'import("/home/runner/work/sistemaestudiotareas/sistemaestudiotareas/src/types/index").Task[]' is not assignable to type 'Task[]'.
    Type 'import("/home/runner/work/sistemaestudiotareas/sistemaestudiotareas/src/types/index").Task' is not assignable to type 'Task'.
      Types of property 'completed' are incompatible.
        Type 'number' is not assignable to type 'boolean'.
Error: src/components/Reports/WeeklyPDFReport.tsx(75,26): error TS2345: Argument of type 'PomodoroSession[]' is not assignable to parameter of type 'SetStateAction<PomodoroSession[]>'.
  Type 'import("/home/runner/work/sistemaestudiotareas/sistemaestudiotareas/src/types/index").PomodoroSession[]' is not assignable to type 'PomodoroSession[]'.
    Property 'completed' is missing in type 'import("/home/runner/work/sistemaestudiotareas/sistemaestudiotareas/src/types/index").PomodoroSession' but required in type 'PomodoroSession'.
Error: src/components/Reports/WeeklyPDFReport.tsx(87,11): error TS2774: This condition will always return true since this function is always defined. Did you mean to call it instead?
Error: src/components/Reports/WeeklyPDFReport.tsx(319,9): error TS6133: 'previewHTML' is declared but its value is never read.
Error: src/components/Settings/Settings.tsx(156,49): error TS2554: Expected 1 arguments, but got 2.
Error: src/components/SmartReminders/SmartReminders.tsx(3,91): error TS6133: 'ChevronUp' is declared but its value is never read.
Error: src/components/SmartReminders/SmartReminders.tsx(3,120): error TS6133: 'CheckCircle2' is declared but its value is never read.
Error: src/components/Social/SocialPage.tsx(2,18): error TS6133: 'AnimatePresence' is declared but its value is never read.
Error: src/components/Social/SocialPage.tsx(3,92): error TS6133: 'Medal' is declared but its value is never read.
Error: src/components/SpacedRepetition/ForgettingCurve.tsx(8,73): error TS6133: 'easeFactor' is declared but its value is never read.
Error: src/components/SpacedRepetition/ReviewDashboard.tsx(3,52): error TS6133: 'ChevronLeft' is declared but its value is never read.
Error: src/components/SpacedRepetition/ReviewDashboard.tsx(3,65): error TS6133: 'ChevronRight' is declared but its value is never read.
Error: src/components/SpacedRepetition/ReviewDashboard.tsx(6,1): error TS6133: 'Badge' is declared but its value is never read.
Error: src/components/SpacedRepetition/ReviewDashboard.tsx(7,1): error TS6133: 'Select' is declared but its value is never read.
Error: src/components/Statistics/Statistics.tsx(371,148): error TS18048: 'percent' is possibly 'undefined'.
Error: src/components/Statistics/Statistics.tsx(391,133): error TS18048: 'percent' is possibly 'undefined'.
Error: src/components/StudyMap/StudyMap.tsx(2,168): error TS6133: 'FileText' is declared but its value is never read.
Error: src/components/StudyMap/StudyMap.tsx(2,178): error TS6133: 'File' is declared but its value is never read.
Error: src/components/StudyMap/StudyMap.tsx(153,19): error TS2345: Argument of type '(prev: Record<number, StudyFile[]>) => { [x: number]: StudyFile[] | null; }' is not assignable to parameter of type 'SetStateAction<Record<number, StudyFile[]>>'.
  Type '(prev: Record<number, StudyFile[]>) => { [x: number]: StudyFile[] | null; }' is not assignable to type '(prevState: Record<number, StudyFile[]>) => Record<number, StudyFile[]>'.
    Type '{ [x: number]: StudyFile[] | null; }' is not assignable to type 'Record<number, StudyFile[]>'.
      'number' index signatures are incompatible.
        Type 'StudyFile[] | null' is not assignable to type 'StudyFile[]'.
          Type 'null' is not assignable to type 'StudyFile[]'.
Error: src/components/StudyMap/StudyMap.tsx(253,23): error TS2353: Object literal may only specify known properties, and 'ringColor' does not exist in type 'CSSProperties'.
Error: src/components/StudyMap/StudyMap.tsx(462,11): error TS6133: 'c1' is declared but its value is never read.
Error: src/components/StudyMap/StudyMap.tsx(463,11): error TS6133: 'c2' is declared but its value is never read.
Error: src/components/Sync/CloudSync.tsx(2,18): error TS6133: 'AnimatePresence' is declared but its value is never read.
Error: src/components/Sync/CloudSync.tsx(3,25): error TS6133: 'RefreshCw' is declared but its value is never read.
Error: src/components/Sync/CloudSync.tsx(3,36): error TS6133: 'CheckCircle2' is declared but its value is never read.
Error: src/components/Sync/CloudSync.tsx(7,1): error TS6133: 'Badge' is declared but its value is never read.
Error: src/components/TaskViews/TaskCalendarView.tsx(7,1): error TS6133: 'EmptyState' is declared but its value is never read.
Error: src/components/TaskViews/TaskCalendarView.tsx(27,9): error TS6133: 't' is declared but its value is never read.
Error: src/components/TaskViews/TaskTableView.tsx(1,40): error TS6133: 'useCallback' is declared but its value is never read.
Error: src/components/TaskViews/TaskTableView.tsx(2,18): error TS6133: 'AnimatePresence' is declared but its value is never read.
Error: src/components/TaskViews/TaskTableView.tsx(36,9): error TS6133: 't' is declared but its value is never read.
Error: src/components/TaskViews/TaskTimelineView.tsx(7,1): error TS6133: 'EmptyState' is declared but its value is never read.
Error: src/components/TaskViews/TaskTimelineView.tsx(25,9): error TS6133: 't' is declared but its value is never read.
Error: Process completed with exit code 2.
```

---

## Objetivo del trabajo

Corregir todos los errores de TypeScript mostrados por `npm run typecheck` hasta que el comando finalice correctamente con código de salida `0`.

---

## Reglas obligatorias

1. **No silenciar errores**
   - No usar `@ts-ignore`.
   - No usar `@ts-expect-error` salvo justificación técnica explícita.
   - No usar `any` para ocultar errores.
   - No desactivar `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitAny`, etc.

2. **Mantener comportamiento runtime**
   - No romper funcionalidad existente.
   - No cambiar firmas públicas si no es necesario.
   - Si se cambia una firma IPC o de API, actualizar también implementación, tipos, tests y consumidores.

3. **Hacer cambios mínimos y verificables**
   - Corregir por fases.
   - No refactorizar innecesariamente.
   - No cambiar formato completo de archivos salvo que sea necesario.

4. **Respetar buenas prácticas**
   - Tipos claros.
   - Una sola fuente de verdad para tipos de dominio.
   - Mapeo explícito entre datos persistidos/IPC y tipos de UI.
   - Código limpio y mantenible.

5. **Si falta información**
   - Si se necesita el contenido exacto de un archivo para hacer un cambio seguro, pedirlo.
   - No inventar nombres de funciones, interfaces, imports o exports.
   - Se puede proponer un patch tentativo marcado como “supuesto”.

---

## Análisis de causa raíz

Los errores se agrupan en estas categorías:

### 1. Variables e imports no usados

Errores `TS6133` y `TS6192`.

Ejemplos de elementos no usados:

```text
KEYBOARD_SHORTCUTS
setTaskViewMode
type
Trash2
BatteryWarning
TrendingDown
Palette
User
Zap
Shield
RotateCcw
Image
Volume2
Badge
useMemo
setLastStudyDate
showTooltip
Calendar
CheckSquare
Timer
Activity
Brain
Trophy
ListTodo
previewHTML
ChevronUp
CheckCircle2
AnimatePresence
Medal
easeFactor
ChevronLeft
ChevronRight
Select
percent
FileText
File
c1
c2
RefreshCw
EmptyState
useCallback
t
```

Estos deben eliminarse si realmente no se usan.

---

### 2. Configuración de Vitest

Errores:

```text
Cannot find name 'vi'.
```

TypeScript no reconoce `vi` como global de Vitest.

Solución preferida:

Agregar `vitest/globals` a `compilerOptions.types` en `tsconfig.json` o en el tsconfig usado para tests.

Ejemplo:

```json
{
  "compilerOptions": {
    "types": ["node", "vitest/globals"]
  }
}
```

Alternativa mínima:

Importar explícitamente en `src/__tests__/stores.test.ts`:

```ts
import { vi } from 'vitest';
```

---

### 3. Objeto con propiedad duplicada

Error:

```text
src/__tests__/api-comprehensive.test.ts(17,439): error TS1117:
An object literal cannot have multiple properties with the same name.
```

Hay una propiedad repetida en un object literal. Se debe eliminar o renombrar la propiedad duplicada.

Recomendación: formatear el archivo para visualizar el problema:

```bash
npx prettier --write src/__tests__/api-comprehensive.test.ts
```

---

### 4. Valores posiblemente undefined

Errores:

```text
'streak' is possibly 'undefined'.
'retrieved' is possibly 'undefined'.
'percent' is possibly 'undefined'.
```

Se deben añadir guardas explícitas o nullish coalescing.

Ejemplos recomendados:

```ts
expect(streak).toBeDefined();

if (!streak) {
  throw new Error('streak should be defined');
}
```

```ts
const safePercent = percent ?? 0;
```

Evitar usar `!` como primera opción.

---

### 5. Cantidad incorrecta de argumentos

Errores:

```text
Expected 1 arguments, but got 2.
```

Archivos afectados:

```text
src/__tests__/flashcards-ipc.test.ts
src/components/Settings/Settings.tsx
```

Hay funciones que están definidas para recibir un solo argumento, pero se están llamando con dos.

Se debe inspeccionar la firma real y decidir:

- Si la implementación espera un objeto único, cambiar los callers.
- Si la implementación espera dos argumentos, cambiar la firma tipada.
- Mantener coherencia entre implementación, tipos y tests.

---

### 6. Tipos incompatibles entre modelos de dominio

Errores relevantes:

```text
Property 'completed' is missing in type PomodoroSession but required in type PomodoroSession.
Type 'number' is not assignable to type 'boolean'.
```

Esto indica que hay duplicidad o inconsistencia entre:

- Tipos globales en `src/types/index.ts`.
- Tipos locales en componentes.
- Tipos de base de datos o DTO.
- Tipos de UI.

Debe establecerse una sola fuente de verdad.

---

### 7. Animaciones de Framer Motion mal tipadas

Errores en:

```text
src/components/Gamification/AvatarPet.tsx
```

El valor `ease: string` no es asignable a `Easing`.

Solución:

- Usar `Variants`.
- Usar `TargetAndTransition`.
- Usar `as const` para literales de animación.

---

### 8. Parámetro `prev` sin tipo

Error:

```text
src/components/Pomodoro/PomodoroTimer.tsx(80,21): error TS7006:
Parameter 'prev' implicitly has an 'any' type.
```

El estado asociado debe estar tipado correctamente.

---

### 9. Condición sobre función siempre verdadera

Error:

```text
src/components/Reports/WeeklyPDFReport.tsx(87,11): error TS2774:
This condition will always return true since this function is always defined.
Did you mean to call it instead?
```

Probablemente se está evaluando una función sin invocarla.

Debe decidirse entre:

```ts
if (typeof fn === 'function')
```

o:

```ts
if (fn())
```

---

### 10. Estado incompatible con `null`

Error:

```text
src/components/StudyMap/StudyMap.tsx(153,19)
Type 'StudyFile[] | null' is not assignable to type 'StudyFile[]'.
```

El estado está tipado como `Record<number, StudyFile[]>`, pero se intenta asignar `null`.

Soluciones posibles:

- Usar `[]` en vez de `null`.
- Cambiar el tipo a `Record<number, StudyFile[] | null>` y actualizar consumidores.
- Eliminar la clave del objeto.

---

### 11. Propiedad CSS inválida

Error:

```text
'ringColor' does not exist in type 'CSSProperties'.
```

`ringColor` no es una propiedad CSS estándar.

Si es Tailwind, usar variable CSS:

```ts
style={{ '--tw-ring-color': color } as React.CSSProperties}
```

Si es prop de componente, no debe ir dentro de `style`.

---

## Plan de corrección paso a paso

Se debe ejecutar el trabajo en el siguiente orden.

---

# Fase 1: Configuración de TypeScript y Vitest

## Tarea 1.1

Revisar `tsconfig.json` o el tsconfig usado por `npm run typecheck`.

## Tarea 1.2

Asegurar que los tests tienen tipos de Vitest.

Prioridad:

Si el proyecto ya usa globals de Vitest, agregar:

```json
"types": ["node", "vitest/globals"]
```

Si ya existe un array `types`, añadir `"vitest/globals"`.

Ejemplo:

```json
{
  "compilerOptions": {
    "types": ["node", "vitest/globals"]
  }
}
```

## Tarea 1.3

Si no se desea modificar `tsconfig`, importar explícitamente:

```ts
import { vi } from 'vitest';
```

en:

```text
src/__tests__/stores.test.ts
```

---

# Fase 2: Corregir tests con errores de tipo

## Archivo: `src/__tests__/api-comprehensive.test.ts`

### Error 2.1

```text
TS1117: An object literal cannot have multiple properties with the same name.
```

Acción:

- Abrir línea 17.
- Formatear el archivo si es necesario.
- Buscar la propiedad duplicada.
- Eliminar la propiedad repetida o renombrarla si corresponde.

### Error 2.2

```text
'streak' is possibly 'undefined'.
```

Acción:

Añadir guarda antes de usar `streak`.

Patrón recomendado:

```ts
expect(streak).toBeDefined();

if (!streak) {
  throw new Error('streak should be defined');
}
```

### Error 2.3

```text
'retrieved' is possibly 'undefined'.
```

Acción:

Añadir guarda antes de usar `retrieved`.

Patrón recomendado:

```ts
expect(retrieved).toBeDefined();

if (!retrieved) {
  throw new Error('retrieved should be defined');
}
```

---

## Archivo: `src/__tests__/flashcards-ipc.test.ts`

Errores:

```text
Expected 1 arguments, but got 2.
```

Líneas afectadas:

```text
130
149
150
154
```

Acción:

1. Buscar la definición real de la función llamada.
2. Revisar si espera:
   - un solo objeto, o
   - dos parámetros separados.
3. Alinear tests con la firma real.

Ejemplo si espera un solo objeto:

```ts
await api.flashcards.update({
  id,
  patch,
});
```

Ejemplo si deben ser dos parámetros:

```ts
await api.flashcards.update(id, patch);
```

Pero en ese caso la interfaz debe ser:

```ts
update(id: string, patch: Partial<Flashcard>): Promise<void>;
```

No dejar inconsistencias.

---

## Archivo: `src/__tests__/stores.test.ts`

Errores:

```text
Cannot find name 'vi'.
```

Acción preferida:

Configurar `vitest/globals` en `tsconfig`.

Acción alternativa:

```ts
import { vi } from 'vitest';
```

---

# Fase 3: Unificar tipos de dominio

## Tarea 3.1

Revisar:

```text
src/types/index.ts
```

Debe ser la fuente única de tipos para:

```ts
Task
PomodoroSession
```

---

## Tarea 3.2

Asegurar que `Task` tenga un tipo coherente para `completed`.

Recomendación para dominio:

```ts
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Si la base de datos devuelve `number`, no cambiar el dominio a `number`. En su lugar, mapear:

```ts
completed: row.completed === 1
```

---

## Tarea 3.3

Asegurar que `PomodoroSession` incluya `completed` si la UI lo necesita.

Ejemplo:

```ts
export interface PomodoroSession {
  id: string;
  taskId?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  completed: boolean;
}
```

---

## Tarea 3.4

Eliminar interfaces locales duplicadas.

Buscar interfaces locales llamadas:

```ts
Task
PomodoroSession
```

en archivos como:

```text
src/components/FocusMode/DistractionStats.tsx
src/components/Reports/WeeklyPDFReport.tsx
```

Si existen, eliminarlas e importar desde:

```ts
import type { Task, PomodoroSession } from '../../types';
```

Ajustar ruta relativa según ubicación.

---

## Tarea 3.5

Si hay datos que vienen de IPC, SQLite, storage o API externa, crear mappers.

Ejemplo para Task:

```ts
import type { Task } from '../types';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  completed: number | boolean;
  created_at: string;
  updated_at: string;
}

export function mapTaskRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed:
      typeof row.completed === 'boolean'
        ? row.completed
        : row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

Ejemplo para PomodoroSession:

```ts
import type { PomodoroSession } from '../types';

interface PomodoroSessionRow {
  id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  completed: number | boolean;
}

export function mapPomodoroSessionRowToPomodoroSession(
  row: PomodoroSessionRow,
): PomodoroSession {
  return {
    id: row.id,
    taskId: row.task_id ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    durationSeconds: row.duration_seconds,
    completed:
      typeof row.completed === 'boolean'
        ? row.completed
        : row.completed === 1,
  };
}
```

---

# Fase 4: Corregir imports y variables no usados

Eliminar imports, variables, estados o parámetros no usados.

A continuación se listan acciones específicas.

---

## `src/App.tsx`

Errores:

```text
KEYBOARD_SHORTCUTS
setTaskViewMode
type
```

Acciones:

1. Eliminar import de `KEYBOARD_SHORTCUTS` si no se usa.
2. Si `setTaskViewMode` no se usa:

```ts
const [taskViewMode] = useState<TaskViewMode>('list');
```

3. Si `type` no se usa:
   - eliminarlo de la desestructuración, o
   - renombrarlo a `_type` y usar `void _type;` solo si es estrictamente necesario.

---

## `src/components/CalendarImport/CalendarImport.tsx`

Eliminar:

```ts
Trash2
```

---

## `src/components/EnergyPlanning/EnergyPlanning.tsx`

Eliminar:

```ts
BatteryWarning
```

---

## `src/components/FocusMode/DistractionStats.tsx`

Eliminar:

```ts
TrendingDown
```

Además:

- Usar `PomodoroSession` compartido.
- No usar tipo local incompatible.

---

## `src/components/Gamification/AchievementShop.tsx`

Eliminar imports no usados:

```ts
Palette
User
Zap
Shield
RotateCcw
Image
Volume2
Badge
```

---

## `src/components/Gamification/AvatarPet.tsx`

Eliminar:

```ts
useMemo
Zap
setLastStudyDate
showTooltip
```

Si `setLastStudyDate` no se usa:

```ts
const [lastStudyDate] = useState<Date | null>(null);
```

Si `showTooltip` no se usa, eliminarlo.

Corregir animaciones Framer Motion.

Opción recomendada:

```ts
import type { Variants } from 'framer-motion';

const petVariants: Variants = {
  idle: {
    y: [0, -4, 0],
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'easeInOut',
    },
  },
  happy: {
    opacity: [0.6, 1, 0.6],
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'easeInOut',
    },
  },
};
```

Si se usan objetos inline:

```ts
const animation = {
  y: [0, -4, 0],
  transition: {
    repeat: Infinity,
    duration: 2,
    ease: 'easeInOut' as const,
  },
};
```

---

## `src/components/Gamification/SubjectStreaks.tsx`

Eliminar:

```ts
Calendar
Badge
```

---

## `src/components/Pomodoro/PomodoroTimer.tsx`

Error:

```text
Parameter 'prev' implicitly has an 'any' type.
```

Acción:

Tipar el estado.

Ejemplos:

```ts
const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
```

```ts
setSecondsLeft(prev => prev - 1);
```

Si es objeto:

```ts
interface PomodoroState {
  isRunning: boolean;
  secondsLeft: number;
}

const [state, setState] = useState<PomodoroState>({
  isRunning: false,
  secondsLeft: 25 * 60,
});
```

---

## `src/components/Reports/WeeklyPDFReport.tsx`

Eliminar imports no usados:

```ts
CheckSquare
Timer
Activity
Brain
Trophy
ListTodo
Badge
previewHTML
```

Eliminar import completo si corresponde:

```text
line 3: All imports in import declaration are unused.
```

Corregir tipos:

- Usar `Task` compartido.
- Usar `PomodoroSession` compartido.
- No usar interfaces locales incompatibles.

Corregir condición de función.

Si se tiene:

```ts
if (someFunction) {
```

Debe cambiarse por una de estas dos opciones:

```ts
if (typeof someFunction === 'function') {
```

o, si se desea ejecutar:

```ts
if (someFunction()) {
```

---

## `src/components/Settings/Settings.tsx`

Error:

```text
Expected 1 arguments, but got 2.
```

Acción:

Revisar línea 156.

Si la función espera un objeto:

```ts
updateSetting({ key, value });
```

Si la función debe aceptar dos argumentos:

```ts
updateSetting(key, value);
```

Pero entonces actualizar la firma tipada.

---

## `src/components/SmartReminders/SmartReminders.tsx`

Eliminar:

```ts
ChevronUp
CheckCircle2
```

---

## `src/components/Social/SocialPage.tsx`

Eliminar:

```ts
AnimatePresence
Medal
```

---

## `src/components/SpacedRepetition/ForgettingCurve.tsx`

Eliminar:

```ts
easeFactor
```

Si se omite intencionalmente en destructuring:

```ts
const { easeFactor: _easeFactor, ...rest } = data;
void _easeFactor;
```

Pero preferir eliminación limpia.

---

## `src/components/SpacedRepetition/ReviewDashboard.tsx`

Eliminar:

```ts
ChevronLeft
ChevronRight
Badge
Select
```

---

## `src/components/Statistics/Statistics.tsx`

Errores:

```text
'percent' is possibly 'undefined'.
```

Acción:

Usar valor por defecto:

```ts
const safePercent = percent ?? 0;
```

En JSX:

```tsx
{(percent ?? 0).toFixed(1)}%
```

---

## `src/components/StudyMap/StudyMap.tsx`

Eliminar:

```ts
FileText
File
c1
c2
```

Corregir estado:

Error:

```ts
Record<number, StudyFile[] | null>
```

no compatible con:

```ts
Record<number, StudyFile[]>
```

Decisión recomendada:

Si `null` significa “vacío”, usar array vacío:

```ts
setFilesByTopic(prev => ({
  ...prev,
  [topicId]: [],
}));
```

Si `null` tiene significado explícito, cambiar tipo:

```ts
const [filesByTopic, setFilesByTopic] = useState<
  Record<number, StudyFile[] | null>
>({});
```

Pero actualizar todos los consumidores.

Corregir `ringColor`:

Si es Tailwind:

```tsx
style={
  {
    '--tw-ring-color': color,
  } as React.CSSProperties
}
```

Si es prop de componente:

```tsx
<Component ringColor={color} />
```

No usar `ringColor` dentro de `style`.

---

## `src/components/Sync/CloudSync.tsx`

Eliminar:

```ts
AnimatePresence
RefreshCw
CheckCircle2
Badge
```

---

## `src/components/TaskViews/TaskCalendarView.tsx`

Eliminar:

```ts
EmptyState
t
```

---

## `src/components/TaskViews/TaskTableView.tsx`

Eliminar:

```ts
useCallback
AnimatePresence
t
```

---

## `src/components/TaskViews/TaskTimelineView.tsx`

Eliminar:

```ts
EmptyState
t
```

---

# Fase 5: Verificación

Después de aplicar cambios, verificar:

```bash
npm run typecheck
```

Resultado esperado:

```text
exit code 0
```

Luego, si el proyecto tiene lint:

```bash
npm run lint
```

Y si tiene tests:

```bash
npm run test -- --run
```

---

# Criterios de aceptación

La corrección se considerará completa cuando:

1. `npm run typecheck` finaliza con código de salida `0`.
2. No se introdujeron `any` para silenciar errores.
3. No se usó `@ts-ignore` sin justificación.
4. No se eliminó funcionalidad existente accidentalmente.
5. Los tipos `Task` y `PomodoroSession` tienen una fuente única o están claramente mapeados.
6. Los tests son compatibles con TypeScript.
7. No quedan imports no usados.
8. Las firmas de funciones IPC/API son coherentes con sus llamadas.
9. Las animaciones de Framer Motion están correctamente tipadas.
10. No se introducen nuevos errores de lint o tests.

---

# Formato de respuesta esperado

El modelo o desarrollador que ejecute la corrección debe responder con el siguiente formato:

## 1. Resumen ejecutivo

Explicar brevemente qué se corrigió.

## 2. Supuestos

Lista de supuestos si faltó información.

## 3. Cambios por archivo

Para cada archivo modificado, mostrar:

- Ruta del archivo.
- Motivo del cambio.
- Cambio aplicado.
- Fragmento de código o diff.

Ejemplo:

```diff
- import { Trash2 } from 'lucide-react';
+ // import eliminado porque no era usado
```

## 4. Cambios de configuración

Indicar si se modificó:

```text
tsconfig.json
tsconfig.test.json
vitest.config.ts
package.json
```

## 5. Verificación

Comandos ejecutados o recomendados:

```bash
npm run typecheck
npm run lint
npm run test -- --run
```

## 6. Pendientes

Lista de cualquier punto que requiera intervención manual o revisión humana.

---

# Restricciones adicionales

- No instalar dependencias nuevas salvo que sea estrictamente necesario.
- No modificar `package.json` salvo que sea indispensable.
- No cambiar la arquitectura completa del proyecto.
- No hacer reescrituras masivas.
- Priorizar cambios pequeños, seguros y verificables.
- Si el cambio requiere modificar muchos archivos, proponerlo por fases.

---

# Punto de inicio recomendado

Comenzar por:

1. Corregir configuración de Vitest/TypeScript.
2. Corregir errores de tests.
3. Unificar tipos `Task` y `PomodoroSession`.
4. Eliminar imports/variables no usados.
5. Corregir errores específicos restantes.
6. Verificar con `npm run typecheck`.

---

# Instrucción final

Corregir el proyecto paso a paso siguiendo este reporte. Si se necesita el contenido de algún archivo para realizar una corrección exacta, solicitar el archivo correspondiente antes de proponer un cambio definitivo.