import { Card } from "./card.js";
import {
  FoundationPile,
  StockPile,
  TableauPile,
  WastePile,
  type Pile,
} from "./klondike-pile.js";
import type { LiveCard } from "./live-card.js";

export const TABLEAU_COLUMN_COUNT = 7;
export const FOUNDATION_COUNT = 4;
export const DECK_SIZE = 52;

/** Stock, waste, foundations, and tableau columns. */
export class KlondikeTable {
  readonly stock = new StockPile();
  readonly waste = new WastePile();
  readonly foundations: FoundationPile[] = [];
  readonly tableau: TableauPile[] = [];

  constructor() {
    for (let index = 0; index < FOUNDATION_COUNT; index += 1) {
      this.foundations.push(new FoundationPile(index));
    }
    for (let index = 0; index < TABLEAU_COLUMN_COUNT; index += 1) {
      this.tableau.push(new TableauPile(index));
    }
  }

  piles(): Pile[] {
    return [this.stock, this.waste, ...this.foundations, ...this.tableau];
  }

  clear(): void {
    for (const pile of this.piles()) {
      pile.clear();
    }
  }

  loadDeck(cards: readonly LiveCard[]): void {
    this.clear();
    this.stock.receive(cards);
  }

  move(from: Pile, startIndex: number, to: Pile): LiveCard[] {
    const moved = from.takeFrom(startIndex);
    to.receive(moved);
    from.revealTop();
    return moved;
  }

  foundationCount(): number {
    let count = 0;
    for (const pile of this.foundations) {
      count += pile.length;
    }
    return count;
  }

  collectCards(): LiveCard[] {
    const cards: LiveCard[] = [];
    for (const pile of this.piles()) {
      for (const card of pile.cards) {
        cards.push(card);
      }
    }
    return cards;
  }

  findCard(
    nodeId: string,
  ): { pile: Pile; index: number; card: LiveCard } | undefined {
    for (const pile of this.piles()) {
      const found = pile.findByNodeId(nodeId);
      if (found) {
        return { pile, index: found.index, card: found.card };
      }
    }
    return undefined;
  }

  deal(allCards: LiveCard[], random: () => number = Math.random): boolean {
    const byKey = new Map<string, LiveCard>();
    for (const live of allCards) {
      byKey.set(live.key, live);
    }
    if (byKey.size !== DECK_SIZE) {
      return false;
    }
    const deck = Card.shuffle(Card.createDeck(), random);
    this.clear();
    for (let column = 0; column < TABLEAU_COLUMN_COUNT; column += 1) {
      const count = column + 1;
      const pile = this.tableau[column];
      if (!pile) {
        return false;
      }
      for (let cardIndex = 0; cardIndex < count; cardIndex += 1) {
        const identity = deck.shift();
        if (!identity) {
          return false;
        }
        pile.push(this.take(byKey, identity, cardIndex === count - 1));
      }
    }
    for (const identity of deck) {
      this.stock.push(this.take(byKey, identity, false));
    }
    return true;
  }

  drawFromStock(count: number): void {
    if (this.stock.length === 0) {
      const recycled = this.waste.takeFrom(0);
      recycled.reverse();
      for (const card of recycled) {
        card.faceUp = false;
      }
      this.stock.receive(recycled);
      return;
    }
    const drawCount = Math.min(count, this.stock.length);
    for (let step = 0; step < drawCount; step += 1) {
      const card = this.stock.pop();
      if (!card) {
        break;
      }
      card.faceUp = true;
      this.waste.push(card);
    }
  }

  private take(
    byKey: Map<string, LiveCard>,
    identity: Card,
    faceUp: boolean,
  ): LiveCard {
    const card = byKey.get(identity.key);
    if (!card) {
      throw new Error(`Missing spawned card ${identity.key}`);
    }
    card.faceUp = faceUp;
    return card;
  }
}
