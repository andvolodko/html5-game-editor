import type { Container } from "pixi.js";
import { bindRuntimeVec2, type RuntimeTransform2D } from "@game-editor/scene";

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

/**
 * Persistent adapter from engine-neutral RuntimeTransform2D (degrees)
 * onto a Pixi display object. Created once per runtime node.
 *
 * Playback may destroy child visuals while scripts still hold this handle.
 * Never read `.position` / `.scale` off a destroyed Pixi object.
 */
export class PixiRuntimeTransform2D implements RuntimeTransform2D {
  private cachedX = 0;
  private cachedY = 0;
  private cachedRotation = 0;
  private cachedScaleX = 1;
  private cachedScaleY = 1;
  readonly position: RuntimeTransform2D["position"];
  readonly scale: RuntimeTransform2D["scale"];

  constructor(private readonly displayObject: Container) {
    this.position = bindRuntimeVec2(
      () => this.x,
      (value) => {
        this.x = value;
      },
      () => this.y,
      (value) => {
        this.y = value;
      },
    );
    this.scale = bindRuntimeVec2(
      () => this.scaleX,
      (value) => {
        this.scaleX = value;
      },
      () => this.scaleY,
      (value) => {
        this.scaleY = value;
      },
    );
    this.cacheFromObject();
  }

  get x(): number {
    const position = this.livePosition();
    if (!position) {
      return this.cachedX;
    }
    this.cachedX = position.x;
    return this.cachedX;
  }

  set x(value: number) {
    this.cachedX = value;
    const position = this.livePosition();
    if (position) {
      position.x = value;
    }
  }

  get y(): number {
    const position = this.livePosition();
    if (!position) {
      return this.cachedY;
    }
    this.cachedY = position.y;
    return this.cachedY;
  }

  set y(value: number) {
    this.cachedY = value;
    const position = this.livePosition();
    if (position) {
      position.y = value;
    }
  }

  get rotation(): number {
    const object = this.liveObject();
    if (!object) {
      return this.cachedRotation;
    }
    this.cachedRotation = object.rotation * RADIANS_TO_DEGREES;
    return this.cachedRotation;
  }

  set rotation(value: number) {
    this.cachedRotation = value;
    const object = this.liveObject();
    if (object) {
      object.rotation = value * DEGREES_TO_RADIANS;
    }
  }

  get scaleX(): number {
    const scale = this.liveScale();
    if (!scale) {
      return this.cachedScaleX;
    }
    this.cachedScaleX = scale.x;
    return this.cachedScaleX;
  }

  set scaleX(value: number) {
    this.cachedScaleX = value;
    const scale = this.liveScale();
    if (scale) {
      scale.x = value;
    }
  }

  get scaleY(): number {
    const scale = this.liveScale();
    if (!scale) {
      return this.cachedScaleY;
    }
    this.cachedScaleY = scale.y;
    return this.cachedScaleY;
  }

  set scaleY(value: number) {
    this.cachedScaleY = value;
    const scale = this.liveScale();
    if (scale) {
      scale.y = value;
    }
  }

  private liveObject(): Container | undefined {
    const object = this.displayObject;
    return object.destroyed ? undefined : object;
  }

  private livePosition(): { x: number; y: number } | undefined {
    const object = this.liveObject();
    const position = object?.position;
    return position ?? undefined;
  }

  private liveScale(): { x: number; y: number } | undefined {
    const object = this.liveObject();
    const scale = object?.scale;
    return scale ?? undefined;
  }

  private cacheFromObject(): void {
    const position = this.livePosition();
    if (position) {
      this.cachedX = position.x;
      this.cachedY = position.y;
    }
    const object = this.liveObject();
    if (object) {
      this.cachedRotation = object.rotation * RADIANS_TO_DEGREES;
    }
    const scale = this.liveScale();
    if (scale) {
      this.cachedScaleX = scale.x;
      this.cachedScaleY = scale.y;
    }
  }
}
