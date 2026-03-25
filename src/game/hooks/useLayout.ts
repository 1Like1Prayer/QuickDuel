import { useMemo } from "react";

import { FRAME_SIZE } from "../constants";
import type { Layout } from "./types/useLayout.types";

export function useLayout(screenWidth: number, screenHeight: number): Layout {
  return useMemo(() => {
    const unit = Math.min(screenWidth, screenHeight);
    const isLandscape = screenWidth > screenHeight;

    // In landscape the height is the bottleneck — scale the ring to fit
    // In portrait use a larger fraction so dials/circles are big enough on phones
    const outerRadius = isLandscape
      ? screenHeight * 0.25
      : unit * 0.4;

    const ringWidth = outerRadius * 0.175;
    const ringGap = outerRadius * 0.1;
    const innerRingOuter = outerRadius - ringWidth - ringGap;
    const innerRingInner = innerRingOuter - ringWidth;
    const gapOuter = outerRadius - ringWidth;
    const gapInner = innerRingOuter;

    // Characters scale with the shorter dimension
    const charScale = isLandscape
      ? screenHeight / 300
      : unit / 300;
    const charSize = FRAME_SIZE * charScale;

    const groundY = screenHeight - charSize - screenHeight * 0.03;

    // In landscape, push the ring towards center-Y; in portrait, slightly above center
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
