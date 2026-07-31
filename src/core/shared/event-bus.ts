export type EventEnvelope<TType extends string, TPayload> = {
  id: string
  type: TType
  occurredAt: string
  workspaceId?: string | number
  aggregateId?: string | number
  payload: TPayload
  metadata?: Record<string, unknown>
}

type EventHandler<TEvent> = (event: TEvent) => void | Promise<void>

export interface IEventBus<TMap extends Record<string, EventEnvelope<string, unknown>>> {
  publish<K extends keyof TMap>(event: TMap[K]): Promise<void>
  subscribe<K extends keyof TMap>(type: K, handler: EventHandler<TMap[K]>): () => void
  clear(): void
}

export class InMemoryEventBus<TMap extends Record<string, EventEnvelope<string, unknown>>>
  implements IEventBus<TMap>
{
  private readonly handlers = new Map<keyof TMap, Set<EventHandler<EventEnvelope<string, unknown>>>>()
  private readonly globalHandlers = new Set<EventHandler<EventEnvelope<string, unknown>>>()

  async publish<K extends keyof TMap>(event: TMap[K]): Promise<void> {
    const subscribers = this.handlers.get(event.type as K)
    const promises: Array<Promise<void>> = []

    if (subscribers && subscribers.size > 0) {
      for (const handler of subscribers) {
        promises.push(
          Promise.resolve().then(() => handler(event as EventEnvelope<string, unknown>)).catch(err =>
            console.error(`[EventBus] Error in handler for ${String(event.type)}:`, err)
          )
        )
      }
    }

    for (const handler of this.globalHandlers) {
      promises.push(
        Promise.resolve().then(() => handler(event as EventEnvelope<string, unknown>)).catch(err =>
          console.error(`[EventBus] Error in global handler:`, err)
        )
      )
    }

    await Promise.allSettled(promises)
  }

  subscribe<K extends keyof TMap>(type: K, handler: EventHandler<TMap[K]>): () => void {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set()
      this.handlers.set(type, set)
    }
    set.add(handler as EventHandler<EventEnvelope<string, unknown>>)
    return () => {
      set!.delete(handler as EventHandler<EventEnvelope<string, unknown>>)
      if (set!.size === 0) this.handlers.delete(type)
    }
  }

  subscribeAll(handler: EventHandler<EventEnvelope<string, unknown>>): () => void {
    this.globalHandlers.add(handler)
    return () => { this.globalHandlers.delete(handler) }
  }

  clear(): void {
    this.handlers.clear()
    this.globalHandlers.clear()
  }

  get subscriberCount(): number {
    return this.handlers.size
  }
}
