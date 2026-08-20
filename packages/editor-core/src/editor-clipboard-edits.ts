import { CompositeCommand } from "@game-editor/commands";
import type { Editor } from "./editor.js";
import { PasteNodesCommand, PasteComponentCommand } from "./commands/index.js";
import { resolvePasteLocation, type NodeClipboard } from "./node-clipboard.js";
import {
  describeCopiedComponents,
  isCopyableComponent,
  listCopyableComponents,
  pasteComponentsBlockedReason,
  selectPasteableComponents,
  type ComponentClipboard,
} from "./component-clipboard.js";

export function editorCopySelectedNodes(
  editor: Editor,
  clipboard: NodeClipboard,
): boolean {
  return clipboard.copyFromScene(
    editor.document.getScene(),
    editor.selection.getSelectedNodeIds(),
  );
}

export function editorPasteNodes(
  editor: Editor,
  clipboard: NodeClipboard,
): readonly string[] {
  if (!clipboard.hasContent()) {
    return [];
  }
  const scene = editor.document.getScene();
  const location = resolvePasteLocation(
    scene,
    editor.selection.getPrimaryNodeId(),
  );
  if (
    location.parentId !== undefined &&
    editor.isNodeEffectivelyLocked(location.parentId)
  ) {
    return [];
  }
  const command = new PasteNodesCommand(
    editor.document,
    editor.selection,
    clipboard.templates(),
    location.parentId,
    location.index,
  );
  editor.execute(command);
  return command.createdNodeIds;
}

export function editorCopyComponent(
  editor: Editor,
  clipboard: ComponentClipboard,
  nodeId: string,
  componentId: string,
): boolean {
  const node = editor.document.getNode(nodeId);
  const component = node?.components.find((entry) => entry.id === componentId);
  if (!component || !isCopyableComponent(component)) {
    return false;
  }
  clipboard.copy([component]);
  return true;
}

export function editorCopyComponents(
  editor: Editor,
  clipboard: ComponentClipboard,
  nodeId: string,
): boolean {
  const node = editor.document.getNode(nodeId);
  if (!node) {
    return false;
  }
  return clipboard.copy(listCopyableComponents(node));
}

export function editorCopiedComponentLabel(
  editor: Editor,
  clipboard: ComponentClipboard,
): string | undefined {
  return describeCopiedComponents(clipboard.templates(), editor.components);
}

export function editorPasteComponentBlockedReason(
  editor: Editor,
  clipboard: ComponentClipboard,
  nodeId: string,
): string | undefined {
  const templates = clipboard.templates();
  if (templates.length === 0) {
    return "No component on the clipboard";
  }
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return "Node is locked";
  }
  const node = editor.document.getNode(nodeId);
  if (!node) {
    return "Unknown node";
  }
  return pasteComponentsBlockedReason(node, templates, editor.components);
}

export function editorPasteComponent(
  editor: Editor,
  clipboard: ComponentClipboard,
  nodeId: string,
): readonly string[] {
  if (editorPasteComponentBlockedReason(editor, clipboard, nodeId) !== undefined) {
    return [];
  }
  const node = editor.document.getNode(nodeId);
  if (!node) {
    return [];
  }
  const pasteable = selectPasteableComponents(
    node,
    clipboard.templates(),
    editor.components,
  );
  const commands = pasteable.map(
    (template) =>
      new PasteComponentCommand(
        editor.document,
        nodeId,
        template,
        editor.components,
      ),
  );
  if (commands.length === 0) {
    return [];
  }
  if (commands.length === 1) {
    const command = commands[0];
    if (!command) {
      return [];
    }
    editor.execute(command);
    return [command.addedComponentId];
  }
  editor.execute(new CompositeCommand("PasteComponents", commands));
  return commands.map((command) => command.addedComponentId);
}
