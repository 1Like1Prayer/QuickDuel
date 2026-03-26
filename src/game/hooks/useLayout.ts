import { useMemo } from "react";

import { FRAME_SIZE } from "../constants";
import type { Layout } from "./types/useLayout.types";

/** Compute a responsive layout based on the current screen dimensions.
 *  All sizes are derived from `screenWidth`/`screenHeight` so the game
 *  adapts to any aspect ratio (portrait phones, landscape tablets, desktop). */
export function useLayout(screenWidth: number, screenHeight: number): Layout {
  return useMemo(() => {
    /** The shorter screen dimension — used as the base scaling unit. */
    const unit = Math.min(screenWidth, screenHeight);
    const isLandscape = screenWidth > screenHeight;

    // ── Ring sizing ──
    // In landscape the height is the bottleneck, so scale the ring to fit vertically.
    // In portrait use a larger fraction so dials/circles are big enough on phones.
    const outerRadius = isLandscape
      ? screenHeight * 0.25
      : unit * 0.4;

    /** Thickness of each brick ring band. */
    const ringWidth = outerRadius * 0.175;
    /** Transparent gap between the outer and inner brick rings (where blocks sit). */
    const ringGap = outerRadius * 0.1;
    /** Outer edge of the inner brick ring. */
    const innerRingOuter = outerRadius - ringWidth - ringGap;
    /** Inner edge of the inner brick ring. */
    const innerRingInner = innerRingOuter - ringWidth;
    /** Outer boundary of the gap between rings (= inner edge of the outer ring). */
    const gapOuter = outerRadius - ringWidth;
    /** Inner boundary of the gap between rings (= outer edge of the inner ring). */
    const gapInner = innerRingOuter;

    // ── Character sizing ──
    // Characters scale with the shorter dimension so they remain proportional.
    const charScale = isLandscape
      ? screenHeight / 300
      : unit / 300;
    /** Pixel size of a character sprite after scaling. */
    const charSize = FRAME_SIZE * charScale;

    /** Y-position of characters' feet (slightly above the bottom edge). */
    const groundY = screenHeight - charSize - screenHeight * 0.03;

    // ── Ring vertical position ──
    // In landscape push the ring towards centre-Y; in portrait place it slightly above centre.
    const meetY = isLandscape
      ? screenHeight * 0.45
      : screenHeight * (unit < 500 ? 0.42 : 0.35);

    return {
      base: {
        unit,
        width: screenWidth,
        height: screenHeight,
      },
      ring: {
        outerRadius,
        ringWidth,
        ringGap,
        innerRingOuter,
        innerRingInner,
        gapOuter,
        gapInner,
      },
      dial: {
        dialLength: outerRadius,
        dialLineWidth: Math.max(2, outerRadius * 0.04),
      },
      characters: {
        charScale,
        charSize,
        frameSize: FRAME_SIZE,
      },
      positions: {
        groundY,
        meetX: screenWidth / 2.0,
        meetY,
        charStartX: unit < 500 ? -charSize * 0.15 : 0,
        charEndX: unit < 500 ? screenWidth - charSize * 0.75 : screenWidth - charSize,
      },
      movement: {
        shakeIntensity: unit * 0.007,
      },
      fightText: {
        fightFontSize: unit * 0.1,
        fightStrokeWidth: Math.max(3, unit * 0.008),
      },
    };
  }, [screenWidth, screenHeight]);
}
