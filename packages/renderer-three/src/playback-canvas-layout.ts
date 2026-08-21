/** Playback canvas CSS box — kept out of document flow so it cannot expand the layout viewport. */
export interface PlaybackCanvasStyleTarget {
  style: {
    position: string;
    left: string;
    top: string;
    right: string;
    bottom: string;
    width: string;
    height: string;
    display: string;
    objectFit: string;
    maxWidth: string;
    maxHeight: string;
    margin: string;
  };
}

/**
 * Three `setSize(..., false)` leaves CSS unset. Fill the parent with inset so
 * portrait WebView / DevTools device mode cannot keep a 16:9 intrinsic box.
 */
export function applyPlaybackCanvasLayout(
  canvas: PlaybackCanvasStyleTarget,
  _parent: { clientWidth: number; clientHeight: number },
): void {
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.right = "0";
  canvas.style.bottom = "0";
  canvas.style.margin = "0";
  canvas.style.display = "block";
  canvas.style.objectFit = "fill";
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
}
