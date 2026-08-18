import { describe, expect, it } from "vitest";
import {
  collectReferencedAssetIds,
  createAnimatedSpriteComponent,
  createBitmapTextComponent,
  createEmptyScene,
  createHitZoneNode,
  createMaskComponent,
  createMaskNode,
  createNodeWithVisual,
  createScriptComponent,
  createSpriteNode,
  createTextComponent,
  createTilemapComponent,
  parseSceneData,
  SCENE_SCHEMA_VERSION,
  setTile,
  type SceneData,
} from "./index.js";

describe("scene schema", () => {
  it("creates a versioned empty scene", () => {
    const scene = createEmptyScene("Main");
    expect(scene.version).toBe(SCENE_SCHEMA_VERSION);
    expect(scene.name).toBe("Main");
    expect(scene.nodes).toEqual([]);
  });

  it("accepts omitted node visible as the default and persists visible false", () => {
    const hidden = createSpriteNode("Hidden", { x: 0, y: 0 });
    hidden.visible = false;
    const parsed = parseSceneData({
      id: "scene_1",
      name: "Demo",
      version: SCENE_SCHEMA_VERSION,
      nodes: [
        {
          id: "node_1",
          name: "Shown",
          components: hidden.components,
          children: [],
        },
        {
          id: "node_2",
          name: "Hidden",
          visible: false,
          components: hidden.components,
          children: [],
        },
      ],
    });
    expect(parsed.nodes[0]?.visible).toBeUndefined();
    expect(parsed.nodes[1]?.visible).toBe(false);
  });

  it("accepts omitted node alpha as the default and persists other values", () => {
    const faded = createSpriteNode("Faded", { x: 0, y: 0 });
    faded.alpha = 0.5;
    const parsed = parseSceneData({
      id: "scene_1",
      name: "Demo",
      version: SCENE_SCHEMA_VERSION,
      nodes: [
        {
          id: "node_1",
          name: "Opaque",
          components: faded.components,
          children: [],
        },
        {
          id: "node_2",
          name: "Faded",
          alpha: 0.5,
          components: faded.components,
          children: [],
        },
      ],
    });
    expect(parsed.nodes[0]?.alpha).toBeUndefined();
    expect(parsed.nodes[1]?.alpha).toBe(0.5);
  });

  it("validates a Transform2D scene document", () => {
    const input: SceneData = {
      id: "scene_1",
      name: "Demo",
      version: SCENE_SCHEMA_VERSION,
      nodes: [
        {
          id: "node_1",
          name: "SpriteRoot",
          components: [
            {
              type: "Transform2D",
              id: "comp_1",
              position: { x: 10, y: 20 },
              rotation: 0,
              scale: { x: 1, y: 1 },
            },
          ],
          children: [],
        },
      ],
    };

    const parsed = parseSceneData(input);
    expect(parsed.nodes[0]?.components[0]?.type).toBe("Transform2D");
  });

  it("serializes sprite assetId references without Pixi types", () => {
    const scene = createEmptyScene("Sprite Scene");
    scene.nodes.push(
      createSpriteNode("Hero", { x: 40, y: 60 }, {
        assetId: "asset_hero",
        width: 128,
        height: 128,
      }),
    );

    const json = JSON.parse(JSON.stringify(scene)) as unknown;
    const parsed = parseSceneData(json);
    const sprite = parsed.nodes[0]?.components.find((c) => c.type === "Sprite");
    expect(sprite && "assetId" in sprite ? sprite.assetId : undefined).toBe(
      "asset_hero",
    );
    expect(sprite && "tint" in sprite ? sprite.tint : undefined).toBeUndefined();
    expect(JSON.stringify(parsed)).not.toMatch(/PIXI|Application|Texture/i);
  });

  it("persists Aseprite AnimatedSprite as assetId + animation, not generated paths", () => {
    const scene = createEmptyScene("Aseprite Scene");
    scene.nodes.push(
      createNodeWithVisual(
        "Hero",
        { x: 0, y: 0 },
        createAnimatedSpriteComponent({
          assetId: "asset_hero",
          animation: "idle",
          playing: true,
        }),
      ),
    );
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)) as unknown);
    const visual = parsed.nodes[0]?.components.find((c) => c.type === "AnimatedSprite");
    expect(visual).toMatchObject({
      type: "AnimatedSprite",
      assetId: "asset_hero",
      animation: "idle",
      frames: [],
    });
    expect(JSON.stringify(parsed)).not.toMatch(/\.generated/);
    expect(collectReferencedAssetIds(parsed)).toEqual(["asset_hero"]);
  });

  it("accepts sprites with an optional tint", () => {
    const scene = createEmptyScene("Tinted");
    scene.nodes.push(
      createSpriteNode("Hero", { x: 0, y: 0 }, {
        assetId: "asset_hero",
        tint: 0xff0000,
      }),
    );
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)) as unknown);
    const sprite = parsed.nodes[0]?.components.find((c) => c.type === "Sprite");
    expect(sprite && sprite.type === "Sprite" ? sprite.tint : undefined).toBe(0xff0000);
  });

  it("rejects invalid scene documents", () => {
    expect(() => parseSceneData({ id: "", name: "x", version: 1, nodes: [] })).toThrow();
  });

  it("collects referenced asset ids for future dependency queries", () => {
    const scene = createEmptyScene("Refs");
    scene.nodes.push(
      createSpriteNode("A", { x: 0, y: 0 }, { assetId: "asset_b" }),
      createSpriteNode("B", { x: 0, y: 0 }, { assetId: "asset_a" }),
    );
    expect(collectReferencedAssetIds(scene)).toEqual(["asset_a", "asset_b"]);
  });

  it("round-trips Tilemap chunks and collects the TileSet asset id", () => {
    const scene = createEmptyScene("Tiles");
    const tilemap = createTilemapComponent({
      tileSetId: "asset_tileset",
      tileWidth: 16,
      tileHeight: 16,
    });
    setTile(tilemap, tilemap.layers[0]!.id, 2, 3, 7);
    scene.nodes.push(createNodeWithVisual("Ground", { x: 0, y: 0 }, tilemap));
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)) as unknown);
    const parsedTilemap = parsed.nodes[0]?.components.find(
      (component) => component.type === "Tilemap",
    );
    expect(parsedTilemap && parsedTilemap.type === "Tilemap" ? parsedTilemap.tileSetId : undefined).toBe(
      "asset_tileset",
    );
    expect(collectReferencedAssetIds(parsed)).toEqual(["asset_tileset"]);
    expect(JSON.stringify(parsed)).not.toMatch(/PIXI|CompositeTilemap|dirty/i);
  });

  it("round-trips Script components with unknown scriptId", () => {
    const scene = createEmptyScene("Scripts");
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    node.components.push(
      createScriptComponent("example.UnknownYet", {
        speed: 2.5,
        label: "go",
        enabled: true,
        nested: { a: 1 },
      }),
    );
    scene.nodes.push(node);

    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)) as unknown);
    const script = parsed.nodes[0]?.components.find((c) => c.type === "Script");
    expect(script).toEqual({
      type: "Script",
      id: expect.any(String),
      scriptId: "example.UnknownYet",
      properties: {
        speed: 2.5,
        label: "go",
        enabled: true,
        nested: { a: 1 },
      },
    });
  });

  it("round-trips disabled Script components and treats omitted enabled as on", () => {
    const scene = createEmptyScene("Scripts");
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    node.components.push(
      createScriptComponent("example.Off", {}, { enabled: false }),
    );
    scene.nodes.push(node);

    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)) as unknown);
    const script = parsed.nodes[0]?.components.find((c) => c.type === "Script");
    expect(script).toMatchObject({
      type: "Script",
      scriptId: "example.Off",
      enabled: false,
      properties: {},
    });

    const enabledScene = createEmptyScene("ScriptsOn");
    const enabledNode = createSpriteNode("Hero", { x: 0, y: 0 });
    enabledNode.components.push(createScriptComponent("example.On"));
    enabledScene.nodes.push(enabledNode);
    const enabledParsed = parseSceneData(
      JSON.parse(JSON.stringify(enabledScene)) as unknown,
    );
    const enabledScript = enabledParsed.nodes[0]?.components.find(
      (c) => c.type === "Script",
    );
    expect(enabledScript && "enabled" in enabledScript ? enabledScript.enabled : undefined).toBe(
      undefined,
    );
  });

  it("rejects Script components with empty scriptId", () => {
    expect(() =>
      parseSceneData({
        id: "scene_1",
        name: "Bad",
        version: SCENE_SCHEMA_VERSION,
        nodes: [
          {
            id: "node_1",
            name: "N",
            components: [
              {
                type: "Script",
                id: "comp_1",
                scriptId: "",
                properties: {},
              },
            ],
            children: [],
          },
        ],
      }),
    ).toThrow();
  });

  it("fills Model3D playback defaults for older JSON", () => {
    const parsed = parseSceneData({
      id: "scene_1",
      name: "3D",
      version: SCENE_SCHEMA_VERSION,
      renderer: "three",
      nodes: [
        {
          id: "node_1",
          name: "Model",
          components: [
            {
              type: "Transform3D",
              id: "comp_t",
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            {
              type: "Model3D",
              id: "comp_m",
              assetId: "asset_glb",
            },
          ],
          children: [],
        },
      ],
    });
    const model = parsed.nodes[0]?.components.find((c) => c.type === "Model3D");
    expect(model).toMatchObject({
      type: "Model3D",
      assetId: "asset_glb",
      loop: true,
      timeScale: 1,
      playing: true,
    });
  });

  it("fills Text style defaults for older JSON", () => {
    const parsed = parseSceneData({
      id: "scene_1",
      name: "Text",
      version: SCENE_SCHEMA_VERSION,
      nodes: [
        {
          id: "node_1",
          name: "Label",
          components: [
            {
              type: "Transform2D",
              id: "comp_t",
              position: { x: 0, y: 0 },
              rotation: 0,
              scale: { x: 1, y: 1 },
            },
            {
              type: "Text",
              id: "comp_text",
              text: "Hello",
              style: {
                fontFamily: "Arial",
                fontSize: 24,
                fontWeight: "bold",
                fontStyle: "italic",
                fill: 0xff0000,
                align: "center",
                letterSpacing: 2,
                lineHeight: 28,
                wordWrap: true,
                wordWrapWidth: 200,
              },
            },
          ],
          children: [],
        },
      ],
    });
    const text = parsed.nodes[0]?.components.find((c) => c.type === "Text");
    expect(text).toMatchObject({
      type: "Text",
      text: "Hello",
      style: {
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: "bold",
        fontStyle: "italic",
        fill: 0xff0000,
        fillAlpha: 1,
        align: "center",
        letterSpacing: 2,
        lineHeight: 28,
        wordWrap: true,
        wordWrapWidth: 200,
        breakWords: false,
        whiteSpace: "pre",
        fontVariant: "normal",
        leading: 0,
        trim: false,
        textBaseline: "alphabetic",
        strokeJoin: "miter",
        padding: 0,
        strokeWidth: 0,
        dropShadow: false,
      },
    });
  });

  it("round-trips gradient fill arrays and Transform2D skew", () => {
    const parsed = parseSceneData({
      id: "scene_1",
      name: "Gradient",
      version: SCENE_SCHEMA_VERSION,
      nodes: [
        {
          id: "node_1",
          name: "Label",
          components: [
            {
              type: "Transform2D",
              id: "comp_t",
              position: { x: 300, y: 480 },
              rotation: 0,
              scale: { x: 1, y: 1 },
              skew: { x: 37.2422, y: -17.1887 },
            },
            {
              type: "Text",
              id: "comp_text",
              text: "Rich",
              style: {
                fontFamily: "Arial",
                fontSize: 36,
                fill: [0xffffff, 0x00ff99],
                wordWrap: true,
                wordWrapWidth: 440,
              },
            },
          ],
          children: [],
        },
      ],
    });
    const transform = parsed.nodes[0]?.components.find(
      (c) => c.type === "Transform2D",
    );
    const text = parsed.nodes[0]?.components.find((c) => c.type === "Text");
    expect(transform).toMatchObject({
      type: "Transform2D",
      skew: { x: 37.2422, y: -17.1887 },
    });
    expect(text).toMatchObject({
      type: "Text",
      style: { fill: [0xffffff, 0x00ff99] },
    });
  });

  it("round-trips BitmapText with a font assetId", () => {
    const scene = createEmptyScene("Bitmap");
    scene.nodes.push(
      createNodeWithVisual(
        "Label",
        { x: 50, y: 200 },
        createBitmapTextComponent({
          text: "bitmap fonts are supported!",
          assetId: "asset_desyrel",
          fontSize: 55,
          align: "left",
          anchor: { x: 0, y: 0 },
        }),
      ),
    );
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)) as unknown);
    expect(collectReferencedAssetIds(parsed)).toEqual(["asset_desyrel"]);
    const visual = parsed.nodes[0]?.components.find((c) => c.type === "BitmapText");
    expect(visual).toMatchObject({
      type: "BitmapText",
      assetId: "asset_desyrel",
      fontSize: 55,
      align: "left",
    });
  });

  it("round-trips Text with a webfont fontAssetId", () => {
    const scene = createEmptyScene("Webfonts");
    scene.nodes.push(
      createNodeWithVisual(
        "ChaChicle",
        { x: 720, y: 80 },
        createTextComponent({
          text: "ChaChicle.ttf",
          style: {
            fontFamily: "ChaChicle",
            fontAssetId: "asset_webfont_chachicle",
            fontSize: 50,
          },
          anchor: { x: 0, y: 0 },
        }),
      ),
    );
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)) as unknown);
    expect(collectReferencedAssetIds(parsed)).toEqual([
      "asset_webfont_chachicle",
    ]);
    const visual = parsed.nodes[0]?.components.find((c) => c.type === "Text");
    expect(visual).toMatchObject({
      type: "Text",
      text: "ChaChicle.ttf",
      style: {
        fontFamily: "ChaChicle",
        fontAssetId: "asset_webfont_chachicle",
        fontSize: 50,
      },
    });
  });

  it("round-trips HitZone and rejects invalid shapes", () => {
    const scene = createEmptyScene("Hit");
    scene.nodes.push(
      createHitZoneNode("Zone", { x: 8, y: 9 }),
    );
    const json = JSON.parse(JSON.stringify(scene)) as unknown;
    const parsed = parseSceneData(json);
    const zone = parsed.nodes[0]?.components.find((c) => c.type === "HitZone");
    expect(zone).toMatchObject({
      type: "HitZone",
      shape: { type: "rectangle", width: 100, height: 100 },
    });
    expect(zone && "enabled" in zone ? zone.enabled : undefined).toBeUndefined();

    expect(() =>
      parseSceneData({
        id: "scene_1",
        name: "Bad",
        version: SCENE_SCHEMA_VERSION,
        nodes: [
          {
            id: "node_1",
            name: "N",
            components: [
              {
                type: "HitZone",
                id: "comp_1",
                shape: { type: "circle", radius: -1 },
              },
            ],
            children: [],
          },
        ],
      }),
    ).toThrow();
  });

  it("round-trips Mask shape and sprite modes and rejects shape without geometry", () => {
    const scene = createEmptyScene("Mask");
    scene.nodes.push(createMaskNode("Clip", { x: 1, y: 2 }));
    const json = JSON.parse(JSON.stringify(scene)) as unknown;
    const parsed = parseSceneData(json);
    const mask = parsed.nodes[0]?.components.find((c) => c.type === "Mask");
    expect(mask).toMatchObject({
      type: "Mask",
      mode: "shape",
      shape: { type: "rectangle", width: 100, height: 100 },
    });
    expect(mask && "enabled" in mask ? mask.enabled : undefined).toBeUndefined();
    expect(mask && "inverse" in mask ? mask.inverse : undefined).toBeUndefined();

    const spriteMask = createMaskComponent({ mode: "sprite", assetId: "asset_tex" });
    scene.nodes[0]!.components[1] = spriteMask;
    const parsedSprite = parseSceneData(JSON.parse(JSON.stringify(scene)));
    expect(
      parsedSprite.nodes[0]?.components.find((c) => c.type === "Mask"),
    ).toMatchObject({
      type: "Mask",
      mode: "sprite",
      assetId: "asset_tex",
    });
    expect(collectReferencedAssetIds(parsedSprite)).toEqual(["asset_tex"]);

    expect(() =>
      parseSceneData({
        id: "scene_1",
        name: "Bad",
        version: SCENE_SCHEMA_VERSION,
        nodes: [
          {
            id: "node_1",
            name: "N",
            components: [
              {
                type: "Mask",
                id: "comp_1",
                mode: "shape",
              },
            ],
            children: [],
          },
        ],
      }),
    ).toThrow();
  });
});
