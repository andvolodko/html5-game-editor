import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";
import {
  CARD_BACK_ASSET_ID,
  CARD_CLICK_ASSET_ID,
  allCardTextureAssetIds,
} from "../card-catalog.js";
import { CardSpawner } from "../card-spawner.js";
import {
  CARD_TEMPLATE_NAME,
  POINTER_CURSOR,
  STATUS_HINT,
  STATUS_NEW_GAME_HINT,
  STATUS_NODE_NAME,
  STATUS_WIN,
  STOCK_PILE_NAME,
  TITLE_NODE_NAME,
  WASTE_PILE_NAME,
  FOUNDATION_PILE_NAMES,
  TABLEAU_PILE_NAMES,
} from "../klondike-layout.js";
import { CardSelection, type Pile } from "../klondike-pile.js";
import { KlondikeRules } from "../klondike-rules.js";
import { DECK_SIZE, KlondikeTable } from "../klondike-table.js";
import { KlondikeView, type PileNodes } from "../klondike-view.js";

const DRAW_ONE = "1";
const DRAW_THREE = "3";

type Props = {
  cardTemplateName: string;
  drawCount: number;
  backAssetId: string;
  cardClickAssetId: string;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  const drawRaw = raw.drawCount === DRAW_THREE ? DRAW_THREE : DRAW_ONE;
  return {
    cardTemplateName:
      typeof raw.cardTemplateName === "string" && raw.cardTemplateName.length > 0
        ? raw.cardTemplateName
        : CARD_TEMPLATE_NAME,
    drawCount: drawRaw === DRAW_THREE ? 3 : 1,
    backAssetId:
      typeof raw.backAssetId === "string" && raw.backAssetId.length > 0
        ? raw.backAssetId
        : CARD_BACK_ASSET_ID,
    cardClickAssetId:
      typeof raw.cardClickAssetId === "string" && raw.cardClickAssetId.length > 0
        ? raw.cardClickAssetId
        : CARD_CLICK_ASSET_ID,
  };
}

/** Klondike (draw 1/3) using SmallCards sprites. Tap to select and move. */
export class KlondikeBoardBehaviour implements ScriptInstance {
  private props: Props;
  private readonly table = new KlondikeTable();
  private readonly rules = new KlondikeRules();
  private readonly spawner: CardSpawner;
  private readonly view: KlondikeView;
  private readonly unsubscribers: Array<() => void> = [];
  private cardUnsubscribers: Array<() => void> = [];
  private selection: CardSelection | undefined;
  private skipPileTap = false;
  private spawned = false;
  private bootGeneration = 0;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.props = readProps(ctx.properties);
    this.spawner = new CardSpawner(ctx.services);
    this.view = new KlondikeView(ctx.services);
  }

  start(): void {
    this.onEnable();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.props = readProps(properties);
  }

  private onEnable(): void {
    const nodes = this.readPileNodes();
    if (nodes) {
      this.view.attach(this.table, nodes);
    }
    const templateId = this.childId(this.props.cardTemplateName);
    if (templateId) {
      this.ctx.services.setNodeVisible?.(templateId, false);
    }
    this.bindPileTaps();
    const titleId = this.childId(TITLE_NODE_NAME);
    if (titleId) {
      this.ctx.services.setNodeCursor?.(titleId, POINTER_CURSOR);
      this.subscribe(titleId, () => {
        this.skipPileTap = true;
        void this.startGame();
      });
    }
    void this.startGame();
  }

  private childId(name: string): string | undefined {
    const children = this.ctx.services.listChildNodes?.(this.ctx.nodeId) ?? [];
    for (const child of children) {
      if (child.name === name) {
        return child.id;
      }
    }
    return undefined;
  }

  private requiredChildIds(names: readonly string[]): string[] | undefined {
    const ids: string[] = [];
    for (const name of names) {
      const id = this.childId(name);
      if (!id) {
        return undefined;
      }
      ids.push(id);
    }
    return ids;
  }

  private readPileNodes(): PileNodes | undefined {
    const stock = this.childId(STOCK_PILE_NAME);
    const waste = this.childId(WASTE_PILE_NAME);
    const foundations = this.requiredChildIds(FOUNDATION_PILE_NAMES);
    const tableau = this.requiredChildIds(TABLEAU_PILE_NAMES);
    if (!stock || !waste || !foundations || !tableau) {
      return undefined;
    }
    return { stock, waste, foundations, tableau };
  }

  private bindPileTaps(): void {
    for (const pile of this.table.piles()) {
      if (!pile.nodeId) {
        continue;
      }
      this.ctx.services.setNodeCursor?.(pile.nodeId, POINTER_CURSOR);
      this.subscribe(pile.nodeId, () => this.onPileTap(pile));
    }
  }

  private async startGame(): Promise<void> {
    const generation = (this.bootGeneration += 1);
    const { preloadSceneAsset } = this.ctx.services;
    if (preloadSceneAsset) {
      const assetIds = allCardTextureAssetIds();
      const loads: Promise<void>[] = [];
      for (const assetId of assetIds) {
        loads.push(preloadSceneAsset(assetId));
      }
      await Promise.all(loads);
    }
    if (generation !== this.bootGeneration) {
      return;
    }
    if (!this.spawned) {
      const spawned = this.spawner.spawnDeck(
        this.props.cardTemplateName,
        this.props.backAssetId,
        (nodeId) => this.onCardTap(nodeId),
      );
      this.table.loadDeck(spawned.cards);
      this.cardUnsubscribers = spawned.unsubscribers;
      this.spawned = true;
    }
    if (!this.table.deal(this.table.collectCards())) {
      return;
    }
    this.selection = undefined;
    this.refresh(STATUS_HINT);
  }

  private playCardClick(): void {
    if (!this.props.cardClickAssetId) {
      return;
    }
    this.ctx.services.playAudio?.(this.props.cardClickAssetId);
  }

  private onCardTap(nodeId: string): void {
    this.skipPileTap = true;
    const found = this.table.findCard(nodeId);
    if (!found) {
      return;
    }
    this.playCardClick();
    if (found.pile.kind === "stock") {
      this.drawFromStock();
      return;
    }
    if (this.selection && this.tryDropOn(found.pile)) {
      return;
    }
    if (this.selection?.isSame(found.pile, found.index)) {
      if (!this.tryAutoFoundation()) {
        this.selection = undefined;
        this.refresh(STATUS_HINT);
      }
      return;
    }
    this.trySelect(found.pile, found.index);
  }

  private onPileTap(pile: Pile): void {
    if (this.skipPileTap) {
      this.skipPileTap = false;
      return;
    }
    if (pile.kind === "stock") {
      this.playCardClick();
      this.drawFromStock();
      return;
    }
    this.tryDropOn(pile);
  }

  private trySelect(pile: Pile, index: number): void {
    if (!pile.canSelect(index, this.rules)) {
      return;
    }
    const card = pile.cards[index];
    if (!card) {
      return;
    }
    this.selection = new CardSelection(pile, index);
    this.refresh(`Selected ${card.label}`);
  }

  private tryDropOn(to: Pile): boolean {
    const selection = this.selection;
    if (!selection) {
      return false;
    }
    const moving = selection.moving();
    if (!to.canAccept(moving, this.rules)) {
      return false;
    }
    this.table.move(selection.pile, selection.index, to);
    this.selection = undefined;
    this.refresh(this.winStatus());
    return true;
  }

  private tryAutoFoundation(): boolean {
    const selection = this.selection;
    if (!selection || selection.moving().length !== 1) {
      return false;
    }
    for (const pile of this.table.foundations) {
      if (this.tryDropOn(pile)) {
        return true;
      }
    }
    return false;
  }

  private drawFromStock(): void {
    this.selection = undefined;
    this.table.drawFromStock(this.props.drawCount);
    this.refresh(STATUS_HINT);
  }

  private winStatus(): string {
    if (this.table.foundationCount() === DECK_SIZE) {
      return `${STATUS_WIN} ${STATUS_NEW_GAME_HINT}`;
    }
    return STATUS_HINT;
  }

  private refresh(status: string): void {
    const statusId = this.childId(STATUS_NODE_NAME);
    if (statusId) {
      this.ctx.services.setText?.(statusId, status);
    }
    this.view.sync(this.table);
  }

  private subscribe(nodeId: string, handler: () => void): void {
    const { onNodePointerEvent } = this.ctx.services;
    if (!onNodePointerEvent) {
      return;
    }
    this.unsubscribers.push(onNodePointerEvent(nodeId, "pointertap", handler));
  }

  destroy(): void {
    for (const off of [...this.unsubscribers, ...this.cardUnsubscribers]) {
      off();
    }
    this.unsubscribers.length = 0;
    this.cardUnsubscribers = [];
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  cardTemplateName: { kind: "string", default: CARD_TEMPLATE_NAME },
  drawCount: {
    kind: "enum",
    default: DRAW_ONE,
    options: [DRAW_ONE, DRAW_THREE],
  },
  backAssetId: {
    kind: "asset",
    assetType: "texture",
    default: CARD_BACK_ASSET_ID,
  },
  cardClickAssetId: {
    kind: "asset",
    assetType: "audio",
    default: CARD_CLICK_ASSET_ID,
  },
};

export const klondikeBoardComponent = defineComponent({
  id: "solitaire.KlondikeBoard",
  displayName: "Klondike Board",
  category: "Gameplay",
  categoryOrder: 10,
  order: 10,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new KlondikeBoardBehaviour(ctx),
});

export function installKlondikeBoardRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(klondikeBoardComponent.id, klondikeBoardComponent.create);
}
