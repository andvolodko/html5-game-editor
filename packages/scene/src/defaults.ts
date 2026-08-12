import type { Vec2, Vec3 } from "./types.js";

/** Default world position when creating a new scene node. */
export const DEFAULT_NODE_SPAWN_POSITION: Vec2 = { x: 120, y: 120 };

/** Default world position for new Three nodes (XZ plane drop maps y→z). */
export const DEFAULT_NODE_SPAWN_POSITION_3D: Vec3 = { x: 0, y: 0, z: 0 };

/** Default width/height for Sprite (and AnimatedSprite placeholder) display size. */
export const DEFAULT_SPRITE_SIZE = 64;

export const DEFAULT_NINE_SLICE_WIDTH = 200;
export const DEFAULT_NINE_SLICE_HEIGHT = 100;
export const DEFAULT_NINE_SLICE_BORDER = 20;

export const DEFAULT_TILING_SPRITE_SIZE = 256;

export const DEFAULT_TEXT_FONT_SIZE = 32;
export const DEFAULT_TEXT_FILL = 0xffffff;
export const DEFAULT_TEXT_WORD_WRAP_WIDTH = 440;

export const DEFAULT_GRAPHICS_SIZE = 100;
export const DEFAULT_GRAPHICS_FILL_COLOR = 0xffffff;
export const DEFAULT_GRAPHICS_STROKE_COLOR = 0x000000;
export const DEFAULT_GRAPHICS_ROUNDED_RADIUS = 12;
export const DEFAULT_GRAPHICS_CIRCLE_RADIUS = 50;
export const DEFAULT_GRAPHICS_ELLIPSE_WIDTH = 120;
export const DEFAULT_GRAPHICS_ELLIPSE_HEIGHT = 80;
/** Half-extent used for the default triangle polygon points. */
export const DEFAULT_GRAPHICS_TRIANGLE_EXTENT = 40;

/** Half-size of the default mesh quad (vertices span ±this). */
export const DEFAULT_MESH_QUAD_HALF_EXTENT = 50;
/** Horizontal span for default MeshRope points (±this on X). */
export const DEFAULT_MESH_ROPE_SPAN = 100;
export const DEFAULT_MESH_PLANE_SIZE = 200;
export const DEFAULT_MESH_SUBDIVISIONS = 10;
/** Fallback AABB when mesh vertices/points are empty. */
export const DEFAULT_MESH_FALLBACK_SIZE = 100;
/** Vertical padding added around MeshRope point bounds. */
export const DEFAULT_MESH_ROPE_BOUNDS_PAD_Y = 16;
/** Placeholder height when MeshRope texture is missing. */
export const DEFAULT_MESH_ROPE_PLACEHOLDER_HEIGHT = 32;
/** Default Spine playback rate (1 = authored speed). */
export const DEFAULT_SPINE_TIME_SCALE = 1;

export const DEFAULT_PERSPECTIVE_CAMERA_FOV = 50;
export const DEFAULT_PERSPECTIVE_CAMERA_NEAR = 0.1;
export const DEFAULT_PERSPECTIVE_CAMERA_FAR = 1000;

export const DEFAULT_DIRECTIONAL_LIGHT_COLOR = 0xffffff;
export const DEFAULT_DIRECTIONAL_LIGHT_INTENSITY = 1;
export const DEFAULT_AMBIENT_LIGHT_COLOR = 0xffffff;
export const DEFAULT_AMBIENT_LIGHT_INTENSITY = 0.4;

/** Default Model3D playback rate (1 = authored speed). */
export const DEFAULT_MODEL3D_TIME_SCALE = 1;
