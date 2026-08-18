/**
 * ============================================================================
 *  mockApi.ts — Mock en memoria de `window.electronAPI`
 * ============================================================================
 *
 *  Espeja la MISMA forma anidada que expone `electron/preload.js` (los
 *  handlers IPC reales quedan fuera del alcance de jsdom). Se usa como fuente
 *  de datos para los tests CRUD y para montar componentes de React.
 *
 *  Forma esperada (igual al preload real):
 *    - namespaces anidados  ->  electronAPI.tasks.subtasks.create(...)
 *    - funciones hoja       ->  devuelven Promise
 *    - sin wrapper {ok,...} ->  devuelven el valor crudo
 *
 *  Cada llamada `createMockApi()` devuelve un árbol independiente con su
 *  propio estado (para que cada test arranque "en cero").
 * ============================================================================
 */

export interface MockElectronApi {
  settings: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<boolean>
  }
  tasks: {
    list: () => Promise<any[]>
    listWithSubtasks: () => Promise<any[]>
    create: (task: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<boolean>
    toggle: (id: number) => Promise<any>
    reorder: (orderedIds: number[]) => Promise<boolean>
    addTag: (taskId: number, tag: string) => Promise<boolean>
    removeTag: (taskId: number, tag: string) => Promise<boolean>
    getByTag: (tag: string) => Promise<any[]>
  }
  subtasks: {
    list: (taskId: number) => Promise<any[]>
    create: (subtask: any) => Promise<any>
    toggle: (id: number) => Promise<any>
    delete: (id: number) => Promise<boolean>
  }
  kanban: {
    cards: {
      list: () => Promise<any[]>
      create: (card: any) => Promise<any>
      update: (id: number, data: any) => Promise<any>
      delete: (id: number) => Promise<boolean>
      move: (id: number, column: string, position: number) => Promise<any>
    }
  }
  notes: {
    list: () => Promise<any[]>
    create: (note: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<boolean>
  }
  projects: {
    list: () => Promise<any[]>
    create: (proj: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<boolean>
  }
  habits: {
    list: () => Promise<any[]>
    create: (habit: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<boolean>
    logs: {
      list: (habitId: number) => Promise<any[]>
      listAll: () => Promise<any[]>
      toggle: (habitId: number, date: string) => Promise<boolean>
    }
    stats: () => Promise<any[]>
  }
  goals: {
    list: () => Promise<any[]>
    create: (goal: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<boolean>
    progress: {
      add: (goalId: number, date: string, value: number) => Promise<boolean>
      get: (goalId: number, date: string) => Promise<number>
    }
  }
  snippets: {
    list: () => Promise<any[]>
    create: (snippet: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<boolean>
  }
  pomodoro: {
    sessions: {
      list: (date?: string) => Promise<any[]>
      create: (session: any) => Promise<any>
    }
  }
  study: {
    topics: {
      list: () => Promise<any[]>
      create: (topic: any) => Promise<any>
      update: (id: number, data: any) => Promise<any>
      delete: (id: number) => Promise<boolean>
      move: (id: number, direction: 'up' | 'down') => Promise<boolean>
      toggleProgress: (topicId: number, date?: string) => Promise<{ completed: boolean }>
      setLevel: (topicId: number, level: number) => Promise<boolean>
    }
    files: {
      pickAndUpload: (topicId: number) => Promise<any>
      list: (topicId: number) => Promise<any[]>
      delete: (fileId: number) => Promise<boolean>
      open: (fileId: number) => Promise<boolean>
    }
    stats: () => Promise<{ levels: { study_level: number; count: number }[]; total: number }>
  }
  courses: {
    list: (wsId?: number) => Promise<any[]>
    create: (data: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<boolean>
    get: (id: number) => Promise<any>
  }
  search: (query: string) => Promise<any[]>
  gamification: {
    xp: {
      get: () => Promise<{ total: number; level: number; currentXp: number; nextLevelXp: number }>
      add: (amount: number, reason: string) => Promise<any>
    }
    achievements: {
      list: () => Promise<any[]>
      check: () => Promise<{ unlocked: any[]; leveledUp: boolean; newLevel: number }>
    }
    challenges: {
      list: () => Promise<any[]>
      updateProgress: (type: string, amount: number) => Promise<any>
    }
  }
  streaks: {
    get: (name: string) => Promise<any>
    update: (name: string) => Promise<any>
  }
  dailyLogs: {
    list: () => Promise<any[]>
    get: (date: string) => Promise<any>
    create: (log: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
  }
  trash: {
    list: () => Promise<{ tasks: any[]; notes: any[]; projects: any[] }>
    softDelete: (type: string, id: number) => Promise<boolean>
    restore: (type: string, id: number) => Promise<boolean>
    deletePermanent: (type: string, id: number) => Promise<boolean>
    empty: () => Promise<boolean>
  }
  export: {
    data: () => Promise<any>
    import: (data: any) => Promise<boolean>
    importJSON: (data: any) => Promise<boolean>
  }
  backup: {
    list: () => Promise<any[]>
    restore: (filename: string) => Promise<boolean>
  }
  stats: {
    get: (period: string) => Promise<any>
    weeklyReport: () => Promise<any>
  }
  dashboard: {
    get: () => Promise<any>
    activityFeed: () => Promise<any[]>
  }
  activity: {
    list: (limit?: number) => Promise<any[]>
  }
  app: {
    notification: {
      show: (title: string, body: string, severity?: string) => Promise<boolean>
    }
  }
}

export function createMockApi(): MockElectronApi {
  let taskId = 0
  let noteId = 0
  let projectId = 0
  let habitId = 0
  let goalId = 0
  let snippetId = 0
  let kanbanId = 0
  let dailyLogId = 0
  let subtaskId = 0
  let studyTopicId = 0
  let courseId = 0
  let studyFileId = 0

  const tasks: any[] = []
  const notes: any[] = []
  const projects: any[] = []
  const habits: any[] = []
  const habitLogs: any[] = []
  const goals: any[] = []
  const goalProgress: any[] = []
  const snippets: any[] = []
  const kanbanCards: any[] = []
  const dailyLogs: any[] = []
  const subtasks: any[] = []
  const settings: Record<string, string> = {}
  const streaks: Record<string, any> = {}
  const pomodoroSessions: any[] = []
  const xpLog: any[] = []
  const studyTopics: any[] = []
  const courses: any[] = []
  const studyProgress: any[] = []
  const studyFiles: any[] = []

  const nowIso = () => new Date().toISOString()

  return {
    settings: {
      get: async (key) => settings[key] || null,
      set: async (key, value) => { settings[key] = value; return true },
    },

    tasks: {
      list: async () => tasks.filter(t => !t.deleted),
      listWithSubtasks: async () => tasks.filter(t => !t.deleted).map(t => ({ ...t, subtasks: subtasks.filter(s => s.task_id === t.id) })),
      create: async (task) => {
        const t = {
          id: ++taskId,
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'media',
          completed: 0,
          due_date: task.due_date || null,
          reminder: task.reminder || null,
          project_id: task.project_id || null,
          repeat: task.repeat || null,
          tags: task.tags || '',
          position: tasks.length,
          deleted: 0,
          created_at: nowIso(),
          updated_at: nowIso(),
          ...task,
          id: taskId,
        }
        tasks.push(t)
        return t
      },
      update: async (id, data) => { const t = tasks.find(x => x.id === id); if (t) Object.assign(t, data); return t },
      delete: async (id) => { const t = tasks.find(x => x.id === id); if (t) t.deleted = 1; return true },
      toggle: async (id) => { const t = tasks.find(x => x.id === id); if (t) t.completed = t.completed ? 0 : 1; return t },
      reorder: async (ids) => { ids.forEach((id, i) => { const t = tasks.find(x => x.id === id); if (t) t.position = i }); return true },
      addTag: async (id, tag) => {
        const t = tasks.find(x => x.id === id)
        if (t) {
          const tags = t.tags ? String(t.tags).split(',').map((s: string) => s.trim()).filter(Boolean) : []
          if (!tags.includes(tag)) tags.push(tag)
          t.tags = tags.join(',')
        }
        return true
      },
      removeTag: async (id, tag) => {
        const t = tasks.find(x => x.id === id)
        if (t) {
          const tags = t.tags ? String(t.tags).split(',').map((s: string) => s.trim()).filter(Boolean) : []
          t.tags = tags.filter((s: string) => s !== tag).join(',')
        }
        return true
      },
      getByTag: async (tag) => tasks.filter(t => !t.deleted && String(t.tags || '').split(',').map(s => s.trim()).includes(tag)),
    },

    subtasks: {
      list: async (taskId) => subtasks.filter(s => s.task_id === taskId),
      create: async (sub) => {
        const s = {
          id: ++subtaskId,
          task_id: sub.task_id,
          title: sub.title,
          completed: 0,
          position: subtasks.filter(x => x.task_id === sub.task_id).length,
          created_at: nowIso(),
        }
        subtasks.push(s)
        return s
      },
      toggle: async (id) => { const s = subtasks.find(x => x.id === id); if (s) s.completed = s.completed ? 0 : 1; return s },
      delete: async (id) => { const idx = subtasks.findIndex(x => x.id === id); if (idx >= 0) subtasks.splice(idx, 1); return true },
    },

    kanban: {
      cards: {
        list: async () => kanbanCards,
        create: async (card) => {
          const c = { id: ++kanbanId, ...card, position: card.position || 0, created_at: nowIso(), updated_at: nowIso() }
          kanbanCards.push(c)
          return c
        },
        update: async (id, data) => { const c = kanbanCards.find(x => x.id === id); if (c) Object.assign(c, data); return c },
        delete: async (id) => { const idx = kanbanCards.findIndex(x => x.id === id); if (idx >= 0) kanbanCards.splice(idx, 1); return true },
        move: async (id, column, position) => { const c = kanbanCards.find(x => x.id === id); if (c) { c.column_type = column; c.position = position } return c },
      },
    },

    notes: {
      list: async () => notes.filter(n => !n.deleted),
      create: async (note) => {
        const n = { id: ++noteId, title: note.title || 'Untitled', content: note.content || '', project_id: note.project_id || null, deleted: 0, created_at: nowIso(), updated_at: nowIso() }
        notes.push(n)
        return n
      },
      update: async (id, data) => { const n = notes.find(x => x.id === id); if (n) Object.assign(n, data); return n },
      delete: async (id) => { const n = notes.find(x => x.id === id); if (n) n.deleted = 1; return true },
    },

    projects: {
      list: async () => projects.filter(p => !p.deleted),
      create: async (proj) => {
        const p = {
          id: ++projectId,
          name: proj.name,
          description: proj.description || '',
          status: proj.status || 'activo',
          tech_stack: proj.tech_stack || '',
          repo_url: proj.repo_url || '',
          color: proj.color || '#6366f1',
          deleted: 0,
          created_at: nowIso(),
          updated_at: nowIso(),
        }
        projects.push(p)
        return p
      },
      update: async (id, data) => { const p = projects.find(x => x.id === id); if (p) Object.assign(p, data); return p },
      delete: async (id) => { const p = projects.find(x => x.id === id); if (p) p.deleted = 1; return true },
    },

    habits: {
      list: async () => habits,
      create: async (habit) => {
        const h = { id: ++habitId, name: habit.name, icon: habit.icon || 'check', color: habit.color || '#6366f1', frequency: habit.frequency || 'daily', created_at: nowIso() }
        habits.push(h)
        return h
      },
      update: async (id, data) => { const h = habits.find(x => x.id === id); if (h) Object.assign(h, data); return h },
      delete: async (id) => { const idx = habits.findIndex(x => x.id === id); if (idx >= 0) habits.splice(idx, 1); return true },
      logs: {
        list: async (habitId) => habitLogs.filter(h => h.habit_id === habitId),
        listAll: async () => [...habitLogs],
        toggle: async (habitId, date) => {
          const existing = habitLogs.find(h => h.habit_id === habitId && h.date === date)
          if (existing) {
            habitLogs.splice(habitLogs.indexOf(existing), 1)
            return false
          }
          habitLogs.push({ id: habitLogs.length + 1, habit_id: habitId, date, completed: 1 })
          return true
        },
      },
      stats: async () => habits.map(h => ({ ...h, totalDays: 0, thisMonth: 0, todayDone: false })),
    },

    goals: {
      list: async () => goals,
      create: async (goal) => { const g = { id: ++goalId, ...goal, created_at: nowIso() }; goals.push(g); return g },
      update: async (id, data) => { const g = goals.find(x => x.id === id); if (g) Object.assign(g, data); return g },
      delete: async (id) => { const idx = goals.findIndex(x => x.id === id); if (idx >= 0) goals.splice(idx, 1); return true },
      progress: {
        add: async (goalId, date, value) => { goalProgress.push({ id: goalProgress.length + 1, goal_id: goalId, date, value }); return true },
        get: async (goalId, date) => goalProgress.filter(g => g.goal_id === goalId && g.date === date).reduce((sum, g) => sum + g.value, 0),
      },
    },

    snippets: {
      list: async () => snippets,
      create: async (snippet) => { const s = { id: ++snippetId, ...snippet, created_at: nowIso() }; snippets.push(s); return s },
      update: async (id, data) => { const s = snippets.find(x => x.id === id); if (s) Object.assign(s, data); return s },
      delete: async (id) => { const idx = snippets.findIndex(x => x.id === id); if (idx >= 0) snippets.splice(idx, 1); return true },
    },

    pomodoro: {
      sessions: {
        list: async () => pomodoroSessions,
        create: async (s) => { const ps = { id: pomodoroSessions.length + 1, ...s }; pomodoroSessions.push(ps); return ps },
      },
    },

    study: {
      topics: {
        list: async () => [...studyTopics].sort((a, b) => a.order_position - b.order_position),
        create: async (topic) => {
          const t = {
            id: ++studyTopicId,
            name: topic.name,
            description: topic.description || '',
            resource_url: topic.resource_url || '',
            parent_id: topic.parent_id ?? null,
            course_id: topic.course_id ?? null,
            workspace_id: topic.workspace_id ?? null,
            order_position: topic.order_position ?? studyTopics.length,
            study_level: 0,
            study_level_updated_at: null,
            created_at: nowIso(),
          }
          studyTopics.push(t)
          return t
        },
        update: async (id, data) => { const t = studyTopics.find(x => x.id === id); if (t) Object.assign(t, data); return t },
        delete: async (id) => { const idx = studyTopics.findIndex(x => x.id === id); if (idx >= 0) studyTopics.splice(idx, 1); return true },
        move: async (id, direction) => {
          const cur = studyTopics.find(x => x.id === id)
          if (!cur) return false
          const siblings = studyTopics
            .filter(x => (x.parent_id ?? null) === (cur.parent_id ?? null))
            .sort((a, b) => a.order_position - b.order_position)
          const idx = siblings.findIndex(x => x.id === id)
          const other = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1]
          if (!other) return false
          const tmp = cur.order_position
          cur.order_position = other.order_position
          other.order_position = tmp
          return true
        },
        toggleProgress: async (topicId, date) => {
          const d = date || nowIso().split('T')[0]
          const existing = studyProgress.find(p => p.topic_id === topicId && p.date === d)
          if (existing) { studyProgress.splice(studyProgress.indexOf(existing), 1); return { completed: false } }
          studyProgress.push({ id: studyProgress.length + 1, topic_id: topicId, date: d })
          return { completed: true }
        },
        setLevel: async (topicId, level) => {
          const t = studyTopics.find(x => x.id === topicId)
          if (t) { t.study_level = level; t.study_level_updated_at = nowIso() }
          return true
        },
      },
      files: {
        pickAndUpload: async (topicId) => { const f = { id: ++studyFileId, topic_id: topicId, original_name: 'archivo.pdf', stored_name: 'archivo.pdf', file_size: 1024, mime_type: 'application/pdf', created_at: nowIso() }; studyFiles.push(f); return f },
        list: async (topicId) => studyFiles.filter(f => f.topic_id === topicId),
        delete: async (fileId) => { const idx = studyFiles.findIndex(x => x.id === fileId); if (idx >= 0) studyFiles.splice(idx, 1); return true },
        open: async () => true,
      },
      stats: async () => {
        const levels = [0, 1, 2, 3].map(l => ({ study_level: l, count: studyTopics.filter(t => (t.study_level || 0) === l).length }))
        return { levels, total: studyTopics.length }
      },
    },

    courses: {
      list: async () => courses.filter(c => !c.archived),
      create: async (data) => {
        const c = {
          id: ++courseId,
          name: data.name,
          color: data.color || '#6366f1',
          icon: data.icon || 'book',
          term: data.term ?? null,
          credits: data.credits ?? null,
          target_grade: data.target_grade ?? null,
          workspace_id: data.workspace_id ?? 1,
          archived: 0,
          created_at: nowIso(),
          updated_at: nowIso(),
        }
        courses.push(c)
        return c
      },
      update: async (id, data) => { const c = courses.find(x => x.id === id); if (c) Object.assign(c, data); return c },
      delete: async (id) => { const c = courses.find(x => x.id === id); if (c) c.archived = 1; return true },
      get: async (id) => courses.find(x => x.id === id) || null,
    },

    search: async (q) => {
      const results: any[] = []
      tasks.filter(t => !t.deleted && t.title.includes(q)).forEach(t => results.push({ id: t.id, name: t.title, type: 'tarea' }))
      notes.filter(n => !n.deleted && n.title.includes(q)).forEach(n => results.push({ id: n.id, name: n.title, type: 'nota' }))
      return results
    },

    gamification: {
      xp: {
        get: async () => ({ total: xpLog.reduce((s, x) => s + x.amount, 0), level: 1, currentXp: 0, nextLevelXp: 100 }),
        add: async (amount, reason) => {
          xpLog.push({ amount, reason })
          return { total: xpLog.reduce((s, x) => s + x.amount, 0), level: 1, currentXp: 0, nextLevelXp: 100, leveledUp: false }
        },
      },
      achievements: {
        list: async () => [],
        check: async () => ({ unlocked: [], leveledUp: false, newLevel: 1 }),
      },
      challenges: {
        list: async () => [],
        updateProgress: async () => ({ ok: true }),
      },
    },

    streaks: {
      get: async (name) => streaks[name] || null,
      update: async (name) => {
        const today = nowIso().split('T')[0]
        if (!streaks[name]) {
          streaks[name] = { current: 1, max: 1, updated_at: today }
        } else if (streaks[name].updated_at !== today) {
          streaks[name].current++
          streaks[name].max = Math.max(streaks[name].max, streaks[name].current)
          streaks[name].updated_at = today
        }
        return { current: streaks[name].current, max: streaks[name].max }
      },
    },

    dailyLogs: {
      list: async () => dailyLogs,
      get: async (date) => dailyLogs.find(d => d.date === date) || null,
      create: async (log) => { const d = { id: ++dailyLogId, ...log, created_at: nowIso() }; dailyLogs.push(d); return d },
      update: async (id, data) => { const d = dailyLogs.find(x => x.id === id); if (d) Object.assign(d, data); return d },
    },

    trash: {
      list: async () => ({
        tasks: tasks.filter(t => t.deleted),
        notes: notes.filter(n => n.deleted),
        projects: projects.filter(p => p.deleted),
      }),
      softDelete: async (type, id) => {
        const map: Record<string, any[]> = { task: tasks, note: notes, project: projects }
        const arr = map[type]
        if (arr) { const item = arr.find((x: any) => x.id === id); if (item) item.deleted = 1 }
        return true
      },
      restore: async (type, id) => {
        const map: Record<string, any[]> = { task: tasks, note: notes, project: projects }
        const arr = map[type]
        if (arr) { const item = arr.find((x: any) => x.id === id); if (item) item.deleted = 0 }
        return true
      },
      deletePermanent: async (type, id) => {
        const map: Record<string, any[]> = { task: tasks, note: notes, project: projects }
        const arr = map[type]
        if (arr) { const idx = arr.findIndex((x: any) => x.id === id); if (idx >= 0) arr.splice(idx, 1) }
        return true
      },
      empty: async () => {
        ;[tasks, notes, projects].forEach(arr => {
          for (let i = arr.length - 1; i >= 0; i--) { if ((arr[i] as any).deleted) arr.splice(i, 1) }
        })
        return true
      },
    },

    export: {
      data: async () => ({ tasks, notes, projects }),
      import: async () => true,
      importJSON: async () => true,
    },

    backup: {
      list: async () => [],
      restore: async () => true,
    },

    stats: {
      get: async () => ({
        pomodoroCount: { count: pomodoroSessions.length, total: pomodoroSessions.reduce((s, p) => s + (p.duration || 0), 0) },
        tasksCompleted: { count: tasks.filter(t => t.completed && !t.deleted).length },
        tasksTotal: { count: tasks.filter(t => !t.deleted).length },
        dailyPomodoros: [],
      }),
      weeklyReport: async () => ({ weekStart: '', pomodoros: 0, tasksCompleted: 0, xpEarned: 0, streakMax: 0 }),
    },

    dashboard: {
      get: async () => ({
        pomodorosToday: 0,
        tasksToday: 0,
        tasksPending: tasks.filter(t => !t.completed && !t.deleted).length,
        upcomingTasks: [],
        xp: { total: 0, level: 1, currentXp: 0, nextLevelXp: 100 },
        streak: { current: 0, max: 0 },
        totalPomodoros: 0,
        totalTasks: 0,
      }),
      activityFeed: async () => [],
    },

    activity: {
      list: async () => [],
    },

    app: {
      notification: {
        show: async () => true,
      },
    },
  }
}
