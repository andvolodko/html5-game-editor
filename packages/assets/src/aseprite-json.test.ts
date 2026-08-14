import { describe, expect, it } from "vitest";
import {
  ASEPRITE_DEFAULT_FRAME_DURATION_MS,
  asepriteCliJsonToPixiSpritesheet,
  asepriteFrameNamespace,
  isAsepriteCliJson,
  listAsepriteCliFrames,
  normalizeAsepriteMetadata,
  normalizeAsepriteTagDirection,
} from "./aseprite-json.js";

const sampleCliJson = {
  frames: [
    {
      filename: "hero 0.aseprite",
      frame: { x: 0, y: 0, w: 32, h: 32 },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 },
      sourceSize: { w: 32, h: 32 },
      duration: 100,
    },
    {
      filename: "hero 1.aseprite",
      frame: { x: 32, y: 0, w: 32, h: 32 },
      duration: 150,
    },
    {
      filename: "hero 2.aseprite",
      frame: { x: 64, y: 0, w: 32, h: 32 },
      duration: 100,
    },
    {
      filename: "hero 3.aseprite",
      frame: { x: 96, y: 0, w: 32, h: 32 },
    },
  ],
  meta: {
    image: "hero.png",
    size: { w: 128, h: 32 },
    frameTags: [
      { name: "idle", from: 0, to: 1, direction: "forward" },
      { name: "run", from: 2, to: 3, direction: "reverse" },
      { name: "spin", from: 0, to: 3, direction: "pingpong" },
    ],
  },
};

describe("aseprite CLI JSON parsing", () => {
  it("detects CLI JSON and lists frames", () => {
    expect(isAsepriteCliJson(sampleCliJson)).toBe(true);
    expect(isAsepriteCliJson({ bones: [] })).toBe(false);
    expect(listAsepriteCliFrames(sampleCliJson)).toHaveLength(4);
  });

  it("normalizes tags, frameCount, and durations", () => {
    const metadata = normalizeAsepriteMetadata(sampleCliJson, {
      sheetPath: ".generated/assets/hero.png",
      dataPath: ".generated/assets/hero.json",
    });
    expect(metadata.frameCount).toBe(4);
    expect(metadata.width).toBe(32);
    expect(metadata.height).toBe(32);
    expect(metadata.tags.map((tag) => tag.name)).toEqual(["idle", "run", "spin"]);
    expect(metadata.tags[1]?.direction).toBe("reverse");
    expect(metadata.frameDurations).toEqual([
      100,
      150,
      100,
      ASEPRITE_DEFAULT_FRAME_DURATION_MS,
    ]);
  });

  it("maps tags onto Pixi spritesheet animations", () => {
    const pixi = asepriteCliJsonToPixiSpritesheet(sampleCliJson, "hero.png");
    expect(pixi.meta.image).toBe("hero.png");
    expect(asepriteFrameNamespace("hero.png")).toBe("hero");
    expect(asepriteFrameNamespace("assets/characters/hero.aseprite")).toBe(
      "assets-characters-hero",
    );
    expect(pixi.animations.idle).toEqual(["hero-frame-0", "hero-frame-1"]);
    expect(pixi.animations.run).toEqual(["hero-frame-3", "hero-frame-2"]);
    expect(pixi.animations.spin).toEqual([
      "hero-frame-0",
      "hero-frame-1",
      "hero-frame-2",
      "hero-frame-3",
      "hero-frame-2",
      "hero-frame-1",
    ]);
    expect(Object.keys(pixi.frames)).toEqual([
      "hero-frame-0",
      "hero-frame-1",
      "hero-frame-2",
      "hero-frame-3",
    ]);
  });

  it("namespaces frames from the source path so two heroes do not collide", () => {
    const pixi = asepriteCliJsonToPixiSpritesheet(
      sampleCliJson,
      "hero.png",
      asepriteFrameNamespace("assets/enemies/hero.aseprite"),
    );
    expect(pixi.animations.idle).toEqual([
      "assets-enemies-hero-frame-0",
      "assets-enemies-hero-frame-1",
    ]);
  });

  it("creates a default animation when there are no tags", () => {
    const pixi = asepriteCliJsonToPixiSpritesheet(
      {
        frames: [
          { frame: { x: 0, y: 0, w: 8, h: 8 }, duration: 80 },
          { frame: { x: 8, y: 0, w: 8, h: 8 }, duration: 80 },
        ],
        meta: { image: "solo.png", size: { w: 16, h: 8 } },
      },
      "solo.png",
    );
    expect(pixi.animations.default).toEqual(["solo-frame-0", "solo-frame-1"]);
  });

  it("normalizes Aseprite direction spellings", () => {
    expect(normalizeAsepriteTagDirection("ping-pong")).toBe("pingpong");
    expect(normalizeAsepriteTagDirection("backward")).toBe("reverse");
    expect(normalizeAsepriteTagDirection(undefined)).toBe("forward");
  });

  it("keeps the first tag when Aseprite repeats names (Attack/Defense per layer)", () => {
    const metadata = normalizeAsepriteMetadata(
      {
        frames: sampleCliJson.frames,
        meta: {
          image: "hero.png",
          size: { w: 128, h: 32 },
          frameTags: [
            { name: "Defense", from: 0, to: 1, direction: "forward" },
            { name: "Attack", from: 2, to: 3, direction: "forward" },
            { name: "Defense", from: 0, to: 1, direction: "reverse" },
            { name: "Attack", from: 2, to: 3, direction: "reverse" },
          ],
        },
      },
      {
        sheetPath: ".generated/assets/hero.png",
        dataPath: ".generated/assets/hero.json",
      },
    );
    expect(metadata.tags.map((tag) => tag.name)).toEqual(["Defense", "Attack"]);
    expect(metadata.tags[0]?.direction).toBe("forward");
  });

  it("uses cel size for width/height, not the packed atlas", () => {
    const metadata = normalizeAsepriteMetadata(
      {
        frames: [
          {
            frame: { x: 0, y: 0, w: 16, h: 20 },
            sourceSize: { w: 16, h: 20 },
          },
          {
            frame: { x: 16, y: 0, w: 16, h: 20 },
            sourceSize: { w: 16, h: 20 },
          },
        ],
        meta: { image: "puff.png", size: { w: 256, h: 128 } },
      },
      {
        sheetPath: ".generated/assets/puff.png",
        dataPath: ".generated/assets/puff.json",
      },
    );
    expect(metadata.width).toBe(16);
    expect(metadata.height).toBe(20);
  });
});
