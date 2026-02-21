// ──────────────────────────────────────────────
//  Dial‑game constants (hit zones, speed, difficulty)
//  Pixel sizes (KATANA_SIZE, KATANA_SPACING) moved to useLayout.
// ──────────────────────────────────────────────

/** Each block covers 5% of the full circle = 18°. */
export const BLOCK_ARC = (5 / 100) * Math.PI * 2; // ~0.314 rad

/** Blocks can spawn between 65° and 280° (in standard math degrees, CCW from +x).
 *  This keeps them away from the top (270°) where the dial starts. */
export const SPAWN_MIN_DEG = 65;
export const SPAWN_MAX_DEG = 260;
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

// --- Regeneration / miss gate (300° = 30° clockwise from top / "1 o'clock") ---
export const REGEN_GATE_DEG = 300;
export const REGEN_GATE_RAD = (REGEN_GATE_DEG * Math.PI) / 180;

// --- Hit glow effect ---
export const HIT_GLOW_DURATION = 0.3; // seconds
export const HIT_GLOW_COLOR = 0x44ff44;
export const HIT_GLOW_MAX_ALPHA = 0.7;

// --- Miss pulse effect ---
export const MISS_PULSE_DURATION = 0.4; // seconds
export const MISS_PULSE_COLOR = 0xff2222; // red
export const MISS_PULSE_MAX_ALPHA = 0.8;
export const MISS_LINE_WIDTH_FACTOR = 0.06; // relative to outerRadius

// --- Block colors (ordered: green → yellow → orange → red) ---
export const BLOCK_COLORS = [
  0x44ff44, // vivid green
  0xffee00, // bright yellow
  0xff8800, // hot orange
  0xff1111, // intense red
];

// --- Points awarded per block color ---
export const BLOCK_POINTS: Record<number, number> = {
  0x44ff44: 1, // vivid green
  0xffee00: 2, // bright yellow
  0xff8800: 3, // hot orange
  0xff1111: 4, // intense red
};

/** Points threshold — game ends when a player exceeds this. */
export const WIN_POINTS = 10;

// --- Katana hit streak ---
export const MAX_KATANA_COUNT = 5;
