import { getAncestorIds } from "@game-editor/scene";
import type { Editor } from "./editor.js";
import {
  descendantNodeIds,
  getEditorNodeFlags,
  isNodeEffectivelyLocked,
  isNodeEffectivelyVisible,
  isNodeHiddenInEditor,
  isNodeLocked,
  sceneHasHiddenNodes,
  sceneHasLockedNodes,
  subtreeNodeIds,
  type EditorNodeFlags,
} from "./editor-node-metadata.js";

export function editorIsNodeHiddenInEditor(
  editor: Editor,
  nodeId: string,
): boolean {
  return isNodeHiddenInEditor(editor.nodeMetadata.getSnapshot(), nodeId);
}

export function editorIsNodeEffectivelyVisible(
  editor: Editor,
  nodeId: string,
): boolean {
  return isNodeEffectivelyVisible(
    editor.getScene(),
    editor.nodeMetadata.getSnapshot(),
    nodeId,
  );
}

export function editorIsNodeLocked(editor: Editor, nodeId: string): boolean {
  return isNodeLocked(editor.nodeMetadata.getSnapshot(), nodeId);
}

export function editorIsNodeEffectivelyLocked(
  editor: Editor,
  nodeId: string,
): boolean {
  return isNodeEffectivelyLocked(
    editor.getScene(),
    editor.nodeMetadata.getSnapshot(),
    nodeId,
  );
}

export function editorGetNodeFlags(
  editor: Editor,
  nodeId: string,
): EditorNodeFlags {
  return getEditorNodeFlags(
    editor.getScene(),
    editor.nodeMetadata.getSnapshot(),
    nodeId,
  );
}

export function editorSetNodeHidden(
  editor: Editor,
  nodeId: string,
  hidden: boolean,
  options?: { recursive?: boolean },
): void {
  const ids =
    options?.recursive === true
      ? subtreeNodeIds(editor.getScene(), nodeId)
      : [nodeId];
  editor.nodeMetadata.setHidden(ids, hidden);
}

export function editorSetNodeLocked(
  editor: Editor,
  nodeId: string,
  locked: boolean,
  options?: { recursive?: boolean },
): void {
  const ids =
    options?.recursive === true
      ? subtreeNodeIds(editor.getScene(), nodeId)
      : [nodeId];
  editor.nodeMetadata.setLocked(ids, locked);
}

export function editorSetNodeHiddenRecursive(
  editor: Editor,
  nodeId: string,
  hidden: boolean,
): void {
  editor.nodeMetadata.setHidden(
    descendantNodeIds(editor.getScene(), nodeId),
    hidden,
  );
}

export function editorSetNodeLockedRecursive(
  editor: Editor,
  nodeId: string,
  locked: boolean,
): void {
  editor.nodeMetadata.setLocked(
    descendantNodeIds(editor.getScene(), nodeId),
    locked,
  );
}

export function editorShowAllNodes(editor: Editor): void {
  editor.nodeMetadata.showAll(editor.getScene());
}

export function editorHideAllNodes(editor: Editor): void {
  editor.nodeMetadata.hideAll(editor.getScene());
}

export function editorLockAllNodes(editor: Editor): void {
  editor.nodeMetadata.lockAll(editor.getScene());
}

export function editorUnlockAllNodes(editor: Editor): void {
  editor.nodeMetadata.unlockAll(editor.getScene());
}

export function editorToggleAllNodesHidden(editor: Editor): void {
  if (
    sceneHasHiddenNodes(editor.getScene(), editor.nodeMetadata.getSnapshot())
  ) {
    editorShowAllNodes(editor);
    return;
  }
  editorHideAllNodes(editor);
}

export function editorToggleAllNodesLocked(editor: Editor): void {
  if (
    sceneHasLockedNodes(editor.getScene(), editor.nodeMetadata.getSnapshot())
  ) {
    editorUnlockAllNodes(editor);
    return;
  }
  editorLockAllNodes(editor);
}

export function editorUnlockNodeForEditing(
  editor: Editor,
  nodeId: string,
): void {
  if (editorIsNodeLocked(editor, nodeId)) {
    editorSetNodeLocked(editor, nodeId, false);
    return;
  }
  const ancestors = getAncestorIds(editor.getScene(), nodeId);
  for (const ancestorId of ancestors) {
    if (editorIsNodeLocked(editor, ancestorId)) {
      editorSetNodeLocked(editor, ancestorId, false);
      return;
    }
  }
}
