import { describe, expect, it } from "vitest";
import { Card } from "./card.js";
import { KlondikeRules } from "./klondike-rules.js";
import {
  DECK_SIZE,
  KlondikeTable,
  TABLEAU_COLUMN_COUNT,
} from "./klondike-table.js";
import { LiveCard } from "./live-card.js";

const rules = new KlondikeRules();

function fakeCard(
  suit: Card["suit"],
  rank: Card["rank"],
  nodeId: string,
  faceUp = false,
): LiveCard {
  return new LiveCard(
    new Card(suit, rank),
    nodeId,
    `${nodeId}_face`,
    `${nodeId}_back`,
    faceUp,
  );
}

function dealtTable(): KlondikeTable {
  const deck = Card.createDeck();
  const cards: LiveCard[] = [];
  for (let index = 0; index < deck.length; index += 1) {
    const identity = deck[index];
    if (identity) {
      cards.push(fakeCard(identity.suit, identity.rank, `node_${index}`));
    }
  }
  const table = new KlondikeTable();
  expect(table.deal(cards, () => 0.5)).toBe(true);
  return table;
}

describe("KlondikeTable.deal", () => {
  it("deals 28 tableau cards and 24 stock cards", () => {
    const table = dealtTable();
    let tableauCount = 0;
    for (const column of table.tableau) {
      tableauCount += column.length;
    }
    expect(tableauCount).toBe(28);
    expect(table.stock.length).toBe(24);
    expect(tableauCount + table.stock.length).toBe(DECK_SIZE);
    expect(table.tableau).toHaveLength(TABLEAU_COLUMN_COUNT);
    const lengths: number[] = [];
    for (const column of table.tableau) {
      lengths.push(column.length);
    }
    expect(lengths).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(table.tableau[0]?.cards[0]?.faceUp).toBe(true);
    expect(table.tableau[6]?.cards[5]?.faceUp).toBe(false);
    expect(table.tableau[6]?.cards[6]?.faceUp).toBe(true);
  });
});

describe("KlondikeTable.move", () => {
  it("moves a tableau run onto another pile and reveals the source top", () => {
    const table = dealtTable();
    const from = table.tableau[0];
    const to = table.tableau[1];
    if (!from || !to) {
      throw new Error("missing tableau piles");
    }
    const movingCard = from.cards[0];
    const before = to.length;
    table.move(from, 0, to);
    expect(from.length).toBe(0);
    expect(to.length).toBe(before + 1);
    expect(to.top?.nodeId).toBe(movingCard?.nodeId);
  });
});

describe("KlondikeRules", () => {
  it("allows a king on an empty tableau and rejects other ranks", () => {
    expect(rules.canDropOnTableau(new Card("spades", "king"), undefined)).toBe(true);
    expect(rules.canDropOnTableau(new Card("spades", "queen"), undefined)).toBe(false);
  });

  it("requires descending rank on tableau and allows the same color", () => {
    expect(
      rules.canDropOnTableau(new Card("hearts", "queen"), new Card("clubs", "king")),
    ).toBe(true);
    expect(
      rules.canDropOnTableau(new Card("spades", "queen"), new Card("clubs", "king")),
    ).toBe(true);
    expect(
      rules.canDropOnTableau(new Card("hearts", "jack"), new Card("clubs", "king")),
    ).toBe(false);
  });

  it("allows aces on empty foundations and same-suit ascending after", () => {
    expect(rules.canDropOnFoundation(new Card("diamonds", "ace"), undefined)).toBe(true);
    expect(rules.canDropOnFoundation(new Card("diamonds", "02"), undefined)).toBe(false);
    expect(
      rules.canDropOnFoundation(new Card("diamonds", "02"), new Card("diamonds", "ace")),
    ).toBe(true);
    expect(
      rules.canDropOnFoundation(new Card("hearts", "02"), new Card("diamonds", "ace")),
    ).toBe(false);
  });

  it("accepts a descending run of any colors", () => {
    expect(
      rules.isDescendingRun([
        new Card("spades", "king"),
        new Card("hearts", "queen"),
        new Card("clubs", "jack"),
      ]),
    ).toBe(true);
    expect(
      rules.isDescendingRun([
        new Card("spades", "king"),
        new Card("clubs", "queen"),
      ]),
    ).toBe(true);
    expect(
      rules.isDescendingRun([
        new Card("spades", "king"),
        new Card("hearts", "jack"),
      ]),
    ).toBe(false);
  });
});

describe("Card.shuffle", () => {
  it("keeps the same members", () => {
    const deck = Card.createDeck();
    const shuffled = Card.shuffle([...deck], () => 0.1);
    expect(shuffled).toHaveLength(deck.length);
    const keys = new Set<string>();
    for (const card of shuffled) {
      keys.add(card.key);
    }
    expect(keys.size).toBe(deck.length);
    expect(new Card("spades", "ace").rankValue).toBe(1);
    expect(new Card("spades", "king").rankValue).toBe(13);
  });
});
