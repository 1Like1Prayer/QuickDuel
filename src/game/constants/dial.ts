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

// --- 40° regeneration / auto-miss gate ---
export const REGEN_GATE_DEG = 40;
export const REGEN_GATE_RAD = (REGEN_GATE_DEG * Math.PI) / 180;

// --- Hit glow effect ---
export const HIT_GLOW_DURATION = 0.3; // seconds
export const HIT_GLOW_COLOR = 0x44ff44;
export const HIT_GLOW_MAX_ALPHA = 0.7;

// --- Block gradient colors (left → right of spawn range) ---
export const BLOCK_COLOR_LEFT = 0xff2222; // red
export const BLOCK_COLOR_RIGHT = 0xffdd00; // yellow

// --- Katana hit streak ---
export const MAX_KATANA_COUNT = 5;
export const KATANA_SIZE = 28;
export const KATANA_SPACING = 6;
