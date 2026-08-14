export type HybridInputLayer = "background" | "foreground" | "three";

/** Editor-only isolate toggles; not scene data. */
export interface HybridLayerVisibility {
  pixi: boolean;
  three: boolean;
}

export const DEFAULT_HYBRID_LAYER_VISIBILITY: HybridLayerVisibility = {
  pixi: true,
  three: true,
};

export interface HybridLayerHosts {
  bgHost: HTMLElement;
  midHost: HTMLElement;
  fgHost: HTMLElement;
  inputHost: HTMLElement;
}

/**
 * When the requested input layer is hidden, fall back to a visible stack
 * so gizmos still receive pointer events.
 */
export function resolveHybridInputLayer(
  requested: HybridInputLayer,
  visibility: HybridLayerVisibility,
): HybridInputLayer | undefined {
  if (requested === "three") {
    if (visibility.three) {
      return "three";
    }
    return visibility.pixi ? "background" : undefined;
  }
  if (visibility.pixi) {
    return requested;
  }
  return visibility.three ? "three" : undefined;
}

export function applyHybridLayerVisibility(
  hosts: Pick<HybridLayerHosts, "bgHost" | "midHost" | "fgHost">,
  visibility: HybridLayerVisibility,
): void {
  const pixi = visibility.pixi ? "visible" : "hidden";
  const three = visibility.three ? "visible" : "hidden";
  hosts.bgHost.style.visibility = pixi;
  hosts.fgHost.style.visibility = pixi;
  hosts.midHost.style.visibility = three;
}

export function applyHybridInputLayer(
  hosts: HybridLayerHosts,
  layer: HybridInputLayer,
  visibility: HybridLayerVisibility = DEFAULT_HYBRID_LAYER_VISIBILITY,
): void {
  const resolved = resolveHybridInputLayer(layer, visibility);
  hosts.bgHost.style.pointerEvents =
    resolved === "background" ? "auto" : "none";
  hosts.midHost.style.pointerEvents = resolved === "three" ? "auto" : "none";
  hosts.fgHost.style.pointerEvents =
    resolved === "foreground" ? "auto" : "none";
  hosts.inputHost.style.pointerEvents = "none";
}

/** Preview: canvases never take DOM hits; overlay routes picks. */
export function applyHybridPreviewInput(hosts: HybridLayerHosts): void {
  hosts.bgHost.style.pointerEvents = "none";
  hosts.midHost.style.pointerEvents = "none";
  hosts.fgHost.style.pointerEvents = "none";
  hosts.inputHost.style.pointerEvents = "auto";
}

export function syncHybridEditorChrome(
  hosts: HybridLayerHosts,
  inputLayer: HybridInputLayer,
  visibility: HybridLayerVisibility,
): void {
  applyHybridLayerVisibility(hosts, visibility);
  applyHybridInputLayer(hosts, inputLayer, visibility);
}

/**
 * Cascaded pick: FG Pixi → Three → BG Pixi, skipping hidden editor layers.
 */
export function pickVisibleHybridNodeId(
  visibility: HybridLayerVisibility,
  pickers: {
    pickForeground: () => string | undefined;
    pickThree: () => string | undefined;
    pickBackground: () => string | undefined;
  },
): string | undefined {
  if (visibility.pixi) {
    const foreground = pickers.pickForeground();
    if (foreground !== undefined) {
      return foreground;
    }
  }
  if (visibility.three) {
    const three = pickers.pickThree();
    if (three !== undefined) {
      return three;
    }
  }
  if (visibility.pixi) {
    return pickers.pickBackground();
  }
  return undefined;
}
