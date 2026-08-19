import { describe, expect, it } from "vitest";
import { createEmptyScene, createSpriteNode } from "./index.js";
import {
  aff2FromPose,
  localPositionAfterWorldDelta,
  worldDeltaFromLocalPositions,
} from "./transform-math.js";

describe("aff2FromPose", () => {
  it("matches rotation-scale when skew is omitted", () => {
    const pose = aff2FromPose({ x: 10, y: 20 }, 0, { x: 2, y: 3 });
    expect(pose.a).toBeCloseTo(2, 10);
    expect(pose.b).toBeCloseTo(0, 10);
    expect(pose.c).toBeCloseTo(0, 10);
    expect(pose.d).toBeCloseTo(3, 10);
    expect(pose.tx).toBe(10);
    expect(pose.ty).toBe(20);
  });

  it("applies Pixi-style skew in degrees", () => {
    const skewX = 37.2422;
    const skewY = -17.1887;
    const pose = aff2FromPose({ x: 0, y: 0 }, 0, { x: 1, y: 1 }, {
      x: skewX,
      y: skewY,
    });
    const skewXRad = (skewX * Math.PI) / 180;
    const skewYRad = (skewY * Math.PI) / 180;
    expect(pose.a).toBeCloseTo(Math.cos(skewYRad), 5);
    expect(pose.b).toBeCloseTo(Math.sin(skewYRad), 5);
    expect(pose.c).toBeCloseTo(-Math.sin(-skewXRad), 5);
    expect(pose.d).toBeCloseTo(Math.cos(-skewXRad), 5);
  });
});

describe("world / local translation deltas", () => {
  it("keeps local and world deltas equal under an identity parent", () => {
    const scene = createEmptyScene("S");
    const node = createSpriteNode("A", { x: 10, y: 20 });
    scene.nodes = [node];
    expect(
      worldDeltaFromLocalPositions(
        scene,
        node.id,
        { x: 10, y: 20 },
        { x: 14, y: 22 },
      ),
    ).toEqual({ x: 4, y: 2 });
    expect(localPositionAfterWorldDelta(scene, node.id, { x: 4, y: 2 })).toEqual({
      x: 14,
      y: 22,
    });
  });

  it("rotates a world delta into a child's parent space", () => {
    const scene = createEmptyScene("S");
    const parent = createSpriteNode("P", { x: 0, y: 0 });
    const parentTransform = parent.components.find(
      (component) => component.type === "Transform2D",
    );
    if (parentTransform?.type === "Transform2D") {
      parentTransform.rotation = 90;
    }
    const child = createSpriteNode("C", { x: 10, y: 0 });
    child.parentId = parent.id;
    parent.children = [child];
    scene.nodes = [parent];

    const worldDelta = worldDeltaFromLocalPositions(
      scene,
      child.id,
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    );
    expect(worldDelta.x).toBeCloseTo(0, 10);
    expect(worldDelta.y).toBeCloseTo(10, 10);

    const sibling = createSpriteNode("Sib", { x: 0, y: 5 });
    sibling.parentId = parent.id;
    parent.children = [child, sibling];
    const next = localPositionAfterWorldDelta(scene, sibling.id, worldDelta);
    expect(next?.x).toBeCloseTo(10, 10);
    expect(next?.y).toBeCloseTo(5, 10);
  });
});
