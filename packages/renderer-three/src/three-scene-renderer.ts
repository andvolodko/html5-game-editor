import type { SceneNodeData, SceneRenderer } from "@game-editor/scene";

/**
 * Stub Three.js scene renderer. Substantial Three behavior intentionally deferred.
 */
export class ThreeSceneRenderer implements SceneRenderer {
  private readonly nodes = new Map<string, SceneNodeData>();
  private width = 0;
  private height = 0;

  createNode(node: SceneNodeData): void {
    this.nodes.set(node.id, node);
  }

  updateNode(node: SceneNodeData): void {
    if (!this.nodes.has(node.id)) {
      throw new Error(`ThreeSceneRenderer: unknown node ${node.id}`);
    }
    this.nodes.set(node.id, node);
  }

  destroyNode(nodeId: string): void {
    this.nodes.delete(nodeId);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(): void {
    // No-op until Three.js viewport integration.
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
