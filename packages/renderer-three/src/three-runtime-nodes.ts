import type { AnimationClip, AnimationMixer, Object3D } from "three";
import type { Model3DComponentData } from "@game-editor/scene";

export interface Model3DPlaybackState {
  animation?: string;
  loop: boolean;
  timeScale: number;
  playing: boolean;
}

export interface ThreeRuntimeEntry {
  object: Object3D;
  parentId: string | undefined;
  /** Component kind last painted (for rebuild detection). */
  kind: string;
  /** Last Model3D assetId (if any). */
  assetId?: string;
  /** Domain Model3D playback fields (not THREE objects). */
  playback?: Model3DPlaybackState;
  /** PerspectiveCamera.active from domain (preview/runtime). */
  cameraActive?: boolean;
  /** Live AnimationMixer for skinned / keyframed glTF clips. */
  mixer?: AnimationMixer;
  /** Last applied clip name (for restart detection). */
  animationName?: string;
  /** Clip currently bound on the mixer (renderer-only). */
  boundClip?: AnimationClip;
  /** LoopOnce freeze time, skipping a trailing bind/loop-close key. */
  oneShotHoldTime?: number;
}

export function snapshotModelPlayback(
  model: Model3DComponentData | undefined,
): Model3DPlaybackState | undefined {
  if (!model) {
    return undefined;
  }
  return {
    animation: model.animation,
    loop: model.loop,
    timeScale: model.timeScale,
    playing: model.playing,
  };
}

export class ThreeRuntimeGraph {
  private readonly nodes = new Map<string, ThreeRuntimeEntry>();

  get(nodeId: string): ThreeRuntimeEntry | undefined {
    return this.nodes.get(nodeId);
  }

  set(nodeId: string, entry: ThreeRuntimeEntry): void {
    this.nodes.set(nodeId, entry);
  }

  has(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  delete(nodeId: string): void {
    this.nodes.delete(nodeId);
  }

  clear(): void {
    this.nodes.clear();
  }

  entries(): IterableIterator<[string, ThreeRuntimeEntry]> {
    return this.nodes.entries();
  }

  get size(): number {
    return this.nodes.size;
  }
}
