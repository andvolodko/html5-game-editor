import { describe, expect, it } from "vitest";
import { Card } from "./card.js";
import {
  TABLEAU_FACE_DOWN_FAN_Y,
  TABLEAU_FACE_UP_FAN_Y,
} from "./klondike-layout.js";
import {
  FoundationPile,
  TableauPile,
  WastePile,
} from "./klondike-pile.js";
import { KlondikeRules } from "./klondike-rules.js";
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

describe("TableauPile.stackOffsetY", () => {
  it("stacks face-down cards with the compact fan, then face-up with the larger fan", () => {
    const cards = [
      { faceUp: false },
      { faceUp: false },
      { faceUp: true },
      { faceUp: true },
    ];
    expect(TableauPile.stackOffsetY(cards, 0)).toBe(0);
    expect(TableauPile.stackOffsetY(cards, 1)).toBe(TABLEAU_FACE_DOWN_FAN_Y);
    expect(TableauPile.stackOffsetY(cards, 2)).toBe(TABLEAU_FACE_DOWN_FAN_Y * 2);
    expect(TableauPile.stackOffsetY(cards, 3)).toBe(
      TABLEAU_FACE_DOWN_FAN_Y * 2 + TABLEAU_FACE_UP_FAN_Y,
    );
  });
});

describe("Pile selection and drops", () => {
  it("lets waste select only the face-up top card", () => {
    const pile = new WastePile();
    pile.push(fakeCard("spades", "ace", "a", true));
    pile.push(fakeCard("hearts", "king", "k", true));
    expect(pile.canSelect(0, rules)).toBe(false);
    expect(pile.canSelect(1, rules)).toBe(true);
    expect(pile.canAccept([fakeCard("clubs", "02", "c")], rules)).toBe(false);
  });

  it("lets a foundation take an ace, then the next same suit", () => {
    const pile = new FoundationPile(0);
    const ace = fakeCard("diamonds", "ace", "a", true);
    expect(pile.canAccept([ace], rules)).toBe(true);
    pile.push(ace);
    expect(pile.canAccept([fakeCard("diamonds", "02", "two", true)], rules)).toBe(
      true,
    );
    expect(pile.canAccept([fakeCard("hearts", "02", "h", true)], rules)).toBe(
      false,
    );
  });

  it("lets a tableau take a king on empty and a descending run on a king", () => {
    const pile = new TableauPile(0);
    expect(pile.canAccept([fakeCard("spades", "king", "k", true)], rules)).toBe(
      true,
    );
    expect(pile.canAccept([fakeCard("spades", "queen", "q", true)], rules)).toBe(
      false,
    );
    pile.push(fakeCard("clubs", "king", "ck", true));
    expect(pile.canAccept([fakeCard("hearts", "queen", "hq", true)], rules)).toBe(
      true,
    );
    expect(pile.canSelect(0, rules)).toBe(true);
  });
});
