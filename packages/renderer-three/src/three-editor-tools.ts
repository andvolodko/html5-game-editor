import {
  Raycaster,
  Vector2,
  type Camera,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import type { Vec3 } from "@game-editor/scene";
import type { ThreePointerHandlers } from "./three-scene-renderer-types.js";
import type { ThreeRuntimeGraph } from "./three-runtime-nodes.js";

const NODE_ID_USER_DATA_KEY = "gameEditorNodeId";

export function tagObjectWithNodeId(object: Object3D, nodeId: string): void {
  object.userData[NODE_ID_USER_DATA_KEY] = nodeId;
  object.traverse((child) => {
    child.userData[NODE_ID_USER_DATA_KEY] = nodeId;
  });
}

function findNodeId(object: Object3D): string | undefined {
  let current: Object3D | null = object;
  while (current) {
    const id = current.userData[NODE_ID_USER_DATA_KEY];
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
    current = current.parent;
  }
  return undefined;
}

function isObjectInScene(object: Object3D, scene: Scene): boolean {
  let current: Object3D | null = object;
  while (current) {
    if (current === scene) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Editor-only orbit + raycast pick + TransformControls.
 * Commits one transform via handlers.onGizmoTransformEnd on drag end.
 */
export class ThreeEditorTools {
  private readonly orbit: OrbitControls;
  private readonly transform: TransformControls;
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private handlers: ThreePointerHandlers | undefined;
  private attachedNodeId: string | undefined;
  private readonly onPointerDown: (event: PointerEvent) => void;
  private pickRootsExtra: () => Object3D[] = () => [];
  private viewCamera: PerspectiveCamera;
  private orbitAllowed = true;

  constructor(
    camera: PerspectiveCamera,
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly graph: ThreeRuntimeGraph,
    options?: { getExtraPickRoots?: () => Object3D[] },
  ) {
    this.viewCamera = camera;
    if (options?.getExtraPickRoots) {
      this.pickRootsExtra = options.getExtraPickRoots;
    }
    this.orbit = new OrbitControls(camera, renderer.domElement);
    this.orbit.enableDamping = true;

    this.transform = new TransformControls(camera, renderer.domElement);
    this.transform.addEventListener("dragging-changed", (event) => {
      const dragging = Boolean(
        (event as unknown as { value?: boolean }).value,
      );
      this.orbit.enabled = this.orbitAllowed && !dragging;
      if (!dragging && this.attachedNodeId) {
        this.emitTransformEnd(this.attachedNodeId);
      }
    });
    this.scene.add(this.transform.getHelper());

    this.onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || this.transform.dragging) {
        return;
      }
      const nodeId = this.pickNodeId(event.clientX, event.clientY);
      if (nodeId) {
        this.handlers?.onNodePointerDown?.(nodeId);
        return;
      }
      this.handlers?.onBackgroundPointerDown?.();
    };
    renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
  }

  /** Switch gizmo / orbit / pick to match the camera used for rendering. */
  setViewCamera(camera: PerspectiveCamera): void {
    this.viewCamera = camera;
    this.orbit.object = camera;
    this.transform.camera = camera;
    this.orbit.update();
  }

  setOrbitEnabled(enabled: boolean): void {
    this.orbitAllowed = enabled;
    this.orbit.enabled = enabled && !this.transform.dragging;
  }

  setTransformMode(mode: "translate" | "rotate" | "scale"): void {
    this.transform.setMode(mode);
  }

  getTransformMode(): "translate" | "rotate" | "scale" {
    const mode = this.transform.mode;
    if (mode === "rotate" || mode === "scale") {
      return mode;
    }
    return "translate";
  }

  setHandlers(handlers: ThreePointerHandlers | undefined): void {
    this.handlers = handlers;
  }

  setSelectedNodeIds(ids: readonly string[]): void {
    const primary = ids[0];
    if (!primary) {
      this.detachGizmo();
      return;
    }
    const entry = this.graph.get(primary);
    if (!entry) {
      this.detachGizmo();
      return;
    }
    // TransformControls requires the target to already be in the scene graph.
    if (!isObjectInScene(entry.object, this.scene)) {
      this.detachGizmo();
      return;
    }
    this.attachedNodeId = primary;
    this.transform.attach(entry.object);
  }

  /** Re-bind gizmo after runtime object identity changes (model swap). */
  refreshAttachment(): void {
    if (!this.attachedNodeId) {
      return;
    }
    this.setSelectedNodeIds([this.attachedNodeId]);
  }

  update(): void {
    this.orbit.update();
  }

  dispose(): void {
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.onPointerDown,
    );
    this.detachGizmo();
    this.scene.remove(this.transform.getHelper());
    this.transform.dispose();
    this.orbit.dispose();
  }

  private detachGizmo(): void {
    this.attachedNodeId = undefined;
    this.transform.detach();
  }

  pickNodeId(clientX: number, clientY: number): string | undefined {
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.ndc.x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    this.ndc.y = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    this.raycaster.setFromCamera(this.ndc, this.viewCamera as Camera);
    const roots: Object3D[] = [];
    for (const [, entry] of this.graph.entries()) {
      roots.push(entry.object);
    }
    roots.push(...this.pickRootsExtra());
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      const nodeId = findNodeId(hit.object);
      if (nodeId) {
        return nodeId;
      }
    }
    return undefined;
  }

  private emitTransformEnd(nodeId: string): void {
    const entry = this.graph.get(nodeId);
    if (!entry) {
      return;
    }
    const object = entry.object;
    const position: Vec3 = {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z,
    };
    const rotation: Vec3 = {
      x: object.rotation.x,
      y: object.rotation.y,
      z: object.rotation.z,
    };
    const scale: Vec3 = {
      x: object.scale.x,
      y: object.scale.y,
      z: object.scale.z,
    };
    this.handlers?.onGizmoTransformEnd?.(nodeId, {
      position,
      rotation,
      scale,
    });
  }
}
