import {
  getAmbientLight,
  getDirectionalLight,
  getLeafThreeComponent,
  getPerspectiveCamera,
  getTransform3D,
  type SceneNodeData,
} from "@game-editor/scene";
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  type Object3D,
} from "three";
import { MODEL3D_PLACEHOLDER_HALF } from "./three-constants.js";
import { markPlaceholder } from "./three-gltf-cache.js";

const MODEL3D_PLACEHOLDER_COLOR = 0x6b8cff;

export function createThreePlaceholder(): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(
      MODEL3D_PLACEHOLDER_HALF * 2,
      MODEL3D_PLACEHOLDER_HALF * 2,
      MODEL3D_PLACEHOLDER_HALF * 2,
    ),
    new MeshStandardMaterial({
      color: MODEL3D_PLACEHOLDER_COLOR,
      flatShading: true,
    }),
  );
  markPlaceholder(mesh);
  return mesh;
}

export function buildThreeObject(node: SceneNodeData): Object3D {
  const leaf = getLeafThreeComponent(node);
  if (!leaf) {
    return new Group();
  }
  switch (leaf.type) {
    case "Model3D":
      return createThreePlaceholder();
    case "PerspectiveCamera": {
      const cam = getPerspectiveCamera(node)!;
      return new PerspectiveCamera(cam.fov, 1, cam.near, cam.far);
    }
    case "DirectionalLight": {
      const data = getDirectionalLight(node)!;
      return new DirectionalLight(data.color, data.intensity);
    }
    case "AmbientLight": {
      const data = getAmbientLight(node)!;
      return new AmbientLight(data.color, data.intensity);
    }
    default: {
      const _exhaustive: never = leaf;
      return _exhaustive;
    }
  }
}

export function applyThreeTransform(
  object: Object3D,
  node: SceneNodeData,
): void {
  const transform = getTransform3D(node);
  if (!transform) {
    return;
  }
  object.position.set(
    transform.position.x,
    transform.position.y,
    transform.position.z,
  );
  object.rotation.set(
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
  );
  object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
}

export function applyThreeLightOrCameraProps(
  object: Object3D,
  node: SceneNodeData,
  cameraAspect: number,
): void {
  const cam = getPerspectiveCamera(node);
  if (cam && object instanceof PerspectiveCamera) {
    object.fov = cam.fov;
    object.near = cam.near;
    object.far = cam.far;
    object.aspect = cameraAspect;
    object.updateProjectionMatrix();
  }
  const dir = getDirectionalLight(node);
  if (dir && object instanceof DirectionalLight) {
    object.color.setHex(dir.color);
    object.intensity = dir.intensity;
  }
  const amb = getAmbientLight(node);
  if (amb && object instanceof AmbientLight) {
    object.color.setHex(amb.color);
    object.intensity = amb.intensity;
  }
}
