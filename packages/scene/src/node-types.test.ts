import { describe, expect, it } from "vitest";
import {
  canMoveNode,
  createContainerNode,
  createEmptyScene,
  createSpriteNode,
  createTextComponent,
  createNodeWithVisual,
  createNineSliceSpriteComponent,
  createTilingSpriteComponent,
  createGraphicsComponent,
  createBitmapTextComponent,
  createHTMLTextComponent,
  createMeshPlaneComponent,
  createMeshSimpleComponent,
  createMeshRopeComponent,
  createPerspectiveMeshComponent,
  createMeshComponent,
  createAnimatedSpriteComponent,
  createSpineComponent,
  nodeCanHaveChildren,
  parseSceneData,
  insertNodeInScene,
} from "./index.js";

describe("nodeCanHaveChildren", () => {
  it("allows containers and rejects leaf visuals", () => {
    expect(nodeCanHaveChildren(createContainerNode("C"))).toBe(true);
    expect(nodeCanHaveChildren(createSpriteNode("S"))).toBe(false);
    expect(
      nodeCanHaveChildren(
        createNodeWithVisual("T", { x: 0, y: 0 }, createTextComponent()),
      ),
    ).toBe(false);
  });

  it("rejects parenting under leaf nodes", () => {
    const scene = createEmptyScene("h");
    const container = createContainerNode("C");
    const sprite = createSpriteNode("S");
    insertNodeInScene(scene, container, undefined, 0);
    insertNodeInScene(scene, sprite, container.id, 0);
    const child = createSpriteNode("X");
    insertNodeInScene(scene, child, undefined, 1);

    expect(canMoveNode(scene, child.id, container.id)).toBe(true);
    expect(canMoveNode(scene, child.id, sprite.id)).toBe(false);
  });
});

describe("pixi visual components round-trip", () => {
  const makers = [
    ["Sprite", () => createSpriteNode("Sprite")],
    [
      "NineSliceSprite",
      () =>
        createNodeWithVisual(
          "Nine Slice Sprite",
          { x: 0, y: 0 },
          createNineSliceSpriteComponent(),
        ),
    ],
    [
      "TilingSprite",
      () =>
        createNodeWithVisual(
          "Tiling Sprite",
          { x: 0, y: 0 },
          createTilingSpriteComponent(),
        ),
    ],
    [
      "Graphics",
      () =>
        createNodeWithVisual("Graphics", { x: 0, y: 0 }, createGraphicsComponent()),
    ],
    [
      "Text",
      () =>
        createNodeWithVisual("Text", { x: 0, y: 0 }, createTextComponent()),
    ],
    [
      "BitmapText",
      () =>
        createNodeWithVisual(
          "Bitmap Text",
          { x: 0, y: 0 },
          createBitmapTextComponent(),
        ),
    ],
    [
      "HTMLText",
      () =>
        createNodeWithVisual(
          "HTML Text",
          { x: 0, y: 0 },
          createHTMLTextComponent(),
        ),
    ],
    [
      "Mesh",
      () => createNodeWithVisual("Mesh", { x: 0, y: 0 }, createMeshComponent()),
    ],
    [
      "MeshSimple",
      () =>
        createNodeWithVisual(
          "Simple Mesh",
          { x: 0, y: 0 },
          createMeshSimpleComponent(),
        ),
    ],
    [
      "MeshRope",
      () =>
        createNodeWithVisual("Rope", { x: 0, y: 0 }, createMeshRopeComponent()),
    ],
    [
      "MeshPlane",
      () =>
        createNodeWithVisual("Plane", { x: 0, y: 0 }, createMeshPlaneComponent()),
    ],
    [
      "PerspectiveMesh",
      () =>
        createNodeWithVisual(
          "Perspective Mesh",
          { x: 0, y: 0 },
          createPerspectiveMeshComponent(),
        ),
    ],
    [
      "AnimatedSprite",
      () =>
        createNodeWithVisual(
          "Animated Sprite",
          { x: 0, y: 0 },
          createAnimatedSpriteComponent({ frames: ["asset_a"] }),
        ),
    ],
    [
      "Spine",
      () =>
        createNodeWithVisual(
          "Spine",
          { x: 0, y: 0 },
          createSpineComponent({ assetId: "asset_spine" }),
        ),
    ],
  ] as const;

  it.each(makers)("%s serializes and deserializes", (_label, make) => {
    const scene = createEmptyScene("round");
    scene.nodes.push(make());
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)));
    expect(parsed.nodes[0]?.components.some((c) => c.type === _label)).toBe(
      true,
    );
    expect(JSON.stringify(parsed)).not.toMatch(/PIXI\.|"GraphicsContext"/);
  });
});

describe("mixed scene save/load", () => {
  it("round-trips a multi-type scene", () => {
    const scene = createEmptyScene("mixed");
    const root = createContainerNode("Container");
    insertNodeInScene(scene, root, undefined, 0);
    const children = [
      createSpriteNode("Sprite"),
      createNodeWithVisual(
        "Nine Slice Sprite",
        { x: 0, y: 0 },
        createNineSliceSpriteComponent(),
      ),
      createNodeWithVisual(
        "Tiling Sprite",
        { x: 0, y: 0 },
        createTilingSpriteComponent(),
      ),
      createNodeWithVisual("Graphics", { x: 0, y: 0 }, createGraphicsComponent()),
      createNodeWithVisual("Text", { x: 0, y: 0 }, createTextComponent()),
      createNodeWithVisual(
        "Bitmap Text",
        { x: 0, y: 0 },
        createBitmapTextComponent(),
      ),
      createNodeWithVisual(
        "HTML Text",
        { x: 0, y: 0 },
        createHTMLTextComponent(),
      ),
      createNodeWithVisual("Plane", { x: 0, y: 0 }, createMeshPlaneComponent()),
    ];
    for (const child of children) {
      insertNodeInScene(scene, child, root.id, root.children.length);
    }
    const parsed = parseSceneData(JSON.parse(JSON.stringify(scene)));
    expect(parsed.nodes[0]?.children).toHaveLength(children.length);
  });
});
