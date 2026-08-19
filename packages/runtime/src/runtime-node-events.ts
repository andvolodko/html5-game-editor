import type { NodePointerEventName } from "@game-editor/game-components";

function pointerSubscriptionKey(
  nodeId: string,
  event: NodePointerEventName,
): string {
  return `${nodeId}\0${event}`;
}

/**
 * Pointer click / event subscriptions for gameplay scripts.
 * Handlers are copied into a reusable buffer before invoke so a handler
 * may unsubscribe without skipping siblings.
 */
export class RuntimeNodeEvents {
  private readonly nodeClickHandlers = new Map<string, Set<() => void>>();
  private readonly nodePointerHandlers = new Map<string, Set<() => void>>();
  private readonly invokeBuffer: Array<() => void> = [];

  clear(): void {
    this.nodeClickHandlers.clear();
    this.nodePointerHandlers.clear();
    this.invokeBuffer.length = 0;
  }

  subscribeClick(nodeId: string, handler: () => void): () => void {
    let set = this.nodeClickHandlers.get(nodeId);
    if (!set) {
      set = new Set();
      this.nodeClickHandlers.set(nodeId, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
      if (set && set.size === 0) {
        this.nodeClickHandlers.delete(nodeId);
      }
    };
  }

  subscribePointer(
    nodeId: string,
    event: NodePointerEventName,
    handler: () => void,
  ): () => void {
    const key = pointerSubscriptionKey(nodeId, event);
    let set = this.nodePointerHandlers.get(key);
    if (!set) {
      set = new Set();
      this.nodePointerHandlers.set(key, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
      if (set && set.size === 0) {
        this.nodePointerHandlers.delete(key);
      }
    };
  }

  emitClick(nodeId: string): void {
    this.invokeSet(this.nodeClickHandlers.get(nodeId));
  }

  emitPointer(nodeId: string, event: NodePointerEventName): void {
    this.invokeSet(
      this.nodePointerHandlers.get(pointerSubscriptionKey(nodeId, event)),
    );
  }

  private invokeSet(set: Set<() => void> | undefined): void {
    if (!set || set.size === 0) {
      return;
    }
    this.invokeBuffer.length = 0;
    for (const handler of set) {
      this.invokeBuffer.push(handler);
    }
    for (const handler of this.invokeBuffer) {
      handler();
    }
    this.invokeBuffer.length = 0;
  }
}
