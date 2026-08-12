import type { SceneNodeData } from "./types.js";

/** Optional GPU / canvas counters sampled after a frame (performance overlays). */
export interface SceneRenderStats {
  drawCalls: number;
  triangles: number;
  canvas: number;
  /** Total Pixi (or equivalent) display objects in the live scene graph. */
  displayObjects: number;
}

/**
 * Port for translating scene nodes into renderer-specific runtime objects.
 * Implementations live in renderer-pixi / renderer-three.
 *
 * Prefer incremental ops; `clear`+recreate is for load/recovery only.
 */
export interface SceneRenderer {
  createNode(node: SceneNodeData): void;
  updateNode(node: SceneNodeData): void;
  /**
   * Apply Transform2D only — do not rebuild visuals.
   * Used by gameplay scripts that move/flip nodes every frame.
   */
  syncTransform(node: SceneNodeData): void;
  destroyNode(nodeId: string): void;
  /**
   * Move an existing runtime object under a new parent (or root) at index.
   * Must preserve runtime instance identity.
   */
  reparentNode(
    nodeId: string,
    parentId: string | undefined,
    index: number,
  ): void;
  /**
   * Optional: whether this renderer currently owns a runtime object for nodeId.
   * MultiSceneRenderer uses this to avoid calling ops on filtered-out slots.
   */
  hasNode?(nodeId: string): boolean;
  /** Remove all runtime objects. Domain scene is unaffected. */
  clear(): void;
  resize(width: number, height: number): void;
  render(): void;
  /** Optional draw-call / triangle / canvas sample for performance meters. */
  getRenderStats?(): SceneRenderStats;
}
