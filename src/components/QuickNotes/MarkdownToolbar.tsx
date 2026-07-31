import { useRef } from 'react'
import { Bold, Italic, Strikethrough, Heading, List, ListOrdered, Link, Code, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  value: string
  onChange: (val: string) => void
  preview: boolean
  onTogglePreview: () => void
}

const WRAP: Record<string, [string, string]> = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  strikethrough: ['~~', '~~'],
  code: ['`', '`'],
  heading: ['### ', ''],
  ul: ['- ', ''],
  ol: ['1. ', ''],
}

function applyMarkdown(textarea: HTMLTextAreaElement, type: string, current: string, onChange: (v: string) => void) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const sel = current.substring(start, end)
  const wrap = WRAP[type]
  if (!wrap) return
  const [open, close] = wrap
  const before = current.substring(0, start)
  const after = current.substring(end)
  const newVal = before + open + sel + close + after
  onChange(newVal)
  requestAnimationFrame(() => {
    textarea.focus()
    const newCursor = (type === 'heading' || type === 'ul' || type === 'ol')
      ? start + open.length + sel.length
      : start + open.length + sel.length + close.length
    textarea.setSelectionRange(newCursor, newCursor)
  })
}

function insertLink(textarea: HTMLTextAreaElement, current: string, onChange: (v: string) => void) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const sel = current.substring(start, end) || 'texto'
  const before = current.substring(0, start)
  const after = current.substring(end)
  const newVal = before + `[${sel}](url)` + after
  onChange(newVal)
  requestAnimationFrame(() => {
    textarea.focus()
    const urlPos = start + sel.length + 3
    textarea.setSelectionRange(urlPos, urlPos + 3)
  })
}

export function MarkdownToolbar({ value, onChange, preview, onTogglePreview }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const actions = [
    { icon: Bold, label: 'Negrita', action: 'bold' },
    { icon: Italic, label: 'Itálica', action: 'italic' },
    { icon: Strikethrough, label: 'Tachado', action: 'strikethrough' },
    { icon: Heading, label: 'Título', action: 'heading' },
    { icon: List, label: 'Lista', action: 'ul' },
    { icon: ListOrdered, label: 'Lista numerada', action: 'ol' },
    { icon: Code, label: 'Código', action: 'code' },
    { icon: Link, label: 'Enlace', action: 'link' },
  ]
  function handleAction(action: string) {
    const el = textareaRef.current ?? document.querySelector<HTMLTextAreaElement>('.md-editor-textarea')
    if (!el) return
    textareaRef.current = el
    if (action === 'link') insertLink(el, value, onChange)
    else applyMarkdown(el, action, value, onChange)
  }
  return (
    <div className="flex items-center gap-0.5 border rounded-t-md bg-muted/30 px-1 py-1">
      {actions.map(a => (
        <Tooltip key={a.action}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAction(a.action)}>
              <a.icon className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{a.label}</TooltipContent>
        </Tooltip>
      ))}
      <div className="flex-1" />
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onTogglePreview}>
        {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}
