import type { SceneData, SceneNodeData } from "./types.js";

/**
 * O(1) lookup of live scene nodes by id.
 * Holds references to the same `SceneNodeData` objects as the tree — not copies.
 */
export class SceneIndex {
  private readonly nodes = new Map<string, SceneNodeData>();
  private readonly parents = new Map<string, string | undefined>();

  getNode(nodeId: string): SceneNodeData | undefined {
    return this.nodes.get(nodeId);
  }

  getParentId(nodeId: string): string | undefined {
    return this.parents.get(nodeId);
  }

  getParent(nodeId: string): SceneNodeData | undefined {
    const parentId = this.parents.get(nodeId);
    if (parentId === undefined) {
      return undefined;
    }
    return this.nodes.get(parentId);
  }

  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /** Replace the index from a full scene tree (load / replace / restore). */
  rebuild(scene: SceneData): void {
    this.clear();
    this.indexList(scene.nodes, undefined);
  }

  clear(): void {
    this.nodes.clear();
    this.parents.clear();
  }

  /** Index a newly inserted node and its descendants. */
  addNode(node: SceneNodeData): void {
    this.indexNode(node, node.parentId);
  }

  /** Drop a node and its descendants. The detached subtree object is enough. */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return;
    }
    this.forSubtree(node, (current) => {
      this.nodes.delete(current.id);
      this.parents.delete(current.id);
    });
  }

  reparentNode(nodeId: string, parentId: string | undefined): void {
    if (!this.nodes.has(nodeId)) {
      return;
    }
    this.parents.set(nodeId, parentId);
  }

  private indexList(
    nodes: readonly SceneNodeData[],
    parentId: string | undefined,
  ): void {
    for (const node of nodes) {
      this.indexNode(node, parentId);
    }
  }

  private indexNode(
    node: SceneNodeData,
    parentId: string | undefined,
  ): void {
    this.nodes.set(node.id, node);
    this.parents.set(node.id, parentId);
    for (const child of node.children) {
      this.indexNode(child, node.id);
    }
  }

  private forSubtree(
    node: SceneNodeData,
    visit: (current: SceneNodeData) => void,
  ): void {
    const stack: SceneNodeData[] = [node];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) {
        continue;
      }
      visit(current);
      const children = current.children;
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child !== undefined) {
          stack.push(child);
        }
      }
    }
  }
}
