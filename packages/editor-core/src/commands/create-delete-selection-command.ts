import type { Command } from "@game-editor/commands";
import { normalizeRootMostNodeIds } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type { SelectionManager } from "../selection-manager.js";
import { DeleteNodeCommand } from "./delete-node-command.js";
import { DeleteNodesCommand } from "./delete-nodes-command.js";

/**
 * Delete selected root-most nodes as one undo step.
 */
export function createDeleteSelectionCommand(
  document: DocumentManager,
  selection: SelectionManager,
): Command | undefined {
  const roots = normalizeRootMostNodeIds(
    document.getScene(),
    selection.getSelectedNodeIds(),
  );
  if (roots.length === 0) {
    return undefined;
  }
  if (roots.length === 1) {
    return new DeleteNodeCommand(document, selection, roots[0]!);
  }
  return new DeleteNodesCommand(document, selection, roots);
}
