import { describe, expect, it } from "vitest";
import {
  createContainerNode,
  createGraphicsComponent,
  createNineSliceSpriteComponent,
  createNodeWithVisual,
  createSpriteNode,
  createTextComponent,
  createTransform2D,
  spriteGizmoHitOutsets,
} from "@game-editor/scene";
import { Rectangle } from "pixi.js";
import { PixiSceneRenderer } from "./pixi-scene-renderer.js";

describe("PixiSceneRenderer incremental hierarchy", () => {
  it("reparents without recreating containers and keeps sibling order", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const parent = createSpriteNode("Parent", { x: 0, y: 0 });
    parent.components = [createTransform2D({ position: { x: 0, y: 0 } })];
    const childA = createSpriteNode("A", { x: 1, y: 0 });
    childA.parentId = parent.id;
    const childB = createSpriteNode("B", { x: 2, y: 0 });
    childB.parentId = parent.id;

    renderer.createNode(parent);
    renderer.createNode(childA);
    renderer.createNode(childB);

    const parentContainer = renderer.getRuntimeContainer(parent.id)!;
    const aBefore = renderer.getRuntimeContainer(childA.id)!;
    const bBefore = renderer.getRuntimeContainer(childB.id)!;
    const childrenRoot = renderer.getRuntimeChildrenRoot(parent.id)!;

    expect(aBefore.parent).toBe(childrenRoot);
    expect(bBefore.parent).toBe(childrenRoot);
    expect(childrenRoot.children.indexOf(aBefore)).toBe(0);
    expect(childrenRoot.children.indexOf(bBefore)).toBe(1);

    // Visuals live under visualsRoot, not childrenRoot.
    expect(childrenRoot.children.length).toBe(2);

    renderer.reparentNode(childB.id, parent.id, 0);
    expect(renderer.getRuntimeContainer(childB.id)).toBe(bBefore);
    expect(renderer.getRuntimeContainer(childA.id)).toBe(aBefore);
    expect(renderer.getRuntimeContainer(parent.id)).toBe(parentContainer);
    expect(childrenRoot.children.indexOf(bBefore)).toBe(0);
    expect(childrenRoot.children.indexOf(aBefore)).toBe(1);
    expect(renderer.getSyncStats().reparented).toBe(1);
    expect(renderer.getSyncStats().created).toBe(3);

    renderer.destroyNode(parent.id);
    expect(renderer.getRuntimeContainer(parent.id)).toBeUndefined();
    expect(renderer.getRuntimeContainer(childA.id)).toBeUndefined();
    expect(renderer.getRuntimeContainer(childB.id)).toBeUndefined();
    expect(renderer.getNodeCount()).toBe(0);
  });

  it("keeps sprite hitArea on visualsRoot so child sprites outside parent rect stay hittable", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const parent = createSpriteNode("Parent", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    const child = createSpriteNode("Child", { x: 200, y: 0 }, {
      width: 32,
      height: 32,
    });
    child.parentId = parent.id;
    parent.children = [child];

    renderer.createNode(parent);
    renderer.createNode(child);

    const parentContainer = renderer.getRuntimeContainer(parent.id)!;
    const parentVisuals = renderer.getRuntimeVisualsRoot(parent.id)!;
    const childContainer = renderer.getRuntimeContainer(child.id)!;
    const childVisuals = renderer.getRuntimeVisualsRoot(child.id)!;
    const childrenRoot = renderer.getRuntimeChildrenRoot(parent.id)!;

    expect(childContainer.parent).toBe(childrenRoot);
    // Parent node container must not own hitArea (would prune the child at x=200).
    expect(parentContainer.hitArea).toBeUndefined();
    expect(parentVisuals.hitArea).toBeInstanceOf(Rectangle);

    const outset = spriteGizmoHitOutsets();
    const parentHit = parentVisuals.hitArea as Rectangle;
    expect(parentHit.x).toBe(-32 - outset.left);
    expect(parentHit.y).toBe(-32 - outset.top);
    expect(parentHit.width).toBe(64 + outset.left + outset.right);
    expect(parentHit.height).toBe(64 + outset.top + outset.bottom);

    // Child still has its own visuals hitArea and is outside the parent's visual rect.
    expect(childContainer.hitArea).toBeUndefined();
    expect(childVisuals.hitArea).toBeInstanceOf(Rectangle);
    expect(child.components.find((c) => c.type === "Transform2D")).toMatchObject({
      position: { x: 200, y: 0 },
    });
    const childLocalX = 200;
    expect(
      childLocalX < parentHit.x || childLocalX > parentHit.x + parentHit.width,
    ).toBe(true);
  });

  it("does not draw a default placeholder for container nodes", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createContainerNode("Container");
    renderer.createNode(node);

    const visuals = renderer.getRuntimeVisualsRoot(node.id)!;
    const container = renderer.getRuntimeContainer(node.id)!;
    // First child of visualsRoot is the placeholder Graphics.
    const placeholder = visuals.children[0]!;
    expect(placeholder.visible).toBe(false);
    expect(visuals.hitArea).toBeUndefined();
    expect(container.hitArea).toBeUndefined();

    renderer.setSelectedNodeIds([node.id]);
    // Selection uses an origin marker, not a fake 64×64 bounds rect.
    const selection = visuals.children[1]!;
    expect(selection.visible).toBe(true);
  });

  it("keeps selection gizmo centered on the visual after anchor preview", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode(
      "Sprite",
      { x: 0, y: 0 },
      { width: 100, height: 40 },
    );
    renderer.createNode(node);
    // createNode paints visuals asynchronously; wait for bounds/gizmo.
    await new Promise((resolve) => setTimeout(resolve, 0));
    renderer.setSelectedNodeIds([node.id]);

    const gizmoBefore = renderer.getRuntimeGizmoRoot(node.id)!;
    expect(gizmoBefore.visible).toBe(true);
    expect(gizmoBefore.position.x).toBeCloseTo(0, 5);
    expect(gizmoBefore.position.y).toBeCloseTo(0, 5);

    // Pivot to left-center; compensate position like the gizmo drag path.
    renderer.previewSpriteAnchor(node.id, { x: 0, y: 0.5 }, { x: -50, y: 0 });

    const gizmo = renderer.getRuntimeGizmoRoot(node.id)!;
    expect(gizmo.position.x).toBeCloseTo(50, 5);
    expect(gizmo.position.y).toBeCloseTo(0, 5);
    expect(renderer.getRuntimeContainer(node.id)!.position.x).toBeCloseTo(-50, 5);
  });

  it("shows selection gizmo for non-sprite Pixi leaf visuals", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const text = createNodeWithVisual(
      "Label",
      { x: 0, y: 0 },
      createTextComponent({ text: "Hi" }),
    );
    const nine = createNodeWithVisual(
      "Panel",
      { x: 10, y: 0 },
      createNineSliceSpriteComponent({ width: 80, height: 40 }),
    );
    const graphics = createNodeWithVisual(
      "Shape",
      { x: 20, y: 0 },
      createGraphicsComponent(),
    );

    for (const node of [text, nine, graphics]) {
      renderer.createNode(node);
      await new Promise((resolve) => setTimeout(resolve, 0));
      renderer.setSelectedNodeIds([node.id]);
      const gizmo = renderer.getRuntimeGizmoRoot(node.id);
      expect(gizmo?.visible).toBe(true);
    }
  });

  it("does not reject when a node is destroyed and recreated during paint", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Sprite", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    renderer.createNode(node);
    const firstContainer = renderer.getRuntimeContainer(node.id)!;
    renderer.destroyNode(node.id);
    renderer.createNode(node);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(firstContainer.destroyed).toBe(true);
    expect(renderer.getRuntimeContainer(node.id)?.destroyed).toBe(false);
    await renderer.destroy();
  });

  it("applies serialized visible and combines it with editor hide", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Sprite", { x: 0, y: 0 });
    node.visible = false;
    renderer.createNode(node);
    expect(renderer.getRuntimeContainer(node.id)?.visible).toBe(false);

    delete node.visible;
    renderer.updateNode(node);
    expect(renderer.getRuntimeContainer(node.id)?.visible).toBe(true);

    renderer.setNodeEditorHidden(node.id, true);
    expect(renderer.getRuntimeContainer(node.id)?.visible).toBe(false);

    node.visible = false;
    renderer.updateNode(node);
    renderer.setNodeEditorHidden(node.id, false);
    expect(renderer.getRuntimeContainer(node.id)?.visible).toBe(false);

    await renderer.destroy();
  });
});
