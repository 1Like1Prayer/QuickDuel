import { useMemo } from "react";

import type { Layout } from "./types/useLayout.types";

const FRAME_SIZE = 128;

export function useLayout(screenWidth: number, screenHeight: number): Layout {
  return useMemo(() => {
    const unit = Math.min(screenWidth, screenHeight);

    // Rings — larger base size, higher floor on phones
    const outerRadius = Math.max(unit * 0.18, 135);
    const ringWidth = outerRadius * 0.175;
    const ringGap = outerRadius * 0.1;
    const innerRingOuter = outerRadius - ringWidth - ringGap;
    const innerRingInner = innerRingOuter - ringWidth;
    const gapOuter = outerRadius - ringWidth;
    const gapInner = innerRingOuter;

    // Characters — bigger sprites, higher floor on phones
    const charScale = Math.max(unit / 300, 1.65);
    const charSize = FRAME_SIZE * charScale;

    const groundY = screenHeight - charSize - screenHeight * 0.03;

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
        // On smaller screens push the circle lower (towards the middle)
        meetY: screenHeight * (unit < 500 ? 0.42 : 0.35),
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
