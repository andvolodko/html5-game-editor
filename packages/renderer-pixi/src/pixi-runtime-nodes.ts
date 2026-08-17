import { Container, Graphics } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type {
  SceneNodeData,
  SpriteGizmoHandle,
  Transform2DComponentData,
  Vec2,
} from "@game-editor/scene";
import { applyRuntimeDisplayLabels } from "./pixi-display-labels.js";
import { SpriteSelectionGizmo } from "./sprite-selection-gizmo.js";
import type { VisualBounds } from "./visuals/types.js";
import { PLACEHOLDER_CORNER_RADIUS } from "./editor-chrome.js";

const DEGREES_TO_RADIANS = Math.PI / 180;

export interface RuntimeNode {
  /**
   * When true, owns editor chrome (dedicated visualsRoot, placeholder,
   * selection, gizmo) and always-present childrenRoot.
   */
  readonly editable: boolean;
  /** Transform root attached under parent `childrenRoot` (or world). */
  container: Container;
  /**
   * Parent for the leaf visual / editor chrome.
   * Editor: dedicated container. Playback: same as `container` (no wrapper).
   */
  visualsRoot: Container;
  /**
   * Scene-node children only — sibling index matches domain order.
   * Playback: created lazily on first child attach.
   */
  childrenRoot: Container | undefined;
  placeholder: Graphics | undefined;
  /** Active Pixi visual for the leaf component (not the transform container). */
  visual: Container | undefined;
  /** Discriminant of the last painted visual component. */
  visualType: string | undefined;
  /** Cached local AABB for hit testing / selection. */
  visualBounds: VisualBounds | undefined;
  supportsSpriteGizmo: boolean;
  selection: Graphics | undefined;
  gizmo: SpriteSelectionGizmo | undefined;
  /** Editor-only lock overlay (not scene data). */
  editorLocked: boolean;
  /** Editor-only hide overlay (not scene data). Combined with `node.visible`. */
  editorHidden: boolean;
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

  constructor() {
    this.world.label = "world";
  }

  get size(): number {
    return this.nodes.size;
  }

  has(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  get(nodeId: string): RuntimeNode | undefined {
    return this.nodes.get(nodeId);
  }

  /** Direct scene children, in childrenRoot sibling order. */
  listDirectChildren(parentId: string): RuntimeNode[] {
    const parent = this.nodes.get(parentId);
    const childrenRoot = parent?.childrenRoot;
    if (!childrenRoot) {
      return [];
    }
    const result: RuntimeNode[] = [];
    for (const child of childrenRoot.children) {
      if (!(child instanceof Container)) {
        continue;
      }
      const childId = this.containerToNodeId.get(child);
      const runtime = childId ? this.nodes.get(childId) : undefined;
      if (runtime) {
        result.push(runtime);
      }
    }
    return result;
  }

  values(): IterableIterator<RuntimeNode> {
    return this.nodes.values();
  }

  entries(): IterableIterator<[string, RuntimeNode]> {
    return this.nodes.entries();
  }

  create(node: SceneNodeData, options: RuntimeNodeCreateOptions): RuntimeNode {
    const editable = options.editable !== false;
    const container = new Container();
    // Container stays interactive for bubble/drag, but must NOT own a hitArea —
    // Pixi prunes the whole subtree outside hitArea, which blocked child sprites.
    // Playback also uses static: visualsRoot aliases container for script clicks.
    container.eventMode = "static";
    if (editable) {
      container.cursor = "grab";
    }
    container.interactiveChildren = true;

    let visualsRoot: Container;
    let childrenRoot: Container | undefined;
    let placeholder: Graphics | undefined;
    let selection: Graphics | undefined;
    let gizmo: SpriteSelectionGizmo | undefined;

    const runtimeRef: { current: RuntimeNode | undefined } = {
      current: undefined,
    };

    if (editable) {
      visualsRoot = new Container();
      // Editor: static for drag/gizmo.
      visualsRoot.eventMode = "static";
      visualsRoot.cursor = "grab";
      childrenRoot = this.createChildrenRootContainer();
      placeholder = new Graphics();
      selection = new Graphics();
      visualsRoot.addChild(placeholder);
      visualsRoot.addChild(selection);

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

      container.addChild(visualsRoot);
      container.addChild(childrenRoot);
    } else {
      // Playback: no visuals/placeholder/selection wrappers — leaf visual is a
      // direct child of the node container; childrenRoot is created lazily.
      visualsRoot = container;
      childrenRoot = undefined;
      placeholder = undefined;
      selection = undefined;
      gizmo = undefined;
    }

    this.attachToParent(container, node);
    const runtime: RuntimeNode = {
      editable,
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
      editorLocked: false,
      editorHidden: false,
      sizePreview: undefined,
      anchorPreview: undefined,
      node,
      warnedMissingAsset: false,
    };
    runtimeRef.current = runtime;
    applyRuntimeDisplayLabels(runtime);
    this.nodes.set(node.id, runtime);
    this.containerToNodeId.set(container, node.id);
    return runtime;
  }

  /** Refresh Pixi labels after a domain rename (or any node data swap). */
  syncDisplayLabels(nodeId: string): void {
    const runtime = this.nodes.get(nodeId);
    if (!runtime) {
      return;
    }
    applyRuntimeDisplayLabels(runtime);
  }

  /**
   * Ensure a children host exists (playback creates it on first child).
   * Editor nodes always have one from create().
   */
  ensureChildrenRoot(runtime: RuntimeNode): Container {
    if (runtime.childrenRoot) {
      return runtime.childrenRoot;
    }
    const childrenRoot = this.createChildrenRootContainer();
    runtime.container.addChild(childrenRoot);
    runtime.childrenRoot = childrenRoot;
    applyRuntimeDisplayLabels(runtime);
    return childrenRoot;
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
        ? this.ensureChildrenRootForId(parentId)
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
      container.skew.set(0, 0);
      return;
    }
    container.position.set(transform.position.x, transform.position.y);
    container.rotation = transform.rotation * DEGREES_TO_RADIANS;
    container.scale.set(transform.scale.x, transform.scale.y);
    container.skew.set(
      (transform.skew?.x ?? 0) * DEGREES_TO_RADIANS,
      (transform.skew?.y ?? 0) * DEGREES_TO_RADIANS,
    );
  }

  showPlaceholder(
    runtime: RuntimeNode,
    width: number,
    height: number,
    tint: number,
  ): void {
    if (!runtime.placeholder) {
      // Playback: no editor placeholders.
      return;
    }
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
    if (!node.parentId) {
      this.world.addChild(container);
      return;
    }
    const parentRuntime = this.nodes.get(node.parentId);
    if (!parentRuntime) {
      this.world.addChild(container);
      return;
    }
    this.ensureChildrenRoot(parentRuntime).addChild(container);
  }

  private ensureChildrenRootForId(parentId: string): Container | undefined {
    const parent = this.nodes.get(parentId);
    if (!parent) {
      return undefined;
    }
    return this.ensureChildrenRoot(parent);
  }

  private createChildrenRootContainer(): Container {
    const childrenRoot = new Container();
    childrenRoot.eventMode = "passive";
    childrenRoot.interactiveChildren = true;
    return childrenRoot;
  }

  private collectSubtreeIds(runtime: RuntimeNode): string[] {
    const ids: string[] = [];
    const walk = (node: RuntimeNode) => {
      ids.push(node.node.id);
      const children = node.childrenRoot?.children;
      if (!children) {
        return;
      }
      for (const child of children) {
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
