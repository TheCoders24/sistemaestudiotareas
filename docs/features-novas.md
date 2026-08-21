# Nuevas Características Propuestas

---

## Feature 1: 🔐 Bóveda Segura (Secure Vault)  

Gestor de credenciales y datos sensibles con cifrado AES-256-GCM local.

### Motivación
- **Ciberseguridad**: primera feature que aplica criptografía real (AES-256-GCM + PBKDF2)
- **Programador**: almacenar API keys, tokens, credenciales de servicios
- **Todos**: gestor de contraseñas sin depender de servicios cloud

### ¿Cómo funciona?

```
[Renderización]                    [Main Process]
      │                                  │
      ├── Master Password ─────────────► ├── PBKDF2 (100k iteraciones)
      │                                  │     └── Deriva AES-256 key
      │                                  │
      ├── Crear entrada ───────────────► ├── Cifra JSON con AES-256-GCM
      │   {title, username,              │     └── Guarda ciphertext + IV
      │    password, url, notes}         │
      │                                  │
      ├── Ver entrada ◄──────────────── ├── Descifra con misma clave
      │                                  │
      └── Auto-bloqueo ────────────────► └── Timer de inactividad
```

### Tablas Nuevas

```sql
CREATE TABLE vault_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,              -- credentials | api_keys | secure_notes | cards
  encrypted_data BLOB NOT NULL,        -- JSON cifrado
  iv BLOB NOT NULL,                    -- Vector de inicialización
  favorite INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE vault_master (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,         -- PBKDF2 (SHA-256, 100k iteraciones)
  salt BLOB NOT NULL,
  hint TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
```

### IPC Handlers Nuevos (9)

| Handler | Propósito |
|---|---|
| `vault:isLocked` | Verifica si la bóveda está bloqueada |
| `vault:unlock` | Verifica contraseña maestra y deriva clave |
| `vault:lock` | Bloquea la bóveda (borra clave de memoria) |
| `vault:setMasterPassword` | Primera configuración (hash + salt) |
| `vault:changeMasterPassword` | Cambiar contraseña (re-cifra todo) |
| `vault:getEntries` | Obtener lista de entradas (título + categoría, NO cifrado) |
| `vault:getEntry` | Obtener entrada descifrada (requiere unlocked) |
| `vault:createEntry` | Cifrar y guardar nueva entrada |
| `vault:updateEntry` | Actualizar entrada (re-cifrar) |
| `vault:deleteEntry` | Eliminar entrada |
| `vault:generatePassword` | Generar contraseña segura (longitud, símbolos, etc.) |
| `vault:checkStrength` | Evaluar fortaleza de una contraseña |

### Componentes Nuevos (6)

| Componente | Propósito |
|---|---|
| `Vault/VaultPage.tsx` | Pestaña principal con lista de entradas por categoría |
| `Vault/VaultUnlock.tsx` | Pantalla de desbloqueo (al iniciar / tras auto-lock) |
| `Vault/VaultSetup.tsx` | Creación inicial de contraseña maestra (con hint) |
| `Vault/VaultEntryCard.tsx` | Tarjeta con reveal toggle y copiar al portapapeles |
| `Vault/VaultEntryForm.tsx` | Modal crear/editar con password generator integrado |
| `Vault/PasswordGenerator.tsx` | Mini-generador de contraseñas configurables |

### Integración
- Nuevo tab en la navbar: `Vault` con icono `Shield`/`Lock`
- Atajo de teclado: `Ctrl+Shift+V`
- Timeout de auto-bloqueo configurable en Settings
- Las contraseñas generadas se pueden copiar al portapapeles

### Crypto Details
- **Algoritmo**: AES-256-GCM (autenticado)
- **Key derivation**: PBKDF2 con SHA-256, 100k iteraciones, salt aleatorio (32 bytes)
- **IV**: 12 bytes aleatorios por cada entrada
- **Almacenamiento**: ciphertext + IV en BLOB, nunca la clave
- **Clave en memoria**: solo mientras está desbloqueada, en variable local del handler

### Esfuerzo Estimado
- DB: 2 tablas + migración
- Main: ~100 líneas (crypto + handlers)
- Preload: 12 métodos
- Componentes: ~6 archivos (~350 líneas)
- **Total: ~3-4 días de desarrollo**

---

## Feature 2: 💻 Code Challenge Tracker

Seguimiento de ejercicios de programación (LeetCode, HackerRank, Codeforces, etc.).

### Motivación
- **Programador**: llevar registro de problemas resueltos con estadísticas
- **Estudio**: repaso espaciado de problemas difíciles (reusa SM-2)
- **Todos**: cualquiera que estudie programación

### Tablas Nuevas

```sql
CREATE TABLE challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,          -- leetcode / hackerrank / codewars / codeforces / etc
  difficulty TEXT DEFAULT 'media', -- facil / media / dificil
  url TEXT DEFAULT '',
  language TEXT DEFAULT '',
  solution_code TEXT DEFAULT '',
  solution_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pendiente', -- pendiente / intentado / resuelto / revision
  time_spent INTEGER DEFAULT 0,    -- minutos
  solved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE challenge_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL,
  topic TEXT NOT NULL,             -- arrays, strings, dp, graphs, trees, etc
  FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
);

CREATE INDEX idx_challenges_platform ON challenges(platform);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_solved ON challenges(solved_at);
CREATE INDEX idx_challenge_topics_topic ON challenge_topics(topic);
```

### IPC Handlers Nuevos (8)

| Handler | Propósito |
|---|---|
| `challenges:getAll` | Lista con filtros (platform, difficulty, status, topic) |
| `challenges:create` | Crear nuevo challenge |
| `challenges:update` | Actualizar challenge |
| `challenges:delete` | Eliminar challenge |
| `challenges:getById` | Obtener detalle completo |
| `challenges:getStats` | Estadísticas agregadas (por período) |
| `challenges:getTopics` | Lista de topics únicos (para filtro) |
| `challenges:getDueReviews` | Challenges a repasar (integración SM-2 opcional) |

### Componentes Nuevos (6)

| Componente | Propósito |
|---|---|
| `Challenges/ChallengesPage.tsx` | Lista con búsqueda y filtros (platform, difficulty, topic, status) |
| `Challenges/ChallengeCard.tsx` | Tarjeta resumen con plataforma + dificultad + estado |
| `Challenges/ChallengeForm.tsx` | Modal crear/editar con editor de código |
| `Challenges/ChallengeDetail.tsx` | Vista detalle con solución + notas + código |
| `Challenges/ChallengeStats.tsx` | Gráficos: problemas por plataforma, dificultad, heatmap diario |
| `Challenges/ChallengeStudyMode.tsx` | Modo repaso: muestra problema al azar entre no resueltos |

### Integración
- Nuevo tab: `Challenges` con icono `Code`/`Terminal`
- Atajo: `Ctrl+Shift+C`
- **Stats**: widgets en Dashboard con problemas resueltos hoy/semana
- **Spaced Repetition**: reusa el algoritmo SM-2 de Flashcards para programar repasos
- **Tags**: reusa el sistema de tags existente

### Esfuerzo Estimado
- DB: 2 tablas + 3 índices + migración
- Main: ~50 líneas (handlers)
- Preload: 8 métodos
- Componentes: ~6 archivos (~300 líneas)
- **Total: ~2-3 días de desarrollo**

---

## Feature 3: 🛡️ Security Dashboard

Panel de herramientas de ciberseguridad integradas.

### Componentes

| Herramienta | Descripción |
|---|---|
| **Password Strength Analyzer** | Evalúa contraseñas con reglas configurables |
| **Hash Generator** | Genera hashes (MD5, SHA-1, SHA-256, SHA-512) de textos |
| **Text Encoder/Decoder** | Base64, URL, Hex, etc. |
| **Port Scanner (educativo)** | Simula escaneo de puertos comunes en localhost |
| **Security Checklist** | Lista de verificación de buenas prácticas |
| **CTF Tracker** | Registro de CTFs: nombre, plataforma, writeup, flags |

### Esfuerzo Estimado: ~4-5 días

---

## Feature 4: 📚 Reading List / Resource Manager

Seguimiento de libros, cursos y artículos.

### Tabla Nueva
```sql
CREATE TABLE resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,            -- book / course / article / video
  url TEXT DEFAULT '',
  author TEXT DEFAULT '',
  status TEXT DEFAULT 'pendiente', -- pendiente / leyendo / terminado / abandonado
  rating INTEGER,                -- 1-5
  notes TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Esfuerzo Estimado: ~1-2 días

---

## Feature 5: 📊 Dashboard Personalizable

Widgets seleccionables por el usuario en la página principal.

### Widgets Disponibles
- Frase del día / motivación
- Clima (API gratuita)
- Tareas próximas con vencimiento
- Progreso de metas del día
- Pomodoros de hoy
- Nota rápida / sticky note
- Calendario mensual minimalista

### Esfuerzo Estimado: ~2-3 días

---

## Tabla Comparativa de Esfuerzo

| Feature | Días estimados | Dependencias | Impacto |
|---|---|---|---|
| 🔐 Bóveda Segura | 3-4 | Web Crypto API | Alto (seguridad) |
| 💻 Code Challenge Tracker | 2-3 | Ninguna | Alto (programador) |
| 🛡️ Security Dashboard | 4-5 | crypto módulo | Medio |
| 📚 Reading List | 1-2 | Ninguna | Medio |
| 📊 Dashboard Widgets | 2-3 | Ninguna | Medio |

**Recomendación inicial**: Empezar con **Bóveda Segura** (valor único, sin competencia en la app) o **Code Challenge Tracker** (complementa el flujo de programador, esfuerzo medio).
