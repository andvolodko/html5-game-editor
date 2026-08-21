import {
  Circle,
  Container,
  Particle,
  ParticleContainer,
  Rectangle,
  type Texture,
} from "pixi.js";
import {
  DEFAULT_PARTICLE_POINT_BOUNDS_HALF,
  ParticleSimulation,
  particleSpawnLocalBounds,
  type ParticleEmitterComponentData,
  type ParticleEmitterPlaybackState,
  type ParticleEmitterStats,
} from "@game-editor/scene";

/**
 * Editor/runtime view for ParticleEmitter.
 * Owns simulation + Pixi ParticleContainer; never serialized.
 */
export class ParticleEmitterView extends Container {
  readonly simulation: ParticleSimulation;
  private readonly particleContainer: ParticleContainer;
  private readonly renderParticles: Particle[] = [];
  private texture: Texture;
  private destroyedView = false;

  constructor(config: ParticleEmitterComponentData, texture: Texture) {
    super();
    this.texture = texture;
    this.simulation = new ParticleSimulation(config);
    this.particleContainer = new ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: true,
        color: true,
        vertex: true,
      },
    });
    // Particles are not DisplayObjects — do not hit-test the container.
    // This view is the pointer target (spawn-shaped hitArea). visualsRoot
    // adds camera-scaled padding so zoom-out clicks still land.
    this.eventMode = "static";
    this.cursor = "grab";
    this.interactiveChildren = false;
    this.particleContainer.eventMode = "none";
    this.particleContainer.interactiveChildren = false;
    this.addChild(this.particleContainer);
    this.particleContainer.texture = texture;
    this.applyHitArea(config);
    this.ensureRenderCapacity(config.emission.maxParticles);
  }

  setTexture(texture: Texture): void {
    this.texture = texture;
    this.particleContainer.texture = texture;
    for (const particle of this.renderParticles) {
      particle.texture = texture;
    }
    this.particleContainer.update();
  }

  setConfig(config: ParticleEmitterComponentData): void {
    this.simulation.setConfig(config);
    this.applyHitArea(config);
    this.ensureRenderCapacity(config.emission.maxParticles);
  }

  play(): void {
    this.simulation.play();
  }

  pause(): void {
    this.simulation.pause();
  }

  stop(): void {
    this.simulation.stop();
    this.syncRenderParticles();
    this.particleContainer.update();
  }

  restart(): void {
    this.simulation.restart();
    this.syncRenderParticles();
    this.particleContainer.update();
  }

  getPlayback(): ParticleEmitterPlaybackState {
    return this.simulation.getPlayback();
  }

  getStats(): ParticleEmitterStats {
    return this.simulation.getStats();
  }

  update(dtSeconds: number): void {
    if (this.destroyedView) {
      return;
    }
    this.simulation.update(dtSeconds);
    this.syncRenderParticles();
    this.particleContainer.update();
  }

  localBoundsForSelection(config: ParticleEmitterComponentData): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return particleSpawnLocalBounds(config);
  }

  private applyHitArea(config: ParticleEmitterComponentData): void {
    const spawn = config.spawn;
    if (spawn.type === "circle") {
      this.hitArea = new Circle(
        0,
        0,
        Math.max(spawn.radius, DEFAULT_PARTICLE_POINT_BOUNDS_HALF),
      );
      return;
    }
    if (spawn.type === "rectangle") {
      const width = Math.max(spawn.width, DEFAULT_PARTICLE_POINT_BOUNDS_HALF * 2);
      const height = Math.max(
        spawn.height,
        DEFAULT_PARTICLE_POINT_BOUNDS_HALF * 2,
      );
      this.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
      return;
    }
    this.hitArea = new Circle(0, 0, DEFAULT_PARTICLE_POINT_BOUNDS_HALF);
  }

  override destroy(options?: boolean | { children?: boolean }): void {
    this.destroyedView = true;
    this.simulation.stop();
    this.particleContainer.removeParticles();
    this.renderParticles.length = 0;
    super.destroy(options);
  }

  private ensureRenderCapacity(maxParticles: number): void {
    while (this.renderParticles.length < maxParticles) {
      const particle = new Particle({
        texture: this.texture,
      });
      particle.anchorX = 0.5;
      particle.anchorY = 0.5;
      particle.alpha = 0;
      particle.scaleX = 0;
      particle.scaleY = 0;
      this.renderParticles.push(particle);
      this.particleContainer.addParticle(particle);
    }
    while (this.renderParticles.length > maxParticles) {
      const particle = this.renderParticles.pop();
      if (particle) {
        this.particleContainer.removeParticle(particle);
      }
    }
  }

  private syncRenderParticles(): void {
    const sims = this.simulation.getParticles();
    const count = Math.min(sims.length, this.renderParticles.length);
    for (let i = 0; i < count; i += 1) {
      const sim = sims[i]!;
      const view = this.renderParticles[i]!;
      if (!sim.alive) {
        view.alpha = 0;
        view.scaleX = 0;
        view.scaleY = 0;
        continue;
      }
      view.x = sim.x;
      view.y = sim.y;
      view.rotation = sim.rotation;
      view.scaleX = sim.scale;
      view.scaleY = sim.scale;
      view.alpha = sim.alpha;
      view.tint = sim.color;
      view.texture = this.texture;
    }
  }
}

export function isParticleEmitterView(
  view: Container | undefined,
): view is ParticleEmitterView {
  return view instanceof ParticleEmitterView;
}
