import type { NodePointerEventName } from "@game-editor/game-components";

export interface PlaybackOverlayPointerOptions {
  host: HTMLElement;
  pick: (clientX: number, clientY: number) => string | undefined;
  cursorFor: (nodeId: string | undefined) => string;
  emit: (nodeId: string, event: NodePointerEventName) => void;
}

/**
 * Hybrid playback input: canvases use `pointer-events: none`, so Pixi `cursor`
 * never applies. This binds the overlay host to pick, CSS cursor, and pointer events.
 */
export function bindPlaybackOverlayPointer(
  options: PlaybackOverlayPointerOptions,
): () => void {
  const { host, pick, cursorFor, emit } = options;
  let downId: string | undefined;
  let hoverId: string | undefined;

  const setHover = (nextId: string | undefined): void => {
    if (nextId === hoverId) {
      return;
    }
    if (hoverId) {
      emit(hoverId, "pointerout");
    }
    hoverId = nextId;
    if (hoverId) {
      emit(hoverId, "pointerover");
    }
  };

  const onDown = (event: PointerEvent): void => {
    downId = pick(event.clientX, event.clientY);
    if (downId) {
      emit(downId, "pointerdown");
    }
  };
  const onUp = (event: PointerEvent): void => {
    const id = pick(event.clientX, event.clientY);
    if (id) {
      emit(id, "pointerup");
      if (id === downId) {
        emit(id, "pointertap");
      }
    }
    downId = undefined;
  };
  const onMove = (event: PointerEvent): void => {
    const id = pick(event.clientX, event.clientY);
    host.style.cursor = cursorFor(id);
    setHover(id);
  };
  const onLeave = (): void => {
    host.style.cursor = "";
    setHover(undefined);
    downId = undefined;
  };

  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);

  return () => {
    host.removeEventListener("pointerdown", onDown);
    host.removeEventListener("pointerup", onUp);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerleave", onLeave);
    host.style.cursor = "";
  };
}
