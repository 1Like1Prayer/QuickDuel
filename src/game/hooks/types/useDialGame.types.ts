export interface HitZoneBlock {
  startAngle: number;
  /** End angle = startAngle + BLOCK_ARC. */
  endAngle: number;
  /** Index of this block within the group (0 = leftmost). */
  index: number;
}

export interface UseDialGameParams {
  baseSpeed: number;
}

export interface UseDialGameReturn {
  dialAngle: React.RefObject<number>;
  blocks: React.RefObject<HitZoneBlock[]>;
  blockCount: React.RefObject<number>;
  speedMultiplier: React.RefObject<number>;
  lastHit: React.RefObject<boolean | null>;
  active: React.RefObject<boolean>;
  hitGlowTimer: React.RefObject<number>;
  hitColors: React.RefObject<number[]>;
  lastHitPoints: React.RefObject<number>;
  colorStack: React.RefObject<number[]>;
  hitBlockAngles: React.RefObject<{ startAngle: number; endAngle: number } | null>;
  missPulseTimer: React.RefObject<number>;
  missAngle: React.RefObject<number | null>;
  regenCount: React.RefObject<number>;
  start: () => void;
  stop: () => void;
  attempt: () => boolean | null;
  tick: (dt: number) => number;
}
