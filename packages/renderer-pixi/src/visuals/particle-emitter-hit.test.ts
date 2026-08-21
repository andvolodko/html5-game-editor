import { describe, expect, it } from "vitest";
import { Circle, Rectangle } from "pixi.js";
import {
  createParticleEmitterComponent,
  createNodeWithVisual,
  particleSpawnLocalBounds,
} from "@game-editor/scene";
import { PixiSceneRenderer } from "../pixi-scene-renderer.js";
import { ParticleEmitterView } from "./particle-emitter-view.js";

async function flushPaint(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

describe("ParticleEmitter editor picking", () => {
  it("keeps hitArea on visualsRoot and disables ParticleContainer events", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const visual = createParticleEmitterComponent({
      spawn: { type: "circle", radius: 12 },
      lifetime: { min: 0.5, max: 1 },
      velocity: {
        speedMin: 30,
        speedMax: 80,
        angleMin: -110,
        angleMax: -70,
      },
    });
    const node = createNodeWithVisual("Fire", { x: 120, y: 120 }, visual);
    renderer.createNode(node);
    await flushPaint();

    const view = renderer.getRuntimeVisual(node.id);
    expect(view).toBeInstanceOf(ParticleEmitterView);
    expect(view?.eventMode).toBe("static");
    expect(view?.interactiveChildren).toBe(false);
    expect(view?.hitArea).toBeInstanceOf(Circle);

    const visuals = renderer.getRuntimeVisualsRoot(node.id)!;
    expect(visuals.hitArea).toBeInstanceOf(Rectangle);
    const hit = visuals.hitArea as Rectangle;
    const expected = particleSpawnLocalBounds(visual);
    expect(hit.width).toBeGreaterThanOrEqual(expected.width);
    expect(hit.height).toBeGreaterThanOrEqual(expected.height);

    const widthAt1 = hit.width;
    renderer.setViewportScale(0.5);
    await flushPaint();
    const zoomed = visuals.hitArea as Rectangle;
    expect(zoomed.width).toBeGreaterThan(widthAt1);

    await renderer.destroy();
  });
});
