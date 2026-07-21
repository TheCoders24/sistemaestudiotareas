import { create } from 'zustand'
import { KEYBOARD_SHORTCUTS } from '@/constants/tabs'

interface ShortcutsState {
  shortcuts: Record<string, string>
  setShortcut: (tabId: string, shortcut: string) => void
  resetDefaults: () => void
}

export const useShortcutsStore = create<ShortcutsState>((set) => ({
  shortcuts: { ...KEYBOARD_SHORTCUTS },
  setShortcut: (tabId, shortcut) => set((s) => ({ shortcuts: { ...s.shortcuts, [tabId]: shortcut } })),
  resetDefaults: () => set({ shortcuts: { ...KEYBOARD_SHORTCUTS } }),
}))
