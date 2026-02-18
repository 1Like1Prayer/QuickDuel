import { useCallback, useRef } from "react";

import {
  BLOCK_ARC,
  BLOCK_COLOR_LEFT,
  BLOCK_COLOR_RIGHT,
  HIT_GLOW_DURATION,
  INITIAL_BLOCK_COUNT,
  INITIAL_SPEED,
  MAX_BLOCK_COUNT,
  MAX_KATANA_COUNT,
  MAX_SPEED_BONUS,
  MIN_BLOCK_COUNT,
  MIN_SPEED_BONUS,
  REGEN_GATE_RAD,
  SPAWN_MAX_RAD,
  SPAWN_MIN_RAD,
  SPEED_STEP,
} from "../constants";

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

export interface HitZoneBlock {
  /** Start angle in radians (standard math convention). */
  startAngle: number;
  /** End angle = startAngle + BLOCK_ARC. */
  endAngle: number;
  /** Index of this block within the group (0 = leftmost). */
  index: number;
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

/** Generate `count` adjacent blocks at a random position in the spawn range. */
function generateBlocks(count: number): HitZoneBlock[] {
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
function normalizeAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r < 0) r += Math.PI * 2;
  return r;
}

/** Check if the dial angle overlaps any block. Returns the matching block or null. */
function findHitBlock(
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
function buildColorStack(count: number): number[] {
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

// ──────────────────────────────────────────────
//  Hook
// ──────────────────────────────────────────────

export interface UseDialGameParams {
  /** Base dial speed in radians per second. */
  baseSpeed: number;
}

export interface UseDialGameReturn {
  /** Ref to current dial angle (mutated each tick). */
  dialAngle: React.RefObject<number>;
  /** Ref to current blocks array. */
  blocks: React.RefObject<HitZoneBlock[]>;
  /** Ref to current block count. */
  blockCount: React.RefObject<number>;
  /** Ref to speed multiplier. */
  speedMultiplier: React.RefObject<number>;
  /** Ref to last hit result (null = no attempt yet). */
  lastHit: React.RefObject<boolean | null>;
  /** Whether the dial game is active. */
  active: React.RefObject<boolean>;
  /** Timer counting down after a successful hit (seconds). */
  hitGlowTimer: React.RefObject<number>;
  /** Rolling array of block colours from each successful hit (max 5, newest last). */
  hitColors: React.RefObject<number[]>;
  /** Current color stack for the blocks (index-based). */
  colorStack: React.RefObject<number[]>;
  /** Angles of the last hit block (for targeted glow). null when no active glow. */
  hitBlockAngles: React.RefObject<{ startAngle: number; endAngle: number } | null>;
  /** Start the dial game. */
  start: () => void;
  /** Stop the dial game. */
  stop: () => void;
  /** Attempt a hit (call from input handler). Returns true if hit, false if miss. */
  attempt: () => boolean;
  /** Call this from useTick to advance the dial. Returns current angle. */
  tick: (dt: number) => number;
}

export function useDialGame({
  baseSpeed,
}: UseDialGameParams): UseDialGameReturn {
  const dialAngle = useRef(-Math.PI / 2); // start at top
  const speedMultiplier = useRef(INITIAL_SPEED);
  const blockCount = useRef(INITIAL_BLOCK_COUNT);
  const blocks = useRef<HitZoneBlock[]>(generateBlocks(INITIAL_BLOCK_COUNT));
  const lastHit = useRef<boolean | null>(null);
  const active = useRef(false);

  // Glow timer (counts down from HIT_GLOW_DURATION on hit)
  const hitGlowTimer = useRef(0);

  // Angles of the last hit block (for targeted glow)
  const hitBlockAngles = useRef<{ startAngle: number; endAngle: number } | null>(null);

  // Rolling hit streak colours
  const hitColors = useRef<number[]>([]);

  // Index-based color stack — consistent across regenerations
  const colorStack = useRef<number[]>(buildColorStack(INITIAL_BLOCK_COUNT));

  // Whether the player made an attempt (hit or miss tap) this lap.
  // If no attempt was made by the next gate crossing, it counts as a miss.
  const attemptedThisLap = useRef(false);

  // Whether a hit occurred and the palest color should be trimmed at the next regen.
  const pendingColorTrim = useRef(false);

  // Whether the color stack should be restored to full at the next regen (after a miss).
  const pendingColorRestore = useRef(false);

  // Track the previous normalised angle to detect the 30° gate crossing.
  const prevNorm = useRef(normalizeAngle(-Math.PI / 2));

  // Whether the very first gate crossing after start() should be skipped
  // (the dial starts at top = 270°, which is past 30°, so the first
  //  forward crossing of 30° is still the "initial spin").
  const firstLapDone = useRef(false);

  // ── Start / Stop ──

  const start = useCallback(() => {
    active.current = true;
    dialAngle.current = -Math.PI / 2;
    prevNorm.current = normalizeAngle(-Math.PI / 2);
    speedMultiplier.current = INITIAL_SPEED;
    blockCount.current = INITIAL_BLOCK_COUNT;
    blocks.current = generateBlocks(INITIAL_BLOCK_COUNT);
    lastHit.current = null;
    hitGlowTimer.current = 0;
    hitBlockAngles.current = null;
    hitColors.current = [];
    colorStack.current = buildColorStack(INITIAL_BLOCK_COUNT);
    attemptedThisLap.current = false;
    pendingColorTrim.current = false;
    pendingColorRestore.current = false;
    firstLapDone.current = false;
  }, []);

  const stop = useCallback(() => {
    active.current = false;
  }, []);

  // ── Handle input ──

  const attempt = useCallback((): boolean => {
    if (!active.current) return false;

    const hitBlock = findHitBlock(dialAngle.current, blocks.current);
    const hit = hitBlock !== null;
    lastHit.current = hit;
    attemptedThisLap.current = true;

    if (hit) {
      // Decrease blocks (min 1)
      const prevCount = blockCount.current;
      blockCount.current = Math.max(
        MIN_BLOCK_COUNT,
        blockCount.current - 1,
      );
      // Speed up
      speedMultiplier.current = Math.min(
        INITIAL_SPEED + MAX_SPEED_BONUS,
        speedMultiplier.current + SPEED_STEP,
      );
      // Glow on the hit block only
      hitGlowTimer.current = HIT_GLOW_DURATION;
      hitBlockAngles.current = { startAngle: hitBlock.startAngle, endAngle: hitBlock.endAngle };
      // Record colour for katana streak
      const color = blockColor(hitBlock, colorStack.current);
      hitColors.current = [
        ...hitColors.current.slice(-(MAX_KATANA_COUNT - 1)),
        color,
      ];
      // Defer color removal until blocks regenerate (only if count actually decreased)
      if (blockCount.current < prevCount) {
        pendingColorTrim.current = true;
      }
    } else {
      // Increase blocks back to max
      blockCount.current = Math.min(
        MAX_BLOCK_COUNT,
        blockCount.current + 1,
      );
      // Slow down (min base speed)
      speedMultiplier.current = Math.max(
        INITIAL_SPEED + MIN_SPEED_BONUS,
        speedMultiplier.current - SPEED_STEP,
      );
      // Defer color restore until blocks regenerate
      pendingColorRestore.current = true;
    }

    return hit;
  }, []);

  // ── Tick function ──

  const tick = useCallback(
    (dt: number): number => {
      if (!active.current) return dialAngle.current;

      const speed = baseSpeed * speedMultiplier.current;
      dialAngle.current += speed * dt;

      // Decrement glow timer
      if (hitGlowTimer.current > 0) {
        hitGlowTimer.current = Math.max(0, hitGlowTimer.current - dt);
      }

      // Detect the 30° gate crossing
      const curNorm = normalizeAngle(dialAngle.current);
      const prev = prevNorm.current;

      // Crossing = previous angle was below the gate AND current is at/above it
      const crossed =
        prev < REGEN_GATE_RAD && curNorm >= REGEN_GATE_RAD;

      if (crossed) {
        if (!firstLapDone.current) {
          // Skip the very first crossing — it's the initial spin
          firstLapDone.current = true;
        } else {
          // If the player didn't make an attempt this lap, it's a miss
          if (!attemptedThisLap.current && blocks.current.length > 0) {
            lastHit.current = false;

            // Miss penalty
            blockCount.current = Math.min(
              MAX_BLOCK_COUNT,
              blockCount.current + 1,
            );
            speedMultiplier.current = Math.max(
              INITIAL_SPEED + MIN_SPEED_BONUS,
              speedMultiplier.current - SPEED_STEP,
            );
            // Defer color restore to regen
            pendingColorRestore.current = true;
          }

          // Always regenerate blocks at new positions
          // Apply deferred color changes
          if (pendingColorRestore.current) {
            colorStack.current = buildColorStack(blockCount.current);
            pendingColorRestore.current = false;
            pendingColorTrim.current = false; // restore overrides any pending trim
          } else if (pendingColorTrim.current) {
            colorStack.current = colorStack.current.slice(1);
            pendingColorTrim.current = false;
          }
          blocks.current = generateBlocks(blockCount.current);
          attemptedThisLap.current = false;
        }
      }

      prevNorm.current = curNorm;
      return dialAngle.current;
    },
    [baseSpeed],
  );

  return {
    dialAngle,
    blocks,
    blockCount,
    speedMultiplier,
    lastHit,
    active,
    hitGlowTimer,
    hitBlockAngles,
    hitColors,
    colorStack,
    start,
    stop,
    attempt,
    tick,
  };
}
