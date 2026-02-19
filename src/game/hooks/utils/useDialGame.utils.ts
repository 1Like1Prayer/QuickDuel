import {
  BLOCK_ARC,
  BLOCK_COLOR_LEFT,
  BLOCK_COLOR_RIGHT,
  MAX_BLOCK_COUNT,
  SPAWN_MAX_RAD,
  SPAWN_MIN_RAD,
} from "../../constants";

import type { HitZoneBlock } from "../types/useDialGame.types";

/** Generate `count` adjacent blocks at a random position in the spawn range. */
export function generateBlocks(count: number): HitZoneBlock[] {
  const available = SPAWN_MAX_RAD - SPAWN_MIN_RAD;
  const totalBlockArc = count * BLOCK_ARC;

  // Clamp so the group fits inside the spawn range
  const maxStart = SPAWN_MIN_RAD + Math.max(0, available - totalBlockArc);
  const startAngle =
    SPAWN_MIN_RAD + Math.random() * (maxStart - SPAWN_MIN_RAD);

  const blocks: HitZoneBlock[] = [];
  for (let i = 0; i < count; i++) {
    const s = startAngle + i * BLOCK_ARC;
    blocks.push({ startAngle: s, endAngle: s + BLOCK_ARC, index: i });
  }
  return blocks;
}

/** Normalise an angle to [0, 2π). */
export function normalizeAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r < 0) r += Math.PI * 2;
  return r;
}

/** Check if the dial angle overlaps any block. Returns the matching block or null. */
export function findHitBlock(
  dialAngle: number,
  blocks: HitZoneBlock[],
): HitZoneBlock | null {
  const norm = normalizeAngle(dialAngle);
  for (const b of blocks) {
    const start = normalizeAngle(b.startAngle);
    const end = normalizeAngle(b.endAngle);
    if (start < end) {
      if (norm >= start && norm <= end) return b;
    } else {
      // Wraps around 0
      if (norm >= start || norm <= end) return b;
    }
  }
  return null;
}

/** Linearly interpolate each RGB channel between two colours. */
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Build the colour array for `count` blocks, always using the rightmost
 *  colours from the full MAX_BLOCK_COUNT gradient.
 *  Index 0 = palest (left), index count-1 = strongest red (right). */
export function buildColorStack(count: number): number[] {
  const total = MAX_BLOCK_COUNT;
  const startIdx = total - count;
  const colors: number[] = [];
  for (let i = startIdx; i < total; i++) {
    const t = total > 1 ? i / (total - 1) : 1;
    colors.push(lerpColor(BLOCK_COLOR_LEFT, BLOCK_COLOR_RIGHT, t));
  }
  return colors;
}

/** Compute the colour for a block based on its index within the color stack. */
export function blockColor(
  block: HitZoneBlock,
  colorStack: number[],
): number {
  return colorStack[block.index] ?? 0xffffff;
}
