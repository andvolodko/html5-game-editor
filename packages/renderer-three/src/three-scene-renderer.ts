import type { SceneNodeData, SceneRenderer } from "@game-editor/scene";

interface RuntimeEntry {
  /** Parent node id in the runtime graph (undefined = scene root). */
  parentId: string | undefined;
}

/**
 * Stub Three.js scene renderer. Substantial Three behavior intentionally deferred.
 * Never mutates domain SceneNodeData — only tracks runtime parent links.
 */
export class ThreeSceneRenderer implements SceneRenderer {
  private readonly nodes = new Map<string, RuntimeEntry>();
  private width = 0;
  private height = 0;

  createNode(node: SceneNodeData): void {
    this.nodes.set(node.id, { parentId: node.parentId });
  }

  updateNode(node: SceneNodeData): void {
    if (!this.nodes.has(node.id)) {
      throw new Error(`ThreeSceneRenderer: unknown node ${node.id}`);
    }
    this.nodes.set(node.id, { parentId: node.parentId });
  }

  destroyNode(nodeId: string): void {
    if (!this.nodes.has(nodeId)) {
      return;
    }
    const toDelete = new Set<string>([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, entry] of this.nodes) {
        if (
          entry.parentId !== undefined &&
          toDelete.has(entry.parentId) &&
          !toDelete.has(id)
        ) {
          toDelete.add(id);
          changed = true;
        }
      }
    }
    for (const id of toDelete) {
      this.nodes.delete(id);
    }
  }

  reparentNode(
    nodeId: string,
    parentId: string | undefined,
    index: number,
  ): void {
    void index;
    const entry = this.nodes.get(nodeId);
    if (!entry) {
      throw new Error(`ThreeSceneRenderer: unknown node ${nodeId}`);
    }
    if (parentId !== undefined && !this.nodes.has(parentId)) {
      throw new Error(`ThreeSceneRenderer: unknown parent ${parentId}`);
    }
    entry.parentId = parentId;
  }

  clear(): void {
    this.nodes.clear();
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

  /** Test/diagnostics: runtime parent link (not domain data). */
  getRuntimeParentId(nodeId: string): string | undefined {
    return this.nodes.get(nodeId)?.parentId;
  }
}
