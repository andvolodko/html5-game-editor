/**
 * Pixi-free particle simulation. Local-space emission only for MVP;
 * world-space can be added later without changing scene JSON.
 */

import {
  clampParticleMaxParticles,
  type ParticleEmitterComponentData,
} from "../particle-emitter-data.js";
import { evaluateCurve } from "./evaluate-curve.js";
import { evaluateGradient } from "./evaluate-gradient.js";
import { sampleParticleSpawn } from "./sample-particle-spawn.js";
import { createSeededRng, type SeededRng } from "./seeded-rng.js";

const DEGREES_TO_RADIANS = Math.PI / 180;
/** Max simulation step to avoid spiral-of-death on long frames. */
const MAX_SIM_DT_SECONDS = 0.1;
/** Burst particles when rate is 0 but duration is set (explosion-style). */
const BURST_WHEN_RATE_ZERO_FRACTION = 1;

export interface SimParticle {
  alive: boolean;
  age: number;
  lifetime: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationVelocity: number;
  startScale: number;
  /** Evaluated each frame for the renderer. */
  scale: number;
  alpha: number;
  color: number;
}

export interface ParticleEmitterStats {
  alive: number;
  maxParticles: number;
  rate: number;
}

export type ParticleEmitterPlaybackState = "playing" | "paused" | "stopped";

export class ParticleSimulation {
  private config: ParticleEmitterComponentData;
  private particles: SimParticle[] = [];
  private freeList: number[] = [];
  private rng: SeededRng;
  private emitAccumulator = 0;
  private emitterAge = 0;
  private playback: ParticleEmitterPlaybackState = "stopped";
  private emissionFinished = false;

  constructor(config: ParticleEmitterComponentData) {
    this.config = cloneConfig(config);
    this.rng = createSeededRng(this.config.seed);
    this.resizePool(this.config.emission.maxParticles);
    if (this.config.playOnStart && this.config.enabled !== false) {
      this.play();
    }
  }

  getConfig(): ParticleEmitterComponentData {
    return this.config;
  }

  getPlayback(): ParticleEmitterPlaybackState {
    return this.playback;
  }

  getParticles(): readonly SimParticle[] {
    return this.particles;
  }

  getStats(): ParticleEmitterStats {
    return {
      alive: this.countAlive(),
      maxParticles: this.config.emission.maxParticles,
      rate: this.config.emission.rate,
    };
  }

  /**
   * Hot-update config without clearing particles unless seed or maxParticles
   * shrink requires it.
   */
  setConfig(config: ParticleEmitterComponentData): void {
    const prevSeed = this.config.seed;
    const prevMax = this.config.emission.maxParticles;
    const prevSpawn = spawnSignature(this.config.spawn);
    this.config = cloneConfig(config);
    const nextMax = this.config.emission.maxParticles;
    if (nextMax !== prevMax) {
      this.resizePool(nextMax);
    }
    if (
      this.config.seed !== prevSeed ||
      spawnSignature(this.config.spawn) !== prevSpawn
    ) {
      this.restart();
      return;
    }
    if (this.config.enabled === false && this.playback === "playing") {
      this.pause();
    }
  }

  play(): void {
    if (this.config.enabled === false) {
      return;
    }
    if (this.playback === "stopped") {
      this.resetEmissionClock();
      if (this.config.prewarm) {
        this.prewarm();
      }
      this.burstIfNeeded();
    }
    this.playback = "playing";
  }

  pause(): void {
    if (this.playback === "playing") {
      this.playback = "paused";
    }
  }

  stop(): void {
    this.playback = "stopped";
    this.clearAlive();
    this.resetEmissionClock();
  }

  restart(): void {
    this.clearAlive();
    this.rng = createSeededRng(this.config.seed);
    this.resetEmissionClock();
    this.playback = "stopped";
    if (this.config.enabled !== false) {
      this.play();
    }
  }

  update(dt: number): void {
    if (this.playback !== "playing" || this.config.enabled === false) {
      return;
    }
    const step = dt > MAX_SIM_DT_SECONDS ? MAX_SIM_DT_SECONDS : Math.max(0, dt);
    if (step <= 0) {
      return;
    }

    this.advanceParticles(step);
    this.emit(step);
  }

  private resetEmissionClock(): void {
    this.emitAccumulator = 0;
    this.emitterAge = 0;
    this.emissionFinished = false;
  }

  private resizePool(maxParticles: number): void {
    const capped = clampParticleMaxParticles(maxParticles);
    const prev = this.particles;
    const next: SimParticle[] = new Array(capped);
    this.freeList = [];
    let aliveCopied = 0;
    for (let i = 0; i < prev.length; i += 1) {
      const p = prev[i];
      if (p?.alive === true && aliveCopied < capped) {
        next[aliveCopied] = p;
        aliveCopied += 1;
      }
    }
    for (let i = aliveCopied; i < capped; i += 1) {
      next[i] = createDeadParticle();
      this.freeList.push(i);
    }
    this.particles = next;
  }

  private clearAlive(): void {
    this.freeList = [];
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i]!;
      p.alive = false;
      this.freeList.push(i);
    }
  }

  private countAlive(): number {
    let count = 0;
    for (const p of this.particles) {
      if (p.alive) {
        count += 1;
      }
    }
    return count;
  }

  private prewarm(): void {
    const lifetimeMax = this.config.lifetime.max;
    const steps = 16;
    const step = lifetimeMax / steps;
    for (let i = 0; i < steps; i += 1) {
      this.advanceParticles(step);
      this.emit(step);
    }
  }

  /**
   * Explosion-style: when rate is 0 and duration is set, spawn a burst once.
   */
  private burstIfNeeded(): void {
    const { rate, maxParticles, duration } = this.config.emission;
    if (rate > 0 || duration === undefined) {
      return;
    }
    const count = Math.max(
      1,
      Math.floor(maxParticles * BURST_WHEN_RATE_ZERO_FRACTION),
    );
    for (let i = 0; i < count; i += 1) {
      if (!this.spawnOne()) {
        break;
      }
    }
    this.emissionFinished = true;
  }

  private emit(dt: number): void {
    const { rate, duration } = this.config.emission;
    if (rate <= 0) {
      if (duration === undefined) {
        return;
      }
      this.emitterAge += dt;
      if (this.emitterAge >= duration && this.config.loop) {
        this.emitterAge = 0;
        this.emissionFinished = false;
        this.burstIfNeeded();
      }
      return;
    }

    if (this.emissionFinished) {
      return;
    }

    this.emitterAge += dt;
    if (duration !== undefined && this.emitterAge > duration) {
      if (this.config.loop) {
        this.emitterAge = 0;
        this.emitAccumulator = 0;
      } else {
        this.emissionFinished = true;
        return;
      }
    }

    this.emitAccumulator += rate * dt;
    while (this.emitAccumulator >= 1) {
      if (!this.spawnOne()) {
        break;
      }
      this.emitAccumulator -= 1;
    }
  }

  private spawnOne(): boolean {
    const index = this.acquire();
    if (index === undefined) {
      return false;
    }
    const p = this.particles[index]!;
    const cfg = this.config;
    const lifetime = this.rng.nextRange(cfg.lifetime.min, cfg.lifetime.max);
    const speed = this.rng.nextRange(
      cfg.velocity.speedMin,
      cfg.velocity.speedMax,
    );
    const angleDeg = this.rng.nextRange(
      cfg.velocity.angleMin,
      cfg.velocity.angleMax,
    );
    const angleRad = angleDeg * DEGREES_TO_RADIANS;
    const pos = this.sampleSpawn();

    p.alive = true;
    p.age = 0;
    p.lifetime = lifetime > 0 ? lifetime : cfg.lifetime.min;
    p.x = pos.x;
    p.y = pos.y;
    p.vx = Math.cos(angleRad) * speed;
    p.vy = Math.sin(angleRad) * speed;
    p.rotation =
      this.rng.nextRange(cfg.rotation.startMin, cfg.rotation.startMax) *
      DEGREES_TO_RADIANS;
    p.rotationVelocity =
      this.rng.nextRange(cfg.rotation.speedMin, cfg.rotation.speedMax) *
      DEGREES_TO_RADIANS;
    p.startScale = evaluateCurve(cfg.scale, 0);
    p.scale = p.startScale;
    p.alpha = evaluateCurve(cfg.alpha, 0);
    p.color = evaluateGradient(cfg.color, 0);
    return true;
  }

  /** Local-space spawn sample. World-space hook would transform here later. */
  private sampleSpawn(): { x: number; y: number } {
    return sampleParticleSpawn(this.config.spawn, this.rng);
  }

  private advanceParticles(dt: number): void {
    const ax = this.config.acceleration.x;
    const ay = this.config.acceleration.y;
    const scaleCurve = this.config.scale;
    const alphaCurve = this.config.alpha;
    const colorGradient = this.config.color;

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i]!;
      if (!p.alive) {
        continue;
      }
      p.age += dt;
      if (p.age >= p.lifetime) {
        p.alive = false;
        this.freeList.push(i);
        continue;
      }
      p.vx += ax * dt;
      p.vy += ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationVelocity * dt;
      const t = p.lifetime > 0 ? p.age / p.lifetime : 1;
      p.scale = evaluateCurve(scaleCurve, t);
      p.alpha = evaluateCurve(alphaCurve, t);
      p.color = evaluateGradient(colorGradient, t);
    }
  }

  private acquire(): number | undefined {
    const index = this.freeList.pop();
    return index;
  }
}

function createDeadParticle(): SimParticle {
  return {
    alive: false,
    age: 0,
    lifetime: 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rotation: 0,
    rotationVelocity: 0,
    startScale: 1,
    scale: 1,
    alpha: 1,
    color: 0xffffff,
  };
}

function cloneConfig(
  config: ParticleEmitterComponentData,
): ParticleEmitterComponentData {
  return structuredClone(config);
}

function spawnSignature(
  spawn: ParticleEmitterComponentData["spawn"],
): string {
  if (spawn.type === "circle") {
    return `circle:${String(spawn.radius)}`;
  }
  if (spawn.type === "rectangle") {
    return `rectangle:${String(spawn.width)}x${String(spawn.height)}`;
  }
  return "point";
}
