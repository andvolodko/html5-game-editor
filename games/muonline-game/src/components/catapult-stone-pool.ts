import type { ScriptRuntimeServices } from "@game-editor/game-components";

const MU_MODEL_TILT_X = -Math.PI / 2;
const HIDDEN_SCALE = { x: 0, y: 0, z: 0 };
const PARK_POSITION = { x: 0, y: -100, z: 0 };

export const STONE_POOL_SIZE = 2;

type Vec3 = { x: number; y: number; z: number };

type StonePoolOptions = {
  assetId: string;
  name: string;
  size: number;
};

/**
 * Runtime Model3D instances created once and reused across throws.
 * Hidden (scale 0) while idle; never persisted to scene files.
 */
export class CatapultStonePool {
  private readonly idleIds: string[] = [];
  private readonly ownedIds: string[] = [];
  private filled = false;

  constructor(
    private readonly services: ScriptRuntimeServices,
    private readonly options: StonePoolOptions,
  ) {}

  ensureFilled(): void {
    if (this.filled) {
      return;
    }
    const spawn = this.services.spawnModel3D;
    if (!spawn || this.options.assetId.length === 0) {
      return;
    }
    for (let index = 0; index < this.options.size; index += 1) {
      const nodeId = spawn({
        assetId: this.options.assetId,
        name: this.options.name,
        position: { ...PARK_POSITION },
        rotation: { x: MU_MODEL_TILT_X, y: 0, z: 0 },
        scale: { ...HIDDEN_SCALE },
      });
      if (!nodeId) {
        continue;
      }
      this.ownedIds.push(nodeId);
      this.idleIds.push(nodeId);
    }
    this.filled = this.ownedIds.length > 0;
  }

  acquire(position: Vec3, scale: number): string | undefined {
    this.ensureFilled();
    const nodeId = this.idleIds.pop();
    if (!nodeId) {
      return undefined;
    }
    this.services.setTransform3D?.(nodeId, {
      position,
      scale: { x: scale, y: scale, z: scale },
    });
    return nodeId;
  }

  release(nodeId: string): void {
    this.services.setTransform3D?.(nodeId, {
      position: { ...PARK_POSITION },
      scale: { ...HIDDEN_SCALE },
    });
    this.idleIds.push(nodeId);
  }

  destroy(): void {
    for (const nodeId of this.ownedIds) {
      this.services.destroyNode?.(nodeId);
    }
    this.ownedIds.length = 0;
    this.idleIds.length = 0;
    this.filled = false;
  }
}
