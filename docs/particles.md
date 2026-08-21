# ParticleEmitter

Library-agnostic 2D particle effects for Pixi scenes. Scene JSON stores editor-owned config; PixiJS 8 `Particle` / `ParticleContainer` is a renderer backend only.

## Node type

| | |
| --- | --- |
| Component `type` | `ParticleEmitter` |
| Registry id | `pixi.particle-emitter` |
| Menu | Node → Particle Emitter (Effects) |
| Leaf | Yes (no scene children) |

Texture via catalogue `assetId` (same as Sprite). Angles and rotation speeds are **degrees**.

## Config shape (summary)

```ts
{
  type: "ParticleEmitter";
  assetId?: string;
  seed: number;
  enabled?: boolean;       // omit = true
  playOnStart: boolean;
  loop: boolean;
  prewarm: boolean;
  emission: { rate; maxParticles; duration? };  // omit duration = infinite
  lifetime: { min; max };
  spawn: { type: "point" | "circle" | "rectangle"; … };
  velocity: { speedMin; speedMax; angleMin; angleMax };
  acceleration: { x; y };
  scale: ParticleCurve;    // points[{ time: 0..1, value }]
  alpha: ParticleCurve;
  color: ParticleColorGradient; // points[{ time, color: 0xRRGGBB }]
  rotation: { startMin; startMax; speedMin; speedMax };
}
```

Curves and gradients use normalized lifetime `time` (`0` = birth, `1` = death). MVP interpolation is linear.

Do **not** persist third-party `behaviors[]` configs. Do **not** serialize Inspector Play/Pause — only `playOnStart` / `loop` / `enabled`.

## Runtime API

Host node:

```ts
ctx.particles.play();
ctx.particles.pause();
ctx.particles.stop();
ctx.particles.restart();
```

Other nodes:

```ts
ctx.services.controlParticleEmitter?.(nodeId, "restart");
```

Playback is transient (like `setNodeVisible`) — it does not rewrite scene JSON.

## Presets

Inspector **Preset** + **Apply** copies built-in configs (`explosion`, `fire`, `smoke`, `sparkles`, `magic`, `snow`, `rain`) into the component. No live preset id is stored.

```ts
import { particlePresetToVisualPatch } from "@game-editor/scene";
editor.setVisualComponent(nodeId, particlePresetToVisualPatch("fire"));
```

## Architecture

```text
ParticleEmitterComponentData (@game-editor/scene)
        ↓
ParticleSimulation (Pixi-free pool + seeded RNG)
        ↓
ParticleEmitterView → ParticleContainer + Particle (@game-editor/renderer-pixi)
```

Editor Scene picking uses the spawn volume (circle / rectangle / point) on
`ParticleEmitterView`, plus camera-scaled hit padding on `visualsRoot`. Pixi
`ParticleContainer` is not interactive and does not contribute `getBounds()`.
Marquee pick tests those `hitArea`s through the preview-camera world transform
so zoom/pan stay aligned with the pointer.

Spawn **Volume** is the emission area (circle / rectangle / point). Particle
sprites come from the Texture field; with no texture the renderer uses a soft
circle instead of a white square.

## Demo

`games/editor-features-demo/assets/scenes/particles.json` — Explosion, Fire, Smoke, Sparkles, Magic, Snow, Rain, plus a textured emitter.

## Out of scope (v1)

World-space sim, sprite-sheet frames, Bezier tangents, sub-emitters, trails, GPU compute, 3D particles.
