import type { Vec2, Vec3 } from "./types.js";

/** Identity Transform2D position (reset / factory default). */
export const IDENTITY_POSITION_2D: Vec2 = { x: 0, y: 0 };
/** Identity Transform2D rotation in degrees. */
export const IDENTITY_ROTATION_2D = 0;
/** Identity Transform2D scale. */
export const IDENTITY_SCALE_2D: Vec2 = { x: 1, y: 1 };
/** Identity Transform2D skew in degrees (omitted on serialized transforms). */
export const IDENTITY_SKEW_2D: Vec2 = { x: 0, y: 0 };

/** Identity node alpha (omit on serialized nodes). */
export const IDENTITY_NODE_ALPHA = 1;
/** Inclusive lower bound for serialized node alpha. */
export const NODE_ALPHA_MIN = 0;
/** Inclusive upper bound for serialized node alpha. */
export const NODE_ALPHA_MAX = 1;

/** Identity Transform3D position (reset / factory default). */
export const IDENTITY_POSITION_3D: Vec3 = { x: 0, y: 0, z: 0 };
/** Identity Transform3D Euler rotation. */
export const IDENTITY_ROTATION_3D: Vec3 = { x: 0, y: 0, z: 0 };
/** Identity Transform3D scale. */
export const IDENTITY_SCALE_3D: Vec3 = { x: 1, y: 1, z: 1 };

/** Default world position when creating a new scene node. */
export const DEFAULT_NODE_SPAWN_POSITION: Vec2 = { x: 120, y: 120 };

/** Default world position for new Three nodes (XZ plane drop maps y→z). */
export const DEFAULT_NODE_SPAWN_POSITION_3D: Vec3 = { x: 0, y: 0, z: 0 };

/** Default width/height for Sprite (and AnimatedSprite placeholder) display size. */
export const DEFAULT_SPRITE_SIZE = 64;

/** Default Tilemap / TileSet cell size in pixels. */
export const DEFAULT_TILE_SIZE = 32;

/** Hit-area size in tiles when a Tilemap has no painted cells. */
export const DEFAULT_TILEMAP_EMPTY_EXTENT_TILES = 8;

export const DEFAULT_NINE_SLICE_WIDTH = 200;
export const DEFAULT_NINE_SLICE_HEIGHT = 100;
export const DEFAULT_NINE_SLICE_BORDER = 20;

export const DEFAULT_TILING_SPRITE_SIZE = 256;

/** Pixi/CSS family used when no catalogue webfont is assigned. */
export const DEFAULT_TEXT_FONT_FAMILY = "Arial";
export const DEFAULT_TEXT_FONT_SIZE = 32;
export const DEFAULT_TEXT_FILL = 0xffffff;
export const DEFAULT_TEXT_FILL_ALPHA = 1;
export const DEFAULT_TEXT_WORD_WRAP_WIDTH = 440;
export const DEFAULT_TEXT_STROKE_COLOR = 0x000000;
export const DEFAULT_TEXT_STROKE_ALPHA = 1;
export const DEFAULT_TEXT_PADDING = 0;
export const DEFAULT_TEXT_MITER_LIMIT = 10;
export const DEFAULT_TEXT_DROP_SHADOW_COLOR = 0x000000;
export const DEFAULT_TEXT_DROP_SHADOW_ALPHA = 1;
export const DEFAULT_TEXT_DROP_SHADOW_DISTANCE = 5;
export const DEFAULT_TEXT_DROP_SHADOW_ANGLE_DEGREES = 30;

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

/** Hard upper bound for ParticleEmitter maxParticles (safety). */
export const MAX_PARTICLE_COUNT = 100_000;
/** Default emission rate (particles per second). */
export const DEFAULT_PARTICLE_EMISSION_RATE = 20;
/** Default max live particles. */
export const DEFAULT_PARTICLE_MAX_PARTICLES = 200;
/** Default particle lifetime minimum (seconds). */
export const DEFAULT_PARTICLE_LIFETIME_MIN = 0.8;
/** Default particle lifetime maximum (seconds). */
export const DEFAULT_PARTICLE_LIFETIME_MAX = 1.5;
/** Default spawn circle radius (local px). */
export const DEFAULT_PARTICLE_SPAWN_RADIUS = 30;
/** Default spawn rectangle width (local px). */
export const DEFAULT_PARTICLE_SPAWN_WIDTH = 60;
/** Default spawn rectangle height (local px). */
export const DEFAULT_PARTICLE_SPAWN_HEIGHT = 60;
/** Default emission speed minimum (local units / s). */
export const DEFAULT_PARTICLE_SPEED_MIN = 20;
/** Default emission speed maximum (local units / s). */
export const DEFAULT_PARTICLE_SPEED_MAX = 80;
/** Default emission angle range (degrees). */
export const DEFAULT_PARTICLE_ANGLE_MIN = 0;
export const DEFAULT_PARTICLE_ANGLE_MAX = 360;
/** Default ParticleEmitter seed for deterministic previews. */
export const DEFAULT_PARTICLE_SEED = 1;
/** Default particle color (white RGB hex). */
export const DEFAULT_PARTICLE_COLOR = 0xffffff;
/** Fallback selection AABB half-extent for point spawn. */
export const DEFAULT_PARTICLE_POINT_BOUNDS_HALF = 16;

export const DEFAULT_PERSPECTIVE_CAMERA_FOV = 50;
export const DEFAULT_PERSPECTIVE_CAMERA_NEAR = 0.1;
export const DEFAULT_PERSPECTIVE_CAMERA_FAR = 1000;

export const DEFAULT_DIRECTIONAL_LIGHT_COLOR = 0xffffff;
export const DEFAULT_DIRECTIONAL_LIGHT_INTENSITY = 1;
export const DEFAULT_AMBIENT_LIGHT_COLOR = 0xffffff;
export const DEFAULT_AMBIENT_LIGHT_INTENSITY = 0.4;

/** Default Model3D playback rate (1 = authored speed). */
export const DEFAULT_MODEL3D_TIME_SCALE = 1;
