import type { SceneNodeData } from "./types.js";

/**
 * Port for translating scene nodes into renderer-specific runtime objects.
 * Implementations live in renderer-pixi / renderer-three.
 */
export interface SceneRenderer {
  createNode(node: SceneNodeData): void;
  updateNode(node: SceneNodeData): void;
  destroyNode(nodeId: string): void;
  resize(width: number, height: number): void;
  render(): void;
}
