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
    // Stacked Pixi/Three canvases sit under this overlay. Without preventDefault
    // the browser treats them like images and flashes a native selection.
    event.preventDefault();
    downId = pick(event.clientX, event.clientY);
    if (downId) {
      emit(downId, "pointerdown");
    }
  };
  const preventNativeSelection = (event: Event): void => {
    event.preventDefault();
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

  host.style.userSelect = "none";
  host.style.webkitUserSelect = "none";
  host.style.touchAction = "none";
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("selectstart", preventNativeSelection);
  host.addEventListener("dragstart", preventNativeSelection);

  return () => {
    host.removeEventListener("pointerdown", onDown);
    host.removeEventListener("pointerup", onUp);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerleave", onLeave);
    host.removeEventListener("selectstart", preventNativeSelection);
    host.removeEventListener("dragstart", preventNativeSelection);
    host.style.cursor = "";
  };
}
