import type { Card } from "./card.js";

/** A spawned card sprite pair plus its identity. */
export class LiveCard {
  constructor(
    readonly identity: Card,
    readonly nodeId: string,
    readonly faceNodeId: string,
    readonly backNodeId: string,
    public faceUp = false,
  ) {}

  get key(): string {
    return this.identity.key;
  }

  get label(): string {
    return this.identity.label;
  }

  matchesNode(nodeId: string): boolean {
    return (
      this.nodeId === nodeId ||
      this.faceNodeId === nodeId ||
      this.backNodeId === nodeId
    );
  }
}
