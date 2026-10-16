import * as React from "react"
import { Info, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "./alert"
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
    <Alert className={cn("relative pr-8", className)}>
      <Info className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-xs space-y-1">{children}</AlertDescription>
      <button
        onClick={handleClose}
        className="absolute right-3 top-3 text-muted-foreground/40 hover:text-foreground transition-colors"
        aria-label="Cerrar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </Alert>
  )
}
