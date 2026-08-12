import type {

  AnimatedSpriteComponentData,

  BitmapTextComponentData,

  ComponentData,

  GraphicsComponentData,

  HTMLTextComponentData,

  MeshComponentData,

  MeshPlaneComponentData,

  MeshRopeComponentData,

  MeshSimpleComponentData,

  NineSliceSpriteComponentData,

  PerspectiveMeshComponentData,

  SceneData,

  SceneNodeData,

  SpriteComponentData,

  SpineComponentData,

  TextComponentData,

  TilingSpriteComponentData,

  Transform2DComponentData,

  VisualComponentData,

} from "./types.js";

import { isLeafVisualComponentType } from "./visual-components.js";



export function findNodeById(

  scene: SceneData,

  nodeId: string,

): SceneNodeData | undefined {

  const stack: SceneNodeData[] = [...scene.nodes];

  while (stack.length > 0) {

    const node = stack.pop();

    if (node === undefined) {

      continue;

    }

    if (node.id === nodeId) {

      return node;

    }

    stack.push(...node.children);

  }

  return undefined;

}



export function getTransform2D(

  node: SceneNodeData,

): Transform2DComponentData | undefined {

  return node.components.find(

    (component): component is Transform2DComponentData =>

      component.type === "Transform2D",

  );

}



export function getSprite(

  node: SceneNodeData,

): SpriteComponentData | undefined {

  return node.components.find(

    (component): component is SpriteComponentData => component.type === "Sprite",

  );

}



export function getVisualComponent(

  node: SceneNodeData,

): VisualComponentData | undefined {

  return node.components.find(

    (component): component is VisualComponentData =>

      isLeafVisualComponentType(component.type),

  );

}



export function getComponentByType<T extends ComponentData["type"]>(

  node: SceneNodeData,

  type: T,

): Extract<ComponentData, { type: T }> | undefined {

  return node.components.find(

    (component): component is Extract<ComponentData, { type: T }> =>

      component.type === type,

  );

}



export function getNineSliceSprite(

  node: SceneNodeData,

): NineSliceSpriteComponentData | undefined {

  return getComponentByType(node, "NineSliceSprite");

}



export function getTilingSprite(

  node: SceneNodeData,

): TilingSpriteComponentData | undefined {

  return getComponentByType(node, "TilingSprite");

}



export function getGraphics(

  node: SceneNodeData,

): GraphicsComponentData | undefined {

  return getComponentByType(node, "Graphics");

}



export function getText(node: SceneNodeData): TextComponentData | undefined {

  return getComponentByType(node, "Text");

}



export function getBitmapText(

  node: SceneNodeData,

): BitmapTextComponentData | undefined {

  return getComponentByType(node, "BitmapText");

}



export function getHTMLText(

  node: SceneNodeData,

): HTMLTextComponentData | undefined {

  return getComponentByType(node, "HTMLText");

}



export function getMesh(node: SceneNodeData): MeshComponentData | undefined {

  return getComponentByType(node, "Mesh");

}



export function getMeshSimple(

  node: SceneNodeData,

): MeshSimpleComponentData | undefined {

  return getComponentByType(node, "MeshSimple");

}



export function getMeshRope(

  node: SceneNodeData,

): MeshRopeComponentData | undefined {

  return getComponentByType(node, "MeshRope");

}



export function getMeshPlane(

  node: SceneNodeData,

): MeshPlaneComponentData | undefined {

  return getComponentByType(node, "MeshPlane");

}



export function getPerspectiveMesh(

  node: SceneNodeData,

): PerspectiveMeshComponentData | undefined {

  return getComponentByType(node, "PerspectiveMesh");

}



export function getAnimatedSprite(

  node: SceneNodeData,

): AnimatedSpriteComponentData | undefined {

  return getComponentByType(node, "AnimatedSprite");

}



export function getSpine(

  node: SceneNodeData,

): SpineComponentData | undefined {

  return getComponentByType(node, "Spine");

}



/** Depth-first flatten of all nodes in the scene tree. */

export function flattenNodes(scene: SceneData): SceneNodeData[] {

  const result: SceneNodeData[] = [];

  const visit = (nodes: SceneNodeData[]) => {

    for (const node of nodes) {

      result.push(node);

      visit(node.children);

    }

  };

  visit(scene.nodes);

  return result;

}



export function removeNodeById(scene: SceneData, nodeId: string): boolean {

  const removeFrom = (nodes: SceneNodeData[]): boolean => {

    const index = nodes.findIndex((node) => node.id === nodeId);

    if (index >= 0) {

      nodes.splice(index, 1);

      return true;

    }

    for (const node of nodes) {

      if (removeFrom(node.children)) {

        return true;

      }

    }

    return false;

  };



  return removeFrom(scene.nodes);

}


