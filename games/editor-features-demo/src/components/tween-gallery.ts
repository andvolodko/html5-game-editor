import {
  defineComponent,
  TWEEN_INFINITE_REPEAT,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
  type TweenHandle,
  type TweenTimeline,
} from "@game-editor/game-components";

const MOVE_X = "+=220";
const MOVE_DURATION_SECONDS = 0.8;
const SCALE_FROM = 0;
const SCALE_FROM_DURATION_SECONDS = 0.6;
const FADE_ALPHA = 0.15;
const FADE_DURATION_SECONDS = 0.7;
const SPIN_DEGREES = "+=360";
const SPIN_DURATION_SECONDS = 1.2;
const ELASTIC_SCALE = 1.4;
const ELASTIC_DURATION_SECONDS = 0.8;
const BOUNCE_Y = "+=140";
const BOUNCE_DURATION_SECONDS = 0.7;
const TIMELINE_SLIDE_X = "+=160";
const TIMELINE_TURN_DEGREES = "+=180";
const TIMELINE_RETURN_X = "-=160";
const TIMELINE_STEP_SECONDS = 0.45;
const STAGGER_Y = "-=80";
const STAGGER_DURATION_SECONDS = 0.5;
const STAGGER_SECONDS = 0.1;
const STAGGER_COUNT = 5;

const MOVE_NODE = "TweenMove";
const SCALE_NODE = "TweenScaleFrom";
const FADE_NODE = "TweenFade";
const SPIN_NODE = "TweenSpin";
const ELASTIC_NODE = "TweenElastic";
const BOUNCE_NODE = "TweenBounce";
const TIMELINE_NODE = "TweenTimeline";
const STAGGER_PREFIX = "TweenStagger";

type Killer = Pick<TweenHandle, "kill"> | Pick<TweenTimeline, "kill">;

/** Plays the labeled motions in the tween gallery scene. */
export class TweenGalleryBehaviour implements ScriptInstance {
  private readonly killers: Killer[] = [];

  constructor(private readonly ctx: ScriptCreateContext) {}

  start(): void {
    this.killers.length = 0;
    this.playMove();
    this.playScaleFrom();
    this.playFade();
    this.playSpin();
    this.playElastic();
    this.playBounce();
    this.playTimeline();
    this.playStagger();
  }

  destroy(): void {
    for (const killer of this.killers) {
      killer.kill();
    }
    this.killers.length = 0;
    this.ctx.tween.kill();
  }

  private nodeId(name: string): string | undefined {
    return this.ctx.scene.findByName(name)?.id;
  }

  private keep(killer: Killer | undefined): void {
    if (killer) {
      this.killers.push(killer);
    }
  }

  private playMove(): void {
    const nodeId = this.nodeId(MOVE_NODE);
    if (!nodeId) {
      return;
    }
    this.keep(
      this.ctx.tween.to(nodeId, {
        x: MOVE_X,
        duration: MOVE_DURATION_SECONDS,
        ease: "power2.out",
        yoyo: true,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );
  }

  private playScaleFrom(): void {
    const nodeId = this.nodeId(SCALE_NODE);
    if (!nodeId) {
      return;
    }
    this.keep(
      this.ctx.tween.from(nodeId, {
        scale: SCALE_FROM,
        duration: SCALE_FROM_DURATION_SECONDS,
        ease: "back.out",
        yoyo: true,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );
  }

  private playFade(): void {
    const nodeId = this.nodeId(FADE_NODE);
    if (!nodeId) {
      return;
    }
    this.keep(
      this.ctx.tween.to(nodeId, {
        alpha: FADE_ALPHA,
        duration: FADE_DURATION_SECONDS,
        ease: "sine.inOut",
        yoyo: true,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );
  }

  private playSpin(): void {
    const nodeId = this.nodeId(SPIN_NODE);
    if (!nodeId) {
      return;
    }
    this.keep(
      this.ctx.tween.to(nodeId, {
        rotation: SPIN_DEGREES,
        duration: SPIN_DURATION_SECONDS,
        ease: "linear",
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );
  }

  private playElastic(): void {
    const nodeId = this.nodeId(ELASTIC_NODE);
    if (!nodeId) {
      return;
    }
    this.keep(
      this.ctx.tween.to(nodeId, {
        scale: ELASTIC_SCALE,
        duration: ELASTIC_DURATION_SECONDS,
        ease: "elastic.out",
        yoyo: true,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );
  }

  private playBounce(): void {
    const nodeId = this.nodeId(BOUNCE_NODE);
    if (!nodeId) {
      return;
    }
    this.keep(
      this.ctx.tween.to(nodeId, {
        y: BOUNCE_Y,
        duration: BOUNCE_DURATION_SECONDS,
        ease: "bounce.out",
        yoyo: true,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );
  }

  private playTimeline(): void {
    const nodeId = this.nodeId(TIMELINE_NODE);
    if (!nodeId) {
      return;
    }
    const timeline = this.ctx.tween.timeline({
      repeat: TWEEN_INFINITE_REPEAT,
    });
    timeline
      .to(nodeId, {
        x: TIMELINE_SLIDE_X,
        duration: TIMELINE_STEP_SECONDS,
        ease: "power2.out",
      })
      .to(nodeId, {
        rotation: TIMELINE_TURN_DEGREES,
        duration: TIMELINE_STEP_SECONDS,
        ease: "power2.inOut",
      })
      .to(nodeId, {
        x: TIMELINE_RETURN_X,
        duration: TIMELINE_STEP_SECONDS,
        ease: "power2.in",
      });
    this.keep(timeline);
  }

  private playStagger(): void {
    const ids: string[] = [];
    for (let index = 0; index < STAGGER_COUNT; index += 1) {
      const nodeId = this.nodeId(`${STAGGER_PREFIX}${index}`);
      if (nodeId) {
        ids.push(nodeId);
      }
    }
    if (ids.length === 0) {
      return;
    }
    this.keep(
      this.ctx.tween.to(ids, {
        y: STAGGER_Y,
        duration: STAGGER_DURATION_SECONDS,
        ease: "power2.out",
        stagger: STAGGER_SECONDS,
        yoyo: true,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {};

export const tweenGalleryComponent = defineComponent({
  id: "editor-features-demo.TweenGallery",
  displayName: "Tween Gallery",
  category: "Gameplay",
  categoryOrder: 10,
  order: 40,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new TweenGalleryBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installTweenGalleryRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(
    tweenGalleryComponent.id,
    tweenGalleryComponent.create,
  );
}
