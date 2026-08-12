import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import {
  AtlasAttachmentLoader,
  SkeletonBinary,
  SkeletonJson,
  Spine,
  SpineTexture,
  TextureAtlas,
} from "@esotericsoftware/spine-pixi-v8";
import {
  DEFAULT_SPRITE_SIZE,
  type SpineComponentData,
} from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  centeredBounds,
  destroyVisual,
  ensureChild,
  localBoundsOf,
  missingTextureResult,
  unassignedTextureResult,
} from "../paint-helpers.js";
import { PLACEHOLDER_UNASSIGNED_TINT } from "../../editor-chrome.js";

export const spinePainter: PixiVisualPainter = {
  type: "Spine",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as SpineComponentData;
    if (!data.assetId) {
      return unassignedTextureResult(
        ctx,
        data.type,
        DEFAULT_SPRITE_SIZE,
        DEFAULT_SPRITE_SIZE,
        PLACEHOLDER_UNASSIGNED_TINT,
      );
    }
    const urls = ctx.assetResolver?.resolveSpineUrls?.(data.assetId);
    if (!urls) {
      ctx.warnMissingAsset(data.assetId);
      return missingTextureResult(
        ctx,
        data.type,
        DEFAULT_SPRITE_SIZE,
        DEFAULT_SPRITE_SIZE,
      );
    }

    try {
      const view = await loadSpineView(urls, data);
      ctx.hidePlaceholder();
      destroyVisual(ctx.visual);
      ensureChild(ctx.visualsRoot, view);
      view.visible = true;
      return {
        visual: view,
        visualType: data.type,
        bounds: localBoundsOf(
          view,
          centeredBounds(DEFAULT_SPRITE_SIZE, DEFAULT_SPRITE_SIZE),
        ),
      };
    } catch (error) {
      console.warn("[renderer] spine load failed", {
        category: "renderer",
        assetId: data.assetId,
        nodeId: ctx.node.id,
        error: error instanceof Error ? error.message : String(error),
      });
      ctx.warnMissingAsset(data.assetId);
      return missingTextureResult(
        ctx,
        data.type,
        DEFAULT_SPRITE_SIZE,
        DEFAULT_SPRITE_SIZE,
      );
    }
  },
};

async function loadSpineView(
  urls: {
    skeletonUrl: string;
    skeletonFormat: "json" | "skel";
    atlasUrl: string;
    pageUrls: Readonly<Record<string, string>>;
  },
  data: SpineComponentData,
): Promise<Spine> {
  const atlasResponse = await fetch(urls.atlasUrl);
  if (!atlasResponse.ok) {
    throw new Error(`Failed to fetch spine atlas (${String(atlasResponse.status)})`);
  }
  const atlasText = await atlasResponse.text();
  const atlas = new TextureAtlas(atlasText);

  for (const page of atlas.pages) {
    const pageUrl =
      urls.pageUrls[page.name] ??
      Object.entries(urls.pageUrls).find(
        ([name]) => name.toLowerCase() === page.name.toLowerCase(),
      )?.[1];
    if (!pageUrl) {
      throw new Error(`Missing spine atlas page: ${page.name}`);
    }
    const texture = (await Assets.load(pageUrl)) as Texture;
    page.setTexture(SpineTexture.from(texture.source));
  }

  const attachmentLoader = new AtlasAttachmentLoader(atlas);
  const skeletonResponse = await fetch(urls.skeletonUrl);
  if (!skeletonResponse.ok) {
    throw new Error(
      `Failed to fetch spine skeleton (${String(skeletonResponse.status)})`,
    );
  }

  const skeletonData =
    urls.skeletonFormat === "skel"
      ? new SkeletonBinary(attachmentLoader).readSkeletonData(
          new Uint8Array(await skeletonResponse.arrayBuffer()),
        )
      : new SkeletonJson(attachmentLoader).readSkeletonData(
          (await skeletonResponse.json()) as object,
        );

  const view = new Spine({
    skeletonData,
    autoUpdate: false,
  });

  if (data.skin) {
    view.skeleton.setSkin(data.skin);
    view.skeleton.setupPoseSlots();
  }

  const animationName =
    data.animation ?? view.skeleton.data.animations[0]?.name;
  if (animationName) {
    view.state.setAnimation(0, animationName, data.loop);
  }
  view.state.timeScale = data.timeScale;
  view.autoUpdate = data.playing;
  if (!data.playing) {
    view.update(0);
  }
  return view;
}
