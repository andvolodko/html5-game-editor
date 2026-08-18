import type { Container } from "pixi.js";

/** Objects that participate in per-node Pixi DevTools labels. */
export interface RuntimeDisplayLabelTarget {
  editable: boolean;
  container: Container;
  contentRoot: Container;
  visualsRoot: Container;
  chromeRoot: Container | undefined;
  childrenRoot: Container | undefined;
  placeholder: Container | undefined;
  selection: Container | undefined;
  hitZoneOverlay: Container | undefined;
  maskOverlay: Container | undefined;
  gizmo: { root: Container } | undefined;
  hitZoneGizmo: { root: Container } | undefined;
  maskGizmo: { root: Container } | undefined;
  graphicsPolygonGizmo: { root: Container } | undefined;
  visual: Container | undefined;
  visualType: string | undefined;
  node: { name: string };
}

/** Pixi v8 DevTools / getChildByLabel identity for a scene node transform root. */
export function nodeRootLabel(nodeName: string): string {
  return nodeName;
}

/** Nested helper under a named node (`Hero:visuals`, `Hero:gizmo`, …). */
export function nodeHelperLabel(nodeName: string, helper: string): string {
  return `${nodeName}:${helper}`;
}

/**
 * Keep Pixi `label` in sync with the scene node name for DevTools and
 * `getChildByLabel` / `getChildByName`.
 *
 * Editor: label the full chrome tree. Playback: only the node root + leaf visual.
 */
export function applyRuntimeDisplayLabels(
  runtime: RuntimeDisplayLabelTarget,
): void {
  const name = runtime.node.name;
  runtime.container.label = nodeRootLabel(name);

  if (runtime.editable) {
    if (runtime.contentRoot !== runtime.container) {
      runtime.contentRoot.label = nodeHelperLabel(name, "content");
    }
    if (runtime.visualsRoot !== runtime.container) {
      runtime.visualsRoot.label = nodeHelperLabel(name, "visuals");
    }
    if (runtime.chromeRoot) {
      runtime.chromeRoot.label = nodeHelperLabel(name, "chrome");
    }
    if (runtime.childrenRoot) {
      runtime.childrenRoot.label = nodeHelperLabel(name, "children");
    }
    if (runtime.placeholder) {
      runtime.placeholder.label = nodeHelperLabel(name, "placeholder");
    }
    if (runtime.selection) {
      runtime.selection.label = nodeHelperLabel(name, "selection");
    }
    if (runtime.hitZoneOverlay) {
      runtime.hitZoneOverlay.label = nodeHelperLabel(name, "hitZone");
    }
    if (runtime.maskOverlay) {
      runtime.maskOverlay.label = nodeHelperLabel(name, "mask");
    }
    if (runtime.gizmo) {
      runtime.gizmo.root.label = nodeHelperLabel(name, "gizmo");
    }
    if (runtime.hitZoneGizmo) {
      runtime.hitZoneGizmo.root.label = nodeHelperLabel(name, "hitZoneGizmo");
    }
    if (runtime.maskGizmo) {
      runtime.maskGizmo.root.label = nodeHelperLabel(name, "maskGizmo");
    }
    if (runtime.graphicsPolygonGizmo) {
      runtime.graphicsPolygonGizmo.root.label = nodeHelperLabel(
        name,
        "graphicsPolygonGizmo",
      );
    }
    applyVisualDisplayLabel(runtime.visual, name, runtime.visualType, false);
    return;
  }

  // Playback: leave childrenRoot unlabeled (lazy host only).
  applyVisualDisplayLabel(runtime.visual, name, runtime.visualType, true);
}

export function applyVisualDisplayLabel(
  visual: Container | undefined,
  nodeName: string,
  visualType: string | undefined,
  compact = false,
): void {
  if (!visual) {
    return;
  }
  if (compact) {
    visual.label =
      visualType && visualType.length > 0 ? visualType : "visual";
    return;
  }
  visual.label = nodeHelperLabel(
    nodeName,
    visualType && visualType.length > 0 ? visualType : "visual",
  );
}
