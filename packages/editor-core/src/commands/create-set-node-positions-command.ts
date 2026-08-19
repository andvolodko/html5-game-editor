import { CompositeCommand, type Command } from "@game-editor/commands";
import { findNodeById, getTransform2D, type Vec2 } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import { SetTransform2DCommand } from "./set-transform-2d-command.js";

export interface NodePositionEntry {
  nodeId: string;
  position: Vec2;
}

/**
 * One undo step for one or more Transform2D position commits (viewport group drag).
 */
export function createSetNodePositionsCommand(
  document: DocumentManager,
  entries: readonly NodePositionEntry[],
  isLocked: (nodeId: string) => boolean,
): Command | undefined {
  const scene = document.getScene();
  const commands: Command[] = [];
  for (const entry of entries) {
    if (isLocked(entry.nodeId)) {
      continue;
    }
    const node = findNodeById(scene, entry.nodeId);
    const transform = node ? getTransform2D(node) : undefined;
    if (!transform) {
      continue;
    }
    if (
      transform.position.x === entry.position.x &&
      transform.position.y === entry.position.y
    ) {
      continue;
    }
    commands.push(
      new SetTransform2DCommand(document, entry.nodeId, {
        position: { x: entry.position.x, y: entry.position.y },
      }),
    );
  }
  if (commands.length === 0) {
    return undefined;
  }
  if (commands.length === 1) {
    return commands[0];
  }
  return new CompositeCommand("TranslateSelection", commands);
}
