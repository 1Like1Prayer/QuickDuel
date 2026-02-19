import { useMemo } from "react";

import type { Layout } from "./types/useLayout.types";

const FRAME_SIZE = 128;

export function useLayout(
  screenWidth: number,
  screenHeight: number,
): Layout {
  return useMemo(() => {
    const unit = Math.min(screenWidth, screenHeight);

    const outerRadius = unit * 0.12;
    const ringWidth = outerRadius * 0.175;
    const ringGap = outerRadius * 0.1;
    const innerRingOuter = outerRadius - ringWidth - ringGap;
    const innerRingInner = innerRingOuter - ringWidth;
    const gapOuter = outerRadius - ringWidth;
    const gapInner = innerRingOuter;

    const charScale = unit / 400;
    const charSize = FRAME_SIZE * charScale;

    const groundY = screenHeight - charSize - screenHeight * 0.03;
    const katanaSize = unit * 0.06;

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
        meetX: screenWidth / 2,
        meetY: screenHeight * 0.35,
        charStartX: screenWidth * 0.05,
        charEndX: screenWidth * 0.95 - charSize,
      },
      movement: {
        runSpeed: unit * 0.5,
        recoverSpeed: unit * 0.6,
        meetGap: -charSize * 0.3,
        knockbackDistance: unit * 0.04,
        knockbackSpeed: unit * 0.8,
        shakeIntensity: unit * 0.007,
      },
      katana: {
        katanaSize,
        katanaSpacing: katanaSize * 0.15,
      },
      particles: {
        bloodParticleSize: Math.max(3, unit * 0.008),
        bloodParticleSpeed: unit * 0.7,
        bloodParticleGravity: unit * 1.0,
        sparkParticleSize: Math.max(3, unit * 0.008),
        sparkParticleSpeed: unit * 0.85,
        sparkParticleGravity: unit * 0.55,
      },
      fightText: {
        fightFontSize: unit * 0.1,
        fightStrokeWidth: Math.max(3, unit * 0.008),
      },
    };
  }, [screenWidth, screenHeight]);
}
