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
//  Spark particles (clash effect)
// ──────────────────────────────────────────────

/** Emit spark particles at (x, y). */
export function spawnSparks(
  particles: SparkParticle[],
  x: number,
  y: number,
): void {
  for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = SPARK_PARTICLE_SPEED * (0.3 + Math.random() * 0.7);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - SPARK_PARTICLE_SPEED * 0.3,
      life: SPARK_PARTICLE_LIFETIME * (0.4 + Math.random() * 0.6),
      size: SPARK_PARTICLE_SIZE * (0.5 + Math.random()),
    });
  }
}

/** Advance & draw spark particles. Returns the surviving particles. */
export function updateSparkParticles(
  gfx: Graphics,
  particles: SparkParticle[],
  dt: number,
): SparkParticle[] {
  gfx.clear();
  const remaining: SparkParticle[] = [];
  for (const p of particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vy += SPARK_PARTICLE_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const alpha = Math.max(0, p.life / SPARK_PARTICLE_LIFETIME);
    const color = Math.random() > 0.3 ? 0xffdd00 : 0xffffff;
    gfx.circle(p.x, p.y, p.size * alpha);
    gfx.fill({ color, alpha });
    remaining.push(p);
  }
  return remaining;
}

// ──────────────────────────────────────────────
//  Explosion particles (win/lose effect)
// ──────────────────────────────────────────────

export type ExplosionParticle = Particle;

const EXPLOSION_COLORS = [0xff4500, 0xff6600, 0xffaa00, 0xffdd00, 0xff2200, 0xffffff];

/** Emit explosion particles at (x, y). */
export function spawnExplosion(
  particles: ExplosionParticle[],
  x: number,
  y: number,
): void {
  for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = EXPLOSION_PARTICLE_SPEED * (0.3 + Math.random() * 0.8);
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - EXPLOSION_PARTICLE_SPEED * 0.4,
      life: EXPLOSION_PARTICLE_LIFETIME * (0.4 + Math.random() * 0.6),
      size: EXPLOSION_PARTICLE_SIZE * (0.5 + Math.random()),
    });
  }
}

/** Advance & draw explosion particles. Returns the surviving particles. */
export function updateExplosionParticles(
  gfx: Graphics,
  particles: ExplosionParticle[],
  dt: number,
): ExplosionParticle[] {
  gfx.clear();
  const remaining: ExplosionParticle[] = [];
  for (const p of particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vy += EXPLOSION_PARTICLE_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const alpha = Math.max(0, p.life / EXPLOSION_PARTICLE_LIFETIME);
    const color = EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)];
    gfx.circle(p.x, p.y, p.size * alpha);
    gfx.fill({ color, alpha });
    remaining.push(p);
  }
  return remaining;
}
