import { CompositeCommand, type Command } from "@game-editor/commands";
import {
  getTransform2D,
  getVisualComponent,
  findNodeById,
  resolveNodeState,
} from "@game-editor/scene";
import { rasterAssetDisplaySize } from "@game-editor/assets";
import {
  SetTransform2DCommand,
  SetTransform3DCommand,
  createResetNodeTransformCommand,
  SetModel3DCommand,
  SetPerspectiveCameraCommand,
  SetDirectionalLightCommand,
  SetAmbientLightCommand,
  SetSceneRendererCommand,
  SetNodeLayerCommand,
  SetNodeVisibleCommand,
  SetNodeAlphaCommand,
  SetNodePointerCommand,
  SetSpriteSizeCommand,
  SetVisualComponentCommand,
  createSetNodePositionsCommand,
  SetNodeStateOverrideCommand,
  type Transform2DPatch,
  type Transform3DPatch,
  type Model3DPatch,
  type PerspectiveCameraPatch,
  type DirectionalLightPatch,
  type AmbientLightPatch,
  type SpriteSizePatch,
  type NodePointerPatch,
  type NodePositionEntry,
} from "./commands/index.js";
import {
  buildStateOverrideAfterAlpha,
  buildStateOverrideAfterPosition,
  buildStateOverrideAfterTransformPatch,
  buildStateOverrideAfterVisible,
  isEditingNamedNodeState,
} from "./commands/node-state-override-build.js";
import type { Editor } from "./editor.js";
import type { SceneRendererKind } from "@game-editor/scene";

function executeUnlessLocked(
  editor: Editor,
  nodeId: string,
  command: Command,
): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  editor.execute(command);
}

export function editorSetTransform2D(
  editor: Editor,
  nodeId: string,
  patch: Transform2DPatch,
): void {
  const stateId = editor.nodeStates.getActiveStateId();
  if (isEditingNamedNodeState(stateId)) {
    const node = findNodeById(editor.getScene(), nodeId);
    if (!node || editor.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    const after = buildStateOverrideAfterTransformPatch(node, stateId, patch);
    executeUnlessLocked(
      editor,
      nodeId,
      new SetNodeStateOverrideCommand(editor.document, nodeId, stateId, after),
    );
    return;
  }
  executeUnlessLocked(
    editor,
    nodeId,
    new SetTransform2DCommand(editor.document, nodeId, patch),
  );
}

export function editorSetNodePositions(
  editor: Editor,
  entries: readonly NodePositionEntry[],
): boolean {
  const stateId = editor.nodeStates.getActiveStateId();
  if (isEditingNamedNodeState(stateId)) {
    const commands: Command[] = [];
    for (const entry of entries) {
      if (editor.isNodeEffectivelyLocked(entry.nodeId)) {
        continue;
      }
      const node = findNodeById(editor.getScene(), entry.nodeId);
      if (!node || !getTransform2D(node)) {
        continue;
      }
      const after = buildStateOverrideAfterPosition(
        node,
        stateId,
        entry.position,
      );
      const existing = node.stateOverrides?.[stateId];
      const beforeJson = JSON.stringify(existing ?? null);
      const afterJson = JSON.stringify(after ?? null);
      if (beforeJson === afterJson) {
        continue;
      }
      commands.push(
        new SetNodeStateOverrideCommand(
          editor.document,
          entry.nodeId,
          stateId,
          after,
        ),
      );
    }
    if (commands.length === 0) {
      return false;
    }
    if (commands.length === 1) {
      editor.execute(commands[0]!);
    } else {
      editor.execute(new CompositeCommand("TranslateSelection", commands));
    }
    return true;
  }

  const command = createSetNodePositionsCommand(
    editor.document,
    entries,
    (nodeId) => editor.isNodeEffectivelyLocked(nodeId),
  );
  if (!command) {
    return false;
  }
  editor.execute(command);
  return true;
}

export function editorSetTransform3D(
  editor: Editor,
  nodeId: string,
  patch: Transform3DPatch,
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetTransform3DCommand(editor.document, nodeId, patch),
  );
}

export function editorResetNodeTransform(
  editor: Editor,
  nodeId?: string,
): boolean {
  const id = nodeId ?? editor.selection.getPrimaryNodeId();
  if (!id || editor.isNodeEffectivelyLocked(id)) {
    return false;
  }
  const node = editor.document.getNode(id);
  const visual = node ? getVisualComponent(node) : undefined;
  const assetId =
    visual && "assetId" in visual && typeof visual.assetId === "string"
      ? visual.assetId
      : undefined;
  const asset = assetId ? editor.assets.get(assetId) : undefined;
  const displaySize = asset ? rasterAssetDisplaySize(asset) : undefined;
  const command = createResetNodeTransformCommand(
    editor.document,
    id,
    displaySize ? { displaySize } : undefined,
  );
  if (!command) {
    return false;
  }
  editor.execute(command);
  return true;
}

export function editorSetModel3D(
  editor: Editor,
  nodeId: string,
  patch: Model3DPatch,
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetModel3DCommand(editor.document, nodeId, patch),
  );
}

export function editorSetPerspectiveCamera(
  editor: Editor,
  nodeId: string,
  patch: PerspectiveCameraPatch,
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetPerspectiveCameraCommand(editor.document, nodeId, patch),
  );
}

export function editorSetDirectionalLight(
  editor: Editor,
  nodeId: string,
  patch: DirectionalLightPatch,
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetDirectionalLightCommand(editor.document, nodeId, patch),
  );
}

export function editorSetAmbientLight(
  editor: Editor,
  nodeId: string,
  patch: AmbientLightPatch,
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetAmbientLightCommand(editor.document, nodeId, patch),
  );
}

export function editorSetSceneRenderer(
  editor: Editor,
  renderer: SceneRendererKind,
): void {
  editor.execute(new SetSceneRendererCommand(editor.document, renderer));
}

export function editorSetNodeLayer(
  editor: Editor,
  nodeId: string,
  layer: "background" | "foreground",
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetNodeLayerCommand(editor.document, nodeId, layer),
  );
}

export function editorSetNodeVisible(
  editor: Editor,
  nodeId: string,
  visible: boolean,
): void {
  const stateId = editor.nodeStates.getActiveStateId();
  if (isEditingNamedNodeState(stateId)) {
    const node = findNodeById(editor.getScene(), nodeId);
    if (!node) {
      return;
    }
    const after = buildStateOverrideAfterVisible(node, stateId, visible);
    executeUnlessLocked(
      editor,
      nodeId,
      new SetNodeStateOverrideCommand(editor.document, nodeId, stateId, after),
    );
    return;
  }
  executeUnlessLocked(
    editor,
    nodeId,
    new SetNodeVisibleCommand(editor.document, nodeId, visible),
  );
}

export function editorSetNodeAlpha(
  editor: Editor,
  nodeId: string,
  alpha: number,
): void {
  const stateId = editor.nodeStates.getActiveStateId();
  if (isEditingNamedNodeState(stateId)) {
    const node = findNodeById(editor.getScene(), nodeId);
    if (!node) {
      return;
    }
    const after = buildStateOverrideAfterAlpha(node, stateId, alpha);
    executeUnlessLocked(
      editor,
      nodeId,
      new SetNodeStateOverrideCommand(editor.document, nodeId, stateId, after),
    );
    return;
  }
  executeUnlessLocked(
    editor,
    nodeId,
    new SetNodeAlphaCommand(editor.document, nodeId, alpha),
  );
}

export function editorSetNodePointer(
  editor: Editor,
  nodeId: string,
  patch: NodePointerPatch,
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetNodePointerCommand(editor.document, nodeId, patch),
  );
}

export function editorNudgeSelectedNodes(
  editor: Editor,
  deltaX: number,
  deltaY: number,
): boolean {
  const nodeIds = editor.selection.getSelectedNodeIds();
  if (nodeIds.length === 0) {
    return false;
  }

  const stateId = editor.nodeStates.getActiveStateId();
  const commands: Command[] = [];
  for (const nodeId of nodeIds) {
    const node = editor.document.getNode(nodeId);
    const transform = node ? getTransform2D(node) : undefined;
    if (!transform || editor.isNodeEffectivelyLocked(nodeId)) {
      continue;
    }
    if (isEditingNamedNodeState(stateId) && node) {
      const effective = resolveNodeState(node, stateId);
      if (!effective.transform2D) {
        continue;
      }
      const after = buildStateOverrideAfterPosition(node, stateId, {
        x: effective.transform2D.position.x + deltaX,
        y: effective.transform2D.position.y + deltaY,
      });
      commands.push(
        new SetNodeStateOverrideCommand(
          editor.document,
          nodeId,
          stateId,
          after,
        ),
      );
      continue;
    }
    commands.push(
      new SetTransform2DCommand(editor.document, nodeId, {
        position: {
          x: transform.position.x + deltaX,
          y: transform.position.y + deltaY,
        },
      }),
    );
  }

  if (commands.length === 0) {
    return false;
  }
  if (commands.length === 1) {
    editor.execute(commands[0]!);
  } else {
    editor.execute(new CompositeCommand("NudgeSelection", commands));
  }
  return true;
}

export function editorSetSpriteSize(
  editor: Editor,
  nodeId: string,
  patch: SpriteSizePatch,
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetSpriteSizeCommand(editor.document, nodeId, patch),
  );
}

export function editorSetVisualComponent(
  editor: Editor,
  nodeId: string,
  patch: Record<string, unknown>,
): void {
  executeUnlessLocked(
    editor,
    nodeId,
    new SetVisualComponentCommand(editor.document, nodeId, patch),
  );
}
