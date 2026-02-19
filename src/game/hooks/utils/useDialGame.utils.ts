import {
  BLOCK_ARC,
  BLOCK_COLORS,
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

/** Build the colour array for `count` blocks, always using the rightmost
 *  colours from the fixed BLOCK_COLORS palette.
 *  Index 0 = leftmost remaining, index count-1 = rightmost. */
export function buildColorStack(count: number): number[] {
  const total = MAX_BLOCK_COUNT;
  const startIdx = total - count;
  return BLOCK_COLORS.slice(startIdx, startIdx + count);
}

/** Compute the colour for a block based on its index within the color stack. */
export function blockColor(
  block: HitZoneBlock,
  colorStack: number[],
): number {
  return colorStack[block.index] ?? 0xffffff;
}
