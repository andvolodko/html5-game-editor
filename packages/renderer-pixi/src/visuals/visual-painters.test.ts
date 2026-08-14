import { describe, expect, it } from "vitest";
import {
  Graphics,
  Mesh,
  MeshPlane,
  MeshRope,
  MeshSimple,
  NineSliceSprite,
  PerspectiveMesh,
  Text,
  TilingSprite,
} from "pixi.js";
import {
  createGraphicsComponent,
  createMeshComponent,
  createMeshPlaneComponent,
  createMeshRopeComponent,
  createMeshSimpleComponent,
  createNineSliceSpriteComponent,
  createNodeWithVisual,
  createPerspectiveMeshComponent,
  createSpineComponent,
  createSpriteNode,
  createTextComponent,
  createTilingSpriteComponent,
  createContainerNode,
  getText,
} from "@game-editor/scene";
import { PixiSceneRenderer } from "../pixi-scene-renderer.js";

async function flushPaint(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

function makeRenderer() {
  const host = { appendChild() {} } as unknown as HTMLElement;
  return new PixiSceneRenderer({ canvasParent: host, headless: true });
}

describe("PixiSceneRenderer visual painters", () => {
  it("creates expected Pixi classes for non-text visuals without assets", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();

    const cases: Array<{
      node: ReturnType<typeof createSpriteNode>;
      ctor: unknown;
    }> = [
      {
        node: createNodeWithVisual(
          "N",
          { x: 0, y: 0 },
          createNineSliceSpriteComponent(),
        ),
        ctor: NineSliceSprite,
      },
      {
        node: createNodeWithVisual(
          "Ti",
          { x: 0, y: 0 },
          createTilingSpriteComponent(),
        ),
        ctor: TilingSprite,
      },
      {
        node: createNodeWithVisual(
          "G",
          { x: 0, y: 0 },
          createGraphicsComponent(),
        ),
        ctor: Graphics,
      },
      {
        node: createNodeWithVisual("M", { x: 0, y: 0 }, createMeshComponent()),
        ctor: Mesh,
      },
      {
        node: createNodeWithVisual(
          "MS",
          { x: 0, y: 0 },
          createMeshSimpleComponent(),
        ),
        ctor: MeshSimple,
      },
      {
        node: createNodeWithVisual(
          "MR",
          { x: 0, y: 0 },
          createMeshRopeComponent(),
        ),
        ctor: MeshRope,
      },
      {
        node: createNodeWithVisual(
          "MP",
          { x: 0, y: 0 },
          createMeshPlaneComponent(),
        ),
        ctor: MeshPlane,
      },
      {
        node: createNodeWithVisual(
          "PM",
          { x: 0, y: 0 },
          createPerspectiveMeshComponent(),
        ),
        ctor: PerspectiveMesh,
      },
    ];

    for (const { node, ctor } of cases) {
      renderer.clear();
      renderer.resetSyncStats();
      renderer.createNode(node);
      await flushPaint();
      expect(renderer.getRuntimeContainer(node.id)).toBeDefined();
      expect(renderer.getRuntimeVisual(node.id)).toBeInstanceOf(ctor as never);
      expect(renderer.getSyncStats().created).toBe(1);
    }

    // Empty Sprite uses placeholder (no Pixi Sprite until texture assigned).
    const sprite = createSpriteNode("S");
    renderer.clear();
    renderer.createNode(sprite);
    await flushPaint();
    expect(renderer.getRuntimeContainer(sprite.id)).toBeDefined();
    expect(renderer.getRuntimeVisual(sprite.id)).toBeUndefined();

    const spine = createNodeWithVisual(
      "Sp",
      { x: 0, y: 0 },
      createSpineComponent(),
    );
    renderer.clear();
    renderer.createNode(spine);
    await flushPaint();
    expect(renderer.getRuntimeContainer(spine.id)).toBeDefined();
    expect(renderer.getRuntimeVisual(spine.id)).toBeUndefined();

    await renderer.destroy();
  });

  it("updates incrementally and cleans up on destroy", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();
    const node = createNodeWithVisual(
      "G",
      { x: 0, y: 0 },
      createGraphicsComponent({
        shape: { type: "rectangle", width: 100, height: 100 },
      }),
    );
    renderer.createNode(node);
    await flushPaint();
    const visualBefore = renderer.getRuntimeVisual(node.id);
    expect(visualBefore).toBeInstanceOf(Graphics);

    const next = createGraphicsComponent({
      id: (node.components[1] as { id: string }).id,
      shape: { type: "circle", radius: 40 },
    });
    node.components = [node.components[0]!, next];
    renderer.resetSyncStats();
    renderer.updateNode(node);
    await flushPaint();
    expect(renderer.getSyncStats().updated).toBe(1);
    expect(renderer.getSyncStats().created).toBe(0);
    expect(renderer.getRuntimeVisual(node.id)).toBe(visualBefore);

    const a = createSpriteNode("DupA");
    const b = createSpriteNode("DupB");
    renderer.createNode(a);
    renderer.createNode(b);
    expect(renderer.getRuntimeContainer(a.id)).not.toBe(
      renderer.getRuntimeContainer(b.id),
    );

    renderer.destroyNode(node.id);
    expect(renderer.getRuntimeContainer(node.id)).toBeUndefined();
    expect(renderer.getRuntimeVisual(node.id)).toBeUndefined();

    await renderer.destroy();
  });

  it("creates container without leaf visual", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();
    const container = createContainerNode("C");
    renderer.createNode(container);
    await flushPaint();
    expect(renderer.getRuntimeVisual(container.id)).toBeUndefined();
    await renderer.destroy();
  });

  it("centers NineSliceSprite on the node origin for selection alignment", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();
    const width = 200;
    const height = 100;
    const node = createNodeWithVisual(
      "Nine",
      { x: 0, y: 0 },
      createNineSliceSpriteComponent({ width, height }),
    );
    renderer.createNode(node);
    await flushPaint();

    const visual = renderer.getRuntimeVisual(node.id);
    expect(visual).toBeInstanceOf(NineSliceSprite);
    const nine = visual as NineSliceSprite;
    expect(nine.anchor.x).toBeCloseTo(0.5, 5);
    expect(nine.anchor.y).toBeCloseTo(0.5, 5);

    const bounds = nine.getLocalBounds();
    expect(bounds.x).toBeCloseTo(-width / 2, 5);
    expect(bounds.y).toBeCloseTo(-height / 2, 5);
    expect(bounds.width).toBeCloseTo(width, 5);
    expect(bounds.height).toBeCloseTo(height, 5);

    await renderer.destroy();
  });

  it("does not duplicate Text when updateNode races the initial paint", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();
    const node = createNodeWithVisual(
      "Label",
      { x: 0, y: 0 },
      createTextComponent({ text: "Loading..." }),
    );
    renderer.createNode(node);
    const text = getText(node);
    if (text) {
      text.text = "0%";
    }
    renderer.updateNode(node);
    await flushPaint();

    const root = renderer.getRuntimeVisualsRoot(node.id);
    const texts = root?.children.filter((child) => child instanceof Text) ?? [];
    expect(texts).toHaveLength(1);
    expect(texts[0]?.text).toBe("0%");

    await renderer.destroy();
  });

  it("applies Transform2D skew to the Pixi container", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();
    const node = createNodeWithVisual(
      "Skew",
      { x: 300, y: 480 },
      createTextComponent({ text: "SKEW IS COOL" }),
    );
    const transform = node.components.find((c) => c.type === "Transform2D");
    if (transform && transform.type === "Transform2D") {
      transform.skew = { x: 37.2422, y: -17.1887 };
    }
    renderer.createNode(node);
    await flushPaint();

    const container = renderer.getRuntimeContainer(node.id);
    const degreesToRadians = Math.PI / 180;
    expect(container?.skew.x).toBeCloseTo(37.2422 * degreesToRadians, 4);
    expect(container?.skew.y).toBeCloseTo(-17.1887 * degreesToRadians, 4);

    await renderer.destroy();
  });
});
