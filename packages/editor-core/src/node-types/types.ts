import type { AssetType } from "@game-editor/assets";
import type { SceneNodeData, Vec2 } from "@game-editor/scene";

/** Stable cross-renderer node type identity (not a JS class name). */
export type NodeTypeId = string;

export interface NodeCreationContext {
  name: string;
  position: Vec2;
  parentId?: string;
  /** Optional texture (or other) asset for types that accept one. */
  assetId?: string;
}

export interface NodeTypeDefinition {
  id: NodeTypeId;
  label: string;
  category: string;
  /** Lower sorts earlier among categories. */
  categoryOrder: number;
  /** Lower sorts earlier within a category. */
  order: number;
  icon?: string;
  canHaveChildren: boolean;
  /** When false, omitted from create menus (may still exist for lookup). */
  creatable?: boolean;
  supportedAssetTypes?: readonly AssetType[];
  renderer: "pixi" | "three";
  createDefaultNode(context: NodeCreationContext): SceneNodeData;
}

export interface NodeTypeCategoryGroup {
  category: string;
  categoryOrder: number;
  types: NodeTypeDefinition[];
}

export interface NodeTypeRendererGroup {
  renderer: "pixi" | "three";
  types: NodeTypeDefinition[];
}

export const NODE_TYPE_RENDERER_LABELS: Record<"pixi" | "three", string> = {
  pixi: "PIXI",
  three: "THREE",
};
