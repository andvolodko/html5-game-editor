import type { Editor } from "./editor.js";
import {
  AddScriptComponentCommand,
  AddHitZoneCommand,
  AddMaskCommand,
  RemoveComponentCommand,
  SetHitZoneCommand,
  SetMaskCommand,
  SetScriptPropertiesCommand,
  SetScriptEnabledCommand,
  type HitZonePatch,
  type MaskPatch,
} from "./commands/index.js";

export function editorAddScriptComponent(
  editor: Editor,
  nodeId: string,
  scriptId: string,
): string {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return "";
  }
  const command = new AddScriptComponentCommand(
    editor.document,
    nodeId,
    scriptId,
    editor.components,
  );
  editor.execute(command);
  return command.addedComponentId;
}

export function editorAddHitZone(editor: Editor, nodeId: string): string {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return "";
  }
  const command = new AddHitZoneCommand(editor.document, nodeId);
  editor.execute(command);
  return command.addedComponentId;
}

export function editorSetHitZone(
  editor: Editor,
  nodeId: string,
  patch: HitZonePatch,
): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  editor.execute(new SetHitZoneCommand(editor.document, nodeId, patch));
}

export function editorAddMask(editor: Editor, nodeId: string): string {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return "";
  }
  const command = new AddMaskCommand(editor.document, nodeId);
  editor.execute(command);
  return command.addedComponentId;
}

export function editorSetMask(
  editor: Editor,
  nodeId: string,
  patch: MaskPatch,
): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  editor.execute(new SetMaskCommand(editor.document, nodeId, patch));
}

export function editorRemoveComponent(
  editor: Editor,
  nodeId: string,
  componentId: string,
): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  editor.execute(
    new RemoveComponentCommand(editor.document, nodeId, componentId),
  );
}

export function editorSetScriptProperties(
  editor: Editor,
  nodeId: string,
  componentId: string,
  propertiesPatch: Record<string, unknown>,
): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  editor.execute(
    new SetScriptPropertiesCommand(
      editor.document,
      nodeId,
      componentId,
      propertiesPatch,
    ),
  );
}

export function editorSetScriptEnabled(
  editor: Editor,
  nodeId: string,
  componentId: string,
  enabled: boolean,
): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  editor.execute(
    new SetScriptEnabledCommand(editor.document, nodeId, componentId, enabled),
  );
}
