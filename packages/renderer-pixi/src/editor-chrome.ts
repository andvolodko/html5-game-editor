/** Shared editor preview chrome colors and layout tokens (not serialized). */

export const EDITOR_ACCENT_COLOR = 0x4c8bf5;
export const EDITOR_ACCENT_ACTIVE_COLOR = 0x2f6fed;
export const EDITOR_ACCENT_ACTIVE_FILL = 0xdbe8ff;
export const EDITOR_CHROME_FILL = 0xffffff;

export const EDITOR_SELECTION_STROKE_WIDTH = 1.5;
export const EDITOR_SELECTION_FILL_ALPHA = 0.95;
export const EDITOR_GROUP_ORIGIN_MARKER_RADIUS = 5;

export const DEFAULT_EDITOR_BACKGROUND = 0x0e1016;

/** Extra world padding when sizing the pixel grid to the visible camera rect. */
export const PIXEL_GRID_VIEW_PAD = 64;

/** Tint for placeholders when a texture asset is not assigned. */
export const PLACEHOLDER_UNASSIGNED_TINT = 0x5b8cff;
/** Tint for placeholders when a referenced texture failed to load. */
export const PLACEHOLDER_MISSING_TINT = 0xb33a3a;
export const PLACEHOLDER_CORNER_RADIUS = 6;

export const BITMAP_TEXT_PLACEHOLDER_WIDTH = 160;
export const BITMAP_TEXT_PLACEHOLDER_HEIGHT = 40;
/** Tint when BitmapText has no fontFamily assigned. */
export const BITMAP_FONT_UNASSIGNED_TINT = 0x6b7280;

/** Approx char width in ems for text paint fallback bounds. */
export const TEXT_FALLBACK_CHAR_WIDTH_EM = 0.6;
/** Approx line height in ems for text paint fallback bounds. */
export const TEXT_FALLBACK_LINE_HEIGHT_EM = 1.2;
/** Provisional hit-area width multiplier (ems) before text metrics resolve. */
export const TEXT_PROVISIONAL_WIDTH_EM = 4;
/** Provisional hit-area height multiplier (ems) before text metrics resolve. */
export const TEXT_PROVISIONAL_HEIGHT_EM = 1.4;

export const GIZMO_FRAME_STROKE_WIDTH = 1.25;
export const GIZMO_FRAME_STROKE_ALPHA = 0.95;
export const GIZMO_STEM_STROKE_ALPHA = 0.9;

/** Editor HitZone overlay (not serialized). Distinct from selection blue. */
export const HIT_ZONE_FILL_COLOR = 0x3dcc7a;
export const HIT_ZONE_STROKE_COLOR = 0x2eaa64;
export const HIT_ZONE_FILL_ALPHA = 0.16;
export const HIT_ZONE_STROKE_ALPHA = 0.95;
export const HIT_ZONE_STROKE_WIDTH = 1.5;
export const HIT_ZONE_HANDLE_FILL = 0xd8f8e6;

/** Editor Mask overlay (not serialized). Distinct from HitZone green. */
export const MASK_FILL_COLOR = 0xcc3dcc;
export const MASK_STROKE_COLOR = 0xaa2eaa;
export const MASK_FILL_ALPHA = 0.16;
export const MASK_STROKE_ALPHA = 0.95;
export const MASK_STROKE_WIDTH = 1.5;
export const MASK_HANDLE_FILL = 0xf8d8f8;
