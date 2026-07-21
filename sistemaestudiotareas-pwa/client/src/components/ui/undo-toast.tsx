import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './button'
import { useUndoStore } from '@/stores/undoStore'

export function UndoToast() {
  const { actions, undo } = useUndoStore()

  if (actions.length === 0) return null

  const latest = actions[actions.length - 1]

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <AnimatePresence>
        <motion.div
          key={latest.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl bg-card border border-border"
        >
          <span className="text-sm text-foreground">{latest.label}</span>
          <Button variant="link" size="sm" className="text-primary font-semibold h-auto px-2" onClick={() => undo(latest.id)}>
            Deshacer
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
