import * as React from "react"
import { Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface InfoBoxProps {
  title: string
  children: React.ReactNode
  className?: string
  defaultOpen?: boolean
  storageKey?: string
}

export function InfoBox({ title, children, className, defaultOpen = true, storageKey }: InfoBoxProps) {
  const [open, setOpen] = React.useState(() => {
    if (storageKey) {
      try { return localStorage.getItem(storageKey) !== 'hidden' } catch { return defaultOpen }
    }
    return defaultOpen
  })

  function handleClose() {
    setOpen(false)
    if (storageKey) {
      try { localStorage.setItem(storageKey, 'hidden') } catch {}
    }
  }

  if (!open) return null

  return (
    <div className={cn("rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-3", className)}>
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground mb-1">{title}</p>
          <div className="text-xs text-muted-foreground space-y-1">
            {children}
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground/40 hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
