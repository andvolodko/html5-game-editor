type Handler = (payload?: unknown) => void;

/**
 * Small explicit event bus for gameplay / preview.
 * Construct per game or preview session — not a process-wide singleton.
 */
export class EventBus {
  private readonly handlers = new Map<string, Set<Handler>>();

  on(eventId: string, handler: Handler): () => void {
    let set = this.handlers.get(eventId);
    if (!set) {
      set = new Set();
      this.handlers.set(eventId, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
      if (set && set.size === 0) {
        this.handlers.delete(eventId);
      }
    };
  }

  emit(eventId: string, payload?: unknown): void {
    const set = this.handlers.get(eventId);
    if (!set) {
      return;
    }
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
