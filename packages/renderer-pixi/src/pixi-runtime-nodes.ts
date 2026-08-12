import { Container, Graphics } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type {
  SceneNodeData,
  SpriteGizmoHandle,
  Transform2DComponentData,
  Vec2,
} from "@game-editor/scene";
import { SpriteSelectionGizmo } from "./sprite-selection-gizmo.js";
import type { VisualBounds } from "./visuals/types.js";
import { PLACEHOLDER_CORNER_RADIUS } from "./editor-chrome.js";

export interface RuntimeNode {
  /** Transform root attached under parent `childrenRoot` (or world). */
  container: Container;
  /** Visuals only (sprite / placeholder / selection) — never scene siblings. */
  visualsRoot: Container;
  /** Scene-node children only — sibling index matches domain order. */
  childrenRoot: Container;
  placeholder: Graphics;
  /** Active Pixi visual for the leaf component (not the transform container). */
  visual: Container | undefined;
  /** Discriminant of the last painted visual component. */
  visualType: string | undefined;
  /** Cached local AABB for hit testing / selection. */
  visualBounds: VisualBounds | undefined;
  supportsSpriteGizmo: boolean;
  selection: Graphics;
  gizmo: SpriteSelectionGizmo | undefined;
  /** Live size override while a gizmo resize is in progress. */
  sizePreview: { width: number; height: number } | undefined;
  /** Live anchor override while an anchor drag is in progress. */
  anchorPreview: Vec2 | undefined;
  node: SceneNodeData;
  warnedMissingAsset: boolean;
}

export interface RuntimeNodeCreateOptions {
  /** When false, skip editor gizmos and non-passive pointer targets. Default true. */
  editable?: boolean;
  onGizmoHandlePointerDown: (
    runtime: RuntimeNode,
    handle: SpriteGizmoHandle,
    event: FederatedPointerEvent,
  ) => void;
}

/**
 * Display-tree identity for scene nodes: create / destroy / reparent.
 * Painting and pointer interaction stay on the renderer.
 */
export class PixiRuntimeGraph {
  readonly world = new Container();
  private readonly nodes = new Map<string, RuntimeNode>();
  /** O(1) reverse lookup for scene-node containers. */
  private readonly containerToNodeId = new Map<Container, string>();

  get size(): number {
    return this.nodes.size;
  }

  has(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  get(nodeId: string): RuntimeNode | undefined {
    return this.nodes.get(nodeId);
  }

  values(): IterableIterator<RuntimeNode> {
    return this.nodes.values();
  }

  create(node: SceneNodeData, options: RuntimeNodeCreateOptions): RuntimeNode {
    const editable = options.editable !== false;
    const container = new Container();
    // Container stays interactive for bubble/drag, but must NOT own a hitArea —
    // Pixi prunes the whole subtree outside hitArea, which blocked child sprites.
    container.eventMode = editable ? "static" : "passive";
    if (editable) {
      container.cursor = "grab";
    }
    container.interactiveChildren = true;

    const visualsRoot = new Container();
    // Hit target for this node's own visuals/gizmo (not scene children).
    visualsRoot.eventMode = editable ? "static" : "passive";
    if (editable) {
      visualsRoot.cursor = "grab";
    }
    const childrenRoot = new Container();
    childrenRoot.eventMode = "passive";
    childrenRoot.interactiveChildren = true;
    const placeholder = new Graphics();
    const selection = new Graphics();
    visualsRoot.addChild(placeholder);
    visualsRoot.addChild(selection);

    const runtimeRef: { current: RuntimeNode | undefined } = {
      current: undefined,
    };
    let gizmo: SpriteSelectionGizmo | undefined;
    if (editable) {
      gizmo = new SpriteSelectionGizmo({
        onHandlePointerDown: (handle, event) => {
          const live = runtimeRef.current;
          if (!live) {
            return;
          }
          options.onGizmoHandlePointerDown(live, handle, event);
        },
      });
      gizmo.setVisible(false);
      visualsRoot.addChild(gizmo.root);
    }

    container.addChild(visualsRoot);
    container.addChild(childrenRoot);

    this.attachToParent(container, node);
    const runtime: RuntimeNode = {
      container,
      visualsRoot,
      childrenRoot,
      placeholder,
      visual: undefined,
      visualType: undefined,
      visualBounds: undefined,
      supportsSpriteGizmo: false,
      selection,
      gizmo,
      sizePreview: undefined,
      anchorPreview: undefined,
      node,
      warnedMissingAsset: false,
    };
    runtimeRef.current = runtime;
    this.nodes.set(node.id, runtime);
    this.containerToNodeId.set(container, node.id);
    return runtime;
  }

  destroyNode(nodeId: string): number {
    const runtime = this.nodes.get(nodeId);
    if (!runtime) {
      return 0;
    }
    const subtreeIds = this.collectSubtreeIds(runtime);
    for (const id of subtreeIds) {
      this.nodes.get(id)?.container.removeFromParent();
    }
    let destroyed = 0;
    for (const id of subtreeIds) {
      const entry = this.nodes.get(id);
      if (!entry) {
        continue;
      }
      this.containerToNodeId.delete(entry.container);
      entry.container.destroy({ children: true });
      this.nodes.delete(id);
      destroyed += 1;
    }
    return destroyed;
  }

  clear(): void {
    for (const runtime of this.nodes.values()) {
      runtime.container.removeFromParent();
    }
    for (const id of [...this.nodes.keys()]) {
      const runtime = this.nodes.get(id);
      if (!runtime) {
        continue;
      }
      this.containerToNodeId.delete(runtime.container);
      runtime.container.destroy({ children: true });
      this.nodes.delete(id);
    }
  }

  /**
   * Move an existing runtime container under a new parent at the given
   * *scene-sibling* index without recreating the object.
   */
  reparentNode(
    nodeId: string,
    parentId: string | undefined,
    index: number,
  ): void {
    const runtime = this.nodes.get(nodeId);
    if (!runtime) {
      throw new Error(`PixiSceneRenderer: unknown node ${nodeId}`);
    }
    const parentContainer =
      parentId !== undefined
        ? this.nodes.get(parentId)?.childrenRoot
        : this.world;
    if (!parentContainer) {
      throw new Error(`PixiSceneRenderer: unknown parent ${parentId}`);
    }

    runtime.container.removeFromParent();
    const clamped = Math.max(
      0,
      Math.min(index, parentContainer.children.length),
    );
    parentContainer.addChildAt(runtime.container, clamped);
  }

  applyTransform(
    container: Container,
    transform: Transform2DComponentData | undefined,
  ): void {
    if (!transform) {
      container.position.set(0, 0);
      container.rotation = 0;
      container.scale.set(1, 1);
      return;
    }
    container.position.set(transform.position.x, transform.position.y);
    container.rotation = (transform.rotation * Math.PI) / 180;
    container.scale.set(transform.scale.x, transform.scale.y);
  }

  showPlaceholder(
    runtime: RuntimeNode,
    width: number,
    height: number,
    tint: number,
  ): void {
    if (runtime.visual) {
      runtime.visual.visible = false;
    }
    runtime.placeholder.visible = true;
    try {
      runtime.placeholder.clear();
      runtime.placeholder.roundRect(
        -width / 2,
        -height / 2,
        width,
        height,
        PLACEHOLDER_CORNER_RADIUS,
      );
      runtime.placeholder.fill({ color: tint });
    } catch {
      // Headless / destroyed Graphics context — bounds still drive hit testing.
    }
  }

  /** Attach a node container under its scene parent (or world root). */
  private attachToParent(container: Container, node: SceneNodeData): void {
    const parentRuntime = node.parentId
      ? this.nodes.get(node.parentId)
      : undefined;
    const parentContainer = parentRuntime?.childrenRoot ?? this.world;
    parentContainer.addChild(container);
  }

  private collectSubtreeIds(runtime: RuntimeNode): string[] {
    const ids: string[] = [];
    const walk = (node: RuntimeNode) => {
      ids.push(node.node.id);
      for (const child of node.childrenRoot.children) {
        if (!(child instanceof Container)) {
          continue;
        }
        const childId = this.containerToNodeId.get(child);
        if (!childId) {
          continue;
        }
        const childRuntime = this.nodes.get(childId);
        if (childRuntime) {
          walk(childRuntime);
        }
      }
    };
    walk(runtime);
    return ids;
  }
}
