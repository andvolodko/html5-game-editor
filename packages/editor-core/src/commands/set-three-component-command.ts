import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  flattenNodes,
  getAmbientLight,
  getDirectionalLight,
  getModel3D,
  getPerspectiveCamera,
  type AmbientLightComponentData,
  type DirectionalLightComponentData,
  type Model3DComponentData,
  type PerspectiveCameraComponentData,
  type ThreeComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export type PerspectiveCameraPatch = Partial<
  Omit<PerspectiveCameraComponentData, "type" | "id">
>;
export type DirectionalLightPatch = Partial<
  Omit<DirectionalLightComponentData, "type" | "id">
>;
export type AmbientLightPatch = Partial<
  Omit<AmbientLightComponentData, "type" | "id">
>;
export type Model3DPatch = Partial<Omit<Model3DComponentData, "type" | "id">>;

type ThreeLeafGetter = (
  node: NonNullable<ReturnType<typeof findNodeById>>,
) => ThreeComponentData | undefined;

function applyPatch<T extends ThreeComponentData>(
  current: T,
  patch: Partial<Omit<T, "type" | "id">>,
): T {
  const next = structuredClone(current) as T & Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (key === "type" || key === "id") {
      continue;
    }
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next as T;
}

class SetThreeLeafCommand implements Command {
  readonly name: string;
  private readonly before: ThreeComponentData;
  private readonly after: ThreeComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    name: string,
    getter: ThreeLeafGetter,
    patch: Record<string, unknown>,
  ) {
    this.name = name;
    const node = findNodeById(document.getScene(), nodeId);
    const component = node ? getter(node) : undefined;
    if (!node || !component) {
      throw new Error(`${name}: node ${nodeId} missing Three component`);
    }
    this.before = structuredClone(component);
    this.after = applyPatch(component, patch);
  }

  execute(): void {
    this.document.applyThreeComponent(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applyThreeComponent(this.nodeId, this.before);
  }
}

/**
 * Sets PerspectiveCamera props. Enabling `active` clears active on other
 * cameras in one undoable step.
 */
export class SetPerspectiveCameraCommand implements Command {
  readonly name = "SetPerspectiveCamera";
  private readonly primary: SetThreeLeafCommand;
  private readonly deactivated: Array<{
    nodeId: string;
    before: PerspectiveCameraComponentData;
    after: PerspectiveCameraComponentData;
  }> = [];

  constructor(
    private readonly document: DocumentManager,
    nodeId: string,
    patch: PerspectiveCameraPatch,
  ) {
    this.primary = new SetThreeLeafCommand(
      document,
      nodeId,
      "SetPerspectiveCamera",
      getPerspectiveCamera,
      patch,
    );
    if (patch.active !== true) {
      return;
    }
    for (const other of flattenNodes(document.getScene())) {
      if (other.id === nodeId) {
        continue;
      }
      const camera = getPerspectiveCamera(other);
      if (!camera?.active) {
        continue;
      }
      const before = structuredClone(camera);
      const after = structuredClone(camera);
      delete after.active;
      this.deactivated.push({ nodeId: other.id, before, after });
    }
  }

  execute(): void {
    this.primary.execute();
    for (const entry of this.deactivated) {
      this.document.applyThreeComponent(entry.nodeId, entry.after);
    }
  }

  undo(): void {
    for (const entry of [...this.deactivated].reverse()) {
      this.document.applyThreeComponent(entry.nodeId, entry.before);
    }
    this.primary.undo();
  }
}

export class SetDirectionalLightCommand extends SetThreeLeafCommand {
  constructor(
    document: DocumentManager,
    nodeId: string,
    patch: DirectionalLightPatch,
  ) {
    super(document, nodeId, "SetDirectionalLight", getDirectionalLight, patch);
  }
}

export class SetAmbientLightCommand extends SetThreeLeafCommand {
  constructor(
    document: DocumentManager,
    nodeId: string,
    patch: AmbientLightPatch,
  ) {
    super(document, nodeId, "SetAmbientLight", getAmbientLight, patch);
  }
}

export class SetModel3DCommand extends SetThreeLeafCommand {
  constructor(document: DocumentManager, nodeId: string, patch: Model3DPatch) {
    super(document, nodeId, "SetModel3D", getModel3D, patch);
  }
}
