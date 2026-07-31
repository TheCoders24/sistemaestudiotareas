class InMemoryEventBus {
  constructor() {
    this.handlers = new Map()
    this.globalHandlers = new Set()
  }

  async publish(event) {
    const subscribers = this.handlers.get(event.type)
    const promises = []

    if (subscribers && subscribers.size > 0) {
      for (const handler of subscribers) {
        promises.push(
          Promise.resolve().then(() => handler(event)).catch(err =>
            console.error(`[EventBus] Error in handler for ${event.type}:`, err)
          )
        )
      }
    }

    for (const handler of this.globalHandlers) {
      promises.push(
        Promise.resolve().then(() => handler(event)).catch(err =>
          console.error(`[EventBus] Error in global handler:`, err)
        )
      )
    }

    await Promise.allSettled(promises)
  }

  subscribe(type, handler) {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set()
      this.handlers.set(type, set)
    }
    set.add(handler)
    return () => {
      set.delete(handler)
      if (set.size === 0) this.handlers.delete(type)
    }
  }

  subscribeAll(handler) {
    this.globalHandlers.add(handler)
    return () => { this.globalHandlers.delete(handler) }
  }

  clear() {
    this.handlers.clear()
    this.globalHandlers.clear()
  }
}

module.exports = { InMemoryEventBus }
