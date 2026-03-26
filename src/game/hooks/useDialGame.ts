import { useCallback, useRef } from "react";

import {
  BLOCK_POINTS,
  HIT_GLOW_DURATION,
  MISS_PULSE_DURATION,
  INITIAL_BLOCK_COUNT,
  INITIAL_SPEED,
  MAX_BLOCK_COUNT,
  MAX_SPEED_BONUS,
  MIN_BLOCK_COUNT,
  MIN_SPEED_BONUS,
  REGEN_GATE_RAD,
  SPEED_STEP,
} from "../constants";

import type { HitZoneBlock, UseDialGameParams, UseDialGameReturn } from "./types/useDialGame.types";
import {
  generateBlocks,
  normalizeAngle,
  findHitBlock,
  buildColorStack,
  blockColor,
} from "./utils/useDialGame.utils";

export function useDialGame({
  baseSpeed,
}: UseDialGameParams): UseDialGameReturn {
  /** Current rotation angle of the dial in radians (starts at top = -π/2). */
  const dialAngle = useRef(-Math.PI / 2);
  /** Multiplier applied to baseSpeed (increases on hit, decreases on miss). */
  const speedMultiplier = useRef(INITIAL_SPEED);
  /** How many hit-zone blocks are currently shown on the ring. */
  const blockCount = useRef(INITIAL_BLOCK_COUNT);
  /** The actual hit-zone block objects with angular positions. */
  const blocks = useRef<HitZoneBlock[]>([]);
  /** Result of the player's last attempt: true = hit, false = miss, null = no attempt yet. */
  const lastHit = useRef<boolean | null>(null);
  /** Whether the dial is actively spinning. */
  const active = useRef(false);

  /** Countdown timer for the glow effect on a hit block (counts down from HIT_GLOW_DURATION). */
  const hitGlowTimer = useRef(0);
  /** Angular bounds of the block that was last hit (drives the targeted glow wedge). */
  const hitBlockAngles = useRef<{ startAngle: number; endAngle: number } | null>(null);

  /** Countdown timer for the miss pulse effect (counts down from MISS_PULSE_DURATION). */
  const missPulseTimer = useRef(0);
  /** Dial angle (radians) where the miss occurred (drives the red radial line). */
  const missAngle = useRef<number | null>(null);

  /** Points scored by the player on the latest hit (0 if miss), consumed by the game loop. */
  const lastHitPoints = useRef(0);

  /** Ordered colour palette for the current block set (index 0 = palest/lowest-value). */
  const colorStack = useRef<number[]>(buildColorStack(INITIAL_BLOCK_COUNT));

  /** Whether the player tapped (hit or miss) during this dial lap.
   *  Reset each time the dial crosses the regeneration gate. */
  const attemptedThisLap = useRef(false);

  /** Deferred flag: on the next regen, trim the palest colour from the stack (after a hit that reduced block count). */
  const pendingColorTrim = useRef(false);

  /** Deferred flag: on the next regen, rebuild the colour stack to full (after a miss that increased block count). */
  const pendingColorRestore = useRef(false);

  /** Previous normalised angle — used to detect when the dial crosses the regeneration gate. */
  const previousNormalizedAngle = useRef(normalizeAngle(-Math.PI / 2));

  /** How many times blocks have regenerated (gate crossings). Consumed by the game loop for CPU turn timing. */
  const regenCount = useRef(0);


  // ── Start / Stop ──

  const start = useCallback(() => {
    active.current = true;
    dialAngle.current = -Math.PI / 2;
    previousNormalizedAngle.current = normalizeAngle(-Math.PI / 2);
    speedMultiplier.current = INITIAL_SPEED;
    blockCount.current = INITIAL_BLOCK_COUNT;
    blocks.current = [];
    lastHit.current = null;
    hitGlowTimer.current = 0;
    hitBlockAngles.current = null;
    missPulseTimer.current = 0;
    missAngle.current = null;
    colorStack.current = buildColorStack(INITIAL_BLOCK_COUNT);
    attemptedThisLap.current = false;
    pendingColorTrim.current = false;
    pendingColorRestore.current = false;
    regenCount.current = 0;
  }, []);

  const stop = useCallback(() => {
    active.current = false;
  }, []);

  // ── Handle input ──

  /** Handle a player tap: check for a hit, adjust speed/blocks, trigger effects. */
  const attempt = useCallback((): boolean | null => {
    if (!active.current) return null;
    if (attemptedThisLap.current) return null;

    const hitBlock = findHitBlock(dialAngle.current, blocks.current);
    const hit = hitBlock !== null;
    lastHit.current = hit;
    attemptedThisLap.current = true;

    if (hit) {
      const previousBlockCount = blockCount.current;
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
      const color = blockColor(hitBlock, colorStack.current);
      const points = BLOCK_POINTS[color] ?? 1;
      lastHitPoints.current = points;

      // Defer colour removal until blocks regenerate (only if count actually decreased)
      if (blockCount.current < previousBlockCount) {
        pendingColorTrim.current = true;
      }
    } else {
      lastHitPoints.current = 0;
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

      // Start miss pulse and record miss angle
      missPulseTimer.current = MISS_PULSE_DURATION;
      missAngle.current = dialAngle.current;
    }

    return hit;
  }, []);

  // ── Tick function ──

  const tick = useCallback(
    (dt: number): number => {
      if (!active.current) return dialAngle.current;

      /** Effective rotation speed this tick (base × current multiplier). */
      const effectiveSpeed = baseSpeed * speedMultiplier.current;
      dialAngle.current += effectiveSpeed * dt;

      // Tick down visual effect timers
      if (hitGlowTimer.current > 0) {
        hitGlowTimer.current = Math.max(0, hitGlowTimer.current - dt);
      }
      if (missPulseTimer.current > 0) {
        missPulseTimer.current = Math.max(0, missPulseTimer.current - dt);
      }

      // ── Detect the regeneration gate crossing (at REGEN_GATE_RAD radians) ──
      const currentNormalizedAngle = normalizeAngle(dialAngle.current);
      const previousAngle = previousNormalizedAngle.current;

      /** True when the dial crosses the regeneration gate this tick. */
      const crossedGate =
        previousAngle < REGEN_GATE_RAD && currentNormalizedAngle >= REGEN_GATE_RAD;

      if (crossedGate) {
        // If the player didn't tap this lap, treat it as a miss
        // (skipped on the very first crossing because blocks start empty)
        if (!attemptedThisLap.current && blocks.current.length > 0) {
          lastHit.current = false;

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

        // Clear miss visuals when blocks regenerate
        missAngle.current = null;
        missPulseTimer.current = 0;

        // Apply deferred colour-stack changes, then regenerate blocks at new angular positions
        if (pendingColorRestore.current) {
          // Miss → rebuild full colour stack for the new block count
          colorStack.current = buildColorStack(blockCount.current);
          pendingColorRestore.current = false;
          pendingColorTrim.current = false; // restore overrides any pending trim
        } else if (pendingColorTrim.current) {
          // Hit → remove the palest (lowest-value) colour
          colorStack.current = colorStack.current.slice(1);
          pendingColorTrim.current = false;
        }
        blocks.current = generateBlocks(blockCount.current);
        attemptedThisLap.current = false;
        regenCount.current++;
      }

      previousNormalizedAngle.current = currentNormalizedAngle;
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
    missPulseTimer,
    missAngle,
    lastHitPoints,
    colorStack,
    regenCount,
    start,
    stop,
    attempt,
    tick,
  };
}
