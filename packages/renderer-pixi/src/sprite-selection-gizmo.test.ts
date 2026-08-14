import { describe, expect, it } from "vitest";
import {
  createNodeWithVisual,
  createTextComponent,
  createTransform2D,
  getTransform2D,
  SPRITE_GIZMO_ROTATE_OFFSET,
} from "@game-editor/scene";
import { Container } from "pixi.js";
import { localScaleTowardAncestor } from "./pixi-chrome-scale.js";
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

describe("sprite selection gizmo screen-constant chrome", () => {
  it("counter-scales handles when the node transform is scaled", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();

    const node = createNodeWithVisual(
      "Label",
      { x: 0, y: 0 },
      createTextComponent({ text: "Loading..." }),
    );
    const transform = getTransform2D(node);
    if (!transform) {
      throw new Error("expected Transform2D");
    }
    transform.scale = { x: 3, y: 2 };

    renderer.createNode(node);
    await flushPaint();
    renderer.setSelectedNodeIds([node.id]);

    const scaleX = gizmoHandle(renderer, node.id, "gizmo:scaleX");
    expect(scaleX.scale.x).toBeCloseTo(1 / 3, 5);
    expect(scaleX.scale.y).toBeCloseTo(0.5, 5);

    const scaleY = gizmoHandle(renderer, node.id, "gizmo:scaleY");
    const rotate = gizmoHandle(renderer, node.id, "gizmo:rotate");
    // Stem length stays screen-constant: local offset is ROTATE_OFFSET / |scaleY|.
    expect(rotate.position.y).toBeCloseTo(
      -scaleY.position.y - SPRITE_GIZMO_ROTATE_OFFSET * 0.5,
      5,
    );

    await renderer.destroy();
  });

  it("counter-scales handles for ancestor scale", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();

    const parent = createNodeWithVisual("Parent", { x: 0, y: 0 });
    parent.components = [createTransform2D({ scale: { x: 2, y: 2 } })];
    const child = createNodeWithVisual(
      "Label",
      { x: 10, y: 0 },
      createTextComponent({ text: "Hi" }),
      parent.id,
    );
    parent.children = [child];

    renderer.createNode(parent);
    renderer.createNode(child);
    await flushPaint();
    renderer.setSelectedNodeIds([child.id]);

    const scaleX = gizmoHandle(renderer, child.id, "gizmo:scaleX");
    expect(scaleX.scale.x).toBeCloseTo(0.5, 5);
    expect(scaleX.scale.y).toBeCloseTo(0.5, 5);

    await renderer.destroy();
  });

  it("relayouts handles during live scale preview", async () => {
    const renderer = makeRenderer();
    await renderer.whenReady();

    const node = createNodeWithVisual(
      "Label",
      { x: 0, y: 0 },
      createTextComponent({ text: "Hi" }),
    );
    renderer.createNode(node);
    await flushPaint();
    renderer.setSelectedNodeIds([node.id]);

    const before = gizmoHandle(renderer, node.id, "gizmo:scaleX");
    expect(before.scale.x).toBeCloseTo(1, 5);

    renderer.previewNodeScale(node.id, { x: 4, y: 4 });
    const after = gizmoHandle(renderer, node.id, "gizmo:scaleX");
    expect(after.scale.x).toBeCloseTo(0.25, 5);
    expect(after.scale.y).toBeCloseTo(0.25, 5);

    await renderer.destroy();
  });
});

describe("localScaleTowardAncestor", () => {
  it("multiplies local scales up to the ancestor", () => {
    const world = new Container();
    const parent = new Container();
    const child = new Container();
    parent.scale.set(2, 3);
    child.scale.set(0.5, 4);
    world.addChild(parent);
    parent.addChild(child);

    expect(localScaleTowardAncestor(child, world)).toEqual({
      x: 1,
      y: 12,
    });
    expect(localScaleTowardAncestor(parent, world)).toEqual({
      x: 2,
      y: 3,
    });
  });
});
