import { create } from 'zustand'

export interface SessionRecord {
  startedAt: string
  endedAt: string
  type: 'pomodoro' | 'shortBreak' | 'longBreak'
}

interface PomodoroState {
  timeLeft: number
  isRunning: boolean
  focusTime: number
  totalPomodoros: number
  pomodoroCount: number
  startTime: Date | null
  sessionHistory: SessionRecord[]
  start: () => void
  pause: () => void
  reset: () => void
  setFocusTime: (minutes: number) => void
  tick: () => void
}

const DEFAULT_FOCUS = 25

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  timeLeft: DEFAULT_FOCUS * 60,
  isRunning: false,
  focusTime: DEFAULT_FOCUS,
  totalPomodoros: 0,
  pomodoroCount: 0,
  startTime: null,
  sessionHistory: [],

  start: () => {
    const { timeLeft } = get()
    if (timeLeft === 0) {
      set({ timeLeft: get().focusTime * 60 })
    }
    set({ isRunning: true, startTime: new Date() })
  },

  pause: () => {
    set({ isRunning: false, startTime: null })
  },

  reset: () => {
    const { focusTime } = get()
    set({ isRunning: false, timeLeft: focusTime * 60, startTime: null })
  },

  setFocusTime: (minutes: number) => {
    set({ focusTime: minutes, timeLeft: minutes * 60 })
  },

  tick: () => {
    const { isRunning, timeLeft, focusTime, pomodoroCount } = get()
    if (!isRunning) return
    if (timeLeft <= 1) {
      const now = new Date().toISOString()
      const startedAt = new Date(Date.now() - focusTime * 60 * 1000).toISOString()
      const entry: SessionRecord = { startedAt, endedAt: now, type: 'pomodoro' }
      set({
        isRunning: false,
        timeLeft: 0,
        startTime: null,
        totalPomodoros: get().totalPomodoros + 1,
        pomodoroCount: pomodoroCount + 1,
        sessionHistory: [...get().sessionHistory, entry],
      })
    } else {
      set({ timeLeft: timeLeft - 1 })
    }
  },
}))
