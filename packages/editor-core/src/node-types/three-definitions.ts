import {
  createAmbientLightComponent,
  createDirectionalLightComponent,
  createModel3DComponent,
  createNodeWithTransform3D,
  createPerspectiveCameraComponent,
  vec2ToVec3OnXZ,
} from "@game-editor/scene";
import type { NodeTypeRegistry } from "./registry.js";
import { def } from "./three/helpers.js";

function registerThreeContainerTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "three.container",
      label: "Container 3D",
      category: "Three",
      categoryOrder: 50,
      order: 10,
      icon: "▣",
      canHaveChildren: true,
      createDefaultNode: (ctx) =>
        createNodeWithTransform3D(
          ctx.name,
          vec2ToVec3OnXZ(ctx.position),
          undefined,
          ctx.parentId,
        ),
    }),
  );
}

function registerThreeModelTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "three.model",
      label: "Model 3D",
      category: "Three",
      categoryOrder: 50,
      order: 20,
      icon: "▣",
      canHaveChildren: false,
      supportedAssetTypes: ["gltf"],
      createDefaultNode: (ctx) =>
        createNodeWithTransform3D(
          ctx.name,
          vec2ToVec3OnXZ(ctx.position),
          createModel3DComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );
}

function registerThreeCameraTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "three.perspective-camera",
      label: "Perspective Camera",
      category: "Three",
      categoryOrder: 50,
      order: 30,
      icon: "◎",
      canHaveChildren: false,
      createDefaultNode: (ctx) =>
        createNodeWithTransform3D(
          ctx.name,
          { x: 0, y: 5, z: 10 },
          createPerspectiveCameraComponent({ active: true }),
          ctx.parentId,
        ),
    }),
  );
}

function registerThreeLightTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "three.directional-light",
      label: "Directional Light",
      category: "Three",
      categoryOrder: 50,
      order: 40,
      icon: "☀",
      canHaveChildren: false,
      createDefaultNode: (ctx) =>
        createNodeWithTransform3D(
          ctx.name,
          { x: 5, y: 10, z: 5 },
          createDirectionalLightComponent(),
          ctx.parentId,
        ),
    }),
  );
  registry.register(
    def({
      id: "three.ambient-light",
      label: "Ambient Light",
      category: "Three",
      categoryOrder: 50,
      order: 50,
      icon: "○",
      canHaveChildren: false,
      createDefaultNode: (ctx) =>
        createNodeWithTransform3D(
          ctx.name,
          vec2ToVec3OnXZ(ctx.position),
          createAmbientLightComponent(),
          ctx.parentId,
        ),
    }),
  );
}

/** Registers built-in Three.js node types into the given registry. */
export function registerThreeNodeTypes(registry: NodeTypeRegistry): void {
  registerThreeContainerTypes(registry);
  registerThreeModelTypes(registry);
  registerThreeCameraTypes(registry);
  registerThreeLightTypes(registry);
}
