import type { SceneNodeData } from "./types.js";
import type { SceneRenderer } from "./scene-renderer.js";

export interface MultiSceneRendererSlot {
  renderer: SceneRenderer;
  /** When omitted, every node is accepted. */
  accepts?: (node: SceneNodeData) => boolean;
}

/**
 * Fans SceneRenderer ops to filtered child renderers (hybrid Pixi/Three stacks).
 * Domain data is never mutated.
 */
export class MultiSceneRenderer implements SceneRenderer {
  constructor(private readonly slots: readonly MultiSceneRendererSlot[]) {}

  hasNode(nodeId: string): boolean {
    return this.slots.some((slot) => slot.renderer.hasNode?.(nodeId) === true);
  }

  createNode(node: SceneNodeData): void {
    for (const slot of this.slots) {
      if (slot.accepts && !slot.accepts(node)) {
        continue;
      }
      slot.renderer.createNode(node);
    }
  }

  updateNode(node: SceneNodeData): void {
    for (const slot of this.slots) {
      if (slot.accepts && !slot.accepts(node)) {
        slot.renderer.destroyNode(node.id);
        continue;
      }
      // createNode upserts on both Pixi and Three implementations.
      slot.renderer.createNode(node);
    }
  }

  syncTransform(node: SceneNodeData): void {
    for (const slot of this.slots) {
      if (slot.accepts && !slot.accepts(node)) {
        continue;
      }
      if (slot.renderer.hasNode && !slot.renderer.hasNode(node.id)) {
        continue;
      }
      slot.renderer.syncTransform(node);
    }
  }

  destroyNode(nodeId: string): void {
    for (const slot of this.slots) {
      slot.renderer.destroyNode(nodeId);
    }
  }

  reparentNode(
    nodeId: string,
    parentId: string | undefined,
    index: number,
  ): void {
    for (const slot of this.slots) {
      if (slot.renderer.hasNode && !slot.renderer.hasNode(nodeId)) {
        continue;
      }
      slot.renderer.reparentNode(nodeId, parentId, index);
    }
  }

  clear(): void {
    for (const slot of this.slots) {
      slot.renderer.clear();
    }
  }

  resize(width: number, height: number): void {
    for (const slot of this.slots) {
      slot.renderer.resize(width, height);
    }
  }

  render(): void {
    for (const slot of this.slots) {
      slot.renderer.render();
    }
  }

  getRenderStats() {
    let drawCalls = 0;
    let triangles = 0;
    let canvas = 0;
    let displayObjects = 0;
    for (const slot of this.slots) {
      const sample = slot.renderer.getRenderStats?.();
      if (!sample) {
        continue;
      }
      drawCalls += sample.drawCalls;
      triangles += sample.triangles;
      canvas += sample.canvas;
      displayObjects += sample.displayObjects;
    }
    return { drawCalls, triangles, canvas, displayObjects };
  }
}
