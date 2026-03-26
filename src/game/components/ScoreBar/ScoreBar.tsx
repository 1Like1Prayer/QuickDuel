import { useTick } from "@pixi/react";
import { Graphics } from "pixi.js";
import { useRef } from "react";

import { useGameStore } from "../../../state";
import type { LayoutBase, LayoutRing } from "../../hooks/types/useLayout.types";
import { drawScoreBar, type ScoreBarState } from "../../utils";

export interface ScoreBarProps {
  x: number;
  y: number;
  ring: LayoutRing;
  base: LayoutBase;
}

/** Animated red/blue score bar above the ring. */
export function ScoreBar({ x, y, ring, base }: ScoreBarProps) {
  const scoreBarGfxRef = useRef<Graphics>(null);
  const scoreBarStateRef = useRef<ScoreBarState>({ midpoint: null, alpha: 0, wasPlaying: false });

  useTick((ticker) => {
    if (!scoreBarGfxRef.current) return;
    const dt = ticker.deltaTime / 60;
    const { phase, score } = useGameStore.getState();
    drawScoreBar(scoreBarGfxRef.current, scoreBarStateRef.current, phase, score, dt, ring, base);
  });

  return (
    <pixiGraphics
      ref={scoreBarGfxRef}
      x={x}
      y={y}
      draw={() => { /* redrawn each tick */ }}
    />
  );
}
