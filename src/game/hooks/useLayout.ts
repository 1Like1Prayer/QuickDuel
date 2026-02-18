import { useMemo } from "react";

// ──────────────────────────────────────────────
//  Layout — all visual sizes derived from screen
// ──────────────────────────────────────────────

export interface Layout {
  // --- Base reference ---
  unit: number;
  width: number;
  height: number;

  // --- Ring geometry ---
  outerRadius: number;
  ringWidth: number;
  ringGap: number;
  innerRingOuter: number;
  innerRingInner: number;
  gapOuter: number;
  gapInner: number;

  // --- Dial ---
  dialLength: number;
  dialLineWidth: number;

  // --- Characters ---
  charScale: number;
  /** Display size of a character sprite (FRAME_SIZE * charScale). */
  charSize: number;
  /** Sprite sheet frame size (fixed at 128). */
  frameSize: number;

  // --- Positions ---
  groundY: number;
  meetX: number;
  meetY: number;
  charStartX: number;
  charEndX: number;

  // --- Movement (scaled) ---
  runSpeed: number;
  recoverSpeed: number;
  meetGap: number;
  knockbackDistance: number;
  knockbackSpeed: number;
  shakeIntensity: number;

  // --- Katana ---
  katanaSize: number;
  katanaSpacing: number;

  // --- Particles ---
  bloodParticleSize: number;
  bloodParticleSpeed: number;
  bloodParticleGravity: number;
  sparkParticleSize: number;
  sparkParticleSpeed: number;
  sparkParticleGravity: number;

  // --- Fight text ---
  fightFontSize: number;
  fightStrokeWidth: number;
}

/** Fixed sprite sheet frame size. */
const FRAME_SIZE = 128;

export function useLayout(
  screenWidth: number,
  screenHeight: number,
): Layout {
  return useMemo(() => {
    const unit = Math.min(screenWidth, screenHeight);

    // --- Ring geometry ---
    const outerRadius = unit * 0.12;
    const ringWidth = outerRadius * 0.175;
    const ringGap = outerRadius * 0.1;
    const innerRingOuter = outerRadius - ringWidth - ringGap;
    const innerRingInner = innerRingOuter - ringWidth;
    const gapOuter = outerRadius - ringWidth;
    const gapInner = innerRingOuter;

    // --- Dial ---
    const dialLength = outerRadius;
    const dialLineWidth = Math.max(2, outerRadius * 0.04);

    // --- Characters ---
    const charScale = unit / 400;
    const charSize = FRAME_SIZE * charScale;

    // --- Positions ---
    const groundY = screenHeight - charSize - screenHeight * 0.03;
    const meetX = screenWidth / 2;
    const meetY = screenHeight * 0.35;
    const charStartX = screenWidth * 0.05;
    const charEndX = screenWidth * 0.95 - charSize;

    // --- Movement (scaled to screen) ---
    const runSpeed = unit * 0.5;
    const recoverSpeed = unit * 0.6;
    const meetGap = -charSize * 0.3;
    const knockbackDistance = unit * 0.04;
    const knockbackSpeed = unit * 0.8;
    const shakeIntensity = unit * 0.007;

    // --- Katana ---
    const katanaSize = unit * 0.06;
    const katanaSpacing = katanaSize * 0.15;

    // --- Particles ---
    const bloodParticleSize = Math.max(3, unit * 0.008);
    const bloodParticleSpeed = unit * 0.7;
    const bloodParticleGravity = unit * 1.0;
    const sparkParticleSize = Math.max(3, unit * 0.008);
    const sparkParticleSpeed = unit * 0.85;
    const sparkParticleGravity = unit * 0.55;

    // --- Fight text ---
    const fightFontSize = unit * 0.1;
    const fightStrokeWidth = Math.max(3, unit * 0.008);

    return {
      unit,
      width: screenWidth,
      height: screenHeight,
      outerRadius,
      ringWidth,
      ringGap,
      innerRingOuter,
      innerRingInner,
      gapOuter,
      gapInner,
      dialLength,
      dialLineWidth,
      charScale,
      charSize,
      frameSize: FRAME_SIZE,
      groundY,
      meetX,
      meetY,
      charStartX,
      charEndX,
      runSpeed,
      recoverSpeed,
      meetGap,
      knockbackDistance,
      knockbackSpeed,
      shakeIntensity,
      katanaSize,
      katanaSpacing,
      bloodParticleSize,
      bloodParticleSpeed,
      bloodParticleGravity,
      sparkParticleSize,
      sparkParticleSpeed,
      sparkParticleGravity,
      fightFontSize,
      fightStrokeWidth,
    };
  }, [screenWidth, screenHeight]);
}
