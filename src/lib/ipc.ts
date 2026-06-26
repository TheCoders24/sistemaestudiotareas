import { toast } from '@/components/ui/use-toast'

type IpcMethod = keyof Window['electronAPI']

export async function safeIpc<T>(method: IpcMethod, ...args: unknown[]): Promise<T | null> {
  if (!window.electronAPI) return null
  try {
    const api = window.electronAPI[method] as (...a: unknown[]) => Promise<T>
    return await api(...args)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error(`[IPC Error] ${method}:`, err)
    toast({
      title: 'Error',
      description: msg,
      variant: 'destructive',
    })
    return null
  }
}

export async function safeIpcOrThrow<T>(method: IpcMethod, ...args: unknown[]): Promise<T> {
  const result = await safeIpc<T>(method, ...args)
  if (result === null) throw new Error(`IPC call "${method}" returned null`)
  return result
}
