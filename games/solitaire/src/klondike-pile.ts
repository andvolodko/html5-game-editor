import type { Card } from "./card.js";
import {
  TABLEAU_FACE_DOWN_FAN_Y,
  TABLEAU_FACE_UP_FAN_Y,
  WASTE_FAN_X,
  WASTE_VISIBLE_COUNT,
} from "./klondike-layout.js";
import type { KlondikeRules } from "./klondike-rules.js";
import type { LiveCard } from "./live-card.js";

export type PileKind = "stock" | "waste" | "foundation" | "tableau";

export type CardOffset = { x: number; y: number; visible: boolean };

/** One Klondike pile: cards, scene node, selection/drop rules, and fan layout. */
export abstract class Pile {
  readonly cards: LiveCard[] = [];
  nodeId: string | undefined;

  constructor(
    readonly kind: PileKind,
    readonly index = 0,
  ) {}

  get length(): number {
    return this.cards.length;
  }

  get top(): LiveCard | undefined {
    return this.cards[this.cards.length - 1];
  }

  attach(nodeId: string): void {
    this.nodeId = nodeId;
  }

  equals(other: Pile): boolean {
    return this.kind === other.kind && this.index === other.index;
  }

  cardsFrom(startIndex: number): LiveCard[] {
    const run: LiveCard[] = [];
    for (let index = startIndex; index < this.cards.length; index += 1) {
      const card = this.cards[index];
      if (card) {
        run.push(card);
      }
    }
    return run;
  }

  identitiesFrom(startIndex: number): Card[] {
    const identities: Card[] = [];
    for (const card of this.cardsFrom(startIndex)) {
      identities.push(card.identity);
    }
    return identities;
  }

  findByNodeId(nodeId: string): { index: number; card: LiveCard } | undefined {
    for (let index = 0; index < this.cards.length; index += 1) {
      const card = this.cards[index];
      if (card?.matchesNode(nodeId)) {
        return { index, card };
      }
    }
    return undefined;
  }

  push(card: LiveCard): void {
    this.cards.push(card);
  }

  pop(): LiveCard | undefined {
    return this.cards.pop();
  }

  takeFrom(startIndex: number): LiveCard[] {
    return this.cards.splice(startIndex);
  }

  receive(moved: readonly LiveCard[]): void {
    for (const card of moved) {
      this.cards.push(card);
    }
  }

  clear(): void {
    this.cards.length = 0;
  }

  revealTop(): void {
    const top = this.top;
    if (top && !top.faceUp) {
      top.faceUp = true;
    }
  }

  abstract canSelect(index: number, rules: KlondikeRules): boolean;
  abstract canAccept(
    moving: readonly LiveCard[],
    rules: KlondikeRules,
  ): boolean;
  abstract offsetAt(index: number): CardOffset;
}

export class StockPile extends Pile {
  constructor() {
    super("stock");
  }

  override canSelect(index: number, rules: KlondikeRules): boolean {
    void index;
    void rules;
    return false;
  }

  override canAccept(moving: readonly LiveCard[], rules: KlondikeRules): boolean {
    void moving;
    void rules;
    return false;
  }

  override offsetAt(index: number): CardOffset {
    return { x: 0, y: 0, visible: index === this.length - 1 };
  }
}

export class WastePile extends Pile {
  constructor() {
    super("waste");
  }

  override canSelect(index: number, rules: KlondikeRules): boolean {
    void rules;
    return this.top?.faceUp === true && index === this.length - 1;
  }

  override canAccept(moving: readonly LiveCard[], rules: KlondikeRules): boolean {
    void moving;
    void rules;
    return false;
  }

  override offsetAt(index: number): CardOffset {
    const firstVisible = Math.max(0, this.length - WASTE_VISIBLE_COUNT);
    if (index < firstVisible) {
      return { x: 0, y: 0, visible: false };
    }
    return { x: (index - firstVisible) * WASTE_FAN_X, y: 0, visible: true };
  }
}

export class FoundationPile extends Pile {
  constructor(index: number) {
    super("foundation", index);
  }

  override canSelect(index: number, rules: KlondikeRules): boolean {
    void rules;
    const card = this.cards[index];
    return Boolean(card?.faceUp && this.top === card);
  }

  override canAccept(
    moving: readonly LiveCard[],
    rules: KlondikeRules,
  ): boolean {
    const head = moving[0];
    return (
      moving.length === 1 &&
      head !== undefined &&
      rules.canDropOnFoundation(head.identity, this.top?.identity)
    );
  }

  override offsetAt(index: number): CardOffset {
    void index;
    return { x: 0, y: 0, visible: true };
  }
}

export class TableauPile extends Pile {
  constructor(index: number) {
    super("tableau", index);
  }

  override canSelect(index: number, rules: KlondikeRules): boolean {
    const card = this.cards[index];
    if (!card?.faceUp) {
      return false;
    }
    return rules.isDescendingRun(this.identitiesFrom(index));
  }

  override canAccept(
    moving: readonly LiveCard[],
    rules: KlondikeRules,
  ): boolean {
    const head = moving[0];
    if (!head) {
      return false;
    }
    return rules.canDropOnTableau(head.identity, this.top?.identity);
  }

  override offsetAt(index: number): CardOffset {
    return { x: 0, y: TableauPile.stackOffsetY(this.cards, index), visible: true };
  }

  static stackOffsetY(
    cards: readonly Pick<LiveCard, "faceUp">[],
    index: number,
  ): number {
    let y = 0;
    const last = Math.min(index, cards.length);
    for (let i = 0; i < last; i += 1) {
      const card = cards[i];
      y += card?.faceUp ? TABLEAU_FACE_UP_FAN_Y : TABLEAU_FACE_DOWN_FAN_Y;
    }
    return y;
  }
}

/** Currently selected run on a pile. */
export class CardSelection {
  constructor(
    readonly pile: Pile,
    readonly index: number,
  ) {}

  moving(): LiveCard[] {
    return this.pile.cardsFrom(this.index);
  }

  isSame(pile: Pile, index: number): boolean {
    return this.index === index && this.pile.equals(pile);
  }
}
