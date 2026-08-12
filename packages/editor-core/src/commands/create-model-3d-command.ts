import type { Command } from "@game-editor/commands";
import {
  createModel3DComponent,
  createNodeWithTransform3D,
  DEFAULT_NODE_SPAWN_POSITION,
  vec2ToVec3OnXZ,
  type Vec2,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export interface CreateModel3DOptions {
  name?: string;
  position?: Vec2;
  assetId?: string;
}

export class CreateModel3DCommand implements Command {
  readonly name = "CreateModel3D";
  private readonly node;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    options: CreateModel3DOptions = {},
  ) {
    this.node = createNodeWithTransform3D(
      options.name ?? "Model3D",
      vec2ToVec3OnXZ(options.position ?? { ...DEFAULT_NODE_SPAWN_POSITION }),
      createModel3DComponent({
        ...(options.assetId !== undefined ? { assetId: options.assetId } : {}),
      }),
    );
    this.previousSelection = selection.getSelection();
  }

  get createdNodeId(): string {
    return this.node.id;
  }

  execute(): void {
    this.document.addRootNode(this.node);
    this.selection.setSelection([this.node.id]);
  }

  undo(): void {
    this.document.removeNode(this.node.id);
    this.selection.restore(this.previousSelection);
  }
}
