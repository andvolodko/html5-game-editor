import { Texture } from "pixi.js";

const DEFAULT_PARTICLE_TEXTURE_SIZE = 32;

let cached: Texture | undefined;

/**
 * Soft circle sprite used when ParticleEmitter has no catalogue texture.
 * Texture.WHITE is a square quad and made untextured emitters look boxy.
 */
export function defaultParticleCircleTexture(): Texture {
  if (cached && !cached.destroyed) {
    return cached;
  }
  const canvas = globalThis.document?.createElement?.("canvas");
  if (!canvas) {
    return Texture.WHITE;
  }
  const size = DEFAULT_PARTICLE_TEXTURE_SIZE;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Texture.WHITE;
  }
  const mid = size / 2;
  const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  cached = Texture.from(canvas);
  return cached;
}
