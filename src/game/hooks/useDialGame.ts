import { useCallback, useRef } from "react";

// ──────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────

/** Each block covers 5% of the full circle = 18°. */
const BLOCK_ARC = (5 / 100) * Math.PI * 2; // ~0.314 rad

/** Blocks can spawn between 65° and 305° (in standard math degrees, CCW from +x). */
const SPAWN_MIN_DEG = 65;
const SPAWN_MAX_DEG = 305;
const SPAWN_MIN_RAD = (SPAWN_MIN_DEG * Math.PI) / 180;
const SPAWN_MAX_RAD = (SPAWN_MAX_DEG * Math.PI) / 180;

/** Initial number of hit-zone blocks. */
const INITIAL_BLOCK_COUNT = 4;
const MIN_BLOCK_COUNT = 1;
const MAX_BLOCK_COUNT = 4;

/** Initial speed multiplier. */
export const INITIAL_SPEED = 1.5;

/** Speed scaling. */
const SPEED_STEP = 0.2; // 20% per hit/miss
const MAX_SPEED_BONUS = 0.6; // +60% max
const MIN_SPEED_BONUS = 0; // back to base

/** Miss if dial completes 2 full rotations without input. */
const MISS_ROTATION_THRESHOLD = 2;

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

/** Check if the dial angle overlaps any block. */
function isDialInHitZone(
  dialAngle: number,
  blocks: HitZoneBlock[],
): boolean {
  const norm = normalizeAngle(dialAngle);
  for (const b of blocks) {
    const start = normalizeAngle(b.startAngle);
    const end = normalizeAngle(b.endAngle);
    if (start < end) {
      if (norm >= start && norm <= end) return true;
    } else {
      // Wraps around 0
      if (norm >= start || norm <= end) return true;
    }
  }
  return false;
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
  /** Ref to last hit result (null = no attempt yet, consumed after read). */
  lastHit: React.RefObject<boolean | null>;
  /** Whether the dial game is active. */
  active: React.RefObject<boolean>;
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
  const rotationsSinceInput = useRef(0);
  const lastHit = useRef<boolean | null>(null);
  const prevAngle = useRef(-Math.PI / 2);
  const active = useRef(false);

  // ── Start / Stop ──

  const start = useCallback(() => {
    active.current = true;
    dialAngle.current = -Math.PI / 2;
    prevAngle.current = -Math.PI / 2;
    speedMultiplier.current = INITIAL_SPEED;
    blockCount.current = INITIAL_BLOCK_COUNT;
    blocks.current = generateBlocks(INITIAL_BLOCK_COUNT);
    rotationsSinceInput.current = 0;
    lastHit.current = null;
  }, []);

  const stop = useCallback(() => {
    active.current = false;
  }, []);

  // ── Handle input ──

  const attempt = useCallback((): boolean => {
    if (!active.current) return false;

    const hit = isDialInHitZone(dialAngle.current, blocks.current);
    lastHit.current = hit;
    rotationsSinceInput.current = 0;

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

    // Regenerate blocks
    blocks.current = generateBlocks(blockCount.current);
    return hit;
  }, []);

  // ── Tick function ──

  const tick = useCallback(
    (dt: number): number => {
      if (!active.current) return dialAngle.current;

      const speed = baseSpeed * speedMultiplier.current;
      dialAngle.current += speed * dt;

      // Track rotations since last input
      const angleDelta = Math.abs(dialAngle.current - prevAngle.current);
      prevAngle.current = dialAngle.current;
      rotationsSinceInput.current += angleDelta / (Math.PI * 2);

      // If 2 full rotations without input → count as miss
      if (rotationsSinceInput.current >= MISS_ROTATION_THRESHOLD) {
        rotationsSinceInput.current = 0;
        lastHit.current = false;

        // Miss penalty: increase blocks, decrease speed
        blockCount.current = Math.min(
          MAX_BLOCK_COUNT,
          blockCount.current + 1,
        );
        speedMultiplier.current = Math.max(
          INITIAL_SPEED + MIN_SPEED_BONUS,
          speedMultiplier.current - SPEED_STEP,
        );
        blocks.current = generateBlocks(blockCount.current);
      }

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
    start,
    stop,
    attempt,
    tick,
  };
}
