// ──────────────────────────────────────────────
//  Scene‑level visual constants
//  (ring geometry, dial, hit‑zone blocks, fight text)
// ──────────────────────────────────────────────

// --- Ring geometry ---
export const OUTER_RADIUS = 80;
export const RING_WIDTH = 14;
export const RING_GAP = OUTER_RADIUS * 0.1; // 10 % spacing between layers

// Derived ring radii
export const INNER_RING_OUTER = OUTER_RADIUS - RING_WIDTH - RING_GAP;
export const INNER_RING_INNER = INNER_RING_OUTER - RING_WIDTH;

// The gap between the two rings is where the hit-zone blocks & dial live
export const GAP_OUTER = OUTER_RADIUS - RING_WIDTH; // inner edge of outer ring
export const GAP_INNER = INNER_RING_OUTER; // outer edge of inner ring

// --- Dial ---
export const DIAL_LENGTH = OUTER_RADIUS;
export const DIAL_LINE_WIDTH = 3;
export const DIAL_BASE_SPEED = 2.5; // radians per second

// --- Hit‑zone block appearance ---
export const BLOCK_ALPHA = 0.75;
/** Number of line segments used to approximate each block arc. */
export const BLOCK_ARC_SEGMENTS = 16;

// --- "FIGHT!" text style ---
export const FIGHT_TEXT_STYLE = {
  fontFamily: "Arial Black, Impact, sans-serif",
  fontSize: 72,
  fontWeight: "bold" as const,
  fill: 0xffcc00,
  stroke: { color: 0x000000, width: 6 },
  dropShadow: {
    alpha: 0.6,
    angle: Math.PI / 4,
    blur: 4,
    distance: 4,
    color: 0x000000,
  },
};
