import type { HierarchyDropPlacement } from "@game-editor/editor-core";

export type HierarchyDropIndicator =
  | { targetId: string; placement: HierarchyDropPlacement; blocked?: boolean }
  | { placement: "root"; blocked?: boolean }
  | null;

export type HierarchyRenamingTarget = "scene" | string | undefined;

export interface HierarchyContextMenuState {
  x: number;
  y: number;
  /** Scene root, empty background, or a real node. */
  target: "scene" | "background" | { nodeId: string };
}
