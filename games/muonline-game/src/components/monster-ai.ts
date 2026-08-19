import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";
import {
  getCombatant,
  nearestLivingCombatant,
  registerCombatant,
  unregisterCombatant,
  type Combatant,
} from "../combat-roster.js";
import {
  MONSTER_CLIP_FALLBACKS,
  MONSTER_CLIP_PROPERTIES,
  readMonsterClipProps,
  resolveMonsterClip,
  type MonsterClipProps,
} from "../monster-clips.js";
import {
  clampXz,
  moveToward,
  randomPointInBounds,
  xzDistance,
  yawFromTo,
  type XzBounds,
  type XzPoint,
} from "../xz-motion.js";

const DEFAULT_SPEED = 2.4;
const DEFAULT_AGGRO_RANGE = 9;
const DEFAULT_ATTACK_RANGE = 2.2;
const DEFAULT_HIT_POINTS = 3;
const ATTACK_HIT_RATIO = 0.42;
const DEFAULT_IDLE_MIN_SECONDS = 1;
const DEFAULT_IDLE_MAX_SECONDS = 2.8;
const DEFAULT_CORPSE_MIN_SECONDS = 1;
const DEFAULT_CORPSE_MAX_SECONDS = 3;
const DEFAULT_HIDE_MIN_SECONDS = 1;
const DEFAULT_HIDE_MAX_SECONDS = 3;
const HIDDEN_SCALE = { x: 0, y: 0, z: 0 };
const DEFAULT_ARRIVE_DISTANCE = 0.35;
const DEFAULT_MIN_X = -8;
const DEFAULT_MAX_X = 12;
const DEFAULT_MIN_Z = -8;
const DEFAULT_MAX_Z = 8;

type Phase = "idle" | "walk" | "fight" | "hurt" | "die" | "corpse" | "respawn";

type ClipRole = keyof MonsterClipProps;

type Props = {
  speed: number;
  aggroRange: number;
  attackRange: number;
  hitPoints: number;
  enabled: boolean;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} & MonsterClipProps;

function readNumber(
  raw: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const value = raw[key];
  return typeof value === "number" ? value : fallback;
}

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    speed: readNumber(raw, "speed", DEFAULT_SPEED),
    aggroRange: readNumber(raw, "aggroRange", DEFAULT_AGGRO_RANGE),
    attackRange: readNumber(raw, "attackRange", DEFAULT_ATTACK_RANGE),
    hitPoints: Math.max(1, readNumber(raw, "hitPoints", DEFAULT_HIT_POINTS)),
    enabled: raw.enabled !== false,
    minX: readNumber(raw, "minX", DEFAULT_MIN_X),
    maxX: readNumber(raw, "maxX", DEFAULT_MAX_X),
    minZ: readNumber(raw, "minZ", DEFAULT_MIN_Z),
    maxZ: readNumber(raw, "maxZ", DEFAULT_MAX_Z),
    ...readMonsterClipProps(raw),
  };
}

function randomDuration(minSeconds: number, maxSeconds: number): number {
  return minSeconds + Math.random() * (maxSeconds - minSeconds);
}

function boundsOf(props: Props): XzBounds {
  return {
    minX: Math.min(props.minX, props.maxX),
    maxX: Math.max(props.minX, props.maxX),
    minZ: Math.min(props.minZ, props.maxZ),
    maxZ: Math.max(props.minZ, props.maxZ),
  };
}

export class MonsterAiBehaviour implements ScriptInstance, Combatant {
  readonly nodeId: string;
  private props: Props;
  private readonly spawn: {
    x: number;
    y: number;
    z: number;
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  private phase: Phase = "idle";
  private hp: number;
  private timer = 0;
  private hitCooldown = 0;
  private hitInterval = 0;
  private walkTarget: { x: number; z: number } | undefined;
  private fightTargetId: string | undefined;
  private clipsReady = false;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.nodeId = ctx.nodeId;
    this.props = readProps(ctx.properties);
    this.hp = this.props.hitPoints;
    this.spawn = {
      x: 0,
      y: 0,
      z: 0,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
  }

  start(): void {
    const { position, rotation, scale } = this.ctx.transform3D;
    this.spawn.x = position.x;
    this.spawn.y = position.y;
    this.spawn.z = position.z;
    this.spawn.rotation = { x: rotation.x, y: rotation.y, z: rotation.z };
    this.spawn.scale = { x: scale.x, y: scale.y, z: scale.z };
    registerCombatant(this);
    this.enterIdle();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.props = readProps(properties);
  }

  isAlive(): boolean {
    return (
      this.phase !== "die" &&
      this.phase !== "corpse" &&
      this.phase !== "respawn"
    );
  }

  xz(): { x: number; z: number } {
    const position = this.ctx.transform3D.position;
    return { x: position.x, z: position.z };
  }

  receiveHit(): void {
    if (!this.isAlive()) {
      return;
    }
    this.hp -= 1;
    if (this.hp <= 0) {
      this.enterDie();
      return;
    }
    this.enterHurt();
  }

  update(dt: number): void {
    if (!this.props.enabled || dt <= 0) {
      return;
    }
    this.ensureClips();
    this.timer -= dt;
    if (this.phase === "die") {
      if (this.timer <= 0) {
        this.enterCorpse();
      }
      return;
    }
    if (this.phase === "corpse") {
      if (this.timer <= 0) {
        this.enterRespawn();
      }
      return;
    }
    if (this.phase === "respawn") {
      if (this.timer <= 0) {
        this.finishRespawn();
      }
      return;
    }
    if (this.phase === "hurt") {
      if (this.timer <= 0) {
        this.resumeAfterHurt();
      }
      return;
    }
    if (this.phase === "fight") {
      this.tickFight(dt);
      return;
    }
    const enemy = nearestLivingCombatant(
      this.nodeId,
      this.xz(),
      this.props.aggroRange,
    );
    if (enemy) {
      this.chaseOrFight(enemy, dt);
      return;
    }
    this.tickWander(dt);
  }

  destroy(): void {
    unregisterCombatant(this.nodeId);
  }

  private ensureClips(): void {
    if (this.clipsReady) {
      return;
    }
    const names = this.ctx.animations.list();
    if (names.length === 0) {
      return;
    }
    this.clipsReady = true;
    if (this.phase === "die") {
      const clip = this.playRole("dieAnimation", false);
      this.timer = this.ctx.animations.duration(clip);
      return;
    }
    if (this.phase === "corpse") {
      this.ctx.animations.freeze();
      return;
    }
    if (this.phase === "respawn") {
      return;
    }
    if (this.phase === "hurt") {
      const clip = this.playRole("receiveKickAnimation", false);
      this.timer = this.ctx.animations.duration(clip);
      return;
    }
    if (this.phase === "fight") {
      this.playRole("attackAnimation", true);
      return;
    }
    if (this.phase === "walk") {
      this.playRole("walkAnimation", true);
      return;
    }
    this.playRole("idleAnimation", true);
  }

  private enterIdle(): void {
    this.phase = "idle";
    this.walkTarget = undefined;
    this.fightTargetId = undefined;
    this.timer = randomDuration(
      DEFAULT_IDLE_MIN_SECONDS,
      DEFAULT_IDLE_MAX_SECONDS,
    );
    this.playRole("idleAnimation", true);
  }

  private enterWalk(): void {
    this.phase = "walk";
    this.walkTarget = clampXz(
      randomPointInBounds(boundsOf(this.props)),
      boundsOf(this.props),
    );
    this.faceFrom(this.xz(), this.walkTarget);
    this.playRole("walkAnimation", true);
  }

  private enterHurt(): void {
    this.phase = "hurt";
    this.fightTargetId = undefined;
    const clip = this.playRole("receiveKickAnimation", false);
    this.timer = this.ctx.animations.duration(clip);
  }

  private resumeAfterHurt(): void {
    const enemy = nearestLivingCombatant(
      this.nodeId,
      this.xz(),
      this.props.aggroRange,
    );
    if (enemy) {
      this.chaseOrFight(enemy, 0);
      return;
    }
    this.enterIdle();
  }

  private enterDie(): void {
    this.phase = "die";
    this.fightTargetId = undefined;
    this.walkTarget = undefined;
    const clip = this.playRole("dieAnimation", false);
    this.timer = this.ctx.animations.duration(clip);
  }

  private enterCorpse(): void {
    this.phase = "corpse";
    this.ctx.animations.freeze();
    this.timer = randomDuration(
      DEFAULT_CORPSE_MIN_SECONDS,
      DEFAULT_CORPSE_MAX_SECONDS,
    );
  }

  private enterRespawn(): void {
    this.phase = "respawn";
    this.ctx.transform3D.setScale(HIDDEN_SCALE);
    this.ctx.animations.stop();
    this.timer = randomDuration(
      DEFAULT_HIDE_MIN_SECONDS,
      DEFAULT_HIDE_MAX_SECONDS,
    );
  }

  private finishRespawn(): void {
    this.hp = this.props.hitPoints;
    this.ctx.transform3D.set({
      position: { x: this.spawn.x, y: this.spawn.y, z: this.spawn.z },
      rotation: { ...this.spawn.rotation },
      scale: { ...this.spawn.scale },
    });
    this.enterIdle();
  }

  private tickWander(dt: number): void {
    if (this.phase === "idle") {
      if (this.timer <= 0) {
        this.enterWalk();
      } else {
        return;
      }
    }
    const target = this.walkTarget;
    if (!target) {
      this.enterIdle();
      return;
    }
    this.stepToward(target, dt);
    if (xzDistance(this.xz(), target) <= DEFAULT_ARRIVE_DISTANCE) {
      this.enterIdle();
    }
  }

  private chaseOrFight(enemy: Combatant, dt: number): void {
    const dest = enemy.xz();
    const distance = xzDistance(this.xz(), dest);
    if (distance <= this.props.attackRange) {
      this.enterFight(enemy.nodeId);
      this.tickFight(dt);
      return;
    }
    if (this.phase !== "walk") {
      this.phase = "walk";
      this.fightTargetId = undefined;
      this.faceFrom(this.xz(), dest);
      this.playRole("walkAnimation", true);
    }
    this.stepToward(dest, dt);
  }

  private enterFight(targetId: string): void {
    if (this.phase === "fight" && this.fightTargetId === targetId) {
      return;
    }
    this.phase = "fight";
    this.fightTargetId = targetId;
    this.startAttackSwing();
  }

  private startAttackSwing(): void {
    const clip = this.playRole("attackAnimation", true);
    const duration = this.ctx.animations.duration(clip);
    this.hitInterval = duration;
    this.hitCooldown = duration * ATTACK_HIT_RATIO;
  }

  private tickFight(dt: number): void {
    const targetId = this.fightTargetId;
    if (!targetId) {
      this.enterIdle();
      return;
    }
    const enemy = getCombatant(targetId);
    if (!enemy?.isAlive()) {
      this.enterIdle();
      return;
    }
    const dest = enemy.xz();
    if (xzDistance(this.xz(), dest) > this.props.attackRange) {
      this.phase = "walk";
      this.fightTargetId = undefined;
      this.faceFrom(this.xz(), dest);
      this.playRole("walkAnimation", true);
      this.stepToward(dest, dt);
      return;
    }
    this.faceFrom(this.xz(), dest);
    this.hitCooldown -= dt;
    if (this.hitCooldown > 0) {
      return;
    }
    this.hitCooldown = this.hitInterval;
    enemy.receiveHit();
  }

  private stepToward(target: { x: number; z: number }, dt: number): void {
    const origin = this.xz();
    const next = clampXz(
      moveToward(origin, target, this.props.speed * dt),
      boundsOf(this.props),
    );
    this.ctx.transform3D.set({
      position: { x: next.x, y: this.spawn.y, z: next.z },
      rotation: this.rotationFacing(origin, next),
    });
  }

  private faceFrom(from: XzPoint, to: XzPoint): void {
    this.ctx.transform3D.setRotation(this.rotationFacing(from, to));
  }

  private rotationFacing(
    from: XzPoint,
    to: XzPoint,
  ): { x: number; y: number; z: number } {
    const yaw = yawFromTo(from, to);
    const current = this.ctx.transform3D.rotation;
    return {
      x: this.spawn.rotation.x,
      y: this.spawn.rotation.y,
      z: yaw ?? current.z ?? this.spawn.rotation.z,
    };
  }

  private playRole(role: ClipRole, loop: boolean): string | undefined {
    const names = this.ctx.animations.list();
    const clip = resolveMonsterClip(
      names,
      this.props[role],
      MONSTER_CLIP_FALLBACKS[role],
    );
    if (!clip) {
      return undefined;
    }
    this.ctx.animations.play(clip, { loop });
    return clip;
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  ...MONSTER_CLIP_PROPERTIES,
  speed: { kind: "number", default: DEFAULT_SPEED, min: 0, step: 0.1 },
  aggroRange: {
    kind: "number",
    default: DEFAULT_AGGRO_RANGE,
    min: 0,
    step: 0.5,
  },
  attackRange: {
    kind: "number",
    default: DEFAULT_ATTACK_RANGE,
    min: 0,
    step: 0.1,
  },
  hitPoints: { kind: "number", default: DEFAULT_HIT_POINTS, min: 1, step: 1 },
  minX: { kind: "number", default: DEFAULT_MIN_X, step: 0.5 },
  maxX: { kind: "number", default: DEFAULT_MAX_X, step: 0.5 },
  minZ: { kind: "number", default: DEFAULT_MIN_Z, step: 0.5 },
  maxZ: { kind: "number", default: DEFAULT_MAX_Z, step: 0.5 },
  enabled: { kind: "boolean", default: true },
};

export const monsterAiComponent = defineComponent({
  id: "muonline.MonsterAi",
  displayName: "Monster AI",
  category: "Gameplay",
  categoryOrder: 10,
  order: 10,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new MonsterAiBehaviour(ctx),
});

export function installMonsterAiRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(monsterAiComponent.id, monsterAiComponent.create);
}
