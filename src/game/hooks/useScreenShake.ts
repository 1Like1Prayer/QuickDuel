import { useRef } from "react";
import type { Container } from "pixi.js";

import { SHAKE_DURATION } from "../constants";

export interface ScreenShakeState {
  /** Start a new screen shake (resets the timer). */
  trigger: () => void;
  /** Per-tick update: applies a decaying random offset to the container. */
  update: (dt: number, container: Container, maxShakeIntensity: number) => void;
}

/** Manages screen shake via refs — applies a random offset that decays over `SHAKE_DURATION`. */
export function useScreenShake(): ScreenShakeState {
  const timeRemaining = useRef(0);
  const isShaking = useRef(false);

  const trigger = () => {
    timeRemaining.current = SHAKE_DURATION;
    isShaking.current = true;
  };

  const update = (dt: number, container: Container, maxShakeIntensity: number) => {
    if (!isShaking.current) return;

    timeRemaining.current -= dt;
    if (timeRemaining.current <= 0) {
      // Shake finished — reset container to its resting position
      isShaking.current = false;
      container.x = 0;
      container.y = 0;
    } else {
      /** 1 → 0 decay ratio: shake starts strong and fades to nothing. */
      const decayProgress = timeRemaining.current / SHAKE_DURATION;
      /** Current shake magnitude (pixels). */
      const currentIntensity = maxShakeIntensity * decayProgress;
      container.x = (Math.random() - 0.5) * 2 * currentIntensity;
      container.y = (Math.random() - 0.5) * 2 * currentIntensity;
    }
  };

  return { trigger, update };
}
