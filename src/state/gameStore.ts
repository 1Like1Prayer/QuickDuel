import { create } from "zustand";
import { WIN_POINTS } from "../game/constants";
import type { Difficulty, GamePhase } from "./types";

// ── Background music (singleton) ──
const BGM_MAX_VOLUME = 0.3;
const bgm = new Audio("/SFX/BGM11 Storm the enemy's land.Mastering.mp3");
bgm.loop = true;
bgm.volume = BGM_MAX_VOLUME;

// Retry autoplay every 500ms until the browser allows it
const tryPlay = () => {
  bgm.play().then(() => clearInterval(bgmRetry)).catch(() => {});
};
const bgmRetry = setInterval(tryPlay, 500);
tryPlay();

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  /** Single score: positive = player ahead, negative = opponent ahead.
   *  Range: -WIN_POINTS to +WIN_POINTS (default ±10). */
  score: number;
  /** BGM volume as 0-1 fraction (mapped to 0 – BGM_MAX_VOLUME on the audio element). */
  bgmVolume: number;
  /** Whether sound effects are enabled. */
  sfxEnabled: boolean;
  /** Whether all sound is muted (master mute). */
  muted: boolean;
}

export interface GameActions {
  startGame: (difficulty: Difficulty) => void;
  resolveRound: (playerHit: number, cpuHit: number) => void;
  endGame: () => void;
  playAgain: () => void;
  reset: () => void;
  setBgmVolume: (vol: number) => void;
  setSfxEnabled: (enabled: boolean) => void;
  toggleMute: () => void;
}

const INITIAL_STATE: GameState = {
  phase: "intro",
  difficulty: "beginner",
  score: 0,
  bgmVolume: 1,
  sfxEnabled: true,
  muted: false,
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

  reset: () => set((s) => ({ ...INITIAL_STATE, bgmVolume: s.bgmVolume, sfxEnabled: s.sfxEnabled, muted: s.muted })),

  setBgmVolume: (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    bgm.volume = clamped * BGM_MAX_VOLUME;
    set((s) => {
      if (s.muted) bgm.volume = 0;
      return { bgmVolume: clamped };
    });
  },

  setSfxEnabled: (enabled: boolean) => set({ sfxEnabled: enabled }),

  toggleMute: () =>
    set((s) => {
      const next = !s.muted;
      bgm.volume = next ? 0 : s.bgmVolume * BGM_MAX_VOLUME;
      return { muted: next };
    }),
}));
