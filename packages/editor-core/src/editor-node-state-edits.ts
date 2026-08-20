import { CompositeCommand, type Command } from "@game-editor/commands";
import {
  BASE_NODE_STATE_ID,
  type NodeStateId,
  type NodeStatePropertyPath,
} from "@game-editor/scene";
import type { Editor } from "./editor.js";
import {
  AddSceneStateCommand,
  DeleteSceneStateCommand,
  DuplicateSceneStateCommand,
  RenameSceneStateCommand,
  SetNodeStateOverrideCommand,
  type AddSceneStateOptions,
} from "./commands/index.js";
import {
  buildStateOverrideAfterResetProperty,
  isEditingNamedNodeState,
} from "./commands/node-state-override-build.js";

export function editorSetActiveNodeState(
  editor: Editor,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
): void {
  const previous = editor.nodeStates.getActiveStateId();
  if (stateId !== BASE_NODE_STATE_ID) {
    const exists = (editor.getScene().states ?? []).some(
      (entry) => entry.id === stateId,
    );
    if (!exists) {
      return;
    }
  }
  editor.nodeStates.setActiveStateId(stateId);
  editor.viewport.applyActiveNodeStateDisplay(previous);
}

export function editorAddSceneState(
  editor: Editor,
  options: AddSceneStateOptions,
): string {
  const command = new AddSceneStateCommand(editor.document, options);
  editor.execute(command);
  return command.createdStateId;
}

export function editorRenameSceneState(
  editor: Editor,
  stateId: NodeStateId,
  name: string,
): void {
  editor.execute(new RenameSceneStateCommand(editor.document, stateId, name));
}

export function editorDeleteSceneState(
  editor: Editor,
  stateId: NodeStateId,
): void {
  const wasActive = editor.nodeStates.getActiveStateId() === stateId;
  editor.execute(new DeleteSceneStateCommand(editor.document, stateId));
  const catalogIds = new Set(
    (editor.getScene().states ?? []).map((entry) => entry.id),
  );
  editor.nodeStates.ensureActiveStateExists(catalogIds);
  if (wasActive) {
    editor.viewport.applyActiveNodeStateDisplay(stateId);
  }
}

export function editorDuplicateSceneState(
  editor: Editor,
  stateId: NodeStateId,
): string | undefined {
  const command = new DuplicateSceneStateCommand(editor.document, stateId);
  editor.execute(command);
  return command.createdStateId || undefined;
}

export function editorEnsurePortraitLandscapeStates(editor: Editor): void {
  const existing = editor.getScene().states ?? [];
  const names = new Set(existing.map((entry) => entry.name.toLowerCase()));
  const commands: Command[] = [];
  if (!names.has("portrait")) {
    commands.push(
      new AddSceneStateCommand(editor.document, {
        name: "Portrait",
        viewport: { width: 1080, height: 1920 },
      }),
    );
  }
  if (!names.has("landscape")) {
    commands.push(
      new AddSceneStateCommand(editor.document, {
        name: "Landscape",
        viewport: { width: 1920, height: 1080 },
      }),
    );
  }
  if (commands.length === 0) {
    return;
  }
  if (commands.length === 1) {
    editor.execute(commands[0]!);
    return;
  }
  editor.execute(new CompositeCommand("AddPortraitLandscapeStates", commands));
}

export function editorResetNodeStateProperty(
  editor: Editor,
  nodeId: string,
  path: NodeStatePropertyPath,
): void {
  const stateId = editor.nodeStates.getActiveStateId();
  if (!isEditingNamedNodeState(stateId)) {
    return;
  }
  const node = editor.document.getNode(nodeId);
  if (!node || editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  const after = buildStateOverrideAfterResetProperty(node, stateId, path);
  editor.execute(
    new SetNodeStateOverrideCommand(editor.document, nodeId, stateId, after),
  );
}
