export type {
  PixiVisualPainter,
  VisualPaintContext,
  VisualPaintResult,
  TextureLoadContext,
} from "./types.js";
export {
  getVisualPainter,
  paintVisualComponent,
  clearVisual,
} from "./painter-registry.js";
export { evictTileTextureCache } from "./painters/tilemap.js";
