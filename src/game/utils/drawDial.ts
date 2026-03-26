import type { Graphics } from "pixi.js";

import type { LayoutDial } from "../hooks/types/useLayout.types";

/** Draw the rotating dial line (clock-hand style) from the center outward at the given angle. */
export function drawDial(
  gfx: Graphics,
  /** Current rotation angle of the dial in radians. */
  angle: number,
  dial: LayoutDial,
): void {
  gfx.clear();
  gfx.moveTo(0, 0);
  gfx.lineTo(
    Math.cos(angle) * dial.dialLength,
    Math.sin(angle) * dial.dialLength,
  );
  gfx.stroke({ color: 0xcc3311, width: dial.dialLineWidth, alpha: 0.9 });
}
