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
  const dialAngle = useRef(-Math.PI / 2); // start at top
  const speedMultiplier = useRef(INITIAL_SPEED);
  const blockCount = useRef(INITIAL_BLOCK_COUNT);
  const blocks = useRef<HitZoneBlock[]>([]);
  const lastHit = useRef<boolean | null>(null);
  const active = useRef(false);

  // Glow timer (counts down from HIT_GLOW_DURATION on hit)
  const hitGlowTimer = useRef(0);

  // Angles of the last hit block (for targeted glow)
  const hitBlockAngles = useRef<{ startAngle: number; endAngle: number } | null>(null);

  // Miss pulse timer (counts down from MISS_PULSE_DURATION on miss)
  const missPulseTimer = useRef(0);

  // Dial angle where the miss occurred (radial red line)
  const missAngle = useRef<number | null>(null);

  // Points scored by the player on the latest hit (0 if miss), consumed by game loop
  const lastHitPoints = useRef(0);

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

  // Increments each time blocks regenerate (gate crossing)
  const regenCount = useRef(0);


  // ── Start / Stop ──

  const start = useCallback(() => {
    active.current = true;
    dialAngle.current = -Math.PI / 2;
    prevNorm.current = normalizeAngle(-Math.PI / 2);
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

  const attempt = useCallback((): boolean | null => {
    if (!active.current) return null;
    if (attemptedThisLap.current) return null;

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
      const color = blockColor(hitBlock, colorStack.current);
      const points = BLOCK_POINTS[color] ?? 1;
      lastHitPoints.current = points;

      // Defer color removal until blocks regenerate (only if count actually decreased)
      if (blockCount.current < prevCount) {
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

      const speed = baseSpeed * speedMultiplier.current;
      dialAngle.current += speed * dt;

      // Decrement glow timer
      if (hitGlowTimer.current > 0) {
        hitGlowTimer.current = Math.max(0, hitGlowTimer.current - dt);
      }

      // Decrement miss pulse timer
      if (missPulseTimer.current > 0) {
        missPulseTimer.current = Math.max(0, missPulseTimer.current - dt);
      }

      // Detect the 30° gate crossing
      const curNorm = normalizeAngle(dialAngle.current);
      const prev = prevNorm.current;

      // Crossing = previous angle was below the gate AND current is at/above it
      const crossed =
        prev < REGEN_GATE_RAD && curNorm >= REGEN_GATE_RAD;

      if (crossed) {
        // If the player didn't make an attempt this lap, it's a miss
        // (skipped on the first crossing because blocks start empty)
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

        // Clear miss visuals on block regeneration
        missAngle.current = null;
        missPulseTimer.current = 0;

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
        regenCount.current++;
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
