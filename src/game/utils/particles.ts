import type { Graphics } from "pixi.js";

import {
  SPARK_PARTICLE_COUNT,
  SPARK_PARTICLE_SPEED,
  SPARK_PARTICLE_GRAVITY,
  SPARK_PARTICLE_LIFETIME,
  SPARK_PARTICLE_SIZE,
  EXPLOSION_PARTICLE_COUNT,
  EXPLOSION_PARTICLE_SPEED,
  EXPLOSION_PARTICLE_GRAVITY,
  EXPLOSION_PARTICLE_LIFETIME,
  EXPLOSION_PARTICLE_SIZE,
} from "../constants";
import type { Particle } from "../types";

export type SparkParticle = Particle;

// ──────────────────────────────────────────────
//  Spark particles (laser clash effect)
// ──────────────────────────────────────────────

/** Emit a burst of spark particles at the given position. */
export function spawnSparks(
  particles: SparkParticle[],
  x: number,
  y: number,
): void {
  for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
    /** Random emission direction in radians. */
    const emitAngle = Math.random() * Math.PI * 2;
    /** Randomised initial speed so particles spread unevenly. */
    const initialSpeed = SPARK_PARTICLE_SPEED * (0.3 + Math.random() * 0.7);
    particles.push({
      x,
      y,
      vx: Math.cos(emitAngle) * initialSpeed,
      // Slight upward bias so sparks fountain upward
      vy: Math.sin(emitAngle) * initialSpeed - SPARK_PARTICLE_SPEED * 0.3,
      life: SPARK_PARTICLE_LIFETIME * (0.4 + Math.random() * 0.6),
      size: SPARK_PARTICLE_SIZE * (0.5 + Math.random()),
    });
  }
}

/** Advance physics and draw all living spark particles.
 *  Returns the array of particles that are still alive. */
export function updateSparkParticles(
  gfx: Graphics,
  particles: SparkParticle[],
  dt: number,
): SparkParticle[] {
  gfx.clear();
  const aliveParticles: SparkParticle[] = [];

  for (const particle of particles) {
    particle.life -= dt;
    if (particle.life <= 0) continue;

    // Apply gravity and integrate position
    particle.vy += SPARK_PARTICLE_GRAVITY * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;

    /** Opacity fades from 1 → 0 over the particle's lifetime. */
    const opacity = Math.max(0, particle.life / SPARK_PARTICLE_LIFETIME);
    /** Randomly flicker between gold and white for a sparkling look. */
    const flickerColor = Math.random() > 0.3 ? 0xffdd00 : 0xffffff;
    gfx.circle(particle.x, particle.y, particle.size * opacity);
    gfx.fill({ color: flickerColor, alpha: opacity });
    aliveParticles.push(particle);
  }

  return aliveParticles;
}

// ──────────────────────────────────────────────
//  Explosion particles (win/lose effect)
// ──────────────────────────────────────────────

export type ExplosionParticle = Particle;

/** Fiery colour palette sampled randomly for each explosion particle. */
const EXPLOSION_COLORS = [0xff4500, 0xff6600, 0xffaa00, 0xffdd00, 0xff2200, 0xffffff];

/** Emit a burst of explosion particles at the given position with a slight random offset. */
export function spawnExplosion(
  particles: ExplosionParticle[],
  x: number,
  y: number,
): void {
  for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
    const emitAngle = Math.random() * Math.PI * 2;
    const initialSpeed = EXPLOSION_PARTICLE_SPEED * (0.3 + Math.random() * 0.8);
    particles.push({
      /** Small random offset so particles don't all originate from the exact same pixel. */
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(emitAngle) * initialSpeed,
      // Slight upward bias for a "firework" feel
      vy: Math.sin(emitAngle) * initialSpeed - EXPLOSION_PARTICLE_SPEED * 0.4,
      life: EXPLOSION_PARTICLE_LIFETIME * (0.4 + Math.random() * 0.6),
      size: EXPLOSION_PARTICLE_SIZE * (0.5 + Math.random()),
    });
  }
}

/** Advance physics and draw all living explosion particles.
 *  Returns the array of particles that are still alive. */
export function updateExplosionParticles(
  gfx: Graphics,
  particles: ExplosionParticle[],
  dt: number,
): ExplosionParticle[] {
  gfx.clear();
  const aliveParticles: ExplosionParticle[] = [];

  for (const particle of particles) {
    particle.life -= dt;
    if (particle.life <= 0) continue;

    // Apply gravity and integrate position
    particle.vy += EXPLOSION_PARTICLE_GRAVITY * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;

    /** Opacity fades from 1 → 0 over the particle's lifetime. */
    const opacity = Math.max(0, particle.life / EXPLOSION_PARTICLE_LIFETIME);
    const randomColor = EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)];
    gfx.circle(particle.x, particle.y, particle.size * opacity);
    gfx.fill({ color: randomColor, alpha: opacity });
    aliveParticles.push(particle);
  }

  return aliveParticles;
}
