import type { Graphics } from "pixi.js";

import { BLOCK_ALPHA, BLOCK_ARC_SEGMENTS } from "../constants";
import type { HitZoneBlock } from "../hooks/types/useDialGame.types";
import type { LayoutRing } from "../hooks/types/useLayout.types";
import { blockColor } from "../hooks/utils/useDialGame.utils";

/** Redraw all hit-zone blocks as annular (ring-shaped) wedges between the two concentric rings. */
export function drawBlocks(
  gfx: Graphics,
  blocks: HitZoneBlock[],
  colorStack: number[],
  ring: LayoutRing,
): void {
  gfx.clear();

  /** Number of straight line segments used to approximate each curved arc. */
  const arcSegmentCount = BLOCK_ARC_SEGMENTS;

  for (const block of blocks) {
    /** Total angular span of this block in radians. */
    const blockArcSpan = block.endAngle - block.startAngle;
    /** Angle increment per line segment for arc approximation. */
    const segmentArcStep = blockArcSpan / arcSegmentCount;
    const color = blockColor(block, colorStack);

    // ── Build annular wedge path ──
    // Trace the outer arc from startAngle → endAngle …
    gfx.moveTo(
      Math.cos(block.startAngle) * ring.gapOuter,
      Math.sin(block.startAngle) * ring.gapOuter,
    );
    for (let i = 1; i <= arcSegmentCount; i++) {
      const segmentAngle = block.startAngle + segmentArcStep * i;
      gfx.lineTo(
        Math.cos(segmentAngle) * ring.gapOuter,
        Math.sin(segmentAngle) * ring.gapOuter,
      );
    }
    // … then trace the inner arc back from endAngle → startAngle to close the wedge.
    for (let i = arcSegmentCount; i >= 0; i--) {
      const segmentAngle = block.startAngle + segmentArcStep * i;
      gfx.lineTo(
        Math.cos(segmentAngle) * ring.gapInner,
        Math.sin(segmentAngle) * ring.gapInner,
      );
    }
    gfx.closePath();
    gfx.fill({ color, alpha: BLOCK_ALPHA });
  }
}
