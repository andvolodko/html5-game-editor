import { describe, expect, it } from "vitest";
import {
  createContainerNode,
  createSpriteNode,
  getTransform2D,
  spriteGizmoHitOutsets,
} from "@game-editor/scene";
import { Container, Rectangle } from "pixi.js";
import { PixiSceneRenderer } from "./pixi-scene-renderer.js";

async function flushPaint(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

function makeRenderer(): PixiSceneRenderer {
  const host = { appendChild() {} } as unknown as HTMLElement;
  return new PixiSceneRenderer({ canvasParent: host, headless: true });
}

function gizmoHandle(
  renderer: PixiSceneRenderer,
  nodeId: string,
  label: string,
): Container {
  const root = renderer.getRuntimeGizmoRoot(nodeId);
  if (!root) {
    throw new Error(`missing gizmo for ${nodeId}`);
  }
  const handle = root.getChildByLabel(label);
  if (!(handle instanceof Container)) {
    throw new Error(`missing gizmo handle ${label}`);
  }
  return handle;
}

describe("Pixi container selection gizmo", () => {
  it("frames the union of child content and exposes scale/rotate (not size)", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();

    const group = createContainerNode("Group");
    const left = createSpriteNode("Left", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    const right = createSpriteNode("Right", { x: 100, y: 0 }, {
      width: 64,
      height: 64,
    });
    left.parentId = group.id;
    right.parentId = group.id;
    group.children = [left, right];

    renderer.createNode(group);
    renderer.createNode(left);
    renderer.createNode(right);
    await flushPaint();
    expect(
      renderer.getRuntimeChildrenRoot(group.id)!.interactiveChildren,
    ).toBe(true);
    renderer.setSelectedNodeIds([group.id]);

    const gizmo = renderer.getRuntimeGizmoRoot(group.id)!;
    expect(gizmo.visible).toBe(true);
    // Centered sprites: union x=-32,y=-32,w=164,h=64 → center (50, 0).
    expect(gizmo.position.x).toBeCloseTo(50, 5);
    expect(gizmo.position.y).toBeCloseTo(0, 5);

    expect(gizmoHandle(renderer, group.id, "gizmo:scaleX").visible).toBe(true);
    expect(gizmoHandle(renderer, group.id, "gizmo:scaleY").visible).toBe(true);
    expect(gizmoHandle(renderer, group.id, "gizmo:rotate").visible).toBe(true);
    expect(gizmoHandle(renderer, group.id, "gizmo:nw").visible).toBe(false);
    expect(gizmoHandle(renderer, group.id, "gizmo:anchor").visible).toBe(false);

    const visuals = renderer.getRuntimeVisualsRoot(group.id)!;
    expect(visuals.hitArea).toBeInstanceOf(Rectangle);
    const outset = spriteGizmoHitOutsets();
    const hit = visuals.hitArea as Rectangle;
    expect(hit.x).toBeCloseTo(-32 - outset.left, 5);
    expect(hit.y).toBeCloseTo(-32 - outset.top, 5);
    expect(hit.width).toBeCloseTo(164 + outset.left + outset.right, 5);
    expect(hit.height).toBeCloseTo(64 + outset.top + outset.bottom, 5);
    expect(renderer.getRuntimeContainer(group.id)!.hitArea).toBeUndefined();
    expect(
      renderer.getRuntimeChildrenRoot(group.id)!.interactiveChildren,
    ).toBe(false);

    renderer.setSelectedNodeIds([left.id]);
    expect(
      renderer.getRuntimeChildrenRoot(group.id)!.interactiveChildren,
    ).toBe(true);

    await renderer.destroy();
  });

  it("keeps an origin marker when the container has no content bounds", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();

    const group = createContainerNode("Empty");
    renderer.createNode(group);
    await flushPaint();
    renderer.setSelectedNodeIds([group.id]);

    const gizmo = renderer.getRuntimeGizmoRoot(group.id)!;
    expect(gizmo.visible).toBe(false);
    expect(renderer.getRuntimeVisualsRoot(group.id)!.hitArea).toBeUndefined();
    expect(
      renderer.getRuntimeChildrenRoot(group.id)!.interactiveChildren,
    ).toBe(false);

    renderer.setSelectedNodeIds([]);
    expect(
      renderer.getRuntimeChildrenRoot(group.id)!.interactiveChildren,
    ).toBe(true);

    await renderer.destroy();
  });

  it("nests grouping bounds through child containers", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();

    const outer = createContainerNode("Outer");
    const inner = createContainerNode("Inner");
    const innerTransform = getTransform2D(inner);
    if (!innerTransform) {
      throw new Error("expected Transform2D");
    }
    innerTransform.position = { x: 200, y: 0 };
    const sprite = createSpriteNode("Sprite", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    inner.parentId = outer.id;
    sprite.parentId = inner.id;
    inner.children = [sprite];
    outer.children = [inner];

    renderer.createNode(outer);
    renderer.createNode(inner);
    renderer.createNode(sprite);
    await flushPaint();
    renderer.setSelectedNodeIds([outer.id]);

    const gizmo = renderer.getRuntimeGizmoRoot(outer.id)!;
    expect(gizmo.visible).toBe(true);
    expect(gizmo.position.x).toBeCloseTo(200, 5);
    expect(gizmo.position.y).toBeCloseTo(0, 5);

    await renderer.destroy();
  });
});
