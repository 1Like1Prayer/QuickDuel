import { create } from "zustand";
import { WIN_POINTS } from "../game/constants";
import type { Difficulty, GamePhase } from "./types";

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  playerPoints: number;
  opponentPoints: number;
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
  playerPoints: 0,
  opponentPoints: 0,
};

export const useGameStore = create<GameState & GameActions>()((set) => ({
  ...INITIAL_STATE,

  startGame: (difficulty: Difficulty) => set({ phase: "playing", difficulty }),

  resolveRound: (playerHit: number, cpuHit: number) =>
    set((s) => {
      const delta = playerHit - cpuHit;
      // Positive delta → player gains; negative delta → opponent gains
      const nextPlayer = delta > 0 ? s.playerPoints + delta : s.playerPoints;
      const nextOpponent = delta < 0 ? s.opponentPoints + Math.abs(delta) : s.opponentPoints;
      const ended = nextPlayer > WIN_POINTS || nextOpponent > WIN_POINTS;
      return {
        playerPoints: nextPlayer,
        opponentPoints: nextOpponent,
        ...(ended ? { phase: "ended" as const } : {}),
      };
    }),

  endGame: () => set({ phase: "ended" }),

  playAgain: () => set((s) => ({ phase: "playing", playerPoints: 0, opponentPoints: 0, difficulty: s.difficulty })),

  reset: () => set(INITIAL_STATE),
}));
