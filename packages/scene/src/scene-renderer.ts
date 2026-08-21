import type { RuntimeTransform2D } from "./runtime-transform-2d.js";
import type { RuntimeTransform3D } from "./runtime-transform-3d.js";
import type { SceneNodeData, Vec3 } from "./types.js";
import type { ParticleEmitterComponentData } from "./particle-emitter-data.js";

/** Optional GPU / canvas counters sampled after a frame (performance overlays). */
export interface SceneRenderStats {
  drawCalls: number;
  triangles: number;
  canvas: number;
  /** Live scene-graph objects (Pixi Containers or Three Object3Ds). */
  displayObjects: number;
}

export const EMPTY_SCENE_RENDER_STATS: SceneRenderStats = {
  drawCalls: 0,
  triangles: 0,
  canvas: 0,
  displayObjects: 0,
};

/** World-space bone pose for scripts (no renderer objects). */
export interface BoneWorldTransform {
  position: Vec3;
  rotation: Vec3;
}

export function addSceneRenderStats(
  a: SceneRenderStats,
  b: SceneRenderStats,
): SceneRenderStats {
  return {
    drawCalls: a.drawCalls + b.drawCalls,
    triangles: a.triangles + b.triangles,
    canvas: a.canvas + b.canvas,
    displayObjects: a.displayObjects + b.displayObjects,
  };
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
   * Used by `setTransform2D` when mutating a node through services.
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
  /**
   * Persistent live 2D transform handle for a runtime node.
   * Assignments update the rendered object immediately and must not
   * allocate a new object per access.
   */
  getRuntimeTransform2D?(nodeId: string): RuntimeTransform2D | undefined;
  /**
   * Persistent live 3D transform handle for a runtime node.
   * Assignments update the rendered object immediately and must not
   * allocate a new object per access.
   */
  getRuntimeTransform3D?(nodeId: string): RuntimeTransform3D | undefined;
  /** Remove all runtime objects. Domain scene is unaffected. */
  clear(): void;
  resize(width: number, height: number): void;
  render(): void;
  /**
   * Freeze playback-driven animation (Pixi ticker, glTF mixers).
   * Editor tools and one-shot `render()` presents are unaffected.
   */
  setPlaybackPaused?(paused: boolean): void;
  /** Optional draw-call / triangle / canvas sample for performance meters. */
  getRenderStats?(): SceneRenderStats;
  /**
   * World-space pose of a named glTF bone on a Model3D node.
   * Three.js only; undefined when the bone or node is missing.
   */
  getBoneWorldTransform?(
    nodeId: string,
    boneName: string,
  ): BoneWorldTransform | undefined;
  /**
   * Transient script visibility. Does not write `SceneNodeData.visible`.
   * Serialized visibility is applied on create/update.
   */
  setNodeVisible?(nodeId: string, visible: boolean): void;
  /**
   * Editor/runtime state display: set effective visibility combined with
   * editor-only hide (`visible && !editorHidden`). Does not write scene JSON.
   */
  setNodeResolvedVisible?(nodeId: string, visible: boolean): void;
  /**
   * Transient script opacity. Does not write `SceneNodeData.alpha`.
   * Serialized alpha is applied on create/update.
   */
  setNodeAlpha?(nodeId: string, alpha: number): void;
  /**
   * Editor-only hide overlay. Combined with serialized `node.visible`
   * (`runtimeVisible && !editorHidden`) on the display object.
   */
  setNodeEditorHidden?(nodeId: string, hidden: boolean): void;
  /**
   * Editor-only lock overlay. Does not persist on SceneNodeData.
   * Locked nodes stay visible but skip transform gizmos / viewport drags.
   */
  setNodeLocked?(nodeId: string, locked: boolean): void;
  /** CSS cursor for the node's runtime object (Pixi). Empty string clears it. */
  setNodeCursor?(nodeId: string, cursor: string): void;
  /** Last cursor assigned via `setNodeCursor`, if any. */
  getNodeCursor?(nodeId: string): string | undefined;
  /**
   * Transient ParticleEmitter playback control. Does not write scene JSON.
   * Editor Inspector Play/Pause/Restart and script `ctx.particles` use this.
   */
  controlParticleEmitter?(
    nodeId: string,
    action: "play" | "pause" | "stop" | "restart",
  ): void;
  /** Live particle counts for the selected emitter Inspector stats. */
  getParticleEmitterStats?(nodeId: string):
    | { alive: number; maxParticles: number; rate: number }
    | undefined;
  /**
   * Live ParticleEmitter config preview (curve drag, etc.).
   * Does not write scene JSON; paint/updateNode remains the persistence path.
   */
  previewParticleEmitterConfig?(
    nodeId: string,
    config: ParticleEmitterComponentData,
  ): void;
}
