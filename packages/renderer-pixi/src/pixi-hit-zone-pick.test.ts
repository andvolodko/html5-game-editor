import { describe, expect, it } from "vitest";
import { Container } from "pixi.js";
import {
  createContainerNode,
  createHitZoneComponent,
  createSpriteNode,
} from "@game-editor/scene";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import {
  isPlaybackOverlayPointerTarget,
  pickAreaIfHit,
  pickRuntimeNodeId,
} from "./pixi-hit-zone-pick.js";

const HIT_ZONE_WIDTH = 200;
const HIT_ZONE_HEIGHT = 100;
const LABEL_WIDTH = 40;
const LABEL_HEIGHT = 20;
const SCREEN_ON_LABEL = { x: 0, y: 0 };

function stubVisual(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Container {
  return {
    visible: true,
    getBounds: () => bounds,
  } as unknown as Container;
}

function playbackRuntime(
  node: ReturnType<typeof createContainerNode>,
  visual?: Container,
): RuntimeNode {
  return {
    editable: false,
    node,
    container: new Container(),
    visual,
    visualsRoot: visual,
  } as RuntimeNode;
}

function graphLookup(
  runtimes: RuntimeNode[],
): (nodeId: string) => RuntimeNode | undefined {
  const map = new Map(runtimes.map((runtime) => [runtime.node.id, runtime]));
  return (nodeId) => map.get(nodeId);
}

describe("hybrid overlay pick vs HitZone / pointerEventMode", () => {
  it("does not let a smaller label steal a grouping HitZone pick", () => {
    const button = createContainerNode("Button");
    button.components.push(
      createHitZoneComponent({
        shape: { type: "rectangle", width: HIT_ZONE_WIDTH, height: HIT_ZONE_HEIGHT },
      }),
    );
    const label = createSpriteNode("text-regular", { x: 0, y: 0 }, {
      width: LABEL_WIDTH,
      height: LABEL_HEIGHT,
    });
    label.parentId = button.id;
    label.pointerEventMode = "none";

    const buttonRuntime = playbackRuntime(button);
    const labelRuntime = playbackRuntime(
      label,
      stubVisual({
        x: -LABEL_WIDTH / 2,
        y: -LABEL_HEIGHT / 2,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
      }),
    );
    const runtimes = [buttonRuntime, labelRuntime];
    const getRuntime = graphLookup(runtimes);

    expect(isPlaybackOverlayPointerTarget(labelRuntime, getRuntime)).toBe(false);
    expect(isPlaybackOverlayPointerTarget(buttonRuntime, getRuntime)).toBe(true);

    const labelArea = pickAreaIfHit(labelRuntime, SCREEN_ON_LABEL);
    const buttonArea = pickAreaIfHit(buttonRuntime, SCREEN_ON_LABEL);
    expect(labelArea).toBe(LABEL_WIDTH * LABEL_HEIGHT);
    expect(buttonArea).toBe(HIT_ZONE_WIDTH * HIT_ZONE_HEIGHT);
    expect(labelArea).toBeLessThan(buttonArea ?? Number.POSITIVE_INFINITY);

    expect(pickRuntimeNodeId(runtimes, SCREEN_ON_LABEL, getRuntime)).toBe(
      button.id,
    );
  });

  it("skips descendants of a grouping HitZone even without pointerEventMode none", () => {
    const button = createContainerNode("Button");
    button.components.push(
      createHitZoneComponent({
        shape: { type: "rectangle", width: HIT_ZONE_WIDTH, height: HIT_ZONE_HEIGHT },
      }),
    );
    const chrome = createSpriteNode("regular", { x: 0, y: 0 }, {
      width: LABEL_WIDTH,
      height: LABEL_HEIGHT,
    });
    chrome.parentId = button.id;

    const buttonRuntime = playbackRuntime(button);
    const chromeRuntime = playbackRuntime(
      chrome,
      stubVisual({
        x: -LABEL_WIDTH / 2,
        y: -LABEL_HEIGHT / 2,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
      }),
    );
    const getRuntime = graphLookup([buttonRuntime, chromeRuntime]);

    expect(isPlaybackOverlayPointerTarget(chromeRuntime, getRuntime)).toBe(false);
    expect(
      pickRuntimeNodeId(
        [buttonRuntime, chromeRuntime],
        SCREEN_ON_LABEL,
        getRuntime,
      ),
    ).toBe(button.id);
  });

  it("still picks a pointerEventMode none node in the editor", () => {
    const label = createSpriteNode("FG Label", { x: 0, y: 0 }, {
      width: LABEL_WIDTH,
      height: LABEL_HEIGHT,
    });
    label.pointerEventMode = "none";
    const runtime = {
      editable: true,
      node: label,
      container: new Container(),
      visual: stubVisual({
        x: 0,
        y: 0,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
      }),
      visualsRoot: undefined,
    } as RuntimeNode;

    expect(isPlaybackOverlayPointerTarget(runtime, () => undefined)).toBe(true);
  });
});
