import type { SceneNodeData } from "./types.js";
import {
  addSceneRenderStats,
  EMPTY_SCENE_RENDER_STATS,
  type SceneRenderer,
} from "./scene-renderer.js";

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
    let merged = EMPTY_SCENE_RENDER_STATS;
    for (const slot of this.slots) {
      const sample = slot.renderer.getRenderStats?.();
      if (!sample) {
        continue;
      }
      merged = addSceneRenderStats(merged, sample);
    }
    return merged;
  }

  getBoneWorldTransform(nodeId: string, boneName: string) {
    for (const slot of this.slots) {
      const transform = slot.renderer.getBoneWorldTransform?.(nodeId, boneName);
      if (transform) {
        return transform;
      }
    }
    return undefined;
  }

  setNodeVisible(nodeId: string, visible: boolean): void {
    for (const slot of this.slots) {
      slot.renderer.setNodeVisible?.(nodeId, visible);
    }
  }

  setNodeEditorHidden(nodeId: string, hidden: boolean): void {
    for (const slot of this.slots) {
      slot.renderer.setNodeEditorHidden?.(nodeId, hidden);
    }
  }

  setNodeLocked(nodeId: string, locked: boolean): void {
    for (const slot of this.slots) {
      slot.renderer.setNodeLocked?.(nodeId, locked);
    }
  }

  setNodeCursor(nodeId: string, cursor: string): void {
    for (const slot of this.slots) {
      slot.renderer.setNodeCursor?.(nodeId, cursor);
    }
  }

  getNodeCursor(nodeId: string): string | undefined {
    for (const slot of this.slots) {
      const cursor = slot.renderer.getNodeCursor?.(nodeId);
      if (cursor !== undefined) {
        return cursor;
      }
    }
    return undefined;
  }
}
