import type { BuildTarget } from "./types.js";

export class BuildTargetRegistry {
  private readonly targets = new Map<string, BuildTarget>();

  register(target: BuildTarget): void {
    if (this.targets.has(target.id)) {
      throw new Error(`BuildTargetRegistry: duplicate target id "${target.id}"`);
    }
    this.targets.set(target.id, target);
  }

  get(id: string): BuildTarget | undefined {
    return this.targets.get(id);
  }

  require(id: string): BuildTarget {
    const target = this.targets.get(id);
    if (!target) {
      throw new Error(`BuildTargetRegistry: unknown target id "${id}"`);
    }
    return target;
  }

  list(): BuildTarget[] {
    return [...this.targets.values()];
  }
}
