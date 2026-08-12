export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform2DComponentData {
  type: "Transform2D";
  id: string;
  position: Vec2;
  rotation: number;
  scale: Vec2;
  anchor?: Vec2;
}

export interface Transform3DComponentData {
  type: "Transform3D";
  id: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export type ComponentData = Transform2DComponentData | Transform3DComponentData;

export interface SceneNodeData {
  id: string;
  name: string;
  parentId?: string;
  components: ComponentData[];
  children: SceneNodeData[];
}

/**
 * Renderer-independent serialized scene. Must never contain PIXI.* or THREE.* objects.
 */
export interface SceneData {
  id: string;
  name: string;
  /** Persisted schema / format version. */
  version: number;
  nodes: SceneNodeData[];
}

/** Current scene document schema version. Bump when persisted shape changes incompatibly. */
export const SCENE_SCHEMA_VERSION = 1 as const;
