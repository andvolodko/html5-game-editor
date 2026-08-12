import type { SceneNodeData } from "./types.js";

/**
 * Port for translating scene nodes into renderer-specific runtime objects.
 * Implementations live in renderer-pixi / renderer-three.
 *
 * Prefer incremental ops; `clear`+recreate is for load/recovery only.
 */
export interface SceneRenderer {
  createNode(node: SceneNodeData): void;
  updateNode(node: SceneNodeData): void;
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
  /** Remove all runtime objects. Domain scene is unaffected. */
  clear(): void;
  resize(width: number, height: number): void;
  render(): void;
}
