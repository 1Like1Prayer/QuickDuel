import { useRef } from "react";

import { useGameStore } from "../../state";
import { cpuTakeTurn, createCpuState, type CpuState } from "../services/cpuService";

export interface CpuOpponent {
  state: React.RefObject<CpuState>;
  previousRegenGateCount: React.RefObject<number>;
  turnTakenThisLap: React.RefObject<boolean>;
  executeTurn: () => number;
  reset: () => void;
}

/** Manages CPU opponent state and turn execution. */
export function useCpuOpponent(): CpuOpponent {
  const state = useRef(createCpuState());
  const previousRegenGateCount = useRef(0);
  const turnTakenThisLap = useRef(false);

  const executeTurn = (): number => {
    if (useGameStore.getState().phase === "ended") return 0;
    turnTakenThisLap.current = true;
    const difficulty = useGameStore.getState().difficulty;
    const { result, next } = cpuTakeTurn(state.current, difficulty);
    state.current = next;
    return result.hit ? result.points : 0;
  };

  const reset = () => {
    state.current = createCpuState();
    previousRegenGateCount.current = 0;
    turnTakenThisLap.current = false;
  };

  return { state, previousRegenGateCount, turnTakenThisLap, executeTurn, reset };
}
