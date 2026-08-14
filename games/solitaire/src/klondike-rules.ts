import type { Card } from "./card.js";

const KING_RANK_VALUE = 13;
const ACE_RANK_VALUE = 1;

/** Tableau / foundation placement rules. */
export class KlondikeRules {
  canDropOnTableau(moving: Card, destinationTop: Card | undefined): boolean {
    if (destinationTop === undefined) {
      return moving.rankValue === KING_RANK_VALUE;
    }
    return moving.rankValue === destinationTop.rankValue - 1;
  }

  canDropOnFoundation(moving: Card, destinationTop: Card | undefined): boolean {
    if (destinationTop === undefined) {
      return moving.rankValue === ACE_RANK_VALUE;
    }
    return (
      moving.suit === destinationTop.suit &&
      moving.rankValue === destinationTop.rankValue + 1
    );
  }

  isDescendingRun(cards: readonly Card[]): boolean {
    for (let index = 1; index < cards.length; index += 1) {
      const previous = cards[index - 1];
      const current = cards[index];
      if (previous === undefined || current === undefined) {
        return false;
      }
      if (!this.canDropOnTableau(current, previous)) {
        return false;
      }
    }
    return true;
  }
}
