// ──────────────────────────────────────────────
//  Dial‑game constants (hit zones, speed, difficulty)
// ──────────────────────────────────────────────

/** Each block covers 5% of the full circle = 18°. */
export const BLOCK_ARC = (5 / 100) * Math.PI * 2; // ~0.314 rad

/** Blocks can spawn between 65° and 305° (in standard math degrees, CCW from +x). */
export const SPAWN_MIN_DEG = 65;
export const SPAWN_MAX_DEG = 305;
export const SPAWN_MIN_RAD = (SPAWN_MIN_DEG * Math.PI) / 180;
export const SPAWN_MAX_RAD = (SPAWN_MAX_DEG * Math.PI) / 180;

/** Initial number of hit-zone blocks. */
export const INITIAL_BLOCK_COUNT = 4;
export const MIN_BLOCK_COUNT = 1;
export const MAX_BLOCK_COUNT = 4;

/** Initial speed multiplier. */
export const INITIAL_SPEED = 1.5;

/** Speed scaling. */
export const SPEED_STEP = 0.2; // 20% per hit/miss
export const MAX_SPEED_BONUS = 0.6; // +60% max
export const MIN_SPEED_BONUS = 0; // back to base

/** Miss if dial completes 2 full rotations without input. */
export const MISS_ROTATION_THRESHOLD = 2;
