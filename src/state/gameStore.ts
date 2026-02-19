import { create } from "zustand";
import type { GamePhase } from "./types";

export interface GameState {
  phase: GamePhase;
  playerPoints: number;
  opponentPoints: number;
}

export interface GameActions {
  startGame: () => void;
  scorePlayer: () => void;
  scoreOpponent: () => void;
  endGame: () => void;
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

  scorePlayer: () => set((s) => ({ playerPoints: s.playerPoints + 1 })),

  scoreOpponent: () => set((s) => ({ opponentPoints: s.opponentPoints + 1 })),

  endGame: () => set({ phase: "ended" }),

  reset: () => set(INITIAL_STATE),
}));
