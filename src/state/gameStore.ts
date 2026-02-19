import { create } from "zustand";
import { WIN_POINTS } from "../game/constants";
import type { GamePhase } from "./types";

export interface GameState {
  phase: GamePhase;
  playerPoints: number;
  opponentPoints: number;
}

export interface GameActions {
  startGame: () => void;
  scorePlayer: (points: number) => void;
  scoreOpponent: (points: number) => void;
  endGame: () => void;
  playAgain: () => void;
  reset: () => void;
}

const INITIAL_STATE: GameState = {
  phase: "intro",
  playerPoints: 0,
  opponentPoints: 0,
};

export const useGameStore = create<GameState & GameActions>()((set) => ({
  ...INITIAL_STATE,

  startGame: () => set({ phase: "playing" }),

  scorePlayer: (points: number) =>
    set((s) => {
      const next = s.playerPoints + points;
      return {
        playerPoints: next,
        ...(next > WIN_POINTS ? { phase: "ended" as const } : {}),
      };
    }),

  scoreOpponent: (points: number) =>
    set((s) => {
      const next = s.opponentPoints + points;
      return {
        opponentPoints: next,
        ...(next > WIN_POINTS ? { phase: "ended" as const } : {}),
      };
    }),

  endGame: () => set({ phase: "ended" }),

  playAgain: () => set({ phase: "playing", playerPoints: 0, opponentPoints: 0 }),

  reset: () => set(INITIAL_STATE),
}));
