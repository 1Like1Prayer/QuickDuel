export interface LayoutBase {
  unit: number;
  width: number;
  height: number;
}

export interface LayoutRing {
  outerRadius: number;
  ringWidth: number;
  ringGap: number;
  innerRingOuter: number;
  innerRingInner: number;
  gapOuter: number;
  gapInner: number;
}

export interface LayoutDial {
  dialLength: number;
  dialLineWidth: number;
}

export interface LayoutCharacters {
  charScale: number;
  charSize: number;
  frameSize: number;
}

export interface LayoutPositions {
  groundY: number;
  meetX: number;
  meetY: number;
  charStartX: number;
  charEndX: number;
}

export interface LayoutMovement {
  runSpeed: number;
  recoverSpeed: number;
  meetGap: number;
  knockbackDistance: number;
  knockbackSpeed: number;
  shakeIntensity: number;
}

export interface LayoutParticles {
  bloodParticleSize: number;
  bloodParticleSpeed: number;
  bloodParticleGravity: number;
  sparkParticleSize: number;
  sparkParticleSpeed: number;
  sparkParticleGravity: number;
}

export interface LayoutFightText {
  fightFontSize: number;
  fightStrokeWidth: number;
}

export interface Layout {
  base: LayoutBase;
  ring: LayoutRing;
  dial: LayoutDial;
  characters: LayoutCharacters;
  positions: LayoutPositions;
  movement: LayoutMovement;
  particles: LayoutParticles;
  fightText: LayoutFightText;
}
