import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import {
  createScriptContext,
  type ScriptTweenStart,
} from "@game-editor/game-components";
import {
  createSpriteNode,
  parseSceneData,
  type SceneNodeData,
} from "@game-editor/scene";
import { TweenGalleryBehaviour } from "./tween-gallery.js";

const NAMES = [
  "TweenMove",
  "TweenScaleFrom",
  "TweenFade",
  "TweenSpin",
  "TweenElastic",
  "TweenBounce",
  "TweenTimeline",
  "TweenStagger0",
  "TweenStagger1",
  "TweenStagger2",
  "TweenStagger3",
  "TweenStagger4",
];

function galleryContext() {
  const nodes = new Map<string, SceneNodeData>();
  for (const name of NAMES) {
    nodes.set(name, createSpriteNode(name, { x: 0, y: 0 }));
  }
  const started: ScriptTweenStart[] = [];
  const stopTween = vi.fn();
  const stopTweenTimeline = vi.fn();
  const ctx = createScriptContext({
    nodeId: "node_gallery",
    componentId: "comp_gallery",
    scriptId: "editor-features-demo.TweenGallery",
    properties: {},
    services: {
      bus: new EventBus(),
      changeScene: () => undefined,
      startTween: (request) => {
        started.push(request);
        return `tween_${started.length}`;
      },
      stopTween,
      createTweenTimeline: () => "tl_gallery",
      stopTweenTimeline,
    },
    lookup: {
      getNode: (nodeId) =>
        [...nodes.values()].find((node) => node.id === nodeId),
      getParentId: () => undefined,
      findByName: (name) => nodes.get(name),
    },
  });
  return {
    ctx,
    started,
    stopTween,
    stopTweenTimeline,
    nameOf(nodeId: string): string | undefined {
      for (const node of nodes.values()) {
        if (node.id === nodeId) {
          return node.name;
        }
      }
      return undefined;
    },
  };
}

describe("tween gallery scene", () => {
  it("parses the labeled example layout", () => {
    const raw = JSON.parse(
      readFileSync(
        new URL("../../assets/scenes/tween.json", import.meta.url),
        "utf8",
      ),
    ) as unknown;
    const scene = parseSceneData(raw);
    expect(scene.name).toBe("Tween");
    const names = scene.nodes.map((node) => node.name);
    expect(names).toContain("TweenMove");
    expect(names).toContain("TweenStagger4");
    expect(names).toContain("TitleStagger");
    const gallery = scene.nodes.find((node) => node.name === "TweenGallery");
    expect(gallery?.components.some(
      (component) =>
        component.type === "Script" &&
        component.scriptId === "editor-features-demo.TweenGallery",
    )).toBe(true);
  });
});

describe("TweenGalleryBehaviour", () => {
  it("starts a labeled motion for each gallery sprite", () => {
    const world = galleryContext();
    const behaviour = new TweenGalleryBehaviour(world.ctx);
    behaviour.start();

    const byName = (name: string) =>
      world.started.filter(
        (request) => world.nameOf(request.nodeId) === name,
      );

    expect(byName("TweenMove")[0]).toMatchObject({
      mode: "to",
      to: { x: "+=220" },
      ease: "power2.out",
      yoyo: true,
      repeat: -1,
    });
    expect(byName("TweenScaleFrom")[0]).toMatchObject({
      mode: "from",
      from: { scale: 0 },
      ease: "back.out",
      yoyo: true,
    });
    expect(byName("TweenFade")[0]).toMatchObject({
      mode: "to",
      to: { alpha: 0.15 },
      ease: "sine.inOut",
      yoyo: true,
    });
    expect(byName("TweenSpin")[0]).toMatchObject({
      mode: "to",
      to: { rotation: "+=360" },
      ease: "linear",
      repeat: -1,
      yoyo: false,
    });
    expect(byName("TweenElastic")[0]).toMatchObject({
      to: { scale: 1.4 },
      ease: "elastic.out",
      yoyo: true,
    });
    expect(byName("TweenBounce")[0]).toMatchObject({
      to: { y: "+=140" },
      ease: "bounce.out",
      yoyo: true,
    });

    const timeline = byName("TweenTimeline");
    expect(timeline.map((request) => request.timelinePosition)).toEqual([
      0, 0.45, 0.9,
    ]);
    expect(timeline[0]?.to).toEqual({ x: "+=160" });
    expect(timeline[1]?.to).toEqual({ rotation: "+=180" });
    expect(timeline[2]?.to).toEqual({ x: "-=160" });
    expect(timeline[0]?.timelineId).toBe("tl_gallery");

    const stagger = ["0", "1", "2", "3", "4"].map(
      (index) => byName(`TweenStagger${index}`)[0],
    );
    expect(stagger[0]?.to).toEqual({ y: "-=80" });
    expect(stagger[1]?.delay).toBeCloseTo((stagger[0]?.delay ?? 0) + 0.1);
    expect(stagger[4]?.delay).toBeCloseTo((stagger[0]?.delay ?? 0) + 0.4);

    behaviour.destroy();
    expect(world.stopTweenTimeline).toHaveBeenCalledWith("tl_gallery");
    expect(world.stopTween).toHaveBeenCalled();
  });
});
