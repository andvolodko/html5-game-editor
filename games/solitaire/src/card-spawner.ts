import type { ScriptRuntimeServices } from "@game-editor/game-components";
import { Card } from "./card.js";
import { CARD_FACE_ASSET_IDS } from "./card-catalog.js";
import { POINTER_CURSOR } from "./klondike-layout.js";
import { LiveCard } from "./live-card.js";
import { KlondikeView } from "./klondike-view.js";

/** Clones the CardTemplate node once per deck card. */
export class CardSpawner {
  constructor(private readonly services: ScriptRuntimeServices) {}

  spawnDeck(
    templateName: string,
    backAssetId: string,
    onCardTap: (nodeId: string) => void,
  ): { cards: LiveCard[]; unsubscribers: Array<() => void> } {
    const cards: LiveCard[] = [];
    const unsubscribers: Array<() => void> = [];
    const { cloneNodeByName, setSpriteAssetId, setNodeCursor, setNodeVisible, onNodePointerEvent } =
      this.services;
    if (!cloneNodeByName || !onNodePointerEvent) {
      return { cards, unsubscribers };
    }
    const deck = Card.createDeck();
    for (let index = 0; index < deck.length; index += 1) {
      const identity = deck[index];
      if (!identity) {
        continue;
      }
      const nodeId = cloneNodeByName(templateName, index);
      if (!nodeId) {
        continue;
      }
      const faces = KlondikeView.readFaceBackIds(this.services, nodeId);
      if (!faces) {
        continue;
      }
      const faceAssetId = CARD_FACE_ASSET_IDS[identity.key];
      if (faceAssetId) {
        setSpriteAssetId?.(faces.faceNodeId, faceAssetId);
      }
      setSpriteAssetId?.(faces.backNodeId, backAssetId);
      setNodeVisible?.(nodeId, false);
      setNodeCursor?.(nodeId, POINTER_CURSOR);
      setNodeCursor?.(faces.faceNodeId, POINTER_CURSOR);
      setNodeCursor?.(faces.backNodeId, POINTER_CURSOR);
      cards.push(
        new LiveCard(
          identity,
          nodeId,
          faces.faceNodeId,
          faces.backNodeId,
          false,
        ),
      );
      unsubscribers.push(
        onNodePointerEvent(nodeId, "pointertap", () => onCardTap(nodeId)),
      );
    }
    return { cards, unsubscribers };
  }
}
