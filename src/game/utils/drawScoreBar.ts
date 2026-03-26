import type { Graphics } from "pixi.js";

import { RING_FADE_IN_DURATION, WIN_POINTS } from "../constants";
import type { LayoutBase, LayoutRing } from "../hooks/types/useLayout.types";
import type { GamePhase } from "../../state/types";

/** Mutable state persisted across ticks for smooth score bar animation. */
export interface ScoreBarState {
  /** Current interpolated x-position of the red/blue divider (null = uninitialised). */
  midpoint: number | null;
  /** Current opacity of the entire bar (0 = invisible, 1 = fully visible). */
  alpha: number;
  /** Whether the game was in "playing" phase last tick (used to detect phase transitions). */
  wasPlaying: boolean;
}

/** Draw and animate the red/blue score bar above the ring.
 *  Mutates `state` in place so the caller can persist values across ticks. */
export function drawScoreBar(
  gfx: Graphics,
  state: ScoreBarState,
  gamePhase: GamePhase,
  /** Current net score: positive = player leading, negative = opponent leading. */
  score: number,
  dt: number,
  ring: LayoutRing,
  base: LayoutBase,
): void {
  gfx.clear();

  // Show bar during gameplay and fade out when ended
  if (gamePhase === "playing" || (gamePhase === "ended" && state.alpha > 0)) {
    // Fade in when transitioning to playing
    if (gamePhase === "playing" && !state.wasPlaying) {
      state.wasPlaying = true;
      state.alpha = 0;
    }
    if (gamePhase === "playing" && state.alpha < 1) {
      state.alpha = Math.min(1, state.alpha + dt / RING_FADE_IN_DURATION);
    }
    // Fade out when ended
    if (gamePhase === "ended") {
      state.alpha = Math.max(0, state.alpha - dt / RING_FADE_IN_DURATION);
    }
    gfx.alpha = state.alpha;

    // ── Compute responsive bar dimensions ──
    // Wider bar on bigger screens; on landscape mobile stretch to fill more width
    const baseBarWidth = ring.outerRadius * 2;
    const widthMultiplier = Math.min(3.5, Math.max(1, base.width / 400));
    const barWidth = baseBarWidth * widthMultiplier;
    const barHeight = Math.max(10, ring.outerRadius * 0.14);
    const halfBarWidth = barWidth / 2;

    // ── Compute red/blue split position ──
    // scoreRatio: -1 (full blue/opponent) → 0 (center) → +1 (full red/player)
    const scoreRatio = Math.min(1, Math.max(-1, score / WIN_POINTS));
    // targetMidpoint: 0 (all blue) → barWidth (all red)
    const targetMidpoint = halfBarWidth + halfBarWidth * scoreRatio;

    // Smooth lerp toward target so the divider slides instead of jumping
    if (state.midpoint === null) {
      state.midpoint = targetMidpoint;
    } else {
      const lerpSpeed = 0.08;
      state.midpoint += (targetMidpoint - state.midpoint) * lerpSpeed;
    }
    const currentMidpoint = state.midpoint;

    // Red section (player): left edge → divider
    if (currentMidpoint > 0) {
      gfx.rect(-halfBarWidth, -barHeight / 2, currentMidpoint, barHeight);
      gfx.fill({ color: 0xff3333, alpha: 0.9 });
    }
    // Blue section (opponent): divider → right edge
    if (currentMidpoint < barWidth) {
      const blueSectionWidth = barWidth - currentMidpoint;
      gfx.rect(-halfBarWidth + currentMidpoint, -barHeight / 2, blueSectionWidth, barHeight);
      gfx.fill({ color: 0x3388ff, alpha: 0.9 });
    }
  } else {
    // Reset state when fully faded or in intro
    state.midpoint = null;
    state.wasPlaying = false;
    gfx.alpha = 0;
  }
}
