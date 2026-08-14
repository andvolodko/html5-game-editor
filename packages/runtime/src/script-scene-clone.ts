import {
  allocateDuplicateName,
  cloneNodeSubtree,
  collectNodeNames,
  findNodeById,
  findNodeByName,
  getTransform2D,
  getTransform3D,
  insertNodeInScene,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";

const DEFAULT_CLONE_GRID_COLUMNS = 15;
const CLONE_SPREAD_2D = 32;
const CLONE_SPREAD_3D = 0.5;

function stripScriptComponents(node: SceneNodeData): void {
  node.components = node.components.filter(
    (component) => component.type !== "Script",
  );
  for (const child of node.children) {
    stripScriptComponents(child);
  }
}

function applyCloneOffset(
  node: SceneNodeData,
  index: number,
  columns: number,
): void {
  const gridColumns = Math.max(1, Math.floor(columns));
  const column = index % gridColumns;
  const row = Math.floor(index / gridColumns);
  const slotX = column + 1;
  const transform2d = getTransform2D(node);
  if (transform2d) {
    transform2d.position = {
      x: transform2d.position.x + slotX * CLONE_SPREAD_2D,
      y: transform2d.position.y + row * CLONE_SPREAD_2D,
    };
    return;
  }
  const transform3d = getTransform3D(node);
  if (!transform3d) {
    return;
  }
  transform3d.position = {
    x: transform3d.position.x + slotX * CLONE_SPREAD_3D,
    y: transform3d.position.y,
    z: transform3d.position.z + row * CLONE_SPREAD_3D,
  };
}

/**
 * Deep-clone the first node named `sourceName`. Scripts are stripped.
 * Runtime-only; caller syncs renderers.
 */
export function cloneNamedNodeInScene(
  scene: SceneData,
  sourceName: string,
  index: number,
  columns: number = DEFAULT_CLONE_GRID_COLUMNS,
): SceneNodeData | undefined {
  if (sourceName.length === 0) {
    return undefined;
  }
  const source = findNodeByName(scene, sourceName);
  if (!source) {
    return undefined;
  }
  const clone = cloneNodeSubtree(source);
  stripScriptComponents(clone);
  clone.name = allocateDuplicateName(source.name, collectNodeNames(scene));
  applyCloneOffset(clone, Math.max(0, index), columns);
  const siblings =
    source.parentId === undefined
      ? scene.nodes
      : findNodeById(scene, source.parentId)?.children;
  insertNodeInScene(
    scene,
    clone,
    source.parentId,
    siblings?.length ?? scene.nodes.length,
  );
  return clone;
}
