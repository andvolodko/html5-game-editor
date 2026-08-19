import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";
import { actionClipName, MU_ACTION_STAY } from "../action-clips.js";
import { listOtherLivingCombatants } from "../combat-roster.js";
import { clipWallDurationSeconds, playModelClip } from "../play-model-clip.js";
import {
  CatapultStonePool,
  STONE_POOL_SIZE,
} from "./catapult-stone-pool.js";

/** Catalogue id for `assets/Stone01.glb`. */
const STONE01_ASSET_ID = "asset_ccd9132d-aada-4112-b168-c0827b0ca53c";
const CATAPULT_THROW_ACTION = 1;
const DEFAULT_MIN_DELAY_SECONDS = 2.2;
const DEFAULT_MAX_DELAY_SECONDS = 5.5;
/** Animation seconds (before timeScale) when the stone leaves the catapult. */
const THROW_RELEASE_SECONDS = 1;
const DEFAULT_THROW_DISTANCE = 22;
const DEFAULT_SPREAD = 5;
const DEFAULT_ARC_HEIGHT = 9;
const DEFAULT_FLIGHT_SECONDS = 1.35;
const DEFAULT_LAUNCH_FORWARD = 2.2;
const DEFAULT_LAUNCH_HEIGHT = 2.4;
const DEFAULT_STONE_SCALE = 10;
const DEFAULT_HIT_RADIUS = 2.8;
const STONE_NODE_NAME = "CatapultStone";
const DEFAULT_ATTACH_BONE = "bone_12_Bone02";
/** Slow in-flight tumble (about a quarter-turn over a typical throw). */
const FLY_SPIN_RADIANS_PER_SECOND = 1.1;
const FLY_SPIN_YAW_RATIO = 0.35;
const FLY_SPIN_ROLL_RATIO = 0.7;

type Phase = "idle" | "throw";

type Vec3 = { x: number; y: number; z: number };

type Projectile = {
  nodeId: string;
  elapsed: number;
  duration: number;
  start: Vec3;
  end: Vec3;
  arcHeight: number;
  rotation: Vec3;
  spin: Vec3;
};

type Props = {
  stoneAssetId: string;
  attachBone: string;
  throwAnimation: string;
  minDelay: number;
  maxDelay: number;
  fireAtSeconds: number;
  throwDistance: number;
  spread: number;
  arcHeight: number;
  flightSeconds: number;
  launchForward: number;
  launchHeight: number;
  stoneScale: number;
  hitRadius: number;
  enabled: boolean;
};

function readNumber(
  raw: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const value = raw[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    stoneAssetId:
      typeof raw.stoneAssetId === "string" && raw.stoneAssetId.length > 0
        ? raw.stoneAssetId
        : STONE01_ASSET_ID,
    attachBone:
      typeof raw.attachBone === "string" && raw.attachBone.length > 0
        ? raw.attachBone
        : DEFAULT_ATTACH_BONE,
    throwAnimation:
      typeof raw.throwAnimation === "string" ? raw.throwAnimation : "",
    minDelay: Math.max(0, readNumber(raw, "minDelay", DEFAULT_MIN_DELAY_SECONDS)),
    maxDelay: Math.max(0, readNumber(raw, "maxDelay", DEFAULT_MAX_DELAY_SECONDS)),
    fireAtSeconds: Math.max(
      0,
      readNumber(raw, "fireAtSeconds", THROW_RELEASE_SECONDS),
    ),
    throwDistance: Math.max(
      1,
      readNumber(raw, "throwDistance", DEFAULT_THROW_DISTANCE),
    ),
    spread: Math.max(0, readNumber(raw, "spread", DEFAULT_SPREAD)),
    arcHeight: Math.max(0, readNumber(raw, "arcHeight", DEFAULT_ARC_HEIGHT)),
    flightSeconds: Math.max(
      0.1,
      readNumber(raw, "flightSeconds", DEFAULT_FLIGHT_SECONDS),
    ),
    launchForward: readNumber(raw, "launchForward", DEFAULT_LAUNCH_FORWARD),
    launchHeight: readNumber(raw, "launchHeight", DEFAULT_LAUNCH_HEIGHT),
    stoneScale: Math.max(0.01, readNumber(raw, "stoneScale", DEFAULT_STONE_SCALE)),
    hitRadius: Math.max(0, readNumber(raw, "hitRadius", DEFAULT_HIT_RADIUS)),
    enabled: raw.enabled !== false,
  };
}

function randomDuration(minSeconds: number, maxSeconds: number): number {
  const min = Math.min(minSeconds, maxSeconds);
  const max = Math.max(minSeconds, maxSeconds);
  return min + Math.random() * (max - min);
}

function sampleArc(start: Vec3, end: Vec3, height: number, t: number): Vec3 {
  const clamped = Math.min(1, Math.max(0, t));
  const lift = height * 4 * clamped * (1 - clamped);
  return {
    x: start.x + (end.x - start.x) * clamped,
    y: start.y + (end.y - start.y) * clamped + lift,
    z: start.z + (end.z - start.z) * clamped,
  };
}

function forwardXz(yaw: number): { x: number; z: number } {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function randomSign(): number {
  return Math.random() < 0.5 ? -1 : 1;
}

function randomFlySpin(): Vec3 {
  const speed = FLY_SPIN_RADIANS_PER_SECOND;
  return {
    x: randomSign() * speed,
    y: randomSign() * speed * FLY_SPIN_YAW_RATIO,
    z: randomSign() * speed * FLY_SPIN_ROLL_RATIO,
  };
}

export class CatapultThrowBehaviour implements ScriptInstance {
  private props: Props;
  private readonly ctx: ScriptCreateContext;
  private readonly stones: CatapultStonePool;
  private phase: Phase = "idle";
  private timer = 0;
  private fireTimer = 0;
  private stoneReleased = false;
  private basketId: string | undefined;
  private readonly projectiles: Projectile[] = [];

  constructor(ctx: ScriptCreateContext) {
    this.ctx = ctx;
    this.props = readProps(ctx.properties);
    this.stones = new CatapultStonePool(ctx.services, {
      assetId: this.props.stoneAssetId,
      name: STONE_NODE_NAME,
      size: STONE_POOL_SIZE,
    });
  }

  start(): void {
    void this.ctx.services.preloadSceneAsset?.(this.props.stoneAssetId);
    this.stones.ensureFilled();
    this.enterIdle();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.props = readProps(properties);
  }

  update(dt: number): void {
    if (dt <= 0) {
      return;
    }
    this.stones.ensureFilled();
    if (this.phase === "idle" || (this.phase === "throw" && !this.stoneReleased)) {
      this.ensureBasketStone();
    }
    this.followBasketBone();
    this.tickProjectiles(dt);
    if (!this.props.enabled) {
      return;
    }
    this.timer -= dt;
    if (this.phase === "throw") {
      this.tickThrow(dt);
      return;
    }
    if (this.timer <= 0) {
      this.enterThrow();
    }
  }

  destroy(): void {
    this.projectiles.length = 0;
    this.stones.destroy();
  }

  private enterIdle(): void {
    this.phase = "idle";
    this.stoneReleased = false;
    const idle = this.resolveClip(MU_ACTION_STAY);
    if (idle) {
      playModelClip(this.ctx.services, this.ctx.nodeId, idle, true);
    }
    this.timer = randomDuration(this.props.minDelay, this.props.maxDelay);
  }

  private enterThrow(): void {
    const clip = this.resolveThrowClip();
    if (!clip) {
      this.enterIdle();
      return;
    }
    this.phase = "throw";
    this.stoneReleased = false;
    playModelClip(this.ctx.services, this.ctx.nodeId, clip, false);
    const duration = clipWallDurationSeconds(
      this.ctx.services,
      this.ctx.nodeId,
      clip,
    );
    const releaseAt = this.releaseWallSeconds();
    this.timer = Math.max(duration, releaseAt);
    this.fireTimer = Math.min(releaseAt, duration);
  }

  private releaseWallSeconds(): number {
    const timeScale =
      this.ctx.services.getModel3DPlayback?.(this.ctx.nodeId)?.timeScale ?? 1;
    if (timeScale <= 0) {
      return this.props.fireAtSeconds;
    }
    return this.props.fireAtSeconds / timeScale;
  }

  private tickThrow(dt: number): void {
    if (!this.stoneReleased) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.stoneReleased = true;
        this.launchStone();
      }
    }
    if (this.timer <= 0) {
      this.enterIdle();
    }
  }

  private launchStone(): void {
    this.ensureBasketStone();
    this.followBasketBone();
    const nodeId = this.basketId;
    this.basketId = undefined;
    if (!nodeId) {
      return;
    }
    const origin = this.ctx.services.getTransform3D?.(this.ctx.nodeId);
    const held = this.ctx.services.getTransform3D?.(nodeId);
    const bone = this.readAttachBone();
    const start: Vec3 = held?.position ?? bone?.position ?? {
      x: (origin?.position.x ?? 0) + this.launchForwardX(origin),
      y: (origin?.position.y ?? 0) + this.props.launchHeight,
      z: (origin?.position.z ?? 0) + this.launchForwardZ(origin),
    };
    const forward = forwardXz(origin?.rotation.z ?? 0);
    const side = { x: -forward.z, z: forward.x };
    const spread = (Math.random() * 2 - 1) * this.props.spread;
    const end: Vec3 = {
      x: start.x + forward.x * this.props.throwDistance + side.x * spread,
      y: origin?.position.y ?? start.y,
      z: start.z + forward.z * this.props.throwDistance + side.z * spread,
    };
    this.projectiles.push({
      nodeId,
      elapsed: 0,
      duration: this.props.flightSeconds,
      start,
      end,
      arcHeight: this.props.arcHeight,
      rotation: cloneVec3(
        held?.rotation ?? bone?.rotation ?? { x: 0, y: 0, z: 0 },
      ),
      spin: randomFlySpin(),
    });
  }

  private ensureBasketStone(): void {
    if (this.basketId) {
      return;
    }
    const bone = this.readAttachBone();
    const origin = this.ctx.services.getTransform3D?.(this.ctx.nodeId);
    const position = bone?.position ?? {
      x: origin?.position.x ?? 0,
      y: origin?.position.y ?? 0,
      z: origin?.position.z ?? 0,
    };
    this.basketId = this.stones.acquire(position, this.props.stoneScale);
  }

  private followBasketBone(): void {
    if (!this.basketId) {
      return;
    }
    const bone = this.readAttachBone();
    if (!bone) {
      return;
    }
    const scale = this.props.stoneScale;
    this.ctx.services.setTransform3D?.(this.basketId, {
      position: bone.position,
      rotation: bone.rotation,
      scale: { x: scale, y: scale, z: scale },
    });
  }

  private readAttachBone(): { position: Vec3; rotation: Vec3 } | undefined {
    return this.ctx.services.getModel3DBoneWorldTransform?.(
      this.ctx.nodeId,
      this.props.attachBone,
    );
  }

  private launchForwardX(
    origin: { rotation: Vec3; position: Vec3 } | undefined,
  ): number {
    return forwardXz(origin?.rotation.z ?? 0).x * this.props.launchForward;
  }

  private launchForwardZ(
    origin: { rotation: Vec3; position: Vec3 } | undefined,
  ): number {
    return forwardXz(origin?.rotation.z ?? 0).z * this.props.launchForward;
  }

  private tickProjectiles(dt: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      if (!projectile) {
        continue;
      }
      projectile.elapsed += dt;
      const t = projectile.elapsed / projectile.duration;
      const position = sampleArc(
        projectile.start,
        projectile.end,
        projectile.arcHeight,
        t,
      );
      projectile.rotation.x += projectile.spin.x * dt;
      projectile.rotation.y += projectile.spin.y * dt;
      projectile.rotation.z += projectile.spin.z * dt;
      this.ctx.services.setTransform3D?.(projectile.nodeId, {
        position,
        rotation: projectile.rotation,
      });
      if (t < 1) {
        continue;
      }
      this.applyLandingHits(projectile.end);
      this.stones.release(projectile.nodeId);
      this.projectiles.splice(index, 1);
    }
  }

  private applyLandingHits(end: Vec3): void {
    if (this.props.hitRadius <= 0) {
      return;
    }
    for (const combatant of listOtherLivingCombatants(this.ctx.nodeId)) {
      const pos = combatant.xz();
      if (Math.hypot(pos.x - end.x, pos.z - end.z) <= this.props.hitRadius) {
        combatant.receiveHit();
      }
    }
  }

  private resolveThrowClip(): string | undefined {
    const names =
      this.ctx.services.listModel3DAnimations?.(this.ctx.nodeId) ?? [];
    if (
      this.props.throwAnimation.length > 0 &&
      names.includes(this.props.throwAnimation)
    ) {
      return this.props.throwAnimation;
    }
    return actionClipName(names, CATAPULT_THROW_ACTION) ?? names.at(-1);
  }

  private resolveClip(actionIndex: number): string | undefined {
    const names =
      this.ctx.services.listModel3DAnimations?.(this.ctx.nodeId) ?? [];
    return actionClipName(names, actionIndex) ?? names[0];
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  stoneAssetId: { kind: "asset", assetType: "gltf", default: STONE01_ASSET_ID },
  attachBone: { kind: "string", default: DEFAULT_ATTACH_BONE },
  throwAnimation: {
    kind: "dynamicEnum",
    source: "gltfAnimations",
    default: "",
  },
  minDelay: {
    kind: "number",
    default: DEFAULT_MIN_DELAY_SECONDS,
    min: 0,
    step: 0.1,
  },
  maxDelay: {
    kind: "number",
    default: DEFAULT_MAX_DELAY_SECONDS,
    min: 0,
    step: 0.1,
  },
  fireAtSeconds: {
    kind: "number",
    default: THROW_RELEASE_SECONDS,
    min: 0,
    step: 0.05,
  },
  throwDistance: {
    kind: "number",
    default: DEFAULT_THROW_DISTANCE,
    min: 1,
    step: 0.5,
  },
  spread: { kind: "number", default: DEFAULT_SPREAD, min: 0, step: 0.5 },
  arcHeight: { kind: "number", default: DEFAULT_ARC_HEIGHT, min: 0, step: 0.5 },
  flightSeconds: {
    kind: "number",
    default: DEFAULT_FLIGHT_SECONDS,
    min: 0.1,
    step: 0.05,
  },
  launchForward: { kind: "number", default: DEFAULT_LAUNCH_FORWARD, step: 0.1 },
  launchHeight: { kind: "number", default: DEFAULT_LAUNCH_HEIGHT, step: 0.1 },
  stoneScale: {
    kind: "number",
    default: DEFAULT_STONE_SCALE,
    min: 0.01,
    step: 0.05,
  },
  hitRadius: { kind: "number", default: DEFAULT_HIT_RADIUS, min: 0, step: 0.1 },
  enabled: { kind: "boolean", default: true },
};

export const catapultThrowComponent = defineComponent({
  id: "muonline.CatapultThrow",
  displayName: "Catapult Throw",
  category: "Gameplay",
  categoryOrder: 10,
  order: 32,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new CatapultThrowBehaviour(ctx),
});

export function installCatapultThrowRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(catapultThrowComponent.id, catapultThrowComponent.create);
}
