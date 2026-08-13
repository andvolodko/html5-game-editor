import { describe, expect, it } from "vitest";
import {
  collectReferencedAssetIds,
  createEmptyScene,
  createScriptComponent,
  createSpriteNode,
  parseSceneData,
  SCENE_SCHEMA_VERSION,
  type SceneData,
} from "./index.js";

describe("scene schema", () => {
  it("creates a versioned empty scene", () => {
    const scene = createEmptyScene("Main");
    expect(scene.version).toBe(SCENE_SCHEMA_VERSION);
    expect(scene.name).toBe("Main");
    expect(scene.nodes).toEqual([]);
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
});
