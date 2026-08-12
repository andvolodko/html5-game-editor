import {
  createMeshComponent,
  createMeshPlaneComponent,
  createMeshRopeComponent,
  createMeshSimpleComponent,
  createNodeWithVisual,
  createPerspectiveMeshComponent,
} from "@game-editor/scene";
import type { NodeTypeRegistry } from "../registry.js";
import { def } from "./helpers.js";

export function registerPixiMeshTypes(registry: NodeTypeRegistry): void {
  registry.register(
    def({
      id: "pixi.mesh",
      label: "Mesh",
      category: "Mesh",
      categoryOrder: 50,
      order: 10,
      icon: "△",
      canHaveChildren: false,
      supportedAssetTypes: ["texture"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createMeshComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.mesh-simple",
      label: "Simple Mesh",
      category: "Mesh",
      categoryOrder: 50,
      order: 20,
      icon: "△",
      canHaveChildren: false,
      supportedAssetTypes: ["texture"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createMeshSimpleComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.mesh-rope",
      label: "Rope",
      category: "Mesh",
      categoryOrder: 50,
      order: 30,
      icon: "△",
      canHaveChildren: false,
      supportedAssetTypes: ["texture"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createMeshRopeComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.mesh-plane",
      label: "Plane",
      category: "Mesh",
      categoryOrder: 50,
      order: 40,
      icon: "△",
      canHaveChildren: false,
      supportedAssetTypes: ["texture"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createMeshPlaneComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );

  registry.register(
    def({
      id: "pixi.perspective-mesh",
      label: "Perspective Mesh",
      category: "Mesh",
      categoryOrder: 50,
      order: 50,
      icon: "△",
      canHaveChildren: false,
      supportedAssetTypes: ["texture"],
      createDefaultNode: (ctx) =>
        createNodeWithVisual(
          ctx.name,
          ctx.position,
          createPerspectiveMeshComponent(
            ctx.assetId !== undefined ? { assetId: ctx.assetId } : {},
          ),
          ctx.parentId,
        ),
    }),
  );
}
