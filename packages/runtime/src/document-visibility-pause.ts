export interface DocumentVisibilityPauseHandles {
  setPaused: (paused: boolean) => void;
  setAudioPaused?: (paused: boolean) => void;
}

/**
 * Pauses runtime tick/input and optional audio when the document is hidden
 * (tab background, Android WebView pause). Safe to call once per boot;
 * returns a disposer that removes the single listener.
 */
export function bindDocumentVisibilityPause(
  handles: DocumentVisibilityPauseHandles,
  doc: Document = document,
): () => void {
  const sync = (): void => {
    const paused = doc.visibilityState === "hidden";
    handles.setPaused(paused);
    handles.setAudioPaused?.(paused);
  };
  doc.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    doc.removeEventListener("visibilitychange", sync);
  };
}
