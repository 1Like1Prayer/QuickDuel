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
    blocks.push({ startAngle: s, endAngle: s + BLOCK_ARC });
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

/** Compute the gradient colour for a block based on its position in the spawn range. */
export function blockColor(block: HitZoneBlock): number {
  const mid = (block.startAngle + block.endAngle) / 2;
  const t = Math.max(
    0,
    Math.min(1, (mid - SPAWN_MIN_RAD) / (SPAWN_MAX_RAD - SPAWN_MIN_RAD)),
  );
  return lerpColor(BLOCK_COLOR_LEFT, BLOCK_COLOR_RIGHT, t);
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

  // Rolling hit streak colours
  const hitColors = useRef<number[]>([]);

  // Whether a hit or miss has occurred and blocks should be regenerated at the next 40° crossing.
  const pendingRegen = useRef(false);

  // Track the previous normalised angle to detect the 40° gate crossing.
  const prevNorm = useRef(normalizeAngle(-Math.PI / 2));

  // Whether the very first gate crossing after start() should be skipped
  // (the dial starts at top = 270°, which is past 40°, so the first
  //  forward crossing of 40° is still the "initial spin").
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
    hitColors.current = [];
    pendingRegen.current = false;
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

    if (hit) {
      // Decrease blocks (min 1)
      blockCount.current = Math.max(
        MIN_BLOCK_COUNT,
        blockCount.current - 1,
      );
      // Speed up
      speedMultiplier.current = Math.min(
        INITIAL_SPEED + MAX_SPEED_BONUS,
        speedMultiplier.current + SPEED_STEP,
      );
      // Glow
      hitGlowTimer.current = HIT_GLOW_DURATION;
      // Record colour for katana streak
      const color = blockColor(hitBlock);
      hitColors.current = [
        ...hitColors.current.slice(-(MAX_KATANA_COUNT - 1)),
        color,
      ];
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
    }

    // Defer block regeneration until the dial crosses 40°
    pendingRegen.current = true;
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

      // Detect the 40° gate crossing
      const curNorm = normalizeAngle(dialAngle.current);
      const prev = prevNorm.current;

      // Crossing = previous angle was below the gate AND current is at/above it
      const crossed =
        prev < REGEN_GATE_RAD && curNorm >= REGEN_GATE_RAD;

      if (crossed) {
        if (!firstLapDone.current) {
          // Skip the very first crossing — it's the initial spin
          firstLapDone.current = true;
        } else if (pendingRegen.current) {
          // Regenerate blocks at new positions
          blocks.current = generateBlocks(blockCount.current);
          pendingRegen.current = false;
        } else if (blocks.current.length > 0) {
          // Full lap without any hit/miss → auto-miss
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

          // Defer regen to the next 40° crossing
          pendingRegen.current = true;
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
    hitColors,
    start,
    stop,
    attempt,
    tick,
  };
}
