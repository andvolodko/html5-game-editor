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
import type { SpineAssetUrls } from "@game-editor/assets";
import {
  fetchCachedArrayBuffer,
  fetchCachedJson,
  fetchCachedText,
} from "./cached-asset-fetch.js";

export interface SpinePlaybackOptions {
  skin?: string;
  animation?: string;
  loop: boolean;
  timeScale: number;
  playing: boolean;
  /**
   * Scene / preview host ticker calls `Spine.update`.
   * Leave false for Asset Preview (`Ticker.shared` via `autoUpdate`).
   */
  hostDriven?: boolean;
}

/** Load a Spine view from resolved URLs. Does not attach playback until `applySpinePlayback`. */
export async function loadSpine(urls: SpineAssetUrls): Promise<Spine> {
  const atlasText = await fetchCachedText(urls.atlasUrl);
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
  const skeletonData =
    urls.skeletonFormat === "skel"
      ? new SkeletonBinary(attachmentLoader).readSkeletonData(
          new Uint8Array(await fetchCachedArrayBuffer(urls.skeletonUrl)),
        )
      : new SkeletonJson(attachmentLoader).readSkeletonData(
          (await fetchCachedJson(urls.skeletonUrl)) as object,
        );

  return new Spine({
    skeletonData,
    autoUpdate: false,
  });
}

export function applySpinePlayback(
  view: Spine,
  options: SpinePlaybackOptions,
): void {
  if (options.skin) {
    view.skeleton.setSkin(options.skin);
    view.skeleton.setupPoseSlots();
  }

  const animationName =
    options.animation ?? view.skeleton.data.animations[0]?.name;
  if (animationName) {
    view.state.setAnimation(0, animationName, options.loop);
  } else {
    view.state.clearTracks();
    view.skeleton.setupPose();
  }
  view.state.timeScale = options.timeScale;
  view.autoUpdate = options.hostDriven === true ? false : options.playing;
  if (!options.playing) {
    view.update(0);
  }
}
