import { useMemo } from "react";

import type { Layout } from "./types/useLayout.types";

const FRAME_SIZE = 128;

export function useLayout(screenWidth: number, screenHeight: number): Layout {
  return useMemo(() => {
    const unit = Math.min(screenWidth, screenHeight);

    // Rings — larger base size, higher floor on phones
    const outerRadius = Math.max(unit * 0.18, 65);
    const ringWidth = outerRadius * 0.175;
    const ringGap = outerRadius * 0.1;
    const innerRingOuter = outerRadius - ringWidth - ringGap;
    const innerRingInner = innerRingOuter - ringWidth;
    const gapOuter = outerRadius - ringWidth;
    const gapInner = innerRingOuter;

    // Characters — bigger sprites, higher floor on phones
    const charScale = Math.max(unit / 300, 0.65);
    const charSize = FRAME_SIZE * charScale;

    const groundY = screenHeight - charSize - screenHeight * 0.03;

    // Katana icons — bigger & wider for vivid colour display
    const katanaSize = Math.max(unit * 0.09, 34);

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
        // On smaller screens push the circle lower (towards the middle)
        meetY: screenHeight * (unit < 500 ? 0.42 : 0.35),
        charStartX: 0 - charSize / 3,
        charEndX: screenWidth - charSize / 1.5,
      },
      movement: {
        runSpeed: unit * 0.5,
        recoverSpeed: unit * 0.6,
        meetGap: -charSize * 0.45,
        knockbackDistance: unit * 0.04,
        knockbackSpeed: unit * 0.8,
        shakeIntensity: unit * 0.007,
      },
      katana: {
        katanaSize,
        katanaSpacing: katanaSize * 0.08,
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
