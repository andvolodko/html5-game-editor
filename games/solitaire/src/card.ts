export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export const RANKS = [
  "ace",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "jack",
  "queen",
  "king",
] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

const ACE_RANK_VALUE = 1;

const RANK_LABELS: Record<Rank, string> = {
  ace: "Ace",
  "02": "2",
  "03": "3",
  "04": "4",
  "05": "5",
  "06": "6",
  "07": "7",
  "08": "8",
  "09": "9",
  "10": "10",
  jack: "Jack",
  queen: "Queen",
  king: "King",
};

const SUIT_LABELS: Record<Suit, string> = {
  clubs: "Clubs",
  diamonds: "Diamonds",
  hearts: "Hearts",
  spades: "Spades",
};

/** One playing-card identity (suit + rank). */
export class Card {
  constructor(
    readonly suit: Suit,
    readonly rank: Rank,
  ) {}

  get key(): string {
    return `${this.suit}_${this.rank}`;
  }

  get rankValue(): number {
    return RANKS.indexOf(this.rank) + ACE_RANK_VALUE;
  }

  get label(): string {
    return `${RANK_LABELS[this.rank]} of ${SUIT_LABELS[this.suit]}`;
  }

  static createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(new Card(suit, rank));
      }
    }
    return deck;
  }

  static shuffle<T>(items: T[], random: () => number = Math.random): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      const current = items[index];
      const other = items[swapIndex];
      if (current === undefined || other === undefined) {
        continue;
      }
      items[index] = other;
      items[swapIndex] = current;
    }
    return items;
  }
}
