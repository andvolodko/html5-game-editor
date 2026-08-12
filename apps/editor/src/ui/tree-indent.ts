export const TREE_INDENT_BASE_PX = 8;
export const TREE_INDENT_PER_DEPTH_PX = 14;

export function treeIndentPadding(depth: number): string {
  return `${TREE_INDENT_BASE_PX + depth * TREE_INDENT_PER_DEPTH_PX}px`;
}
