import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSceneData } from "../index.js";

const demoParticlesPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../games/editor-features-demo/assets/scenes/particles.json",
);

describe("particles demo scene", () => {
  it("parses editor-features-demo particles.json", () => {
    const raw = JSON.parse(readFileSync(demoParticlesPath, "utf8"));
    const scene = parseSceneData(raw);
    expect(scene.name).toBe("particles");
    const emitters = scene.nodes.filter((node) =>
      node.components.some((c) => c.type === "ParticleEmitter"),
    );
    expect(emitters.map((n) => n.name)).toEqual([
      "Fire",
      "Smoke",
      "Sparkles",
      "Explosion",
    ]);
  });
});
