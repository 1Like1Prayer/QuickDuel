import { create } from "zustand";
import { WIN_POINTS } from "../game/constants";
import type { Difficulty, GamePhase } from "./types";

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  /** Single score: positive = player ahead, negative = opponent ahead.
   *  Range: -WIN_POINTS to +WIN_POINTS (default ±10). */
  score: number;
}

export interface GameActions {
  startGame: (difficulty: Difficulty) => void;
  resolveRound: (playerHit: number, cpuHit: number) => void;
  endGame: () => void;
  playAgain: () => void;
  reset: () => void;
}

const INITIAL_STATE: GameState = {
  phase: "intro",
  difficulty: "beginner",
  score: 0,
};

export const useGameStore = create<GameState & GameActions>()((set) => ({
  ...INITIAL_STATE,

  startGame: (difficulty: Difficulty) => set({ phase: "playing", difficulty }),

  resolveRound: (playerHit: number, cpuHit: number) =>
    set((s) => {
      const delta = playerHit - cpuHit;
      // Clamp score to [-WIN_POINTS, WIN_POINTS]
      const nextScore = Math.max(-WIN_POINTS, Math.min(WIN_POINTS, s.score + delta));
      const ended = nextScore >= WIN_POINTS || nextScore <= -WIN_POINTS;
      return {
        score: nextScore,
        ...(ended ? { phase: "ended" as const } : {}),
      };
    }),

  endGame: () => set({ phase: "ended" }),

  playAgain: () => set((s) => ({ phase: "playing", score: 0, difficulty: s.difficulty })),

  reset: () => set(INITIAL_STATE),
}));
