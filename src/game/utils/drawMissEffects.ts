import type { Graphics } from "pixi.js";

import {
  MISS_LINE_WIDTH_FACTOR,
  MISS_PULSE_COLOR,
  MISS_PULSE_DURATION,
  MISS_PULSE_MAX_ALPHA,
} from "../constants";
import type { LayoutRing } from "../hooks/types/useLayout.types";

/** Draw expanding red hollow ring outlines on a miss.
 *  The rings expand outward and fade to transparent over `MISS_PULSE_DURATION`. */
export function drawMissPulse(
  gfx: Graphics,
  /** Remaining time on the miss pulse (counts down to 0). */
  missTimer: number,
  ring: LayoutRing,
): void {
  gfx.clear();

  if (missTimer > 0) {
    /** 1 → 0 fade-out ratio. */
    const fadeProgress = missTimer / MISS_PULSE_DURATION;
    const pulseAlpha = fadeProgress * MISS_PULSE_MAX_ALPHA;
    /** Rings expand outward as time progresses (1 - fadeProgress goes 0→1). */
    const pulseScale = 1 + 0.08 * (1 - fadeProgress);
    gfx.scale.set(pulseScale);

    const strokeWidth = Math.max(1.5, ring.outerRadius * 0.03);

    // Outer ring — red hollow circle
    gfx.circle(0, 0, ring.outerRadius);
    gfx.stroke({ color: MISS_PULSE_COLOR, width: strokeWidth, alpha: pulseAlpha });

    // Inner ring — red hollow circle
    gfx.circle(0, 0, ring.innerRingOuter);
    gfx.stroke({ color: MISS_PULSE_COLOR, width: strokeWidth, alpha: pulseAlpha });
  } else {
    gfx.scale.set(1);
  }
}

/** Draw a red radial line from the inner ring edge to the outer ring edge at the angle where the player missed. */
export function drawMissLine(
  gfx: Graphics,
  /** Angle (in radians) where the miss occurred, or null when inactive. */
  missAngle: number | null,
  ring: LayoutRing,
): void {
  gfx.clear();

  if (missAngle !== null) {
    const lineWidth = Math.max(2, ring.outerRadius * MISS_LINE_WIDTH_FACTOR);
    gfx.moveTo(
      Math.cos(missAngle) * ring.innerRingInner,
      Math.sin(missAngle) * ring.innerRingInner,
    );
    gfx.lineTo(
      Math.cos(missAngle) * ring.outerRadius,
      Math.sin(missAngle) * ring.outerRadius,
    );
    gfx.stroke({ color: MISS_PULSE_COLOR, width: lineWidth, alpha: 0.85 });
  }
}
