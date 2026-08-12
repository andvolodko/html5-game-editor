import {
  AmbientLight,
  CameraHelper,
  DirectionalLight,
  DirectionalLightHelper,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  Vector3,
  type Object3D,
  type Scene,
} from "three";
import { tagObjectWithNodeId } from "./three-editor-tools.js";

const HELPER_FLAG = "__gameEditorHelper";
const AMBIENT_HELPER_SIZE = 0.35;
const DIRECTIONAL_HELPER_SIZE = 1.25;

export function isEditorHelperObject(object: Object3D): boolean {
  return object.userData[HELPER_FLAG] === true;
}

/**
 * Editor-only visualizations for cameras / lights (not serialized, not in preview).
 * Helpers are pickable so hierarchy selection works from the viewport.
 */
export class ThreeEditorNodeHelpers {
  private readonly host = new Group();
  private readonly byNodeId = new Map<string, Object3D>();
  private readonly ambientSources = new Map<string, Object3D>();
  private readonly worldPos = new Vector3();
  private readonly enabled: boolean;

  constructor(scene: Scene, enabled: boolean) {
    this.enabled = enabled;
    this.host.name = "__editor_node_helpers";
    if (enabled) {
      scene.add(this.host);
    }
  }

  /** Roots to include in editor raycasts (in addition to node objects). */
  getPickRoots(): Object3D[] {
    if (!this.enabled) {
      return [];
    }
    return [this.host];
  }

  sync(nodeId: string, kind: string, object: Object3D): void {
    if (!this.enabled) {
      return;
    }
    this.remove(nodeId);
    const helper = this.createHelper(kind, object);
    if (!helper) {
      return;
    }
    markHelper(helper);
    tagObjectWithNodeId(helper, nodeId);
    this.byNodeId.set(nodeId, helper);
    if (kind === "AmbientLight") {
      this.ambientSources.set(nodeId, object);
      this.syncAmbientPose(nodeId);
    }
    this.host.add(helper);
  }

  remove(nodeId: string): void {
    const helper = this.byNodeId.get(nodeId);
    if (!helper) {
      return;
    }
    this.host.remove(helper);
    disposeHelper(helper);
    this.byNodeId.delete(nodeId);
    this.ambientSources.delete(nodeId);
  }

  clear(): void {
    for (const nodeId of [...this.byNodeId.keys()]) {
      this.remove(nodeId);
    }
  }

  dispose(): void {
    this.clear();
    this.host.parent?.remove(this.host);
  }

  /** Refresh CameraHelper / DirectionalLightHelper / ambient marker poses. */
  update(): void {
    if (!this.enabled) {
      return;
    }
    for (const [nodeId, helper] of this.byNodeId) {
      if (helper instanceof CameraHelper) {
        helper.update();
      } else if (helper instanceof DirectionalLightHelper) {
        helper.update();
      } else if (this.ambientSources.has(nodeId)) {
        this.syncAmbientPose(nodeId);
      }
    }
  }

  private createHelper(kind: string, object: Object3D): Object3D | undefined {
    if (kind === "PerspectiveCamera" && object instanceof PerspectiveCamera) {
      return new CameraHelper(object);
    }
    if (kind === "DirectionalLight" && object instanceof DirectionalLight) {
      return new DirectionalLightHelper(object, DIRECTIONAL_HELPER_SIZE);
    }
    if (kind === "AmbientLight" && object instanceof AmbientLight) {
      const mesh = new Mesh(
        new OctahedronGeometry(AMBIENT_HELPER_SIZE, 0),
        new MeshBasicMaterial({
          color: object.color.getHex(),
          wireframe: true,
          depthTest: false,
          transparent: true,
          opacity: 0.9,
        }),
      );
      mesh.renderOrder = 999;
      return mesh;
    }
    return undefined;
  }

  private syncAmbientPose(nodeId: string): void {
    const helper = this.byNodeId.get(nodeId);
    const source = this.ambientSources.get(nodeId);
    if (!helper || !source) {
      return;
    }
    source.getWorldPosition(this.worldPos);
    helper.position.copy(this.worldPos);
  }
}

function markHelper(object: Object3D): void {
  object.userData[HELPER_FLAG] = true;
  object.traverse((child) => {
    child.userData[HELPER_FLAG] = true;
  });
}

function disposeHelper(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        for (const entry of material) {
          entry.dispose();
        }
      } else {
        material.dispose();
      }
    }
  });
  if (object instanceof CameraHelper || object instanceof DirectionalLightHelper) {
    object.dispose();
  }
}
