export type RendererKind = "pixi" | "three";

/**
 * Describes a compositor layer. Canvas stacking is a renderer detail.
 */
export interface RenderLayer {
  id: string;
  renderer: RendererKind;
  order: number;
}
