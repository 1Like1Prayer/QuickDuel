import { useRef } from "react";
import type { Container } from "pixi.js";

import { SHAKE_DURATION } from "../constants";

export interface ScreenShakeState {
  trigger: () => void;
  update: (dt: number, container: Container, shakeIntensity: number) => void;
}

/** Manages screen shake via refs. */
export function useScreenShake(): ScreenShakeState {
  const timeRemaining = useRef(0);
  const active = useRef(false);

  const trigger = () => {
    timeRemaining.current = SHAKE_DURATION;
    active.current = true;
  };

  const update = (dt: number, container: Container, shakeIntensity: number) => {
    if (!active.current) return;

    timeRemaining.current -= dt;
    if (timeRemaining.current <= 0) {
      active.current = false;
      container.x = 0;
      container.y = 0;
    } else {
      const progress = timeRemaining.current / SHAKE_DURATION;
      const intensity = shakeIntensity * progress;
      container.x = (Math.random() - 0.5) * 2 * intensity;
      container.y = (Math.random() - 0.5) * 2 * intensity;
    }
  };

  return { trigger, update };
}
