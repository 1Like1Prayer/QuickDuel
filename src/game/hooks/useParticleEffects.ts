import { Graphics } from "pixi.js";
import { useEffect, useRef } from "react";
import type { Container } from "pixi.js";

import {
  spawnExplosion,
  spawnSparks,
  updateExplosionParticles,
  updateSparkParticles,
} from "../utils";
import type { SparkParticle, ExplosionParticle } from "../utils";

export interface ParticleEffects {
  /** Live spark particles (laser clash effect). */
  sparkParticles: React.RefObject<SparkParticle[]>;
  /** Live explosion particles (win/lose effect). */
  explosionParticles: React.RefObject<ExplosionParticle[]>;
  /** Emit a burst of sparks at (x, y). */
  spawnSparksAt: (x: number, y: number) => void;
  /** Emit an explosion burst at (x, y). */
  spawnExplosionAt: (x: number, y: number) => void;
  /** Advance physics and redraw all live particles. */
  update: (dt: number) => void;
}

/** Manages spark and explosion particle systems with their own PixiJS graphics layers. */
export function useParticleEffects(containerRef: React.RefObject<Container | null>): ParticleEffects {
  /** PixiJS Graphics object for drawing spark particles. */
  const sparkGraphicsLayer = useRef<Graphics | null>(null);
  /** PixiJS Graphics object for drawing explosion particles. */
  const explosionGraphicsLayer = useRef<Graphics | null>(null);
  const sparkParticles = useRef<SparkParticle[]>([]);
  const explosionParticles = useRef<ExplosionParticle[]>([]);

  // Attach particle graphics layers to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sparkLayer = new Graphics();
    const explosionLayer = new Graphics();
    sparkGraphicsLayer.current = sparkLayer;
    explosionGraphicsLayer.current = explosionLayer;
    container.addChild(sparkLayer);
    container.addChild(explosionLayer);

    return () => {
      container.removeChild(sparkLayer);
      container.removeChild(explosionLayer);
      sparkLayer.destroy();
      explosionLayer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spawnSparksAt = (x: number, y: number) => {
    spawnSparks(sparkParticles.current, x, y);
  };

  const spawnExplosionAt = (x: number, y: number) => {
    spawnExplosion(explosionParticles.current, x, y);
  };

  const update = (dt: number) => {
    const sparkLayer = sparkGraphicsLayer.current;
    if (sparkLayer) {
      sparkParticles.current = updateSparkParticles(sparkLayer, sparkParticles.current, dt);
    }

    const explosionLayer = explosionGraphicsLayer.current;
    if (explosionLayer) {
      explosionParticles.current = updateExplosionParticles(explosionLayer, explosionParticles.current, dt);
    }
  };

  return { sparkParticles, explosionParticles, spawnSparksAt, spawnExplosionAt, update };
}
