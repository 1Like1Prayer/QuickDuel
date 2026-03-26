import type { Graphics } from "pixi.js";

import { HIT_GLOW_COLOR, HIT_GLOW_DURATION, HIT_GLOW_MAX_ALPHA } from "../constants";
import type { LayoutRing } from "../hooks/types/useLayout.types";

/** Draw a pulsing glow annular wedge over the block that was just hit.
 *  The glow fades out and slightly expands over `HIT_GLOW_DURATION`. */
export function drawHitGlow(
  gfx: Graphics,
  /** Remaining time on the glow effect (counts down to 0). */
  glowTimer: number,
  /** Angular bounds of the hit block, or null when no glow is active. */
  hitAngles: { startAngle: number; endAngle: number } | null,
  ring: LayoutRing,
): void {
  gfx.clear();

  if (glowTimer > 0 && hitAngles) {
    /** 1 → 0 progress ratio: starts bright/large and fades/shrinks toward zero. */
    const fadeProgress = glowTimer / HIT_GLOW_DURATION;
    const glowAlpha = fadeProgress * HIT_GLOW_MAX_ALPHA;
    /** Slight expansion that shrinks back as the glow fades. */
    const pulseScale = 1 + 0.1 * fadeProgress;
    gfx.scale.set(pulseScale);

    // ── Draw an annular wedge covering only the hit block ──
    const arcSegmentCount = 16;
    const hitBlockArcSpan = hitAngles.endAngle - hitAngles.startAngle;
    const segmentArcStep = hitBlockArcSpan / arcSegmentCount;

    // Trace outer arc forward …
    gfx.moveTo(
      Math.cos(hitAngles.startAngle) * ring.gapOuter,
      Math.sin(hitAngles.startAngle) * ring.gapOuter,
    );
    for (let i = 1; i <= arcSegmentCount; i++) {
      const segmentAngle = hitAngles.startAngle + segmentArcStep * i;
      gfx.lineTo(
        Math.cos(segmentAngle) * ring.gapOuter,
        Math.sin(segmentAngle) * ring.gapOuter,
      );
    }
    // … then trace inner arc backward to close the wedge.
    for (let i = arcSegmentCount; i >= 0; i--) {
      const segmentAngle = hitAngles.startAngle + segmentArcStep * i;
      gfx.lineTo(
        Math.cos(segmentAngle) * ring.gapInner,
        Math.sin(segmentAngle) * ring.gapInner,
      );
    }
    gfx.closePath();
    gfx.fill({ color: HIT_GLOW_COLOR, alpha: glowAlpha });
  } else {
    gfx.scale.set(1);
  }
}
