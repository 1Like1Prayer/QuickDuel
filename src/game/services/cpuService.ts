import { BLOCK_COLORS, BLOCK_POINTS, INITIAL_BLOCK_COUNT, MAX_BLOCK_COUNT, MIN_BLOCK_COUNT } from "../constants";
import type { Difficulty } from "../../state/types";

const BASE      = BLOCK_COLORS[0];
const MID       = BLOCK_COLORS[1];
const SHADOW    = BLOCK_COLORS[2];
const HIGHLIGHT = BLOCK_COLORS[3];

interface CpuRollEntry {
  chance: number;
  hitColor: number;
  missColor: number | null;
}

const CPU_TABLES: Record<Difficulty, Record<number, CpuRollEntry>> = {
  beginner: {
    4: { chance: 0.70, hitColor: BASE,      missColor: null },
    3: { chance: 0.60, hitColor: MID,       missColor: null },
    2: { chance: 0.50, hitColor: SHADOW,    missColor: null },
    1: { chance: 0.40, hitColor: HIGHLIGHT, missColor: null },
  },
  intermediate: {
    4: { chance: 0.80, hitColor: MID,       missColor: null },
    3: { chance: 0.70, hitColor: SHADOW,    missColor: null },
    2: { chance: 0.60, hitColor: SHADOW,    missColor: null },
    1: { chance: 0.50, hitColor: HIGHLIGHT, missColor: null },
  },
  advanced: {
    4: { chance: 0.80, hitColor: SHADOW,    missColor: HIGHLIGHT },
    3: { chance: 0.70, hitColor: SHADOW,    missColor: HIGHLIGHT },
    2: { chance: 0.60, hitColor: SHADOW,    missColor: HIGHLIGHT },
    1: { chance: 0.60, hitColor: HIGHLIGHT, missColor: null },
  },
};

export interface CpuTurnResult {
  hit: boolean;
  color: number | null;
  points: number;
}

export interface CpuState {
  blockCount: number;
}

export function createCpuState(): CpuState {
  return {
    blockCount: INITIAL_BLOCK_COUNT,
  };
}

export function cpuTakeTurn(state: CpuState, difficulty: Difficulty): { result: CpuTurnResult; next: CpuState } {
  const clamped = Math.max(1, Math.min(4, state.blockCount));
  const entry = CPU_TABLES[difficulty][clamped];

  const roll = Math.random();
  let result: CpuTurnResult;

  if (roll < entry.chance) {
    result = {
      hit: true,
      color: entry.hitColor,
      points: BLOCK_POINTS[entry.hitColor] ?? 1,
    };
  } else if (entry.missColor !== null) {
    result = {
      hit: true,
      color: entry.missColor,
      points: BLOCK_POINTS[entry.missColor] ?? 1,
    };
  } else {
    result = { hit: false, color: null, points: 0 };
  }

  const nextBlockCount = result.hit
    ? Math.max(MIN_BLOCK_COUNT, state.blockCount - 1)
    : Math.min(MAX_BLOCK_COUNT, state.blockCount + 1);

  return {
    result,
    next: {
      blockCount: nextBlockCount,
    },
  };
}
