import type { ScriptRuntimeServices } from "@game-editor/game-components";
import { BACK_CHILD_NAME, FACE_CHILD_NAME } from "./klondike-layout.js";
import type { Pile } from "./klondike-pile.js";
import type { KlondikeTable } from "./klondike-table.js";

export interface PileNodes {
  stock: string;
  waste: string;
  foundations: string[];
  tableau: string[];
}

/** Positions live card nodes onto pile containers. */
export class KlondikeView {
  constructor(private readonly services: ScriptRuntimeServices) {}

  attach(table: KlondikeTable, nodes: PileNodes): void {
    table.stock.attach(nodes.stock);
    table.waste.attach(nodes.waste);
    for (let index = 0; index < nodes.foundations.length; index += 1) {
      const nodeId = nodes.foundations[index];
      if (nodeId) {
        table.foundations[index]?.attach(nodeId);
      }
    }
    for (let index = 0; index < nodes.tableau.length; index += 1) {
      const nodeId = nodes.tableau[index];
      if (nodeId) {
        table.tableau[index]?.attach(nodeId);
      }
    }
  }

  sync(table: KlondikeTable): void {
    for (const pile of table.piles()) {
      this.syncPile(pile);
    }
  }

  static readFaceBackIds(
    services: ScriptRuntimeServices,
    cardNodeId: string,
  ): { faceNodeId: string; backNodeId: string } | undefined {
    const children = services.listChildNodes?.(cardNodeId) ?? [];
    let faceNodeId: string | undefined;
    let backNodeId: string | undefined;
    for (const child of children) {
      if (child.name === FACE_CHILD_NAME) {
        faceNodeId = child.id;
      }
      if (child.name === BACK_CHILD_NAME) {
        backNodeId = child.id;
      }
    }
    if (!faceNodeId || !backNodeId) {
      return undefined;
    }
    return { faceNodeId, backNodeId };
  }

  private syncPile(pile: Pile): void {
    const parentId = pile.nodeId;
    if (!parentId) {
      return;
    }
    for (let index = 0; index < pile.cards.length; index += 1) {
      const card = pile.cards[index];
      if (!card) {
        continue;
      }
      const pose = pile.offsetAt(index);
      this.services.reparentNode?.(card.nodeId, parentId);
      this.services.setTransform2D?.(card.nodeId, {
        position: { x: pose.x, y: pose.y },
      });
      this.services.setNodeVisible?.(card.nodeId, pose.visible);
      this.services.setNodeVisible?.(card.faceNodeId, card.faceUp);
      this.services.setNodeVisible?.(card.backNodeId, !card.faceUp);
    }
  }
}
